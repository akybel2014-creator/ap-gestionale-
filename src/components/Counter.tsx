import { useState, useCallback, useEffect } from 'react';
import { Plus, Minus, RotateCcw, SlidersHorizontal, History, ShieldCheck } from 'lucide-react';
import type { ActivityLogEntry } from '@/types';
import { formatCounterActivityMessage, parseLatestCounterValueFromLogs } from '@/lib/storage';

export interface CounterActionEvent {
  action: 'increment' | 'decrement' | 'reset';
  previousValue: number;
  newValue: number;
  step: number;
  title: string;
  userId: string;
  timestamp: string;
  logText: string;
  savedEntry?: ActivityLogEntry | null;
}

export interface CounterStoreChangePayload {
  projectId: string;
  action: 'increment' | 'decrement' | 'reset';
  previousValue: number;
  newValue: number;
  step: number;
  title?: string;
}

export interface CounterProps {
  projectId: string;
  activeUserId?: string;
  activityLogs?: ActivityLogEntry[];
  initialTitle?: string;
  initialDescription?: string;
  initialCount?: number;
  initialStep?: number;
  onLogCounterChange?: (payload: CounterStoreChangePayload) => ActivityLogEntry | null;
  onLogActivity?: (projectId: string, logText: string) => void;
  onActionRecorded?: (event: CounterActionEvent) => void;
  compact?: boolean;
}

export default function Counter({
  projectId,
  activeUserId = 'admin-it',
  activityLogs,
  initialTitle = 'Contatore Interattivo Personalizzato',
  initialDescription = 'Ogni incremento e decremento aggiorna lo stato e salva un’azione utente autenticata nel registro attività del workspace.',
  initialCount,
  initialStep = 1,
  onLogCounterChange,
  onLogActivity,
  onActionRecorded,
  compact = false,
}: CounterProps) {
  const [count, setCount] = useState<number>(() => {
    if (typeof initialCount === 'number') return initialCount;
    const hydrated = parseLatestCounterValueFromLogs(activityLogs || [], projectId, activeUserId);
    return hydrated !== null ? hydrated : 0;
  });
  const [step, setStep] = useState<number>(initialStep);
  const [title, setTitle] = useState<string>(initialTitle);
  const [recentEvents, setRecentEvents] = useState<CounterActionEvent[]>([]);

  // Synchronize count with the latest authenticated counter action in the activity log store when switching projects or receiving iframe updates
  useEffect(() => {
    if (typeof initialCount === 'number') return;
    const hydrated = parseLatestCounterValueFromLogs(activityLogs || [], projectId, activeUserId);
    if (hydrated !== null) {
      setCount(hydrated);
    }
  }, [activityLogs, projectId, activeUserId, initialCount]);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle, projectId]);

  // Count how many authenticated counter actions exist for this project & user in the workspace activity log store
  const persistedCounterActionCount = Array.isArray(activityLogs)
    ? activityLogs.filter(
        (e) =>
          e &&
          e.projectId === projectId &&
          (e.userId || 'admin-it') === activeUserId &&
          typeof e.instructionText === 'string' &&
          e.instructionText.startsWith('[CONTATORE]'),
      ).length
    : recentEvents.length;

  const commitCountChange = useCallback(
    (
      action: 'increment' | 'decrement' | 'reset',
      prevVal: number,
      nextVal: number,
      activeStep: number,
    ) => {
      const effectiveTitle = title.trim() || 'Contatore Interattivo Personalizzato';
      const timestamp = new Date().toISOString();
      const logText = formatCounterActivityMessage(
        action,
        prevVal,
        nextVal,
        activeStep,
        effectiveTitle,
      );

      let savedEntry: ActivityLogEntry | null | undefined;
      if (onLogCounterChange) {
        savedEntry = onLogCounterChange({
          projectId,
          action,
          previousValue: prevVal,
          newValue: nextVal,
          step: activeStep,
          title: effectiveTitle,
        });
      } else if (onLogActivity) {
        onLogActivity(projectId, logText);
      }

      const evt: CounterActionEvent = {
        action,
        previousValue: prevVal,
        newValue: nextVal,
        step: activeStep,
        title: effectiveTitle,
        userId: savedEntry?.userId || activeUserId,
        timestamp: savedEntry?.timestamp || timestamp,
        logText: savedEntry?.instructionText || logText,
        savedEntry,
      };

      setRecentEvents((prev) => [evt, ...prev].slice(0, 5));
      if (onActionRecorded) {
        onActionRecorded(evt);
      }
    },
    [projectId, title, activeUserId, onLogCounterChange, onLogActivity, onActionRecorded],
  );

  const handleIncrement = useCallback(() => {
    const prevVal = count;
    const nextVal = prevVal + step;
    setCount(nextVal);
    commitCountChange('increment', prevVal, nextVal, step);
  }, [count, step, commitCountChange]);

  const handleDecrement = useCallback(() => {
    const prevVal = count;
    const nextVal = prevVal - step;
    setCount(nextVal);
    commitCountChange('decrement', prevVal, nextVal, step);
  }, [count, step, commitCountChange]);

  const handleReset = useCallback(() => {
    const prevVal = count;
    const nextVal = 0;
    setCount(nextVal);
    commitCountChange('reset', prevVal, nextVal, step);
  }, [count, step, commitCountChange]);

  return (
    <section
      aria-label="Componente Contatore collegato al registro attività autenticato"
      className={`rounded-xl bg-surface-900/70 border border-surface-800/80 ${
        compact ? 'p-3.5 space-y-3' : 'p-5 space-y-4'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Contatore Interattivo · Azione Utente Autenticata</span>
          </div>
          <h3 className="text-sm font-semibold text-white truncate mt-0.5" data-testid="counter-title">
            {title.trim() || 'Contatore Interattivo Personalizzato'}
          </h3>
          {!compact && (
            <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{initialDescription}</p>
          )}
        </div>
        <span
          className="text-xl font-mono font-bold px-2.5 py-1 rounded-lg bg-surface-950 text-accent-300 border border-surface-800 tabular-nums"
          aria-live="polite"
          data-testid="counter-value"
        >
          {count}
        </span>
      </div>

      {/* Custom Title & Step Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="sm:col-span-2">
          <label
            htmlFor={`counter-title-input-${projectId}`}
            className="block text-[11px] font-medium text-surface-400 mb-1"
          >
            Titolo personalizzato
          </label>
          <input
            id={`counter-title-input-${projectId}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titolo del contatore..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-surface-950/80 border border-surface-700/70 text-xs text-white focus:outline-none focus:border-accent-500/50"
          />
        </div>
        <div>
          <label
            htmlFor={`counter-step-select-${projectId}`}
            className="block text-[11px] font-medium text-surface-400 mb-1"
          >
            Passo
          </label>
          <select
            id={`counter-step-select-${projectId}`}
            value={step}
            onChange={(e) => {
              const parsed = Number.parseInt(e.target.value, 10);
              setStep(Number.isNaN(parsed) || parsed < 1 ? 1 : parsed);
            }}
            className="w-full px-2 py-1.5 rounded-lg bg-surface-950/80 border border-surface-700/70 text-xs text-white focus:outline-none focus:border-accent-500/50"
          >
            <option value={1}>±1</option>
            <option value={5}>±5</option>
            <option value={10}>±10</option>
          </select>
        </div>
      </div>

      {/* Increment / Decrement / Reset Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleIncrement}
          data-testid="counter-increment-btn"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-accent-500 text-surface-950 hover:bg-accent-400 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Incrementa (+{step})</span>
        </button>
        <button
          type="button"
          onClick={handleDecrement}
          data-testid="counter-decrement-btn"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-white border border-surface-700 transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
          <span>Decrementa (-{step})</span>
        </button>
        <button
          type="button"
          onClick={handleReset}
          data-testid="counter-reset-btn"
          title="Azzera contatore"
          aria-label="Azzera contatore"
          className="inline-flex items-center justify-center px-2.5 py-2 rounded-lg text-xs font-medium bg-surface-800/70 hover:bg-surface-700/70 text-surface-300 hover:text-white border border-surface-700/60 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tracked Authenticated State Summary */}
      <div className="flex items-center justify-between text-[11px] text-surface-400 pt-1 border-t border-surface-800/60">
        <span className="inline-flex items-center gap-1">
          <History className="w-3 h-3 text-accent-400" />
          <span>Azioni contatore salvate: {persistedCounterActionCount}</span>
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-surface-300 truncate max-w-[190px]">
          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>
            {recentEvents[0]
              ? `${recentEvents[0].previousValue} → ${recentEvents[0].newValue}`
              : `Utente: ${activeUserId}`}
          </span>
        </span>
      </div>
    </section>
  );
}
