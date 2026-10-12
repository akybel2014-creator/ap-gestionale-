import type { Project, AppSettings, ActivityLogEntry, ProjectChatMessage } from '@/types';
import { STORAGE_KEYS } from '@/lib/constants';

const DEFAULT_SETTINGS: AppSettings = {
  ai: {
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-flash-latest',
    endpoint: 'https://generativelanguage.googleapis.com',
  },
  github: {
    username: '',
    token: '',
  },
  theme: {
    accentColor: 'blue',
    sidebarStyle: 'navy',
  },
};

export function sanitizeInstructionText(rawText: string): string {
  // Never store API keys, GitHub tokens, Bearer tokens, or raw HTML/source code payloads in activity logs
  return rawText
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[CHIAVE_API_OMESSA]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g, '[TOKEN_GITHUB_OMESSO]')
    .replace(/\bgithub_pat_[A-Za-z0-9_]{16,}\b/g, '[TOKEN_GITHUB_OMESSO]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[CHIAVE_API_OMESSA]')
    .replace(/\bgsk_[A-Za-z0-9_-]{16,}\b/g, '[CHIAVE_API_OMESSA]')
    .replace(/<!DOCTYPE\s+html[\s\S]*/gi, '[CODICE_SORGENTE_OMESSO]')
    .replace(/<html[\s\S]*?<\/html>/gi, '[CODICE_SORGENTE_OMESSO]');
}

export const PREVIEW_CSP_CONTENT =
  "default-src 'none'; script-src 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src https://fonts.gstatic.com data:; img-src data: blob: https:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none';";

/**
 * Wraps untrusted preview HTML with a strict Content-Security-Policy meta tag and parent/top isolation guard.
 * Used together with `<iframe sandbox="allow-scripts">` (without `allow-same-origin`) so the preview runs
 * in an opaque origin (`null`) and cannot access parent cookies, localStorage, DOM, or internal `/api/*` routes.
 */
export function buildIsolatedPreviewSrcDoc(rawHtml: string): string {
  const html = (rawHtml || '').trim();
  const cspMetaTag = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP_CONTENT}" />`;
  const isolationGuardScript = `<script>(function(){try{var p=window.parent;var safeProxy={postMessage:function(m,t){try{if(p&&p!==window&&typeof p.postMessage==='function'){p.postMessage(m,t||'*');}}catch(_e){}}};Object.defineProperty(window,'parent',{get:function(){return safeProxy;}});Object.defineProperty(window,'top',{get:function(){return safeProxy;}});Object.defineProperty(window,'opener',{get:function(){return null;}});}catch(_e){}})();</script>`;

  if (!html) {
    return `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8" />${cspMetaTag}${isolationGuardScript}</head><body></body></html>`;
  }

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

export function formatCounterActivityMessage(
  action: 'increment' | 'decrement' | 'reset',
  previousValue: number,
  newValue: number,
  step: number,
  title: string,
): string {
  const safeTitle = (title || 'Contatore Interattivo Personalizzato').trim();
  if (action === 'increment') {
    return `[CONTATORE] Incremento (+${step}) in "${safeTitle}": stato aggiornato da ${previousValue} a ${newValue}`;
  }
  if (action === 'decrement') {
    return `[CONTATORE] Decremento (-${step}) in "${safeTitle}": stato aggiornato da ${previousValue} a ${newValue}`;
  }
  return `[CONTATORE] Azzeramento in "${safeTitle}": stato riportato da ${previousValue} a ${newValue}`;
}

export function parseLatestCounterValueFromLogs(
  logs: ActivityLogEntry[],
  projectId: string,
  userId?: string,
): number | null {
  if (!Array.isArray(logs) || !projectId) return null;
  const matching = logs
    .filter((entry) => {
      if (!entry || entry.projectId !== projectId) return false;
      if (userId && (entry.userId || 'admin-it') !== userId) return false;
      return typeof entry.instructionText === 'string' && entry.instructionText.startsWith('[CONTATORE]');
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  for (const item of matching) {
    const match = item.instructionText.match(/da\s+(-?\d+)\s+a\s+(-?\d+)\s*$/);
    if (match) {
      const parsed = Number.parseInt(match[2], 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

export function loadProjectChatHistory(
  projectId: string,
  fallbackMessages?: ProjectChatMessage[],
): ProjectChatMessage[] {
  if (Array.isArray(fallbackMessages) && fallbackMessages.length > 0) {
    return fallbackMessages.filter((m) => m && m.projectId === projectId);
  }
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(`ai_app_builder_chat_history::${projectId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ProjectChatMessage[]).filter(
      (m) => m && typeof m.id === 'string' && m.projectId === projectId,
    );
  } catch {
    return [];
  }
}

export function saveProjectChatHistory(
  projectId: string,
  messages: ProjectChatMessage[],
): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const scoped = messages.filter((m) => m && m.projectId === projectId).slice(-50);
    window.localStorage.setItem(
      `ai_app_builder_chat_history::${projectId}`,
      JSON.stringify(scoped),
    );
  } catch {
    // Ignore storage quota errors
  }
}

function escapeHtmlAttr(raw: string): string {
  return (raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a functional, interactive HTML5 starter application with a customizable title
 * and a working counter (increment, decrement, step selector, reset, and session history),
 * replacing the static waiting placeholder screen.
 */
export function buildInteractiveProjectStarterHtml(
  projectName?: string,
  projectDescription?: string,
): string {
  const safeTitle = escapeHtmlAttr((projectName || '').trim() || 'Contatore Interattivo Personalizzato');
  const safeDesc = escapeHtmlAttr(
    (projectDescription || '').trim() ||
      'Interfaccia interattiva con titolo personalizzabile in tempo reale e pulsante contatore funzionante.',
  );

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      background-color: #f8fafc;
      color: #0f172a;
      display: flex;
      flex-direction: column;
    }
    header {
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
      padding: 1.25rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .brand-meta {
      font-size: 0.75rem;
      color: #64748b;
      letter-spacing: 0.02em;
    }
    main {
      flex: 1;
      max-width: 960px;
      width: 100%;
      margin: 0 auto;
      padding: 2.5rem 2rem;
      display: grid;
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    @media (min-width: 768px) {
      main {
        grid-template-columns: 1.15fr 0.85fr;
        align-items: start;
      }
    }
    .surface-panel {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 2rem;
    }
    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      line-height: 1.2;
      color: #0f172a;
      margin-bottom: 0.625rem;
      word-break: break-word;
    }
    .subtitle {
      font-size: 0.9375rem;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 1.75rem;
    }
    .counter-display-box {
      padding: 1.75rem 0;
      border-top: 1px solid #f1f5f9;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 1.75rem;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    }
    .counter-label {
      font-size: 0.8125rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .counter-value {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 3.5rem;
      font-weight: 700;
      line-height: 1;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
    }
    .controls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    button {
      font-family: inherit;
      font-size: 0.875rem;
      font-weight: 600;
      padding: 0.6875rem 1.25rem;
      border-radius: 10px;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.08s ease;
      min-height: 42px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    button:active {
      transform: translateY(1px);
    }
    .btn-primary {
      background-color: #0f172a;
      color: #ffffff;
      border: 1px solid #0f172a;
      flex: 1;
    }
    .btn-primary:hover {
      background-color: #1e293b;
    }
    .btn-secondary {
      background-color: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background-color: #f8fafc;
      border-color: #94a3b8;
    }
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #334155;
    }
    input[type="text"], select {
      width: 100%;
      padding: 0.625rem 0.875rem;
      font-family: inherit;
      font-size: 0.875rem;
      color: #0f172a;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      min-height: 42px;
    }
    input[type="text"]:focus, select:focus {
      outline: 2px solid #0284c7;
      outline-offset: 1px;
      border-color: #0284c7;
    }
    .history-list {
      list-style: none;
      margin-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    .history-item {
      padding: 0.625rem 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.8125rem;
      color: #475569;
      display: flex;
      justify-content: space-between;
      font-variant-numeric: tabular-nums;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand-meta">Applicazione Interattiva · Stato Locale Attivo</div>
    <div class="brand-meta" id="status-meta">Incremento corrente: +1 · Clic totali: 0</div>
  </header>

  <main>
    <section class="surface-panel" aria-labelledby="custom-Heading">
      <h1 id="custom-Heading">${safeTitle}</h1>
      <p class="subtitle" id="custom-Subtitle">${safeDesc}</p>

      <div class="counter-display-box">
        <span class="counter-label">Valore Contatore</span>
        <span class="counter-value" id="counter-value" aria-live="polite">0</span>
      </div>

      <div class="controls-row">
        <button type="button" class="btn-primary" id="btn-increment">
          Incrementa Contatore (+1)
        </button>
        <button type="button" class="btn-secondary" id="btn-decrement" aria-label="Decrementa contatore">
          Decrementa (-1)
        </button>
        <button type="button" class="btn-secondary" id="btn-reset">
          Azzera
        </button>
      </div>
    </section>

    <aside class="surface-panel" aria-label="Personalizzazione titolo e passo">
      <div class="field-group">
        <label for="title-input">Titolo Personalizzato</label>
        <input
          type="text"
          id="title-input"
          value="${safeTitle}"
          placeholder="Inserisci un titolo personalizzato..."
        />
      </div>

      <div class="field-group">
        <label for="step-select">Passo del Contatore</label>
        <select id="step-select">
          <option value="1">Passo standard (1)</option>
          <option value="5">Passo rapido (5)</option>
          <option value="10">Passo decina (10)</option>
        </select>
      </div>

      <div>
        <label>Ultime operazioni</label>
        <ul class="history-list" id="history-list">
          <li class="history-item">
            <span>Contatore inizializzato</span>
            <span>Valore: 0</span>
          </li>
        </ul>
      </div>
    </aside>
  </main>

  <script>
    (function () {
      var count = 0;
      var step = 1;
      var totalClicks = 0;

      var headingEl = document.getElementById('custom-Heading');
      var counterValueEl = document.getElementById('counter-value');
      var statusMetaEl = document.getElementById('status-meta');
      var btnInc = document.getElementById('btn-increment');
      var btnDec = document.getElementById('btn-decrement');
      var btnReset = document.getElementById('btn-reset');
      var titleInput = document.getElementById('title-input');
      var stepSelect = document.getElementById('step-select');
      var historyList = document.getElementById('history-list');

      function notifyActivityLog(actionType, prevVal, nextVal, currentStep) {
        try {
          var currentTitle = (headingEl && headingEl.textContent) ? headingEl.textContent.trim() : 'Contatore Interattivo Personalizzato';
          if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
            window.parent.postMessage({
              type: 'AI_APP_BUILDER_COUNTER_ACTIVITY',
              action: actionType,
              previousValue: prevVal,
              newValue: nextVal,
              step: currentStep,
              title: currentTitle,
              timestamp: new Date().toISOString()
            }, '*');
          }
        } catch (_err) {
          // Ignore cross-frame messaging errors
        }
      }

      function appendHistory(actionLabel) {
        if (!historyList) return;
        var li = document.createElement('li');
        li.className = 'history-item';
        var left = document.createElement('span');
        left.textContent = actionLabel;
        var right = document.createElement('span');
        right.textContent = 'Valore: ' + count;
        li.appendChild(left);
        li.appendChild(right);
        historyList.insertBefore(li, historyList.firstChild);
        while (historyList.children.length > 5) {
          historyList.removeChild(historyList.lastChild);
        }
      }

      function render() {
        if (counterValueEl) counterValueEl.textContent = String(count);
        if (btnInc) btnInc.textContent = 'Incrementa Contatore (+' + step + ')';
        if (btnDec) btnDec.textContent = 'Decrementa (-' + step + ')';
        if (statusMetaEl) {
          statusMetaEl.textContent = 'Incremento corrente: +' + step + ' · Clic totali: ' + totalClicks;
        }
      }

      if (btnInc) {
        btnInc.addEventListener('click', function () {
          var prevVal = count;
          count += step;
          totalClicks += 1;
          render();
          appendHistory('Incremento (+' + step + ')');
          notifyActivityLog('increment', prevVal, count, step);
        });
      }

      if (btnDec) {
        btnDec.addEventListener('click', function () {
          var prevVal = count;
          count -= step;
          totalClicks += 1;
          render();
          appendHistory('Decremento (-' + step + ')');
          notifyActivityLog('decrement', prevVal, count, step);
        });
      }

      if (btnReset) {
        btnReset.addEventListener('click', function () {
          var prevVal = count;
          count = 0;
          totalClicks += 1;
          render();
          appendHistory('Contatore azzerato');
          notifyActivityLog('reset', prevVal, count, step);
        });
      }

      if (titleInput && headingEl) {
        titleInput.addEventListener('input', function (e) {
          var nextTitle = e.target.value.trim() || 'Contatore Interattivo Personalizzato';
          headingEl.textContent = nextTitle;
          document.title = nextTitle;
        });
      }

      if (stepSelect) {
        stepSelect.addEventListener('change', function (e) {
          var parsed = parseInt(e.target.value, 10);
          step = isNaN(parsed) || parsed < 1 ? 1 : parsed;
          render();
        });
      }
    })();
  </script>
</body>
</html>`;
}

export function computeCodeVersionReference(project: Project): string {
  // Deterministic version identifier referencing the project state & generated code revision without exposing source code
  const revNumber = project.instructions.length + (project.status === 'generated' ? 1 : 0);
  const stateTag = project.status === 'generated' ? 'gen' : 'draft';
  const filesDigest = Array.isArray(project.files)
    ? project.files.map((f) => `${f.path}:${f.content?.length || 0}`).join('|')
    : '';
  const basis = `${project.id}:${project.status}:${project.instructions.length}:${
    project.previewHtml ? project.previewHtml.length : 0
  }:${filesDigest}:${project.updatedAt}`;

  let hash = 2166136261;
  for (let i = 0; i < basis.length; i++) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const shortChecksum = (hash >>> 0).toString(16).padStart(8, '0').slice(0, 7);
  return `v1.${revNumber}-${stateTag}.${shortChecksum}`;
}

export function isExportActivityEntry(entry: ActivityLogEntry): boolean {
  const rawType = (entry.type || '').toUpperCase();
  const rawActivityType = (entry.activityType || '').toUpperCase();
  return (
    rawType === 'EXPORT' ||
    rawType === 'EXPORT_PROJECT' ||
    rawActivityType === 'EXPORT' ||
    rawActivityType === 'EXPORT_PROJECT' ||
    entry.status === 'exported'
  );
}

export function getScopedStorageKey(baseKey: string, userId?: string): string {
  if (!userId || !userId.trim()) return baseKey;
  return `${baseKey}:${userId.trim()}`;
}

/**
 * Resolves synchronization conflicts between a local project and an incoming remote project.
 * Never overwrites a project belonging to a different owner, and preserves newer local edits
 * based on validated ISO timestamps and instruction revision count.
 */
export function resolveProjectSyncConflict(
  localProject: Project | undefined,
  remoteProject: Project,
  expectedOwnerId: string,
): Project | null {
  const remoteOwner = remoteProject.userId || 'admin-it';
  if (remoteOwner !== expectedOwnerId) {
    return null;
  }

  if (!localProject) {
    return {
      ...remoteProject,
      userId: expectedOwnerId,
      codeVersion: remoteProject.codeVersion || computeCodeVersionReference(remoteProject),
    };
  }

  const localOwner = localProject.userId || 'admin-it';
  if (localOwner !== expectedOwnerId) {
    return null;
  }

  const localTime = Date.parse(localProject.updatedAt || localProject.createdAt || '');
  const remoteTime = Date.parse(remoteProject.updatedAt || remoteProject.createdAt || '');

  const localValid = !Number.isNaN(localTime);
  const remoteValid = !Number.isNaN(remoteTime);

  if (localValid && remoteValid) {
    if (localTime > remoteTime) {
      return localProject;
    }
    if (remoteTime > localTime) {
      return {
        ...remoteProject,
        userId: expectedOwnerId,
        codeVersion: remoteProject.codeVersion || computeCodeVersionReference(remoteProject),
      };
    }
  }

  // Tie-breaker when timestamps are equal or unparseable: prefer the copy with more instructions or generated HTML
  const localRev =
    (localProject.instructions?.length || 0) + (localProject.previewHtml ? 1 : 0);
  const remoteRev =
    (remoteProject.instructions?.length || 0) + (remoteProject.previewHtml ? 1 : 0);

  if (localRev >= remoteRev) {
    return localProject;
  }

  return {
    ...remoteProject,
    userId: expectedOwnerId,
    codeVersion: remoteProject.codeVersion || computeCodeVersionReference(remoteProject),
  };
}

function normalizeProjectList(parsed: unknown, filterUserId?: string): Project[] {
  if (!Array.isArray(parsed)) return [];
  return (parsed as Project[])
    .filter((p) => {
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') return false;
      if (filterUserId) {
        const owner = p.userId || 'admin-it';
        return owner === filterUserId;
      }
      return true;
    })
    .map((p) => {
      const normalized: Project = {
        ...p,
        userId: p.userId || filterUserId || 'admin-it',
        description: typeof p.description === 'string' ? p.description : '',
        type: p.type || 'webapp',
        status: p.status || 'draft',
        instructions: Array.isArray(p.instructions) ? p.instructions : [],
        previewHtml: typeof p.previewHtml === 'string' ? p.previewHtml : null,
        ...(Array.isArray(p.files) ? { files: p.files } : {}),
        ...(p.dependencies && typeof p.dependencies === 'object'
          ? { dependencies: p.dependencies }
          : {}),
        ...(Array.isArray(p.databaseSchema) ? { databaseSchema: p.databaseSchema } : {}),
        ...(Array.isArray(p.apiRoutes) ? { apiRoutes: p.apiRoutes } : {}),
        ...(Array.isArray(p.versions) ? { versions: p.versions } : {}),
        ...(p.lastAgentRun && typeof p.lastAgentRun === 'object'
          ? { lastAgentRun: p.lastAgentRun }
          : {}),
        ...(Array.isArray(p.chatMessages) ? { chatMessages: p.chatMessages } : {}),
        ...(p.preferredOutputMode ? { preferredOutputMode: p.preferredOutputMode } : {}),
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
      };
      return {
        ...normalized,
        codeVersion: normalized.codeVersion || computeCodeVersionReference(normalized),
      };
    });
}

export function loadProjects(userId?: string): Project[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    if (userId) {
      const scopedKey = getScopedStorageKey(STORAGE_KEYS.PROJECTS, userId);
      const scopedRaw = window.localStorage.getItem(scopedKey);
      if (scopedRaw) {
        const scopedParsed = JSON.parse(scopedRaw);
        return normalizeProjectList(scopedParsed, userId);
      }
    }

    const raw = window.localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizeProjectList(parsed, userId);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[], userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (userId) {
      const scopedProjects = projects.filter((p) => (p.userId || 'admin-it') === userId);
      const scopedKey = getScopedStorageKey(STORAGE_KEYS.PROJECTS, userId);
      window.localStorage.setItem(scopedKey, JSON.stringify(scopedProjects));

      // Non-destructively preserve other users' records in the legacy shared key while updating only this user's slice
      const existingSharedRaw = window.localStorage.getItem(STORAGE_KEYS.PROJECTS);
      let otherUsersProjects: Project[] = [];
      if (existingSharedRaw) {
        try {
          const parsedShared = JSON.parse(existingSharedRaw);
          if (Array.isArray(parsedShared)) {
            otherUsersProjects = (parsedShared as Project[]).filter(
              (p) => p && typeof p.id === 'string' && (p.userId || 'admin-it') !== userId,
            );
          }
        } catch {
          otherUsersProjects = [];
        }
      }
      window.localStorage.setItem(
        STORAGE_KEYS.PROJECTS,
        JSON.stringify([...scopedProjects, ...otherUsersProjects]),
      );
      return;
    }

    window.localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Errore nel salvataggio dei progetti:', e);
  }
}

export function loadActivityLogs(userId?: string): {
  logs: ActivityLogEntry[];
  error: string | null;
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { logs: [], error: null };
  }
  try {
    const filterValid = (parsed: unknown): ActivityLogEntry[] => {
      if (!Array.isArray(parsed)) return [];
      return (parsed as ActivityLogEntry[]).filter((item) => {
        if (
          !item ||
          typeof item.id !== 'string' ||
          typeof item.projectId !== 'string' ||
          typeof item.instructionText !== 'string' ||
          item.instructionText.trim().length === 0 ||
          typeof item.timestamp !== 'string'
        ) {
          return false;
        }
        if (userId) {
          return (item.userId || 'admin-it') === userId;
        }
        return true;
      });
    };

    if (userId) {
      const scopedKey = getScopedStorageKey(STORAGE_KEYS.ACTIVITY_LOGS, userId);
      const scopedRaw = window.localStorage.getItem(scopedKey);
      if (scopedRaw) {
        const scopedParsed = JSON.parse(scopedRaw);
        if (!Array.isArray(scopedParsed)) {
          return { logs: [], error: 'Formato della cronologia attività non valido.' };
        }
        return { logs: filterValid(scopedParsed), error: null };
      }
    }

    const raw = window.localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
    if (!raw) return { logs: [], error: null };
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { logs: [], error: 'Formato della cronologia attività non valido.' };
    }
    return { logs: filterValid(parsed), error: null };
  } catch {
    return {
      logs: [],
      error: 'Impossibile leggere la cronologia attività locale dal browser.',
    };
  }
}

export function saveActivityLogs(logs: ActivityLogEntry[], userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    if (userId) {
      const scopedLogs = logs.filter((l) => (l.userId || 'admin-it') === userId);
      const scopedKey = getScopedStorageKey(STORAGE_KEYS.ACTIVITY_LOGS, userId);
      window.localStorage.setItem(scopedKey, JSON.stringify(scopedLogs));

      const existingSharedRaw = window.localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
      let otherUsersLogs: ActivityLogEntry[] = [];
      if (existingSharedRaw) {
        try {
          const parsedShared = JSON.parse(existingSharedRaw);
          if (Array.isArray(parsedShared)) {
            otherUsersLogs = (parsedShared as ActivityLogEntry[]).filter(
              (l) => l && typeof l.id === 'string' && (l.userId || 'admin-it') !== userId,
            );
          }
        } catch {
          otherUsersLogs = [];
        }
      }
      window.localStorage.setItem(
        STORAGE_KEYS.ACTIVITY_LOGS,
        JSON.stringify([...scopedLogs, ...otherUsersLogs]),
      );
      return;
    }

    window.localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Errore nel salvataggio della cronologia attività:', e);
  }
}

export function serializeSettingsForStorage(settings: AppSettings): AppSettings {
  // Never persist API keys (BYOK) or GitHub Personal Access Tokens in localStorage
  return {
    ai: {
      provider: settings.ai?.provider || '',
      apiKey: '',
      model: settings.ai?.model || '',
      endpoint: settings.ai?.endpoint || '',
    },
    github: {
      username: settings.github?.username || '',
      token: '',
    },
    theme: {
      accentColor: settings.theme?.accentColor || 'blue',
      sidebarStyle: settings.theme?.sidebarStyle || 'navy',
    },
  };
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const rawProvider = typeof parsed.ai?.provider === 'string' && parsed.ai.provider.trim() ? parsed.ai.provider.trim() : 'gemini';
    const rawModel = typeof parsed.ai?.model === 'string' && parsed.ai.model.trim() ? parsed.ai.model.trim() : '';
    const defaultGeminiModel =
      !rawModel || rawModel === 'gemini-1.5-flash' || rawModel === 'gemini-1.5-pro' || rawModel === 'gemini-2.0-flash'
        ? 'gemini-flash-latest'
        : rawModel;
    const loaded: AppSettings = {
      ai: {
        provider: rawProvider as AppSettings['ai']['provider'],
        // Never restore persisted API keys from localStorage; BYOK keys remain in session memory only
        apiKey: '',
        model: rawProvider === 'gemini' || rawProvider === 'managed' ? defaultGeminiModel : rawModel,
        endpoint:
          typeof parsed.ai?.endpoint === 'string' && parsed.ai.endpoint.trim()
            ? parsed.ai.endpoint
            : rawProvider === 'gemini'
              ? 'https://generativelanguage.googleapis.com'
              : '',
      },
      github: {
        username: typeof parsed.github?.username === 'string' ? parsed.github.username : '',
        // Always scrub any previously stored GitHub token from memory and storage
        token: '',
      },
      theme: {
        accentColor: parsed.theme?.accentColor || 'blue',
        sidebarStyle: parsed.theme?.sidebarStyle || 'navy',
      },
    };
    // If legacy storage contained a persisted API key or GitHub token, overwrite it immediately with the scrubbed version
    if (parsed?.github?.token || parsed?.ai?.apiKey) {
      window.localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(serializeSettingsForStorage(loaded)),
      );
    }
    return loaded;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const safeSettings = serializeSettingsForStorage(settings);
    window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(safeSettings));
  } catch (e) {
    console.error('Errore nel salvataggio delle impostazioni:', e);
  }
}

export function clearSessionAiCredentials(currentSettings: AppSettings): AppSettings {
  const cleared: AppSettings = {
    ...currentSettings,
    ai: {
      ...currentSettings.ai,
      apiKey: '',
    },
    github: {
      ...currentSettings.github,
      token: '',
    },
  };
  saveSettings(cleared);
  return cleared;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

