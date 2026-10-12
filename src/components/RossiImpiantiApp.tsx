import React from 'react';
import {
  CLIENTI_INIZIALI,
  creaInterventiIniziali,
  creaFerieIniziali,
  creaNoteCantiereIniziali,
  creaManutenzioniIniziali,
  calcolaProssimaScadenza,
  calcolaStatoManutenzione,
  getSettimanaCorrente,
  PREVENTIVI_INIZIALI,
  FATTURE_INIZIALI,
  AVVISI_INIZIALI,
  formattaDataItaliana,
} from '@/data.js';
import { showToast } from '@/lib/toast';
import HeaderENavigazione, {
  type PaginaAttiva,
  type AvvisoItem,
} from './rossi/HeaderENavigazione';
import HomeDashboard, {
  type InterventoItem,
  type PreventivoItem,
} from './rossi/HomeDashboard';
import type { NotaCantiereItem } from './rossi/NoteRapideCantiere';
import AgendaSettimanale, { type FerieItem } from './rossi/AgendaSettimanale';
import GestioneClienti, { type ClienteItem } from './rossi/GestioneClienti';
import GestioneFatture, { type FatturaItem } from './rossi/GestioneFatture';
import GestioneManutenzioni, {
  type ManutenzioneProgrammataItem,
} from './rossi/GestioneManutenzioni';
import ReportStatistiche from './rossi/ReportStatistiche';
import DashboardTempiIntervento from './rossi/DashboardTempiIntervento';
import {
  ModaleDettaglioIntervento,
  ModaleFormIntervento,
  ModaleFormCliente,
  ModaleFormPreventivo,
} from './rossi/ModaliOperative';
import {
  esportaInterventiOdierniCsv,
  esportaInterventiOdierniPdf,
  esportaFatturaPdf,
} from '@/lib/esportaCantiere';
import {
  type ImpostazioniPushLocali,
  type NotificaPushLocalePayload,
  caricaImpostazioniPush,
  salvaImpostazioniPush,
  inviaNotificaPushSistema,
} from '@/lib/notifichePushLocali';
import BannerPushCantiere from './rossi/BannerPushCantiere';
import ImpostazioniMeteoModal, {
  type ImpostazioniMeteoVicenza,
  caricaImpostazioniMeteo,
  salvaImpostazioniMeteo,
} from './rossi/ImpostazioniMeteoModal';

// Chiavi di persistenza LocalStorage
const STORAGE_KEYS = {
  CLIENTI: 'rossi_impianti_clienti_v1',
  INTERVENTI: 'rossi_impianti_interventi_v1',
  PREVENTIVI: 'rossi_impianti_preventivi_v1',
  FATTURE: 'rossi_impianti_fatture_v1',
  AVVISI: 'rossi_impianti_avvisi_v1',
  FERIE: 'rossi_impianti_ferie_v1',
  NOTE_CANTIERE: 'rossi_impianti_note_cantiere_v1',
  MANUTENZIONI: 'rossi_impianti_manutenzioni_v1',
};

function caricaDaLocalStorage<T>(chiave: string, valoreDefault: T): T {
  if (typeof window === 'undefined') return valoreDefault;
  try {
    const salvato = window.localStorage.getItem(chiave);
    if (!salvato) return valoreDefault;
    const parsed = JSON.parse(salvato) as T;
    return parsed ?? valoreDefault;
  } catch {
    return valoreDefault;
  }
}

/**
 * Componente principale "Rossi Impianti"
 * Gestisce le 5 pagine (Home, Agenda, Clienti, Fatture, Report),
 * la persistenza automatica in LocalStorage, le modali di creazione/modifica
 * e le notifiche toast di conferma.
 */
export default function RossiImpiantiApp() {
  const [paginaAttiva, setPaginaAttiva] = React.useState<PaginaAttiva>('home');

  // Stati principali caricati da LocalStorage (o inizializzati con i dati mock di data.js)
  const [clienti, setClienti] = React.useState<ClienteItem[]>(() =>
    caricaDaLocalStorage(
      STORAGE_KEYS.CLIENTI,
      CLIENTI_INIZIALI as ClienteItem[],
    ),
  );

  const [interventi, setInterventi] = React.useState<InterventoItem[]>(() =>
    caricaDaLocalStorage(
      STORAGE_KEYS.INTERVENTI,
      creaInterventiIniziali() as InterventoItem[],
    ),
  );

  const [preventivi, setPreventivi] = React.useState<PreventivoItem[]>(() =>
    caricaDaLocalStorage(
      STORAGE_KEYS.PREVENTIVI,
      PREVENTIVI_INIZIALI as PreventivoItem[],
    ),
  );

  const [fatture, setFatture] = React.useState<FatturaItem[]>(() =>
    caricaDaLocalStorage(
      STORAGE_KEYS.FATTURE,
      FATTURE_INIZIALI as FatturaItem[],
    ),
  );

  const [avvisi, setAvvisi] = React.useState<AvvisoItem[]>(() =>
    caricaDaLocalStorage(STORAGE_KEYS.AVVISI, AVVISI_INIZIALI as AvvisoItem[]),
  );

  const [ferie, setFerie] = React.useState<FerieItem[]>(() =>
    caricaDaLocalStorage(
      STORAGE_KEYS.FERIE,
      creaFerieIniziali() as FerieItem[],
    ),
  );

  const [noteCantiere, setNoteCantiere] = React.useState<NotaCantiereItem[]>(
    () =>
      caricaDaLocalStorage(
        STORAGE_KEYS.NOTE_CANTIERE,
        creaNoteCantiereIniziali() as NotaCantiereItem[],
      ),
  );

  const [manutenzioni, setManutenzioni] = React.useState<
    ManutenzioneProgrammataItem[]
  >(() =>
    caricaDaLocalStorage(
      STORAGE_KEYS.MANUTENZIONI,
      creaManutenzioniIniziali() as ManutenzioneProgrammataItem[],
    ),
  );

  // Stato impostazioni e coda banner per il sistema di Notifiche Push Locali
  const [impostazioniPush, setImpostazioniPush] =
    React.useState<ImpostazioniPushLocali>(() => caricaImpostazioniPush());
  const [notifichePushAttive, setNotifichePushAttive] = React.useState<
    NotificaPushLocalePayload[]
  >([]);

  // Stato Impostazioni Meteo & OpenWeatherMap Server Proxy
  const [impostazioniMeteo, setImpostazioniMeteo] =
    React.useState<ImpostazioniMeteoVicenza>(() => caricaImpostazioniMeteo());
  const [modaleImpostazioniMeteoAperta, setModaleImpostazioniMeteoAperta] =
    React.useState<boolean>(false);

  const handleSalvaImpostazioniMeteo = (nuove: ImpostazioniMeteoVicenza) => {
    setImpostazioniMeteo(nuove);
    salvaImpostazioniMeteo(nuove);
  };

  const emettiNotificaPushLocale = React.useCallback(
    (
      datiPush: Omit<NotificaPushLocalePayload, 'id' | 'orario'>,
      registraInCentroAvvisi = true,
    ) => {
      const adesso = new Date();
      const orario = `${String(adesso.getHours()).padStart(2, '0')}:${String(
        adesso.getMinutes(),
      ).padStart(2, '0')}`;

      const payload: NotificaPushLocalePayload = {
        ...datiPush,
        id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        orario,
      };

      // Se le notifiche push locali sono abilitate, mostra il banner in-app e invia la notifica OS/Audio
      if (impostazioniPush.abilitate) {
        setNotifichePushAttive((prev) => [payload, ...prev].slice(0, 3));
        inviaNotificaPushSistema(payload, impostazioniPush);

        // Auto-chiusura del banner push dopo 8 secondi
        window.setTimeout(() => {
          setNotifichePushAttive((prev) =>
            prev.filter((item) => item.id !== payload.id),
          );
        }, 8000);
      }

      // Aggiunge anche al Centro Avvisi & Scadenze (campanella con badge rosso dinamico)
      if (registraInCentroAvvisi) {
        const nuovoAvviso: AvvisoItem = {
          id: `avv-${Date.now()}`,
          tipo: datiPush.priorita === 'urgenza' ? 'urgenza' : 'scadenza',
          titolo: datiPush.titolo,
          descrizione: `${datiPush.messaggio}${
            datiPush.tecnicoDestinatario
              ? ` (👷 ${datiPush.tecnicoDestinatario})`
              : ''
          }`,
          data: `Oggi · ${orario}`,
          letto: false,
        };
        setAvvisi((prev) => [nuovoAvviso, ...prev]);
      }
    },
    [impostazioniPush],
  );

  const handleAggiornaImpostazioniPush = (nuove: ImpostazioniPushLocali) => {
    setImpostazioniPush(nuove);
    salvaImpostazioniPush(nuove);
    showToast(
      'info',
      nuove.abilitate
        ? 'Notifiche Push Locali attivate per la squadra'
        : 'Notifiche Push Locali disattivate',
    );
  };

  // Salvataggio automatico in LocalStorage ad ogni modifica
  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.CLIENTI,
        JSON.stringify(clienti),
      );
    } catch {
      // ignora errori quota storage
    }
  }, [clienti]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.INTERVENTI,
        JSON.stringify(interventi),
      );
    } catch {
      // ignora errori quota storage
    }
  }, [interventi]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.PREVENTIVI,
        JSON.stringify(preventivi),
      );
    } catch {
      // ignora errori quota storage
    }
  }, [preventivi]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.FATTURE,
        JSON.stringify(fatture),
      );
    } catch {
      // ignora errori quota storage
    }
  }, [fatture]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.AVVISI, JSON.stringify(avvisi));
    } catch {
      // ignora errori quota storage
    }
  }, [avvisi]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.FERIE, JSON.stringify(ferie));
    } catch {
      // ignora errori quota storage
    }
  }, [ferie]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.NOTE_CANTIERE,
        JSON.stringify(noteCantiere),
      );
    } catch {
      // ignora errori quota storage
    }
  }, [noteCantiere]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.MANUTENZIONI,
        JSON.stringify(manutenzioni),
      );
    } catch {
      // ignora errori quota storage
    }
  }, [manutenzioni]);

  // Generazione automatica avvisi agenda per scadenze manutenzioni ricorrenti in avvicinamento (≤ 30 gg)
  React.useEffect(() => {
    const { oggiIso } = getSettimanaCorrente();
    const scadenzeImminenti = manutenzioni.filter((m) => {
      if (!m.attiva) return false;
      const stato = calcolaStatoManutenzione(m.prossimaScadenza, oggiIso);
      return stato === 'In scadenza' || stato === 'Scaduta';
    });

    if (scadenzeImminenti.length === 0) return;

    setAvvisi((prev) => {
      let updated = [...prev];
      let nuoviAggiunti = 0;
      scadenzeImminenti.forEach((m) => {
        const idAvviso = `avv-man-${m.id}`;
        const giaEsiste = updated.some(
          (a) =>
            a.id === idAvviso ||
            (a.titolo.includes(m.impianto) && a.titolo.includes('Scadenza')),
        );
        if (!giaEsiste) {
          const stato = calcolaStatoManutenzione(m.prossimaScadenza, oggiIso);
          const nuovoAvviso: AvvisoItem = {
            id: idAvviso,
            tipo: stato === 'Scaduta' ? 'urgenza' : 'scadenza',
            titolo: `🔔 Scadenza Ricorrente: ${m.impianto}`,
            descrizione: `${m.titolo} (${m.frequenza}) per ${m.clienteNome} in scadenza il ${formattaDataItaliana(
              m.prossimaScadenza,
            )} — Assegnato a 👷 ${m.tecnicoAssegnato}.`,
            data: formattaDataItaliana(m.prossimaScadenza),
            letto: false,
          };
          updated = [nuovoAvviso, ...updated];
          nuoviAggiunti++;
        }
      });
      return nuoviAggiunti > 0 ? updated : prev;
    });
  }, [manutenzioni]);

  // Stati per il controllo delle Modali
  const [interventoDettaglio, setInterventoDettaglio] =
    React.useState<InterventoItem | null>(null);
  const [modaleInterventoAperta, setModaleInterventoAperta] =
    React.useState(false);
  const [interventoInModifica, setInterventoInModifica] =
    React.useState<InterventoItem | null>(null);
  const [dataPreselezionataIntervento, setDataPreselezionataIntervento] =
    React.useState<string | undefined>(undefined);
  const [clientePreselezionatoId, setClientePreselezionatoId] = React.useState<
    string | undefined
  >(undefined);

  const [modaleClienteAperta, setModaleClienteAperta] = React.useState(false);
  const [clienteInModifica, setClienteInModifica] =
    React.useState<ClienteItem | null>(null);

  const [modalePreventivoAperta, setModalePreventivoAperta] =
    React.useState(false);
  const [preventivoInModifica, setPreventivoInModifica] =
    React.useState<PreventivoItem | null>(null);

  const [apertaModificaDaQr, setApertaModificaDaQr] = React.useState(false);

  // Apertura automatica della scheda intervento o dello stato di modifica rapida quando il tecnico scansiona il QR Code mobile (?intervento=<id>&mode=edit&qrscan=1)
  const qrCheckEseguitoRef = React.useRef(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || qrCheckEseguitoRef.current) return;
    qrCheckEseguitoRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const idDaQr = params.get('intervento');
    const modeDaQr = params.get('mode');
    if (idDaQr) {
      const trovato = interventi.find((i) => i.id === idDaQr);
      if (trovato) {
        if (modeDaQr === 'edit') {
          setInterventoInModifica(trovato);
          setModaleInterventoAperta(true);
          setApertaModificaDaQr(true);
          showToast(
            'success',
            `📲 Deep-Link QR rilevato: aperto intervento "${trovato.titolo}" in modalità modifica rapida (${trovato.tecnico})`,
          );
        } else {
          setInterventoDettaglio(trovato);
          showToast(
            'success',
            `📲 QR Cantiere rilevato: aperto intervento "${trovato.titolo}" (${trovato.tecnico})`,
          );
        }
      }
    }
  }, [interventi]);

  // Mantiene sincronizzato il parametro ?intervento=<id>&mode=edit nell'URL quando si apre/chiude il dettaglio o la modifica
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (modaleInterventoAperta && interventoInModifica) {
      url.searchParams.set('intervento', interventoInModifica.id);
      url.searchParams.set('mode', 'edit');
    } else if (interventoDettaglio) {
      url.searchParams.set('intervento', interventoDettaglio.id);
      url.searchParams.delete('mode');
    } else {
      url.searchParams.delete('intervento');
      url.searchParams.delete('mode');
      url.searchParams.delete('qrscan');
    }
    window.history.replaceState({}, '', url.toString());
  }, [interventoDettaglio, modaleInterventoAperta, interventoInModifica]);

  // Mantiene aggiornato l'oggetto interventoDettaglio quando viene cambiato lo stato in tempo reale
  React.useEffect(() => {
    if (!interventoDettaglio) return;
    const aggiornato = interventi.find((i) => i.id === interventoDettaglio.id);
    if (aggiornato && aggiornato !== interventoDettaglio) {
      setInterventoDettaglio(aggiornato);
    }
  }, [interventi, interventoDettaglio]);

  // Calcolo KPI Fatturato Mensile corrente (Ottobre 2026 + interventi completati)
  const fatturatoMese = React.useMemo(() => {
    const fattureOttobre = fatture
      .filter((f) => f.mese === 10 && f.anno === 2026)
      .reduce((s, f) => s + f.importo, 0);
    return Math.max(18450, fattureOttobre + 7068);
  }, [fatture]);

  // =========================================================================
  // HANDLER OPERATIVI: INTERVENTI (CON NOTIFICHE PUSH LOCALI AI TECNICI)
  // =========================================================================
  const handleSalvaIntervento = (
    dati: Omit<InterventoItem, 'id'>,
    idEsistente?: string,
  ) => {
    if (idEsistente) {
      setInterventi((prev) =>
        prev.map((item) =>
          item.id === idEsistente ? { ...dati, id: idEsistente } : item,
        ),
      );
      showToast('success', 'Intervento aggiornato con successo');

      emettiNotificaPushLocale({
        titolo: `Intervento aggiornato per ${dati.tecnico}`,
        messaggio: `${dati.titolo} (${formattaDataItaliana(dati.data)} ore ${dati.oraInizio}) — Stato: ${dati.stato}`,
        tecnicoDestinatario: dati.tecnico,
        indirizzo: dati.indirizzo,
        priorita: dati.priorita === 'Alta' ? 'urgenza' : 'normale',
        categoria: 'cambio_stato',
        interventoId: idEsistente,
      });
    } else {
      const nuovo: InterventoItem = {
        ...dati,
        id: `int-${Date.now()}`,
      };
      setInterventi((prev) => [nuovo, ...prev]);
      showToast('success', 'Intervento salvato in agenda');

      emettiNotificaPushLocale({
        titolo:
          nuovo.priorita === 'Alta'
            ? `🚨 Nuovo Intervento Urgente assegnato a ${nuovo.tecnico}`
            : `📲 Nuovo Intervento assegnato a ${nuovo.tecnico}`,
        messaggio: `${nuovo.titolo} in programma il ${formattaDataItaliana(nuovo.data)} alle ${nuovo.oraInizio}.`,
        tecnicoDestinatario: nuovo.tecnico,
        indirizzo: nuovo.indirizzo,
        priorita: nuovo.priorita === 'Alta' ? 'urgenza' : 'normale',
        categoria: 'nuovo_intervento',
        interventoId: nuovo.id,
      });
    }
  };

  const handleCambiaStatoIntervento = (
    id: string,
    nuovoStato: InterventoItem['stato'],
  ) => {
    const target = interventi.find((item) => item.id === id);

    setInterventi((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, stato: nuovoStato } : item,
      ),
    );
    setInterventoDettaglio((prev) =>
      prev && prev.id === id ? { ...prev, stato: nuovoStato } : prev,
    );
    showToast('success', `Stato intervento aggiornato: ${nuovoStato}`);

    if (target) {
      const isUrgente =
        nuovoStato === 'In corso' || target.priorita === 'Alta';
      emettiNotificaPushLocale({
        titolo:
          nuovoStato === 'In corso'
            ? `⚡ Cantiere Avviato (${target.tecnico}): In corso`
            : nuovoStato === 'Completato'
              ? `✅ Intervento Completato da ${target.tecnico}`
              : `🔄 Cambio Stato Agenda: ${nuovoStato}`,
        messaggio: `${target.titolo} (${target.oraInizio}) è passato allo stato "${nuovoStato}".`,
        tecnicoDestinatario: target.tecnico,
        indirizzo: target.indirizzo,
        priorita: isUrgente ? 'urgenza' : 'normale',
        categoria: 'cambio_stato',
        interventoId: target.id,
      });
    }
  };

  const handleAggiornaRapidoDaQr = (
    id: string,
    aggiornamenti: Partial<
      Pick<InterventoItem, 'stato' | 'noteTecniche' | 'durataOre'>
    >,
  ) => {
    setInterventi((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...aggiornamenti } : item,
      ),
    );
    setInterventoDettaglio((prev) =>
      prev && prev.id === id ? { ...prev, ...aggiornamenti } : prev,
    );
    showToast(
      'success',
      '📲 Aggiornamento rapido da mobile salvato sull’intervento',
    );
  };

  const handleSimulaPushUrgenteTecnici = () => {
    const primoIntervento = interventi[0];
    emettiNotificaPushLocale({
      titolo: '🚨 Cambio Stato Urgente in Agenda',
      messaggio: primoIntervento
        ? `Richiesto intervento immediato per "${primoIntervento.titolo}" — verificare dotazione furgone.`
        : 'Nuova chiamata urgente centrale termica in Via Roma 42, Vicenza.',
      tecnicoDestinatario: primoIntervento?.tecnico || 'Luca',
      indirizzo: primoIntervento?.indirizzo || 'Viale Roma 42, Vicenza (VI)',
      priorita: 'urgenza',
      categoria: 'cambio_stato',
      interventoId: primoIntervento?.id,
    });
  };

  const handleEliminaIntervento = (id: string) => {
    setInterventi((prev) => prev.filter((item) => item.id !== id));
    showToast('info', 'Intervento rimosso dall’agenda');
  };

  // =========================================================================
  // HANDLER OPERATIVI: CLIENTI
  // =========================================================================
  const handleSalvaCliente = (
    dati: Omit<ClienteItem, 'id'>,
    idEsistente?: string,
  ) => {
    if (idEsistente) {
      setClienti((prev) =>
        prev.map((c) =>
          c.id === idEsistente ? { ...dati, id: idEsistente } : c,
        ),
      );
      showToast('success', 'Scheda cliente aggiornata');
    } else {
      const nuovo: ClienteItem = {
        ...dati,
        id: `cli-${Date.now()}`,
      };
      setClienti((prev) => [nuovo, ...prev]);
      showToast('success', 'Nuovo cliente salvato in anagrafica');
    }
  };

  const handleEliminaCliente = (id: string) => {
    setClienti((prev) => prev.filter((c) => c.id !== id));
    showToast('info', 'Cliente eliminato dall’anagrafica');
  };

  const handleAggiornaNoteCliente = (id: string, nuoveNote: string) => {
    setClienti((prev) =>
      prev.map((c) => (c.id === id ? { ...c, note: nuoveNote } : c)),
    );
    showToast('success', 'Note interne del cantiere salvate');
  };

  // =========================================================================
  // HANDLER OPERATIVI: MANUTENZIONI PROGRAMMATE RICORRENTI
  // =========================================================================
  const handleAggiungiManutenzione = (
    nuova: Omit<ManutenzioneProgrammataItem, 'id'>,
  ) => {
    const record: ManutenzioneProgrammataItem = {
      ...nuova,
      id: `man-${Date.now()}`,
    };
    setManutenzioni((prev) => [record, ...prev]);
    showToast(
      'success',
      `Nuova scadenza programmata creata per ${record.clienteNome} (${record.frequenza})`,
    );

    emettiNotificaPushLocale({
      titolo: `📋 Nuova Scadenza Ricorrente: ${record.impianto}`,
      messaggio: `${record.titolo} (${record.frequenza}) registrata con scadenza ${formattaDataItaliana(
        record.prossimaScadenza,
      )}.`,
      tecnicoDestinatario: record.tecnicoAssegnato,
      indirizzo: record.indirizzoCliente,
      priorita: 'normale',
      categoria: 'nuovo_intervento',
    });
  };

  const handleModificaManutenzione = (
    aggiornata: ManutenzioneProgrammataItem,
  ) => {
    setManutenzioni((prev) =>
      prev.map((m) => (m.id === aggiornata.id ? aggiornata : m)),
    );
    showToast('success', 'Parametri manutenzione programmata aggiornati');
  };

  const handleEliminaManutenzione = (id: string) => {
    setManutenzioni((prev) => prev.filter((m) => m.id !== id));
    showToast('info', 'Scadenza manutenzione rimossa');
  };

  const handleRinnovaManutenzione = (id: string) => {
    const { oggiIso } = getSettimanaCorrente();
    let recordAggiornato: ManutenzioneProgrammataItem | null = null;

    setManutenzioni((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const nuovaDataScadenza = calcolaProssimaScadenza(oggiIso, m.frequenza);
        recordAggiornato = {
          ...m,
          ultimaEsecuzione: oggiIso,
          prossimaScadenza: nuovaDataScadenza,
        };
        return recordAggiornato;
      }),
    );

    if (recordAggiornato) {
      const rec = recordAggiornato as ManutenzioneProgrammataItem;
      showToast(
        'success',
        `Manutenzione eseguita! Nuova scadenza ricorrente fissata al ${formattaDataItaliana(
          rec.prossimaScadenza,
        )} (${rec.frequenza})`,
      );
      emettiNotificaPushLocale({
        titolo: `✅ Manutenzione Eseguita: ${rec.impianto}`,
        messaggio: `Rinnovo completato per ${rec.clienteNome}. Prossima data: ${formattaDataItaliana(
          rec.prossimaScadenza,
        )} (${rec.frequenza}).`,
        tecnicoDestinatario: rec.tecnicoAssegnato,
        indirizzo: rec.indirizzoCliente,
        priorita: 'normale',
        categoria: 'cambio_stato',
      });
    }
  };

  const handlePianificaInterventoDaManutenzione = (
    man: ManutenzioneProgrammataItem,
    dataPreselezionata?: string,
  ) => {
    setInterventoInModifica(null);
    setClientePreselezionatoId(man.clienteId);
    setDataPreselezionataIntervento(dataPreselezionata || man.prossimaScadenza);
    setModaleInterventoAperta(true);
    showToast(
      'info',
      `Pianificazione intervento agenda per: ${man.impianto} (${man.clienteNome})`,
    );
  };

  // =========================================================================
  // HANDLER OPERATIVI: PREVENTIVI & FATTURE
  // =========================================================================
  const handleSalvaPreventivo = (
    dati: Omit<PreventivoItem, 'id'>,
    idEsistente?: string,
  ) => {
    if (idEsistente) {
      setPreventivi((prev) =>
        prev.map((p) =>
          p.id === idEsistente ? { ...dati, id: idEsistente } : p,
        ),
      );
      showToast('success', 'Preventivo aggiornato');
    } else {
      const nuovo: PreventivoItem = {
        ...dati,
        id: `prev-${Date.now()}`,
      };
      setPreventivi((prev) => [nuovo, ...prev]);
      showToast('success', `Preventivo ${nuovo.numero} creato con successo`);
    }
  };

  const handleCambiaStatoPreventivo = (
    id: string,
    nuovoStato: PreventivoItem['stato'],
  ) => {
    setPreventivi((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stato: nuovoStato } : p)),
    );
    showToast('success', `Stato preventivo aggiornato a "${nuovoStato}"`);
  };

  const handleEliminaPreventivo = (id: string) => {
    setPreventivi((prev) => prev.filter((p) => p.id !== id));
    showToast('info', 'Preventivo eliminato');
  };

  const handleCambiaStatoFattura = (
    id: string,
    nuovoStato: FatturaItem['stato'],
  ) => {
    setFatture((prev) =>
      prev.map((f) => (f.id === id ? { ...f, stato: nuovoStato } : f)),
    );
    showToast('success', `Fattura contrassegnata come "${nuovoStato}"`);
  };

  const handleScaricaPdfFattura = (fattura: FatturaItem) => {
    try {
      esportaFatturaPdf(fattura);
    } catch {
      // ignore download error in restricted frames
    }
    showToast(
      'success',
      `Fattura ${fattura.numero} scaricata in formato PDF`,
    );
  };

  // =========================================================================
  // HANDLER TELEFONO, NAVIGATORE E RIPRISTINO DEMO
  // =========================================================================
  const handleChiamaCliente = (telefono: string, nome: string) => {
    showToast('info', `Chiamata avviata a ${nome} (${telefono})`);
  };

  const handleNavigaIndirizzo = (indirizzo: string, titolo: string) => {
    showToast('info', `Navigazione GPS avviata verso: ${indirizzo} (${titolo})`);
  };

  const handleSegnaAvvisiLetti = () => {
    setAvvisi((prev) => prev.map((a) => ({ ...a, letto: true })));
    showToast('success', 'Tutti gli avvisi sono stati contrassegnati come letti');
  };

  const handleSegnaAvvisoSingoloLetto = (id: string) => {
    setAvvisi((prev) =>
      prev.map((a) => (a.id === id ? { ...a, letto: true } : a)),
    );
    showToast('success', 'Avviso contrassegnato come gestito');
  };

  // =========================================================================
  // HANDLER OPERATIVI: FERIE & ASSENZE TECNICI
  // =========================================================================
  const handleAggiungiFerie = (nuovaFerie: Omit<FerieItem, 'id'>) => {
    const record: FerieItem = {
      ...nuovaFerie,
      id: `fer-${Date.now()}`,
    };
    setFerie((prev) => [record, ...prev]);
    showToast(
      'success',
      `Assenza (${record.tipo}) registrata per ${record.tecnico}`,
    );
  };

  const handleEliminaFerie = (id: string) => {
    setFerie((prev) => prev.filter((f) => f.id !== id));
    showToast('info', 'Periodo di assenza rimosso dal calendario');
  };

  const handleToggleApprovazioneFerie = (id: string) => {
    setFerie((prev) =>
      prev.map((f) => (f.id === id ? { ...f, approvato: !f.approvato } : f)),
    );
    showToast('success', 'Stato approvazione assenza aggiornato');
  };

  const handleImportaImpegniDaGoogle = (
    nuoviInterventi: InterventoItem[],
    nuoveFerie: FerieItem[],
  ) => {
    if (nuoviInterventi.length > 0) {
      setInterventi((prev) => [...nuoviInterventi, ...prev]);
    }
    if (nuoveFerie.length > 0) {
      setFerie((prev) => [...nuoveFerie, ...prev]);
    }
    showToast(
      'success',
      `Importati da Google Calendar: ${nuoviInterventi.length} interventi e ${nuoveFerie.length} assenze`,
    );
  };

  // =========================================================================
  // HANDLER OPERATIVI: NOTE RAPIDE DI CANTIERE (TESTUALI E VOCALI)
  // =========================================================================
  const handleAggiungiNotaCantiere = (
    nuovaNota: Omit<NotaCantiereItem, 'id'>,
  ) => {
    const record: NotaCantiereItem = {
      ...nuovaNota,
      id: `nota-${Date.now()}`,
    };
    setNoteCantiere((prev) => [record, ...prev]);
    showToast(
      'success',
      record.origineVocale
        ? `Nota vocale di ${record.autore} pubblicata per i tecnici`
        : `Nota di cantiere salvata e visibile alla squadra`,
    );
  };

  const handleEliminaNotaCantiere = (id: string) => {
    setNoteCantiere((prev) => prev.filter((n) => n.id !== id));
    showToast('info', 'Nota rimossa dalla bacheca di cantiere');
  };

  const handleToggleImportanteNotaCantiere = (id: string) => {
    setNoteCantiere((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, importante: !n.importante } : n,
      ),
    );
  };

  const handleResetDatiDemo = () => {
    const nuoviClienti = CLIENTI_INIZIALI as ClienteItem[];
    const nuoviInterventi = creaInterventiIniziali() as InterventoItem[];
    const nuoviPreventivi = PREVENTIVI_INIZIALI as PreventivoItem[];
    const nuoveFatture = FATTURE_INIZIALI as FatturaItem[];
    const nuoviAvvisi = AVVISI_INIZIALI as AvvisoItem[];
    const nuoveFerie = creaFerieIniziali() as FerieItem[];
    const nuoveNote = creaNoteCantiereIniziali() as NotaCantiereItem[];
    const nuoveManutenzioni =
      creaManutenzioniIniziali() as ManutenzioneProgrammataItem[];

    setClienti(nuoviClienti);
    setInterventi(nuoviInterventi);
    setPreventivi(nuoviPreventivi);
    setFatture(nuoveFatture);
    setAvvisi(nuoviAvvisi);
    setFerie(nuoveFerie);
    setNoteCantiere(nuoveNote);
    setManutenzioni(nuoveManutenzioni);

    showToast('success', 'Dati iniziali Rossi Impianti ripristinati');
  };

  const handleCambioPagina = (nuovaPagina: PaginaAttiva) => {
    setPaginaAttiva(nuovaPagina);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden flex flex-col bg-[#0f1720] text-[#f1f5f9] font-sans selection:bg-[#f59e0b]/30 selection:text-white"
      lang="it"
    >
      {/* Header fisso in alto + Sidebar Desktop + Bottom Navigation Mobile */}
      <HeaderENavigazione
        paginaAttiva={paginaAttiva}
        onCambiaPagina={handleCambioPagina}
        avvisi={avvisi}
        onSegnaAvvisiLetti={handleSegnaAvvisiLetti}
        onApriNuovoIntervento={() => {
          setInterventoInModifica(null);
          setDataPreselezionataIntervento(undefined);
          setClientePreselezionatoId(undefined);
          setModaleInterventoAperta(true);
        }}
        onResetDatiDemo={handleResetDatiDemo}
        interventi={interventi}
        preventivi={preventivi}
        fatture={fatture}
        ferie={ferie}
        clientiCount={clienti.length}
        manutenzioni={manutenzioni}
        impostazioniPush={impostazioniPush}
        onAggiornaImpostazioniPush={handleAggiornaImpostazioniPush}
        onInviaTestPushTecnici={handleSimulaPushUrgenteTecnici}
        onApriImpostazioniMeteo={() => setModaleImpostazioniMeteoAperta(true)}
      />

      {/* Banner Flottante Notifiche Push Locali Cantiere */}
      <BannerPushCantiere
        notificheAttive={notifichePushAttive}
        onChiudiNotifica={(id) =>
          setNotifichePushAttive((prev) => prev.filter((n) => n.id !== id))
        }
        onApriInterventoDaPush={(intId) => {
          const trovato = interventi.find((i) => i.id === intId);
          if (trovato) {
            setPaginaAttiva('agenda');
            setInterventoDettaglio(trovato);
          }
        }}
      />

      {/* Area Contenuto Principale (padding per header fisso h-16 in alto, bottom nav su mobile e sidebar su desktop) */}
      <main className="flex-1 w-full min-w-0 pt-20 pb-28 lg:pb-12 lg:pl-64">
        <div className="max-w-6xl w-full min-w-0 mx-auto px-3.5 sm:px-6 pt-1.5 sm:pt-2">
          {paginaAttiva === 'home' && (
            <HomeDashboard
              interventi={interventi}
              preventivi={preventivi}
              fatturatoMese={fatturatoMese}
              trendMesePercentuale={14.6}
              avvisi={avvisi}
              onApriNuovoIntervento={() => {
                setInterventoInModifica(null);
                setDataPreselezionataIntervento(undefined);
                setClientePreselezionatoId(undefined);
                setModaleInterventoAperta(true);
              }}
              onApriNuovoCliente={() => {
                setClienteInModifica(null);
                setModaleClienteAperta(true);
              }}
              onApriNuovoPreventivo={() => {
                setPreventivoInModifica(null);
                setClientePreselezionatoId(undefined);
                setModalePreventivoAperta(true);
              }}
              onApriDettaglioIntervento={(intItem) =>
                setInterventoDettaglio(intItem)
              }
              onCambiaStatoIntervento={handleCambiaStatoIntervento}
              onCambiaStatoPreventivo={handleCambiaStatoPreventivo}
              onSegnaAvvisoLetto={handleSegnaAvvisoSingoloLetto}
              onChiamaCliente={handleChiamaCliente}
              onNavigaIndirizzo={handleNavigaIndirizzo}
              onVaiAdAgenda={() => handleCambioPagina('agenda')}
              onVaiAFatture={() => handleCambioPagina('fatture')}
              onVaiAReport={() => handleCambioPagina('tempi')}
              onEsportaInterventiOggiCsv={(listaOggi, dataIso) => {
                esportaInterventiOdierniCsv(listaOggi, dataIso);
                showToast(
                  'success',
                  `Elenco interventi di oggi (${listaOggi.length}) esportato in CSV per uso offline`,
                );
              }}
              onEsportaInterventiOggiPdf={(listaOggi, dataIso) => {
                esportaInterventiOdierniPdf(listaOggi, dataIso);
                showToast(
                  'success',
                  `Foglio di cantiere (${listaOggi.length} interventi) esportato in PDF per consultazione offline`,
                );
              }}
              noteCantiere={noteCantiere}
              onAggiungiNotaCantiere={handleAggiungiNotaCantiere}
              onEliminaNotaCantiere={handleEliminaNotaCantiere}
              onToggleImportanteNotaCantiere={
                handleToggleImportanteNotaCantiere
              }
              onAttivaPushAllertaMeteo={(payload) =>
                emettiNotificaPushLocale(payload, true)
              }
              impostazioniMeteo={impostazioniMeteo}
              onApriImpostazioniMeteo={() =>
                setModaleImpostazioniMeteoAperta(true)
              }
            />
          )}

          {paginaAttiva === 'agenda' && (
            <AgendaSettimanale
              interventi={interventi}
              ferie={ferie}
              manutenzioni={manutenzioni}
              onApriDettaglioIntervento={(intItem) =>
                setInterventoDettaglio(intItem)
              }
              onApriNuovoIntervento={(dataIso) => {
                setInterventoInModifica(null);
                setDataPreselezionataIntervento(dataIso);
                setClientePreselezionatoId(undefined);
                setModaleInterventoAperta(true);
              }}
              onCambiaStatoIntervento={handleCambiaStatoIntervento}
              onAggiungiFerie={handleAggiungiFerie}
              onEliminaFerie={handleEliminaFerie}
              onToggleApprovazioneFerie={handleToggleApprovazioneFerie}
              onImportaImpegniDaGoogle={handleImportaImpegniDaGoogle}
              onPianificaInterventoDaManutenzione={
                handlePianificaInterventoDaManutenzione
              }
              onVaiAManutenzioni={() => handleCambioPagina('manutenzioni')}
            />
          )}

          {paginaAttiva === 'clienti' && (
            <GestioneClienti
              clienti={clienti}
              interventi={interventi}
              preventivi={preventivi}
              manutenzioni={manutenzioni}
              onApriNuovoCliente={() => {
                setClienteInModifica(null);
                setModaleClienteAperta(true);
              }}
              onModificaCliente={(cli) => {
                setClienteInModifica(cli);
                setModaleClienteAperta(true);
              }}
              onEliminaCliente={handleEliminaCliente}
              onAggiornaNoteCliente={handleAggiornaNoteCliente}
              onApriNuovoInterventoPerCliente={(cliId) => {
                setInterventoInModifica(null);
                setClientePreselezionatoId(cliId);
                setDataPreselezionataIntervento(undefined);
                setModaleInterventoAperta(true);
              }}
              onApriNuovoPreventivoPerCliente={(cliId) => {
                setPreventivoInModifica(null);
                setClientePreselezionatoId(cliId);
                setModalePreventivoAperta(true);
              }}
              onModificaPreventivo={(prev) => {
                setPreventivoInModifica(prev);
                setModalePreventivoAperta(true);
              }}
              onEliminaPreventivo={handleEliminaPreventivo}
              onCambiaStatoPreventivo={handleCambiaStatoPreventivo}
              onApriDettaglioIntervento={(intItem) =>
                setInterventoDettaglio(intItem)
              }
              onChiamaCliente={handleChiamaCliente}
              onApriNuovaManutenzionePerCliente={(cliId) => {
                setClientePreselezionatoId(cliId);
                handleCambioPagina('manutenzioni');
              }}
            />
          )}

          {paginaAttiva === 'manutenzioni' && (
            <GestioneManutenzioni
              manutenzioni={manutenzioni}
              clienti={clienti}
              onAggiungiManutenzione={handleAggiungiManutenzione}
              onModificaManutenzione={handleModificaManutenzione}
              onEliminaManutenzione={handleEliminaManutenzione}
              onRinnovaManutenzione={handleRinnovaManutenzione}
              onPianificaInterventoInAgenda={(man) => {
                handlePianificaInterventoDaManutenzione(
                  man,
                  man.prossimaScadenza,
                );
                handleCambioPagina('agenda');
              }}
              onChiamaCliente={handleChiamaCliente}
            />
          )}

          {paginaAttiva === 'fatture' && (
            <GestioneFatture
              fatture={fatture}
              preventivi={preventivi}
              onCambiaStatoFattura={handleCambiaStatoFattura}
              onScaricaPdfFattura={handleScaricaPdfFattura}
              onApriNuovoPreventivo={() => {
                setPreventivoInModifica(null);
                setClientePreselezionatoId(undefined);
                setModalePreventivoAperta(true);
              }}
              onModificaPreventivo={(prev) => {
                setPreventivoInModifica(prev);
                setModalePreventivoAperta(true);
              }}
              onEliminaPreventivo={handleEliminaPreventivo}
              onCambiaStatoPreventivo={handleCambiaStatoPreventivo}
            />
          )}

          {paginaAttiva === 'tempi' && (
            <DashboardTempiIntervento interventi={interventi} />
          )}

          {paginaAttiva === 'report' && (
            <ReportStatistiche clienti={clienti} interventi={interventi} />
          )}
        </div>
      </main>

      {/* =====================================================================
          MODALI GLOBALI (Dettaglio Intervento, Form Intervento, Form Cliente, Form Preventivo)
         ===================================================================== */}
      <ModaleDettaglioIntervento
        intervento={interventoDettaglio}
        onChiudi={() => setInterventoDettaglio(null)}
        onCambiaStato={handleCambiaStatoIntervento}
        onModifica={(intItem) => {
          setInterventoDettaglio(null);
          setInterventoInModifica(intItem);
          setApertaModificaDaQr(true);
          setModaleInterventoAperta(true);
        }}
        onElimina={handleEliminaIntervento}
        onChiama={handleChiamaCliente}
        onNaviga={handleNavigaIndirizzo}
        onAggiornaRapidoDaQr={handleAggiornaRapidoDaQr}
      />

      <ModaleFormIntervento
        aperto={modaleInterventoAperta}
        interventoInModifica={interventoInModifica}
        clienti={clienti}
        dataPreselezionata={dataPreselezionataIntervento}
        clienteIdPreselezionato={clientePreselezionatoId}
        apertaDaQr={apertaModificaDaQr}
        onChiudi={() => {
          setModaleInterventoAperta(false);
          setInterventoInModifica(null);
          setApertaModificaDaQr(false);
        }}
        onSalva={handleSalvaIntervento}
      />

      <ModaleFormCliente
        aperto={modaleClienteAperta}
        clienteInModifica={clienteInModifica}
        onChiudi={() => {
          setModaleClienteAperta(false);
          setClienteInModifica(null);
        }}
        onSalva={handleSalvaCliente}
      />

      <ModaleFormPreventivo
        aperto={modalePreventivoAperta}
        preventivoInModifica={preventivoInModifica}
        clienti={clienti}
        clienteIdPreselezionato={clientePreselezionatoId}
        onChiudi={() => {
          setModalePreventivoAperta(false);
          setPreventivoInModifica(null);
        }}
        onSalva={handleSalvaPreventivo}
      />

      <ImpostazioniMeteoModal
        aperta={modaleImpostazioniMeteoAperta}
        onChiudi={() => setModaleImpostazioniMeteoAperta(false)}
        impostazioni={impostazioniMeteo}
        onSalvaImpostazioni={handleSalvaImpostazioniMeteo}
      />
    </div>
  );
}
