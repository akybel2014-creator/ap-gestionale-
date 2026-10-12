import { showToast } from './toast';

export interface ImpostazioniPushLocali {
  abilitate: boolean;
  suonoAttivo: boolean;
  notificaNuoviInterventi: boolean;
  notificaCambiStatoUrgenti: boolean;
  notificaNoteUrgenti: boolean;
}

export interface NotificaPushLocalePayload {
  id: string;
  titolo: string;
  messaggio: string;
  tecnicoDestinatario?: string;
  indirizzo?: string;
  orario: string;
  priorita: 'urgenza' | 'normale';
  categoria:
    | 'nuovo_intervento'
    | 'cambio_stato'
    | 'nota_urgente'
    | 'allerta_meteo';
  interventoId?: string;
}

const PUSH_SETTINGS_KEY = 'rossi_impianti_push_settings_v1';

export const DEFAULT_IMPOSTAZIONI_PUSH: ImpostazioniPushLocali = {
  abilitate: true,
  suonoAttivo: true,
  notificaNuoviInterventi: true,
  notificaCambiStatoUrgenti: true,
  notificaNoteUrgenti: true,
};

/**
 * Carica le preferenze delle notifiche push locali da LocalStorage
 */
export function caricaImpostazioniPush(): ImpostazioniPushLocali {
  if (typeof window === 'undefined') return DEFAULT_IMPOSTAZIONI_PUSH;
  try {
    const raw = window.localStorage.getItem(PUSH_SETTINGS_KEY);
    if (!raw) return DEFAULT_IMPOSTAZIONI_PUSH;
    return { ...DEFAULT_IMPOSTAZIONI_PUSH, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_IMPOSTAZIONI_PUSH;
  }
}

/**
 * Salva le preferenze delle notifiche push locali in LocalStorage
 */
export function salvaImpostazioniPush(
  impostazioni: ImpostazioniPushLocali,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      PUSH_SETTINGS_KEY,
      JSON.stringify(impostazioni),
    );
  } catch {
    // ignore storage errors
  }
}

/**
 * Restituisce lo stato attuale del permesso Web Notification API del browser
 */
export function getStatoPermessoBrowser():
  | 'granted'
  | 'denied'
  | 'default'
  | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

/**
 * Richiede il permesso per le notifiche native del sistema operativo (Web Notification API)
 */
export async function richiediPermessoNotificheBrowser(): Promise<
  'granted' | 'denied' | 'default' | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    showToast(
      'info',
      'Notifiche Push Locali attive in modalità Banner Cantiere (in-app)',
    );
    return 'unsupported';
  }

  try {
    const risultato = await window.Notification.requestPermission();
    if (risultato === 'granted') {
      showToast(
        'success',
        'Permesso Notifiche Push concesso dal dispositivo',
      );
    } else if (risultato === 'denied') {
      showToast(
        'info',
        'Permesso di sistema bloccato: gli avvisi push verranno mostrati come Banner Cantiere in-app',
      );
    }
    return risultato;
  } catch {
    return 'default';
  }
}

/**
 * Riproduce un segnale acustico sintetizzato (Web Audio API) per richiamare l'attenzione
 * del tecnico in cantiere senza bisogno di file audio esterni
 */
export function riproduciSuonoPushCantiere(tipo: 'urgenza' | 'normale'): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (tipo === 'urgenza') {
      // Doppio impulso ravvicinato ad alta visibilità sonora (880Hz -> 1174Hz)
      [0, 0.16].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(idx === 0 ? 880 : 1174.66, now + offset);
        gain.gain.setValueAtTime(0.16, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      });
    } else {
      // Singolo chime morbido per nuovo intervento (659Hz -> 880Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880, now + 0.09);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Ignora se l'AudioContext richiede prima un'interazione utente
  }
}

/**
 * Invia una Notifica Push Locale combinando:
 * 1. Notifica nativa del browser/OS (`new Notification(...)` o ServiceWorker) se autorizzata
 * 2. Segnale acustico Web Audio API e vibrazione mobile (se supportata)
 */
export function inviaNotificaPushSistema(
  payload: NotificaPushLocalePayload,
  impostazioni: ImpostazioniPushLocali,
): void {
  if (!impostazioni.abilitate) return;

  // 1. Segnale sonoro
  if (impostazioni.suonoAttivo) {
    riproduciSuonoPushCantiere(payload.priorita);
  }

  // 2. Vibrazione tattile su smartphone Android
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(
        payload.priorita === 'urgenza' ? [180, 80, 220] : [120],
      );
    } catch {
      // ignore
    }
  }

  // 3. Notifica nativa del Sistema Operativo / Browser (se consentita)
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    window.Notification.permission === 'granted'
  ) {
    try {
      const corpo = [
        payload.messaggio,
        payload.tecnicoDestinatario
          ? `👷 Tecnico: ${payload.tecnicoDestinatario}`
          : '',
        payload.indirizzo ? `📍 ${payload.indirizzo}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      new window.Notification(payload.titolo, {
        body: corpo,
        tag: payload.id,
        requireInteraction: payload.priorita === 'urgenza',
      });
    } catch {
      // In alcuni contesti mobile/iframe Notification richiede ServiceWorker: il banner push in-app garantisce sempre la ricezione
    }
  }
}
