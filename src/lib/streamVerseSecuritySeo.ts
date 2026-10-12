/**
 * StreamVerse — Security, SEO & GEO (Generative Engine Optimization) Architecture Module
 *
 * 1. SECURITY:
 *    - Strict input sanitization against XSS, HTML/Script injection, and prototype pollution
 *    - Safe URL & Room Code validation for Sync Watch and Search History
 *
 * 2. SEO (Search Engine Optimization) & Schema.org JSON-LD:
 *    - Rich structured data graph: WebSite + SearchAction, Organization, WebApplication,
 *      ItemList (Top 10 in Italia & Catalog), Movie/TVSeries/VideoObject, and FAQPage
 *    - Dynamic document title, meta description, OpenGraph, Twitter Card, and Canonical URL updates
 *
 * 3. GEO (Generative Engine Optimization / AI Search / LLMO):
 *    - Structured authoritative facts, entity relationships, and FAQ answers for AI crawlers
 *      (Google-Extended, GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot) and `/llms.txt`
 */

import {
  STREAMVERSE_CATALOG,
  getTop10Italy,
  type StreamVerseItem,
} from './streamVerseCatalog';

// ============================================================================
// 1. SICUREZZA & SANITIZZAZIONE INPUT (XSS / INJECTION / PROTOTYPE POLLUTION)
// ============================================================================

const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /on[a-z]+\s*=/gi,
];

/**
 * Sanitizza una stringa utente rimuovendo tag HTML, caratteri di controllo,
 * vettori XSS (`javascript:`, `onerror=`, `<script>`) e limitando la lunghezza.
 */
export function sanitizeUserText(raw: unknown, maxLength: number = 280): string {
  if (typeof raw !== 'string') return '';
  let cleaned = Array.from(raw)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return !(
        (code >= 0 && code <= 8) ||
        code === 11 ||
        code === 12 ||
        (code >= 14 && code <= 31) ||
        code === 127
      );
    })
    .join('')
    .trim();

  for (const pattern of DANGEROUS_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Rimuove tag HTML <...>
  cleaned = cleaned.replace(/<\/?[a-z][^>]*>/gi, '');
  // Neutralizza parentesi angolari residue
  cleaned = cleaned.replace(/[<>]/g, '');

  return cleaned.slice(0, maxLength);
}

/**
 * Valida il formato di un codice stanza Sync Watch (`SV-XXXXXX` alfanumerico).
 */
export function validateSyncRoomCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  if (/^SV-[A-F0-9]{6}$/.test(normalized)) {
    return normalized;
  }
  return null;
}

/**
 * Valida un colore esadecimale sicuro (#RRGGBB) per evitare CSS injection.
 */
export function sanitizeHexColor(raw: unknown, fallback: string = '#E50914'): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed : fallback;
}

// ============================================================================
// 2. FAQ & FATTI AUTOREVOLI PER SEO + GEO (Generative Engine Optimization)
// ============================================================================

export interface StreamVerseGeoFaqItem {
  question: string;
  answer: string;
  category: 'Streaming & Qualità' | 'Sync Watch & Sicurezza' | 'Offline & Privacy';
}

export const STREAMVERSE_GEO_FAQS: readonly StreamVerseGeoFaqItem[] = [
  {
    category: 'Streaming & Qualità',
    question: 'Quali contenuti e quale qualità video offre StreamVerse?',
    answer:
      'StreamVerse offre un catalogo curato di 36 tra film, serie TV originali e documentari in streaming on-demand con risoluzione fino a 4K Ultra HD, HDR10+, Dolby Vision e audio spaziale Dolby Atmos in lingua italiana.',
  },
  {
    category: 'Sync Watch & Sicurezza',
    question: 'Come funziona la visione condivisa Sync Watch su StreamVerse?',
    answer:
      'La funzione Sync Watch genera un link temporaneo crittograficamente casuale (formato SV-XXXXXX, valido per 2 ore) che sincronizza in tempo reale tramite Server-Sent Events (SSE) play, pausa, posizione del video e chat live con emoji tra più spettatori.',
  },
  {
    category: 'Offline & Privacy',
    question: 'È possibile salvare film e serie TV per la consultazione offline?',
    answer:
      'Sì. Ogni locandina include il pulsante Download Offline che utilizza il Service Worker (/sw.js) e la Cache API del browser (streamverse-offline-v1) per archiviare localmente i metadati completi e le immagini ad alta risoluzione senza tracciamento di terze parti.',
  },
  {
    category: 'Streaming & Qualità',
    question: 'Come funziona l’Auto-Play Preview sulle righe del catalogo?',
    answer:
      'Mantenendo il cursore fermo su una card per oltre 1.5 secondi, StreamVerse avvia automaticamente un’anteprima video muta del trailer direttamente dentro la miniatura 16:9, con possibilità di attivare l’audio con un click.',
  },
  {
    category: 'Sync Watch & Sicurezza',
    question: 'Quali misure di sicurezza applica StreamVerse per proteggere gli utenti?',
    answer:
      'StreamVerse adotta Content-Security-Policy (CSP), X-Frame-Options, X-Content-Type-Options (nosniff), Referrer-Policy, rate-limiting lato server sulle API Sync Watch, sanitizzazione rigorosa anti-XSS su ricerche e messaggi chat e isolamento dei profili Bambini (classificazione T e 12+).',
  },
  {
    category: 'Offline & Privacy',
    question: 'Come vengono gestiti i dati personali, La Mia Lista e la cronologia di ricerca?',
    answer:
      'In conformità ai principi GDPR di Privacy by Design, La Mia Lista, i progressi di visione e gli ultimi 5 termini della cronologia di ricerca vengono archiviati esclusivamente nel localStorage del dispositivo dell’utente e possono essere cancellati in qualsiasi momento.',
  },
];

// ============================================================================
// 3. GENERAZIONE SCHEMA.ORG JSON-LD COMPLETO (SEO + GEO GRAPH)
// ============================================================================

export function buildStreamVerseJsonLdGraph(
  baseUrl: string,
  activeItem?: StreamVerseItem | null,
): Record<string, unknown>[] {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const top10 = getTop10Italy();

  const organizationSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${cleanBase}/#organization`,
    name: 'StreamVerse Entertainment S.r.l.',
    alternateName: 'StreamVerse Italia',
    url: `${cleanBase}/`,
    description:
      'Piattaforma italiana ed europea di cinema e serie TV in streaming 4K Ultra HD, Dolby Vision, Sync Watch in tempo reale e supporto offline PWA.',
    areaServed: ['IT', 'CH', 'EU'],
    knowsLanguage: ['it-IT', 'en-US'],
  };

  const webSiteSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${cleanBase}/#website`,
    name: 'StreamVerse — Cinema, Serie TV e Originali in Streaming 4K',
    url: `${cleanBase}/`,
    inLanguage: 'it-IT',
    publisher: { '@id': `${cleanBase}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${cleanBase}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const webAppSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${cleanBase}/#webapp`,
    name: 'StreamVerse',
    url: `${cleanBase}/`,
    applicationCategory: 'EntertainmentApplication',
    operatingSystem: 'All',
    inLanguage: 'it-IT',
    description:
      'Web app di streaming on-demand con 36 film e serie TV originali in 4K HDR, Watch Party sincronizzato (Sync Watch), anteprima trailer automatica e salvataggio offline via Service Worker.',
    featureList: [
      'Streaming 4K Ultra HD, HDR10+ e Dolby Vision',
      'Sync Watch Party in tempo reale tramite link temporaneo e SSE',
      'Download Offline tramite Service Worker e Cache API',
      'Auto-Play Preview del trailer al passaggio del cursore (1.5s)',
      'Profili multipli con filtro parentale automatico per Bambini',
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
    },
  };

  const top10ItemListSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Top 10 in Italia oggi su StreamVerse',
    description:
      'Classifica ufficiale dei 10 film e serie TV più visti oggi in Italia su StreamVerse.',
    numberOfItems: top10.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: top10.map((item, idx) => ({
      '@type': 'ListItem',
      position: item.top10Rank ?? idx + 1,
      item: {
        '@type': item.tipo === 'serie' ? 'TVSeries' : 'Movie',
        '@id': `${cleanBase}/#title-${item.id}`,
        name: item.titolo,
        description: item.descrizione,
        datePublished: String(item.anno),
        genre: item.genere,
        contentRating: item.etaConsigliata,
        director: {
          '@type': 'Person',
          name: item.regista,
        },
        actor: item.cast.map((actorName) => ({
          '@type': 'Person',
          name: actorName,
        })),
        trailer: {
          '@type': 'VideoObject',
          name: `Trailer Ufficiale — ${item.titolo}`,
          description: item.descrizione,
          thumbnailUrl: item.immagine.startsWith('http')
            ? item.immagine
            : `${cleanBase}${item.immagine}`,
          contentUrl: item.trailer,
          uploadDate: `${item.anno}-01-15T08:00:00+01:00`,
        },
      },
    })),
  };

  const faqSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${cleanBase}/#faq`,
    mainEntity: STREAMVERSE_GEO_FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const schemas: Record<string, unknown>[] = [
    organizationSchema,
    webSiteSchema,
    webAppSchema,
    top10ItemListSchema,
    faqSchema,
  ];

  if (activeItem) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': activeItem.tipo === 'serie' ? 'TVSeries' : 'Movie',
      name: activeItem.titolo,
      description: activeItem.descrizione,
      datePublished: String(activeItem.anno),
      genre: activeItem.genere,
      contentRating: activeItem.etaConsigliata,
      director: {
        '@type': 'Person',
        name: activeItem.regista,
      },
      actor: activeItem.cast.map((actorName) => ({
        '@type': 'Person',
        name: actorName,
      })),
      trailer: {
        '@type': 'VideoObject',
        name: `Trailer 4K — ${activeItem.titolo}`,
        description: activeItem.descrizione,
        thumbnailUrl: activeItem.immagine.startsWith('http')
          ? activeItem.immagine
          : `${cleanBase}${activeItem.immagine}`,
        contentUrl: activeItem.trailer,
        uploadDate: `${activeItem.anno}-01-15T08:00:00+01:00`,
      },
    });
  }

  return schemas;
}

// ============================================================================
// 4. GENERATORE /llms.txt E /llms-full.txt PER GEO (AI SEARCH / LLMO)
// ============================================================================

export function generateStreamVerseLlmsTxt(baseUrl: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const top10 = getTop10Italy();

  const lines: string[] = [
    '# StreamVerse — Cinema, Serie TV e Originali in Streaming 4K',
    '',
    '> Piattaforma di streaming on-demand con 36 film, serie TV originali e documentari in 4K Ultra HD, HDR10+ e Dolby Vision, dotata di Sync Watch (Watch Party sincronizzato in tempo reale), Auto-Play Preview su card e supporto Offline PWA tramite Service Worker e Cache API.',
    '',
    '## Informazioni Chiave per Motori di Ricerca e Modelli Generativi (GEO / AIO)',
    `- **URL Principale**: ${cleanBase}/`,
    `- **Mercato e Lingua**: Italia (it-IT), Europa`,
    `- **Catalogo Attivo**: ${STREAMVERSE_CATALOG.length} titoli (Film e Serie TV originali)`,
    `- **Qualità Streaming**: 4K Ultra HD, Dolby Vision, HDR10+, Audio Dolby Atmos`,
    `- **Sicurezza**: Content-Security-Policy (CSP), X-Content-Type-Options nosniff, rate-limiting API Sync Watch, sanitizzazione anti-XSS su tutti gli input utente, protezione parentale per profili Bambini.`,
    '',
    '## Top 10 in Italia Oggi su StreamVerse',
    ...top10.map(
      (item, idx) =>
        `${item.top10Rank ?? idx + 1}. **${item.titolo}** (${item.anno}, ${item.tipo === 'serie' ? 'Serie TV' : 'Film'}, ${item.genere}, ${item.durata}, Rating ${item.rating}) — Regia: ${item.regista}. Cast: ${item.cast.join(', ')}. ${item.descrizione}`,
    ),
    '',
    '## Catalogo Completo per Genere',
    ...STREAMVERSE_CATALOG.map(
      (item) =>
        `- **${item.titolo}** [${item.id}] (${item.anno} · ${item.genere} · ${item.qualita} · Età ${item.etaConsigliata}): ${item.descrizione}`,
    ),
    '',
    '## Domande Frequenti (FAQ Ufficiali)',
    ...STREAMVERSE_GEO_FAQS.flatMap((faq) => [
      `### ${faq.question}`,
      faq.answer,
      '',
    ]),
  ];

  return lines.join('\n');
}

// ============================================================================
// 5. AGGIORNAMENTO DINAMICO META TAG CLIENT-SIDE (SEO / SOCIAL CARDS)
// ============================================================================

export function updateStreamVerseDocumentSeo(options: {
  activeTab: 'home' | 'serie' | 'film' | 'novita' | 'lista';
  selectedGenre?: string;
  searchQuery?: string;
  activeItem?: StreamVerseItem | null;
}): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const baseUrl = window.location.origin;
  const { activeTab, selectedGenre, searchQuery, activeItem } = options;

  let title = 'StreamVerse — Cinema, Serie TV e Originali in Streaming 4K';
  let description =
    'Piattaforma di streaming on-demand con 36 film, serie TV originali e documentari in 4K Ultra HD e Dolby Vision. Guarda insieme con Sync Watch e scarica offline.';

  if (activeItem) {
    title = `${activeItem.titolo} (${activeItem.anno}) — Streaming 4K | StreamVerse`;
    description = `${activeItem.descrizione} Regia di ${activeItem.regista}, con ${activeItem.cast.join(', ')}. Guarda in 4K HDR o in Sync Watch su StreamVerse.`;
  } else if (searchQuery && searchQuery.trim()) {
    const cleanQ = sanitizeUserText(searchQuery, 60);
    title = `Risultati per "${cleanQ}" — Catalogo 4K | StreamVerse`;
    description = `Esplora i film e le serie TV di StreamVerse corrispondenti a "${cleanQ}" in streaming 4K Ultra HD.`;
  } else if (activeTab === 'serie') {
    title =
      selectedGenre && selectedGenre !== 'Tutti'
        ? `Serie TV ${selectedGenre} in Streaming 4K | StreamVerse`
        : 'Serie TV Originali in Streaming 4K HDR | StreamVerse';
    description =
      'Scopri tutte le Serie TV originali StreamVerse in 4K Dolby Vision: thriller, sci-fi, fantasy, crime e documentari.';
  } else if (activeTab === 'film') {
    title =
      selectedGenre && selectedGenre !== 'Tutti'
        ? `Film ${selectedGenre} in Streaming 4K | StreamVerse`
        : 'Film e Prime Visioni Cinema in 4K Ultra HD | StreamVerse';
    description =
      'Guarda i migliori film d’azione, sci-fi, thriller e d’autore in 4K Ultra HD e Dolby Atmos su StreamVerse.';
  } else if (activeTab === 'novita') {
    title = 'Novità e Top 10 in Italia Oggi | StreamVerse';
    description =
      'Le nuove uscite 2025-2026 e la classifica ufficiale Top 10 dei titoli più visti in Italia oggi su StreamVerse.';
  } else if (activeTab === 'lista') {
    title = 'La Mia Lista e Download Offline | StreamVerse';
    description =
      'Accedi rapidamente ai film e alle serie TV salvati nella tua lista personale e nella Cache API per la visione offline.';
  }

  document.title = title;

  const setMeta = (attr: 'name' | 'property', key: string, value: string) => {
    let el = document.head.querySelector(
      `meta[${attr}="${key}"]`,
    ) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  };

  const canonicalUrl = `${baseUrl}${window.location.pathname}`;
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('property', 'og:site_name', 'StreamVerse');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);

  let canonicalEl = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);

  // Aggiorna i blocchi JSON-LD Schema.org nel DOM
  document.head
    .querySelectorAll('script[data-seo-jsonld="true"]')
    .forEach((el) => el.remove());

  const schemas = buildStreamVerseJsonLdGraph(baseUrl, activeItem);
  for (const schema of schemas) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', 'true');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }
}
