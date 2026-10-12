import React from 'react';
import {
  Calendar,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  initCalendarAuth,
  signInGoogleCalendar,
  logoutGoogleCalendar,
  listGoogleCalendarEvents,
  pushScheduleToGoogleCalendar,
  type GoogleCalendarEventItem,
} from '@/lib/googleCalendarSync';
import { getSettimanaCorrente, formattaDataItaliana } from '@/data.js';
import { showToast } from '@/lib/toast';
import type { InterventoItem } from './HomeDashboard';
import type { FerieItem } from './AgendaSettimanale';

interface GoogleCalendarSyncPanelProps {
  interventi: InterventoItem[];
  ferie: FerieItem[];
  onImportaImpegniDaGoogle: (
    nuoviInterventi: InterventoItem[],
    nuoveFerie: FerieItem[],
  ) => void;
}

/**
 * PANNELLO SINCRONIZZAZIONE BIDIREZIONALE GOOGLE CALENDAR
 * - Sign in with Google ufficiale (GSI style) con token conservato solo in memoria
 * - Importazione (Pull) di eventi e ferie da Google Calendar verso l'agenda Rossi Impianti
 * - Esportazione (Push) con finestra di conferma obbligatoria prima di modificare Google Calendar
 */
export default function GoogleCalendarSyncPanel({
  interventi,
  ferie,
  onImportaImpegniDaGoogle,
}: GoogleCalendarSyncPanelProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = React.useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = React.useState<boolean>(false);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [eventiRemoti, setEventiRemoti] = React.useState<
    GoogleCalendarEventItem[]
  >([]);
  const [ultimoSyncOrario, setUltimoSyncOrario] = React.useState<string | null>(
    null,
  );
  const [mostraConfermaPush, setMostraConfermaPush] =
    React.useState<boolean>(false);

  const { giorni } = React.useMemo(() => getSettimanaCorrente(), []);
  const inizioSettimanaIso = giorni[0]?.iso || '2026-10-05';
  const fineSettimanaIso = giorni[6]?.iso || '2026-10-11';

  React.useEffect(() => {
    const unsubscribe = initCalendarAuth(
      (loggedUser) => {
        setUser(loggedUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      },
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await signInGoogleCalendar();
      if (result) {
        setUser(result.user);
        setNeedsAuth(false);
        showToast(
          `Connesso a Google Calendar come ${result.user.email || result.user.displayName}`,
          'success',
        );
        await caricaEventiDaGoogle();
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Accesso a Google Calendar annullato';
      showToast(msg, 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogleCalendar();
    setUser(null);
    setNeedsAuth(true);
    setEventiRemoti([]);
    showToast('Disconnesso da Google Calendar', 'info');
  };

  // PULL: Legge gli eventi da Google Calendar e aggiorna/importa eventuali nuovi impegni
  const caricaEventiDaGoogle = async () => {
    setIsSyncing(true);
    try {
      const items = await listGoogleCalendarEvents(
        inizioSettimanaIso,
        fineSettimanaIso,
      );
      setEventiRemoti(items);
      const adesso = new Date().toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setUltimoSyncOrario(adesso);

      // Individua eventuali eventi creati sul dispositivo personale del tecnico da importare in agenda
      const idInterventiEsistenti = new Set(interventi.map((i) => i.id));
      const idFerieEsistenti = new Set(ferie.map((f) => f.id));

      const nuoviInterventiImportati: InterventoItem[] = [];
      const nuoveFerieImportate: FerieItem[] = [];

      for (const ev of items) {
        const rossiId = ev.extendedProperties?.private?.rossiId;
        if (rossiId) continue; // Già originato da Rossi Impianti

        const gcalLocalId = `gcal-${ev.id.slice(0, 12)}`;
        const titolo = (ev.summary || 'Impegno da Google Calendar').trim();

        // Se è un evento giornaliero (all-day) o contiene "ferie"/"permesso", importalo nelle ferie
        if (
          ev.start?.date ||
          titolo.toLowerCase().includes('ferie') ||
          titolo.toLowerCase().includes('permesso')
        ) {
          if (!idFerieEsistenti.has(gcalLocalId)) {
            const dataInizio =
              ev.start?.date ||
              (ev.start?.dateTime ? ev.start.dateTime.slice(0, 10) : inizioSettimanaIso);
            nuoveFerieImportate.push({
              id: gcalLocalId,
              tecnico: 'Luca',
              dataInizio,
              dataFine: dataInizio,
              tipo: 'Permesso ROL',
              motivo: `${titolo} (Importato da Google Calendar)`,
              approvato: true,
            });
          }
        } else if (ev.start?.dateTime && !idInterventiEsistenti.has(gcalLocalId)) {
          const dtStart = new Date(ev.start.dateTime);
          const dtEnd = ev.end?.dateTime
            ? new Date(ev.end.dateTime)
            : new Date(dtStart.getTime() + 2 * 3600 * 1000);
          const dataIso = ev.start.dateTime.slice(0, 10);
          const oraInizio = dtStart.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const oraFine = dtEnd.toLocaleTimeString('it-IT', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const durataOre = Math.max(
            1,
            Math.round(((dtEnd.getTime() - dtStart.getTime()) / 3600000) * 10) /
              10,
          );

          nuoviInterventiImportati.push({
            id: gcalLocalId,
            clienteId: 'cli-gcal',
            clienteNome: 'Impegno Google Calendar',
            titolo,
            descrizione:
              ev.description || 'Impegno sincronizzato da dispositivo personale.',
            tipo: 'Idraulico',
            data: dataIso,
            oraInizio,
            oraFine,
            durataOre,
            stato: 'Programmato',
            tecnico: 'Luca',
            indirizzo: ev.location || 'Vicenza (VI)',
            telefonoCliente: '+39 0444 321890',
            importoStimato: 0,
            priorita: 'Media',
          });
        }
      }

      if (
        nuoviInterventiImportati.length > 0 ||
        nuoveFerieImportate.length > 0
      ) {
        onImportaImpegniDaGoogle(
          nuoviInterventiImportati,
          nuoveFerieImportate,
        );
      } else {
        showToast(
          `Sincronizzazione completata: ${items.length} eventi letti da Google Calendar`,
          'success',
        );
      }
    } catch (err) {
      setNeedsAuth(true);
      showToast(
        err instanceof Error
          ? err.message
          : 'Errore durante la lettura da Google Calendar',
        'error',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // PUSH CON CONFERMA UTENTE OBBLIGATORIA
  const eseguiPushConfermato = async () => {
    setMostraConfermaPush(false);
    setIsSyncing(true);
    try {
      const esito = await pushScheduleToGoogleCalendar(
        interventi,
        ferie,
        inizioSettimanaIso,
        fineSettimanaIso,
      );
      const adesso = new Date().toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setUltimoSyncOrario(adesso);
      showToast(
        `Google Calendar aggiornato: ${esito.creati} nuovi eventi creati, ${esito.aggiornati} aggiornati`,
        'success',
      );
      await caricaEventiDaGoogle();
    } catch (err) {
      setNeedsAuth(true);
      showToast(
        err instanceof Error
          ? err.message
          : 'Errore durante la pubblicazione su Google Calendar',
        'error',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section
      aria-label="Sincronizzazione Bidirezionale Google Calendar"
      className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 shadow-md space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-5 h-5 text-[#f59e0b]" />
            <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9]">
              Sincronizzazione Bidirezionale Google Calendar
            </h2>
            {!needsAuth && user ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                <CheckCircle2 className="w-3 h-3" />
                <span>Connesso ({user.email})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-[#94a3b8] border border-[#2a3a4f]">
                <span>Dispositivi personali tecnici</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#94a3b8]">
            Esporta gli interventi ({interventi.length}) e le ferie programmate (
            {ferie.length}) sui calendari Google dei tecnici o importa gli impegni
            dai dispositivi personali
          </p>
        </div>

        {/* Controlli Autenticazione / Azioni Sync */}
        <div className="flex flex-wrap items-center gap-2.5">
          {needsAuth ? (
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-60"
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-4 h-4 shrink-0"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>
                {isLoggingIn ? 'Connessione...' : 'Sign in with Google'}
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={caricaEventiDaGoogle}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0f1720] hover:bg-slate-800 text-[#f1f5f9] border border-[#2a3a4f] text-xs font-bold transition-colors disabled:opacity-50"
              >
                <DownloadCloud
                  className={`w-4 h-4 text-sky-400 ${isSyncing ? 'animate-bounce' : ''}`}
                />
                <span>Importa da Google</span>
              </button>

              <button
                type="button"
                onClick={() => setMostraConfermaPush(true)}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] text-xs font-extrabold transition-colors shadow-sm disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Esporta su Google Calendar</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#0f1720] hover:bg-[#ef4444]/15 text-[#94a3b8] hover:text-[#ef4444] border border-[#2a3a4f] text-xs font-semibold transition-colors"
                title="Disconnetti Google Calendar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Riepilogo Eventi Sincronizzati quando autenticato */}
      {!needsAuth && (
        <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#f1f5f9] flex items-center gap-1.5">
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#f59e0b] ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>
                Eventi rilevati su Google Calendar nella settimana corrente:{' '}
                <strong className="text-[#f59e0b]">
                  {eventiRemoti.length}
                </strong>
              </span>
            </span>
            {ultimoSyncOrario && (
              <span className="text-[11px] text-[#94a3b8] font-mono">
                Ultimo aggiornamento: {ultimoSyncOrario}
              </span>
            )}
          </div>

          {eventiRemoti.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {eventiRemoti.slice(0, 6).map((ev) => {
                const dataRaw =
                  ev.start?.date ||
                  (ev.start?.dateTime ? ev.start.dateTime.slice(0, 10) : '');
                return (
                  <div
                    key={ev.id}
                    className="bg-[#1a2332] border border-[#2a3a4f] rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#f1f5f9] truncate">
                        {ev.summary || 'Evento senza titolo'}
                      </p>
                      <span className="text-[11px] text-[#94a3b8]">
                        {dataRaw ? formattaDataItaliana(dataRaw) : 'Settimana'}
                      </span>
                    </div>
                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#f59e0b] hover:text-amber-300 shrink-0"
                        title="Apri in Google Calendar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALE DI CONFERMA OBBLIGATORIA PRIMA DI MODIFICARE GOOGLE CALENDAR */}
      {mostraConfermaPush && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-conferma-gcal-title"
        >
          <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b] shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="modal-conferma-gcal-title"
                    className="text-base font-extrabold text-[#f1f5f9]"
                  >
                    Conferma aggiornamento Google Calendar
                  </h3>
                  <p className="text-xs text-[#94a3b8]">
                    Operazione di scrittura sul calendario personale
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostraConfermaPush(false)}
                className="text-[#94a3b8] hover:text-[#f1f5f9] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3.5 text-xs text-[#f1f5f9] space-y-2 leading-relaxed">
              <p>
                Stai per pubblicare o aggiornare sul tuo account{' '}
                <strong>Google Calendar ({user?.email})</strong>:
              </p>
              <ul className="list-disc list-inside text-[#94a3b8] space-y-1">
                <li>
                  <strong className="text-[#f59e0b]">
                    {interventi.length} interventi tecnici
                  </strong>{' '}
                  programmati nella settimana
                </li>
                <li>
                  <strong className="text-purple-400">
                    {ferie.length} giornate di ferie/permessi
                  </strong>{' '}
                  della squadra
                </li>
              </ul>
              <p className="text-[11px] text-[#94a3b8]">
                Confermi di voler procedere con la sincronizzazione verso Google
                Calendar?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setMostraConfermaPush(false)}
                className="px-4 py-2 rounded-xl bg-[#0f1720] hover:bg-slate-800 text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] text-xs font-bold transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={eseguiPushConfermato}
                className="px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] text-xs font-extrabold transition-colors shadow-md"
              >
                Conferma e Sincronizza
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
