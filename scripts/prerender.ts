import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_LABELS,
  getPublicPath,
  type PublicPageKey,
} from '../src/lib/i18n.ts';
import { renderRouteHtml } from '../src/entry-server.tsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const baseUrl = (process.env.APP_URL || 'https://ais-pre-k4gyngjfyrp32fnuyy2fre-557698667016.us-east1.run.app').replace(/\/+$/, '');

function generateStaticAssets() {
  if (!fs.existsSync(distDir)) {
    console.error('dist directory not found. Run vite build first.');
    process.exit(1);
  }

  const templatePath = path.resolve(distDir, 'index.html');
  const template = fs.readFileSync(templatePath, 'utf-8');
  const pages: PublicPageKey[] = [
    'home',
    'product',
    'useCases',
    'pricing',
    'faq',
    'register',
    'login',
    'checkout',
  ];
  const sitemapPages: PublicPageKey[] = ['home', 'product', 'useCases', 'pricing', 'faq'];

  // 1. Pre-render all public localized pages (/it/*, /en/*, /de/*, /fr/*)
  let count = 0;
  for (const locale of SUPPORTED_LOCALES) {
    for (const page of pages) {
      const routePath = getPublicPath(locale, page);
      const rendered = renderRouteHtml(routePath, baseUrl);
      const html = template
        .replace('<html lang="it">', `<html lang="${rendered.htmlLang}">`)
        .replace(
          /<!--seo-head-start-->[\s\S]*?<!--seo-head-end-->/,
          `<!--seo-head-start-->\n    ${rendered.headHtml}\n    <!--seo-head-end-->`,
        )
        .replace('<!--app-html-->', rendered.appHtml);

      const relDir = routePath.replace(/^\/+|\/+$/g, '');
      const targetDir = path.resolve(distDir, relDir);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.resolve(targetDir, 'index.html'), html, 'utf-8');
      count++;
    }
  }

  // 2. Pre-render /admin and /workspace shells (noindex, nofollow, Italian)
  const adminRendered = renderRouteHtml('/admin', baseUrl);
  const adminHtml = template
    .replace('<html lang="it">', '<html lang="it">')
    .replace(
      /<!--seo-head-start-->[\s\S]*?<!--seo-head-end-->/,
      `<!--seo-head-start-->\n    ${adminRendered.headHtml}\n    <!--seo-head-end-->`,
    )
    .replace('<!--app-html-->', adminRendered.appHtml);
  const adminDir = path.resolve(distDir, 'admin');
  fs.mkdirSync(adminDir, { recursive: true });
  fs.writeFileSync(path.resolve(adminDir, 'index.html'), adminHtml, 'utf-8');

  const workspaceRendered = renderRouteHtml('/workspace', baseUrl);
  const workspaceHtml = template
    .replace('<html lang="it">', '<html lang="it">')
    .replace(
      /<!--seo-head-start-->[\s\S]*?<!--seo-head-end-->/,
      `<!--seo-head-start-->\n    ${workspaceRendered.headHtml}\n    <!--seo-head-end-->`,
    )
    .replace('<!--app-html-->', workspaceRendered.appHtml);
  const workspaceDir = path.resolve(distDir, 'workspace');
  fs.mkdirSync(workspaceDir, { recursive: true });
  fs.writeFileSync(path.resolve(workspaceDir, 'index.html'), workspaceHtml, 'utf-8');

  // Also update root dist/index.html with Macelleria Da Luca storefront (/)
  const defaultRendered = renderRouteHtml('/', baseUrl);
  const defaultHtml = template
    .replace('<html lang="it">', `<html lang="${defaultRendered.htmlLang}">`)
    .replace(
      /<!--seo-head-start-->[\s\S]*?<!--seo-head-end-->/,
      `<!--seo-head-start-->\n    ${defaultRendered.headHtml}\n    <!--seo-head-end-->`,
    )
    .replace('<!--app-html-->', defaultRendered.appHtml);
  fs.writeFileSync(templatePath, defaultHtml, 'utf-8');

  // 3. Generate sitemap.xml in dist/ and public/
  const lastmod = '2026-10-09';
  const urlBlocks: string[] = [];
  for (const page of sitemapPages) {
    for (const locale of SUPPORTED_LOCALES) {
      const locUrl = `${baseUrl}${getPublicPath(locale, page)}`;
      const xhtmlLinks = SUPPORTED_LOCALES.map((altLoc) => {
        const altHref = `${baseUrl}${getPublicPath(altLoc, page)}`;
        return `    <xhtml:link rel="alternate" hreflang="${LOCALE_LABELS[altLoc].hreflang}" href="${altHref}" />`;
      });
      const xDefaultHref = `${baseUrl}${getPublicPath(DEFAULT_LOCALE, page)}`;
      xhtmlLinks.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${xDefaultHref}" />`,
      );
      const priority = page === 'pricing' ? '1.0' : '0.8';
      urlBlocks.push(
        [
          '  <url>',
          `    <loc>${locUrl}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          '    <changefreq>weekly</changefreq>',
          `    <priority>${priority}</priority>`,
          ...xhtmlLinks,
          '  </url>',
        ].join('\n'),
      );
    }
  }
  const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urlBlocks,
    '</urlset>',
  ].join('\n');

  fs.writeFileSync(path.resolve(distDir, 'sitemap.xml'), sitemapXml, 'utf-8');
  fs.writeFileSync(path.resolve(rootDir, 'public', 'sitemap.xml'), sitemapXml, 'utf-8');

  // 4. Generate robots.txt in dist/ and public/
  const robotsTxt = [
    '# AI App Builder — Search Engine & AI Crawler Policy',
    '# Public localized documentation pages (/it/, /en/, /de/, /fr/) are open to search and AI crawlers.',
    '# Private owner/admin (/admin), customer workspace (/workspace), and API routes (/api/) are non-indexable and auth-protected.',
    '',
    'User-agent: *',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    'Disallow: /api/',
    '',
    'User-agent: Googlebot',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: Google-Extended',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: GPTBot',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: OAI-SearchBot',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: ClaudeBot',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    'User-agent: PerplexityBot',
    'Allow: /it/',
    'Allow: /en/',
    'Allow: /de/',
    'Allow: /fr/',
    'Disallow: /admin',
    'Disallow: /workspace',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');

  fs.writeFileSync(path.resolve(distDir, 'robots.txt'), robotsTxt, 'utf-8');
  fs.writeFileSync(path.resolve(rootDir, 'public', 'robots.txt'), robotsTxt, 'utf-8');

  console.log(`Pre-rendered ${count} public localized pages + /admin + /workspace + sitemap.xml + robots.txt`);
}

generateStaticAssets();
