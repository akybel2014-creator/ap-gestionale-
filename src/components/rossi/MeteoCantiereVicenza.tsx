import React from 'react';
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  RefreshCw,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Siren,
  ChevronDown,
  ChevronUp,
  BellRing,
  Globe,
  Settings,
} from 'lucide-react';
import type { NotificaPushLocalePayload } from '@/lib/notifichePushLocali';
import type { ImpostazioniMeteoVicenza } from './ImpostazioniMeteoModal';

interface PrevisioneOraria {
  ora: string;
  temperatura: number;
  probabilitaPioggia: number;
  codiceWmo: number;
}

interface PrevisioneGiornaliera {
  dataIso: string;
  etichettaGiorno: string;
  tempMax: number;
  tempMin: number;
  probabilitaPioggiaMax: number;
  codiceWmo: number;
}

export type LivelloAllertaMeteo = 'verde' | 'gialla' | 'arancione' | 'rossa';

export interface AllertaMeteoItem {
  id: string;
  citta: string;
  regione: string;
  livello: Exclude<LivelloAllertaMeteo, 'verde'>;
  titolo: string;
  fenomeno: string;
  valoreRilevato: string;
  raccomandazioneCantiere: string;
  fasciaOraria: string;
}

export interface StatoMeteoCittaItaliana {
  id: string;
  nome: string;
  regione: string;
  lat: number;
  lon: number;
  temperaturaAttuale: number;
  temperaturaPercepita: number;
  umidita: number;
  ventoKmh: number;
  rafficheMaxKmh: number;
  precipitazioniMaxMm: number;
  probabilitaPioggiaOggi: number;
  indiceUvMax: number;
  codiceWmoAttuale: number;
  fasceOrarie: PrevisioneOraria[];
  prossimiGiorni: PrevisioneGiornaliera[];
  allerteAttive: AllertaMeteoItem[];
  livelloAllertaMassimo: LivelloAllertaMeteo;
}

interface MeteoCantiereVicenzaProps {
  onAttivaPushAllertaMeteo?: (
    payload: Omit<NotificaPushLocalePayload, 'id' | 'orario'>,
  ) => void;
  impostazioniMeteo?: ImpostazioniMeteoVicenza;
  onApriImpostazioniMeteo?: () => void;
}

/**
 * Elenco delle principali città d'Italia monitorate dal servizio meteo multi-città Open-Meteo
 * (con Vicenza come sede operativa principale di Rossi Impianti)
 */
export const OPEN_METEO_ARPAE_ICON_2I_DEFAULT_ENDPOINT =
  'https://api.open-meteo.com/v1/forecast?latitude=41.89&longitude=12.51&hourly=temperature_2m&models=italia_meteo_arpae_icon_2i&forecast_days=7';

export const CITTA_ITALIA_MONITORATE = [
  { id: 'vicenza', nome: 'Vicenza', regione: 'Veneto', lat: 45.5455, lon: 11.5354 },
  { id: 'roma', nome: 'Roma (ARPAE Reference)', regione: 'Lazio', lat: 41.89, lon: 12.51 },
  { id: 'milano', nome: 'Milano', regione: 'Lombardia', lat: 45.4642, lon: 9.19 },
  { id: 'torino', nome: 'Torino', regione: 'Piemonte', lat: 45.0703, lon: 7.6869 },
  { id: 'venezia', nome: 'Venezia', regione: 'Veneto', lat: 45.4408, lon: 12.3155 },
  { id: 'bologna', nome: 'Bologna', regione: 'Emilia-Romagna', lat: 44.4949, lon: 11.3426 },
  { id: 'genova', nome: 'Genova', regione: 'Liguria', lat: 44.4056, lon: 8.9463 },
  { id: 'firenze', nome: 'Firenze', regione: 'Toscana', lat: 43.7696, lon: 11.2558 },
  { id: 'napoli', nome: 'Napoli', regione: 'Campania', lat: 40.8518, lon: 14.2681 },
  { id: 'bari', nome: 'Bari', regione: 'Puglia', lat: 41.1171, lon: 16.8719 },
  { id: 'palermo', nome: 'Palermo', regione: 'Sicilia', lat: 38.1157, lon: 13.3615 },
  { id: 'cagliari', nome: 'Cagliari', regione: 'Sardegna', lat: 39.2238, lon: 9.1217 },
];

/**
 * Controlla la risposta dell'API meteo per una specifica città italiana e genera eventuali allerte meteo
 */
function calcolaAllerteMeteoCitta(params: {
  idCitta: string;
  nomeCitta: string;
  regione: string;
  codiciWmoOrari: number[];
  orariIso: string[];
  rafficheMaxKmh: number;
  precipitazioniMaxMm: number;
  probabilitaPioggiaMax: number;
  tempMax: number;
  tempMin: number;
  indiceUvMax: number;
  codiceWmoAttuale: number;
}): {
  allerte: AllertaMeteoItem[];
  livelloMassimo: LivelloAllertaMeteo;
} {
  const allerte: AllertaMeteoItem[] = [];

  // 1. Temporali / Nubifragi / Grandine (WMO 95, 96, 99)
  const idxTemporale = params.codiciWmoOrari.findIndex((c) => c >= 95);
  if (idxTemporale !== -1 || params.codiceWmoAttuale >= 95) {
    const conGrandine =
      params.codiciWmoOrari.some((c) => c === 96 || c === 99) ||
      params.codiceWmoAttuale === 96 ||
      params.codiceWmoAttuale === 99;
    const oraEvento =
      idxTemporale !== -1 && params.orariIso[idxTemporale]
        ? params.orariIso[idxTemporale].slice(11, 16)
        : 'In corso';

    allerte.push({
      id: `alert-temp-${params.idCitta}`,
      citta: params.nomeCitta,
      regione: params.regione,
      livello: conGrandine ? 'rossa' : 'arancione',
      titolo: `${params.nomeCitta} (${params.regione}) — ${
        conGrandine
          ? 'Allerta Rossa: Temporale Forte e Grandine'
          : 'Allerta Arancione: Temporali e Attività Elettrica'
      }`,
      fenomeno: 'Rischio fulminazione e rovesci intensi',
      valoreRilevato: `WMO ${conGrandine ? '96/99' : '95'} · Accumulo ${params.precipitazioniMaxMm} mm`,
      raccomandazioneCantiere:
        'Sospendere lavori in quota/copertura, messa in tensione quadri esterni e collaudi linee 380V all’aperto.',
      fasciaOraria: `Dalle ore ${oraEvento}`,
    });
  }

  // 2. Raffiche di Vento Forti (>= 40 km/h)
  if (params.rafficheMaxKmh >= 40) {
    const isSevero = params.rafficheMaxKmh >= 60;
    allerte.push({
      id: `alert-vento-${params.idCitta}`,
      citta: params.nomeCitta,
      regione: params.regione,
      livello: isSevero ? 'arancione' : 'gialla',
      titolo: `${params.nomeCitta} (${params.regione}) — ${
        isSevero
          ? 'Allerta Arancione: Raffiche di Vento Forti'
          : 'Allerta Gialla: Vento Sostenuto per Lavori in Quota'
      }`,
      fenomeno: 'Raffiche di vento al suolo e in copertura',
      valoreRilevato: `Raffiche fino a ${params.rafficheMaxKmh} km/h`,
      raccomandazioneCantiere:
        'Vietato uso di scale estensibili/trabattelli esterni e sollevamento unità motocondensanti sui tetti.',
      fasciaOraria: 'Giornata odierna',
    });
  }

  // 3. Pioggia Intensa / Criticità Idrogeologica (>= 12 mm o Probabilità >= 70% o WMO >= 63)
  const pioggiaForteWmo = params.codiciWmoOrari.some(
    (c) => (c >= 63 && c <= 67) || (c >= 81 && c <= 82),
  );
  if (
    params.precipitazioniMaxMm >= 12 ||
    pioggiaForteWmo ||
    params.probabilitaPioggiaMax >= 70
  ) {
    const isSevero = params.precipitazioniMaxMm >= 25;
    allerte.push({
      id: `alert-pioggia-${params.idCitta}`,
      citta: params.nomeCitta,
      regione: params.regione,
      livello: isSevero ? 'arancione' : 'gialla',
      titolo: `${params.nomeCitta} (${params.regione}) — ${
        isSevero
          ? 'Allerta Arancione: Rovesci Abbondanti e Rischio Idrico'
          : 'Allerta Gialla: Precipitazioni Diffuse'
      }`,
      fenomeno: 'Pioggia battente e ridotto isolamento elettrico esterno',
      valoreRilevato: `${params.precipitazioniMaxMm} mm · Prob. pioggia ${params.probabilitaPioggiaMax}%`,
      raccomandazioneCantiere:
        'Proteggere quadri di cantiere (min. IP65) e posticipare scavi idrici o saldature esterne.',
      fasciaOraria: 'Prossime 24h',
    });
  }

  // 4. Temperature Estreme (Gelo <= 2°C o Caldo Intenso >= 34°C)
  if (params.tempMin <= 2) {
    allerte.push({
      id: `alert-gelo-${params.idCitta}`,
      citta: params.nomeCitta,
      regione: params.regione,
      livello: 'gialla',
      titolo: `${params.nomeCitta} (${params.regione}) — Allerta Gialla: Rischio Gelate`,
      fenomeno: 'Basse temperature su tubazioni esterne e centrali termiche',
      valoreRilevato: `Minima ${params.tempMin}°C`,
      raccomandazioneCantiere:
        'Verificare antigelo impianti solari/pompe di calore e coibentazione contatori.',
      fasciaOraria: '06:00 – 09:00',
    });
  } else if (params.tempMax >= 34 || params.indiceUvMax >= 8) {
    allerte.push({
      id: `alert-calore-${params.idCitta}`,
      citta: params.nomeCitta,
      regione: params.regione,
      livello: 'gialla',
      titolo: `${params.nomeCitta} (${params.regione}) — Allerta Gialla: Stress Termico / UV`,
      fenomeno: 'Alte temperature per lavorazioni su coperture',
      valoreRilevato: `Max ${params.tempMax}°C · UV ${params.indiceUvMax}`,
      raccomandazioneCantiere:
        'Pianificare installazioni unità esterne clima nelle prime ore del mattino.',
      fasciaOraria: '12:00 – 16:30',
    });
  }

  let livelloMassimo: LivelloAllertaMeteo = 'verde';
  if (allerte.some((a) => a.livello === 'rossa')) {
    livelloMassimo = 'rossa';
  } else if (allerte.some((a) => a.livello === 'arancione')) {
    livelloMassimo = 'arancione';
  } else if (allerte.some((a) => a.livello === 'gialla')) {
    livelloMassimo = 'gialla';
  }

  return { allerte, livelloMassimo };
}

function creaStatoFallbackCitta(): StatoMeteoCittaItaliana[] {
  return CITTA_ITALIA_MONITORATE.map((c, idx) => {
    const isVicenza = c.id === 'vicenza';
    const hasWarning = isVicenza || c.id === 'milano' || c.id === 'genova';
    const allerte: AllertaMeteoItem[] = hasWarning
      ? [
          {
            id: `fallback-${c.id}`,
            citta: c.nome,
            regione: c.regione,
            livello: c.id === 'genova' ? 'arancione' : 'gialla',
            titolo: `${c.nome} (${c.regione}) — Allerta ${
              c.id === 'genova' ? 'Arancione' : 'Gialla'
            }: Perturbazione e Raffiche in Arrivo`,
            fenomeno: 'Aumento ventilazione e precipitazioni sui cantieri esterni',
            valoreRilevato: `Prob. pioggia ${c.id === 'genova' ? 85 : 75}% · Raffiche ${
              c.id === 'genova' ? 62 : 44
            } km/h`,
            raccomandazioneCantiere:
              'Mettere in sicurezza quadri elettrici esterni IP65 e anticipare i collaudi in copertura.',
            fasciaOraria: 'Prossime 24h',
          },
        ]
      : [];

    return {
      id: c.id,
      nome: c.nome,
      regione: c.regione,
      lat: c.lat,
      lon: c.lon,
      temperaturaAttuale: 18 + (idx % 5),
      temperaturaPercepita: 17 + (idx % 5),
      umidita: 60 + (idx % 15),
      ventoKmh: 10 + (idx % 8),
      rafficheMaxKmh: hasWarning ? (c.id === 'genova' ? 62 : 44) : 24,
      precipitazioniMaxMm: hasWarning ? 14.5 : 2.0,
      probabilitaPioggiaOggi: hasWarning ? 75 : 15,
      indiceUvMax: 4,
      codiceWmoAttuale: hasWarning ? 61 : 1,
      fasceOrarie: [
        { ora: '08:00', temperatura: 14, probabilitaPioggia: 10, codiceWmo: 1 },
        { ora: '11:00', temperatura: 18, probabilitaPioggia: 15, codiceWmo: 1 },
        { ora: '14:00', temperatura: 20, probabilitaPioggia: 20, codiceWmo: 2 },
        { ora: '17:00', temperatura: 17, probabilitaPioggia: 25, codiceWmo: 2 },
      ],
      prossimiGiorni: [
        {
          dataIso: 'giorno-1',
          etichettaGiorno: 'Oggi',
          tempMax: 20,
          tempMin: 11,
          probabilitaPioggiaMax: hasWarning ? 75 : 15,
          codiceWmo: hasWarning ? 61 : 1,
        },
        {
          dataIso: 'giorno-2',
          etichettaGiorno: 'Domani',
          tempMax: 19,
          tempMin: 10,
          probabilitaPioggiaMax: 25,
          codiceWmo: 2,
        },
        {
          dataIso: 'giorno-3',
          etichettaGiorno: 'Giorno 3',
          tempMax: 17,
          tempMin: 9,
          probabilitaPioggiaMax: 60,
          codiceWmo: 61,
        },
        {
          dataIso: 'giorno-4',
          etichettaGiorno: 'Giorno 4',
          tempMax: 18,
          tempMin: 10,
          probabilitaPioggiaMax: 30,
          codiceWmo: 2,
        },
        {
          dataIso: 'giorno-5',
          etichettaGiorno: 'Giorno 5',
          tempMax: 21,
          tempMin: 12,
          probabilitaPioggiaMax: 15,
          codiceWmo: 1,
        },
        {
          dataIso: 'giorno-6',
          etichettaGiorno: 'Giorno 6',
          tempMax: 22,
          tempMin: 12,
          probabilitaPioggiaMax: 10,
          codiceWmo: 0,
        },
        {
          dataIso: 'giorno-7',
          etichettaGiorno: 'Giorno 7',
          tempMax: 20,
          tempMin: 11,
          probabilitaPioggiaMax: 20,
          codiceWmo: 1,
        },
      ],
      allerteAttive: allerte,
      livelloAllertaMassimo: hasWarning
        ? c.id === 'genova'
          ? 'arancione'
          : 'gialla'
        : 'verde',
    };
  });
}

function descriviCodiceWmo(code: number): {
  descrizione: string;
  tipo: 'sereno' | 'poco-nuvoloso' | 'nuvoloso' | 'pioggia' | 'temporale';
} {
  if (code === 0) {
    return { descrizione: 'Cielo sereno', tipo: 'sereno' };
  }
  if (code === 1 || code === 2) {
    return { descrizione: 'Poco nuvoloso', tipo: 'poco-nuvoloso' };
  }
  if (code === 3 || (code >= 45 && code <= 48)) {
    return { descrizione: 'Nuvoloso / Foschia', tipo: 'nuvoloso' };
  }
  if (code >= 95) {
    return { descrizione: 'Temporale in arrivo', tipo: 'temporale' };
  }
  if (code >= 51 && code <= 82) {
    return { descrizione: 'Pioggia prevista', tipo: 'pioggia' };
  }
  return { descrizione: 'Variabile', tipo: 'poco-nuvoloso' };
}

function renderIconaMeteo(code: number, className = 'w-6 h-6') {
  const { tipo } = descriviCodiceWmo(code);
  if (tipo === 'sereno') {
    return <Sun className={`${className} text-[#f59e0b]`} />;
  }
  if (tipo === 'poco-nuvoloso') {
    return <CloudSun className={`${className} text-[#f59e0b]`} />;
  }
  if (tipo === 'pioggia') {
    return <CloudRain className={`${className} text-sky-400`} />;
  }
  if (tipo === 'temporale') {
    return <CloudLightning className={`${className} text-[#ef4444]`} />;
  }
  return <Cloud className={`${className} text-[#94a3b8]`} />;
}

/**
 * Analizza una singola voce di risposta dell'API Open-Meteo e restituisce lo stato strutturato della città
 */
function parseSingolaCittaOpenMeteo(
  cittaMeta: (typeof CITTA_ITALIA_MONITORATE)[number],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
): StatoMeteoCittaItaliana {
  const current = data?.current || {};
  const hourly = data?.hourly || {};
  const daily = data?.daily || {};

  const orariTarget = ['08:00', '11:00', '14:00', '17:00'];
  const fasceOrarie: PrevisioneOraria[] = [];

  if (Array.isArray(hourly.time)) {
    for (const target of orariTarget) {
      const idx = hourly.time.findIndex((t: string) =>
        t.endsWith(`T${target}`),
      );
      if (idx !== -1) {
        fasceOrarie.push({
          ora: target,
          temperatura: Math.round(hourly.temperature_2m?.[idx] ?? 17),
          probabilitaPioggia: Math.round(
            hourly.precipitation_probability?.[idx] ?? 10,
          ),
          codiceWmo: hourly.weather_code?.[idx] ?? 1,
        });
      }
    }
  }

  const nomiGiorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const prossimiGiorni: PrevisioneGiornaliera[] = [];
  if (Array.isArray(daily.time) && daily.time.length > 0) {
    daily.time.slice(0, 7).forEach((iso: string, idx: number) => {
      const dt = new Date(`${iso}T12:00:00`);
      const etichetta =
        idx === 0
          ? 'Oggi'
          : idx === 1
            ? 'Domani'
            : `${nomiGiorni[dt.getDay()]} ${dt.getDate()}`;
      prossimiGiorni.push({
        dataIso: iso,
        etichettaGiorno: etichetta,
        tempMax: Math.round(daily.temperature_2m_max?.[idx] ?? 20),
        tempMin: Math.round(daily.temperature_2m_min?.[idx] ?? 11),
        probabilitaPioggiaMax: Math.round(
          daily.precipitation_probability_max?.[idx] ?? 15,
        ),
        codiceWmo: daily.weather_code?.[idx] ?? 1,
      });
    });
  } else if (Array.isArray(hourly.time) && Array.isArray(hourly.temperature_2m)) {
    // Supporta direttamente anche il payload puro `hourly=temperature_2m&models=italia_meteo_arpae_icon_2i&forecast_days=7`
    const mapGiorni = new Map<string, number[]>();
    hourly.time.forEach((isoTime: string, i: number) => {
      const dayKey = isoTime.slice(0, 10);
      const val = hourly.temperature_2m[i];
      if (typeof val === 'number') {
        const list = mapGiorni.get(dayKey) || [];
        list.push(val);
        mapGiorni.set(dayKey, list);
      }
    });
    Array.from(mapGiorni.entries())
      .slice(0, 7)
      .forEach(([iso, temps], idx) => {
        const dt = new Date(`${iso}T12:00:00`);
        const etichetta =
          idx === 0
            ? 'Oggi'
            : idx === 1
              ? 'Domani'
              : `${nomiGiorni[dt.getDay()]} ${dt.getDate()}`;
        prossimiGiorni.push({
          dataIso: iso,
          etichettaGiorno: etichetta,
          tempMax: Math.round(Math.max(...temps)),
          tempMin: Math.round(Math.min(...temps)),
          probabilitaPioggiaMax: 15,
          codiceWmo: 1,
        });
      });
  }

  const rafficheDailyMax = Array.isArray(daily.wind_gusts_10m_max)
    ? Math.round(
        Math.max(...daily.wind_gusts_10m_max, current.wind_gusts_10m ?? 0),
      )
    : Math.round(current.wind_gusts_10m ?? 25);

  const precipitazioniDailyMax = Array.isArray(daily.precipitation_sum)
    ? Math.round(Math.max(...daily.precipitation_sum) * 10) / 10
    : 0;

  const probPioggiaMax72h = Array.isArray(daily.precipitation_probability_max)
    ? Math.round(Math.max(...daily.precipitation_probability_max))
    : 15;

  const tempMax72h = Array.isArray(daily.temperature_2m_max)
    ? Math.round(Math.max(...daily.temperature_2m_max))
    : 20;

  const tempMin72h = Array.isArray(daily.temperature_2m_min)
    ? Math.round(Math.min(...daily.temperature_2m_min))
    : 11;

  const uvMax72h = Array.isArray(daily.uv_index_max)
    ? Math.round(Math.max(...daily.uv_index_max) * 10) / 10
    : 4;

  const codiciWmoOrari: number[] = Array.isArray(hourly.weather_code)
    ? hourly.weather_code.slice(0, 48)
    : [];
  const orariIso: string[] = Array.isArray(hourly.time)
    ? hourly.time.slice(0, 48)
    : [];

  const { allerte, livelloMassimo } = calcolaAllerteMeteoCitta({
    idCitta: cittaMeta.id,
    nomeCitta: cittaMeta.nome,
    regione: cittaMeta.regione,
    codiciWmoOrari,
    orariIso,
    rafficheMaxKmh: rafficheDailyMax,
    precipitazioniMaxMm: precipitazioniDailyMax,
    probabilitaPioggiaMax: probPioggiaMax72h,
    tempMax: tempMax72h,
    tempMin: tempMin72h,
    indiceUvMax: uvMax72h,
    codiceWmoAttuale: current.weather_code ?? 1,
  });

  return {
    id: cittaMeta.id,
    nome: cittaMeta.nome,
    regione: cittaMeta.regione,
    lat: cittaMeta.lat,
    lon: cittaMeta.lon,
    temperaturaAttuale: Math.round(current.temperature_2m ?? 18),
    temperaturaPercepita: Math.round(current.apparent_temperature ?? 17),
    umidita: Math.round(current.relative_humidity_2m ?? 60),
    ventoKmh: Math.round(current.wind_speed_10m ?? 9),
    rafficheMaxKmh: rafficheDailyMax,
    precipitazioniMaxMm: precipitazioniDailyMax,
    probabilitaPioggiaOggi: prossimiGiorni[0]?.probabilitaPioggiaMax ?? 15,
    indiceUvMax: uvMax72h,
    codiceWmoAttuale: current.weather_code ?? 1,
    fasceOrarie:
      fasceOrarie.length > 0
        ? fasceOrarie
        : [
            { ora: '08:00', temperatura: 14, probabilitaPioggia: 10, codiceWmo: 1 },
            { ora: '11:00', temperatura: 18, probabilitaPioggia: 10, codiceWmo: 1 },
            { ora: '14:00', temperatura: 20, probabilitaPioggia: 15, codiceWmo: 2 },
            { ora: '17:00', temperatura: 17, probabilitaPioggia: 20, codiceWmo: 2 },
          ],
    prossimiGiorni:
      prossimiGiorni.length > 0
        ? prossimiGiorni
        : [
            {
              dataIso: 'oggi',
              etichettaGiorno: 'Oggi',
              tempMax: 20,
              tempMin: 11,
              probabilitaPioggiaMax: 15,
              codiceWmo: 1,
            },
          ],
    allerteAttive: allerte,
    livelloAllertaMassimo: livelloMassimo,
  };
}

/**
 * WIDGET METEO & MONITORAGGIO ALLERTE NAZIONALI ITALIA (con Focus Vicenza)
 * - Interroga in un'unica chiamata multi-coordinate l'API pubblica Open-Meteo per tutte le principali città d'Italia
 * - Controlla la risposta dell'API meteo e, se rileva una condizione di allerta meteo nelle città italiane monitorate,
 *   attiva automaticamente una Notifica Push Locale prioritaria (`priorita: 'urgenza'`) per avvisare i tecnici.
 */
export default function MeteoCantiereVicenza({
  onAttivaPushAllertaMeteo,
  impostazioniMeteo,
  onApriImpostazioniMeteo,
}: MeteoCantiereVicenzaProps) {
  const [listaCitta, setListaCitta] = React.useState<StatoMeteoCittaItaliana[]>(
    () => creaStatoFallbackCitta(),
  );
  const [cittaSelezionataId, setCittaSelezionataId] =
    React.useState<string>('vicenza');
  const [caricamento, setCaricamento] = React.useState<boolean>(false);
  const [aggiornatoAlle, setAggiornatoAlle] = React.useState<string>('08:30');
  const [mostraDettagliAllerta, setMostraDettagliAllerta] =
    React.useState<boolean>(true);
  const [mostraReteNazionale, setMostraReteNazionale] =
    React.useState<boolean>(false);
  const [simulazioneAllertaNazionale, setSimulazioneAllertaNazionale] =
    React.useState<boolean>(false);

  // Evita di ri-inviare la stessa identica notifica push automatica ad ogni render se la firma delle allerte non è cambiata
  const ultimaFirmaPushInviataRef = React.useRef<string>('');
  const callbackPushRef = React.useRef(onAttivaPushAllertaMeteo);
  React.useEffect(() => {
    callbackPushRef.current = onAttivaPushAllertaMeteo;
  }, [onAttivaPushAllertaMeteo]);

  const inviaNotificaPushAutomaticaAllerta = React.useCallback(
    (cittaConAllerta: StatoMeteoCittaItaliana[], isSimulazione = false) => {
      if (!callbackPushRef.current || cittaConAllerta.length === 0) return;

      const nomiCitta = cittaConAllerta.map((c) => c.nome).join(', ');
      const haRossa = cittaConAllerta.some(
        (c) => c.livelloAllertaMassimo === 'rossa',
      );
      const haArancione = cittaConAllerta.some(
        (c) => c.livelloAllertaMassimo === 'arancione',
      );
      const etichettaSeverita = haRossa
        ? 'ROSSA'
        : haArancione
          ? 'ARANCIONE'
          : 'GIALLA';

      const primaAllerta =
        cittaConAllerta.find((c) => c.id === 'vicenza')?.allerteAttive[0] ||
        cittaConAllerta[0]?.allerteAttive[0];

      callbackPushRef.current({
        titolo: `🚨 ALLERTA METEO ${etichettaSeverita} ITALIA (${cittaConAllerta.length} città)`,
        messaggio: `${
          isSimulazione ? '[Allerta Nazionale] ' : ''
        }Rilevate criticità meteo su: ${nomiCitta}. ${
          primaAllerta
            ? `${primaAllerta.valoreRilevato} — ${primaAllerta.raccomandazioneCantiere}`
            : 'Mettere in sicurezza cantieri esterni e lavori in quota.'
        }`,
        tecnicoDestinatario: 'Tutti i Tecnici (Luca, Andrea, Marco)',
        indirizzo: `Rete Meteo Italia (${nomiCitta})`,
        priorita: 'urgenza',
        categoria: 'allerta_meteo',
      });
    },
    [],
  );

  const caricaMeteoTutteCittaItalia = React.useCallback(
    async (forzaPush = false) => {
      setCaricamento(true);
      try {
        const lats = CITTA_ITALIA_MONITORATE.map((c) => c.lat).join(',');
        const lons = CITTA_ITALIA_MONITORATE.map((c) => c.lon).join(',');

        // 1. Chiamata esplicita all'endpoint scelto dall'utente con modello ufficiale italiano ItaliaMeteo ARPAE ICON-2I (7 giorni)
        const arpaeIcon2iUrl = OPEN_METEO_ARPAE_ICON_2I_DEFAULT_ENDPOINT;
        const multiCityIcon2iUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,precipitation&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,uv_index_max&models=italia_meteo_arpae_icon_2i&timezone=Europe%2FRome&forecast_days=7`;

        const [resArpaeRef, resMulti] = await Promise.all([
          fetch(arpaeIcon2iUrl).catch(() => null),
          fetch(multiCityIcon2iUrl),
        ]);

        if (!resMulti.ok) throw new Error('Risposta meteo multi-città non valida');
        const payloadJson = await resMulti.json();
        const arpaeRefJson =
          resArpaeRef && resArpaeRef.ok ? await resArpaeRef.json() : null;

        const arrayRisposte = Array.isArray(payloadJson)
          ? payloadJson
          : [payloadJson];

        const statiCalcolati: StatoMeteoCittaItaliana[] =
          CITTA_ITALIA_MONITORATE.map((meta, idx) => {
            const rawCity = arrayRisposte[idx] || arrayRisposte[0] || {};
            // Se disponibile l'endpoint specifico 41.89, 12.51 per Roma ARPAE, arricchisce le temperature orarie
            if (meta.id === 'roma' && arpaeRefJson?.hourly?.temperature_2m) {
              return parseSingolaCittaOpenMeteo(meta, {
                ...rawCity,
                hourly: {
                  ...rawCity.hourly,
                  temperature_2m: arpaeRefJson.hourly.temperature_2m,
                  time: arpaeRefJson.hourly.time || rawCity.hourly?.time,
                },
              });
            }
            return parseSingolaCittaOpenMeteo(meta, rawCity);
          });

        const oraAdesso = new Date().toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
        });

        setListaCitta(statiCalcolati);
        setAggiornatoAlle(oraAdesso);

        // CONTROLLO AUTOMATICO RISPOSTA API METEO SU TUTTE LE CITTÀ D'ITALIA:
        // Se viene rilevata una condizione di allerta meteo in una o più città italiane,
        // attiva automaticamente una notifica push locale prioritaria ('urgenza') per avvisare i tecnici.
        const cittaInAllerta = statiCalcolati.filter(
          (c) => c.allerteAttive.length > 0,
        );

        if (cittaInAllerta.length > 0) {
          const firma = cittaInAllerta
            .map((c) => `${c.id}:${c.livelloAllertaMassimo}`)
            .join('|');
          if (forzaPush || ultimaFirmaPushInviataRef.current !== firma) {
            ultimaFirmaPushInviataRef.current = firma;
            inviaNotificaPushAutomaticaAllerta(cittaInAllerta, false);
          }
        }
      } catch {
        // In caso di assenza rete, controlla comunque le allerte sul dataset di fallback
        if (forzaPush) {
          const fallbackAllerte = listaCitta.filter(
            (c) => c.allerteAttive.length > 0,
          );
          inviaNotificaPushAutomaticaAllerta(fallbackAllerte, false);
        }
      } finally {
        setCaricamento(false);
      }
    },
    [inviaNotificaPushAutomaticaAllerta, listaCitta],
  );

  React.useEffect(() => {
    void caricaMeteoTutteCittaItalia(false);
  }, [caricaMeteoTutteCittaItalia]);

  // Attiva/disattiva la simulazione di allerta meteo su tutte le città d'Italia con invio automatico della Push Prioritaria
  const handleToggleSimulazioneAllertaItalia = () => {
    const nuovoStato = !simulazioneAllertaNazionale;
    setSimulazioneAllertaNazionale(nuovoStato);
    setMostraDettagliAllerta(true);
    setMostraReteNazionale(true);

    if (nuovoStato) {
      const cittaSimulate: StatoMeteoCittaItaliana[] = listaCitta.map((c) => ({
        ...c,
        livelloAllertaMassimo:
          c.id === 'vicenza' || c.id === 'milano' || c.id === 'roma'
            ? 'rossa'
            : 'arancione',
        allerteAttive: [
          {
            id: `sim-italia-${c.id}`,
            citta: c.nome,
            regione: c.regione,
            livello:
              c.id === 'vicenza' || c.id === 'milano' || c.id === 'roma'
                ? 'rossa'
                : 'arancione',
            titolo: `${c.nome} (${c.regione}) — ALLERTA METEO: Nubifragi e Raffiche > 65 km/h`,
            fenomeno: 'Fronte temporalesco severo su scala nazionale (WMO 96)',
            valoreRilevato: `Raffiche 68 km/h · Pioggia 35 mm/h`,
            raccomandazioneCantiere:
              'STOP IMMEDIATO lavori in quota/copertura, scollegare linee 380V provvisorie esterne e chiudere quadri IP65.',
            fasciaOraria: 'Allerta Prioritaria Nazionale',
          },
        ],
      }));
      inviaNotificaPushAutomaticaAllerta(cittaSimulate, true);
    }
  };

  // Città attualmente selezionata per il dettaglio orario/3 giorni (default: Vicenza)
  const meteo = React.useMemo(() => {
    const base =
      listaCitta.find((c) => c.id === cittaSelezionataId) || listaCitta[0];
    if (!simulazioneAllertaNazionale) return base;
    return {
      ...base,
      livelloAllertaMassimo: 'rossa' as LivelloAllertaMeteo,
      allerteAttive: [
        {
          id: `sim-attiva-${base.id}`,
          citta: base.nome,
          regione: base.regione,
          livello: 'rossa' as const,
          titolo: `${base.nome} (${base.regione}) — ALLERTA METEO ROSSA: Nubifragio e Fulminazioni`,
          fenomeno:
            'Cella temporalesca intensa (WMO 96) rilevata su scala nazionale',
          valoreRilevato: `Raffiche 68 km/h · Accumulo 35 mm/h · Vento ${base.ventoKmh} km/h`,
          raccomandazioneCantiere:
            'STOP LAVORI IN QUOTA E COPERTURA: mettere in sicurezza scale, piattaforme aeree, motocondensanti e quadri esterni IP65.',
          fasciaOraria: 'Allerta Immediata Cantiere',
        },
        ...base.allerteAttive,
      ],
    };
  }, [listaCitta, cittaSelezionataId, simulazioneAllertaNazionale]);

  // Tutte le allerte attive sull'intera rete delle città d'Italia
  const tutteAllerteItalia: AllertaMeteoItem[] = React.useMemo(() => {
    if (simulazioneAllertaNazionale) {
      return CITTA_ITALIA_MONITORATE.map((c) => ({
        id: `sim-naz-${c.id}`,
        citta: c.nome,
        regione: c.regione,
        livello:
          c.id === 'vicenza' || c.id === 'milano' || c.id === 'roma'
            ? ('rossa' as const)
            : ('arancione' as const),
        titolo: `${c.nome} (${c.regione}) — Allerta Meteo Severa: Temporali e Raffiche`,
        fenomeno: 'Fronte temporalesco esteso su tutta la penisola',
        valoreRilevato: 'Raffiche > 65 km/h · Rovesci intensi',
        raccomandazioneCantiere:
          'Sospendere lavorazioni esterne in quota e mettere in sicurezza gli impianti elettrici e idrici di cantiere.',
        fasciaOraria: 'In corso',
      }));
    }
    return listaCitta.flatMap((c) => c.allerteAttive);
  }, [listaCitta, simulazioneAllertaNazionale]);

  const cittaConAllertaCount = React.useMemo(() => {
    if (simulazioneAllertaNazionale) return CITTA_ITALIA_MONITORATE.length;
    return listaCitta.filter((c) => c.allerteAttive.length > 0).length;
  }, [listaCitta, simulazioneAllertaNazionale]);

  const livelloNazionaleMassimo: LivelloAllertaMeteo = React.useMemo(() => {
    if (simulazioneAllertaNazionale) return 'rossa';
    if (tutteAllerteItalia.some((a) => a.livello === 'rossa')) return 'rossa';
    if (tutteAllerteItalia.some((a) => a.livello === 'arancione'))
      return 'arancione';
    if (tutteAllerteItalia.some((a) => a.livello === 'gialla')) return 'gialla';
    return 'verde';
  }, [tutteAllerteItalia, simulazioneAllertaNazionale]);

  const infoAttuale = descriviCodiceWmo(meteo.codiceWmoAttuale);

  const stileBadgeAllerta = () => {
    if (livelloNazionaleMassimo === 'rossa') {
      return {
        container:
          'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/60 ring-2 ring-[#ef4444]/25',
        label: `🚨 ALLERTA METEO ROSSA (${cittaConAllertaCount}/${CITTA_ITALIA_MONITORATE.length} CITTÀ ITALIA)`,
        Icona: AlertOctagon,
      };
    }
    if (livelloNazionaleMassimo === 'arancione') {
      return {
        container:
          'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/60 ring-1 ring-[#f59e0b]/25',
        label: `⚠️ ALLERTA METEO ARANCIONE (${cittaConAllertaCount} CITTÀ ITALIA)`,
        Icona: Siren,
      };
    }
    if (livelloNazionaleMassimo === 'gialla') {
      return {
        container: 'bg-amber-500/15 text-amber-300 border-amber-400/45',
        label: `⚠️ ALLERTA METEO GIALLA (${cittaConAllertaCount} CITTÀ ITALIA)`,
        Icona: AlertTriangle,
      };
    }
    return {
      container: 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40',
      label: '✅ NESSUNA ALLERTA CRITICA IN ITALIA',
      Icona: ShieldCheck,
    };
  };

  const badgeConfig = stileBadgeAllerta();
  const IconaBadge = badgeConfig.Icona;

  return (
    <section
      aria-label="Previsioni e Allerte Meteo Cantiere Vicenza e Italia"
      className={`bg-[#1a2332] border rounded-2xl p-4 sm:p-5 shadow-md space-y-4 transition-all ${
        livelloNazionaleMassimo === 'rossa'
          ? 'border-[#ef4444]/70'
          : livelloNazionaleMassimo === 'arancione'
            ? 'border-[#f59e0b]/70'
            : 'border-[#2a3a4f]'
      }`}
    >
      {/* Intestazione Widget Meteo + Indicatore Allerta Nazionale + Push Automatica */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#2a3a4f]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0f1720] border border-[#2a3a4f] flex items-center justify-center shrink-0">
            {renderIconaMeteo(meteo.codiceWmoAttuale, 'w-6 h-6')}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#f1f5f9] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#f59e0b]" />
                <span>
                  Meteo & Allerte Cantiere — {meteo.nome} ({meteo.regione}) &
                  Rete Italia
                </span>
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f59e0b] bg-[#f59e0b]/15 border border-[#f59e0b]/35 px-2 py-0.5 rounded-md">
                <BellRing className="w-3 h-3" />
                <span>
                  {impostazioniMeteo?.autoPushAllerteNazionali === false
                    ? 'Push Manuale'
                    : 'Auto-Push Allerte Attivo'}
                </span>
              </span>
              <span className="text-[11px] font-mono text-[#10b981] bg-[#0f1720] border border-[#10b981]/40 px-2 py-0.5 rounded-md">
                ItaliaMeteo ARPAE ICON-2I (7gg) · Sync{' '}
                {impostazioniMeteo?.intervalloAggiornamentoMinuti ?? 15}m ·{' '}
                {aggiornatoAlle}
              </span>
            </div>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              Controllo automatico su{' '}
              <strong className="text-[#f1f5f9]">
                {CITTA_ITALIA_MONITORATE.length} città italiane
              </strong>{' '}
              con attivazione immediata di{' '}
              <strong className="text-[#f59e0b]">
                Notifica Push Locale Prioritaria
              </strong>{' '}
              ai tecnici in caso di allerta meteo
            </p>
          </div>
        </div>

        {/* Indicatore Allerta Meteo + Pulsanti Controllo */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setMostraDettagliAllerta((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${badgeConfig.container}`}
          >
            <IconaBadge
              className={`w-4 h-4 shrink-0 ${
                livelloNazionaleMassimo === 'rossa' ||
                livelloNazionaleMassimo === 'arancione'
                  ? 'animate-pulse'
                  : ''
              }`}
            />
            <span>{badgeConfig.label}</span>
            {mostraDettagliAllerta ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMostraReteNazionale((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              mostraReteNazionale
                ? 'bg-[#f59e0b] text-[#0f1720] border-[#f59e0b]'
                : 'bg-[#0f1720] text-[#f1f5f9] hover:border-[#f59e0b]/50 border-[#2a3a4f]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Città Italia ({CITTA_ITALIA_MONITORATE.length})</span>
          </button>

          <button
            type="button"
            onClick={handleToggleSimulazioneAllertaItalia}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
              simulazioneAllertaNazionale
                ? 'bg-[#ef4444] text-white border-[#ef4444]'
                : 'bg-[#0f1720] text-[#94a3b8] hover:text-[#f59e0b] border-[#2a3a4f]'
            }`}
            title="Simula un'allerta meteo su tutte le città d'Italia e invia la notifica push prioritaria ai tecnici"
          >
            {simulazioneAllertaNazionale
              ? 'Esci Allerta Italia'
              : '⚡ Simula Allerta Italia + Push'}
          </button>

          {onApriImpostazioniMeteo && (
            <button
              type="button"
              onClick={onApriImpostazioniMeteo}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0f1720] hover:bg-slate-800 text-[#f59e0b] border border-[#f59e0b]/40 text-xs font-bold transition-colors"
              title="Apri Impostazioni Meteo & OpenWeatherMap"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Impostazioni Meteo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void caricaMeteoTutteCittaItalia(true)}
            disabled={caricamento}
            className="p-2 rounded-xl bg-[#0f1720] hover:bg-slate-800 text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] transition-colors"
            title="Ricontrolla API Meteo per tutte le città d'Italia e invia Push in caso di allerta"
          >
            <RefreshCw
              className={`w-4 h-4 ${caricamento ? 'animate-spin text-[#f59e0b]' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* BARRA SELETTORE CITTÀ ITALIANE CON STATO ALLERTA IN TEMPO REALE */}
      {mostraReteNazionale && (
        <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-[#f1f5f9]">
              Stato Meteo & Allerte nelle Principali Città d’Italia (clicca per
              ispezionare):
            </span>
            <span className="text-[11px] text-[#94a3b8]">
              🔴 Rossa · 🟠 Arancione · 🟡 Gialla · 🟢 Verde
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {listaCitta.map((c) => {
              const liv = simulazioneAllertaNazionale
                ? c.id === 'vicenza' || c.id === 'milano' || c.id === 'roma'
                  ? 'rossa'
                  : 'arancione'
                : c.livelloAllertaMassimo;
              const selezionata = c.id === cittaSelezionataId;
              const pallino =
                liv === 'rossa'
                  ? 'bg-[#ef4444]'
                  : liv === 'arancione'
                    ? 'bg-[#f59e0b]'
                    : liv === 'gialla'
                      ? 'bg-amber-400'
                      : 'bg-[#10b981]';

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCittaSelezionataId(c.id)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl border text-left text-xs transition-all ${
                    selezionata
                      ? 'bg-[#1a2332] border-[#f59e0b] ring-1 ring-[#f59e0b]/40'
                      : 'bg-[#1a2332]/60 border-[#2a3a4f] hover:border-[#94a3b8]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${pallino}`}
                    />
                    <span className="font-bold text-[#f1f5f9] truncate">
                      {c.nome}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#94a3b8] tabular-nums ml-1">
                    {c.temperaturaAttuale}°
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BANNER ALLERTE METEO RILEVATE (Città selezionata + Riepilogo Nazionale) */}
      {mostraDettagliAllerta && (
        <div className="space-y-2.5">
          {meteo.allerteAttive.length > 0 ? (
            meteo.allerteAttive.map((allerta) => {
              const isRossa = allerta.livello === 'rossa';
              const isArancione = allerta.livello === 'arancione';
              return (
                <div
                  key={allerta.id}
                  role="alert"
                  className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isRossa
                      ? 'bg-[#ef4444]/15 border-[#ef4444]/50 text-[#f1f5f9]'
                      : isArancione
                        ? 'bg-[#f59e0b]/15 border-[#f59e0b]/50 text-[#f1f5f9]'
                        : 'bg-amber-500/10 border-amber-400/40 text-[#f1f5f9]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isRossa
                          ? 'bg-[#ef4444]/25 text-[#ef4444]'
                          : 'bg-[#f59e0b]/25 text-[#f59e0b]'
                      }`}
                    >
                      {isRossa ? (
                        <AlertOctagon className="w-5 h-5 animate-pulse" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isRossa
                              ? 'bg-[#ef4444] text-white border-[#ef4444]'
                              : isArancione
                                ? 'bg-[#f59e0b] text-[#0f1720] border-[#f59e0b]'
                                : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                          }`}
                        >
                          Allerta {allerta.livello.toUpperCase()} ·{' '}
                          {allerta.fasciaOraria}
                        </span>
                        <span className="text-xs font-mono font-bold text-[#f59e0b]">
                          {allerta.valoreRilevato}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-[#f1f5f9]">
                        {allerta.titolo}
                      </h3>
                      <p className="text-xs text-[#94a3b8] leading-relaxed">
                        <strong className="text-[#f1f5f9]">
                          Protocollo Cantiere:
                        </strong>{' '}
                        {allerta.raccomandazioneCantiere}
                      </p>
                    </div>
                  </div>

                  {/* Pulsante per re-inviare manualmente la push prioritaria ai tecnici */}
                  <button
                    type="button"
                    onClick={() =>
                      inviaNotificaPushAutomaticaAllerta(
                        listaCitta.filter((c) => c.allerteAttive.length > 0),
                        simulazioneAllertaNazionale,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0f1720] hover:bg-[#f59e0b] text-[#f59e0b] hover:text-[#0f1720] border border-[#f59e0b]/40 text-xs font-extrabold transition-colors shrink-0 self-start sm:self-center"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>Invia Push ai Tecnici</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl bg-[#0f1720] border border-[#10b981]/35 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#10b981] font-bold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Nessuna allerta meteo severa su {meteo.nome} nelle prossime 48
                  ore ({cittaConAllertaCount} città italiane con avvisi attivi).
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#94a3b8]">
                Raffiche max: {meteo.rafficheMaxKmh} km/h · Pioggia:{' '}
                {meteo.precipitazioniMaxMm} mm
              </span>
            </div>
          )}
        </div>
      )}

      {/* Griglia Principale: Meteo Attuale + Fasce Orarie Cantiere + 7 Giorni */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* 1. Condizioni Attuali sulla Città Selezionata */}
        <div className="lg:col-span-4 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] block truncate">
                Adesso a {meteo.nome}
              </span>
              <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#f1f5f9] tabular-nums">
                  {meteo.temperaturaAttuale}°C
                </span>
                <span className="text-xs font-bold text-[#f59e0b]">
                  {infoAttuale.descrizione}
                </span>
              </div>
            </div>
            <div className="shrink-0">
              {renderIconaMeteo(meteo.codiceWmoAttuale, 'w-10 h-10')}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#2a3a4f] text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <Thermometer className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#94a3b8] block truncate">
                  Percepita
                </span>
                <strong className="font-mono text-[#f1f5f9] tabular-nums block truncate">
                  {meteo.temperaturaPercepita}°C
                </strong>
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#94a3b8] block truncate">
                  Umidità
                </span>
                <strong className="font-mono text-[#f1f5f9] tabular-nums block truncate">
                  {meteo.umidita}%
                </strong>
              </div>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Wind className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-[#94a3b8] block truncate">
                  Vento / Raff.
                </span>
                <strong className="font-mono text-[#f1f5f9] tabular-nums block truncate">
                  {meteo.ventoKmh}/{meteo.rafficheMaxKmh} km/h
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Fasce Orarie Turno Tecnici (08:00 - 17:00) */}
        <div className="lg:col-span-5 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8] truncate">
              Fasce Orarie Turno Cantiere ({meteo.nome})
            </span>
            <span className="text-[11px] text-[#f59e0b] font-semibold shrink-0">
              08:00 – 17:00
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {meteo.fasceOrarie.map((fascia) => (
              <div
                key={fascia.ora}
                className="bg-[#1a2332] border border-[#2a3a4f] rounded-xl p-2.5 flex flex-col items-center text-center gap-1 min-w-0"
              >
                <span className="text-[11px] font-mono font-bold text-[#94a3b8]">
                  {fascia.ora}
                </span>
                {renderIconaMeteo(fascia.codiceWmo, 'w-5 h-5')}
                <span className="text-sm font-mono font-extrabold text-[#f1f5f9] tabular-nums">
                  {fascia.temperatura}°
                </span>
                <span className="text-[10px] font-mono text-sky-400 tabular-nums">
                  💧 {fascia.probabilitaPioggia}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Previsioni a 7 Giorni (Modello ItaliaMeteo ARPAE ICON-2I) */}
        <div className="lg:col-span-3 min-w-0 bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
              Previsioni 7 Giorni ({meteo.nome})
            </span>
            <span className="text-[10px] font-mono text-[#10b981]">
              ICON-2I
            </span>
          </div>

          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            {meteo.prossimiGiorni.slice(0, 7).map((gg) => (
              <div
                key={gg.dataIso}
                className="flex items-center justify-between text-xs bg-[#1a2332] border border-[#2a3a4f] rounded-lg px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  {renderIconaMeteo(gg.codiceWmo, 'w-4 h-4')}
                  <span className="font-bold text-[#f1f5f9]">
                    {gg.etichettaGiorno}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums">
                  <span className="text-[11px] text-sky-400">
                    💧{gg.probabilitaPioggiaMax}%
                  </span>
                  <span className="text-[#94a3b8]">{gg.tempMin}°</span>
                  <span className="font-extrabold text-[#f59e0b]">
                    {gg.tempMax}°
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
