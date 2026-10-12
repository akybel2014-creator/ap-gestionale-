import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  PUBLIC_CONTENT,
  getPublicPath,
  type PublicLocale,
  type PublicPageKey,
} from './i18n';

export interface HeadMetadata {
  htmlLang: string;
  title: string;
  description: string;
  canonicalUrl: string;
  robots: string;
  ogType: string;
  ogLocale: string;
  ogAlternateLocales: string[];
  alternates: { hreflang: string; href: string }[];
  jsonLd: Record<string, unknown>[];
}

export function buildPublicMetadata(
  baseUrl: string,
  locale: PublicLocale,
  page: PublicPageKey,
): HeadMetadata {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const content = PUBLIC_CONTENT[locale];
  const pageMeta = content.meta[page];
  const currentPath = getPublicPath(locale, page);
  const canonicalUrl = `${cleanBase}${currentPath}`;

  const alternates: { hreflang: string; href: string }[] = SUPPORTED_LOCALES.map((loc) => ({
    hreflang: LOCALE_LABELS[loc].hreflang,
    href: `${cleanBase}${getPublicPath(loc, page)}`,
  }));

  alternates.push({
    hreflang: 'x-default',
    href: `${cleanBase}${getPublicPath(DEFAULT_LOCALE, page)}`,
  });

  const ogAlternateLocales = SUPPORTED_LOCALES.filter((l) => l !== locale).map(
    (l) => LOCALE_LABELS[l].ogLocale,
  );

  const breadcrumbListItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: content.breadcrumbs.home,
      item: `${cleanBase}${getPublicPath(locale, 'home')}`,
    },
  ];

  if (page !== 'home') {
    breadcrumbListItems.push({
      '@type': 'ListItem',
      position: 2,
      name: content.breadcrumbs[page],
      item: canonicalUrl,
    });
  }

  const softwareSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AI App Builder',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web Browser',
    inLanguage: SUPPORTED_LOCALES,
    url: `${cleanBase}${getPublicPath(locale, 'home')}`,
    description: pageMeta.description,
    codeRepository: 'https://github.com/akybel2014-creator/ai-app-builder',
    author: {
      '@type': 'Organization',
      name: 'AI App Builder (akybel2014-creator)',
      url: 'https://github.com/akybel2014-creator/ai-app-builder',
    },
    featureList: [
      '8 Project Categories (Website, Web App, Landing Page, E-commerce, Dashboard, Portfolio, Blog, Other)',
      'Iterative Text Instruction Log with Timestamps',
      'Sandboxed Multi-Device HTML Preview (Desktop 100%, Tablet 768px, Mobile 375px)',
      'BYOK AI Provider Configuration (OpenAI, Anthropic, Groq, Custom Endpoint)',
      'Client-Side localStorage Persistence & .txt Project Export',
    ],
  };

  const webPageSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageMeta.title,
    description: pageMeta.description,
    url: canonicalUrl,
    inLanguage: locale,
    isPartOf: {
      '@type': 'WebSite',
      name: 'AI App Builder',
      url: `${cleanBase}/it/`,
    },
  };

  const breadcrumbSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbListItems,
  };

  const jsonLd: Record<string, unknown>[] = [webPageSchema, breadcrumbSchema];

  if (page === 'home' || page === 'product' || page === 'pricing') {
    jsonLd.push(softwareSchema);
  }

  if (page === 'faq' || page === 'home') {
    const faqItems = page === 'faq' ? content.faq.items : content.faq.items.slice(0, 3);
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer,
        },
      })),
    });
  }

  const isAuthOrCheckoutPage = page === 'register' || page === 'login' || page === 'checkout';

  return {
    htmlLang: content.htmlLang,
    title: pageMeta.title,
    description: pageMeta.description,
    canonicalUrl,
    robots: isAuthOrCheckoutPage
      ? 'noindex, nofollow, noarchive'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    ogType: 'website',
    ogLocale: LOCALE_LABELS[locale].ogLocale,
    ogAlternateLocales,
    alternates,
    jsonLd,
  };
}

export function buildAdminMetadata(baseUrl: string, viewTitle?: string): HeadMetadata {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const title = viewTitle
    ? `${viewTitle} — Dashboard Amministratore | AI App Builder`
    : 'Dashboard Amministratore — AI App Builder';
  return {
    htmlLang: 'it',
    title,
    description: 'Area amministrativa privata di AI App Builder. Interfaccia riservata esclusivamente in lingua italiana.',
    canonicalUrl: `${cleanBase}/admin`,
    robots: 'noindex, nofollow, noarchive',
    ogType: 'website',
    ogLocale: 'it_IT',
    ogAlternateLocales: [],
    alternates: [],
    jsonLd: [],
  };
}

export function applyMetadataToDocument(meta: HeadMetadata): void {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = meta.htmlLang;
  document.title = meta.title;

  const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  setMetaTag('name', 'description', meta.description);
  setMetaTag('name', 'robots', meta.robots);
  setMetaTag('property', 'og:title', meta.title);
  setMetaTag('property', 'og:description', meta.description);
  setMetaTag('property', 'og:url', meta.canonicalUrl);
  setMetaTag('property', 'og:type', meta.ogType);
  setMetaTag('property', 'og:locale', meta.ogLocale);
  setMetaTag('property', 'og:site_name', 'AI App Builder');
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', meta.title);
  setMetaTag('name', 'twitter:description', meta.description);

  // Canonical link
  let canonicalEl = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', meta.canonicalUrl);

  // Remove old hreflang links & og:locale:alternate
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang], meta[property="og:locale:alternate"]')
    .forEach((el) => el.remove());

  for (const alt of meta.alternates) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', alt.hreflang);
    link.setAttribute('href', alt.href);
    document.head.appendChild(link);
  }

  for (const ogAlt of meta.ogAlternateLocales) {
    const m = document.createElement('meta');
    m.setAttribute('property', 'og:locale:alternate');
    m.setAttribute('content', ogAlt);
    document.head.appendChild(m);
  }

  // Update JSON-LD scripts
  document.head.querySelectorAll('script[data-seo-jsonld="true"]').forEach((el) => el.remove());
  for (const schema of meta.jsonLd) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-jsonld', 'true');
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }
}
