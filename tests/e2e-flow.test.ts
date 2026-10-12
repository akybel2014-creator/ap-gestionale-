import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http, { type Server } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.ts';
import {
  buildIsolatedPreviewSrcDoc,
  PREVIEW_CSP_CONTENT,
  runIsolatedSandboxVerification,
} from '../src/lib/agentOrchestrator.ts';
import {
  loadProjects,
  saveProjects,
  loadSettings,
  saveSettings,
  computeCodeVersionReference,
  resolveProjectSyncConflict,
  buildInteractiveProjectStarterHtml,
  formatCounterActivityMessage,
  parseLatestCounterValueFromLogs,
  loadProjectChatHistory,
  saveProjectChatHistory,
} from '../src/lib/storage.ts';
import { generateProjectCode } from '../src/lib/useProjectStore.ts';
import type {
  Project,
  ProjectFile,
  ProjectDatabaseEntity,
  ProjectApiRouteSpec,
  ProjectVersionSnapshot,
  AgentPipelineRun,
  SandboxVerificationReport,
  AppSettings,
  ActivityLogEntry,
  ProjectChatMessage,
} from '../src/types/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const LOGS_FILE = path.join(DATA_DIR, 'activity-logs.json');

const GUIDED_RESTAURANT_PROMPT =
  'Crea un sito web completo per un ristorante, con homepage, menu consultabile, orari, indirizzo, modulo di prenotazione e layout responsive. Organizza i file in modo chiaro e descrivi le API necessarie per gestire le prenotazioni.';

describe('3. Collaudo Funzionale End-to-End del Flusso Principale (tests/e2e-flow.test.ts)', () => {
  let appServer: Server;
  let appBaseUrl = '';

  let mockProviderServer: Server;
  let mockProviderUrl = '';
  const mockProviderRequests: Array<{
    authorization: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
  }> = [];
  let simulateBrokenSyntaxOnFirstFrontendCall = false;
  let frontendCallCounter = 0;

  // Snapshot existing .data files so the test is 100% non-destructive on real accounts/data
  let backupUsers: string | null = null;
  let backupProjects: string | null = null;
  let backupLogs: string | null = null;
  const originalAdminPassword = process.env.ADMIN_PASSWORD;

  const sessionTokenRuntimeOnly = `test_runtime_token_${Date.now()}`;

  before(async () => {
    backupUsers = fs.existsSync(USERS_FILE) ? fs.readFileSync(USERS_FILE, 'utf-8') : null;
    backupProjects = fs.existsSync(PROJECTS_FILE) ? fs.readFileSync(PROJECTS_FILE, 'utf-8') : null;
    backupLogs = fs.existsSync(LOGS_FILE) ? fs.readFileSync(LOGS_FILE, 'utf-8') : null;

    process.env.ADMIN_PASSWORD = 'ValidStrongAdminPass!2026';

    // 1. Start local simulated OpenAI-compatible provider strictly for automated testing
    mockProviderServer = http.createServer((req, res) => {
      if (req.method !== 'POST' || req.url !== '/v1/chat/completions') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Endpoint non trovato' }));
        return;
      }

      let rawBody = '';
      req.on('data', (chunk) => {
        rawBody += chunk.toString();
      });
      req.on('end', () => {
        const authHeader = String(req.headers.authorization || '');
        if (authHeader !== `Bearer ${sessionTokenRuntimeOnly}`) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Unauthorized key in simulated test provider' } }));
          return;
        }

        let parsed: {
          model?: string;
          messages?: Array<{ role: string; content: string }>;
        } = {};
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }

        const model = parsed.model || '';
        const sysMsg = parsed.messages?.find((m) => m.role === 'system')?.content || '';
        const usrMsg = parsed.messages?.find((m) => m.role === 'user')?.content || '';

        mockProviderRequests.push({
          authorization: authHeader,
          model,
          systemPrompt: sysMsg,
          userPrompt: usrMsg,
        });

        let replyContent = 'OK';

        if (sysMsg.includes('Sei un assistente di diagnostica')) {
          replyContent = 'OK';
        } else if (sysMsg.includes('Sei il Planner Agent')) {
          replyContent = JSON.stringify({
            architectureSummary:
              'Sito web full-stack per Ristorante La Trattoria con menu filtrabile, orari, mappa indirizzo e API REST per la gestione delle prenotazioni tavoli.',
            plannedFiles: [
              'index.html',
              'src/api/routes.js',
              'schema/database.json',
              'package.json',
            ],
            dependencies: {
              express: '^5.0.0',
              tailwindcss: '^3.4.0',
            },
            databaseSchema: [
              {
                name: 'Reservation',
                description: 'Prenotazione tavolo effettuata dal cliente dal modulo web',
                fields: [
                  { name: 'id', type: 'string', required: true },
                  { name: 'guestName', type: 'string', required: true },
                  { name: 'date', type: 'string', required: true },
                  { name: 'time', type: 'string', required: true },
                  { name: 'guests', type: 'number', required: true },
                ],
              },
              {
                name: 'MenuItem',
                description: 'Piatto del menu consultabile per categoria',
                fields: [
                  { name: 'id', type: 'string', required: true },
                  { name: 'name', type: 'string', required: true },
                  { name: 'category', type: 'string', required: true },
                  { name: 'priceEur', type: 'number', required: true },
                ],
              },
            ],
            apiRoutes: [
              {
                method: 'GET',
                path: '/api/menu',
                description: 'Restituisce l\'elenco dei piatti del ristorante divisi per portata',
                authRequired: false,
              },
              {
                method: 'POST',
                path: '/api/reservations',
                description: 'Registra e valida una nuova richiesta di prenotazione tavolo',
                authRequired: false,
              },
              {
                method: 'GET',
                path: '/api/reservations',
                description: 'Elenco prenotazioni confermate per il gestore del ristorante',
                authRequired: true,
              },
            ],
          });
        } else if (sysMsg.includes('Sei il Backend Agent')) {
          replyContent = `const reservations = [];
const menu = [
  { id: 'm1', name: 'Tagliatelle al Tartufo', category: 'Primi', priceEur: 18 },
  { id: 'm2', name: 'Fiorentina alla Brace', category: 'Secondi', priceEur: 42 },
  { id: 'm3', name: 'Tiramisu Artigianale', category: 'Dolci', priceEur: 8 }
];

function getMenu(_req, res) {
  res.json({ menu });
}

function createReservation(req, res) {
  const { guestName, date, time, guests } = req.body || {};
  if (!guestName || !date || !time) {
    return res.status(400).json({ error: 'Dati prenotazione incompleti' });
  }
  const item = { id: 'res_' + Date.now(), guestName, date, time, guests: Number(guests) || 2 };
  reservations.push(item);
  return res.status(201).json({ reservation: item });
}

module.exports = { getMenu, createReservation };`;
        } else if (sysMsg.includes('Sei il Frontend Agent')) {
          frontendCallCounter++;
          if (simulateBrokenSyntaxOnFirstFrontendCall && frontendCallCounter === 1) {
            // Return invalid JS syntax on purpose to verify QA self-healing loop
            replyContent = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><title>Ristorante</title></head>
<body>
  <h1>Ristorante La Trattoria</h1>
  <script>
    const brokenSyntax = ( ;
  </script>
</body>
</html>`;
          } else {
            replyContent = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ristorante La Trattoria — Menu, Orari e Prenotazioni</title>
</head>
<body>
  <header>
    <h1>Ristorante La Trattoria</h1>
    <p>Via Roma 42, Milano · Aperto Mar-Dom 12:00-15:00 / 19:00-23:30</p>
  </header>
  <main>
    <section id="menu">
      <h2>Menu Consultabile</h2>
      <ul>
        <li>Tagliatelle al Tartufo — €18</li>
        <li>Fiorentina alla Brace — €42</li>
        <li>Tiramisu Artigianale — €8</li>
      </ul>
    </section>
    <section id="prenotazioni">
      <h2>Modulo di Prenotazione Tavolo</h2>
      <form id="booking-form">
        <input type="text" name="guestName" placeholder="Nome e Cognome" required />
        <input type="date" name="date" required />
        <input type="time" name="time" required />
        <input type="number" name="guests" min="1" max="12" value="2" />
        <button type="submit">Prenota Ora</button>
      </form>
      <p id="booking-status"></p>
    </section>
  </main>
  <script>
    document.getElementById('booking-form').addEventListener('submit', function(e) {
      e.preventDefault();
      document.getElementById('booking-status').textContent = 'Richiesta di prenotazione registrata.';
    });
  </script>
</body>
</html>`;
          }
        } else if (sysMsg.includes('Sei il QA / Self-Healing Agent')) {
          replyContent = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ristorante La Trattoria — Menu, Orari e Prenotazioni</title>
</head>
<body>
  <header>
    <h1>Ristorante La Trattoria</h1>
    <p>Via Roma 42, Milano · Orari: 12:00-15:00, 19:00-23:30</p>
  </header>
  <main>
    <section id="menu"><h2>Menu</h2></section>
    <section id="prenotazioni"><h2>Prenotazioni</h2></section>
  </main>
  <script>
    const healedSyntax = true;
  </script>
</body>
</html>`;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content: replyContent } }],
          }),
        );
      });
    });

    await new Promise<void>((resolve) => {
      mockProviderServer.listen(0, '127.0.0.1', () => {
        const addr = mockProviderServer.address();
        if (addr && typeof addr === 'object') {
          mockProviderUrl = `http://127.0.0.1:${addr.port}/v1/chat/completions`;
        }
        resolve();
      });
    });

    // 2. Start application server
    const app = await createApp({ skipVite: true });
    await new Promise<void>((resolve) => {
      appServer = app.listen(0, '127.0.0.1', () => {
        const addr = appServer.address();
        if (addr && typeof addr === 'object') {
          appBaseUrl = `http://127.0.0.1:${addr.port}`;
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

    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }
    if (mockProviderServer) {
      await new Promise<void>((resolve) => mockProviderServer.close(() => resolve()));
    }

    // Restore original .data files untouched
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (backupUsers !== null) {
      fs.writeFileSync(USERS_FILE, backupUsers, 'utf-8');
    } else if (fs.existsSync(USERS_FILE)) {
      fs.unlinkSync(USERS_FILE);
    }

    if (backupProjects !== null) {
      fs.writeFileSync(PROJECTS_FILE, backupProjects, 'utf-8');
    } else if (fs.existsSync(PROJECTS_FILE)) {
      fs.unlinkSync(PROJECTS_FILE);
    }

    if (backupLogs !== null) {
      fs.writeFileSync(LOGS_FILE, backupLogs, 'utf-8');
    } else if (fs.existsSync(LOGS_FILE)) {
      fs.unlinkSync(LOGS_FILE);
    }
  });

  it('esegue il flusso completo: (1) verifica connessione IA, (2) creazione progetto Ristorante, (3-4) orchestrazione multi-file, (5) validazione sintassi e self-healing, (6) anteprima isolata, (7) persistenza e ricaricamento, (8) versioni e rollback, (9) esportazione, (10) isolamento tra utenti', async () => {
    // =========================================================================
    // Register two distinct test users (User A and User B) to verify isolation
    // =========================================================================
    const regARes = await fetch(`${appBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Utente Collaudo A',
        email: `collaudo.a.${Date.now()}@example.com`,
        password: 'PasswordSicuraA!2026',
        planId: 'free-byok',
        billingPeriod: 'monthly',
      }),
    });
    assert.equal(regARes.status, 201);
    const cookieA = (regARes.headers.get('set-cookie') || '').split(';')[0];
    const regAData = (await regARes.json()) as { user: { id: string; email: string } };
    const userAId = regAData.user.id;
    assert.ok(cookieA.includes('ai_app_builder_user_session='));

    const regBRes = await fetch(`${appBaseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Utente Collaudo B',
        email: `collaudo.b.${Date.now()}@example.com`,
        password: 'PasswordSicuraB!2026',
        planId: 'free-byok',
        billingPeriod: 'monthly',
      }),
    });
    assert.equal(regBRes.status, 201);
    const cookieB = (regBRes.headers.get('set-cookie') || '').split(';')[0];
    const regBData = (await regBRes.json()) as { user: { id: string; email: string } };
    const userBId = regBData.user.id;
    assert.notEqual(userAId, userBId);

    // =========================================================================
    // STEP 1: Configurazione IA, distinzione errori configurazione vs generazione,
    //         e verifica connessione con provider/modello selezionati
    // =========================================================================
    // 1a. Missing provider -> 400 MISSING_PROVIDER
    const missingProvRes = await fetch(`${appBaseUrl}/api/ai/verify-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ aiSettings: { provider: '', apiKey: '', model: '' } }),
    });
    assert.equal(missingProvRes.status, 400);
    const missingProvData = (await missingProvRes.json()) as { errorCode?: string };
    assert.equal(missingProvData.errorCode, 'MISSING_PROVIDER');

    // 1b. Customer without BYOK key -> 403 MANAGED_AI_RESTRICTED_TO_ADMIN
    const missingKeyRes = await fetch(`${appBaseUrl}/api/ai/verify-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        aiSettings: { provider: 'custom', apiKey: '', model: 'ristorante-model-v1', endpoint: mockProviderUrl },
      }),
    });
    assert.equal(missingKeyRes.status, 403);
    const missingKeyData = (await missingKeyRes.json()) as { errorCode?: string };
    assert.equal(missingKeyData.errorCode, 'MANAGED_AI_RESTRICTED_TO_ADMIN');

    // 1c. Invalid BYOK key -> 401 INVALID_API_KEY
    const badKeyRes = await fetch(`${appBaseUrl}/api/ai/verify-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        aiSettings: {
          provider: 'custom',
          apiKey: 'wrong_key',
          model: 'ristorante-model-v1',
          endpoint: mockProviderUrl,
        },
      }),
    });
    assert.equal(badKeyRes.status, 401);
    const badKeyData = (await badKeyRes.json()) as { errorCode?: string };
    assert.equal(badKeyData.errorCode, 'INVALID_API_KEY');

    // 1d. Valid BYOK configuration -> 200 OK using exact selected provider & model
    const selectedAiSettings: AppSettings['ai'] = {
      provider: 'custom',
      apiKey: sessionTokenRuntimeOnly,
      model: 'ristorante-model-v1',
      endpoint: mockProviderUrl,
    };

    const verifyOkRes = await fetch(`${appBaseUrl}/api/ai/verify-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ aiSettings: selectedAiSettings }),
    });
    assert.equal(verifyOkRes.status, 200);
    const verifyOkData = (await verifyOkRes.json()) as {
      ok: boolean;
      provider: string;
      model: string;
      mode: string;
    };
    assert.equal(verifyOkData.ok, true);
    assert.equal(verifyOkData.provider, 'custom');
    assert.equal(verifyOkData.model, 'ristorante-model-v1');
    assert.equal(verifyOkData.mode, 'byok');
    assert.equal(mockProviderRequests.at(-1)?.model, 'ristorante-model-v1');

    // =========================================================================
    // STEP 2: Creazione del progetto Ristorante con il prompt di collaudo
    // =========================================================================
    const nowIso = new Date().toISOString();
    const initialProject: Project = {
      id: `proj_ristorante_${Date.now()}`,
      userId: userAId,
      name: 'Ristorante La Trattoria',
      description: GUIDED_RESTAURANT_PROMPT,
      type: 'website',
      status: 'draft',
      instructions: [
        {
          id: 'inst_1',
          text: GUIDED_RESTAURANT_PROMPT,
          timestamp: nowIso,
          status: 'recorded',
          userId: userAId,
        },
      ],
      previewHtml: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    initialProject.codeVersion = computeCodeVersionReference(initialProject);

    const createProjRes = await fetch(`${appBaseUrl}/api/user/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify(initialProject),
    });
    assert.equal(createProjRes.status, 201);

    // =========================================================================
    // STEP 3, 4 & 5: Chiamata all'orchestratore, produzione multi-file coerente
    //                e validazione/auto-riparazione errori di sintassi (QA Self-Healing)
    // =========================================================================
    simulateBrokenSyntaxOnFirstFrontendCall = true;
    frontendCallCounter = 0;

    const orchRes = await fetch(`${appBaseUrl}/api/ai/orchestrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        project: {
          id: initialProject.id,
          name: initialProject.name,
          description: initialProject.description,
          type: initialProject.type,
          instructions: initialProject.instructions,
        },
        aiSettings: selectedAiSettings,
        maxHealingAttempts: 2,
      }),
    });
    assert.equal(orchRes.status, 200);

    const orchData = (await orchRes.json()) as {
      html: string;
      files: ProjectFile[];
      dependencies: Record<string, string>;
      databaseSchema: ProjectDatabaseEntity[];
      apiRoutes: ProjectApiRouteSpec[];
      agentRun: AgentPipelineRun;
      sandboxReport: SandboxVerificationReport;
      provider: string;
      mode: string;
    };

    // Verify all 4 stages ran with the exact configured model and self-healed the syntax error
    assert.equal(orchData.provider, 'custom');
    assert.equal(orchData.mode, 'byok');
    assert.equal(orchData.sandboxReport.passed, true);
    assert.equal(
      orchData.sandboxReport.attemptNumber,
      2,
      'Il QA Agent deve aver rilevato l\'errore sintattico al tentativo 1 e averlo riparato al tentativo 2',
    );
    assert.equal(orchData.agentRun.status, 'completed');
    assert.equal(orchData.agentRun.stages.length, 4);
    assert.ok(orchData.agentRun.stages.every((s) => s.status === 'completed'));

    // Verify coherent multi-file output (index.html, src/api/routes.js, schema/database.json, package.json, README.md)
    const filePaths = orchData.files.map((f) => f.path);
    assert.ok(filePaths.includes('index.html'));
    assert.ok(filePaths.includes('src/api/routes.js'));
    assert.ok(filePaths.includes('schema/database.json'));
    assert.ok(filePaths.includes('package.json'));
    assert.ok(filePaths.includes('README.md'));
    assert.ok(orchData.databaseSchema.some((e) => e.name === 'Reservation'));
    assert.ok(orchData.apiRoutes.some((r) => r.path === '/api/reservations' && r.method === 'POST'));

    // Direct syntax check via /api/sandbox/verify on broken JS vs valid JS
    const verifyBrokenRes = await fetch(`${appBaseUrl}/api/sandbox/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        files: [{ path: 'src/api/routes.js', content: 'function broken( {', language: 'javascript' }],
        previewHtml: orchData.html,
      }),
    });
    assert.equal(verifyBrokenRes.status, 200);
    const verifyBrokenData = (await verifyBrokenRes.json()) as { report: SandboxVerificationReport };
    assert.equal(verifyBrokenData.report.passed, false);

    // =========================================================================
    // STEP 6: Aggiornamento dell'anteprima isolata (CSP + opaque origin)
    // =========================================================================
    const isolatedSrcDoc = buildIsolatedPreviewSrcDoc(orchData.html);
    assert.ok(isolatedSrcDoc.includes(PREVIEW_CSP_CONTENT));
    assert.ok(isolatedSrcDoc.includes('Ristorante La Trattoria'));
    assert.ok(isolatedSrcDoc.includes("connect-src 'none'"));

    // =========================================================================
    // STEP 7 & 8: Salvataggio progetto, creazione versione v1 e v2, ricaricamento
    //             dopo refresh pagina (server + localStorage) e ripristino versione (rollback)
    // =========================================================================
    const v1Timestamp = new Date(Date.now() + 1000).toISOString();
    const projectV1: Project = {
      ...initialProject,
      status: 'generated',
      previewHtml: orchData.html,
      files: orchData.files,
      dependencies: orchData.dependencies,
      databaseSchema: orchData.databaseSchema,
      apiRoutes: orchData.apiRoutes,
      lastAgentRun: orchData.agentRun,
      updatedAt: v1Timestamp,
    };
    const version1Id = computeCodeVersionReference(projectV1);
    projectV1.codeVersion = version1Id;

    const snapshotV1: ProjectVersionSnapshot = {
      versionId: version1Id,
      createdAt: v1Timestamp,
      summary: 'Versione 1 — Pipeline Multi-Agente Ristorante',
      previewHtml: orchData.html,
      files: orchData.files,
      dependencies: orchData.dependencies,
      databaseSchema: orchData.databaseSchema,
      apiRoutes: orchData.apiRoutes,
      sandboxPassed: true,
    };

    // Create a second version (v2) with an updated title in index.html
    const v2Html = orchData.html.replace(
      'Ristorante La Trattoria',
      'Ristorante La Trattoria — Edizione Speciale V2',
    );
    const v2Files = orchData.files.map((f) =>
      f.path === 'index.html' ? { ...f, content: v2Html } : f,
    );
    const v2Timestamp = new Date(Date.now() + 2000).toISOString();
    const projectV2: Project = {
      ...projectV1,
      previewHtml: v2Html,
      files: v2Files,
      updatedAt: v2Timestamp,
    };
    const version2Id = computeCodeVersionReference(projectV2);
    assert.notEqual(version1Id, version2Id);
    projectV2.codeVersion = version2Id;

    const snapshotV2: ProjectVersionSnapshot = {
      versionId: version2Id,
      createdAt: v2Timestamp,
      summary: 'Versione 2 — Modifica titolo Ristorante',
      previewHtml: v2Html,
      files: v2Files,
      dependencies: orchData.dependencies,
      databaseSchema: orchData.databaseSchema,
      apiRoutes: orchData.apiRoutes,
      sandboxPassed: true,
    };
    projectV2.versions = [snapshotV2, snapshotV1];

    // Save projectV2 to server
    const saveV2Res = await fetch(`${appBaseUrl}/api/user/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify(projectV2),
    });
    assert.equal(saveV2Res.status, 201);

    // Simulate browser localStorage persistence & reload across page refresh
    const memoryStorage = new Map<string, string>();
    const prevWindow = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = {
      localStorage: {
        getItem: (k: string) => memoryStorage.get(k) ?? null,
        setItem: (k: string, v: string) => {
          memoryStorage.set(k, v);
        },
        removeItem: (k: string) => {
          memoryStorage.delete(k);
        },
      },
    };

    try {
      saveSettings({
        ai: selectedAiSettings,
        github: { username: 'chef-dev', token: 'ghp_should_never_be_saved_1234567890' },
        theme: { accentColor: 'blue', sidebarStyle: 'navy' },
      });
      const reloadedSettings = loadSettings();
      assert.equal(reloadedSettings.ai.provider, 'custom');
      assert.equal(reloadedSettings.ai.model, 'ristorante-model-v1');
      assert.equal(
        reloadedSettings.ai.apiKey,
        '',
        'La chiave API BYOK non deve mai essere salvata o ricaricata da localStorage',
      );
      assert.equal(reloadedSettings.github.token, '');

      saveProjects([projectV2], userAId);
      const localReloaded = loadProjects(userAId);
      assert.equal(localReloaded.length, 1);
      assert.equal(localReloaded[0].id, initialProject.id);
      assert.equal(localReloaded[0].userId, userAId);
      assert.equal(localReloaded[0].files?.length, 5);
      assert.equal(localReloaded[0].versions?.length, 2);
    } finally {
      if (prevWindow === undefined) {
        delete (globalThis as Record<string, unknown>).window;
      } else {
        (globalThis as Record<string, unknown>).window = prevWindow;
      }
    }

    // Reload from server (simulating page refresh GET /api/user/projects)
    const reloadSrvRes = await fetch(`${appBaseUrl}/api/user/projects`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(reloadSrvRes.status, 200);
    const reloadSrvData = (await reloadSrvRes.json()) as { projects: Project[] };
    const reloadedProject = reloadSrvData.projects.find((p) => p.id === initialProject.id);
    assert.ok(reloadedProject, 'Il progetto salvato deve essere ricaricato dal server dopo il refresh');
    assert.equal(reloadedProject.userId, userAId);
    assert.equal(reloadedProject.codeVersion, version2Id);
    assert.equal(reloadedProject.files?.length, 5);
    assert.equal(reloadedProject.versions?.length, 2);
    assert.equal(reloadedProject.databaseSchema?.length, 2);
    assert.equal(reloadedProject.apiRoutes?.length, 3);

    // Step 8: Restore Version 1 (Rollback) and verify state restoration
    const targetRollback = reloadedProject.versions!.find((v) => v.versionId === version1Id)!;
    assert.ok(targetRollback);
    const restoredProject: Project = {
      ...reloadedProject,
      previewHtml: targetRollback.previewHtml,
      files: targetRollback.files,
      updatedAt: new Date(Date.now() + 3000).toISOString(),
    };
    restoredProject.codeVersion = computeCodeVersionReference(restoredProject);
    assert.ok(!restoredProject.previewHtml?.includes('Edizione Speciale V2'));

    // =========================================================================
    // STEP 9: Esportazione dei file generati (senza esporre chiavi API)
    // =========================================================================
    const exportedBundle = generateProjectCode(restoredProject, restoredProject.codeVersion!);
    assert.ok(exportedBundle.includes('# Progetto: Ristorante La Trattoria'));
    assert.ok(exportedBundle.includes('--- FILE: index.html (html) ---'));
    assert.ok(exportedBundle.includes('--- FILE: src/api/routes.js (javascript) ---'));
    assert.ok(exportedBundle.includes('--- FILE: schema/database.json (json) ---'));
    assert.ok(exportedBundle.includes('--- FILE: package.json (json) ---'));
    assert.ok(exportedBundle.includes('/api/reservations'));
    assert.ok(
      !exportedBundle.includes(sessionTokenRuntimeOnly),
      'L\'esportazione del progetto non deve mai contenere la chiave API BYOK',
    );

    // =========================================================================
    // STEP 10: Isolamento rigoroso dei dati fra utenti differenti (User A vs User B)
    // =========================================================================
    // 10a. User B cannot see User A's projects
    const userBListRes = await fetch(`${appBaseUrl}/api/user/projects`, {
      headers: { Cookie: cookieB },
    });
    assert.equal(userBListRes.status, 200);
    const userBListData = (await userBListRes.json()) as { projects: Project[] };
    assert.equal(
      userBListData.projects.some((p) => p.id === initialProject.id),
      false,
      'User B non deve mai vedere i progetti di User A',
    );

    // 10b. User B cannot overwrite User A's project (403 PROJECT_OWNERSHIP_MISMATCH)
    const userBOverwriteRes = await fetch(`${appBaseUrl}/api/user/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({
        ...restoredProject,
        name: 'Tentativo Sovrascrittura da User B',
      }),
    });
    assert.equal(userBOverwriteRes.status, 403);
    const overwriteErr = (await userBOverwriteRes.json()) as { errorCode?: string };
    assert.equal(overwriteErr.errorCode, 'PROJECT_OWNERSHIP_MISMATCH');

    // 10c. User B cannot delete User A's project (403 PROJECT_OWNERSHIP_MISMATCH)
    const userBDeleteRes = await fetch(
      `${appBaseUrl}/api/user/projects/${encodeURIComponent(initialProject.id)}`,
      {
        method: 'DELETE',
        headers: { Cookie: cookieB },
      },
    );
    assert.equal(userBDeleteRes.status, 403);

    // 10d. Client-side conflict resolver also rejects foreign owner projects
    const foreignConflict = resolveProjectSyncConflict(undefined, restoredProject, userBId);
    assert.equal(foreignConflict, null);
  });

  it('verifica il provider Google Gemini (@google/genai generateContent) su verifica connessione, generazione rapida, orchestratore multi-agente e gestione errori (chiave non valida, modello non disponibile/obsoleto, quota 429, timeout)', async () => {
    const geminiRequests: Array<{ url: string; body: Record<string, unknown>; apiKeyHeader: string }> = [];
    let geminiSimulatedMode: 'ok' | 'invalid_key' | 'quota' | 'not_found' | 'timeout' = 'ok';

    const mockGeminiServer = http.createServer((req, res) => {
      let rawBody = '';
      req.on('data', (chunk) => {
        rawBody += chunk.toString();
      });
      req.on('end', () => {
        const parsed = JSON.parse(rawBody || '{}') as Record<string, unknown>;
        const apiKeyHeader = String(req.headers['x-goog-api-key'] || '');
        geminiRequests.push({
          url: req.url || '',
          body: parsed,
          apiKeyHeader,
        });

        if (geminiSimulatedMode === 'invalid_key') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                code: 401,
                message: 'API key not valid. Please pass a valid API key.',
                status: 'UNAUTHENTICATED',
              },
            }),
          );
          return;
        }

        if (geminiSimulatedMode === 'quota') {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                code: 429,
                message: 'Resource has been exhausted (e.g. check quota).',
                status: 'RESOURCE_EXHAUSTED',
              },
            }),
          );
          return;
        }

        if (geminiSimulatedMode === 'not_found') {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                code: 404,
                message: 'models/gemini-non-existent is not found for API version v1beta',
                status: 'NOT_FOUND',
              },
            }),
          );
          return;
        }

        if (geminiSimulatedMode === 'timeout') {
          // Do not respond quickly to trigger timeout if needed, or return 504 DEADLINE_EXCEEDED
          res.writeHead(504, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                code: 504,
                message: 'Deadline expired before operation could complete (DEADLINE_EXCEEDED).',
                status: 'DEADLINE_EXCEEDED',
              },
            }),
          );
          return;
        }

        // Standard Gemini generateContent response format (candidates[0].content.parts[0].text)
        const sysInstruction = JSON.stringify(parsed.systemInstruction || '');
        let responseText = 'OK';

        if (
          sysInstruction.includes('Sei il Frontend Agent') ||
          sysInstruction.includes('Senior Frontend Architect')
        ) {
          responseText =
            '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Ristorante Gemini</title></head><body><h1>Benvenuti da Ristorante Gemini</h1><script>const menuLoaded = true;</script></body></html>';
        } else if (sysInstruction.includes('Sei il Backend Agent')) {
          responseText = 'const routes = [{ path: "/api/prenotazioni", method: "POST" }];\n';
        } else if (sysInstruction.includes('Sei il Planner Agent')) {
          responseText = JSON.stringify({
            architectureSummary: 'Architettura Gemini Full-Stack Ristorante',
            plannedFiles: ['index.html', 'src/api/routes.js', 'schema/database.json', 'package.json'],
            dependencies: { express: '^5.0.0' },
            databaseSchema: [
              {
                name: 'TavoloPrenotazione',
                description: 'Prenotazioni ristorante Gemini',
                fields: [{ name: 'id', type: 'string', required: true }],
              },
            ],
            apiRoutes: [
              {
                method: 'POST',
                path: '/api/prenotazioni',
                description: 'Crea prenotazione tavolo',
                authRequired: false,
              },
            ],
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            candidates: [
              {
                content: {
                  role: 'model',
                  parts: [{ text: responseText }],
                },
                finishReason: 'STOP',
              },
            ],
          }),
        );
      });
    });

    await new Promise<void>((resolve) => {
      mockGeminiServer.listen(0, '127.0.0.1', () => resolve());
    });
    const geminiAddr = mockGeminiServer.address();
    const geminiPort = typeof geminiAddr === 'object' && geminiAddr ? geminiAddr.port : 0;
    const geminiBaseUrl = `http://127.0.0.1:${geminiPort}`;

    try {
      // Authenticate a test user
      const email = `e2e.gemini.${Date.now()}@example.com`;
      const regRes = await fetch(`${appBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Utente Test Gemini',
          email,
          password: 'SafeTestPassword!901',
        }),
      });
      assert.equal(regRes.status, 201);
      const cookie = (regRes.headers.get('set-cookie') || '').split(';')[0];

      const geminiByokSettings = {
        provider: 'gemini' as const,
        apiKey: `test-gemini-session-key-${Date.now()}`,
        model: 'gemini-flash-latest',
        endpoint: geminiBaseUrl,
      };

      // 1. Verify Connection (/api/ai/verify-connection) uses @google/genai generateContent
      const verifyRes = await fetch(`${appBaseUrl}/api/ai/verify-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({ aiSettings: geminiByokSettings }),
      });
      assert.equal(verifyRes.status, 200);
      const verifyData = (await verifyRes.json()) as {
        ok: boolean;
        provider: string;
        model: string;
        mode: string;
      };
      assert.equal(verifyData.ok, true);
      assert.equal(verifyData.provider, 'gemini');
      assert.equal(verifyData.model, 'gemini-flash-latest');
      assert.equal(verifyData.mode, 'byok');
      assert.ok(
        geminiRequests.some((r) => r.url.includes(':generateContent') && r.url.includes('gemini-flash-latest')),
        'Deve invocare l\'endpoint standard Gemini :generateContent tramite @google/genai SDK',
      );

      // 2. Quick Generation (/api/ai/generate) uses Gemini generateContent
      const quickGenRes = await fetch(`${appBaseUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          project: {
            id: 'proj_gemini_quick',
            name: 'Ristorante Gemini',
            description: 'Sito ristorante generato con Gemini',
            type: 'website',
            instructions: [{ text: 'Aggiungi menu e orari' }],
          },
          aiSettings: geminiByokSettings,
        }),
      });
      assert.equal(quickGenRes.status, 200);
      const quickGenData = (await quickGenRes.json()) as {
        html: string;
        provider: string;
        model: string;
      };
      assert.equal(quickGenData.provider, 'gemini');
      assert.equal(quickGenData.model, 'gemini-flash-latest');
      assert.ok(quickGenData.html.includes('Benvenuti da Ristorante Gemini'));

      // 3. Multi-Agent Orchestrator (/api/ai/orchestrate) uses Gemini generateContent across all stages
      const orchRes = await fetch(`${appBaseUrl}/api/ai/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          project: {
            id: 'proj_gemini_orch',
            name: 'Ristorante Gemini Full',
            description: 'Sito ristorante completo con prenotazioni',
            type: 'website',
            instructions: [{ text: 'Crea homepage, menu e modulo prenotazione' }],
          },
          aiSettings: geminiByokSettings,
        }),
      });
      assert.equal(orchRes.status, 200);
      const orchData = (await orchRes.json()) as {
        html: string;
        provider: string;
        mode: string;
        files: ProjectFile[];
        sandboxReport: SandboxVerificationReport;
      };
      assert.equal(orchData.provider, 'gemini');
      assert.equal(orchData.mode, 'byok');
      assert.equal(orchData.sandboxReport.passed, true);
      assert.equal(orchData.files.length, 5);

      // 4. Error Handling without demo HTML fallback:
      // 4a. Deprecated model blocked immediately with 404 MODEL_OR_ENDPOINT_NOT_FOUND
      const deprecatedRes = await fetch(`${appBaseUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          project: {
            id: 'proj_gemini_dep',
            name: 'Test Modello Obsoleto',
            description: 'Test',
            type: 'website',
            instructions: [],
          },
          aiSettings: {
            ...geminiByokSettings,
            model: 'gemini-1.5-flash',
          },
        }),
      });
      assert.equal(deprecatedRes.status, 404);
      const deprecatedData = (await deprecatedRes.json()) as { errorCode?: string; html?: string };
      assert.equal(deprecatedData.errorCode, 'MODEL_OR_ENDPOINT_NOT_FOUND');
      assert.equal(deprecatedData.html, undefined);

      // 4b. Invalid API key returns 401 INVALID_API_KEY and no demo HTML
      geminiSimulatedMode = 'invalid_key';
      const invalidKeyRes = await fetch(`${appBaseUrl}/api/ai/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          project: {
            id: 'proj_gemini_err1',
            name: 'Test Invalid Key',
            description: 'Test',
            type: 'website',
            instructions: [],
          },
          aiSettings: geminiByokSettings,
        }),
      });
      assert.equal(invalidKeyRes.status, 401);
      const invalidKeyData = (await invalidKeyRes.json()) as { errorCode?: string; html?: string };
      assert.equal(invalidKeyData.errorCode, 'INVALID_API_KEY');
      assert.equal(invalidKeyData.html, undefined);

      // 4c. Unavailable model (404) returns 404 MODEL_OR_ENDPOINT_NOT_FOUND
      geminiSimulatedMode = 'not_found';
      const notFoundRes = await fetch(`${appBaseUrl}/api/ai/verify-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          aiSettings: { ...geminiByokSettings, model: 'gemini-non-existent' },
        }),
      });
      assert.equal(notFoundRes.status, 404);
      const notFoundData = (await notFoundRes.json()) as { ok: boolean; errorCode?: string };
      assert.equal(notFoundData.ok, false);
      assert.equal(notFoundData.errorCode, 'MODEL_OR_ENDPOINT_NOT_FOUND');

      // 4d. Quota exceeded (429) returns 429 PROVIDER_QUOTA_EXCEEDED
      geminiSimulatedMode = 'quota';
      const quotaRes = await fetch(`${appBaseUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          project: {
            id: 'proj_gemini_err2',
            name: 'Test Quota',
            description: 'Test',
            type: 'website',
            instructions: [],
          },
          aiSettings: geminiByokSettings,
        }),
      });
      assert.equal(quotaRes.status, 429);
      const quotaData = (await quotaRes.json()) as { errorCode?: string; html?: string };
      assert.equal(quotaData.errorCode, 'PROVIDER_QUOTA_EXCEEDED');
      assert.equal(quotaData.html, undefined);

      // 4e. Timeout (504 DEADLINE_EXCEEDED) returns 504 AI_PROVIDER_TIMEOUT
      geminiSimulatedMode = 'timeout';
      const timeoutRes = await fetch(`${appBaseUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          project: {
            id: 'proj_gemini_err3',
            name: 'Test Timeout',
            description: 'Test',
            type: 'website',
            instructions: [],
          },
          aiSettings: geminiByokSettings,
        }),
      });
      assert.equal(timeoutRes.status, 504);
      const timeoutData = (await timeoutRes.json()) as { errorCode?: string; html?: string };
      assert.equal(timeoutData.errorCode, 'AI_PROVIDER_TIMEOUT');
      assert.equal(timeoutData.html, undefined);

      // 5. Verify no silent fallback to server GEMINI_API_KEY when provider === 'gemini' and apiKey is empty (even for Admin)
      const adminLoginRes = await fetch(`${appBaseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: 'ValidStrongAdminPass!2026' }),
      });
      assert.equal(adminLoginRes.status, 200);
      const adminCookie = (adminLoginRes.headers.get('set-cookie') || '').split(';')[0];

      const prevEnvKey = process.env.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = 'server_managed_secret_key_should_not_be_used';
      try {
        const noFallbackRes = await fetch(`${appBaseUrl}/api/ai/verify-connection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
          body: JSON.stringify({
            aiSettings: {
              provider: 'gemini',
              apiKey: '',
              model: 'gemini-flash-latest',
              endpoint: geminiBaseUrl,
            },
          }),
        });
        assert.equal(noFallbackRes.status, 400);
        const noFallbackData = (await noFallbackRes.json()) as { ok: boolean; errorCode?: string };
        assert.equal(noFallbackData.ok, false);
        assert.equal(noFallbackData.errorCode, 'AI_KEY_NOT_CONFIGURED');
      } finally {
        if (prevEnvKey === undefined) {
          delete process.env.GEMINI_API_KEY;
        } else {
          process.env.GEMINI_API_KEY = prevEnvKey;
        }
      }

      // 6. Verify Google Gemini is visible and selectable in SettingsView.tsx, constants.ts, and AdminPanel.tsx
      const constantsSrc = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'lib', 'constants.ts'),
        'utf-8',
      );
      const settingsViewSrc = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'components', 'SettingsView.tsx'),
        'utf-8',
      );
      const adminPanelSrc = fs.readFileSync(
        path.resolve(__dirname, '..', 'src', 'components', 'AdminPanel.tsx'),
        'utf-8',
      );
      assert.ok(constantsSrc.includes("id: 'gemini'"), 'constants.ts deve includere il provider gemini');
      assert.ok(
        constantsSrc.includes('gemini-flash-latest') && constantsSrc.includes('gemini-3.8-flash'),
        'constants.ts deve esporre i modelli Gemini free-tier supportati',
      );
      assert.ok(
        settingsViewSrc.includes("settings.ai.provider === 'gemini'") &&
          settingsViewSrc.includes('AI_PROVIDERS'),
        'SettingsView.tsx deve rendere visibile e selezionabile Google Gemini',
      );
      assert.ok(
        adminPanelSrc.includes('providerId="gemini"') &&
          adminPanelSrc.includes('gemini-flash-latest'),
        'AdminPanel.tsx deve mostrare la card del provider Google Gemini con i modelli supportati',
      );

      // 7. Verify interactive counter and custom title starter UI (no static waiting placeholder)
      const counterHtml = buildInteractiveProjectStarterHtml(
        'Contatore Eventi Speciale',
        'Contatore live con titolo personalizzato',
      );
      assert.ok(
        counterHtml.includes('Contatore Eventi Speciale'),
        'Deve includere il titolo personalizzato specificato',
      );
      assert.ok(
        counterHtml.includes('id="btn-increment"') &&
          counterHtml.includes('id="btn-decrement"') &&
          counterHtml.includes('id="btn-reset"') &&
          counterHtml.includes('id="title-input"'),
        'Deve includere i pulsanti del contatore funzionante e il campo titolo personalizzato',
      );
      assert.ok(
        !counterHtml.includes('In attesa di generazione'),
        'Non deve utilizzare il modello predefinito di attesa',
      );
      assert.ok(
        !settingsViewSrc.includes('In attesa di generazione'),
        'EditorView non deve mostrare il modello statico di attesa',
      );
      const counterSandboxCheck = runIsolatedSandboxVerification(
        [
          {
            path: 'index.html',
            content: counterHtml,
            language: 'html',
            updatedAt: new Date().toISOString(),
          },
        ],
        counterHtml,
        1,
      );
      assert.equal(
        counterSandboxCheck.passed,
        true,
        'Lo script del contatore interattivo deve superare la validazione sintattica V8 nella sandbox',
      );

      // 8. Verify Counter component Activity Log tracking for every increment and decrement action
      const incMsg = formatCounterActivityMessage(
        'increment',
        0,
        1,
        1,
        'Contatore Eventi Speciale',
      );
      const decMsg = formatCounterActivityMessage(
        'decrement',
        1,
        0,
        1,
        'Contatore Eventi Speciale',
      );
      assert.equal(
        incMsg,
        '[CONTATORE] Incremento (+1) in "Contatore Eventi Speciale": stato aggiornato da 0 a 1',
      );
      assert.equal(
        decMsg,
        '[CONTATORE] Decremento (-1) in "Contatore Eventi Speciale": stato aggiornato da 1 a 0',
      );
      assert.ok(
        counterHtml.includes('AI_APP_BUILDER_COUNTER_ACTIVITY') &&
          counterHtml.includes("notifyActivityLog('increment'") &&
          counterHtml.includes("notifyActivityLog('decrement'"),
        'Il codice del contatore deve notificare ogni incremento e decremento per il registro attività',
      );

      // Persist both increment and decrement entries to the project's Activity Log API and verify state updates are tracked
      const incLogRes = await fetch(`${appBaseUrl}/api/user/activity-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          id: `log_inc_${Date.now()}`,
          projectId: 'proj_gemini_rest',
          projectName: 'Contatore Eventi Speciale',
          instructionText: incMsg,
          timestamp: new Date().toISOString(),
          status: 'recorded',
          type: 'INSTRUCTION',
          activityType: 'instruction',
        }),
      });
      assert.equal(incLogRes.status, 201);

      const decLogRes = await fetch(`${appBaseUrl}/api/user/activity-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          id: `log_dec_${Date.now()}`,
          projectId: 'proj_gemini_rest',
          projectName: 'Contatore Eventi Speciale',
          instructionText: decMsg,
          timestamp: new Date(Date.now() + 5).toISOString(),
          status: 'recorded',
          type: 'INSTRUCTION',
          activityType: 'instruction',
        }),
      });
      assert.equal(decLogRes.status, 201);

      const verifyLogsRes = await fetch(`${appBaseUrl}/api/user/activity-logs`, {
        method: 'GET',
        headers: { Cookie: cookie },
      });
      assert.equal(verifyLogsRes.status, 200);
      const verifyLogsData = (await verifyLogsRes.json()) as {
        logs: Array<ActivityLogEntry>;
      };
      const projectCounterLogs = verifyLogsData.logs.filter(
        (l) => l.projectId === 'proj_gemini_rest' && l.instructionText.startsWith('[CONTATORE]'),
      );
      assert.equal(
        projectCounterLogs.length,
        2,
        'Entrambe le azioni di incremento e decremento devono essere registrate nell’Activity Log del progetto',
      );
      assert.ok(
        projectCounterLogs.every((l) => Boolean(l.userId) && l.userId !== 'anonymous'),
        'Ogni variazione del contatore deve essere salvata come azione associata all’utente autenticato nel workspace',
      );

      // Verify state hydration from the authenticated user's activity log store
      const hydratedAfterDecrement = parseLatestCounterValueFromLogs(
        verifyLogsData.logs,
        'proj_gemini_rest',
        projectCounterLogs[0].userId,
      );
      assert.equal(
        hydratedAfterDecrement,
        0,
        'Lo stato del contatore deve ricostruire l’ultimo valore (0) dal registro attività autenticato',
      );

      // Verify unauthenticated requests to save counter activity are rejected (401)
      const unauthCounterRes = await fetch(`${appBaseUrl}/api/user/activity-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `log_unauth_${Date.now()}`,
          projectId: 'proj_gemini_rest',
          projectName: 'Contatore Eventi Speciale',
          instructionText: incMsg,
          timestamp: new Date().toISOString(),
          status: 'recorded',
          type: 'INSTRUCTION',
          activityType: 'instruction',
        }),
      });
      assert.equal(
        unauthCounterRes.status,
        401,
        'Le azioni contatore senza sessione autenticata devono essere rifiutate',
      );

      // 9. Verify ChatInterface SSE streaming integration, selective agent execution, and per-project chat history persistence
      geminiSimulatedMode = 'ok';
      const sseRes = await fetch(`${appBaseUrl}/api/ai/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Cookie: cookie,
        },
        body: JSON.stringify({
          stream: true,
          selectedAgents: ['planner', 'frontend', 'qa'],
          targetFiles: ['index.html', 'package.json'],
          maxHealingAttempts: 2,
          aiSettings: geminiByokSettings,
          project: {
            id: 'proj_gemini_rest',
            name: 'Trattoria Bella Vista',
            description: 'Sito ristorante con menu e prenotazioni',
            type: 'website',
            instructions: [
              {
                id: 'inst_chat_1',
                text: 'Aggiorna homepage e layout responsive con sezione contatti rapida',
                timestamp: new Date().toISOString(),
              },
            ],
          },
        }),
      });
      assert.equal(sseRes.status, 200);
      assert.ok(
        (sseRes.headers.get('content-type') || '').includes('text/event-stream'),
        'L’endpoint /api/ai/orchestrate con stream=true deve rispondere in formato text/event-stream',
      );
      const sseRawText = await sseRes.text();
      assert.ok(
        sseRawText.includes('event: agent_progress') && sseRawText.includes('event: result'),
        'Lo stream SSE deve emettere eventi agent_progress per gli agenti selezionati ed evento finale result',
      );

      // Verify per-project conversation history persistence
      const storeMap = new Map<string, string>();
      const prevWindow = (globalThis as unknown as { window?: unknown }).window;
      (globalThis as unknown as { window: unknown }).window = {
        localStorage: {
          getItem: (k: string) => storeMap.get(k) ?? null,
          setItem: (k: string, v: string) => {
            storeMap.set(k, v);
          },
          removeItem: (k: string) => {
            storeMap.delete(k);
          },
        },
      };
      try {
        const sampleThread: ProjectChatMessage[] = [
          {
            id: 'chat_u_1',
            projectId: 'proj_gemini_rest',
            role: 'user',
            content: 'Aggiorna homepage e layout responsive con sezione contatti rapida',
            timestamp: new Date().toISOString(),
            selectedAgents: ['planner', 'frontend', 'qa'],
            targetFiles: ['index.html', 'package.json'],
            status: 'completed',
          },
          {
            id: 'chat_a_1',
            projectId: 'proj_gemini_rest',
            role: 'assistant',
            content: 'Modifica multi-file completata.',
            timestamp: new Date().toISOString(),
            selectedAgents: ['planner', 'frontend', 'qa'],
            targetFiles: ['index.html', 'package.json'],
            status: 'completed',
            artifactsProduced: ['index.html', 'README.md'],
          },
        ];
        saveProjectChatHistory('proj_gemini_rest', sampleThread);
        const reloadedChat = loadProjectChatHistory('proj_gemini_rest');
        assert.equal(
          reloadedChat.length,
          2,
          'La cronologia della conversazione ChatInterface deve essere persistita per singolo progetto',
        );
        const otherProjectChat = loadProjectChatHistory('proj_altro_progetto');
        assert.equal(
          otherProjectChat.length,
          0,
          'La cronologia chat di un progetto non deve contaminare altri progetti',
        );
      } finally {
        (globalThis as unknown as { window?: unknown }).window = prevWindow;
      }
    } finally {
      await new Promise<void>((resolve) => mockGeminiServer.close(() => resolve()));
    }
  });
});
