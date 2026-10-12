import React from 'react';
import {
  Timer,
  Users,
  Wrench,
  TrendingDown,
  Award,
  CheckCircle2,
  Filter,
  Gauge,
  Zap,
  Flame,
  Wind,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TECNICI_INIZIALI,
  BENCHMARK_TEMPI_IMPIANTO,
  TREND_TEMPI_MEDI_MENSILI,
  formattaEuro,
} from '@/data.js';
import type { InterventoItem } from './HomeDashboard';

interface DashboardTempiInterventoProps {
  interventi: InterventoItem[];
}

type CategoriaImpianto = 'Idraulico / Termico' | 'Elettrico' | 'Climatizzazione';

function normalizzaCategoriaImpianto(tipoRaw: string): CategoriaImpianto {
  const t = (tipoRaw || '').toLowerCase();
  if (t.includes('elettr')) return 'Elettrico';
  if (t.includes('clima')) return 'Climatizzazione';
  return 'Idraulico / Termico';
}

function formattaOreMinuti(oreDecimali: number): string {
  const valide = Number.isFinite(oreDecimali) && oreDecimali > 0 ? oreDecimali : 0;
  const oreIntere = Math.floor(valide);
  const minuti = Math.round((valide - oreIntere) * 60);
  if (minuti === 60) {
    return `${oreIntere + 1}h 00m`;
  }
  if (minuti === 0) {
    return `${oreIntere}h`;
  }
  return `${oreIntere}h ${String(minuti).padStart(2, '0')}m`;
}

/**
 * DASHBOARD DEDICATA ALL'ANALISI DEI TEMPI DI INTERVENTO MEDI
 * PER TECNICO E PER TIPOLOGIA DI IMPIANTO (Recharts Data Visualization)
 */
export default function DashboardTempiIntervento({
  interventi,
}: DashboardTempiInterventoProps) {
  const [filtroStato, setFiltroStato] = React.useState<string>('Tutti');
  const [filtroPriorita, setFiltroPriorita] = React.useState<string>('Tutte');
  const [tecnicoEvidenziato, setTecnicoEvidenziato] =
    React.useState<string>('Tutti');
  const [isClientMounted, setIsClientMounted] = React.useState<boolean>(false);

  React.useEffect(() => {
    setIsClientMounted(true);
  }, []);

  // 1. Filtra gli interventi in base ai selettori attivi
  const interventiFiltrati = React.useMemo(() => {
    return interventi.filter((item) => {
      const matchStato =
        filtroStato === 'Tutti' || item.stato === filtroStato;
      const matchPriorita =
        filtroPriorita === 'Tutte' ||
        (item.priorita || 'Media') === filtroPriorita;
      const matchTecnico =
        tecnicoEvidenziato === 'Tutti' ||
        item.tecnico.toLowerCase() === tecnicoEvidenziato.toLowerCase();
      return matchStato && matchPriorita && matchTecnico;
    });
  }, [interventi, filtroStato, filtroPriorita, tecnicoEvidenziato]);

  // 2. Calcolo KPI Generali sui Tempi di Intervento
  const kpiTempi = React.useMemo(() => {
    const lista = interventiFiltrati.length > 0 ? interventiFiltrati : interventi;
    const totaleUscite = Math.max(1, lista.length);
    const sommaOre = lista.reduce(
      (acc, i) => acc + (Number(i.durataOre) || 2.5),
      0,
    );
    const tempoMedioGenerale = Math.round((sommaOre / totaleUscite) * 100) / 100;

    // Calcolo rispetto dei tempi SLA per singolo intervento
    let interventiEntroSla = 0;
    for (const item of lista) {
      const cat = normalizzaCategoriaImpianto(item.tipo);
      const target =
        BENCHMARK_TEMPI_IMPIANTO[cat]?.targetOre ?? 3.0;
      const durata = Number(item.durataOre) || 2.5;
      if (durata <= target + 0.5) {
        interventiEntroSla += 1;
      }
    }
    const percentualeSla = Math.round((interventiEntroSla / totaleUscite) * 100);

    // Media per tecnico per trovare il più rapido
    const medieTecnici = TECNICI_INIZIALI.map((tec) => {
      const suoi = interventi.filter(
        (i) => i.tecnico.toLowerCase() === tec.nome.toLowerCase(),
      );
      const totOre = suoi.reduce((s, i) => s + (Number(i.durataOre) || 2.5), 0);
      const media =
        suoi.length > 0
          ? Math.round((totOre / suoi.length) * 100) / 100
          : 2.5;
      return {
        nome: tec.nome,
        nomeCompleto: tec.nomeCompleto,
        mediaOre: media,
        count: suoi.length,
      };
    }).sort((a, b) => a.mediaOre - b.mediaOre);

    // Media per tipologia impianto
    const categorie: CategoriaImpianto[] = [
      'Idraulico / Termico',
      'Elettrico',
      'Climatizzazione',
    ];
    const medieCategorie = categorie
      .map((cat) => {
        const delReparto = interventi.filter(
          (i) => normalizzaCategoriaImpianto(i.tipo) === cat,
        );
        const tot = delReparto.reduce(
          (s, i) => s + (Number(i.durataOre) || 2.5),
          0,
        );
        const media =
          delReparto.length > 0
            ? Math.round((tot / delReparto.length) * 100) / 100
            : 2.5;
        return {
          categoria: cat,
          mediaOre: media,
          count: delReparto.length,
        };
      })
      .sort((a, b) => a.mediaOre - b.mediaOre);

    return {
      tempoMedioGenerale,
      sommaOre: Math.round(sommaOre * 10) / 10,
      percentualeSla,
      interventiEntroSla,
      totaleUscite: lista.length,
      tecnicoPiuRapido: medieTecnici[0],
      impiantoPiuRapido: medieCategorie[0],
      impiantoPiuComplesso: medieCategorie[medieCategorie.length - 1],
    };
  }, [interventi, interventiFiltrati]);

  // 3. Dataset per Grouped BarChart Recharts: Tempo Medio per Tecnico suddiviso per Tipologia Impianto
  const datiBarPerTecnico = React.useMemo(() => {
    const baseInterventi =
      filtroStato === 'Tutti' && filtroPriorita === 'Tutte'
        ? interventi
        : interventi.filter((item) => {
            const matchStato =
              filtroStato === 'Tutti' || item.stato === filtroStato;
            const matchPriorita =
              filtroPriorita === 'Tutte' ||
              (item.priorita || 'Media') === filtroPriorita;
            return matchStato && matchPriorita;
          });

    return TECNICI_INIZIALI.map((tec) => {
      const suoi = baseInterventi.filter(
        (i) => i.tecnico.toLowerCase() === tec.nome.toLowerCase(),
      );

      const calcolaMediaCat = (cat: CategoriaImpianto, fallback: number) => {
        const items = suoi.filter(
          (i) => normalizzaCategoriaImpianto(i.tipo) === cat,
        );
        if (items.length === 0) return fallback;
        const somma = items.reduce(
          (s, i) => s + (Number(i.durataOre) || 2.5),
          0,
        );
        return Math.round((somma / items.length) * 100) / 100;
      };

      const mediaTotale =
        suoi.length > 0
          ? Math.round(
              (suoi.reduce((s, i) => s + (Number(i.durataOre) || 2.5), 0) /
                suoi.length) *
                100,
            ) / 100
          : 2.5;

      const valoreTotale = suoi.reduce(
        (s, i) => s + (Number(i.importoStimato) || 0),
        0,
      );
      const oreTotali = suoi.reduce(
        (s, i) => s + (Number(i.durataOre) || 2.5),
        0,
      );
      const resaOraria =
        oreTotali > 0 ? Math.round(valoreTotale / oreTotali) : 0;

      return {
        tecnico: tec.nome,
        nomeCompleto: tec.nomeCompleto,
        specializzazione: tec.specializzazione,
        colore: tec.colore,
        'Idraulico / Termico': calcolaMediaCat('Idraulico / Termico', 2.8),
        Elettrico: calcolaMediaCat('Elettrico', 2.6),
        Climatizzazione: calcolaMediaCat('Climatizzazione', 2.4),
        mediaComplessiva: mediaTotale,
        targetAziendale: 2.9,
        numeroInterventi: suoi.length,
        oreTotali: Math.round(oreTotali * 10) / 10,
        resaOraria,
      };
    });
  }, [interventi, filtroStato, filtroPriorita]);

  // 4. Dataset per ComposedChart Recharts: Analisi per Tipologia di Impianto (Durata Media, Min, Max e Target SLA)
  const datiPerTipologiaImpianto = React.useMemo(() => {
    const categorie: CategoriaImpianto[] = [
      'Idraulico / Termico',
      'Elettrico',
      'Climatizzazione',
    ];

    return categorie.map((cat) => {
      const items = interventiFiltrati.filter(
        (i) => normalizzaCategoriaImpianto(i.tipo) === cat,
      );
      const listaEffettiva =
        items.length > 0
          ? items
          : interventi.filter(
              (i) => normalizzaCategoriaImpianto(i.tipo) === cat,
            );

      const durate = listaEffettiva.map((i) => Number(i.durataOre) || 2.5);
      const somma = durate.reduce((a, b) => a + b, 0);
      const media =
        durate.length > 0
          ? Math.round((somma / durate.length) * 100) / 100
          : 2.5;
      const min = durate.length > 0 ? Math.min(...durate) : 1.5;
      const max = durate.length > 0 ? Math.max(...durate) : 3.5;

      const benchmark = BENCHMARK_TEMPI_IMPIANTO[cat];
      const scostamentoSla =
        Math.round((media - benchmark.targetOre) * 100) / 100;

      const fatturatoReparto = listaEffettiva.reduce(
        (s, i) => s + (Number(i.importoStimato) || 0),
        0,
      );
      const resaOraria =
        somma > 0 ? Math.round(fatturatoReparto / somma) : 0;

      return {
        categoria: cat,
        etichettaBreve:
          cat === 'Idraulico / Termico'
            ? 'Idraulico/Term.'
            : cat === 'Climatizzazione'
              ? 'Clima / F-Gas'
              : 'Elettrico',
        durataMedia: media,
        targetSla: benchmark.targetOre,
        durataMin: min,
        durataMax: max,
        scostamentoSla,
        numeroInterventi: listaEffettiva.length,
        oreTotali: Math.round(somma * 10) / 10,
        resaOraria,
        colore: benchmark.colore,
        descrizione: benchmark.descrizione,
      };
    });
  }, [interventi, interventiFiltrati]);

  // 5. Dataset RadarChart Recharts: Confronto multidimensionale performance Tecnici (punteggio 0-100)
  const datiRadarCompetenze = React.useMemo(() => {
    const metriche = [
      {
        metrica: 'Rapidità Idraulica',
        Luca: 94,
        Andrea: 78,
        Marco: 88,
      },
      {
        metrica: 'Rapidità Elettrica',
        Luca: 80,
        Andrea: 96,
        Marco: 76,
      },
      {
        metrica: 'Clima & F-Gas',
        Luca: 86,
        Andrea: 84,
        Marco: 95,
      },
      {
        metrica: 'Rispetto SLA',
        Luca: 95,
        Andrea: 91,
        Marco: 89,
      },
      {
        metrica: 'Urgenze Cantiere',
        Luca: 92,
        Andrea: 94,
        Marco: 85,
      },
    ];
    return metriche;
  }, []);

  return (
    <section
      aria-label="Dashboard Analisi Tempi di Intervento"
      className="bg-[#1a2332] border-2 border-[#f59e0b]/35 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6"
    >
      {/* =====================================================================
          INTESTAZIONE E FILTRI INTERATTIVI DATA VISUALIZATION
         ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#2a3a4f]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#f59e0b]/15 border border-[#f59e0b]/30 text-[#f59e0b] text-[11px] font-extrabold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Data Visualization · Analisi Tempi & SLA Cantiere</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#f1f5f9] flex items-center gap-2 pt-1">
            <Timer className="w-5 h-5 text-[#f59e0b]" />
            <span>
              Analisi Tempi Medi di Intervento per Tecnico e Tipologia Impianto
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8]">
            Monitoraggio ore medie per uscita, scostamento dagli standard SLA
            aziendali e resa oraria per reparto
          </p>
        </div>

        {/* Barra Filtri Dinamici */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0f1720] border border-[#2a3a4f] p-2.5 rounded-xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#94a3b8] px-1">
            <Filter className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>Filtra analisi:</span>
          </div>

          {/* Filtro Tecnico */}
          <select
            aria-label="Filtra per tecnico"
            value={tecnicoEvidenziato}
            onChange={(e) => setTecnicoEvidenziato(e.target.value)}
            className="bg-[#1a2332] border border-[#2a3a4f] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#f1f5f9] focus:outline-none focus:border-[#f59e0b]"
          >
            <option value="Tutti">👷 Tutti i Tecnici (3)</option>
            {TECNICI_INIZIALI.map((t) => (
              <option key={t.id} value={t.nome}>
                👷 {t.nomeCompleto}
              </option>
            ))}
          </select>

          {/* Filtro Stato */}
          <select
            aria-label="Filtra per stato intervento"
            value={filtroStato}
            onChange={(e) => setFiltroStato(e.target.value)}
            className="bg-[#1a2332] border border-[#2a3a4f] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#f1f5f9] focus:outline-none focus:border-[#f59e0b]"
          >
            <option value="Tutti">📋 Tutti gli stati</option>
            <option value="Completato">✅ Completati</option>
            <option value="In corso">⚡ In corso</option>
            <option value="Programmato">🗓️ Programmati</option>
          </select>

          {/* Filtro Priorità */}
          <select
            aria-label="Filtra per priorità"
            value={filtroPriorita}
            onChange={(e) => setFiltroPriorita(e.target.value)}
            className="bg-[#1a2332] border border-[#2a3a4f] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#f1f5f9] focus:outline-none focus:border-[#f59e0b]"
          >
            <option value="Tutte">🎯 Tutte le priorità</option>
            <option value="Alta">🔴 Alta Priorità</option>
            <option value="Media">🟡 Media Priorità</option>
            <option value="Bassa">🟢 Bassa Priorità</option>
          </select>

          {(tecnicoEvidenziato !== 'Tutti' ||
            filtroStato !== 'Tutti' ||
            filtroPriorita !== 'Tutte') && (
            <button
              type="button"
              onClick={() => {
                setTecnicoEvidenziato('Tutti');
                setFiltroStato('Tutti');
                setFiltroPriorita('Tutte');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#f59e0b]/15 text-[#f59e0b] hover:bg-[#f59e0b]/25 text-xs font-bold transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          4 KPI CARDS SINTETICHE SUI TEMPI DI INTERVENTO
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Durata Media Globale */}
        <div className="bg-[#0f1720] border border-[#2a3a4f] border-t-4 border-t-[#f59e0b] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
              Tempo Medio Intervento
            </span>
            <Timer className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-extrabold text-[#f1f5f9] tabular-nums">
              {kpiTempi.tempoMedioGenerale}h
            </span>
            <span className="text-xs font-semibold text-[#f59e0b]">
              ({formattaOreMinuti(kpiTempi.tempoMedioGenerale)})
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Su <strong className="text-[#f1f5f9]">{kpiTempi.totaleUscite}</strong>{' '}
            uscite ({kpiTempi.sommaOre}h complessive)
          </p>
        </div>

        {/* KPI 2: Rispetto Target SLA */}
        <div className="bg-[#0f1720] border border-[#2a3a4f] border-t-4 border-t-[#10b981] rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
              Conformità Target SLA
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-extrabold text-[#10b981] tabular-nums">
              {kpiTempi.percentualeSla}%
            </span>
            <span className="text-xs text-[#94a3b8] tabular-nums">
              ({kpiTempi.interventiEntroSla}/{kpiTempi.totaleUscite} nei tempi)
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Soglia standard aziendale:{' '}
            <strong className="text-[#f1f5f9]">≤ 3.0h</strong> per uscita
          </p>
        </div>

        {/* KPI 3: Tecnico Più Rapido */}
        <div className="bg-[#0f1720] border border-[#2a3a4f] border-t-4 border-t-sky-500 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
              Tecnico Più Rapido
            </span>
            <Award className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-[#f1f5f9]">
              👷 {kpiTempi.tecnicoPiuRapido?.nome}
            </span>
            <span className="text-sm font-mono font-extrabold text-sky-400 tabular-nums">
              {kpiTempi.tecnicoPiuRapido?.mediaOre}h/int.
            </span>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Media di{' '}
            <strong className="text-[#f1f5f9]">
              {formattaOreMinuti(kpiTempi.tecnicoPiuRapido?.mediaOre || 2.5)}
            </strong>{' '}
            su {kpiTempi.tecnicoPiuRapido?.count} cantieri
          </p>
        </div>

        {/* KPI 4: Reparto Più Veloce vs Complesso */}
        <div className="bg-[#0f1720] border border-[#2a3a4f] border-t-4 border-t-purple-500 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#94a3b8]">
              Forbice per Impianto
            </span>
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10px] text-[#10b981] font-bold uppercase block">
                Più rapido
              </span>
              <span className="text-sm font-mono font-extrabold text-[#f1f5f9]">
                {kpiTempi.impiantoPiuRapido?.mediaOre}h ({kpiTempi.impiantoPiuRapido?.categoria.split(' ')[0]})
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#f59e0b] font-bold uppercase block">
                Più articolato
              </span>
              <span className="text-sm font-mono font-extrabold text-[#f1f5f9]">
                {kpiTempi.impiantoPiuComplesso?.mediaOre}h ({kpiTempi.impiantoPiuComplesso?.categoria.split(' ')[0]})
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[#94a3b8]">
            Confronto tra i 3 reparti operativi
          </p>
        </div>
      </div>

      {/* =====================================================================
          RIGA 1 GRAFICI RECHARTS:
          1) BAR CHART RAGGRUPPATO: Tempi Medi per Tecnico x Tipologia Impianto
          2) COMPOSED CHART: Durata Media vs Target SLA per Tipologia di Impianto
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAFICO 1: BarChart Raggruppato per Tecnico e Reparto */}
        <div className="lg:col-span-7 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#f1f5f9] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#f59e0b]" />
                <span>
                  Tempi Medi per Tecnico e Tipologia Impianto (Ore)
                </span>
              </h3>
              <p className="text-xs text-[#94a3b8]">
                Confronto ore medie impiegate da Luca, Andrea e Marco nei 3
                reparti rispetto alla soglia SLA (2,9h)
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2.5 py-1 rounded-lg self-start shrink-0">
              Linea rossa = Target SLA 2.9h
            </span>
          </div>

          <div className="h-72 w-full min-w-0">
            {isClientMounted ? (
              <ResponsiveContainer width="100%" height={288} minWidth={200}>
                <BarChart
                  data={datiBarPerTecnico}
                  margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
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
                    domain={[0, 4.5]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2332',
                      borderColor: '#2a3a4f',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} ore (${formattaOreMinuti(Number(value))})`,
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  />
                  <ReferenceLine
                    y={2.9}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Bar
                    dataKey="Idraulico / Termico"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={34}
                  />
                  <Bar
                    dataKey="Elettrico"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={34}
                  />
                  <Bar
                    dataKey="Climatizzazione"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={34}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full rounded-xl bg-[#1a2332]/40 border border-[#2a3a4f]/50" />
            )}
          </div>
        </div>

        {/* GRAFICO 2: ComposedChart Durata Effettiva vs Target SLA per Tipologia Impianto */}
        <div className="lg:col-span-5 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#f1f5f9] flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#f59e0b]" />
              <span>Durata Media vs Target SLA per Impianto</span>
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Confronto tra ore effettive in cantiere, picco massimo e obiettivo
              standard per tipologia
            </p>
          </div>

          <div className="h-72 w-full min-w-0">
            {isClientMounted ? (
              <ResponsiveContainer width="100%" height={288} minWidth={180}>
                <ComposedChart
                  data={datiPerTipologiaImpianto}
                  margin={{ top: 12, right: 16, left: -12, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2a3a4f"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="etichettaBreve"
                    stroke="#94a3b8"
                    tick={{ fill: '#f1f5f9', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    unit="h"
                    domain={[0, 4.5]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2332',
                      borderColor: '#2a3a4f',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value} ore (${formattaOreMinuti(Number(value))})`,
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  />
                  <Bar
                    dataKey="durataMedia"
                    name="Durata Media Reale"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={46}
                  >
                    {datiPerTipologiaImpianto.map((entry) => (
                      <Cell key={entry.categoria} fill={entry.colore} />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="targetSla"
                    name="Target SLA Previsto"
                    stroke="#f1f5f9"
                    strokeWidth={2.5}
                    dot={{ r: 5, fill: '#0f1720', stroke: '#f1f5f9', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="durataMax"
                    name="Picco Max Rilevato"
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#ef4444' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full rounded-xl bg-[#1a2332]/40 border border-[#2a3a4f]/50" />
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          RIGA 2 GRAFICI RECHARTS:
          3) TREND STORICO MENSILE DEI TEMPI DI INTERVENTO (Area + Line Chart)
          4) RADAR CHART SPECIALIZZAZIONE E VELOCITÀ SQUADRA TECNICA
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRAFICO 3: Evoluzione Mensile Tempi Medi (Mag-Ott 2026) */}
        <div className="lg:col-span-7 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#f1f5f9] flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-[#10b981]" />
                <span>
                  Evoluzione Mensile Tempi di Risoluzione (Mag – Ott 2026)
                </span>
              </h3>
              <p className="text-xs text-[#94a3b8]">
                Riduzione progressiva dei tempi medi d’intervento grazie alla
                pre-configurazione furgoni (-18% in 6 mesi)
              </p>
            </div>
            <span className="text-xs font-mono font-extrabold text-[#10b981] bg-[#10b981]/15 border border-[#10b981]/30 px-2.5 py-1 rounded-lg self-start shrink-0">
              -34 min medi / uscita vs Maggio
            </span>
          </div>

          <div className="h-64 w-full min-w-0">
            {isClientMounted ? (
              <ResponsiveContainer width="100%" height={256} minWidth={200}>
                <ComposedChart
                  data={TREND_TEMPI_MEDI_MENSILI}
                  margin={{ top: 10, right: 16, left: -12, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="gradMediaSquadra"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#2a3a4f"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="mese"
                    stroke="#94a3b8"
                    tick={{ fill: '#f1f5f9', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    unit="h"
                    domain={[2.0, 3.6]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2332',
                      borderColor: '#2a3a4f',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      `${value}h (${formattaOreMinuti(Number(value))})`,
                      name,
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="mediaSquadra"
                    name="Media Globale Squadra"
                    fill="url(#gradMediaSquadra)"
                    stroke="#f59e0b"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="idraulico"
                    name="Idraulico / Termico"
                    stroke="#fb923c"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="elettrico"
                    name="Elettrico"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="climatizzazione"
                    name="Climatizzazione"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full rounded-xl bg-[#1a2332]/40 border border-[#2a3a4f]/50" />
            )}
          </div>
        </div>

        {/* GRAFICO 4: RadarChart Indice di Rapidità per Reparto */}
        <div className="lg:col-span-5 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-[#f1f5f9] flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#f59e0b]" />
              <span>Indice di Efficienza & Rapidità per Tecnico</span>
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Mappa comparativa delle specializzazioni sul campo (scala 0–100)
            </p>
          </div>

          <div className="h-64 w-full min-w-0">
            {isClientMounted ? (
              <ResponsiveContainer width="100%" height={256} minWidth={180}>
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="72%"
                  data={datiRadarCompetenze}
                >
                  <PolarGrid stroke="#2a3a4f" />
                  <PolarAngleAxis
                    dataKey="metrica"
                    tick={{ fill: '#f1f5f9', fontSize: 11, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[60, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <Radar
                    name="Luca (Termoidraulica)"
                    dataKey="Luca"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.25}
                  />
                  <Radar
                    name="Andrea (Elettrico/KNX)"
                    dataKey="Andrea"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.25}
                  />
                  <Radar
                    name="Marco (Clima/Idraulica)"
                    dataKey="Marco"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.25}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2332',
                      borderColor: '#2a3a4f',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '12px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full rounded-xl bg-[#1a2332]/40 border border-[#2a3a4f]/50" />
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          MATRICE DETTAGLIATA PER TIPOLOGIA DI IMPIANTO E TECNICO (TABELLA + CARD)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
        {datiPerTipologiaImpianto.map((rep) => {
          const inTarget = rep.scostamentoSla <= 0;
          const IconaReparto =
            rep.categoria === 'Elettrico'
              ? Zap
              : rep.categoria === 'Climatizzazione'
                ? Wind
                : Flame;

          return (
            <div
              key={rep.categoria}
              className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${rep.colore}20`,
                        color: rep.colore,
                        border: `1px solid ${rep.colore}50`,
                      }}
                    >
                      <IconaReparto className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#f1f5f9]">
                        {rep.categoria}
                      </h4>
                      <span className="text-[11px] text-[#94a3b8]">
                        {rep.numeroInterventi} interventi analizzati
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                      inTarget
                        ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30'
                        : 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30'
                    }`}
                  >
                    {inTarget
                      ? `${rep.scostamentoSla}h vs SLA`
                      : `+${rep.scostamentoSla}h vs SLA`}
                  </span>
                </div>

                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  {rep.descrizione}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#2a3a4f] text-xs">
                <div>
                  <span className="text-[10px] uppercase text-[#94a3b8] block">
                    Durata Media
                  </span>
                  <strong
                    className="text-sm font-mono font-extrabold tabular-nums"
                    style={{ color: rep.colore }}
                  >
                    {rep.durataMedia}h
                  </strong>
                  <span className="block text-[10px] text-[#94a3b8]">
                    ({formattaOreMinuti(rep.durataMedia)})
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#94a3b8] block">
                    Min / Max
                  </span>
                  <strong className="text-sm font-mono font-bold text-[#f1f5f9] tabular-nums">
                    {rep.durataMin}h – {rep.durataMax}h
                  </strong>
                  <span className="block text-[10px] text-[#94a3b8]">
                    SLA: {rep.targetSla}h
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#94a3b8] block">
                    Resa Oraria
                  </span>
                  <strong className="text-sm font-mono font-extrabold text-[#10b981] tabular-nums">
                    {formattaEuro(rep.resaOraria)}/h
                  </strong>
                  <span className="block text-[10px] text-[#94a3b8]">
                    Tot: {rep.oreTotali}h
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
