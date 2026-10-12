import React from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Home,
  Calendar,
  Users,
  FileText,
  BarChart3,
  Plus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Wrench,
  Send,
  Settings,
  Timer,
  CalendarClock,
} from 'lucide-react';
import {
  TECNICI_INIZIALI,
  getSettimanaCorrente,
  formattaDataItaliana,
  calcolaStatoManutenzione,
} from '@/data.js';
import type { InterventoItem, PreventivoItem } from './HomeDashboard';
import type { FatturaItem } from './GestioneFatture';
import type { FerieItem } from './AgendaSettimanale';
import type { ManutenzioneProgrammataItem } from './GestioneManutenzioni';
import {
  type ImpostazioniPushLocali,
  getStatoPermessoBrowser,
  richiediPermessoNotificheBrowser,
} from '@/lib/notifichePushLocali';
import ComandiVocaliCantiere from './ComandiVocaliCantiere';

export type PaginaAttiva =
  | 'home'
  | 'agenda'
  | 'clienti'
  | 'manutenzioni'
  | 'fatture'
  | 'tempi'
  | 'report';

export interface AvvisoItem {
  id: string;
  tipo: 'urgenza' | 'scadenza';
  titolo: string;
  descrizione: string;
  data: string;
  letto: boolean;
}

interface HeaderENavigazioneProps {
  paginaAttiva: PaginaAttiva;
  onCambiaPagina: (pagina: PaginaAttiva) => void;
  avvisi: AvvisoItem[];
  onSegnaAvvisiLetti: () => void;
  onApriNuovoIntervento: () => void;
  onResetDatiDemo: () => void;
  interventi: InterventoItem[];
  preventivi: PreventivoItem[];
  fatture: FatturaItem[];
  ferie: FerieItem[];
  clientiCount: number;
  manutenzioni?: ManutenzioneProgrammataItem[];
  impostazioniPush: ImpostazioniPushLocali;
  onAggiornaImpostazioniPush: (nuove: ImpostazioniPushLocali) => void;
  onInviaTestPushTecnici: () => void;
  onApriImpostazioniMeteo?: () => void;
}

const VOCI_NAVIGAZIONE: Array<{
  id: PaginaAttiva;
  label: string;
  mobileLabel: string;
  icon: typeof Home;
}> = [
  { id: 'home', label: 'Home', mobileLabel: 'Home', icon: Home },
  { id: 'agenda', label: 'Agenda', mobileLabel: 'Agenda', icon: Calendar },
  { id: 'clienti', label: 'Clienti', mobileLabel: 'Clienti', icon: Users },
  {
    id: 'manutenzioni',
    label: 'Manutenzioni',
    mobileLabel: 'Manutenz.',
    icon: CalendarClock,
  },
  { id: 'fatture', label: 'Fatture', mobileLabel: 'Fatture', icon: FileText },
  { id: 'tempi', label: 'Analisi Tempi', mobileLabel: 'Tempi', icon: Timer },
  { id: 'report', label: 'Report', mobileLabel: 'Report', icon: BarChart3 },
];

/**
 * Componente che gestisce:
 * 1. Header fisso in alto con logo "🏗️ Rossi Impianti", data corrente, campanella notifiche dinamica (con gestione Push Locali) e avatar "MR"
 * 2. Sidebar laterale sinistra su Desktop (lg:) con contatori live sulle 5 pagine e stato reale della squadra
 * 3. Bottom Navigation fissa in basso su Mobile (< lg) con indicatore attivo e contatori per uso ergonomico con una sola mano
 */
export default function HeaderENavigazione({
  paginaAttiva,
  onCambiaPagina,
  avvisi,
  onSegnaAvvisiLetti,
  onApriNuovoIntervento,
  onResetDatiDemo,
  interventi,
  preventivi,
  fatture,
  ferie,
  clientiCount,
  manutenzioni = [],
  impostazioniPush,
  onAggiornaImpostazioniPush,
  onInviaTestPushTecnici,
  onApriImpostazioniMeteo,
}: HeaderENavigazioneProps) {
  const [mostraPannelloNotifiche, setMostraPannelloNotifiche] =
    React.useState(false);
  const [mostraMenuProfilo, setMostraMenuProfilo] = React.useState(false);
  const [permessoBrowser, setPermessoBrowser] = React.useState<string>(() =>
    getStatoPermessoBrowser(),
  );

  const { oggiIso } = getSettimanaCorrente();
  const nonLettiCount = avvisi.filter((a) => !a.letto).length;

  // Contatori operativi live per i badge di navigazione
  const interventiOggiCount = React.useMemo(
    () => interventi.filter((i) => i.data === oggiIso).length,
    [interventi, oggiIso],
  );
  const preventiviAttesaCount = React.useMemo(
    () => preventivi.filter((p) => p.stato === 'In attesa').length,
    [preventivi],
  );
  const fattureScaduteOAttesaCount = React.useMemo(
    () => fatture.filter((f) => f.stato === 'Scaduta').length,
    [fatture],
  );
  const manutenzioniInScadenzaCount = React.useMemo(
    () =>
      manutenzioni.filter((m) => {
        if (!m.attiva) return false;
        const st = calcolaStatoManutenzione(m.prossimaScadenza, oggiIso);
        return st === 'In scadenza' || st === 'Scaduta';
      }).length,
    [manutenzioni, oggiIso],
  );

  // Calcola il badge numerico contestuale per ciascuna voce di navigazione
  const getBadgeVoce = (
    id: PaginaAttiva,
  ): { testo: string; colore: string } | null => {
    if (id === 'home' && interventiOggiCount > 0) {
      return {
        testo: `${interventiOggiCount} oggi`,
        colore: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40',
      };
    }
    if (id === 'agenda') {
      return {
        testo: `${interventi.length}`,
        colore: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
      };
    }
    if (id === 'clienti') {
      return {
        testo: `${clientiCount}`,
        colore: 'bg-slate-700/70 text-[#f1f5f9] border-slate-600',
      };
    }
    if (id === 'manutenzioni') {
      if (manutenzioniInScadenzaCount > 0) {
        return {
          testo: `${manutenzioniInScadenzaCount} scad.`,
          colore: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40',
        };
      }
      return {
        testo: `${manutenzioni.length}`,
        colore: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      };
    }
    if (id === 'fatture' && fattureScaduteOAttesaCount > 0) {
      return {
        testo: `${fattureScaduteOAttesaCount} scad.`,
        colore: 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/40',
      };
    }
    if (id === 'tempi') {
      const sommaOre = interventi.reduce(
        (acc, i) => acc + (Number(i.durataOre) || 2.5),
        0,
      );
      const media =
        interventi.length > 0
          ? (sommaOre / interventi.length).toFixed(1)
          : '2.5';
      return {
        testo: `${media}h med.`,
        colore: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/40',
      };
    }
    if (id === 'report' && preventiviAttesaCount > 0) {
      return {
        testo: '+15%',
        colore: 'bg-[#10b981]/20 text-[#10b981] border-[#10b981]/40',
      };
    }
    return null;
  };

  // Stato reale dei 3 tecnici nella giornata odierna (In cantiere, Operativo, oppure In ferie)
  const statoSquadraOggi = React.useMemo(() => {
    return TECNICI_INIZIALI.map((tec) => {
      const assenzaOggi = ferie.find(
        (f) =>
          f.tecnico === tec.nome &&
          oggiIso >= f.dataInizio &&
          oggiIso <= (f.dataFine || f.dataInizio),
      );
      const interventoInCorso = interventi.find(
        (i) =>
          i.data === oggiIso &&
          i.tecnico === tec.nome &&
          i.stato === 'In corso',
      );
      const usciteOggi = interventi.filter(
        (i) => i.data === oggiIso && i.tecnico === tec.nome,
      ).length;

      if (assenzaOggi) {
        return {
          ...tec,
          labelStato: `🏖️ ${assenzaOggi.tipo}`,
          classeColore: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
        };
      }
      if (interventoInCorso) {
        return {
          ...tec,
          labelStato: `In cantiere (${usciteOggi})`,
          classeColore: 'text-[#f59e0b] bg-[#f59e0b]/15 border-[#f59e0b]/30',
        };
      }
      return {
        ...tec,
        labelStato: usciteOggi > 0 ? `Operativo (${usciteOggi})` : 'Disponibile',
        classeColore: 'text-[#10b981] bg-[#10b981]/15 border-[#10b981]/30',
      };
    });
  }, [ferie, interventi, oggiIso]);

  const handleRichiediPermesso = async () => {
    const esito = await richiediPermessoNotificheBrowser();
    setPermessoBrowser(esito);
  };

  return (
    <>
      {/* =====================================================================
          HEADER FISSO IN ALTO (Sfondo semi-trasparente con blur e bordo sottile)
         ===================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0f1720]/95 backdrop-blur-md border-b border-[#2a3a4f] px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 shadow-md">
        {/* Zona 1: Logo + Testo Rossi Impianti in grassetto + Badge data operativa */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => onCambiaPagina('home')}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none group min-h-[44px] min-w-0"
          >
            <span
              className="w-9 h-9 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center text-lg leading-none select-none shadow-sm shrink-0"
              role="img"
              aria-label="Cantiere"
            >
              🏗️
            </span>
            <div className="min-w-0">
              <span className="text-sm sm:text-lg font-extrabold tracking-tight text-[#f1f5f9] group-hover:text-[#f59e0b] transition-colors truncate block leading-tight">
                Rossi Impianti
              </span>
              <span className="text-[11px] text-[#94a3b8] hidden sm:block truncate">
                Idraulica · Termica · Elettrica (VI)
              </span>
            </div>
          </button>

          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a2332] border border-[#2a3a4f] text-[11px] font-mono text-[#94a3b8] shrink-0">
            <Wrench className="w-3 h-3 text-[#f59e0b]" />
            <span>Oggi: {formattaDataItaliana(oggiIso)}</span>
          </span>
        </div>

        {/* Zona Destra: Comandi Vocali Hands-Free + Pulsante Rapido + Campanella Notifiche + Avatar MR */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Ascolto Comandi Vocali Hands-Free (Web Speech API) per navigazione cantiere */}
          <ComandiVocaliCantiere
            paginaAttiva={paginaAttiva}
            onCambiaPagina={onCambiaPagina}
            onApriNuovoIntervento={onApriNuovoIntervento}
            onApriImpostazioniMeteo={onApriImpostazioniMeteo}
            onAperturaPannello={() => {
              setMostraPannelloNotifiche(false);
              setMostraMenuProfilo(false);
            }}
          />

          {/* Pulsante rapido Nuovo Intervento visibile su tablet/desktop */}
          <button
            type="button"
            onClick={onApriNuovoIntervento}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-xs transition-all shadow-sm whitespace-nowrap shrink-0 min-h-[38px]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nuovo intervento</span>
          </button>

          {/* Campanella Notifiche & Impostazioni Push Locali */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMostraPannelloNotifiche((prev) => !prev);
                setMostraMenuProfilo(false);
              }}
              className="relative min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-[#94a3b8] hover:text-[#f1f5f9] bg-[#1a2332]/70 hover:bg-[#1a2332] border border-[#2a3a4f] transition-colors"
              aria-label="Notifiche e avvisi push"
            >
              {impostazioniPush.abilitate ? (
                <BellRing className="w-5 h-5 text-[#f59e0b]" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
              {nonLettiCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-[#ef4444] text-white text-[11px] font-extrabold flex items-center justify-center tabular-nums shadow-md ring-2 ring-[#0f1720]">
                  {nonLettiCount}
                </span>
              )}
            </button>

            {/* Dropdown Notifiche + Configurazione Notifiche Push Locali */}
            {mostraPannelloNotifiche && (
              <div className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 top-[4.25rem] sm:top-12 sm:w-[410px] max-h-[calc(100vh-5.5rem)] overflow-y-auto bg-[#1a2332] border border-[#2a3a4f] rounded-2xl shadow-2xl p-4 z-50 animate-fade-in space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-[#2a3a4f]">
                  <div>
                    <h3 className="text-sm font-bold text-[#f1f5f9] flex items-center gap-1.5">
                      <BellRing className="w-4 h-4 text-[#f59e0b]" />
                      <span>Centro Notifiche Push & Avvisi</span>
                    </h3>
                    <p className="text-xs text-[#94a3b8]">
                      {nonLettiCount > 0
                        ? `${nonLettiCount} avvisi attivi per la squadra`
                        : 'Tutti gli avvisi sono stati letti'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {nonLettiCount > 0 && (
                      <button
                        type="button"
                        onClick={onSegnaAvvisiLetti}
                        className="text-xs font-semibold text-[#f59e0b] hover:underline whitespace-nowrap"
                      >
                        Segna letti
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMostraPannelloNotifiche(false)}
                      className="p-1 text-[#94a3b8] hover:text-[#f1f5f9] rounded-lg"
                      aria-label="Chiudi notifiche"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Box Controllo Notifiche Push Locali Tecnici */}
                <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#f1f5f9] flex items-center gap-1.5">
                      <span>📲 Push Locali Tecnici (Agenda)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAggiornaImpostazioniPush({
                          ...impostazioniPush,
                          abilitate: !impostazioniPush.abilitate,
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        impostazioniPush.abilitate
                          ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40'
                          : 'bg-slate-700/60 text-[#94a3b8]'
                      }`}
                    >
                      {impostazioniPush.abilitate ? 'Attive' : 'Disattivate'}
                    </button>
                  </div>

                  <p className="text-[11px] text-[#94a3b8]">
                    Avvisa automaticamente Luca, Andrea e Marco quando viene inserito un nuovo intervento o un cambio di stato urgente.
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onAggiornaImpostazioniPush({
                          ...impostazioniPush,
                          suonoAttivo: !impostazioniPush.suonoAttivo,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1a2332] border border-[#2a3a4f] text-[#f1f5f9] font-semibold"
                    >
                      {impostazioniPush.suonoAttivo ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#f59e0b]" />
                          <span>Suono Push: ON</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-[#94a3b8]" />
                          <span>Suono Push: OFF</span>
                        </>
                      )}
                    </button>

                    {permessoBrowser !== 'granted' &&
                      permessoBrowser !== 'unsupported' && (
                        <button
                          type="button"
                          onClick={handleRichiediPermesso}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/35 font-bold"
                        >
                          Abilita Push OS
                        </button>
                      )}

                    <button
                      type="button"
                      onClick={() => {
                        onInviaTestPushTecnici();
                        setMostraPannelloNotifiche(false);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold"
                    >
                      <Send className="w-3 h-3" />
                      <span>Simula Push Urgente</span>
                    </button>
                  </div>
                </div>

                {/* Lista Avvisi & Notifiche */}
                <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                  {avvisi.map((avv) => {
                    const isUrgente = avv.tipo === 'urgenza';
                    return (
                      <div
                        key={avv.id}
                        className={`p-3 rounded-xl border transition-colors ${
                          isUrgente
                            ? 'bg-[#ef4444]/10 border-[#ef4444]/35'
                            : 'bg-[#f59e0b]/10 border-[#f59e0b]/35'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isUrgente ? (
                            <AlertCircle className="w-4 h-4 text-[#ef4444] shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-[#f1f5f9] truncate">
                                {avv.titolo}
                              </p>
                              {!avv.letto && (
                                <span className="text-[10px] font-bold text-[#f59e0b] shrink-0">
                                  Nuovo
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#94a3b8] mt-0.5 leading-relaxed">
                              {avv.descrizione}
                            </p>
                            <span className="block text-[10px] text-[#94a3b8]/80 mt-1">
                              {avv.data}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Avatar circolare con iniziali "MR" e gradiente viola */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setMostraMenuProfilo((prev) => !prev);
                setMostraPannelloNotifiche(false);
              }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white font-extrabold text-xs flex items-center justify-center shadow-md ring-2 ring-[#2a3a4f] hover:ring-[#f59e0b] transition-all"
              title="Mario Rossi — Titolare Tecnico"
              aria-label="Profilo Mario Rossi"
            >
              MR
            </button>

            {mostraMenuProfilo && (
              <div className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 top-[4.25rem] sm:top-12 sm:w-64 bg-[#1a2332] border border-[#2a3a4f] rounded-2xl shadow-2xl p-4 z-50 animate-fade-in">
                <div className="flex items-center gap-3 pb-3 mb-3 border-b border-[#2a3a4f]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                    MR
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#f1f5f9] truncate">
                      Mario Rossi
                    </p>
                    <p className="text-xs text-[#94a3b8] truncate">
                      Titolare · Responsabile Tecnico
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-[#94a3b8] mb-3">
                  <p>P.IVA: IT03948120240</p>
                  <p>Sede: Via dell’Artigianato 14, Vicenza</p>
                  <p className="flex items-center gap-1.5 text-[#10b981] pt-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sincronizzato in LocalStorage</span>
                  </p>
                </div>
                {onApriImpostazioniMeteo && (
                  <button
                    type="button"
                    onClick={() => {
                      onApriImpostazioniMeteo();
                      setMostraMenuProfilo(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mb-2 rounded-xl bg-[#f59e0b]/15 hover:bg-[#f59e0b] text-[#f59e0b] hover:text-[#0f1720] border border-[#f59e0b]/40 text-xs font-extrabold transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Impostazioni Meteo & OpenWeatherMap</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onResetDatiDemo();
                    setMostraMenuProfilo(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0f1720] hover:bg-[#ef4444]/15 text-[#94a3b8] hover:text-[#ef4444] border border-[#2a3a4f] text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ripristina dati iniziali demo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          SIDEBAR LATERALE SINISTRA (Solo su Desktop lg:flex)
         ===================================================================== */}
      <aside className="hidden lg:flex flex-col fixed top-16 left-0 bottom-0 w-64 bg-[#1a2332]/95 border-r border-[#2a3a4f] p-4 z-30 justify-between overflow-y-auto">
        <div className="space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-bold uppercase text-[#94a3b8] tracking-wider">
            Menu Gestionale (7 Pagine)
          </div>
          {VOCI_NAVIGAZIONE.map((voce) => {
            const Icon = voce.icon;
            const attiva = paginaAttiva === voce.id;
            const badge = getBadgeVoce(voce.id);
            return (
              <button
                key={voce.id}
                type="button"
                onClick={() => onCambiaPagina(voce.id)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-3 rounded-xl text-sm font-bold transition-all min-w-0 ${
                  attiva
                    ? 'bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/40 shadow-sm'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#0f1720]/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      attiva ? 'text-[#f59e0b]' : 'text-[#94a3b8]'
                    }`}
                  />
                  <span className="truncate">{voce.label}</span>
                </div>
                {badge && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border tabular-nums shrink-0 ${badge.colore}`}
                  >
                    {badge.testo}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scheda riepilogo squadra dinamica in basso nella sidebar desktop */}
        <div className="p-3.5 rounded-2xl bg-[#0f1720] border border-[#2a3a4f] space-y-2.5 mt-4 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-[#f1f5f9] truncate">
              Stato Squadra Oggi
            </p>
            <span className="text-[10px] font-mono text-[#10b981] font-bold shrink-0">
              📲 Push ON
            </span>
          </div>
          <div className="space-y-2 text-xs">
            {statoSquadraOggi.map((tec) => (
              <div
                key={tec.id}
                className="flex items-center justify-between gap-2 min-w-0"
              >
                <span className="text-[#f1f5f9] font-medium truncate">
                  👷 {tec.nome}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${tec.classeColore}`}
                >
                  {tec.labelStato}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* =====================================================================
          BOTTOM NAVIGATION FISSA IN BASSO (Solo Mobile < lg, 7 voci compatte)
         ===================================================================== */}
      <nav
        aria-label="Navigazione principale mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0f1720]/95 backdrop-blur-md border-t border-[#2a3a4f] grid grid-cols-7 items-center px-0.5 select-none shadow-2xl"
      >
        {VOCI_NAVIGAZIONE.map((voce) => {
          const Icon = voce.icon;
          const attiva = paginaAttiva === voce.id;
          return (
            <button
              key={voce.id}
              type="button"
              onClick={() => onCambiaPagina(voce.id)}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] min-w-0 px-0.5 transition-colors ${
                attiva
                  ? 'text-[#f59e0b]'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              }`}
            >
              {attiva && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 rounded-b-full bg-[#f59e0b]" />
              )}
              <Icon
                className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-150 shrink-0 ${
                  attiva ? 'scale-110 stroke-[2.5]' : 'stroke-[1.9]'
                }`}
              />
              <span
                className={`text-[9px] sm:text-[10px] mt-0.5 tracking-tight truncate max-w-full ${
                  attiva ? 'font-bold' : 'font-medium'
                }`}
              >
                {voce.mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
