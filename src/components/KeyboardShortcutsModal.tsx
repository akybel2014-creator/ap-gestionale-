import { useEffect } from 'react';
import { X, Keyboard, Sparkles, Monitor, LayoutDashboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  icon: typeof Keyboard;
  items: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Navigazione Globale',
    icon: LayoutDashboard,
    items: [
      {
        keys: ['Alt', '1'],
        description: 'Vai alla Dashboard progetti',
      },
      {
        keys: ['Alt', '2'],
        description: 'Apri la vista Editor',
      },
      {
        keys: ['Alt', '3'],
        description: 'Apri le Impostazioni (IA e GitHub)',
      },
      {
        keys: ['?'],
        description: 'Apri o chiudi questa finestra delle scorciatoie',
      },
      {
        keys: ['Esc'],
        description: 'Chiudi la finestra modale attiva',
      },
    ],
  },
  {
    title: 'Azioni nella Dashboard',
    icon: Sparkles,
    items: [
      {
        keys: ['Alt', 'N'],
        description: 'Crea una nuova applicazione (apre la finestra modale)',
      },
    ],
  },
  {
    title: 'Produttività nell\'Editor',
    icon: Monitor,
    items: [
      {
        keys: ['Ctrl / ⌘', 'Invio'],
        description: 'Invia l\'istruzione di modifica nel pannello prompt',
      },
      {
        keys: ['Alt', 'G'],
        description: 'Avvia la generazione dell\'anteprima con IA',
      },
      {
        keys: ['Alt', 'P'],
        description: 'Passa tra la scheda Anteprima e la scheda Codice',
      },
      {
        keys: ['Alt', 'D'],
        description: 'Cambia dispositivo di anteprima (Desktop → Tablet → Mobile)',
      },
      {
        keys: ['Alt', 'R'],
        description: 'Ricarica l\'anteprima HTML nell\'iframe',
      },
      {
        keys: ['Alt', 'E'],
        description: 'Esporta la specifica e il codice del progetto (.txt)',
      },
    ],
  },
];

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      <div
        className="w-full max-w-2xl glass-strong border border-surface-700/60 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400/20 to-accent-600/20 border border-accent-500/30 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h2 id="shortcuts-modal-title" className="text-lg font-semibold text-white">
                Scorciatoie da tastiera
              </h2>
              <p className="text-sm text-surface-500">
                Naviga velocemente tra Dashboard, Editor e strumenti di anteprima
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface-800/60 hover:bg-surface-700/60 text-surface-400 hover:text-surface-200 flex items-center justify-center transition-colors"
            aria-label="Chiudi scorciatoie da tastiera"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {SHORTCUT_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.title} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent-400">
                  <Icon className="w-4 h-4" />
                  <span>{group.title}</span>
                </div>
                <div className="divide-y divide-surface-800/60 rounded-xl border border-surface-800/80 bg-surface-900/40 overflow-hidden">
                  {group.items.map((item) => (
                    <div
                      key={item.description}
                      className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-surface-800/30 transition-colors"
                    >
                      <span className="text-sm text-surface-200">{item.description}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.keys.map((k, idx) => (
                          <span key={k} className="flex items-center gap-1.5">
                            <kbd className="px-2 py-1 text-xs font-mono font-semibold text-accent-300 bg-surface-800 border border-surface-700 rounded-md shadow-inner">
                              {k}
                            </kbd>
                            {idx < item.keys.length - 1 && (
                              <span className="text-xs text-surface-500">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-800/60 flex items-center justify-between gap-3">
          <p className="text-xs text-surface-500">
            Suggerimento: premi <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-800 border border-surface-700 rounded text-surface-300">?</kbd> fuori dai campi di testo per aprire questa guida in qualsiasi momento.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 hover:text-white transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
