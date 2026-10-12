import React from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Compass,
  CheckCircle2,
  X,
  Sparkles,
  Plus,
  Settings,
} from 'lucide-react';
import type { PaginaAttiva } from './HeaderENavigazione';
import { showToast } from '@/lib/toast';

interface ComandiVocaliCantiereProps {
  paginaAttiva: PaginaAttiva;
  onCambiaPagina: (pagina: PaginaAttiva) => void;
  onApriNuovoIntervento: () => void;
  onApriImpostazioniMeteo?: () => void;
  onAperturaPannello?: () => void;
}

export interface ComandoVocaleRiconosciuto {
  testoOriginale: string;
  azione: string;
  destinazione?: PaginaAttiva;
  orario: string;
}

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultItem> & { isFinal?: boolean }>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

const COMANDI_DISPONIBILI: Array<{
  id: string;
  etichetta: string;
  esempi: string;
  paginaTarget?: PaginaAttiva;
  azioneSpeciale?: 'nuovo_intervento' | 'impostazioni_meteo';
}> = [
  {
    id: 'cmd-home',
    etichetta: 'Vai a Home / Dashboard',
    esempi: '"Vai a Home", "Go to Home", "Open Dashboard"',
    paginaTarget: 'home',
  },
  {
    id: 'cmd-agenda',
    etichetta: 'Vai ad Agenda / Calendario',
    esempi: '"Go to Agenda", "Vai ad Agenda", "Apri Calendario"',
    paginaTarget: 'agenda',
  },
  {
    id: 'cmd-clienti',
    etichetta: 'Vai a Clienti / Anagrafica',
    esempi: '"Show Clients", "Vai a Clienti", "Apri Clienti"',
    paginaTarget: 'clienti',
  },
  {
    id: 'cmd-fatture',
    etichetta: 'Vai a Fatture & Preventivi',
    esempi: '"Go to Invoices", "Vai a Fatture", "Mostra Preventivi"',
    paginaTarget: 'fatture',
  },
  {
    id: 'cmd-tempi',
    etichetta: 'Dashboard Analisi Tempi & SLA',
    esempi: '"Analisi tempi", "Tempi intervento", "Time analytics"',
    paginaTarget: 'tempi',
  },
  {
    id: 'cmd-report',
    etichetta: 'Mostra Report & Statistiche',
    esempi: '"Show Reports", "Vai a Report", "Mostra Statistiche"',
    paginaTarget: 'report',
  },
  {
    id: 'cmd-nuovo',
    etichetta: 'Crea Nuovo Intervento',
    esempi: '"Nuovo intervento", "New intervention"',
    azioneSpeciale: 'nuovo_intervento',
  },
  {
    id: 'cmd-meteo',
    etichetta: 'Apri Impostazioni Meteo',
    esempi: '"Impostazioni meteo", "Weather settings"',
    azioneSpeciale: 'impostazioni_meteo',
  },
];

/**
 * Interpreta una frase vocale (in Italiano o Inglese) e restituisce la navigazione o l'azione corrispondente
 */
function interpretaComandoVocale(testoRaw: string): {
  paginaTarget?: PaginaAttiva;
  azioneSpeciale?: 'nuovo_intervento' | 'impostazioni_meteo';
  descrizioneAzione: string;
} | null {
  const testo = testoRaw.toLowerCase().trim();
  if (!testo) return null;

  // Azioni rapide di cantiere
  if (
    testo.includes('nuovo intervento') ||
    testo.includes('new intervention') ||
    testo.includes('aggiungi intervento') ||
    testo.includes('crea intervento')
  ) {
    return {
      azioneSpeciale: 'nuovo_intervento',
      descrizioneAzione: 'Apertura modulo Nuovo Intervento',
    };
  }

  if (
    testo.includes('impostazioni meteo') ||
    testo.includes('weather settings') ||
    testo.includes('configura meteo') ||
    testo.includes('apri meteo')
  ) {
    return {
      azioneSpeciale: 'impostazioni_meteo',
      descrizioneAzione: 'Apertura Impostazioni Meteo & ARPAE ICON-2I',
    };
  }

  // Navigazione verso le 5 sezioni principali (IT + EN)
  if (
    testo.includes('agenda') ||
    testo.includes('calendario') ||
    testo.includes('schedule') ||
    testo.includes('calendar') ||
    testo.includes('turni') ||
    testo.includes('ferie')
  ) {
    return {
      paginaTarget: 'agenda',
      descrizioneAzione: 'Navigazione verso Agenda Settimanale',
    };
  }

  if (
    testo.includes('tempi') ||
    testo.includes('durata') ||
    testo.includes('sla') ||
    testo.includes('time analytics')
  ) {
    return {
      paginaTarget: 'tempi',
      descrizioneAzione: 'Navigazione verso Dashboard Analisi Tempi d’Intervento',
    };
  }

  if (
    testo.includes('report') ||
    testo.includes('statistiche') ||
    testo.includes('analisi') ||
    testo.includes('analytics') ||
    testo.includes('grafici')
  ) {
    return {
      paginaTarget: 'report',
      descrizioneAzione: 'Navigazione verso Report & Analisi Direzionale',
    };
  }

  if (
    testo.includes('clienti') ||
    testo.includes('cliente') ||
    testo.includes('client') ||
    testo.includes('customer') ||
    testo.includes('anagrafica')
  ) {
    return {
      paginaTarget: 'clienti',
      descrizioneAzione: 'Navigazione verso Anagrafica Clienti',
    };
  }

  if (
    testo.includes('fatture') ||
    testo.includes('fattura') ||
    testo.includes('invoice') ||
    testo.includes('preventivi') ||
    testo.includes('preventivo') ||
    testo.includes('quote') ||
    testo.includes('billing')
  ) {
    return {
      paginaTarget: 'fatture',
      descrizioneAzione: 'Navigazione verso Fatture & Preventivi',
    };
  }

  if (
    testo.includes('home') ||
    testo.includes('dashboard') ||
    testo.includes('inizio') ||
    testo.includes('principale') ||
    testo.includes('cantiere')
  ) {
    return {
      paginaTarget: 'home',
      descrizioneAzione: 'Navigazione verso Home Dashboard',
    };
  }

  return null;
}

function pronunciaConfermaVocale(testo: string, attivo: boolean) {
  if (!attivo || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(testo);
    utterance.lang = 'it-IT';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignora eventuali blocchi autoplay del browser
  }
}

/**
 * SISTEMA DI COMANDI VOCALI HANDS-FREE PER TECNICI IN CANTIERE (Web Speech API)
 * Permette di navigare tra le sezioni dell'app ("Go to Agenda", "Show Reports", "Vai a Clienti",
 * "Mostra Fatture", "Vai a Home") senza usare le mani.
 */
export default function ComandiVocaliCantiere({
  paginaAttiva,
  onCambiaPagina,
  onApriNuovoIntervento,
  onApriImpostazioniMeteo,
  onAperturaPannello,
}: ComandiVocaliCantiereProps) {
  const [inAscolto, setInAscolto] = React.useState(false);
  const [mostraPannelloComandi, setMostraPannelloComandi] = React.useState(false);
  const [trascrizioneLive, setTrascrizioneLive] = React.useState('');
  const [feedbackVocaleAttivo, setFeedbackVocaleAttivo] = React.useState(true);
  const [linguaAscolto, setLinguaAscolto] = React.useState<'it-IT' | 'en-US'>('it-IT');
  const [ultimoComando, setUltimoComando] =
    React.useState<ComandoVocaleRiconosciuto | null>(null);

  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);

  const supportaWebSpeechApi = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      SpeechRecognition?: unknown;
      webkitSpeechRecognition?: unknown;
    };
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }, []);

  const eseguiComando = React.useCallback(
    (testoPronunciato: string) => {
      const esito = interpretaComandoVocale(testoPronunciato);
      const ora = new Date().toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (!esito) {
        showToast(
          'info',
          `Comando vocale "${testoPronunciato}" non riconosciuto. Prova "Go to Agenda" o "Show Reports".`,
        );
        return false;
      }

      if (esito.paginaTarget) {
        onCambiaPagina(esito.paginaTarget);
      } else if (esito.azioneSpeciale === 'nuovo_intervento') {
        onApriNuovoIntervento();
      } else if (
        esito.azioneSpeciale === 'impostazioni_meteo' &&
        onApriImpostazioniMeteo
      ) {
        onApriImpostazioniMeteo();
      }

      setUltimoComando({
        testoOriginale: testoPronunciato,
        azione: esito.descrizioneAzione,
        destinazione: esito.paginaTarget,
        orario: ora,
      });

      showToast(
        'success',
        `🎙️ Comando vocale eseguito: "${testoPronunciato}" → ${esito.descrizioneAzione}`,
      );
      pronunciaConfermaVocale(esito.descrizioneAzione, feedbackVocaleAttivo);
      return true;
    },
    [
      onCambiaPagina,
      onApriNuovoIntervento,
      onApriImpostazioniMeteo,
      feedbackVocaleAttivo,
    ],
  );

  const fermaAscoltoVocale = React.useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore stop error
      }
      recognitionRef.current = null;
    }
    setInAscolto(false);
  }, []);

  const avviaAscoltoVocale = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRecognitionCtor =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMostraPannelloComandi(true);
      showToast(
        'info',
        'Web Speech API non supportata da questo browser: usa i pulsanti rapidi del pannello vocale.',
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognitionCtor();
      recognition.lang = linguaAscolto;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let trascrizione = '';
        let isFinal = false;
        for (let i = 0; i < event.results.length; i += 1) {
          const res = event.results[i];
          if (res?.[0]?.transcript) {
            trascrizione += res[0].transcript;
          }
          if (res?.isFinal) {
            isFinal = true;
          }
        }
        const pulita = trascrizione.trim();
        setTrascrizioneLive(pulita);

        if (isFinal && pulita) {
          eseguiComando(pulita);
          setInAscolto(false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        setInAscolto(false);
        if (event.error === 'not-allowed') {
          showToast(
            'error',
            'Permesso microfono negato. Consenti il microfono o usa i comandi rapidi qui sotto.',
          );
          setMostraPannelloComandi(true);
        }
      };

      recognition.onend = () => {
        setInAscolto(false);
      };

      recognitionRef.current = recognition;
      setTrascrizioneLive('');
      setInAscolto(true);
      recognition.start();
    } catch {
      setInAscolto(false);
      setMostraPannelloComandi(true);
    }
  }, [linguaAscolto, eseguiComando]);

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const handleToggleMicrofono = () => {
    if (inAscolto) {
      fermaAscoltoVocale();
    } else {
      avviaAscoltoVocale();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        {/* Pulsante principale Microfono Hands-Free (Web Speech API) */}
        <button
          type="button"
          onClick={handleToggleMicrofono}
          className={`relative min-h-[44px] px-3 rounded-xl flex items-center gap-2 font-bold text-xs border transition-all ${
            inAscolto
              ? 'bg-[#ef4444] text-white border-[#ef4444] shadow-lg shadow-[#ef4444]/30 animate-pulse'
              : 'bg-[#1a2332]/80 hover:bg-[#1a2332] text-[#f1f5f9] border-[#2a3a4f] hover:border-[#f59e0b]/60'
          }`}
          aria-label={
            inAscolto
              ? 'Disattiva ascolto comandi vocali'
              : 'Attiva comandi vocali hands-free (es. Go to Agenda, Show Reports)'
          }
          title='Comandi Vocali Hands-Free (es. "Go to Agenda", "Show Reports", "Vai a Clienti")'
        >
          {inAscolto ? (
            <Mic className="w-4 h-4 text-white animate-bounce" />
          ) : (
            <Mic className="w-4 h-4 text-[#f59e0b]" />
          )}
          <span className="hidden md:inline">
            {inAscolto ? 'In ascolto...' : 'Comandi Vocali'}
          </span>
          {inAscolto && (
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          )}
        </button>

        {/* Pulsante apertura Guida & Simulatore Comandi Vocali */}
        <button
          type="button"
          onClick={() => {
            setMostraPannelloComandi((prev) => {
              const next = !prev;
              if (next && onAperturaPannello) onAperturaPannello();
              return next;
            });
          }}
          className={`min-w-[38px] min-h-[44px] px-2 rounded-xl flex items-center justify-center border text-xs font-bold transition-colors ${
            mostraPannelloComandi
              ? 'bg-[#f59e0b] text-[#0f1720] border-[#f59e0b]'
              : 'bg-[#1a2332]/70 hover:bg-[#1a2332] text-[#94a3b8] hover:text-[#f1f5f9] border-[#2a3a4f]'
          }`}
          aria-label="Elenco comandi vocali disponibili"
          title="Apri elenco comandi vocali e test rapido hands-free"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Banner fluttuante durante l'ascolto vocale */}
      {inAscolto && (
        <div
          role="status"
          aria-live="polite"
          className="fixed left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 top-20 z-50 bg-[#0f1720]/95 border-2 border-[#f59e0b] rounded-2xl px-4 sm:px-5 py-3.5 shadow-2xl flex items-center gap-3 sm:min-w-[320px] sm:max-w-md animate-fade-in"
        >
          <div className="w-10 h-10 rounded-full bg-[#ef4444]/20 border border-[#ef4444] flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 text-[#ef4444] animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#f59e0b] truncate">
                Ascolto Vocale Cantiere ({linguaAscolto})
              </span>
            </div>
            <p className="text-xs text-[#f1f5f9] font-mono truncate mt-0.5">
              {trascrizioneLive
                ? `"${trascrizioneLive}"`
                : 'Pronuncia es. "Go to Agenda", "Show Reports", "Vai a Clienti"...'}
            </p>
          </div>
          <button
            type="button"
            onClick={fermaAscoltoVocale}
            className="p-1.5 rounded-lg bg-[#1a2332] text-[#94a3b8] hover:text-white shrink-0"
            aria-label="Ferma ascolto"
          >
            <MicOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pannello Dropdown Comandi Vocali Hands-Free (Web Speech API) */}
      {mostraPannelloComandi && (
        <div className="fixed sm:absolute right-3 left-3 sm:left-auto sm:right-0 top-[4.25rem] sm:top-12 sm:w-[420px] max-h-[calc(100vh-5.5rem)] overflow-y-auto bg-[#1a2332] border border-[#2a3a4f] rounded-2xl shadow-2xl p-4 z-50 animate-fade-in space-y-3.5">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#2a3a4f]">
            <div>
              <h3 className="text-sm font-extrabold text-[#f1f5f9] flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-[#f59e0b]" />
                <span>Controllo Vocale Hands-Free (Web Speech API)</span>
              </h3>
              <p className="text-xs text-[#94a3b8] mt-0.5">
                Navigazione vocale senza mani per i tecnici in cantiere (IT / EN)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostraPannelloComandi(false)}
              className="p-1 text-[#94a3b8] hover:text-[#f1f5f9] rounded-lg"
              aria-label="Chiudi pannello comandi vocali"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Controlli Microfono, Lingua (IT / EN) e Sintesi Vocale di Conferma */}
          <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleToggleMicrofono}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  inAscolto
                    ? 'bg-[#ef4444] text-white'
                    : 'bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720]'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>
                  {inAscolto ? 'Ferma Microfono' : 'Avvia Ascolto Vocale'}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  value={linguaAscolto}
                  onChange={(e) =>
                    setLinguaAscolto(e.target.value as 'it-IT' | 'en-US')
                  }
                  aria-label="Lingua riconoscimento vocale"
                  className="bg-[#1a2332] border border-[#2a3a4f] rounded-lg px-2 py-1.5 text-xs font-bold text-[#f1f5f9] focus:outline-none focus:border-[#f59e0b]"
                >
                  <option value="it-IT">🇮🇹 Italiano + EN</option>
                  <option value="en-US">🇬🇧 English (US)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setFeedbackVocaleAttivo((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a2332] border border-[#2a3a4f] text-xs font-semibold text-[#f1f5f9]"
                  title="Attiva/Disattiva risposta vocale di conferma (SpeechSynthesis)"
                >
                  {feedbackVocaleAttivo ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#10b981]" />
                      <span>Voce ON</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5 text-[#94a3b8]" />
                      <span>Voce OFF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#94a3b8] pt-1 border-t border-[#2a3a4f]">
              <span>
                Stato API:{' '}
                <strong className="text-[#10b981]">
                  {supportaWebSpeechApi
                    ? 'Web Speech API Attiva'
                    : 'Modalità Simulazione Rapida'}
                </strong>
              </span>
              <span>
                Sezione attuale:{' '}
                <strong className="text-[#f59e0b] uppercase">
                  {paginaAttiva}
                </strong>
              </span>
            </div>
          </div>

          {/* Ultimo comando vocale eseguito */}
          {ultimoComando && (
            <div className="bg-[#10b981]/10 border border-[#10b981]/35 rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                <div className="truncate">
                  <span className="font-mono font-bold text-[#f1f5f9]">
                    "{ultimoComando.testoOriginale}"
                  </span>
                  <span className="text-[#94a3b8] block text-[11px]">
                    {ultimoComando.azione}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#94a3b8] shrink-0">
                {ultimoComando.orario}
              </span>
            </div>
          )}

          {/* Lista Comandi Vocali pronunciabili o attivabili con 1 tap */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
              <span>Comandi Vocali Supportati (Pronuncia o Clicca)</span>
              <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
              {COMANDI_DISPONIBILI.map((cmd) => {
                const isAttiva =
                  cmd.paginaTarget && cmd.paginaTarget === paginaAttiva;
                const fraseTest = cmd.esempi
                  .split(',')[0]
                  .replace(/"/g, '')
                  .trim();

                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => {
                      eseguiComando(fraseTest);
                      setMostraPannelloComandi(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isAttiva
                        ? 'bg-[#f59e0b]/15 border-[#f59e0b]/50 text-[#f1f5f9]'
                        : 'bg-[#0f1720] hover:bg-[#0f1720]/80 border-[#2a3a4f] hover:border-[#f59e0b]/40 text-[#f1f5f9]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        {cmd.azioneSpeciale === 'nuovo_intervento' && (
                          <Plus className="w-3.5 h-3.5 text-[#f59e0b]" />
                        )}
                        {cmd.azioneSpeciale === 'impostazioni_meteo' && (
                          <Settings className="w-3.5 h-3.5 text-[#f59e0b]" />
                        )}
                        <span>{cmd.etichetta}</span>
                      </div>
                      <p className="text-[11px] font-mono text-[#94a3b8] truncate mt-0.5">
                        {cmd.esempi}
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-1 rounded-lg bg-[#1a2332] border border-[#2a3a4f] text-[#f59e0b] shrink-0">
                      Esegui
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
