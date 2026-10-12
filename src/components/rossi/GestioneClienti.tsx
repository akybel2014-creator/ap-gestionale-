import React from 'react';
import {
  Search,
  UserPlus,
  Phone,
  Mail,
  MapPin,
  Wrench,
  FileText,
  Edit3,
  Trash2,
  X,
  Plus,
  CheckCircle2,
  Clock,
  Save,
  Filter,
  CalendarClock,
} from 'lucide-react';
import {
  formattaDataItaliana,
  formattaEuro,
  calcolaStatoManutenzione,
  getSettimanaCorrente,
} from '@/data.js';
import type { InterventoItem, PreventivoItem } from './HomeDashboard';
import type { ManutenzioneProgrammataItem } from './GestioneManutenzioni';

export interface ClienteItem {
  id: string;
  nome: string;
  telefono: string;
  cellulare?: string;
  email: string;
  indirizzo: string;
  piva: string;
  codiceFiscale?: string;
  tipo: string;
  ultimoIntervento: string;
  dataUltimoIntervento: string;
  fatturatoTotale: number;
  note: string;
}

interface GestioneClientiProps {
  clienti: ClienteItem[];
  interventi: InterventoItem[];
  preventivi: PreventivoItem[];
  manutenzioni?: ManutenzioneProgrammataItem[];
  onApriNuovoCliente: () => void;
  onModificaCliente: (cliente: ClienteItem) => void;
  onEliminaCliente: (id: string) => void;
  onAggiornaNoteCliente: (id: string, nuoveNote: string) => void;
  onApriNuovoInterventoPerCliente: (clienteId: string) => void;
  onApriNuovoPreventivoPerCliente: (clienteId: string) => void;
  onModificaPreventivo: (preventivo: PreventivoItem) => void;
  onEliminaPreventivo: (id: string) => void;
  onCambiaStatoPreventivo: (
    id: string,
    nuovoStato: PreventivoItem['stato'],
  ) => void;
  onApriDettaglioIntervento: (intervento: InterventoItem) => void;
  onChiamaCliente: (telefono: string, nome: string) => void;
  onApriNuovaManutenzionePerCliente?: (clienteId: string) => void;
}

const CATEGORIE_CLIENTI = [
  'Tutti',
  'Privato Residenziale',
  'Condominio',
  'Azienda Industriale',
  'Attività Commerciale',
];

/**
 * PAGINA 3 — CLIENTI
 * - Riepilogo KPI anagrafica + Barra di ricerca in tempo reale + Filtro per categoria
 * - Lista clienti con: nome, telefono, indirizzo, ultimo intervento, conteggio interventi/preventivi e anteprima note di accesso
 * - Click su cliente → scheda dettaglio con:
 *   * Dati anagrafici (nome, telefono, email, indirizzo, P.IVA)
 *   * Storico interventi
 *   * Preventivi associati (con azioni di stato/modifica/elimina)
 *   * Note interne modificabili e salvate in LocalStorage
 * - Pulsante "+ Nuovo cliente" con form completo
 */
export default function GestioneClienti({
  clienti,
  interventi,
  preventivi,
  manutenzioni = [],
  onApriNuovoCliente,
  onModificaCliente,
  onEliminaCliente,
  onAggiornaNoteCliente,
  onApriNuovoInterventoPerCliente,
  onApriNuovoPreventivoPerCliente,
  onModificaPreventivo,
  onEliminaPreventivo,
  onCambiaStatoPreventivo,
  onApriDettaglioIntervento,
  onChiamaCliente,
  onApriNuovaManutenzionePerCliente,
}: GestioneClientiProps) {
  const { oggiIso } = React.useMemo(() => getSettimanaCorrente(), []);
  const [ricerca, setRicerca] = React.useState('');
  const [categoriaFiltro, setCategoriaFiltro] = React.useState('Tutti');
  const [clienteSelezionatoId, setClienteSelezionatoId] = React.useState<
    string | null
  >(null);
  const [bozzaNote, setBozzaNote] = React.useState('');

  // Filtra clienti in tempo reale per nome, indirizzo, telefono, P.IVA, ultimo intervento + categoria
  const clientiFiltrati = React.useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    return clienti.filter((c) => {
      const matchCategoria =
        categoriaFiltro === 'Tutti' ||
        c.tipo.toLowerCase().includes(categoriaFiltro.toLowerCase());
      if (!matchCategoria) return false;
      if (!q) return true;
      return (
        c.nome.toLowerCase().includes(q) ||
        c.indirizzo.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q) ||
        (c.cellulare && c.cellulare.toLowerCase().includes(q)) ||
        c.piva.toLowerCase().includes(q) ||
        c.ultimoIntervento.toLowerCase().includes(q) ||
        (c.note && c.note.toLowerCase().includes(q))
      );
    });
  }, [clienti, ricerca, categoriaFiltro]);

  const fatturatoAnagraficaTotale = React.useMemo(
    () => clienti.reduce((s, c) => s + (Number(c.fatturatoTotale) || 0), 0),
    [clienti],
  );

  const clienteDettaglio = React.useMemo(
    () => clienti.find((c) => c.id === clienteSelezionatoId) || null,
    [clienti, clienteSelezionatoId],
  );

  React.useEffect(() => {
    if (clienteDettaglio) {
      setBozzaNote(clienteDettaglio.note || '');
    }
  }, [clienteDettaglio]);

  // Interventi e preventivi del cliente selezionato
  const interventiCliente = React.useMemo(() => {
    if (!clienteDettaglio) return [];
    return interventi
      .filter(
        (i) =>
          i.clienteId === clienteDettaglio.id ||
          clienteDettaglio.nome
            .toLowerCase()
            .includes(i.clienteNome.toLowerCase()),
      )
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [interventi, clienteDettaglio]);

  const preventiviCliente = React.useMemo(() => {
    if (!clienteDettaglio) return [];
    return preventivi.filter(
      (p) =>
        p.clienteId === clienteDettaglio.id ||
        p.clienteNome
          .toLowerCase()
          .includes(clienteDettaglio.nome.toLowerCase()),
    );
  }, [preventivi, clienteDettaglio]);

  const manutenzioniCliente = React.useMemo(() => {
    if (!clienteDettaglio) return [];
    return manutenzioni.filter(
      (m) =>
        m.clienteId === clienteDettaglio.id ||
        clienteDettaglio.nome
          .toLowerCase()
          .includes(m.clienteNome.toLowerCase()),
    );
  }, [manutenzioni, clienteDettaglio]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* =====================================================================
          INTESTAZIONE + PULSANTE "+ NUOVO CLIENTE" + BARRA RICERCA REAL-TIME + FILTRI
         ===================================================================== */}
      <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#f1f5f9]">
                Anagrafica Clienti ({clientiFiltrati.length})
              </h1>
              <span className="text-xs font-mono font-bold text-[#10b981] bg-[#10b981]/15 border border-[#10b981]/30 px-2.5 py-0.5 rounded-lg shrink-0">
                Volume storico: {formattaEuro(fatturatoAnagraficaTotale)}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-0.5">
              Privati, condomini e aziende seguiti a Vicenza e provincia · Clicca su una scheda per aprire lo storico completo
            </p>
          </div>

          <button
            type="button"
            onClick={onApriNuovoCliente}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-sm transition-all shadow-md min-h-[44px] whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nuovo cliente</span>
          </button>
        </div>

        {/* Barra di ricerca in tempo reale */}
        <div className="relative">
          <Search className="w-5 h-5 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca cliente per nome, indirizzo a Vicenza, telefono, P.IVA o nota citofono..."
            className="w-full pl-11 pr-10 py-3 rounded-xl bg-[#0f1720] border border-[#2a3a4f] focus:border-[#f59e0b] focus:outline-none text-sm text-[#f1f5f9] placeholder-[#94a3b8]/70 transition-colors"
          />
          {ricerca && (
            <button
              type="button"
              onClick={() => setRicerca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f1f5f9] p-1"
              aria-label="Cancella ricerca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtri rapidi per Tipologia Cliente */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#94a3b8] mr-1">
            <Filter className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>Tipologia:</span>
          </span>
          {CATEGORIE_CLIENTI.map((cat) => {
            const attivo = categoriaFiltro === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  attivo
                    ? 'bg-[#f59e0b] text-[#0f1720]'
                    : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          LISTA CLIENTI (Card cliccabili con Nome, Telefono, Indirizzo, Ultimo Intervento e Note Cantiere)
         ===================================================================== */}
      {clientiFiltrati.length === 0 ? (
        <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-8 text-center space-y-3">
          <p className="text-base font-bold text-[#f1f5f9]">
            Nessun cliente trovato per i criteri selezionati
          </p>
          <p className="text-xs text-[#94a3b8]">
            Prova a reimpostare i filtri oppure registra un nuovo cliente in anagrafica.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setRicerca('');
                setCategoriaFiltro('Tutti');
              }}
              className="px-4 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-xs font-semibold text-[#f1f5f9]"
            >
              Mostra tutti
            </button>
            <button
              type="button"
              onClick={onApriNuovoCliente}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f59e0b] text-[#0f1720] font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuovo cliente</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clientiFiltrati.map((cliente) => {
            const numInterventi = interventi.filter(
              (i) => i.clienteId === cliente.id,
            ).length;
            const numPreventivi = preventivi.filter(
              (p) => p.clienteId === cliente.id,
            ).length;

            return (
              <div
                key={cliente.id}
                onClick={() => setClienteSelezionatoId(cliente.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setClienteSelezionatoId(cliente.id);
                  }
                }}
                className="bg-[#1a2332] border border-[#2a3a4f] hover:border-[#f59e0b] rounded-2xl p-4 sm:p-5 transition-all cursor-pointer shadow-md hover:shadow-lg flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-[#f59e0b] bg-[#f59e0b]/15 border border-[#f59e0b]/30 px-2 py-0.5 rounded-md">
                          {cliente.tipo}
                        </span>
                        <span className="text-[11px] font-mono text-[#94a3b8]">
                          {numInterventi} int. · {numPreventivi} prev.
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9] group-hover:text-[#f59e0b] transition-colors mt-1.5 truncate">
                        {cliente.nome}
                      </h2>
                    </div>
                    <span className="text-xs font-mono tabular-nums font-extrabold text-[#10b981] bg-[#10b981]/15 border border-[#10b981]/35 px-2.5 py-1 rounded-lg shrink-0">
                      {formattaEuro(cliente.fatturatoTotale)}
                    </span>
                  </div>

                  {/* Dati sintetici richiesti: Telefono, Indirizzo, Ultimo intervento */}
                  <div className="mt-3 space-y-2 text-xs sm:text-sm text-[#94a3b8]">
                    <p className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-[#f59e0b] shrink-0" />
                      <span className="text-[#f1f5f9] font-semibold tabular-nums">
                        {cliente.cellulare || cliente.telefono}
                      </span>
                      {cliente.cellulare && cliente.telefono && (
                        <span className="text-xs text-[#94a3b8]">
                          ({cliente.telefono})
                        </span>
                      )}
                    </p>

                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span className="text-[#f1f5f9]/95">{cliente.indirizzo}</span>
                    </p>

                    <div className="pt-2 mt-2 border-t border-[#2a3a4f]/80 flex items-start gap-2">
                      <Wrench className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] uppercase font-bold tracking-wider text-[#94a3b8] block">
                          Ultimo intervento (
                          {formattaDataItaliana(cliente.dataUltimoIntervento)})
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-[#f1f5f9] block truncate">
                          {cliente.ultimoIntervento}
                        </span>
                      </div>
                    </div>

                    {cliente.note && (
                      <div className="p-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-xs text-[#94a3b8] line-clamp-2">
                        <strong className="text-[#f59e0b]">🔑 Nota Cantiere:</strong>{' '}
                        {cliente.note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2a3a4f] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[#f59e0b] font-bold group-hover:underline">
                    Apri scheda completa →
                  </span>
                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onChiamaCliente(
                          cliente.cellulare || cliente.telefono,
                          cliente.nome,
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#0f1720] hover:bg-[#10b981]/20 text-[#f1f5f9] hover:text-[#10b981] border border-[#2a3a4f] font-semibold transition-colors"
                    >
                      Chiama
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onApriNuovoInterventoPerCliente(cliente.id)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#0f1720] hover:bg-[#f59e0b]/20 text-[#f1f5f9] hover:text-[#f59e0b] border border-[#2a3a4f] font-semibold transition-colors"
                    >
                      + Intervento
                    </button>
                    <button
                      type="button"
                      onClick={() => onModificaCliente(cliente)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#0f1720] hover:bg-[#f59e0b]/20 text-[#94a3b8] hover:text-[#f59e0b] border border-[#2a3a4f] font-semibold transition-colors"
                    >
                      Modifica
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          MODALE SCHEDA DETTAGLIO CLIENTE (al click su un cliente)
         ===================================================================== */}
      {clienteDettaglio && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setClienteSelezionatoId(null)}
        >
          <div
            className="bg-[#1a2332] border border-[#2a3a4f] rounded-t-3xl sm:rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Scheda Cliente */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2a3a4f]">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-[#f59e0b]">
                  {clienteDettaglio.tipo}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#f1f5f9] mt-0.5 break-words">
                  {clienteDettaglio.nome}
                </h2>
                <p className="text-xs text-[#94a3b8] mt-1">
                  Fatturato storico accumulato:{' '}
                  <strong className="text-[#10b981] font-mono tabular-nums">
                    {formattaEuro(clienteDettaglio.fatturatoTotale)}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onModificaCliente(clienteDettaglio);
                  }}
                  className="p-2.5 rounded-xl bg-[#0f1720] hover:bg-[#f59e0b]/20 text-[#94a3b8] hover:text-[#f59e0b] border border-[#2a3a4f] transition-colors"
                  title="Modifica anagrafica cliente"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onEliminaCliente(clienteDettaglio.id);
                    setClienteSelezionatoId(null);
                  }}
                  className="p-2.5 rounded-xl bg-[#0f1720] hover:bg-[#ef4444]/20 text-[#94a3b8] hover:text-[#ef4444] border border-[#2a3a4f] transition-colors"
                  title="Elimina cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setClienteSelezionatoId(null)}
                  className="p-2.5 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]"
                  aria-label="Chiudi scheda cliente"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 1. DATI ANAGRAFICI (nome, telefono, email, indirizzo, P.IVA) */}
            <section className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">
                Dati Anagrafici & Contatti
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <span className="text-[#94a3b8] block text-xs">
                    Telefono / Cellulare
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-[#10b981]" />
                    <span className="text-[#f1f5f9] font-semibold tabular-nums">
                      {clienteDettaglio.telefono}
                      {clienteDettaglio.cellulare
                        ? ` · ${clienteDettaglio.cellulare}`
                        : ''}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[#94a3b8] block text-xs">Email</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[#f1f5f9] font-medium truncate">
                      {clienteDettaglio.email || 'Non specificata'}
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-[#94a3b8] block text-xs">
                    Indirizzo Cantiere / Sede
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#f59e0b]" />
                    <span className="text-[#f1f5f9] font-medium">
                      {clienteDettaglio.indirizzo}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[#94a3b8] block text-xs">
                    Partita IVA
                  </span>
                  <span className="text-[#f1f5f9] font-mono tabular-nums font-semibold">
                    {clienteDettaglio.piva || 'Privato senza P.IVA'}
                  </span>
                </div>

                <div>
                  <span className="text-[#94a3b8] block text-xs">
                    Codice Fiscale
                  </span>
                  <span className="text-[#f1f5f9] font-mono tabular-nums font-semibold">
                    {clienteDettaglio.codiceFiscale || 'N/D'}
                  </span>
                </div>
              </div>
            </section>

            {/* 2. STORICO INTERVENTI */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#f1f5f9] flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#f59e0b]" />
                  <span>Storico Interventi ({interventiCliente.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const id = clienteDettaglio.id;
                    setClienteSelezionatoId(null);
                    onApriNuovoInterventoPerCliente(id);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#f59e0b] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuovo intervento</span>
                </button>
              </div>

              {interventiCliente.length === 0 ? (
                <p className="text-xs text-[#94a3b8] bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3.5">
                  Nessun intervento registrato per questo cliente.
                </p>
              ) : (
                <div className="space-y-2">
                  {interventiCliente.map((intItem) => (
                    <div
                      key={intItem.id}
                      onClick={() => {
                        setClienteSelezionatoId(null);
                        onApriDettaglioIntervento(intItem);
                      }}
                      className="p-3.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] hover:border-[#f59e0b] flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-[#f59e0b] font-semibold tabular-nums">
                            {formattaDataItaliana(intItem.data)} ·{' '}
                            {intItem.oraInizio}
                          </span>
                          <span className="text-[#94a3b8]">·</span>
                          <span className="text-[#94a3b8]">
                            👷 {intItem.tecnico}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-[#f1f5f9] mt-0.5 truncate">
                          {intItem.titolo}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold ${
                            intItem.stato === 'Completato'
                              ? 'text-[#10b981]'
                              : intItem.stato === 'In corso'
                                ? 'text-[#f59e0b]'
                                : 'text-[#94a3b8]'
                          }`}
                        >
                          {intItem.stato === 'Completato' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          {intItem.stato}
                        </span>
                        <span className="block text-xs font-mono tabular-nums text-[#f1f5f9] mt-0.5">
                          {formattaEuro(intItem.importoStimato)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 3. PREVENTIVI ASSOCIATI */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#f1f5f9] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>Preventivi Associati ({preventiviCliente.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const id = clienteDettaglio.id;
                    setClienteSelezionatoId(null);
                    onApriNuovoPreventivoPerCliente(id);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuovo preventivo</span>
                </button>
              </div>

              {preventiviCliente.length === 0 ? (
                <p className="text-xs text-[#94a3b8] bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3.5">
                  Nessun preventivo associato a questo cliente.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {preventiviCliente.map((prev) => (
                    <div
                      key={prev.id}
                      className="p-3.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-mono text-sky-400 font-semibold">
                            {prev.numero} · Emesso il{' '}
                            {formattaDataItaliana(prev.dataEmissione)}
                          </span>
                          <h4 className="text-sm font-bold text-[#f1f5f9]">
                            {prev.titolo}
                          </h4>
                        </div>
                        <span className="text-sm font-mono font-bold text-[#f59e0b] tabular-nums shrink-0">
                          {formattaEuro(prev.importo)}
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8]">
                        {prev.descrizione}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2a3a4f]/60">
                        <div className="flex items-center gap-1.5">
                          {(['In attesa', 'Accettato', 'Rifiutato'] as const).map(
                            (statoOpt) => (
                              <button
                                key={statoOpt}
                                type="button"
                                onClick={() =>
                                  onCambiaStatoPreventivo(prev.id, statoOpt)
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                                  prev.stato === statoOpt
                                    ? statoOpt === 'Accettato'
                                      ? 'bg-[#10b981] text-[#0f1720]'
                                      : statoOpt === 'Rifiutato'
                                        ? 'bg-[#ef4444] text-white'
                                        : 'bg-[#f59e0b] text-[#0f1720]'
                                    : 'bg-[#1a2332] text-[#94a3b8] hover:text-[#f1f5f9]'
                                }`}
                              >
                                {statoOpt}
                              </button>
                            ),
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onModificaPreventivo(prev)}
                            className="text-xs text-[#94a3b8] hover:text-[#f59e0b]"
                          >
                            Modifica
                          </button>
                          <button
                            type="button"
                            onClick={() => onEliminaPreventivo(prev.id)}
                            className="text-xs text-[#94a3b8] hover:text-[#ef4444]"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4. MANUTENZIONI PROGRAMMATE RICORRENTI */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#f1f5f9] flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#f59e0b]" />
                  <span>
                    Manutenzioni Programmate Impianti ({manutenzioniCliente.length})
                  </span>
                </h3>
                {onApriNuovaManutenzionePerCliente && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = clienteDettaglio.id;
                      setClienteSelezionatoId(null);
                      onApriNuovaManutenzionePerCliente(id);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#f59e0b] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuova scadenza</span>
                  </button>
                )}
              </div>

              {manutenzioniCliente.length === 0 ? (
                <p className="text-xs text-[#94a3b8] bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3.5">
                  Nessuna manutenzione ricorrente registrata per questo cliente.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {manutenzioniCliente.map((man) => {
                    const stato = calcolaStatoManutenzione(
                      man.prossimaScadenza,
                      oggiIso,
                    );
                    const isScaduta = stato === 'Scaduta';
                    return (
                      <div
                        key={man.id}
                        className="p-3.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md text-[10px]">
                                🔄 {man.frequenza}
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                                  isScaduta
                                    ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40'
                                    : stato === 'In scadenza'
                                      ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40'
                                      : 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30'
                                }`}
                              >
                                {stato}
                              </span>
                              {man.matricola && (
                                <span className="text-[10px] font-mono text-[#94a3b8]">
                                  Matr: {man.matricola}
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-[#f1f5f9] mt-1 truncate">
                              {man.impianto}
                            </h4>
                            <p className="text-xs text-[#94a3b8]">
                              {man.titolo}
                            </p>
                          </div>
                          <span className="text-sm font-mono font-bold text-[#10b981] tabular-nums shrink-0">
                            {formattaEuro(man.costoStimato)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-[#94a3b8] pt-1.5 border-t border-[#2a3a4f]/60">
                          <span>👷 Tecnico: {man.tecnicoAssegnato}</span>
                          <span className="font-mono text-[#f59e0b] font-semibold">
                            Prossima:{' '}
                            {formattaDataItaliana(man.prossimaScadenza)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 5. NOTE INTERNE DI CANTIERE */}
            <section className="space-y-2">
              <label
                htmlFor="note-interne-cliente"
                className="block text-sm font-bold text-[#f1f5f9]"
              >
                Note Interne & Accesso Cantiere
              </label>
              <textarea
                id="note-interne-cliente"
                rows={3}
                value={bozzaNote}
                onChange={(e) => setBozzaNote(e.target.value)}
                placeholder="Inserisci note su citofono, chiavi centrale termica, codici accesso o particolarità dell'impianto..."
                className="w-full p-3 rounded-xl bg-[#0f1720] border border-[#2a3a4f] focus:border-[#f59e0b] focus:outline-none text-xs sm:text-sm text-[#f1f5f9]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onAggiornaNoteCliente(clienteDettaglio.id, bozzaNote)
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salva note interne</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
