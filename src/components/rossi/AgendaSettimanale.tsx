import React from 'react';
import {
  Plus,
  Filter,
  Clock,
  CheckCircle2,
  Wrench,
  Calendar as CalendarIcon,
  Palmtree,
  Trash2,
  CalendarOff,
  Check,
  X,
  LayoutGrid,
  List,
  BellRing,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';
import {
  getSettimanaCorrente,
  formattaDataItaliana,
  formattaEuro,
  TECNICI_INIZIALI,
  calcolaStatoManutenzione,
} from '@/data.js';
import type { InterventoItem } from './HomeDashboard';
import type { ManutenzioneProgrammataItem } from './GestioneManutenzioni';
import GoogleCalendarSyncPanel from './GoogleCalendarSyncPanel';

export interface FerieItem {
  id: string;
  tecnico: 'Luca' | 'Andrea' | 'Marco' | string;
  dataInizio: string;
  dataFine: string;
  tipo: 'Ferie' | 'Permesso ROL' | 'Malattia' | 'Corso Formazione';
  motivo: string;
  approvato: boolean;
}

interface AgendaSettimanaleProps {
  interventi: InterventoItem[];
  ferie: FerieItem[];
  manutenzioni?: ManutenzioneProgrammataItem[];
  onApriDettaglioIntervento: (intervento: InterventoItem) => void;
  onApriNuovoIntervento: (dataPreselezionata?: string) => void;
  onCambiaStatoIntervento: (
    id: string,
    nuovoStato: InterventoItem['stato'],
  ) => void;
  onAggiungiFerie: (nuovaFerie: Omit<FerieItem, 'id'>) => void;
  onEliminaFerie: (id: string) => void;
  onToggleApprovazioneFerie: (id: string) => void;
  onImportaImpegniDaGoogle?: (
    nuoviInterventi: InterventoItem[],
    nuoveFerie: FerieItem[],
  ) => void;
  onPianificaInterventoDaManutenzione?: (
    manutenzione: ManutenzioneProgrammataItem,
    dataPreselezionata?: string,
  ) => void;
  onVaiAManutenzioni?: () => void;
}

const FASCE_ORARIE = [
  { id: 'mattina-presto', label: '08:00 - 10:00', minOra: 0, maxOra: 10 },
  { id: 'mattina-tardi', label: '10:00 - 13:00', minOra: 10, maxOra: 13 },
  { id: 'pomeriggio-presto', label: '13:00 - 15:30', minOra: 13, maxOra: 15.5 },
  { id: 'pomeriggio-tardi', label: '15:30 - 19:00', minOra: 15.5, maxOra: 24 },
];

function parseOraDecimale(orario: string): number {
  if (!orario) return 9;
  const [h, m] = orario.split(':').map((n) => parseInt(n, 10) || 0);
  return h + m / 60;
}

/**
 * Verifica se una data ISO (YYYY-MM-DD) cade nell'intervallo [dataInizio, dataFine] inclusi
 */
function isDataInIntervalloFerie(
  giornoIso: string,
  dataInizio: string,
  dataFine: string,
): boolean {
  if (!giornoIso || !dataInizio) return false;
  const fine = dataFine || dataInizio;
  return giornoIso >= dataInizio && giornoIso <= fine;
}

/**
 * PAGINA 2 — AGENDA SETTIMANALE + SEZIONE "GESTIONE FERIE"
 * - Vista calendario settimanale a 7 colonne (Lun-Dom) + Selettore Giorno Compatto per Mobile
 * - Marcatura specifica nel calendario settimanale per i giorni di assenza/ferie dei tecnici
 * - Sezione "Gestione Ferie" per permettere ai tecnici di segnare i giorni di assenza,
 *   visualizzare il riepilogo assenze e rimuovere o approvare i periodi
 * - Interventi posizionati negli slot orari, colorati per stato
 * - Click su intervento → modale con dettagli completi
 * - Pulsante "+" flottante per aggiungere nuovo intervento
 * - Filtro per tecnico in alto (Tutti, Luca, Andrea, Marco) + filtro per stato
 */
export default function AgendaSettimanale({
  interventi,
  ferie,
  manutenzioni = [],
  onApriDettaglioIntervento,
  onApriNuovoIntervento,
  onCambiaStatoIntervento,
  onAggiungiFerie,
  onEliminaFerie,
  onToggleApprovazioneFerie,
  onImportaImpegniDaGoogle,
  onPianificaInterventoDaManutenzione,
  onVaiAManutenzioni,
}: AgendaSettimanaleProps) {
  const { giorni, oggiIso } = getSettimanaCorrente();
  const [tecnicoSelezionato, setTecnicoSelezionato] =
    React.useState<string>('Tutti');
  const [statoSelezionato, setStatoSelezionato] =
    React.useState<string>('Tutti');

  // Stato collassamento banner notifiche scadenze manutenzioni
  const [bannerNotificheAperto, setBannerNotificheAperto] =
    React.useState<boolean>(true);

  // Scadenze manutenzioni in avvicinamento (entro 30 giorni o già scadute)
  const manutenzioniInScadenza = React.useMemo(() => {
    return manutenzioni
      .filter((m) => {
        if (!m.attiva) return false;
        const stato = calcolaStatoManutenzione(m.prossimaScadenza, oggiIso);
        if (stato === 'In scadenza' || stato === 'Scaduta') return true;
        const msDiff =
          new Date(m.prossimaScadenza).getTime() - new Date(oggiIso).getTime();
        const giorniDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
        return giorniDiff <= 30;
      })
      .sort((a, b) => a.prossimaScadenza.localeCompare(b.prossimaScadenza));
  }, [manutenzioni, oggiIso]);

  // Lookup scadenze per giorno ISO
  const getManutenzioniGiorno = React.useCallback(
    (giornoIso: string): ManutenzioneProgrammataItem[] => {
      return manutenzioni.filter(
        (m) => m.attiva && m.prossimaScadenza === giornoIso,
      );
    },
    [manutenzioni],
  );

  // Giorno focalizzato per il riepilogo rapido giornaliero (utile soprattutto in cantiere da smartphone)
  const [giornoFocusIso, setGiornoFocusIso] = React.useState<string>(oggiIso);
  const [vistaCompattaGiorno, setVistaCompattaGiorno] =
    React.useState<boolean>(false);

  // Stati per il form "Gestione Ferie"
  const [mostraFormFerie, setMostraFormFerie] = React.useState<boolean>(false);
  const [tecnicoFerie, setTecnicoFerie] = React.useState<string>('Luca');
  const [tipoFerie, setTipoFerie] =
    React.useState<FerieItem['tipo']>('Ferie');
  const [dataInizioFerie, setDataInizioFerie] =
    React.useState<string>(oggiIso);
  const [dataFineFerie, setDataFineFerie] = React.useState<string>(oggiIso);
  const [motivoFerie, setMotivoFerie] = React.useState<string>('');

  // Filtra gli interventi in base a tecnico e stato selezionati
  const interventiFiltrati = React.useMemo(() => {
    return interventi.filter((item) => {
      const matchTecnico =
        tecnicoSelezionato === 'Tutti' || item.tecnico === tecnicoSelezionato;
      const matchStato =
        statoSelezionato === 'Tutti' || item.stato === statoSelezionato;
      return matchTecnico && matchStato;
    });
  }, [interventi, tecnicoSelezionato, statoSelezionato]);

  // Filtra le ferie in base al tecnico selezionato nel filtro in alto
  const ferieFiltrate = React.useMemo(() => {
    if (tecnicoSelezionato === 'Tutti') return ferie;
    return ferie.filter((f) => f.tecnico === tecnicoSelezionato);
  }, [ferie, tecnicoSelezionato]);

  // Restituisce le assenze attive per uno specifico giorno della settimana (YYYY-MM-DD)
  const getAssenzeGiorno = React.useCallback(
    (giornoIso: string): FerieItem[] => {
      return ferieFiltrate.filter((f) =>
        isDataInIntervalloFerie(giornoIso, f.dataInizio, f.dataFine),
      );
    },
    [ferieFiltrate],
  );

  // Colori card in base allo stato (In corso = arancione, Programmato = grigio/ardesia, Completato = verde)
  const getStileCardStato = (stato: InterventoItem['stato']) => {
    if (stato === 'In corso') {
      return 'bg-[#f59e0b]/15 border-[#f59e0b]/50 hover:border-[#f59e0b] text-[#f1f5f9]';
    }
    if (stato === 'Completato') {
      return 'bg-[#10b981]/15 border-[#10b981]/50 hover:border-[#10b981] text-[#f1f5f9]';
    }
    return 'bg-[#0f1720]/90 border-[#2a3a4f] hover:border-[#94a3b8] text-[#f1f5f9]';
  };

  const getColoreTestoStato = (stato: InterventoItem['stato']) => {
    if (stato === 'In corso') return 'text-[#f59e0b]';
    if (stato === 'Completato') return 'text-[#10b981]';
    return 'text-[#94a3b8]';
  };

  // Gestione invio form nuova assenza/ferie
  const handleSalvaNuovaFerie = (e: React.FormEvent) => {
    e.preventDefault();
    const inizio = dataInizioFerie || oggiIso;
    const fine =
      dataFineFerie && dataFineFerie >= inizio ? dataFineFerie : inizio;

    onAggiungiFerie({
      tecnico: tecnicoFerie,
      tipo: tipoFerie,
      dataInizio: inizio,
      dataFine: fine,
      motivo:
        motivoFerie.trim() ||
        `${tipoFerie} programmata (${tecnicoFerie})`,
      approvato: true,
    });

    setMotivoFerie('');
    setMostraFormFerie(false);
  };

  // Apre il form ferie pre-impostando il giorno cliccato dal calendario
  const handleSegnaAssenzaGiorno = (giornoIso: string) => {
    setDataInizioFerie(giornoIso);
    setDataFineFerie(giornoIso);
    if (tecnicoSelezionato !== 'Tutti') {
      setTecnicoFerie(tecnicoSelezionato);
    }
    setMostraFormFerie(true);
  };

  const giornoFocusObj =
    giorni.find((g) => g.iso === giornoFocusIso) || giorni[0];
  const interventiGiornoFocus = React.useMemo(
    () =>
      interventiFiltrati
        .filter((i) => i.data === giornoFocusIso)
        .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio)),
    [interventiFiltrati, giornoFocusIso],
  );
  const assenzeGiornoFocus = getAssenzeGiorno(giornoFocusIso);

  return (
    <div className="space-y-6 animate-fade-in relative pb-12">
      {/* =====================================================================
          SINCRONIZZAZIONE BIDIREZIONALE GOOGLE CALENDAR
         ===================================================================== */}
      {onImportaImpegniDaGoogle && (
        <GoogleCalendarSyncPanel
          interventi={interventi}
          ferie={ferie}
          onImportaImpegniDaGoogle={onImportaImpegniDaGoogle}
        />
      )}

      {/* =====================================================================
          INTESTAZIONE E FILTRI PER TECNICO E STATO
         ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#f59e0b]" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#f1f5f9]">
              Agenda Settimanale Cantiere
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/35 text-[11px] font-bold text-[#f59e0b]">
              <BellRing className="w-3 h-3" />
              <span>Push Tecnici Attive</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">
            Pianificazione interventi e turni tecnici da Lunedì a Domenica ·{' '}
            <strong className="text-[#f59e0b] tabular-nums">
              {interventiFiltrati.length} interventi
            </strong>{' '}
            ·{' '}
            <strong className="text-purple-400 tabular-nums">
              {ferieFiltrate.length} assenze/ferie registrate
            </strong>
          </p>
        </div>

        {/* Filtri Tecnico + Stato + Switch Vista */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1 text-xs font-bold text-[#94a3b8]">
            <Filter className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>Tecnico:</span>
          </div>

          {['Tutti', ...TECNICI_INIZIALI.map((t) => t.nome)].map((nomeTec) => {
            const attivo = tecnicoSelezionato === nomeTec;
            return (
              <button
                key={nomeTec}
                type="button"
                onClick={() => setTecnicoSelezionato(nomeTec)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] whitespace-nowrap ${
                  attivo
                    ? 'bg-[#f59e0b] text-[#0f1720] shadow-sm'
                    : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
                }`}
              >
                {nomeTec === 'Tutti' ? 'Tutti i tecnici' : `👷 ${nomeTec}`}
              </button>
            );
          })}

          {/* Selettore rapido Stato */}
          <select
            value={statoSelezionato}
            onChange={(e) => setStatoSelezionato(e.target.value)}
            aria-label="Filtra per stato intervento"
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#0f1720] text-[#f1f5f9] border border-[#2a3a4f] focus:outline-none focus:border-[#f59e0b] min-h-[38px]"
          >
            <option value="Tutti">Tutti gli stati</option>
            <option value="Programmato">Programmato</option>
            <option value="In corso">In corso</option>
            <option value="Completato">Completato</option>
          </select>

          {/* Pulsante switch vista 7 Colonne vs Focus Giorno */}
          <div className="flex items-center gap-1 bg-[#0f1720] p-1 rounded-xl border border-[#2a3a4f]">
            <button
              type="button"
              onClick={() => setVistaCompattaGiorno(false)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                !vistaCompattaGiorno
                  ? 'bg-[#f59e0b] text-[#0f1720]'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              }`}
              title="Griglia settimanale a 7 colonne"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>7 Giorni</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaCompattaGiorno(true)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                vistaCompattaGiorno
                  ? 'bg-[#f59e0b] text-[#0f1720]'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              }`}
              title="Vista dettaglio giorno singolo per cantiere"
            >
              <List className="w-3.5 h-3.5" />
              <span>Focus Giorno</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          BANNER NOTIFICHE AUTOMATICHE SCADENZE MANUTENZIONI IN AGENDA
         ===================================================================== */}
      {manutenzioniInScadenza.length > 0 && (
        <div className="bg-[#1a2332] border border-[#f59e0b]/40 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b] shrink-0">
                <CalendarClock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9]">
                    Notifiche Scadenze Manutenzioni Impianti ({manutenzioniInScadenza.length})
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/35 text-[11px] font-bold text-[#f59e0b]">
                    <BellRing className="w-3 h-3" />
                    <span>In scadenza contrattuale</span>
                  </span>
                </div>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Promemoria automatici: controlli periodici (mensili/annuali) per caldaie, F-Gas e quadri elettrici da pianificare in agenda.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {onVaiAManutenzioni && (
                <button
                  type="button"
                  onClick={onVaiAManutenzioni}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f1720] hover:bg-[#0f1720]/80 text-[#f1f5f9] border border-[#2a3a4f] text-xs font-semibold transition-colors"
                >
                  <span>Tutte le manutenzioni</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#f59e0b]" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setBannerNotificheAperto((prev) => !prev)}
                className="p-2 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]"
                title={bannerNotificheAperto ? 'Nascondi dettagli' : 'Espandi elenco'}
                aria-label="Espandi/comprimi notifiche scadenze"
              >
                {bannerNotificheAperto ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Schede Scadenze Impianti */}
          {bannerNotificheAperto && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 animate-fade-in">
              {manutenzioniInScadenza.map((man) => {
                const stato = calcolaStatoManutenzione(man.prossimaScadenza, oggiIso);
                const msDiff =
                  new Date(man.prossimaScadenza).getTime() -
                  new Date(oggiIso).getTime();
                const giorniDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
                const isScaduta = stato === 'Scaduta';

                return (
                  <div
                    key={man.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                      isScaduta
                        ? 'bg-[#0f1720] border-[#ef4444]/60'
                        : 'bg-[#0f1720] border-[#f59e0b]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1.5 text-xs">
                        <span className="font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md text-[10px]">
                          🔄 {man.frequenza}
                        </span>
                        <span
                          className={`font-mono font-extrabold text-[11px] px-2 py-0.5 rounded-md border ${
                            isScaduta
                              ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/50'
                              : giorniDiff === 0
                                ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/50'
                                : 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/35'
                          }`}
                        >
                          {isScaduta
                            ? `🚨 Scaduta da ${Math.abs(giorniDiff)} gg`
                            : giorniDiff === 0
                              ? '⚡ Scade OGGI'
                              : `⏳ Tra ${giorniDiff} gg (${formattaDataItaliana(
                                  man.prossimaScadenza,
                                )})`}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-[#f1f5f9] text-sm mt-2 leading-snug">
                        {man.impianto}
                      </h4>
                      <p className="text-xs text-[#94a3b8] mt-1 line-clamp-1">
                        👤 {man.clienteNome}
                      </p>
                      <p className="text-xs text-[#94a3b8] mt-0.5 line-clamp-1">
                        📍 {man.indirizzoCliente}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#2a3a4f] flex items-center justify-between gap-2">
                      <div className="text-[11px]">
                        <span className="text-[#94a3b8] block">Tecnico</span>
                        <span className="font-semibold text-[#f1f5f9]">
                          👷 {man.tecnicoAssegnato}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onPianificaInterventoDaManutenzione) {
                            onPianificaInterventoDaManutenzione(
                              man,
                              man.prossimaScadenza,
                            );
                          } else {
                            onApriNuovoIntervento(man.prossimaScadenza);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] font-extrabold text-xs shadow-sm transition-colors"
                        title="Pianifica intervento in agenda per questa scadenza"
                      >
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>Pianifica in Agenda</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          BARRA SELETTORE RAPIDO 7 GIORNI (Lun-Dom) CON INDICATORI INTERVENTI E FERIE
         ===================================================================== */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2.5">
        {giorni.map((g) => {
          const countInt = interventiFiltrati.filter(
            (i) => i.data === g.iso,
          ).length;
          const assenzeG = getAssenzeGiorno(g.iso);
          const manutenzioniG = getManutenzioniGiorno(g.iso);
          const selezionato = g.iso === giornoFocusIso;

          return (
            <button
              key={g.iso}
              type="button"
              onClick={() => setGiornoFocusIso(g.iso)}
              className={`min-w-0 p-1.5 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-h-[70px] sm:min-h-[76px] ${
                selezionato
                  ? 'bg-[#f59e0b]/20 border-[#f59e0b] shadow-md'
                  : g.isOggi
                    ? 'bg-[#1a2332] border-[#f59e0b]/50'
                    : assenzeG.length > 0
                      ? 'bg-purple-500/10 border-purple-500/40'
                      : 'bg-[#1a2332] border-[#2a3a4f] hover:border-[#94a3b8]'
              }`}
            >
              <span
                className={`text-[10px] sm:text-xs font-extrabold uppercase truncate max-w-full ${
                  selezionato || g.isOggi ? 'text-[#f59e0b]' : 'text-[#94a3b8]'
                }`}
              >
                {g.nomeBreve}
              </span>
              <span className="text-xs sm:text-lg font-extrabold text-[#f1f5f9] tabular-nums">
                {g.giornoMese}
              </span>
              <div className="flex items-center justify-center gap-0.5 sm:gap-1 max-w-full">
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-[#94a3b8] tabular-nums truncate">
                  {countInt}<span className="hidden sm:inline"> int.</span>
                </span>
                {assenzeG.length > 0 && (
                  <span title="Tecnico in ferie/assenza" className="text-[9px] sm:text-[10px]">
                    🏖️
                  </span>
                )}
                {manutenzioniG.length > 0 && (
                  <span
                    title={`${manutenzioniG.length} scadenza manutenzione programmata`}
                    className="text-[9px] sm:text-[10px] text-[#f59e0b]"
                  >
                    🔔
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          SEZIONE "GESTIONE FERIE" (Registrazione e Riepilogo Assenze Tecnici)
         ===================================================================== */}
      <section
        aria-labelledby="heading-gestione-ferie"
        className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="heading-gestione-ferie"
                className="text-base sm:text-lg font-bold text-[#f1f5f9]"
              >
                Gestione Ferie & Assenze Tecnici
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Segna i giorni di ferie, permesso ROL, malattia o formazione: vengono evidenziati con marcatura dedicata nel calendario settimanale
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMostraFormFerie((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] whitespace-nowrap self-start sm:self-auto ${
              mostraFormFerie
                ? 'bg-[#0f1720] text-[#94a3b8] border border-[#2a3a4f]'
                : 'bg-purple-500 hover:bg-purple-600 text-white shadow-sm'
            }`}
          >
            {mostraFormFerie ? (
              <>
                <X className="w-4 h-4" />
                <span>Chiudi modulo</span>
              </>
            ) : (
              <>
                <CalendarOff className="w-4 h-4" />
                <span>+ Segna Giorni di Assenza</span>
              </>
            )}
          </button>
        </div>

        {/* Modulo inserimento nuova assenza/ferie */}
        {mostraFormFerie && (
          <form
            onSubmit={handleSalvaNuovaFerie}
            className="bg-[#0f1720] border border-purple-500/40 rounded-2xl p-4 space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between border-b border-[#2a3a4f] pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Nuova Comunicazione Assenza / Ferie Tecnico
              </span>
              <span className="text-[11px] text-[#94a3b8]">
                Visibile subito in agenda
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Tecnico (👷)
                </label>
                <select
                  value={tecnicoFerie}
                  onChange={(e) => setTecnicoFerie(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a2332] border border-[#2a3a4f] text-[#f1f5f9] focus:border-purple-400 focus:outline-none min-h-[40px]"
                >
                  {TECNICI_INIZIALI.map((t) => (
                    <option key={t.id} value={t.nome}>
                      {t.nome} ({t.cognome})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Tipologia Assenza
                </label>
                <select
                  value={tipoFerie}
                  onChange={(e) =>
                    setTipoFerie(e.target.value as FerieItem['tipo'])
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a2332] border border-[#2a3a4f] text-[#f1f5f9] focus:border-purple-400 focus:outline-none min-h-[40px]"
                >
                  <option value="Ferie">🏖️ Ferie</option>
                  <option value="Permesso ROL">🕐 Permesso ROL</option>
                  <option value="Corso Formazione">🎓 Corso Formazione</option>
                  <option value="Malattia">🏥 Malattia / Infortunio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Dal Giorno *
                </label>
                <input
                  type="date"
                  required
                  value={dataInizioFerie}
                  onChange={(e) => {
                    setDataInizioFerie(e.target.value);
                    if (dataFineFerie < e.target.value) {
                      setDataFineFerie(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a2332] border border-[#2a3a4f] text-[#f1f5f9] focus:border-purple-400 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Al Giorno (incluso) *
                </label>
                <input
                  type="date"
                  required
                  min={dataInizioFerie}
                  value={dataFineFerie}
                  onChange={(e) => setDataFineFerie(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a2332] border border-[#2a3a4f] text-[#f1f5f9] focus:border-purple-400 focus:outline-none min-h-[40px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Note / Motivazione
                </label>
                <input
                  type="text"
                  value={motivoFerie}
                  onChange={(e) => setMotivoFerie(e.target.value)}
                  placeholder="Es. Ferie estive o visita"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#1a2332] border border-[#2a3a4f] text-[#f1f5f9] focus:border-purple-400 focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            {/* Scorciatoie rapide per selezionare un giorno della settimana corrente */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#2a3a4f]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-[#94a3b8] mr-1">
                  Selezione rapida settimana:
                </span>
                {giorni.map((g) => {
                  const selezionato =
                    dataInizioFerie === g.iso && dataFineFerie === g.iso;
                  return (
                    <button
                      key={g.iso}
                      type="button"
                      onClick={() => {
                        setDataInizioFerie(g.iso);
                        setDataFineFerie(g.iso);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        selezionato
                          ? 'bg-purple-500 text-white'
                          : 'bg-[#1a2332] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
                      }`}
                    >
                      {g.nomeBreve} {g.giornoMese}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMostraFormFerie(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#1a2332] text-[#94a3b8] hover:text-[#f1f5f9] text-xs font-semibold"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Salva Assenza in Calendario</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Elenco compatto delle ferie/assenze programmate */}
        {ferieFiltrate.length === 0 ? (
          <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3.5 text-xs text-[#94a3b8] flex items-center justify-between">
            <span>
              Nessuna assenza registrata per i filtri selezionati. Tutta la squadra è operativa.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {ferieFiltrate.map((item) => {
              const stessoGiorno = item.dataInizio === item.dataFine;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-[#0f1720] border border-purple-500/35 flex flex-col justify-between gap-2.5 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#f1f5f9]">
                          👷 {item.tecnico}
                        </span>
                        <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
                          🏖️ {item.tipo}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-semibold text-[#f59e0b] mt-1 tabular-nums">
                        {stessoGiorno
                          ? `Giorno: ${formattaDataItaliana(item.dataInizio)}`
                          : `Dal ${formattaDataItaliana(item.dataInizio)} al ${formattaDataItaliana(item.dataFine)}`}
                      </p>
                      <p className="text-xs text-[#94a3b8] mt-1 line-clamp-1">
                        {item.motivo}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onEliminaFerie(item.id)}
                      className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
                      title="Rimuovi assenza"
                      aria-label={`Rimuovi assenza di ${item.tecnico}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#2a3a4f]/80 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onToggleApprovazioneFerie(item.id)}
                      className={`font-semibold flex items-center gap-1 ${
                        item.approvato ? 'text-[#10b981]' : 'text-[#f59e0b]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {item.approvato
                          ? 'Approvata da Mario Rossi'
                          : 'In attesa di conferma (Tocca per approvare)'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================================
          VISTA FOCUS GIORNO SINGOLO (Sempre visibile su Mobile < lg o quando attivata)
         ===================================================================== */}
      <section
        className={`${
          vistaCompattaGiorno ? 'block' : 'block lg:hidden'
        } bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md animate-fade-in`}
      >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2a3a4f]">
            <div>
              <span className="text-xs font-bold uppercase text-[#f59e0b]">
                Dettaglio Giornaliero Selezionato
              </span>
              <h2 className="text-lg font-extrabold text-[#f1f5f9]">
                {giornoFocusObj.nomeCompleto}{' '}
                {formattaDataItaliana(giornoFocusObj.iso)}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSegnaAssenzaGiorno(giornoFocusObj.iso)}
                className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold"
              >
                🏖️ Segna Ferie
              </button>
              <button
                type="button"
                onClick={() => onApriNuovoIntervento(giornoFocusObj.iso)}
                className="px-3.5 py-2 rounded-xl bg-[#f59e0b] text-[#0f1720] text-xs font-bold"
              >
                + Aggiungi Intervento
              </button>
            </div>
          </div>

          {assenzeGiornoFocus.length > 0 && (
            <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/40 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-200">
              <span>
                🏖️ <strong>Tecnici assenti in questa giornata:</strong>{' '}
                {assenzeGiornoFocus
                  .map((a) => `${a.tecnico} (${a.tipo} - ${a.motivo})`)
                  .join(' · ')}
              </span>
            </div>
          )}

          {/* Notifiche Scadenze Manutenzioni Ricorrenti per il giorno focalizzato */}
          {(() => {
            const manDelGiorno = getManutenzioniGiorno(giornoFocusObj.iso);
            if (manDelGiorno.length === 0) return null;
            return (
              <div className="p-3.5 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/35 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#f59e0b]">
                    <CalendarClock className="w-4 h-4" />
                    <span>
                      Scadenze Manutenzioni Impianti in questa data ({manDelGiorno.length})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#f59e0b] font-semibold">
                    Ricorrenza periodica
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {manDelGiorno.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg bg-[#0f1720] border border-[#2a3a4f] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-purple-300">
                          🔄 {m.frequenza} · 👷 {m.tecnicoAssegnato}
                        </span>
                        <p className="text-xs font-bold text-[#f1f5f9] truncate">
                          {m.impianto}
                        </p>
                        <p className="text-[11px] text-[#94a3b8] truncate">
                          👤 {m.clienteNome}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (onPianificaInterventoDaManutenzione) {
                            onPianificaInterventoDaManutenzione(
                              m,
                              giornoFocusObj.iso,
                            );
                          } else {
                            onApriNuovoIntervento(giornoFocusObj.iso);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] font-extrabold text-[11px] whitespace-nowrap shrink-0 transition-colors shadow-sm"
                      >
                        Pianifica
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {interventiGiornoFocus.length === 0 ? (
            <p className="text-xs text-[#94a3b8] py-4 text-center">
              Nessun intervento pianificato per {giornoFocusObj.nomeCompleto}.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {interventiGiornoFocus.map((intItem) => (
                <button
                  key={intItem.id}
                  type="button"
                  onClick={() => onApriDettaglioIntervento(intItem)}
                  className={`text-left p-4 rounded-xl border transition-all ${getStileCardStato(
                    intItem.stato,
                  )}`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#f59e0b]">
                      🕐 {intItem.oraInizio} - {intItem.oraFine}
                    </span>
                    <span className={getColoreTestoStato(intItem.stato)}>
                      {intItem.stato}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#f1f5f9] mt-1">
                    {intItem.titolo}
                  </p>
                  <p className="text-xs text-[#94a3b8] mt-1">
                    📍 {intItem.indirizzo}
                  </p>
                  <div className="mt-2 pt-2 border-t border-[#2a3a4f]/60 flex items-center justify-between text-xs">
                    <span>👷 Tecnico: {intItem.tecnico}</span>
                    <span className="font-mono font-bold text-[#f59e0b]">
                      {formattaEuro(intItem.importoStimato)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
      </section>

      {/* =====================================================================
          LEGENDA STATI E MARCATURA FERIE
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-[#94a3b8]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#f59e0b]" />
            <strong className="text-[#f59e0b]">In corso</strong> (Arancione)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-[#94a3b8]" />
            <strong className="text-[#f1f5f9]">Programmato</strong> (Grigio)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
            <strong className="text-[#10b981]">Completato</strong> (Verde)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Palmtree className="w-3.5 h-3.5 text-purple-400" />
            <strong className="text-purple-400">Assenza / Ferie</strong> (Marcatura Viola)
          </span>
        </div>
        <span>Clicca su uno slot per aprire o creare un intervento</span>
      </div>

      {/* =====================================================================
          VISTA CALENDARIO SETTIMANALE A 7 COLONNE (Lun - Dom) CON MARCATURA FERIE
         ===================================================================== */}
      <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            {/* Intestazione 7 Colonne Giorni */}
            <div className="grid grid-cols-7 border-b border-[#2a3a4f] bg-[#0f1720]/70">
              {giorni.map((g) => {
                const countGiorno = interventiFiltrati.filter(
                  (i) => i.data === g.iso,
                ).length;
                const assenzeDelGiorno = getAssenzeGiorno(g.iso);
                const haAssenze = assenzeDelGiorno.length > 0;

                return (
                  <div
                    key={g.iso}
                    className={`p-3 border-r last:border-r-0 border-[#2a3a4f] flex flex-col justify-between transition-colors ${
                      g.isOggi
                        ? 'bg-[#f59e0b]/10'
                        : haAssenze
                          ? 'bg-purple-500/[0.08]'
                          : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold uppercase tracking-wider ${
                            g.isOggi ? 'text-[#f59e0b]' : 'text-[#94a3b8]'
                          }`}
                        >
                          {g.nomeBreve}
                        </span>
                        {g.isOggi ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f59e0b] text-[#0f1720]">
                            OGGI
                          </span>
                        ) : haAssenze ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/40">
                            🏖️ FERIE
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-lg font-bold text-[#f1f5f9] tabular-nums">
                          {g.giornoMese}/{g.meseNumero}
                        </span>
                        <span className="text-[11px] text-[#94a3b8] tabular-nums">
                          {countGiorno} int.
                        </span>
                      </div>
                    </div>

                    {/* MARCATURA SPECIFICA ASSENZE / FERIE NELLA COLONNA DEL GIORNO */}
                    <div className="mt-2.5 pt-2 border-t border-[#2a3a4f]/70 space-y-1.5">
                      {haAssenze ? (
                        assenzeDelGiorno.map((assenza) => (
                          <div
                            key={assenza.id}
                            style={{
                              backgroundImage:
                                'repeating-linear-gradient(135deg, rgba(168,85,247,0.16) 0px, rgba(168,85,247,0.16) 6px, rgba(15,23,32,0.5) 6px, rgba(15,23,32,0.5) 12px)',
                            }}
                            className="p-2 rounded-lg border border-purple-500/50 text-left shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-purple-200 truncate">
                                🏖️ {assenza.tecnico}
                              </span>
                              <button
                                type="button"
                                onClick={() => onEliminaFerie(assenza.id)}
                                className="text-purple-300/70 hover:text-[#ef4444] p-0.5"
                                title="Rimuovi giorno di assenza"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="block text-[10px] font-semibold text-purple-300 uppercase tracking-tight">
                              {assenza.tipo} · Assente
                            </span>
                          </div>
                        ))
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSegnaAssenzaGiorno(g.iso)}
                          className="w-full py-1 px-2 rounded-lg text-[10px] font-medium text-[#94a3b8]/70 hover:text-purple-300 hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30 transition-colors text-center"
                        >
                          + Segna ferie
                        </button>
                      )}
                    </div>

                    {/* NOTIFICA SCADENZA MANUTENZIONI PROGRAMMATE NEL GIORNO */}
                    {getManutenzioniGiorno(g.iso).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-[#2a3a4f]/70 space-y-1">
                        {getManutenzioniGiorno(g.iso).map((man) => (
                          <div
                            key={man.id}
                            className="p-1.5 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-left shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-extrabold text-[#f59e0b] flex items-center gap-1 truncate">
                                <CalendarClock className="w-3 h-3 shrink-0" />
                                <span>Scad. {man.frequenza}</span>
                              </span>
                              <span className="text-[9px] font-mono text-[#10b981] font-bold shrink-0">
                                {formattaEuro(man.costoStimato)}
                              </span>
                            </div>
                            <p
                              className="text-[10px] font-extrabold text-[#f1f5f9] truncate mt-0.5"
                              title={man.impianto}
                            >
                              {man.impianto}
                            </p>
                            <p className="text-[9px] text-[#94a3b8] truncate">
                              👤 {man.clienteNome} (👷 {man.tecnicoAssegnato})
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                if (onPianificaInterventoDaManutenzione) {
                                  onPianificaInterventoDaManutenzione(
                                    man,
                                    g.iso,
                                  );
                                } else {
                                  onApriNuovoIntervento(g.iso);
                                }
                              }}
                              className="w-full mt-1 py-1 px-1 rounded-md bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] font-extrabold text-[9px] flex items-center justify-center gap-1 transition-colors shadow-sm"
                              title="Pianifica intervento in questo giorno"
                            >
                              <CalendarIcon className="w-2.5 h-2.5" />
                              <span>Pianifica</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Righe Fasce Orarie */}
            {FASCE_ORARIE.map((fascia) => (
              <div
                key={fascia.id}
                className="border-b last:border-b-0 border-[#2a3a4f]"
              >
                {/* Barra sottile indicatrice fascia oraria */}
                <div className="bg-[#0f1720]/40 px-3 py-1.5 border-b border-[#2a3a4f]/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono font-semibold text-[#f59e0b] tabular-nums">
                    🕐 Fascia oraria {fascia.label}
                  </span>
                </div>

                {/* 7 celle per i 7 giorni della settimana in questa fascia oraria */}
                <div className="grid grid-cols-7 min-h-[125px]">
                  {giorni.map((g) => {
                    const assenzeDelGiorno = getAssenzeGiorno(g.iso);
                    const tecnicoFiltratoInFerie =
                      tecnicoSelezionato !== 'Tutti' &&
                      assenzeDelGiorno.some(
                        (a) => a.tecnico === tecnicoSelezionato,
                      );

                    const interventiCella = interventiFiltrati
                      .filter((item) => {
                        if (item.data !== g.iso) return false;
                        const oraDec = parseOraDecimale(item.oraInizio);
                        return oraDec >= fascia.minOra && oraDec < fascia.maxOra;
                      })
                      .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));

                    return (
                      <div
                        key={`${g.iso}-${fascia.id}`}
                        style={
                          tecnicoFiltratoInFerie
                            ? {
                                backgroundImage:
                                  'repeating-linear-gradient(135deg, rgba(168,85,247,0.08) 0px, rgba(168,85,247,0.08) 8px, transparent 8px, transparent 16px)',
                              }
                            : undefined
                        }
                        className={`p-2 border-r last:border-r-0 border-[#2a3a4f] flex flex-col gap-2 ${
                          g.isOggi
                            ? 'bg-[#f59e0b]/[0.03]'
                            : assenzeDelGiorno.length > 0
                              ? 'bg-purple-500/[0.03]'
                              : ''
                        }`}
                      >
                        {interventiCella.map((intervento) => {
                          const tecnicoAssente = assenzeDelGiorno.some(
                            (a) => a.tecnico === intervento.tecnico,
                          );
                          const prossimoStato: InterventoItem['stato'] =
                            intervento.stato === 'Programmato'
                              ? 'In corso'
                              : intervento.stato === 'In corso'
                                ? 'Completato'
                                : 'Programmato';

                          return (
                            <div
                              key={intervento.id}
                              onClick={() =>
                                onApriDettaglioIntervento(intervento)
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  onApriDettaglioIntervento(intervento);
                                }
                              }}
                              className={`w-full text-left p-2.5 rounded-xl border transition-all shadow-sm hover:scale-[1.01] cursor-pointer ${getStileCardStato(
                                intervento.stato,
                              )}`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
                                <span className="text-[#f59e0b] tabular-nums">
                                  🕐 {intervento.oraInizio}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCambiaStatoIntervento(
                                      intervento.id,
                                      prossimoStato,
                                    );
                                  }}
                                  title="Tocca per cambiare stato e inviare notifica push al tecnico"
                                  className={`px-1.5 py-0.5 rounded bg-[#0f1720]/70 hover:bg-[#0f1720] border border-[#2a3a4f] ${getColoreTestoStato(
                                    intervento.stato,
                                  )}`}
                                >
                                  {intervento.stato} ↻
                                </button>
                              </div>

                              <p className="text-xs font-bold text-[#f1f5f9] mt-1 line-clamp-2 leading-snug">
                                {intervento.titolo}
                              </p>

                              <div className="mt-2 pt-1.5 border-t border-[#2a3a4f]/60 flex items-center justify-between text-[11px] text-[#94a3b8]">
                                <span
                                  className={
                                    tecnicoAssente
                                      ? 'text-purple-300 font-semibold'
                                      : ''
                                  }
                                >
                                  👷 {intervento.tecnico}
                                  {tecnicoAssente ? ' (In ferie!)' : ''}
                                </span>
                                <span className="font-mono tabular-nums text-[#f1f5f9]">
                                  {formattaEuro(intervento.importoStimato)}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {interventiCella.length === 0 && (
                          <button
                            type="button"
                            onClick={() => onApriNuovoIntervento(g.iso)}
                            className={`flex-1 min-h-[64px] rounded-xl border border-dashed text-[11px] flex items-center justify-center transition-colors ${
                              tecnicoFiltratoInFerie
                                ? 'border-purple-500/30 text-purple-300/70 hover:bg-purple-500/10'
                                : 'border-[#2a3a4f]/50 hover:border-[#f59e0b]/50 hover:bg-[#0f1720]/40 text-transparent hover:text-[#94a3b8]'
                            }`}
                            title={`Aggiungi intervento per ${g.nomeCompleto}`}
                          >
                            {tecnicoFiltratoInFerie
                              ? `🏖️ ${tecnicoSelezionato} Assente`
                              : '+ Aggiungi'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          PULSANTE "+" FLOTTANTE PER AGGIUNGERE NUOVO INTERVENTO
         ===================================================================== */}
      <button
        type="button"
        onClick={() => onApriNuovoIntervento()}
        className="fixed bottom-20 lg:bottom-8 right-5 lg:right-8 z-30 w-14 h-14 rounded-2xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] shadow-xl shadow-[#f59e0b]/25 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        aria-label="Aggiungi nuovo intervento"
        title="Nuovo intervento"
      >
        <Plus className="w-7 h-7 stroke-[2.8]" />
      </button>
    </div>
  );
}
