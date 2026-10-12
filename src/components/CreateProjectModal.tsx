import { useState } from 'react';
import type { ProjectType } from '@/types';
import { PROJECT_TYPES, PROJECT_TYPE_LABELS, PROJECT_TYPE_DESCRIPTIONS } from '@/lib/constants';

import {
  X,
  Sparkles,
  Globe,
  AppWindow,
  LayoutTemplate,
  ShoppingCart,
  LayoutDashboard,
  FolderOpen,
  FileText,
  ArrowRight,
} from 'lucide-react';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; type: ProjectType }) => void;
}

const typeIcons: Record<ProjectType, typeof Globe> = {
  website: Globe,
  'web-app': AppWindow,
  'landing-page': LayoutTemplate,
  ecommerce: ShoppingCart,
  dashboard: LayoutDashboard,
  portfolio: FolderOpen,
  blog: FileText,
  other: Sparkles,
};

const SUGGESTIONS = [
  'Crea un sito web completo per un ristorante, con homepage, menu consultabile, orari, indirizzo, modulo di prenotazione e layout responsive. Organizza i file in modo chiaro e descrivi le API necessarie per gestire le prenotazioni.',
  'Una landing page per un corso online con form di iscrizione',
  'Un portfolio per un fotografo con galleria di immagini',
  'Una dashboard per monitorare le vendite di un e-commerce',
];

export default function CreateProjectModal({ open, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ProjectType>('website');
  const [touched, setTouched] = useState(false);

  if (!open) return null;

  const validName = name.trim().length >= 2;
  const validDescription = description.trim().length >= 10;
  const canSubmit = validName && validDescription;

  const handleSubmit = () => {
    setTouched(true);
    if (!canSubmit) return;
    onCreate({ name: name.trim(), description: description.trim(), type });
    handleReset();
  };

  const handleReset = () => {
    setName('');
    setDescription('');
    setType('website');
    setTouched(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl glass-strong border border-surface-700/60 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400/20 to-accent-600/20 border border-accent-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Crea nuova applicazione</h2>
              <p className="text-sm text-surface-500">Descrivi cosa vuoi realizzare</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg bg-surface-800/60 hover:bg-surface-700/60 text-surface-400 hover:text-surface-200 flex items-center justify-center transition-colors"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-3">
              Tipo di progetto
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PROJECT_TYPES.map((t) => {
                const Icon = typeIcons[t];
                const selected = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`group flex flex-col items-center gap-2 px-3 py-3.5 rounded-xl border transition-all duration-200 ${
                      selected
                        ? 'border-accent-500/50 bg-accent-500/10 text-accent-300 glow-accent'
                        : 'border-surface-800 bg-surface-800/30 text-surface-400 hover:border-surface-700 hover:bg-surface-800/60'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium text-center leading-tight">
                      {PROJECT_TYPE_LABELS[t]}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-surface-500 mt-2.5">{PROJECT_TYPE_DESCRIPTIONS[type]}</p>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Nome del progetto
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Sito ristorante La Bell'Italia"
              className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-accent-500/50 focus:bg-surface-800 transition-colors"
              maxLength={60}
            />
            {touched && !validName && (
              <p className="text-xs text-red-400 mt-1.5">Inserisci un nome di almeno 2 caratteri</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-2">
              Descrivi l'applicazione
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi in dettaglio cosa vuoi realizzare: funzionalità, pagine, stile, contenuti..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-accent-500/50 focus:bg-surface-800 transition-colors resize-none scrollbar-thin"
              maxLength={2000}
            />
            <div className="flex items-center justify-between mt-1.5">
              {touched && !validDescription ? (
                <p className="text-xs text-red-400">
                  La descrizione deve avere almeno 10 caratteri
                </p>
              ) : (
                <p className="text-xs text-surface-600">Più sei dettagliato, migliore sarà il risultato</p>
              )}
              <span className="text-xs text-surface-600">{description.length}/2000</span>
            </div>
          </div>

          {/* Suggestions */}
          <div>
            <p className="text-xs font-medium text-surface-500 mb-2.5">Oppure prova un esempio:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setDescription(s);
                    if (!name.trim()) {
                      setName(s.split(' ').slice(0, 3).join(' '));
                    }
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-surface-800/60 border border-surface-700/40 text-surface-400 hover:text-accent-300 hover:border-accent-500/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-800/60 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:text-surface-200 transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 hover:from-accent-400 hover:to-accent-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed glow-accent"
          >
            Crea progetto
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}


