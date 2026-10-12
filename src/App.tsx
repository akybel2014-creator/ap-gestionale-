import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ViewType, Project, AdminSection } from '@/types';
import { useProjectStore } from '@/lib/useProjectStore';
import {
  resolvePublicRoute,
  getPublicPath,
  DEFAULT_LOCALE,
  type PublicLocale,
  type PublicPageKey,
} from '@/lib/i18n';
import {
  buildPublicMetadata,
  buildAdminMetadata,
  applyMetadataToDocument,
} from '@/lib/seo';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import Dashboard from '@/components/Dashboard';
import EditorView from '@/components/EditorView';
import SettingsView from '@/components/SettingsView';
import ToastContainer from '@/components/ToastContainer';
import PublicPortal from '@/components/PublicPortal';
import MacelleriaStorefront from '@/components/MacelleriaStorefront';
import StreamVerseApp from '@/components/StreamVerseApp';
import RossiImpiantiApp from '@/components/RossiImpiantiApp';
import AdminAuthGate from '@/components/AdminAuthGate';
import AdminPanel from '@/components/AdminPanel';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import type { PublicAuthenticatedUser } from '@/components/PricingCheckoutFlow';
import { Lock, ArrowLeft, LogIn, UserPlus } from 'lucide-react';

export interface AppProps {
  initialPathname?: string;
  baseUrl?: string;
}

const ADMIN_SLUG_TO_SECTION: Record<string, AdminSection> = {
  '': 'overview',
  panoramica: 'overview',
  overview: 'overview',
  utenti: 'users',
  users: 'users',
  progetti: 'projects',
  projects: 'projects',
  provider: 'providers',
  providers: 'providers',
  crediti: 'credits',
  credits: 'credits',
  impostazioni: 'settings',
  settings: 'settings',
};

const SECTION_TO_ADMIN_PATH: Record<AdminSection, string> = {
  overview: '/admin',
  users: '/admin/utenti',
  projects: '/admin/progetti',
  providers: '/admin/provider',
  credits: '/admin/crediti',
  settings: '/admin/impostazioni',
};

function parseAdminSectionFromPath(pathname: string): AdminSection {
  const clean = pathname.replace(/\/+$/, '');
  if (!clean.startsWith('/admin')) return 'overview';
  const sub = clean.slice('/admin'.length).replace(/^\/+/, '').toLowerCase();
  return ADMIN_SLUG_TO_SECTION[sub] || 'overview';
}

export default function App(props: AppProps) {
  const { initialPathname, baseUrl } = props;
  const getCurrentPathname = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return initialPathname || '/';
  };

  const [pathname, setPathname] = useState<string>(getCurrentPathname);
  const [lastPublicLocale, setLastPublicLocale] = useState<PublicLocale>(() => {
    const resolved = resolvePublicRoute(getCurrentPathname());
    return resolved && !resolved.isAdmin && !resolved.isWorkspace
      ? resolved.locale
      : DEFAULT_LOCALE;
  });

  // SaaS Admin Panel section state
  const [adminSection, setAdminSection] = useState<AdminSection>(() =>
    parseAdminSectionFromPath(getCurrentPathname()),
  );

  // Separate Admin Preview vs Customer Workspace mode
  const [workspaceMode, setWorkspaceMode] = useState<'admin' | 'workspace'>(() => {
    const r = resolvePublicRoute(getCurrentPathname());
    return r?.isWorkspace ? 'workspace' : 'admin';
  });

  // Customer session state (from /api/auth/me)
  const [customerUser, setCustomerUser] = useState<PublicAuthenticatedUser | null>(null);
  const [customerAuthLoading, setCustomerAuthLoading] = useState<boolean>(true);
  // Track if an authenticated administrator explicitly entered workspace from /admin
  const [adminSessionActive, setAdminSessionActive] = useState<boolean>(false);

  // User Dashboard / Editor internal state
  const [view, setView] = useState<ViewType>('dashboard');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const resolvedRoute = useMemo(() => resolvePublicRoute(pathname), [pathname]);

  // Verify customer and admin sessions on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    async function checkSessions() {
      setCustomerAuthLoading(true);
      try {
        const [userRes, adminRes] = await Promise.all([
          fetch('/api/auth/me', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
          }).catch(() => null),
          fetch('/api/admin/session', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
          }).catch(() => null),
        ]);

        if (!cancelled && userRes && userRes.ok) {
          const data = (await userRes.json()) as {
            authenticated?: boolean;
            user?: PublicAuthenticatedUser | null;
          };
          setCustomerUser(data.authenticated && data.user ? data.user : null);
        }

        if (!cancelled && adminRes && adminRes.ok) {
          const adminData = (await adminRes.json()) as { authenticated?: boolean };
          setAdminSessionActive(Boolean(adminData.authenticated));
        }
      } finally {
        if (!cancelled) {
          setCustomerAuthLoading(false);
        }
      }
    }

    void checkSessions();
    return () => {
      cancelled = true;
    };
  }, []);

  // Determine the active user ID for strict project and activity isolation
  const activeStoreUserId = useMemo(() => {
    if (resolvedRoute?.isAdmin) {
      return 'admin-it';
    }
    if (customerUser?.id) {
      return customerUser.id;
    }
    if (adminSessionActive) {
      return 'admin-it';
    }
    return 'anonymous';
  }, [resolvedRoute, customerUser, adminSessionActive]);

  const activeStoreUserEmail = useMemo(() => {
    if (resolvedRoute?.isAdmin || adminSessionActive) {
      return null;
    }
    return customerUser?.email || null;
  }, [resolvedRoute, customerUser, adminSessionActive]);

  const store = useProjectStore(activeStoreUserId, activeStoreUserEmail);
  const { projects, settings, activityLogs, activityLoading, activityError } = store;

  const currentProject = useMemo(
    () => projects.find((p: Project) => p.id === currentProjectId) ?? null,
    [projects, currentProjectId],
  );

  const isEffectiveAdmin = Boolean(resolvedRoute?.isAdmin || adminSessionActive);
  const aiConfigured = Boolean(
    (isEffectiveAdmin && settings.ai.provider === 'managed') ||
      (settings.ai.provider && settings.ai.provider !== 'managed' && settings.ai.apiKey),
  );
  const githubConfigured = false;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const nextPath = window.location.pathname;
      setPathname(nextPath);
      const r = resolvePublicRoute(nextPath);
      if (r && !r.isAdmin && !r.isWorkspace) {
        setLastPublicLocale(r.locale);
      } else if (r && r.isWorkspace) {
        setWorkspaceMode('workspace');
      } else if (r && r.isAdmin) {
        setWorkspaceMode('admin');
        setAdminSection(parseAdminSectionFromPath(nextPath));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToPath = useCallback((targetUrl: string) => {
    const cleanPathname = targetUrl.split('?')[0];
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', targetUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setPathname(cleanPathname);
  }, []);

  // Global keyboard shortcuts inside the Customer Workspace & Admin areas (?, Alt+1, Alt+2, Alt+3)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!resolvedRoute || (!resolvedRoute.isAdmin && !resolvedRoute.isWorkspace)) return;

    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (!isInput && e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key === '1') {
          e.preventDefault();
          setWorkspaceMode('workspace');
          setView('dashboard');
          setCurrentProjectId(null);
          navigateToPath('/workspace');
        } else if (e.key === '2') {
          e.preventDefault();
          setWorkspaceMode('workspace');
          setView('editor');
          navigateToPath('/workspace');
        } else if (e.key === '3') {
          e.preventDefault();
          if (resolvedRoute.isAdmin || adminSessionActive) {
            setWorkspaceMode('admin');
            setAdminSection('settings');
            navigateToPath('/admin/impostazioni');
          } else {
            setWorkspaceMode('workspace');
            setView('settings');
            navigateToPath('/workspace');
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [resolvedRoute, adminSessionActive, navigateToPath]);

  // Synchronize document head metadata (Title, Description, Canonical, Hreflang, JSON-LD, lang)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const origin = baseUrl || window.location.origin;
    const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';

    if (cleanPath === '/' || cleanPath === '/rossi-impianti') {
      document.documentElement.lang = 'it';
      document.title =
        'Rossi Impianti — Gestione Impianti Idraulici ed Elettrici';
      return;
    }

    if (cleanPath === '/streamverse') {
      document.documentElement.lang = 'it';
      document.title =
        'StreamVerse — Cinema, Serie TV e Originali in Streaming 4K';
      return;
    }

    if (cleanPath === '/negozio' || cleanPath === '/macelleria') {
      document.documentElement.lang = 'it';
      document.title =
        'Macelleria Da Luca — Carni Selezionate, Tagli BBQ e Gastronomia a Vigardolo (VI)';
      return;
    }

    if (resolvedRoute && (resolvedRoute.isAdmin || resolvedRoute.isWorkspace)) {
      const viewTitle = resolvedRoute.isAdmin
        ? `Pannello Amministrativo (${adminSection})`
        : view === 'dashboard'
          ? 'Area Cliente — Workspace'
          : view === 'editor'
            ? currentProject?.name ?? 'Editor'
            : 'Impostazioni';
      applyMetadataToDocument(buildAdminMetadata(origin, viewTitle));
    } else if (resolvedRoute) {
      applyMetadataToDocument(
        buildPublicMetadata(origin, resolvedRoute.locale, resolvedRoute.page),
      );
    }
  }, [pathname, resolvedRoute, adminSection, view, currentProject, baseUrl]);

  const handleNavigatePublic = useCallback(
    (
      locale: PublicLocale,
      page: PublicPageKey,
      queryParams?: Record<string, string>,
    ) => {
      setLastPublicLocale(locale);
      const basePath = getPublicPath(locale, page);
      if (queryParams && Object.keys(queryParams).length > 0) {
        const search = new URLSearchParams(queryParams).toString();
        navigateToPath(`${basePath}?${search}`);
      } else {
        navigateToPath(basePath);
      }
    },
    [navigateToPath],
  );

  const handleOpenAdmin = useCallback(() => {
    setWorkspaceMode('admin');
    setAdminSection('overview');
    navigateToPath('/admin');
  }, [navigateToPath]);

  const handleSelectAdminSection = useCallback(
    (section: AdminSection) => {
      setWorkspaceMode('admin');
      setAdminSection(section);
      navigateToPath(SECTION_TO_ADMIN_PATH[section]);
    },
    [navigateToPath],
  );

  const handleOpenCustomerWorkspace = useCallback(() => {
    setWorkspaceMode('workspace');
    setView('dashboard');
    navigateToPath('/workspace');
  }, [navigateToPath]);

  const handleReturnToPublic = useCallback(() => {
    navigateToPath(getPublicPath(lastPublicLocale, 'pricing'));
  }, [lastPublicLocale, navigateToPath]);

  const handleCustomerLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // ignore network error
    }
    store.clearSessionCredentials();
    setCustomerUser(null);
    setCurrentProjectId(null);
    navigateToPath(getPublicPath(lastPublicLocale, 'pricing'));
  }, [lastPublicLocale, navigateToPath, store]);

  const handleNavigateWorkspaceView = (newView: ViewType) => {
    setWorkspaceMode('workspace');
    setView(newView);
    if (newView === 'dashboard') {
      setCurrentProjectId(null);
    }
  };

  const handleOpenProjectInEditor = (project: Project) => {
    setCurrentProjectId(project.id);
    setWorkspaceMode('workspace');
    setView('editor');
    navigateToPath('/workspace');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
    setCurrentProjectId(null);
  };

  // ============================================================================
  // AREA 1: MACELLERIA DA LUCA STOREFRONT (/) & LOCALIZED PORTAL (/it/*, /en/*, /de/*, /fr/*)
  // ============================================================================
  if (!resolvedRoute || (!resolvedRoute.isAdmin && !resolvedRoute.isWorkspace)) {
    const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
    if (cleanPath === '/' || cleanPath === '/rossi-impianti') {
      return (
        <>
          <RossiImpiantiApp />
          <ToastContainer />
        </>
      );
    }

    if (cleanPath === '/streamverse') {
      return (
        <>
          <StreamVerseApp />
          <ToastContainer />
        </>
      );
    }

    if (cleanPath === '/negozio' || cleanPath === '/macelleria') {
      return (
        <>
          <MacelleriaStorefront />
          <ToastContainer />
        </>
      );
    }

    const activeLocale = resolvedRoute?.locale ?? DEFAULT_LOCALE;
    const activePage = resolvedRoute?.page ?? 'pricing';
    return (
      <>
        <PublicPortal
          locale={activeLocale}
          page={activePage}
          publicUser={customerUser}
          authLoading={customerAuthLoading}
          onUserAuthenticated={(u) => setCustomerUser(u)}
          onUserLogout={handleCustomerLogout}
          onNavigatePublic={handleNavigatePublic}
          onOpenCustomerWorkspace={handleOpenCustomerWorkspace}
        />
        <ToastContainer />
      </>
    );
  }

  // ============================================================================
  // AREA 2: CUSTOMER WORKSPACE (/workspace — requires customer or admin auth)
  // ============================================================================
  if (resolvedRoute.isWorkspace) {
    if (customerAuthLoading) {
      return (
        <div
          className="min-h-screen bg-surface-950 text-surface-100 flex items-center justify-center p-4"
          lang="it"
        >
          <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center space-y-3 border border-surface-800/80">
            <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center mx-auto text-accent-400 animate-pulse">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-base font-semibold text-white">
              Verifica sessione Area Cliente…
            </h1>
            <p className="text-xs text-surface-400">
              Controllo delle credenziali e caricamento del tuo workspace personale.
            </p>
          </div>
        </div>
      );
    }

    // Unauthenticated visitors cannot access the internal workspace or Create Application modal
    if (!customerUser && !adminSessionActive) {
      return (
        <div
          className="min-h-screen bg-surface-950 text-surface-100 flex flex-col justify-between p-4"
          lang={lastPublicLocale}
        >
          <header className="max-w-5xl w-full mx-auto py-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReturnToPublic}
              className="inline-flex items-center gap-2 text-xs font-medium text-surface-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-accent-400" />
              <span>Torna ai piani e prezzi</span>
            </button>
          </header>

          <main className="flex-1 flex items-center justify-center py-8">
            <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-md w-full border border-surface-800/90 space-y-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center mx-auto text-accent-400">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <span className="inline-block text-[11px] font-mono uppercase tracking-wider text-accent-400 px-2.5 py-0.5 rounded-md bg-accent-500/10 border border-accent-500/20">
                  Area Cliente Riservata
                </span>
                <h1 className="text-xl font-bold text-white">
                  Accedi o scegli un piano per entrare nel tuo Workspace
                </h1>
                <p className="text-xs text-surface-300 leading-relaxed">
                  Il workspace applicativo è riservato ai clienti registrati. Seleziona il piano{' '}
                  <strong className="text-white">Free / BYOK</strong> o un piano superiore per creare
                  e gestire le tue applicazioni in modo isolato e sicuro.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleNavigatePublic(lastPublicLocale, 'login')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent-500 text-surface-950 hover:bg-accent-400 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Accedi</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleNavigatePublic(lastPublicLocale, 'register', {
                      plan: 'free-byok',
                      billing: 'monthly',
                    })
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-surface-800/80 text-white hover:bg-surface-800 border border-surface-700/70 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-accent-400" />
                  <span>Registrati gratis</span>
                </button>
              </div>
            </div>
          </main>

          <footer className="max-w-5xl w-full mx-auto py-4 text-center text-[11px] text-surface-500">
            AI App Builder — Isolamento progetti e autenticazione cliente verificata
          </footer>
        </div>
      );
    }

    const activePlanId = customerUser?.activeSubscription?.planId || 'free-byok';

    return (
      <div className="min-h-screen flex" lang="it">
        <Sidebar
          currentView={view}
          onNavigate={handleNavigateWorkspaceView}
          aiConfigured={aiConfigured}
          githubConfigured={githubConfigured}
          projectCount={projects.length}
          customerUser={
            customerUser
              ? {
                  name: customerUser.name,
                  email: customerUser.email,
                  planId: activePlanId,
                }
              : undefined
          }
          onOpenPublicSite={handleReturnToPublic}
          onOpenAdminPanel={adminSessionActive ? handleOpenAdmin : undefined}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onLogout={handleCustomerLogout}
        />

        <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
          <MobileHeader
            currentView={view}
            currentProject={currentProject}
            onNavigate={handleNavigateWorkspaceView}
            onOpenPublicSite={handleReturnToPublic}
          />

          <main className="flex-1 overflow-hidden">
            {view === 'dashboard' && (
              <Dashboard
                projects={projects}
                aiConfigured={aiConfigured}
                onCreateProject={store.createProject}
                onOpenProject={handleOpenProjectInEditor}
                onExportProject={store.exportProjectCode}
                onDeleteProject={(p) => store.deleteProject(p.id)}
                onGoToSettings={() => setView('settings')}
                onOpenShortcuts={() => setShortcutsOpen(true)}
              />
            )}

            {view === 'editor' && currentProject && (
              <EditorView
                project={currentProject}
                settings={settings}
                activityLogs={activityLogs}
                activityLoading={activityLoading}
                activityError={activityError}
                aiConfigured={aiConfigured}
                githubConfigured={githubConfigured}
                activeUserId={activeStoreUserId}
                onBack={handleBackToDashboard}
                onAddInstruction={store.addInstruction}
                onLogCounterChange={store.logCounterChange}
                onUpdateProject={store.updateProject}
                onExport={store.exportProjectCode}
                onExportLogEntry={store.exportLogEntry}
                onGoToSettings={() => setView('settings')}
                onOpenShortcuts={() => setShortcutsOpen(true)}
              />
            )}

            {view === 'editor' && !currentProject && (
              <div className="flex items-center justify-center h-full px-4">
                <div className="text-center max-w-sm">
                  <h2 className="text-lg font-semibold text-white mb-2">
                    Nessun progetto selezionato
                  </h2>
                  <p className="text-sm text-surface-400 mb-5">
                    Apri un progetto dalla dashboard per iniziare a modificarlo.
                  </p>
                  <button
                    onClick={handleBackToDashboard}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 transition-colors"
                  >
                    Torna alla dashboard
                  </button>
                </div>
              </div>
            )}

            {view === 'settings' && (
              <SettingsView
                settings={settings}
                isAdminContext={adminSessionActive}
                activeUserId={activeStoreUserId}
                activeUserEmail={activeStoreUserEmail}
                onUpdateAI={store.updateAISettings}
                onUpdateGitHub={store.updateGitHubSettings}
              />
            )}
          </main>
        </div>

        <KeyboardShortcutsModal
          open={shortcutsOpen}
          onClose={() => setShortcutsOpen(false)}
        />

        <ToastContainer />
      </div>
    );
  }

  // ============================================================================
  // AREA 3: ADMIN AREA (/admin/* — strictly restricted to authorized admins)
  // ============================================================================
  return (
    <AdminAuthGate onReturnToPublic={handleReturnToPublic}>
      {({ onLogout }) => (
        <>
          {workspaceMode === 'admin' ? (
            <AdminPanel
              activeSection={adminSection}
              onSelectSection={handleSelectAdminSection}
              projects={projects}
              settings={settings}
              onCreateProject={store.createProject}
              onOpenProjectInEditor={handleOpenProjectInEditor}
              onExportProject={store.exportProjectCode}
              onDeleteProject={(p) => store.deleteProject(p.id)}
              onUpdateAI={store.updateAISettings}
              onUpdateGitHub={store.updateGitHubSettings}
              onUpdateTheme={store.updateThemeSettings}
              onOpenPublicSite={handleReturnToPublic}
              onOpenUserWorkspace={() => {
                setAdminSessionActive(true);
                handleOpenCustomerWorkspace();
              }}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              onLogout={() => {
                store.clearSessionCredentials();
                setAdminSessionActive(false);
                onLogout();
              }}
            />
          ) : (
            <div className="min-h-screen flex" lang="it">
              <Sidebar
                currentView={view}
                onNavigate={handleNavigateWorkspaceView}
                aiConfigured={aiConfigured}
                githubConfigured={githubConfigured}
                projectCount={projects.length}
                onOpenPublicSite={handleReturnToPublic}
                onOpenAdminPanel={handleOpenAdmin}
                onOpenShortcuts={() => setShortcutsOpen(true)}
                onLogout={() => {
                  store.clearSessionCredentials();
                  setAdminSessionActive(false);
                  onLogout();
                }}
              />

              <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                <MobileHeader
                  currentView={view}
                  currentProject={currentProject}
                  onNavigate={handleNavigateWorkspaceView}
                  onOpenPublicSite={handleReturnToPublic}
                />

                <main className="flex-1 overflow-hidden">
                  {view === 'dashboard' && (
                    <Dashboard
                      projects={projects}
                      aiConfigured={aiConfigured}
                      onCreateProject={store.createProject}
                      onOpenProject={handleOpenProjectInEditor}
                      onExportProject={store.exportProjectCode}
                      onDeleteProject={(p) => store.deleteProject(p.id)}
                      onGoToSettings={() => setView('settings')}
                      onOpenShortcuts={() => setShortcutsOpen(true)}
                    />
                  )}

                  {view === 'editor' && currentProject && (
                    <EditorView
                      project={currentProject}
                      settings={settings}
                      activityLogs={activityLogs}
                      activityLoading={activityLoading}
                      activityError={activityError}
                      aiConfigured={aiConfigured}
                      githubConfigured={githubConfigured}
                      activeUserId={activeStoreUserId}
                      onBack={handleBackToDashboard}
                      onAddInstruction={store.addInstruction}
                      onLogCounterChange={store.logCounterChange}
                      onUpdateProject={store.updateProject}
                      onExport={store.exportProjectCode}
                      onExportLogEntry={store.exportLogEntry}
                      onGoToSettings={() => setView('settings')}
                      onOpenShortcuts={() => setShortcutsOpen(true)}
                    />
                  )}

                  {view === 'editor' && !currentProject && (
                    <div className="flex items-center justify-center h-full px-4">
                      <div className="text-center max-w-sm">
                        <h2 className="text-lg font-semibold text-white mb-2">
                          Nessun progetto selezionato
                        </h2>
                        <p className="text-sm text-surface-400 mb-5">
                          Apri un progetto dalla dashboard per iniziare a modificarlo.
                        </p>
                        <button
                          onClick={handleBackToDashboard}
                          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 transition-colors"
                        >
                          Torna alla dashboard
                        </button>
                      </div>
                    </div>
                  )}

                  {view === 'settings' && (
                    <SettingsView
                      settings={settings}
                      isAdminContext={true}
                      activeUserId="admin-it"
                      activeUserEmail={null}
                      onUpdateAI={store.updateAISettings}
                      onUpdateGitHub={store.updateGitHubSettings}
                    />
                  )}
                </main>
              </div>
            </div>
          )}

          <KeyboardShortcutsModal
            open={shortcutsOpen}
            onClose={() => setShortcutsOpen(false)}
          />

          <ToastContainer />
        </>
      )}
    </AdminAuthGate>
  );
}

