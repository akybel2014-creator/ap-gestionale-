import { useState, useMemo, useEffect } from 'react';
import type { AppSettings, AIProvider } from '@/types';
import { AI_PROVIDERS } from '@/lib/constants';
import {
  auth,
  signInWithGoogleCloud,
  signOutCloud,
  isCloudIdentityVerifiedForAppUser,
} from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import {
  Zap,
  Github,
  Check,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  Cpu,
  Link,
  Shield,
  Info,
  Save,
  Keyboard,
  Search,
  X,
  Compass,
  Monitor,
  Sparkles,
  Sliders,
  Cloud,
  LogOut,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  isAdminContext?: boolean;
  activeUserId?: string;
  activeUserEmail?: string | null;
  onUpdateAI: (updates: Partial<AppSettings['ai']>) => void;
  onUpdateGitHub: (updates: Partial<AppSettings['github']>) => void;
}

type SettingsTab = 'integrations' | 'shortcuts' | 'all';
type ShortcutCategoryFilter = 'ALL' | 'navigation' | 'editor' | 'dashboard';

interface ShortcutCheatSheetItem {
  id: string;
  category: 'navigation' | 'editor' | 'dashboard';
  categoryLabel: string;
  keys: string[];
  action: string;
  description: string;
  context: string;
}

const KEYBOARD_SHORTCUTS_LIST: ShortcutCheatSheetItem[] = [
  // Navigation Shortcuts
  {
    id: 'nav-dashboard',
    category: 'navigation',
    categoryLabel: 'Navigazione',
    keys: ['Alt', '1'],
    action: 'Vai alla Dashboard Progetti',
    description: 'Passa immediatamente alla griglia principale dei progetti creati.',
    context: 'Globale (Workspace / Admin)',
  },
  {
    id: 'nav-editor',
    category: 'navigation',
    categoryLabel: 'Navigazione',
    keys: ['Alt', '2'],
    action: 'Apri la vista Editor',
    description: 'Passa rapidamente all\'editor interattivo del progetto attivo.',
    context: 'Globale (Workspace / Admin)',
  },
  {
    id: 'nav-settings',
    category: 'navigation',
    categoryLabel: 'Navigazione',
    keys: ['Alt', '3'],
    action: 'Apri le Impostazioni',
    description: 'Accede alla configurazione di Provider IA, GitHub, Aspetto e Scorciatoie.',
    context: 'Globale (Workspace / Admin)',
  },
  {
    id: 'nav-shortcuts-help',
    category: 'navigation',
    categoryLabel: 'Navigazione',
    keys: ['?'],
    action: 'Guida rapida Scorciatoie',
    description: 'Apre o chiude la finestra modale delle scorciatoie da tastiera (fuori dai campi di testo).',
    context: 'Globale',
  },
  {
    id: 'nav-escape',
    category: 'navigation',
    categoryLabel: 'Navigazione',
    keys: ['Esc'],
    action: 'Chiudi finestra modale o dialogo',
    description: 'Chiude la finestra di dialogo attiva (Nuovo Progetto, Conferma Esportazione, Scorciatoie).',
    context: 'Finestre Modali / Editor',
  },
  // Dashboard Shortcuts
  {
    id: 'dash-new-project',
    category: 'dashboard',
    categoryLabel: 'Dashboard',
    keys: ['Alt', 'N'],
    action: 'Crea nuovo progetto',
    description: 'Apre la finestra modale di creazione rapida di una nuova applicazione.',
    context: 'Dashboard Progetti',
  },
  // Editor Shortcuts
  {
    id: 'editor-send-prompt',
    category: 'editor',
    categoryLabel: 'Editor',
    keys: ['Ctrl / ⌘', 'Invio'],
    action: 'Invia istruzione all\'IA',
    description: 'Registra e invia il prompt inserito nella casella di testo della Cronologia attività.',
    context: 'Editor (Campo istruzioni)',
  },
  {
    id: 'editor-generate',
    category: 'editor',
    categoryLabel: 'Editor',
    keys: ['Alt', 'G'],
    action: 'Genera / Rigenera Anteprima IA',
    description: 'Avvia la generazione del codice applicativo basata sulle istruzioni del progetto.',
    context: 'Editor Progetto',
  },
  {
    id: 'editor-toggle-tab',
    category: 'editor',
    categoryLabel: 'Editor',
    keys: ['Alt', 'P'],
    action: 'Commuta Anteprima / Codice',
    description: 'Alterna la vista del pannello destro tra l\'anteprima live e il codice sorgente HTML.',
    context: 'Editor Progetto',
  },
  {
    id: 'editor-cycle-device',
    category: 'editor',
    categoryLabel: 'Editor',
    keys: ['Alt', 'D'],
    action: 'Cambia dispositivo viewport',
    description: 'Ruota ciclicamente il formato dell\'anteprima tra Desktop (100%), Tablet (768px) e Mobile (375px).',
    context: 'Editor Progetto',
  },
  {
    id: 'editor-reload-preview',
    category: 'editor',
    categoryLabel: 'Editor',
    keys: ['Alt', 'R'],
    action: 'Ricarica anteprima live',
    description: 'Aggiorna e ricarica da zero il frame dell\'anteprima HTML del progetto.',
    context: 'Editor Progetto',
  },
  {
    id: 'editor-export-project',
    category: 'editor',
    categoryLabel: 'Editor',
    keys: ['Alt', 'E'],
    action: 'Esporta progetto (Export Project)',
    description: 'Apre il dialogo di conferma per esportare il pacchetto del progetto e registrare la versione nel log.',
    context: 'Editor Progetto',
  },
];

export default function SettingsView({
  settings,
  isAdminContext = false,
  activeUserId = 'anonymous',
  activeUserEmail = null,
  onUpdateAI,
  onUpdateGitHub,
}: SettingsViewProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [savedSection, setSavedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('all');
  const [shortcutQuery, setShortcutQuery] = useState('');
  const [shortcutCategory, setShortcutCategory] = useState<ShortcutCategoryFilter>('ALL');
  const [cloudUser, setCloudUser] = useState<FirebaseUser | null>(null);
  const [cloudAuthBusy, setCloudAuthBusy] = useState(false);
  const [verifyingConnection, setVerifyingConnection] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    ok: boolean;
    message: string;
    errorCode?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setCloudUser(u);
    });
    return () => unsub();
  }, []);

  const availableProviders = useMemo(
    () => (isAdminContext ? AI_PROVIDERS : AI_PROVIDERS.filter((p) => p.id !== 'managed')),
    [isAdminContext],
  );

  const aiConfigured = Boolean(
    (isAdminContext && settings.ai.provider === 'managed') ||
      (settings.ai.provider && settings.ai.provider !== 'managed' && settings.ai.apiKey),
  );
  const cloudIdentityVerified = useMemo(
    () => (cloudUser ? isCloudIdentityVerifiedForAppUser(activeUserId, activeUserEmail) : false),
    [cloudUser, activeUserId, activeUserEmail],
  );

  const handleSaveAI = () => {
    setSavedSection('ai');
    setTimeout(() => setSavedSection(null), 2500);
  };

  const handleVerifyConnection = async () => {
    if (verifyingConnection) return;
    setVerifyingConnection(true);
    setVerificationStatus(null);
    try {
      const res = await fetch('/api/ai/verify-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          aiSettings: settings.ai,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        errorCode?: string;
      };
      if (res.ok && data.ok) {
        setVerificationStatus({
          ok: true,
          message: data.message || 'Connessione al provider IA verificata con successo.',
        });
      } else {
        setVerificationStatus({
          ok: false,
          errorCode: data.errorCode,
          message: data.error || 'Impossibile verificare la connessione con il provider selezionato.',
        });
      }
    } catch {
      setVerificationStatus({
        ok: false,
        message: 'Errore di rete durante la verifica della connessione al server.',
      });
    } finally {
      setVerifyingConnection(false);
    }
  };

  const handleSaveGitHub = () => {
    setSavedSection('github');
    setTimeout(() => setSavedSection(null), 2500);
  };

  const handleProviderChange = (provider: AIProvider) => {
    const providerInfo = AI_PROVIDERS.find((p) => p.id === provider);
    setVerificationStatus(null);
    onUpdateAI({
      provider,
      model: providerInfo && providerInfo.models.length > 0 ? providerInfo.models[0] : '',
      endpoint: providerInfo ? providerInfo.defaultEndpoint : '',
    });
  };

  const currentProvider = AI_PROVIDERS.find((p) => p.id === settings.ai.provider);

  const filteredShortcuts = useMemo(() => {
    const q = shortcutQuery.trim().toLowerCase();
    return KEYBOARD_SHORTCUTS_LIST.filter((item) => {
      if (shortcutCategory !== 'ALL' && item.category !== shortcutCategory) {
        return false;
      }
      if (!q) return true;
      const keysText = item.keys.join(' + ').toLowerCase();
      return (
        item.action.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        item.context.toLowerCase().includes(q) ||
        keysText.includes(q)
      );
    });
  }, [shortcutQuery, shortcutCategory]);

  const shortcutCounts = useMemo(() => {
    return {
      ALL: KEYBOARD_SHORTCUTS_LIST.length,
      navigation: KEYBOARD_SHORTCUTS_LIST.filter((s) => s.category === 'navigation').length,
      editor: KEYBOARD_SHORTCUTS_LIST.filter((s) => s.category === 'editor').length,
      dashboard: KEYBOARD_SHORTCUTS_LIST.filter((s) => s.category === 'dashboard').length,
    };
  }, []);

  const showIntegrations = activeTab === 'all' || activeTab === 'integrations';
  const showShortcuts = activeTab === 'all' || activeTab === 'shortcuts';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 pb-24 lg:pb-10">
      <div className="mb-6 animate-fade-in flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Impostazioni</h1>
          <p className="text-surface-400 text-sm sm:text-base mt-2">
            Configura le integrazioni IA, GitHub e consulta il prontuario delle scorciatoie da tastiera.
          </p>
        </div>

        {/* Sub-page switcher within Settings view */}
        <div
          className="inline-flex items-center p-1 rounded-xl bg-surface-900/90 border border-surface-800/80 self-start sm:self-auto"
          role="tablist"
          aria-label="Sezioni impostazioni"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Tutte
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'integrations'}
            onClick={() => setActiveTab('integrations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'integrations'
                ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Integrazioni
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shortcuts'}
            onClick={() => setActiveTab('shortcuts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'shortcuts'
                ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Scorciatoie da tastiera
          </button>
        </div>
      </div>

      {showIntegrations && (
        <>
          {/* AI Configuration */}
          <section className="mb-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 border border-accent-500/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-accent-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">Modello IA</h2>
                <p className="text-sm text-surface-500">
                  Configura il provider per generare applicazioni
                </p>
              </div>
              {aiConfigured ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10">
                  <Check className="w-3.5 h-3.5" />
                  Configurato
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Richiede configurazione
                </span>
              )}
            </div>

            <div className="glass border border-surface-800/60 rounded-2xl p-5 space-y-5">
              {/* Guided configuration steps */}
              <div className="p-4 rounded-xl bg-surface-900/70 border border-surface-800/80 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-400">
                  Configurazione guidata in 3 passaggi
                </p>
                <ol className="text-xs text-surface-300 space-y-1 list-decimal pl-4 leading-relaxed">
                  <li>
                    <strong>Seleziona un provider supportato</strong> (Google Gemini, OpenAI, Anthropic Claude, Groq o Endpoint personalizzato).
                  </li>
                  <li>
                    <strong>Scegli il modello e inserisci la tua chiave API personale (BYOK)</strong>. Per sicurezza, la chiave viene mantenuta solo in memoria durante la sessione attiva e cancellata automaticamente al logout (non viene mai salvata in <code className="font-mono">localStorage</code>).
                  </li>
                  <li>
                    <strong>Clicca su &ldquo;Verifica connessione&rdquo;</strong> per testare in tempo reale che provider, modello e chiave rispondano correttamente prima di avviare la generazione nell&apos;Editor.
                  </li>
                </ol>
              </div>

              {/* Provider selection */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2.5">
                  <Cpu className="w-4 h-4 inline mr-1.5 text-surface-500" />
                  Provider
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {availableProviders.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProviderChange(p.id)}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        settings.ai.provider === p.id
                          ? 'border-accent-500/50 bg-accent-500/10 text-accent-300'
                          : 'border-surface-800 bg-surface-800/30 text-surface-400 hover:border-surface-700'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {settings.ai.provider === 'managed' && !isAdminContext && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-200">
                      Proxy Backend Gestito riservato agli amministratori
                    </p>
                    <p className="text-xs text-amber-300/80 leading-relaxed">
                      La generazione IA gestita dal server è disabilitata per gli account cliente finché non saranno configurati i limiti di quota e la fatturazione. Seleziona un provider qui sopra e inserisci la tua chiave API personale (BYOK).
                    </p>
                  </div>
                </div>
              )}

              {settings.ai.provider === 'managed' && isAdminContext && (
                <>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-emerald-200">
                        Proxy Backend Gestito attivo (Solo Amministratore autorizzato)
                      </p>
                      <p className="text-xs text-emerald-300/80 leading-relaxed">
                        Le richieste di generazione vengono instradate attraverso il proxy backend sicuro{' '}
                        <code className="font-mono text-emerald-200">/api/ai/generate</code> con rate limiting e limiti di input server-side.
                      </p>
                    </div>
                  </div>

                  {/* Model */}
                  {currentProvider && currentProvider.models.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Modello IA gestito
                      </label>
                      <select
                        value={settings.ai.model || currentProvider.models[0]}
                        onChange={(e) => {
                          setVerificationStatus(null);
                          onUpdateAI({ model: e.target.value });
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm focus:outline-none focus:border-accent-500/50 transition-colors cursor-pointer"
                      >
                        {currentProvider.models.map((m) => (
                          <option key={m} value={m} className="bg-surface-900">
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {verificationStatus && (
                    <div
                      role="status"
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        verificationStatus.ok
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-red-500/10 border-red-500/30 text-red-200'
                      }`}
                    >
                      {verificationStatus.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{verificationStatus.message}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {savedSection === 'ai' ? (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-400 animate-fade-in">
                        <Check className="w-4 h-4" />
                        Impostazioni salvate
                      </span>
                    ) : (
                      <p className="text-xs text-surface-500">
                        Endpoint proxy attivo: <code className="font-mono text-accent-300">/api/ai/generate</code>
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyConnection}
                        disabled={verifyingConnection}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-800 border border-surface-700 text-surface-200 hover:text-white hover:border-accent-500/40 transition-colors disabled:opacity-50"
                      >
                        {verifyingConnection ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
                        ) : (
                          <Zap className="w-4 h-4 text-accent-400" />
                        )}
                        <span>Verifica connessione</span>
                      </button>
                      <button
                        onClick={handleSaveAI}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Salva
                      </button>
                    </div>
                  </div>
                </>
              )}

              {settings.ai.provider && settings.ai.provider !== 'managed' && (
                <>
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      <Key className="w-4 h-4 inline mr-1.5 text-surface-500" />
                      Chiave API (Solo in memoria per questa sessione)
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={settings.ai.apiKey}
                        onChange={(e) => {
                          setVerificationStatus(null);
                          onUpdateAI({ apiKey: e.target.value });
                        }}
                        placeholder="Inserisci la tua chiave API personale (BYOK)"
                        className="w-full px-4 py-3 pr-11 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-accent-500/50 transition-colors font-mono"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                        aria-label={showApiKey ? 'Nascondi chiave' : 'Mostra chiave'}
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {currentProvider && currentProvider.docsUrl && (
                      <a
                        href={currentProvider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-accent-400 hover:text-accent-300 mt-2 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ottieni una chiave API da {currentProvider.name}
                      </a>
                    )}
                  </div>

                  {/* Model */}
                  {currentProvider && currentProvider.models.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Modello
                      </label>
                      <select
                        value={settings.ai.model || currentProvider.models[0]}
                        onChange={(e) => {
                          setVerificationStatus(null);
                          onUpdateAI({ model: e.target.value });
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm focus:outline-none focus:border-accent-500/50 transition-colors cursor-pointer"
                      >
                        {currentProvider.models.map((m) => (
                          <option key={m} value={m} className="bg-surface-900">
                            {m}
                          </option>
                        ))}
                      </select>
                      {settings.ai.provider === 'gemini' && (
                        <p className="text-xs text-surface-400 mt-1.5">
                          <code className="font-mono text-accent-300">gemini-flash-latest</code> e{' '}
                          <code className="font-mono text-accent-300">gemini-3.8-flash</code> sono compatibili con il livello gratuito di Google AI Studio tramite l&apos;SDK ufficiale <code className="font-mono">@google/genai</code> (<code className="font-mono">ai.models.generateContent</code>).
                        </p>
                      )}
                    </div>
                  )}

                  {/* Custom model input */}
                  {settings.ai.provider === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-surface-300 mb-2">
                        Nome modello
                      </label>
                      <input
                        type="text"
                        value={settings.ai.model}
                        onChange={(e) => {
                          setVerificationStatus(null);
                          onUpdateAI({ model: e.target.value });
                        }}
                        placeholder="es. mio-modello-personalizzato"
                        className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-accent-500/50 transition-colors"
                      />
                    </div>
                  )}

                  {/* Endpoint */}
                  <div>
                    <label className="block text-sm font-medium text-surface-300 mb-2">
                      <Link className="w-4 h-4 inline mr-1.5 text-surface-500" />
                      Endpoint API
                    </label>
                    <input
                      type="text"
                      value={settings.ai.endpoint}
                      onChange={(e) => {
                        setVerificationStatus(null);
                        onUpdateAI({ endpoint: e.target.value });
                      }}
                      placeholder={
                        settings.ai.provider === 'gemini'
                          ? 'https://generativelanguage.googleapis.com'
                          : 'https://api.example.com/v1/chat/completions'
                      }
                      className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-accent-500/50 transition-colors font-mono"
                    />
                  </div>

                  {verificationStatus && (
                    <div
                      role="status"
                      className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                        verificationStatus.ok
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-red-500/10 border-red-500/30 text-red-200'
                      }`}
                    >
                      {verificationStatus.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{verificationStatus.message}</span>
                    </div>
                  )}

                  {/* Save & Verify buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    {savedSection === 'ai' ? (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-400 animate-fade-in">
                        <Check className="w-4 h-4" />
                        Impostazioni applicate per la sessione corrente
                      </span>
                    ) : (
                      <p className="text-xs text-surface-500">
                        Provider e modello sono salvati; la chiave API resta solo in memoria e viene rimossa al logout.
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleVerifyConnection}
                        disabled={verifyingConnection}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-800 border border-surface-700 text-surface-200 hover:text-white hover:border-accent-500/40 transition-colors disabled:opacity-50"
                      >
                        {verifyingConnection ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent-400" />
                        ) : (
                          <Zap className="w-4 h-4 text-accent-400" />
                        )}
                        <span>Verifica connessione</span>
                      </button>
                      <button
                        onClick={handleSaveAI}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-500/20 text-accent-300 hover:bg-accent-500/30 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Salva
                      </button>
                    </div>
                  </div>
                </>
              )}

              {!settings.ai.provider && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-800/40">
                  <Info className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-surface-400 leading-relaxed">
                    Seleziona un provider IA (Google Gemini, OpenAI, Anthropic, Groq o Endpoint personalizzato) e inserisci la tua chiave API personale (BYOK) per generare le tue applicazioni.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Cloud Database Synchronization (Firebase Firestore) */}
          <section className="mb-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">
                  Database Cloud & Sincronizzazione (Firebase Firestore)
                </h2>
                <p className="text-sm text-surface-500">
                  Sincronizzazione opzionale su database cloud previa verifica dell&apos;identità
                </p>
              </div>
              {cloudIdentityVerified ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10">
                  <Check className="w-3.5 h-3.5" />
                  Identità Cloud Verificata
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-medium text-surface-400 px-2.5 py-1 rounded-full bg-surface-800/80">
                  <Shield className="w-3.5 h-3.5" />
                  Isolamento Account Attivo
                </span>
              )}
            </div>

            <div className="glass border border-surface-800/60 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-800/40 border border-surface-700/50">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    {cloudUser
                      ? cloudIdentityVerified
                        ? `Sincronizzato con Google Cloud (${cloudUser.email})`
                        : `Account Google (${cloudUser.email}) non corrisponde all'account corrente`
                      : 'Sincronizzazione Cloud Firestore disattivata (Richiede verifica identità)'}
                  </p>
                  <p className="text-xs text-surface-400 leading-relaxed">
                    {cloudUser && !cloudIdentityVerified
                      ? 'Per impedire la sincronizzazione incrociata tra account diversi, i dati su Firestore vengono sincronizzati solo quando l\'email verificata di Google coincide con l\'account autenticato nell\'applicazione.'
                      : 'I progetti e la Cronologia attività vengono sincronizzati su Cloud Firestore solo quando l\'identità Google verificata corrisponde all\'utente attivo, senza mai sovrascrivere modifiche locali più recenti.'}
                  </p>
                </div>
                {cloudUser ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setCloudAuthBusy(true);
                      try {
                        await signOutCloud();
                      } finally {
                        setCloudAuthBusy(false);
                      }
                    }}
                    disabled={cloudAuthBusy}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition-colors flex-shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnetti Google</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      setCloudAuthBusy(true);
                      try {
                        await signInWithGoogleCloud();
                      } catch {
                        // Ignore popup cancellation
                      } finally {
                        setCloudAuthBusy(false);
                      }
                    }}
                    disabled={cloudAuthBusy}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex-shrink-0"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>Collega Account Google Cloud</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Security note */}
          <div className="mb-8 flex items-start gap-3 p-4 rounded-xl bg-surface-800/30 border border-surface-800/60 animate-fade-in">
            <Shield className="w-5 h-5 text-surface-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-surface-300">Sicurezza delle credenziali</p>
              <p className="text-sm text-surface-500 mt-1 leading-relaxed">
                Le chiavi API personali (BYOK) e i Personal Access Token di GitHub non vengono mai salvati in <code className="font-mono">localStorage</code>, non vengono stampati nei log e non vengono inclusi nelle esportazioni. La chiave BYOK rimane in memoria solo durante la sessione attiva e viene cancellata al logout.
              </p>
            </div>
          </div>

          {/* GitHub Configuration (Direct PAT storage disabled) */}
          <section className="mb-8 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-surface-700 to-surface-800 border border-surface-600/40 flex items-center justify-center">
                <Github className="w-5 h-5 text-surface-300" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white">GitHub</h2>
                <p className="text-sm text-surface-500">
                  Esportazione diretta su repository in attesa di configurazione OAuth per utente
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 px-2.5 py-1 rounded-full bg-amber-500/10">
                <AlertCircle className="w-3.5 h-3.5" />
                In attesa di OAuth
              </span>
            </div>

            <div className="glass border border-surface-800/60 rounded-2xl p-5 space-y-5">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-amber-200 leading-relaxed">
                  <p className="text-sm font-semibold text-amber-300">
                    Persistenza dei Personal Access Token disabilitata nel browser
                  </p>
                  <p>
                    Per garantire la sicurezza delle credenziali, i token di accesso personale GitHub sono stati rimossi da <code className="font-mono">localStorage</code> e dalla serializzazione delle impostazioni. L&apos;esportazione diretta su repository GitHub resta temporaneamente disabilitata finché non viene configurato un flusso OAuth GitHub individuale lato server.
                  </p>
                  <p className="text-surface-300">
                    L&apos;esportazione standard del progetto tramite file <code className="font-mono">.txt</code> con riferimento di versione è sempre disponibile nell&apos;editor e nella dashboard.
                  </p>
                </div>
              </div>

              {/* Optional non-sensitive GitHub username reference */}
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Nome utente GitHub (solo riferimento non sensibile)
                </label>
                <input
                  type="text"
                  value={settings.github.username}
                  onChange={(e) => onUpdateGitHub({ username: e.target.value, token: '' })}
                  placeholder="es. mario-rossi"
                  className="w-full px-4 py-3 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm placeholder:text-surface-600 focus:outline-none focus:border-accent-500/50 transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {savedSection === 'github' ? (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-400 animate-fade-in">
                    <Check className="w-4 h-4" />
                    Impostazioni aggiornate (nessun token salvato)
                  </span>
                ) : (
                  <p className="text-xs text-surface-500">
                    Nessun token segreto viene salvato nel browser.
                  </p>
                )}
                <button
                  onClick={handleSaveGitHub}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-800/60 border border-surface-700/40 text-surface-200 hover:text-white hover:border-surface-600 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Salva
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Searchable Keyboard Shortcuts Cheat Sheet */}
      {showShortcuts && (
        <section className="animate-slide-up" aria-labelledby="keyboard-shortcuts-heading">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 border border-accent-500/30 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-accent-400" />
            </div>
            <div className="flex-1">
              <h2 id="keyboard-shortcuts-heading" className="text-lg font-semibold text-white">
                Prontuario Scorciatoie da Tastiera (Keyboard Shortcuts)
              </h2>
              <p className="text-sm text-surface-500">
                Elenco ricercabile di tutte le scorciatoie attive per la navigazione, la dashboard e l&apos;editor
              </p>
            </div>
            <span className="text-xs font-mono text-surface-400 px-2.5 py-1 rounded-lg bg-surface-800/70 border border-surface-700/60">
              {filteredShortcuts.length} / {KEYBOARD_SHORTCUTS_LIST.length} attive
            </span>
          </div>

          <div className="glass border border-surface-800/60 rounded-2xl p-5 space-y-5">
            {/* Search input + Category filter pills */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-surface-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={shortcutQuery}
                  onChange={(e) => setShortcutQuery(e.target.value)}
                  placeholder="Cerca per tasto (es. Alt+E, Ctrl), azione o sezione..."
                  aria-label="Cerca scorciatoie da tastiera"
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/60 text-white text-sm placeholder:text-surface-500 focus:outline-none focus:border-accent-500/50 transition-colors"
                />
                {shortcutQuery && (
                  <button
                    type="button"
                    onClick={() => setShortcutQuery('')}
                    aria-label="Cancella ricerca scorciatoie"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div
                className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
                role="group"
                aria-label="Filtra per categoria di scorciatoia"
              >
                <button
                  type="button"
                  onClick={() => setShortcutCategory('ALL')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
                    shortcutCategory === 'ALL'
                      ? 'border-accent-500/50 bg-accent-500/15 text-accent-300'
                      : 'border-surface-800 bg-surface-800/40 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  Tutte ({shortcutCounts.ALL})
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutCategory('navigation')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
                    shortcutCategory === 'navigation'
                      ? 'border-accent-500/50 bg-accent-500/15 text-accent-300'
                      : 'border-surface-800 bg-surface-800/40 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  Navigazione ({shortcutCounts.navigation})
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutCategory('editor')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
                    shortcutCategory === 'editor'
                      ? 'border-accent-500/50 bg-accent-500/15 text-accent-300'
                      : 'border-surface-800 bg-surface-800/40 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  Editor ({shortcutCounts.editor})
                </button>
                <button
                  type="button"
                  onClick={() => setShortcutCategory('dashboard')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
                    shortcutCategory === 'dashboard'
                      ? 'border-accent-500/50 bg-accent-500/15 text-accent-300'
                      : 'border-surface-800 bg-surface-800/40 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Dashboard ({shortcutCounts.dashboard})
                </button>
              </div>
            </div>

            {/* Cheat sheet list */}
            {filteredShortcuts.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl border border-dashed border-surface-800 bg-surface-900/30">
                <Keyboard className="w-7 h-7 text-surface-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-surface-300">
                  Nessuna scorciatoia trovata per &ldquo;{shortcutQuery}&rdquo;
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  Prova a cercare un combinatore come <code className="text-accent-300">Alt</code>, <code className="text-accent-300">Invio</code> o azzera i filtri.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-surface-800/60 rounded-xl border border-surface-800/80 bg-surface-900/40 overflow-hidden">
                {filteredShortcuts.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-800/30 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">{item.action}</span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            item.category === 'editor'
                              ? 'bg-accent-500/10 text-accent-300 border-accent-500/30'
                              : item.category === 'navigation'
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {item.categoryLabel}
                        </span>
                        <span className="text-[11px] text-surface-500">· {item.context}</span>
                      </div>
                      <p className="text-xs text-surface-400 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 self-start sm:self-center">
                      {item.keys.map((k, idx) => (
                        <span key={k} className="flex items-center gap-1.5">
                          <kbd className="px-2.5 py-1 text-xs font-mono font-semibold text-accent-300 bg-surface-800 border border-surface-700 rounded-lg shadow-inner">
                            {k}
                          </kbd>
                          {idx < item.keys.length - 1 && (
                            <span className="text-xs text-surface-500 font-semibold">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-surface-500 pt-1">
              <span>
                Suggerimento: premi{' '}
                <kbd className="px-1.5 py-0.5 font-mono bg-surface-800 border border-surface-700 rounded text-surface-300">
                  ?
                </kbd>{' '}
                in qualsiasi vista per aprire la finestra rapida delle scorciatoie.
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

