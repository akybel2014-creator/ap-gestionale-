import React from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  X,
  Plus,
  Search,
  Check,
} from 'lucide-react';
import { formattaDataItaliana, formattaEuro } from '@/data.js';
import type { PreventivoItem } from './HomeDashboard';

export interface FatturaItem {
  id: string;
  numero: string;
  clienteId: string;
  cliente: string;
  indirizzoCliente: string;
  pivaCliente: string;
  descrizione: string;
  importoImponibile: number;
  ivaPercentuale: number;
  importo: number;
  data: string;
  scadenza: string;
  mese: number;
  anno: number;
  stato: 'Pagata' | 'In attesa' | 'Scaduta';
  metodoPagamento: string;
}

interface GestioneFattureProps {
  fatture: FatturaItem[];
  preventivi: PreventivoItem[];
  onCambiaStatoFattura: (id: string, nuovoStato: FatturaItem['stato']) => void;
  onScaricaPdfFattura: (fattura: FatturaItem) => void;
  onApriNuovoPreventivo: () => void;
  onModificaPreventivo: (preventivo: PreventivoItem) => void;
  onEliminaPreventivo: (id: string) => void;
  onCambiaStatoPreventivo: (
    id: string,
    nuovoStato: PreventivoItem['stato'],
  ) => void;
}

const MESI_ITALIANI = [
  { valore: 'Tutti', label: 'Tutti i mesi' },
  { valore: '1', label: 'Gennaio' },
  { valore: '2', label: 'Febbraio' },
  { valore: '3', label: 'Marzo' },
  { valore: '4', label: 'Aprile' },
  { valore: '5', label: 'Maggio' },
  { valore: '6', label: 'Giugno' },
  { valore: '7', label: 'Luglio' },
  { valore: '8', label: 'Agosto' },
  { valore: '9', label: 'Settembre' },
  { valore: '10', label: 'Ottobre' },
  { valore: '11', label: 'Novembre' },
  { valore: '12', label: 'Dicembre' },
];

/**
 * PAGINA 4 — FATTURE (& Preventivi)
 * - Totali in alto: fatturato anno, da incassare, scaduto (cliccabili per filtrare)
 * - Lista fatture con: numero, cliente, importo, data, stato + pulsanti rapidi "Segna Pagata" e "PDF"
 * - Stati: Pagata (verde), In attesa (giallo), Scaduta (rosso)
 * - Filtri: ricerca testo, mese, anno, stato
 * - Click su fattura → dettaglio con pulsante "Scarica PDF"
 */
export default function GestioneFatture({
  fatture,
  preventivi,
  onCambiaStatoFattura,
  onScaricaPdfFattura,
  onApriNuovoPreventivo,
  onModificaPreventivo,
  onEliminaPreventivo,
  onCambiaStatoPreventivo,
}: GestioneFattureProps) {
  const [ricercaFattura, setRicercaFattura] = React.useState<string>('');
  const [filtroMese, setFiltroMese] = React.useState<string>('Tutti');
  const [filtroAnno, setFiltroAnno] = React.useState<string>('2026');
  const [filtroStato, setFiltroStato] = React.useState<string>('Tutti');
  const [fatturaSelezionata, setFatturaSelezionata] =
    React.useState<FatturaItem | null>(null);

  // Calcolo totali in alto: Fatturato anno, Da incassare, Scaduto
  const riepilogoTotali = React.useMemo(() => {
    const fattureAnno = fatture.filter(
      (f) => filtroAnno === 'Tutti' || String(f.anno) === filtroAnno,
    );
    const fatturatoAnno = fattureAnno.reduce((s, f) => s + f.importo, 0);
    const daIncassare = fattureAnno
      .filter((f) => f.stato === 'In attesa')
      .reduce((s, f) => s + f.importo, 0);
    const scaduto = fattureAnno
      .filter((f) => f.stato === 'Scaduta')
      .reduce((s, f) => s + f.importo, 0);

    return { fatturatoAnno, daIncassare, scaduto };
  }, [fatture, filtroAnno]);

  // Lista fatture filtrata per ricerca, mese, anno e stato
  const fattureFiltrate = React.useMemo(() => {
    const q = ricercaFattura.trim().toLowerCase();
    return fatture.filter((f) => {
      const matchMese =
        filtroMese === 'Tutti' || String(f.mese) === filtroMese;
      const matchAnno =
        filtroAnno === 'Tutti' || String(f.anno) === filtroAnno;
      const matchStato =
        filtroStato === 'Tutti' || f.stato === filtroStato;
      const matchRicerca =
        !q ||
        f.numero.toLowerCase().includes(q) ||
        f.cliente.toLowerCase().includes(q) ||
        f.descrizione.toLowerCase().includes(q);
      return matchMese && matchAnno && matchStato && matchRicerca;
    });
  }, [fatture, filtroMese, filtroAnno, filtroStato, ricercaFattura]);

  // Renderizza stato con icona e colore: Pagata (verde), In attesa (giallo), Scaduta (rosso)
  const renderBadgeStatoFattura = (stato: FatturaItem['stato']) => {
    if (stato === 'Pagata') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/35">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Pagata</span>
        </span>
      );
    }
    if (stato === 'Scaduta') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/35">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Scaduta</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/35">
        <Clock className="w-3.5 h-3.5" />
        <span>In attesa</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* =====================================================================
          1. TOTALI IN ALTO: FATTURATO ANNO, DA INCASSARE, SCADUTO (Cliccabili per filtro rapido)
         ===================================================================== */}
      <section aria-label="Totali fatturazione">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setFiltroStato('Tutti')}
            className={`text-left bg-[#1a2332] border border-t-4 border-t-[#10b981] rounded-2xl p-4 sm:p-5 shadow-md transition-all ${
              filtroStato === 'Tutti'
                ? 'border-[#10b981]/60'
                : 'border-[#2a3a4f] hover:border-[#10b981]/40'
            }`}
          >
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#94a3b8]">
              Fatturato Anno ({filtroAnno})
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#f1f5f9] mt-2 font-mono tabular-nums">
              {formattaEuro(riepilogoTotali.fatturatoAnno)}
            </p>
            <span className="text-xs text-[#10b981] mt-1 font-semibold block">
              {fatture.filter((f) => f.stato === 'Pagata').length} fatture saldate · Mostra tutte
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroStato((prev) =>
                prev === 'In attesa' ? 'Tutti' : 'In attesa',
              )
            }
            className={`text-left bg-[#1a2332] border border-t-4 border-t-[#f59e0b] rounded-2xl p-4 sm:p-5 shadow-md transition-all ${
              filtroStato === 'In attesa'
                ? 'border-[#f59e0b]'
                : 'border-[#2a3a4f] hover:border-[#f59e0b]/40'
            }`}
          >
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#94a3b8]">
              Da Incassare (In attesa)
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#f59e0b] mt-2 font-mono tabular-nums">
              {formattaEuro(riepilogoTotali.daIncassare)}
            </p>
            <span className="text-xs text-[#94a3b8] mt-1 font-semibold block">
              {fatture.filter((f) => f.stato === 'In attesa').length} fatture in scadenza · Filtra
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setFiltroStato((prev) =>
                prev === 'Scaduta' ? 'Tutti' : 'Scaduta',
              )
            }
            className={`text-left bg-[#1a2332] border border-t-4 border-t-[#ef4444] rounded-2xl p-4 sm:p-5 shadow-md transition-all ${
              filtroStato === 'Scaduta'
                ? 'border-[#ef4444]'
                : 'border-[#2a3a4f] hover:border-[#ef4444]/40'
            }`}
          >
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#94a3b8]">
              Scaduto da Sollecitare
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-[#ef4444] mt-2 font-mono tabular-nums">
              {formattaEuro(riepilogoTotali.scaduto)}
            </p>
            <span className="text-xs text-[#ef4444] mt-1 font-semibold block">
              {fatture.filter((f) => f.stato === 'Scaduta').length} fatture oltre termine · Filtra
            </span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          2. BARRA FILTRI: RICERCA, MESE, ANNO, STATO
         ===================================================================== */}
      <section className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#f59e0b]" />
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-[#f1f5f9]">
                Elenco Fatture Emesse ({fattureFiltrate.length})
              </h1>
              <p className="text-xs text-[#94a3b8]">
                Clicca su una fattura per il dettaglio, registra l’incasso in un tap o scarica il PDF
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#94a3b8]">
              <Filter className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Filtri:</span>
            </div>

            {/* Filtro Mese */}
            <select
              value={filtroMese}
              onChange={(e) => setFiltroMese(e.target.value)}
              aria-label="Filtra per mese"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0f1720] text-[#f1f5f9] border border-[#2a3a4f] focus:border-[#f59e0b] focus:outline-none min-h-[38px]"
            >
              {MESI_ITALIANI.map((m) => (
                <option key={m.valore} value={m.valore}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Filtro Anno */}
            <select
              value={filtroAnno}
              onChange={(e) => setFiltroAnno(e.target.value)}
              aria-label="Filtra per anno"
              className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0f1720] text-[#f1f5f9] border border-[#2a3a4f] focus:border-[#f59e0b] focus:outline-none min-h-[38px]"
            >
              <option value="2026">Anno 2026</option>
              <option value="2025">Anno 2025</option>
              <option value="Tutti">Tutti gli anni</option>
            </select>

            {/* Filtro Stato */}
            <div className="flex flex-wrap items-center gap-1 bg-[#0f1720] p-1 rounded-xl border border-[#2a3a4f]">
              {(['Tutti', 'Pagata', 'In attesa', 'Scaduta'] as const).map(
                (statoOpt) => (
                  <button
                    key={statoOpt}
                    type="button"
                    onClick={() => setFiltroStato(statoOpt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                      filtroStato === statoOpt
                        ? 'bg-[#f59e0b] text-[#0f1720]'
                        : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                    }`}
                  >
                    {statoOpt}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Barra di ricerca rapida fattura per numero o cliente */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={ricercaFattura}
            onChange={(e) => setRicercaFattura(e.target.value)}
            placeholder="Cerca fattura per numero (es. FT-2026/089), cliente o descrizione lavori..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] focus:border-[#f59e0b] focus:outline-none text-xs sm:text-sm text-[#f1f5f9] placeholder-[#94a3b8]/70"
          />
          {ricercaFattura && (
            <button
              type="button"
              onClick={() => setRicercaFattura('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f1f5f9]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* =====================================================================
          3. LISTA FATTURE (numero, cliente, importo, data, stato + azioni rapide)
         ===================================================================== */}
      {fattureFiltrate.length === 0 ? (
        <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-8 text-center space-y-2">
          <p className="text-base font-bold text-[#f1f5f9]">
            Nessuna fattura corrisponde ai filtri selezionati
          </p>
          <button
            type="button"
            onClick={() => {
              setRicercaFattura('');
              setFiltroMese('Tutti');
              setFiltroAnno('2026');
              setFiltroStato('Tutti');
            }}
            className="text-xs font-bold text-[#f59e0b] hover:underline"
          >
            Reimposta tutti i filtri
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {fattureFiltrate.map((fattura) => (
            <div
              key={fattura.id}
              onClick={() => setFatturaSelezionata(fattura)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setFatturaSelezionata(fattura);
                }
              }}
              className="bg-[#1a2332] border border-[#2a3a4f] hover:border-[#f59e0b] rounded-2xl p-4 sm:p-5 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs sm:text-sm font-mono font-extrabold text-[#f59e0b] tabular-nums">
                    {fattura.numero}
                  </span>
                  <span className="text-xs text-[#94a3b8]">·</span>
                  <span className="text-xs text-[#94a3b8] tabular-nums">
                    Data: {formattaDataItaliana(fattura.data)}
                  </span>
                  <span className="text-xs text-[#94a3b8]">·</span>
                  <span className="text-xs text-[#94a3b8] tabular-nums">
                    Scad.: {formattaDataItaliana(fattura.scadenza)}
                  </span>
                </div>

                <h2 className="text-base font-extrabold text-[#f1f5f9] truncate">
                  {fattura.cliente}
                </h2>
                <p className="text-xs text-[#94a3b8] line-clamp-1">
                  {fattura.descrizione}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#2a3a4f] shrink-0">
                <div className="text-left lg:text-right mr-1">
                  <span className="block text-lg font-mono font-extrabold text-[#f1f5f9] tabular-nums">
                    {formattaEuro(fattura.importo, true)}
                  </span>
                  <span className="block text-[11px] text-[#94a3b8]">
                    IVA {fattura.ivaPercentuale}% incl.
                  </span>
                </div>

                {renderBadgeStatoFattura(fattura.stato)}

                {/* Pulsanti azione rapida visibili direttamente sulla riga */}
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {fattura.stato !== 'Pagata' && (
                    <button
                      type="button"
                      onClick={() => onCambiaStatoFattura(fattura.id, 'Pagata')}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981] text-[#10b981] hover:text-[#0f1720] border border-[#10b981]/35 text-xs font-bold transition-colors min-h-[36px]"
                      title="Registra incasso fattura"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Incassa</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onScaricaPdfFattura(fattura)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#0f1720] hover:bg-[#f59e0b]/20 text-[#f1f5f9] hover:text-[#f59e0b] border border-[#2a3a4f] text-xs font-bold transition-colors min-h-[36px]"
                    title="Scarica fattura in PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-[#f59e0b]" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =====================================================================
          4. SEZIONE PREVENTIVI IN CORSO (CRUD Completo Preventivi)
         ===================================================================== */}
      <section className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9]">
              Preventivi & Offerte Tecniche ({preventivi.length})
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Gestisci lo stato dei preventivi inviati ai clienti di Vicenza e provincia
            </p>
          </div>

          <button
            type="button"
            onClick={onApriNuovoPreventivo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-xs transition-colors self-start sm:self-auto min-h-[38px]"
          >
            <Plus className="w-4 h-4" />
            <span>Nuovo preventivo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {preventivi.map((prev) => (
            <div
              key={prev.id}
              className="p-4 rounded-xl bg-[#0f1720] border border-[#2a3a4f] flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-[#f59e0b] font-bold">
                    {prev.numero} · {prev.tipo}
                  </span>
                  <span className="text-sm font-mono font-extrabold text-[#f1f5f9] tabular-nums">
                    {formattaEuro(prev.importo)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#f1f5f9] mt-1">
                  {prev.clienteNome} — {prev.titolo}
                </h3>
                <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">
                  {prev.descrizione}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[#2a3a4f]">
                <div className="flex flex-wrap items-center gap-1">
                  {(['In attesa', 'Accettato', 'Rifiutato'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onCambiaStatoPreventivo(prev.id, st)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                          prev.stato === st
                            ? st === 'Accettato'
                              ? 'bg-[#10b981] text-[#0f1720]'
                              : st === 'Rifiutato'
                                ? 'bg-[#ef4444] text-white'
                                : 'bg-[#f59e0b] text-[#0f1720]'
                            : 'bg-[#1a2332] text-[#94a3b8] hover:text-[#f1f5f9]'
                        }`}
                      >
                        {st}
                      </button>
                    ),
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onModificaPreventivo(prev)}
                    className="text-[#94a3b8] hover:text-[#f59e0b] font-semibold"
                  >
                    Modifica
                  </button>
                  <button
                    type="button"
                    onClick={() => onEliminaPreventivo(prev.id)}
                    className="text-[#94a3b8] hover:text-[#ef4444] font-semibold"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================================
          MODALE DETTAGLIO FATTURA CON PULSANTE "SCARICA PDF"
         ===================================================================== */}
      {fatturaSelezionata && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setFatturaSelezionata(null)}
        >
          <div
            className="bg-[#1a2332] border border-[#2a3a4f] rounded-t-3xl sm:rounded-2xl w-full max-w-xl p-5 sm:p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2a3a4f]">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-mono font-bold text-[#f59e0b]">
                  FATTURA ELETTRONICA · {fatturaSelezionata.numero}
                </span>
                <h2 className="text-xl font-bold text-[#f1f5f9] mt-0.5 break-words">
                  {fatturaSelezionata.cliente}
                </h2>
                <p className="text-xs text-[#94a3b8] mt-0.5 break-words">
                  {fatturaSelezionata.indirizzoCliente} · P.IVA / CF:{' '}
                  {fatturaSelezionata.pivaCliente}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFatturaSelezionata(null)}
                className="p-2 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]"
                aria-label="Chiudi dettaglio fattura"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Riepilogo Importi e Descrizione Lavori */}
            <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-xs text-[#94a3b8] block">
                  Oggetto della fornitura / intervento
                </span>
                <p className="text-[#f1f5f9] font-medium mt-0.5 leading-relaxed">
                  {fatturaSelezionata.descrizione}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2a3a4f]">
                <div>
                  <span className="text-xs text-[#94a3b8] block">
                    Data Emissione
                  </span>
                  <span className="text-[#f1f5f9] font-semibold tabular-nums">
                    {formattaDataItaliana(fatturaSelezionata.data)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#94a3b8] block">
                    Data Scadenza
                  </span>
                  <span className="text-[#f1f5f9] font-semibold tabular-nums">
                    {formattaDataItaliana(fatturaSelezionata.scadenza)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#94a3b8] block">
                    Imponibile
                  </span>
                  <span className="text-[#f1f5f9] font-mono tabular-nums">
                    {formattaEuro(fatturaSelezionata.importoImponibile, true)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-[#94a3b8] block">
                    IVA ({fatturaSelezionata.ivaPercentuale}%)
                  </span>
                  <span className="text-[#f1f5f9] font-mono tabular-nums">
                    {formattaEuro(
                      fatturaSelezionata.importo -
                        fatturaSelezionata.importoImponibile,
                      true,
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#2a3a4f] flex items-center justify-between">
                <span className="text-sm font-bold text-[#f1f5f9]">
                  Totale Fattura
                </span>
                <span className="text-xl font-mono font-bold text-[#f59e0b] tabular-nums">
                  {formattaEuro(fatturaSelezionata.importo, true)}
                </span>
              </div>
            </div>

            {/* Cambio rapido stato pagamento */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-[#94a3b8]">
                Aggiorna stato pagamento:
              </span>
              <div className="flex items-center gap-1.5">
                {(['Pagata', 'In attesa', 'Scaduta'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      onCambiaStatoFattura(fatturaSelezionata.id, st);
                      setFatturaSelezionata({
                        ...fatturaSelezionata,
                        stato: st,
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      fatturaSelezionata.stato === st
                        ? st === 'Pagata'
                          ? 'bg-[#10b981] text-[#0f1720]'
                          : st === 'Scaduta'
                            ? 'bg-[#ef4444] text-white'
                            : 'bg-[#f59e0b] text-[#0f1720]'
                        : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Pulsante primario: Scarica PDF */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => onScaricaPdfFattura(fatturaSelezionata)}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-sm transition-colors shadow-lg min-h-[46px]"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Scarica PDF ({fatturaSelezionata.numero})</span>
              </button>
              <button
                type="button"
                onClick={() => setFatturaSelezionata(null)}
                className="py-3 px-5 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] font-semibold text-sm min-h-[46px]"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
