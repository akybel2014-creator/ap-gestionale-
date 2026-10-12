import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  PieChart as PieChartIcon,
  Clock,
  ArrowUpRight,
  Wrench,
  CheckCircle2,
  Timer,
} from 'lucide-react';
import {
  STATISTICHE_MENSILI,
  TECNICI_INIZIALI,
  formattaEuro,
} from '@/data.js';
import type { InterventoItem } from './HomeDashboard';
import type { ClienteItem } from './GestioneClienti';
import DashboardTempiIntervento from './DashboardTempiIntervento';

interface ReportStatisticheProps {
  clienti: ClienteItem[];
  interventi: InterventoItem[];
}

/**
 * PAGINA 5 — REPORT & STATISTICHE DIREZIONALI
 * - Grafico fatturato mensile (SVG Line Chart interattivo con area sfumata + selettore mesi)
 * - Top 5 clienti per fatturato (lista con barre di avanzamento)
 * - Interventi per tipo (grafico a torta / donut SVG + legenda percentuale + fatturato per reparto)
 * - Ore lavorate per tecnico (Luca, Andrea, Marco)
 * - Confronto anno precedente (2026 vs 2025)
 */
export default function ReportStatistiche({
  clienti,
  interventi,
}: ReportStatisticheProps) {
  const [meseHoverIdx, setMeseHoverIdx] = React.useState<number>(
    STATISTICHE_MENSILI.length - 1,
  );
  const [vistaAttiva, setVistaAttiva] = React.useState<
    'completa' | 'tempi' | 'economica'
  >('completa');

  // 1. Calcolo totali per confronto anno corrente (2026) vs anno precedente (2025)
  const confrontoAnni = React.useMemo(() => {
    const totaleCorrente = STATISTICHE_MENSILI.reduce(
      (s, m) => s + m.annoCorrente,
      0,
    );
    const totalePrecedente = STATISTICHE_MENSILI.reduce(
      (s, m) => s + m.annoPrecedente,
      0,
    );
    const variazioneEuro = totaleCorrente - totalePrecedente;
    const variazionePerc =
      totalePrecedente > 0
        ? ((variazioneEuro / totalePrecedente) * 100).toFixed(1)
        : '0.0';
    return {
      totaleCorrente,
      totalePrecedente,
      variazioneEuro,
      variazionePerc,
    };
  }, []);

  // KPI Operativi Cantiere calcolati sugli interventi reali
  const kpiOperativi = React.useMemo(() => {
    const totaleInterventi = Math.max(1, interventi.length);
    const completati = interventi.filter(
      (i) => i.stato === 'Completato',
    ).length;
    const valoreTotaleInterventi = interventi.reduce(
      (s, i) => s + (Number(i.importoStimato) || 0),
      0,
    );
    const ticketMedio = Math.round(valoreTotaleInterventi / totaleInterventi);
    const tassoCompletamento = Math.round(
      (completati / totaleInterventi) * 100,
    );
    return {
      ticketMedio,
      tassoCompletamento,
      valoreTotaleInterventi,
      completati,
    };
  }, [interventi]);

  // 2. Top 5 clienti per fatturato
  const top5Clienti = React.useMemo(() => {
    const ordinati = [...clienti]
      .sort((a, b) => (b.fatturatoTotale || 0) - (a.fatturatoTotale || 0))
      .slice(0, 5);
    const maxFatturato = Math.max(
      1,
      ...ordinati.map((c) => c.fatturatoTotale || 0),
    );
    return ordinati.map((c) => ({
      ...c,
      percentualeBarra: Math.round(
        ((c.fatturatoTotale || 0) / maxFatturato) * 100,
      ),
    }));
  }, [clienti]);

  // 3. Interventi per tipo (per grafico a torta SVG + fatturato reparto)
  const distribuzioneTipi = React.useMemo(() => {
    const conteggi: Record<string, { count: number; importo: number }> = {
      'Idraulico / Termico': { count: 0, importo: 0 },
      Elettrico: { count: 0, importo: 0 },
      Climatizzazione: { count: 0, importo: 0 },
    };

    for (const item of interventi) {
      const val = Number(item.importoStimato) || 0;
      if (item.tipo.toLowerCase().includes('elettr')) {
        conteggi['Elettrico'].count += 1;
        conteggi['Elettrico'].importo += val;
      } else if (item.tipo.toLowerCase().includes('clima')) {
        conteggi['Climatizzazione'].count += 1;
        conteggi['Climatizzazione'].importo += val;
      } else {
        conteggi['Idraulico / Termico'].count += 1;
        conteggi['Idraulico / Termico'].importo += val;
      }
    }

    const totale = Math.max(1, interventi.length);
    const colori: Record<string, string> = {
      'Idraulico / Termico': '#f59e0b', // Arancione ambra
      Elettrico: '#3b82f6', // Blu elettrico
      Climatizzazione: '#10b981', // Verde smeraldo
    };

    let offsetCumulativo = 0;
    return Object.entries(conteggi).map(([etichetta, dati]) => {
      const percentuale = Math.round((dati.count / totale) * 100);
      const voce = {
        etichetta,
        count: dati.count,
        importo: dati.importo,
        percentuale,
        colore: colori[etichetta] || '#f59e0b',
        offset: offsetCumulativo,
      };
      offsetCumulativo += percentuale;
      return voce;
    });
  }, [interventi]);

  // 4. Ore lavorate per tecnico (somma ore base + ore interventi settimanali assegnati)
  const orePerTecnico = React.useMemo(() => {
    return TECNICI_INIZIALI.map((tec) => {
      const interventiTecnico = interventi.filter(
        (i) => i.tecnico.toLowerCase() === tec.nome.toLowerCase(),
      );
      const oreSettimanaReali = interventiTecnico.reduce(
        (s, i) => s + (Number(i.durataOre) || 2.5),
        24, // ore base cantiere/manutenzione programmata
      );
      const valoreGeneratoSettimana = interventiTecnico.reduce(
        (s, i) => s + (Number(i.importoStimato) || 0),
        0,
      );
      return {
        ...tec,
        numeroInterventiSettimana: interventiTecnico.length,
        oreSettimanaCalcolate: Math.round(oreSettimanaReali * 10) / 10,
        valoreGeneratoSettimana,
      };
    });
  }, [interventi]);

  // Coordinate per il Line Chart SVG (larghezza 680, altezza 210)
  const svgWidth = 680;
  const svgHeight = 210;
  const padX = 36;
  const padY = 24;
  const maxValGrafico = 30000;

  const puntiAnnoCorrente = STATISTICHE_MENSILI.map((d, i) => {
    const x =
      padX +
      (i / (STATISTICHE_MENSILI.length - 1)) * (svgWidth - padX * 2);
    const y =
      svgHeight -
      padY -
      (d.annoCorrente / maxValGrafico) * (svgHeight - padY * 2);
    return { x, y, ...d };
  });

  const puntiAnnoPrecedente = STATISTICHE_MENSILI.map((d, i) => {
    const x =
      padX +
      (i / (STATISTICHE_MENSILI.length - 1)) * (svgWidth - padX * 2);
    const y =
      svgHeight -
      padY -
      (d.annoPrecedente / maxValGrafico) * (svgHeight - padY * 2);
    return { x, y };
  });

  const polylineCorrente = puntiAnnoCorrente
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
  const polylinePrecedente = puntiAnnoPrecedente
    .map((p) => `${p.x},${p.y}`)
    .join(' ');
  const areaCorrente = `${puntiAnnoCorrente[0].x},${svgHeight - padY} ${polylineCorrente} ${
    puntiAnnoCorrente[puntiAnnoCorrente.length - 1].x
  },${svgHeight - padY}`;

  const meseSelezionato =
    STATISTICHE_MENSILI[meseHoverIdx] ||
    STATISTICHE_MENSILI[STATISTICHE_MENSILI.length - 1];
  const deltaMeseSelezionato =
    meseSelezionato.annoPrecedente > 0
      ? (
          ((meseSelezionato.annoCorrente - meseSelezionato.annoPrecedente) /
            meseSelezionato.annoPrecedente) *
          100
        ).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* =====================================================================
          INTESTAZIONE E CONFRONTO ANNO PRECEDENTE (2026 vs 2025)
         ===================================================================== */}
      <section className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#f59e0b]" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#f1f5f9]">
              Report & Analisi Direzionale
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">
            Andamento economico, ripartizione impianti e produttività squadra tecnica
          </p>
        </div>

        {/* Box Confronto Anno Precedente */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-2.5 sm:p-3">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] text-[#94a3b8] block truncate">
              2026 (Gen-Ott)
            </span>
            <span className="text-xs sm:text-base font-mono font-extrabold text-[#f1f5f9] tabular-nums block truncate">
              {formattaEuro(confrontoAnni.totaleCorrente)}
            </span>
          </div>
          <div className="min-w-0 border-l border-[#2a3a4f] pl-2 sm:pl-3">
            <span className="text-[10px] sm:text-[11px] text-[#94a3b8] block truncate">
              Periodo 2025
            </span>
            <span className="text-xs sm:text-base font-mono font-semibold text-[#94a3b8] tabular-nums block truncate">
              {formattaEuro(confrontoAnni.totalePrecedente)}
            </span>
          </div>
          <div className="min-w-0 border-l border-[#2a3a4f] pl-2 sm:pl-3">
            <span className="text-[10px] sm:text-[11px] text-[#94a3b8] block truncate">
              Crescita YoY
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs sm:text-base font-mono font-extrabold text-[#10b981] tabular-nums">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />+{confrontoAnni.variazionePerc}%
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SELETTORE VISTA: TUTTO / ANALISI TEMPI & SLA / REPORT ECONOMICO
         ===================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setVistaAttiva('completa')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              vistaAttiva === 'completa'
                ? 'bg-[#f59e0b] text-[#0f1720] shadow-sm'
                : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Vista Completa</span>
          </button>
          <button
            type="button"
            onClick={() => setVistaAttiva('tempi')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              vistaAttiva === 'tempi'
                ? 'bg-[#f59e0b] text-[#0f1720] shadow-sm'
                : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>⏱️ Dashboard Tempi d’Intervento & SLA</span>
          </button>
          <button
            type="button"
            onClick={() => setVistaAttiva('economica')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              vistaAttiva === 'economica'
                ? 'bg-[#f59e0b] text-[#0f1720] shadow-sm'
                : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Fatturato & Clienti Top</span>
          </button>
        </div>

        <span className="text-xs text-[#94a3b8] hidden sm:inline">
          Dati sincronizzati in tempo reale con l’Agenda di cantiere
        </span>
      </div>

      {/* =====================================================================
          DASHBOARD ANALISI TEMPI DI INTERVENTO MEDI (RECHARTS)
         ===================================================================== */}
      {(vistaAttiva === 'completa' || vistaAttiva === 'tempi') && (
        <DashboardTempiIntervento interventi={interventi} />
      )}

      {/* =====================================================================
          KPI OPERATIVI DI CANTIERE (Ticket medio, Valore settimana, Completamento)
         ===================================================================== */}
      {(vistaAttiva === 'completa' || vistaAttiva === 'economica') && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase text-[#94a3b8]">
              Valore Medio Intervento
            </span>
            <p className="text-xl font-mono font-extrabold text-[#f59e0b] mt-1 tabular-nums">
              {formattaEuro(kpiOperativi.ticketMedio)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b]">
            <Wrench className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase text-[#94a3b8]">
              Volume Agenda Settimana
            </span>
            <p className="text-xl font-mono font-extrabold text-[#f1f5f9] mt-1 tabular-nums">
              {formattaEuro(kpiOperativi.valoreTotaleInterventi)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold uppercase text-[#94a3b8]">
              Uscite Completate
            </span>
            <p className="text-xl font-mono font-extrabold text-[#10b981] mt-1 tabular-nums">
              {kpiOperativi.completati}/{interventi.length} ({kpiOperativi.tassoCompletamento}%)
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* =====================================================================
          1. GRAFICO FATTURATO MENSILE (LINE CHART + CONFRONTO ANNO PRECEDENTE)
         ===================================================================== */}
      <section className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#f59e0b]" />
              <span>Grafico Fatturato Mensile (Line Chart)</span>
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Confronto diretto 2026 (linea ambra) vs 2025 (linea tratteggiata) · Seleziona un mese per il dettaglio
            </p>
          </div>

          {/* Dettaglio mese attivo */}
          <div className="flex flex-wrap items-center gap-2.5 bg-[#0f1720] border border-[#2a3a4f] px-3.5 py-2 rounded-xl text-xs">
            <span className="font-extrabold text-[#f59e0b]">
              {meseSelezionato.meseEsteso}:
            </span>
            <span className="font-mono font-extrabold text-[#f1f5f9] tabular-nums">
              2026: {formattaEuro(meseSelezionato.annoCorrente)}
            </span>
            <span className="text-[#94a3b8] font-mono tabular-nums">
              (2025: {formattaEuro(meseSelezionato.annoPrecedente)})
            </span>
            <span className="font-mono font-bold text-[#10b981]">
              +{deltaMeseSelezionato}%
            </span>
          </div>
        </div>

        {/* Pulsanti rapidi selezione mese per mobile */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATISTICHE_MENSILI.map((m, idx) => {
            const attivo = idx === meseHoverIdx;
            return (
              <button
                key={m.mese}
                type="button"
                onClick={() => setMeseHoverIdx(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  attivo
                    ? 'bg-[#f59e0b] text-[#0f1720]'
                    : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
                }`}
              >
                {m.mese}
              </button>
            );
          })}
        </div>

        {/* SVG Line Chart Responsivo */}
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-52 sm:h-60 select-none"
            role="img"
            aria-label="Grafico lineare fatturato mensile"
          >
            <defs>
              <linearGradient id="amberAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linee guida orizzontali */}
            {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y =
                svgHeight - padY - ratio * (svgHeight - padY * 2);
              return (
                <g key={idx}>
                  <line
                    x1={padX}
                    y1={y}
                    x2={svgWidth - padX}
                    y2={y}
                    stroke="#2a3a4f"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={4}
                    y={y + 4}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {Math.round((maxValGrafico * ratio) / 1000)}k
                  </text>
                </g>
              );
            })}

            {/* Area sottesa 2026 */}
            <polygon points={areaCorrente} fill="url(#amberAreaGrad)" />

            {/* Linea tratteggiata 2025 (Anno precedente) */}
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="5 4"
              points={polylinePrecedente}
            />

            {/* Linea principale 2026 (Anno corrente) */}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylineCorrente}
            />

            {/* Punti interattivi sui mesi */}
            {puntiAnnoCorrente.map((pt, idx) => {
              const attivo = idx === meseHoverIdx;
              return (
                <g
                  key={pt.mese}
                  className="cursor-pointer"
                  onClick={() => setMeseHoverIdx(idx)}
                  onMouseEnter={() => setMeseHoverIdx(idx)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={attivo ? 6.5 : 4}
                    fill={attivo ? '#f59e0b' : '#0f1720'}
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />
                  <text
                    x={pt.x}
                    y={svgHeight - 6}
                    textAnchor="middle"
                    fill={attivo ? '#f59e0b' : '#94a3b8'}
                    fontSize="11"
                    fontWeight={attivo ? 'bold' : 'normal'}
                  >
                    {pt.mese}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </section>

      {/* =====================================================================
          2. GRIGLIA CENTRALE: TOP 5 CLIENTI + INTERVENTI PER TIPO (TORTA)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 clienti per fatturato (lista con barre) */}
        <section className="lg:col-span-7 min-w-0 bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#f59e0b]" />
                <span>Top 5 Clienti per Fatturato</span>
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Principali committenti per volume d’affari annuo a Vicenza
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {top5Clienti.map((cli, idx) => (
              <div key={cli.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-[#0f1720] border border-[#2a3a4f] text-[#f59e0b] text-xs font-extrabold flex items-center justify-center shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[#f1f5f9] truncate">
                      {cli.nome}
                    </span>
                  </div>
                  <span className="font-mono font-extrabold text-[#10b981] tabular-nums shrink-0 ml-2">
                    {formattaEuro(cli.fatturatoTotale)}
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-[#0f1720] overflow-hidden border border-[#2a3a4f]/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#10b981] transition-all duration-500"
                    style={{ width: `${cli.percentualeBarra}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Interventi per tipo (Grafico a torta SVG + legenda + valore reparto) */}
        <section className="lg:col-span-5 min-w-0 bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9] flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-[#f59e0b]" />
              <span>Interventi per Tipo</span>
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Ripartizione percentuale e valore tra idraulica, elettrica e clima
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            {/* Grafico a torta / ciambella SVG */}
            <div className="relative w-36 h-36 shrink-0">
              <svg
                viewBox="0 0 36 36"
                className="w-full h-full -rotate-90"
                role="img"
                aria-label="Grafico a torta interventi per tipo"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="transparent"
                  stroke="#0f1720"
                  strokeWidth="3.8"
                />
                {distribuzioneTipi.map((voce) => (
                  <circle
                    key={voce.etichetta}
                    cx="18"
                    cy="18"
                    r="15.9155"
                    fill="transparent"
                    stroke={voce.colore}
                    strokeWidth="4.2"
                    strokeDasharray={`${voce.percentuale} ${100 - voce.percentuale}`}
                    strokeDashoffset={-voce.offset}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-extrabold text-[#f1f5f9] tabular-nums">
                  {interventi.length}
                </span>
                <span className="text-[10px] text-[#94a3b8] uppercase font-bold">
                  Interventi
                </span>
              </div>
            </div>

            {/* Legenda Tipologie */}
            <div className="space-y-3 w-full sm:w-auto">
              {distribuzioneTipi.map((voce) => (
                <div
                  key={voce.etichetta}
                  className="flex items-center justify-between sm:justify-start gap-3 text-xs"
                >
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: voce.colore }}
                  />
                  <div className="flex-1">
                    <span className="font-bold text-[#f1f5f9] block">
                      {voce.etichetta}
                    </span>
                    <span className="text-[#94a3b8] tabular-nums">
                      {voce.count} int. ({voce.percentuale}%) ·{' '}
                      <strong className="text-[#f59e0b] font-mono">
                        {formattaEuro(voce.importo)}
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* =====================================================================
          3. ORE LAVORATE PER TECNICO (Luca, Andrea, Marco)
         ===================================================================== */}
      <section className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#f59e0b]" />
              <span>Ore Lavorate per Tecnico</span>
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Rendimento settimanale, mensile e valore commesse seguite dalla squadra operativa
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {orePerTecnico.map((tec) => {
            const percMese = Math.min(
              100,
              Math.round((tec.oreMese / 180) * 100),
            );
            return (
              <div
                key={tec.id}
                className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-extrabold text-[#f1f5f9] block">
                      👷 {tec.nomeCompleto}
                    </span>
                    <span className="text-xs text-[#94a3b8]">
                      {tec.specializzazione}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-[#10b981] bg-[#10b981]/15 border border-[#10b981]/30 px-2 py-0.5 rounded-md tabular-nums">
                    Eff. {tec.efficienza}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#2a3a4f] text-xs">
                  <div className="min-w-0">
                    <span className="text-[#94a3b8] block text-[11px] truncate">
                      Settimana
                    </span>
                    <strong className="text-xs sm:text-sm font-mono text-[#f59e0b] tabular-nums block truncate">
                      {tec.oreSettimanaCalcolate} h
                    </strong>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[#94a3b8] block text-[11px] truncate">
                      Totale Mese
                    </span>
                    <strong className="text-xs sm:text-sm font-mono text-[#f1f5f9] tabular-nums block truncate">
                      {tec.oreMese} h
                    </strong>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[#94a3b8] block text-[11px] truncate">
                      Valore Sett.
                    </span>
                    <strong className="text-xs sm:text-sm font-mono text-[#10b981] tabular-nums block truncate">
                      {formattaEuro(tec.valoreGeneratoSettimana)}
                    </strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#94a3b8]">
                    <span>
                      {tec.numeroInterventiSettimana} uscite in settimana
                    </span>
                    <span className="tabular-nums">{percMese}% target</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#1a2332] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percMese}%`,
                        backgroundColor: tec.colore,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
