/**
 * StreamVerse — Catalogo Contenuti (36 titoli originali tra Film e Serie TV)
 * Ogni oggetto include: id, titolo, descrizione, anno, durata, genere, rating,
 * immagine, trailer, tipo ('film' | 'serie'), cast, regista, etaConsigliata,
 * matchScore, top10Rank, progressPercent, isNewRelease, isTrending, isAction,
 * e posterSvgDataUrl generato dinamicamente per garantire zero immagini rotte.
 */

export interface StreamVerseItem {
  id: string;
  titolo: string;
  sottotitolo?: string;
  descrizione: string;
  anno: number;
  durata: string;
  genere: string;
  generiSecondari: string[];
  rating: string; // es. "98% Compatibile" o "IMDb 8.9"
  etaConsigliata: string; // es. "VM14", "16+", "12+", "T"
  qualita: '4K Ultra HD' | 'Dolby Vision' | 'HDR10+';
  immagine: string;
  backdropImage?: string;
  trailer: string;
  tipo: 'film' | 'serie';
  cast: string[];
  regista: string;
  stagioni?: number;
  episodiTotali?: number;
  isFeaturedHero?: boolean;
  isTrending?: boolean;
  isNewRelease?: boolean;
  top10Rank?: number; // 1..10
  continueWatchingProgress?: number; // 15..90 (%)
  continueWatchingEpisode?: string; // es. "S2:E4 - Il Punto di Non Ritorno"
  isRecommended?: boolean;
  isAction?: boolean;
  accentColor: string;
}

export interface StreamVerseProfile {
  id: string;
  name: string;
  avatarColor: string;
  avatarInitials: string;
  isKids: boolean;
  maturityLevel: string;
}

export const STREAMVERSE_PROFILES: StreamVerseProfile[] = [
  {
    id: 'alessandro',
    name: 'Alessandro',
    avatarColor: '#E50914',
    avatarInitials: 'AL',
    isKids: false,
    maturityLevel: 'Tutti i contenuti (18+)',
  },
  {
    id: 'elena',
    name: 'Elena',
    avatarColor: '#00A8E1',
    avatarInitials: 'EL',
    isKids: false,
    maturityLevel: 'Tutti i contenuti (18+)',
  },
  {
    id: 'cinema-room',
    name: 'Sala Cinema 4K',
    avatarColor: '#D97706',
    avatarInitials: '4K',
    isKids: false,
    maturityLevel: 'Tutti i contenuti (18+)',
  },
  {
    id: 'kids',
    name: 'Bambini',
    avatarColor: '#10B981',
    avatarInitials: 'JR',
    isKids: true,
    maturityLevel: 'Fino a 12+',
  },
];

// Immagini reali ad alta risoluzione generate localmente
const IMG_HERO_SCIFI = '/src/assets/images/streamverse_hero_scifi_1791759363174.jpg';
const IMG_HERO_THRILLER = '/src/assets/images/streamverse_hero_thriller_1791759372049.jpg';
const IMG_HERO_FANTASY = '/src/assets/images/streamverse_hero_fantasy_1791759381468.jpg';
const IMG_HERO_ACTION = '/src/assets/images/streamverse_hero_action_1791759390091.jpg';
const IMG_CARD_HEIST = '/src/assets/images/streamverse_card_cyber_heist_1791759398424.jpg';
const IMG_CARD_OCEAN = '/src/assets/images/streamverse_card_deep_ocean_1791759409224.jpg';

/**
 * Genera una key art cinematografica 16:9 in SVG Data URI per i titoli che
 * utilizzano artwork vettoriale procedurale ad alto contrasto o come fallback.
 */
export function buildCinematicArtworkDataUri(
  title: string,
  genre: string,
  year: number,
  primaryHex: string,
  secondaryHex: string,
  index: number,
): string {
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeGenre = genre.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const orbX = 200 + ((index * 137) % 880);
  const orbY = 120 + ((index * 93) % 420);
  const horizonY = 460 + ((index * 29) % 90);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
    <defs>
      <linearGradient id="bg-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#07070b"/>
        <stop offset="52%" stop-color="${primaryHex}"/>
        <stop offset="100%" stop-color="#09090f"/>
      </linearGradient>
      <radialGradient id="glow-${index}" cx="${orbX}" cy="${orbY}" r="460" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${secondaryHex}" stop-opacity="0.55"/>
        <stop offset="55%" stop-color="${primaryHex}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="scrim-${index}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.25"/>
        <stop offset="60%" stop-color="#000000" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#08080c" stop-opacity="0.95"/>
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#bg-${index})"/>
    <circle cx="${orbX}" cy="${orbY}" r="440" fill="url(#glow-${index})"/>
    <path d="M 0 ${horizonY} Q 360 ${horizonY - 90} 720 ${horizonY + 20} T 1280 ${horizonY - 40} L 1280 720 L 0 720 Z" fill="#050508" fill-opacity="0.65"/>
    <line x1="80" y1="${horizonY - 120}" x2="1200" y2="${horizonY - 120}" stroke="${secondaryHex}" stroke-opacity="0.18" stroke-width="1"/>
    <rect width="1280" height="720" fill="url(#scrim-${index})"/>
    <g transform="translate(84, 520)">
      <text x="0" y="0" fill="${secondaryHex}" font-family="Oswald, sans-serif" font-size="20" font-weight="600" letter-spacing="4">${safeGenre.toUpperCase()} · ${year}</text>
      <text x="0" y="56" fill="#F8FAFC" font-family="Oswald, sans-serif" font-size="52" font-weight="700" letter-spacing="1">${safeTitle}</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Pool delle 6 fotografie cinematografiche reali ad alta definizione
export const REAL_CINEMA_STILLS = [
  IMG_HERO_SCIFI,
  IMG_HERO_THRILLER,
  IMG_HERO_FANTASY,
  IMG_HERO_ACTION,
  IMG_CARD_HEIST,
  IMG_CARD_OCEAN,
];

export const STREAMVERSE_CATALOG: StreamVerseItem[] = [
  // ============================================================================
  // 4 CONTENUTI HERO IN EVIDENZA (Auto-rotazione ogni 8 secondi)
  // ============================================================================
  {
    id: 'sv-01',
    titolo: 'Orizzonte Kronos',
    sottotitolo: 'Oltre l’ultimo anello orbitale inizia la vera missione',
    descrizione:
      'Isolata attorno al gigante ghiacciato Kronos-9, la comandante Elodie Vance intercetta un segnale radio proveniente da una colonia scomparsa quarant’anni prima.',
    anno: 2026,
    durata: '2h 28m',
    genere: 'Fantascienza',
    generiSecondari: ['Thriller Spaziale', 'Drammatico'],
    rating: '99% Compatibile',
    etaConsigliata: '14+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_SCIFI,
    backdropImage: IMG_HERO_SCIFI,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tipo: 'film',
    cast: ['Elena Sofia Ricci', 'Luca Marinelli', 'Léa Seydoux', 'Mads Mikkelsen'],
    regista: 'Denis Villeneuve & Matteo Rovere',
    isFeaturedHero: true,
    isTrending: true,
    isNewRelease: true,
    top10Rank: 1,
    continueWatchingProgress: 68,
    isRecommended: true,
    accentColor: '#00A8E1',
  },
  {
    id: 'sv-02',
    titolo: 'Ombre sui Navigli',
    sottotitolo: 'Ogni segreto lascia un riflesso sull’acqua',
    descrizione:
      'In una Milano avvolta dalla nebbia autunnale, il commissario Valerio Serra indaga su una serie di sparizioni legate all’alta finanza internazionale.',
    anno: 2026,
    durata: '2 Stagioni',
    genere: 'Noir Crime',
    generiSecondari: ['Mistero', 'Thriller Psicologico'],
    rating: '97% Compatibile',
    etaConsigliata: 'VM14',
    qualita: 'Dolby Vision',
    immagine: IMG_HERO_THRILLER,
    backdropImage: IMG_HERO_THRILLER,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tipo: 'serie',
    stagioni: 2,
    episodiTotali: 16,
    cast: ['Pierfrancesco Favino', 'Miriam Leone', 'Toni Servillo', 'Valeria Golino'],
    regista: 'Stefano Sollima',
    isFeaturedHero: true,
    isTrending: true,
    isNewRelease: true,
    top10Rank: 2,
    continueWatchingProgress: 42,
    continueWatchingEpisode: 'S2:E5 · La Cifra Silenziosa',
    isRecommended: true,
    accentColor: '#E50914',
  },
  {
    id: 'sv-03',
    titolo: 'La Cittadella di Cenere',
    sottotitolo: 'Il giuramento del Nord non si spezza',
    descrizione:
      'Mentre l’aurora cremisi annuncia un inverno lungo dieci anni, tre casate rivali devono difendere la fortezza di Valdris dall’avanzata delle legioni d’ombra.',
    anno: 2025,
    durata: '3 Stagioni',
    genere: 'Fantasy Epico',
    generiSecondari: ['Avventura', 'Azione'],
    rating: '96% Compatibile',
    etaConsigliata: '16+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_FANTASY,
    backdropImage: IMG_HERO_FANTASY,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tipo: 'serie',
    stagioni: 3,
    episodiTotali: 24,
    cast: ['Alessandro Borghi', 'Matilda De Angelis', 'Richard Madden', 'Eva Green'],
    regista: 'Alik Sakharov',
    isFeaturedHero: true,
    isTrending: true,
    top10Rank: 3,
    isRecommended: true,
    accentColor: '#E50914',
  },
  {
    id: 'sv-04',
    titolo: 'Redline Canyon',
    sottotitolo: 'Zero freni. Un solo varco oltre il confine.',
    descrizione:
      'Un ex collaudatore clandestino accetta un’ultima corsa attraverso i canyon del Nevada per salvare il fratello da un cartello di trafficanti.',
    anno: 2026,
    durata: '2h 09m',
    genere: 'Azione',
    generiSecondari: ['Adrenalina', 'Crime'],
    rating: '95% Compatibile',
    etaConsigliata: '14+',
    qualita: 'HDR10+',
    immagine: IMG_HERO_ACTION,
    backdropImage: IMG_HERO_ACTION,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tipo: 'film',
    cast: ['Stefano Accorsi', 'Ana de Armas', 'Jon Bernthal', 'Riccardo Scamarcio'],
    regista: 'George Miller & Gabriele Mainetti',
    isFeaturedHero: true,
    isTrending: true,
    isNewRelease: true,
    top10Rank: 4,
    continueWatchingProgress: 84,
    isAction: true,
    accentColor: '#F59E0B',
  },

  // ============================================================================
  // ALTRI 32 TITOLI DEL CATALOGO (Totale 36 contenuti)
  // ============================================================================
  {
    id: 'sv-05',
    titolo: 'Protocollo Valchiria',
    descrizione:
      'Una squadra di specialisti in sicurezza informatica tenta il colpo del secolo nel caveau quantistico della Banca Centrale di Zurigo.',
    anno: 2026,
    durata: '2h 14m',
    genere: 'Azione',
    generiSecondari: ['Cyber Thriller', 'Heist'],
    rating: '96% Compatibile',
    etaConsigliata: '14+',
    qualita: '4K Ultra HD',
    immagine: IMG_CARD_HEIST,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    tipo: 'film',
    cast: ['Marco D’Amore', 'Benedetta Porcaroli', 'Daniel Brühl'],
    regista: 'Michael Mann',
    isTrending: true,
    isNewRelease: true,
    top10Rank: 5,
    continueWatchingProgress: 29,
    isRecommended: true,
    isAction: true,
    accentColor: '#E50914',
  },
  {
    id: 'sv-06',
    titolo: 'Abisso Bioluminescente',
    descrizione:
      'Spedizione documentaristica in 8K a undicimila metri di profondità nella Fossa delle Marianne, tra ecosistemi mai osservati prima dall’uomo.',
    anno: 2025,
    durata: '1 Stagione',
    genere: 'Documentario',
    generiSecondari: ['Natura', 'Scienza'],
    rating: '94% Compatibile',
    etaConsigliata: 'T',
    qualita: 'Dolby Vision',
    immagine: IMG_CARD_OCEAN,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    tipo: 'serie',
    stagioni: 1,
    episodiTotali: 6,
    cast: ['Alberto Angela', 'Sylvia Earle', 'Laurent Ballesta'],
    regista: 'James Cameron',
    isTrending: true,
    top10Rank: 6,
    isRecommended: true,
    accentColor: '#00A8E1',
  },
  {
    id: 'sv-07',
    titolo: 'Codice Montecristo',
    descrizione:
      'Tradito dai propri soci durante un’acquisizione miliardaria a Ginevra, un ingegnere navale ritorna sotto falsa identità per smantellare l’impero che lo ha distrutto.',
    anno: 2026,
    durata: '1 Stagione',
    genere: 'Drammatico',
    generiSecondari: ['Thriller', 'Revenge'],
    rating: '95% Compatibile',
    etaConsigliata: '14+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_THRILLER,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tipo: 'serie',
    stagioni: 1,
    episodiTotali: 8,
    cast: ['Luca Argentero', 'Greta Scarano', 'Claudio Santamaria'],
    regista: 'Paolo Sorrentino',
    isTrending: true,
    isNewRelease: true,
    top10Rank: 7,
    continueWatchingProgress: 55,
    continueWatchingEpisode: 'S1:E6 · Il Conto Cifrato',
    isRecommended: true,
    accentColor: '#E50914',
  },
  {
    id: 'sv-08',
    titolo: 'Vento su Tokyo',
    descrizione:
      'Due piloti collaudatori si sfidano lungo l’autostrada sopraelevata Wangan di Tokyo a bordo di prototipi ibridi da 1000 cavalli.',
    anno: 2025,
    durata: '1h 58m',
    genere: 'Azione',
    generiSecondari: ['Sportivo', 'Adrenalina'],
    rating: '92% Compatibile',
    etaConsigliata: '12+',
    qualita: 'HDR10+',
    immagine: IMG_HERO_ACTION,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tipo: 'film',
    cast: ['Ken Watanabe', 'Hiroyuki Sanada', 'Luigi Lo Cascio'],
    regista: 'Justin Lin',
    top10Rank: 8,
    isAction: true,
    accentColor: '#F59E0B',
  },
  {
    id: 'sv-09',
    titolo: 'Il Trono di Vetro',
    descrizione:
      'Nella Venezia del XVI secolo, una maestra vetraia di Murano custodisce la formula alchemica capace di cambiare gli equilibri militari del Mediterraneo.',
    anno: 2026,
    durata: '2 Stagioni',
    genere: 'Storico',
    generiSecondari: ['Drammatico', 'Intrigo'],
    rating: '93% Compatibile',
    etaConsigliata: '14+',
    qualita: 'Dolby Vision',
    immagine: IMG_HERO_FANTASY,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tipo: 'serie',
    stagioni: 2,
    episodiTotali: 14,
    cast: ['Alba Rohrwacher', 'Elio Germano', 'Willem Dafoe'],
    regista: 'Matteo Garrone',
    isNewRelease: true,
    top10Rank: 9,
    isRecommended: true,
    accentColor: '#D97706',
  },
  {
    id: 'sv-10',
    titolo: 'Ultima Orbita',
    descrizione:
      'Durante una tempesta solare senza precedenti, l’equipaggio di una stazione lunare deve compiere un rientro manuale a gravità zero senza supporto da Terra.',
    anno: 2025,
    durata: '2h 06m',
    genere: 'Fantascienza',
    generiSecondari: ['Azione', 'Survival'],
    rating: '91% Compatibile',
    etaConsigliata: '12+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_SCIFI,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tipo: 'film',
    cast: ['Cillian Murphy', 'Rebecca Ferguson', 'Favino'],
    regista: 'Alfonso Cuarón',
    top10Rank: 10,
    continueWatchingProgress: 19,
    isAction: true,
    accentColor: '#00A8E1',
  },
  {
    id: 'sv-11',
    titolo: 'Operazione Dolomiti',
    descrizione:
      'Un reparto d’élite del soccorso alpino si ritrova isolato a 3.200 metri quando una valanga artificiale nasconde il recupero di un satellite militare.',
    anno: 2026,
    durata: '2h 02m',
    genere: 'Azione',
    generiSecondari: ['Thriller', 'Avventura'],
    rating: '94% Compatibile',
    etaConsigliata: '14+',
    qualita: '4K Ultra HD',
    immagine: IMG_CARD_HEIST,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tipo: 'film',
    cast: ['Giuseppe Battiston', 'Silvio Orlando', 'Vicky Krieps'],
    regista: 'Claudio Giovannesi',
    isNewRelease: true,
    isAction: true,
    accentColor: '#0284C7',
  },
  {
    id: 'sv-12',
    titolo: 'Sinfonia Notturna',
    descrizione:
      'Una direttrice d’orchestra di fama mondiale scopre una partitura inedita a Vienna che cela un messaggio in codice risalente alla Guerra Fredda.',
    anno: 2025,
    durata: '2h 18m',
    genere: 'Thriller',
    generiSecondari: ['Drammatico', 'Musica'],
    rating: '90% Compatibile',
    etaConsigliata: '12+',
    qualita: 'Dolby Vision',
    immagine: IMG_HERO_THRILLER,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    tipo: 'film',
    cast: ['Cate Blanchett', 'Jasmine Trinca', 'August Diehl'],
    regista: 'Todd Field',
    isRecommended: true,
    accentColor: '#7C3AED',
  },
  {
    id: 'sv-13',
    titolo: 'Cyberia 2099',
    descrizione:
      'In una megalopoli artica alimentata da reattori geotermici, un investigatore sintetico indaga sul primo caso di memoria sognata da un androide.',
    anno: 2026,
    durata: '2 Stagioni',
    genere: 'Fantascienza',
    generiSecondari: ['Cyberpunk', 'Noir'],
    rating: '96% Compatibile',
    etaConsigliata: '16+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_SCIFI,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tipo: 'serie',
    stagioni: 2,
    episodiTotali: 18,
    cast: ['Alexander Skarsgård', 'Matilda De Angelis', 'Dev Patel'],
    regista: 'Alex Garland',
    isTrending: true,
    isNewRelease: true,
    isRecommended: true,
    accentColor: '#06B6D4',
  },
  {
    id: 'sv-14',
    titolo: 'L’Ultimo Convoglio',
    descrizione:
      'Un treno blindato ad alta velocità che trasporta riserve auree europee viene dirottato lungo il tunnel del Gottardo. Solo un agente di scorta può fermarlo.',
    anno: 2025,
    durata: '1h 54m',
    genere: 'Azione',
    generiSecondari: ['Suspense', 'Crime'],
    rating: '93% Compatibile',
    etaConsigliata: '14+',
    qualita: 'HDR10+',
    immagine: IMG_HERO_ACTION,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tipo: 'film',
    cast: ['Idris Elba', 'Vincent Cassel', 'Kasia Smutniak'],
    regista: 'David Leitch',
    isAction: true,
    continueWatchingProgress: 73,
    accentColor: '#E50914',
  },
  {
    id: 'sv-15',
    titolo: 'Accademia Aurelia',
    descrizione:
      'Dietro i cancelli dorati del collegio più esclusivo delle Alpi svizzere, una borsa di studio porta alla luce una società segreta secolare.',
    anno: 2026,
    durata: '3 Stagioni',
    genere: 'Mistero',
    generiSecondari: ['Drama', 'Young Adult'],
    rating: '89% Compatibile',
    etaConsigliata: '14+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_FANTASY,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tipo: 'serie',
    stagioni: 3,
    episodiTotali: 24,
    cast: ['Alice Pagani', 'Lorenzo Zurzolo', 'Louis Hofmann'],
    regista: 'Luca Guadagnino',
    isNewRelease: true,
    accentColor: '#EC4899',
  },
  {
    id: 'sv-16',
    titolo: 'Furia su Asfalto',
    descrizione:
      'Nella Napoli sotterranea delle corse clandestine notturne, una giovane meccanica costruisce un motore sperimentale per sfidare il campione imbattuto.',
    anno: 2025,
    durata: '2h 04m',
    genere: 'Azione',
    generiSecondari: ['Motori', 'Drammatico'],
    rating: '91% Compatibile',
    etaConsigliata: '12+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_ACTION,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tipo: 'film',
    cast: ['Serena Rossi', 'Massimiliano Caiazzo', 'Alessandro Gassmann'],
    regista: 'Matteo Rovere',
    isAction: true,
    isRecommended: true,
    accentColor: '#F97316',
  },
  {
    id: 'sv-17',
    titolo: 'Archivio Vaticano Zero',
    descrizione:
      'Un paleografo viene convocato nel cuore della notte per decifrare un manoscritto rinvenuto sotto la Basilica, dando inizio a una corsa contro il tempo a Roma.',
    anno: 2026,
    durata: '1 Stagione',
    genere: 'Thriller',
    generiSecondari: ['Storico', 'Mistero'],
    rating: '95% Compatibile',
    etaConsigliata: '14+',
    qualita: 'Dolby Vision',
    immagine: IMG_HERO_THRILLER,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tipo: 'serie',
    stagioni: 1,
    episodiTotali: 10,
    cast: ['Toni Servillo', 'Jude Law', 'Silvio Muccino'],
    regista: 'Paolo Sorrentino',
    isTrending: true,
    isNewRelease: true,
    accentColor: '#EAB308',
  },
  {
    id: 'sv-18',
    titolo: 'Pianeta Silenzioso',
    descrizione:
      'Un botanico rimasto solo su una biosfera orbitale scopre che la flora aliena sta sviluppando una rete neurale collettiva capace di comunicare.',
    anno: 2025,
    durata: '2h 11m',
    genere: 'Fantascienza',
    generiSecondari: ['Drammatico', 'Esplorazione'],
    rating: '93% Compatibile',
    etaConsigliata: 'T',
    qualita: '4K Ultra HD',
    immagine: IMG_CARD_OCEAN,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tipo: 'film',
    cast: ['Oscar Isaac', 'Alba Rohrwacher', 'Tilda Swinton'],
    regista: 'Denis Villeneuve',
    isRecommended: true,
    accentColor: '#10B981',
  },
  {
    id: 'sv-19',
    titolo: 'Squadra Ombra: Berlino',
    descrizione:
      'Esfiltrazione ad alto rischio in una Berlino divisa da una guerra cibernetica: 48 ore per recuperare la lista degli agenti dormienti in Europa.',
    anno: 2026,
    durata: '2h 08m',
    genere: 'Azione',
    generiSecondari: ['Spionaggio', 'Thriller'],
    rating: '94% Compatibile',
    etaConsigliata: '16+',
    qualita: '4K Ultra HD',
    immagine: IMG_CARD_HEIST,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    tipo: 'film',
    cast: ['Michael Fassbender', 'Alicia Vikander', 'Adriano Giannini'],
    regista: 'Paul Greengrass',
    isAction: true,
    isNewRelease: true,
    accentColor: '#E50914',
  },
  {
    id: 'sv-20',
    titolo: 'I Guardiani del Faro',
    descrizione:
      'Su un’isola vulcanica dell’Atlantico, tre guardiani del faro affrontano una tempesta perfetta mentre una nave fantasma si arena sulla scogliera.',
    anno: 2024,
    durata: '1h 59m',
    genere: 'Mistero',
    generiSecondari: ['Thriller Psicologico', 'Drammatico'],
    rating: '88% Compatibile',
    etaConsigliata: '14+',
    qualita: 'Dolby Vision',
    immagine: IMG_CARD_OCEAN,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tipo: 'film',
    cast: ['Willem Dafoe', 'Robert Pattinson', 'Valeria Bruni Tedeschi'],
    regista: 'Robert Eggers',
    accentColor: '#0284C7',
  },
  {
    id: 'sv-21',
    titolo: 'Ristorante Mezzanotte',
    descrizione:
      'Un piccolo bistrot nel cuore di Torino apre solo da mezzanotte all’alba, accogliendo clienti le cui vite si intrecciano attraverso piatti dimenticati.',
    anno: 2025,
    durata: '4 Stagioni',
    genere: 'Drammatico',
    generiSecondari: ['Commedia', 'Antologia'],
    rating: '97% Compatibile',
    etaConsigliata: 'T',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_THRILLER,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    tipo: 'serie',
    stagioni: 4,
    episodiTotali: 40,
    cast: ['Valerio Mastandrea', 'Paola Cortellesi', 'Neri Marcorè'],
    regista: 'Giuseppe Tornatore',
    continueWatchingProgress: 61,
    continueWatchingEpisode: 'S4:E3 · Risotto allo Zafferano',
    isRecommended: true,
    accentColor: '#F59E0B',
  },
  {
    id: 'sv-22',
    titolo: 'Impatto Balistico',
    descrizione:
      'Un ex artificiere dei reparti speciali deve disinnescare una rete di ordigni sincronizzati sui ponti principali di Londra durante il vertice G20.',
    anno: 2026,
    durata: '1h 56m',
    genere: 'Azione',
    generiSecondari: ['Crime', 'Adrenalina'],
    rating: '92% Compatibile',
    etaConsigliata: '16+',
    qualita: 'HDR10+',
    immagine: IMG_CARD_HEIST,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tipo: 'film',
    cast: ['Tom Hardy', 'Cillian Murphy', 'Edoardo Leo'],
    regista: 'Christopher McQuarrie',
    isAction: true,
    isTrending: true,
    accentColor: '#E50914',
  },
  {
    id: 'sv-23',
    titolo: 'Le Cronache di Elbaf',
    descrizione:
      'Un giovane cartografo intraprende un viaggio a bordo di un vascello volante oltre le colonne di ghiaccio dove dimorano gli antichi draghi del nord.',
    anno: 2025,
    durata: '2 Stagioni',
    genere: 'Fantasy Epico',
    generiSecondari: ['Avventura', 'Famiglia'],
    rating: '94% Compatibile',
    etaConsigliata: '12+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_FANTASY,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tipo: 'serie',
    stagioni: 2,
    episodiTotali: 16,
    cast: ['Dev Patel', 'Saoirse Ronan', 'Pietro Castellitto'],
    regista: 'Guillermo del Toro',
    isRecommended: true,
    accentColor: '#8B5CF6',
  },
  {
    id: 'sv-24',
    titolo: 'Scacco al Re',
    descrizione:
      'Da un orfanotrofio di Bologna ai tornei internazionali di Mosca: l’ascesa magnetica di una prodigiosa giocatrice di scacchi negli anni Settanta.',
    anno: 2024,
    durata: '1 Stagione',
    genere: 'Drammatico',
    generiSecondari: ['Biografico', 'Storico'],
    rating: '98% Compatibile',
    etaConsigliata: '12+',
    qualita: 'Dolby Vision',
    immagine: IMG_HERO_THRILLER,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    tipo: 'serie',
    stagioni: 1,
    episodiTotali: 7,
    cast: ['Anya Taylor-Joy', 'Margherita Mazzucco', 'Elena Radonicich'],
    regista: 'Scott Frank',
    isRecommended: true,
    accentColor: '#D97706',
  },
  {
    id: 'sv-25',
    titolo: 'Orizzonte Eventi',
    descrizione:
      'La prima nave dotata di propulsione a curvatura riappare nell’orbita di Nettuno dopo sette anni di silenzio radio, ma a bordo il tempo scorre al contrario.',
    anno: 2026,
    durata: '2h 22m',
    genere: 'Fantascienza',
    generiSecondari: ['Mistero', 'Thriller'],
    rating: '95% Compatibile',
    etaConsigliata: '14+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_SCIFI,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tipo: 'film',
    cast: ['Matthew McConaughey', 'Jessica Chastain', 'Luca Marinelli'],
    regista: 'Christopher Nolan',
    isNewRelease: true,
    isTrending: true,
    accentColor: '#00A8E1',
  },
  {
    id: 'sv-26',
    titolo: 'Brigata Folgore: Deserto Rosso',
    descrizione:
      'Una pattuglia rimasta tagliata fuori dalle comunicazioni attraversa 300 chilometri di deserto ostile per portare in salvo un convoglio umanitario.',
    anno: 2025,
    durata: '2h 15m',
    genere: 'Azione',
    generiSecondari: ['Guerra', 'Drammatico'],
    rating: '91% Compatibile',
    etaConsigliata: '16+',
    qualita: 'HDR10+',
    immagine: IMG_HERO_ACTION,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tipo: 'film',
    cast: ['Elio Germano', 'Alessandro Borghi', 'Jake Gyllenhaal'],
    regista: 'Sam Mendes',
    isAction: true,
    accentColor: '#D97706',
  },
  {
    id: 'sv-27',
    titolo: 'L’Algoritmo di Dio',
    descrizione:
      'Una ricercatrice del CERN di Ginevra scopre uno schema matematico nascosto nelle collisioni subatomiche che sembra anticipare i mercati globali.',
    anno: 2026,
    durata: '1 Stagione',
    genere: 'Thriller',
    generiSecondari: ['Scienza', 'Spionaggio'],
    rating: '93% Compatibile',
    etaConsigliata: '12+',
    qualita: '4K Ultra HD',
    immagine: IMG_CARD_HEIST,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tipo: 'serie',
    stagioni: 1,
    episodiTotali: 8,
    cast: ['Léa Seydoux', 'Fabrizio Gifuni', 'Stellan Skarsgård'],
    regista: 'Baran bo Odar',
    isNewRelease: true,
    accentColor: '#06B6D4',
  },
  {
    id: 'sv-28',
    titolo: 'Oceano Artico: Sotto il Ghiaccio',
    descrizione:
      'Un sottomarino scientifico rimane intrappolato sotto la calotta polare artica e scopre una caverna termale preistorica perfettamente conservata.',
    anno: 2025,
    durata: '1h 52m',
    genere: 'Avventura',
    generiSecondari: ['Fantascienza', 'Azione'],
    rating: '90% Compatibile',
    etaConsigliata: '12+',
    qualita: 'Dolby Vision',
    immagine: IMG_CARD_OCEAN,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    tipo: 'film',
    cast: ['Mads Mikkelsen', 'Noomi Rapace', 'Marco Giallini'],
    regista: 'Baltasar Kormákur',
    isAction: true,
    accentColor: '#00A8E1',
  },
  {
    id: 'sv-29',
    titolo: 'Dinastia Medicea: Il Sangue e l’Oro',
    descrizione:
      'Intrighi bancari, congiure di palazzo e capolavori immortali nella Firenze rinascimentale durante gli anni più turbolenti della Repubblica.',
    anno: 2024,
    durata: '3 Stagioni',
    genere: 'Storico',
    generiSecondari: ['Drammatico', 'Politico'],
    rating: '96% Compatibile',
    etaConsigliata: '14+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_FANTASY,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tipo: 'serie',
    stagioni: 3,
    episodiTotali: 24,
    cast: ['Dustin Hoffman', 'Miriam Leone', 'Alessandra Mastronardi'],
    regista: 'Sergio Mimica-Gezzan',
    isRecommended: true,
    accentColor: '#EAB308',
  },
  {
    id: 'sv-30',
    titolo: 'Rapina alla Zecca',
    descrizione:
      'Otto sconosciuti reclutati da uno stratega enigmatico si barricano nel Poligrafico dello Stato per stampare due miliardi di euro non tracciabili.',
    anno: 2025,
    durata: '5 Stagioni',
    genere: 'Azione',
    generiSecondari: ['Heist', 'Thriller'],
    rating: '99% Compatibile',
    etaConsigliata: '14+',
    qualita: '4K Ultra HD',
    immagine: IMG_CARD_HEIST,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    tipo: 'serie',
    stagioni: 5,
    episodiTotali: 41,
    cast: ['Álvaro Morte', 'Úrsula Corberó', 'Pedro Alonso', 'Matilde Gioli'],
    regista: 'Álex Pina',
    isTrending: true,
    isAction: true,
    continueWatchingProgress: 88,
    continueWatchingEpisode: 'S5:E8 · L’Oro Liquido',
    isRecommended: true,
    accentColor: '#E50914',
  },
  {
    id: 'sv-31',
    titolo: 'Echi da Marte',
    descrizione:
      'I primi coloni della base Ares IV affrontano una tempesta di sabbia globale che isola il biodomo centrale dal resto della spedizione.',
    anno: 2026,
    durata: '2 Stagioni',
    genere: 'Fantascienza',
    generiSecondari: ['Survival', 'Drammatico'],
    rating: '92% Compatibile',
    etaConsigliata: '12+',
    qualita: 'HDR10+',
    immagine: IMG_HERO_SCIFI,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tipo: 'serie',
    stagioni: 2,
    episodiTotali: 16,
    cast: ['Matt Damon', 'Jessica Chastain', 'Giuseppe Fiorello'],
    regista: 'Ridley Scott',
    isNewRelease: true,
    accentColor: '#F97316',
  },
  {
    id: 'sv-32',
    titolo: 'Sorpasso al Limite',
    descrizione:
      'Dietro le quinte del campionato mondiale Endurance: rivalità, ingegneria estrema e la leggendaria 24 Ore sotto il diluvio notturno.',
    anno: 2025,
    durata: '2h 25m',
    genere: 'Azione',
    generiSecondari: ['Sportivo', 'Biografico'],
    rating: '95% Compatibile',
    etaConsigliata: 'T',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_ACTION,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tipo: 'film',
    cast: ['Christian Bale', 'Caitríona Balfe', 'Favino'],
    regista: 'James Mangold',
    isAction: true,
    isRecommended: true,
    accentColor: '#E50914',
  },
  {
    id: 'sv-33',
    titolo: 'Il Segreto del Lago Nero',
    descrizione:
      'Quando il livello di un bacino artificiale in Alto Adige si abbassa, riemerge il campanile di un borgo sommerso insieme a una verità taciuta da decenni.',
    anno: 2024,
    durata: '2 Stagioni',
    genere: 'Mistero',
    generiSecondari: ['Soprannaturale', 'Thriller'],
    rating: '89% Compatibile',
    etaConsigliata: '14+',
    qualita: 'Dolby Vision',
    immagine: IMG_HERO_THRILLER,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    tipo: 'serie',
    stagioni: 2,
    episodiTotali: 14,
    cast: ['Valeria Bilello', 'Fabrizio Ferracane', 'forti'],
    regista: 'Fabio Mollo',
    accentColor: '#0284C7',
  },
  {
    id: 'sv-34',
    titolo: 'Cielo d’Acciaio',
    descrizione:
      'Due piloti di caccia intercettori supersonici vengono inviati in missione non ufficiale oltre la stratosfera per neutralizzare un satellite fuori controllo.',
    anno: 2026,
    durata: '2h 10m',
    genere: 'Azione',
    generiSecondari: ['Aviazione', 'Thriller'],
    rating: '96% Compatibile',
    etaConsigliata: '12+',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_SCIFI,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tipo: 'film',
    cast: ['Miles Teller', 'Glen Powell', 'Alessandro Tersigni'],
    regista: 'Joseph Kosinski',
    isAction: true,
    isNewRelease: true,
    isTrending: true,
    accentColor: '#00A8E1',
  },
  {
    id: 'sv-35',
    titolo: 'I Sette Sigilli di Amalfi',
    descrizione:
      'Un restauratore d’arte e una storica navale seguono una mappa nautica medievale lungo la Costiera Amalfitana alla ricerca del tesoro della Repubblica Marinara.',
    anno: 2025,
    durata: '2h 01m',
    genere: 'Avventura',
    generiSecondari: ['Azione', 'Mistero'],
    rating: '90% Compatibile',
    etaConsigliata: 'T',
    qualita: '4K Ultra HD',
    immagine: IMG_HERO_FANTASY,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tipo: 'film',
    cast: ['Raoul Bova', 'Miriam Leone', 'Jean Reno'],
    regista: 'Gabriele Salvatores',
    isAction: true,
    accentColor: '#10B981',
  },
  {
    id: 'sv-36',
    titolo: 'Blu Profondo: Santuario Pelagos',
    descrizione:
      'Un viaggio visivo straordinario tra i capodogli e le balenottere comuni del Mar Ligure, girato con telecamere subacquee a luce naturale.',
    anno: 2026,
    durata: '1h 45m',
    genere: 'Documentario',
    generiSecondari: ['Natura', 'Famiglia'],
    rating: '95% Compatibile',
    etaConsigliata: 'T',
    qualita: 'Dolby Vision',
    immagine: IMG_CARD_OCEAN,
    trailer: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    tipo: 'film',
    cast: ['Folco Quilici', 'Alberto Angela'],
    regista: 'Luc Jacquet',
    isNewRelease: true,
    isRecommended: true,
    accentColor: '#00A8E1',
  },
];

// Helper per ottenere i contenuti filtrati per riga / categoria
export function getHeroItems(): StreamVerseItem[] {
  return STREAMVERSE_CATALOG.filter((item) => item.isFeaturedHero);
}

export function getTrendingItems(): StreamVerseItem[] {
  return STREAMVERSE_CATALOG.filter((item) => item.isTrending);
}

export function getNewReleases(): StreamVerseItem[] {
  return STREAMVERSE_CATALOG.filter((item) => item.isNewRelease);
}

export function getTop10Italy(): StreamVerseItem[] {
  return STREAMVERSE_CATALOG.filter((item) => typeof item.top10Rank === 'number').sort(
    (a, b) => (a.top10Rank ?? 99) - (b.top10Rank ?? 99),
  );
}

export function getContinueWatchingItems(): StreamVerseItem[] {
  return STREAMVERSE_CATALOG.filter(
    (item) => typeof item.continueWatchingProgress === 'number',
  );
}

export function getRecommendedItems(): StreamVerseItem[] {
  return STREAMVERSE_CATALOG.filter((item) => item.isRecommended);
}

export function getActionMovies(): StreamVerseItem[] {
  return STREAMVERSE_CATALOG.filter((item) => item.isAction);
}
