import React, { useState, useEffect, useCallback } from 'react';
import type { PublicLocale, PublicPageKey } from '@/lib/i18n';
import {
  TRUSTED_PLANS,
  PLAN_ORDER,
  resolveTrustedPlanSelection,
  type PlanId,
  type BillingPeriod,
  type PendingPlanSelection,
} from '@/lib/plans';
import { STORAGE_KEYS } from '@/lib/constants';
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Shield,
  AlertTriangle,
  Lock,
  UserPlus,
  LogIn,
  CreditCard,
  Sparkles,
  Loader2,
  Check,
  Info,
  LogOut,
  User,
} from 'lucide-react';

export interface PublicAuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  activeSubscription: {
    planId: PlanId;
    billingPeriod: BillingPeriod;
    priceIdentifier: string;
    status: 'active';
    activatedAt: string;
  } | null;
}

interface PricingCheckoutFlowProps {
  locale: PublicLocale;
  page: 'pricing' | 'register' | 'login' | 'checkout';
  user: PublicAuthenticatedUser | null;
  authLoading: boolean;
  onUserAuthenticated: (user: PublicAuthenticatedUser) => void;
  onUserLogout: () => Promise<void>;
  onNavigatePublic: (
    locale: PublicLocale,
    page: PublicPageKey,
    queryParams?: Record<string, string>,
  ) => void;
  onOpenCustomerWorkspace: () => void;
}

interface FlowTranslations {
  billingToggleLabel: string;
  monthlyLabel: string;
  annualLabel: string;
  freeTierBadge: string;
  paidTierBadge: string;
  featuresHeading: string;
  limitsHeading: string;
  backToHome: string;
  alreadyHaveAccount: string;
  createAnAccount: string;
  loggedInAs: string;
  logoutLabel: string;
  openWorkspaceLabel: string;
  goToCheckoutForSelected: string;
  configurationNoticeTitle: string;
  configurationNoticeBody: string;
  selectedPlanBannerTitle: string;
  changePlanLabel: string;
  invalidPlanAlertTitle: string;
  invalidPlanAlertBody: string;
  missingPlanAlertTitle: string;
  missingPlanAlertBody: string;
  // Registration & Login
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  registerSubmit: string;
  loginSubmit: string;
  switchToLoginPrompt: string;
  switchToLoginLink: string;
  switchToRegisterPrompt: string;
  switchToRegisterLink: string;
  emailVerificationNote: string;
  // Checkout
  checkoutSummaryHeading: string;
  selectedPlanLabel: string;
  billingPeriodLabel: string;
  verifiedPriceLabel: string;
  priceIdLabel: string;
  termsHeading: string;
  continueToPaymentBtn: string;
  activateFreePlanBtn: string;
  paymentSetupRequiredTitle: string;
  paymentSetupRequiredBody: string;
  missingConfigListTitle: string;
  missingConfigItems: string[];
  noCardCollectedNotice: string;
  subscriptionActiveTitle: string;
  subscriptionActiveBody: string;
  activePlanBadge: string;
}

const FLOW_I18N: Record<PublicLocale, FlowTranslations> = {
  it: {
    billingToggleLabel: 'Periodo di fatturazione',
    monthlyLabel: 'Mensile',
    annualLabel: 'Annuale',
    freeTierBadge: 'PIANO GRATUITO (ATTIVO)',
    paidTierBadge: 'PIANO A PAGAMENTO (SEGNAPOSTO CONFIGURABILE)',
    featuresHeading: 'Funzionalità incluse',
    limitsHeading: 'Quote e limiti di utilizzo',
    backToHome: 'Torna alla Panoramica pubblica',
    alreadyHaveAccount: 'Hai già un account? Accedi',
    createAnAccount: 'Nuovo utente? Registrati',
    loggedInAs: 'Autenticato come',
    logoutLabel: 'Esci',
    openWorkspaceLabel: 'Apri il tuo Workspace Cliente',
    goToCheckoutForSelected: 'Vai al Checkout del piano selezionato',
    configurationNoticeTitle: 'Stato reale della configurazione piani e pagamenti',
    configurationNoticeBody:
      'Il piano gratuito Community Open-Source (BYOK) è pienamente operativo. I piani a pagamento (Pro e Team) sono predisposti come segnaposto configurabili: la definizione commerciale dei prezzi e il collegamento di un gateway di pagamento (es. Stripe) richiedono configurazione lato server.',
    selectedPlanBannerTitle: 'Piano selezionato preservato per il tuo account',
    changePlanLabel: 'Cambia piano',
    invalidPlanAlertTitle: 'Identificativo del piano non valido',
    invalidPlanAlertBody:
      'Il parametro del piano fornito non corrisponde a nessun piano attendibile configurato sul server. Seleziona un piano valido qui sotto per continuare.',
    missingPlanAlertTitle: 'Nessun piano selezionato',
    missingPlanAlertBody:
      'Seleziona prima un piano dalla tabella prezzi per procedere alla registrazione o al checkout.',
    nameLabel: 'Nome completo',
    namePlaceholder: 'es. Giulia Bianchi',
    emailLabel: 'Indirizzo email',
    emailPlaceholder: 'nome@esempio.it',
    passwordLabel: 'Password (minimo 8 caratteri)',
    passwordPlaceholder: 'Almeno 8 caratteri',
    registerSubmit: 'Crea account e continua',
    loginSubmit: 'Accedi e continua',
    switchToLoginPrompt: 'Hai già un account registrato?',
    switchToLoginLink: 'Accedi mantenendo il piano scelto',
    switchToRegisterPrompt: 'Non hai ancora un account?',
    switchToRegisterLink: 'Registrati mantenendo il piano scelto',
    emailVerificationNote:
      'Il tuo piano selezionato rimane associato durante la registrazione, la verifica dell\'account e il login.',
    checkoutSummaryHeading: 'Riepilogo verificato dell\'ordine',
    selectedPlanLabel: 'Piano selezionato',
    billingPeriodLabel: 'Periodo di fatturazione',
    verifiedPriceLabel: 'Prezzo verificato dal server',
    priceIdLabel: 'ID listino server',
    termsHeading: 'Termini e condizioni del piano',
    continueToPaymentBtn: 'Continua al pagamento',
    activateFreePlanBtn: 'Conferma piano Gratuito (0 €) e apri il tuo Workspace',
    paymentSetupRequiredTitle: 'Configurazione del checkout in attesa (Gateway non configurato)',
    paymentSetupRequiredBody:
      'Nessun provider di pagamento è attualmente configurato sul server. In conformità con le regole di sicurezza, i pagamenti non vengono simulati e i piani a pagamento non vengono attivati senza conferma verificata dal gateway.',
    missingConfigListTitle: 'Elementi mancanti prima di poter accettare pagamenti reali:',
    missingConfigItems: [
      'Chiave segreta lato server del provider di pagamento (es. STRIPE_SECRET_KEY nelle variabili d\'ambiente del server).',
      'Listino prezzi ufficiale e identificativi di prezzo reali (price_...) definiti nel provider di fatturazione per i piani Pro e Team.',
      'Endpoint webhook firmato (/api/webhooks/payment) per verificare la conferma di pagamento prima di attivare l\'abbonamento.',
    ],
    noCardCollectedNotice:
      'Sicurezza: questa applicazione non raccoglie né memorizza mai i dati della carta di credito direttamente nel browser o nel database locale.',
    subscriptionActiveTitle: 'Piano attivato con successo sul tuo account',
    subscriptionActiveBody:
      'Il piano selezionato è stato verificato dal server e associato al tuo profilo utente.',
    activePlanBadge: 'Piano Attivo sul tuo Account',
  },
  en: {
    billingToggleLabel: 'Billing period',
    monthlyLabel: 'Monthly',
    annualLabel: 'Annual',
    freeTierBadge: 'FREE PLAN (ACTIVE)',
    paidTierBadge: 'PAID PLAN (CONFIGURABLE PLACEHOLDER)',
    featuresHeading: 'Included features',
    limitsHeading: 'Usage limits & quotas',
    backToHome: 'Back to public Overview',
    alreadyHaveAccount: 'Already have an account? Log in',
    createAnAccount: 'New user? Register',
    loggedInAs: 'Signed in as',
    logoutLabel: 'Log out',
    openWorkspaceLabel: 'Open your Customer Workspace',
    goToCheckoutForSelected: 'Continue to Checkout for selected plan',
    configurationNoticeTitle: 'Current Plan & Payment Configuration Status',
    configurationNoticeBody:
      'The Free Community Open-Source (BYOK) plan is active and ready to use. Paid tiers (Pro and Team) are structured as configurable placeholders: commercial pricing decisions and payment provider integration (e.g., Stripe) require server-side configuration.',
    selectedPlanBannerTitle: 'Selected plan preserved for your session',
    changePlanLabel: 'Change plan',
    invalidPlanAlertTitle: 'Invalid plan identifier rejected',
    invalidPlanAlertBody:
      'The requested plan ID does not match any trusted plan in the server configuration. Please choose a valid plan below to proceed.',
    missingPlanAlertTitle: 'No plan selected',
    missingPlanAlertBody:
      'Please select a plan from the pricing cards below before proceeding to checkout.',
    nameLabel: 'Full name',
    namePlaceholder: 'e.g. Alex Morgan',
    emailLabel: 'Email address',
    emailPlaceholder: 'name@example.com',
    passwordLabel: 'Password (minimum 8 characters)',
    passwordPlaceholder: 'At least 8 characters',
    registerSubmit: 'Create account & continue',
    loginSubmit: 'Sign in & continue',
    switchToLoginPrompt: 'Already have an existing account?',
    switchToLoginLink: 'Log in while keeping your selected plan',
    switchToRegisterPrompt: 'Don\'t have an account yet?',
    switchToRegisterLink: 'Register while keeping your selected plan',
    emailVerificationNote:
      'Your selected plan is preserved throughout registration, account verification, and sign-in.',
    checkoutSummaryHeading: 'Server-Verified Checkout Summary',
    selectedPlanLabel: 'Selected plan',
    billingPeriodLabel: 'Billing period',
    verifiedPriceLabel: 'Server-verified price',
    priceIdLabel: 'Trusted price ID',
    termsHeading: 'Included features & relevant terms',
    continueToPaymentBtn: 'Continue to payment',
    activateFreePlanBtn: 'Confirm Free Plan (€0) & Open Customer Workspace',
    paymentSetupRequiredTitle: 'Checkout Setup Pending (Payment Provider Not Configured)',
    paymentSetupRequiredBody:
      'No payment provider is currently configured on the server. Successful payments are never simulated, and paid subscriptions cannot be activated without verified server-side payment confirmation.',
    missingConfigListTitle: 'Configuration required before real payments can be accepted:',
    missingConfigItems: [
      'Server-side payment provider secret key (e.g., STRIPE_SECRET_KEY in server environment variables).',
      'Commercial price amounts and official server-side price identifiers (price_...) for the Pro and Team plans.',
      'Signed webhook verification endpoint (/api/webhooks/payment) to confirm payment settlement before activating subscriptions.',
    ],
    noCardCollectedNotice:
      'Security guarantee: this application never collects or stores credit card details directly.',
    subscriptionActiveTitle: 'Subscription active on your account',
    subscriptionActiveBody:
      'Your selected plan has been verified by the server and linked to your authenticated user account.',
    activePlanBadge: 'Active Plan on Your Account',
  },
  de: {
    billingToggleLabel: 'Abrechnungszeitraum',
    monthlyLabel: 'Monatlich',
    annualLabel: 'Jährlich',
    freeTierBadge: 'KOSTENLOSER TARIF (AKTIV)',
    paidTierBadge: 'KOSTENPFLICHTIGER TARIF (KONFIGURIERBARER PLATZHALTER)',
    featuresHeading: 'Enthaltene Funktionen',
    limitsHeading: 'Nutzungslimits & Kontingente',
    backToHome: 'Zurück zur öffentlichen Übersicht',
    alreadyHaveAccount: 'Bereits registriert? Anmelden',
    createAnAccount: 'Neuer Nutzer? Konto erstellen',
    loggedInAs: 'Angemeldet als',
    logoutLabel: 'Abmelden',
    openWorkspaceLabel: 'Kunden-Workspace öffnen',
    goToCheckoutForSelected: 'Weiter zum Checkout für den gewählten Tarif',
    configurationNoticeTitle: 'Aktueller Konfigurationsstatus für Tarife & Zahlungen',
    configurationNoticeBody:
      'Der kostenlose Community Open-Source (BYOK) Tarif ist aktiv. Kostenpflichtige Tarife (Pro und Team) sind als konfigurierbare Platzhalter eingerichtet: Endgültige Preise und die Anbindung eines Zahlungsanbieters (z. B. Stripe) erfordern eine serverseitige Konfiguration.',
    selectedPlanBannerTitle: 'Gewählter Tarif bleibt gespeichert',
    changePlanLabel: 'Tarif ändern',
    invalidPlanAlertTitle: 'Ungültige Tarif-ID abgelehnt',
    invalidPlanAlertBody:
      'Die übergebene Tarif-ID stimmt mit keinem vertrauenswürdigen Tarif der Serverkonfiguration überein. Bitte wählen Sie unten einen gültigen Tarif aus.',
    missingPlanAlertTitle: 'Kein Tarif ausgewählt',
    missingPlanAlertBody:
      'Bitte wählen Sie zuerst einen Tarif aus der Preisübersicht, um fortzufahren.',
    nameLabel: 'Vollständiger Name',
    namePlaceholder: 'z. B. Lukas Weber',
    emailLabel: 'E-Mail-Adresse',
    emailPlaceholder: 'name@beispiel.de',
    passwordLabel: 'Passwort (mindestens 8 Zeichen)',
    passwordPlaceholder: 'Mindestens 8 Zeichen',
    registerSubmit: 'Konto erstellen & fortfahren',
    loginSubmit: 'Anmelden & fortfahren',
    switchToLoginPrompt: 'Sie haben bereits ein Konto?',
    switchToLoginLink: 'Anmelden (Tarifauswahl bleibt erhalten)',
    switchToRegisterPrompt: 'Noch kein Konto vorhanden?',
    switchToRegisterLink: 'Registrieren (Tarifauswahl bleibt erhalten)',
    emailVerificationNote:
      'Ihre Tarifauswahl bleibt während der Registrierung, Verifizierung und Anmeldung gespeichert.',
    checkoutSummaryHeading: 'Serverseitig geprüfte Checkout-Übersicht',
    selectedPlanLabel: 'Gewählter Tarif',
    billingPeriodLabel: 'Abrechnungszeitraum',
    verifiedPriceLabel: 'Serverseitig geprüfter Preis',
    priceIdLabel: 'Geprüfte Preis-ID',
    termsHeading: 'Enthaltene Leistungen & Bedingungen',
    continueToPaymentBtn: 'Weiter zur Zahlung',
    activateFreePlanBtn: 'Kostenlosen Tarif bestätigen (0 €) & Kunden-Workspace öffnen',
    paymentSetupRequiredTitle: 'Checkout-Einrichtung ausstehend (Zahlungsanbieter nicht konfiguriert)',
    paymentSetupRequiredBody:
      'Derzeit ist kein Zahlungsanbieter auf dem Server konfiguriert. Zahlungen werden nicht simuliert und kostenpflichtige Abonnements werden ohne verifizierte Zahlungsbestätigung nicht aktiviert.',
    missingConfigListTitle: 'Fehlende Konfiguration vor der Annahme echter Zahlungen:',
    missingConfigItems: [
      'Serverseitiger geheimer API-Schlüssel des Zahlungsanbieters (z. B. STRIPE_SECRET_KEY).',
      'Festgelegte Preise und offizielle Preis-IDs (price_...) für die Tarife Pro und Team.',
      'Signierter Webhook-Endpunkt (/api/webhooks/payment) zur Bestätigung erfolgreicher Zahlungen.',
    ],
    noCardCollectedNotice:
      'Sicherheitshinweis: Diese Anwendung erfasst oder speichert niemals direkt Kreditkartendaten.',
    subscriptionActiveTitle: 'Tarif erfolgreich für Ihr Konto aktiviert',
    subscriptionActiveBody:
      'Ihr gewählter Tarif wurde vom Server bestätigt und mit Ihrem Benutzerkonto verknüpft.',
    activePlanBadge: 'Aktiver Tarif Ihres Kontos',
  },
  fr: {
    billingToggleLabel: 'Période de facturation',
    monthlyLabel: 'Mensuel',
    annualLabel: 'Annuel',
    freeTierBadge: 'FORFAIT GRATUIT (ACTIF)',
    paidTierBadge: 'FORFAIT PAYANT (ESPACE RÉSERVÉ CONFIGURABLE)',
    featuresHeading: 'Fonctionnalités incluses',
    limitsHeading: 'Quotas et limites d\'utilisation',
    backToHome: 'Retour à l\'aperçu public',
    alreadyHaveAccount: 'Déjà un compte ? Se connecter',
    createAnAccount: 'Nouvel utilisateur ? S\'inscrire',
    loggedInAs: 'Connecté en tant que',
    logoutLabel: 'Déconnexion',
    openWorkspaceLabel: 'Ouvrir votre Espace Client',
    goToCheckoutForSelected: 'Continuer vers le paiement du forfait choisi',
    configurationNoticeTitle: 'État de la configuration des forfaits et du paiement',
    configurationNoticeBody:
      'Le forfait gratuit Communauté Open-Source (BYOK) est opérationnel. Les offres payantes (Pro et Équipe) sont des espaces réservés configurables : la tarification commerciale et l\'intégration d\'un prestataire de paiement (ex. Stripe) nécessitent une configuration côté serveur.',
    selectedPlanBannerTitle: 'Forfait sélectionné conservé pour votre session',
    changePlanLabel: 'Modifier le forfait',
    invalidPlanAlertTitle: 'Identifiant de forfait non valide rejeté',
    invalidPlanAlertBody:
      'L\'identifiant fourni ne correspond à aucun forfait autorisé sur le serveur. Veuillez sélectionner un forfait valide ci-dessous.',
    missingPlanAlertTitle: 'Aucun forfait sélectionné',
    missingPlanAlertBody:
      'Veuillez sélectionner un forfait dans la grille tarifaire avant de passer à la validation.',
    nameLabel: 'Nom complet',
    namePlaceholder: 'ex. Claire Dubois',
    emailLabel: 'Adresse e-mail',
    emailPlaceholder: 'nom@exemple.fr',
    passwordLabel: 'Mot de passe (minimum 8 caractères)',
    passwordPlaceholder: 'Au moins 8 caractères',
    registerSubmit: 'Créer un compte et continuer',
    loginSubmit: 'Se connecter et continuer',
    switchToLoginPrompt: 'Vous avez déjà un compte ?',
    switchToLoginLink: 'Se connecter en conservant le forfait choisi',
    switchToRegisterPrompt: 'Pas encore de compte ?',
    switchToRegisterLink: 'S\'inscrire en conservant le forfait choisi',
    emailVerificationNote:
      'Votre forfait sélectionné est conservé tout au long de l\'inscription, de la vérification et de la connexion.',
    checkoutSummaryHeading: 'Récapitulatif vérifié par le serveur',
    selectedPlanLabel: 'Forfait sélectionné',
    billingPeriodLabel: 'Période de facturation',
    verifiedPriceLabel: 'Tarif vérifié côté serveur',
    priceIdLabel: 'ID tarifaire serveur',
    termsHeading: 'Fonctionnalités incluses et conditions applicables',
    continueToPaymentBtn: 'Continuer vers le paiement',
    activateFreePlanBtn: 'Confirmer le forfait Gratuit (0 €) et ouvrir l\'Espace Client',
    paymentSetupRequiredTitle: 'Configuration du paiement en attente (Prestataire non configuré)',
    paymentSetupRequiredBody:
      'Aucun prestataire de paiement n\'est configuré sur le serveur. Les paiements ne sont jamais simulés et aucun abonnement payant n\'est activé sans confirmation vérifiée.',
    missingConfigListTitle: 'Configuration requise avant d\'accepter des paiements réels :',
    missingConfigItems: [
      'Clé secrète serveur du prestataire de paiement (ex. STRIPE_SECRET_KEY).',
      'Tarifs définitifs et identifiants de prix officiels (price_...) pour les forfaits Pro et Équipe.',
      'Point de terminaison webhook signé (/api/webhooks/payment) pour valider le paiement avant l\'activation.',
    ],
    noCardCollectedNotice:
      'Sécurité : cette application ne collecte ni ne stocke jamais directement de coordonnées bancaires.',
    subscriptionActiveTitle: 'Forfait activé sur votre compte',
    subscriptionActiveBody:
      'Votre forfait a été vérifié par le serveur et associé à votre compte utilisateur.',
    activePlanBadge: 'Forfait Actif sur votre Compte',
  },
};

function readUrlAndStoragePlan(): {
  selection: PendingPlanSelection | null;
  invalidSuppliedId: string | null;
} {
  if (typeof window === 'undefined') {
    return { selection: null, invalidSuppliedId: null };
  }

  const params = new URLSearchParams(window.location.search);
  const queryPlan = params.get('plan');
  const queryPeriod = params.get('period');

  if (queryPlan !== null) {
    const check = resolveTrustedPlanSelection(queryPlan, queryPeriod);
    if (!check.valid || !check.selection) {
      return { selection: null, invalidSuppliedId: queryPlan || '(empty)' };
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.PENDING_PLAN, JSON.stringify(check.selection));
    } catch {
      // ignore storage errors
    }
    return { selection: check.selection, invalidSuppliedId: null };
  }

  // Fallback to localStorage if URL does not carry ?plan=
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PENDING_PLAN);
    if (!raw) return { selection: null, invalidSuppliedId: null };
    const parsed = JSON.parse(raw) as Partial<PendingPlanSelection>;
    const check = resolveTrustedPlanSelection(parsed?.planId, parsed?.billingPeriod);
    if (!check.valid || !check.selection) {
      window.localStorage.removeItem(STORAGE_KEYS.PENDING_PLAN);
      return { selection: null, invalidSuppliedId: String(parsed?.planId || '') };
    }
    return { selection: check.selection, invalidSuppliedId: null };
  } catch {
    return { selection: null, invalidSuppliedId: null };
  }
}

export default function PricingCheckoutFlow({
  locale,
  page,
  user,
  authLoading,
  onUserAuthenticated,
  onUserLogout,
  onNavigatePublic,
  onOpenCustomerWorkspace,
}: PricingCheckoutFlowProps) {
  const t = FLOW_I18N[locale];
  const initialPlanState = readUrlAndStoragePlan();

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(
    initialPlanState.selection?.billingPeriod || 'monthly',
  );
  const [pendingSelection, setPendingSelection] = useState<PendingPlanSelection | null>(
    initialPlanState.selection,
  );
  const [invalidPlanIdNotice, setInvalidPlanIdNotice] = useState<string | null>(
    initialPlanState.invalidSuppliedId,
  );

  // Registration & Login form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Checkout server verification & action state
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutPaymentAlert, setCheckoutPaymentAlert] = useState<{
    error: string;
    missingConfiguration: string[];
  } | null>(null);
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState<boolean>(false);

  // Synchronize pending plan selection when URL changes (back/forward navigation or refresh)
  useEffect(() => {
    const syncFromUrl = () => {
      const current = readUrlAndStoragePlan();
      setPendingSelection(current.selection);
      setInvalidPlanIdNotice(current.invalidSuppliedId);
      if (current.selection) {
        setBillingPeriod(current.selection.billingPeriod);
      }
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [page, locale]);

  const persistSelection = useCallback((sel: PendingPlanSelection) => {
    setPendingSelection(sel);
    setInvalidPlanIdNotice(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEYS.PENDING_PLAN, JSON.stringify(sel));
      } catch {
        // ignore
      }
    }
  }, []);

  // When a visitor clicks "Choose plan"
  const handleChoosePlan = async (planId: PlanId) => {
    const check = resolveTrustedPlanSelection(planId, billingPeriod);
    if (!check.valid || !check.selection || !check.plan) {
      setInvalidPlanIdNotice(String(planId));
      return;
    }

    persistSelection(check.selection);
    setCheckoutPaymentAlert(null);
    setCheckoutSuccessMessage(false);

    const queryParams = {
      plan: check.selection.planId,
      period: check.selection.billingPeriod,
    };

    // If visitor is already authenticated:
    // - For Free plan, activate if needed and open the customer's own workspace directly
    // - For paid plans, show the selected plan summary in checkout
    if (user) {
      if (check.plan.tier === 'free') {
        try {
          const res = await fetch('/api/checkout/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              planId: check.selection.planId,
              billingPeriod: check.selection.billingPeriod,
            }),
          });
          const data = await res.json();
          if (res.ok && data.activated && data.subscription) {
            onUserAuthenticated({ ...user, activeSubscription: data.subscription });
          }
        } catch {
          // ignore
        }
        onOpenCustomerWorkspace();
      } else {
        onNavigatePublic(locale, 'checkout', queryParams);
      }
    } else {
      onNavigatePublic(locale, 'register', queryParams);
    }
  };

  // If authenticated user visits /register or /login with a valid pending plan:
  // - For Free plan, open the customer's own workspace
  // - For paid plans, continue automatically to checkout
  useEffect(() => {
    if (authLoading || !user) return;
    if (page === 'register' || page === 'login') {
      if (pendingSelection) {
        const planDef = TRUSTED_PLANS[pendingSelection.planId];
        if (planDef?.tier === 'free') {
          onOpenCustomerWorkspace();
        } else {
          onNavigatePublic(locale, 'checkout', {
            plan: pendingSelection.planId,
            period: pendingSelection.billingPeriod,
          });
        }
      } else {
        onOpenCustomerWorkspace();
      }
    }
  }, [authLoading, user, page, pendingSelection, locale, onNavigatePublic, onOpenCustomerWorkspace]);

  const handleAuthSubmit = async (e: React.FormEvent, mode: 'register' | 'login') => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);

    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const payload =
        mode === 'register'
          ? {
              name,
              email,
              password,
              planId: pendingSelection?.planId,
              billingPeriod: pendingSelection?.billingPeriod,
            }
          : {
              email,
              password,
              planId: pendingSelection?.planId,
              billingPeriod: pendingSelection?.billingPeriod,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.authenticated) {
        setFormError(data.error || 'Authentication failed.');
        setFormSubmitting(false);
        return;
      }

      onUserAuthenticated(data.user);

      const resolvedSelection: PendingPlanSelection | null =
        data.preservedPlan || pendingSelection;

      if (resolvedSelection) {
        persistSelection(resolvedSelection);
        const planDef = TRUSTED_PLANS[resolvedSelection.planId];
        // For the Free plan, after successful authentication, open the customer's own workspace
        if (planDef?.tier === 'free') {
          onOpenCustomerWorkspace();
        } else {
          // For paid plans, after authentication, show the selected plan summary on checkout
          onNavigatePublic(locale, 'checkout', {
            plan: resolvedSelection.planId,
            period: resolvedSelection.billingPeriod,
          });
        }
      } else {
        // Default authenticated customer entry: open their customer workspace
        onOpenCustomerWorkspace();
      }
    } catch {
      setFormError('Network error while contacting authentication server.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCheckoutAction = async () => {
    if (!pendingSelection) return;
    if (!user) {
      onNavigatePublic(locale, 'register', {
        plan: pendingSelection.planId,
        period: pendingSelection.billingPeriod,
      });
      return;
    }

    setCheckoutSubmitting(true);
    setCheckoutPaymentAlert(null);
    setCheckoutSuccessMessage(false);

    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: pendingSelection.planId,
          billingPeriod: pendingSelection.billingPeriod,
        }),
      });
      const data = await res.json();

      if (res.status === 422 && data.errorCode === 'PAYMENT_PROVIDER_NOT_CONFIGURED') {
        setCheckoutPaymentAlert({
          error: data.error,
          missingConfiguration: Array.isArray(data.missingConfiguration)
            ? data.missingConfiguration
            : t.missingConfigItems,
        });
        return;
      }

      if (res.status === 409 && data.errorCode === 'DUPLICATE_SUBSCRIPTION') {
        setCheckoutSuccessMessage(true);
        const planDef = TRUSTED_PLANS[pendingSelection.planId];
        if (planDef?.tier === 'free') {
          onOpenCustomerWorkspace();
        }
        return;
      }

      if (res.ok && data.activated && data.subscription) {
        onUserAuthenticated({
          ...user,
          activeSubscription: data.subscription,
        });
        setCheckoutSuccessMessage(true);
        const planDef = TRUSTED_PLANS[pendingSelection.planId];
        if (planDef?.tier === 'free') {
          onOpenCustomerWorkspace();
        }
      } else {
        setCheckoutPaymentAlert({
          error: data.error || 'Unable to process checkout request.',
          missingConfiguration: t.missingConfigItems,
        });
      }
    } catch {
      setCheckoutPaymentAlert({
        error: 'Unable to reach checkout verification endpoint.',
        missingConfiguration: t.missingConfigItems,
      });
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const selectedPlanDef = pendingSelection ? TRUSTED_PLANS[pendingSelection.planId] : null;

  // Top bar showing current public user session or links to Register / Login
  const renderUserStatusStrip = () => (
    <div className="glass border border-surface-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigatePublic(locale, 'home')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-surface-300 hover:text-accent-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.backToHome}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <>
            <div className="inline-flex items-center gap-2 text-xs text-surface-200 bg-surface-900/90 border border-surface-700 px-3 py-1.5 rounded-xl">
              <User className="w-3.5 h-3.5 text-accent-400" />
              <span>
                {t.loggedInAs}: <strong className="text-white">{user.email}</strong>
              </span>
              {user.activeSubscription && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[10px]">
                  {user.activeSubscription.planId}
                </span>
              )}
            </div>
            <button
              type="button"
              data-testid="open-customer-workspace-btn"
              onClick={onOpenCustomerWorkspace}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-accent-500 text-surface-950 hover:bg-accent-400 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.openWorkspaceLabel}</span>
            </button>
            {pendingSelection && page !== 'checkout' && (
              <button
                type="button"
                onClick={() =>
                  onNavigatePublic(locale, 'checkout', {
                    plan: pendingSelection.planId,
                    period: pendingSelection.billingPeriod,
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-800 border border-accent-500/40 text-accent-300 hover:bg-surface-700 transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>{t.goToCheckoutForSelected}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onUserLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.logoutLabel}</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() =>
                onNavigatePublic(
                  locale,
                  'login',
                  pendingSelection
                    ? { plan: pendingSelection.planId, period: pendingSelection.billingPeriod }
                    : undefined,
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-surface-800 hover:bg-surface-700 text-surface-200 hover:text-white transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-accent-400" />
              <span>{t.alreadyHaveAccount}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigatePublic(
                  locale,
                  'register',
                  pendingSelection
                    ? { plan: pendingSelection.planId, period: pendingSelection.billingPeriod }
                    : undefined,
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-accent-500/20 border border-accent-500/40 text-accent-300 hover:bg-accent-500/30 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t.createAnAccount}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Render Pricing Cards Grid (used on 'pricing' page, and as fallback when checkout/auth has an invalid/missing plan)
  const renderPricingCards = () => (
    <div className="space-y-8">
      {/* Billing period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass border border-surface-800/80 rounded-2xl p-5">
        <div className="space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-accent-400">
            {t.billingToggleLabel}
          </span>
          <p className="text-xs text-surface-400">{t.configurationNoticeBody}</p>
        </div>

        <div
          className="inline-flex items-center p-1 rounded-xl bg-surface-900 border border-surface-800 self-start sm:self-center"
          role="group"
          aria-label={t.billingToggleLabel}
        >
          <button
            type="button"
            onClick={() => {
              setBillingPeriod('monthly');
              if (pendingSelection) {
                const updated = resolveTrustedPlanSelection(pendingSelection.planId, 'monthly');
                if (updated.valid && updated.selection) persistSelection(updated.selection);
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-accent-500 text-surface-950'
                : 'text-surface-400 hover:text-white'
            }`}
          >
            {t.monthlyLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setBillingPeriod('annual');
              if (pendingSelection) {
                const updated = resolveTrustedPlanSelection(pendingSelection.planId, 'annual');
                if (updated.valid && updated.selection) persistSelection(updated.selection);
              }
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              billingPeriod === 'annual'
                ? 'bg-accent-500 text-surface-950'
                : 'text-surface-400 hover:text-white'
            }`}
          >
            {t.annualLabel}
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {PLAN_ORDER.map((planId) => {
          const plan = TRUSTED_PLANS[planId];
          const tr = plan.translations[locale];
          const isFree = plan.tier === 'free';
          const isSelected = pendingSelection?.planId === plan.id;
          const isUserActivePlan =
            user?.activeSubscription?.planId === plan.id &&
            user?.activeSubscription?.status === 'active';

          return (
            <div
              key={plan.id}
              data-testid={`pricing-card-${plan.id}`}
              className={`glass rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                isFree
                  ? 'border-emerald-500/40 bg-emerald-950/10'
                  : isSelected
                    ? 'border-accent-500/60 bg-accent-950/10'
                    : 'border-surface-800/80'
              }`}
            >
              <div className="space-y-5">
                {/* Distinction between Free and Paid plans */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      isFree
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isFree ? t.freeTierBadge : t.paidTierBadge}
                  </span>
                  <span className="text-xs font-mono text-surface-400">{tr.badge}</span>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">{tr.name}</h2>
                  <p className="text-xs text-surface-300 mt-2 leading-relaxed">{tr.summary}</p>
                </div>

                <div className="p-4 rounded-xl bg-surface-900/90 border border-surface-800 space-y-1">
                  <div className="text-2xl font-bold text-white">
                    {tr.priceDisplay[billingPeriod]}
                  </div>
                  <div className="text-xs text-surface-400">{tr.periodLabel[billingPeriod]}</div>
                  <div className="text-[11px] font-mono text-surface-500 pt-1">
                    ID: {plan.pricing[billingPeriod].priceIdentifier}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-300">
                    {t.featuresHeading}
                  </h3>
                  <ul className="space-y-2 text-xs text-surface-200">
                    {tr.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-surface-800/60">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-surface-400">
                    {t.limitsHeading}
                  </h3>
                  <ul className="space-y-1.5 text-xs text-surface-300 list-disc pl-4">
                    {tr.usageLimits.map((lim, i) => (
                      <li key={i} className="leading-relaxed">
                        {lim}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-surface-800/80 space-y-3">
                {isUserActivePlan && (
                  <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.activePlanBadge}</span>
                  </div>
                )}

                <button
                  type="button"
                  data-testid={`choose-plan-${plan.id}`}
                  onClick={() => handleChoosePlan(plan.id)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                    isFree
                      ? 'bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 hover:from-accent-400 hover:to-accent-500 glow-accent'
                      : 'bg-surface-800 hover:bg-surface-700 text-white border border-accent-500/40'
                  }`}
                >
                  <span>{tr.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-[11px] text-surface-400 leading-relaxed text-center">
                  {tr.termsNotice}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {renderUserStatusStrip()}

      {/* Invalid Plan ID warning banner */}
      {invalidPlanIdNotice && (
        <div
          role="alert"
          data-testid="invalid-plan-alert"
          className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-200"
        >
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <strong className="font-semibold text-white block">
              {t.invalidPlanAlertTitle}: <code className="font-mono">{invalidPlanIdNotice}</code>
            </strong>
            <p className="text-xs text-red-200/90 leading-relaxed">{t.invalidPlanAlertBody}</p>
          </div>
        </div>
      )}

      {/* Selected Plan Preservation Banner (shown on Register / Login / Pricing when a valid plan is pending) */}
      {selectedPlanDef && pendingSelection && page !== 'checkout' && (
        <div
          data-testid="preserved-plan-banner"
          className="p-4 rounded-2xl bg-accent-500/10 border border-accent-500/30 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-accent-400 flex-shrink-0" />
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-accent-300 block">
                {t.selectedPlanBannerTitle}
              </span>
              <p className="text-sm font-semibold text-white">
                {selectedPlanDef.translations[locale].name} ({pendingSelection.billingPeriod}) —{' '}
                <span className="text-accent-300">
                  {selectedPlanDef.translations[locale].priceDisplay[pendingSelection.billingPeriod]}
                </span>
              </p>
            </div>
          </div>

          {page !== 'pricing' && (
            <button
              type="button"
              onClick={() =>
                onNavigatePublic(locale, 'pricing', {
                  plan: pendingSelection.planId,
                  period: pendingSelection.billingPeriod,
                })
              }
              className="text-xs font-semibold text-accent-300 hover:text-white underline"
            >
              {t.changePlanLabel}
            </button>
          )}
        </div>
      )}

      {/* 1. PUBLIC PRICING PAGE */}
      {page === 'pricing' && renderPricingCards()}

      {/* 2. REGISTRATION & LOGIN PAGES */}
      {(page === 'register' || page === 'login') && (
        <div className="space-y-8">
          {!selectedPlanDef && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <strong className="text-sm font-semibold text-white block">
                  {t.missingPlanAlertTitle}
                </strong>
                <p className="text-xs text-surface-300 leading-relaxed">{t.missingPlanAlertBody}</p>
              </div>
            </div>
          )}

          <div className="max-w-md mx-auto glass border border-surface-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center">
                {page === 'register' ? (
                  <UserPlus className="w-5 h-5 text-accent-400" />
                ) : (
                  <LogIn className="w-5 h-5 text-accent-400" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {page === 'register' ? t.registerSubmit : t.loginSubmit}
                </h2>
                <p className="text-xs text-surface-400">{t.emailVerificationNote}</p>
              </div>
            </div>

            <form
              onSubmit={(e) => handleAuthSubmit(e, page === 'register' ? 'register' : 'login')}
              className="space-y-4"
            >
              {page === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1.5">
                    {t.nameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-white text-sm placeholder:text-surface-500 focus:outline-none focus:border-accent-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-surface-300 mb-1.5">
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-white text-sm placeholder:text-surface-500 focus:outline-none focus:border-accent-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-300 mb-1.5">
                  {t.passwordLabel}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-white text-sm placeholder:text-surface-500 focus:outline-none focus:border-accent-500"
                />
              </div>

              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 font-semibold text-sm hover:from-accent-400 hover:to-accent-500 transition-all glow-accent disabled:opacity-50"
              >
                {formSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>{page === 'register' ? t.registerSubmit : t.loginSubmit}</span>
              </button>
            </form>

            <div className="pt-4 border-t border-surface-800 text-center text-xs text-surface-400">
              {page === 'register' ? (
                <>
                  <span>{t.switchToLoginPrompt} </span>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigatePublic(
                        locale,
                        'login',
                        pendingSelection
                          ? {
                              plan: pendingSelection.planId,
                              period: pendingSelection.billingPeriod,
                            }
                          : undefined,
                      )
                    }
                    className="text-accent-300 hover:text-white font-semibold underline"
                  >
                    {t.switchToLoginLink}
                  </button>
                </>
              ) : (
                <>
                  <span>{t.switchToRegisterPrompt} </span>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigatePublic(
                        locale,
                        'register',
                        pendingSelection
                          ? {
                              plan: pendingSelection.planId,
                              period: pendingSelection.billingPeriod,
                            }
                          : undefined,
                      )
                    }
                    className="text-accent-300 hover:text-white font-semibold underline"
                  >
                    {t.switchToRegisterLink}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* If no valid plan was selected yet, also display the pricing cards so the user can pick one */}
          {!selectedPlanDef && renderPricingCards()}
        </div>
      )}

      {/* 3. CHECKOUT PAGE */}
      {page === 'checkout' && (
        <div className="space-y-8">
          {/* Requirement: If selected plan is missing or invalid, show pricing page and request selection */}
          {!selectedPlanDef || !pendingSelection ? (
            <div className="space-y-6">
              {!invalidPlanIdNotice && (
                <div
                  role="alert"
                  className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="text-sm font-semibold text-white block">
                      {t.missingPlanAlertTitle}
                    </strong>
                    <p className="text-xs text-surface-300 leading-relaxed">
                      {t.missingPlanAlertBody}
                    </p>
                  </div>
                </div>
              )}
              {renderPricingCards()}
            </div>
          ) : !user && !authLoading ? (
            /* Unauthenticated visitor attempting to access /checkout directly is prompted to register/login while preserving plan */
            <div className="max-w-lg mx-auto glass border border-surface-800/80 rounded-2xl p-6 space-y-5 text-center">
              <Lock className="w-8 h-8 text-accent-400 mx-auto" />
              <h2 className="text-lg font-bold text-white">{t.checkoutSummaryHeading}</h2>
              <p className="text-xs text-surface-300 leading-relaxed">
                {t.emailVerificationNote}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    onNavigatePublic(locale, 'register', {
                      plan: pendingSelection.planId,
                      period: pendingSelection.billingPeriod,
                    })
                  }
                  className="px-4 py-2.5 rounded-xl bg-accent-500 text-surface-950 font-semibold text-xs hover:bg-accent-400 transition-colors"
                >
                  {t.registerSubmit}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onNavigatePublic(locale, 'login', {
                      plan: pendingSelection.planId,
                      period: pendingSelection.billingPeriod,
                    })
                  }
                  className="px-4 py-2.5 rounded-xl bg-surface-800 text-surface-200 hover:text-white font-semibold text-xs border border-surface-700 transition-colors"
                >
                  {t.loginSubmit}
                </button>
              </div>
            </div>
          ) : (
            /* Authenticated Checkout Summary UI */
            <div
              data-testid="checkout-summary-card"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              <div className="lg:col-span-7 glass border border-surface-800/80 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-surface-800 pb-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-accent-400" />
                    <h2 className="text-lg font-bold text-white">{t.checkoutSummaryHeading}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onNavigatePublic(locale, 'pricing', {
                        plan: pendingSelection.planId,
                        period: pendingSelection.billingPeriod,
                      })
                    }
                    className="text-xs font-medium text-accent-300 hover:text-white underline"
                  >
                    {t.changePlanLabel}
                  </button>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3.5 rounded-xl bg-surface-900/80 border border-surface-800">
                    <dt className="text-xs text-surface-400">{t.selectedPlanLabel}</dt>
                    <dd className="font-bold text-white mt-1">
                      {selectedPlanDef.translations[locale].name}
                    </dd>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-900/80 border border-surface-800">
                    <dt className="text-xs text-surface-400">{t.billingPeriodLabel}</dt>
                    <dd className="font-bold text-white mt-1 uppercase font-mono text-xs">
                      {pendingSelection.billingPeriod === 'monthly'
                        ? t.monthlyLabel
                        : t.annualLabel}
                    </dd>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-900/80 border border-surface-800">
                    <dt className="text-xs text-surface-400">{t.verifiedPriceLabel}</dt>
                    <dd className="font-bold text-accent-300 mt-1">
                      {selectedPlanDef.translations[locale].priceDisplay[
                        pendingSelection.billingPeriod
                      ]}{' '}
                      ({selectedPlanDef.currency})
                    </dd>
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-900/80 border border-surface-800">
                    <dt className="text-xs text-surface-400">{t.priceIdLabel}</dt>
                    <dd className="font-mono text-xs text-surface-200 mt-1 break-all">
                      {pendingSelection.priceIdentifier}
                    </dd>
                  </div>
                </dl>

                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-accent-300">
                    {t.termsHeading}
                  </h3>
                  <ul className="space-y-2 text-xs text-surface-200">
                    {selectedPlanDef.translations[locale].features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-accent-400 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-surface-400 pt-2 border-t border-surface-800/60">
                    {selectedPlanDef.translations[locale].termsNotice}
                  </p>
                </div>

                {/* Action button */}
                <div className="pt-2 space-y-4">
                  <button
                    type="button"
                    data-testid="checkout-continue-btn"
                    disabled={checkoutSubmitting}
                    onClick={handleCheckoutAction}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 font-semibold text-sm hover:from-accent-400 hover:to-accent-500 transition-all glow-accent disabled:opacity-50"
                  >
                    {checkoutSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                    <span>
                      {selectedPlanDef.tier === 'free'
                        ? t.activateFreePlanBtn
                        : t.continueToPaymentBtn}
                    </span>
                  </button>

                  {checkoutSuccessMessage && (
                    <div
                      role="status"
                      data-testid="subscription-activated-banner"
                      className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 space-y-1"
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm text-white">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{t.subscriptionActiveTitle}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{t.subscriptionActiveBody}</p>
                    </div>
                  )}

                  {checkoutPaymentAlert && (
                    <div
                      role="alert"
                      data-testid="payment-setup-required-alert"
                      className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2"
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm text-white">
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                        <span>{t.paymentSetupRequiredTitle}</span>
                      </div>
                      <p className="text-xs text-surface-200 leading-relaxed">
                        {checkoutPaymentAlert.error}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Payment Provider Status & Security Notice */}
              <div className="lg:col-span-5 glass border border-surface-800/80 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2.5 text-amber-400">
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <h3 className="text-base font-bold text-white">{t.paymentSetupRequiredTitle}</h3>
                </div>
                <p className="text-xs text-surface-300 leading-relaxed">
                  {t.paymentSetupRequiredBody}
                </p>

                <div className="p-4 rounded-xl bg-surface-900/90 border border-surface-800 space-y-2">
                  <span className="text-xs font-semibold text-white block">
                    {t.missingConfigListTitle}
                  </span>
                  <ul className="space-y-1.5 text-xs text-surface-300 list-disc pl-4">
                    {t.missingConfigItems.map((item, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-900/60 border border-surface-800/80 text-xs text-surface-400 leading-relaxed">
                  {t.noCardCollectedNotice}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
