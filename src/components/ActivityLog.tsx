import { useState, useMemo } from 'react';
import type { ActivityLogEntry, ActivityStatus, ActivityLogFilter } from '@/types';
import { isExportActivityEntry } from '@/lib/storage';
import {
  History,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Download,
  GitCommit,
  ShieldCheck,
} from 'lucide-react';

interface ActivityLogProps {
  projectId: string;
  projectName: string;
  entries: ActivityLogEntry[];
  activeFilter?: ActivityLogFilter;
  totalProjectEntriesCount?: number;
  onResetFilter?: () => void;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

const LONG_INSTRUCTION_THRESHOLD = 140;

const STATUS_META: Record<
  ActivityStatus,
  {
    label: string;
    textClass: string;
    icon: typeof CheckCircle2;
  }
> = {
  recorded: {
    label: 'Registrata',
    textClass: 'text-accent-400',
    icon: CheckCircle2,
  },
  generating: {
    label: 'In generazione',
    textClass: 'text-amber-400',
    icon: Loader2,
  },
  generated: {
    label: 'Completata',
    textClass: 'text-emerald-400',
    icon: CheckCircle2,
  },
  exported: {
    label: 'Esportato',
    textClass: 'text-cyan-400',
    icon: Download,
  },
  error: {
    label: 'Errore',
    textClass: 'text-red-400',
    icon: AlertCircle,
  },
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ActivityLog({
  projectId,
  projectName,
  entries,
  activeFilter = 'ALL',
  totalProjectEntriesCount,
  onResetFilter,
  loading = false,
  error = null,
  compact = false,
}: ActivityLogProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Filter strictly for the authorized project and sort newest first
  const projectEntries = useMemo(() => {
    return entries
      .filter((e) => {
        if (!e || e.projectId !== projectId) return false;
        if (typeof e.instructionText !== 'string' || e.instructionText.trim().length === 0) {
          return false;
        }
        if (activeFilter === 'EXPORT') {
          return isExportActivityEntry(e);
        }
        if (activeFilter === 'INSTRUCTION') {
          return !isExportActivityEntry(e);
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries, projectId, activeFilter]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const hasUnfilteredEntries =
    typeof totalProjectEntriesCount === 'number'
      ? totalProjectEntriesCount > 0
      : projectEntries.length > 0;

  return (
    <section
      aria-labelledby={`activity-log-heading-${projectId}`}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          id={`activity-log-heading-${projectId}`}
          className="text-xs font-semibold text-surface-400 uppercase tracking-wider flex items-center gap-1.5"
        >
          <History className="w-3.5 h-3.5 text-accent-400" />
          <span>Cronologia attività ({projectEntries.length})</span>
        </h3>
        <span className="text-[11px] text-surface-500">Più recenti in alto</span>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-300"
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-xs text-surface-400">
          <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
          <span>Caricamento cronologia attività...</span>
        </div>
      ) : projectEntries.length === 0 ? (
        <div className="text-center py-8 px-3 rounded-xl border border-dashed border-surface-800/80 bg-surface-900/30">
          {activeFilter !== 'ALL' && hasUnfilteredEntries ? (
            <>
              <p className="text-sm font-medium text-surface-400">
                {activeFilter === 'INSTRUCTION'
                  ? 'Nessuna istruzione registrata per questo filtro'
                  : 'Nessuna esportazione registrata per questo filtro'}
              </p>
              <p className="text-xs text-surface-600 mt-1 leading-relaxed">
                {activeFilter === 'INSTRUCTION'
                  ? 'Non sono presenti voci di tipo INSTRUCTION in questo progetto.'
                  : 'Non sono presenti voci di tipo EXPORT o EXPORT_PROJECT in questo progetto.'}
              </p>
              {onResetFilter && (
                <button
                  type="button"
                  onClick={onResetFilter}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800/80 text-accent-300 hover:text-white hover:bg-surface-700/80 border border-surface-700/60 transition-colors"
                >
                  Mostra tutte le attività
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-surface-400">
                Nessuna attività registrata per questo progetto
              </p>
              <p className="text-xs text-surface-600 mt-1 leading-relaxed">
                Invia un&apos;istruzione o esporta il progetto per registrare l&apos;operazione nella cronologia.
              </p>
            </>
          )}
        </div>
      ) : (
        <ol
          className={`space-y-2.5 ${compact ? '' : 'pr-0.5'}`}
          aria-label={`Elenco attività per il progetto ${projectName}`}
        >
          {projectEntries.map((entry, idx) => {
            const isExport = isExportActivityEntry(entry);
            const isLong = entry.instructionText.length > LONG_INSTRUCTION_THRESHOLD;
            const isExpanded = Boolean(expandedIds[entry.id]);
            const displayedText =
              isLong && !isExpanded
                ? `${entry.instructionText.slice(0, LONG_INSTRUCTION_THRESHOLD).trim()}…`
                : entry.instructionText;
            const statusCfg = STATUS_META[entry.status] || STATUS_META.recorded;
            const StatusIcon = statusCfg.icon;
            const sequenceNumber = projectEntries.length - idx;

            return (
              <li
                key={entry.id}
                className={`p-3.5 rounded-xl border transition-colors space-y-2 ${
                  isExport
                    ? 'bg-cyan-950/20 border-cyan-500/25 hover:border-cyan-500/40'
                    : 'bg-surface-900/70 border-surface-800/80 hover:border-surface-700/80'
                }`}
              >
                {/* Top metadata row: sequence, project name, status */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0 text-surface-400">
                    <span className="font-mono font-semibold text-accent-400">
                      #{sequenceNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <FolderKanban className="w-3 h-3 text-surface-500 flex-shrink-0" />
                    <span className="truncate font-medium text-surface-300">
                      {entry.projectName || projectName}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 font-medium flex-shrink-0 ${statusCfg.textClass}`}
                  >
                    <StatusIcon
                      className={`w-3 h-3 ${
                        entry.status === 'generating' ? 'animate-spin' : ''
                      }`}
                    />
                    <span>{statusCfg.label}</span>
                  </span>
                </div>

                {/* Operation type & Code Version Reference for Export Project operations */}
                {(isExport || entry.codeVersion) && (
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 text-[11px]">
                    {isExport && (
                      <span className="inline-flex items-center gap-1 font-semibold text-cyan-300 uppercase tracking-wide">
                        <Download className="w-3 h-3" />
                        <span>Esporta progetto</span>
                      </span>
                    )}
                    {entry.codeVersion && (
                      <span
                        className="inline-flex items-center gap-1 font-mono text-surface-300 bg-surface-800/80 border border-surface-700/70 px-1.5 py-0.5 rounded"
                        title="Riferimento versione codice generato (contenuto sorgente omesso)"
                      >
                        <GitCommit className="w-3 h-3 text-accent-400" />
                        <span>Versione: {entry.codeVersion}</span>
                      </span>
                    )}
                  </div>
                )}

                {/* Instruction / Activity text (expandable/collapsible if long, never exposes raw source code) */}
                <div className="text-sm text-surface-100 leading-relaxed whitespace-pre-wrap break-words">
                  {displayedText}
                </div>

                {isExport && (
                  <div className="flex items-center gap-1.5 text-[11px] text-surface-400 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>
                      Riferimento versione registrato senza esporre il codice sorgente nel log.
                    </span>
                  </div>
                )}

                {/* Bottom row: timestamp and expand/collapse toggle */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs text-surface-500">
                  <time
                    dateTime={entry.timestamp}
                    className="inline-flex items-center gap-1 font-mono text-[11px]"
                  >
                    <Clock className="w-3 h-3 text-surface-500" />
                    <span>{formatDateTime(entry.timestamp)}</span>
                  </time>

                  {isLong && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(entry.id)}
                      aria-expanded={isExpanded}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent-400 hover:text-accent-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 rounded px-1.5 py-0.5 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <span>Comprimi testo</span>
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          <span>Mostra tutto ({entry.instructionText.length} car.)</span>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
