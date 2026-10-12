import React from 'react';
import {
  BellRing,
  X,
  ArrowRight,
  AlertTriangle,
  Wrench,
  MapPin,
} from 'lucide-react';
import type { NotificaPushLocalePayload } from '@/lib/notifichePushLocali';

interface BannerPushCantiereProps {
  notificheAttive: NotificaPushLocalePayload[];
  onChiudiNotifica: (id: string) => void;
  onApriInterventoDaPush: (interventoId?: string) => void;
}

/**
 * Componente Banner Push Locale in stile iOS / Mobile Cantiere.
 * Appare in sovrimpressione in alto quando viene creato un nuovo intervento
 * o quando si verifica un cambio di stato urgente in Agenda/Dashboard.
 */
export default function BannerPushCantiere({
  notificheAttive,
  onChiudiNotifica,
  onApriInterventoDaPush,
}: BannerPushCantiereProps) {
  if (notificheAttive.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      className="fixed top-20 right-4 left-4 sm:left-auto sm:w-[410px] z-50 flex flex-col gap-2.5 pointer-events-none"
    >
      {notificheAttive.map((push) => {
        const isUrgenza = push.priorita === 'urgenza';
        return (
          <div
            key={push.id}
            role="alert"
            className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all animate-fade-in ${
              isUrgenza
                ? 'bg-[#1a2332]/95 border-[#ef4444] ring-2 ring-[#ef4444]/30'
                : 'bg-[#1a2332]/95 border-[#f59e0b] ring-2 ring-[#f59e0b]/25'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isUrgenza
                      ? 'bg-[#ef4444] text-white shadow-md shadow-[#ef4444]/30'
                      : 'bg-[#f59e0b] text-[#0f1720] shadow-md shadow-[#f59e0b]/30'
                  }`}
                >
                  {isUrgenza ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <BellRing className="w-5 h-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isUrgenza
                          ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40'
                          : 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/40'
                      }`}
                    >
                      {isUrgenza ? '🚨 PUSH URGENTE CANTIERE' : '📲 NOTIFICA PUSH TECNICO'}
                    </span>
                    <span className="text-[11px] font-mono text-[#94a3b8] tabular-nums">
                      {push.orario}
                    </span>
                  </div>

                  <h4 className="text-sm font-extrabold text-[#f1f5f9] mt-1 leading-snug">
                    {push.titolo}
                  </h4>

                  <p className="text-xs text-[#f1f5f9]/90 mt-1 leading-relaxed">
                    {push.messaggio}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[#94a3b8]">
                    {push.tecnicoDestinatario && (
                      <span className="inline-flex items-center gap-1 font-bold text-[#f59e0b]">
                        <Wrench className="w-3 h-3" />
                        <span>👷 Tecnico: {push.tecnicoDestinatario}</span>
                      </span>
                    )}
                    {push.indirizzo && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                        <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                        <span className="truncate">{push.indirizzo}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onChiudiNotifica(push.id)}
                className="p-1.5 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] shrink-0"
                aria-label="Chiudi notifica push"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {push.interventoId && (
              <div className="mt-3 pt-2.5 border-t border-[#2a3a4f] flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onApriInterventoDaPush(push.interventoId);
                    onChiudiNotifica(push.id);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0f1720] hover:bg-[#f59e0b] text-[#f59e0b] hover:text-[#0f1720] border border-[#f59e0b]/40 text-xs font-bold transition-colors"
                >
                  <span>Apri scheda intervento in Agenda</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
