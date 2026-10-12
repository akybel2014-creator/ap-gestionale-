import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type {
  Project,
  ActivityLogEntry,
  ActivityLogFilter,
  AppSettings,
  ProjectFile,
  ProjectDatabaseEntity,
  ProjectApiRouteSpec,
  ProjectVersionSnapshot,
  AgentPipelineRun,
  SandboxVerificationReport,
  OutputPresentationMode,
} from '@/types';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import {
  computeCodeVersionReference,
  isExportActivityEntry,
  buildIsolatedPreviewSrcDoc,
  buildInteractiveProjectStarterHtml,
  formatCounterActivityMessage,
} from '@/lib/storage';
import { showToast } from '@/lib/toast';
import ActivityLog from '@/components/ActivityLog';
import Counter from '@/components/Counter';
import ChatInterface from '@/components/ChatInterface';
import {
  ArrowLeft,
  Send,
  Download,
  Github,
  Eye,
  Code2,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Zap,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Keyboard,
  Filter,
  X,
  FileText,
  Lock,
  Layers,
  Cpu,
  ShieldCheck,
  History,
  Database,
  FolderTree,
  Presentation,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';

interface EditorViewProps {
  project: Project;
  settings?: AppSettings;
  activityLogs?: ActivityLogEntry[];
  activityLoading?: boolean;
  activityError?: string | null;
  aiConfigured: boolean;
  githubConfigured: boolean;
  onBack: () => void;
  activeUserId?: string;
  onAddInstruction: (projectId: string, text: string) => void;
  onLogCounterChange?: (params: {
    projectId: string;
    action: 'increment' | 'decrement' | 'reset';
    previousValue: number;
    newValue: number;
    step: number;
    title?: string;
  }) => ActivityLogEntry | null;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onExport: (project: Project) => void;
  onExportLogEntry?: (
    projectOrId: Project | string,
    versionIdentifier: string,
  ) => ActivityLogEntry | null;
  onGoToSettings: () => void;
  onOpenShortcuts?: () => void;
}

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';
type RightPanelTab = 'preview' | 'code' | 'agents' | 'versions';

// No static waiting placeholder: projects render a functional interactive counter & custom title UI by default.

export default function EditorView({
  project,
  settings,
  activityLogs,
  activityLoading = false,
  activityError = null,
  aiConfigured,
  activeUserId = 'admin-it',
  onBack,
  onAddInstruction,
  onLogCounterChange,
  onUpdateProject,
  onExport,
  onGoToSettings,
  onOpenShortcuts,
}: EditorViewProps) {
  const [instruction, setInstruction] = useState('');
  const [leftPanelMode, setLeftPanelMode] = useState<'chat' | 'activity'>('chat');
  const [activityFilter, setActivityFilter] = useState<ActivityLogFilter>('ALL');
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [exportSuccessInfo, setExportSuccessInfo] = useState<{
    fileName: string;
    versionId: string;
    timestamp: string;
  } | null>(null);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [activeTab, setActiveTab] = useState<RightPanelTab>('preview');
  const [outputMode, setOutputMode] = useState<OutputPresentationMode>(
    project.preferredOutputMode || 'app',
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string>('index.html');
  const [generating, setGenerating] = useState(false);
  const [orchestrating, setOrchestrating] = useState(false);
  const [verifyingSandbox, setVerifyingSandbox] = useState(false);
  const [sandboxReport, setSandboxReport] = useState<SandboxVerificationReport | null>(
    project.lastAgentRun?.sandboxReport ?? null,
  );
  const [iframeKey, setIframeKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const exportSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (project.lastAgentRun?.sandboxReport) {
      setSandboxReport(project.lastAgentRun.sandboxReport);
    }
  }, [project.lastAgentRun]);

  useEffect(() => {
    return () => {
      if (exportSuccessTimerRef.current) {
        clearTimeout(exportSuccessTimerRef.current);
      }
    };
  }, []);

  // Listen for increment/decrement/reset actions emitted by the preview iframe Counter and record them in the project's Activity Log
  useEffect(() => {
    const handleCounterMessage = (event: MessageEvent) => {
      const payload = event.data as
        | {
            type?: string;
            action?: 'increment' | 'decrement' | 'reset';
            previousValue?: number;
            newValue?: number;
            step?: number;
            title?: string;
          }
        | undefined;

      if (!payload || payload.type !== 'AI_APP_BUILDER_COUNTER_ACTIVITY') return;
      if (
        payload.action !== 'increment' &&
        payload.action !== 'decrement' &&
        payload.action !== 'reset'
      ) {
        return;
      }

      const prevVal = typeof payload.previousValue === 'number' ? payload.previousValue : 0;
      const nextVal = typeof payload.newValue === 'number' ? payload.newValue : 0;
      const stepVal = typeof payload.step === 'number' && payload.step > 0 ? payload.step : 1;
      const customTitle =
        typeof payload.title === 'string' && payload.title.trim()
          ? payload.title.trim()
          : project.name;

      if (onLogCounterChange) {
        onLogCounterChange({
          projectId: project.id,
          action: payload.action,
          previousValue: prevVal,
          newValue: nextVal,
          step: stepVal,
          title: customTitle,
        });
      } else {
        const logText = formatCounterActivityMessage(
          payload.action,
          prevVal,
          nextVal,
          stepVal,
          customTitle,
        );
        onAddInstruction(project.id, logText);
      }
    };

    window.addEventListener('message', handleCounterMessage);
    return () => window.removeEventListener('message', handleCounterMessage);
  }, [project.id, project.name, onAddInstruction, onLogCounterChange]);

  const previewHtml = useMemo(
    () =>
      project.previewHtml && project.previewHtml.trim()
        ? project.previewHtml
        : buildInteractiveProjectStarterHtml(project.name, project.description),
    [project.previewHtml, project.name, project.description],
  );
  const isolatedPreviewSrcDoc = useMemo(
    () => buildIsolatedPreviewSrcDoc(previewHtml),
    [previewHtml],
  );
  const currentVersionId = project.codeVersion || computeCodeVersionReference(project);

  const projectFiles: ProjectFile[] = useMemo(() => {
    if (project.files && project.files.length > 0) {
      return project.files;
    }
    return [
      {
        path: 'index.html',
        content: previewHtml,
        language: 'html',
        description: 'Documento HTML5 principale',
        updatedAt: project.updatedAt,
      },
    ];
  }, [project.files, previewHtml, project.updatedAt]);

  const activeFile = useMemo(
    () => projectFiles.find((f) => f.path === selectedFilePath) || projectFiles[0],
    [projectFiles, selectedFilePath],
  );

  // Fallback to project.instructions if activityLogs prop not passed
  const effectiveEntries: ActivityLogEntry[] = useMemo(
    () =>
      activityLogs ??
      project.instructions.map((inst) => ({
        id: inst.id,
        projectId: project.id,
        projectName: project.name,
        userId: inst.userId || 'admin-it',
        instructionText: inst.text,
        timestamp: inst.timestamp,
        status:
          inst.status ||
          (project.status === 'generated'
            ? 'generated'
            : project.status === 'generating'
              ? 'generating'
              : project.status === 'error'
                ? 'error'
                : 'recorded'),
        type: 'INSTRUCTION',
        activityType: 'instruction',
      })),
    [activityLogs, project.instructions, project.id, project.name, project.status],
  );

  // Entries strictly authorized for the current project
  const projectAuthorizedEntries = useMemo(
    () =>
      effectiveEntries.filter(
        (e) =>
          e &&
          e.projectId === project.id &&
          typeof e.instructionText === 'string' &&
          e.instructionText.trim().length > 0,
      ),
    [effectiveEntries, project.id],
  );

  const filterCounts = useMemo(() => {
    let instructionCount = 0;
    let exportCount = 0;
    for (const entry of projectAuthorizedEntries) {
      if (isExportActivityEntry(entry)) {
        exportCount++;
      } else {
        instructionCount++;
      }
    }
    return {
      ALL: projectAuthorizedEntries.length,
      INSTRUCTION: instructionCount,
      EXPORT: exportCount,
    };
  }, [projectAuthorizedEntries]);

  const filteredEntries = useMemo(() => {
    if (activityFilter === 'ALL') return projectAuthorizedEntries;
    if (activityFilter === 'EXPORT') {
      return projectAuthorizedEntries.filter((entry) => isExportActivityEntry(entry));
    }
    return projectAuthorizedEntries.filter((entry) => !isExportActivityEntry(entry));
  }, [projectAuthorizedEntries, activityFilter]);

  const handleSendInstruction = () => {
    const text = instruction.trim();
    if (!text) return;
    onAddInstruction(project.id, text);
    setInstruction('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendInstruction();
    }
  };

  const handleGenerate = useCallback(async () => {
    if (generating || orchestrating) return;
    if (!aiConfigured) {
      onGoToSettings();
      return;
    }

    setGenerating(true);
    onUpdateProject(project.id, { status: 'generating' });

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            type: project.type,
            instructions: project.instructions,
          },
          aiSettings: settings?.ai,
        }),
      });

      const data = (await res.json()) as {
        html?: string;
        error?: string;
        mode?: string;
      };

      if (!res.ok || !data.html) {
        onUpdateProject(project.id, { status: 'error' });
        showToast('error', data.error || 'Errore durante la generazione IA.');
      } else {
        const nowIso = new Date().toISOString();
        const nextVersionId = computeCodeVersionReference({
          ...project,
          status: 'generated',
          previewHtml: data.html,
          updatedAt: nowIso,
        });
        const newSnapshot: ProjectVersionSnapshot = {
          versionId: nextVersionId,
          createdAt: nowIso,
          summary: `Generazione rapida HTML (${project.instructions.length} istruzion${project.instructions.length === 1 ? 'e' : 'i'})`,
          previewHtml: data.html,
          files: [
            {
              path: 'index.html',
              content: data.html,
              language: 'html',
              description: 'Documento HTML5 principale',
              updatedAt: nowIso,
            },
          ],
        };
        const existingVersions = Array.isArray(project.versions) ? project.versions : [];

        onUpdateProject(project.id, {
          status: 'generated',
          previewHtml: data.html,
          versions: [newSnapshot, ...existingVersions].slice(0, 20),
        });
        showToast(
          'success',
          data.mode === 'managed-admin'
            ? 'Applicazione generata tramite Proxy Backend IA (Amministratore)!'
            : 'Applicazione generata con successo!',
        );
        setIframeKey((k) => k + 1);
        setActiveTab('preview');
      }
    } catch {
      onUpdateProject(project.id, { status: 'error' });
      showToast(
        'error',
        'Errore di connessione durante la chiamata al generatore IA. Nessun codice generato.',
      );
    } finally {
      setGenerating(false);
    }
  }, [generating, orchestrating, aiConfigured, onGoToSettings, onUpdateProject, project, settings?.ai]);

  const handleMultiAgentOrchestrate = useCallback(async () => {
    if (generating || orchestrating) return;
    if (!aiConfigured) {
      onGoToSettings();
      return;
    }

    setOrchestrating(true);
    setActiveTab('agents');
    onUpdateProject(project.id, { status: 'generating' });

    try {
      const res = await fetch('/api/ai/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            type: project.type,
            instructions: project.instructions,
          },
          aiSettings: settings?.ai,
          maxHealingAttempts: 2,
        }),
      });

      const data = (await res.json()) as {
        html?: string;
        files?: ProjectFile[];
        dependencies?: Record<string, string>;
        databaseSchema?: ProjectDatabaseEntity[];
        apiRoutes?: ProjectApiRouteSpec[];
        agentRun?: AgentPipelineRun;
        sandboxReport?: SandboxVerificationReport;
        error?: string;
      };

      if (!res.ok || !data.html) {
        onUpdateProject(project.id, { status: 'error' });
        showToast('error', data.error || 'Errore durante l\'orchestrazione multi-agente.');
      } else {
        const nowIso = new Date().toISOString();
        const nextVersionId = computeCodeVersionReference({
          ...project,
          status: 'generated',
          previewHtml: data.html,
          files: data.files,
          updatedAt: nowIso,
        });
        const newSnapshot: ProjectVersionSnapshot = {
          versionId: nextVersionId,
          createdAt: nowIso,
          summary: `Pipeline Multi-Agente (Planner · Backend · Frontend · QA Sandbox)`,
          previewHtml: data.html,
          files: data.files,
          dependencies: data.dependencies,
          databaseSchema: data.databaseSchema,
          apiRoutes: data.apiRoutes,
          sandboxPassed: data.sandboxReport?.passed,
        };
        const existingVersions = Array.isArray(project.versions) ? project.versions : [];

        if (data.sandboxReport) {
          setSandboxReport(data.sandboxReport);
        }

        onUpdateProject(project.id, {
          status: 'generated',
          previewHtml: data.html,
          files: data.files,
          dependencies: data.dependencies,
          databaseSchema: data.databaseSchema,
          apiRoutes: data.apiRoutes,
          lastAgentRun: data.agentRun,
          versions: [newSnapshot, ...existingVersions].slice(0, 20),
        });

        showToast(
          'success',
          `Orchestratore Multi-Agente completato (${data.files?.length || 1} file generati e verificati in sandbox)!`,
        );
        setIframeKey((k) => k + 1);
        setActiveTab('preview');
      }
    } catch {
      onUpdateProject(project.id, { status: 'error' });
      showToast('error', 'Errore di rete durante l\'esecuzione dell\'orchestratore multi-agente.');
    } finally {
      setOrchestrating(false);
    }
  }, [generating, orchestrating, aiConfigured, onGoToSettings, onUpdateProject, project, settings?.ai]);

  const handleRunSandboxVerify = useCallback(async () => {
    if (verifyingSandbox) return;
    setVerifyingSandbox(true);
    try {
      const res = await fetch('/api/sandbox/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          files: projectFiles,
          previewHtml: project.previewHtml,
        }),
      });
      const data = (await res.json()) as { report?: SandboxVerificationReport; error?: string };
      if (res.ok && data.report) {
        setSandboxReport(data.report);
        showToast(
          data.report.passed ? 'success' : 'warning',
          data.report.passed
            ? 'Verifica Sandbox isolata superata senza errori!'
            : 'La Sandbox ha rilevato avvisi di sintassi o struttura.',
        );
      } else {
        showToast('error', data.error || 'Impossibile eseguire la verifica nella sandbox.');
      }
    } catch {
      showToast('error', 'Errore di comunicazione con la sandbox di verifica.');
    } finally {
      setVerifyingSandbox(false);
    }
  }, [verifyingSandbox, projectFiles, project.previewHtml]);

  const handleRestoreVersion = useCallback(
    (snapshot: ProjectVersionSnapshot) => {
      onUpdateProject(project.id, {
        status: snapshot.previewHtml ? 'generated' : 'draft',
        previewHtml: snapshot.previewHtml,
        ...(snapshot.files ? { files: snapshot.files } : {}),
        ...(snapshot.dependencies ? { dependencies: snapshot.dependencies } : {}),
        ...(snapshot.databaseSchema ? { databaseSchema: snapshot.databaseSchema } : {}),
        ...(snapshot.apiRoutes ? { apiRoutes: snapshot.apiRoutes } : {}),
      });
      setIframeKey((k) => k + 1);
      showToast('info', `Ripristinata versione ${snapshot.versionId}`);
    },
    [onUpdateProject, project.id],
  );

  const handleConfirmExport = useCallback(() => {
    const versionId = project.codeVersion || computeCodeVersionReference(project);
    const fileName = `${project.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
    setExportConfirmOpen(false);
    // onExport (exportProjectCode) downloads the file, creates the single EXPORT log entry, and shows the single toast notification
    onExport(project);
    setExportSuccessInfo({
      fileName,
      versionId,
      timestamp: new Date().toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    });
    if (exportSuccessTimerRef.current) {
      clearTimeout(exportSuccessTimerRef.current);
    }
    exportSuccessTimerRef.current = setTimeout(() => {
      setExportSuccessInfo(null);
    }, 6000);
  }, [project, onExport]);

  const handleRequestExport = useCallback(() => {
    setExportConfirmOpen(true);
  }, []);

  // Editor keyboard shortcuts (Alt+G, Alt+P, Alt+D, Alt+R, Alt+E, Escape)
  useEffect(() => {
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && exportConfirmOpen) {
        e.preventDefault();
        setExportConfirmOpen(false);
        return;
      }
      if (!e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'g') {
        e.preventDefault();
        handleGenerate();
      } else if (key === 'p') {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'preview' ? 'code' : 'preview'));
      } else if (key === 'd') {
        e.preventDefault();
        setDevice((prev) =>
          prev === 'desktop' ? 'tablet' : prev === 'tablet' ? 'mobile' : 'desktop',
        );
      } else if (key === 'r') {
        e.preventDefault();
        setIframeKey((k) => k + 1);
      } else if (key === 'e') {
        e.preventDefault();
        handleRequestExport();
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [handleGenerate, handleRequestExport, exportConfirmOpen]);

  const deviceWidths: Record<PreviewDevice, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  const deviceIcons: Record<PreviewDevice, typeof Monitor> = {
    desktop: Monitor,
    tablet: Tablet,
    mobile: Smartphone,
  };

  const filterOptions: { id: ActivityLogFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'Tutte le attività', count: filterCounts.ALL },
    { id: 'INSTRUCTION', label: 'INSTRUCTION', count: filterCounts.INSTRUCTION },
    { id: 'EXPORT', label: 'EXPORT', count: filterCounts.EXPORT },
  ];

  return (
    <div className="h-screen flex flex-col lg:flex-row pb-16 lg:pb-0 overflow-hidden">
      {/* Left panel — Project View, Activity Log & Instruction Input */}
      <div className="w-full lg:w-[420px] lg:flex-shrink-0 glass-strong border-r border-surface-800/60 flex flex-col h-[50vh] lg:h-full">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-surface-800/60 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-surface-800/60 hover:bg-surface-700/60 text-surface-400 hover:text-surface-200 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Torna alla dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{project.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-400 font-medium">
                {PROJECT_TYPE_LABELS[project.type]}
              </span>
              <StatusBadge status={project.status} />
              <span
                className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-800/60 text-surface-400 border border-surface-700/60"
                title="Versione corrente del codice progetto"
              >
                {currentVersionId}
              </span>
            </div>
          </div>
        </div>

        {/* Description & Interactive Counter Component (records every increment/decrement to Activity Log) */}
        <div className="px-4 py-3 border-b border-surface-800/60 space-y-3">
          <div>
            <p className="text-xs font-medium text-surface-500 mb-1 uppercase tracking-wide">
              Descrizione
            </p>
            <p className="text-sm text-surface-300 leading-relaxed">{project.description}</p>
          </div>
          <Counter
            projectId={project.id}
            activeUserId={activeUserId}
            activityLogs={activityLogs}
            initialTitle={project.name}
            onLogCounterChange={onLogCounterChange}
            onLogActivity={onAddInstruction}
            compact
          />
        </div>

        {/* Left Panel Mode Switcher: Chat Agenti Multi-File vs Cronologia Attività */}
        <div className="px-4 py-2 border-b border-surface-800/60 bg-surface-900/60">
          <div
            className="grid grid-cols-2 gap-1 bg-surface-950/80 p-1 rounded-xl border border-surface-800/80"
            role="tablist"
            aria-label="Modalità pannello sinistro"
          >
            <button
              type="button"
              role="tab"
              aria-selected={leftPanelMode === 'chat'}
              onClick={() => setLeftPanelMode('chat')}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                leftPanelMode === 'chat'
                  ? 'bg-surface-800 text-white shadow-sm border border-accent-500/40'
                  : 'text-surface-400 hover:text-surface-200 border border-transparent'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-accent-400" />
              <span>Chat Agenti ({project.chatMessages?.length || 0})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={leftPanelMode === 'activity'}
              onClick={() => setLeftPanelMode('activity')}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                leftPanelMode === 'activity'
                  ? 'bg-surface-800 text-white shadow-sm border border-accent-500/40'
                  : 'text-surface-400 hover:text-surface-200 border border-transparent'
              }`}
            >
              <History className="w-3.5 h-3.5 text-accent-400" />
              <span>Cronologia ({filterCounts.ALL})</span>
            </button>
          </div>
        </div>

        {leftPanelMode === 'chat' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ChatInterface
              project={project}
              settings={settings}
              aiConfigured={aiConfigured}
              onAddInstruction={onAddInstruction}
              onUpdateProject={onUpdateProject}
              onGoToSettings={onGoToSettings}
              onOrchestrationSuccess={({ sandboxReport: nextReport }) => {
                if (nextReport) {
                  setSandboxReport(nextReport);
                }
                setIframeKey((k) => k + 1);
                setActiveTab('preview');
              }}
            />
          </div>
        ) : (
          <>
            {/* Activity Log Filter Control (All activity / INSTRUCTION / EXPORT) */}
            <div className="px-4 py-2.5 border-b border-surface-800/60 bg-surface-900/40">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-surface-400">
                  <Filter className="w-3 h-3 text-accent-400" />
                  <span>Filtra cronologia</span>
                </span>
                {activityFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setActivityFilter('ALL')}
                    className="text-[11px] font-medium text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    Mostra tutte
                  </button>
                )}
              </div>
              <div
                role="group"
                aria-label="Filtra voci della cronologia attività"
                className="grid grid-cols-3 gap-1 bg-surface-950/70 p-1 rounded-xl border border-surface-800/80"
              >
                {filterOptions.map((opt) => {
                  const isSelected = activityFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setActivityFilter(opt.id)}
                      aria-pressed={isSelected}
                      className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-surface-800 text-white shadow-sm border border-accent-500/40'
                          : 'text-surface-400 hover:text-surface-200 hover:bg-surface-900/60 border border-transparent'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isSelected
                            ? 'bg-accent-500/20 text-accent-300'
                            : 'bg-surface-800/80 text-surface-500'
                        }`}
                      >
                        {opt.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cronologia attività (Activity Log — newest entries first, expandable) */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3">
              <ActivityLog
                projectId={project.id}
                projectName={project.name}
                entries={filteredEntries}
                activeFilter={activityFilter}
                totalProjectEntriesCount={projectAuthorizedEntries.length}
                onResetFilter={() => setActivityFilter('ALL')}
                loading={activityLoading}
                error={activityError}
              />
            </div>

            {/* Instruction input */}
            <div className="px-4 py-3 border-t border-surface-800/60">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scrivi un'istruzione per modificare il progetto..."
                  rows={3}
                  className="w-full px-3 py-2.5 pr-12 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-accent-500/50 transition-colors resize-none scrollbar-thin"
                  maxLength={1000}
                />
                <button
                  onClick={handleSendInstruction}
                  disabled={!instruction.trim()}
                  className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-lg bg-accent-500/20 hover:bg-accent-500/30 text-accent-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  aria-label="Invia istruzione"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                <p className="text-xs text-surface-600">
                  Premi Ctrl+Invio per inviare
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setInstruction(
                      'Crea un sito web completo per un ristorante, con homepage, menu consultabile, orari, indirizzo, modulo di prenotazione e layout responsive. Organizza i file in modo chiaro e descrivi le API necessarie per gestire le prenotazioni.',
                    )
                  }
                  className="text-[11px] font-medium text-accent-400 hover:text-accent-300 transition-colors"
                  title="Inserisci il prompt di collaudo guidato Ristorante"
                >
                  + Inserisci prompt guidato (Ristorante)
                </button>
              </div>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="px-4 py-3 border-t border-surface-800/60 space-y-2">
          {exportSuccessInfo && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start justify-between gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 animate-fade-in"
            >
              <div className="flex items-start gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-200 truncate">
                    Esportazione completata ({exportSuccessInfo.fileName})
                  </p>
                  <p className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
                    Versione {exportSuccessInfo.versionId} · {exportSuccessInfo.timestamp}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportSuccessInfo(null)}
                className="text-emerald-400/70 hover:text-emerald-200 transition-colors flex-shrink-0 p-0.5"
                aria-label="Chiudi conferma esportazione"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={handleMultiAgentOrchestrate}
              disabled={generating || orchestrating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 hover:from-accent-400 hover:to-accent-500 transition-all disabled:opacity-60 glow-accent"
            >
              {orchestrating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Pipeline Multi-Agente in esecuzione...
                </>
              ) : (
                <>
                  <Cpu className="w-4 h-4" />
                  {aiConfigured
                    ? 'Orchestratore Multi-Agente (Full-Stack + QA)'
                    : 'Configura IA per Orchestratore'}
                </>
              )}
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || orchestrating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-surface-800/80 border border-surface-700/60 text-surface-200 hover:text-white hover:border-accent-500/40 transition-all disabled:opacity-60"
            >
              {generating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-400" />
                  Generazione rapida HTML in corso...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                  <span>Generazione rapida HTML singolo (Alt+G)</span>
                </>
              )}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRequestExport}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                exportSuccessInfo
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                  : 'bg-surface-800/60 border-surface-700/40 text-surface-300 hover:text-white hover:border-surface-600'
              }`}
            >
              {exportSuccessInfo ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Esportato</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Esporta</span>
                </>
              )}
            </button>
            <button
              onClick={() => setGithubModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-surface-800/60 border border-surface-700/40 text-surface-300 hover:text-white hover:border-surface-600 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>GitHub (OAuth in attesa)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — Preview, Multi-File Code, Multi-Agent Pipeline & Version Snapshots */}
      <div className="flex-1 flex flex-col h-[50vh] lg:h-full overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-2.5 border-b border-surface-800/60 flex flex-wrap items-center justify-between gap-3 glass">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface-800/40 rounded-lg p-0.5 overflow-x-auto">
            <TabButton
              active={activeTab === 'preview'}
              onClick={() => setActiveTab('preview')}
              icon={Eye}
              label="Anteprima"
            />
            <TabButton
              active={activeTab === 'code'}
              onClick={() => setActiveTab('code')}
              icon={Code2}
              label={`File (${projectFiles.length})`}
            />
            <TabButton
              active={activeTab === 'agents'}
              onClick={() => setActiveTab('agents')}
              icon={Cpu}
              label="Agenti & Sandbox"
            />
            <TabButton
              active={activeTab === 'versions'}
              onClick={() => setActiveTab('versions')}
              icon={History}
              label={`Versioni (${project.versions?.length || 1})`}
            />
          </div>

          {/* Output Mode & Device selector (preview only) */}
          {activeTab === 'preview' && (
            <div className="flex items-center gap-2">
              <div
                className="hidden sm:flex items-center gap-1 bg-surface-800/40 rounded-lg p-0.5 border border-surface-700/40"
                role="group"
                aria-label="Modalità di output"
              >
                {(
                  [
                    { id: 'app', label: 'App Web', icon: Layers },
                    { id: 'site', label: 'Sito', icon: Monitor },
                    { id: 'slides', label: 'Presentazione', icon: Presentation },
                    { id: 'data', label: 'Vista Dati & API', icon: Database },
                  ] as const
                ).map((m) => {
                  const ModeIcon = m.icon;
                  const active = outputMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setOutputMode(m.id);
                        onUpdateProject(project.id, { preferredOutputMode: m.id });
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors ${
                        active
                          ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                          : 'text-surface-400 hover:text-surface-200'
                      }`}
                    >
                      <ModeIcon className="w-3 h-3" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1 bg-surface-800/40 rounded-lg p-0.5">
                {(Object.keys(deviceWidths) as PreviewDevice[]).map((d) => {
                  const Icon = deviceIcons[d];
                  return (
                    <button
                      key={d}
                      onClick={() => setDevice(d)}
                      className={`w-8 h-7 rounded-md flex items-center justify-center transition-colors ${
                        device === d
                          ? 'bg-surface-700 text-accent-300'
                          : 'text-surface-500 hover:text-surface-300'
                      }`}
                      aria-label={d}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Refresh & Keyboard Shortcuts */}
          <div className="flex items-center gap-1.5">
            {onOpenShortcuts && (
              <button
                onClick={onOpenShortcuts}
                className="w-8 h-8 rounded-lg bg-surface-800/40 text-surface-400 hover:text-accent-300 flex items-center justify-center transition-colors"
                aria-label="Scorciatoie da tastiera"
                title="Scorciatoie da tastiera (?)"
              >
                <Keyboard className="w-4 h-4" />
              </button>
            )}
            {activeTab === 'preview' && (
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                className="w-8 h-8 rounded-lg bg-surface-800/40 text-surface-400 hover:text-surface-200 flex items-center justify-center transition-colors"
                aria-label="Aggiorna anteprima"
                title="Aggiorna anteprima (Alt+R)"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden bg-surface-950 relative">
          {activeTab === 'preview' && outputMode !== 'data' && (
            <div className="h-full flex items-start justify-center overflow-y-auto scrollbar-thin p-0 lg:p-4">
              <div
                className={`bg-white transition-all duration-300 h-full lg:h-auto lg:min-h-full w-full lg:rounded-xl overflow-hidden shadow-2xl ${
                  outputMode === 'slides' ? 'aspect-video max-h-[80vh] my-auto ring-4 ring-surface-800' : ''
                }`}
                style={{
                  maxWidth: outputMode === 'slides' ? '1024px' : deviceWidths[device],
                  width: '100%',
                }}
              >
                <iframe
                  key={iframeKey}
                  srcDoc={isolatedPreviewSrcDoc}
                  title="Anteprima del progetto"
                  className="w-full h-full min-h-[50vh] border-0"
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          )}

          {activeTab === 'preview' && outputMode === 'data' && (
            <div className="h-full overflow-y-auto scrollbar-thin p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-surface-800 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Vista Strutturata: Modello Dati, Dipendenze e API Routes
                  </h3>
                  <p className="text-xs text-surface-400 mt-1">
                    Specifica tecnica progettata dal Planner e dal Backend Agent per{' '}
                    <span className="text-white font-medium">{project.name}</span>
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-accent-500/10 text-accent-300 border border-accent-500/20">
                  {currentVersionId}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-900/70 border border-surface-800 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>Entità Database ({project.databaseSchema?.length || 0})</span>
                  </h4>
                  {project.databaseSchema && project.databaseSchema.length > 0 ? (
                    <div className="space-y-3">
                      {project.databaseSchema.map((entity) => (
                        <div
                          key={entity.name}
                          className="p-3 rounded-lg bg-surface-950/80 border border-surface-800/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-mono font-semibold text-white">
                              {entity.name}
                            </span>
                            <span className="text-[11px] text-surface-400">
                              {entity.fields.length} campi
                            </span>
                          </div>
                          <p className="text-xs text-surface-400">{entity.description}</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {entity.fields.map((f) => (
                              <span
                                key={f.name}
                                className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-900 text-surface-300 border border-surface-800"
                              >
                                {f.name}: <span className="text-accent-300">{f.type}</span>
                                {f.required ? '*' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400">
                      Nessuno schema database generato. Avvia l&apos;Orchestratore Multi-Agente per
                      progettare automaticamente entità e API.
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-surface-900/70 border border-surface-800 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Endpoint API Backend ({project.apiRoutes?.length || 0})</span>
                  </h4>
                  {project.apiRoutes && project.apiRoutes.length > 0 ? (
                    <div className="space-y-2.5">
                      {project.apiRoutes.map((rt, idx) => (
                        <div
                          key={`${rt.method}-${rt.path}-${idx}`}
                          className="p-3 rounded-lg bg-surface-950/80 border border-surface-800/80 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              {rt.method} {rt.path}
                            </span>
                            <span className="text-[10px] font-mono text-surface-400">
                              {rt.authRequired ? 'Auth Richiesta' : 'Pubblico'}
                            </span>
                          </div>
                          <p className="text-xs text-surface-300">{rt.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400">
                      Nessuna specifica API presente per questo progetto.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="h-full flex flex-col md:flex-row overflow-hidden">
              {/* Multi-file sidebar */}
              <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-surface-800/80 bg-surface-900/50 p-3 overflow-y-auto space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-accent-400" />
                    <span>File Progetto</span>
                  </span>
                  <span className="text-[10px] font-mono text-surface-400">
                    {projectFiles.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {projectFiles.map((file) => {
                    const isSelected = activeFile?.path === file.path;
                    return (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => setSelectedFilePath(file.path)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-colors flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30'
                            : 'text-surface-300 hover:bg-surface-800/70 hover:text-white'
                        }`}
                      >
                        <span className="truncate">{file.path}</span>
                        <span className="text-[10px] text-surface-400 uppercase">
                          {file.language}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active file viewer / editor */}
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="px-4 py-2 border-b border-surface-800/60 bg-surface-900/30 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-accent-300 truncate">{activeFile?.path}</span>
                    {activeFile?.description && (
                      <span className="text-surface-400 hidden sm:inline truncate">
                        · {activeFile.description}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunSandboxVerify()}
                    disabled={verifyingSandbox}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition-colors shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verifica file in Sandbox</span>
                  </button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  <textarea
                    value={activeFile?.content ?? previewHtml}
                    onChange={(e) => {
                      const nextContent = e.target.value;
                      const nowIso = new Date().toISOString();
                      const updatedFiles = projectFiles.map((f) =>
                        f.path === (activeFile?.path || 'index.html')
                          ? { ...f, content: nextContent, updatedAt: nowIso }
                          : f,
                      );
                      const isMainHtml = (activeFile?.path || 'index.html') === 'index.html';
                      onUpdateProject(project.id, {
                        files: updatedFiles,
                        ...(isMainHtml ? { previewHtml: nextContent } : {}),
                      });
                    }}
                    spellCheck={false}
                    aria-label={`Editor codice per ${activeFile?.path || 'index.html'}`}
                    className="w-full flex-1 p-4 bg-surface-950 text-sm font-mono text-surface-200 leading-relaxed focus:outline-none resize-none scrollbar-thin"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="h-full overflow-y-auto scrollbar-thin p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-800 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-accent-400" />
                    <span>Orchestratore Multi-Agente &amp; Verifica Statica / Sintattica</span>
                  </h3>
                  <p className="text-xs text-surface-400 mt-1">
                    Pipeline a 4 ruoli: Planner Agent → Backend Agent → Frontend Agent → QA /
                    Self-Healing Agent (controllo sintattico <code className="font-mono">vm.Script</code> senza esecuzione sul server; anteprima isolata in iframe con origine opaca <code className="font-mono">sandbox=&quot;allow-scripts&quot;</code> e CSP restrittiva).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunSandboxVerify}
                  disabled={verifyingSandbox}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-white border border-surface-700 transition-colors disabled:opacity-50"
                >
                  {verifyingSandbox ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-400" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>Esegui Verifica Sandbox Ora</span>
                </button>
              </div>

              {/* 4-Stage Pipeline Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {(
                  [
                    {
                      role: 'planner',
                      title: '1. Planner Agent',
                      desc: 'Piano architetturale, file, dipendenze, schema DB e API',
                    },
                    {
                      role: 'backend',
                      title: '2. Backend Agent',
                      desc: 'Generazione route API server e manifesto database',
                    },
                    {
                      role: 'frontend',
                      title: '3. Frontend Agent',
                      desc: 'Generazione interfaccia utente responsiva e interattiva',
                    },
                    {
                      role: 'qa',
                      title: '4. QA / Self-Healing',
                      desc: 'Verifica statica/V8 in sandbox e auto-correzione errori',
                    },
                  ] as const
                ).map((item) => {
                  const stage = project.lastAgentRun?.stages.find((s) => s.role === item.role);
                  const status = orchestrating ? 'running' : stage?.status || 'pending';
                  return (
                    <div
                      key={item.role}
                      className="p-4 rounded-xl bg-surface-900/70 border border-surface-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{item.title}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                            status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : status === 'running'
                                ? 'bg-amber-500/15 text-amber-300'
                                : status === 'error'
                                  ? 'bg-red-500/15 text-red-300'
                                  : 'bg-surface-800 text-surface-400'
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400 leading-relaxed">
                        {stage?.summary || item.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Sandbox Verification Report */}
              {sandboxReport && (
                <div className="p-4 rounded-xl bg-surface-900/80 border border-surface-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck
                        className={`w-4 h-4 ${
                          sandboxReport.passed ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      />
                      <span className="text-sm font-semibold text-white">
                        Report Sandbox Isolata ({sandboxReport.isolatedMode})
                      </span>
                    </div>
                    <span className="text-xs font-mono text-surface-400">
                      Durata: {sandboxReport.durationMs}ms · Tentativo #{sandboxReport.attemptNumber}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {sandboxReport.checks.map((chk) => (
                      <div
                        key={chk.id}
                        className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-surface-950/80 border border-surface-800/80 text-xs"
                      >
                        <div className="flex items-start gap-2">
                          <CheckCircle2
                            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                              chk.passed ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          />
                          <div>
                            <span className="font-mono text-white font-medium">{chk.target}</span>
                            <p className="text-surface-300 mt-0.5">{chk.message}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-900 text-surface-400">
                          {chk.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="h-full overflow-y-auto scrollbar-thin p-6 space-y-4">
              <div className="border-b border-surface-800 pb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-accent-400" />
                  <span>Cronologia Versioni e Ripristino (Rollback)</span>
                </h3>
                <p className="text-xs text-surface-400 mt-1">
                  Ogni generazione salva uno snapshot immutabile del codice e dei file del progetto.
                </p>
              </div>

              {project.versions && project.versions.length > 0 ? (
                <div className="space-y-3">
                  {project.versions.map((ver) => {
                    const isCurrent = ver.versionId === currentVersionId;
                    return (
                      <div
                        key={`${ver.versionId}-${ver.createdAt}`}
                        className="p-4 rounded-xl bg-surface-900/70 border border-surface-800 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-accent-500/15 text-accent-300 border border-accent-500/30">
                              {ver.versionId}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                                Versione Attiva
                              </span>
                            )}
                            {ver.sandboxPassed && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-emerald-300">
                                Sandbox QA OK
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-surface-200">{ver.summary}</p>
                          <p className="text-[11px] text-surface-400 font-mono">
                            {new Date(ver.createdAt).toLocaleString('it-IT')} ·{' '}
                            {ver.files?.length || 1} file
                          </p>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRestoreVersion(ver)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-white border border-surface-700 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-accent-400" />
                            <span>Ripristina versione</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-surface-900/40 border border-surface-800/80 text-center space-y-2">
                  <p className="text-sm font-medium text-white">
                    Versione iniziale corrente: <code className="font-mono text-accent-300">{currentVersionId}</code>
                  </p>
                  <p className="text-xs text-surface-400">
                    Avvia una generazione IA o l&apos;Orchestratore Multi-Agente per creare snapshot
                    ripristinabili.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Non-blocking AI configuration bar when no BYOK key is active */}
          {!aiConfigured && activeTab === 'preview' && (
            <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none flex justify-center">
              <div className="pointer-events-auto max-w-xl w-full px-4 py-2.5 rounded-xl bg-surface-900/95 border border-surface-700/80 shadow-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-surface-300">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Interfaccia contatore attiva. Per rigenerare con l&apos;IA, inserisci la tua chiave Gemini nelle Impostazioni.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onGoToSettings}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 transition-colors shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Configura IA</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Project Confirmation Modal */}
      {exportConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setExportConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-confirm-title"
          aria-describedby="export-confirm-desc"
        >
          <div
            className="w-full max-w-md glass-strong border border-surface-700/70 rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5 text-accent-400" />
                </div>
                <div>
                  <h3 id="export-confirm-title" className="text-base font-semibold text-white">
                    Conferma esportazione progetto
                  </h3>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Verifica i dettagli prima di scaricare il file
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExportConfirmOpen(false)}
                className="w-8 h-8 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/60 flex items-center justify-center transition-colors"
                aria-label="Chiudi finestra di conferma"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p id="export-confirm-desc" className="text-sm text-surface-300 leading-relaxed">
              Vuoi procedere con l&apos;esportazione del progetto{' '}
              <span className="font-semibold text-white">&ldquo;{project.name}&rdquo;</span>? Verrà
              scaricato il file di testo e verrà registrata una voce di tipo{' '}
              <span className="font-mono text-xs text-cyan-300">EXPORT</span> nella cronologia
              attività con il solo riferimento alla versione del codice.
            </p>

            <div className="p-3.5 rounded-xl bg-surface-900/80 border border-surface-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-surface-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-surface-500" />
                  <span>File di destinazione:</span>
                </span>
                <span className="font-mono text-surface-200 truncate">
                  {project.name.replace(/\s+/g, '-').toLowerCase()}.txt
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-surface-400">Versione codice:</span>
                <span className="font-mono px-1.5 py-0.5 rounded bg-surface-800 text-accent-300 border border-surface-700/70">
                  {currentVersionId}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setExportConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-800/70 hover:bg-surface-700/70 text-surface-300 hover:text-white border border-surface-700/60 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleConfirmExport}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 hover:from-accent-400 hover:to-accent-500 transition-all glow-accent"
              >
                <Download className="w-4 h-4" />
                <span>Conferma ed esporta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct GitHub Repository Export Info Modal (Temporarily Disabled for Security) */}
      {githubModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setGithubModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="github-export-title"
        >
          <div
            className="w-full max-w-md glass-strong border border-surface-700/70 rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
                  <Github className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 id="github-export-title" className="text-base font-semibold text-white">
                    Esportazione diretta su GitHub
                  </h3>
                  <p className="text-xs text-amber-400 mt-0.5">
                    Temporaneamente disabilitata (In attesa di OAuth per utente)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGithubModalOpen(false)}
                className="w-8 h-8 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/60 flex items-center justify-center transition-colors"
                aria-label="Chiudi finestra GitHub"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-200 leading-relaxed">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Protezione credenziali GitHub attiva</span>
              </p>
              <p>
                Per evitare il salvataggio di Personal Access Token nel browser (<code className="font-mono">localStorage</code>) o l&apos;uso di token condivisi sul server, la pubblicazione automatica su repository GitHub è disabilitata finché non verrà configurato un flusso OAuth GitHub individuale lato server.
              </p>
              <p className="text-surface-300">
                Puoi esportare immediatamente il pacchetto completo del progetto (<code className="font-mono">{currentVersionId}</code>) usando il pulsante <strong>Esporta</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setGithubModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-surface-800/70 hover:bg-surface-700/70 text-surface-300 hover:text-white border border-surface-700/60 transition-colors"
              >
                Chiudi
              </button>
              <button
                type="button"
                onClick={() => {
                  setGithubModalOpen(false);
                  handleRequestExport();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 hover:from-accent-400 hover:to-accent-500 transition-all glow-accent"
              >
                <Download className="w-4 h-4" />
                <span>Scarica file progetto (.txt)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Project['status'] }) {
  const config: Record<Project['status'], { label: string; class: string; icon: typeof CheckCircle2 }> = {
    draft: { label: 'Bozza', class: 'text-surface-400 bg-surface-800/60', icon: CheckCircle2 },
    generating: { label: 'In generazione', class: 'text-amber-400 bg-amber-500/10', icon: Loader2 },
    generated: { label: 'Pronto', class: 'text-emerald-400 bg-emerald-500/10', icon: CheckCircle2 },
    error: { label: 'Errore', class: 'text-red-400 bg-red-500/10', icon: AlertCircle },
  };
  const cfg = config[status];
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${cfg.class}`}>
      <cfg.icon className={`w-3 h-3 ${status === 'generating' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Eye;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active ? 'bg-surface-700 text-white' : 'text-surface-500 hover:text-surface-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}
