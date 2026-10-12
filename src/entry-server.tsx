import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import {
  resolvePublicRoute,
  DEFAULT_LOCALE,
  type PublicLocale,
  type PublicPageKey,
} from './lib/i18n';
import {
  buildPublicMetadata,
  buildAdminMetadata,
  type HeadMetadata,
} from './lib/seo';
import { buildStreamVerseJsonLdGraph } from './lib/streamVerseSecuritySeo';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderHeadTags(meta: HeadMetadata): string {
  const lines: string[] = [];
  const siteName = meta.title.includes('Rossi Impianti')
    ? 'Rossi Impianti'
    : meta.title.includes('StreamVerse')
      ? 'StreamVerse'
      : 'AI App Builder';
  lines.push(`<title>${escapeHtml(meta.title)}</title>`);
  lines.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
  lines.push(`<meta name="robots" content="${escapeHtml(meta.robots)}" />`);
  lines.push(`<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`);

  for (const alt of meta.alternates) {
    lines.push(
      `<link rel="alternate" hreflang="${escapeHtml(alt.hreflang)}" href="${escapeHtml(alt.href)}" />`,
    );
  }

  lines.push(`<meta property="og:type" content="${escapeHtml(meta.ogType)}" />`);
  lines.push(`<meta property="og:site_name" content="${escapeHtml(siteName)}" />`);
  lines.push(`<meta property="og:title" content="${escapeHtml(meta.title)}" />`);
  lines.push(`<meta property="og:description" content="${escapeHtml(meta.description)}" />`);
  lines.push(`<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`);
  lines.push(`<meta property="og:locale" content="${escapeHtml(meta.ogLocale)}" />`);

  for (const ogAlt of meta.ogAlternateLocales) {
    lines.push(`<meta property="og:locale:alternate" content="${escapeHtml(ogAlt)}" />`);
  }

  lines.push(`<meta property="og:image" content="https://bolt.new/static/og_default.png" />`);
  lines.push(`<meta name="twitter:card" content="summary_large_image" />`);
  lines.push(`<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`);
  lines.push(`<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`);
  lines.push(`<meta name="twitter:image" content="https://bolt.new/static/og_default.png" />`);

  for (const schema of meta.jsonLd) {
    lines.push(
      `<script type="application/ld+json" data-seo-jsonld="true">${JSON.stringify(schema)}</script>`,
    );
  }

  return lines.join('\n    ');
}

export function renderRouteHtml(pathname: string, baseUrl: string): {
  statusCode: number;
  htmlLang: string;
  headHtml: string;
  appHtml: string;
  isAdmin: boolean;
} {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';

  if (clean === '/' || clean === '/rossi-impianti') {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const rossiTitle =
      'Rossi Impianti — Gestione Impianti Idraulici ed Elettrici';
    const rossiDesc =
      'Web app gestionale per impresa italiana di impianti idraulici, termici ed elettrici a Vicenza. Dashboard cantiere, agenda settimanale tecnici, anagrafica clienti, preventivi, fatture e report direzionali.';
    const meta: HeadMetadata = {
      htmlLang: 'it',
      title: rossiTitle,
      description: rossiDesc,
      canonicalUrl: `${cleanBase}/`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      ogType: 'website',
      ogLocale: 'it_IT',
      ogAlternateLocales: [],
      alternates: [
        { hreflang: 'it-IT', href: `${cleanBase}/` },
        { hreflang: 'it', href: `${cleanBase}/` },
        { hreflang: 'x-default', href: `${cleanBase}/` },
      ],
      jsonLd: [],
    };
    const appHtml = renderToString(<App initialPathname="/" baseUrl={baseUrl} />);
    return {
      statusCode: 200,
      htmlLang: 'it',
      headHtml: renderHeadTags(meta),
      appHtml,
      isAdmin: false,
    };
  }

  if (clean === '/streamverse') {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const svTitle =
      'StreamVerse — Cinema, Serie TV e Originali in Streaming 4K';
    const svDesc =
      'Piattaforma di streaming on-demand con 36 film, serie TV originali e documentari in 4K Ultra HD e Dolby Vision. Esplora tendenze, Top 10 in Italia, Sync Watch e Download Offline.';
    const meta: HeadMetadata = {
      htmlLang: 'it',
      title: svTitle,
      description: svDesc,
      canonicalUrl: `${cleanBase}/streamverse`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      ogType: 'website',
      ogLocale: 'it_IT',
      ogAlternateLocales: ['en_US'],
      alternates: [
        { hreflang: 'it-IT', href: `${cleanBase}/streamverse` },
        { hreflang: 'it', href: `${cleanBase}/streamverse` },
        { hreflang: 'x-default', href: `${cleanBase}/streamverse` },
      ],
      jsonLd: buildStreamVerseJsonLdGraph(cleanBase),
    };
    const appHtml = renderToString(<App initialPathname="/streamverse" baseUrl={baseUrl} />);
    return {
      statusCode: 200,
      htmlLang: 'it',
      headHtml: renderHeadTags(meta),
      appHtml,
      isAdmin: false,
    };
  }

  if (clean === '/negozio' || clean === '/macelleria') {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const butcherTitle =
      'Macelleria Da Luca — Carni Selezionate, Tagli BBQ e Gastronomia a Vigardolo (VI)';
    const butcherDesc =
      'Macelleria artigianale Da Luca in Via S. Floriano 26, Vigardolo (VI). Carni fresche selezionate, tagli BBQ frollati, pronti a cuocere, salumi, sughi di casa e pane fresco. Ordina online con ritiro in negozio o consegna nel Vicentino.';
    const meta: HeadMetadata = {
      htmlLang: 'it',
      title: butcherTitle,
      description: butcherDesc,
      canonicalUrl: `${cleanBase}/macelleria`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      ogType: 'website',
      ogLocale: 'it_IT',
      ogAlternateLocales: [],
      alternates: [
        { hreflang: 'it', href: `${cleanBase}/macelleria` },
        { hreflang: 'x-default', href: `${cleanBase}/macelleria` },
      ],
      jsonLd: [],
    };
    const appHtml = renderToString(<App initialPathname="/macelleria" baseUrl={baseUrl} />);
    return {
      statusCode: 200,
      htmlLang: 'it',
      headHtml: renderHeadTags(meta),
      appHtml,
      isAdmin: false,
    };
  }

  const resolved = resolvePublicRoute(pathname);

  if (!resolved) {
    const fallbackLocale: PublicLocale = DEFAULT_LOCALE;
    const fallbackPage: PublicPageKey = 'home';
    const meta = buildPublicMetadata(baseUrl, fallbackLocale, fallbackPage);
    const appHtml = renderToString(
      <App initialPathname="/it/" baseUrl={baseUrl} />,
    );
    return {
      statusCode: 404,
      htmlLang: meta.htmlLang,
      headHtml: renderHeadTags(meta),
      appHtml,
      isAdmin: false,
    };
  }

  if (resolved.isAdmin || resolved.isWorkspace) {
    const meta = buildAdminMetadata(
      baseUrl,
      resolved.isWorkspace ? 'Area Cliente e Workspace' : undefined,
    );
    const appHtml = renderToString(
      <App initialPathname={pathname} baseUrl={baseUrl} />,
    );
    return {
      statusCode: 200,
      htmlLang: 'it',
      headHtml: renderHeadTags(meta),
      appHtml,
      isAdmin: true,
    };
  }

  const meta = buildPublicMetadata(baseUrl, resolved.locale, resolved.page);
  const appHtml = renderToString(
    <App initialPathname={pathname} baseUrl={baseUrl} />,
  );

  return {
    statusCode: 200,
    htmlLang: meta.htmlLang,
    headHtml: renderHeadTags(meta),
    appHtml,
    isAdmin: false,
  };
}
