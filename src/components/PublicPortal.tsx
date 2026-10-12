import React, { useState, useEffect, useCallback } from 'react';
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  PUBLIC_CONTENT,
  getPublicPath,
  type PublicLocale,
  type PublicPageKey,
} from '@/lib/i18n';
import PricingCheckoutFlow, {
  type PublicAuthenticatedUser,
} from '@/components/PricingCheckoutFlow';
import {
  Zap,
  Globe,
  Shield,
  Code2,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Cpu,
  Lock,
  ChevronRight,
} from 'lucide-react';

interface PublicPortalProps {
  locale: PublicLocale;
  page: PublicPageKey;
  publicUser?: PublicAuthenticatedUser | null;
  authLoading?: boolean;
  onUserAuthenticated?: (user: PublicAuthenticatedUser) => void;
  onUserLogout?: () => Promise<void>;
  onNavigatePublic: (
    locale: PublicLocale,
    page: PublicPageKey,
    queryParams?: Record<string, string>,
  ) => void;
  onOpenCustomerWorkspace: () => void;
}

export default function PublicPortal({
  locale,
  page,
  publicUser: externalUser,
  authLoading: externalAuthLoading,
  onUserAuthenticated,
  onUserLogout,
  onNavigatePublic,
  onOpenCustomerWorkspace,
}: PublicPortalProps) {
  const content = PUBLIC_CONTENT[locale];
  const meta = content.meta[page];

  const [internalUser, setInternalUser] = useState<PublicAuthenticatedUser | null>(null);
  const [internalAuthLoading, setInternalAuthLoading] = useState<boolean>(
    externalAuthLoading === undefined,
  );

  const publicUser = externalUser !== undefined ? externalUser : internalUser;
  const authLoading =
    externalAuthLoading !== undefined ? externalAuthLoading : internalAuthLoading;

  useEffect(() => {
    if (externalUser !== undefined) return;
    let active = true;
    fetch('/api/auth/session', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data && data.authenticated && data.user) {
          setInternalUser(data.user);
        } else {
          setInternalUser(null);
        }
        setInternalAuthLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setInternalAuthLoading(false);
      });
    return () => {
      active = false;
    };
  }, [externalUser]);

  const handleUserAuthenticated = useCallback(
    (u: PublicAuthenticatedUser) => {
      if (onUserAuthenticated) {
        onUserAuthenticated(u);
      } else {
        setInternalUser(u);
      }
    },
    [onUserAuthenticated],
  );

  const handlePublicLogout = useCallback(async () => {
    if (onUserLogout) {
      await onUserLogout();
      return;
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    setInternalUser(null);
  }, [onUserLogout]);

  const getCurrentQueryParams = (): Record<string, string> | undefined => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const period = params.get('period');
    const result: Record<string, string> = {};
    if (plan) result.plan = plan;
    if (period) result.period = period;
    return Object.keys(result).length > 0 ? result : undefined;
  };

  const handleLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetLocale: PublicLocale,
    targetPage: PublicPageKey,
    preserveQuery = false,
  ) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigatePublic(
      targetLocale,
      targetPage,
      preserveQuery ? getCurrentQueryParams() : undefined,
    );
  };

  const handleCustomerAreaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (publicUser) {
      onOpenCustomerWorkspace();
    } else {
      onNavigatePublic(locale, 'login', getCurrentQueryParams());
    }
  };

  const navPages: { key: PublicPageKey; label: string }[] = [
    { key: 'pricing', label: content.nav.pricing },
    { key: 'home', label: content.nav.home },
    { key: 'product', label: content.nav.product },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface-950 text-surface-100">
      {/* Semantic Header & Primary Navigation */}
      <header className="sticky top-0 z-30 glass-strong border-b border-surface-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <a
            href={getPublicPath(locale, 'pricing')}
            onClick={(e) => handleLinkClick(e, locale, 'pricing')}
            className="flex items-center gap-2.5 group shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center glow-accent">
              <Zap className="w-5 h-5 text-surface-950" fill="currentColor" />
            </div>
            <span className="text-base font-bold text-white tracking-tight leading-none">
              AI App Builder
            </span>
          </a>

          {/* Centered Desktop Navigation */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center bg-surface-900/80 border border-surface-800/80 rounded-xl p-1 gap-1"
          >
            {navPages.map((item) => {
              const href = getPublicPath(locale, item.key);
              const active = page === item.key;
              return (
                <a
                  key={item.key}
                  href={href}
                  onClick={(e) => handleLinkClick(e, locale, item.key)}
                  aria-current={active ? 'page' : undefined}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-accent-500/20 text-accent-300 shadow-sm'
                      : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Right Actions: Language Switcher & Customer Access */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div
              className="flex items-center bg-surface-900/90 border border-surface-800 rounded-xl p-1"
              role="group"
              aria-label={content.nav.languageLabel}
            >
              <Globe className="w-3.5 h-3.5 text-surface-400 ml-2 mr-1 hidden sm:inline" />
              {SUPPORTED_LOCALES.map((loc) => {
                const active = loc === locale;
                const href = getPublicPath(loc, page);
                return (
                  <a
                    key={loc}
                    href={href}
                    hrefLang={loc}
                    lang={loc}
                    onClick={(e) => handleLinkClick(e, loc, page, true)}
                    aria-current={active ? 'true' : undefined}
                    title={LOCALE_LABELS[loc].label}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-accent-500 text-surface-950'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    {LOCALE_LABELS[loc].native}
                  </a>
                );
              })}
            </div>

            {!publicUser && (
              <a
                href={getPublicPath(locale, 'register')}
                onClick={(e) => handleLinkClick(e, locale, 'register', true)}
                rel="nofollow"
                className="hidden sm:inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-surface-300 hover:text-white hover:bg-surface-800/60 transition-colors"
              >
                {content.nav.register}
              </a>
            )}

            {/* Customer Area / Login Link (Separate from Admin) */}
            <a
              href={publicUser ? '/workspace' : getPublicPath(locale, 'login')}
              onClick={handleCustomerAreaClick}
              rel="nofollow"
              data-testid="public-header-customer-btn"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-surface-800 hover:bg-surface-700 text-accent-300 border border-accent-500/30 transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{publicUser ? 'Workspace' : content.nav.login}</span>
            </a>
          </div>
        </div>

        {/* Mobile Secondary Nav */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden border-t border-surface-800/60 px-4 py-2 flex items-center justify-center gap-2 overflow-x-auto scrollbar-thin"
        >
          {navPages.map((item) => {
            const href = getPublicPath(locale, item.key);
            const active = page === item.key;
            return (
              <a
                key={item.key}
                href={href}
                onClick={(e) => handleLinkClick(e, locale, item.key)}
                aria-current={active ? 'page' : undefined}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-accent-500/15 text-accent-300'
                    : 'text-surface-400 hover:text-white'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2"
      >
        <ol className="flex items-center gap-2 text-xs text-surface-400">
          <li>
            <a
              href={getPublicPath(locale, 'pricing')}
              onClick={(e) => handleLinkClick(e, locale, 'pricing')}
              className="hover:text-accent-300 transition-colors"
            >
              {content.breadcrumbs.pricing}
            </a>
          </li>
          {page !== 'pricing' && (
            <>
              <li>
                <ChevronRight className="w-3.5 h-3.5 text-surface-600" />
              </li>
              <li className="text-surface-200 font-medium" aria-current="page">
                {content.breadcrumbs[page]}
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* Main Semantic Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Hero / Page Header with single H1 */}
        <article className="space-y-12">
          <header className="max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-300 text-xs font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>{content.home.badge}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
              {meta.h1}
            </h1>
            <p className="text-base sm:text-lg text-surface-300 leading-relaxed">
              {meta.subtitle}
            </p>
          </header>

          {/* HOME PAGE */}
          {page === 'home' && (
            <div className="space-y-14">
              {/* CTA & Visual Architecture Diagram */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={getPublicPath(locale, 'pricing')}
                      onClick={(e) => handleLinkClick(e, locale, 'pricing')}
                      className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 font-semibold text-sm hover:from-accent-400 hover:to-accent-500 transition-all glow-accent"
                    >
                      <span>{content.nav.pricing}</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    <a
                      href={getPublicPath(locale, 'product')}
                      onClick={(e) => handleLinkClick(e, locale, 'product')}
                      className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-surface-800/80 border border-surface-700 text-surface-200 hover:text-white hover:border-accent-500/40 font-medium text-sm transition-colors"
                    >
                      <BookOpen className="w-4 h-4 text-accent-400" />
                      <span>{content.home.ctaSecondary}</span>
                    </a>
                  </div>

                  <section aria-labelledby="what-is-heading" className="glass border border-surface-800/80 rounded-2xl p-6 space-y-3">
                    <h2 id="what-is-heading" className="text-xl font-semibold text-white">
                      {content.home.whatIsTitle}
                    </h2>
                    <p className="text-sm font-medium text-accent-300 leading-relaxed">
                      {content.home.whatIsLead}
                    </p>
                    <p className="text-sm text-surface-300 leading-relaxed">
                      {content.home.whatIsBody}
                    </p>
                  </section>
                </div>

                {/* Optimized SVG Diagram with explicit dimensions and descriptive alt */}
                <figure className="lg:col-span-5 glass border border-surface-800/80 rounded-2xl p-5 flex flex-col items-center">
                  <img
                    src="/architecture-diagram.svg"
                    alt={`AI App Builder workflow diagram (${locale.toUpperCase()}): Project Specification, Instruction Log, Multi-Device HTML Sandbox, and TXT Export`}
                    width="560"
                    height="360"
                    loading="eager"
                    decoding="async"
                    className="w-full h-auto rounded-xl border border-surface-800"
                  />
                  <figcaption className="text-xs text-surface-400 mt-3 text-center">
                    AI App Builder — Client-side localStorage + Sandboxed HTML Preview (100% / 768px / 375px)
                  </figcaption>
                </figure>
              </div>

              {/* Core Pillars */}
              <section aria-labelledby="pillars-heading" className="space-y-6">
                <h2 id="pillars-heading" className="text-2xl font-bold text-white">
                  {content.home.pillarsTitle}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {content.home.pillars.map((pillar, idx) => (
                    <div
                      key={idx}
                      className="glass border border-surface-800/80 rounded-2xl p-5 space-y-2"
                    >
                      <div className="flex items-center gap-2.5 text-accent-400">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <h3 className="text-base font-semibold text-white">{pillar.title}</h3>
                      </div>
                      <p className="text-sm text-surface-300 leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 4-Step Workflow */}
              <section aria-labelledby="workflow-heading" className="space-y-6">
                <h2 id="workflow-heading" className="text-2xl font-bold text-white">
                  {content.home.workflowTitle}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {content.home.workflowSteps.map((step) => (
                    <div
                      key={step.step}
                      className="glass border border-surface-800/80 rounded-2xl p-5 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <span className="inline-block text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-accent-500/15 text-accent-300">
                          STEP {step.step}
                        </span>
                        <h3 className="text-base font-semibold text-white">{step.title}</h3>
                        <p className="text-sm text-surface-300 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Supported AI Providers */}
              <section aria-labelledby="providers-heading" className="space-y-4">
                <div>
                  <h2 id="providers-heading" className="text-2xl font-bold text-white">
                    {content.home.supportedProvidersTitle}
                  </h2>
                  <p className="text-sm text-surface-400 mt-1">
                    {content.home.supportedProvidersSubtitle}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {content.home.providers.map((prov) => (
                    <div
                      key={prov.name}
                      className="glass border border-surface-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-semibold text-white">{prov.name}</h3>
                          <Cpu className="w-4 h-4 text-accent-400" />
                        </div>
                        <p className="text-xs text-surface-400 font-mono break-all">
                          {prov.models}
                        </p>
                        <p className="text-xs text-surface-500 font-mono truncate">
                          {prov.endpointInfo}
                        </p>
                      </div>
                      <a
                        href={prov.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-400 hover:text-accent-300"
                      >
                        <span>Official API Docs</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </section>

              {/* Product Cross-Linking Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-surface-900/90 border border-surface-800">
                <a
                  href={getPublicPath(locale, 'pricing')}
                  onClick={(e) => handleLinkClick(e, locale, 'pricing')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-accent-300 hover:text-accent-200"
                >
                  <Zap className="w-4 h-4" />
                  <span>{content.nav.pricing}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href={getPublicPath(locale, 'product')}
                  onClick={(e) => handleLinkClick(e, locale, 'product')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-surface-200 hover:text-white"
                >
                  <Code2 className="w-4 h-4 text-accent-400" />
                  <span>{content.home.exploreProductLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* PRODUCT SPECIFICATION PAGE */}
          {page === 'product' && (
            <div className="space-y-12">
              <section aria-labelledby="def-heading" className="glass border border-surface-800/80 rounded-2xl p-6 space-y-3">
                <h2 id="def-heading" className="text-xl font-bold text-white">
                  {content.product.definitionTitle}
                </h2>
                <p className="text-sm sm:text-base text-surface-200 leading-relaxed">
                  {content.product.definitionText}
                </p>
              </section>

              <section aria-labelledby="arch-heading" className="space-y-4">
                <div>
                  <h2 id="arch-heading" className="text-2xl font-bold text-white">
                    {content.product.architectureTitle}
                  </h2>
                  <p className="text-sm text-surface-400 mt-1">
                    {content.product.architectureLead}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {content.product.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="glass border border-surface-800/80 rounded-2xl p-5 space-y-2"
                    >
                      <span className="text-xs font-mono uppercase tracking-wider text-accent-400">
                        {spec.label}
                      </span>
                      <h3 className="text-base font-semibold text-white">{spec.value}</h3>
                      <p className="text-sm text-surface-300 leading-relaxed">{spec.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section aria-labelledby="cap-heading" className="space-y-4">
                <h2 id="cap-heading" className="text-2xl font-bold text-white">
                  {content.product.capabilitiesTitle}
                </h2>
                <div className="space-y-3">
                  {content.product.capabilities.map((cap) => (
                    <div
                      key={cap.title}
                      className="glass border border-surface-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-3xl">
                        <h3 className="text-base font-semibold text-white">{cap.title}</h3>
                        <p className="text-sm text-surface-300 leading-relaxed">
                          {cap.description}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent-500/15 text-accent-300 whitespace-nowrap self-start">
                        {cap.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section aria-labelledby="sec-heading" className="glass border border-surface-800/80 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-accent-400" />
                  <h2 id="sec-heading" className="text-xl font-bold text-white">
                    {content.product.securityPrivacyTitle}
                  </h2>
                </div>
                <ul className="space-y-2.5 text-sm text-surface-300 list-disc pl-5">
                  {content.product.securityPrivacyPoints.map((pt, i) => (
                    <li key={i} className="leading-relaxed">
                      {pt}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="ref-heading" className="space-y-4">
                <h2 id="ref-heading" className="text-xl font-bold text-white">
                  {content.product.referencesTitle}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {content.product.references.map((ref) => (
                    <div
                      key={ref.url}
                      className="glass border border-surface-800/80 rounded-2xl p-5 flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <h3 className="text-sm font-semibold text-white">{ref.label}</h3>
                        <p className="text-xs text-surface-400 leading-relaxed">
                          {ref.description}
                        </p>
                      </div>
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-400 hover:text-accent-300"
                      >
                        <span>{ref.url}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* PRICING, REGISTRATION, LOGIN & CHECKOUT FLOW */}
          {(page === 'pricing' ||
            page === 'register' ||
            page === 'login' ||
            page === 'checkout') && (
            <PricingCheckoutFlow
              locale={locale}
              page={page}
              user={publicUser}
              authLoading={authLoading}
              onUserAuthenticated={handleUserAuthenticated}
              onUserLogout={handlePublicLogout}
              onNavigatePublic={onNavigatePublic}
              onOpenCustomerWorkspace={onOpenCustomerWorkspace}
            />
          )}
        </article>
      </main>

      {/* Semantic Footer with Legal, Repository, Language & Crawler Transparency */}
      <footer className="border-t border-surface-800/80 bg-surface-950/90 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-surface-950" fill="currentColor" />
                </div>
                <span className="text-base font-bold text-white">AI App Builder</span>
              </div>
              <p className="text-xs text-surface-300 leading-relaxed">
                {content.footer.productIdentity}
              </p>
              <p className="text-xs text-surface-400">
                <a
                  href={content.footer.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-accent-400 hover:text-accent-300"
                >
                  <span>{content.footer.repositoryLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
              <p className="text-xs text-surface-400 pt-1">{content.footer.adminNotice}</p>
            </div>

            <div className="md:col-span-3 space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
                {content.footer.navigationTitle}
              </h2>
              <ul className="space-y-1.5 text-xs">
                {navPages.map((item) => (
                  <li key={item.key}>
                    <a
                      href={getPublicPath(locale, item.key)}
                      onClick={(e) => handleLinkClick(e, locale, item.key)}
                      className="text-surface-400 hover:text-accent-300 transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="/sitemap.xml"
                    className="text-surface-400 hover:text-accent-300 transition-colors font-mono"
                  >
                    /sitemap.xml
                  </a>
                </li>
                <li>
                  <a
                    href="/robots.txt"
                    className="text-surface-400 hover:text-accent-300 transition-colors font-mono"
                  >
                    /robots.txt
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
                {content.footer.languagesTitle}
              </h2>
              <ul className="grid grid-cols-2 gap-2 text-xs">
                {SUPPORTED_LOCALES.map((loc) => (
                  <li key={loc}>
                    <a
                      href={getPublicPath(loc, page)}
                      hrefLang={loc}
                      lang={loc}
                      onClick={(e) => handleLinkClick(e, loc, page)}
                      className={`inline-flex items-center gap-1.5 ${
                        loc === locale
                          ? 'text-accent-300 font-semibold'
                          : 'text-surface-400 hover:text-white'
                      }`}
                    >
                      <span>{LOCALE_LABELS[loc].label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-surface-800/60 text-xs text-surface-400">
            <div className="space-y-1">
              <strong className="text-surface-200 block">{content.footer.legalNoticeTitle}</strong>
              <p className="leading-relaxed">{content.footer.legalNoticeText}</p>
            </div>
            <div className="space-y-1">
              <strong className="text-surface-200 block">
                {content.footer.crawlerPolicyTitle}
              </strong>
              <p className="leading-relaxed">{content.footer.crawlerPolicyText}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
