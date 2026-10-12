import React from 'react';
import {
  Mic,
  MicOff,
  Send,
  Trash2,
  Pin,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  MessageSquarePlus,
  Sparkles,
  Headphones,
} from 'lucide-react';
import {
  TECNICI_INIZIALI,
  formattaDataItaliana,
  getSettimanaCorrente,
} from '@/data.js';
import { showToast } from '@/lib/toast';

export interface NotaCantiereItem {
  id: string;
  autore: string;
  testo: string;
  orario: string;
  data: string;
  origineVocale: boolean;
  importante: boolean;
}

interface NoteRapideCantiereProps {
  noteCantiere: NotaCantiereItem[];
  onAggiungiNota: (nuovaNota: Omit<NotaCantiereItem, 'id'>) => void;
  onEliminaNota: (id: string) => void;
  onToggleImportanteNota: (id: string) => void;
}

// Tipizzazione minima per Web Speech API (SpeechRecognition / webkitSpeechRecognition)
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

const FRASI_RAPIDE_CANTIERE = [
  'Portare defangatore magnetico 3/4" e raccordi',
  'Impianto verificato e collaudo CEI superato',
  'Cliente avvisato: arrivo in cantiere tra 15 minuti',
  'Ritirare materiale elettrico da fornitore Cambielli',
];

/**
 * Sezione "Note Rapide di Cantiere" nella Dashboard (Home)
 * - Supporto completo Sintesi Vocale (Text-to-Speech tramite Web Speech API `window.speechSynthesis`):
 *   * Lettura ad alta voce della singola nota o dell'intera bacheca ("Leggi Tutte le Note")
 *   * Controlli di Pausa / Riprendi / Ferma lettura
 *   * Regolazione velocità di pronuncia (0.85x, 1.0x, 1.2x) e selezione automatica voce italiana (`it-IT`)
 *   * Evidenziazione visiva della scheda in corso di lettura per l'accessibilità sul campo
 * - Supporto Dettatura Vocale (Voice-to-Text tramite `SpeechRecognition` / `webkitSpeechRecognition`)
 */
export default function NoteRapideCantiere({
  noteCantiere,
  onAggiungiNota,
  onEliminaNota,
  onToggleImportanteNota,
}: NoteRapideCantiereProps) {
  const { oggiIso } = getSettimanaCorrente();

  // Stati per inserimento e dettatura vocale (Speech-to-Text)
  const [autore, setAutore] = React.useState<string>('Mario Rossi (Titolare)');
  const [testoNota, setTestoNota] = React.useState<string>('');
  const [trascrizioneParziale, setTrascrizioneParziale] =
    React.useState<string>('');
  const [importante, setImportante] = React.useState<boolean>(false);
  const [origineVocale, setOrigineVocale] = React.useState<boolean>(false);
  const [inAscolto, setInAscolto] = React.useState<boolean>(false);

  // Stati per la Sintesi Vocale (Text-to-Speech / Web Speech API)
  const [notaInLetturaId, setNotaInLetturaId] = React.useState<string | null>(
    null,
  );
  const [letturaInPausa, setLetturaInPausa] = React.useState<boolean>(false);
  const [modalitaLetturaTutte, setModalitaLetturaTutte] =
    React.useState<boolean>(false);
  const [velocitaVoce, setVelocitaVoce] = React.useState<number>(1.0);
  const [voceItaliana, setVoceItaliana] =
    React.useState<SpeechSynthesisVoice | null>(null);
  const [parolaCorrente, setParolaCorrente] = React.useState<string>('');

  const recognitionRef = React.useRef<SpeechRecognitionInstance | null>(null);
  const codaLetturaRef = React.useRef<NotaCantiereItem[]>([]);
  const annullatoManualmenteRef = React.useRef<boolean>(false);

  // Ordina mettendo prima le note fissate come importanti
  const noteOrdinate = React.useMemo(() => {
    return [...noteCantiere].sort((a, b) => {
      if (a.importante !== b.importante) return a.importante ? -1 : 1;
      return b.orario.localeCompare(a.orario);
    });
  }, [noteCantiere]);

  // Caricamento automatico della migliore voce italiana disponibile nel sistema (Web Speech API)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const selezionaVoceIt = () => {
      const voci = window.speechSynthesis.getVoices();
      if (!voci || voci.length === 0) return;
      const preferita =
        voci.find(
          (v) =>
            v.lang.toLowerCase().startsWith('it') &&
            (v.name.toLowerCase().includes('natural') ||
              v.name.toLowerCase().includes('google') ||
              v.name.toLowerCase().includes('alice') ||
              v.name.toLowerCase().includes('federica') ||
              v.name.toLowerCase().includes('luca')),
        ) ||
        voci.find((v) => v.lang.toLowerCase().startsWith('it')) ||
        null;

      setVoceItaliana(preferita);
    };

    selezionaVoceIt();
    window.speechSynthesis.addEventListener('voiceschanged', selezionaVoceIt);
    return () => {
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        selezionaVoceIt,
      );
    };
  }, []);

  // Pulizia microfono e sintesi vocale in caso di smontaggio componente
  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignora errore chiusura
        }
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          annullatoManualmenteRef.current = true;
          window.speechSynthesis.cancel();
        } catch {
          // ignora
        }
      }
    };
  }, []);

  // =========================================================================
  // FUNZIONI SINTESI VOCALE (TEXT-TO-SPEECH — WEB SPEECH API)
  // =========================================================================
  const fermaSintesiVocale = React.useCallback((mostraMessaggio = false) => {
    annullatoManualmenteRef.current = true;
    codaLetturaRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    setNotaInLetturaId(null);
    setLetturaInPausa(false);
    setModalitaLetturaTutte(false);
    setParolaCorrente('');
    if (mostraMessaggio) {
      showToast('info', 'Lettura vocale interrotta');
    }
  }, []);

  const pronunciaNota = React.useCallback(
    (nota: NotaCantiereItem, proseguiCoda: boolean) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        showToast('info', `Nota di ${nota.autore}: ${nota.testo}`);
        return;
      }

      try {
        const autorePulito = nota.autore.replace(/\(.*\)/, '').trim();
        const prefissoPriorita = nota.importante ? 'Nota urgente. ' : '';
        const testoDaLeggere = `${prefissoPriorita}Appunto di ${autorePulito} delle ore ${nota.orario}. ${nota.testo}`;

        const utterance = new SpeechSynthesisUtterance(testoDaLeggere);
        utterance.lang = 'it-IT';
        utterance.rate = velocitaVoce;
        utterance.pitch = 1.0;
        if (voceItaliana) {
          utterance.voice = voceItaliana;
        }

        utterance.onstart = () => {
          setNotaInLetturaId(nota.id);
          setLetturaInPausa(false);
        };

        utterance.onboundary = (ev) => {
          if (ev.name === 'word') {
            const estratto = testoDaLeggere
              .slice(ev.charIndex, ev.charIndex + (ev.charLength || 12))
              .trim();
            if (estratto) {
              setParolaCorrente(estratto);
            }
          }
        };

        utterance.onend = () => {
          if (annullatoManualmenteRef.current) return;

          if (proseguiCoda && codaLetturaRef.current.length > 0) {
            const prossima = codaLetturaRef.current.shift()!;
            pronunciaNota(prossima, true);
          } else {
            setNotaInLetturaId(null);
            setLetturaInPausa(false);
            setModalitaLetturaTutte(false);
            setParolaCorrente('');
          }
        };

        utterance.onerror = () => {
          setNotaInLetturaId(null);
          setLetturaInPausa(false);
          setModalitaLetturaTutte(false);
          setParolaCorrente('');
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        setNotaInLetturaId(null);
        showToast('info', `Nota di ${nota.autore}: ${nota.testo}`);
      }
    },
    [velocitaVoce, voceItaliana],
  );

  // Avvia o ferma la lettura vocale di una singola nota
  const handleAscoltaSingolaNota = (nota: NotaCantiereItem) => {
    if (notaInLetturaId === nota.id) {
      fermaSintesiVocale(true);
      return;
    }

    fermaSintesiVocale(false);
    annullatoManualmenteRef.current = false;
    setModalitaLetturaTutte(false);
    pronunciaNota(nota, false);
    showToast('info', `🔊 Lettura ad alta voce: nota di ${nota.autore}`);
  };

  // Avvia la lettura sequenziale di tutte le note di cantiere della giornata
  const handleLeggiTutteLeNote = () => {
    if (noteOrdinate.length === 0) {
      showToast('warning', 'Nessuna nota presente da leggere ad alta voce');
      return;
    }

    if (notaInLetturaId) {
      fermaSintesiVocale(true);
      return;
    }

    fermaSintesiVocale(false);
    annullatoManualmenteRef.current = false;
    setModalitaLetturaTutte(true);

    const [prima, ...resto] = noteOrdinate;
    codaLetturaRef.current = [...resto];
    pronunciaNota(prima, true);
    showToast(
      'success',
      `🔊 Avviata lettura vocale di tutti gli appunti (${noteOrdinate.length} note)`,
    );
  };

  // Pausa / Riprendi la sintesi vocale corrente
  const handleTogglePausaLettura = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      if (letturaInPausa) {
        window.speechSynthesis.resume();
        setLetturaInPausa(false);
      } else {
        window.speechSynthesis.pause();
        setLetturaInPausa(true);
      }
    } catch {
      // ignore
    }
  };

  // Legge ad alta voce la bozza che il tecnico sta scrivendo/dettando prima del salvataggio
  const handleAscoltaAnteprimaBozza = () => {
    const bozza = `${testoNota} ${trascrizioneParziale}`.trim();
    if (!bozza) {
      showToast('warning', 'Scrivi o detta un testo per ascoltare l’anteprima vocale');
      return;
    }
    fermaSintesiVocale(false);
    annullatoManualmenteRef.current = false;
    pronunciaNota(
      {
        id: 'anteprima-bozza',
        autore,
        testo: bozza,
        orario: 'adesso',
        data: oggiIso,
        origineVocale,
        importante,
      },
      false,
    );
  };

  // =========================================================================
  // FUNZIONI DETTATURA VOCALE (VOICE-TO-TEXT — SPEECH RECOGNITION)
  // =========================================================================
  const handleToggleDettaturaVocale = () => {
    if (inAscolto && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setInAscolto(false);
      setTrascrizioneParziale('');
      return;
    }

    // Se la sintesi vocale sta parlando, la fermiamo per non creare interferenza col microfono
    if (notaInLetturaId) {
      fermaSintesiVocale(false);
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };

    const SpeechRecognitionConstructor =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      const dettatoSimulato =
        'Attenzione squadra: per il cantiere in corso verificare pressione impianto a 1,8 bar e ritirare guarnizioni in magazzino.';
      setTestoNota((prev) =>
        prev ? `${prev.trim()} ${dettatoSimulato}` : dettatoSimulato,
      );
      setOrigineVocale(true);
      showToast(
        'info',
        'Riconoscimento vocale non supportato dal browser corrente: inserito testo vocale di esempio',
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = 'it-IT';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let finale = '';
        let provvisorio = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const risultato = event.results[i];
          if (risultato.isFinal) {
            finale += risultato[0].transcript;
          } else {
            provvisorio += risultato[0].transcript;
          }
        }
        if (finale) {
          setTestoNota((prev) =>
            prev ? `${prev.trim()} ${finale.trim()}` : finale.trim(),
          );
          setOrigineVocale(true);
        }
        setTrascrizioneParziale(provvisorio);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        setInAscolto(false);
        setTrascrizioneParziale('');
        if (event.error === 'not-allowed') {
          showToast(
            'warning',
            'Permesso microfono negato. Consenti il microfono nel browser o usa i suggerimenti rapidi.',
          );
        } else {
          showToast(
            'warning',
            'Dettatura vocale interrotta. Puoi riprovare o modificare il testo manualmente.',
          );
        }
      };

      recognition.onend = () => {
        setInAscolto(false);
        setTrascrizioneParziale('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setInAscolto(true);
      setOrigineVocale(true);
      showToast(
        'info',
        'Microfono attivo: parla ora per dettare la nota di cantiere...',
      );
    } catch {
      setInAscolto(false);
      showToast(
        'warning',
        'Impossibile avviare il microfono in questo ambiente.',
      );
    }
  };

  const handleSalvaNota = (e: React.FormEvent) => {
    e.preventDefault();
    const testoPulito = `${testoNota} ${trascrizioneParziale}`.trim();
    if (!testoPulito) {
      showToast(
        'warning',
        'Inserisci o detta un testo prima di salvare la nota',
      );
      return;
    }

    const adesso = new Date();
    const orarioCorrente = `${String(adesso.getHours()).padStart(2, '0')}:${String(
      adesso.getMinutes(),
    ).padStart(2, '0')}`;

    onAggiungiNota({
      autore,
      testo: testoPulito,
      orario: orarioCorrente,
      data: oggiIso,
      origineVocale,
      importante,
    });

    setTestoNota('');
    setTrascrizioneParziale('');
    setOrigineVocale(false);
    setImportante(false);

    if (inAscolto && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setInAscolto(false);
    }
  };

  const notaAttualmenteInLettura = React.useMemo(
    () => noteOrdinate.find((n) => n.id === notaInLetturaId) || null,
    [noteOrdinate, notaInLetturaId],
  );

  return (
    <section
      aria-labelledby="heading-note-cantiere"
      className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-4"
    >
      {/* =====================================================================
          INTESTAZIONE + CONTROLLI SINTESI VOCALE (LEGGI TUTTE + VELOCITÀ VOCE)
         ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center text-[#f59e0b] shrink-0">
            <MessageSquarePlus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="heading-note-cantiere"
                className="text-base sm:text-lg font-extrabold text-[#f1f5f9]"
              >
                Note Rapide di Cantiere
              </h2>
              <span className="text-[11px] font-bold text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/30 px-2 py-0.5 rounded-md">
                Visibili a tutta la squadra
              </span>
              <span className="text-[11px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                <Headphones className="w-3 h-3" />
                <span>Sintesi Vocale Attiva</span>
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Bacheca giornaliera condivisa ({formattaDataItaliana(oggiIso)}) · Ascolta le note a voce alta a mani libere o detta col microfono
            </p>
          </div>
        </div>

        {/* Barra Strumenti Sintesi Vocale (Web Speech API) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selettore velocità lettura vocale */}
          <div
            className="flex items-center gap-1 bg-[#0f1720] p-1 rounded-xl border border-[#2a3a4f]"
            title="Velocità sintesi vocale (Web Speech API)"
          >
            <span className="text-[11px] text-[#94a3b8] px-1.5 font-semibold">
              Voce:
            </span>
            {[
              { val: 0.85, label: '0.85x' },
              { val: 1.0, label: '1x' },
              { val: 1.2, label: '1.2x' },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setVelocitaVoce(opt.val)}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-colors ${
                  velocitaVoce === opt.val
                    ? 'bg-sky-500 text-[#0f1720]'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Pulsante "Leggi Tutte le Note" a voce alta */}
          <button
            type="button"
            onClick={handleLeggiTutteLeNote}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] shadow-sm ${
              notaInLetturaId && modalitaLetturaTutte
                ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white'
                : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/40'
            }`}
            title="Leggi tutte le note di cantiere a voce alta in sequenza"
          >
            {notaInLetturaId && modalitaLetturaTutte ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Ferma Lettura ({noteOrdinate.length})</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>🔊 Leggi Tutte ({noteOrdinate.length})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          BANNER PLAYER SINTESI VOCALE ATTIVO (Visibile durante la lettura a voce alta)
         ===================================================================== */}
      {notaInLetturaId && (
        <div
          role="status"
          aria-live="polite"
          className="bg-sky-500/15 border border-sky-500/50 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-[#0f1720] flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                  {letturaInPausa
                    ? '⏸️ Sintesi Vocale in Pausa'
                    : modalitaLetturaTutte
                      ? '🔊 Lettura Sequenziale Bacheca Cantiere'
                      : '🔊 Lettura Vocale Nota in Corso'}
                </span>
                {parolaCorrente && !letturaInPausa && (
                  <span className="text-[11px] font-mono bg-[#0f1720]/80 text-[#f59e0b] px-2 py-0.5 rounded border border-sky-500/30 truncate max-w-[140px]">
                    «{parolaCorrente}»
                  </span>
                )}
              </div>
              <p className="text-xs text-[#f1f5f9] truncate mt-0.5">
                {notaAttualmenteInLettura
                  ? `${notaAttualmenteInLettura.autore}: "${notaAttualmenteInLettura.testo}"`
                  : 'Anteprima vocale della bozza in corso...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleTogglePausaLettura}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f1720] hover:bg-[#1a2332] text-[#f1f5f9] border border-sky-500/40 text-xs font-bold transition-colors min-h-[36px]"
            >
              {letturaInPausa ? (
                <>
                  <Play className="w-3.5 h-3.5 text-[#10b981]" />
                  <span>Riprendi</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#f59e0b]" />
                  <span>Pausa</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => fermaSintesiVocale(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ef4444]/20 hover:bg-[#ef4444] text-[#ef4444] hover:text-white border border-[#ef4444]/40 text-xs font-bold transition-colors min-h-[36px]"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          FORM DI INSERIMENTO RAPIDO (TESTUALE + DETTATURA VOCALE + ANTEPRIMA TTS)
         ===================================================================== */}
      <form
        onSubmit={handleSalvaNota}
        className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-3.5 sm:p-4 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="autore-nota-cantiere"
              className="text-xs font-semibold text-[#94a3b8]"
            >
              Autore nota:
            </label>
            <select
              id="autore-nota-cantiere"
              value={autore}
              onChange={(e) => setAutore(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#1a2332] border border-[#2a3a4f] text-xs font-bold text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[36px]"
            >
              <option value="Mario Rossi (Titolare)">
                👨‍💼 Mario Rossi (Titolare)
              </option>
              {TECNICI_INIZIALI.map((tec) => (
                <option key={tec.id} value={tec.nome}>
                  👷 {tec.nome} ({tec.cognome})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* Pulsante per riascoltare a voce alta la bozza prima di salvarla */}
            {(testoNota.trim() || trascrizioneParziale.trim()) && (
              <button
                type="button"
                onClick={handleAscoltaAnteprimaBozza}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-500/15 text-sky-400 border border-sky-500/40 hover:bg-sky-500/25 transition-colors min-h-[36px]"
                title="Ascolta il testo scritto con la sintesi vocale prima di pubblicare"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Ascolta bozza</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setImportante((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors min-h-[36px] ${
                importante
                  ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/50'
                  : 'bg-[#1a2332] text-[#94a3b8] border-[#2a3a4f] hover:text-[#f1f5f9]'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>
                {importante ? 'Fissata in alto' : 'Segna come urgente'}
              </span>
            </button>
          </div>
        </div>

        {/* Area testo + Pulsante grande Microfono per uso con una mano sola */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <textarea
              rows={2}
              value={
                trascrizioneParziale
                  ? `${testoNota} ${trascrizioneParziale}`
                  : testoNota
              }
              onChange={(e) => {
                setTestoNota(e.target.value);
                setTrascrizioneParziale('');
              }}
              placeholder={
                inAscolto
                  ? '🎙️ Sto ascoltando in italiano... Parla pure dal cantiere'
                  : 'Scrivi un appunto per i tecnici (es. codici accesso, raccordi mancanti, stato caldaia) oppure premi Detta a Voce...'
              }
              className={`w-full p-3 rounded-xl bg-[#1a2332] border text-xs sm:text-sm text-[#f1f5f9] placeholder-[#94a3b8]/70 focus:outline-none transition-colors ${
                inAscolto
                  ? 'border-[#ef4444] ring-2 ring-[#ef4444]/30'
                  : 'border-[#2a3a4f] focus:border-[#f59e0b]'
              }`}
            />
          </div>

          {/* Pulsanti Microfono (Dettatura Vocale) e Salva Nota */}
          <div className="flex sm:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleDettaturaVocale}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
                inAscolto
                  ? 'bg-[#ef4444] text-white shadow-lg shadow-[#ef4444]/30'
                  : 'bg-[#1a2332] hover:bg-[#f59e0b]/15 text-[#f59e0b] border border-[#f59e0b]/40'
              }`}
              title="Attiva o ferma la dettatura vocale in italiano"
            >
              {inAscolto ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Ferma Voce</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Detta a Voce</span>
                </>
              )}
            </button>

            <button
              type="submit"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] text-xs font-bold transition-colors shadow-sm min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>Pubblica Nota</span>
            </button>
          </div>
        </div>

        {/* Frasi rapide one-tap per quando si è in cantiere con rumore di fondo */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="inline-flex items-center gap-1 text-[11px] text-[#94a3b8] mr-1">
            <Sparkles className="w-3 h-3 text-[#f59e0b]" />
            Inserimento rapido:
          </span>
          {FRASI_RAPIDE_CANTIERE.map((frase) => (
            <button
              key={frase}
              type="button"
              onClick={() =>
                setTestoNota((prev) =>
                  prev ? `${prev.trim()}. ${frase}` : frase,
                )
              }
              className="px-2.5 py-1 rounded-lg bg-[#1a2332] hover:bg-[#f59e0b]/15 text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] text-[11px] transition-colors text-left"
            >
              + {frase}
            </button>
          ))}
        </div>
      </form>

      {/* =====================================================================
          LISTA DELLE NOTE DI CANTIERE CON PULSANTI DI LETTURA VOCALE AD ALTA VISIBILITÀ
         ===================================================================== */}
      {noteOrdinate.length === 0 ? (
        <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-4 text-center text-xs text-[#94a3b8]">
          Nessuna nota rapida pubblicata per oggi. Usa la tastiera o il pulsante{' '}
          <strong className="text-[#f59e0b]">Detta a Voce</strong> per lasciare un messaggio ai tecnici.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {noteOrdinate.map((nota) => {
            const inLettura = notaInLetturaId === nota.id;
            return (
              <article
                key={nota.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                  inLettura
                    ? 'bg-sky-500/15 border-sky-400 ring-2 ring-sky-400/30 shadow-lg'
                    : nota.importante
                      ? 'bg-[#f59e0b]/10 border-[#f59e0b]/45'
                      : 'bg-[#0f1720] border-[#2a3a4f]'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-[#f1f5f9] truncate">
                        {nota.autore.includes('Mario')
                          ? `👨‍💼 ${nota.autore}`
                          : `👷 ${nota.autore}`}
                      </span>
                      {nota.origineVocale && (
                        <span
                          className="text-[10px] font-semibold text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30 shrink-0"
                          title="Nota dettata vocalmente"
                        >
                          🎙️ Vocale
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-[#f59e0b] tabular-nums shrink-0">
                      🕐 {nota.orario}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-[#f1f5f9]/95 leading-relaxed">
                    {nota.testo}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-[#2a3a4f]/70 text-xs gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* Pulsante grande per leggere la nota a voce alta (Web Speech API) */}
                    <button
                      type="button"
                      onClick={() => handleAscoltaSingolaNota(nota)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold transition-colors min-h-[34px] ${
                        inLettura
                          ? 'bg-[#ef4444] text-white'
                          : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/35'
                      }`}
                      title={
                        inLettura
                          ? 'Ferma lettura ad alta voce'
                          : 'Leggi nota a voce alta (Sintesi Vocale)'
                      }
                    >
                      {inLettura ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 shrink-0" />
                          <span>Ferma voce</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Leggi a voce alta</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleImportanteNota(nota.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg font-semibold transition-colors min-h-[34px] ${
                        nota.importante
                          ? 'text-[#f59e0b] bg-[#f59e0b]/15 border border-[#f59e0b]/30'
                          : 'text-[#94a3b8] hover:text-[#f59e0b]'
                      }`}
                      title="Fissa o rimuovi priorità"
                    >
                      <Pin className="w-3.5 h-3.5 shrink-0" />
                      <span>{nota.importante ? 'Urgente' : 'Fissa'}</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (inLettura) fermaSintesiVocale(false);
                      onEliminaNota(nota.id);
                    }}
                    className="text-[#94a3b8] hover:text-[#ef4444] p-1.5 rounded-lg transition-colors ml-auto"
                    title="Elimina nota di cantiere"
                    aria-label="Elimina nota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
