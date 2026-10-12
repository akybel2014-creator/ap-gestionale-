import type { ViewType, Project } from '@/types';
import { Zap, Settings, ChevronRight, Globe } from 'lucide-react';

interface MobileHeaderProps {
  currentView: ViewType;
  currentProject: Project | null;
  onNavigate: (view: ViewType) => void;
  onOpenPublicSite?: () => void;
}

export default function MobileHeader({
  currentView,
  currentProject,
  onNavigate,
  onOpenPublicSite,
}: MobileHeaderProps) {
  const title =
    currentView === 'dashboard'
      ? 'Dashboard'
      : currentView === 'editor'
        ? currentProject?.name ?? 'Editor'
        : 'Impostazioni';

  return (
    <header className="lg:hidden sticky top-0 z-20 glass-strong border-b border-surface-800/60 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-surface-950" fill="currentColor" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white">AI App Builder</span>
          <ChevronRight className="w-4 h-4 text-surface-600" />
          <span className="text-sm text-surface-400">{title}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onOpenPublicSite && (
          <button
            onClick={onOpenPublicSite}
            className="w-8 h-8 rounded-lg bg-surface-800/60 flex items-center justify-center text-accent-400"
            aria-label="Sito pubblico"
            title="Sito pubblico"
          >
            <Globe className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => onNavigate('settings')}
          className="w-8 h-8 rounded-lg bg-surface-800/60 flex items-center justify-center text-surface-400"
          aria-label="Impostazioni"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
