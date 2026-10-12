import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  getPublicPath,
  type PublicPageKey,
} from './src/lib/i18n.ts';
import {
  TRUSTED_PLANS,
  PLAN_ORDER,
  resolveTrustedPlanSelection,
  type PlanId,
  type BillingPeriod,
} from './src/lib/plans.ts';
import {
  runMultiAgentOrchestrator,
  runIsolatedSandboxVerification,
  callConfiguredLlm,
  verifyAiProviderConnection,
} from './src/lib/agentOrchestrator.ts';
import type {
  ProjectFile,
  ProjectDatabaseEntity,
  ProjectApiRouteSpec,
  ProjectVersionSnapshot,
  AgentPipelineRun,
  OutputPresentationMode,
} from './src/types/index.ts';
import { renderRouteHtml } from './src/entry-server.tsx';
import {
  sanitizeUserText,
  validateSyncRoomCode,
  sanitizeHexColor,
  generateStreamVerseLlmsTxt,
} from './src/lib/streamVerseSecuritySeo.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Active admin sessions in memory (HttpOnly cookie verification)
const activeAdminSessions = new Set<string>();
const ADMIN_COOKIE_NAME = 'ai_app_builder_admin_session';
const USER_COOKIE_NAME = 'ai_app_builder_user_session';
const ACTIVITY_LOG_FILE = path.resolve(__dirname, '.data', 'activity-logs.json');
const USERS_FILE = path.resolve(__dirname, '.data', 'users.json');
const PROJECTS_FILE = path.resolve(__dirname, '.data', 'projects.json');

export function isSecureAdminCredentialConfigured(rawEnvPassphrase?: string): boolean {
  const configured = (rawEnvPassphrase ?? process.env.ADMIN_PASSWORD ?? '').trim();
  if (configured.length < 8) return false;
  if (configured.toLowerCase() === 'admin' || configured.toLowerCase() === 'password') {
    return false;
  }
  return true;
}

export function verifyAdminPassphrase(
  submittedPassphrase: unknown,
  rawEnvPassphrase?: string,
): { allowed: boolean; configured: boolean; errorCode?: string; error?: string } {
  const configured = (rawEnvPassphrase ?? process.env.ADMIN_PASSWORD ?? '').trim();
  if (!isSecureAdminCredentialConfigured(configured)) {
    return {
      allowed: false,
      configured: false,
      errorCode: 'ADMIN_CREDENTIALS_NOT_CONFIGURED',
      error:
        'Accesso amministrativo disabilitato: la credenziale sicura ADMIN_PASSWORD (minimo 8 caratteri, diversa da "admin") non è configurata sul server.',
    };
  }

  const submitted = typeof submittedPassphrase === 'string' ? submittedPassphrase.trim() : '';
  if (!submitted || submitted.toLowerCase() === 'admin') {
    return {
      allowed: false,
      configured: true,
      errorCode: 'INVALID_ADMIN_CREDENTIALS',
      error: 'Credenziali non valide. Le password vuote o predefinite ("admin") non sono accettate.',
    };
  }

  const expectedBuf = Buffer.from(configured, 'utf-8');
  const submittedBuf = Buffer.from(submitted, 'utf-8');
  if (
    expectedBuf.length !== submittedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, submittedBuf)
  ) {
    return {
      allowed: false,
      configured: true,
      errorCode: 'INVALID_ADMIN_CREDENTIALS',
      error: 'Credenziali non valide. Verifica la chiave di accesso amministratore.',
    };
  }

  return {
    allowed: true,
    configured: true,
  };
}

export function isValidAdminSession(req: Request): boolean {
  if (!isSecureAdminCredentialConfigured()) return false;
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[ADMIN_COOKIE_NAME];
  return Boolean(token && activeAdminSessions.has(token));
}

interface ServerProjectRecord {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: string;
  status: 'draft' | 'generating' | 'generated' | 'error';
  instructions: Array<{
    id: string;
    text: string;
    timestamp: string;
    status?: string;
    projectId?: string;
    projectName?: string;
    userId?: string;
  }>;
  previewHtml: string | null;
  codeVersion?: string;
  files?: ProjectFile[];
  dependencies?: Record<string, string>;
  databaseSchema?: ProjectDatabaseEntity[];
  apiRoutes?: ProjectApiRouteSpec[];
  versions?: ProjectVersionSnapshot[];
  lastAgentRun?: AgentPipelineRun;
  preferredOutputMode?: OutputPresentationMode;
  createdAt: string;
  updatedAt: string;
}

function readServerProjects(): ServerProjectRecord[] {
  try {
    if (!fs.existsSync(PROJECTS_FILE)) return [];
    const raw = fs.readFileSync(PROJECTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ServerProjectRecord[]) : [];
  } catch {
    return [];
  }
}

function writeServerProjects(projects: ServerProjectRecord[]): void {
  try {
    const dir = path.dirname(PROJECTS_FILE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist server projects:', e);
  }
}

interface ServerUserRecord {
  id: string;
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: string;
  activeSubscription?: {
    planId: PlanId;
    billingPeriod: BillingPeriod;
    priceIdentifier: string;
    status: 'active';
    activatedAt: string;
  };
}

// Active user sessions in memory -> userId
const activeUserSessions = new Map<string, string>();

function readServerUsers(): ServerUserRecord[] {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ServerUserRecord[]) : [];
  } catch {
    return [];
  }
}

function writeServerUsers(users: ServerUserRecord[]): void {
  try {
    const dir = path.dirname(USERS_FILE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist server users:', e);
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function getAuthenticatedUser(req: Request): ServerUserRecord | null {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[USER_COOKIE_NAME];
  if (!token) return null;
  const userId = activeUserSessions.get(token);
  if (!userId) return null;
  const users = readServerUsers();
  return users.find((u) => u.id === userId) || null;
}

interface ServerActivityRecord {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  instructionText: string;
  timestamp: string;
  status: 'recorded' | 'generating' | 'generated' | 'exported' | 'error';
  type?: 'EXPORT' | 'EXPORT_PROJECT' | 'INSTRUCTION';
  activityType?: 'instruction' | 'INSTRUCTION' | 'export' | 'EXPORT' | 'EXPORT_PROJECT';
  codeVersion?: string;
}

function sanitizeServerText(rawText: string): string {
  return rawText
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, '[CHIAVE_API_OMESSA]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g, '[TOKEN_GITHUB_OMESSO]')
    .replace(/\bgithub_pat_[A-Za-z0-9_]{16,}\b/g, '[TOKEN_GITHUB_OMESSO]')
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, '[CHIAVE_API_OMESSA]')
    .replace(/\bgsk_[A-Za-z0-9_-]{16,}\b/g, '[CHIAVE_API_OMESSA]')
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*\b/gi, 'Bearer [TOKEN_OMESSO]')
    .replace(/(password|passphrase|secret|token|apikey)\s*[:=]\s*["']?[^\s"',;]+/gi, '$1=[OMESSO]')
    .replace(/<!DOCTYPE\s+html[\s\S]*/gi, '[CODICE_SORGENTE_OMESSO]')
    .replace(/<html[\s\S]*?<\/html>/gi, '[CODICE_SORGENTE_OMESSO]');
}

// Server-side rate limiting for AI generation requests (sliding window per authenticated principal/IP)
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AI_RATE_LIMIT_MAX_REQUESTS = 10;
const aiRateLimitBuckets = new Map<string, number[]>();

export function checkServerRateLimit(
  bucketKey: string,
  maxRequests: number = AI_RATE_LIMIT_MAX_REQUESTS,
  windowMs: number = AI_RATE_LIMIT_WINDOW_MS,
  nowMs: number = Date.now(),
): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const existing = aiRateLimitBuckets.get(bucketKey) || [];
  const activeTimestamps = existing.filter((t) => nowMs - t < windowMs);
  if (activeTimestamps.length >= maxRequests) {
    const oldest = activeTimestamps[0] || nowMs;
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (nowMs - oldest)) / 1000));
    aiRateLimitBuckets.set(bucketKey, activeTimestamps);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }
  activeTimestamps.push(nowMs);
  aiRateLimitBuckets.set(bucketKey, activeTimestamps);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, maxRequests - activeTimestamps.length),
  };
}

export function validateAiGenerationInput(body: unknown): {
  valid: boolean;
  errorCode?: string;
  error?: string;
  sanitizedProject?: {
    name: string;
    description: string;
    type: string;
    instructions: Array<{ text: string }>;
  };
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, errorCode: 'INVALID_PAYLOAD', error: 'Payload richiesta non valido.' };
  }
  const project = (body as { project?: unknown }).project;
  if (!project || typeof project !== 'object') {
    return { valid: false, errorCode: 'MISSING_PROJECT', error: 'Dati progetto mancanti.' };
  }

  const p = project as Record<string, unknown>;
  const name = typeof p.name === 'string' ? p.name.trim() : '';
  const description = typeof p.description === 'string' ? p.description.trim() : '';
  const type = typeof p.type === 'string' ? p.type.trim() : 'web-app';
  const rawInstructions = Array.isArray(p.instructions) ? p.instructions : [];

  if (name.length < 2 || name.length > 60) {
    return {
      valid: false,
      errorCode: 'INVALID_PROJECT_NAME_SIZE',
      error: 'Il nome del progetto deve essere compreso tra 2 e 60 caratteri.',
    };
  }
  if (description.length > 2000) {
    return {
      valid: false,
      errorCode: 'DESCRIPTION_TOO_LONG',
      error: 'La descrizione del progetto supera il limite massimo di 2.000 caratteri.',
    };
  }
  if (rawInstructions.length > 50) {
    return {
      valid: false,
      errorCode: 'TOO_MANY_INSTRUCTIONS',
      error: 'Il numero di istruzioni supera il limite massimo consentito (50).',
    };
  }

  const sanitizedInstructions: Array<{ text: string }> = [];
  let totalChars = name.length + description.length;

  for (const item of rawInstructions) {
    const text =
      item && typeof item === 'object' && typeof (item as { text?: unknown }).text === 'string'
        ? ((item as { text: string }).text || '').trim()
        : '';
    if (!text) continue;
    if (text.length > 1000) {
      return {
        valid: false,
        errorCode: 'INSTRUCTION_TOO_LONG',
        error: 'Una delle istruzioni supera il limite massimo di 1.000 caratteri.',
      };
    }
    totalChars += text.length;
    if (totalChars > 16000) {
      return {
        valid: false,
        errorCode: 'PROMPT_SIZE_LIMIT_EXCEEDED',
        error: 'La dimensione complessiva del prompt supera il limite massimo di sicurezza (16.000 caratteri).',
      };
    }
    sanitizedInstructions.push({ text });
  }

  return {
    valid: true,
    sanitizedProject: {
      name,
      description,
      type: type.slice(0, 32),
      instructions: sanitizedInstructions,
    },
  };
}

export function validateSandboxVerifyInput(body: unknown): {
  valid: boolean;
  errorCode?: string;
  error?: string;
  sanitizedFiles?: ProjectFile[];
  sanitizedPreviewHtml?: string | null;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, errorCode: 'INVALID_PAYLOAD', error: 'Payload di verifica non valido.' };
  }
  const b = body as Record<string, unknown>;
  const rawFiles = Array.isArray(b.files) ? b.files : [];
  if (rawFiles.length > 30) {
    return {
      valid: false,
      errorCode: 'TOO_MANY_FILES',
      error: 'Il numero di file supera il limite massimo consentito per la verifica (30).',
    };
  }

  const rawHtml =
    typeof b.previewHtml === 'string'
      ? b.previewHtml
      : b.previewHtml === null || b.previewHtml === undefined
        ? null
        : '';

  if (typeof rawHtml === 'string' && rawHtml.length > 250000) {
    return {
      valid: false,
      errorCode: 'PREVIEW_HTML_TOO_LARGE',
      error: 'Il documento HTML supera la dimensione massima consentita (250 KB).',
    };
  }

  let totalBytes = typeof rawHtml === 'string' ? rawHtml.length : 0;
  const allowedLangs = new Set(['html', 'typescript', 'javascript', 'css', 'json', 'markdown']);
  const sanitizedFiles: ProjectFile[] = [];

  for (const item of rawFiles) {
    if (!item || typeof item !== 'object') {
      return { valid: false, errorCode: 'INVALID_FILE_ENTRY', error: 'Voce file non valida.' };
    }
    const f = item as Record<string, unknown>;
    const filePath = typeof f.path === 'string' ? f.path.trim() : '';
    const content = typeof f.content === 'string' ? f.content : '';
    const lang = typeof f.language === 'string' ? f.language.trim() : 'javascript';

    if (!filePath || filePath.length > 128 || filePath.includes('..') || filePath.startsWith('/')) {
      return {
        valid: false,
        errorCode: 'INVALID_FILE_PATH',
        error: 'Percorso file mancante o non consentito.',
      };
    }
    if (content.length > 150000) {
      return {
        valid: false,
        errorCode: 'FILE_CONTENT_TOO_LARGE',
        error: `Il file ${filePath} supera la dimensione massima consentita (150 KB).`,
      };
    }
    totalBytes += content.length;
    if (totalBytes > 500000) {
      return {
        valid: false,
        errorCode: 'TOTAL_BUNDLE_TOO_LARGE',
        error: 'La dimensione complessiva dei file supera il limite massimo (500 KB).',
      };
    }

    sanitizedFiles.push({
      path: filePath,
      content,
      language: (allowedLangs.has(lang) ? lang : 'javascript') as ProjectFile['language'],
      description: typeof f.description === 'string' ? f.description.slice(0, 200) : undefined,
      updatedAt: typeof f.updatedAt === 'string' ? f.updatedAt.slice(0, 64) : new Date().toISOString(),
    });
  }

  return {
    valid: true,
    sanitizedFiles,
    sanitizedPreviewHtml: rawHtml,
  };
}

function readServerActivityLogs(): ServerActivityRecord[] {
  try {
    if (!fs.existsSync(ACTIVITY_LOG_FILE)) return [];
    const raw = fs.readFileSync(ACTIVITY_LOG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ServerActivityRecord[]) : [];
  } catch {
    return [];
  }
}

function writeServerActivityLogs(records: ServerActivityRecord[]): void {
  try {
    const dir = path.dirname(ACTIVITY_LOG_FILE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ACTIVITY_LOG_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist server activity logs:', e);
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      result[k] = v;
    }
  }
  return result;
}

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto =
    typeof protoHeader === 'string'
      ? protoHeader.split(',')[0].trim()
      : req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function generateSitemapXml(baseUrl: string): string {
  const pages: PublicPageKey[] = ['home', 'product', 'useCases', 'pricing', 'faq'];
  const lastmod = '2026-10-11';
  const urlBlocks: string[] = [];

  // Root StreamVerse Streaming Platform URL
  urlBlocks.push(
    [
      '  <url>',
      `    <loc>${baseUrl}/</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      '    <changefreq>daily</changefreq>',
      '    <priority>1.0</priority>',
      `    <xhtml:link rel="alternate" hreflang="it-IT" href="${baseUrl}/" />`,
      `    <xhtml:link rel="alternate" hreflang="it" href="${baseUrl}/" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/" />`,
      '  </url>',
    ].join('\n'),
  );

  for (const page of pages) {
    for (const locale of SUPPORTED_LOCALES) {
      const locUrl = `${baseUrl}${getPublicPath(locale, page)}`;
      const xhtmlLinks = SUPPORTED_LOCALES.map((altLoc) => {
        const altHref = `${baseUrl}${getPublicPath(altLoc, page)}`;
        return `    <xhtml:link rel="alternate" hreflang="${LOCALE_LABELS[altLoc].hreflang}" href="${altHref}" />`;
      });
      const xDefaultHref = `${baseUrl}${getPublicPath(DEFAULT_LOCALE, page)}`;
      xhtmlLinks.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultHref}" />`,
      );

      const priority = page === 'pricing' ? '1.0' : '0.8';
      urlBlocks.push(
        [
          '  <url>',
          `    <loc>${locUrl}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          '    <changefreq>weekly</changefreq>',
          `    <priority>${priority}</priority>`,
          ...xhtmlLinks,
          '  </url>',
        ].join('\n'),
      );
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urlBlocks,
    '</urlset>',
  ].join('\n');
}

function generateRobotsTxt(baseUrl: string): string {
  return [
    '# StreamVerse & AI App Builder — Search Engine (SEO) & Generative AI Crawler Policy (GEO / LLMO)',
    '# Public streaming catalog (/), AI summary (/llms.txt, /llms-full.txt), and localized pages (/it/, /en/, /de/, /fr/) are open to search and AI crawlers.',
    '# Private owner/admin (/admin), customer workspace (/workspace), and API routes (/api/) are non-indexable and auth-protected.',
    '',
    'User-agent: *',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    'Disallow: /api/',
    '',
    '# Explicit rules for major search & generative AI crawlers (GEO / AIO / LLMO transparency)',
    'User-agent: Googlebot',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: GPTBot',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    'Allow: /llms.txt',
    'Allow: /llms-full.txt',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

export async function createApp(options?: { skipVite?: boolean }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '600kb' }));

  // Hardened HTTP Security Headers (Defense-in-Depth against XSS, MIME Sniffing, Clickjacking)
  app.use((_req: Request, res: Response, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(self), geolocation=(), payment=()',
    );
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "media-src 'self' data: blob: https://commondatastorage.googleapis.com https:",
        "connect-src 'self' ws: wss: https:",
        "worker-src 'self' blob:",
        "frame-ancestors *",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    );
    next();
  });

  // 0. Public User Registration, Login, Session & Trusted Plan Checkout APIs
  app.get('/api/plans', (_req: Request, res: Response) => {
    const plans = PLAN_ORDER.map((id) => TRUSTED_PLANS[id]);
    res.json({
      plans,
      paymentProviderConfigured: false,
      missingPaymentConfig: [
        'STRIPE_SECRET_KEY / Payment provider server secret key',
        'STRIPE_WEBHOOK_SECRET / Signed webhook verification endpoint',
        'Commercial price IDs for Pro and Team plans in billing provider',
      ],
    });
  });

  app.post('/api/plans/validate', (req: Request, res: Response) => {
    // Strictly validate planId and period against trusted server configuration.
    // Any price, discount, or entitlement supplied by the browser is ignored.
    const { planId, billingPeriod } = req.body || {};
    const validation = resolveTrustedPlanSelection(planId, billingPeriod);
    if (!validation.valid || !validation.plan || !validation.selection) {
      res.status(400).json({
        valid: false,
        errorCode: validation.errorCode || 'INVALID_PLAN_ID',
        error: 'The selected plan ID is missing or not recognized by the server configuration.',
      });
      return;
    }

    const { plan, selection } = validation;
    res.json({
      valid: true,
      selection,
      verifiedPlan: {
        id: plan.id,
        tier: plan.tier,
        isConfigurablePlaceholder: plan.isConfigurablePlaceholder,
        currency: plan.currency,
        verifiedAmount: plan.pricing[selection.billingPeriod].amount,
        verifiedPriceIdentifier: selection.priceIdentifier,
        entitlements: plan.entitlements,
      },
      paymentProviderConfigured: false,
    });
  });

  app.get(['/api/auth/session', '/api/auth/me'], (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.json({ authenticated: false, user: null });
      return;
    }
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        activeSubscription: user.activeSubscription || null,
      },
    });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const planId = req.body?.planId;
    const billingPeriod = req.body?.billingPeriod;

    if (name.length < 2 || name.length > 80) {
      res.status(400).json({
        errorCode: 'INVALID_NAME',
        error: 'Name must be between 2 and 80 characters.',
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({
        errorCode: 'INVALID_EMAIL',
        error: 'Please provide a valid email address.',
      });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({
        errorCode: 'WEAK_PASSWORD',
        error: 'Password must be at least 8 characters long.',
      });
      return;
    }

    const users = readServerUsers();
    if (users.some((u) => u.email === email)) {
      res.status(409).json({
        errorCode: 'EMAIL_EXISTS',
        error: 'An account with this email already exists. Please log in.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const newUser: ServerUserRecord = {
      id: `usr_${crypto.randomBytes(10).toString('hex')}`,
      name,
      email,
      passwordSalt: salt,
      passwordHash,
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };

    const validatedPlan = planId ? resolveTrustedPlanSelection(planId, billingPeriod) : null;
    let activeSubscription = newUser.activeSubscription || null;

    // If the visitor selected the Free plan ('free-byok'), activate it immediately upon registration
    if (validatedPlan?.valid && validatedPlan.plan?.tier === 'free' && validatedPlan.selection) {
      activeSubscription = {
        planId: validatedPlan.plan.id,
        billingPeriod: validatedPlan.selection.billingPeriod,
        priceIdentifier: validatedPlan.selection.priceIdentifier,
        status: 'active' as const,
        activatedAt: new Date().toISOString(),
      };
      newUser.activeSubscription = activeSubscription;
    }

    users.push(newUser);
    writeServerUsers(users);

    const sessionToken = crypto.randomBytes(24).toString('hex');
    activeUserSessions.set(sessionToken, newUser.id);
    res.setHeader(
      'Set-Cookie',
      `${USER_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    );

    res.status(201).json({
      authenticated: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        emailVerified: newUser.emailVerified,
        activeSubscription,
      },
      preservedPlan: validatedPlan?.valid ? validatedPlan.selection : null,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const planId = req.body?.planId;
    const billingPeriod = req.body?.billingPeriod;

    if (!email || !password) {
      res.status(400).json({
        errorCode: 'MISSING_CREDENTIALS',
        error: 'Email and password are required.',
      });
      return;
    }

    const users = readServerUsers();
    const userIdx = users.findIndex((u) => u.email === email);
    const user = userIdx !== -1 ? users[userIdx] : null;
    if (!user) {
      res.status(401).json({
        errorCode: 'INVALID_CREDENTIALS',
        error: 'Invalid email or password.',
      });
      return;
    }

    const candidateHash = hashPassword(password, user.passwordSalt);
    if (candidateHash !== user.passwordHash) {
      res.status(401).json({
        errorCode: 'INVALID_CREDENTIALS',
        error: 'Invalid email or password.',
      });
      return;
    }

    const validatedPlan = planId ? resolveTrustedPlanSelection(planId, billingPeriod) : null;
    if (
      validatedPlan?.valid &&
      validatedPlan.plan?.tier === 'free' &&
      validatedPlan.selection &&
      !user.activeSubscription
    ) {
      user.activeSubscription = {
        planId: validatedPlan.plan.id,
        billingPeriod: validatedPlan.selection.billingPeriod,
        priceIdentifier: validatedPlan.selection.priceIdentifier,
        status: 'active' as const,
        activatedAt: new Date().toISOString(),
      };
      users[userIdx] = user;
      writeServerUsers(users);
    }

    const sessionToken = crypto.randomBytes(24).toString('hex');
    activeUserSessions.set(sessionToken, user.id);
    res.setHeader(
      'Set-Cookie',
      `${USER_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    );

    res.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        activeSubscription: user.activeSubscription || null,
      },
      preservedPlan: validatedPlan?.valid ? validatedPlan.selection : null,
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[USER_COOKIE_NAME];
    if (token) {
      activeUserSessions.delete(token);
    }
    res.setHeader(
      'Set-Cookie',
      `${USER_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
    res.json({ authenticated: false });
  });

  app.post('/api/checkout/session', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        errorCode: 'AUTH_REQUIRED',
        error: 'Authentication is required before proceeding to checkout.',
      });
      return;
    }

    // Never trust client-supplied prices, discounts, or entitlements.
    const { planId, billingPeriod } = req.body || {};
    const validation = resolveTrustedPlanSelection(planId, billingPeriod);
    if (!validation.valid || !validation.plan || !validation.selection) {
      res.status(400).json({
        errorCode: validation.errorCode || 'INVALID_PLAN_ID',
        error: 'Invalid or missing plan selection.',
      });
      return;
    }

    const { plan, selection } = validation;

    // Prevent duplicate subscription activation if already subscribed to the same active plan
    if (
      user.activeSubscription &&
      user.activeSubscription.status === 'active' &&
      user.activeSubscription.planId === plan.id &&
      user.activeSubscription.billingPeriod === selection.billingPeriod
    ) {
      res.status(409).json({
        errorCode: 'DUPLICATE_SUBSCRIPTION',
        error: 'This plan is already active on your account.',
        subscription: user.activeSubscription,
      });
      return;
    }

    // Paid plans require verified payment confirmation from a configured payment provider
    if (plan.tier === 'paid') {
      res.status(422).json({
        activated: false,
        paymentProviderConfigured: false,
        errorCode: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        error:
          'Payment setup is required. No payment provider is configured on the server; paid subscriptions cannot be activated without verified payment confirmation.',
        missingConfiguration: [
          'Server-side payment provider integration (e.g. Stripe SDK & STRIPE_SECRET_KEY)',
          'Official server-side price identifiers for paid tiers',
          'Signed webhook endpoint (/api/webhooks/payment) to verify payment completion before activating entitlements',
        ],
      });
      return;
    }

    // Free plan ('free-byok') has verified price 0 EUR and can be activated for the authenticated user
    const users = readServerUsers();
    const idx = users.findIndex((u) => u.id === user.id);
    const activeSubscription = {
      planId: plan.id,
      billingPeriod: selection.billingPeriod,
      priceIdentifier: selection.priceIdentifier,
      status: 'active' as const,
      activatedAt: new Date().toISOString(),
    };
    if (idx !== -1) {
      users[idx].activeSubscription = activeSubscription;
      writeServerUsers(users);
    }

    res.json({
      activated: true,
      subscription: activeSubscription,
      entitlements: plan.entitlements,
    });
  });

  // 1. Admin Authentication & Session Endpoints (Protected, Non-Indexable)
  app.get('/api/admin/session', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[ADMIN_COOKIE_NAME];
    const configured = isSecureAdminCredentialConfigured();

    if (configured && token && activeAdminSessions.has(token)) {
      res.json({
        authenticated: true,
        customPasswordConfigured: true,
        locale: 'it',
      });
      return;
    }

    res.json({
      authenticated: false,
      customPasswordConfigured: configured,
      locale: 'it',
    });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const check = verifyAdminPassphrase(req.body?.passphrase);

    if (!check.configured) {
      res.status(503).json({
        authenticated: false,
        errorCode: check.errorCode,
        error: check.error,
      });
      return;
    }

    if (!check.allowed) {
      res.status(401).json({
        authenticated: false,
        errorCode: check.errorCode,
        error: check.error,
      });
      return;
    }

    const sessionToken = crypto.randomBytes(24).toString('hex');
    activeAdminSessions.add(sessionToken);

    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    );
    res.json({ authenticated: true, customPasswordConfigured: true, locale: 'it' });
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const cookies = parseCookies(req.headers.cookie);
    const token = cookies[ADMIN_COOKIE_NAME];
    if (token) {
      activeAdminSessions.delete(token);
    }
    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
    res.json({ authenticated: false });
  });

  app.get('/api/admin/users', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!isValidAdminSession(req)) {
      res.status(401).json({ error: 'Non autorizzato.' });
      return;
    }
    const users = readServerUsers().map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      activeSubscription: u.activeSubscription || null,
    }));
    res.json({ users });
  });

  // 1b. Protected Activity Log Backend Endpoints (enforces authenticated admin session)
  app.get('/api/admin/activity-logs', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!isValidAdminSession(req)) {
      res.status(401).json({
        error: 'Non autorizzato. Effettua l\'accesso amministratore per visualizzare la cronologia attività.',
      });
      return;
    }

    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId.trim() : '';
    const allLogs = readServerActivityLogs();
    const userLogs = allLogs.filter((entry) => entry.userId === 'admin-it');
    const filtered = projectId
      ? userLogs.filter((entry) => entry.projectId === projectId)
      : userLogs;

    // Sort newest first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({ logs: filtered });
  });

  app.post('/api/admin/activity-logs', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!isValidAdminSession(req)) {
      res.status(401).json({
        error: 'Non autorizzato. Sessione amministratore richiesta per registrare attività.',
      });
      return;
    }

    const {
      id,
      projectId,
      projectName,
      instructionText,
      timestamp,
      status,
      type,
      activityType,
      codeVersion,
    } = req.body || {};
    if (
      typeof id !== 'string' ||
      !id.trim() ||
      typeof projectId !== 'string' ||
      !projectId.trim() ||
      typeof instructionText !== 'string' ||
      !instructionText.trim()
    ) {
      res.status(400).json({ error: 'Parametri attività mancanti o istruzione vuota.' });
      return;
    }

    const isExportRecord =
      type === 'EXPORT' ||
      type === 'EXPORT_PROJECT' ||
      activityType === 'EXPORT' ||
      activityType === 'EXPORT_PROJECT' ||
      activityType === 'export' ||
      status === 'exported';
    const sanitizedText = sanitizeServerText(instructionText.trim());
    const allLogs = readServerActivityLogs();

    // Idempotency / duplicate prevention by ID
    const existingIdx = allLogs.findIndex((item) => item.id === id.trim());
    const record: ServerActivityRecord = {
      id: id.trim(),
      projectId: projectId.trim(),
      projectName: typeof projectName === 'string' && projectName.trim() ? projectName.trim() : 'Progetto',
      userId: 'admin-it',
      instructionText: sanitizedText,
      timestamp: typeof timestamp === 'string' && timestamp ? timestamp : new Date().toISOString(),
      status:
        status === 'generating' ||
        status === 'generated' ||
        status === 'exported' ||
        status === 'error'
          ? status
          : isExportRecord
            ? 'exported'
            : 'recorded',
      type:
        type === 'EXPORT_PROJECT'
          ? 'EXPORT_PROJECT'
          : isExportRecord
            ? 'EXPORT'
            : 'INSTRUCTION',
      activityType:
        activityType === 'EXPORT_PROJECT'
          ? 'EXPORT_PROJECT'
          : isExportRecord
            ? 'EXPORT'
            : 'instruction',
      ...(typeof codeVersion === 'string' && codeVersion.trim()
        ? { codeVersion: sanitizeServerText(codeVersion.trim()).slice(0, 64) }
        : {}),
    };

    if (existingIdx >= 0) {
      allLogs[existingIdx] = record;
    } else {
      allLogs.unshift(record);
    }

    writeServerActivityLogs(allLogs);
    res.status(201).json({ log: record });
  });

  app.patch('/api/admin/activity-logs/project/:projectId', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!isValidAdminSession(req)) {
      res.status(401).json({ error: 'Non autorizzato.' });
      return;
    }

    const targetProjectId = req.params.projectId;
    const nextStatus = req.body?.status;
    if (
      nextStatus !== 'recorded' &&
      nextStatus !== 'generating' &&
      nextStatus !== 'generated' &&
      nextStatus !== 'exported' &&
      nextStatus !== 'error'
    ) {
      res.status(400).json({ error: 'Stato non valido.' });
      return;
    }

    const allLogs = readServerActivityLogs();
    let updatedCount = 0;
    const updatedLogs = allLogs.map((item) => {
      if (
        item.projectId === targetProjectId &&
        item.userId === 'admin-it' &&
        item.type !== 'EXPORT' &&
        item.type !== 'EXPORT_PROJECT' &&
        item.activityType !== 'EXPORT' &&
        item.activityType !== 'EXPORT_PROJECT' &&
        item.activityType !== 'export' &&
        item.status !== 'exported'
      ) {
        updatedCount++;
        return { ...item, status: nextStatus };
      }
      return item;
    });

    if (updatedCount > 0) {
      writeServerActivityLogs(updatedLogs);
    }
    res.json({ updated: updatedCount });
  });

  // 1c. Protected Customer Activity Log Endpoints (enforces authenticated customer session and strict user.id isolation)
  app.get('/api/user/activity-logs', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        error: 'Authentication required to access your activity log.',
      });
      return;
    }

    const projectId = typeof req.query.projectId === 'string' ? req.query.projectId.trim() : '';
    const allLogs = readServerActivityLogs();
    // Strictly filter by the authenticated customer's own user.id
    const userLogs = allLogs.filter((entry) => entry.userId === user.id);
    const filtered = projectId
      ? userLogs.filter((entry) => entry.projectId === projectId)
      : userLogs;

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json({ logs: filtered });
  });

  app.post('/api/user/activity-logs', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({
        error: 'Authentication required to record project activity.',
      });
      return;
    }

    const {
      id,
      projectId,
      projectName,
      instructionText,
      timestamp,
      status,
      type,
      activityType,
      codeVersion,
    } = req.body || {};
    if (
      typeof id !== 'string' ||
      !id.trim() ||
      typeof projectId !== 'string' ||
      !projectId.trim() ||
      typeof instructionText !== 'string' ||
      !instructionText.trim()
    ) {
      res.status(400).json({ error: 'Missing activity parameters or empty instruction.' });
      return;
    }

    const isExportRecord =
      type === 'EXPORT' ||
      type === 'EXPORT_PROJECT' ||
      activityType === 'EXPORT' ||
      activityType === 'EXPORT_PROJECT' ||
      activityType === 'export' ||
      status === 'exported';
    const sanitizedText = sanitizeServerText(instructionText.trim());
    const allLogs = readServerActivityLogs();

    const existingIdx = allLogs.findIndex(
      (item) => item.id === id.trim() && item.userId === user.id,
    );
    const record: ServerActivityRecord = {
      id: id.trim(),
      projectId: projectId.trim(),
      projectName:
        typeof projectName === 'string' && projectName.trim() ? projectName.trim() : 'Progetto',
      // Always enforce the server-verified user.id, ignoring any client-supplied userId
      userId: user.id,
      instructionText: sanitizedText,
      timestamp: typeof timestamp === 'string' && timestamp ? timestamp : new Date().toISOString(),
      status:
        status === 'generating' ||
        status === 'generated' ||
        status === 'exported' ||
        status === 'error'
          ? status
          : isExportRecord
            ? 'exported'
            : 'recorded',
      type:
        type === 'EXPORT_PROJECT'
          ? 'EXPORT_PROJECT'
          : isExportRecord
            ? 'EXPORT'
            : 'INSTRUCTION',
      activityType:
        activityType === 'EXPORT_PROJECT'
          ? 'EXPORT_PROJECT'
          : isExportRecord
            ? 'EXPORT'
            : 'instruction',
      ...(typeof codeVersion === 'string' && codeVersion.trim()
        ? { codeVersion: sanitizeServerText(codeVersion.trim()).slice(0, 64) }
        : {}),
    };

    if (existingIdx >= 0) {
      allLogs[existingIdx] = record;
    } else {
      allLogs.unshift(record);
    }

    writeServerActivityLogs(allLogs);
    res.status(201).json({ log: record });
  });

  app.patch('/api/user/activity-logs/project/:projectId', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const targetProjectId = req.params.projectId;
    const nextStatus = req.body?.status;
    if (
      nextStatus !== 'recorded' &&
      nextStatus !== 'generating' &&
      nextStatus !== 'generated' &&
      nextStatus !== 'exported' &&
      nextStatus !== 'error'
    ) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }

    const allLogs = readServerActivityLogs();
    let updatedCount = 0;
    const updatedLogs = allLogs.map((item) => {
      if (
        item.projectId === targetProjectId &&
        item.userId === user.id &&
        item.type !== 'EXPORT' &&
        item.type !== 'EXPORT_PROJECT' &&
        item.activityType !== 'EXPORT' &&
        item.activityType !== 'EXPORT_PROJECT' &&
        item.activityType !== 'export' &&
        item.status !== 'exported'
      ) {
        updatedCount++;
        return { ...item, status: nextStatus };
      }
      return item;
    });

    if (updatedCount > 0) {
      writeServerActivityLogs(updatedLogs);
    }
    res.json({ updated: updatedCount });
  });

  // 1d. Cloud & Server Project Sync Endpoints (/api/user/projects and /api/admin/projects)
  app.get('/api/user/projects', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const allProjects = readServerProjects();
    const userProjects = allProjects.filter((p) => p.userId === user.id);
    userProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ projects: userProjects });
  });

  app.post('/api/user/projects', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const proj = req.body;
    if (!proj || typeof proj.id !== 'string' || typeof proj.name !== 'string') {
      res.status(400).json({ error: 'Invalid project payload.' });
      return;
    }
    const allProjects = readServerProjects();
    const targetId = proj.id.trim().slice(0, 128);
    // Reject if another user already owns a project with the same ID
    const foreignOwnerConflict = allProjects.some(
      (p) => p.id === targetId && p.userId !== user.id,
    );
    if (foreignOwnerConflict) {
      res.status(403).json({
        errorCode: 'PROJECT_OWNERSHIP_MISMATCH',
        error: 'Accesso negato: questo ID progetto appartiene a un altro account.',
      });
      return;
    }

    const existingIdx = allProjects.findIndex((p) => p.id === targetId && p.userId === user.id);
    const incomingTime = Date.parse(typeof proj.updatedAt === 'string' ? proj.updatedAt : '');
    if (existingIdx >= 0) {
      const existingTime = Date.parse(allProjects[existingIdx].updatedAt || '');
      if (!Number.isNaN(existingTime) && !Number.isNaN(incomingTime) && incomingTime < existingTime) {
        // Do not overwrite a newer server record with a stale payload
        res.status(200).json({ project: allProjects[existingIdx], keptNewerServerCopy: true });
        return;
      }
    }
    const record: ServerProjectRecord = {
      id: targetId,
      // Strictly enforce authenticated server user.id, never trusting client-supplied userId
      userId: user.id,
      name: proj.name.trim().slice(0, 60),
      description: typeof proj.description === 'string' ? proj.description.slice(0, 2000) : '',
      type: typeof proj.type === 'string' ? proj.type : 'website',
      status:
        proj.status === 'generating' || proj.status === 'generated' || proj.status === 'error'
          ? proj.status
          : 'draft',
      instructions: Array.isArray(proj.instructions) ? proj.instructions : [],
      previewHtml: typeof proj.previewHtml === 'string' ? proj.previewHtml.slice(0, 250000) : null,
      codeVersion: typeof proj.codeVersion === 'string' ? proj.codeVersion.slice(0, 64) : 'v1.0',
      ...(Array.isArray(proj.files) ? { files: proj.files.slice(0, 30) } : {}),
      ...(proj.dependencies && typeof proj.dependencies === 'object'
        ? { dependencies: proj.dependencies }
        : {}),
      ...(Array.isArray(proj.databaseSchema)
        ? { databaseSchema: proj.databaseSchema.slice(0, 25) }
        : {}),
      ...(Array.isArray(proj.apiRoutes) ? { apiRoutes: proj.apiRoutes.slice(0, 40) } : {}),
      ...(Array.isArray(proj.versions) ? { versions: proj.versions.slice(0, 25) } : {}),
      ...(proj.lastAgentRun && typeof proj.lastAgentRun === 'object'
        ? { lastAgentRun: proj.lastAgentRun }
        : {}),
      ...(Array.isArray(proj.chatMessages) ? { chatMessages: proj.chatMessages.slice(0, 80) } : {}),
      ...(proj.preferredOutputMode ? { preferredOutputMode: proj.preferredOutputMode } : {}),
      createdAt: typeof proj.createdAt === 'string' ? proj.createdAt : new Date().toISOString(),
      updatedAt:
        !Number.isNaN(incomingTime) && typeof proj.updatedAt === 'string'
          ? proj.updatedAt
          : new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      allProjects[existingIdx] = record;
    } else {
      allProjects.unshift(record);
    }
    writeServerProjects(allProjects);
    res.status(201).json({ project: record });
  });

  app.delete('/api/user/projects/:projectId', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const projectId = req.params.projectId;
    const allProjects = readServerProjects();
    const targetProject = allProjects.find((p) => p.id === projectId);
    if (targetProject && targetProject.userId !== user.id) {
      res.status(403).json({
        errorCode: 'PROJECT_OWNERSHIP_MISMATCH',
        error: 'Accesso negato: non sei il proprietario di questo progetto.',
      });
      return;
    }
    const filtered = allProjects.filter((p) => !(p.id === projectId && p.userId === user.id));
    writeServerProjects(filtered);

    // Consistently remove associated activity logs for this deleted project so they never reappear
    const allLogs = readServerActivityLogs();
    const filteredLogs = allLogs.filter(
      (entry) => !(entry.projectId === projectId && entry.userId === user.id),
    );
    if (filteredLogs.length !== allLogs.length) {
      writeServerActivityLogs(filteredLogs);
    }

    res.json({ deleted: true });
  });

  app.get('/api/admin/projects', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!isValidAdminSession(req)) {
      res.status(401).json({ error: 'Non autorizzato.' });
      return;
    }
    const allProjects = readServerProjects();
    const adminProjects = allProjects.filter((p) => p.userId === 'admin-it');
    adminProjects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json({ projects: adminProjects });
  });

  app.post('/api/admin/projects', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!isValidAdminSession(req)) {
      res.status(401).json({ error: 'Non autorizzato.' });
      return;
    }
    const proj = req.body;
    if (!proj || typeof proj.id !== 'string' || typeof proj.name !== 'string') {
      res.status(400).json({ error: 'Parametri progetto non validi.' });
      return;
    }
    const allProjects = readServerProjects();
    const targetId = proj.id.trim().slice(0, 128);
    const foreignOwnerConflict = allProjects.some(
      (p) => p.id === targetId && p.userId !== 'admin-it',
    );
    if (foreignOwnerConflict) {
      res.status(403).json({
        errorCode: 'PROJECT_OWNERSHIP_MISMATCH',
        error: 'Impossibile sovrascrivere un progetto appartenente a un altro utente.',
      });
      return;
    }
    const existingIdx = allProjects.findIndex((p) => p.id === targetId && p.userId === 'admin-it');
    const incomingTime = Date.parse(typeof proj.updatedAt === 'string' ? proj.updatedAt : '');
    if (existingIdx >= 0) {
      const existingTime = Date.parse(allProjects[existingIdx].updatedAt || '');
      if (!Number.isNaN(existingTime) && !Number.isNaN(incomingTime) && incomingTime < existingTime) {
        res.status(200).json({ project: allProjects[existingIdx], keptNewerServerCopy: true });
        return;
      }
    }
    const record: ServerProjectRecord = {
      id: targetId,
      userId: 'admin-it',
      name: proj.name.trim().slice(0, 60),
      description: typeof proj.description === 'string' ? proj.description.slice(0, 2000) : '',
      type: typeof proj.type === 'string' ? proj.type : 'website',
      status:
        proj.status === 'generating' || proj.status === 'generated' || proj.status === 'error'
          ? proj.status
          : 'draft',
      instructions: Array.isArray(proj.instructions) ? proj.instructions : [],
      previewHtml: typeof proj.previewHtml === 'string' ? proj.previewHtml.slice(0, 250000) : null,
      codeVersion: typeof proj.codeVersion === 'string' ? proj.codeVersion.slice(0, 64) : 'v1.0',
      ...(Array.isArray(proj.files) ? { files: proj.files.slice(0, 30) } : {}),
      ...(proj.dependencies && typeof proj.dependencies === 'object'
        ? { dependencies: proj.dependencies }
        : {}),
      ...(Array.isArray(proj.databaseSchema)
        ? { databaseSchema: proj.databaseSchema.slice(0, 25) }
        : {}),
      ...(Array.isArray(proj.apiRoutes) ? { apiRoutes: proj.apiRoutes.slice(0, 40) } : {}),
      ...(Array.isArray(proj.versions) ? { versions: proj.versions.slice(0, 25) } : {}),
      ...(proj.lastAgentRun && typeof proj.lastAgentRun === 'object'
        ? { lastAgentRun: proj.lastAgentRun }
        : {}),
      ...(Array.isArray(proj.chatMessages) ? { chatMessages: proj.chatMessages.slice(0, 80) } : {}),
      ...(proj.preferredOutputMode ? { preferredOutputMode: proj.preferredOutputMode } : {}),
      createdAt: typeof proj.createdAt === 'string' ? proj.createdAt : new Date().toISOString(),
      updatedAt:
        !Number.isNaN(incomingTime) && typeof proj.updatedAt === 'string'
          ? proj.updatedAt
          : new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      allProjects[existingIdx] = record;
    } else {
      allProjects.unshift(record);
    }
    writeServerProjects(allProjects);
    res.status(201).json({ project: record });
  });

  app.delete('/api/admin/projects/:projectId', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!isValidAdminSession(req)) {
      res.status(401).json({ error: 'Non autorizzato.' });
      return;
    }
    const projectId = req.params.projectId;
    const allProjects = readServerProjects();
    const filtered = allProjects.filter((p) => !(p.id === projectId && p.userId === 'admin-it'));
    writeServerProjects(filtered);

    // Consistently remove associated activity logs for this deleted admin project
    const allLogs = readServerActivityLogs();
    const filteredLogs = allLogs.filter(
      (entry) => !(entry.projectId === projectId && entry.userId === 'admin-it'),
    );
    if (filteredLogs.length !== allLogs.length) {
      writeServerActivityLogs(filteredLogs);
    }

    res.json({ deleted: true });
  });

  // 1e. Hardened AI Generation Endpoint (/api/ai/generate)
  // - Managed server-side GEMINI_API_KEY is strictly restricted to authenticated administrators.
  // - Ordinary customer accounts must use BYOK until server-enforced quotas and paid entitlements are configured.
  // - Never silently returns fallback HTML as a successful AI response.
  app.post('/api/ai/generate', async (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    const cookies = parseCookies(req.headers.cookie);
    const adminToken = cookies[ADMIN_COOKIE_NAME];
    const isAdminSession = isValidAdminSession(req);

    if (!user && !isAdminSession) {
      res.status(401).json({
        errorCode: 'AUTH_REQUIRED',
        error: 'Autenticazione richiesta per utilizzare il generatore IA.',
      });
      return;
    }

    // Enforce sliding-window server-side rate limit per authenticated principal
    const principalKey = isAdminSession ? `admin:${adminToken}` : `user:${user?.id || req.ip}`;
    const rateStatus = checkServerRateLimit(principalKey);
    res.setHeader('X-RateLimit-Remaining', String(rateStatus.remaining));
    if (!rateStatus.allowed) {
      res.setHeader('Retry-After', String(rateStatus.retryAfterSeconds));
      res.status(429).json({
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: `Limite di richieste IA raggiunto. Riprova tra ${rateStatus.retryAfterSeconds} secondi.`,
        retryAfterSeconds: rateStatus.retryAfterSeconds,
      });
      return;
    }

    // Validate project payload and enforce strict input-size limits
    const inputValidation = validateAiGenerationInput(req.body);
    if (!inputValidation.valid || !inputValidation.sanitizedProject) {
      res.status(400).json({
        errorCode: inputValidation.errorCode || 'INVALID_INPUT',
        error: inputValidation.error || 'Dati di input non validi.',
      });
      return;
    }

    const { sanitizedProject } = inputValidation;
    const { aiSettings } = req.body || {};

    const customProvider = typeof aiSettings?.provider === 'string' ? aiSettings.provider.trim() : '';
    const customApiKey = typeof aiSettings?.apiKey === 'string' ? aiSettings.apiKey.trim() : '';
    const customModel = typeof aiSettings?.model === 'string' ? aiSettings.model.trim() : '';
    const customEndpoint = typeof aiSettings?.endpoint === 'string' ? aiSettings.endpoint.trim() : '';

    const isManagedRequest = customProvider === 'managed';

    // Security Gate: Managed AI generation using the server's GEMINI_API_KEY is disabled for ordinary customer accounts
    if (isManagedRequest && !isAdminSession) {
      res.status(403).json({
        errorCode: 'MANAGED_AI_RESTRICTED_TO_ADMIN',
        error:
          'La generazione IA tramite proxy gestito dal server non è abilitata per gli account cliente finché non saranno configurati i limiti di quota e la fatturazione. Configura una tua chiave API personale (BYOK) nelle Impostazioni.',
      });
      return;
    }

    // Never silently fall back to server GEMINI_API_KEY when a BYOK provider (such as 'gemini') is selected without a key
    if (!isManagedRequest && !customApiKey) {
      res.status(isAdminSession ? 400 : 403).json({
        errorCode: isAdminSession ? 'AI_KEY_NOT_CONFIGURED' : 'MANAGED_AI_RESTRICTED_TO_ADMIN',
        error:
          'Chiave API mancante per il provider selezionato. Inserisci la tua chiave API personale (BYOK) nelle Impostazioni.',
      });
      return;
    }

    const instructionsList = sanitizedProject.instructions
      .map((inst, i) => `${i + 1}. ${inst.text}`)
      .join('\n');

    const systemPrompt = [
      'Sei un Senior Frontend Architect e Designer UI/UX.',
      'Genera un file HTML5 singolo, completo, moderno, responsivo e interattivo (con CSS moderno o Tailwind CDN e JavaScript vanilla integrato) per l\'applicazione richiesta.',
      'Restituisci ESCLUSIVAMENTE il codice HTML completo che inizia con <!DOCTYPE html> e termina con </html>, senza blocchi markdown ```html.',
    ].join(' ');

    const userPrompt = [
      `Nome Progetto: ${sanitizedProject.name}`,
      `Categoria: ${sanitizedProject.type}`,
      `Descrizione: ${sanitizedProject.description}`,
      instructionsList ? `Istruzioni iterative:\n${instructionsList}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const llmRes = await callConfiguredLlm(systemPrompt, userPrompt, {
        provider: customProvider,
        apiKey: customApiKey,
        model: customModel,
        endpoint: customEndpoint,
        isAdminSession,
      });

      const cleanedHtml = llmRes.text
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      if (!cleanedHtml || !cleanedHtml.includes('<')) {
        res.status(502).json({
          errorCode: 'EMPTY_AI_RESPONSE',
          error: 'Il provider IA ha restituito una risposta vuota o non valida.',
        });
        return;
      }

      res.json({
        html: cleanedHtml,
        provider: llmRes.provider,
        model: llmRes.model,
        mode: llmRes.mode,
      });
    } catch (err) {
      const safeMessage = sanitizeServerText(
        err instanceof Error ? err.message : 'Errore imprevisto durante la generazione IA.',
      );
      const isKeyMissing = /Chiave API .*mancante|GEMINI_API_KEY non è configurata/i.test(safeMessage);
      const isInvalidKey = /Chiave API .* non valida|HTTP 401|HTTP 403/i.test(safeMessage);
      const isQuota = /Limite di utilizzo|quota esaurita|HTTP 429/i.test(safeMessage);
      const isNotFound = /Modello o endpoint non trovato|HTTP 404/i.test(safeMessage);
      const isTimeout = /scaduta|timeout/i.test(safeMessage);
      const status = isKeyMissing
        ? 503
        : isInvalidKey
          ? 401
          : isQuota
            ? 429
            : isNotFound
              ? 404
              : isTimeout
                ? 504
                : 502;
      const errorCode = isKeyMissing
        ? 'AI_KEY_NOT_CONFIGURED'
        : isInvalidKey
          ? 'INVALID_API_KEY'
          : isQuota
            ? 'PROVIDER_QUOTA_EXCEEDED'
            : isNotFound
              ? 'MODEL_OR_ENDPOINT_NOT_FOUND'
              : isTimeout
                ? 'AI_PROVIDER_TIMEOUT'
                : 'AI_GENERATION_FAILED';
      res.status(status).json({
        errorCode,
        error: safeMessage.slice(0, 240),
      });
    }
  });

  // 1e-verify. AI Provider Connection Verification Endpoint (/api/ai/verify-connection)
  app.post('/api/ai/verify-connection', async (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    const cookies = parseCookies(req.headers.cookie);
    const adminToken = cookies[ADMIN_COOKIE_NAME];
    const isAdminSession = isValidAdminSession(req);

    if (!user && !isAdminSession) {
      res.status(401).json({
        ok: false,
        errorCode: 'AUTH_REQUIRED',
        error: 'Autenticazione richiesta per verificare la connessione al provider IA.',
      });
      return;
    }

    const principalKey = isAdminSession
      ? `verify:admin:${adminToken}`
      : `verify:user:${user?.id || req.ip}`;
    const rateStatus = checkServerRateLimit(principalKey, 15, 60 * 1000);
    if (!rateStatus.allowed) {
      res.setHeader('Retry-After', String(rateStatus.retryAfterSeconds));
      res.status(429).json({
        ok: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: `Troppi tentativi di verifica ravvicinati. Riprova tra ${rateStatus.retryAfterSeconds} secondi.`,
      });
      return;
    }

    const { aiSettings } = req.body || {};
    const customProvider = typeof aiSettings?.provider === 'string' ? aiSettings.provider.trim() : '';
    const customApiKey = typeof aiSettings?.apiKey === 'string' ? aiSettings.apiKey.trim() : '';
    const customModel = typeof aiSettings?.model === 'string' ? aiSettings.model.trim() : '';
    const customEndpoint = typeof aiSettings?.endpoint === 'string' ? aiSettings.endpoint.trim() : '';

    if (!customProvider) {
      res.status(400).json({
        ok: false,
        errorCode: 'MISSING_PROVIDER',
        error: 'Seleziona prima un provider IA supportato.',
      });
      return;
    }

    const isManagedRequest = customProvider === 'managed';
    if (isManagedRequest && !isAdminSession) {
      res.status(403).json({
        ok: false,
        errorCode: 'MANAGED_AI_RESTRICTED_TO_ADMIN',
        error:
          'Il proxy backend gestito è riservato agli amministratori autorizzati. Seleziona un provider BYOK e inserisci la tua chiave API.',
      });
      return;
    }

    if (!isManagedRequest && !customApiKey) {
      res.status(isAdminSession ? 400 : 403).json({
        ok: false,
        errorCode: isAdminSession ? 'AI_KEY_NOT_CONFIGURED' : 'MANAGED_AI_RESTRICTED_TO_ADMIN',
        error:
          'Chiave API mancante. Inserisci la tua chiave API personale (BYOK) per verificare la connessione.',
      });
      return;
    }

    try {
      const verification = await verifyAiProviderConnection({
        provider: customProvider,
        apiKey: customApiKey,
        model: customModel,
        endpoint: customEndpoint,
        isAdminSession,
      });
      res.json(verification);
    } catch (err) {
      const safeMessage = sanitizeServerText(
        err instanceof Error ? err.message : 'Errore durante la verifica della connessione IA.',
      );
      const isKeyMissing = /Chiave API .*mancante|GEMINI_API_KEY non è configurata/i.test(safeMessage);
      const isInvalidKey = /Chiave API .* non valida|HTTP 401|HTTP 403/i.test(safeMessage);
      const isQuota = /Limite di utilizzo|quota esaurita|HTTP 429/i.test(safeMessage);
      const isNotFound = /Modello o endpoint non trovato|HTTP 404/i.test(safeMessage);
      const isTimeout = /scaduta|timeout/i.test(safeMessage);
      const status = isKeyMissing
        ? 503
        : isInvalidKey
          ? 401
          : isQuota
            ? 429
            : isNotFound
              ? 404
              : isTimeout
                ? 504
                : 502;
      const errorCode = isKeyMissing
        ? 'AI_KEY_NOT_CONFIGURED'
        : isInvalidKey
          ? 'INVALID_API_KEY'
          : isQuota
            ? 'PROVIDER_QUOTA_EXCEEDED'
            : isNotFound
              ? 'MODEL_OR_ENDPOINT_NOT_FOUND'
              : isTimeout
                ? 'AI_PROVIDER_TIMEOUT'
                : 'CONNECTION_VERIFICATION_FAILED';
      res.status(status).json({
        ok: false,
        errorCode,
        error: safeMessage.slice(0, 240),
      });
    }
  });

  // 1e-bis. Multi-Agent Orchestrator Endpoint (/api/ai/orchestrate)
  // Executes Planner -> Backend -> Frontend -> QA/Self-Healing in isolated sandbox
  app.post('/api/ai/orchestrate', async (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    const cookies = parseCookies(req.headers.cookie);
    const adminToken = cookies[ADMIN_COOKIE_NAME];
    const isAdminSession = Boolean(
      isSecureAdminCredentialConfigured() && adminToken && activeAdminSessions.has(adminToken),
    );

    if (!user && !isAdminSession) {
      res.status(401).json({
        errorCode: 'AUTH_REQUIRED',
        error: 'Autenticazione richiesta per avviare l\'orchestratore multi-agente.',
      });
      return;
    }

    const principalKey = isAdminSession ? `admin:${adminToken}` : `user:${user?.id || req.ip}`;
    const rateStatus = checkServerRateLimit(principalKey);
    res.setHeader('X-RateLimit-Remaining', String(rateStatus.remaining));
    if (!rateStatus.allowed) {
      res.setHeader('Retry-After', String(rateStatus.retryAfterSeconds));
      res.status(429).json({
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: `Limite di richieste IA raggiunto. Riprova tra ${rateStatus.retryAfterSeconds} secondi.`,
        retryAfterSeconds: rateStatus.retryAfterSeconds,
      });
      return;
    }

    const inputValidation = validateAiGenerationInput(req.body);
    if (!inputValidation.valid || !inputValidation.sanitizedProject) {
      res.status(400).json({
        errorCode: inputValidation.errorCode || 'INVALID_INPUT',
        error: inputValidation.error || 'Dati di input non validi.',
      });
      return;
    }

    const { sanitizedProject } = inputValidation;
    const { aiSettings, maxHealingAttempts, targetFiles, selectedAgents, stream } = req.body || {};
    const projectId =
      typeof req.body?.project?.id === 'string' ? req.body.project.id.trim() : `proj_${Date.now()}`;
    const wantsStream =
      stream === true || String(req.headers.accept || '').includes('text/event-stream');

    const normalizedTargetFiles = Array.isArray(targetFiles)
      ? targetFiles
          .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
          .map((f) => f.trim().slice(0, 120))
          .slice(0, 20)
      : undefined;

    const allowedAgentRoles = new Set(['planner', 'backend', 'frontend', 'qa']);
    const normalizedSelectedAgents = Array.isArray(selectedAgents)
      ? selectedAgents.filter(
          (r): r is 'planner' | 'backend' | 'frontend' | 'qa' =>
            typeof r === 'string' && allowedAgentRoles.has(r),
        )
      : undefined;

    const existingFilesInput = Array.isArray(req.body?.project?.files)
      ? req.body.project.files.slice(0, 20)
      : undefined;
    const existingPreviewHtmlInput =
      typeof req.body?.project?.previewHtml === 'string' ? req.body.project.previewHtml : null;

    const customProvider = typeof aiSettings?.provider === 'string' ? aiSettings.provider.trim() : '';
    const customApiKey = typeof aiSettings?.apiKey === 'string' ? aiSettings.apiKey.trim() : '';
    const customModel = typeof aiSettings?.model === 'string' ? aiSettings.model.trim() : '';
    const customEndpoint = typeof aiSettings?.endpoint === 'string' ? aiSettings.endpoint.trim() : '';

    const isManagedRequest = customProvider === 'managed';
    if (isManagedRequest && !isAdminSession) {
      res.status(403).json({
        errorCode: 'MANAGED_AI_RESTRICTED_TO_ADMIN',
        error:
          'L\'orchestratore multi-agente tramite proxy gestito dal server non è abilitato per gli account cliente finché non saranno configurate quote persistenti e autorizzazioni server-side. Configura la tua chiave API personale (BYOK) nelle Impostazioni.',
      });
      return;
    }

    if (!isManagedRequest && !customApiKey) {
      res.status(isAdminSession ? 400 : 403).json({
        errorCode: isAdminSession ? 'AI_KEY_NOT_CONFIGURED' : 'MANAGED_AI_RESTRICTED_TO_ADMIN',
        error:
          'Chiave API mancante per il provider selezionato. Inserisci la tua chiave API personale (BYOK) nelle Impostazioni.',
      });
      return;
    }

    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();
    }

    const writeSseEvent = (eventType: string, payload: unknown) => {
      if (!wantsStream || res.writableEnded) return;
      res.write(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const result = await runMultiAgentOrchestrator({
        projectId,
        userId: isAdminSession ? 'admin-it' : user?.id || 'anonymous',
        projectName: sanitizedProject.name,
        projectDescription: sanitizedProject.description,
        projectType: sanitizedProject.type,
        instructions: sanitizedProject.instructions,
        selectedAgents: normalizedSelectedAgents,
        targetFiles: normalizedTargetFiles,
        existingFiles: existingFilesInput,
        existingPreviewHtml: existingPreviewHtmlInput,
        maxHealingAttempts: typeof maxHealingAttempts === 'number' ? maxHealingAttempts : 2,
        onEvent: (evt) => {
          writeSseEvent('agent_progress', evt);
        },
        aiConfig: {
          provider: customProvider,
          apiKey: customApiKey,
          model: customModel,
          endpoint: customEndpoint,
          isAdminSession,
        },
      });

      const finalPayload = {
        html: result.previewHtml,
        files: result.files,
        dependencies: result.dependencies,
        databaseSchema: result.databaseSchema,
        apiRoutes: result.apiRoutes,
        plan: result.plan,
        agentRun: result.run,
        sandboxReport: result.sandboxReport,
        provider: result.provider,
        mode: result.mode,
      };

      if (wantsStream) {
        writeSseEvent('result', finalPayload);
        res.end();
      } else {
        res.json(finalPayload);
      }
    } catch (err) {
      const safeMessage = sanitizeServerText(
        err instanceof Error ? err.message : 'Errore imprevisto nell\'orchestratore multi-agente.',
      );
      const isKeyMissing = /Chiave API .*mancante|GEMINI_API_KEY non è configurata/i.test(safeMessage);
      const isInvalidKey = /Chiave API .* non valida|HTTP 401|HTTP 403/i.test(safeMessage);
      const isQuota = /Limite di utilizzo|quota esaurita|HTTP 429/i.test(safeMessage);
      const isNotFound = /Modello o endpoint non trovato|HTTP 404/i.test(safeMessage);
      const isTimeout = /scaduta|timeout/i.test(safeMessage);
      const status = isKeyMissing
        ? 503
        : isInvalidKey
          ? 401
          : isQuota
            ? 429
            : isNotFound
              ? 404
              : isTimeout
                ? 504
                : 502;
      const errorCode = isKeyMissing
        ? 'AI_KEY_NOT_CONFIGURED'
        : isInvalidKey
          ? 'INVALID_API_KEY'
          : isQuota
            ? 'PROVIDER_QUOTA_EXCEEDED'
            : isNotFound
              ? 'MODEL_OR_ENDPOINT_NOT_FOUND'
              : isTimeout
                ? 'AI_PROVIDER_TIMEOUT'
                : 'MULTI_AGENT_ORCHESTRATION_FAILED';
      const errPayload = {
        errorCode,
        error: `Orchestratore multi-agente interrotto: ${safeMessage.slice(0, 220)}`,
      };
      if (wantsStream) {
        writeSseEvent('error', errPayload);
        res.end();
      } else {
        res.status(status).json(errPayload);
      }
    }
  });

  // 1e-ter. Isolated Sandbox Verification Endpoint (/api/sandbox/verify)
  // Runs static AST & V8 vm.Script compilation checks without executing untrusted code in the server process
  app.post('/api/sandbox/verify', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    const cookies = parseCookies(req.headers.cookie);
    const adminToken = cookies[ADMIN_COOKIE_NAME];
    const isAdminSession = isValidAdminSession(req);

    if (!user && !isAdminSession) {
      res.status(401).json({
        errorCode: 'AUTH_REQUIRED',
        error: 'Autenticazione richiesta per eseguire la verifica nella sandbox isolata.',
      });
      return;
    }

    const principalKey = isAdminSession
      ? `sandbox:admin:${adminToken}`
      : `sandbox:user:${user?.id || req.ip}`;
    const rateStatus = checkServerRateLimit(principalKey, 30, 60 * 1000);
    if (!rateStatus.allowed) {
      res.setHeader('Retry-After', String(rateStatus.retryAfterSeconds));
      res.status(429).json({
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: `Limite di richieste di verifica raggiunto. Riprova tra ${rateStatus.retryAfterSeconds} secondi.`,
      });
      return;
    }

    const validation = validateSandboxVerifyInput(req.body);
    if (!validation.valid || !validation.sanitizedFiles) {
      res.status(400).json({
        errorCode: validation.errorCode || 'INVALID_SANDBOX_INPUT',
        error: validation.error || 'Input di verifica non valido.',
      });
      return;
    }

    const report = runIsolatedSandboxVerification(
      validation.sanitizedFiles,
      validation.sanitizedPreviewHtml ?? null,
      1,
    );
    res.json({ report });
  });

  // 1f. Direct GitHub Repository Export Endpoint (/api/github/export)
  // Temporarily disabled until per-user GitHub OAuth flow is configured.
  // Never uses a shared server token or browser-persisted PAT to publish to arbitrary repositories.
  app.post('/api/github/export', (req: Request, res: Response) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    const user = getAuthenticatedUser(req);
    const isAdminSession = isValidAdminSession(req);

    if (!user && !isAdminSession) {
      res.status(401).json({
        errorCode: 'AUTH_REQUIRED',
        error: 'Autenticazione richiesta.',
      });
      return;
    }

    res.status(503).json({
      success: false,
      errorCode: 'GITHUB_OAUTH_NOT_CONFIGURED',
      error:
        'L\'esportazione diretta su repository GitHub è temporaneamente disabilitata per motivi di sicurezza: l\'autenticazione OAuth GitHub individuale lato server non è ancora configurata. I token personali non vengono salvati nel browser né condivisi sul server. Puoi esportare e scaricare il pacchetto completo del progetto tramite il pulsante "Esporta".',
    });
  });

  // ============================================================================
  // 1g. StreamVerse "Sync Watch" Real-Time Watch Party Rooms (REST + SSE Stream)
  // ============================================================================
  interface SyncWatchParticipant {
    id: string;
    name: string;
    avatarColor: string;
    avatarInitials: string;
    joinedAt: number;
    lastSeenAt: number;
  }

  interface SyncWatchChatMessage {
    id: string;
    senderName: string;
    senderColor: string;
    text: string;
    createdAt: number;
  }

  interface SyncWatchRoomState {
    roomId: string;
    itemId: string;
    episodeLabel?: string;
    hostName: string;
    isPlaying: boolean;
    currentTimeSec: number;
    progressPercent: number;
    playbackRate: number;
    updatedAt: number;
    expiresAt: number;
    participants: SyncWatchParticipant[];
    messages: SyncWatchChatMessage[];
  }

  const syncWatchRooms = new Map<string, SyncWatchRoomState>();
  const syncWatchStreams = new Map<string, Set<Response>>();
  const ROOM_TTL_MS = 2 * 60 * 60 * 1000; // 2 ore di validità per il link temporaneo

  function broadcastSyncWatchRoom(roomId: string) {
    const room = syncWatchRooms.get(roomId);
    const clients = syncWatchStreams.get(roomId);
    if (!room || !clients) return;
    const payload = `data: ${JSON.stringify({ type: 'room:state', room })}\n\n`;
    for (const resClient of clients) {
      try {
        resClient.write(payload);
      } catch {
        clients.delete(resClient);
      }
    }
  }

  // Creazione di una nuova sessione Sync Watch con link temporaneo (con rate-limiting e sanitizzazione XSS)
  app.post('/api/sync-watch/rooms', (req: Request, res: Response) => {
    const clientIp = String(req.headers['x-forwarded-for'] || req.ip || 'local');
    const rateCheck = checkServerRateLimit(`sync-create:${clientIp}`, 20, 60 * 1000);
    if (!rateCheck.allowed) {
      res.status(429).json({
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: `Troppe richieste di creazione stanza. Riprova tra ${rateCheck.retryAfterSeconds} secondi.`,
      });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const rawItemId = sanitizeUserText(body.itemId, 32);
    const itemId = /^sv-\d{2}$/.test(rawItemId) ? rawItemId : 'sv-01';
    const episodeLabel = body.episodeLabel ? sanitizeUserText(body.episodeLabel, 80) : undefined;
    const hostName = sanitizeUserText(body.hostName, 40) || 'Ospite';
    const avatarColor = sanitizeHexColor(body.avatarColor, '#E50914');
    const avatarInitials = sanitizeUserText(body.avatarInitials, 4) || 'SV';
    const participantId = sanitizeUserText(body.participantId, 48) || crypto.randomBytes(6).toString('hex');
    const currentTimeSec = typeof body.currentTimeSec === 'number' && Number.isFinite(body.currentTimeSec) ? Math.max(0, body.currentTimeSec) : 0;
    const progressPercent = typeof body.progressPercent === 'number' && Number.isFinite(body.progressPercent) ? Math.min(100, Math.max(0, body.progressPercent)) : 0;
    const isPlaying = typeof body.isPlaying === 'boolean' ? body.isPlaying : true;
    const playbackRate = typeof body.playbackRate === 'number' && Number.isFinite(body.playbackRate) ? Math.min(2, Math.max(0.5, body.playbackRate)) : 1;

    const now = Date.now();
    // Pulizia stanze scadute
    for (const [k, existing] of syncWatchRooms.entries()) {
      if (existing.expiresAt < now) {
        syncWatchRooms.delete(k);
        syncWatchStreams.delete(k);
      }
    }

    const roomId = `SV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const room: SyncWatchRoomState = {
      roomId,
      itemId,
      episodeLabel,
      hostName,
      isPlaying,
      currentTimeSec,
      progressPercent,
      playbackRate,
      updatedAt: now,
      expiresAt: now + ROOM_TTL_MS,
      participants: [
        {
          id: participantId,
          name: hostName,
          avatarColor,
          avatarInitials,
          joinedAt: now,
          lastSeenAt: now,
        },
      ],
      messages: [
        {
          id: crypto.randomUUID(),
          senderName: 'StreamVerse Sync',
          senderColor: '#E50914',
          text: `${hostName} ha avviato la stanza Sync Watch. Condividi il link temporaneo per guardare insieme in tempo reale.`,
          createdAt: now,
        },
      ],
    };

    syncWatchRooms.set(roomId, room);
    res.status(201).json({ room, participantId });
  });

  // Lettura stato stanza Sync Watch
  app.get('/api/sync-watch/rooms/:roomId', (req: Request, res: Response) => {
    const roomId = validateSyncRoomCode(req.params.roomId);
    const room = roomId ? syncWatchRooms.get(roomId) : undefined;
    if (!room || room.expiresAt < Date.now()) {
      res.status(404).json({
        errorCode: 'SYNC_ROOM_NOT_FOUND',
        error: 'Sessione Sync Watch scaduta o non trovata.',
      });
      return;
    }
    res.json({ room });
  });

  // Stream SSE per ricevere aggiornamenti istantanei della stanza Sync Watch
  app.get('/api/sync-watch/rooms/:roomId/stream', (req: Request, res: Response) => {
    const roomId = validateSyncRoomCode(req.params.roomId);
    const room = roomId ? syncWatchRooms.get(roomId) : undefined;
    if (!roomId || !room || room.expiresAt < Date.now()) {
      res.status(404).json({ error: 'Sessione non trovata' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let set = syncWatchStreams.get(roomId);
    if (!set) {
      set = new Set();
      syncWatchStreams.set(roomId, set);
    }
    set.add(res);

    // Invia subito lo stato corrente
    res.write(`data: ${JSON.stringify({ type: 'room:state', room })}\n\n`);

    req.on('close', () => {
      set?.delete(res);
    });
  });

  // Partecipazione / uscita o aggiornamento playback/chat nella stanza Sync Watch
  app.post('/api/sync-watch/rooms/:roomId/events', (req: Request, res: Response) => {
    const roomId = validateSyncRoomCode(req.params.roomId);
    const room = roomId ? syncWatchRooms.get(roomId) : undefined;
    if (!roomId || !room || room.expiresAt < Date.now()) {
      res.status(404).json({
        errorCode: 'SYNC_ROOM_NOT_FOUND',
        error: 'Sessione Sync Watch scaduta o non trovata.',
      });
      return;
    }

    const clientIp = String(req.headers['x-forwarded-for'] || req.ip || 'local');
    const rateCheck = checkServerRateLimit(`sync-events:${clientIp}`, 60, 60 * 1000);
    if (!rateCheck.allowed) {
      res.status(429).json({
        errorCode: 'RATE_LIMIT_EXCEEDED',
        error: 'Troppe azioni ravvicinate. Attendi qualche istante.',
      });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : 'sync';
    const participantId = sanitizeUserText(body.participantId, 48) || 'guest';
    const userName = sanitizeUserText(body.userName, 40) || 'Spettatore';
    const avatarColor = sanitizeHexColor(body.avatarColor, '#00A8E1');
    const avatarInitials = sanitizeUserText(body.avatarInitials, 4) || 'SP';
    const now = Date.now();

    // Aggiorna o registra partecipante in modo idempotente (max 25 partecipanti per stanza)
    const existingParticipant = room.participants.find((p) => p.id === participantId);
    if (action === 'leave') {
      room.participants = room.participants.filter((p) => p.id !== participantId);
    } else if (!existingParticipant && room.participants.length < 25) {
      room.participants.push({
        id: participantId,
        name: userName,
        avatarColor,
        avatarInitials,
        joinedAt: now,
        lastSeenAt: now,
      });
      if (action === 'join') {
        room.messages.push({
          id: crypto.randomUUID(),
          senderName: 'StreamVerse Sync',
          senderColor: '#10B981',
          text: `${userName} si è unito alla visione sincronizzata.`,
          createdAt: now,
        });
      }
    } else if (existingParticipant) {
      existingParticipant.name = userName;
      existingParticipant.avatarColor = avatarColor;
      existingParticipant.avatarInitials = avatarInitials;
      existingParticipant.lastSeenAt = now;
    }

    if (action === 'playback') {
      if (typeof body.isPlaying === 'boolean') room.isPlaying = body.isPlaying;
      if (typeof body.currentTimeSec === 'number' && Number.isFinite(body.currentTimeSec)) {
        room.currentTimeSec = Math.max(0, body.currentTimeSec);
      }
      if (typeof body.progressPercent === 'number' && Number.isFinite(body.progressPercent)) {
        room.progressPercent = Math.min(100, Math.max(0, body.progressPercent));
      }
      if (typeof body.playbackRate === 'number' && Number.isFinite(body.playbackRate)) {
        room.playbackRate = Math.min(2, Math.max(0.5, body.playbackRate));
      }
      room.updatedAt = now;
    } else if (action === 'chat') {
      const text = sanitizeUserText(body.text, 280);
      if (text) {
        room.messages.push({
          id: crypto.randomUUID(),
          senderName: userName,
          senderColor: avatarColor,
          text,
          createdAt: now,
        });
        if (room.messages.length > 50) {
          room.messages = room.messages.slice(-50);
        }
      }
    }

    broadcastSyncWatchRoom(roomId);
    res.json({ room });
  });

  // 1-BIS. Server-side Weather Proxy Routes (/api/weather/*) for OpenWeatherMap + Open-Meteo high-availability fallback
  app.get('/api/weather/status', (_req: Request, res: Response) => {
    const owmKey = (process.env.OPENWEATHERMAP_API_KEY || '').trim();
    const isOwmConfigured = owmKey.length >= 16;
    res.json({
      active: true,
      provider: 'Open-Meteo ItaliaMeteo ARPAE ICON-2I (7-Day Forecast)',
      endpoint:
        'https://api.open-meteo.com/v1/forecast?latitude=41.89&longitude=12.51&hourly=temperature_2m&models=italia_meteo_arpae_icon_2i&forecast_days=7',
      openWeatherMapConfiguredOnServer: isOwmConfigured,
      envVarName: 'OPENWEATHERMAP_API_KEY',
      defaultLocation: {
        name: 'Vicenza & Rete Italia (ARPAE ICON-2I)',
        lat: 41.89,
        lon: 12.51,
      },
      checkedAt: new Date().toISOString(),
    });
  });

  app.get('/api/weather/forecast', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat) || 41.89;
    const lon = Number(req.query.lon) || 12.51;
    const owmKey = (process.env.OPENWEATHERMAP_API_KEY || '').trim();

    try {
      const omUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m&models=italia_meteo_arpae_icon_2i&forecast_days=7&timezone=Europe%2FRome`;
      const omRes = await fetch(omUrl);
      const omData = omRes.ok ? await omRes.json() : {};
      const firstHourlyTemp = Array.isArray(omData.hourly?.temperature_2m)
        ? omData.hourly.temperature_2m[0]
        : undefined;
      res.json({
        provider: 'Open-Meteo ItaliaMeteo ARPAE ICON-2I (7gg)',
        configured: true,
        model: 'italia_meteo_arpae_icon_2i',
        forecastDays: 7,
        hourlyTemperatureCount: Array.isArray(omData.hourly?.temperature_2m)
          ? omData.hourly.temperature_2m.length
          : 0,
        current: {
          temperature: Math.round(
            omData.current?.temperature_2m ?? firstHourlyTemp ?? 18,
          ),
          apparentTemperature: Math.round(
            omData.current?.apparent_temperature ?? firstHourlyTemp ?? 17,
          ),
          humidity: Math.round(omData.current?.relative_humidity_2m ?? 60),
          windSpeedKmh: Math.round(omData.current?.wind_speed_10m ?? 9),
          windGustKmh: Math.round(omData.current?.wind_gusts_10m ?? 24),
        },
      });
    } catch {
      res.json({
        provider: 'ItaliaMeteo ARPAE ICON-2I (Local Cache)',
        configured: owmKey.length >= 16,
        current: {
          temperature: 18,
          apparentTemperature: 17,
          humidity: 62,
          windSpeedKmh: 9,
          windGustKmh: 24,
        },
      });
    }
  });

  // 2. SEO Sitemap XML, Robots.txt & GEO /llms.txt + /.well-known/security.txt
  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const xml = generateSitemapXml(baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(xml);
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const txt = generateRobotsTxt(baseUrl);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(txt);
  });

  app.get(['/llms.txt', '/llms-full.txt'], (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const txt = generateStreamVerseLlmsTxt(baseUrl);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(txt);
  });

  app.get('/.well-known/security.txt', (req: Request, res: Response) => {
    const baseUrl = getBaseUrl(req);
    const securityTxt = [
      'Contact: mailto:security@streamverse.it',
      `Canonical: ${baseUrl}/.well-known/security.txt`,
      'Preferred-Languages: it, en',
      'Policy: https://streamverse.it/security-policy',
      'Expires: 2027-12-31T23:59:59.000Z',
    ].join('\n');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(securityTxt);
  });

  // 3. Canonical redirects for bare locale paths (/it -> /it/)
  app.use((req: Request, res: Response, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const rawPath = req.originalUrl.split('?')[0];
    for (const loc of SUPPORTED_LOCALES) {
      if (rawPath === `/${loc}`) {
        res.redirect(301, `/${loc}/`);
        return;
      }
    }
    next();
  });

  let vite: Awaited<ReturnType<typeof import('vite')['createServer']>> | null = null;

  if (!isProduction && !options?.skipVite) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distPath, {
        index: false,
      }),
    );
  }

  // 4. SSR Prerendering Handler for all Public and Admin routes
  app.use(async (req: Request, res: Response, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    try {
      const url = req.originalUrl.split('?')[0];
      const baseUrl = getBaseUrl(req);

      let template = '';
      if (!isProduction && vite) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
      } else {
        const prodIndex = path.resolve(__dirname, 'dist', 'index.html');
        template = fs.readFileSync(
          fs.existsSync(prodIndex) ? prodIndex : path.resolve(__dirname, 'index.html'),
          'utf-8',
        );
      }

      const rendered = renderRouteHtml(url, baseUrl);

      if (rendered.isAdmin) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        res.setHeader('Cache-Control', 'no-store, private');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }

      const html = template
        .replace('<html lang="it">', `<html lang="${rendered.htmlLang}">`)
        .replace(
          /<!--seo-head-start-->[\s\S]*?<!--seo-head-end-->/,
          `<!--seo-head-start-->\n    ${rendered.headHtml}\n    <!--seo-head-end-->`,
        )
        .replace('<!--app-html-->', rendered.appHtml);

      res.status(rendered.statusCode).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(html);
    } catch (err) {
      if (!isProduction && vite && err instanceof Error) {
        vite.ssrFixStacktrace(err);
      }
      next(err);
    }
  });

  return app;
}

const isDirectEntry =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectEntry) {
  createApp().then((app) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`AI App Builder server running on http://0.0.0.0:${PORT}`);
    });
  });
}
