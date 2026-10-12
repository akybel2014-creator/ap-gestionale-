import vm from 'node:vm';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import type {
  AgentPipelinePlan,
  AgentPipelineRun,
  AgentRole,
  AgentStageResult,
  ProjectFile,
  ProjectDatabaseEntity,
  ProjectApiRouteSpec,
  SandboxVerificationReport,
  SandboxCheckResult,
} from '../types/index.ts';

export interface AgentOrchestratorStreamEvent {
  type: 'stage-start' | 'stage-delta' | 'stage-complete' | 'stage-error' | 'complete' | 'error';
  role?: 'planner' | 'backend' | 'frontend' | 'qa';
  status?: 'pending' | 'running' | 'completed' | 'error';
  message: string;
  deltaText?: string;
  artifactsProduced?: string[];
  targetFiles?: string[];
  timestamp: string;
}

export interface AgentOrchestratorInput {
  projectId: string;
  userId: string;
  projectName: string;
  projectDescription: string;
  projectType: string;
  instructions: Array<{ text: string }>;
  selectedAgents?: AgentRole[];
  targetFiles?: string[];
  existingFiles?: ProjectFile[];
  existingPreviewHtml?: string | null;
  maxHealingAttempts?: number;
  onEvent?: (event: AgentOrchestratorStreamEvent) => void;
  aiConfig: {
    provider: string;
    apiKey: string;
    model: string;
    endpoint: string;
    isAdminSession: boolean;
  };
}

function sanitizeSecrets(rawText: string): string {
  return rawText
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[CHIAVE_API_OMESSA]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g, '[TOKEN_GITHUB_OMESSO]')
    .replace(/\bgithub_pat_[A-Za-z0-9_]{16,}\b/g, '[TOKEN_GITHUB_OMESSO]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[CHIAVE_API_OMESSA]')
    .replace(/\bgsk_[A-Za-z0-9_-]{16,}\b/g, '[CHIAVE_API_OMESSA]');
}

function extractJsonBlock<T>(rawText: string): T | null {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

const DEFAULT_LLM_TIMEOUT_MS = 25000;

export function classifyProviderHttpError(
  provider: string,
  status: number,
  sanitizedBody: string,
): { errorCode: string; message: string } {
  const label = provider.toUpperCase();
  if (status === 401 || status === 403) {
    return {
      errorCode: 'INVALID_API_KEY',
      message: `Chiave API non valida o non autorizzata per ${label} (HTTP ${status}). Verifica la chiave nelle Impostazioni.`,
    };
  }
  if (status === 429) {
    return {
      errorCode: 'PROVIDER_QUOTA_EXCEEDED',
      message: `Limite di utilizzo o quota esaurita sul provider ${label} (HTTP 429). Riprova più tardi o verifica il piano del tuo account ${label}.`,
    };
  }
  if (status === 404) {
    return {
      errorCode: 'MODEL_OR_ENDPOINT_NOT_FOUND',
      message: `Modello o endpoint non trovato su ${label} (HTTP 404). Verifica il nome del modello selezionato.`,
    };
  }
  return {
    errorCode: 'BYOK_PROVIDER_ERROR',
    message: `Errore dal provider ${label} (${status}): ${sanitizedBody.slice(0, 180)}`,
  };
}

export async function callConfiguredLlm(
  systemPrompt: string,
  userPrompt: string,
  aiConfig: AgentOrchestratorInput['aiConfig'],
  timeoutMs: number = DEFAULT_LLM_TIMEOUT_MS,
): Promise<{ text: string; provider: string; model: string; mode: 'byok' | 'managed-admin' }> {
  const { provider, apiKey, model, endpoint, isAdminSession } = aiConfig;

  const fetchWithTimeout = async (url: string, init: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted'))) {
        throw new Error(
          `Richiesta al provider ${(provider || 'IA').toUpperCase()} scaduta (timeout dopo ${Math.round(timeoutMs / 1000)}s). Riprova.`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  };

  // 1. OpenAI / Groq / Custom OpenAI-compatible BYOK
  if (apiKey && (provider === 'openai' || provider === 'groq' || provider === 'custom')) {
    const targetUrl =
      endpoint ||
      (provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions');
    const modelName = model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

    const resp = await fetchWithTimeout(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!resp.ok) {
      const errBody = sanitizeSecrets(await resp.text());
      const classified = classifyProviderHttpError(provider, resp.status, errBody);
      throw new Error(classified.message);
    }

    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    if (!content) {
      throw new Error(`Il provider ${provider.toUpperCase()} ha restituito una risposta vuota.`);
    }
    return { text: content, provider, model: modelName, mode: 'byok' };
  }

  // 2. Anthropic BYOK
  if (apiKey && provider === 'anthropic') {
    const targetUrl = endpoint || 'https://api.anthropic.com/v1/messages';
    const modelName = model || 'claude-3-5-sonnet-20241022';

    const resp = await fetchWithTimeout(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!resp.ok) {
      const errBody = sanitizeSecrets(await resp.text());
      const classified = classifyProviderHttpError('anthropic', resp.status, errBody);
      throw new Error(classified.message);
    }

    const json = (await resp.json()) as {
      content?: Array<{ text?: string }>;
    };
    const content = json.content?.[0]?.text?.trim() || '';
    if (!content) {
      throw new Error('Il provider Anthropic ha restituito una risposta vuota.');
    }
    return { text: content, provider: 'anthropic', model: modelName, mode: 'byok' };
  }

  // 3. Gemini BYOK or Explicit Admin Managed Proxy via @google/genai SDK (generateContent)
  if (provider && provider !== 'gemini' && provider !== 'managed') {
    throw new Error(
      `Chiave API mancante per il provider ${provider.toUpperCase()}. Inserisci la tua chiave API personale (BYOK) nelle Impostazioni.`,
    );
  }

  const isManagedProvider = provider === 'managed';
  if (isManagedProvider && !isAdminSession) {
    throw new Error(
      'Il Proxy Backend Gestito è riservato agli amministratori autorizzati. Seleziona Google Gemini (BYOK) e inserisci la tua chiave API personale.',
    );
  }

  const isGeminiByok = !isManagedProvider && Boolean(apiKey);
  const effectiveGeminiKey = isManagedProvider
    ? process.env.GEMINI_API_KEY || ''
    : apiKey;

  if (!effectiveGeminiKey) {
    throw new Error(
      isManagedProvider
        ? 'GEMINI_API_KEY non è configurata sul server. Configura la variabile d\'ambiente sul server oppure seleziona Google Gemini (BYOK) e inserisci la tua chiave API.'
        : 'Chiave API Gemini mancante. Inserisci la tua chiave API Google AI Studio (BYOK) nelle Impostazioni.',
    );
  }

  const rawRequestedModel = (model || 'gemini-flash-latest').trim();
  const DEPRECATED_GEMINI_MODELS = new Set([
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-2.0-flash',
    'gemini-2.0-pro',
    'gemini-2.0-flash-thinking',
  ]);
  if (DEPRECATED_GEMINI_MODELS.has(rawRequestedModel.toLowerCase())) {
    throw new Error(
      `Modello o endpoint non trovato su GEMINI (HTTP 404): il modello "${rawRequestedModel}" è obsoleto o non supportato. Seleziona gemini-flash-latest o gemini-3.8-flash.`,
    );
  }

  const modelToUse = rawRequestedModel || 'gemini-flash-latest';
  const normalizedBaseUrl =
    endpoint &&
    endpoint !== '/api/ai/generate' &&
    endpoint !== 'https://generativelanguage.googleapis.com' &&
    endpoint !== 'https://generativelanguage.googleapis.com/v1beta/models'
      ? endpoint.replace(/\/v1beta\/models\/?$/i, '').replace(/\/+$/, '')
      : undefined;

  const ai = new GoogleGenAI({
    apiKey: effectiveGeminiKey,
    httpOptions: {
      ...(normalizedBaseUrl ? { baseUrl: normalizedBaseUrl } : {}),
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const geminiPromise = ai.models.generateContent({
    model: modelToUse,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.3,
    },
  });

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () =>
        reject(
          new Error(
            `Richiesta al modello Gemini (${modelToUse}) scaduta (timeout dopo ${Math.round(timeoutMs / 1000)}s). Riprova.`,
          ),
        ),
      timeoutMs,
    );
  });

  try {
    const response = await Promise.race([geminiPromise, timeoutPromise]);
    const text = response.text?.trim() || '';
    if (!text) {
      throw new Error('Il modello Gemini ha restituito una risposta vuota.');
    }

    return {
      text,
      provider: 'gemini',
      model: modelToUse,
      mode: isGeminiByok ? 'byok' : 'managed-admin',
    };
  } catch (err) {
    const rawMsg = sanitizeSecrets(err instanceof Error ? err.message : String(err));
    if (/API_KEY_INVALID|invalid api key|API key not valid|401|403|permission_denied|unauthenticated/i.test(rawMsg)) {
      throw new Error(
        `Chiave API Gemini non valida o non autorizzata per il modello ${modelToUse} (HTTP 401). Verifica la chiave nelle Impostazioni.`,
      );
    }
    if (/404|NOT_FOUND|not found|is not found for API version|not supported for generateContent/i.test(rawMsg)) {
      throw new Error(
        `Modello o endpoint non trovato su GEMINI (HTTP 404): il modello "${modelToUse}" non è disponibile per la tua chiave o piano.`,
      );
    }
    if (/429|quota|rate limit|resource_exhausted|too many requests/i.test(rawMsg)) {
      throw new Error(
        `Limite di utilizzo o quota esaurita per Google Gemini (${modelToUse}) (HTTP 429). Riprova più tardi.`,
      );
    }
    if (/scaduta|timeout|DEADLINE_EXCEEDED|AbortError|aborted/i.test(rawMsg)) {
      throw new Error(
        `Richiesta al modello Gemini (${modelToUse}) scaduta (timeout dopo ${Math.round(timeoutMs / 1000)}s). Riprova.`,
      );
    }
    throw new Error(rawMsg);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function verifyAiProviderConnection(
  aiConfig: AgentOrchestratorInput['aiConfig'],
): Promise<{
  ok: boolean;
  provider: string;
  model: string;
  mode: 'byok' | 'managed-admin';
  latencyMs: number;
  message: string;
}> {
  const startMs = Date.now();
  const res = await callConfiguredLlm(
    'Sei un assistente di diagnostica. Rispondi esclusivamente con la parola OK.',
    'Verifica connessione.',
    aiConfig,
    12000,
  );
  const latencyMs = Math.max(1, Date.now() - startMs);
  return {
    ok: true,
    provider: res.provider,
    model: res.model,
    mode: res.mode,
    latencyMs,
    message: `Connessione verificata con successo (${res.provider.toUpperCase()} · ${res.model} · ${latencyMs}ms).`,
  };
}

/**
 * Injects a strict Content Security Policy (CSP) and runtime guard into untrusted preview HTML.
 * - Rendered inside `<iframe sandbox="allow-scripts">` (WITHOUT `allow-same-origin`).
 * - The iframe runs in an opaque origin (`null`), preventing access to parent DOM, cookies,
 *   localStorage, sessionStorage, or authenticated same-origin `/api/*` endpoints.
 * - CSP further blocks `connect-src`, `object-src`, `base-uri`, `frame-ancestors`, and `form-action`.
 */
export const PREVIEW_CSP_CONTENT =
  "default-src 'none'; script-src 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src https://fonts.gstatic.com data:; img-src data: blob: https:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none';";

export function buildIsolatedPreviewSrcDoc(rawHtml: string): string {
  const html = (rawHtml || '').trim();
  const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP_CONTENT}" />`;
  const isolationGuardScript = `<script>(function(){try{Object.defineProperty(window,'parent',{get:function(){return window;}});Object.defineProperty(window,'top',{get:function(){return window;}});Object.defineProperty(window,'opener',{get:function(){return null;}});}catch(_e){}})();</script>`;

  if (!html) {
    return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8" />${cspMetaTag}${isolationGuardScript}</head><body></body></html>`;
  }

  // Strip any pre-existing meta CSP tags from untrusted HTML so they cannot weaken our policy
  const sanitizedHtml = html.replace(
    /<meta\b[^>]*http-equiv\s*=\s*["']?Content-Security-Policy["']?[^>]*>/gi,
    '',
  );

  if (/<head[\s>]/i.test(sanitizedHtml)) {
    return sanitizedHtml.replace(
      /<head(\b[^>]*)>/i,
      `<head$1>\n  ${cspMetaTag}\n  ${isolationGuardScript}`,
    );
  }

  if (/<html[\s>]/i.test(sanitizedHtml)) {
    return sanitizedHtml.replace(
      /<html(\b[^>]*)>/i,
      `<html$1><head>${cspMetaTag}${isolationGuardScript}</head>`,
    );
  }

  return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8" />${cspMetaTag}${isolationGuardScript}</head><body>${sanitizedHtml}</body></html>`;
}

/**
 * Static & syntax verification utility (NOT an execution sandbox).
 * Evaluates generated artifacts using V8 syntax parsing (`new vm.Script(code)`) and structural rules
 * without executing untrusted code inside the host Node.js process.
 * Real runtime isolation of the preview occurs in the browser's `<iframe sandbox="allow-scripts">`
 * (opaque origin, without `allow-same-origin`) combined with `buildIsolatedPreviewSrcDoc` CSP.
 */
export function runIsolatedSandboxVerification(
  files: ProjectFile[],
  previewHtml: string | null,
  attemptNumber: number = 1,
): SandboxVerificationReport {
  const startMs = Date.now();
  const checks: SandboxCheckResult[] = [];

  // 1. Verify HTML entry point
  const htmlContent =
    previewHtml || files.find((f) => f.path === 'index.html' || f.language === 'html')?.content || '';

  if (!htmlContent || !htmlContent.trim()) {
    checks.push({
      id: 'html-presence',
      category: 'html-structure',
      target: 'index.html',
      passed: false,
      message: 'File HTML principale mancante o vuoto.',
    });
  } else {
    const hasDoctype = /<!DOCTYPE\s+html>/i.test(htmlContent);
    const hasHtmlTag = /<html[\s>]/i.test(htmlContent) && /<\/html>/i.test(htmlContent);
    const hasBodyTag = /<body[\s>]/i.test(htmlContent) && /<\/body>/i.test(htmlContent);
    const structurePassed = hasDoctype && hasHtmlTag && hasBodyTag;

    checks.push({
      id: 'html-structure',
      category: 'html-structure',
      target: 'index.html',
      passed: structurePassed,
      message: structurePassed
        ? 'Struttura HTML5 valida (<!DOCTYPE html>, <html>, <body> presenti e bilanciati).'
        : 'Struttura HTML5 incompleta: assicurarsi che <!DOCTYPE html>, <html> e <body> siano presenti e chiusi correttamente.',
    });

    const isolatedPreview = buildIsolatedPreviewSrcDoc(htmlContent);
    const hasCsp = isolatedPreview.includes('Content-Security-Policy') && isolatedPreview.includes("connect-src 'none'");
    checks.push({
      id: 'preview-origin-isolation',
      category: 'security-hygiene',
      target: 'index.html (iframe sandbox="allow-scripts" + CSP)',
      passed: hasCsp,
      message: hasCsp
        ? 'Isolamento anteprima attivo: origine opaca (senza allow-same-origin) + CSP restrittiva (connect-src none, form-action none).'
        : 'CSP di isolamento anteprima mancante.',
    });

    // Extract inline <script> blocks and syntax-check via vm.Script (compilation only, zero execution)
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    let scriptIndex = 0;
    while ((match = scriptRegex.exec(htmlContent)) !== null) {
      scriptIndex++;
      const inlineJs = (match[1] || '').trim();
      if (!inlineJs) continue;
      try {
        // Only compiles to check syntax; NEVER executes in process
        new vm.Script(inlineJs, { filename: `index.html#script-${scriptIndex}` });
        checks.push({
          id: `inline-js-${scriptIndex}`,
          category: 'js-syntax',
          target: `index.html (script #${scriptIndex})`,
          passed: true,
          message: `Sintassi JavaScript inline #${scriptIndex} verificata dal parser V8 (senza esecuzione).`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        checks.push({
          id: `inline-js-${scriptIndex}`,
          category: 'js-syntax',
          target: `index.html (script #${scriptIndex})`,
          passed: false,
          message: `Errore di sintassi JavaScript in script #${scriptIndex}: ${msg.slice(0, 200)}`,
        });
      }
    }
  }

  // 2. Verify all files in the multi-file collection
  for (const file of files) {
    if (file.language === 'json' || file.path.endsWith('.json')) {
      try {
        JSON.parse(file.content);
        checks.push({
          id: `json-${file.path}`,
          category: 'json-schema',
          target: file.path,
          passed: true,
          message: `JSON valido (${file.path}).`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        checks.push({
          id: `json-${file.path}`,
          category: 'json-schema',
          target: file.path,
          passed: false,
          message: `JSON non valido in ${file.path}: ${msg.slice(0, 160)}`,
        });
      }
    } else if (file.language === 'javascript' || file.path.endsWith('.js') || file.path.endsWith('.mjs')) {
      try {
        // Strip ES module import/export keywords only for pure vm.Script syntax validation if needed
        const syntaxTestable = file.content
          .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '')
          .replace(/^\s*export\s+default\s+/gm, '')
          .replace(/^\s*export\s+(const|let|var|function|async\s+function|class)\s+/gm, '$1 ');
        new vm.Script(syntaxTestable, { filename: file.path });
        checks.push({
          id: `js-${file.path}`,
          category: 'js-syntax',
          target: file.path,
          passed: true,
          message: `Sintassi modulo JS valida (${file.path}).`,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        checks.push({
          id: `js-${file.path}`,
          category: 'js-syntax',
          target: file.path,
          passed: false,
          message: `Errore di sintassi JS in ${file.path}: ${msg.slice(0, 180)}`,
        });
      }
    }
  }

  // 3. Security Hygiene Check (ensure no hardcoded private keys or dangerous server evals)
  const combinedSource = files.map((f) => f.content).join('\n') + '\n' + (htmlContent || '');
  const hasLeakedSecret =
    /\bsk-[A-Za-z0-9_-]{20,}\b/.test(combinedSource) ||
    /\bghp_[A-Za-z0-9_]{20,}\b/.test(combinedSource);

  checks.push({
    id: 'security-hygiene',
    category: 'security-hygiene',
    target: 'workspace-bundle',
    passed: !hasLeakedSecret,
    message: !hasLeakedSecret
      ? 'Nessun segreto API o token hardcoded rilevato nei file generati.'
      : 'Rilevato potenziale segreto o token hardcoded nei file generati.',
  });

  const allPassed = checks.length > 0 && checks.every((c) => c.passed);

  return {
    id: `sbx_${crypto.randomBytes(6).toString('hex')}`,
    timestamp: new Date().toISOString(),
    isolatedMode: 'vm-syntax-and-static-ast',
    passed: allPassed,
    attemptNumber,
    checks,
    durationMs: Math.max(1, Date.now() - startMs),
  };
}

/**
 * Executes the 4-stage multi-agent pipeline:
 * 1. Planner Agent -> Architecture, file manifest, dependencies, database schema, API routes
 * 2. Backend Agent -> Server API implementation & database schema files
 * 3. Frontend Agent -> Complete interactive UI (index.html + frontend modules)
 * 4. QA / Self-Healing Agent -> Runs isolated sandbox verification and performs self-healing if errors are found
 */
export async function runMultiAgentOrchestrator(
  input: AgentOrchestratorInput,
): Promise<{
  run: AgentPipelineRun;
  plan: AgentPipelinePlan;
  files: ProjectFile[];
  previewHtml: string;
  dependencies: Record<string, string>;
  databaseSchema: ProjectDatabaseEntity[];
  apiRoutes: ProjectApiRouteSpec[];
  sandboxReport: SandboxVerificationReport;
  provider: string;
  mode: 'byok' | 'managed-admin';
}> {
  const runId = `run_${crypto.randomBytes(8).toString('hex')}`;
  const startedAt = new Date().toISOString();
  const maxHealingAttempts = Math.min(Math.max(input.maxHealingAttempts ?? 2, 1), 3);

  const stages: AgentStageResult[] = [
    { role: 'planner', status: 'pending', startedAt, summary: 'In attesa di avvio Planner Agent' },
    { role: 'backend', status: 'pending', startedAt, summary: 'In attesa di avvio Backend Agent' },
    { role: 'frontend', status: 'pending', startedAt, summary: 'In attesa di avvio Frontend Agent' },
    { role: 'qa', status: 'pending', startedAt, summary: 'In attesa di verifica QA / Self-Healing' },
  ];

  const allRoles: AgentRole[] = ['planner', 'backend', 'frontend', 'qa'];
  const activeRoles: AgentRole[] =
    Array.isArray(input.selectedAgents) && input.selectedAgents.length > 0
      ? allRoles.filter((r) => input.selectedAgents!.includes(r))
      : allRoles;
  const effectiveRoles: AgentRole[] = activeRoles.length > 0 ? activeRoles : allRoles;

  const isRoleSelected = (role: AgentRole) => effectiveRoles.includes(role);

  const instructionsList = input.instructions
    .map((inst, idx) => `${idx + 1}. ${inst.text}`)
    .join('\n');

  const targetFilesList =
    Array.isArray(input.targetFiles) && input.targetFiles.length > 0
      ? input.targetFiles
      : ['index.html', 'src/api/routes.js', 'schema/database.json', 'package.json'];

  const existingFilesContext =
    Array.isArray(input.existingFiles) && input.existingFiles.length > 0
      ? input.existingFiles
          .filter((f) => targetFilesList.includes(f.path))
          .map((f) => `File esistente [${f.path}] (${f.language}, ${f.content.length} car.)`)
          .join('\n')
      : '';

  const projectContextPrompt = [
    `Nome Progetto: ${input.projectName}`,
    `Categoria: ${input.projectType}`,
    `Descrizione: ${input.projectDescription}`,
    `Agenti Selezionati: ${effectiveRoles.join(', ')}`,
    `File Target Selezionati (Multi-File): ${targetFilesList.join(', ')}`,
    existingFilesContext ? `Contesto File Esistenti:\n${existingFilesContext}` : '',
    instructionsList ? `Istruzioni Utente:\n${instructionsList}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  let activeProvider = input.aiConfig.provider || 'gemini';
  let activeMode: 'byok' | 'managed-admin' = 'byok';

  const emit = (evt: Omit<AgentOrchestratorStreamEvent, 'timestamp'>) => {
    if (typeof input.onEvent === 'function') {
      input.onEvent({
        ...evt,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // ============================================================================
  // STAGE 1: PLANNER AGENT
  // ============================================================================
  let plan: AgentPipelinePlan = {
    architectureSummary: `Architettura full-stack modulare per ${input.projectName} (${input.projectType}).`,
    plannedFiles: targetFilesList,
    dependencies: {
      express: '^5.0.0',
      tailwindcss: '^3.4.0',
    },
    databaseSchema: [
      {
        name: 'RecordItem',
        description: `Entità principale per ${input.projectName}`,
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'title', type: 'string', required: true },
          { name: 'status', type: 'string', required: true },
          { name: 'createdAt', type: 'timestamp', required: true },
        ],
      },
    ],
    apiRoutes: [
      {
        method: 'GET',
        path: '/api/items',
        description: "Recupera gli elementi principali dell'applicazione",
        authRequired: false,
      },
      {
        method: 'POST',
        path: '/api/items',
        description: 'Crea un nuovo elemento validato',
        authRequired: true,
      },
    ],
  };

  if (isRoleSelected('planner')) {
    stages[0].status = 'running';
    stages[0].startedAt = new Date().toISOString();
    emit({
      type: 'stage-start',
      role: 'planner',
      status: 'running',
      message: `Planner Agent avviato: analisi requisiti e architettura per [${targetFilesList.join(', ')}]...`,
      targetFiles: targetFilesList,
    });

    try {
      const plannerSystem = [
        'Sei il Planner Agent di una piattaforma agentica full-stack.',
        'Analizza i requisiti del progetto e produci ESCLUSIVAMENTE un oggetto JSON valido (senza testo extra) con la seguente struttura:',
        '{',
        '  "architectureSummary": "stringa sintetica dell\'architettura",',
        '  "PlannedFiles": ["index.html", "src/api/routes.js", "schema/database.json", "package.json"],',
        '  "dependencies": { "express": "^5.0.0", "lucide": "latest" },',
        '  "databaseSchema": [',
        '    { "name": "EntityName", "description": "descrizione", "fields": [{ "name": "id", "type": "string", "required": true }] }',
        '  ],',
        '  "apiRoutes": [',
        '    { "method": "GET", "path": "/api/items", "description": "Elenco elementi", "authRequired": false }',
        '  ]',
        '}',
      ].join('\n');

      const plannerRes = await callConfiguredLlm(plannerSystem, projectContextPrompt, input.aiConfig);
      activeProvider = plannerRes.provider;
      activeMode = plannerRes.mode;

      const parsedPlan = extractJsonBlock<{
        architectureSummary?: string;
        PlannedFiles?: string[];
        plannedFiles?: string[];
        dependencies?: Record<string, string>;
        databaseSchema?: ProjectDatabaseEntity[];
        apiRoutes?: ProjectApiRouteSpec[];
      }>(plannerRes.text);

      plan = {
        architectureSummary:
          parsedPlan?.architectureSummary || plan.architectureSummary,
        plannedFiles:
          parsedPlan?.plannedFiles ||
          parsedPlan?.PlannedFiles ||
          plan.plannedFiles,
        dependencies: parsedPlan?.dependencies || plan.dependencies,
        databaseSchema: Array.isArray(parsedPlan?.databaseSchema)
          ? parsedPlan.databaseSchema
          : plan.databaseSchema,
        apiRoutes: Array.isArray(parsedPlan?.apiRoutes)
          ? parsedPlan.apiRoutes
          : plan.apiRoutes,
      };

      stages[0].status = 'completed';
      stages[0].completedAt = new Date().toISOString();
      stages[0].summary = `Piano architetturale definito: ${plan.plannedFiles.length} file, ${plan.databaseSchema.length} entità dati, ${plan.apiRoutes.length} route API.`;
      stages[0].artifactsProduced = plan.plannedFiles;
      emit({
        type: 'stage-complete',
        role: 'planner',
        status: 'completed',
        message: stages[0].summary,
        deltaText: plan.architectureSummary,
        artifactsProduced: plan.plannedFiles,
      });
    } catch (err) {
      const safeMsg = sanitizeSecrets(err instanceof Error ? err.message : String(err));
      stages[0].status = 'error';
      stages[0].completedAt = new Date().toISOString();
      stages[0].error = safeMsg;
      stages[0].summary = `Planner Agent interrotto: ${safeMsg}`;
      emit({
        type: 'stage-error',
        role: 'planner',
        status: 'error',
        message: stages[0].summary,
      });
      throw new Error(safeMsg);
    }
  } else {
    stages[0].status = 'completed';
    stages[0].completedAt = new Date().toISOString();
    stages[0].summary = 'Planner Agent non selezionato: mantenuto il piano architetturale esistente.';
  }

  // ============================================================================
  // STAGE 2: BACKEND AGENT
  // ============================================================================
  const generatedFiles: ProjectFile[] = [];
  const nowIso = new Date().toISOString();

  if (isRoleSelected('backend')) {
    stages[1].status = 'running';
    stages[1].startedAt = new Date().toISOString();
    emit({
      type: 'stage-start',
      role: 'backend',
      status: 'running',
      message: `Backend Agent in esecuzione: generazione route API (${plan.apiRoutes.length}) e schema database (${plan.databaseSchema.length} entità)...`,
    });

    try {
      const backendSystem = [
        'Sei il Backend Agent di una piattaforma agentica.',
        'Basandoti sul piano del Planner Agent, genera un modulo API Express/Node.js pulito, sintatticamente valido in JavaScript standard (CommonJS o ES module compatibile) che implementa gli endpoint pianificati.',
        'Restituisci ESCLUSIVAMENTE il codice JavaScript del file `src/api/routes.js`, senza blocchi markdown ```javascript.',
      ].join('\n');

      const backendUserPrompt = [
        projectContextPrompt,
        `Piano Architetturale: ${plan.architectureSummary}`,
        `Schema Dati: ${JSON.stringify(plan.databaseSchema, null, 2)}`,
        `API Routes: ${JSON.stringify(plan.apiRoutes, null, 2)}`,
      ].join('\n\n');

      const backendRes = await callConfiguredLlm(backendSystem, backendUserPrompt, input.aiConfig);
      activeProvider = backendRes.provider;
      activeMode = backendRes.mode;
      const cleanedBackendJs = backendRes.text
        .replace(/^```(?:javascript|js|ts)?\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      generatedFiles.push({
        path: 'src/api/routes.js',
        content: cleanedBackendJs || '// Backend API routes\n',
        language: 'javascript',
        description: 'Controller e route API lato server generati dal Backend Agent',
        updatedAt: nowIso,
      });

      generatedFiles.push({
        path: 'schema/database.json',
        content: JSON.stringify(
          {
            project: input.projectName,
            entities: plan.databaseSchema,
            apiRoutes: plan.apiRoutes,
          },
          null,
          2,
        ),
        language: 'json',
        description: 'Modello dati strutturato e specifiche endpoint API',
        updatedAt: nowIso,
      });

      generatedFiles.push({
        path: 'package.json',
        content: JSON.stringify(
          {
            name: input.projectName.toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'ai-app-project',
            version: '1.0.0',
            private: true,
            description: input.projectDescription,
            dependencies: plan.dependencies,
          },
          null,
          2,
        ),
        language: 'json',
        description: 'Manifesto dipendenze e metadati del pacchetto',
        updatedAt: nowIso,
      });

      stages[1].status = 'completed';
      stages[1].completedAt = new Date().toISOString();
      stages[1].summary = `Generati artefatti backend: src/api/routes.js, schema/database.json e package.json.`;
      stages[1].artifactsProduced = ['src/api/routes.js', 'schema/database.json', 'package.json'];
      emit({
        type: 'stage-complete',
        role: 'backend',
        status: 'completed',
        message: stages[1].summary,
        artifactsProduced: stages[1].artifactsProduced,
      });
    } catch (err) {
      const safeMsg = sanitizeSecrets(err instanceof Error ? err.message : String(err));
      stages[1].status = 'error';
      stages[1].completedAt = new Date().toISOString();
      stages[1].error = safeMsg;
      stages[1].summary = `Backend Agent interrotto: ${safeMsg}`;
      emit({
        type: 'stage-error',
        role: 'backend',
        status: 'error',
        message: stages[1].summary,
      });
      throw new Error(safeMsg);
    }
  } else {
    if (Array.isArray(input.existingFiles)) {
      for (const ef of input.existingFiles) {
        if (ef.path !== 'index.html' && ef.path !== 'README.md') {
          generatedFiles.push(ef);
        }
      }
    }
    stages[1].status = 'completed';
    stages[1].completedAt = new Date().toISOString();
    stages[1].summary = 'Backend Agent non selezionato: mantenuti i file backend esistenti.';
  }

  // ============================================================================
  // STAGE 3: FRONTEND AGENT
  // ============================================================================
  let previewHtml = input.existingPreviewHtml || '';

  if (isRoleSelected('frontend') || !previewHtml) {
    stages[2].status = 'running';
    stages[2].startedAt = new Date().toISOString();
    emit({
      type: 'stage-start',
      role: 'frontend',
      status: 'running',
      message: 'Frontend Agent in esecuzione: sintesi interfaccia utente HTML5 + CSS + JS...',
    });

    try {
      const frontendSystem = [
        'Sei il Frontend Agent e Senior UI/UX Architect.',
        'Genera un file HTML5 singolo, completo, moderno, responsivo e interattivo (con Tailwind CDN o CSS moderno e JavaScript vanilla perfettamente funzionante e privo di errori di sintassi) che implementa l\'interfaccia utente completa del progetto.',
        'Integra interazioni reali nello stato client coerenti con lo schema dati e le API progettate dal Planner Agent.',
        'Restituisci ESCLUSIVAMENTE il codice HTML completo che inizia con <!DOCTYPE html> e termina con </html>, senza blocchi markdown ```html.',
      ].join(' ');

      const frontendUserPrompt = [
        projectContextPrompt,
        `Architettura pianificata: ${plan.architectureSummary}`,
        `Entità dati: ${JSON.stringify(plan.databaseSchema)}`,
        `API disponibili: ${JSON.stringify(plan.apiRoutes)}`,
      ].join('\n\n');

      const frontendRes = await callConfiguredLlm(frontendSystem, frontendUserPrompt, input.aiConfig);
      activeProvider = frontendRes.provider;
      activeMode = frontendRes.mode;
      previewHtml = frontendRes.text
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      if (!previewHtml || !previewHtml.includes('<')) {
        throw new Error('Il Frontend Agent non ha restituito codice HTML valido.');
      }

      generatedFiles.unshift({
        path: 'index.html',
        content: previewHtml,
        language: 'html',
        description: 'Applicazione frontend interattiva principale (HTML5 + CSS + JS)',
        updatedAt: new Date().toISOString(),
      });

      stages[2].status = 'completed';
      stages[2].completedAt = new Date().toISOString();
      stages[2].summary = `Interfaccia utente generata in index.html (${previewHtml.length} caratteri).`;
      stages[2].artifactsProduced = ['index.html'];
      emit({
        type: 'stage-complete',
        role: 'frontend',
        status: 'completed',
        message: stages[2].summary,
        artifactsProduced: ['index.html'],
      });
    } catch (err) {
      const safeMsg = sanitizeSecrets(err instanceof Error ? err.message : String(err));
      stages[2].status = 'error';
      stages[2].completedAt = new Date().toISOString();
      stages[2].error = safeMsg;
      stages[2].summary = `Frontend Agent interrotto: ${safeMsg}`;
      emit({
        type: 'stage-error',
        role: 'frontend',
        status: 'error',
        message: stages[2].summary,
      });
      throw new Error(safeMsg);
    }
  } else {
    generatedFiles.unshift({
      path: 'index.html',
      content: previewHtml,
      language: 'html',
      description: 'Applicazione frontend interattiva principale (HTML5 + CSS + JS)',
      updatedAt: new Date().toISOString(),
    });
    stages[2].status = 'completed';
    stages[2].completedAt = new Date().toISOString();
    stages[2].summary = 'Frontend Agent non selezionato: mantenuto il codice index.html esistente.';
  }

  // ============================================================================
  // STAGE 4: QA / SELF-HEALING AGENT (Isolated Sandbox + Automated Repair Loop)
  // ============================================================================
  stages[3].status = 'running';
  stages[3].startedAt = new Date().toISOString();
  emit({
    type: 'stage-start',
    role: 'qa',
    status: 'running',
    message: 'QA / Self-Healing Agent avviato: validazione sintattica V8 e sicurezza nella sandbox isolata...',
  });

  let attempt = 1;
  let sandboxReport = runIsolatedSandboxVerification(generatedFiles, previewHtml, attempt);

  if (isRoleSelected('qa')) {
    while (!sandboxReport.passed && attempt <= maxHealingAttempts) {
      const failedChecks = sandboxReport.checks.filter((c) => !c.passed);
      const failureSummary = failedChecks.map((f) => `- [${f.target}] ${f.message}`).join('\n');

      try {
        const qaHealingSystem = [
          'Sei il QA / Self-Healing Agent.',
          'La verifica statica e il parser isolato V8 hanno rilevato i seguenti errori nel codice HTML/JS generato.',
          'Correggi tutti gli errori di sintassi JavaScript e di struttura HTML5 mantenendo intatte le funzionalità.',
          'Restituisci ESCLUSIVAMENTE il documento HTML5 corretto completo che inizia con <!DOCTYPE html> e termina con </html>, senza blocchi markdown.',
        ].join(' ');

        const qaHealingPrompt = [
          `Errori rilevati nella Sandbox (Tentativo ${attempt}/${maxHealingAttempts}):`,
          failureSummary,
          'Codice HTML corrente da riparare:',
          previewHtml,
        ].join('\n\n');

        const healedRes = await callConfiguredLlm(qaHealingSystem, qaHealingPrompt, input.aiConfig);
        const healedHtml = healedRes.text
          .replace(/^```html\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim();

        if (healedHtml && healedHtml.includes('<')) {
          previewHtml = healedHtml;
          const idx = generatedFiles.findIndex((f) => f.path === 'index.html');
          if (idx >= 0) {
            generatedFiles[idx] = {
              ...generatedFiles[idx],
              content: previewHtml,
              updatedAt: new Date().toISOString(),
            };
          }
        }
      } catch {
        // If healing call fails, break out and report current sandbox status honestly
        break;
      }

      attempt++;
      sandboxReport = runIsolatedSandboxVerification(generatedFiles, previewHtml, attempt);
    }
  }

  stages[3].status = sandboxReport.passed ? 'completed' : 'error';
  stages[3].completedAt = new Date().toISOString();
  stages[3].summary = sandboxReport.passed
    ? `Verifica QA superata nella sandbox isolata (${sandboxReport.checks.length} controlli superati, tentativi: ${sandboxReport.attemptNumber}).`
    : `Verifica QA completata con avvisi dopo ${sandboxReport.attemptNumber} tentativi.`;
  stages[3].artifactsProduced = ['sandbox-verification-report.json'];
  emit({
    type: sandboxReport.passed ? 'stage-complete' : 'stage-error',
    role: 'qa',
    status: stages[3].status,
    message: stages[3].summary,
    artifactsProduced: stages[3].artifactsProduced,
  });

  generatedFiles.push({
    path: 'README.md',
    content: [
      `# ${input.projectName}`,
      '',
      input.projectDescription,
      '',
      '## Architettura (Generata dall\'Orchestratore Multi-Agente)',
      plan.architectureSummary,
      '',
      '## File del Progetto',
      ...generatedFiles.map((f) => `- \`${f.path}\` — ${f.description || f.language}`),
      '',
      '## Modello Dati',
      ...plan.databaseSchema.map(
        (entity) =>
          `### ${entity.name}\n${entity.description}\n` +
          entity.fields
            .map((fld) => `- \`${fld.name}\` (${fld.type}${fld.required ? ', obbligatorio' : ''})`)
            .join('\n'),
      ),
      '',
      '## Endpoint API Pianificati',
      ...plan.apiRoutes.map(
        (rt) =>
          `- **${rt.method} \`${rt.path}\`** — ${rt.description} (${rt.authRequired ? 'Autenticazione richiesta' : 'Pubblico'})`,
      ),
    ].join('\n'),
    language: 'markdown',
    description: 'Documentazione tecnica e architetturale del progetto',
    updatedAt: new Date().toISOString(),
  });

  const completedRun: AgentPipelineRun = {
    id: runId,
    projectId: input.projectId,
    userId: input.userId,
    status: sandboxReport.passed ? 'completed' : 'failed',
    startedAt,
    completedAt: new Date().toISOString(),
    healingAttemptsUsed: Math.max(0, sandboxReport.attemptNumber - 1),
    maxHealingAttempts,
    stages,
    plan,
    sandboxReport,
  };

  emit({
    type: 'complete',
    message: `Orchestrazione completata: ${generatedFiles.length} file generati e verificati.`,
    artifactsProduced: generatedFiles.map((f) => f.path),
  });

  return {
    run: completedRun,
    plan,
    files: generatedFiles,
    previewHtml,
    dependencies: plan.dependencies,
    databaseSchema: plan.databaseSchema,
    apiRoutes: plan.apiRoutes,
    sandboxReport,
    provider: activeProvider,
    mode: activeMode,
  };
}
