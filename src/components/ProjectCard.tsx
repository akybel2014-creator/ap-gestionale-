import type { Project } from '@/types';
import { PROJECT_TYPE_LABELS } from '@/lib/constants';
import {
  Globe,
  AppWindow,
  LayoutTemplate,
  ShoppingCart,
  LayoutDashboard,
  FolderOpen,
  FileText,
  Sparkles,
  MoreVertical,
  Pencil,
  Download,
  Trash2,
  Clock,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
  onExport: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const typeIcons: Record<Project['type'], typeof Globe> = {
  website: Globe,
  'web-app': AppWindow,
  'landing-page': LayoutTemplate,
  ecommerce: ShoppingCart,
  dashboard: LayoutDashboard,
  portfolio: FolderOpen,
  blog: FileText,
  other: Sparkles,
};

const statusConfig: Record<Project['status'], { label: string; color: string; dot: string }> = {
  draft: { label: 'Bozza', color: 'text-surface-400', dot: 'bg-surface-500' },
  generating: { label: 'In generazione', color: 'text-amber-400', dot: 'bg-amber-400 animate-pulse' },
  generated: { label: 'Pronto', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  error: { label: 'Errore', color: 'text-red-400', dot: 'bg-red-400' },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  if (diffHr < 24) return `${diffHr}h fa`;
  if (diffDay < 7) return `${diffDay}g fa`;
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export default function ProjectCard({ project, onOpen, onExport, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const Icon = typeIcons[project.type];
  const status = statusConfig[project.status];

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <div
      onClick={() => onOpen(project)}
      className="group relative glass border border-surface-800/60 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-accent-500/30 hover:bg-surface-800/30 hover:-translate-y-0.5 animate-slide-up"
    >
      {/* Top section */}
      <div className="flex items-start justify-between mb-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700/40 flex items-center justify-center group-hover:border-accent-500/30 transition-colors">
          <Icon className="w-5 h-5 text-surface-400 group-hover:text-accent-400 transition-colors" />
        </div>

        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>

          <div ref={menuRef} className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-700/60 flex items-center justify-center transition-colors"
              aria-label="Azioni progetto"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-44 glass-strong border border-surface-700/60 rounded-xl py-1.5 shadow-xl animate-scale-in">
                <button
                  onClick={() => {
                    onOpen(project);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800/60 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-surface-500" />
                  Apri editor
                </button>
                <button
                  onClick={() => {
                    onExport(project);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800/60 transition-colors"
                >
                  <Download className="w-4 h-4 text-surface-500" />
                  Esporta codice
                </button>
                <div className="h-px bg-surface-800 my-1" />
                <button
                  onClick={() => {
                    onDelete(project);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Elimina
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <h3 className="text-base font-semibold text-white mb-1 truncate">{project.name}</h3>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded-md bg-surface-800/60 text-surface-400 font-medium">
          {PROJECT_TYPE_LABELS[project.type]}
        </span>
        <span className="flex items-center gap-1 text-xs text-surface-600">
          <Clock className="w-3 h-3" />
          {formatDate(project.updatedAt)}
        </span>
      </div>
      <p className="text-sm text-surface-400 line-clamp-2 leading-relaxed">
        {project.description}
      </p>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-surface-800/40 flex items-center justify-between">
        <span className="text-xs text-surface-600">
          {project.instructions.length} istruzion{project.instructions.length === 1 ? 'e' : 'i'}
        </span>
        <span className="text-xs font-medium text-accent-400/80 group-hover:text-accent-300 flex items-center gap-1 transition-colors">
          Apri
          <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
        </span>
      </div>
    </div>
  );
}
