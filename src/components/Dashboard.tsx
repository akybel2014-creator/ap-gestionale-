import { useState, useEffect } from 'react';
import type { Project } from '@/types';
import CreateProjectModal from '@/components/CreateProjectModal';
import ProjectCard from '@/components/ProjectCard';
import { Plus, Sparkles, Zap, ArrowRight, AlertCircle, Keyboard } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  aiConfigured: boolean;
  onCreateProject: (data: { name: string; description: string; type: Project['type'] }) => Project;
  onOpenProject: (project: Project) => void;
  onExportProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onGoToSettings: () => void;
  onOpenShortcuts?: () => void;
}

export default function Dashboard({
  projects,
  aiConfigured,
  onCreateProject,
  onOpenProject,
  onExportProject,
  onDeleteProject,
  onGoToSettings,
  onOpenShortcuts,
}: DashboardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isInput) return;

      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreate = (data: { name: string; description: string; type: Project['type'] }) => {
    const project = onCreateProject(data);
    setModalOpen(false);
    onOpenProject(project);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 pb-24 lg:pb-10">
      {/* Hero section */}
      <div className="mb-8 lg:mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Crea applicazioni descrivendole a parole
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
          Trasforma le tue idee in <span className="text-gradient">applicazioni</span>
        </h1>
        <p className="text-surface-400 text-base sm:text-lg mt-3 max-w-2xl leading-relaxed">
          Descrivi il sito o l'app che vuoi realizzare, modifica i progetti con istruzioni testuali,
          e visualizza l'anteprima in tempo reale.
        </p>
      </div>

      {/* CTA Button & Keyboard Shortcuts Trigger */}
      <div className="mb-8 lg:mb-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="group relative flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 font-semibold text-base hover:from-accent-400 hover:to-accent-500 transition-all duration-300 glow-accent hover:glow-accent-strong"
        >
          <Plus className="w-5 h-5" />
          Crea nuova applicazione
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="flex items-center justify-center gap-2.5 px-5 py-4 rounded-2xl glass border border-surface-700/60 text-surface-200 hover:text-white hover:border-accent-500/40 hover:bg-surface-800/60 transition-all text-sm font-medium"
            title="Apri le scorciatoie da tastiera (?)"
          >
            <Keyboard className="w-4 h-4 text-accent-400" />
            <span>Scorciatoie da tastiera</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-xs font-mono bg-surface-800 border border-surface-700 rounded text-surface-400">
              ?
            </kbd>
          </button>
        )}
      </div>

      {/* AI not configured banner */}
      {!aiConfigured && (
        <div className="mb-8 flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-slide-up">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">Modello IA non configurato</p>
            <p className="text-sm text-amber-400/70 mt-1">
              Per generare applicazioni con l'intelligenza artificiale, configura un provider IA
              nelle impostazioni. Puoi comunque creare progetti e usare l'editor.
            </p>
          </div>
          <button
            onClick={onGoToSettings}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          >
            Configura
          </button>
        </div>
      )}

      {/* Projects section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-400" />
            I tuoi progetti
            {projects.length > 0 && (
              <span className="text-sm text-surface-500 font-normal">({projects.length})</span>
            )}
          </h2>
        </div>

        {projects.length === 0 ? (
          <EmptyState onCreate={() => setModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={onOpenProject}
                onExport={onExportProject}
                onDelete={onDeleteProject}
              />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700/40 flex items-center justify-center mb-5">
        <Sparkles className="w-9 h-9 text-surface-600" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Nessun progetto ancora</h3>
      <p className="text-sm text-surface-500 max-w-sm mb-6 leading-relaxed">
        Crea la tua prima applicazione descrivendo cosa vuoi realizzare. L'intelligenza artificiale
        trasformerà la tua descrizione in codice.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface-800/60 border border-surface-700/40 text-surface-200 hover:text-white hover:border-accent-500/30 hover:bg-surface-800 transition-colors font-medium text-sm"
      >
        <Plus className="w-4 h-4" />
        Crea il primo progetto
      </button>
    </div>
  );
}
