import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import {
  createApp,
  isSecureAdminCredentialConfigured,
  verifyAdminPassphrase,
} from '../server.ts';
import {
  buildIsolatedPreviewSrcDoc,
  PREVIEW_CSP_CONTENT,
  runIsolatedSandboxVerification,
} from '../src/lib/agentOrchestrator.ts';
import {
  serializeSettingsForStorage,
  clearSessionAiCredentials,
} from '../src/lib/storage.ts';
import type { AppSettings } from '../src/types/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

describe('1. Autenticazione Admin e Protezione Route Workspace (tests/auth.test.ts)', () => {
  let server: Server;
  let baseUrl = '';
  const originalAdminPassword = process.env.ADMIN_PASSWORD;

  before(async () => {
    const app = await createApp({ skipVite: true });
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    if (originalAdminPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = originalAdminPassword;
    }
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('rifiuta configurazioni ADMIN_PASSWORD vuote, troppo corte o uguali a "admin" / "password"', () => {
    assert.equal(isSecureAdminCredentialConfigured(''), false);
    assert.equal(isSecureAdminCredentialConfigured('   '), false);
    assert.equal(isSecureAdminCredentialConfigured('admin'), false);
    assert.equal(isSecureAdminCredentialConfigured('ADMIN'), false);
    assert.equal(isSecureAdminCredentialConfigured('password'), false);
    assert.equal(isSecureAdminCredentialConfigured('PASSWORD'), false);
    assert.equal(isSecureAdminCredentialConfigured('short7'), false);
    assert.equal(isSecureAdminCredentialConfigured('ValidStrongPass!2026'), true);
  });

  it('fallisce il login amministratore (HTTP 503) quando ADMIN_PASSWORD non è configurata in modo sicuro', async () => {
    process.env.ADMIN_PASSWORD = '';
    const resEmptyEnv = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'ValidStrongPass!2026' }),
    });
    assert.equal(resEmptyEnv.status, 503);
    const dataEmptyEnv = (await resEmptyEnv.json()) as {
      authenticated: boolean;
      errorCode?: string;
    };
    assert.equal(dataEmptyEnv.authenticated, false);
    assert.equal(dataEmptyEnv.errorCode, 'ADMIN_CREDENTIALS_NOT_CONFIGURED');

    process.env.ADMIN_PASSWORD = 'password';
    const resDefaultEnv = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'password' }),
    });
    assert.equal(resDefaultEnv.status, 503);
    const dataDefaultEnv = (await resDefaultEnv.json()) as {
      authenticated: boolean;
      errorCode?: string;
    };
    assert.equal(dataDefaultEnv.authenticated, false);
    assert.equal(dataDefaultEnv.errorCode, 'ADMIN_CREDENTIALS_NOT_CONFIGURED');
  });

  it('rifiuta il login amministratore con password vuota, "admin" o "password" anche quando ADMIN_PASSWORD è configurata', async () => {
    process.env.ADMIN_PASSWORD = 'ValidStrongAdminPass!2026';

    for (const invalidPass of ['', '   ', 'admin', 'ADMIN', 'password', 'wrong-passphrase']) {
      const res = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: invalidPass }),
      });
      assert.equal(res.status, 401, `Atteso HTTP 401 per passphrase: "${invalidPass}"`);
      const body = (await res.json()) as { authenticated: boolean; errorCode?: string };
      assert.equal(body.authenticated, false);
      assert.equal(body.errorCode, 'INVALID_ADMIN_CREDENTIALS');
    }

    assert.equal(verifyAdminPassphrase('', 'ValidStrongAdminPass!2026').allowed, false);
    assert.equal(verifyAdminPassphrase('admin', 'ValidStrongAdminPass!2026').allowed, false);
    assert.equal(verifyAdminPassphrase('password', 'ValidStrongAdminPass!2026').allowed, false);
  });

  it('rifiuta le richieste non autenticate a tutte le API protette di workspace, AI e amministrazione', async () => {
    process.env.ADMIN_PASSWORD = 'ValidStrongAdminPass!2026';

    const protectedRequests: Array<{ method: string; path: string; body?: unknown }> = [
      { method: 'GET', path: '/api/user/projects' },
      {
        method: 'POST',
        path: '/api/user/projects',
        body: { id: 'unauth_proj', name: 'Test Unauth' },
      },
      { method: 'DELETE', path: '/api/user/projects/unauth_proj' },
      { method: 'GET', path: '/api/user/activity-logs' },
      {
        method: 'POST',
        path: '/api/user/activity-logs',
        body: { id: 'l1', projectId: 'p1', instructionText: 'test' },
      },
      {
        method: 'POST',
        path: '/api/ai/generate',
        body: {
          project: { name: 'Ristorante', description: 'Menu e contatti', type: 'website', instructions: [] },
        },
      },
      {
        method: 'POST',
        path: '/api/ai/orchestrate',
        body: {
          project: { name: 'Ristorante', description: 'Menu e contatti', type: 'website', instructions: [] },
        },
      },
      {
        method: 'POST',
        path: '/api/ai/verify-connection',
        body: { aiSettings: { provider: 'gemini', apiKey: 'test', model: 'gemini-2.5-flash' } },
      },
      { method: 'GET', path: '/api/admin/projects' },
      { method: 'GET', path: '/api/admin/activity-logs' },
      { method: 'GET', path: '/api/admin/users' },
    ];

    for (const reqSpec of protectedRequests) {
      const res = await fetch(`${baseUrl}${reqSpec.path}`, {
        method: reqSpec.method,
        headers: reqSpec.body ? { 'Content-Type': 'application/json' } : undefined,
        body: reqSpec.body ? JSON.stringify(reqSpec.body) : undefined,
      });
      assert.equal(
        res.status,
        401,
        `La route protetta ${reqSpec.method} ${reqSpec.path} deve restituire 401 senza sessione`,
      );
    }
  });

  it('consente una sessione amministrativa valida quando ADMIN_PASSWORD è configurata correttamente e la invalida al logout', async () => {
    const strongPass = 'ValidStrongAdminPass!2026';
    process.env.ADMIN_PASSWORD = strongPass;

    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: strongPass }),
    });
    assert.equal(loginRes.status, 200);
    const loginData = (await loginRes.json()) as { authenticated: boolean };
    assert.equal(loginData.authenticated, true);

    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert.ok(setCookieHeader && setCookieHeader.includes('ai_app_builder_admin_session='));
    assert.ok(setCookieHeader.includes('HttpOnly'));
    const cookiePair = setCookieHeader.split(';')[0];

    // Verify session endpoint with admin cookie
    const sessionRes = await fetch(`${baseUrl}/api/admin/session`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(sessionRes.status, 200);
    const sessionData = (await sessionRes.json()) as { authenticated: boolean };
    assert.equal(sessionData.authenticated, true);

    // Verify protected admin projects endpoint works with valid admin session without modifying real user data
    const projectsRes = await fetch(`${baseUrl}/api/admin/projects`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(projectsRes.status, 200);
    const projectsData = (await projectsRes.json()) as { projects: unknown[] };
    assert.ok(Array.isArray(projectsData.projects));

    // Logout invalidates the session
    const logoutRes = await fetch(`${baseUrl}/api/admin/logout`, {
      method: 'POST',
      headers: { Cookie: cookiePair },
    });
    assert.equal(logoutRes.status, 200);

    const afterLogoutRes = await fetch(`${baseUrl}/api/admin/projects`, {
      headers: { Cookie: cookiePair },
    });
    assert.equal(afterLogoutRes.status, 401);
  });
});

describe('2. Isolamento Anteprima (Sandbox + CSP) e Sicurezza Chiavi BYOK in Memoria', () => {
  it('rimuove allow-same-origin dall\'iframe in EditorView.tsx e usa sandbox="allow-scripts"', () => {
    const editorViewPath = path.join(ROOT_DIR, 'src', 'components', 'EditorView.tsx');
    const editorSource = fs.readFileSync(editorViewPath, 'utf-8');

    assert.ok(
      editorSource.includes('sandbox="allow-scripts"'),
      'EditorView.tsx deve avere sandbox="allow-scripts" sull\'iframe di anteprima',
    );
    assert.ok(
      !editorSource.includes('allow-same-origin'),
      'EditorView.tsx NON deve contenere allow-same-origin',
    );
  });

  it('inietta una Content Security Policy restrittiva e blocca accesso a parent, top, storage e API', () => {
    const untrustedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval';" />
  <title>Test Ristorante</title>
</head>
<body>
  <h1>Menu Ristorante</h1>
</body>
</html>`;

    const isolated = buildIsolatedPreviewSrcDoc(untrustedHtml);

    // Must strip attacker-supplied permissive CSP meta tag and inject PREVIEW_CSP_CONTENT
    assert.ok(!isolated.includes("default-src * 'unsafe-inline'"));
    assert.ok(isolated.includes(PREVIEW_CSP_CONTENT));
    assert.ok(isolated.includes("connect-src 'none'"));
    assert.ok(isolated.includes("form-action 'none'"));
    assert.ok(isolated.includes("frame-ancestors 'none'"));
    assert.ok(isolated.includes("object-src 'none'"));
    assert.ok(isolated.includes("base-uri 'none'"));
    // Runtime guard locking window.parent, window.top, and window.opener
    assert.ok(isolated.includes("Object.defineProperty(window,'parent'"));
    assert.ok(isolated.includes("Object.defineProperty(window,'top'"));
    assert.ok(isolated.includes("Object.defineProperty(window,'opener'"));
  });

  it('usa vm.Script esclusivamente per la validazione sintattica senza eseguire il codice generato', () => {
    const sideEffectCheckHtml = `<!DOCTYPE html>
<html>
<head><title>Check</title></head>
<body>
  <script>
    globalThis.__UNTRUSTED_CODE_EXECUTED__ = true;
    const validSyntax = 40 + 2;
  </script>
</body>
</html>`;

    const report = runIsolatedSandboxVerification(
      [{ path: 'index.html', content: sideEffectCheckHtml, language: 'html' }],
      sideEffectCheckHtml,
    );

    assert.equal(report.passed, true);
    assert.equal(
      (globalThis as Record<string, unknown>).__UNTRUSTED_CODE_EXECUTED__,
      undefined,
      'vm.Script non deve mai eseguire il codice non attendibile nel processo Node.js',
    );
  });

  it('non salva mai le chiavi API BYOK in localStorage e le cancella al logout', () => {
    const sampleSettings: AppSettings = {
      ai: {
        provider: 'openai',
        apiKey: 'sk-proj-secret-test-key-1234567890abcdef',
        model: 'gpt-4o',
        endpoint: 'https://api.openai.com/v1/chat/completions',
      },
      github: {
        username: 'devuser',
        token: 'ghp_secretToken1234567890abcdef',
      },
      theme: {
        accentColor: 'blue',
        sidebarStyle: 'navy',
      },
    };

    const serialized = serializeSettingsForStorage(sampleSettings);
    assert.equal(serialized.ai.provider, 'openai');
    assert.equal(serialized.ai.model, 'gpt-4o');
    assert.equal(serialized.ai.apiKey, '', 'La chiave API BYOK non deve mai essere serializzata per localStorage');
    assert.equal(serialized.github.token, '', 'Il token GitHub non deve mai essere serializzato per localStorage');

    const cleared = clearSessionAiCredentials(sampleSettings);
    assert.equal(cleared.ai.apiKey, '', 'clearSessionAiCredentials deve azzerare la chiave API in memoria');
    assert.equal(cleared.github.token, '');
  });
});
