import type { PublicLocale } from './i18n';

export type PlanId = 'free-byok' | 'pro-placeholder' | 'team-placeholder';
export type BillingPeriod = 'monthly' | 'annual';

export interface TrustedPlanDefinition {
  id: PlanId;
  tier: 'free' | 'paid';
  isConfigurablePlaceholder: boolean;
  currency: 'EUR';
  pricing: Record<
    BillingPeriod,
    {
      amount: number | null; // null means configurable placeholder (not yet set in billing provider)
      priceIdentifier: string;
    }
  >;
  entitlements: {
    localProjectsLimit: string;
    aiKeyMode: string;
    cloudSyncEnabled: boolean;
    managedAiCreditsIncluded: boolean;
  };
  translations: Record<
    PublicLocale,
    {
      name: string;
      badge: string;
      priceDisplay: Record<BillingPeriod, string>;
      periodLabel: Record<BillingPeriod, string>;
      summary: string;
      usageLimits: string[];
      features: string[];
      ctaLabel: string;
      termsNotice: string;
    }
  >;
}

/**
 * Single source of truth for plan definitions used by both client UI and server validation.
 * Note: Only 'free-byok' is currently active in the codebase. 'pro-placeholder' and
 * 'team-placeholder' are explicitly marked as configurable placeholders awaiting
 * commercial pricing and payment gateway setup.
 */
export const TRUSTED_PLANS: Record<PlanId, TrustedPlanDefinition> = {
  'free-byok': {
    id: 'free-byok',
    tier: 'free',
    isConfigurablePlaceholder: false,
    currency: 'EUR',
    pricing: {
      monthly: {
        amount: 0,
        priceIdentifier: 'price_free_byok_monthly_v1',
      },
      annual: {
        amount: 0,
        priceIdentifier: 'price_free_byok_annual_v1',
      },
    },
    entitlements: {
      localProjectsLimit: 'Unlimited (Browser localStorage)',
      aiKeyMode: 'BYOK (Bring Your Own Key)',
      cloudSyncEnabled: false,
      managedAiCreditsIncluded: false,
    },
    translations: {
      it: {
        name: 'Community Open-Source (BYOK)',
        badge: 'Gratuito • Attivo',
        priceDisplay: {
          monthly: '0 €',
          annual: '0 €',
        },
        periodLabel: {
          monthly: 'Gratuito per sempre (Chiave API propria)',
          annual: 'Gratuito per sempre (Chiave API propria)',
        },
        summary:
          'Piano attualmente implementato nel software: gestione progetti nel browser e utilizzo della propria chiave API personale (OpenAI, Anthropic, Gemini, Groq).',
        usageLimits: [
          'Progetti locali nel browser (localStorage): nessun limite software imposto',
          'Lunghezza nome progetto: 2–60 caratteri; descrizione: 10–2.000 caratteri',
          'Istruzioni per progetto: fino a 1.000 caratteri per singola istruzione',
          'Consumi API IA: addebitati direttamente dal tuo provider esterno (BYOK)',
        ],
        features: [
          '8 tipologie di progetto strutturate (Sito Web, Web App, Landing Page, E-commerce, Dashboard, Portfolio, Blog, Altro)',
          'Editor iterativo con Cronologia attività e filtri (INSTRUCTION / EXPORT)',
          'Anteprima HTML live in iframe isolato (Desktop 100%, Tablet 768px, Mobile 375px)',
          'Esportazione pacchetto specifica e codice in formato .txt con versione codice',
        ],
        ctaLabel: 'Scegli piano Gratuito',
        termsNotice:
          'Nessuna carta di credito richiesta. I dati dei progetti vengono salvati nel browser locale.',
      },
      en: {
        name: 'Community Open-Source (BYOK)',
        badge: 'Free • Active',
        priceDisplay: {
          monthly: '€0',
          annual: '€0',
        },
        periodLabel: {
          monthly: 'Free forever (Bring Your Own API Key)',
          annual: 'Free forever (Bring Your Own API Key)',
        },
        summary:
          'The plan currently implemented in the codebase: browser-based project workspace using your own personal API key (OpenAI, Anthropic, Gemini, Groq).',
        usageLimits: [
          'Local browser projects (localStorage): no software cap imposed',
          'Project name length: 2–60 chars; description: 10–2,000 chars',
          'Instructions per project: up to 1,000 characters per instruction',
          'AI API usage: billed directly by your chosen external provider (BYOK)',
        ],
        features: [
          '8 structured project categories (Website, Web App, Landing Page, E-commerce, Dashboard, Portfolio, Blog, Other)',
          'Iterative editor with Activity Log and filters (INSTRUCTION / EXPORT)',
          'Sandboxed live HTML preview (Desktop 100%, Tablet 768px, Mobile 375px)',
          'Project specification and code export (.txt) with deterministic version reference',
        ],
        ctaLabel: 'Choose Free Plan',
        termsNotice:
          'No credit card required. Project data is persisted locally in your browser.',
      },
      de: {
        name: 'Community Open-Source (BYOK)',
        badge: 'Kostenlos • Aktiv',
        priceDisplay: {
          monthly: '0 €',
          annual: '0 €',
        },
        periodLabel: {
          monthly: 'Dauerhaft kostenlos (Eigener API-Schlüssel)',
          annual: 'Dauerhaft kostenlos (Eigener API-Schlüssel)',
        },
        summary:
          'Der aktuell im Programmcode implementierte Tarif: lokale Projektverwaltung im Browser mit Ihrem eigenen API-Schlüssel (OpenAI, Anthropic, Gemini, Groq).',
        usageLimits: [
          'Lokale Browser-Projekte (localStorage): kein Software-Limit',
          'Projektname: 2–60 Zeichen; Beschreibung: 10–2.000 Zeichen',
          'Anweisungen pro Projekt: bis zu 1.000 Zeichen pro Eintrag',
          'KI-API-Verbrauch: direkte Abrechnung über Ihren externen Anbieter (BYOK)',
        ],
        features: [
          '8 strukturierte Projektkategorien (Website, Web-App, Landingpage, E-Commerce, Dashboard, Portfolio, Blog, Sonstiges)',
          'Iterativer Editor mit Aktivitätsprotokoll und Filtern (INSTRUCTION / EXPORT)',
          'Isolierte Live-HTML-Vorschau (Desktop 100%, Tablet 768px, Mobil 375px)',
          'Projektexport als .txt-Datei inklusive Code-Versionsreferenz',
        ],
        ctaLabel: 'Kostenlosen Tarif wählen',
        termsNotice:
          'Keine Kreditkarte erforderlich. Projektdaten werden lokal im Browser gespeichert.',
      },
      fr: {
        name: 'Communauté Open-Source (BYOK)',
        badge: 'Gratuit • Actif',
        priceDisplay: {
          monthly: '0 €',
          annual: '0 €',
        },
        periodLabel: {
          monthly: 'Gratuit sans limite de durée (Clé API personnelle)',
          annual: 'Gratuit sans limite de durée (Clé API personnelle)',
        },
        summary:
          'L\'offre actuellement implémentée dans le logiciel : gestion de projets dans le navigateur avec votre propre clé API (OpenAI, Anthropic, Gemini, Groq).',
        usageLimits: [
          'Projets locaux dans le navigateur (localStorage) : aucune limite logicielle',
          'Longueur du nom : 2–60 caractères ; description : 10–2 000 caractères',
          'Instructions par projet : jusqu\'à 1 000 caractères par instruction',
          'Consommation API IA : facturée directement par votre fournisseur externe (BYOK)',
        ],
        features: [
          '8 catégories de projets structurées (Site Web, App Web, Landing Page, E-commerce, Dashboard, Portfolio, Blog, Autre)',
          'Éditeur itératif avec journal d\'activité et filtres (INSTRUCTION / EXPORT)',
          'Aperçu HTML en direct dans un iframe isolé (Bureau 100 %, Tablette 768px, Mobile 375px)',
          'Exportation du projet en fichier .txt avec référence de version du code',
        ],
        ctaLabel: 'Choisir le forfait Gratuit',
        termsNotice:
          'Aucune carte bancaire requise. Les données des projets sont stockées localement dans votre navigateur.',
      },
    },
  },
  'pro-placeholder': {
    id: 'pro-placeholder',
    tier: 'paid',
    isConfigurablePlaceholder: true,
    currency: 'EUR',
    pricing: {
      monthly: {
        amount: null,
        priceIdentifier: 'placeholder_price_pro_monthly_unconfigured',
      },
      annual: {
        amount: null,
        priceIdentifier: 'placeholder_price_pro_annual_unconfigured',
      },
    },
    entitlements: {
      localProjectsLimit: 'Configurable Placeholder (Awaiting server quota & billing)',
      aiKeyMode: 'Configurable Placeholder (Awaiting managed AI quota & billing)',
      cloudSyncEnabled: false,
      managedAiCreditsIncluded: false,
    },
    translations: {
      it: {
        name: 'Pro Cloud & Crediti IA [Segnaposto Configurabile]',
        badge: 'A pagamento • In attesa di configurazione',
        priceDisplay: {
          monthly: 'Prezzo da definire (Segnaposto)',
          annual: 'Prezzo annuale da definire (Segnaposto)',
        },
        periodLabel: {
          monthly: 'Fatturazione mensile — In attesa di configurazione listino e gateway',
          annual: 'Fatturazione annuale — In attesa di configurazione listino e gateway',
        },
        summary:
          'Segnaposto configurabile per il piano individuale con crediti IA gestiti e sincronizzazione cloud. Non ancora acquistabile finché non vengono configurati prezzi reali, quote server-side e verifica pagamenti.',
        usageLimits: [
          'Quota crediti IA mensili inclusi: [In attesa di configurazione — richiede tetti server-side e listino]',
          'Archiviazione cloud multi-dispositivo: [In attesa di configurazione — richiede verifica identità unificata]',
          'Esportazione GitHub diretta: [In attesa di configurazione — richiede flusso OAuth sicuro per utente]',
        ],
        features: [
          'Tutte le funzionalità del piano Community Open-Source (BYOK)',
          '[In attesa di configurazione] Proxy backend gestito per generazione IA senza chiave propria',
          '[In attesa di configurazione] Sincronizzazione progetti e Cronologia attività su database cloud',
          '[In attesa di configurazione] Esportazione diretta su repository GitHub',
        ],
        ctaLabel: 'Scegli piano Pro',
        termsNotice:
          'Piano a pagamento non ancora attivabile: richiede configurazione dei prezzi, quote server-side e gateway di pagamento verificato.',
      },
      en: {
        name: 'Pro Cloud & AI Credits [Configurable Placeholder]',
        badge: 'Paid Plan • Awaiting Configuration',
        priceDisplay: {
          monthly: 'Price TBD (Placeholder)',
          annual: 'Annual Price TBD (Placeholder)',
        },
        periodLabel: {
          monthly: 'Monthly billing — Awaiting pricing & payment gateway setup',
          annual: 'Annual billing — Awaiting pricing & payment gateway setup',
        },
        summary:
          'Configurable placeholder for the individual tier with managed AI credits and cloud sync. Cannot be purchased or activated until actual prices, server-enforced quotas, and verified payment processing are configured.',
        usageLimits: [
          'Included monthly AI generation credits: [Awaiting configuration — requires server quotas & pricing]',
          'Cross-device persistent cloud storage: [Awaiting configuration — requires unified identity verification]',
          'Direct GitHub export: [Awaiting configuration — requires per-user OAuth setup]',
        ],
        features: [
          'All features included in the Community Open-Source (BYOK) plan',
          '[Awaiting configuration] Managed backend AI proxy without requiring your own API key',
          '[Awaiting configuration] Cloud database sync for projects and Activity Log history',
          '[Awaiting configuration] Direct push export to GitHub repositories',
        ],
        ctaLabel: 'Choose Pro Plan',
        termsNotice:
          'Paid plan cannot be activated yet: requires actual prices, server-enforced entitlements, and verified payment processing.',
      },
      de: {
        name: 'Pro Cloud & KI-Guthaben [Konfigurierbarer Platzhalter]',
        badge: 'Kostenpflichtig • Konfiguration ausstehend',
        priceDisplay: {
          monthly: 'Preis noch festzulegen (Platzhalter)',
          annual: 'Jahrespreis noch festzulegen (Platzhalter)',
        },
        periodLabel: {
          monthly: 'Monatliche Abrechnung — Preis- & Zahlungs-Setup ausstehend',
          annual: 'Jährliche Abrechnung — Preis- & Zahlungs-Setup ausstehend',
        },
        summary:
          'Konfigurierbarer Platzhalter für den Einzeltarif mit verwaltetem KI-Guthaben und Cloud-Synchronisierung. Nicht buchbar, bis Preise, Server-Kontingente und Zahlungsabwicklung konfiguriert sind.',
        usageLimits: [
          'Inklusive monatliche KI-Credits: [Konfiguration ausstehend — erfordert Server-Limits & Preise]',
          'Geräteübergreifender Cloud-Speicher: [Konfiguration ausstehend — erfordert Identitätsprüfung]',
          'Direkter GitHub-Export: [Konfiguration ausstehend — erfordert OAuth-Anbindung]',
        ],
        features: [
          'Alle Funktionen des Community Open-Source (BYOK) Tarifs',
          '[Konfiguration ausstehend] Verwalteter Backend-KI-Proxy ohne eigenen API-Schlüssel',
          '[Konfiguration ausstehend] Cloud-Synchronisierung für Projekte und Aktivitätsprotokoll',
          '[Konfiguration ausstehend] Direkter Export in GitHub-Repositories',
        ],
        ctaLabel: 'Pro-Tarif wählen',
        termsNotice:
          'Kostenpflichtiges Abonnement noch nicht aktivierbar: Preise, Kontingente und Zahlungsanbieter sind noch nicht konfiguriert.',
      },
      fr: {
        name: 'Pro Cloud & Crédits IA [Espace réservé configurable]',
        badge: 'Payant • En attente de configuration',
        priceDisplay: {
          monthly: 'Tarif à définir (Espace réservé)',
          annual: 'Tarif annuel à définir (Espace réservé)',
        },
        periodLabel: {
          monthly: 'Facturation mensuelle — En attente de configuration tarifaire et paiement',
          annual: 'Facturation annuelle — En attente de configuration tarifaire et paiement',
        },
        summary:
          'Espace réservé configurable pour le forfait individuel avec crédits IA gérés et synchronisation cloud. Non souscriptible tant que les tarifs, quotas serveur et paiements vérifiés ne sont pas configurés.',
        usageLimits: [
          'Crédits IA mensuels inclus : [En attente de configuration — requiert quotas serveur]',
          'Stockage cloud multi-appareils : [En attente de configuration — requiert identité vérifiée]',
          'Export GitHub direct : [En attente de configuration — requiert flux OAuth par utilisateur]',
        ],
        features: [
          'Toutes les fonctionnalités du forfait Communauté Open-Source (BYOK)',
          '[En attente de configuration] Proxy IA backend géré sans clé API personnelle',
          '[En attente de configuration] Synchronisation cloud des projets et du journal d\'activité',
          '[En attente de configuration] Exportation directe vers les dépôts GitHub',
        ],
        ctaLabel: 'Choisir le forfait Pro',
        termsNotice:
          'Forfait payant non activable : nécessite la configuration des tarifs, des quotas serveur et d\'un prestataire de paiement vérifié.',
      },
    },
  },
  'team-placeholder': {
    id: 'team-placeholder',
    tier: 'paid',
    isConfigurablePlaceholder: true,
    currency: 'EUR',
    pricing: {
      monthly: {
        amount: null,
        priceIdentifier: 'placeholder_price_team_monthly_unconfigured',
      },
      annual: {
        amount: null,
        priceIdentifier: 'placeholder_price_team_annual_unconfigured',
      },
    },
    entitlements: {
      localProjectsLimit: 'Configurable Placeholder (Multi-User Workspace)',
      aiKeyMode: 'Shared Team AI Quota + RBAC',
      cloudSyncEnabled: true,
      managedAiCreditsIncluded: true,
    },
    translations: {
      it: {
        name: 'Team & Agenzie [Segnaposto Configurabile]',
        badge: 'A pagamento • Da configurare',
        priceDisplay: {
          monthly: 'Prezzo da definire (Segnaposto)',
          annual: 'Prezzo annuale da definire (Segnaposto)',
        },
        periodLabel: {
          monthly: 'Fatturazione mensile per team — Richiede configurazione',
          annual: 'Fatturazione annuale per team — Richiede configurazione',
        },
        summary:
          'Segnaposto configurabile per team di prodotto e web agency. Richiede la definizione dei limiti per membro, ruoli RBAC e integrazione di fatturazione.',
        usageLimits: [
          'Numero di postazioni / membri del team: [Segnaposto da definire]',
          'Pool condiviso di crediti IA e limiti rate-limit: [Segnaposto da definire]',
          'Audit log centralizzato e controllo accessi: [Richiede database multi-utente]',
        ],
        features: [
          'Tutte le funzionalità previste nel piano Pro Cloud',
          '[In attesa di configurazione] Workspace condiviso multi-utente con permessi per ruolo',
          '[In attesa di configurazione] Cronologia attività e versioni codice condivise tra collaboratori',
          '[In attesa di configurazione] Fatturazione centralizzata e gestione crediti di team',
        ],
        ctaLabel: 'Scegli piano Team',
        termsNotice:
          'Piano a pagamento non ancora attivabile: nessun gateway di pagamento è configurato sul server.',
      },
      en: {
        name: 'Team & Agencies [Configurable Placeholder]',
        badge: 'Paid Plan • Unconfigured',
        priceDisplay: {
          monthly: 'Price TBD (Placeholder)',
          annual: 'Annual Price TBD (Placeholder)',
        },
        periodLabel: {
          monthly: 'Monthly team billing — Requires setup',
          annual: 'Annual team billing — Requires setup',
        },
        summary:
          'Configurable placeholder for product teams and digital agencies. Requires seat limits, role-based access rules, and billing provider setup.',
        usageLimits: [
          'Team seats / collaborators included: [Configurable placeholder — requires decision]',
          'Shared AI credit pool & rate limits: [Configurable placeholder — requires decision]',
          'Centralized team Activity Log & RBAC: [Requires multi-user database]',
        ],
        features: [
          'All capabilities planned in the Pro Cloud tier',
          '[Pending configuration] Shared multi-user workspace with role-based permissions',
          '[Pending configuration] Collaborative Activity Log and code version history',
          '[Pending configuration] Centralized team billing and credit allocation',
        ],
        ctaLabel: 'Choose Team Plan',
        termsNotice:
          'Paid plan cannot be activated yet: no payment provider is configured on the server.',
      },
      de: {
        name: 'Team & Agenturen [Konfigurierbarer Platzhalter]',
        badge: 'Kostenpflichtig • Nicht konfiguriert',
        priceDisplay: {
          monthly: 'Preis noch festzulegen (Platzhalter)',
          annual: 'Jahrespreis noch festzulegen (Platzhalter)',
        },
        periodLabel: {
          monthly: 'Monatliche Team-Abrechnung — Konfiguration erforderlich',
          annual: 'Jährliche Team-Abrechnung — Konfiguration erforderlich',
        },
        summary:
          'Konfigurierbarer Platzhalter für Produktteams und Agenturen. Erfordert die Festlegung von Nutzerplätzen, Zugriffsrechten und Zahlungsanbindung.',
        usageLimits: [
          'Enthaltene Team-Mitglieder / Plätze: [Konfigurierbarer Platzhalter]',
          'Gemeinsames KI-Guthaben & Rate-Limits: [Konfigurierbarer Platzhalter]',
          'Zentrales Team-Aktivitätsprotokoll & Rollen: [Erfordert Mehrbenutzer-Datenbank]',
        ],
        features: [
          'Alle geplanten Funktionen des Pro Cloud Tarifs',
          '[Konfiguration ausstehend] Gemeinsamer Arbeitsbereich mit Rollenberechtigungen',
          '[Konfiguration ausstehend] Teamweiter Aktivitäts- und Code-Versionsverlauf',
          '[Konfiguration ausstehend] Zentrale Team-Abrechnung und Kontingentverwaltung',
        ],
        ctaLabel: 'Team-Tarif wählen',
        termsNotice:
          'Kostenpflichtiges Abonnement noch nicht aktivierbar: Kein Zahlungsanbieter konfiguriert.',
      },
      fr: {
        name: 'Équipe & Agences [Espace réservé configurable]',
        badge: 'Payant • Non configuré',
        priceDisplay: {
          monthly: 'Tarif à définir (Espace réservé)',
          annual: 'Tarif annuel à définir (Espace réservé)',
        },
        periodLabel: {
          monthly: 'Facturation mensuelle d\'équipe — Configuration requise',
          annual: 'Facturation annuelle d\'équipe — Configuration requise',
        },
        summary:
          'Espace réservé configurable pour les équipes produit et agences digitales. Nécessite de définir le nombre de sièges, les rôles et le prestataire de paiement.',
        usageLimits: [
          'Membres d\'équipe / sièges inclus : [Espace réservé configurable]',
          'Quota partagé de crédits IA : [Espace réservé configurable]',
          'Journal d\'activité d\'équipe & contrôle d\'accès : [Requiert base multi-utilisateurs]',
        ],
        features: [
          'Toutes les capacités prévues dans le forfait Pro Cloud',
          '[En attente de configuration] Espace collaboratif multi-utilisateurs avec rôles',
          '[En attente de configuration] Historique d\'activité et versions de code partagés',
          '[En attente de configuration] Facturation centralisée et gestion des crédits d\'équipe',
        ],
        ctaLabel: 'Choisir le forfait Équipe',
        termsNotice:
          'Forfait payant non activable : aucun prestataire de paiement n\'est configuré sur le serveur.',
      },
    },
  },
};

export const PLAN_ORDER: PlanId[] = ['free-byok', 'pro-placeholder', 'team-placeholder'];

export interface PendingPlanSelection {
  planId: PlanId;
  billingPeriod: BillingPeriod;
  priceIdentifier: string;
}

export function isValidPlanId(value: unknown): value is PlanId {
  return (
    typeof value === 'string' &&
    (value === 'free-byok' || value === 'pro-placeholder' || value === 'team-placeholder')
  );
}

export function isValidBillingPeriod(value: unknown): value is BillingPeriod {
  return value === 'monthly' || value === 'annual';
}

/**
 * Validates a candidate plan ID and billing period against the trusted configuration.
 * Always resolves priceIdentifier and price details from TRUSTED_PLANS, never from client input.
 */
export function resolveTrustedPlanSelection(
  rawPlanId: unknown,
  rawPeriod?: unknown,
): {
  valid: boolean;
  selection: PendingPlanSelection | null;
  plan: TrustedPlanDefinition | null;
  errorCode?: 'MISSING_PLAN' | 'INVALID_PLAN_ID';
} {
  if (!rawPlanId || (typeof rawPlanId === 'string' && !rawPlanId.trim())) {
    return { valid: false, selection: null, plan: null, errorCode: 'MISSING_PLAN' };
  }

  if (!isValidPlanId(rawPlanId)) {
    return { valid: false, selection: null, plan: null, errorCode: 'INVALID_PLAN_ID' };
  }

  const billingPeriod: BillingPeriod = isValidBillingPeriod(rawPeriod) ? rawPeriod : 'monthly';
  const plan = TRUSTED_PLANS[rawPlanId];
  const trustedPriceId = plan.pricing[billingPeriod].priceIdentifier;

  return {
    valid: true,
    plan,
    selection: {
      planId: plan.id,
      billingPeriod,
      priceIdentifier: trustedPriceId,
    },
  };
}
