export type PublicLocale = 'it' | 'en' | 'de' | 'fr';

export const SUPPORTED_LOCALES: PublicLocale[] = ['it', 'en', 'de', 'fr'];
export const DEFAULT_LOCALE: PublicLocale = 'it';

export const LOCALE_LABELS: Record<PublicLocale, { label: string; native: string; hreflang: string; ogLocale: string }> = {
  it: { label: 'Italiano', native: 'IT', hreflang: 'it', ogLocale: 'it_IT' },
  en: { label: 'English', native: 'EN', hreflang: 'en', ogLocale: 'en_US' },
  de: { label: 'Deutsch', native: 'DE', hreflang: 'de', ogLocale: 'de_DE' },
  fr: { label: 'Français', native: 'FR', hreflang: 'fr', ogLocale: 'fr_FR' },
};

export type PublicPageKey =
  | 'home'
  | 'product'
  | 'useCases'
  | 'pricing'
  | 'faq'
  | 'register'
  | 'login'
  | 'checkout';

export const PAGE_SLUGS: Record<PublicLocale, Record<PublicPageKey, string>> = {
  it: {
    home: 'panoramica',
    product: 'prodotto',
    useCases: 'casi-d-uso',
    pricing: 'prezzi',
    faq: 'faq',
    register: 'registrazione',
    login: 'accedi',
    checkout: 'checkout',
  },
  en: {
    home: 'overview',
    product: 'product',
    useCases: 'use-cases',
    pricing: 'pricing',
    faq: 'faq',
    register: 'register',
    login: 'login',
    checkout: 'checkout',
  },
  de: {
    home: 'uebersicht',
    product: 'produkt',
    useCases: 'anwendungsfaelle',
    pricing: 'preise',
    faq: 'faq',
    register: 'registrierung',
    login: 'anmelden',
    checkout: 'checkout',
  },
  fr: {
    home: 'apercu',
    product: 'produit',
    useCases: 'cas-d-usage',
    pricing: 'tarifs',
    faq: 'faq',
    register: 'inscription',
    login: 'connexion',
    checkout: 'checkout',
  },
};

export function getPublicPath(locale: PublicLocale, page: PublicPageKey): string {
  const slug = PAGE_SLUGS[locale][page];
  return slug ? `/${locale}/${slug}` : `/${locale}/`;
}

export function resolvePublicRoute(pathname: string): {
  isAdmin: boolean;
  isWorkspace?: boolean;
  locale: PublicLocale;
  page: PublicPageKey;
} | null {
  const clean = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (clean === '/admin' || clean.startsWith('/admin/')) {
    return { isAdmin: true, isWorkspace: false, locale: 'it', page: 'pricing' };
  }
  if (clean === '/workspace' || clean.startsWith('/workspace/')) {
    return { isAdmin: false, isWorkspace: true, locale: 'it', page: 'pricing' };
  }

  // Make the public pricing page the main entry point for unauthenticated visitors
  if (clean === '/') {
    return { isAdmin: false, isWorkspace: false, locale: DEFAULT_LOCALE, page: 'pricing' };
  }

  const parts = clean.split('/').filter(Boolean);
  const first = parts[0] as PublicLocale;
  if (!SUPPORTED_LOCALES.includes(first)) {
    return null;
  }

  const locale = first;
  const slug = parts[1] || '';

  // Bare locale roots (/it/, /en/, /de/, /fr/) serve the public pricing page as main entry point
  if (!slug) {
    return { isAdmin: false, isWorkspace: false, locale, page: 'pricing' };
  }

  const slugsForLocale = PAGE_SLUGS[locale];
  for (const [key, val] of Object.entries(slugsForLocale) as [PublicPageKey, string][]) {
    if (val === slug && parts.length === 2) {
      return { isAdmin: false, isWorkspace: false, locale, page: key };
    }
  }

  return null;
}

export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface UseCaseItem {
  id: string;
  title: string;
  targetAudience: string;
  problemSolved: string;
  howItWorks: string;
  examplePrompt: string;
  projectType: string;
}

export interface ComparisonRow {
  criterion: string;
  aiAppBuilder: string;
  traditionalCoding: string;
  staticPageBuilders: string;
}

export interface LocaleContent {
  locale: PublicLocale;
  htmlLang: string;
  nav: {
    home: string;
    product: string;
    useCases: string;
    pricing: string;
    faq: string;
    register: string;
    login: string;
    adminLink: string;
    languageLabel: string;
  };
  breadcrumbs: Record<PublicPageKey, string>;
  meta: Record<PublicPageKey, {
    title: string;
    description: string;
    h1: string;
    subtitle: string;
  }>;
  home: {
    badge: string;
    ctaPrimary: string;
    ctaSecondary: string;
    whatIsTitle: string;
    whatIsLead: string;
    whatIsBody: string;
    pillarsTitle: string;
    pillars: {
      title: string;
      description: string;
    }[];
    workflowTitle: string;
    workflowSteps: {
      step: string;
      title: string;
      description: string;
    }[];
    supportedProvidersTitle: string;
    supportedProvidersSubtitle: string;
    providers: {
      name: string;
      models: string;
      endpointInfo: string;
      officialUrl: string;
    }[];
    quickFaqTitle: string;
    viewAllFaqLabel: string;
    exploreUseCasesLabel: string;
    exploreProductLabel: string;
  };
  product: {
    definitionTitle: string;
    definitionText: string;
    architectureTitle: string;
    architectureLead: string;
    specs: {
      label: string;
      value: string;
      detail: string;
    }[];
    capabilitiesTitle: string;
    capabilities: {
      title: string;
      status: string;
      description: string;
    }[];
    securityPrivacyTitle: string;
    securityPrivacyPoints: string[];
    referencesTitle: string;
    references: {
      label: string;
      url: string;
      description: string;
    }[];
  };
  useCases: {
    introTitle: string;
    introBody: string;
    items: UseCaseItem[];
    comparisonTitle: string;
    comparisonSubtitle: string;
    comparisonHeaders: {
      criterion: string;
      aiAppBuilder: string;
      traditionalCoding: string;
      staticPageBuilders: string;
    };
    comparisonRows: ComparisonRow[];
  };
  faq: {
    intro: string;
    items: FAQItem[];
  };
  footer: {
    productIdentity: string;
    repositoryLabel: string;
    repositoryUrl: string;
    legalNoticeTitle: string;
    legalNoticeText: string;
    crawlerPolicyTitle: string;
    crawlerPolicyText: string;
    navigationTitle: string;
    languagesTitle: string;
    adminNotice: string;
  };
}

export const PUBLIC_CONTENT: Record<PublicLocale, LocaleContent> = {
  it: {
    locale: 'it',
    htmlLang: 'it',
    nav: {
      home: 'Panoramica',
      product: 'Specifica Prodotto',
      useCases: 'Casi d\'Uso e Confronto',
      pricing: 'Prezzi e Piani',
      faq: 'Domande Frequenti (FAQ)',
      register: 'Registrazione',
      login: 'Accedi',
      adminLink: 'Area Amministratore (IT)',
      languageLabel: 'Lingua del sito pubblico',
    },
    breadcrumbs: {
      home: 'Home',
      product: 'Prodotto e Architettura',
      useCases: 'Casi d\'Uso e Confronto',
      pricing: 'Prezzi e Piani',
      faq: 'FAQ',
      register: 'Registrazione Account',
      login: 'Accesso Utente',
      checkout: 'Riepilogo Checkout',
    },
    meta: {
      home: {
        title: 'AI App Builder — Ambiente Web per Creare e Prototipare Applicazioni con IA',
        description: 'AI App Builder è un ambiente web per progettare siti web, web app, dashboard ed e-commerce tramite istruzioni testuali, anteprima HTML live ed esportazione.',
        h1: 'Progetta e prototipa applicazioni web tramite istruzioni testuali strutturate',
        subtitle: 'AI App Builder combina gestione progetti locale, storico delle istruzioni, anteprima multi-dispositivo (Desktop, Tablet, Mobile) e configurazione BYOK (Bring Your Own Key) per OpenAI, Anthropic e Groq.',
      },
      product: {
        title: 'Prodotto e Architettura Tecnica — AI App Builder',
        description: 'Scopri come funziona AI App Builder: architettura React 18 e TypeScript, archiviazione localStorage, modelli IA supportati, sicurezza delle credenziali e limiti attuali.',
        h1: 'Architettura, Funzionalità Reali e Specifiche di AI App Builder',
        subtitle: 'Documentazione tecnica verificabile sulle capacità implementate nel software, sui provider IA supportati e sulla gestione locale dei dati nel browser.',
      },
      useCases: {
        title: 'Casi d\'Uso Reali e Confronto Tecnico — AI App Builder',
        description: 'Esplora gli 8 tipi di progetto supportati da AI App Builder (Sito Web, App Web, Landing Page, E-commerce, Dashboard, Portfolio, Blog) e il confronto con altri approcci.',
        h1: 'Casi d\'Uso Supportati e Confronto tra Approcci di Sviluppo',
        subtitle: 'Analisi concreta degli scenari in cui AI App Builder velocizza la prototipazione HTML/CSS/JS e confronto oggettivo con sviluppo manuale e page builder tradizionali.',
      },
      pricing: {
        title: 'Prezzi e Piani — AI App Builder (Piano Gratuito BYOK e Piani Configurabili)',
        description: 'Confronta il piano gratuito Community Open-Source (BYOK) di AI App Builder con i piani a pagamento configurabili. Trasparenza su funzionalità, quote e stato del gateway di pagamento.',
        h1: 'Piani e Prezzi di AI App Builder',
        subtitle: 'Ambiente web per progettare e prototipare applicazioni tramite istruzioni strutturate. Scegli tra il piano gratuito BYOK già attivo e i piani a pagamento configurabili.',
      },
      faq: {
        title: 'Domande Frequenti (FAQ) su Funzionamento, Privacy e Modelli IA — AI App Builder',
        description: 'Risposte dirette e verificabili su AI App Builder: costi, chiavi API OpenAI/Anthropic/Groq, salvataggio dati nel browser, esportazione codice e integrazione GitHub.',
        h1: 'Domande Frequenti (FAQ) su AI App Builder',
        subtitle: 'Risposte tecniche dirette su configurazione dei modelli linguistici, archiviazione locale, sicurezza delle chiavi API ed esportazione del codice.',
      },
      register: {
        title: 'Registrazione Account — AI App Builder',
        description: 'Crea un account su AI App Builder mantenendo il piano selezionato per procedere automaticamente al riepilogo di checkout.',
        h1: 'Crea il tuo account AI App Builder',
        subtitle: 'La tua selezione del piano viene preservata durante la registrazione per proseguire senza interruzioni al checkout.',
      },
      login: {
        title: 'Accedi al tuo Account — AI App Builder',
        description: 'Effettua l\'accesso al tuo account esistente su AI App Builder e prosegui direttamente al checkout del piano selezionato.',
        h1: 'Accedi al tuo account AI App Builder',
        subtitle: 'Autenticati con le tue credenziali per continuare automaticamente verso il riepilogo del piano scelto.',
      },
      checkout: {
        title: 'Riepilogo Checkout e Verifica Piano — AI App Builder',
        description: 'Verifica il piano selezionato, il periodo di fatturazione, le funzionalità incluse e lo stato di configurazione del sistema di pagamento.',
        h1: 'Riepilogo Checkout del Piano Selezionato',
        subtitle: 'Controlla i dettagli verificati lato server per il tuo piano prima di procedere con l\'attivazione o la configurazione del pagamento.',
      },
    },
    home: {
      badge: 'Piattaforma Open-Source • BYOK (Bring Your Own Key)',
      ctaPrimary: 'Apri Dashboard Amministratore (Italiano)',
      ctaSecondary: 'Esplora la Specifica Tecnica',
      whatIsTitle: 'Che cos\'è AI App Builder e quale problema risolve',
      whatIsLead: 'AI App Builder è un\'applicazione web single-page (SPA) con prerendering server-side per le pagine informative pubbliche, progettata per organizzare e iterare prototipi di interfacce web tramite prompt testuali.',
      whatIsBody: 'Chi progetta interfacce web spesso disperde prompt, requisiti e bozze HTML in chat non strutturate. AI App Builder risolve questo problema offrendo un workspace dedicato in cui ogni progetto mantiene una tipologia definita, una descrizione funzionale, una cronologia numerata delle istruzioni con timestamp, un\'anteprima iframe isolata (sandbox) testabile su tre risoluzioni e una funzione di esportazione immediata in formato testo.',
      pillarsTitle: 'Caratteristiche principali realmente implementate',
      pillars: [
        {
          title: '8 Tipologie di Progetto Strutturate',
          description: 'Supporto nativo per la classificazione di Sito Web, App Web, Landing Page, E-commerce, Dashboard, Portfolio, Blog e progetti personalizzati.',
        },
        {
          title: 'Editor Iterativo con Cronologia Prompt',
          description: 'Pannello laterale per inviare istruzioni sequenziali (fino a 1000 caratteri per istruzione) con registrazione dell\'orario e contatore automatico.',
        },
        {
          title: 'Anteprima Live Multi-Dispositivo e Vista Codice',
          description: 'Rendering del codice HTML generato dentro un iframe con sandbox di sicurezza e commutazione istantanea tra Desktop (100%), Tablet (768px) e Mobile (375px).',
        },
        {
          title: 'Configurazione Multi-Provider (BYOK)',
          description: 'Interfaccia di configurazione per OpenAI (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo), Anthropic (Claude 3.5 Sonnet/Haiku, Claude 3 Opus), Groq (Llama 3.3, Mixtral) o endpoint custom.',
        },
      ],
      workflowTitle: 'Come funziona il flusso di lavoro in 4 passaggi',
      workflowSteps: [
        {
          step: '01',
          title: 'Definizione del Progetto',
          description: 'Scegli una delle 8 categorie, assegna un nome (fino a 60 caratteri) e redigi una specifica iniziale dettagliata (fino a 2000 caratteri).',
        },
        {
          step: '02',
          title: 'Configurazione del Provider IA',
          description: 'Nelle impostazioni amministrative, seleziona il fornitore (OpenAI, Anthropic, Groq o Custom), il modello e inserisci la tua chiave API personale.',
        },
        {
          step: '03',
          title: 'Raffinamento tramite Istruzioni',
          description: 'Aggiungi istruzioni incrementali nell\'editor per precisare layout, sezioni o comportamenti e avvia la generazione dell\'anteprima.',
        },
        {
          step: '04',
          title: 'Verifica Responsiva ed Esportazione',
          description: 'Controlla la resa su Desktop, Tablet e Smartphone, ispeziona il sorgente HTML ed esporta l\'intero pacchetto documentale in un file .txt.',
        },
      ],
      supportedProvidersTitle: 'Provider di Intelligenza Artificiale e Modelli Configurabili',
      supportedProvidersSubtitle: 'Riferimenti ufficiali ai fornitori supportati nel modulo Impostazioni della piattaforma.',
      providers: [
        {
          name: 'OpenAI',
          models: 'gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo',
          endpointInfo: 'https://api.openai.com/v1/chat/completions',
          officialUrl: 'https://platform.openai.com/docs/overview',
        },
        {
          name: 'Anthropic (Claude)',
          models: 'claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229',
          endpointInfo: 'https://api.anthropic.com/v1/messages',
          officialUrl: 'https://docs.anthropic.com/',
        },
        {
          name: 'Groq',
          models: 'llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768',
          endpointInfo: 'https://api.groq.com/openai/v1/chat/completions',
          officialUrl: 'https://console.groq.com/docs/overview',
        },
      ],
      quickFaqTitle: 'Domande principali sul prodotto',
      viewAllFaqLabel: 'Consulta tutte le FAQ tecniche',
      exploreUseCasesLabel: 'Esplora i Casi d\'Uso e la Tabella di Confronto',
      exploreProductLabel: 'Leggi la Specifica Tecnica Completa',
    },
    product: {
      definitionTitle: 'Definizione formale del prodotto',
      definitionText: 'AI App Builder (repository di riferimento: akybel2014-creator/ai-app-builder) è un\'applicazione web scritta in TypeScript con React 18, Tailwind CSS e server Express integrato. Consente a sviluppatori, designer e progettisti digitali di creare schede progetto strutturate, accumulare istruzioni di modifica, visualizzare anteprime HTML in iframe isolati ed esportare la documentazione completa del progetto.',
      architectureTitle: 'Specifiche Tecniche e Stack Software',
      architectureLead: 'Di seguito sono elencati i componenti reali che costituiscono l\'applicazione in esecuzione.',
      specs: [
        {
          label: 'Frontend & UI Framework',
          value: 'React 18.3.1 + TypeScript 5.5 + Tailwind CSS 3.4',
          detail: 'Interfaccia modulare tipizzata con icone Lucide React e design responsivo.',
        },
        {
          label: 'Server & Prerendering SEO/AIO',
          value: 'Node.js + Express',
          detail: 'Fornisce HTML semantico pre-renderizzato per le rotte pubbliche (/it/, /en/, /de/, /fr/), sitemap.xml, robots.txt e intestazioni X-Robots-Tag noindex per l\'area /admin.',
        },
        {
          label: 'Persistenza dei Dati Utente',
          value: 'Web Storage API (localStorage)',
          detail: 'I progetti (chiave ai-app-builder:projects) e le impostazioni (chiave ai-app-builder:settings) risiedono esclusivamente nel browser dell\'utente.',
        },
        {
          label: 'Isolamento Anteprima',
          value: 'HTML5 Iframe Sandbox + CSP',
          detail: 'L\'anteprima viene eseguita in un elemento iframe con origine opaca (sandbox="allow-scripts", senza allow-same-origin), CSP restrittiva e larghezze configurabili (100%, 768px, 375px).',
        },
      ],
      capabilitiesTitle: 'Stato di implementazione delle funzionalità (Trasparenza Tecnica)',
      capabilities: [
        {
          title: 'Creazione, modifica ed eliminazione progetti',
          status: 'Attivo e completo',
          description: 'Validazione del nome (minimo 2 caratteri, massimo 60) e della descrizione (minimo 10 caratteri, massimo 2000), con suggerimenti rapidi preconfigurati.',
        },
        {
          title: 'Gestione cronologia istruzioni',
          status: 'Attivo e completo',
          description: 'Aggiunta di istruzioni testuali fino a 1000 caratteri ciascuna, salvataggio immediato in localStorage e scorciatoia da tastiera Ctrl+Invio / Cmd+Invio.',
        },
        {
          title: 'Esportazione file progetto (.txt)',
          status: 'Attivo e completo',
          description: 'Generazione lato client tramite Blob API di un documento contenente metadati, descrizione, elenco numerato delle istruzioni con timestamp e codice HTML dell\'anteprima.',
        },
        {
          title: 'Generazione IA e Proxy Backend',
          status: 'Simulazione locale (Richiede backend proxy per chiamate live)',
          description: 'L\'editor verifica la presenza delle credenziali IA e simula il ciclo di generazione con stato "generating" -> "generated". Come indicato nel codice sorgente, l\'invio effettivo alle API esterne richiede la configurazione di un proxy backend dedicato.',
        },
        {
          title: 'Configurazione Credenziali GitHub',
          status: 'Interfaccia di salvataggio locale predisposta',
          description: 'Consente di memorizzare in localStorage username e Personal Access Token (con link rapido alla creazione token con scope repo su GitHub) in vista dell\'integrazione di push automatico.',
        },
      ],
      securityPrivacyTitle: 'Sicurezza, Privacy e Separazione delle Aree',
      securityPrivacyPoints: [
        'Nessuna chiave API o token GitHub viene inviato a server esterni o incluso nelle pagine pubbliche indicizzabili.',
        'La dashboard del proprietario/amministratore (/admin) è mantenuta rigorosamente in lingua italiana ed è protetta da indicizzazione tramite meta robots "noindex, nofollow" e header HTTP X-Robots-Tag.',
        'L\'accesso all\'area amministrativa richiede una sessione autenticata verificata tramite cookie HttpOnly e token di sessione lato server.',
      ],
      referencesTitle: 'Fonti tecniche e standard utilizzati',
      references: [
        {
          label: 'Google Search Central — Pagine multilingue e hreflang',
          url: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
          description: 'Linee guida ufficiali per l\'implementazione di tag rel="alternate" hreflang reciproci e x-default.',
        },
        {
          label: 'Schema.org — SoftwareApplication & FAQPage',
          url: 'https://schema.org/SoftwareApplication',
          description: 'Vocabolario standard utilizzato per i dati strutturati JSON-LD presenti nelle pagine pubbliche.',
        },
        {
          label: 'MDN Web Docs — Window.localStorage',
          url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',
          description: 'Specifica tecnica del meccanismo di persistenza locale utilizzato da AI App Builder.',
        },
      ],
    },
    useCases: {
      introTitle: 'A chi si rivolge AI App Builder e scenari di utilizzo',
      introBody: 'AI App Builder è pensato per sviluppatori, web designer, consulenti digitali e team di prodotto che vogliono raccogliere specifiche strutturate e testare prototipi HTML responsivi prima o durante lo sviluppo.',
      items: [
        {
          id: 'website',
          title: 'Siti Web Informativi e Aziendali',
          targetAudience: 'Piccole imprese, studi professionali, attività commerciali locali',
          problemSolved: 'Strutturare rapidamente l\'architettura delle informazioni (chi siamo, servizi, orari, contatti) senza partire da un foglio bianco.',
          howItWorks: 'Seleziona la categoria "Sito Web", inserisci la descrizione dell\'attività (es. ristorante con menu e prenotazioni) e affina le sezioni tramite istruzioni successive.',
          examplePrompt: 'Un sito web per un ristorante con menu degustazione, tabella orari di apertura e modulo di richiesta prenotazione.',
          projectType: 'Sito Web (website)',
        },
        {
          id: 'landing-page',
          title: 'Landing Page Promozionali e per Corsi',
          targetAudience: 'Formatori, marketer, creatori di prodotti digitali',
          problemSolved: 'Testare la gerarchia visiva di titoli, benefici, programma del corso e modulo di iscrizione su schermi mobile e desktop.',
          howItWorks: 'Usa la tipologia "Landing Page", definisci la proposta di valore e verifica nel simulatore mobile (375px) la leggibilità sopra la piega (above the fold).',
          examplePrompt: 'Una landing page per un corso online di programmazione con programma dei moduli, docenti e form di iscrizione.',
          projectType: 'Landing Page (landing-page)',
        },
        {
          id: 'dashboard',
          title: 'Dashboard Analitiche e Pannelli di Controllo',
          targetAudience: 'Product manager, sviluppatori frontend, analisti dati',
          problemSolved: 'Concordare con il team quali indicatori chiave (KPI), tabelle e filtri includere nell\'interfaccia prima di collegare il database.',
          howItWorks: 'Scegli "Dashboard", elenca le metriche da monitorare e usa la vista Codice per copiare o esportare la struttura HTML.',
          examplePrompt: 'Una dashboard per monitorare le vendite di un e-commerce con riepilogo ordini giornalieri, resi e prodotti più venduti.',
          projectType: 'Dashboard (dashboard)',
        },
        {
          id: 'portfolio-ecommerce-blog',
          title: 'Portfolio Creativi, E-commerce e Blog',
          targetAudience: 'Fotografi, designer, negozianti, redazioni editoriali',
          problemSolved: 'Organizzare griglie di immagini, schede prodotto o layout di lettura tipografica mantenendo traccia di tutte le revisioni richieste.',
          howItWorks: 'Seleziona "Portfolio", "E-commerce" o "Blog", aggiungi istruzioni numerate per ogni modifica richiesta dal cliente ed esporta il resoconto in .txt.',
          examplePrompt: 'Un portfolio per un fotografo con galleria di immagini filtrabile per categoria e sezione biografia.',
          projectType: 'Portfolio / E-commerce / Blog',
        },
      ],
      comparisonTitle: 'Confronto oggettivo tra approcci di prototipazione',
      comparisonSubtitle: 'Valutazione basata sulle caratteristiche reali di AI App Builder rispetto allo sviluppo manuale tradizionale e ai page builder visuali classici.',
      comparisonHeaders: {
        criterion: 'Criterio Tecnico',
        aiAppBuilder: 'AI App Builder',
        traditionalCoding: 'Sviluppo Manuale (IDE)',
        staticPageBuilders: 'Page Builder Visuali SaaS',
      },
      comparisonRows: [
        {
          criterion: 'Modalità di input principale',
          aiAppBuilder: 'Descrizione testuale strutturata + cronologia istruzioni numerata',
          traditionalCoding: 'Scrittura manuale di codice sorgente (HTML/CSS/TS)',
          staticPageBuilders: 'Trascinamento manuale di blocchi predefiniti (Drag & Drop)',
        },
        {
          criterion: 'Gestione dei modelli IA',
          aiAppBuilder: 'Scelta libera del provider (OpenAI, Anthropic, Groq, Custom) con chiave propria',
          traditionalCoding: 'Dipende da plugin esterni dell\'editor',
          staticPageBuilders: 'Vincolato al modello proprietario della piattaforma',
        },
        {
          criterion: 'Archiviazione dei dati di progetto',
          aiAppBuilder: '100% locale nel browser (localStorage) + esportazione file .txt',
          traditionalCoding: 'File system locale e repository Git',
          staticPageBuilders: 'Cloud proprietario con abbonamento mensile',
        },
        {
          criterion: 'Test responsivo integrato',
          aiAppBuilder: 'Commutatore istantaneo Desktop (100%), Tablet (768px), Mobile (375px)',
          traditionalCoding: 'Richiede apertura dei DevTools del browser',
          staticPageBuilders: 'Incluso nell\'editor visuale',
        },
        {
          criterion: 'Separazione lingua sito / dashboard admin',
          aiAppBuilder: 'Sito pubblico in 4 lingue (IT, EN, DE, FR); Dashboard admin esclusivamente in italiano',
          traditionalCoding: 'Da programmare manualmente da zero',
          staticPageBuilders: 'Spesso unificata o richiede plugin a pagamento',
        },
      ],
    },
    faq: {
      intro: 'Questa sezione raccoglie risposte dirette, verificabili nel codice sorgente, alle domande più frequenti su AI App Builder.',
      items: [
        {
          category: 'Prodotto e Funzionamento',
          question: 'Che cos\'è esattamente AI App Builder?',
          answer: 'AI App Builder è un\'applicazione web per definire, gestire e prototipare progetti di applicazioni e siti web tramite istruzioni testuali. Offre una dashboard di gestione progetti, un editor con storico delle istruzioni, un simulatore di anteprima HTML multi-dispositivo e un modulo di esportazione.',
        },
        {
          category: 'Lingue e Amministrazione',
          question: 'In quali lingue sono disponibili il sito pubblico e la dashboard amministratore?',
          answer: 'Il sito pubblico informativo supporta quattro lingue con URL dedicati: italiano (/it/), inglese (/en/), tedesco (/de/) e francese (/fr/). La dashboard del proprietario/amministratore (/admin) è invece progettata esclusivamente in lingua italiana, non cambia lingua automaticamente ed è totalmente indipendente dalla lingua scelta dai visitatori sul sito pubblico.',
        },
        {
          category: 'Modelli IA e Costi',
          question: 'Quali provider e modelli di intelligenza artificiale sono supportati?',
          answer: 'Nel pannello Impostazioni è possibile configurare quattro opzioni: OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo), Anthropic Claude (claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229), Groq (llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768) oppure un endpoint API personalizzato compatibile.',
        },
        {
          category: 'Privacy e Sicurezza',
          question: 'Dove vengono salvati i miei progetti e le mie chiavi API?',
          answer: 'Tutti i progetti creati e le chiavi API inserite vengono salvati localmente nel browser tramite localStorage (chiavi "ai-app-builder:projects" e "ai-app-builder:settings"). Nessuna chiave API viene pubblicata nelle pagine indicizzabili o trasmessa a server di terze parti non autorizzati.',
        },
        {
          category: 'Funzionalità Tecniche',
          question: 'La generazione IA e l\'esportazione su GitHub sono già collegate a un backend esterno?',
          answer: 'La creazione dei progetti, la gestione della cronologia istruzioni, l\'anteprima responsiva e l\'esportazione in file di testo (.txt) sono pienamente operative. Il pulsante "Genera con IA" esegue attualmente una simulazione locale del flusso di stato e richiede il collegamento a un proxy backend per effettuare chiamate live alle API dei provider; analogamente, il modulo GitHub salva localmente username e token per la connessione ai repository.',
        },
        {
          category: 'SEO, Crawler e Indicizzazione',
          question: 'Le pagine private e l\'editor vengono indicizzati dai motori di ricerca o dai crawler AI?',
          answer: 'No. Solo le pagine informative pubbliche (/it/, /en/, /de/, /fr/) sono indicizzabili e incluse nella sitemap XML. L\'area amministrativa, la dashboard e l\'editor (/admin) sono protetti da autenticazione, esclusi dalla sitemap e contrassegnati con direttiva X-Robots-Tag: noindex, nofollow.',
        },
      ],
    },
    footer: {
      productIdentity: 'AI App Builder — Piattaforma web per la prototipazione strutturata di applicazioni tramite istruzioni testuali.',
      repositoryLabel: 'Repository GitHub di riferimento: akybel2014-creator/ai-app-builder',
      repositoryUrl: 'https://github.com/akybel2014-creator/ai-app-builder',
      legalNoticeTitle: 'Informazioni sul progetto e trasparenza',
      legalNoticeText: 'Progetto software open-source importato da GitHub (autore/repository: akybel2014-creator/ai-app-builder). Nessun prezzo commerciale o abbonamento a pagamento è applicato da questa interfaccia.',
      crawlerPolicyTitle: 'Politica Crawler di Ricerca e Sistemi AI',
      crawlerPolicyText: 'I crawler di ricerca standard e gli user-agent AI sono ammessi sulle pagine pubbliche localizzate (/it/, /en/, /de/, /fr/) come documentato in /robots.txt. L\'area amministrativa (/admin) è riservata e non indicizzabile.',
      navigationTitle: 'Pagine Pubbliche',
      languagesTitle: 'Versioni Linguistiche',
      adminNotice: 'La Dashboard Amministratore è disponibile esclusivamente in italiano.',
    },
  },
  en: {
    locale: 'en',
    htmlLang: 'en',
    nav: {
      home: 'Overview',
      product: 'Product Specification',
      useCases: 'Use Cases & Comparison',
      pricing: 'Pricing & Plans',
      faq: 'FAQ',
      register: 'Register',
      login: 'Log in',
      adminLink: 'Admin Workspace (IT)',
      languageLabel: 'Public site language',
    },
    breadcrumbs: {
      home: 'Home',
      product: 'Product & Architecture',
      useCases: 'Use Cases & Comparison',
      pricing: 'Pricing & Plans',
      faq: 'FAQ',
      register: 'Create Account',
      login: 'Sign In',
      checkout: 'Checkout Summary',
    },
    meta: {
      home: {
        title: 'AI App Builder — Web Workspace for Prompt-Driven App Prototyping',
        description: 'AI App Builder is a web application to structure websites, web apps, dashboards, and e-commerce projects using text instructions and live HTML preview.',
        h1: 'Design and prototype web applications through structured text instructions',
        subtitle: 'AI App Builder combines local project management, timestamped instruction history, multi-device HTML preview (Desktop, Tablet, Mobile), and BYOK configuration for OpenAI, Anthropic, and Groq.',
      },
      product: {
        title: 'Product Overview & Technical Architecture — AI App Builder',
        description: 'Learn how AI App Builder works: React 18 and TypeScript architecture, browser localStorage persistence, supported AI models, API key security, and current scope.',
        h1: 'Architecture, Implemented Capabilities, and Specifications of AI App Builder',
        subtitle: 'Verifiable technical documentation covering software features, supported AI providers, and client-side data persistence.',
      },
      useCases: {
        title: 'Supported Use Cases & Technical Comparison — AI App Builder',
        description: 'Explore the 8 project types supported by AI App Builder (Website, Web App, Landing Page, E-commerce, Dashboard, Portfolio, Blog) and compare development workflows.',
        h1: 'Supported Use Cases and Prototyping Approach Comparison',
        subtitle: 'Practical scenarios where AI App Builder streamlines HTML/CSS/JS prototyping, alongside an objective comparison with manual coding and visual page builders.',
      },
      pricing: {
        title: 'Pricing & Plans — AI App Builder (Free BYOK Tier & Configurable Plans)',
        description: 'Compare the active Free Community Open-Source (BYOK) plan with configurable paid tiers for AI App Builder. Full transparency on quotas, features, and payment setup.',
        h1: 'AI App Builder Pricing & Plans',
        subtitle: 'Web workspace for designing and prototyping applications through structured text instructions. Choose between the active Free BYOK plan and configurable paid tiers.',
      },
      faq: {
        title: 'Frequently Asked Questions (FAQ) on Features, Privacy & AI Models — AI App Builder',
        description: 'Direct, verifiable answers about AI App Builder: OpenAI/Anthropic/Groq API keys, browser localStorage, code export, and GitHub settings.',
        h1: 'Frequently Asked Questions (FAQ) about AI App Builder',
        subtitle: 'Clear technical answers regarding language model configuration, local data storage, credential security, and project export.',
      },
      register: {
        title: 'Create Account — AI App Builder',
        description: 'Register an account on AI App Builder while preserving your selected plan to proceed directly to checkout.',
        h1: 'Create your AI App Builder account',
        subtitle: 'Your selected plan is preserved across registration so you can continue seamlessly to checkout.',
      },
      login: {
        title: 'Sign In — AI App Builder',
        description: 'Log in to your existing AI App Builder account and continue directly to checkout for your selected plan.',
        h1: 'Sign in to your AI App Builder account',
        subtitle: 'Authenticate with your existing credentials to proceed directly to your selected plan checkout.',
      },
      checkout: {
        title: 'Checkout Summary & Plan Verification — AI App Builder',
        description: 'Review your selected plan, billing period, verified server-side pricing, included features, and payment provider configuration status.',
        h1: 'Selected Plan Checkout Summary',
        subtitle: 'Review the server-verified plan details and terms before continuing to activation or payment setup.',
      },
    },
    home: {
      badge: 'Open-Source Platform • BYOK (Bring Your Own Key)',
      ctaPrimary: 'Open Administrator Dashboard (Italian UI)',
      ctaSecondary: 'Read Technical Specification',
      whatIsTitle: 'What AI App Builder is and what problem it solves',
      whatIsLead: 'AI App Builder is a single-page web application (SPA) with server-side prerendering for public documentation pages, built to organize and iterate web interface prototypes through structured text prompts.',
      whatIsBody: 'Designers and developers frequently lose track of prompts, functional requirements, and HTML drafts across unstructured chat threads. AI App Builder solves this by providing a dedicated workspace where each project maintains a defined category, a functional description, a numbered and timestamped instruction log, an isolated sandboxed iframe preview testable across three viewport widths, and one-click text export.',
      pillarsTitle: 'Core implemented features',
      pillars: [
        {
          title: '8 Structured Project Categories',
          description: 'Built-in classification for Website, Web App, Landing Page, E-commerce, Dashboard, Portfolio, Blog, and Custom projects.',
        },
        {
          title: 'Iterative Editor with Prompt Log',
          description: 'Dedicated side panel to submit sequential instructions (up to 1,000 characters each) with automatic timestamps and instruction counters.',
        },
        {
          title: 'Multi-Device Live Preview & Code View',
          description: 'Renders HTML inside a sandboxed iframe with instant switching between Desktop (100%), Tablet (768px), and Mobile (375px) viewports.',
        },
        {
          title: 'Multi-Provider Configuration (BYOK)',
          description: 'Settings module for OpenAI (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo), Anthropic (Claude 3.5 Sonnet/Haiku, Claude 3 Opus), Groq (Llama 3.3, Mixtral), or a custom endpoint.',
        },
      ],
      workflowTitle: 'How the 4-step workflow operates',
      workflowSteps: [
        {
          step: '01',
          title: 'Project Definition',
          description: 'Select one of the 8 project types, assign a project name (up to 60 characters), and write an initial specification (up to 2,000 characters).',
        },
        {
          step: '02',
          title: 'AI Provider Configuration',
          description: 'In the administrator settings, choose your provider (OpenAI, Anthropic, Groq, or Custom), pick a model, and store your personal API key.',
        },
        {
          step: '03',
          title: 'Iterative Instruction Refinement',
          description: 'Add incremental instructions in the editor to specify layout sections or behavior and trigger the preview generation state.',
        },
        {
          step: '04',
          title: 'Responsive Inspection & Export',
          description: 'Verify rendering across Desktop, Tablet, and Mobile widths, inspect the raw HTML code, and export the complete project record as a .txt file.',
        },
      ],
      supportedProvidersTitle: 'Configurable Artificial Intelligence Providers and Models',
      supportedProvidersSubtitle: 'Official documentation links for the providers supported in the platform Settings module.',
      providers: [
        {
          name: 'OpenAI',
          models: 'gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo',
          endpointInfo: 'https://api.openai.com/v1/chat/completions',
          officialUrl: 'https://platform.openai.com/docs/overview',
        },
        {
          name: 'Anthropic (Claude)',
          models: 'claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229',
          endpointInfo: 'https://api.anthropic.com/v1/messages',
          officialUrl: 'https://docs.anthropic.com/',
        },
        {
          name: 'Groq',
          models: 'llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768',
          endpointInfo: 'https://api.groq.com/openai/v1/chat/completions',
          officialUrl: 'https://console.groq.com/docs/overview',
        },
      ],
      quickFaqTitle: 'Key Product Questions',
      viewAllFaqLabel: 'View all technical FAQs',
      exploreUseCasesLabel: 'Explore Use Cases & Comparison Table',
      exploreProductLabel: 'Read Full Technical Specification',
    },
    product: {
      definitionTitle: 'Formal Product Definition',
      definitionText: 'AI App Builder (reference repository: akybel2014-creator/ai-app-builder) is a web application built with TypeScript, React 18, Tailwind CSS, and an integrated Express server. It enables developers, designers, and digital creators to structure project specifications, log modification instructions, preview HTML inside isolated iframes, and export complete project documentation.',
      architectureTitle: 'Technical Specifications & Software Stack',
      architectureLead: 'Below are the actual software components running in this application.',
      specs: [
        {
          label: 'Frontend & UI Framework',
          value: 'React 18.3.1 + TypeScript 5.5 + Tailwind CSS 3.4',
          detail: 'Modular, strictly typed user interface using Lucide React icons and responsive layouts.',
        },
        {
          label: 'Server & SEO/AIO Prerendering',
          value: 'Node.js + Express',
          detail: 'Delivers pre-rendered semantic HTML for localized public routes (/it/, /en/, /de/, /fr/), dynamic sitemap.xml, robots.txt, and X-Robots-Tag noindex headers for /admin.',
        },
        {
          label: 'User Data Persistence',
          value: 'Web Storage API (localStorage)',
          detail: 'Projects (key ai-app-builder:projects) and settings (key ai-app-builder:settings) are stored exclusively in the user\'s browser.',
        },
        {
          label: 'Preview Isolation',
          value: 'HTML5 Sandboxed Iframe + CSP',
          detail: 'Previews render inside an opaque-origin iframe with sandbox="allow-scripts" (without allow-same-origin), strict CSP, and selectable viewport widths (100%, 768px, 375px).',
        },
      ],
      capabilitiesTitle: 'Feature Implementation Status (Technical Transparency)',
      capabilities: [
        {
          title: 'Project creation, editing, and deletion',
          status: 'Active & complete',
          description: 'Validates project name (2–60 chars) and description (10–2,000 chars), including quick-start prompt templates.',
        },
        {
          title: 'Instruction history management',
          status: 'Active & complete',
          description: 'Appends text instructions up to 1,000 characters each, persists immediately to localStorage, and supports Ctrl+Enter / Cmd+Enter shortcuts.',
        },
        {
          title: 'Project file export (.txt)',
          status: 'Active & complete',
          description: 'Client-side Blob generation exporting project metadata, description, numbered timestamped instructions, and preview HTML source.',
        },
        {
          title: 'AI Generation & Backend Proxy',
          status: 'Local simulation (Requires backend proxy for live API calls)',
          description: 'The editor checks AI credential configuration and simulates the "generating" -> "generated" lifecycle. As documented in the codebase, live external LLM calls require connecting a backend proxy endpoint.',
        },
        {
          title: 'GitHub Credential Configuration',
          status: 'Local storage interface ready',
          description: 'Stores GitHub username and Personal Access Token (with direct link to create a repo-scoped token) in localStorage for repository integration.',
        },
      ],
      securityPrivacyTitle: 'Security, Privacy, and Workspace Separation',
      securityPrivacyPoints: [
        'No API keys or GitHub tokens are transmitted to external servers or exposed on public indexable pages.',
        'The owner/administrator dashboard (/admin) is maintained exclusively in Italian and is prevented from indexing via meta robots "noindex, nofollow" and HTTP X-Robots-Tag headers.',
        'Access to the administrative workspace is protected by server-side session verification using HttpOnly cookies.',
      ],
      referencesTitle: 'Technical Standards & References',
      references: [
        {
          label: 'Google Search Central — Localized Versions (hreflang)',
          url: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
          description: 'Official guidelines for reciprocal rel="alternate" hreflang annotations and x-default.',
        },
        {
          label: 'Schema.org — SoftwareApplication & FAQPage',
          url: 'https://schema.org/SoftwareApplication',
          description: 'Standard vocabulary used for the JSON-LD structured data embedded in public pages.',
        },
        {
          label: 'MDN Web Docs — Window.localStorage',
          url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',
          description: 'Technical specification of the client-side storage mechanism used by AI App Builder.',
        },
      ],
    },
    useCases: {
      introTitle: 'Who AI App Builder is for and practical use cases',
      introBody: 'AI App Builder serves developers, web designers, digital consultants, and product teams who need to gather structured specifications and inspect responsive HTML prototypes.',
      items: [
        {
          id: 'website',
          title: 'Informational & Business Websites',
          targetAudience: 'Small businesses, professional practices, local venues',
          problemSolved: 'Quickly structure multi-section information architecture (services, opening hours, booking forms) without starting from a blank page.',
          howItWorks: 'Select the "Website" category, enter the business description (e.g., restaurant with menu and reservations), and refine sections via sequential instructions.',
          examplePrompt: 'A website for an Italian restaurant featuring a tasting menu, opening hours table, and reservation request form.',
          projectType: 'Website (website)',
        },
        {
          id: 'landing-page',
          title: 'Promotional & Online Course Landing Pages',
          targetAudience: 'Educators, marketers, digital product creators',
          problemSolved: 'Validate visual hierarchy of headlines, course modules, and sign-up forms across mobile and desktop viewports.',
          howItWorks: 'Choose "Landing Page", define the value proposition, and switch to the Mobile simulator (375px) to verify above-the-fold clarity.',
          examplePrompt: 'A landing page for an online coding course with curriculum syllabus, instructor bio, and enrollment form.',
          projectType: 'Landing Page (landing-page)',
        },
        {
          id: 'dashboard',
          title: 'Analytics Dashboards & Control Panels',
          targetAudience: 'Product managers, frontend engineers, data analysts',
          problemSolved: 'Align stakeholders on key performance indicators (KPIs), tables, and filters before wiring backend databases.',
          howItWorks: 'Select "Dashboard", list the required metrics, and use the Code tab to inspect or export the HTML structure.',
          examplePrompt: 'An e-commerce sales monitoring dashboard with daily order summaries, return rates, and top-selling products.',
          projectType: 'Dashboard (dashboard)',
        },
        {
          id: 'portfolio-ecommerce-blog',
          title: 'Creative Portfolios, E-commerce & Blogs',
          targetAudience: 'Photographers, designers, merchants, editorial teams',
          problemSolved: 'Organize image galleries, product cards, or editorial layouts while keeping a complete log of requested revisions.',
          howItWorks: 'Pick "Portfolio", "E-commerce", or "Blog", append numbered instructions for each revision, and export the full specification to .txt.',
          examplePrompt: 'A photographer portfolio with category-filtered image gallery and biography section.',
          projectType: 'Portfolio / E-commerce / Blog',
        },
      ],
      comparisonTitle: 'Objective Comparison of Prototyping Approaches',
      comparisonSubtitle: 'Evaluation based on the actual capabilities of AI App Builder compared to manual IDE coding and traditional visual page builders.',
      comparisonHeaders: {
        criterion: 'Technical Criterion',
        aiAppBuilder: 'AI App Builder',
        traditionalCoding: 'Manual Coding (IDE)',
        staticPageBuilders: 'Visual SaaS Page Builders',
      },
      comparisonRows: [
        {
          criterion: 'Primary input method',
          aiAppBuilder: 'Structured text description + numbered instruction log',
          traditionalCoding: 'Manual source code authoring (HTML/CSS/TS)',
          staticPageBuilders: 'Manual drag-and-drop of predefined blocks',
        },
        {
          criterion: 'AI model selection',
          aiAppBuilder: 'Bring Your Own Key (OpenAI, Anthropic, Groq, or Custom endpoint)',
          traditionalCoding: 'Depends on external IDE extensions',
          staticPageBuilders: 'Locked to vendor-specific proprietary models',
        },
        {
          criterion: 'Project data storage',
          aiAppBuilder: '100% local in browser (localStorage) + .txt file export',
          traditionalCoding: 'Local filesystem and Git repositories',
          staticPageBuilders: 'Proprietary cloud requiring recurring subscription',
        },
        {
          criterion: 'Built-in responsive testing',
          aiAppBuilder: 'Instant viewport toggle: Desktop (100%), Tablet (768px), Mobile (375px)',
          traditionalCoding: 'Requires browser DevTools inspection',
          staticPageBuilders: 'Included in visual editor',
        },
        {
          criterion: 'Public site vs. Admin language separation',
          aiAppBuilder: 'Public site in 4 languages (IT, EN, DE, FR); Admin dashboard strictly in Italian',
          traditionalCoding: 'Must be architected manually from scratch',
          staticPageBuilders: 'Typically coupled or requires paid add-ons',
        },
      ],
    },
    faq: {
      intro: 'This section provides direct answers, verifiable against the source code, to the most common questions about AI App Builder.',
      items: [
        {
          category: 'Product & Workflow',
          question: 'What exactly is AI App Builder?',
          answer: 'AI App Builder is a web application for defining, managing, and prototyping web application and website projects through text instructions. It includes a project dashboard, an iterative instruction editor, a multi-device HTML preview simulator, and a project export utility.',
        },
        {
          category: 'Languages & Administration',
          question: 'Which languages are supported for the public website versus the administrator dashboard?',
          answer: 'The public informational website supports four languages with dedicated URL paths: Italian (/it/), English (/en/), German (/de/), and French (/fr/). The owner/administrator dashboard (/admin) is exclusively in Italian, never changes language automatically, and operates independently from the public site language.',
        },
        {
          category: 'AI Models & Providers',
          question: 'Which artificial intelligence providers and models can be configured?',
          answer: 'In the Settings view, you can configure four provider options: OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo), Anthropic Claude (claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229), Groq (llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768), or a custom API endpoint.',
        },
        {
          category: 'Privacy & Security',
          question: 'Where are my projects and API keys stored?',
          answer: 'All created projects and configured API keys are stored locally in your browser using localStorage (under keys "ai-app-builder:projects" and "ai-app-builder:settings"). No API keys are exposed in public indexable pages or sent to unauthorized third-party servers.',
        },
        {
          category: 'Technical Scope',
          question: 'Are live AI generation and GitHub repository push connected to an external backend?',
          answer: 'Project creation, instruction history logging, responsive iframe previewing, and .txt file export are fully functional out of the box. The "Generate with AI" action currently runs a local state simulation and requires wiring a backend proxy for live external LLM calls; similarly, the GitHub section stores your username and token locally in preparation for repository syncing.',
        },
        {
          category: 'SEO, Crawlers & Indexing',
          question: 'Are private workspaces and the project editor indexed by search engines or AI crawlers?',
          answer: 'No. Only the localized public pages (/it/, /en/, /de/, /fr/) are indexable and listed in the XML sitemap. The administrative dashboard and editor (/admin) are protected by authentication, excluded from the sitemap, and served with X-Robots-Tag: noindex, nofollow headers.',
        },
      ],
    },
    footer: {
      productIdentity: 'AI App Builder — Web platform for structured application prototyping via text instructions.',
      repositoryLabel: 'Reference GitHub Repository: akybel2014-creator/ai-app-builder',
      repositoryUrl: 'https://github.com/akybel2014-creator/ai-app-builder',
      legalNoticeTitle: 'Project Information & Transparency',
      legalNoticeText: 'Open-source software project imported from GitHub (author/repository: akybel2014-creator/ai-app-builder). No commercial pricing or paid subscription is charged by this interface.',
      crawlerPolicyTitle: 'Search & AI Crawler Policy',
      crawlerPolicyText: 'Standard search engine crawlers and AI user-agents are permitted on localized public pages (/it/, /en/, /de/, /fr/) as configured in /robots.txt. The administrative area (/admin) is restricted and non-indexable.',
      navigationTitle: 'Public Pages',
      languagesTitle: 'Language Versions',
      adminNotice: 'The Administrator Dashboard is exclusively available in Italian.',
    },
  },
  de: {
    locale: 'de',
    htmlLang: 'de',
    nav: {
      home: 'Übersicht',
      product: 'Produktspezifikation',
      useCases: 'Anwendungsfälle & Vergleich',
      pricing: 'Preise & Tarife',
      faq: 'Häufige Fragen (FAQ)',
      register: 'Registrieren',
      login: 'Anmelden',
      adminLink: 'Admin-Bereich (IT)',
      languageLabel: 'Sprache der öffentlichen Website',
    },
    breadcrumbs: {
      home: 'Startseite',
      product: 'Produkt & Architektur',
      useCases: 'Anwendungsfälle & Vergleich',
      pricing: 'Preise & Tarife',
      faq: 'FAQ',
      register: 'Konto erstellen',
      login: 'Anmelden',
      checkout: 'Checkout-Übersicht',
    },
    meta: {
      home: {
        title: 'AI App Builder — Web-Umgebung für textbasierte App-Prototypen',
        description: 'AI App Builder ist eine Webanwendung zum Strukturieren von Websites, Web-Apps, Dashboards und E-Commerce-Projekten per Textanweisung und Live-HTML-Vorschau.',
        h1: 'Webanwendungen durch strukturierte Textanweisungen entwerfen und prototypisieren',
        subtitle: 'AI App Builder kombiniert lokale Projektverwaltung, chronologischen Anweisungsverlauf, Multi-Device-HTML-Vorschau (Desktop, Tablet, Mobil) und BYOK-Konfiguration für OpenAI, Anthropic und Groq.',
      },
      product: {
        title: 'Produktübersicht & Technische Architektur — AI App Builder',
        description: 'Erfahren Sie, wie AI App Builder funktioniert: React 18 und TypeScript-Architektur, localStorage-Speicherung im Browser, unterstützte KI-Modelle und Sicherheit.',
        h1: 'Architektur, reale Funktionen und technische Spezifikationen von AI App Builder',
        subtitle: 'Überprüfbare technische Dokumentation zu den implementierten Softwarefunktionen, unterstützten KI-Anbietern und der lokalen Datenhaltung im Browser.',
      },
      useCases: {
        title: 'Unterstützte Anwendungsfälle & Technischer Vergleich — AI App Builder',
        description: 'Entdecken Sie die 8 Projekttypen von AI App Builder (Website, Web-App, Landingpage, E-Commerce, Dashboard, Portfolio, Blog) im direkten Vergleich.',
        h1: 'Unterstützte Anwendungsfälle und Vergleich von Prototyping-Ansätzen',
        subtitle: 'Konkrete Einsatzszenarien für schnelles HTML/CSS/JS-Prototyping sowie ein objektiver Vergleich mit manueller Programmierung und visuellen Baukästen.',
      },
      pricing: {
        title: 'Preise & Tarife — AI App Builder (Kostenloser BYOK-Tarif & Konfigurierbare Pläne)',
        description: 'Vergleichen Sie den aktiven kostenlosen Community Open-Source (BYOK) Tarif mit den konfigurierbaren kostenpflichtigen Plänen von AI App Builder.',
        h1: 'AI App Builder Preise & Tarife',
        subtitle: 'Web-Arbeitsbereich zum Entwerfen und Prototypisieren von Anwendungen über strukturierte Textanweisungen. Wählen Sie zwischen dem kostenlosen BYOK-Tarif und konfigurierbaren Plänen.',
      },
      faq: {
        title: 'Häufig gestellte Fragen (FAQ) zu Funktionen, Datenschutz & KI — AI App Builder',
        description: 'Direkte, überprüfbare Antworten zu AI App Builder: OpenAI/Anthropic/Groq API-Schlüssel, Browser-localStorage, Code-Export und GitHub-Integration.',
        h1: 'Häufig gestellte Fragen (FAQ) zu AI App Builder',
        subtitle: 'Klare technische Antworten zur Konfiguration von Sprachmodellen, lokaler Speicherung, Sicherheit der Zugangsdaten und Projektexport.',
      },
      register: {
        title: 'Konto registrieren — AI App Builder',
        description: 'Erstellen Sie ein Konto bei AI App Builder, während Ihre Tarifauswahl für den anschließenden Checkout gespeichert bleibt.',
        h1: 'Erstellen Sie Ihr AI App Builder Konto',
        subtitle: 'Ihr gewählter Tarif bleibt während der Registrierung erhalten, sodass Sie direkt zum Checkout weitergeleitet werden.',
      },
      login: {
        title: 'Anmelden — AI App Builder',
        description: 'Melden Sie sich mit Ihrem bestehenden AI App Builder Konto an und fahren Sie direkt mit dem Checkout Ihres gewählten Tarifs fort.',
        h1: 'Bei Ihrem AI App Builder Konto anmelden',
        subtitle: 'Authentifizieren Sie sich mit Ihren Zugangsdaten, um direkt zur Checkout-Übersicht des gewählten Tarifs fortzufahren.',
      },
      checkout: {
        title: 'Checkout-Übersicht & Tarifprüfung — AI App Builder',
        description: 'Überprüfen Sie den gewählten Tarif, den Abrechnungszeitraum, den serverseitig geprüften Preis sowie den Konfigurationsstatus des Zahlungsanbieters.',
        h1: 'Checkout-Übersicht für Ihren gewählten Tarif',
        subtitle: 'Prüfen Sie die serverseitig verifizierten Tarifdetails und Bedingungen vor der Aktivierung oder Zahlungseinrichtung.',
      },
    },
    home: {
      badge: 'Open-Source-Plattform • BYOK (Bring Your Own Key)',
      ctaPrimary: 'Administrator-Dashboard öffnen (Italienisch)',
      ctaSecondary: 'Technische Spezifikation lesen',
      whatIsTitle: 'Was AI App Builder ist und welches Problem es löst',
      whatIsLead: 'AI App Builder ist eine Single-Page-Webanwendung (SPA) mit serverseitigem Prerendering für öffentliche Informationsseiten, entwickelt zur strukturierten Organisation und Iteration von Web-Prototypen über Textanweisungen.',
      whatIsBody: 'Bei der Planung von Web-Oberflächen gehen Prompts, Anforderungen und HTML-Entwürfe in unstrukturierten Chats oft verloren. AI App Builder löst dieses Problem durch einen Arbeitsbereich, in dem jedes Projekt eine feste Kategorie, eine Funktionsbeschreibung, ein nummeriertes Anweisungsprotokoll mit Zeitstempel, eine isolierte Iframe-Vorschau für drei Bildschirmbreiten und eine direkte Text-Exportfunktion besitzt.',
      pillarsTitle: 'Tatsächlich implementierte Kernfunktionen',
      pillars: [
        {
          title: '8 Strukturierte Projektkategorien',
          description: 'Integrierte Klassifizierung für Website, Web-App, Landingpage, E-Commerce, Dashboard, Portfolio, Blog und benutzerdefinierte Projekte.',
        },
        {
          title: 'Iterativer Editor mit Prompt-Historie',
          description: 'Seitenleiste zum Senden aufeinanderfolgender Anweisungen (bis zu 1.000 Zeichen pro Eintrag) inklusive Zeitstempel und Zähler.',
        },
        {
          title: 'Multi-Device Live-Vorschau & Code-Ansicht',
          description: 'Darstellung des HTML-Codes in einem geschützten Sandbox-Iframe mit sofortigem Wechsel zwischen Desktop (100%), Tablet (768px) und Mobilgerät (375px).',
        },
        {
          title: 'Multi-Provider-Konfiguration (BYOK)',
          description: 'Einstellungsmodul für OpenAI (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo), Anthropic (Claude 3.5 Sonnet/Haiku, Claude 3 Opus), Groq (Llama 3.3, Mixtral) oder eigene Endpunkte.',
        },
      ],
      workflowTitle: 'So funktioniert der Arbeitsablauf in 4 Schritten',
      workflowSteps: [
        {
          step: '01',
          title: 'Projektdefinition',
          description: 'Wählen Sie eine der 8 Kategorien, vergeben Sie einen Namen (bis 60 Zeichen) und verfassen Sie eine detaillierte Ausgangsbeschreibung (bis 2.000 Zeichen).',
        },
        {
          step: '02',
          title: 'KI-Anbieter konfigurieren',
          description: 'Wählen Sie in den Administratoreinstellungen den Anbieter (OpenAI, Anthropic, Groq oder Custom), das Modell und hinterlegen Sie Ihren persönlichen API-Schlüssel.',
        },
        {
          step: '03',
          title: 'Verfeinerung durch Anweisungen',
          description: 'Fügen Sie im Editor schrittweise Änderungsanweisungen hinzu, um Layout oder Sektionen zu präzisieren, und starten Sie die Vorschau-Generierung.',
        },
        {
          step: '04',
          title: 'Responsive Prüfung & Export',
          description: 'Prüfen Sie die Darstellung auf Desktop, Tablet und Smartphone, kontrollieren Sie den HTML-Quelltext und exportieren Sie die gesamte Projektdokumentation als .txt-Datei.',
        },
      ],
      supportedProvidersTitle: 'Konfigurierbare KI-Anbieter und Sprachmodelle',
      supportedProvidersSubtitle: 'Offizielle Referenzen zu den im Einstellungsmodul unterstützten Anbietern.',
      providers: [
        {
          name: 'OpenAI',
          models: 'gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo',
          endpointInfo: 'https://api.openai.com/v1/chat/completions',
          officialUrl: 'https://platform.openai.com/docs/overview',
        },
        {
          name: 'Anthropic (Claude)',
          models: 'claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229',
          endpointInfo: 'https://api.anthropic.com/v1/messages',
          officialUrl: 'https://docs.anthropic.com/',
        },
        {
          name: 'Groq',
          models: 'llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768',
          endpointInfo: 'https://api.groq.com/openai/v1/chat/completions',
          officialUrl: 'https://console.groq.com/docs/overview',
        },
      ],
      quickFaqTitle: 'Wichtige Fragen zum Produkt',
      viewAllFaqLabel: 'Alle technischen FAQs ansehen',
      exploreUseCasesLabel: 'Anwendungsfälle & Vergleichstabelle ansehen',
      exploreProductLabel: 'Vollständige technische Spezifikation lesen',
    },
    product: {
      definitionTitle: 'Formale Produktdefinition',
      definitionText: 'AI App Builder (Referenz-Repository: akybel2014-creator/ai-app-builder) ist eine in TypeScript geschriebene Webanwendung auf Basis von React 18, Tailwind CSS und einem integrierten Express-Server. Sie ermöglicht Entwicklern, Designern und Produktteams das strukturierte Erfassen von Projektspezifikationen, das Protokollieren von Änderungsanweisungen, die HTML-Vorschau in isolierten Iframes sowie den Export der vollständigen Projektdokumentation.',
      architectureTitle: 'Technische Spezifikationen & Software-Stack',
      architectureLead: 'Nachfolgend sind die realen Komponenten aufgeführt, aus denen diese Anwendung besteht.',
      specs: [
        {
          label: 'Frontend & UI-Framework',
          value: 'React 18.3.1 + TypeScript 5.5 + Tailwind CSS 3.4',
          detail: 'Modular aufgebaute, typisierte Benutzeroberfläche mit Lucide React Icons und responsivem Design.',
        },
        {
          label: 'Server & SEO/AIO-Prerendering',
          value: 'Node.js + Express',
          detail: 'Liefert vorgerendertes semantisches HTML für öffentliche Sprachpfade (/it/, /en/, /de/, /fr/), sitemap.xml, robots.txt sowie X-Robots-Tag noindex-Header für /admin.',
        },
        {
          label: 'Datenspeicherung',
          value: 'Web Storage API (localStorage)',
          detail: 'Projekte (Schlüssel ai-app-builder:projects) und Einstellungen (Schlüssel ai-app-builder:settings) werden ausschließlich lokal im Browser des Nutzers gespeichert.',
        },
        {
          label: 'Vorschau-Isolierung',
          value: 'HTML5 Sandbox-Iframe + CSP',
          detail: 'Die Vorschau läuft in einem Iframe mit opaker Herkunft (sandbox="allow-scripts", ohne allow-same-origin), strikter CSP und umschaltbaren Breiten (100%, 768px, 375px).',
        },
      ],
      capabilitiesTitle: 'Implementierungsstatus der Funktionen (Technische Transparenz)',
      capabilities: [
        {
          title: 'Projekte erstellen, bearbeiten und löschen',
          status: 'Aktiv & vollständig',
          description: 'Validierung von Projektname (2–60 Zeichen) und Beschreibung (10–2.000 Zeichen) inklusive direkter Beispielvorlagen.',
        },
        {
          title: 'Verwaltung des Anweisungsverlaufs',
          status: 'Aktiv & vollständig',
          description: 'Hinzufügen von Textanweisungen bis 1.000 Zeichen, sofortige Speicherung im localStorage und Tastenkombination Strg+Eingabe / Cmd+Eingabe.',
        },
        {
          title: 'Projektexport als Textdatei (.txt)',
          status: 'Aktiv & vollständig',
          description: 'Clientseitige Erstellung einer Textdatei über die Blob API mit Metadaten, Beschreibung, nummerierter Anweisungsliste und HTML-Vorschaucode.',
        },
        {
          title: 'KI-Generierung & Backend-Proxy',
          status: 'Lokale Simulation (Erfordert Backend-Proxy für Live-API-Aufrufe)',
          description: 'Der Editor prüft das Vorhandensein der KI-Zugangsdaten und simuliert den Statuswechsel "generating" -> "generated". Für echte API-Aufrufe an externe Sprachmodelle ist laut Quellcode ein Backend-Proxy erforderlich.',
        },
        {
          title: 'GitHub-Zugangsdaten konfigurieren',
          status: 'Lokale Speicherschnittstelle vorbereitet',
          description: 'Speichert GitHub-Benutzername und Personal Access Token (inkl. Direktlink zur Token-Erstellung mit repo-Berechtigung) im localStorage.',
        },
      ],
      securityPrivacyTitle: 'Sicherheit, Datenschutz und Bereichstrennung',
      securityPrivacyPoints: [
        'Es werden keine API-Schlüssel oder GitHub-Tokens an externe Server gesendet oder auf öffentlichen Seiten ausgegeben.',
        'Das Administrator-Dashboard (/admin) bleibt ausschließlich auf Italienisch und ist über Meta-Robots "noindex, nofollow" sowie HTTP X-Robots-Tag vor einer Indexierung geschützt.',
        'Der Zugriff auf den Administrationsbereich wird serverseitig über eine authentifizierte Sitzung (HttpOnly-Cookie) geschützt.',
      ],
      referencesTitle: 'Verwendete technische Standards und Quellen',
      references: [
        {
          label: 'Google Search Central — Mehrsprachige Websites und hreflang',
          url: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
          description: 'Offizielle Richtlinien für reziproke rel="alternate" hreflang-Auszeichnungen und x-default.',
        },
        {
          label: 'Schema.org — SoftwareApplication & FAQPage',
          url: 'https://schema.org/SoftwareApplication',
          description: 'Standardvokabular für die in den öffentlichen Seiten eingebetteten JSON-LD-Strukturdaten.',
        },
        {
          label: 'MDN Web Docs — Window.localStorage',
          url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',
          description: 'Technische Spezifikation der von AI App Builder genutzten lokalen Browserspeicherung.',
        },
      ],
    },
    useCases: {
      introTitle: 'Zielgruppen und praktische Anwendungsfälle von AI App Builder',
      introBody: 'AI App Builder richtet sich an Entwickler, Webdesigner, digitale Berater und Produktteams, die strukturierte Spezifikationen erfassen und responsive HTML-Prototypen testen möchten.',
      items: [
        {
          id: 'website',
          title: 'Informations- und Unternehmenswebsites',
          targetAudience: 'Kleine Unternehmen, Kanzleien, lokale Gastronomie',
          problemSolved: 'Schnelle Strukturierung der Informationsarchitektur (Über uns, Leistungen, Öffnungszeiten, Kontakt) ohne leeres Blatt.',
          howItWorks: 'Kategorie "Website" wählen, Unternehmensbeschreibung eingeben (z. B. Restaurant mit Speisekarte und Reservierung) und Sektionen per Anweisung verfeinern.',
          examplePrompt: 'Eine Website für ein Restaurant mit Degustationsmenü, Öffnungszeitentabelle und Reservierungsformular.',
          projectType: 'Website (website)',
        },
        {
          id: 'landing-page',
          title: 'Landingpages für Kampagnen und Online-Kurse',
          targetAudience: 'Trainer, Marketing-Teams, Anbieter digitaler Produkte',
          problemSolved: 'Überprüfung der visuellen Hierarchie von Überschriften, Kursmodulen und Anmeldeformularen auf Mobil- und Desktop-Bildschirmen.',
          howItWorks: 'Typ "Landing Page" wählen, Nutzenversprechen beschreiben und im Mobil-Simulator (375px) die Lesbarkeit prüfen.',
          examplePrompt: 'Eine Landingpage für einen Online-Programmierkurs mit Lehrplan, Dozentenprofil und Anmeldeformular.',
          projectType: 'Landingpage (landing-page)',
        },
        {
          id: 'dashboard',
          title: 'Analyse-Dashboards & Kontrollzentralen',
          targetAudience: 'Produktmanager, Frontend-Entwickler, Datenanalysten',
          problemSolved: 'Abstimmung über Kennzahlen (KPIs), Tabellen und Filter im Team, bevor Datenbanken angebunden werden.',
          howItWorks: 'Kategorie "Dashboard" wählen, gewünschte Metriken auflisten und über den Reiter Code die HTML-Struktur prüfen oder exportieren.',
          examplePrompt: 'Ein Dashboard zur Überwachung von E-Commerce-Verkäufen mit Tagesbestellungen, Retourenquote und Top-Produkten.',
          projectType: 'Dashboard (dashboard)',
        },
        {
          id: 'portfolio-ecommerce-blog',
          title: 'Kreativ-Portfolios, E-Commerce & Blogs',
          targetAudience: 'Fotografen, Designer, Online-Händler, Redaktionen',
          problemSolved: 'Organisation von Bildergalerien, Produktkarten oder Artikellayouts bei lückenloser Dokumentation aller Änderungswünsche.',
          howItWorks: '"Portfolio", "E-Commerce" oder "Blog" auswählen, nummerierte Anweisungen ergänzen und das Protokoll als .txt exportieren.',
          examplePrompt: 'Ein Portfolio für einen Fotografen mit nach Kategorien filterbarer Bildergalerie und Biografie-Bereich.',
          projectType: 'Portfolio / E-Commerce / Blog',
        },
      ],
      comparisonTitle: 'Objektiver Vergleich von Prototyping-Ansätzen',
      comparisonSubtitle: 'Bewertung anhand der realen Eigenschaften von AI App Builder im Vergleich zu manueller IDE-Programmierung und klassischen visuellen Baukästen.',
      comparisonHeaders: {
        criterion: 'Technisches Kriterium',
        aiAppBuilder: 'AI App Builder',
        traditionalCoding: 'Manuelle Programmierung (IDE)',
        staticPageBuilders: 'Visuelle SaaS-Page-Builder',
      },
      comparisonRows: [
        {
          criterion: 'Primäre Eingabemethode',
          aiAppBuilder: 'Strukturierte Textbeschreibung + nummeriertes Anweisungsprotokoll',
          traditionalCoding: 'Manuelles Schreiben von Quellcode (HTML/CSS/TS)',
          staticPageBuilders: 'Manuelles Ziehen vordefinierter Blöcke (Drag & Drop)',
        },
        {
          criterion: 'Auswahl der KI-Modelle',
          aiAppBuilder: 'Freie Anbieterwahl mit eigenem Schlüssel (OpenAI, Anthropic, Groq, Custom)',
          traditionalCoding: 'Abhängig von externen Editor-Plugins',
          staticPageBuilders: 'Gebunden an proprietäre Modelle des Anbieters',
        },
        {
          criterion: 'Speicherung der Projektdaten',
          aiAppBuilder: '100 % lokal im Browser (localStorage) + .txt-Dateiexport',
          traditionalCoding: 'Lokales Dateisystem und Git-Repositories',
          staticPageBuilders: 'Proprietäre Cloud mit monatlichem Abonnement',
        },
        {
          criterion: 'Integrierter Responsive-Test',
          aiAppBuilder: 'Sofortiger Umschalter für Desktop (100%), Tablet (768px), Mobil (375px)',
          traditionalCoding: 'Erfordert Browser-DevTools',
          staticPageBuilders: 'Im visuellen Editor enthalten',
        },
        {
          criterion: 'Sprachtrennung Website / Admin-Dashboard',
          aiAppBuilder: 'Öffentliche Website in 4 Sprachen (IT, EN, DE, FR); Admin-Dashboard strikt auf Italienisch',
          traditionalCoding: 'Muss komplett manuell programmiert werden',
          staticPageBuilders: 'Oft gekoppelt oder erfordert kostenpflichtige Zusatzmodule',
        },
      ],
    },
    faq: {
      intro: 'Dieser Bereich bietet direkte, im Quellcode überprüfbare Antworten auf die wichtigsten Fragen zu AI App Builder.',
      items: [
        {
          category: 'Produkt & Funktionsweise',
          question: 'Was genau ist AI App Builder?',
          answer: 'AI App Builder ist eine Webanwendung zum Definieren, Verwalten und Prototypisieren von Webanwendungs- und Website-Projekten über Textanweisungen. Sie umfasst ein Projekt-Dashboard, einen Editor mit Anweisungsverlauf, einen Multi-Device-HTML-Vorschausimulator und eine Exportfunktion.',
        },
        {
          category: 'Sprachen & Administration',
          question: 'In welchen Sprachen sind die öffentliche Website und das Administrator-Dashboard verfügbar?',
          answer: 'Die öffentliche Informationswebsite unterstützt vier Sprachen mit eigenen URL-Pfaden: Italienisch (/it/), Englisch (/en/), Deutsch (/de/) und Französisch (/fr/). Das Administrator-Dashboard (/admin) ist hingegen ausschließlich auf Italienisch gehalten, wechselt die Sprache nicht automatisch und ist vollständig unabhängig von der gewählten Sprache der öffentlichen Website.',
        },
        {
          category: 'KI-Modelle & Anbieter',
          question: 'Welche KI-Anbieter und Sprachmodelle werden unterstützt?',
          answer: 'In den Einstellungen können vier Optionen konfiguriert werden: OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo), Anthropic Claude (claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229), Groq (llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768) oder ein benutzerdefinierter API-Endpunkt.',
        },
        {
          category: 'Datenschutz & Sicherheit',
          question: 'Wo werden meine Projekte und API-Schlüssel gespeichert?',
          answer: 'Alle Projekte und eingegebenen API-Schlüssel werden ausschließlich lokal in Ihrem Browser über localStorage gespeichert (Schlüssel "ai-app-builder:projects" und "ai-app-builder:settings"). Es werden keine API-Schlüssel auf öffentlichen Seiten veröffentlicht oder an unbefugte Server übertragen.',
        },
        {
          category: 'Technischer Funktionsumfang',
          question: 'Sind die Live-KI-Generierung und der GitHub-Export bereits mit einem externen Backend verbunden?',
          answer: 'Projekterstellung, Anweisungsprotokoll, responsive Iframe-Vorschau und der .txt-Dateiexport sind vollständig einsatzbereit. Die Schaltfläche zur KI-Generierung führt derzeit eine lokale Statussimulation durch und erfordert für echte API-Aufrufe die Anbindung eines Backend-Proxys; ebenso speichert das GitHub-Modul Benutzername und Token lokal für die Repository-Anbindung.',
        },
        {
          category: 'SEO, Crawler & Indexierung',
          question: 'Werden private Arbeitsbereiche und der Editor von Suchmaschinen oder KI-Crawlern indexiert?',
          answer: 'Nein. Nur die öffentlichen Seiten (/it/, /en/, /de/, /fr/) sind indexierbar und in der XML-Sitemap enthalten. Der Administrationsbereich und Editor (/admin) sind durch Authentifizierung geschützt, aus der Sitemap ausgeschlossen und mit X-Robots-Tag: noindex, nofollow versehen.',
        },
      ],
    },
    footer: {
      productIdentity: 'AI App Builder — Webplattform für strukturiertes Anwendungs-Prototyping durch Textanweisungen.',
      repositoryLabel: 'Referenz-GitHub-Repository: akybel2014-creator/ai-app-builder',
      repositoryUrl: 'https://github.com/akybel2014-creator/ai-app-builder',
      legalNoticeTitle: 'Projektinformationen & Transparenz',
      legalNoticeText: 'Aus GitHub importiertes Open-Source-Softwareprojekt (Autor/Repository: akybel2014-creator/ai-app-builder). Über diese Oberfläche werden keine kommerziellen Preise oder kostenpflichtigen Abonnements abgerechnet.',
      crawlerPolicyTitle: 'Richtlinie für Such- und KI-Crawler',
      crawlerPolicyText: 'Standard-Suchmaschinen-Crawler und KI-User-Agents sind auf den lokalisierten öffentlichen Seiten (/it/, /en/, /de/, /fr/) gemäß /robots.txt zugelassen. Der Administrationsbereich (/admin) ist geschützt und nicht indexierbar.',
      navigationTitle: 'Öffentliche Seiten',
      languagesTitle: 'Sprachversionen',
      adminNotice: 'Das Administrator-Dashboard ist ausschließlich auf Italienisch verfügbar.',
    },
  },
  fr: {
    locale: 'fr',
    htmlLang: 'fr',
    nav: {
      home: 'Aperçu',
      product: 'Spécification Produit',
      useCases: 'Cas d\'Usage & Comparaison',
      pricing: 'Tarifs & Forfaits',
      faq: 'Questions Fréquentes (FAQ)',
      register: 'Inscription',
      login: 'Connexion',
      adminLink: 'Espace Administrateur (IT)',
      languageLabel: 'Langue du site public',
    },
    breadcrumbs: {
      home: 'Accueil',
      product: 'Produit & Architecture',
      useCases: 'Cas d\'Usage & Comparaison',
      pricing: 'Tarifs & Forfaits',
      faq: 'FAQ',
      register: 'Créer un Compte',
      login: 'Connexion',
      checkout: 'Récapitulatif de Paiement',
    },
    meta: {
      home: {
        title: 'AI App Builder — Environnement Web de Prototypage d\'Applications par Instructions',
        description: 'AI App Builder est une application web permettant de structurer des sites web, applications, tableaux de bord et e-commerces via des instructions textuelles et un aperçu HTML.',
        h1: 'Concevez et prototypez des applications web grâce à des instructions textuelles structurées',
        subtitle: 'AI App Builder associe gestion de projets locale, historique horodaté des instructions, aperçu HTML multi-appareils (Bureau, Tablette, Mobile) et configuration BYOK pour OpenAI, Anthropic et Groq.',
      },
      product: {
        title: 'Présentation du Produit & Architecture Technique — AI App Builder',
        description: 'Découvrez le fonctionnement d\'AI App Builder : architecture React 18 et TypeScript, persistance localStorage, modèles d\'IA pris en charge et sécurité des clés API.',
        h1: 'Architecture, Fonctionnalités Réelles et Spécifications d\'AI App Builder',
        subtitle: 'Documentation technique vérifiable sur les fonctionnalités implémentées, les fournisseurs d\'IA compatibles et le stockage local des données dans le navigateur.',
      },
      useCases: {
        title: 'Cas d\'Usage Supportés & Comparaison Technique — AI App Builder',
        description: 'Explorez les 8 types de projets pris en charge par AI App Builder (Site Web, Application Web, Landing Page, E-commerce, Dashboard, Portfolio, Blog) et leur comparaison.',
        h1: 'Cas d\'Usage Pris en Charge et Comparaison des Approches de Prototypage',
        subtitle: 'Scénarios concrets dans lesquels AI App Builder structure le prototypage HTML/CSS/JS, avec une comparaison objective face au codage manuel et aux constructeurs visuels.',
      },
      pricing: {
        title: 'Tarifs & Forfaits — AI App Builder (Forfait Gratuit BYOK & Offres Configurables)',
        description: 'Comparez le forfait gratuit Communauté Open-Source (BYOK) d\'AI App Builder avec les offres payantes configurables. Transparence sur les quotas et le paiement.',
        h1: 'Tarifs et Forfaits d\'AI App Builder',
        subtitle: 'Environnement web pour concevoir et prototyper des applications via des instructions structurées. Choisissez entre le forfait gratuit BYOK actif et les forfaits payants configurables.',
      },
      faq: {
        title: 'Questions Fréquentes (FAQ) sur le Fonctionnement, la Confidentialité et l\'IA — AI App Builder',
        description: 'Réponses directes et vérifiables sur AI App Builder : clés API OpenAI/Anthropic/Groq, stockage localStorage, exportation du code et intégration GitHub.',
        h1: 'Questions Fréquentes (FAQ) sur AI App Builder',
        subtitle: 'Réponses techniques directes concernant la configuration des modèles de langage, le stockage local, la sécurité des identifiants et l\'exportation de projet.',
      },
      register: {
        title: 'Inscription — AI App Builder',
        description: 'Créez un compte sur AI App Builder tout en conservant le forfait sélectionné pour passer directement au récapitulatif de commande.',
        h1: 'Créez votre compte AI App Builder',
        subtitle: 'Votre sélection de forfait est conservée pendant l\'inscription afin de continuer automatiquement vers le paiement.',
      },
      login: {
        title: 'Connexion — AI App Builder',
        description: 'Connectez-vous à votre compte AI App Builder existant et accédez directement au récapitulatif du forfait sélectionné.',
        h1: 'Connectez-vous à votre compte AI App Builder',
        subtitle: 'Authentifiez-vous avec vos identifiants pour poursuivre directement vers la validation du forfait choisi.',
      },
      checkout: {
        title: 'Récapitulatif de Commande & Vérification du Forfait — AI App Builder',
        description: 'Vérifiez le forfait sélectionné, la période de facturation, le tarif validé côté serveur et l\'état de configuration du prestataire de paiement.',
        h1: 'Récapitulatif du Forfait Sélectionné',
        subtitle: 'Consultez les détails vérifiés par le serveur et les conditions applicables avant l\'activation ou la configuration du paiement.',
      },
    },
    home: {
      badge: 'Plateforme Open-Source • BYOK (Bring Your Own Key)',
      ctaPrimary: 'Ouvrir le Tableau de Bord Administrateur (Italien)',
      ctaSecondary: 'Consulter la Spécification Technique',
      whatIsTitle: 'Qu\'est-ce qu\'AI App Builder et quel problème résout-il ?',
      whatIsLead: 'AI App Builder est une application web monopage (SPA) dotée d\'un pré-rendu côté serveur pour les pages publiques d\'information, conçue pour organiser et itérer des prototypes d\'interfaces web via des instructions textuelles.',
      whatIsBody: 'Lors de la conception d\'interfaces web, les prompts, exigences fonctionnelles et brouillons HTML sont souvent dispersés dans des fils de discussion non structurés. AI App Builder résout ce problème en fournissant un espace de travail dédié où chaque projet conserve une catégorie définie, une description fonctionnelle, un journal numéroté et horodaté des instructions, un aperçu iframe isolé (sandbox) testable sur trois résolutions et une fonction d\'exportation directe en fichier texte.',
      pillarsTitle: 'Fonctionnalités principales réellement implémentées',
      pillars: [
        {
          title: '8 Catégories de Projets Structurées',
          description: 'Classification native pour Site Web, Application Web, Landing Page, E-commerce, Tableau de bord (Dashboard), Portfolio, Blog et projets personnalisés.',
        },
        {
          title: 'Éditeur Itératif avec Historique des Prompts',
          description: 'Panneau latéral permettant d\'envoyer des instructions séquentielles (jusqu\'à 1 000 caractères chacune) avec horodatage et compteur automatique.',
        },
        {
          title: 'Aperçu Multi-Appareils en Direct & Vue Code',
          description: 'Rendu du code HTML dans un iframe sécurisé (sandbox) avec basculement instantané entre Bureau (100 %), Tablette (768px) et Mobile (375px).',
        },
        {
          title: 'Configuration Multi-Fournisseurs (BYOK)',
          description: 'Module de paramètres pour OpenAI (GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-3.5-turbo), Anthropic (Claude 3.5 Sonnet/Haiku, Claude 3 Opus), Groq (Llama 3.3, Mixtral) ou point de terminaison personnalisé.',
        },
      ],
      workflowTitle: 'Fonctionnement du flux de travail en 4 étapes',
      workflowSteps: [
        {
          step: '01',
          title: 'Définition du Projet',
          description: 'Choisissez l\'une des 8 catégories, attribuez un nom (jusqu\'à 60 caractères) et rédigez une spécification initiale détaillée (jusqu\'à 2 000 caractères).',
        },
        {
          step: '02',
          title: 'Configuration du Fournisseur d\'IA',
          description: 'Dans les paramètres administrateur, sélectionnez le fournisseur (OpenAI, Anthropic, Groq ou Custom), le modèle et saisissez votre clé API personnelle.',
        },
        {
          step: '03',
          title: 'Affinement par Instructions',
          description: 'Ajoutez des instructions incrémentales dans l\'éditeur pour préciser la mise en page ou les sections et lancez la génération de l\'aperçu.',
        },
        {
          step: '04',
          title: 'Inspection Responsive & Exportation',
          description: 'Vérifiez le rendu sur Bureau, Tablette et Mobile, inspectez le code source HTML et exportez le dossier complet du projet dans un fichier .txt.',
        },
      ],
      supportedProvidersTitle: 'Fournisseurs d\'Intelligence Artificielle et Modèles Configurables',
      supportedProvidersSubtitle: 'Références officielles des fournisseurs pris en charge dans le module Paramètres de la plateforme.',
      providers: [
        {
          name: 'OpenAI',
          models: 'gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo',
          endpointInfo: 'https://api.openai.com/v1/chat/completions',
          officialUrl: 'https://platform.openai.com/docs/overview',
        },
        {
          name: 'Anthropic (Claude)',
          models: 'claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229',
          endpointInfo: 'https://api.anthropic.com/v1/messages',
          officialUrl: 'https://docs.anthropic.com/',
        },
        {
          name: 'Groq',
          models: 'llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768',
          endpointInfo: 'https://api.groq.com/openai/v1/chat/completions',
          officialUrl: 'https://console.groq.com/docs/overview',
        },
      ],
      quickFaqTitle: 'Questions Essentielles sur le Produit',
      viewAllFaqLabel: 'Consulter toutes les FAQ techniques',
      exploreUseCasesLabel: 'Explorer les Cas d\'Usage et le Tableau Comparatif',
      exploreProductLabel: 'Lire la Spécification Technique Complète',
    },
    product: {
      definitionTitle: 'Définition Formelle du Produit',
      definitionText: 'AI App Builder (dépôt de référence : akybel2014-creator/ai-app-builder) est une application web développée en TypeScript avec React 18, Tailwind CSS et un serveur Express intégré. Elle permet aux développeurs, designers et chefs de produit de structurer des cahiers des charges, d\'enregistrer des instructions de modification, de prévisualiser du code HTML dans des iframes isolés et d\'exporter la documentation complète du projet.',
      architectureTitle: 'Spécifications Techniques & Pile Logicielle',
      architectureLead: 'Voici les composants logiciels réels qui constituent cette application.',
      specs: [
        {
          label: 'Framework Frontend & UI',
          value: 'React 18.3.1 + TypeScript 5.5 + Tailwind CSS 3.4',
          detail: 'Interface utilisateur modulaire et typée utilisant les icônes Lucide React et un design responsive.',
        },
        {
          label: 'Serveur & Pré-rendu SEO/AIO',
          value: 'Node.js + Express',
          detail: 'Génère du HTML sémantique pré-rendu pour les routes publiques localisées (/it/, /en/, /de/, /fr/), le fichier sitemap.xml, robots.txt et les en-têtes X-Robots-Tag noindex pour /admin.',
        },
        {
          label: 'Persistance des Données Utilisateur',
          value: 'Web Storage API (localStorage)',
          detail: 'Les projets (clé ai-app-builder:projects) et les paramètres (clé ai-app-builder:settings) sont stockés exclusivement dans le navigateur de l\'utilisateur.',
        },
        {
          label: 'Isolation de l\'Aperçu',
          value: 'Iframe HTML5 avec Sandbox + CSP',
          detail: 'L\'aperçu est exécuté dans un élément iframe à origine opaque (sandbox="allow-scripts", sans allow-same-origin), CSP stricte et largeurs sélectionnables (100 %, 768px, 375px).',
        },
      ],
      capabilitiesTitle: 'État d\'Implémentation des Fonctionnalités (Transparence Technique)',
      capabilities: [
        {
          title: 'Création, modification et suppression de projets',
          status: 'Actif et complet',
          description: 'Validation du nom (2 à 60 caractères) et de la description (10 à 2 000 caractères), avec des suggestions d\'exemples prédéfinis.',
        },
        {
          title: 'Gestion de l\'historique des instructions',
          status: 'Actif et complet',
          description: 'Ajout d\'instructions textuelles jusqu\'à 1 000 caractères chacune, sauvegarde immédiate dans localStorage et raccourci clavier Ctrl+Entrée / Cmd+Entrée.',
        },
        {
          title: 'Exportation du fichier de projet (.txt)',
          status: 'Actif et complet',
          description: 'Génération côté client via l\'API Blob d\'un fichier texte regroupant métadonnées, description, liste numérotée et horodatée des instructions et code source HTML.',
        },
        {
          title: 'Génération IA & Proxy Backend',
          status: 'Simulation locale (Requiert un proxy backend pour les appels API en direct)',
          description: 'L\'éditeur vérifie la configuration des identifiants IA et simule le cycle d\'état "generating" -> "generated". Comme indiqué dans le code source, les appels directs aux API externes nécessitent la connexion d\'un proxy backend.',
        },
        {
          title: 'Configuration des Identifiants GitHub',
          status: 'Interface de stockage local prête',
          description: 'Permet d\'enregistrer dans localStorage le nom d\'utilisateur et le jeton d\'accès personnel GitHub (avec lien direct pour créer un token avec la permission repo).',
        },
      ],
      securityPrivacyTitle: 'Sécurité, Confidentialité et Séparation des Espaces',
      securityPrivacyPoints: [
        'Aucune clé API ni aucun jeton GitHub n\'est transmis à des serveurs externes ou exposé sur les pages publiques indexables.',
        'Le tableau de bord du propriétaire/administrateur (/admin) est maintenu exclusivement en italien et protégé contre l\'indexation via meta robots "noindex, nofollow" et l\'en-tête HTTP X-Robots-Tag.',
        'L\'accès à l\'espace d\'administration est protégé par une vérification de session côté serveur via cookie HttpOnly.',
      ],
      referencesTitle: 'Sources Techniques et Standards Utilisés',
      references: [
        {
          label: 'Google Search Central — Versions localisées et hreflang',
          url: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
          description: 'Directives officielles pour l\'implémentation des balises réciproques rel="alternate" hreflang et x-default.',
        },
        {
          label: 'Schema.org — SoftwareApplication & FAQPage',
          url: 'https://schema.org/SoftwareApplication',
          description: 'Vocabulaire standard utilisé pour les données structurées JSON-LD intégrées aux pages publiques.',
        },
        {
          label: 'MDN Web Docs — Window.localStorage',
          url: 'https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage',
          description: 'Spécification technique du mécanisme de stockage local utilisé par AI App Builder.',
        },
      ],
    },
    useCases: {
      introTitle: 'À qui s\'adresse AI App Builder et scénarios d\'utilisation',
      introBody: 'AI App Builder s\'adresse aux développeurs, web designers, consultants numériques et équipes produit souhaitant formaliser des spécifications structurées et tester des prototypes HTML responsives.',
      items: [
        {
          id: 'website',
          title: 'Sites Web Informatifs et d\'Entreprise',
          targetAudience: 'Petites entreprises, cabinets professionnels, commerces locaux',
          problemSolved: 'Structurer rapidement l\'architecture de l\'information (présentation, services, horaires, réservations) sans partir d\'une page blanche.',
          howItWorks: 'Sélectionnez la catégorie "Site Web", saisissez la description de l\'activité (ex. restaurant avec menu et réservations) et affinez les sections par instructions successives.',
          examplePrompt: 'Un site web pour un restaurant avec menu dégustation, tableau des horaires d\'ouverture et formulaire de réservation.',
          projectType: 'Site Web (website)',
        },
        {
          id: 'landing-page',
          title: 'Landing Pages Promotionnelles et de Cours en Ligne',
          targetAudience: 'Formateurs, spécialistes du marketing, créateurs de produits numériques',
          problemSolved: 'Tester la hiérarchie visuelle des titres, du programme de formation et du formulaire d\'inscription sur mobile et ordinateur.',
          howItWorks: 'Choisissez "Landing Page", définissez la proposition de valeur et vérifiez la lisibilité dans le simulateur Mobile (375px).',
          examplePrompt: 'Une landing page pour un cours de programmation en ligne avec programme détaillé, biographie du formateur et formulaire d\'inscription.',
          projectType: 'Landing Page (landing-page)',
        },
        {
          id: 'dashboard',
          title: 'Tableaux de Bord Analytiques (Dashboards)',
          targetAudience: 'Chefs de produit, développeurs frontend, analystes de données',
          problemSolved: 'Valider avec l\'équipe les indicateurs clés (KPI), tableaux et filtres à afficher avant de connecter la base de données.',
          howItWorks: 'Sélectionnez "Dashboard", listez les métriques à suivre et utilisez l\'onglet Code pour inspecter ou exporter la structure HTML.',
          examplePrompt: 'Un tableau de bord de suivi des ventes e-commerce avec récapitulatif des commandes quotidiennes, retours et meilleurs produits.',
          projectType: 'Dashboard (dashboard)',
        },
        {
          id: 'portfolio-ecommerce-blog',
          title: 'Portfolios Créatifs, E-commerce et Blogs',
          targetAudience: 'Photographes, designers, commerçants, équipes éditoriales',
          problemSolved: 'Organiser des galeries d\'images, des fiches produits ou des mises en page d\'articles tout en conservant l\'historique complet des révisions.',
          howItWorks: 'Choisissez "Portfolio", "E-commerce" ou "Blog", ajoutez des instructions numérotées pour chaque ajustement et exportez le récapitulatif en .txt.',
          examplePrompt: 'Un portfolio pour un photographe avec galerie d\'images filtrable par catégorie et section biographique.',
          projectType: 'Portfolio / E-commerce / Blog',
        },
      ],
      comparisonTitle: 'Comparaison Objective des Approches de Prototypage',
      comparisonSubtitle: 'Évaluation basée sur les caractéristiques réelles d\'AI App Builder par rapport au développement manuel dans un IDE et aux constructeurs de pages visuels classiques.',
      comparisonHeaders: {
        criterion: 'Critère Technique',
        aiAppBuilder: 'AI App Builder',
        traditionalCoding: 'Codage Manuel (IDE)',
        staticPageBuilders: 'Constructeurs Visuels SaaS',
      },
      comparisonRows: [
        {
          criterion: 'Mode de saisie principal',
          aiAppBuilder: 'Description textuelle structurée + journal numéroté d\'instructions',
          traditionalCoding: 'Écriture manuelle du code source (HTML/CSS/TS)',
          staticPageBuilders: 'Glisser-déposer manuel de blocs prédéfinis (Drag & Drop)',
        },
        {
          criterion: 'Choix des modèles d\'IA',
          aiAppBuilder: 'Libre choix du fournisseur avec sa propre clé (OpenAI, Anthropic, Groq, Custom)',
          traditionalCoding: 'Dépend d\'extensions externes de l\'éditeur',
          staticPageBuilders: 'Lié au modèle propriétaire de la plateforme',
        },
        {
          criterion: 'Stockage des données de projet',
          aiAppBuilder: '100 % local dans le navigateur (localStorage) + exportation en fichier .txt',
          traditionalCoding: 'Système de fichiers local et dépôts Git',
          staticPageBuilders: 'Cloud propriétaire nécessitant un abonnement mensuel',
        },
        {
          criterion: 'Test responsive intégré',
          aiAppBuilder: 'Sélecteur instantané : Bureau (100 %), Tablette (768px), Mobile (375px)',
          traditionalCoding: 'Nécessite l\'ouverture des outils de développement du navigateur',
          staticPageBuilders: 'Inclus dans l\'éditeur visuel',
        },
        {
          criterion: 'Séparation linguistique site public / admin',
          aiAppBuilder: 'Site public en 4 langues (IT, EN, DE, FR) ; Tableau de bord admin exclusivement en italien',
          traditionalCoding: 'Doit être programmé manuellement de bout en bout',
          staticPageBuilders: 'Souvent couplé ou nécessite des extensions payantes',
        },
      ],
    },
    faq: {
      intro: 'Cette section rassemble des réponses directes, vérifiables dans le code source, aux questions les plus fréquentes concernant AI App Builder.',
      items: [
        {
          category: 'Produit & Fonctionnement',
          question: 'Qu\'est-ce qu\'AI App Builder exactement ?',
          answer: 'AI App Builder est une application web permettant de définir, gérer et prototyper des projets d\'applications et de sites web à l\'aide d\'instructions textuelles. Elle comprend un tableau de bord de projets, un éditeur avec historique des instructions, un simulateur d\'aperçu HTML multi-appareils et un outil d\'exportation.',
        },
        {
          category: 'Langues & Administration',
          question: 'Dans quelles langues le site public et le tableau de bord administrateur sont-ils disponibles ?',
          answer: 'Le site public d\'information prend en charge quatre langues avec des chemins d\'URL dédiés : italien (/it/), anglais (/en/), allemand (/de/) et français (/fr/). En revanche, le tableau de bord du propriétaire/administrateur (/admin) est conçu exclusivement en italien, ne change jamais de langue automatiquement et reste totalement indépendant de la langue choisie sur le site public.',
        },
        {
          category: 'Modèles d\'IA & Fournisseurs',
          question: 'Quels fournisseurs et modèles d\'intelligence artificielle peuvent être configurés ?',
          answer: 'Dans le panneau Paramètres, quatre options sont configurables : OpenAI (gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo), Anthropic Claude (claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229), Groq (llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768) ou un point de terminaison API personnalisé.',
        },
        {
          category: 'Confidentialité & Sécurité',
          question: 'Où mes projets et mes clés API sont-ils enregistrés ?',
          answer: 'Tous les projets créés et les clés API saisies sont enregistrés localement dans votre navigateur via localStorage (clés "ai-app-builder:projects" et "ai-app-builder:settings"). Aucune clé API n\'est publiée sur les pages indexables ni transmise à des serveurs tiers non autorisés.',
        },
        {
          category: 'Périmètre Technique',
          question: 'La génération IA en direct et l\'exportation GitHub sont-elles déjà reliées à un backend externe ?',
          answer: 'La création de projets, l\'historique des instructions, l\'aperçu responsive dans l\'iframe et l\'exportation en fichier texte (.txt) sont pleinement opérationnels. Le bouton de génération IA exécute actuellement une simulation locale du cycle d\'état et nécessite la connexion d\'un proxy backend pour effectuer des appels API en direct ; de même, le module GitHub sauvegarde localement votre nom d\'utilisateur et votre jeton en vue de la synchronisation des dépôts.',
        },
        {
          category: 'SEO, Crawlers & Indexation',
          question: 'Les espaces privés et l\'éditeur sont-ils indexés par les moteurs de recherche ou les crawlers d\'IA ?',
          answer: 'Non. Seules les pages publiques localisées (/it/, /en/, /de/, /fr/) sont indexables et répertoriées dans le sitemap XML. L\'espace d\'administration et l\'éditeur (/admin) sont protégés par authentification, exclus du sitemap et servis avec l\'en-tête X-Robots-Tag: noindex, nofollow.',
        },
      ],
    },
    footer: {
      productIdentity: 'AI App Builder — Plateforme web de prototypage structuré d\'applications par instructions textuelles.',
      repositoryLabel: 'Dépôt GitHub de référence : akybel2014-creator/ai-app-builder',
      repositoryUrl: 'https://github.com/akybel2014-creator/ai-app-builder',
      legalNoticeTitle: 'Informations sur le Projet & Transparence',
      legalNoticeText: 'Projet logiciel open-source importé depuis GitHub (auteur/dépôt : akybel2014-creator/ai-app-builder). Aucun tarif commercial ni abonnement payant n\'est facturé par cette interface.',
      crawlerPolicyTitle: 'Politique relative aux Crawlers de Recherche et d\'IA',
      crawlerPolicyText: 'Les robots d\'indexation standards et les agents utilisateurs d\'IA sont autorisés sur les pages publiques localisées (/it/, /en/, /de/, /fr/) conformément à /robots.txt. L\'espace administrateur (/admin) est restreint et non indexable.',
      navigationTitle: 'Pages Publiques',
      languagesTitle: 'Versions Linguistiques',
      adminNotice: 'Le Tableau de Bord Administrateur est disponible exclusivement en italien.',
    },
  },
};
