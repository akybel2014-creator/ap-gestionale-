import { useState, useMemo, useEffect } from 'react';
import type {
  AdminSection,
  Project,
  AppSettings,
  AIProvider,
  ThemeAccent,
} from '@/types';
import { PROJECT_TYPE_LABELS, AI_PROVIDERS } from '@/lib/constants';
import Dashboard from '@/components/Dashboard';
import SettingsView from '@/components/SettingsView';
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Cpu,
  CreditCard,
  Settings,
  Search,
  Bell,
  ShieldCheck,
  Zap,
  Globe,
  LogOut,
  Keyboard,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sliders,
  Plus,
  Menu,
  X,
  Palette,
  Activity,
  FileCode2,
} from 'lucide-react';

interface AdminPanelProps {
  activeSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  projects: Project[];
  settings: AppSettings;
  onCreateProject: (data: { name: string; description: string; type: Project['type'] }) => Project;
  onOpenProjectInEditor: (project: Project) => void;
  onExportProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onUpdateAI: (updates: Partial<AppSettings['ai']>) => void;
  onUpdateGitHub: (updates: Partial<AppSettings['github']>) => void;
  onUpdateTheme: (updates: Partial<NonNullable<AppSettings['theme']>>) => void;
  onOpenPublicSite: () => void;
  onOpenUserWorkspace: () => void;
  onOpenShortcuts: () => void;
  onLogout: () => void;
}

const ACCENT_PALETTES: Record<
  ThemeAccent,
  {
    label: string;
    hex: string;
    bgPrimary: string;
    bgHover: string;
    textPrimary: string;
    bgLight: string;
    borderActive: string;
    ringFocus: string;
    sidebarActiveBg: string;
    sidebarActiveBorder: string;
  }
> = {
  blue: {
    label: 'Blu Elettrico (Predefinito)',
    hex: '#2563eb',
    bgPrimary: 'bg-blue-600',
    bgHover: 'hover:bg-blue-700',
    textPrimary: 'text-blue-600',
    bgLight: 'bg-blue-50',
    borderActive: 'border-blue-600',
    ringFocus: 'focus:ring-blue-500/20 focus:border-blue-600',
    sidebarActiveBg: 'bg-blue-600 text-white shadow-sm',
    sidebarActiveBorder: 'border-blue-500',
  },
  indigo: {
    label: 'Indaco Istituzionale',
    hex: '#4f46e5',
    bgPrimary: 'bg-indigo-600',
    bgHover: 'hover:bg-indigo-700',
    textPrimary: 'text-indigo-600',
    bgLight: 'bg-indigo-50',
    borderActive: 'border-indigo-600',
    ringFocus: 'focus:ring-indigo-500/20 focus:border-indigo-600',
    sidebarActiveBg: 'bg-indigo-600 text-white shadow-sm',
    sidebarActiveBorder: 'border-indigo-500',
  },
  violet: {
    label: 'Viola Secondario',
    hex: '#7c3aed',
    bgPrimary: 'bg-violet-600',
    bgHover: 'hover:bg-violet-700',
    textPrimary: 'text-violet-600',
    bgLight: 'bg-violet-50',
    borderActive: 'border-violet-600',
    ringFocus: 'focus:ring-violet-500/20 focus:border-violet-600',
    sidebarActiveBg: 'bg-violet-600 text-white shadow-sm',
    sidebarActiveBorder: 'border-violet-500',
  },
  emerald: {
    label: 'Verde Smeraldo',
    hex: '#059669',
    bgPrimary: 'bg-emerald-600',
    bgHover: 'hover:bg-emerald-700',
    textPrimary: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    borderActive: 'border-emerald-600',
    ringFocus: 'focus:ring-emerald-500/20 focus:border-emerald-600',
    sidebarActiveBg: 'bg-emerald-600 text-white shadow-sm',
    sidebarActiveBorder: 'border-emerald-500',
  },
};

const SECTION_TITLES: Record<AdminSection, { title: string; subtitle: string }> = {
  overview: {
    title: 'Panoramica',
    subtitle: 'Stato reale della piattaforma, progetti locali e integrazioni configurate',
  },
  users: {
    title: 'Utenti',
    subtitle: 'Gestione sessioni e stato del servizio di autenticazione utenti',
  },
  projects: {
    title: 'Progetti',
    subtitle: 'Elenco dei progetti salvati nel browser e accesso rapido all\'editor',
  },
  providers: {
    title: 'Provider AI',
    subtitle: 'Stato di configurazione per Google Gemini, OpenAI e Anthropic Claude',
  },
  credits: {
    title: 'Crediti e piani',
    subtitle: 'Stato del sistema di contabilizzazione crediti, piani e consumi API',
  },
  settings: {
    title: 'Impostazioni',
    subtitle: 'Aspetto del pannello, configurazione modelli IA e credenziali GitHub',
  },
};

export default function AdminPanel({
  activeSection,
  onSelectSection,
  projects,
  settings,
  onCreateProject,
  onOpenProjectInEditor,
  onExportProject,
  onDeleteProject,
  onUpdateAI,
  onUpdateGitHub,
  onUpdateTheme,
  onOpenPublicSite,
  onOpenUserWorkspace,
  onOpenShortcuts,
  onLogout,
}: AdminPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      createdAt: string;
      activeSubscription?: { planId: string; status: string } | null;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/users', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { users?: typeof registeredUsers } | null) => {
        if (!cancelled && data && Array.isArray(data.users)) {
          setRegisteredUsers(data.users);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const accentKey: ThemeAccent = settings.theme?.accentColor || 'blue';
  const sidebarStyle = settings.theme?.sidebarStyle || 'navy';
  const palette = ACCENT_PALETTES[accentKey] || ACCENT_PALETTES.blue;

  const aiConfigured = Boolean(
    settings.ai.provider === 'managed' || (settings.ai.provider && settings.ai.apiKey),
  );

  const navItems: {
    id: AdminSection;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }[] = [
    { id: 'overview', label: 'Panoramica', icon: LayoutDashboard },
    { id: 'users', label: 'Utenti', icon: Users },
    {
      id: 'projects',
      label: 'Progetti',
      icon: FolderKanban,
      count: projects.length > 0 ? projects.length : undefined,
    },
    { id: 'providers', label: 'Provider AI', icon: Cpu },
    { id: 'credits', label: 'Crediti e piani', icon: CreditCard },
    { id: 'settings', label: 'Impostazioni', icon: Settings },
  ];

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        PROJECT_TYPE_LABELS[p.type].toLowerCase().includes(q),
    );
  }, [projects, searchQuery]);

  // Build real recent activities from existing projects & instructions in localStorage
  const recentActivities = useMemo(() => {
    const items: {
      id: string;
      user: string;
      action: string;
      projectName: string;
      timestamp: string;
      status: Project['status'];
    }[] = [];

    for (const proj of projects) {
      items.push({
        id: `proj-${proj.id}`,
        user: 'Amministratore (Locale)',
        action: `Progetto creato: ${proj.name} (${PROJECT_TYPE_LABELS[proj.type]})`,
        projectName: proj.name,
        timestamp: proj.createdAt,
        status: proj.status,
      });

      for (const inst of proj.instructions) {
        items.push({
          id: `inst-${inst.id}`,
          user: 'Amministratore (Locale)',
          action: `Istruzione in "${proj.name}": ${inst.text}`,
          projectName: proj.name,
          timestamp: inst.timestamp,
          status: proj.status,
        });
      }
    }

    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (i) =>
            i.action.toLowerCase().includes(q) ||
            i.projectName.toLowerCase().includes(q),
        )
      : items;

    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [projects, searchQuery]);

  // Activity distribution by project category (only rendered when projects.length > 0)
  const categoryBreakdown = useMemo(() => {
    if (projects.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const p of projects) {
      counts[p.type] = (counts[p.type] || 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({
      type: type as Project['type'],
      label: PROJECT_TYPE_LABELS[type as Project['type']],
      count,
      percentage: Math.round((count / projects.length) * 100),
    }));
  }, [projects]);

  const sidebarBgClass =
    sidebarStyle === 'navy' ? 'bg-[#0B192C] border-[#1E293B]' : 'bg-slate-900 border-slate-800';

  const handleSelectNav = (id: AdminSection) => {
    onSelectSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900 font-sans" lang="it">
      {/* Left Sidebar — Dark Navy Blue */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 bottom-0 w-64 ${sidebarBgClass} border-r text-slate-200 flex-col z-30`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
          <div
            className={`w-9 h-9 rounded-lg ${palette.bgPrimary} flex items-center justify-center text-white shadow-sm`}
          >
            <Zap className="w-5 h-5" fill="currentColor" />
          </div>
          <div className="min-w-0">
            <span className="text-sm font-bold text-white tracking-tight block truncate">
              AI App Builder
            </span>
            <span className="text-[11px] text-slate-400 block truncate">
              Pannello Amministrativo
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Menu Amministrazione" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = activeSection === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? palette.sidebarActiveBg
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`text-xs font-semibold ${
                      active ? 'text-white/90' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Workspace & Public Site Links */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5">
          <button
            onClick={onOpenUserWorkspace}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          >
            <FileCode2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="truncate">Area Utente ed Editor</span>
          </button>

          <button
            onClick={onOpenPublicSite}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          >
            <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="truncate">Sito Pubblico (IT/EN/DE/FR)</span>
          </button>

          <button
            onClick={onOpenShortcuts}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Keyboard className="w-4 h-4 text-slate-400" />
              <span>Scorciatoie</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 rounded text-slate-300">
              ?
            </kbd>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Disconnetti sessione</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className={`w-64 ${sidebarBgClass} text-slate-200 h-full flex flex-col justify-between p-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg ${palette.bgPrimary} flex items-center justify-center text-white`}
                  >
                    <Zap className="w-4 h-4" fill="currentColor" />
                  </div>
                  <span className="text-sm font-bold text-white">AI App Builder</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                  aria-label="Chiudi menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = activeSection === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        active
                          ? palette.sidebarActiveBg
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.count !== undefined && (
                        <span className="text-xs">{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-1">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenUserWorkspace();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white"
              >
                <FileCode2 className="w-4 h-4 text-blue-400" />
                <span>Area Utente ed Editor</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenPublicSite();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:text-white"
              >
                <Globe className="w-4 h-4 text-blue-400" />
                <span>Sito Pubblico</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-300 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnetti</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Apri menu laterale"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {SECTION_TITLES[activeSection].title}
              </h1>
            </div>
          </div>

          {/* Search, Notifications, Settings & Admin Profile */}
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca progetti o attività..."
                aria-label="Cerca nel pannello amministrativo"
                className={`w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 ${palette.ringFocus} transition-all`}
              />
            </div>

            <button
              onClick={onOpenShortcuts}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Notifiche e scorciatoie di sistema"
              aria-label="Notifiche di sistema"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSelectSection('settings')}
              className={`p-2 rounded-lg transition-colors ${
                activeSection === 'settings'
                  ? `${palette.bgLight} ${palette.textPrimary}`
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Impostazioni"
              aria-label="Vai alle impostazioni"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2.5 pl-1">
              <div
                className={`w-8 h-8 rounded-full ${palette.bgPrimary} text-white flex items-center justify-center text-xs font-bold`}
              >
                AM
              </div>
              <div className="hidden md:block text-left">
                <span className="text-xs font-semibold text-slate-900 block leading-tight">
                  Amministratore
                </span>
                <span className="text-[11px] text-slate-500 block leading-tight">
                  Sessione Italiana
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Page Subtitle Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              {SECTION_TITLES[activeSection].subtitle}
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={onOpenUserWorkspace}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
              >
                <FileCode2 className="w-4 h-4 text-slate-500" />
                <span>Apri Dashboard Utente / Editor</span>
              </button>
              <button
                onClick={() => onSelectSection('projects')}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg ${palette.bgPrimary} ${palette.bgHover} text-white text-xs font-semibold shadow-2xs transition-colors`}
              >
                <Plus className="w-4 h-4" />
                <span>Gestisci Progetti</span>
              </button>
            </div>
          </div>

          {/* 1. PANORAMICA (OVERVIEW) */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* 4 Stat Cards in Ordered Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Utenti totali */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Utenti totali
                    </span>
                    <Users className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">1 sessione attiva</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Database utenti non collegato · Solo amministratore locale
                    </p>
                  </div>
                </div>

                {/* Card 2: Progetti creati */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Progetti creati
                    </span>
                    <FolderKanban className={`w-4 h-4 ${palette.textPrimary}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">{projects.length}</div>
                    <p className="text-xs text-slate-500 mt-1">
                      {projects.length === 0
                        ? 'Nessun progetto salvato in localStorage'
                        : `${projects.reduce((acc, p) => acc + p.instructions.length, 0)} istruzioni totali registrate`}
                    </p>
                  </div>
                </div>

                {/* Card 3: Crediti utilizzati */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Crediti utilizzati
                    </span>
                    <CreditCard className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">Non configurato</div>
                    <p className="text-xs text-slate-500 mt-1">
                      Sistema crediti non collegato a database · Utilizzo con chiave propria (BYOK)
                    </p>
                  </div>
                </div>

                {/* Card 4: Provider AI configurati */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Provider AI configurati
                    </span>
                    <Cpu className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-slate-900">
                      {aiConfigured ? '1' : '0'}{' '}
                      <span className="text-sm font-normal text-slate-500">/ 3 principali</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {aiConfigured
                        ? `Provider selezionato: ${settings.ai.provider.toUpperCase()} (Locale)`
                        : 'Nessun provider configurato nelle impostazioni'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Platform Activity Chart / Breakdown — only shown if real project data exists */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Attività della piattaforma
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Distribuzione reale dei progetti per categoria
                      </p>
                    </div>
                    <Activity className="w-4 h-4 text-violet-600" />
                  </div>

                  {categoryBreakdown.length === 0 ? (
                    <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 px-4">
                      <p className="text-sm font-medium text-slate-700">
                        Nessun dato di attività disponibile
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Il grafico viene generato solo in presenza di progetti reali salvati nel browser.
                        Crea un progetto nella sezione Progetti per visualizzare le metriche.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {categoryBreakdown.map((item) => (
                        <div key={item.type} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700">{item.label}</span>
                            <span className="text-slate-500 font-mono">
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-600 rounded-full transition-all duration-300"
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Recent Activity Table (Utente, Attività, Data, Stato) */}
                <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Attività recenti</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Eventi reali registrati dai progetti e dalle istruzioni salvate
                      </p>
                    </div>
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>

                  {recentActivities.length === 0 ? (
                    <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 px-4">
                      <p className="text-sm font-medium text-slate-700">
                        Nessuna attività registrata
                      </p>
                      <p className="text-xs text-slate-500">
                        Le operazioni di creazione progetto e invio istruzioni appariranno qui automaticamente.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <th className="py-2.5 pr-3">Utente</th>
                            <th className="py-2.5 px-3">Attività</th>
                            <th className="py-2.5 px-3">Data</th>
                            <th className="py-2.5 pl-3 text-right">Stato</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {recentActivities.map((act) => (
                            <tr key={act.id} className="hover:bg-slate-50/80">
                              <td className="py-3 pr-3 font-medium text-slate-800 whitespace-nowrap">
                                {act.user}
                              </td>
                              <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                                {act.action}
                              </td>
                              <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono">
                                {new Date(act.timestamp).toLocaleString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 pl-3 text-right whitespace-nowrap">
                                <span
                                  className={`font-medium ${
                                    act.status === 'generated'
                                      ? 'text-emerald-700'
                                      : act.status === 'error'
                                        ? 'text-red-600'
                                        : 'text-slate-600'
                                  }`}
                                >
                                  {act.status === 'generated'
                                    ? 'Pronto'
                                    : act.status === 'generating'
                                      ? 'In corso'
                                      : act.status === 'error'
                                        ? 'Errore'
                                        : 'Bozza'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {/* 2. UTENTI (USERS) */}
          {activeSection === 'users' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900">
                      Stato Autenticazione e Account Registrati ({registeredUsers.length + 1})
                    </h2>
                    <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                      L&apos;applicazione gestisce la sessione amministratore (<code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">admin-it</code>)
                      e gli account clienti registrati sul server (<code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">.data/users.json</code>)
                      tramite cookie <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">HttpOnly</code>.
                      Eventuali nomi utente visualizzati nella barra superiore esterna (es. profilo Google AI Studio / GitHub ospite) appartengono alla piattaforma esterna e non al database di questa applicazione.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Sessione Admin Attiva
                  </span>
                </div>

                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 pr-4">Profilo / Nome</th>
                        <th className="py-3 px-4">Email / Identificativo</th>
                        <th className="py-3 px-4">Ruolo / Piano</th>
                        <th className="py-3 px-4">Archiviazione</th>
                        <th className="py-3 pl-4 text-right">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      <tr>
                        <td className="py-3.5 pr-4 font-semibold text-slate-900">
                          Amministratore / Proprietario
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">admin-it</td>
                        <td className="py-3.5 px-4 text-slate-600">Proprietario Piattaforma</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          Isolata ({projects.length} progett{projects.length === 1 ? 'o' : 'i'})
                        </td>
                        <td className="py-3.5 pl-4 text-right font-medium text-emerald-700">
                          Autenticato
                        </td>
                      </tr>
                      {registeredUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="py-3.5 pr-4 font-semibold text-slate-900">{u.name}</td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">{u.email}</td>
                          <td className="py-3.5 px-4 text-slate-600">
                            Cliente ({u.activeSubscription?.planId || 'free-byok'})
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">{u.id}</td>
                          <td className="py-3.5 pl-4 text-right font-medium text-emerald-700">
                            Registrato
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. PROGETTI (PROJECTS) — Reuses existing Dashboard & CreateProjectModal functionality */}
          {activeSection === 'projects' && (
            <div className="space-y-6">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <Dashboard
                  projects={filteredProjects}
                  aiConfigured={aiConfigured}
                  onCreateProject={onCreateProject}
                  onOpenProject={onOpenProjectInEditor}
                  onExportProject={onExportProject}
                  onDeleteProject={onDeleteProject}
                  onGoToSettings={() => onSelectSection('settings')}
                  onOpenShortcuts={onOpenShortcuts}
                />
              </div>
            </div>
          )}

          {/* 4. PROVIDER AI (GOOGLE GEMINI, OPENAI, ANTHROPIC CLAUDE) */}
          {activeSection === 'providers' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 leading-relaxed">
                  <strong className="text-slate-900 font-semibold block mb-0.5">
                    Sicurezza delle chiavi API e stato di verifica
                  </strong>
                  Le chiavi API configurate non vengono mai mostrate in chiaro in questa schermata.
                  La presenza di una chiave salvata localmente non equivale a una connessione backend verificata:
                  le chiamate live ai modelli richiedono l&apos;attivazione del proxy lato server.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Card 1: Google Gemini */}
                <ProviderCard
                  name="Google Gemini (BYOK Free Tier)"
                  providerId="gemini"
                  models={['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash']}
                  description="Modelli Google AI Studio compatibili con il livello gratuito tramite SDK @google/genai (ai.models.generateContent)."
                  isSelected={settings.ai.provider === 'gemini'}
                  hasKey={settings.ai.provider === 'gemini' && Boolean(settings.ai.apiKey)}
                  selectedModel={settings.ai.provider === 'gemini' ? settings.ai.model || 'gemini-flash-latest' : 'gemini-flash-latest'}
                  statusLabel={
                    settings.ai.provider === 'gemini' && settings.ai.apiKey
                      ? 'Chiave BYOK attiva in memoria di sessione'
                      : 'Pronto per chiave Google AI Studio (BYOK)'
                  }
                  docsUrl="https://aistudio.google.com/app/apikey"
                  palette={palette}
                  onSelectAndConfigure={(providerId, defaultModel, endpoint) => {
                    onUpdateAI({ provider: providerId, model: defaultModel, endpoint });
                    onSelectSection('settings');
                  }}
                />

                {/* Card 2: OpenAI */}
                <ProviderCard
                  name="OpenAI"
                  providerId="openai"
                  models={['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']}
                  description="Modelli GPT-4o e GPT-4-turbo per la generazione di codice HTML, CSS e logiche applicative."
                  isSelected={settings.ai.provider === 'openai'}
                  hasKey={settings.ai.provider === 'openai' && Boolean(settings.ai.apiKey)}
                  selectedModel={settings.ai.provider === 'openai' ? settings.ai.model : 'gpt-4o'}
                  statusLabel={
                    settings.ai.provider === 'openai' && settings.ai.apiKey
                      ? 'Chiave salvata localmente (Non verificata sul server)'
                      : 'Non configurato'
                  }
                  docsUrl="https://platform.openai.com/api-keys"
                  palette={palette}
                  onSelectAndConfigure={(providerId, defaultModel, endpoint) => {
                    onUpdateAI({ provider: providerId, model: defaultModel, endpoint });
                    onSelectSection('settings');
                  }}
                />

                {/* Card 3: Anthropic Claude (Predisposto per il futuro) */}
                <ProviderCard
                  name="Anthropic Claude"
                  providerId="anthropic"
                  models={[
                    'claude-3-5-sonnet-20241022',
                    'claude-3-5-haiku-20241022',
                    'claude-3-opus-20240229',
                  ]}
                  description="Predisposto per l'integrazione con i modelli Claude 3.5 Sonnet e Haiku tramite proxy dedicato."
                  isSelected={settings.ai.provider === 'anthropic'}
                  hasKey={settings.ai.provider === 'anthropic' && Boolean(settings.ai.apiKey)}
                  selectedModel={
                    settings.ai.provider === 'anthropic'
                      ? settings.ai.model
                      : 'claude-3-5-sonnet-20241022'
                  }
                  statusLabel={
                    settings.ai.provider === 'anthropic' && settings.ai.apiKey
                      ? 'Predisposto · Chiave locale presente (Non connesso)'
                      : 'Predisposto per il futuro (Non configurato)'
                  }
                  docsUrl="https://console.anthropic.com/settings/keys"
                  palette={palette}
                  onSelectAndConfigure={(providerId, defaultModel, endpoint) => {
                    onUpdateAI({ provider: providerId, model: defaultModel, endpoint });
                    onSelectSection('settings');
                  }}
                />
              </div>
            </div>
          )}

          {/* 5. CREDITI E PIANI (CREDITS & PLANS) */}
          {activeSection === 'credits' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Modalità Operativa Attuale
                  </span>
                  <div className="text-xl font-bold text-slate-900">
                    BYOK (Chiave Propria)
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nessun costo di abbonamento applicato dall&apos;interfaccia. I consumi dipendono
                    esclusivamente dal piano associato alla propria chiave API presso il provider scelto.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Saldo Crediti Database
                  </span>
                  <div className="text-xl font-bold text-slate-900">Non collegato</div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Il database per la contabilizzazione dei crediti e la prevenzione di doppie detrazioni
                    non è ancora collegato. Non sono presenti saldi simulati.
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Istruzioni Registrate Localmente
                  </span>
                  <div className="text-xl font-bold text-slate-900">
                    {projects.reduce((acc, p) => acc + p.instructions.length, 0)} prompt
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Totale reale delle istruzioni testuali aggiunte nei {projects.length} progetti
                    attualmente archiviati nel browser.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-3">
                <h2 className="text-base font-bold text-slate-900">
                  Storico Transazioni e Consumi
                </h2>
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 px-4">
                  <p className="text-sm font-medium text-slate-700">
                    Nessuna transazione registrata
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto leading-relaxed">
                    In conformità con le regole di trasparenza del sistema, non vengono mostrati
                    movimenti o addebiti dimostrativi finché il modulo di fatturazione e database non sarà attivo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 6. IMPOSTAZIONI (SETTINGS) — Theme Appearance + Existing AI & GitHub Settings */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              {/* Sezione Aspetto (Theme Color Swatches) */}
              <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${palette.bgLight} ${palette.textPrimary} flex items-center justify-center`}
                  >
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Aspetto del Pannello Amministrativo
                    </h2>
                    <p className="text-xs text-slate-500">
                      Personalizza il colore principale dei pulsanti, degli indicatori attivi e lo stile della barra laterale
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Accent Color Swatches */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Colore principale di accento
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {(Object.keys(ACCENT_PALETTES) as ThemeAccent[]).map((key) => {
                        const item = ACCENT_PALETTES[key];
                        const selected = accentKey === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onUpdateTheme({ accentColor: key })}
                            className={`flex items-center gap-2.5 p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                              selected
                                ? `${item.borderActive} ${item.bgLight} text-slate-900 font-semibold`
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full flex-shrink-0 border border-black/10"
                              style={{ backgroundColor: item.hex }}
                            />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sidebar Tone Selector */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Tonalità barra laterale sinistra
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => onUpdateTheme({ sidebarStyle: 'navy' })}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                          sidebarStyle === 'navy'
                            ? `${palette.borderActive} ${palette.bgLight} text-slate-900 font-semibold`
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-[#0B192C] border border-slate-400 flex-shrink-0" />
                        <span>Blu Navy Scuro</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateTheme({ sidebarStyle: 'slate' })}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                          sidebarStyle === 'slate'
                            ? `${palette.borderActive} ${palette.bgLight} text-slate-900 font-semibold`
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-slate-900 border border-slate-400 flex-shrink-0" />
                        <span>Grigio Ardesia Scuro</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Existing SettingsView (AI & GitHub integration) preserved */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
                <SettingsView
                  settings={settings}
                  isAdminContext={true}
                  activeUserId="admin-it"
                  activeUserEmail={null}
                  onUpdateAI={onUpdateAI}
                  onUpdateGitHub={onUpdateGitHub}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  providerId,
  models,
  description,
  isSelected,
  hasKey,
  selectedModel,
  statusLabel,
  docsUrl,
  palette,
  onSelectAndConfigure,
}: {
  name: string;
  providerId: AIProvider;
  models: string[];
  description: string;
  isSelected: boolean;
  hasKey: boolean;
  selectedModel: string;
  statusLabel: string;
  docsUrl: string;
  palette: (typeof ACCENT_PALETTES)['blue'];
  onSelectAndConfigure: (providerId: AIProvider, defaultModel: string, endpoint: string) => void;
}) {
  const providerMeta = AI_PROVIDERS.find((p) => p.id === providerId);
  const defaultEndpoint = providerMeta?.defaultEndpoint || '';

  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-2xs border transition-all flex flex-col justify-between space-y-5 ${
        isSelected ? `${palette.borderActive} ring-1 ring-blue-500/20` : 'border-slate-200'
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">{name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{statusLabel}</p>
          </div>
          {hasKey ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <Sliders className="w-5 h-5 text-slate-400 flex-shrink-0" />
          )}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">{description}</p>

        <div className="pt-2 space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
            Modelli supportati
          </span>
          <div className="text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 space-y-1">
            {models.map((m) => (
              <div key={m} className="flex items-center justify-between">
                <span className="truncate">{m}</span>
                {isSelected && selectedModel === m && (
                  <span className="text-[10px] font-sans font-semibold text-emerald-700">
                    Selezionato
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <span>Documentazione</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <button
          type="button"
          onClick={() => onSelectAndConfigure(providerId, models[0], defaultEndpoint)}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
            isSelected
              ? `${palette.bgPrimary} ${palette.bgHover} text-white`
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
          }`}
        >
          {isSelected ? 'Modifica in Impostazioni' : 'Seleziona Provider'}
        </button>
      </div>
    </div>
  );
}
