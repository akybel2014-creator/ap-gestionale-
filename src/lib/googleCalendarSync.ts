import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from 'firebase/auth';
import { auth, googleProvider, SCOPES } from './firebase';
import type { InterventoItem } from '@/components/rossi/HomeDashboard';
import type { FerieItem } from '@/components/rossi/AgendaSettimanale';

export { SCOPES };

// In-memory access token cache (never stored in localStorage/sessionStorage per security rules)
let isSigningInCalendar = false;
let cachedCalendarAccessToken: string | null = null;

export interface GoogleCalendarEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  extendedProperties?: {
    private?: Record<string, string>;
  };
}

export const initCalendarAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedCalendarAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedCalendarAccessToken);
      } else if (!isSigningInCalendar) {
        cachedCalendarAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedCalendarAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInGoogleCalendar = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningInCalendar = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Impossibile ottenere il token di accesso per Google Calendar.',
      );
    }
    cachedCalendarAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedCalendarAccessToken };
  } finally {
    isSigningInCalendar = false;
  }
};

export const getCalendarAccessToken = async (): Promise<string | null> => {
  return cachedCalendarAccessToken;
};

export const logoutGoogleCalendar = async (): Promise<void> => {
  await auth.signOut();
  cachedCalendarAccessToken = null;
};

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Legge gli eventi della settimana da Google Calendar primario dell'utente
 */
export async function listGoogleCalendarEvents(
  timeMinIso: string,
  timeMaxIso: string,
): Promise<GoogleCalendarEventItem[]> {
  const token = await getCalendarAccessToken();
  if (!token) {
    throw new Error('Autenticazione Google Calendar richiesta.');
  }

  const params = new URLSearchParams({
    timeMin: new Date(`${timeMinIso}T00:00:00`).toISOString(),
    timeMax: new Date(`${timeMaxIso}T23:59:59`).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Errore lettura Google Calendar (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { items?: GoogleCalendarEventItem[] };
  return data.items || [];
}

/**
 * Esporta (crea o aggiorna) gli interventi e le ferie su Google Calendar
 */
export async function pushScheduleToGoogleCalendar(
  interventi: InterventoItem[],
  ferie: FerieItem[],
  timeMinIso: string,
  timeMaxIso: string,
): Promise<{ creati: number; aggiornati: number }> {
  const token = await getCalendarAccessToken();
  if (!token) {
    throw new Error('Autenticazione Google Calendar richiesta.');
  }

  const esistenti = await listGoogleCalendarEvents(timeMinIso, timeMaxIso);
  const mappaPerRossiId = new Map<string, GoogleCalendarEventItem>();
  for (const ev of esistenti) {
    const rossiId = ev.extendedProperties?.private?.rossiId;
    if (rossiId) {
      mappaPerRossiId.set(rossiId, ev);
    }
  }

  let creati = 0;
  let aggiornati = 0;

  // 1. Sincronizza interventi
  for (const intv of interventi) {
    const startTime = intv.oraInizio || '08:30';
    const endTime = intv.oraFine || '11:00';
    const startDateTime = new Date(`${intv.data}T${startTime}:00`).toISOString();
    const endDateTime = new Date(`${intv.data}T${endTime}:00`).toISOString();

    const body = {
      summary: `[Rossi Impianti · ${intv.tecnico}] ${intv.titolo}`,
      location: intv.indirizzo,
      description: [
        `Reparto: ${intv.tipo}`,
        `Stato: ${intv.stato}`,
        `Tecnico assegnato: ${intv.tecnico}`,
        `Cliente: ${intv.clienteNome} (${intv.telefonoCliente || ''})`,
        intv.descrizione ? `Lavorazione: ${intv.descrizione}` : '',
        intv.noteTecniche ? `Note furgone: ${intv.noteTecniche}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      start: {
        dateTime: startDateTime,
        timeZone: 'Europe/Rome',
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'Europe/Rome',
      },
      extendedProperties: {
        private: {
          rossiId: `intervento-${intv.id}`,
          rossiType: 'intervento',
          tecnico: intv.tecnico,
          stato: intv.stato,
        },
      },
    };

    const giaPresente = mappaPerRossiId.get(`intervento-${intv.id}`);
    if (giaPresente) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(giaPresente.id)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) aggiornati += 1;
    } else {
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) creati += 1;
    }
  }

  // 2. Sincronizza ferie e assenze programmate (eventi all-day)
  for (const fer of ferie) {
    const endExclusive = addDaysIso(fer.dataFine || fer.dataInizio, 1);
    const body = {
      summary: `🌴 [Assenza · ${fer.tecnico}] ${fer.tipo} — Rossi Impianti`,
      description: `Tecnico: ${fer.tecnico}\nTipologia: ${fer.tipo}\nNote: ${fer.motivo || 'Assenza programmata in agenda'}`,
      start: {
        date: fer.dataInizio,
      },
      end: {
        date: endExclusive,
      },
      extendedProperties: {
        private: {
          rossiId: `ferie-${fer.id}`,
          rossiType: 'ferie',
          tecnico: fer.tecnico,
        },
      },
    };

    const giaPresente = mappaPerRossiId.get(`ferie-${fer.id}`);
    if (giaPresente) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(giaPresente.id)}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) aggiornati += 1;
    } else {
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        },
      );
      if (res.ok) creati += 1;
    }
  }

  return { creati, aggiornati };
}
