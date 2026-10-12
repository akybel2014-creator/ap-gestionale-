// ============================================================================
// ROSSI IMPIANTI — DATI MOCK E HELPER DATE ITALIANE
// Gestione Impresa Impianti Idraulici ed Elettrici (Vicenza e provincia)
// ============================================================================

/**
 * Calcola le date della settimana corrente (Lunedì - Domenica) in formato ISO YYYY-MM-DD
 * basandosi sulla data odierna, in modo che "Oggi" e "Settimana Corrente" abbiano sempre
 * gli interventi distribuiti correttamente.
 */
export function getSettimanaCorrente() {
  const oggi = new Date();
  const dayOfWeek = oggi.getDay(); // 0 = Dom, 1 = Lun, ..., 6 = Sab
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const lunedi = new Date(oggi);
  lunedi.setDate(oggi.getDate() + diffToMonday);

  const giorni = [];
  const nomiGiorniBrevi = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const nomiGiorniCompleti = [
    'Lunedì',
    'Martedì',
    'Mercoledì',
    'Giovedì',
    'Venerdì',
    'Sabato',
    'Domenica',
  ];

  const toIsoDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const oggiIso = toIsoDate(oggi);

  for (let i = 0; i < 7; i++) {
    const d = new Date(lunedi);
    d.setDate(lunedi.getDate() + i);
    const iso = toIsoDate(d);
    giorni.push({
      indice: i,
      nomeBreve: nomiGiorniBrevi[i],
      nomeCompleto: nomiGiorniCompleti[i],
      giornoMese: d.getDate(),
      meseNumero: d.getMonth() + 1,
      iso,
      isOggi: iso === oggiIso,
    });
  }

  // Indice del giorno odierno nella settimana (0 = Lun ... 6 = Dom)
  const oggiIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  return {
    oggiIso,
    oggiIdx,
    giorni,
  };
}

/**
 * Formatta una data ISO (YYYY-MM-DD) nel formato italiano GG/MM/AAAA
 */
export function formattaDataItaliana(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Formatta un importo numerico in Euro secondo lo standard italiano (es. € 18.450,00)
 */
export function formattaEuro(importo, mostraDecimali = false) {
  const num = Number(importo) || 0;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: mostraDecimali ? 2 : 0,
    maximumFractionDigits: mostraDecimali ? 2 : 0,
  }).format(num);
}

// ============================================================================
// 1. TECNICI (3 tecnici specializzati: Luca, Andrea, Marco)
// ============================================================================
export const TECNICI_INIZIALI = [
  {
    id: 'tec-1',
    nome: 'Luca',
    cognome: 'Furlan',
    nomeCompleto: 'Luca Furlan',
    specializzazione: 'Termoidraulica & Caldaie',
    telefono: '+39 348 712 4590',
    colore: '#f59e0b', // Ambra
    oreSettimana: 42,
    oreMese: 168,
    interventiCompletatiMese: 28,
    efficienza: 96,
  },
  {
    id: 'tec-2',
    nome: 'Andrea',
    cognome: 'Trevisan',
    nomeCompleto: 'Andrea Trevisan',
    specializzazione: 'Impianti Elettrici & Domotica',
    telefono: '+39 347 891 2304',
    colore: '#3b82f6', // Blu
    oreSettimana: 39,
    oreMese: 156,
    interventiCompletatiMese: 24,
    efficienza: 94,
  },
  {
    id: 'tec-3',
    nome: 'Marco',
    cognome: 'Zanetti',
    nomeCompleto: 'Marco Zanetti',
    specializzazione: 'Climatizzazione & Pompe di Calore',
    telefono: '+39 340 556 7812',
    colore: '#10b981', // Verde smeraldo
    oreSettimana: 40,
    oreMese: 162,
    interventiCompletatiMese: 26,
    efficienza: 95,
  },
];

// ============================================================================
// 2. CLIENTI (8 clienti italiani di Vicenza e provincia)
// ============================================================================
export const CLIENTI_INIZIALI = [
  {
    id: 'cli-1',
    nome: 'Fam. Bianchi (Roberto Bianchi)',
    telefono: '0444 512389',
    cellulare: '+39 348 221 9084',
    email: 'roberto.bianchi@email.it',
    indirizzo: 'Viale Roma 42, 36100 Vicenza (VI)',
    piva: 'IT03849120245',
    codiceFiscale: 'BNCRRT74M12L840K',
    tipo: 'Privato Residenziale',
    ultimoIntervento: 'Sostituzione caldaia a condensazione 28kW',
    dataUltimoIntervento: '2026-10-11',
    fatturatoTotale: 6850,
    note: 'Accesso carraio dal cortile interno (citofono 4B). Impianto a pavimento diviso in 2 zone con collettore in lavanderia.',
  },
  {
    id: 'cli-2',
    nome: 'Condominio Palladio (Amm. Studio Sartori)',
    telefono: '0444 328910',
    cellulare: '+39 335 678 1290',
    email: 'amministrazione@studiosartorivi.it',
    indirizzo: 'Corso Andrea Palladio 118, 36100 Vicenza (VI)',
    piva: 'IT02918450241',
    codiceFiscale: '95048120249',
    tipo: 'Condominio',
    ultimoIntervento: 'Adeguamento quadro elettrico centrale termica',
    dataUltimoIntervento: '2026-10-11',
    fatturatoTotale: 11400,
    note: 'Chiavi locale tecnico custodite dal portiere Sig. Giuseppe (presente 07:30-13:00). Richiesta sempre fattura elettronica con split.',
  },
  {
    id: 'cli-3',
    nome: 'Officina Meccanica Sartori S.r.l.',
    telefono: '0444 491203',
    cellulare: '+39 349 812 3340',
    email: 'info@officinasartori.it',
    indirizzo: 'Via dell’Industria 19, 36075 Montecchio Maggiore (VI)',
    piva: 'IT04128900248',
    codiceFiscale: '04128900248',
    tipo: 'Azienda Industriale',
    ultimoIntervento: 'Verifica linee trifase 380V e rifasamento',
    dataUltimoIntervento: '2026-10-11',
    fatturatoTotale: 9200,
    note: 'Obbligo DPI completi (scarpe antinfortunistiche e caschetto) per ingresso nel reparto tornitura. Referente: Ing. Matteo Sartori.',
  },
  {
    id: 'cli-4',
    nome: 'Ristorante Al Bersagliere',
    telefono: '0445 529011',
    cellulare: '+39 347 119 8452',
    email: 'info@ristorantealbersagliere.it',
    indirizzo: 'Via Pasubio 64, 36015 Schio (VI)',
    piva: 'IT03567120243',
    codiceFiscale: '03567120243',
    tipo: 'Attività Commerciale',
    ultimoIntervento: 'Riparazione perdita gruppo frigorifero e scarico cucina',
    dataUltimoIntervento: '2026-10-09',
    fatturatoTotale: 5400,
    note: 'Interventi preferibilmente nella fascia 08:30-11:30 o 15:00-17:30 per non interferire con il servizio sala.',
  },
  {
    id: 'cli-5',
    nome: 'Villa Valmarana Bressan',
    telefono: '0444 976140',
    cellulare: '+39 338 945 6123',
    email: 'direzione@villavalmaranabressan.it',
    indirizzo: 'Via S. Floriano 26, 36010 Vigardolo - Monticello Conte Otto (VI)',
    piva: 'IT01984320247',
    codiceFiscale: '01984320247',
    tipo: 'Dimora Storica',
    ultimoIntervento: 'Manutenzione pompa di calore ibrida e fan-coil',
    dataUltimoIntervento: '2026-10-08',
    fatturatoTotale: 8600,
    note: 'Impianto vincolato Soprintendenza: vietate tracce a vista nelle sale affrescate. Passaggio cavi solo in cavedio interrato.',
  },
  {
    id: 'cli-6',
    nome: 'Panificio Artigianale Dal Toso',
    telefono: '0445 361822',
    cellulare: '+39 340 442 7819',
    email: 'amministrazione@panificiodaltoso.it',
    indirizzo: 'Viale Europa 85, 36016 Thiene (VI)',
    piva: 'IT02749100242',
    codiceFiscale: '02749100242',
    tipo: 'Attività Artigianale',
    ultimoIntervento: 'Sostituzione interruttore magnetotermico forno rotativo',
    dataUltimoIntervento: '2026-10-07',
    fatturatoTotale: 4300,
    note: 'Il laboratorio chiude alle 13:30. Per interventi sui quadri forni concordare fermo linea con il Sig. Gianni Dal Toso.',
  },
  {
    id: 'cli-7',
    nome: 'Studio Dentistico Dott. Rigoni & Associati',
    telefono: '0424 524718',
    cellulare: '+39 348 903 1145',
    email: 'segreteria@studiorigonibassano.it',
    indirizzo: 'Viale delle Fosse 31, 36061 Bassano del Grappa (VI)',
    piva: 'IT03912040246',
    codiceFiscale: '03912040246',
    tipo: 'Studio Medico',
    ultimoIntervento: 'Verifica periodica messa a terra e nodo equipotenziale',
    dataUltimoIntervento: '2026-10-06',
    fatturatoTotale: 4950,
    note: 'Richiesto rilascio verbale verifica impianti elettrici uso medico Gruppo 1 secondo norma CEI 64-8/7 V2.',
  },
  {
    id: 'cli-8',
    nome: 'Fam. Dal Lago (Elena Dal Lago)',
    telefono: '0444 673290',
    cellulare: '+39 339 761 4820',
    email: 'elena.dallago@gmail.com',
    indirizzo: 'Via Mazzini 14, 36071 Arzignano (VI)',
    piva: '',
    codiceFiscale: 'DLLLNE81D54A459W',
    tipo: 'Privato Residenziale',
    ultimoIntervento: 'Installazione climatizzatore trial-split Daikin',
    dataUltimoIntervento: '2026-10-05',
    fatturatoTotale: 3800,
    note: 'Pratica detrazione fiscale Bonus Casa 50% + comunicazione ENEA già inviata. Cane docile in giardino.',
  },
];

// ============================================================================
// 3. INTERVENTI (15 interventi distribuiti nella settimana corrente, di cui 3 OGGI)
// ============================================================================
export function creaInterventiIniziali() {
  const { giorni, oggiIdx } = getSettimanaCorrente();

  // Helper per assegnare un giorno della settimana garantendo che esattamente 3 siano su "oggiIdx"
  // e gli altri 12 siano ben distribuiti sugli altri giorni della settimana Lun-Dom.
  const altriGiorni = [0, 1, 2, 3, 4, 5, 6].filter((idx) => idx !== oggiIdx);

  const dataOggi = giorni[oggiIdx].iso;
  const g0 = giorni[altriGiorni[0]].iso;
  const g1 = giorni[altriGiorni[1]].iso;
  const g2 = giorni[altriGiorni[2]].iso;
  const g3 = giorni[altriGiorni[3]].iso;
  const g4 = giorni[altriGiorni[4]].iso;
  const g5 = giorni[altriGiorni[5]].iso;

  return [
    // --- 3 INTERVENTI DI OGGI ---
    {
      id: 'int-1',
      clienteId: 'cli-1',
      clienteNome: 'Fam. Bianchi',
      titolo: 'Fam. Bianchi — Sostituzione caldaia',
      descrizione:
        'Smontaggio vecchia caldaia murale, lavaggio chimico impianto e installazione caldaia a condensazione Immergas Victrix 28 kW con defangatore magnetico.',
      tipo: 'Idraulico / Termico',
      data: dataOggi,
      oraInizio: '09:00',
      oraFine: '12:30',
      durataOre: 3.5,
      stato: 'In corso',
      tecnico: 'Luca',
      indirizzo: 'Viale Roma 42, Vicenza (VI)',
      telefonoCliente: '+39 348 221 9084',
      importoStimato: 2450,
      priorita: 'Alta',
      noteTecniche: 'Portare kit scarico fumi coassiale Ø 60/100 e dosatore polifosfati.',
    },
    {
      id: 'int-2',
      clienteId: 'cli-2',
      clienteNome: 'Condominio Palladio',
      titolo: 'Condominio Palladio — Adeguamento quadro centrale',
      descrizione:
        'Sostituzione interruttori differenziali selettivi e riordino morsettiere quadro elettrico centrale termica e autoclavi.',
      tipo: 'Elettrico',
      data: dataOggi,
      oraInizio: '14:00',
      oraFine: '16:30',
      durataOre: 2.5,
      stato: 'Programmato',
      tecnico: 'Andrea',
      indirizzo: 'Corso Andrea Palladio 118, Vicenza (VI)',
      telefonoCliente: '+39 335 678 1290',
      importoStimato: 890,
      priorita: 'Media',
      noteTecniche: 'Preavvisare i condomini per stacco tensione di 20 minuti alle 14:30.',
    },
    {
      id: 'int-3',
      clienteId: 'cli-3',
      clienteNome: 'Officina Meccanica Sartori',
      titolo: 'Officina Sartori — Collaudo linea 380V reparto CNC',
      descrizione:
        'Installazione blindosbarra 160A e verifica strumentale isolamento e curva intervento differenziali su nuovo centro di lavoro.',
      tipo: 'Elettrico',
      data: dataOggi,
      oraInizio: '08:00',
      oraFine: '10:30',
      durataOre: 2.5,
      stato: 'Completato',
      tecnico: 'Marco',
      indirizzo: 'Via dell’Industria 19, Montecchio Maggiore (VI)',
      telefonoCliente: '+39 349 812 3340',
      importoStimato: 1150,
      priorita: 'Alta',
      noteTecniche: 'Collaudo superato con successo. Rilasciata Dichiarazione di Conformità DM 37/08.',
    },

    // --- ALTRI 12 INTERVENTI DISTRIBUITI NELLA SETTIMANA CORRENTE ---
    {
      id: 'int-4',
      clienteId: 'cli-4',
      clienteNome: 'Ristorante Al Bersagliere',
      titolo: 'Ristorante Al Bersagliere — Perdita scarico cucina',
      descrizione:
        'Sostituzione sifoni industriali in acciaio inox e disostruzione tubazione ad alta pressione.',
      tipo: 'Idraulico',
      data: g0,
      oraInizio: '08:30',
      oraFine: '11:00',
      durataOre: 2.5,
      stato: 'Completato',
      tecnico: 'Luca',
      indirizzo: 'Via Pasubio 64, Schio (VI)',
      telefonoCliente: '+39 347 119 8452',
      importoStimato: 380,
      priorita: 'Alta',
      noteTecniche: 'Guarnizioni EPDM alta temperatura sostituite.',
    },
    {
      id: 'int-5',
      clienteId: 'cli-5',
      clienteNome: 'Villa Valmarana Bressan',
      titolo: 'Villa Valmarana — Taratura pompa di calore ibrida',
      descrizione:
        'Controllo pressioni gas R32, pulizia filtri defangatori e ottimizzazione curva climatica.',
      tipo: 'Climatizzazione',
      data: g0,
      oraInizio: '14:00',
      oraFine: '17:00',
      durataOre: 3,
      stato: 'Completato',
      tecnico: 'Marco',
      indirizzo: 'Via S. Floriano 26, Vigardolo (VI)',
      telefonoCliente: '+39 338 945 6123',
      importoStimato: 520,
      priorita: 'Media',
      noteTecniche: 'Aggiornato firmware centralina Daikin Altherma.',
    },
    {
      id: 'int-6',
      clienteId: 'cli-6',
      clienteNome: 'Panificio Artigianale Dal Toso',
      titolo: 'Panificio Dal Toso — Sostituzione magnetotermico forno',
      descrizione:
        'Sostituzione interruttore scatolato 4P 63A ABB e serraggio con chiave dinamometrica.',
      tipo: 'Elettrico',
      data: g1,
      oraInizio: '13:30',
      oraFine: '15:30',
      durataOre: 2,
      stato: 'Completato',
      tecnico: 'Andrea',
      indirizzo: 'Viale Europa 85, Thiene (VI)',
      telefonoCliente: '+39 340 442 7819',
      importoStimato: 460,
      priorita: 'Alta',
      noteTecniche: 'Eseguita termografia quadro elettrico: nessun hot-spot rilevato.',
    },
    {
      id: 'int-7',
      clienteId: 'cli-7',
      clienteNome: 'Studio Dentistico Dott. Rigoni',
      titolo: 'Studio Dott. Rigoni — Verifica CEI 64-8 locale medico',
      descrizione:
        'Prove strumentali di continuità conduttori equipotenziali e tempi di intervento differenziali tipo A/B.',
      tipo: 'Elettrico',
      data: g1,
      oraInizio: '09:00',
      oraFine: '12:00',
      durataOre: 3,
      stato: 'Completato',
      tecnico: 'Andrea',
      indirizzo: 'Viale delle Fosse 31, Bassano del Grappa (VI)',
      telefonoCliente: '+39 348 903 1145',
      importoStimato: 640,
      priorita: 'Media',
      noteTecniche: 'Allegato registro verifiche periodiche firmato.',
    },
    {
      id: 'int-8',
      clienteId: 'cli-8',
      clienteNome: 'Fam. Dal Lago',
      titolo: 'Fam. Dal Lago — Montaggio climatizzatore trial-split',
      descrizione:
        'Posa unità esterna a pavimento con supporti antivibranti e collegamento 3 split interni serie Perfera.',
      tipo: 'Climatizzazione',
      data: g2,
      oraInizio: '08:30',
      oraFine: '13:00',
      durataOre: 4.5,
      stato: 'Completato',
      tecnico: 'Marco',
      indirizzo: 'Via Mazzini 14, Arzignano (VI)',
      telefonoCliente: '+39 339 761 4820',
      importoStimato: 1950,
      priorita: 'Media',
      noteTecniche: 'Prova in pressione con azoto a 42 bar per 2 ore superata.',
    },
    {
      id: 'int-9',
      clienteId: 'cli-1',
      clienteNome: 'Fam. Bianchi',
      titolo: 'Fam. Bianchi — Lavaggio impianto radiante',
      descrizione:
        'Flussaggio anelli collettore piano terra e primo piano con additivo protettivo filmante.',
      tipo: 'Idraulico / Termico',
      data: g2,
      oraInizio: '14:30',
      oraFine: '17:30',
      durataOre: 3,
      stato: 'Completato',
      tecnico: 'Luca',
      indirizzo: 'Viale Roma 42, Vicenza (VI)',
      telefonoCliente: '+39 348 221 9084',
      importoStimato: 490,
      priorita: 'Media',
      noteTecniche: 'Sostituiti 3 flussimetri bloccati sul collettore zona notte.',
    },
    {
      id: 'int-10',
      clienteId: 'cli-2',
      clienteNome: 'Condominio Palladio',
      titolo: 'Condominio Palladio — Riparazione autoclave',
      descrizione:
        'Sostituzione vaso di espansione da 100 litri e taratura pressostati gruppo gemellare.',
      tipo: 'Idraulico',
      data: g3,
      oraInizio: '09:30',
      oraFine: '12:00',
      durataOre: 2.5,
      stato: 'Programmato',
      tecnico: 'Luca',
      indirizzo: 'Corso Andrea Palladio 118, Vicenza (VI)',
      telefonoCliente: '+39 335 678 1290',
      importoStimato: 580,
      priorita: 'Alta',
      noteTecniche: 'Precarica azoto vaso espansione impostata a 2,5 bar.',
    },
    {
      id: 'int-11',
      clienteId: 'cli-5',
      clienteNome: 'Villa Valmarana Bressan',
      titolo: 'Villa Valmarana — Illuminazione LED parco storico',
      descrizione:
        'Installazione 14 proiettori architetturali IP67 3000K lungo il viale d’ingresso con crepuscolare astronomico.',
      tipo: 'Elettrico',
      data: g3,
      oraInizio: '14:00',
      oraFine: '18:00',
      durataOre: 4,
      stato: 'Programmato',
      tecnico: 'Andrea',
      indirizzo: 'Via S. Floriano 26, Vigardolo (VI)',
      telefonoCliente: '+39 338 945 6123',
      importoStimato: 1420,
      priorita: 'Media',
      noteTecniche: 'Utilizzare giunti in gel muffolati per pozzetti interrati.',
    },
    {
      id: 'int-12',
      clienteId: 'cli-3',
      clienteNome: 'Officina Meccanica Sartori',
      titolo: 'Officina Sartori — Manutenzione compressori e rete aria',
      descrizione:
        'Sostituzione scaricatori automatici di condensa e valvole a sfera da 1 pollice su anello pneumatico.',
      tipo: 'Idraulico',
      data: g4,
      oraInizio: '08:30',
      oraFine: '11:30',
      durataOre: 3,
      stato: 'Programmato',
      tecnico: 'Luca',
      indirizzo: 'Via dell’Industria 19, Montecchio Maggiore (VI)',
      telefonoCliente: '+39 349 812 3340',
      importoStimato: 690,
      priorita: 'Bassa',
      noteTecniche: 'Verificare tenuta raccordi rapidi postazioni montaggio.',
    },
    {
      id: 'int-13',
      clienteId: 'cli-4',
      clienteNome: 'Ristorante Al Bersagliere',
      titolo: 'Ristorante Al Bersagliere — Sanificazione UTA sala',
      descrizione:
        'Pulizia batterie scambio termico, sostituzione filtri tasche F7 e igienizzazione canali aria.',
      tipo: 'Climatizzazione',
      data: g4,
      oraInizio: '15:00',
      oraFine: '17:30',
      durataOre: 2.5,
      stato: 'Programmato',
      tecnico: 'Marco',
      indirizzo: 'Via Pasubio 64, Schio (VI)',
      telefonoCliente: '+39 347 119 8452',
      importoStimato: 480,
      priorita: 'Media',
      noteTecniche: 'Rilasciare attestato igienizzazione per manuale HACCP.',
    },
    {
      id: 'int-14',
      clienteId: 'cli-7',
      clienteNome: 'Studio Dentistico Dott. Rigoni',
      titolo: 'Studio Dott. Rigoni — Installazione gruppo UPS 6kVA',
      descrizione:
        'Fornitura e cablaggio gruppo di continuità online doppia conversione per sala chirurgica.',
      tipo: 'Elettrico',
      data: g5,
      oraInizio: '09:00',
      oraFine: '12:00',
      durataOre: 3,
      stato: 'Programmato',
      tecnico: 'Andrea',
      indirizzo: 'Viale delle Fosse 31, Bassano del Grappa (VI)',
      telefonoCliente: '+39 348 903 1145',
      importoStimato: 1680,
      priorita: 'Alta',
      noteTecniche: 'Configurare scheda SNMP per monitoraggio stato batterie.',
    },
    {
      id: 'int-15',
      clienteId: 'cli-8',
      clienteNome: 'Fam. Dal Lago',
      titolo: 'Fam. Dal Lago — Installazione addolcitore idrico',
      descrizione:
        'Montaggio addolcitore volumetrico cabinato 25L con bypass di miscelazione e filtro autopulente.',
      tipo: 'Idraulico',
      data: g5,
      oraInizio: '14:00',
      oraFine: '16:30',
      durataOre: 2.5,
      stato: 'Programmato',
      tecnico: 'Marco',
      indirizzo: 'Via Mazzini 14, Arzignano (VI)',
      telefonoCliente: '+39 339 761 4820',
      importoStimato: 1120,
      priorita: 'Bassa',
      noteTecniche: 'Tarare durezza residua a 12 °f e fornire 2 sacchi sale pastiglie.',
    },
  ];
}

// ============================================================================
// 4. PREVENTIVI (5 preventivi in vari stati)
// ============================================================================
export const PREVENTIVI_INIZIALI = [
  {
    id: 'prev-1',
    numero: 'PRV-2026-041',
    clienteId: 'cli-1',
    clienteNome: 'Fam. Bianchi (Roberto Bianchi)',
    titolo: 'Riqualificazione centrale termica con pompa di calore ibrida',
    descrizione:
      'Fornitura e posa sistema ibrido factory-made 8kW + caldaia 28kW, bollitore ACS 200L e termostati smart modulanti.',
    importo: 7850,
    dataEmissione: '2026-10-04',
    validitaFino: '2026-11-04',
    stato: 'In attesa',
    tipo: 'Idraulico / Termico',
  },
  {
    id: 'prev-2',
    numero: 'PRV-2026-042',
    clienteId: 'cli-3',
    clienteNome: 'Officina Meccanica Sartori S.r.l.',
    titolo: 'Impianto di illuminazione industriale LED DALI capannone B',
    descrizione:
      'Sostituzione 36 proiettori alogenuri metallici con campane LED alta efficienza 150W e sensori presenza corsie.',
    importo: 9400,
    dataEmissione: '2026-10-06',
    validitaFino: '2026-11-06',
    stato: 'In attesa',
    tipo: 'Elettrico',
  },
  {
    id: 'prev-3',
    numero: 'PRV-2026-043',
    clienteId: 'cli-5',
    clienteNome: 'Villa Valmarana Bressan',
    titolo: 'Sistema domotico KNX gestione clima e antintrusione',
    descrizione:
      'Integrazione 18 termostati di zona su bus KNX con webserver supervisione da remoto su smartphone.',
    importo: 6200,
    dataEmissione: '2026-10-08',
    validitaFino: '2026-11-08',
    stato: 'In attesa',
    tipo: 'Elettrico',
  },
  {
    id: 'prev-4',
    numero: 'PRV-2026-039',
    clienteId: 'cli-2',
    clienteNome: 'Condominio Palladio (Amm. Studio Sartori)',
    titolo: 'Contabilizzazione calore e valvole termostatiche (24 unità)',
    descrizione:
      'Installazione ripartitori wireless su corpi scaldanti secondo UNI 10200 e concentratore dati condominiale.',
    importo: 8900,
    dataEmissione: '2026-09-22',
    validitaFino: '2026-10-22',
    stato: 'Accettato',
    tipo: 'Idraulico / Termico',
  },
  {
    id: 'prev-5',
    numero: 'PRV-2026-036',
    clienteId: 'cli-6',
    clienteNome: 'Panificio Artigianale Dal Toso',
    titolo: 'Gruppo elettrogeno d’emergenza 40 kVA silenziato',
    descrizione:
      'Fornitura gruppo elettrogeno diesel con quadro di commutazione automatica ATS rete/gruppo.',
    importo: 12500,
    dataEmissione: '2026-09-10',
    validitaFino: '2026-10-10',
    stato: 'Rifiutato',
    tipo: 'Elettrico',
  },
];

// ============================================================================
// 5. FATTURE DELL'ANNO (10 fatture dell'anno 2026 con stati Pagata, In attesa, Scaduta)
// ============================================================================
export const FATTURE_INIZIALI = [
  {
    id: 'fat-1',
    numero: 'FT-2026/089',
    clienteId: 'cli-2',
    cliente: 'Condominio Palladio',
    indirizzoCliente: 'Corso Andrea Palladio 118, 36100 Vicenza (VI)',
    pivaCliente: 'IT02918450241',
    descrizione: 'Adeguamento normativo centrale termica e sostituzione pompe di rilancio gemellari',
    importoImponibile: 3600,
    ivaPercentuale: 10,
    importo: 3960,
    data: '2026-10-08',
    scadenza: '2026-11-08',
    mese: 10,
    anno: 2026,
    stato: 'In attesa',
    metodoPagamento: 'Bonifico Bancario 30gg D.F.',
  },
  {
    id: 'fat-2',
    numero: 'FT-2026/088',
    clienteId: 'cli-1',
    cliente: 'Fam. Bianchi (Roberto Bianchi)',
    indirizzoCliente: 'Viale Roma 42, 36100 Vicenza (VI)',
    pivaCliente: 'IT03849120245',
    descrizione: 'Acconto fornitura caldaia a condensazione Immergas Victrix 28kW e lavaggio impianto',
    importoImponibile: 2200,
    ivaPercentuale: 10,
    importo: 2420,
    data: '2026-10-05',
    scadenza: '2026-10-05',
    mese: 10,
    anno: 2026,
    stato: 'Pagata',
    metodoPagamento: 'Bonifico Parlante Detrazione 50%',
  },
  {
    id: 'fat-3',
    numero: 'FT-2026/087',
    clienteId: 'cli-3',
    cliente: 'Officina Meccanica Sartori S.r.l.',
    indirizzoCliente: 'Via dell’Industria 19, 36075 Montecchio Maggiore (VI)',
    pivaCliente: 'IT04128900248',
    descrizione: 'Realizzazione linea alimentazione 380V reparto tornitura CNC e quadro di bordo',
    importoImponibile: 4100,
    ivaPercentuale: 22,
    importo: 5002,
    data: '2026-10-02',
    scadenza: '2026-11-02',
    mese: 10,
    anno: 2026,
    stato: 'Pagata',
    metodoPagamento: 'Ri.Ba. 30gg F.M.',
  },
  {
    id: 'fat-4',
    numero: 'FT-2026/081',
    clienteId: 'cli-5',
    cliente: 'Villa Valmarana Bressan',
    indirizzoCliente: 'Via S. Floriano 26, 36010 Vigardolo (VI)',
    pivaCliente: 'IT01984320247',
    descrizione: 'Manutenzione straordinaria centrale termofrigorifera e sostituzione 4 ventilconvettori',
    importoImponibile: 4800,
    ivaPercentuale: 22,
    importo: 5856,
    data: '2026-09-18',
    scadenza: '2026-10-18',
    mese: 9,
    anno: 2026,
    stato: 'In attesa',
    metodoPagamento: 'Bonifico Bancario 30gg',
  },
  {
    id: 'fat-5',
    numero: 'FT-2026/076',
    clienteId: 'cli-4',
    cliente: 'Ristorante Al Bersagliere',
    indirizzoCliente: 'Via Pasubio 64, 36015 Schio (VI)',
    pivaCliente: 'IT03567120243',
    descrizione: 'Rifacimento tubazioni acqua calda sanitaria cucina e installazione degrassatore inox',
    importoImponibile: 2600,
    ivaPercentuale: 22,
    importo: 3172,
    data: '2026-08-24',
    scadenza: '2026-09-24',
    mese: 8,
    anno: 2026,
    stato: 'Scaduta',
    metodoPagamento: 'Bonifico Bancario Vista Fattura',
  },
  {
    id: 'fat-6',
    numero: 'FT-2026/069',
    clienteId: 'cli-7',
    cliente: 'Studio Dentistico Dott. Rigoni',
    indirizzoCliente: 'Viale delle Fosse 31, 36061 Bassano del Grappa (VI)',
    pivaCliente: 'IT03912040246',
    descrizione: 'Adeguamento impianto elettrico ambulatorio chirurgico 2 e verifiche CEI 64-8/7',
    importoImponibile: 3900,
    ivaPercentuale: 22,
    importo: 4758,
    data: '2026-07-15',
    scadenza: '2026-08-15',
    mese: 7,
    anno: 2026,
    stato: 'Pagata',
    metodoPagamento: 'Bonifico Bancario',
  },
  {
    id: 'fat-7',
    numero: 'FT-2026/058',
    clienteId: 'cli-8',
    cliente: 'Fam. Dal Lago (Elena Dal Lago)',
    indirizzoCliente: 'Via Mazzini 14, 36071 Arzignano (VI)',
    pivaCliente: 'DLLLNE81D54A459W',
    descrizione: 'Fornitura e posa climatizzatore trial-split Daikin Perfera R32 con pratica ENEA',
    importoImponibile: 3450,
    ivaPercentuale: 10,
    importo: 3795,
    data: '2026-06-19',
    scadenza: '2026-06-19',
    mese: 6,
    anno: 2026,
    stato: 'Pagata',
    metodoPagamento: 'Bonifico Parlante Detrazione',
  },
  {
    id: 'fat-8',
    numero: 'FT-2026/047',
    clienteId: 'cli-6',
    cliente: 'Panificio Artigianale Dal Toso',
    indirizzoCliente: 'Viale Europa 85, 36016 Thiene (VI)',
    pivaCliente: 'IT02749100242',
    descrizione: 'Quadro elettrico distribuzione forza motrice impastatrici e celle di lievitazione',
    importoImponibile: 2950,
    ivaPercentuale: 22,
    importo: 3599,
    data: '2026-05-11',
    scadenza: '2026-06-11',
    mese: 5,
    anno: 2026,
    stato: 'Scaduta',
    metodoPagamento: 'Bonifico Bancario 30gg',
  },
  {
    id: 'fat-9',
    numero: 'FT-2026/034',
    clienteId: 'cli-2',
    cliente: 'Condominio Palladio',
    indirizzoCliente: 'Corso Andrea Palladio 118, 36100 Vicenza (VI)',
    pivaCliente: 'IT02918450241',
    descrizione: 'Sostituzione colonne montanti scarico acque nere scala A e videoispezione fognaria',
    importoImponibile: 6750,
    ivaPercentuale: 10,
    importo: 7425,
    data: '2026-04-09',
    scadenza: '2026-05-09',
    mese: 4,
    anno: 2026,
    stato: 'Pagata',
    metodoPagamento: 'Bonifico Condominiale',
  },
  {
    id: 'fat-10',
    numero: 'FT-2026/019',
    clienteId: 'cli-3',
    cliente: 'Officina Meccanica Sartori S.r.l.',
    indirizzoCliente: 'Via dell’Industria 19, 36075 Montecchio Maggiore (VI)',
    pivaCliente: 'IT04128900248',
    descrizione: 'Installazione batteria automatica di rifasamento 60 kvar e analisi armoniche di rete',
    importoImponibile: 3440,
    ivaPercentuale: 22,
    importo: 4197,
    data: '2026-02-20',
    scadenza: '2026-03-20',
    mese: 2,
    anno: 2026,
    stato: 'Pagata',
    metodoPagamento: 'Ri.Ba. 30gg F.M.',
  },
];

// ============================================================================
// 6. AVVISI E NOTIFICHE OPERATIVE (Scadenze e Urgenze Cantiere)
// ============================================================================
export const AVVISI_INIZIALI = [
  {
    id: 'avv-1',
    tipo: 'urgenza', // Rosso
    titolo: 'Fattura FT-2026/076 scaduta da 17 giorni',
    descrizione: 'Ristorante Al Bersagliere (€ 3.172) — Inviare sollecito telefonico o PEC.',
    data: 'Oggi, 08:15',
    letto: false,
  },
  {
    id: 'avv-2',
    tipo: 'scadenza', // Giallo
    titolo: 'Taratura strumentazione multifunzione HT Italia',
    descrizione: 'Scadenza certificato ACCREDIA tra 5 giorni. Prenotare ritiro corriere.',
    data: 'Ieri, 17:40',
    letto: false,
  },
  {
    id: 'avv-3',
    tipo: 'scadenza', // Giallo
    titolo: 'Scorta magazzino: Defangatori magnetici 3/4"',
    descrizione: 'Rimasti solo 2 pezzi a scaffale (soglia minima 5 pz). Ordine fornitore Cambielli.',
    data: '10/10/2026',
    letto: false,
  },
];

// ============================================================================
// 7. SERIE STORICA FATTURATO MENSILE (Per Grafici Report e Confronto Anno Precedente)
// ============================================================================
export const STATISTICHE_MENSILI = [
  { mese: 'Gen', meseEsteso: 'Gennaio', annoCorrente: 14200, annoPrecedente: 12100 },
  { mese: 'Feb', meseEsteso: 'Febbraio', annoCorrente: 16800, annoPrecedente: 14500 },
  { mese: 'Mar', meseEsteso: 'Marzo', annoCorrente: 15900, annoPrecedente: 15200 },
  { mese: 'Apr', meseEsteso: 'Aprile', annoCorrente: 19400, annoPrecedente: 16800 },
  { mese: 'Mag', meseEsteso: 'Maggio', annoCorrente: 21200, annoPrecedente: 18400 },
  { mese: 'Giu', meseEsteso: 'Giugno', annoCorrente: 24600, annoPrecedente: 20900 },
  { mese: 'Lug', meseEsteso: 'Luglio', annoCorrente: 26100, annoPrecedente: 22300 },
  { mese: 'Ago', meseEsteso: 'Agosto', annoCorrente: 13800, annoPrecedente: 11900 },
  { mese: 'Set', meseEsteso: 'Settembre', annoCorrente: 22900, annoPrecedente: 19500 },
  { mese: 'Ott', meseEsteso: 'Ottobre', annoCorrente: 18450, annoPrecedente: 16100 },
];

// Target SLA aziendali (ore standard previste per singolo intervento in base al reparto)
export const BENCHMARK_TEMPI_IMPIANTO = {
  'Idraulico / Termico': {
    targetOre: 3.0,
    minOre: 1.5,
    maxOre: 4.5,
    colore: '#f59e0b',
    descrizione: 'Caldaie, pompe di calore, centrali termiche e reti idriche',
  },
  Elettrico: {
    targetOre: 2.8,
    minOre: 1.5,
    maxOre: 4.0,
    colore: '#3b82f6',
    descrizione: 'Quadri 380V, domotica KNX, rifasamento e gruppi UPS',
  },
  Climatizzazione: {
    targetOre: 2.6,
    minOre: 1.5,
    maxOre: 3.5,
    colore: '#10b981',
    descrizione: 'Sistemi multisplit R32, ventilconvettori, F-Gas e sanificazione',
  },
};

// Serie storica mensile dei tempi medi di intervento (ore) per reparto e per tecnico
export const TREND_TEMPI_MEDI_MENSILI = [
  { mese: 'Mag', idraulico: 3.3, elettrico: 3.1, climatizzazione: 2.9, mediaSquadra: 3.1, targetSla: 2.9 },
  { mese: 'Giu', idraulico: 3.2, elettrico: 2.9, climatizzazione: 2.8, mediaSquadra: 2.97, targetSla: 2.9 },
  { mese: 'Lug', idraulico: 3.0, elettrico: 2.8, climatizzazione: 2.7, mediaSquadra: 2.83, targetSla: 2.9 },
  { mese: 'Ago', idraulico: 2.9, elettrico: 2.7, climatizzazione: 2.5, mediaSquadra: 2.7, targetSla: 2.9 },
  { mese: 'Set', idraulico: 2.8, elettrico: 2.6, climatizzazione: 2.5, mediaSquadra: 2.63, targetSla: 2.9 },
  { mese: 'Ott', idraulico: 2.7, elettrico: 2.5, climatizzazione: 2.4, mediaSquadra: 2.53, targetSla: 2.9 },
];

// ============================================================================
// 8. FERIE E PERMESSI TECNICI (Assenze distribuite nella settimana corrente)
// ============================================================================
export function creaFerieIniziali() {
  const { giorni, oggiIdx } = getSettimanaCorrente();
  const altriGiorni = [0, 1, 2, 3, 4, 5, 6].filter((idx) => idx !== oggiIdx);

  const giornoFerieMarco = giorni[altriGiorni[3] ?? 4].iso;
  const giornoPermessoAndrea = giorni[altriGiorni[1] ?? 1].iso;
  const giornoFerieLuca = giorni[altriGiorni[5] ?? 5].iso;

  return [
    {
      id: 'fer-1',
      tecnico: 'Marco',
      dataInizio: giornoFerieMarco,
      dataFine: giornoFerieMarco,
      tipo: 'Ferie',
      motivo: 'Giornata di ferie programmata',
      approvato: true,
    },
    {
      id: 'fer-2',
      tecnico: 'Andrea',
      dataInizio: giornoPermessoAndrea,
      dataFine: giornoPermessoAndrea,
      tipo: 'Permesso ROL',
      motivo: 'Visita medica specialistica mattutina',
      approvato: true,
    },
    {
      id: 'fer-3',
      tecnico: 'Luca',
      dataInizio: giornoFerieLuca,
      dataFine: giornoFerieLuca,
      tipo: 'Corso Formazione',
      motivo: 'Aggiornamento patentino F-Gas e normative caldaie',
      approvato: true,
    },
  ];
}

// ============================================================================
// 9. NOTE RAPIDE DI CANTIERE (Bacheca condivisa per tutti i tecnici nella giornata corrente)
// ============================================================================
export function creaNoteCantiereIniziali() {
  const { oggiIso } = getSettimanaCorrente();

  return [
    {
      id: 'nota-1',
      autore: 'Mario Rossi (Titolare)',
      testo:
        'Per Fam. Bianchi (Viale Roma 42): caricare sul furgone di Luca anche il defangatore magnetico Caleffi 3/4" e 2 flaconi di liquido inibitore.',
      orario: '07:45',
      data: oggiIso,
      origineVocale: false,
      importante: true,
    },
    {
      id: 'nota-2',
      autore: 'Andrea',
      testo:
        'Condominio Palladio: il portiere Sig. Giuseppe lascia le chiavi della centrale termica nella cassetta blindata codice 2480 dopo le 13:00.',
      orario: '08:20',
      data: oggiIso,
      origineVocale: true,
      importante: false,
    },
    {
      id: 'nota-3',
      autore: 'Luca',
      testo:
        'Officina Sartori: collaudo linea 380V firmato. Ho lasciato una bobina di cavo FG16OR16 5G6 mmq in magazzino scaffale B2.',
      orario: '10:35',
      data: oggiIso,
      origineVocale: true,
      importante: false,
    },
  ];
}

// ============================================================================
// 10. MANUTENZIONI PROGRAMMATE RICORRENTI (Impianti Clienti, Scadenze Mensili/Annuali)
// ============================================================================

/**
 * Calcola la data della prossima scadenza in base alla data base e alla frequenza
 * @param {string} dataBase - Data ISO YYYY-MM-DD
 * @param {'Mensile' | 'Bimestrale' | 'Trimestrale' | 'Semestrale' | 'Annuale' | 'Biennale'} frequenza
 * @returns {string} Nuova data ISO YYYY-MM-DD
 */
export function calcolaProssimaScadenza(dataBase, frequenza) {
  if (!dataBase) return '';
  const [y, m, d] = dataBase.split('-').map(Number);
  const data = new Date(y, (m || 1) - 1, d || 1);
  if (isNaN(data.getTime())) return dataBase;

  switch (frequenza) {
    case 'Mensile':
      data.setMonth(data.getMonth() + 1);
      break;
    case 'Bimestrale':
      data.setMonth(data.getMonth() + 2);
      break;
    case 'Trimestrale':
      data.setMonth(data.getMonth() + 3);
      break;
    case 'Semestrale':
      data.setMonth(data.getMonth() + 6);
      break;
    case 'Annuale':
      data.setFullYear(data.getFullYear() + 1);
      break;
    case 'Biennale':
      data.setFullYear(data.getFullYear() + 2);
      break;
    default:
      data.setFullYear(data.getFullYear() + 1);
  }

  const anno = data.getFullYear();
  const mese = String(data.getMonth() + 1).padStart(2, '0');
  const giorno = String(data.getDate()).padStart(2, '0');
  return `${anno}-${mese}-${giorno}`;
}

/**
 * Calcola lo stato di una manutenzione programmata (Scaduta, In scadenza, Programmata)
 * @param {string} prossimaScadenza - Data ISO YYYY-MM-DD
 * @param {string} oggiIso - Data ISO YYYY-MM-DD odierna
 * @returns {'Scaduta' | 'In scadenza' | 'Programmata'}
 */
export function calcolaStatoManutenzione(prossimaScadenza, oggiIso) {
  if (!prossimaScadenza) return 'Programmata';
  if (prossimaScadenza < oggiIso) return 'Scaduta';

  // Se scade entro 30 giorni
  const msDiff =
    new Date(prossimaScadenza).getTime() - new Date(oggiIso).getTime();
  const giorniDiff = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
  if (giorniDiff <= 30) return 'In scadenza';
  return 'Programmata';
}

/**
 * Genera l'elenco iniziale delle manutenzioni programmate ricorrenti per i clienti di Vicenza
 */
export function creaManutenzioniIniziali() {
  const { oggiIso, giorni } = getSettimanaCorrente();
  const giorno1 = (giorni[1] && giorni[1].iso) || oggiIso;
  const giorno3 = (giorni[3] && giorni[3].iso) || oggiIso;
  const giorno5 = (giorni[5] && giorni[5].iso) || oggiIso;

  return [
    {
      id: 'man-1',
      clienteId: 'cli-1',
      clienteNome: 'Fam. Bianchi (Roberto Bianchi)',
      indirizzoCliente: 'Viale Roma 42, 36100 Vicenza (VI)',
      telefonoCliente: '+39 348 221 9084',
      impianto: 'Caldaia a condensazione Baxi Duo-Tec 28kW',
      tipoImpianto: 'Idraulico / Termico',
      titolo: 'Controllo Rendimento Fumi & Bollino Calore DPR 74/2013',
      descrizione:
        'Pulizia bruciatore, controllo tiraggio canna fumaria, prova fumi analizzatore ed emissione rapporto CIRCE.',
      frequenza: 'Annuale',
      ultimaEsecuzione: '2025-10-14',
      prossimaScadenza: giorno3,
      tecnicoAssegnato: 'Luca',
      costoStimato: 130,
      matricola: 'BXI-2023-8841',
      attiva: true,
      noteTecniche:
        'Accesso centrale in lavanderia. Collettore a pavimento 2 zone.',
    },
    {
      id: 'man-2',
      clienteId: 'cli-2',
      clienteNome: 'Condominio Palladio (Amm. Studio Sartori)',
      indirizzoCliente: 'Corso Andrea Palladio 118, 36100 Vicenza (VI)',
      telefonoCliente: '+39 335 678 1290',
      impianto: 'Centrale Termica Condominiale Gas 120kW',
      tipoImpianto: 'Idraulico / Termico',
      titolo: 'Manutenzione Semestrale Bruciatore e Trattamento Acque',
      descrizione:
        'Verifica dosatore polifosfati, defangatore a valle e pulizia scambiatore a piastre.',
      frequenza: 'Semestrale',
      ultimaEsecuzione: '2026-04-12',
      prossimaScadenza: giorno1,
      tecnicoAssegnato: 'Luca',
      costoStimato: 450,
      matricola: 'VI-CT-0941',
      attiva: true,
      noteTecniche: 'Chiavi in cassetta blindata codice 2480.',
    },
    {
      id: 'man-3',
      clienteId: 'cli-3',
      clienteNome: 'Ristorante Da Toni (Antonio Rigon)',
      indirizzoCliente: 'Piazza dei Signori 8, 36100 Vicenza (VI)',
      telefonoCliente: '+39 340 987 6543',
      impianto: 'Impianto VRF Climatizzazione Daikin e Cappe Cucina',
      tipoImpianto: 'Climatizzazione',
      titolo: 'Controllo Tenuta Circuito Frigorifero F-Gas & Pulizia Filtri',
      descrizione:
        'Controllo cercafughe elettronico, prova pressione R32, lavaggio antibatterico unità interne.',
      frequenza: 'Semestrale',
      ultimaEsecuzione: '2026-04-18',
      prossimaScadenza: giorno5,
      tecnicoAssegnato: 'Marco',
      costoStimato: 280,
      matricola: 'DK-VRF-501',
      attiva: true,
      noteTecniche:
        'Intervento tassativo tra le 08:30 e le 11:00 prima del servizio pranzo.',
    },
    {
      id: 'man-4',
      clienteId: 'cli-4',
      clienteNome: 'Oreficeria Valenza (Elena Valenza)',
      indirizzoCliente: 'Contrà Porti 22, 36100 Vicenza (VI)',
      telefonoCliente: '+39 347 112 3344',
      impianto: 'Quadro Elettrico Generale & UPS Gruppo Soccorritore',
      tipoImpianto: 'Elettrico',
      titolo: 'Verifica Annuale Differenziali e Scaricatori CEI 64-8',
      descrizione:
        'Prova sgancio differenziali di tipo F e B con strumento multifunzione, serraggio morsetti.',
      frequenza: 'Annuale',
      ultimaEsecuzione: '2025-10-10',
      prossimaScadenza: oggiIso,
      tecnicoAssegnato: 'Andrea',
      costoStimato: 220,
      matricola: 'EL-VAL-2022',
      attiva: true,
      noteTecniche:
        'Negozio aperto: attenzione a non disalimentare il caveau.',
    },
    {
      id: 'man-5',
      clienteId: 'cli-5',
      clienteNome: 'Cantina Sociale Colli Berici (Ing. Stefano Maran)',
      indirizzoCliente: 'Strada Provinciale 19, 36021 Barbarano Mossano (VI)',
      telefonoCliente: '+39 338 554 4332',
      impianto: 'Centrale Frigorifera Chiller e Addolcitore Resine',
      tipoImpianto: 'Climatizzazione',
      titolo: 'Manutenzione Mensile Addolcitore e Pressione Glicole',
      descrizione:
        'Verifica durezza acqua in ingresso/uscita (°F), rabbocco sale pastiglie e test circolatore glicole.',
      frequenza: 'Mensile',
      ultimaEsecuzione: '2026-09-12',
      prossimaScadenza: giorno3,
      tecnicoAssegnato: 'Marco',
      costoStimato: 160,
      matricola: 'BER-CHILLER-02',
      attiva: true,
      noteTecniche: 'Presentarsi in portineria con DPI cantiere.',
    },
    {
      id: 'man-6',
      clienteId: 'cli-6',
      clienteNome: 'Autofficina Dal Lago (Giancarlo Dal Lago)',
      indirizzoCliente: 'Via dell’Oreficeria 55, 36100 Vicenza (VI)',
      telefonoCliente: '+39 349 667 7889',
      impianto: 'Impianto Messa a Terra e Compressore Rotativo 15kW',
      tipoImpianto: 'Elettrico',
      titolo: 'Verifica Periodica Impianto Messa a Terra DPR 462/01',
      descrizione:
        'Misura resistenza dispersore di terra, continuità conduttori di protezione ponti sollevatori.',
      frequenza: 'Biennale',
      ultimaEsecuzione: '2024-10-25',
      prossimaScadenza: giorno5,
      tecnicoAssegnato: 'Andrea',
      costoStimato: 380,
      matricola: 'DL-IND-04',
      attiva: true,
      noteTecniche: 'Verifica da concordare con responsabile officina.',
    },
  ];
}


