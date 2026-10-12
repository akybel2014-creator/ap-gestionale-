import React, { useEffect, useRef } from 'react';
import { Smile, X } from 'lucide-react';

export const DEFAULT_SYNC_WATCH_EMOJIS: readonly string[] = [
  '🍿',
  '🔥',
  '😂',
  '😱',
  '😍',
  '👏',
  '🤯',
  '😢',
  '❤️',
  '🎬',
  '👀',
  '🙌',
  '🤩',
  '💀',
  '🎉',
  '⚡',
  '💯',
  '🤔',
];

export interface SyncWatchEmojiPopoverProps {
  /** Stato di apertura del popover */
  isOpen: boolean;
  /** Toggle di apertura/chiusura del popover */
  onOpenChange: (nextOpen: boolean) => void;
  /** Valore corrente dell'input chat (es. syncChatInput) */
  inputValue: string;
  /** Setter dello stato dell'input chat (es. setSyncChatInput) */
  onInputValueChange: React.Dispatch<React.SetStateAction<string>>;
  /** Riferimento all'elemento HTMLInputElement per preservare focus e cursore */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Lista opzionale di emoji personalizzate */
  emojis?: readonly string[];
  /** Titolo dell'intestazione del popover */
  title?: string;
}

/**
 * Componente Popover riutilizzabile per la chat di Sync Watch.
 * Mostra il pulsante trigger con icona Smile e un popover con griglia di emoji
 * che inserisce l'emoji cliccata direttamente in `syncChatInput` mantenendo il focus sull'input.
 */
export const SyncWatchEmojiPopover: React.FC<SyncWatchEmojiPopoverProps> = ({
  isOpen,
  onOpenChange,
  inputValue,
  onInputValueChange,
  inputRef,
  emojis = DEFAULT_SYNC_WATCH_EMOJIS,
  title = 'Reazioni rapide',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Chiude il popover cliccando all'esterno o premendo Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
        inputRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onOpenChange, inputRef]);

  const handleSelectEmoji = (emoji: string) => {
    const inputEl = inputRef.current;
    if (inputEl) {
      const start = inputEl.selectionStart ?? inputValue.length;
      const end = inputEl.selectionEnd ?? inputValue.length;
      const nextValue =
        inputValue.slice(0, start) + emoji + inputValue.slice(end);
      onInputValueChange(nextValue);

      const nextCursorPos = start + emoji.length;
      requestAnimationFrame(() => {
        inputEl.focus();
        try {
          inputEl.setSelectionRange(nextCursorPos, nextCursorPos);
        } catch {
          // ignore if selectionRange is not supported on input type
        }
      });
    } else {
      onInputValueChange((prev) => `${prev}${emoji}`);
    }

    onOpenChange(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      {isOpen && (
        <div
          role="dialog"
          aria-label={title}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute bottom-full left-0 mb-2 p-2.5 rounded-xl bg-[#181824] border border-white/20 shadow-2xl z-40 w-60 animate-fade-in"
        >
          <div className="flex items-center justify-between px-1 pb-1.5 mb-1.5 border-b border-white/10">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {title}
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onOpenChange(false);
                inputRef.current?.focus();
              }}
              aria-label="Chiudi selettore emoji"
              className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-6 gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectEmoji(emoji)}
                aria-label={`Inserisci emoji ${emoji}`}
                className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center text-base transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          onOpenChange(!isOpen);
          inputRef.current?.focus();
        }}
        aria-label="Apri selettore emoji"
        aria-expanded={isOpen}
        title="Inserisci emoji"
        className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${
          isOpen
            ? 'bg-white/20 border-white text-white'
            : 'bg-black/60 border-white/20 text-zinc-300 hover:text-white hover:border-white/40'
        }`}
      >
        <Smile className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SyncWatchEmojiPopover;
