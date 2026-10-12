import React, { useState, useEffect } from 'react';
import { Lock, Shield, ArrowLeft, KeyRound, AlertCircle, Loader2, LogOut } from 'lucide-react';

interface AdminAuthGateProps {
  children: (props: { onLogout: () => Promise<void> }) => React.ReactNode;
  onReturnToPublic: () => void;
}

export default function AdminAuthGate({ children, onReturnToPublic }: AdminAuthGateProps) {
  const [status, setStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminPasswordConfigured, setAdminPasswordConfigured] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setAdminPasswordConfigured(Boolean(data.customPasswordConfigured));
        setStatus(data.authenticated ? 'authenticated' : 'unauthenticated');
      })
      .catch(() => {
        if (!active) return;
        setAdminPasswordConfigured(false);
        setStatus('unauthenticated');
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setStatus('authenticated');
        setPassphrase('');
      } else {
        setError(data.error || 'Credenziali non valide. Riprova.');
      }
    } catch {
      setError('Impossibile contattare il server di autenticazione.');
    } finally {
      setSubmitting(false);
    };
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }
    setStatus('unauthenticated');
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950 text-surface-200">
        <div className="flex items-center gap-3 text-sm">
          <Loader2 className="w-5 h-5 text-accent-400 animate-spin" />
          <span>Verifica sessione amministratore...</span>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-surface-950 text-surface-100">
        <div className="w-full max-w-md glass-strong border border-surface-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="w-11 h-11 rounded-xl bg-accent-500/15 border border-accent-500/30 flex items-center justify-center">
              <Lock className="w-5 h-5 text-accent-400" />
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-surface-800 text-surface-300">
              noindex, nofollow • Solo Italiano
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">
              Accesso Proprietario / Amministratore
            </h1>
            <p className="text-sm text-surface-400 leading-relaxed">
              Questa area privata (Dashboard, Editor e Impostazioni) è riservata all&apos;amministratore,
              è protetta da sessione lato server ed è mantenuta esclusivamente in lingua italiana.
            </p>
          </div>

          {!adminPasswordConfigured && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Accesso amministrativo disabilitato per sicurezza</span>
              </p>
              <p>
                La variabile d&apos;ambiente <code className="font-mono">ADMIN_PASSWORD</code> non è
                configurata sul server (oppure usa un valore debole/predefinito non consentito).
                Configura una password sicura di almeno 8 caratteri sul server per abilitare l&apos;accesso.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-passphrase"
                className="block text-xs font-medium text-surface-300 mb-2"
              >
                <KeyRound className="w-3.5 h-3.5 inline mr-1.5 text-accent-400" />
                Chiave di accesso amministratore (ADMIN_PASSWORD)
              </label>
              <input
                id="admin-passphrase"
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={!adminPasswordConfigured}
                placeholder="Inserisci la password amministratore configurata sul server"
                className="w-full px-4 py-3 rounded-xl bg-surface-800/80 border border-surface-700 text-white text-sm placeholder:text-surface-500 focus:outline-none focus:border-accent-500 disabled:opacity-50"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !adminPasswordConfigured || !passphrase.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-surface-950 font-semibold text-sm hover:from-accent-400 hover:to-accent-500 transition-all glow-accent disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Autenticazione in corso...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Accedi alla Dashboard Amministratore</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-surface-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={onReturnToPublic}
              className="inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Torna al sito pubblico multilingue</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children({ onLogout: handleLogout })}</>;
}

export { LogOut };
