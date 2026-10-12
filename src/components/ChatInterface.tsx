import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Send,
  Cpu,
  FolderTree,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  FileCode2,
  Trash2,
  ShieldCheck,
  Database,
  Layout,
  Compass,
  Zap,
} from 'lucide-react';
import type {
  Project,
  AppSettings,
  ProjectFile,
  ProjectDatabaseEntity,
  ProjectApiRouteSpec,
  ProjectVersionSnapshot,
  AgentPipelineRun,
  SandboxVerificationReport,
  AgentRole,
  ProjectChatMessage,
  ProjectChatStageUpdate,
} from '@/types';
import type { AgentOrchestratorStreamEvent } from '@/lib/agentOrchestrator';
import {
  computeCodeVersionReference,
  loadProjectChatHistory,
  saveProjectChatHistory,
} from '@/lib/storage';
import { showToast } from '@/lib/toast';

export interface ChatInterfaceProps {
  project: Project;
  settings?: AppSettings;
  aiConfigured: boolean;
  onAddInstruction: (projectId: string, text: string) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onGoToSettings: () => void;
  onOrchestrationSuccess?: (result: {
    html: string;
    files: ProjectFile[];
    sandboxReport?: SandboxVerificationReport;
  }) => void;
}

const DEFAULT_MULTI_FILE_TARGETS = [
  'index.html',
  'src/api/routes.js',
  'schema/database.json',
  'package.json',
];

const AGENT_ROLE_OPTIONS: {
  role: AgentRole;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Compass;
}[] = [
  {
    role: 'planner',
    label: 'Planner Agent',
    shortLabel: 'Planner',
    description: 'Architettura, dipendenze, entità dati e specifiche API',
    icon: Compass,
  },
  {
    role: 'frontend',
    label: 'Frontend Agent',
    shortLabel: 'Frontend',
    description: 'Interfaccia utente HTML5 + CSS + JS responsiva e interattiva',
    icon: Layout,
  },
  {
    role: 'backend',
    label: 'Backend Agent',
    shortLabel: 'Backend',
    description: 'Route API Express/Node.js, schema database e package.json',
    icon: Database,
  },
  {
    role: 'qa',
    label: 'QA / Self-Healing',
    shortLabel: 'QA',
    description: 'Verifica sintattica V8 in sandbox isolata e auto-riparazione',
    icon: ShieldCheck,
  },
];

export default function ChatInterface({
  project,
  settings,
  aiConfigured,
  onAddInstruction,
  onUpdateProject,
  onGoToSettings,
  onOrchestrationSuccess,
}: ChatInterfaceProps) {
  const [promptText, setPromptText] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<AgentRole[]>([
    'planner',
    'frontend',
    'backend',
    'qa',
  ]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>(DEFAULT_MULTI_FILE_TARGETS);
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<ProjectChatMessage[]>(() =>
    loadProjectChatHistory(project.id, project.chatMessages),
  );
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Synchronize conversation thread when switching projects or when project.chatMessages updates
  useEffect(() => {
    const loaded = loadProjectChatHistory(project.id, project.chatMessages);
    setMessages(loaded);
  }, [project.id, project.chatMessages]);

  // Auto-scroll conversation thread on new messages or stage streaming updates
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const availableFileTargets = useMemo(() => {
    const paths = new Set<string>(DEFAULT_MULTI_FILE_TARGETS);
    if (Array.isArray(project.files)) {
      for (const f of project.files) {
        if (f?.path) paths.add(f.path);
      }
    }
    return Array.from(paths);
  }, [project.files]);

  const persistMessages = useCallback(
    (nextMessages: ProjectChatMessage[], extraProjectUpdates?: Partial<Project>) => {
      setMessages(nextMessages);
      saveProjectChatHistory(project.id, nextMessages);
      onUpdateProject(project.id, {
        chatMessages: nextMessages,
        ...(extraProjectUpdates || {}),
      });
    },
    [project.id, onUpdateProject],
  );

  const toggleAgentSelection = (role: AgentRole) => {
    if (streaming) return;
    setSelectedAgents((prev) => {
      if (prev.includes(role)) {
        if (prev.length === 1) {
          showToast('warning', 'Seleziona almeno un agente IA per eseguire le modifiche.');
          return prev;
        }
        return prev.filter((r) => r !== role);
      }
      return [...prev, role];
    });
  };

  const selectAllAgents = () => {
    if (streaming) return;
    setSelectedAgents(['planner', 'frontend', 'backend', 'qa']);
  };

  const toggleFileTarget = (filePath: string) => {
    if (streaming) return;
    setSelectedFiles((prev) => {
      if (prev.includes(filePath)) {
        if (prev.length === 1) {
          showToast('warning', 'Seleziona almeno un file target per la modifica multi-file.');
          return prev;
        }
        return prev.filter((p) => p !== filePath);
      }
      return [...prev, filePath];
    });
  };

  const handleClearChatHistory = () => {
    if (streaming) return;
    persistMessages([]);
    showToast('info', 'Cronologia conversazione del progetto azzerata.');
  };

  const handleSendMultiFileInstruction = useCallback(async () => {
    const trimmed = promptText.trim();
    if (!trimmed || streaming) return;

    if (!aiConfigured) {
      showToast(
        'warning',
        'Configura la tua chiave API (es. Google Gemini) nelle Impostazioni prima di avviare gli agenti.',
      );
      onGoToSettings();
      return;
    }

    const nowIso = new Date().toISOString();
    const userMsgId = `chat_user_${Date.now()}`;
    const assistantMsgId = `chat_ai_${Date.now() + 1}`;

    const activeRoles: AgentRole[] =
      selectedAgents.length > 0 ? selectedAgents : ['planner', 'frontend', 'backend', 'qa'];
    const activeTargetFiles: string[] =
      selectedFiles.length > 0 ? selectedFiles : DEFAULT_MULTI_FILE_TARGETS;

    // Record instruction in project's Activity Log store
    const multiFileInstructionSummary = `[CHAT MULTI-FILE · Agenti: ${activeRoles.map((r) => r.toUpperCase()).join(', ')} · Target: ${activeTargetFiles.join(', ')}] ${trimmed}`;
    onAddInstruction(project.id, multiFileInstructionSummary);

    const userMessage: ProjectChatMessage = {
      id: userMsgId,
      projectId: project.id,
      role: 'user',
      content: trimmed,
      timestamp: nowIso,
      selectedAgents: activeRoles,
      targetFiles: activeTargetFiles,
      status: 'completed',
    };

    const initialStageUpdates: ProjectChatStageUpdate[] = activeRoles.map((role) => ({
      role,
      status: 'pending',
      message: `In attesa di avvio ${role.toUpperCase()} Agent...`,
      timestamp: nowIso,
    }));

    const assistantMessage: ProjectChatMessage = {
      id: assistantMsgId,
      projectId: project.id,
      role: 'assistant',
      content: `Avvio pipeline multi-agente (${activeRoles.map((r) => r.toUpperCase()).join(' → ')}) sui file [${activeTargetFiles.join(', ')}]...`,
      timestamp: nowIso,
      selectedAgents: activeRoles,
      targetFiles: activeTargetFiles,
      status: 'streaming',
      stageUpdates: initialStageUpdates,
      artifactsProduced: [],
    };

    const baseThread = [...messages, userMessage, assistantMessage];
    setPromptText('');
    setStreaming(true);
    persistMessages(baseThread, { status: 'generating' });

    const updatedInstructions = [
      ...project.instructions,
      {
        id: `inst_${Date.now()}`,
        text: trimmed,
        timestamp: nowIso,
        status: 'generating' as const,
      },
    ];

    let currentThread = baseThread;

    const applyAssistantPatch = (
      patchFn: (msg: ProjectChatMessage) => ProjectChatMessage,
      extraUpdates?: Partial<Project>,
    ) => {
      currentThread = currentThread.map((m) => (m.id === assistantMsgId ? patchFn(m) : m));
      persistMessages(currentThread, extraUpdates);
    };

    try {
      const response = await fetch('/api/ai/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        credentials: 'include',
        body: JSON.stringify({
          stream: true,
          selectedAgents: activeRoles,
          targetFiles: activeTargetFiles,
          maxHealingAttempts: 2,
          aiSettings: settings?.ai,
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            type: project.type,
            instructions: updatedInstructions,
            files: project.files,
            previewHtml: project.previewHtml,
          },
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (!response.ok && !contentType.includes('text/event-stream')) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        const errorMessage =
          errData.error || `Errore durante la comunicazione con l'orchestratore (HTTP ${response.status}).`;
        applyAssistantPatch(
          (msg) => ({
            ...msg,
            status: 'error',
            content: errorMessage,
            error: errorMessage,
          }),
          { status: 'error' },
        );
        showToast('error', errorMessage);
        return;
      }

      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processSseEvent = (eventType: string, rawData: string) => {
          if (!rawData) return;
          try {
            const parsed = JSON.parse(rawData);

            if (eventType === 'agent_progress') {
              const evt = parsed as AgentOrchestratorStreamEvent;
              applyAssistantPatch((msg) => {
                const existingStages = Array.isArray(msg.stageUpdates) ? [...msg.stageUpdates] : [];
                if (evt.role) {
                  const idx = existingStages.findIndex((s) => s.role === evt.role);
                  const updatedStage: ProjectChatStageUpdate = {
                    role: evt.role,
                    status: evt.status || 'running',
                    message: evt.message,
                    artifactsProduced: evt.artifactsProduced,
                    timestamp: evt.timestamp || new Date().toISOString(),
                  };
                  if (idx >= 0) {
                    existingStages[idx] = updatedStage;
                  } else {
                    existingStages.push(updatedStage);
                  }
                }

                const mergedArtifacts = Array.from(
                  new Set([...(msg.artifactsProduced || []), ...(evt.artifactsProduced || [])]),
                );

                return {
                  ...msg,
                  content: evt.deltaText ? `${evt.message}\n${evt.deltaText}` : evt.message,
                  stageUpdates: existingStages,
                  artifactsProduced: mergedArtifacts,
                };
              });
            } else if (eventType === 'result') {
              const data = parsed as {
                html?: string;
                files?: ProjectFile[];
                dependencies?: Record<string, string>;
                databaseSchema?: ProjectDatabaseEntity[];
                apiRoutes?: ProjectApiRouteSpec[];
                agentRun?: AgentPipelineRun;
                sandboxReport?: SandboxVerificationReport;
              };

              if (data.html && data.files) {
                const doneIso = new Date().toISOString();
                const nextVersionId = computeCodeVersionReference({
                  ...project,
                  status: 'generated',
                  previewHtml: data.html,
                  files: data.files,
                  updatedAt: doneIso,
                });

                const newSnapshot: ProjectVersionSnapshot = {
                  versionId: nextVersionId,
                  createdAt: doneIso,
                  summary: `Chat Multi-Agente (${activeRoles.join(', ')}): ${trimmed.slice(0, 80)}`,
                  previewHtml: data.html,
                  files: data.files,
                  dependencies: data.dependencies,
                  databaseSchema: data.databaseSchema,
                  apiRoutes: data.apiRoutes,
                  sandboxPassed: data.sandboxReport?.passed,
                };
                const existingVersions = Array.isArray(project.versions) ? project.versions : [];

                applyAssistantPatch(
                  (msg) => ({
                    ...msg,
                    status: 'completed',
                    content: `Modifica multi-file completata (${data.files?.length || 1} file aggiornati · Versione ${nextVersionId}).`,
                    artifactsProduced: data.files?.map((f) => f.path) || msg.artifactsProduced,
                  }),
                  {
                    status: 'generated',
                    previewHtml: data.html,
                    files: data.files,
                    dependencies: data.dependencies,
                    databaseSchema: data.databaseSchema,
                    apiRoutes: data.apiRoutes,
                    lastAgentRun: data.agentRun,
                    versions: [newSnapshot, ...existingVersions].slice(0, 20),
                  },
                );

                showToast(
                  'success',
                  `Agenti completati: ${data.files.length} file aggiornati (${nextVersionId})!`,
                );
                onOrchestrationSuccess?.({
                  html: data.html,
                  files: data.files,
                  sandboxReport: data.sandboxReport,
                });
              }
            } else if (eventType === 'error') {
              const errPayload = parsed as { error?: string };
              const errMsg =
                errPayload.error || 'Errore durante l\'esecuzione della pipeline multi-agente.';
              applyAssistantPatch(
                (msg) => ({
                  ...msg,
                  status: 'error',
                  content: errMsg,
                  error: errMsg,
                }),
                { status: 'error' },
              );
              showToast('error', errMsg);
            }
          } catch {
            // Ignore malformed SSE chunk
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const lines = block.split('\n');
            let eventType = 'message';
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith('event:')) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim());
              }
            }
            processSseEvent(eventType, dataLines.join('\n'));
          }
        }
      } else {
        // Fallback standard JSON response handling
        const data = (await response.json()) as {
          html?: string;
          files?: ProjectFile[];
          dependencies?: Record<string, string>;
          databaseSchema?: ProjectDatabaseEntity[];
          apiRoutes?: ProjectApiRouteSpec[];
          agentRun?: AgentPipelineRun;
          sandboxReport?: SandboxVerificationReport;
          error?: string;
        };

        if (!response.ok || !data.html) {
          const errMsg = data.error || 'Errore durante l\'orchestrazione multi-agente.';
          applyAssistantPatch(
            (msg) => ({
              ...msg,
              status: 'error',
              content: errMsg,
              error: errMsg,
            }),
            { status: 'error' },
          );
          showToast('error', errMsg);
        } else {
          const doneIso = new Date().toISOString();
          const nextVersionId = computeCodeVersionReference({
            ...project,
            status: 'generated',
            previewHtml: data.html,
            files: data.files,
            updatedAt: doneIso,
          });
          const newSnapshot: ProjectVersionSnapshot = {
            versionId: nextVersionId,
            createdAt: doneIso,
            summary: `Chat Multi-Agente (${activeRoles.join(', ')}): ${trimmed.slice(0, 80)}`,
            previewHtml: data.html,
            files: data.files,
            dependencies: data.dependencies,
            databaseSchema: data.databaseSchema,
            apiRoutes: data.apiRoutes,
            sandboxPassed: data.sandboxReport?.passed,
          };
          const existingVersions = Array.isArray(project.versions) ? project.versions : [];

          applyAssistantPatch(
            (msg) => ({
              ...msg,
              status: 'completed',
              content: `Modifica multi-file completata (${data.files?.length || 1} file aggiornati · Versione ${nextVersionId}).`,
              artifactsProduced: data.files?.map((f) => f.path) || [],
            }),
            {
              status: 'generated',
              previewHtml: data.html,
              files: data.files,
              dependencies: data.dependencies,
              databaseSchema: data.databaseSchema,
              apiRoutes: data.apiRoutes,
              lastAgentRun: data.agentRun,
              versions: [newSnapshot, ...existingVersions].slice(0, 20),
            },
          );

          showToast('success', 'Modifica multi-file completata con successo!');
          onOrchestrationSuccess?.({
            html: data.html,
            files: data.files || [],
            sandboxReport: data.sandboxReport,
          });
        }
      }
    } catch {
      const netErr =
        'Errore di rete durante lo streaming con l\'orchestratore multi-agente.';
      applyAssistantPatch(
        (msg) => ({
          ...msg,
          status: 'error',
          content: netErr,
          error: netErr,
        }),
        { status: 'error' },
      );
      showToast('error', netErr);
    } finally {
      setStreaming(false);
    }
  }, [
    promptText,
    streaming,
    aiConfigured,
    selectedAgents,
    selectedFiles,
    project,
    messages,
    settings?.ai,
    onAddInstruction,
    onGoToSettings,
    onOrchestrationSuccess,
    persistMessages,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMultiFileInstruction();
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-surface-950/60 overflow-hidden"
      data-testid="chat-interface"
    >
      {/* Agent Role Selection Bar (Planner, Frontend, Backend, QA) */}
      <div className="px-3.5 py-2.5 border-b border-surface-800/70 bg-surface-900/50 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Seleziona Agenti IA ({selectedAgents.length}/4)</span>
          </span>
          <div className="flex items-center gap-2">
            {selectedAgents.length < 4 && (
              <button
                type="button"
                onClick={selectAllAgents}
                disabled={streaming}
                className="text-[11px] font-medium text-accent-400 hover:text-accent-300 transition-colors"
              >
                Tutti (Full-Stack)
              </button>
            )}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearChatHistory}
                disabled={streaming}
                className="inline-flex items-center gap-1 text-[11px] text-surface-400 hover:text-red-300 transition-colors"
                title="Cancella cronologia chat del progetto"
              >
                <Trash2 className="w-3 h-3" />
                <span>Pulisci chat</span>
              </button>
            )}
          </div>
        </div>

        <div
          className="grid grid-cols-2 gap-1.5"
          role="group"
          aria-label="Seleziona agenti IA per la modifica multi-file"
        >
          {AGENT_ROLE_OPTIONS.map((agent) => {
            const Icon = agent.icon;
            const isSelected = selectedAgents.includes(agent.role);
            return (
              <button
                key={agent.role}
                type="button"
                onClick={() => toggleAgentSelection(agent.role)}
                disabled={streaming}
                aria-pressed={isSelected}
                data-testid={`agent-select-${agent.role}`}
                title={agent.description}
                className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
                  isSelected
                    ? 'bg-accent-500/15 border-accent-500/40 text-white shadow-sm'
                    : 'bg-surface-900/70 border-surface-800/80 text-surface-400 hover:text-surface-200 hover:border-surface-700'
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-accent-400' : 'text-surface-500'
                    }`}
                  />
                  <span className="truncate">{agent.shortLabel}</span>
                </span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isSelected ? 'bg-emerald-400' : 'bg-surface-700'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Multi-file Target Selector */}
        <div className="pt-1 border-t border-surface-800/60">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-surface-400">
              <FolderTree className="w-3 h-3 text-accent-400" />
              <span>File Target Multi-File ({selectedFiles.length})</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {availableFileTargets.map((filePath) => {
              const active = selectedFiles.includes(filePath);
              return (
                <button
                  key={filePath}
                  type="button"
                  onClick={() => toggleFileTarget(filePath)}
                  disabled={streaming}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border transition-colors ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-surface-900/60 border-surface-800 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <FileCode2 className="w-3 h-3" />
                  <span>{filePath}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Streaming Conversation Thread */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin px-3.5 py-3 space-y-3"
        role="log"
        aria-live="polite"
        aria-label="Thread conversazione multi-agente"
      >
        {messages.length === 0 ? (
          <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800/80 text-center space-y-2 my-2">
            <div className="w-9 h-9 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center mx-auto">
              <Sparkles className="w-4 h-4 text-accent-400" />
            </div>
            <p className="text-xs font-semibold text-white">
              Thread Multi-Agente per &ldquo;{project.name}&rdquo;
            </p>
            <p className="text-[11px] text-surface-400 leading-relaxed">
              Seleziona gli agenti (Planner, Frontend, Backend, QA) e i file target qui sopra, poi
              invia un&apos;istruzione per avviare la modifica multi-file in streaming.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-3 border text-xs space-y-2 transition-all ${
                msg.role === 'user'
                  ? 'bg-accent-500/10 border-accent-500/30 text-white ml-4'
                  : msg.status === 'error'
                    ? 'bg-red-500/10 border-red-500/30 text-red-200 mr-2'
                    : 'bg-surface-900/80 border-surface-800 text-surface-200 mr-2'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[11px] flex items-center gap-1.5">
                  {msg.role === 'user' ? (
                    <span className="text-accent-300">Tu (Istruzione Multi-File)</span>
                  ) : (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Orchestratore Multi-Agente</span>
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-mono text-surface-400">
                  {new Date(msg.timestamp).toLocaleTimeString('it-IT', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {/* Selected Agents & Target Files Badges */}
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                {msg.selectedAgents.map((role) => (
                  <span
                    key={role}
                    className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-800/90 text-accent-300 border border-surface-700/70"
                  >
                    {role}
                  </span>
                ))}
                {msg.targetFiles.map((file) => (
                  <span
                    key={file}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-950/80 text-surface-400 border border-surface-800"
                  >
                    {file}
                  </span>
                ))}
              </div>

              {/* Streaming Stage Updates for Assistant Message */}
              {msg.role === 'assistant' &&
                Array.isArray(msg.stageUpdates) &&
                msg.stageUpdates.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-surface-800/80">
                    {msg.stageUpdates.map((st) => (
                      <div
                        key={st.role}
                        className="flex items-start justify-between gap-2 p-1.5 rounded-lg bg-surface-950/70 border border-surface-800/60"
                      >
                        <div className="flex items-start gap-1.5 min-w-0">
                          {st.status === 'completed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : st.status === 'running' ? (
                            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0 mt-0.5" />
                          ) : st.status === 'error' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-surface-600 shrink-0 mt-0.5 inline-block" />
                          )}
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono uppercase font-semibold text-white">
                              {st.role}
                            </span>
                            <p className="text-[11px] text-surface-300 leading-snug">
                              {st.message}
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface-900 text-surface-400 shrink-0">
                          {st.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              {msg.artifactsProduced && msg.artifactsProduced.length > 0 && (
                <div className="pt-1 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] text-emerald-300 font-medium">
                    Artefatti aggiornati:
                  </span>
                  {msg.artifactsProduced.map((art) => (
                    <span
                      key={art}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                    >
                      {art}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={threadEndRef} />
      </div>

      {/* Chat Composer Input */}
      <div className="p-3 border-t border-surface-800/70 bg-surface-900/40 space-y-2">
        <div className="relative">
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={streaming}
            placeholder="Istruisci gli agenti selezionati per modificare più file (es. aggiungi endpoint prenotazioni e aggiorna UI)..."
            rows={3}
            maxLength={1000}
            aria-label="Messaggio chat per gli agenti IA"
            className="w-full px-3 py-2 pr-11 rounded-xl bg-surface-800/70 border border-surface-700/70 text-white text-xs placeholder:text-surface-500 focus:outline-none focus:border-accent-500/50 transition-colors resize-none scrollbar-thin disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSendMultiFileInstruction}
            disabled={!promptText.trim() || streaming}
            aria-label="Invia istruzione multi-file agli agenti"
            data-testid="chat-send-button"
            className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-lg bg-accent-500 hover:bg-accent-400 text-surface-950 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <button
            type="button"
            disabled={streaming}
            onClick={() =>
              setPromptText(
                'Crea un sito web completo per un ristorante, con homepage, menu consultabile, orari, indirizzo, modulo di prenotazione e layout responsive. Organizza i file in modo chiaro e descrivi le API necessarie per gestire le prenotazioni.',
              )
            }
            className="font-medium text-accent-400 hover:text-accent-300 transition-colors"
          >
            + Prompt guidato Ristorante (Multi-File)
          </button>
          {!aiConfigured ? (
            <button
              type="button"
              onClick={onGoToSettings}
              className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 font-medium"
            >
              <Zap className="w-3 h-3" />
              <span>Configura chiave IA</span>
            </button>
          ) : (
            <span className="text-surface-500 font-mono text-[10px]">Ctrl+Invio per avviare</span>
          )}
        </div>
      </div>
    </div>
  );
}
