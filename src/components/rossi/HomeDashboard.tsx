import React from 'react';
import {
  Plus,
  UserPlus,
  FilePlus2,
  Phone,
  Navigation,
  Eye,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Wrench,
  FileSpreadsheet,
  FileDown,
  FileText,
  Check,
  X,
  PieChart as PieChartIcon,
  Search,
  Timer,
  Users,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  formattaEuro,
  formattaDataItaliana,
  getSettimanaCorrente,
  TECNICI_INIZIALI,
} from '@/data.js';
import type { AvvisoItem } from './HeaderENavigazione';
import NoteRapideCantiere, {
  type NotaCantiereItem,
} from './NoteRapideCantiere';
import FeedAttivitaTempoReale from './FeedAttivitaTempoReale';
import MeteoCantiereVicenza from './MeteoCantiereVicenza';
import type { NotificaPushLocalePayload } from '@/lib/notifichePushLocali';
import type { ImpostazioniMeteoVicenza } from './ImpostazioniMeteoModal';

export interface InterventoItem {
  id: string;
  clienteId: string;
  clienteNome: string;
  titolo: string;
  descrizione: string;
  tipo: string;
  data: string;
  oraInizio: string;
  oraFine: string;
  durataOre: number;
  stato: 'Programmato' | 'In corso' | 'Completato';
  tecnico: 'Luca' | 'Andrea' | 'Marco' | string;
  indirizzo: string;
  telefonoCliente: string;
  importoStimato: number;
  priorita: 'Bassa' | 'Media' | 'Alta';
  noteTecniche?: string;
}

export interface PreventivoItem {
  id: string;
  numero: string;
  clienteId: string;
  clienteNome: string;
  titolo: string;
  descrizione: string;
  importo: number;
  dataEmissione: string;
  validitaFino: string;
  stato: 'In attesa' | 'Accettato' | 'Rifiutato';
  tipo: string;
}

interface HomeDashboardProps {
  interventi: InterventoItem[];
  preventivi: PreventivoItem[];
  fatturatoMese: number;
  trendMesePercentuale: number;
  avvisi: AvvisoItem[];
  onApriNuovoIntervento: () => void;
  onApriNuovoCliente: () => void;
  onApriNuovoPreventivo: () => void;
  onApriDettaglioIntervento: (intervento: InterventoItem) => void;
  onCambiaStatoIntervento: (id: string, nuovoStato: InterventoItem['stato']) => void;
  onCambiaStatoPreventivo: (id: string, nuovoStato: PreventivoItem['stato']) => void;
  onSegnaAvvisoLetto: (id: string) => void;
  onChiamaCliente: (telefono: string, nome: string) => void;
  onNavigaIndirizzo: (indirizzo: string, titolo: string) => void;
  onVaiAdAgenda: () => void;
  onVaiAFatture: () => void;
  onVaiAReport: () => void;
  onEsportaInterventiOggiCsv: (
    interventiOggi: InterventoItem[],
    oggiIso: string,
  ) => void;
  onEsportaInterventiOggiPdf: (
    interventiOggi: InterventoItem[],
    oggiIso: string,
  ) => void;
  noteCantiere: NotaCantiereItem[];
  onAggiungiNotaCantiere: (nuovaNota: Omit<NotaCantiereItem, 'id'>) => void;
  onEliminaNotaCantiere: (id: string) => void;
  onToggleImportanteNotaCantiere: (id: string) => void;
  onAttivaPushAllertaMeteo?: (
    payload: Omit<NotificaPushLocalePayload, 'id' | 'orario'>,
  ) => void;
  impostazioniMeteo?: ImpostazioniMeteoVicenza;
  onApriImpostazioniMeteo?: () => void;
}

/**
 * PAGINA 1 — HOME (Dashboard Operativa Cantiere)
 * - Saluto "Buongiorno Mario 👋" + sottotitolo dinamico + barra di avanzamento giornata
 * - 3 KPI card interattive in griglia orizzontale con bordo superiore colorato (OGGI, PREVENTIVI, MESE)
 * - Sezione "Azioni rapide" con 3 pulsanti grandi (➕ Nuovo intervento, 👤 Nuovo cliente, 📄 Nuovo preventivo)
 * - Sezione "Interventi di oggi" con card complete, priorità visibile, note furgone e 3 pulsanti (Dettagli, Chiama, Naviga) + Esporta CSV/PDF
 * - Sezione "Note Rapide di Cantiere" (testuali e vocali)
 * - Sezione "Preventivi in Attesa di Conferma" con approvazione rapida in 1 tap
 * - Sezione "Andamento settimana" con grafico a barre orizzontali Lun-Dom
 * - Sezione "Avvisi" con 3 alert colorati interattivi (giallo per scadenze, rosso per urgenze)
 */
export default function HomeDashboard({
  interventi,
  preventivi,
  fatturatoMese,
  trendMesePercentuale,
  avvisi,
  onApriNuovoIntervento,
  onApriNuovoCliente,
  onApriNuovoPreventivo,
  onApriDettaglioIntervento,
  onCambiaStatoIntervento,
  onCambiaStatoPreventivo,
  onSegnaAvvisoLetto,
  onChiamaCliente,
  onNavigaIndirizzo,
  onVaiAdAgenda,
  onVaiAFatture,
  onVaiAReport,
  onEsportaInterventiOggiCsv,
  onEsportaInterventiOggiPdf,
  noteCantiere,
  onAggiungiNotaCantiere,
  onEliminaNotaCantiere,
  onToggleImportanteNotaCantiere,
  onAttivaPushAllertaMeteo,
  impostazioniMeteo,
  onApriImpostazioniMeteo,
}: HomeDashboardProps) {
  const { oggiIso, giorni } = getSettimanaCorrente();
  const [filtroStatoOggi, setFiltroStatoOggi] = React.useState<string>('Tutti');
  const [queryRicercaInterventi, setQueryRicercaInterventi] =
    React.useState<string>('');
  const [cercaInTuttaLaSettimana, setCercaInTuttaLaSettimana] =
    React.useState<boolean>(false);
  const [isClientMounted, setIsClientMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // Filtra interventi previsti per la data di oggi e ordina per orario
  const interventiOggi = React.useMemo(() => {
    return interventi
      .filter((item) => item.data === oggiIso)
      .sort((a, b) => a.oraInizio.localeCompare(b.oraInizio));
  }, [interventi, oggiIso]);

  const interventiOggiFiltrati = React.useMemo(() => {
    const queryPulita = queryRicercaInterventi.trim().toLowerCase();
    const baseLista = cercaInTuttaLaSettimana ? interventi : interventiOggi;

    return baseLista.filter((i) => {
      const matchStato =
        filtroStatoOggi === 'Tutti' || i.stato === filtroStatoOggi;
      if (!matchStato) return false;
      if (!queryPulita) return true;

      const matchTecnico = (i.tecnico || '').toLowerCase().includes(queryPulita);
      const matchCliente = (i.clienteNome || '')
        .toLowerCase()
        .includes(queryPulita);
      const matchTitolo = (i.titolo || '').toLowerCase().includes(queryPulita);
      const matchIndirizzo = (i.indirizzo || '')
        .toLowerCase()
        .includes(queryPulita);

      return matchTecnico || matchCliente || matchTitolo || matchIndirizzo;
    });
  }, [
    interventi,
    interventiOggi,
    filtroStatoOggi,
    queryRicercaInterventi,
    cercaInTuttaLaSettimana,
  ]);

  const completatiOggiCount = React.useMemo(
    () => interventiOggi.filter((i) => i.stato === 'Completato').length,
    [interventiOggi],
  );
  const inCorsoOggiCount = React.useMemo(
    () => interventiOggi.filter((i) => i.stato === 'In corso').length,
    [interventiOggi],
  );
  const percentualeCompletamentoOggi =
    interventiOggi.length > 0
      ? Math.round((completatiOggiCount / interventiOggi.length) * 100)
      : 0;

  // Numero preventivi "In attesa"
  const preventiviInAttesa = React.useMemo(
    () => preventivi.filter((p) => p.stato === 'In attesa'),
    [preventivi],
  );

  // Calcolo statistiche per l'andamento settimana (Lun - Dom)
  const datiSettimana = React.useMemo(() => {
    return giorni.map((g) => {
      const delGiorno = interventi.filter((i) => i.data === g.iso);
      const importoGiorno = delGiorno.reduce(
        (acc, cur) => acc + (Number(cur.importoStimato) || 0),
        0,
      );
      return {
        ...g,
        numeroInterventi: delGiorno.length,
        completati: delGiorno.filter((i) => i.stato === 'Completato').length,
        importoGiorno,
      };
    });
  }, [giorni, interventi]);

  const maxInterventiGiorno = Math.max(
    4,
    ...datiSettimana.map((d) => d.numeroInterventi),
  );

  // Scope per il grafico a torta Recharts (Settimana intera vs Solo Oggi)
  const [ambitoGraficoStati, setAmbitoGraficoStati] = React.useState<
    'settimana' | 'oggi'
  >('settimana');

  // Calcolo distribuzione degli interventi per stato (In corso, Completato, Programmato) per Recharts PieChart
  const datiDistribuzioneStati = React.useMemo(() => {
    const sorgente =
      ambitoGraficoStati === 'oggi' ? interventiOggi : interventi;
    const totale = Math.max(1, sorgente.length);

    const statiConfig: Array<{
      name: InterventoItem['stato'];
      color: string;
      bgBadge: string;
    }> = [
      {
        name: 'In corso',
        color: '#f59e0b',
        bgBadge: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/35',
      },
      {
        name: 'Completato',
        color: '#10b981',
        bgBadge: 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/35',
      },
      {
        name: 'Programmato',
        color: '#64748b',
        bgBadge: 'bg-slate-700/60 text-[#f1f5f9] border-slate-500/50',
      },
    ];

    return statiConfig.map((cfg) => {
      const items = sorgente.filter((i) => i.stato === cfg.name);
      const value = items.length;
      const percentuale = Math.round((value / totale) * 100);
      const valoreEconomico = items.reduce(
        (acc, cur) => acc + (Number(cur.importoStimato) || 0),
        0,
      );
      const oreTotali = items.reduce(
        (acc, cur) => acc + (Number(cur.durataOre) || 2.5),
        0,
      );
      return {
        ...cfg,
        value,
        percentuale,
        valoreEconomico,
        oreTotali: Math.round(oreTotali * 10) / 10,
      };
    });
  }, [interventi, interventiOggi, ambitoGraficoStati]);

  const totaleInterventiGrafico =
    ambitoGraficoStati === 'oggi' ? interventiOggi.length : interventi.length;

  // Calcolo Tempi Medi di Intervento per Tecnico (Recharts BarChart per supervisione squadra)
  const datiTempiMediPerTecnico = React.useMemo(() => {
    const sorgente =
      ambitoGraficoStati === 'oggi' ? interventiOggi : interventi;

    return TECNICI_INIZIALI.map((tec) => {
      const interventiTec = sorgente.filter(
        (i) => i.tecnico.toLowerCase() === tec.nome.toLowerCase(),
      );
      const listaCalcolo =
        interventiTec.length > 0
          ? interventiTec
          : interventi.filter(
              (i) => i.tecnico.toLowerCase() === tec.nome.toLowerCase(),
            );

      const oreTotali = listaCalcolo.reduce(
        (acc, cur) => acc + (Number(cur.durataOre) || 2.5),
        0,
      );
      const tempoMedioOre =
        listaCalcolo.length > 0
          ? Math.round((oreTotali / listaCalcolo.length) * 100) / 100
          : 2.5;

      const completatiCount = listaCalcolo.filter(
        (i) => i.stato === 'Completato',
      ).length;
      const inCorsoCount = listaCalcolo.filter(
        (i) => i.stato === 'In corso',
      ).length;
      const programmatiCount = listaCalcolo.filter(
        (i) => i.stato === 'Programmato',
      ).length;

      const oreIntere = Math.floor(tempoMedioOre);
      const minutiRestanti = Math.round((tempoMedioOre - oreIntere) * 60);
      const etichettaDurata =
        minutiRestanti > 0
          ? `${oreIntere}h ${String(minutiRestanti).padStart(2, '0')}m`
          : `${oreIntere}h`;

      return {
        id: tec.id,
        tecnico: tec.nome,
        nomeCompleto: tec.nomeCompleto,
        specializzazione: tec.specializzazione,
        colore: tec.colore,
        tempoMedioOre,
        targetSlaOre: 2.9,
        etichettaDurata,
        totaleInterventi: listaCalcolo.length,
        oreTotali: Math.round(oreTotali * 10) / 10,
        completatiCount,
        inCorsoCount,
        programmatiCount,
      };
    });
  }, [interventi, interventiOggi, ambitoGraficoStati]);

  const mediaSquadraOre = React.useMemo(() => {
    if (datiTempiMediPerTecnico.length === 0) return 2.5;
    const somma = datiTempiMediPerTecnico.reduce(
      (acc, t) => acc + t.tempoMedioOre,
      0,
    );
    return Math.round((somma / datiTempiMediPerTecnico.length) * 100) / 100;
  }, [datiTempiMediPerTecnico]);

  // Helper per il badge di stato intervento (In corso = arancione, Programmato = grigio, Completato = verde)
  const renderStatoBadge = (stato: InterventoItem['stato']) => {
    if (stato === 'In corso') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/50 shadow-sm">
          <Clock className="w-3.5 h-3.5" />
          <span>In corso</span>
        </span>
      );
    }
    if (stato === 'Completato') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Completato</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-700/70 text-[#f1f5f9] border border-slate-500/60">
        <Wrench className="w-3.5 h-3.5 text-[#94a3b8]" />
        <span>Programmato</span>
      </span>
    );
  };

  // Prossimo stato rapido al tap
  const calcolaProssimoStato = (
    statoAttuale: InterventoItem['stato'],
  ): InterventoItem['stato'] => {
    if (statoAttuale === 'Programmato') return 'In corso';
    if (statoAttuale === 'In corso') return 'Completato';
    return 'Programmato';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* =====================================================================
          1. SALUTO, SOTTOTITOLO E BARRA AVANZAMENTO GIORNATA CANTIERE
         ===================================================================== */}
      <section className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f1f5f9] tracking-tight">
              Buongiorno Mario
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 text-xs font-bold text-[#10b981]">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              Squadra Operativa (Vicenza)
            </span>
          </div>
          <p className="text-sm sm:text-base text-[#94a3b8] mt-1">
            Oggi hai{' '}
            <strong className="text-[#f59e0b] font-bold tabular-nums">
              {interventiOggi.length}{' '}
              {interventiOggi.length === 1
                ? 'intervento programmato'
                : 'interventi programmati'}
            </strong>{' '}
            ({inCorsoOggiCount} in corso · {completatiOggiCount}{' '}
            {completatiOggiCount === 1 ? 'completato' : 'completati'})
          </p>
        </div>

        {/* Box Avanzamento Giornaliero Visibile */}
        <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3 sm:w-72 shrink-0 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#94a3b8]">
              Avanzamento Cantiere Oggi
            </span>
            <span className="font-mono font-bold text-[#f59e0b] tabular-nums">
              {completatiOggiCount}/{interventiOggi.length} ({percentualeCompletamentoOggi}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#1a2332] overflow-hidden border border-[#2a3a4f]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#10b981] transition-all duration-500"
              style={{ width: `${Math.max(percentualeCompletamentoOggi, inCorsoOggiCount > 0 ? 25 : 0)}%` }}
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          1-BIS. WIDGET METEO CANTIERE VICENZA & RETE ITALIA (con Push Automatica)
         ===================================================================== */}
      <MeteoCantiereVicenza
        onAttivaPushAllertaMeteo={onAttivaPushAllertaMeteo}
        impostazioniMeteo={impostazioniMeteo}
        onApriImpostazioniMeteo={onApriImpostazioniMeteo}
      />

      {/* =====================================================================
          2. 3 KPI CARD IN GRIGLIA ORIZZONTALE (con bordo superiore colorato e navigazione rapida)
         ===================================================================== */}
      <section aria-label="Indicatori chiave di prestazione">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: OGGI */}
          <button
            type="button"
            onClick={onVaiAdAgenda}
            className="text-left bg-[#1a2332] hover:bg-[#1a2332]/90 border border-[#2a3a4f] hover:border-[#f59e0b] border-t-4 border-t-[#f59e0b] rounded-2xl p-3.5 sm:p-5 shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-extrabold tracking-wider text-[#94a3b8]">
                OGGI
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#f59e0b] transition-colors" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#f1f5f9] tabular-nums">
                {interventiOggi.length}
              </span>
              <span className="text-xs text-[#94a3b8] hidden sm:inline">
                interventi
              </span>
            </div>
            <p className="text-[11px] text-[#f59e0b] mt-1 font-semibold truncate">
              {completatiOggiCount} completati · {inCorsoOggiCount} attivi
            </p>
          </button>

          {/* Card 2: PREVENTIVI */}
          <button
            type="button"
            onClick={onVaiAFatture}
            className="text-left bg-[#1a2332] hover:bg-[#1a2332]/90 border border-[#2a3a4f] hover:border-sky-400 border-t-4 border-t-sky-500 rounded-2xl p-3.5 sm:p-5 shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-extrabold tracking-wider text-[#94a3b8]">
                PREVENTIVI
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-sky-400 transition-colors" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#f1f5f9] tabular-nums">
                {preventiviInAttesa.length}
              </span>
              <span className="text-xs text-[#94a3b8] hidden sm:inline">
                in attesa
              </span>
            </div>
            <p className="text-[11px] text-sky-400 mt-1 font-semibold truncate tabular-nums">
              Valore:{' '}
              {formattaEuro(
                preventiviInAttesa.reduce((s, p) => s + p.importo, 0),
              )}
            </p>
          </button>

          {/* Card 3: MESE */}
          <button
            type="button"
            onClick={onVaiAReport}
            className="text-left bg-[#1a2332] hover:bg-[#1a2332]/90 border border-[#2a3a4f] hover:border-[#10b981] border-t-4 border-t-[#10b981] rounded-2xl p-3.5 sm:p-5 shadow-md transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-extrabold tracking-wider text-[#94a3b8]">
                MESE
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#94a3b8] group-hover:text-[#10b981] transition-colors" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-lg sm:text-3xl font-extrabold text-[#f1f5f9] tabular-nums truncate">
                {formattaEuro(fatturatoMese)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#10b981] mt-1 font-bold tabular-nums">
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
              <span>+{trendMesePercentuale}% vs set</span>
            </div>
          </button>
        </div>
      </section>

      {/* =====================================================================
          3. SEZIONE "AZIONI RAPIDE" (3 pulsanti grandi con icona + label)
         ===================================================================== */}
      <section aria-labelledby="heading-azioni-rapide">
        <div className="flex items-center justify-between mb-3">
          <h2
            id="heading-azioni-rapide"
            className="text-base sm:text-lg font-bold text-[#f1f5f9]"
          >
            Azioni rapide
          </h2>
          <span className="text-xs text-[#94a3b8]">
            Operatività veloce con una mano sola
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* ➕ Nuovo intervento */}
          <button
            type="button"
            onClick={onApriNuovoIntervento}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#1a2332] hover:bg-[#1a2332]/80 border border-[#2a3a4f] hover:border-[#f59e0b] text-left transition-all group shadow-sm active:scale-[0.99] min-h-[68px]"
          >
            <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center text-lg shrink-0 group-hover:bg-[#f59e0b] group-hover:text-[#0f1720] transition-colors">
              <span role="img" aria-hidden="true">
                ➕
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm sm:text-base font-bold text-[#f1f5f9] group-hover:text-[#f59e0b] transition-colors">
                Nuovo intervento
              </span>
              <span className="block text-xs text-[#94a3b8] truncate">
                Pianifica uscita tecnico in agenda
              </span>
            </div>
            <Plus className="w-5 h-5 text-[#94a3b8] group-hover:text-[#f59e0b] shrink-0" />
          </button>

          {/* 👤 Nuovo cliente */}
          <button
            type="button"
            onClick={onApriNuovoCliente}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#1a2332] hover:bg-[#1a2332]/80 border border-[#2a3a4f] hover:border-sky-400 text-left transition-all group shadow-sm active:scale-[0.99] min-h-[68px]"
          >
            <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/40 flex items-center justify-center text-lg shrink-0 group-hover:bg-sky-500 group-hover:text-[#0f1720] transition-colors">
              <span role="img" aria-hidden="true">
                👤
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm sm:text-base font-bold text-[#f1f5f9] group-hover:text-sky-400 transition-colors">
                Nuovo cliente
              </span>
              <span className="block text-xs text-[#94a3b8] truncate">
                Registra anagrafica e cantiere
              </span>
            </div>
            <UserPlus className="w-5 h-5 text-[#94a3b8] group-hover:text-sky-400 shrink-0" />
          </button>

          {/* 📄 Nuovo preventivo */}
          <button
            type="button"
            onClick={onApriNuovoPreventivo}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#1a2332] hover:bg-[#1a2332]/80 border border-[#2a3a4f] hover:border-[#10b981] text-left transition-all group shadow-sm active:scale-[0.99] min-h-[68px]"
          >
            <div className="w-12 h-12 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center text-lg shrink-0 group-hover:bg-[#10b981] group-hover:text-[#0f1720] transition-colors">
              <span role="img" aria-hidden="true">
                📄
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-sm sm:text-base font-bold text-[#f1f5f9] group-hover:text-[#10b981] transition-colors">
                Nuovo preventivo
              </span>
              <span className="block text-xs text-[#94a3b8] truncate">
                Crea offerta idraulica o elettrica
              </span>
            </div>
            <FilePlus2 className="w-5 h-5 text-[#94a3b8] group-hover:text-[#10b981] shrink-0" />
          </button>
        </div>
      </section>

      {/* =====================================================================
          4. SEZIONE "INTERVENTI DI OGGI" (con Filtri Rapidi + Esportazione CSV e PDF Offline)
         ===================================================================== */}
      <section aria-labelledby="heading-interventi-oggi">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2
                id="heading-interventi-oggi"
                className="text-base sm:text-lg font-bold text-[#f1f5f9]"
              >
                Interventi di oggi ({formattaDataItaliana(oggiIso)})
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30">
                {interventiOggiFiltrati.length} mostrati
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Tocca il badge stato per aggiornarlo o scarica il foglio cantiere offline in CSV / PDF
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro rapido stato interventi odierni */}
            <div className="flex flex-wrap items-center gap-1 bg-[#1a2332] p-1 rounded-xl border border-[#2a3a4f]">
              {(['Tutti', 'In corso', 'Programmato', 'Completato'] as const).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFiltroStatoOggi(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${
                      filtroStatoOggi === st
                        ? 'bg-[#f59e0b] text-[#0f1720]'
                        : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                    }`}
                  >
                    {st}
                  </button>
                ),
              )}
            </div>

            {/* Pulsante Esporta CSV */}
            <button
              type="button"
              onClick={() =>
                onEsportaInterventiOggiCsv(interventiOggi, oggiIso)
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a2332] hover:bg-[#10b981]/15 text-[#f1f5f9] hover:text-[#10b981] border border-[#2a3a4f] hover:border-[#10b981]/50 text-xs font-bold transition-colors min-h-[38px] whitespace-nowrap"
              title="Scarica elenco interventi di oggi in formato CSV (Excel)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
              <span>Esporta CSV</span>
            </button>

            {/* Pulsante Esporta PDF */}
            <button
              type="button"
              onClick={() =>
                onEsportaInterventiOggiPdf(interventiOggi, oggiIso)
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a2332] hover:bg-[#f59e0b]/15 text-[#f1f5f9] hover:text-[#f59e0b] border border-[#2a3a4f] hover:border-[#f59e0b]/50 text-xs font-bold transition-colors min-h-[38px] whitespace-nowrap"
              title="Scarica foglio di cantiere degli interventi di oggi in formato PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
              <span>Esporta PDF</span>
            </button>

            {/* Link Vedi agenda */}
            <button
              type="button"
              onClick={onVaiAdAgenda}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-bold text-[#f59e0b] hover:underline min-h-[38px] whitespace-nowrap"
            >
              <span>Agenda</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Barra di Ricerca in Tempo Reale per Nome Tecnico o Nome Cliente */}
        <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-3 sm:p-3.5 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={queryRicercaInterventi}
              onChange={(e) => setQueryRicercaInterventi(e.target.value)}
              placeholder="Cerca intervento per nome tecnico (Luca, Andrea, Marco) o nome cliente..."
              aria-label="Cerca intervento per nome tecnico o cliente"
              className="w-full bg-[#0f1720] border border-[#2a3a4f] focus:border-[#f59e0b] rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm text-[#f1f5f9] placeholder:text-[#94a3b8] focus:outline-none transition-colors"
            />
            {queryRicercaInterventi && (
              <button
                type="button"
                onClick={() => setQueryRicercaInterventi('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1a2332]"
                title="Cancella ricerca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Pulsanti rapidi per filtrare al volo un Tecnico o estendere alla settimana */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-[#94a3b8] mr-1">
              Tecnico:
            </span>
            {TECNICI_INIZIALI.map((tec) => {
              const attivo =
                queryRicercaInterventi.trim().toLowerCase() ===
                tec.nome.toLowerCase();
              return (
                <button
                  key={tec.id}
                  type="button"
                  onClick={() =>
                    setQueryRicercaInterventi(attivo ? '' : tec.nome)
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                    attivo
                      ? 'bg-[#f59e0b] text-[#0f1720] border-[#f59e0b]'
                      : 'bg-[#0f1720] text-[#f1f5f9] hover:border-[#f59e0b]/50 border-[#2a3a4f]'
                  }`}
                >
                  👷 {tec.nome}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCercaInTuttaLaSettimana((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                cercaInTuttaLaSettimana
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border-[#2a3a4f]'
              }`}
              title="Alterna ricerca tra solo oggi e tutti gli interventi della settimana"
            >
              {cercaInTuttaLaSettimana
                ? `📅 Tutta la settimana (${interventi.length})`
                : `📅 Solo oggi (${interventiOggi.length})`}
            </button>
          </div>
        </div>

        {interventiOggiFiltrati.length === 0 ? (
          <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm font-bold text-[#f1f5f9]">
              Nessun intervento trovato
              {queryRicercaInterventi
                ? ` per "${queryRicercaInterventi}"`
                : ` con stato "${filtroStatoOggi}"`}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {(filtroStatoOggi !== 'Tutti' || queryRicercaInterventi) && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroStatoOggi('Tutti');
                    setQueryRicercaInterventi('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-xs font-semibold text-[#f1f5f9]"
                >
                  Mostra tutti ({cercaInTuttaLaSettimana ? interventi.length : interventiOggi.length})
                </button>
              )}
              <button
                type="button"
                onClick={onApriNuovoIntervento}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f59e0b] text-[#0f1720] font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nuovo intervento oggi</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {interventiOggiFiltrati.map((intervento) => (
              <article
                key={intervento.id}
                className={`bg-[#1a2332] border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-md ${
                  intervento.stato === 'In corso'
                    ? 'border-[#f59e0b]/60 ring-1 ring-[#f59e0b]/25'
                    : intervento.stato === 'Completato'
                      ? 'border-[#10b981]/50'
                      : 'border-[#2a3a4f] hover:border-[#f59e0b]/50'
                }`}
              >
                <div>
                  {/* Riga superiore: Orario in arancione + Priorità + Status badge cliccabile */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-extrabold text-[#f59e0b] tabular-nums">
                        🕐 {intervento.oraInizio}
                        {intervento.oraFine ? ` - ${intervento.oraFine}` : ''}
                      </span>
                      {intervento.priorita === 'Alta' && (
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40">
                          Urgente
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onCambiaStatoIntervento(
                          intervento.id,
                          calcolaProssimoStato(intervento.stato),
                        )
                      }
                      title="Tocca per avanzare lo stato dell'intervento"
                      className="focus:outline-none active:scale-95 transition-transform"
                    >
                      {renderStatoBadge(intervento.stato)}
                    </button>
                  </div>

                  {/* Badge reparto */}
                  <span className="inline-block text-[11px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/25 px-2 py-0.5 rounded-md mb-1.5">
                    {intervento.tipo}
                  </span>

                  {/* Titolo intervento */}
                  <h3 className="text-base font-bold text-[#f1f5f9] leading-snug mb-2.5">
                    {intervento.titolo}
                  </h3>

                  {/* Indirizzo con icona 📍 e Tecnico con icona 👷 */}
                  <div className="space-y-1.5 text-xs sm:text-sm text-[#94a3b8] mb-3">
                    <p className="flex items-start gap-2">
                      <span role="img" aria-label="Indirizzo" className="shrink-0">
                        📍
                      </span>
                      <span className="text-[#f1f5f9]/95 font-medium">
                        {intervento.indirizzo}
                      </span>
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <p className="flex items-center gap-2">
                        <span role="img" aria-label="Tecnico" className="shrink-0">
                          👷
                        </span>
                        <span>
                          Tecnico:{' '}
                          <strong className="text-[#f1f5f9]">
                            {intervento.tecnico}
                          </strong>
                        </span>
                      </p>
                      <span className="text-xs font-mono tabular-nums text-[#f59e0b] font-bold bg-[#0f1720] px-2 py-0.5 rounded-md border border-[#2a3a4f]">
                        {formattaEuro(intervento.importoStimato)}
                      </span>
                    </div>
                  </div>

                  {/* Box Materiali / Note Tecniche da Furgone ben visibile */}
                  {intervento.noteTecniche && (
                    <div className="mb-3.5 p-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-xs text-[#94a3b8]">
                      <span className="font-bold text-[#f59e0b] block text-[11px] uppercase tracking-wider">
                        🧰 Dotazione / Note Furgone:
                      </span>
                      <p className="text-[#f1f5f9]/90 mt-0.5 line-clamp-2">
                        {intervento.noteTecniche}
                      </p>
                    </div>
                  )}
                </div>

                {/* 3 Pulsanti grandi: Dettagli, Chiama, Naviga */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-3 border-t border-[#2a3a4f]">
                  <button
                    type="button"
                    onClick={() => onApriDettaglioIntervento(intervento)}
                    className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl bg-[#0f1720] hover:bg-[#f59e0b]/15 text-[#f1f5f9] hover:text-[#f59e0b] border border-[#2a3a4f] text-[11px] sm:text-xs font-bold transition-colors min-h-[42px] min-w-0"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Dettagli</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onChiamaCliente(
                        intervento.telefonoCliente,
                        intervento.clienteNome,
                      )
                    }
                    className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl bg-[#0f1720] hover:bg-[#10b981]/15 text-[#f1f5f9] hover:text-[#10b981] border border-[#2a3a4f] text-[11px] sm:text-xs font-bold transition-colors min-h-[42px] min-w-0"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Chiama</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      onNavigaIndirizzo(intervento.indirizzo, intervento.titolo)
                    }
                    className="flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl bg-[#0f1720] hover:bg-sky-500/15 text-[#f1f5f9] hover:text-sky-400 border border-[#2a3a4f] text-[11px] sm:text-xs font-bold transition-colors min-h-[42px] min-w-0"
                  >
                    <Navigation className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Naviga</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================================
          4-BIS. SEZIONE "NOTE RAPIDE DI CANTIERE" (Testuali + Vocali per tutti i tecnici)
         ===================================================================== */}
      <NoteRapideCantiere
        noteCantiere={noteCantiere}
        onAggiungiNota={onAggiungiNotaCantiere}
        onEliminaNota={onEliminaNotaCantiere}
        onToggleImportanteNota={onToggleImportanteNotaCantiere}
      />

      {/* =====================================================================
          4-TER. SEZIONE "PREVENTIVI IN ATTESA DI CONFERMA" (Approvazione rapida da Dashboard)
         ===================================================================== */}
      {preventiviInAttesa.length > 0 && (
        <section
          aria-labelledby="heading-preventivi-dashboard"
          className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-3.5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2
                  id="heading-preventivi-dashboard"
                  className="text-base sm:text-lg font-bold text-[#f1f5f9]"
                >
                  Preventivi in Attesa di Risposta ({preventiviInAttesa.length})
                </h2>
                <p className="text-xs text-[#94a3b8]">
                  Approva o rifiuta direttamente le offerte confermate telefonicamente dal cliente
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onVaiAFatture}
              className="text-xs font-bold text-sky-400 hover:underline self-start sm:self-center"
            >
              Gestisci tutti i preventivi →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {preventiviInAttesa.map((prev) => (
              <div
                key={prev.id}
                className="p-3.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-sky-400">
                      {prev.numero}
                    </span>
                    <span className="font-mono font-extrabold text-[#f59e0b] tabular-nums">
                      {formattaEuro(prev.importo)}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#f1f5f9] mt-1 line-clamp-1">
                    {prev.clienteNome}
                  </h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5 line-clamp-2">
                    {prev.titolo}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#2a3a4f]/80">
                  <span className="text-[11px] text-[#94a3b8]">
                    Scad. {formattaDataItaliana(prev.validitaFino)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onCambiaStatoPreventivo(prev.id, 'Accettato')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981] text-[#10b981] hover:text-[#0f1720] border border-[#10b981]/40 text-xs font-bold transition-colors"
                      title="Segna preventivo come Accettato"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accetta</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onCambiaStatoPreventivo(prev.id, 'Rifiutato')
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#1a2332] hover:bg-[#ef4444]/20 text-[#94a3b8] hover:text-[#ef4444] border border-[#2a3a4f] text-xs font-semibold transition-colors"
                      title="Segna preventivo come Rifiutato"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          5. DATA VISUALIZATION (RECHARTS): DISTRIBUZIONE STATI & TEMPI MEDI PER TECNICO
         ===================================================================== */}
      <section
        aria-labelledby="heading-distribuzione-stati"
        className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a3a4f]">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#f59e0b]" />
              <h2
                id="heading-distribuzione-stati"
                className="text-base sm:text-lg font-extrabold text-[#f1f5f9]"
              >
                Supervisione Squadra: Stato Interventi & Tempi Medi per Tecnico
              </h2>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Analisi visiva in tempo reale con distribuzione stati (
              <strong className="text-[#f59e0b]">In corso</strong>,{' '}
              <strong className="text-[#10b981]">Completati</strong>,{' '}
              <strong className="text-slate-300">Programmati</strong>) e durata
              media per tecnico (target SLA ≤ 2,9h)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Selettore ambito: Settimana vs Solo Oggi */}
            <div className="inline-flex items-center gap-1.5 bg-[#0f1720] border border-[#2a3a4f] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAmbitoGraficoStati('settimana')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  ambitoGraficoStati === 'settimana'
                    ? 'bg-[#f59e0b] text-[#0f1720]'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                Settimana ({interventi.length})
              </button>
              <button
                type="button"
                onClick={() => setAmbitoGraficoStati('oggi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  ambitoGraficoStati === 'oggi'
                    ? 'bg-[#f59e0b] text-[#0f1720]'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                Oggi ({interventiOggi.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onVaiAReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f1720] hover:bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 text-xs font-bold transition-colors"
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Dashboard Completa SLA</span>
            </button>
          </div>
        </div>

        {/* Griglia a 2 Grafici Recharts affiancati:
            1) PieChart Distribuzione Stati Intervento
            2) BarChart Tempo Medio di Intervento per Tecnico */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* COLONNA 1 (5 col): Grafico a Torta / Donut Recharts — Distribuzione Stati */}
          <div className="lg:col-span-5 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-[#f1f5f9] flex items-center gap-1.5">
                  <PieChartIcon className="w-4 h-4 text-[#f59e0b]" />
                  <span>Distribuzione Stati Intervento</span>
                </h3>
                <p className="text-[11px] text-[#94a3b8]">
                  Clicca uno stato sotto per filtrare l’elenco cantiere
                </p>
              </div>
              <span className="text-[11px] font-mono font-bold text-[#f1f5f9] bg-[#1a2332] border border-[#2a3a4f] px-2 py-0.5 rounded-md shrink-0">
                {totaleInterventiGrafico} totali
              </span>
            </div>

            <div className="relative h-56 w-full min-w-0 flex items-center justify-center">
              {isClientMounted ? (
                <ResponsiveContainer width="100%" height={224} minWidth={180}>
                  <PieChart>
                    <Pie
                      data={datiDistribuzioneStati}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={4}
                      stroke="#0f1720"
                      strokeWidth={2}
                    >
                      {datiDistribuzioneStati.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a2332',
                        borderColor: '#2a3a4f',
                        borderRadius: '12px',
                        color: '#f1f5f9',
                        fontSize: '12px',
                      }}
                      formatter={(
                        value: number,
                        name: string,
                        props: {
                          payload?: {
                            percentuale?: number;
                            valoreEconomico?: number;
                          };
                        },
                      ) => {
                        const perc = props?.payload?.percentuale ?? 0;
                        const euro = formattaEuro(
                          props?.payload?.valoreEconomico ?? 0,
                        );
                        return [`${value} interventi (${perc}%) · ${euro}`, name];
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={26}
                      wrapperStyle={{ fontSize: '11px', fontWeight: 700 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-40 h-40 rounded-full border-[14px] border-[#2a3a4f] flex items-center justify-center" />
              )}

              {/* Contatore centrale nel Donut */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-5">
                <span className="text-2xl font-mono font-extrabold text-[#f1f5f9] tabular-nums">
                  {totaleInterventiGrafico}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  {ambitoGraficoStati === 'oggi' ? 'Oggi' : 'Settimana'}
                </span>
              </div>
            </div>

            {/* Schede compatte per i 3 Stati */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-1">
              {datiDistribuzioneStati.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setFiltroStatoOggi(item.name)}
                  className="min-w-0 bg-[#1a2332] hover:bg-slate-800 border border-[#2a3a4f] hover:border-[#f59e0b]/60 rounded-xl p-2 sm:p-2.5 text-left transition-all"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[11px] font-mono font-extrabold text-[#f1f5f9] tabular-nums">
                      {item.percentuale}%
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs font-bold text-[#f1f5f9] truncate mt-1">
                    {item.name}
                  </p>
                  <p className="text-[10px] sm:text-[11px] font-mono text-[#94a3b8] tabular-nums truncate">
                    {item.value} int. · {item.oreTotali}h
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* COLONNA 2 (7 col): Grafico a Barre Recharts — Tempi Medi di Intervento per Tecnico */}
          <div className="lg:col-span-7 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-[#f1f5f9] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#f59e0b]" />
                  <span>Tempi Medi di Intervento per Tecnico (Ore)</span>
                </h3>
                <p className="text-[11px] text-[#94a3b8]">
                  Confronto durata media per uscita tra Luca, Andrea e Marco
                  rispetto al target SLA (2,9h)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start shrink-0">
                <span className="text-[11px] font-mono font-bold text-[#10b981] bg-[#10b981]/15 border border-[#10b981]/30 px-2.5 py-1 rounded-lg">
                  Media Squadra: {mediaSquadraOre}h
                </span>
                <span className="text-[11px] font-mono font-bold text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/30 px-2 py-1 rounded-lg">
                  SLA ≤ 2.9h
                </span>
              </div>
            </div>

            <div className="h-56 w-full min-w-0">
              {isClientMounted ? (
                <ResponsiveContainer width="100%" height={224} minWidth={200}>
                  <BarChart
                    data={datiTempiMediPerTecnico}
                    margin={{ top: 12, right: 16, left: -14, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#2a3a4f"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="tecnico"
                      stroke="#94a3b8"
                      tick={{ fill: '#f1f5f9', fontSize: 12, fontWeight: 700 }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      unit="h"
                      domain={[0, 4.2]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1a2332',
                        borderColor: '#2a3a4f',
                        borderRadius: '12px',
                        color: '#f1f5f9',
                        fontSize: '12px',
                      }}
                      formatter={(
                        value: number,
                        _name: string,
                        props: {
                          payload?: {
                            etichettaDurata?: string;
                            totaleInterventi?: number;
                            oreTotali?: number;
                          };
                        },
                      ) => {
                        const durataStr =
                          props?.payload?.etichettaDurata ?? `${value}h`;
                        const numInt = props?.payload?.totaleInterventi ?? 0;
                        const totOre = props?.payload?.oreTotali ?? 0;
                        return [
                          `${value}h (${durataStr}) · ${numInt} int. (${totOre}h tot.)`,
                          'Tempo Medio / Intervento',
                        ];
                      }}
                    />
                    <ReferenceLine
                      y={2.9}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <Bar
                      dataKey="tempoMedioOre"
                      name="Tempo Medio (Ore)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={54}
                    >
                      {datiTempiMediPerTecnico.map((entry) => (
                        <Cell key={entry.id} fill={entry.colore} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full rounded-xl bg-[#1a2332]/40 border border-[#2a3a4f]/50" />
              )}
            </div>

            {/* Riepilogo interattivo per singolo tecnico (filtra interventi al click) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {datiTempiMediPerTecnico.map((tec) => {
                const entroSla = tec.tempoMedioOre <= tec.targetSlaOre;
                return (
                  <button
                    key={tec.id}
                    type="button"
                    onClick={() => {
                      setQueryRicercaInterventi(tec.tecnico);
                      setCercaInTuttaLaSettimana(true);
                    }}
                    title={`Filtra interventi di ${tec.nomeCompleto}`}
                    className="bg-[#1a2332] hover:bg-slate-800 border border-[#2a3a4f] hover:border-[#f59e0b]/60 rounded-xl p-2.5 text-left transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-[#f1f5f9] truncate">
                        👷 {tec.tecnico}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          entroSla
                            ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30'
                            : 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30'
                        }`}
                      >
                        {tec.tempoMedioOre}h ({tec.etichettaDurata})
                      </span>
                    </div>
                    <p className="text-[10px] text-[#94a3b8] truncate">
                      {tec.specializzazione}
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#94a3b8] pt-1 border-t border-[#2a3a4f]/80">
                      <span>{tec.totaleInterventi} uscite</span>
                      <span className="text-[#10b981]">
                        ✓ {tec.completatiCount} compl.
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          6. FEED ATTIVITÀ IN TEMPO REALE (Interventi Completati & Cambi Stato Urgenti)
         ===================================================================== */}
      <FeedAttivitaTempoReale
        interventi={interventi}
        avvisi={avvisi}
        noteCantiere={noteCantiere}
        onApriDettaglioIntervento={onApriDettaglioIntervento}
        onCambiaStatoIntervento={onCambiaStatoIntervento}
      />

      {/* =====================================================================
          7. GRIGLIA INFERIORE: ANDAMENTO SETTIMANA + AVVISI OPERATIVI
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sezione "Andamento settimana" con grafico a barre orizzontali Lun-Dom */}
        <section
          aria-labelledby="heading-andamento-settimana"
          className="lg:col-span-7 min-w-0 bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2
                id="heading-andamento-settimana"
                className="text-base sm:text-lg font-bold text-[#f1f5f9]"
              >
                Andamento settimana
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Carico interventi e valore stimato da Lunedì a Domenica
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono tabular-nums text-[#f59e0b] font-bold">
                {interventi.length} interventi totali
              </span>
              <button
                type="button"
                onClick={onVaiAReport}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0f1720] hover:bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40 text-xs font-bold transition-colors"
              >
                <span>⏱️ Analisi Tempi</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {datiSettimana.map((giorno) => {
              const percentuale = Math.min(
                100,
                Math.round(
                  (giorno.numeroInterventi / maxInterventiGiorno) * 100,
                ),
              );
              return (
                <div key={giorno.iso} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 w-20 sm:w-24 shrink-0">
                      <span
                        className={`font-bold ${
                          giorno.isOggi ? 'text-[#f59e0b]' : 'text-[#f1f5f9]'
                        }`}
                      >
                        {giorno.nomeBreve} {giorno.giornoMese}
                      </span>
                      {giorno.isOggi && (
                        <span className="text-[10px] font-bold text-[#f59e0b] hidden sm:inline">
                          · Oggi
                        </span>
                      )}
                    </div>

                    {/* Barra orizzontale */}
                    <div className="flex-1 min-w-[48px] mx-1 sm:mx-3 h-3 rounded-full bg-[#0f1720] overflow-hidden border border-[#2a3a4f]/60">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          giorno.isOggi
                            ? 'bg-gradient-to-r from-[#f59e0b] to-amber-400'
                            : giorno.numeroInterventi > 0
                              ? 'bg-gradient-to-r from-sky-500 to-[#10b981]'
                              : 'bg-transparent'
                        }`}
                        style={{
                          width: `${
                            giorno.numeroInterventi > 0
                              ? Math.max(percentuale, 12)
                              : 0
                          }%`,
                        }}
                      />
                    </div>

                    <div className="w-24 sm:w-32 text-right font-mono tabular-nums text-[11px] sm:text-xs shrink-0 truncate">
                      <span className="text-[#f1f5f9] font-semibold">
                        {giorno.numeroInterventi} int.
                      </span>
                      <span className="text-[#94a3b8]">
                        {' '}
                        · {formattaEuro(giorno.importoGiorno)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sezione "Avvisi" con 3 alert colorati (giallo per scadenze, rosso per urgenze) */}
        <section
          aria-labelledby="heading-avvisi"
          className="lg:col-span-5 min-w-0 bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2
                  id="heading-avvisi"
                  className="text-base sm:text-lg font-bold text-[#f1f5f9]"
                >
                  Avvisi & Scadenze
                </h2>
                <p className="text-xs text-[#94a3b8]">
                  Urgenze amministrative e scadenze tecniche
                </p>
              </div>
              <span className="text-xs font-bold text-[#ef4444]">
                {avvisi.filter((a) => !a.letto).length} da leggere
              </span>
            </div>

            <div className="space-y-3">
              {avvisi.map((avviso) => {
                const isUrgenza = avviso.tipo === 'urgenza';
                return (
                  <div
                    key={avviso.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isUrgenza
                        ? 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#f1f5f9]'
                        : 'bg-[#f59e0b]/10 border-[#f59e0b]/40 text-[#f1f5f9]'
                    } ${avviso.letto ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {isUrgenza ? (
                        <AlertCircle className="w-5 h-5 text-[#ef4444] shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-extrabold uppercase tracking-wider ${
                              isUrgenza ? 'text-[#ef4444]' : 'text-[#f59e0b]'
                            }`}
                          >
                            {isUrgenza ? '🚨 Urgenza' : '⚠️ Scadenza'}
                          </span>
                          <span className="text-[11px] text-[#94a3b8]">
                            {avviso.data}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#f1f5f9] mt-0.5">
                          {avviso.titolo}
                        </h3>
                        <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed">
                          {avviso.descrizione}
                        </p>
                        {!avviso.letto && (
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onSegnaAvvisoLetto(avviso.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10b981] hover:underline"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Segna come gestito</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
