import { useState, useEffect, useCallback, useRef } from 'react';
import type { Project, AppSettings, ActivityLogEntry, ActivityStatus } from '@/types';
import {
  loadProjects,
  saveProjects,
  loadSettings,
  saveSettings,
  loadActivityLogs,
  saveActivityLogs,
  sanitizeInstructionText,
  computeCodeVersionReference,
  resolveProjectSyncConflict,
  getScopedStorageKey,
  clearSessionAiCredentials,
  generateId,
  buildInteractiveProjectStarterHtml,
} from '@/lib/storage';
import { STORAGE_KEYS } from '@/lib/constants';
import { showToast } from '@/lib/toast';
import {
  auth,
  syncProjectToFirestore,
  updateProjectInFirestore,
  deleteProjectFromFirestore,
  syncActivityLogToFirestore,
  fetchCloudProjectsAndLogs,
} from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

function createInitialCounterProject(userId: string): Project {
  const now = new Date().toISOString();
  const title = 'Contatore Interattivo Personalizzato';
  const description =
    'Interfaccia con pulsante contatore funzionante (+1, -1, passo configurabile, azzeramento) e titolo personalizzabile in tempo reale.';
  const starterHtml = buildInteractiveProjectStarterHtml(title, description);
  const base: Project = {
    id: `proj-counter-${userId}`,
    userId,
    name: title,
    description,
    type: 'web-app',
    status: 'generated',
    instructions: [
      {
        id: `inst-init-${userId}`,
        text: 'Genera un\'interfaccia con un pulsante contatore funzionante e un titolo personalizzato, non usare il modello predefinito di attesa',
        timestamp: now,
        status: 'generated',
        projectId: `proj-counter-${userId}`,
        projectName: title,
        userId,
      },
    ],
    previewHtml: starterHtml,
    files: [
      {
        path: 'index.html',
        content: starterHtml,
        language: 'html',
        description: 'Interfaccia interattiva con pulsante contatore funzionante e titolo personalizzato',
        updatedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...base,
    codeVersion: computeCodeVersionReference(base),
  };
}

export function useProjectStore(
  activeUserId: string = 'admin-it',
  activeUserEmail?: string | null,
) {
  const [allProjects, setAllProjects] = useState<Project[]>(() => {
    const existing = loadProjects(activeUserId);
    if (existing.length > 0) return existing;
    return [createInitialCounterProject(activeUserId)];
  });
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [allActivityLogs, setAllActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState<boolean>(true);
  const [cloudSyncActive, setCloudSyncActive] = useState<boolean>(false);

  const lastSubmissionRef = useRef<{ projectId: string; text: string; time: number } | null>(null);
  const lastExportRef = useRef<{ projectId: string; version: string; time: number } | null>(null);

  useEffect(() => {
    const loadedProjects = loadProjects(activeUserId);
    setAllProjects(loadedProjects);

    const { logs: localLogs, error: localErr } = loadActivityLogs(activeUserId);
    if (localErr) {
      setActivityError(localErr);
    }

    // Reconcile any existing project instructions into the activity log without inventing entries
    const mergedMap = new Map<string, ActivityLogEntry>();
    for (const entry of localLogs) {
      if ((entry.userId || 'admin-it') === activeUserId) {
        mergedMap.set(entry.id, entry);
      }
    }
    for (const proj of loadedProjects) {
      const ownerId = proj.userId || 'admin-it';
      if (ownerId !== activeUserId) continue;
      for (const inst of proj.instructions) {
        if (!inst.text || !inst.text.trim()) continue;
        if (!mergedMap.has(inst.id)) {
          mergedMap.set(inst.id, {
            id: inst.id,
            projectId: proj.id,
            projectName: proj.name,
            userId: ownerId,
            instructionText: sanitizeInstructionText(inst.text.trim()),
            timestamp: inst.timestamp,
            status:
              inst.status ||
              (proj.status === 'generated'
                ? 'generated'
                : proj.status === 'generating'
                  ? 'generating'
                  : proj.status === 'error'
                    ? 'error'
                    : 'recorded'),
            activityType: 'instruction',
          });
        }
      }
    }

    const initialList = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    setAllActivityLogs(initialList);
    setActivityLoading(false);

    if (activeUserId === 'anonymous') {
      return;
    }

    // Synchronize projects with authenticated backend persistence layer using conflict resolution
    const projectsEndpoint =
      activeUserId === 'admin-it' ? '/api/admin/projects' : '/api/user/projects';
    fetch(projectsEndpoint, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!data || !Array.isArray(data.projects)) return;
        setCloudSyncActive(true);
        setAllProjects((prev) => {
          const map = new Map<string, Project>();
          for (const item of prev) {
            if ((item.userId || 'admin-it') === activeUserId) {
              map.set(item.id, item);
            }
          }
          for (const srvProj of data.projects as Project[]) {
            if (!srvProj || !srvProj.id || !srvProj.name) continue;
            const resolved = resolveProjectSyncConflict(
              map.get(srvProj.id),
              srvProj,
              activeUserId,
            );
            if (resolved) {
              map.set(srvProj.id, resolved);
            }
          }
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
          );
        });
      })
      .catch(() => {
        // Offline / local fallback already loaded cleanly
      });

    // Synchronize activity logs with authenticated backend persistence layer
    const endpoint =
      activeUserId === 'admin-it' ? '/api/admin/activity-logs' : '/api/user/activity-logs';
    fetch(endpoint, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!data || !Array.isArray(data.logs)) return;
        setCloudSyncActive(true);
        setAllActivityLogs((prev) => {
          const map = new Map<string, ActivityLogEntry>();
          for (const item of prev) {
            if ((item.userId || 'admin-it') === activeUserId) {
              map.set(item.id, item);
            }
          }
          for (const srvItem of data.logs as ActivityLogEntry[]) {
            if (
              srvItem &&
              srvItem.id &&
              srvItem.instructionText?.trim() &&
              (srvItem.userId || 'admin-it') === activeUserId
            ) {
              const existing = map.get(srvItem.id);
              if (!existing) {
                map.set(srvItem.id, srvItem);
              } else {
                const localTime = Date.parse(existing.timestamp || '');
                const remoteTime = Date.parse(srvItem.timestamp || '');
                if (!Number.isNaN(remoteTime) && (Number.isNaN(localTime) || remoteTime > localTime)) {
                  map.set(srvItem.id, srvItem);
                }
              }
            }
          }
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );
        });
      })
      .catch(() => {
        // Offline / local fallback already loaded cleanly
      });

    // Synchronize with Firebase Cloud Firestore ONLY when identity relationship is verified
    const unsubscribeAuth =
      typeof window !== 'undefined'
        ? onAuthStateChanged(auth, async (fbUser) => {
            if (!fbUser) return;
            const cloudData = await fetchCloudProjectsAndLogs(activeUserId, activeUserEmail);
            if (!cloudData) return;
            setCloudSyncActive(true);
            if (cloudData.projects.length > 0) {
              setAllProjects((prev) => {
                const map = new Map<string, Project>();
                for (const item of prev) {
                  if ((item.userId || 'admin-it') === activeUserId) {
                    map.set(item.id, item);
                  }
                }
                for (const cProj of cloudData.projects) {
                  // Never overwrite verified project owner; resolve conflicts by timestamp/version
                  const resolved = resolveProjectSyncConflict(
                    map.get(cProj.id),
                    cProj,
                    activeUserId,
                  );
                  if (resolved) {
                    map.set(cProj.id, resolved);
                  }
                }
                return Array.from(map.values()).sort(
                  (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                );
              });
            }
            if (cloudData.logs.length > 0) {
              setAllActivityLogs((prev) => {
                const map = new Map<string, ActivityLogEntry>();
                for (const item of prev) {
                  if ((item.userId || 'admin-it') === activeUserId) {
                    map.set(item.id, item);
                  }
                }
                for (const cLog of cloudData.logs) {
                  if ((cLog.userId || 'admin-it') !== activeUserId) continue;
                  const existing = map.get(cLog.id);
                  if (!existing) {
                    map.set(cLog.id, cLog);
                  } else {
                    const localTime = Date.parse(existing.timestamp || '');
                    const remoteTime = Date.parse(cLog.timestamp || '');
                    if (!Number.isNaN(remoteTime) && (Number.isNaN(localTime) || remoteTime > localTime)) {
                      map.set(cLog.id, cLog);
                    }
                  }
                }
                return Array.from(map.values()).sort(
                  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
                );
              });
            }
          })
        : () => {};

    // Listen for cross-tab storage updates so projects stay synchronized across browser tabs
    const scopedProjKey = getScopedStorageKey(STORAGE_KEYS.PROJECTS, activeUserId);
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === scopedProjKey ||
        e.key === STORAGE_KEYS.PROJECTS ||
        e.key === 'ai-app-builder:projects' ||
        e.key === 'ai-app-builder-projects'
      ) {
        setAllProjects(loadProjects(activeUserId));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubscribeAuth();
    };
  }, [activeUserId, activeUserEmail]);

  useEffect(() => {
    saveProjects(allProjects, activeUserId);
  }, [allProjects, activeUserId]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveActivityLogs(allActivityLogs, activeUserId);
  }, [allActivityLogs, activeUserId]);

  // Filter projects and activity logs strictly to the current activeUserId
  const projects = allProjects.filter((p) => (p.userId || 'admin-it') === activeUserId);
  const activityLogs = allActivityLogs.filter((l) => (l.userId || 'admin-it') === activeUserId);

  const createProject = useCallback(
    (data: { name: string; description: string; type: Project['type'] }): Project => {
      const now = new Date().toISOString();
      const starterHtml = buildInteractiveProjectStarterHtml(data.name, data.description);
      const baseProject: Project = {
        id: generateId(),
        userId: activeUserId,
        name: data.name,
        description: data.description,
        type: data.type,
        status: 'generated',
        instructions: [],
        previewHtml: starterHtml,
        files: [
          {
            path: 'index.html',
            content: starterHtml,
            language: 'html',
            description: 'Interfaccia interattiva con pulsante contatore funzionante e titolo personalizzato',
            updatedAt: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };
      const project: Project = {
        ...baseProject,
        codeVersion: computeCodeVersionReference(baseProject),
      };
      setAllProjects((prev) => [project, ...prev]);

      // Sync created project to server and Cloud Firestore (if identity verified)
      if (activeUserId !== 'anonymous') {
        const projectsEndpoint =
          activeUserId === 'admin-it' ? '/api/admin/projects' : '/api/user/projects';
        fetch(projectsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(project),
        }).catch(() => {});
        void syncProjectToFirestore(project, activeUserId, activeUserEmail).catch(() => {});
      }

      showToast('success', `Progetto "${data.name}" creato`);
      return project;
    },
    [activeUserId, activeUserEmail],
  );

  const updateProject = useCallback(
    (id: string, updates: Partial<Project>): void => {
      let updatedSnapshot: Project | null = null;
      setAllProjects((prev) =>
        prev.map((p) => {
          if (p.id !== id || (p.userId || 'admin-it') !== activeUserId) return p;
          const nextStatus = updates.status ?? p.status;
          const mappedActivityStatus: ActivityStatus | undefined =
            updates.status === 'generating'
              ? 'generating'
              : updates.status === 'generated'
                ? 'generated'
                : updates.status === 'error'
                  ? 'error'
                  : undefined;

          const updatedInstructions = mappedActivityStatus
            ? p.instructions.map((inst) => ({ ...inst, status: mappedActivityStatus }))
            : p.instructions;

          const updatedAt = new Date().toISOString();
          const candidate: Project = {
            ...p,
            ...updates,
            status: nextStatus,
            instructions: updatedInstructions,
            updatedAt,
          };

          const withVersion: Project = {
            ...candidate,
            codeVersion: computeCodeVersionReference(candidate),
          };
          updatedSnapshot = withVersion;
          return withVersion;
        }),
      );

      if (updatedSnapshot && activeUserId !== 'anonymous') {
        const projectsEndpoint =
          activeUserId === 'admin-it' ? '/api/admin/projects' : '/api/user/projects';
        fetch(projectsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatedSnapshot),
        }).catch(() => {});
        void updateProjectInFirestore(
          updatedSnapshot,
          updates,
          activeUserId,
          activeUserEmail,
        ).catch(() => {});
      }

      if (
        updates.status === 'generating' ||
        updates.status === 'generated' ||
        updates.status === 'error'
      ) {
        const nextActStatus: ActivityStatus = updates.status;
        setAllActivityLogs((prev) =>
          prev.map((entry) =>
            entry.projectId === id &&
            (entry.userId || 'admin-it') === activeUserId &&
            entry.type !== 'EXPORT' &&
            entry.type !== 'EXPORT_PROJECT' &&
            entry.activityType !== 'EXPORT' &&
            entry.activityType !== 'EXPORT_PROJECT' &&
            entry.activityType !== 'export' &&
            entry.status !== 'exported'
              ? { ...entry, status: nextActStatus }
              : entry,
          ),
        );

        if (activeUserId !== 'anonymous') {
          const endpoint =
            activeUserId === 'admin-it'
              ? `/api/admin/activity-logs/project/${encodeURIComponent(id)}`
              : `/api/user/activity-logs/project/${encodeURIComponent(id)}`;
          fetch(endpoint, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: nextActStatus }),
          }).catch(() => {
            // Ignore network errors on background sync
          });
        }
      }
    },
    [activeUserId, activeUserEmail],
  );

  const addInstruction = useCallback(
    (projectId: string, rawText: string): void => {
      const trimmed = rawText.trim();
      if (!trimmed) return;

      const sanitized = sanitizeInstructionText(trimmed);
      const nowMs = Date.now();

      // Prevent accidental duplicate manual instruction submissions within 300ms while always recording every Counter state update
      const isCounterActivity = sanitized.startsWith('[CONTATORE]');
      if (
        !isCounterActivity &&
        lastSubmissionRef.current &&
        lastSubmissionRef.current.projectId === projectId &&
        lastSubmissionRef.current.text === sanitized &&
        nowMs - lastSubmissionRef.current.time < 500
      ) {
        return;
      }
      lastSubmissionRef.current = { projectId, text: sanitized, time: nowMs };

      const recordId = generateId();
      const timestamp = new Date(nowMs).toISOString();
      let targetProjectName = 'Progetto';
      let nextCodeVersion: string | undefined;
      let updatedProjectSnapshot: Project | null = null;

      setAllProjects((prev) =>
        prev.map((p) => {
          if (p.id !== projectId || (p.userId || 'admin-it') !== activeUserId) return p;
          targetProjectName = p.name;
          const updatedProj: Project = {
            ...p,
            instructions: [
              ...p.instructions,
              {
                id: recordId,
                text: sanitized,
                timestamp,
                status: 'recorded',
                projectId: p.id,
                projectName: p.name,
                userId: activeUserId,
              },
            ],
            updatedAt: timestamp,
          };
          nextCodeVersion = computeCodeVersionReference(updatedProj);
          const withVersion: Project = {
            ...updatedProj,
            codeVersion: nextCodeVersion,
          };
          updatedProjectSnapshot = withVersion;
          return withVersion;
        }),
      );

      if (updatedProjectSnapshot && activeUserId !== 'anonymous') {
        const projectsEndpoint =
          activeUserId === 'admin-it' ? '/api/admin/projects' : '/api/user/projects';
        fetch(projectsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatedProjectSnapshot),
        }).catch(() => {});
        void updateProjectInFirestore(
          updatedProjectSnapshot,
          { instructions: (updatedProjectSnapshot as Project).instructions },
          activeUserId,
          activeUserEmail,
        ).catch(() => {});
      }

      const newEntry: ActivityLogEntry = {
        id: recordId,
        projectId,
        projectName: targetProjectName,
        userId: activeUserId,
        instructionText: sanitized,
        timestamp,
        status: 'recorded',
        type: 'INSTRUCTION',
        activityType: 'instruction',
        ...(nextCodeVersion ? { codeVersion: nextCodeVersion } : {}),
      };

      setAllActivityLogs((prev) => {
        if (prev.some((item) => item.id === recordId)) return prev;
        return [newEntry, ...prev];
      });
      setActivityError(null);

      if (activeUserId !== 'anonymous') {
        const endpoint =
          activeUserId === 'admin-it' ? '/api/admin/activity-logs' : '/api/user/activity-logs';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newEntry),
        }).catch(() => {
          // Stored in localStorage; server sync will reconcile when reachable
        });
        void syncActivityLogToFirestore(newEntry, activeUserId, activeUserEmail).catch(() => {});
      }
    },
    [activeUserId, activeUserEmail],
  );

  const deleteProject = useCallback(
    (id: string): void => {
      setAllProjects((prev) =>
        prev.filter((p) => !(p.id === id && (p.userId || 'admin-it') === activeUserId)),
      );
      setAllActivityLogs((prev) =>
        prev.filter(
          (entry) => !(entry.projectId === id && (entry.userId || 'admin-it') === activeUserId),
        ),
      );

      if (activeUserId !== 'anonymous') {
        const projectsEndpoint =
          activeUserId === 'admin-it'
            ? `/api/admin/projects/${encodeURIComponent(id)}`
            : `/api/user/projects/${encodeURIComponent(id)}`;
        fetch(projectsEndpoint, {
          method: 'DELETE',
          credentials: 'include',
        }).catch(() => {});
        void deleteProjectFromFirestore(id, activeUserId, activeUserEmail).catch(() => {});
      }

      showToast('info', 'Progetto eliminato');
    },
    [activeUserId, activeUserEmail],
  );

  const updateSettings = useCallback((updates: Partial<AppSettings>): void => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const updateAISettings = useCallback(
    (updates: Partial<AppSettings['ai']>): void => {
      setSettings((prev) => ({
        ...prev,
        ai: { ...prev.ai, ...updates },
      }));
    },
    [],
  );

  const updateGitHubSettings = useCallback(
    (updates: Partial<AppSettings['github']>): void => {
      // Never persist GitHub token in settings
      setSettings((prev) => ({
        ...prev,
        github: {
          ...prev.github,
          ...updates,
          token: '',
        },
      }));
    },
    [],
  );

  const updateThemeSettings = useCallback(
    (updates: Partial<NonNullable<AppSettings['theme']>>): void => {
      setSettings((prev) => ({
        ...prev,
        theme: {
          accentColor: prev.theme?.accentColor || 'blue',
          sidebarStyle: prev.theme?.sidebarStyle || 'navy',
          ...updates,
        },
      }));
    },
    [],
  );

  const clearSessionCredentials = useCallback((): void => {
    setSettings((prev) => clearSessionAiCredentials(prev));
  }, []);

  const exportLogEntry = useCallback(
    (projectOrId: Project | string, versionIdentifier: string): ActivityLogEntry | null => {
      const targetProjectId =
        typeof projectOrId === 'string' ? projectOrId.trim() : projectOrId?.id?.trim() ?? '';
      if (!targetProjectId) return null;

      const resolvedProject =
        typeof projectOrId === 'string'
          ? projects.find((p) => p.id === targetProjectId)
          : projectOrId;

      const projectName = resolvedProject?.name || 'Progetto';
      // Ensure the version identifier is strictly a clean reference and never contains code content
      const rawVersion =
        versionIdentifier?.trim() ||
        (resolvedProject ? computeCodeVersionReference(resolvedProject) : 'v1.0');
      const safeCodeVersion =
        rawVersion.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 64) || 'v1.0';

      const nowMs = Date.now();
      if (
        lastExportRef.current &&
        lastExportRef.current.projectId === targetProjectId &&
        lastExportRef.current.version === safeCodeVersion &&
        nowMs - lastExportRef.current.time < 1000
      ) {
        return null;
      }
      lastExportRef.current = {
        projectId: targetProjectId,
        version: safeCodeVersion,
        time: nowMs,
      };

      const exportLogId = generateId();
      const timestamp = new Date(nowMs).toISOString();
      const fileName = `${projectName.replace(/\s+/g, '-').toLowerCase()}.txt`;
      const stateLabel =
        resolvedProject?.status === 'generated' ? 'codice generato' : 'bozza corrente';
      const instructionCount = resolvedProject?.instructions?.length ?? 0;

      // Record only timestamp, project ID, and version identifier — never actual source code content
      const exportSummaryText = sanitizeInstructionText(
        `[EXPORT] Esportazione progetto eseguita (${fileName}) — ID progetto: ${targetProjectId} — Versione codice: ${safeCodeVersion} (${stateLabel}, ${instructionCount} istruzion${
          instructionCount === 1 ? 'e' : 'i'
        }). Nessun contenuto del codice sorgente salvato nel database.`,
      );

      const exportEntry: ActivityLogEntry = {
        id: exportLogId,
        projectId: targetProjectId,
        projectName,
        userId: activeUserId,
        instructionText: exportSummaryText,
        timestamp,
        status: 'exported',
        type: 'EXPORT',
        activityType: 'EXPORT',
        codeVersion: safeCodeVersion,
      };

      setAllActivityLogs((prev) => {
        if (prev.some((item) => item.id === exportLogId)) return prev;
        return [exportEntry, ...prev];
      });
      setActivityError(null);

      // Persist metadata-only record to the backend database and Cloud Firestore
      if (activeUserId !== 'anonymous') {
        const endpoint =
          activeUserId === 'admin-it' ? '/api/admin/activity-logs' : '/api/user/activity-logs';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(exportEntry),
        }).catch(() => {
          // Stored locally in localStorage; backend sync reconciles when reachable
        });
        void syncActivityLogToFirestore(exportEntry, activeUserId, activeUserEmail).catch(() => {});
      }

      return exportEntry;
    },
    [projects, activeUserId, activeUserEmail],
  );

  const logProjectExport = useCallback(
    (project: Project, explicitCodeVersion?: string): ActivityLogEntry | null => {
      const version =
        explicitCodeVersion || project.codeVersion || computeCodeVersionReference(project);
      return exportLogEntry(project, version);
    },
    [exportLogEntry],
  );

  const exportProjectCode = useCallback(
    (project: Project): void => {
      const codeVersion = project.codeVersion || computeCodeVersionReference(project);
      const code = generateProjectCode(project, codeVersion);
      const fileName = `${project.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
      const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save a single activity record of type 'EXPORT' with timestamp, projectId, and version identifier
      exportLogEntry(project, codeVersion);

      showToast(
        'success',
        `Progetto "${project.name}" esportato con successo (${fileName} · ${codeVersion})`,
      );
    },
    [exportLogEntry],
  );

  const logCounterChange = useCallback(
    (params: {
      projectId: string;
      action: 'increment' | 'decrement' | 'reset';
      previousValue: number;
      newValue: number;
      step: number;
      title?: string;
    }): ActivityLogEntry | null => {
      const targetProjectId = (params.projectId || '').trim();
      // Only record count changes as authenticated user actions in the workspace
      if (!targetProjectId || !activeUserId || activeUserId === 'anonymous') {
        return null;
      }

      const targetProj = allProjects.find(
        (p) => p.id === targetProjectId && (p.userId || 'admin-it') === activeUserId,
      );
      const effectiveTitle = (params.title || targetProj?.name || 'Contatore Interattivo Personalizzato').trim();
      const rawMessage =
        params.action === 'increment'
          ? `[CONTATORE] Incremento (+${params.step}) in "${effectiveTitle}": stato aggiornato da ${params.previousValue} a ${params.newValue}`
          : params.action === 'decrement'
            ? `[CONTATORE] Decremento (-${params.step}) in "${effectiveTitle}": stato aggiornato da ${params.previousValue} a ${params.newValue}`
            : `[CONTATORE] Azzeramento in "${effectiveTitle}": stato riportato da ${params.previousValue} a ${params.newValue}`;

      const sanitized = sanitizeInstructionText(rawMessage);
      const recordId = generateId();
      const timestamp = new Date().toISOString();
      const projectName = targetProj?.name || effectiveTitle || 'Progetto';
      let nextCodeVersion: string | undefined;
      let updatedProjectSnapshot: Project | null = null;

      setAllProjects((prev) =>
        prev.map((p) => {
          if (p.id !== targetProjectId || (p.userId || 'admin-it') !== activeUserId) return p;
          const updatedProj: Project = {
            ...p,
            instructions: [
              ...p.instructions,
              {
                id: recordId,
                text: sanitized,
                timestamp,
                status: 'recorded',
                projectId: p.id,
                projectName: p.name,
                userId: activeUserId,
              },
            ],
            updatedAt: timestamp,
          };
          nextCodeVersion = computeCodeVersionReference(updatedProj);
          const withVersion: Project = {
            ...updatedProj,
            codeVersion: nextCodeVersion,
          };
          updatedProjectSnapshot = withVersion;
          return withVersion;
        }),
      );

      if (updatedProjectSnapshot) {
        const projectsEndpoint =
          activeUserId === 'admin-it' ? '/api/admin/projects' : '/api/user/projects';
        fetch(projectsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updatedProjectSnapshot),
        }).catch(() => {});
        void updateProjectInFirestore(
          updatedProjectSnapshot,
          { instructions: (updatedProjectSnapshot as Project).instructions },
          activeUserId,
          activeUserEmail,
        ).catch(() => {});
      }

      const newEntry: ActivityLogEntry = {
        id: recordId,
        projectId: targetProjectId,
        projectName,
        userId: activeUserId,
        instructionText: sanitized,
        timestamp,
        status: 'recorded',
        type: 'INSTRUCTION',
        activityType: 'instruction',
        ...(nextCodeVersion ? { codeVersion: nextCodeVersion } : {}),
      };

      setAllActivityLogs((prev) => {
        if (prev.some((item) => item.id === recordId)) return prev;
        return [newEntry, ...prev];
      });
      setActivityError(null);

      const endpoint =
        activeUserId === 'admin-it' ? '/api/admin/activity-logs' : '/api/user/activity-logs';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newEntry),
      }).catch(() => {
        // Stored in localStorage; server sync will reconcile when reachable
      });
      void syncActivityLogToFirestore(newEntry, activeUserId, activeUserEmail).catch(() => {});

      return newEntry;
    },
    [allProjects, activeUserId, activeUserEmail],
  );

  return {
    projects,
    settings,
    activityLogs,
    activityError,
    activityLoading,
    cloudSyncActive,
    createProject,
    updateProject,
    addInstruction,
    logCounterChange,
    exportLogEntry,
    logProjectExport,
    deleteProject,
    updateSettings,
    updateAISettings,
    updateGitHubSettings,
    updateThemeSettings,
    clearSessionCredentials,
    exportProjectCode,
  };
}

export type ProjectStore = ReturnType<typeof useProjectStore>;

export function generateProjectCode(project: Project, codeVersion: string): string {
  const lines: string[] = [];
  lines.push(`# Progetto: ${project.name}`);
  lines.push(`# Versione codice: ${codeVersion}`);
  lines.push(`# Tipo: ${project.type}`);
  lines.push(`# Creato: ${project.createdAt}`);
  lines.push(`# Ultima modifica: ${project.updatedAt}`);
  lines.push('');
  lines.push('## Descrizione');
  lines.push(project.description);
  lines.push('');
  lines.push('## Istruzioni fornite');
  if (project.instructions.length === 0) {
    lines.push('(Nessuna istruzione fornita)');
  } else {
    project.instructions.forEach((inst, i) => {
      lines.push(`${i + 1}. [${inst.timestamp}] ${inst.text}`);
    });
  }

  if (project.dependencies && Object.keys(project.dependencies).length > 0) {
    lines.push('');
    lines.push('## Dipendenze (package.json)');
    lines.push(JSON.stringify(project.dependencies, null, 2));
  }

  if (project.databaseSchema && project.databaseSchema.length > 0) {
    lines.push('');
    lines.push('## Modello Dati (Database Schema)');
    lines.push(JSON.stringify(project.databaseSchema, null, 2));
  }

  if (project.apiRoutes && project.apiRoutes.length > 0) {
    lines.push('');
    lines.push('## Specifiche Route API');
    lines.push(JSON.stringify(project.apiRoutes, null, 2));
  }

  if (project.files && project.files.length > 0) {
    lines.push('');
    lines.push('## File del Progetto (Multi-File Bundle)');
    for (const f of project.files) {
      lines.push(`--- FILE: ${f.path} (${f.language}) ---`);
      lines.push(f.content);
      lines.push(`--- END FILE: ${f.path} ---`);
      lines.push('');
    }
  }

  lines.push('');
  lines.push('## Anteprima HTML');
  lines.push(project.previewHtml ?? '(Nessuna anteprima disponibile)');
  return lines.join('\n');
}
