import React from 'react';
import {
  Activity,
  CheckCircle2,
  Zap,
  Clock,
  Eye,
  MapPin,
  Wrench,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { formattaEuro, formattaDataItaliana } from '@/data.js';
import type { InterventoItem } from './HomeDashboard';
import type { AvvisoItem } from './HeaderENavigazione';
import type { NotaCantiereItem } from './NoteRapideCantiere';

interface FeedAttivitaTempoRealeProps {
  interventi: InterventoItem[];
  avvisi: AvvisoItem[];
  noteCantiere: NotaCantiereItem[];
  onApriDettaglioIntervento: (intervento: InterventoItem) => void;
  onCambiaStatoIntervento: (
    id: string,
    nuovoStato: InterventoItem['stato'],
  ) => void;
}

type CategoriaFeed = 'tutti' | 'completati' | 'urgenti';

interface EventoFeed {
  id: string;
  categoria: 'completato' | 'urgente';
  titolo: string;
  sottotitolo: string;
  tecnico?: string;
  indirizzo?: string;
  orarioLabel: string;
  importo?: number;
  tipoImpianto?: string;
  priorita?: InterventoItem['priorita'];
  statoAttuale?: InterventoItem['stato'];
  interventoOriginale?: InterventoItem;
  sortWeight: number;
}

/**
 * FEED ATTIVITÀ IN TEMPO REALE (Dashboard Cantiere)
 * Mostra gli interventi completati più recenti e i cambi di stato / segnalazioni urgenti
 * derivati in tempo reale dallo stato esistente dell'applicazione (interventi, avvisi, note).
 */
export default function FeedAttivitaTempoReale({
  interventi,
  avvisi,
  noteCantiere,
  onApriDettaglioIntervento,
  onCambiaStatoIntervento,
}: FeedAttivitaTempoRealeProps) {
  const [filtroFeed, setFiltroFeed] = React.useState<CategoriaFeed>('tutti');

  // Costruisce in tempo reale il flusso di eventi partendo dallo stato corrente
  const eventiFeed = React.useMemo<EventoFeed[]>(() => {
    const lista: EventoFeed[] = [];

    // 1. Interventi Completati e Cambi di Stato Urgenti / In Corso dallo stato interventi
    interventi.forEach((intv, idx) => {
      if (intv.stato === 'Completato') {
        lista.push({
          id: `feed-comp-${intv.id}`,
          categoria: 'completato',
          titolo: intv.titolo,
          sottotitolo: `Intervento completato con collaudo · ${intv.descrizione}`,
          tecnico: intv.tecnico,
          indirizzo: intv.indirizzo,
          orarioLabel: `${formattaDataItaliana(intv.data)} · ${intv.oraFine || intv.oraInizio}`,
          importo: intv.importoStimato,
          tipoImpianto: intv.tipo,
          priorita: intv.priorita,
          statoAttuale: intv.stato,
          interventoOriginale: intv,
          sortWeight: 100 - idx,
        });
      } else if (
        intv.stato === 'In corso' ||
        intv.priorita === 'Alta'
      ) {
        const isInCorso = intv.stato === 'In corso';
        lista.push({
          id: `feed-urg-${intv.id}`,
          categoria: 'urgente',
          titolo: intv.titolo,
          sottotitolo: isInCorso
            ? `Cambio stato → IN CORSO (${intv.priorita === 'Alta' ? 'Priorità Alta' : 'Squadra operativa in cantiere'})`
            : `Intervento ad Alta Priorità programmato · ${intv.descrizione}`,
          tecnico: intv.tecnico,
          indirizzo: intv.indirizzo,
          orarioLabel: `${formattaDataItaliana(intv.data)} · ${intv.oraInizio}`,
          importo: intv.importoStimato,
          tipoImpianto: intv.tipo,
          priorita: intv.priorita,
          statoAttuale: intv.stato,
          interventoOriginale: intv,
          sortWeight: isInCorso ? 120 - idx : 85 - idx,
        });
      }
    });

    // 2. Avvisi di cambio stato / urgenze registrati in tempo reale
    avvisi.forEach((avv, idx) => {
      if (
        avv.tipo === 'urgenza' ||
        avv.id.startsWith('avv-push-')
      ) {
        lista.push({
          id: `feed-avv-${avv.id}`,
          categoria: avv.titolo.toLowerCase().includes('completato')
            ? 'completato'
            : 'urgente',
          titolo: avv.titolo,
          sottotitolo: avv.descrizione,
          orarioLabel: avv.data,
          sortWeight: avv.id.startsWith('avv-push-') ? 150 - idx : 75 - idx,
        });
      }
    });

    // 3. Note di cantiere contrassegnate come Urgenti
    noteCantiere
      .filter((n) => n.importante)
      .forEach((nota, idx) => {
        lista.push({
          id: `feed-nota-${nota.id}`,
          categoria: 'urgente',
          titolo: `Nota Urgente di Cantiere — ${nota.autore}`,
          sottotitolo: nota.testo,
          tecnico: nota.autore,
          orarioLabel: `Oggi · ${nota.orario}`,
          sortWeight: 110 - idx,
        });
      });

    return lista.sort((a, b) => b.sortWeight - a.sortWeight);
  }, [interventi, avvisi, noteCantiere]);

  const eventiFiltrati = React.useMemo(() => {
    if (filtroFeed === 'completati') {
      return eventiFeed.filter((e) => e.categoria === 'completato');
    }
    if (filtroFeed === 'urgenti') {
      return eventiFeed.filter((e) => e.categoria === 'urgente');
    }
    return eventiFeed;
  }, [eventiFeed, filtroFeed]);

  const countCompletati = React.useMemo(
    () => eventiFeed.filter((e) => e.categoria === 'completato').length,
    [eventiFeed],
  );
  const countUrgenti = React.useMemo(
    () => eventiFeed.filter((e) => e.categoria === 'urgente').length,
    [eventiFeed],
  );

  return (
    <section
      aria-labelledby="heading-feed-tempo-reale"
      className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-4"
    >
      {/* Intestazione + Indicatore Live + Filtri Rapidi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a3a4f]">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Activity className="w-5 h-5 text-[#f59e0b]" />
            <h2
              id="heading-feed-tempo-reale"
              className="text-base sm:text-lg font-extrabold text-[#f1f5f9]"
            >
              Feed Attività in Tempo Reale
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10b981]/15 border border-[#10b981]/35 text-[11px] font-bold text-[#10b981]">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Live Cantiere</span>
            </span>
          </div>
          <p className="text-xs text-[#94a3b8]">
            Ultimi interventi completati, avanzamenti in corso e cambi di stato
            urgenti della squadra
          </p>
        </div>

        {/* Filtri categoria feed */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#0f1720] border border-[#2a3a4f] p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFiltroFeed('tutti')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filtroFeed === 'tutti'
                ? 'bg-[#f59e0b] text-[#0f1720]'
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            Tutti ({eventiFeed.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroFeed('completati')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              filtroFeed === 'completati'
                ? 'bg-[#10b981] text-[#0f1720]'
                : 'text-[#94a3b8] hover:text-[#10b981]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completati ({countCompletati})</span>
          </button>
          <button
            type="button"
            onClick={() => setFiltroFeed('urgenti')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
              filtroFeed === 'urgenti'
                ? 'bg-[#f59e0b] text-[#0f1720]'
                : 'text-[#94a3b8] hover:text-[#f59e0b]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Stati Urgenti / In Corso ({countUrgenti})</span>
          </button>
        </div>
      </div>

      {/* Timeline degli Eventi */}
      {eventiFiltrati.length === 0 ? (
        <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-6 text-center text-xs text-[#94a3b8]">
          Nessuna attività registrata per il filtro selezionato.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {eventiFiltrati.slice(0, 8).map((ev) => {
            const isCompletato = ev.categoria === 'completato';
            return (
              <article
                key={ev.id}
                className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between gap-3 ${
                  isCompletato
                    ? 'bg-[#0f1720] border-[#10b981]/40 hover:border-[#10b981]'
                    : 'bg-[#0f1720] border-[#f59e0b]/45 hover:border-[#f59e0b]'
                }`}
              >
                <div className="space-y-2">
                  {/* Riga badge + orario */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider border ${
                        isCompletato
                          ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/35'
                          : 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/35'
                      }`}
                    >
                      {isCompletato ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Intervento Completato</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>
                            {ev.statoAttuale === 'In corso'
                              ? 'In Corso · Cambio Stato'
                              : 'Urgenza / Alta Priorità'}
                          </span>
                        </>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#94a3b8] tabular-nums">
                      <Clock className="w-3 h-3 text-[#f59e0b]" />
                      <span>{ev.orarioLabel}</span>
                    </span>
                  </div>

                  {/* Titolo e descrizione */}
                  <div>
                    <h3 className="text-sm font-bold text-[#f1f5f9] leading-snug">
                      {ev.titolo}
                    </h3>
                    <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2 leading-relaxed">
                      {ev.sottotitolo}
                    </p>
                  </div>
                </div>

                {/* Footer con tecnico, importo e azioni rapide */}
                <div className="pt-2.5 border-t border-[#2a3a4f]/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[#94a3b8]">
                    {ev.tecnico && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#f1f5f9]">
                        <span>👷 {ev.tecnico}</span>
                      </span>
                    )}
                    {ev.tipoImpianto && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1a2332] border border-[#2a3a4f] text-[11px] text-sky-400">
                        <Wrench className="w-3 h-3" />
                        <span>{ev.tipoImpianto}</span>
                      </span>
                    )}
                    {ev.indirizzo && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#94a3b8] truncate max-w-[180px]">
                        <MapPin className="w-3 h-3 text-[#f59e0b] shrink-0" />
                        <span className="truncate">{ev.indirizzo}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {typeof ev.importo === 'number' && ev.importo > 0 && (
                      <span className="font-mono font-extrabold text-[#10b981] tabular-nums mr-1">
                        {formattaEuro(ev.importo)}
                      </span>
                    )}

                    {ev.interventoOriginale &&
                      ev.interventoOriginale.stato !== 'Completato' && (
                        <button
                          type="button"
                          onClick={() =>
                            onCambiaStatoIntervento(
                              ev.interventoOriginale!.id,
                              ev.interventoOriginale!.stato === 'Programmato'
                                ? 'In corso'
                                : 'Completato',
                            )
                          }
                          className="px-2.5 py-1 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981] text-[#10b981] hover:text-[#0f1720] border border-[#10b981]/40 text-[11px] font-bold transition-colors"
                        >
                          {ev.interventoOriginale.stato === 'Programmato'
                            ? '▶ Avvia'
                            : '✓ Completa'}
                        </button>
                      )}

                    {ev.interventoOriginale && (
                      <button
                        type="button"
                        onClick={() =>
                          onApriDettaglioIntervento(ev.interventoOriginale!)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1a2332] hover:bg-[#2a3a4f] text-[#f1f5f9] border border-[#2a3a4f] text-[11px] font-bold transition-colors"
                      >
                        <Eye className="w-3 h-3 text-[#f59e0b]" />
                        <span>Dettagli</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
