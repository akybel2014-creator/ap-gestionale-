import type { ViewType } from '@/types';
import {
  Sparkles,
  LayoutDashboard,
  Settings,
  Github,
  Zap,
  Globe,
  LogOut,
  Keyboard,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  aiConfigured: boolean;
  githubConfigured: boolean;
  projectCount: number;
  customerUser?: {
    name: string;
    email: string;
    planId?: string;
  } | null;
  onOpenPublicSite?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenShortcuts?: () => void;
  onLogout?: () => void;
}

export default function Sidebar({
  currentView,
  onNavigate,
  aiConfigured,
  githubConfigured,
  projectCount,
  customerUser,
  onOpenPublicSite,
  onOpenAdminPanel,
  onOpenShortcuts,
  onLogout,
}: SidebarProps) {
  const navItems: {
    id: ViewType;
    label: string;
    icon: typeof Sparkles;
    badge?: string;
    statusDot?: boolean;
    dotColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: projectCount > 0 ? String(projectCount) : undefined,
    },
    {
      id: 'editor',
      label: 'Editor',
      icon: Sparkles,
    },
    {
      id: 'settings',
      label: 'Impostazioni',
      icon: Settings,
      statusDot: true,
      dotColor: aiConfigured ? 'bg-emerald-400' : 'bg-amber-400',
    },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 glass-strong border-r border-surface-800/80 flex-col z-30">
        <div className="px-6 py-6 border-b border-surface-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center glow-accent">
              <Zap className="w-5 h-5 text-surface-950" fill="currentColor" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-white leading-tight">AI App Builder</h1>
              <p className="text-xs text-surface-500 mt-0.5">
                {customerUser ? 'Area Cliente' : 'Crea app con l\'IA'}
              </p>
            </div>
          </div>
          {customerUser && (
            <div className="mt-4 p-2.5 rounded-xl bg-surface-900/80 border border-surface-800 text-xs space-y-0.5">
              <div className="font-semibold text-white truncate">{customerUser.name}</div>
              <div className="text-surface-400 truncate text-[11px]">{customerUser.email}</div>
              {customerUser.planId && (
                <div className="pt-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px]">
                    Piano: {customerUser.planId}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-accent-500/10 text-accent-300'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent-400" />
                )}
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-surface-400 font-medium">
                    {item.badge}
                  </span>
                )}
                {item.statusDot && (
                  <span className={`w-2 h-2 rounded-full ${item.dotColor}`} />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-surface-800/60 space-y-2">
          <div className="px-3 py-3 rounded-lg bg-surface-800/40 space-y-2.5">
            <div className="flex items-center gap-2 text-xs">
              <Github className="w-4 h-4 text-surface-500" />
              <span className="text-surface-400 flex-1">GitHub</span>
              {githubConfigured ? (
                <span className="text-emerald-400 text-xs font-medium">Collegato</span>
              ) : (
                <span className="text-amber-400 text-xs font-medium">Non configurato</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Zap className="w-4 h-4 text-surface-500" />
              <span className="text-surface-400 flex-1">Modello IA</span>
              {aiConfigured ? (
                <span className="text-emerald-400 text-xs font-medium">Attivo</span>
              ) : (
                <span className="text-amber-400 text-xs font-medium">Non configurato</span>
              )}
            </div>
          </div>

          {!customerUser && onOpenAdminPanel && (
            <button
              onClick={onOpenAdminPanel}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-accent-300 hover:text-white hover:bg-accent-500/10 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-accent-400" />
              <span>Pannello Amministrativo</span>
            </button>
          )}

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-surface-300 hover:text-white hover:bg-surface-800/60 transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <Keyboard className="w-4 h-4 text-accent-400" />
                <span>Scorciatoie da tastiera</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-800 border border-surface-700 rounded text-surface-400">
                ?
              </kbd>
            </button>
          )}

          {onOpenPublicSite && (
            <button
              onClick={onOpenPublicSite}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-surface-300 hover:text-white hover:bg-surface-800/60 transition-colors"
            >
              <Globe className="w-4 h-4 text-accent-400" />
              <span>Sito Pubblico (IT/EN/DE/FR)</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-surface-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>{customerUser ? 'Esci dall\'account' : 'Chiudi sessione admin'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass-strong border-t border-surface-800/80 flex items-center justify-around px-2 py-2 z-30">
        {navItems.map((item) => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition-colors ${
                active ? 'text-accent-400' : 'text-surface-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
