import React from 'react';
import {
  X,
  Phone,
  Navigation,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Wrench,
  Save,
  QrCode,
  Copy,
  Check,
  Smartphone,
  Download,
  ScanLine,
  Maximize2,
  Minimize2,
  Sun,
  ZoomIn,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  TECNICI_INIZIALI,
  formattaDataItaliana,
  formattaEuro,
  getSettimanaCorrente,
} from '@/data.js';
import { showToast } from '@/lib/toast';
import type { InterventoItem, PreventivoItem } from './HomeDashboard';
import type { ClienteItem } from './GestioneClienti';

// ============================================================================
// 1. MODALE DETTAGLIO COMPLETO INTERVENTO (con cambio stato, chiama, naviga, modifica, elimina)
// ============================================================================
interface ModaleDettaglioInterventoProps {
  intervento: InterventoItem | null;
  onChiudi: () => void;
  onCambiaStato: (id: string, nuovoStato: InterventoItem['stato']) => void;
  onModifica: (intervento: InterventoItem) => void;
  onElimina: (id: string) => void;
  onChiama: (telefono: string, nome: string) => void;
  onNaviga: (indirizzo: string, titolo: string) => void;
  onAggiornaRapidoDaQr?: (
    id: string,
    aggiornamenti: Partial<
      Pick<InterventoItem, 'stato' | 'noteTecniche' | 'durataOre'>
    >,
  ) => void;
}

export function ModaleDettaglioIntervento({
  intervento,
  onChiudi,
  onCambiaStato,
  onModifica,
  onElimina,
  onChiama,
  onNaviga,
  onAggiornaRapidoDaQr,
}: ModaleDettaglioInterventoProps) {
  const [linkCopiato, setLinkCopiato] = React.useState(false);
  const [notaRapidaCantiere, setNotaRapidaCantiere] = React.useState('');
  const [durataRapidaOre, setDurataRapidaOre] = React.useState('');
  const [modalitaMobileScan, setModalitaMobileScan] = React.useState(false);
  const [qrFullscreenAperta, setQrFullscreenAperta] = React.useState(false);
  const [modalitaAntiriflessoSolare, setModalitaAntiriflessoSolare] =
    React.useState(true);
  const qrContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!intervento) return;
    setNotaRapidaCantiere(intervento.noteTecniche || '');
    setDurataRapidaOre(String(intervento.durataOre || 2.5));
    setQrFullscreenAperta(false);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setModalitaMobileScan(params.get('qrscan') === '1');
    }
  }, [intervento]);

  if (!intervento) return null;

  const baseOrigin =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://rossi-impianti.app/';
  const qrDeepLinkUrl = `${baseOrigin}?intervento=${encodeURIComponent(intervento.id)}&mode=edit&qrscan=1`;

  const handleCopiaDeepLink = async () => {
    try {
      await navigator.clipboard.writeText(qrDeepLinkUrl);
      setLinkCopiato(true);
      showToast(
        'success',
        `Link rapido QR copiato per l'intervento ${intervento.id.toUpperCase()}`,
      );
      window.setTimeout(() => setLinkCopiato(false), 2200);
    } catch {
      showToast('info', `Link QR: ${qrDeepLinkUrl}`);
    }
  };

  const handleScaricaQrPng = () => {
    const svgEl = qrContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgEl);
      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgBlob = new Blob([svgString], {
        type: 'image/svg+xml;charset=utf-8',
      });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 24, 24, 312, 312);
        URL.revokeObjectURL(url);

        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `qr-intervento-${intervento.id}.png`;
        link.href = pngUrl;
        link.click();
        showToast(
          'success',
          `QR Code PNG scaricato per il foglio di lavoro (${intervento.id.toUpperCase()})`,
        );
      };
      img.src = url;
    } catch {
      showToast('error', 'Impossibile esportare il QR code in PNG');
    }
  };

  const handleSalvaAggiornamentoRapidoQr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAggiornaRapidoDaQr) return;
    const durataNum = Math.max(0.5, Number(durataRapidaOre) || 2.5);
    onAggiornaRapidoDaQr(intervento.id, {
      noteTecniche: notaRapidaCantiere.trim(),
      durataOre: durataNum,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onChiudi}
    >
      <div
        className="bg-[#1a2332] border border-[#2a3a4f] rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#2a3a4f]">
          <div className="min-w-0 flex-1">
            <span className="text-xs font-mono font-bold text-[#f59e0b]">
              🕐 {formattaDataItaliana(intervento.data)} · {intervento.oraInizio}{' '}
              - {intervento.oraFine}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#f1f5f9] mt-1 break-words">
              {intervento.titolo}
            </h2>
            <span className="text-xs text-[#94a3b8] block mt-0.5">
              Categoria: {intervento.tipo} · Priorità: {intervento.priorita}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onModifica(intervento)}
              className="p-2.5 rounded-xl bg-[#0f1720] hover:bg-[#f59e0b]/20 text-[#94a3b8] hover:text-[#f59e0b] border border-[#2a3a4f]"
              title="Modifica intervento"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onElimina(intervento.id);
                onChiudi();
              }}
              className="p-2.5 rounded-xl bg-[#0f1720] hover:bg-[#ef4444]/20 text-[#94a3b8] hover:text-[#ef4444] border border-[#2a3a4f]"
              title="Elimina intervento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onChiudi}
              className="p-2.5 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]"
              aria-label="Chiudi dettaglio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selettore rapido Stato (Programmato -> In corso -> Completato) */}
        <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-3.5 sm:p-4 space-y-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8] block">
            Stato Avanzamento Lavori
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['Programmato', 'In corso', 'Completato'] as const).map((st) => {
              const attivo = intervento.stato === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => onCambiaStato(intervento.id, st)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all min-h-[42px] ${
                    attivo
                      ? st === 'Completato'
                        ? 'bg-[#10b981] text-[#0f1720]'
                        : st === 'In corso'
                          ? 'bg-[#f59e0b] text-[#0f1720]'
                          : 'bg-slate-600 text-white'
                      : 'bg-[#1a2332] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
                  }`}
                >
                  {st === 'Completato' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : st === 'In corso' ? (
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Wrench className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">{st}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dettagli Tecnici & Indirizzo */}
        <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 space-y-3 text-xs sm:text-sm">
          <div>
            <span className="text-xs text-[#94a3b8] block">
              Descrizione Lavoro
            </span>
            <p className="text-[#f1f5f9] mt-0.5 leading-relaxed">
              {intervento.descrizione}
            </p>
          </div>

          {intervento.noteTecniche && (
            <div className="pt-2 border-t border-[#2a3a4f]">
              <span className="text-xs text-[#f59e0b] font-semibold block">
                Note Tecniche & Materiali
              </span>
              <p className="text-[#f1f5f9]/90 mt-0.5">
                {intervento.noteTecniche}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2a3a4f]">
            <div>
              <span className="text-xs text-[#94a3b8] block">
                Tecnico Assegnato
              </span>
              <span className="text-[#f1f5f9] font-bold">
                👷 {intervento.tecnico}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#94a3b8] block">
                Importo Stimato
              </span>
              <span className="text-[#f59e0b] font-mono font-bold tabular-nums">
                {formattaEuro(intervento.importoStimato)}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-[#94a3b8] block">
                Indirizzo Cantiere
              </span>
              <span className="text-[#f1f5f9] font-medium">
                📍 {intervento.indirizzo}
              </span>
            </div>
          </div>
        </div>

        {/* Banner attivo quando l'intervento viene aperto tramite scansione QR mobile */}
        {modalitaMobileScan && (
          <div className="bg-[#10b981]/15 border border-[#10b981]/40 rounded-2xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-[#10b981] shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-[#10b981] uppercase tracking-wider">
                  Modalità Aggiornamento Rapido Mobile (Da Scansione QR)
                </p>
                <p className="text-xs text-[#f1f5f9]">
                  Tecnico: <strong>{intervento.tecnico}</strong> · Aggiorna stato, ore effettive e note di cantiere in 1 tap.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Aggiornamento Rapido Cantiere (Ore Effettive + Note Tecniche dal dispositivo mobile) */}
        {onAggiornaRapidoDaQr && (
          <form
            onSubmit={handleSalvaAggiornamentoRapidoQr}
            className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Aggiornamento Rapido da Dispositivo Mobile</span>
              </span>
              <span className="text-[11px] font-mono text-[#94a3b8]">
                Sincronizzazione istantanea
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="text-[11px] font-bold text-[#94a3b8] block mb-1">
                  Ore Lavorate
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="16"
                  value={durataRapidaOre}
                  onChange={(e) => setDurataRapidaOre(e.target.value)}
                  className="w-full bg-[#1a2332] border border-[#2a3a4f] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#f1f5f9] focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-[11px] font-bold text-[#94a3b8] block mb-1">
                  Note Rapide Tecnico / Materiali Utilizzati
                </label>
                <input
                  type="text"
                  value={notaRapidaCantiere}
                  onChange={(e) => setNotaRapidaCantiere(e.target.value)}
                  placeholder="Es. Sostituita valvola a sfera 3/4, impianto collaudato..."
                  className="w-full bg-[#1a2332] border border-[#2a3a4f] rounded-xl px-3 py-2 text-xs text-[#f1f5f9] focus:outline-none focus:border-[#f59e0b]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] text-xs font-extrabold transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salva Aggiornamento Cantiere</span>
              </button>
            </div>
          </form>
        )}

        {/* Sezione QR Code Univoco Intervento per Scansione Rapida da Smartphone Tecnico */}
        <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            onClick={() => setQrFullscreenAperta(true)}
            title="Clicca per aprire il QR Code a tutto schermo (Modalità Anti-Riflesso Esterni)"
            aria-label="Apri QR Code a schermo intero per scansione all'aperto"
            className="group relative bg-white p-3 rounded-2xl shadow-md shrink-0 border-2 border-[#f59e0b]/80 hover:border-[#f59e0b] hover:scale-[1.03] transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f59e0b]"
          >
            <div ref={qrContainerRef}>
              <QRCodeSVG
                value={qrDeepLinkUrl}
                size={120}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="absolute inset-0 rounded-xl bg-[#0f1720]/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-2 text-center">
              <Maximize2 className="w-5 h-5 text-[#f59e0b]" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-white leading-tight">
                Ingrandisci
                <br />
                Anti-Riflesso
              </span>
            </div>
            <span className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#0f1720] bg-[#f59e0b] rounded-lg px-2 py-0.5">
              <ZoomIn className="w-3 h-3" />
              <span>Tocca per Zoom</span>
            </span>
          </button>

          <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#f59e0b]">
                <QrCode className="w-4 h-4" />
                <span>QR Code Cantiere Univoco</span>
              </span>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#1a2332] border border-[#2a3a4f] text-[#10b981]">
                ID #{intervento.id.toUpperCase()}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <Sun className="w-3 h-3" />
                <span>ECC-H Anti-Riflesso</span>
              </span>
            </div>

            <p className="text-xs text-[#94a3b8] leading-relaxed">
              Clicca sul QR code per aprirlo a{' '}
              <strong className="text-[#f1f5f9]">
                tutto schermo ad alto contrasto
              </strong>{' '}
              (ideale sotto il sole in cantiere) oppure inquadralo con lo
              smartphone del tecnico (
              <strong className="text-[#f1f5f9]">{intervento.tecnico}</strong>)
              per aprire direttamente lo{' '}
              <strong className="text-[#f59e0b]">
                stato di modifica rapida
              </strong>{' '}
              (<code className="text-[11px] text-[#10b981] font-mono">?intervento={intervento.id}&amp;mode=edit</code>).
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => setQrFullscreenAperta(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] text-xs font-extrabold transition-colors shadow-sm"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Schermo Intero (Sole / Esterni)</span>
              </button>

              <button
                type="button"
                onClick={() => void handleCopiaDeepLink()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a2332] hover:bg-slate-800 text-[#f1f5f9] border border-[#2a3a4f] text-xs font-bold transition-colors"
              >
                {linkCopiato ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10b981]" />
                    <span className="text-[#10b981]">Link QR Copiato</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#f59e0b]" />
                    <span>Copia Link Mobile</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleScaricaQrPng}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a2332] hover:bg-slate-800 text-[#f1f5f9] border border-[#2a3a4f] text-xs font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Scarica PNG</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  showToast(
                    'success',
                    `📲 Deep-Link QR attivato: apertura diretta stato modifica per #${intervento.id.toUpperCase()} (${intervento.tecnico})`,
                  );
                  onModifica(intervento);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/40 text-xs font-bold transition-colors"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Simula Scansione QR (Apri Modifica)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pulsanti rapidi Chiama e Naviga */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onChiama(intervento.telefonoCliente, intervento.clienteNome)
            }
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/40 font-bold text-xs sm:text-sm transition-colors min-h-[46px]"
          >
            <Phone className="w-4 h-4" />
            <span>Chiama Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => onNaviga(intervento.indirizzo, intervento.titolo)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-[#2a3a4f] font-bold text-xs sm:text-sm transition-colors min-h-[46px]"
          >
            <Navigation className="w-4 h-4" />
            <span>Avvia Navigatore</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          MODALE FULL-SCREEN QR CODE AD ALTO CONTRASTO (ANTI-RIFLESSO ESTERNI)
         ===================================================================== */}
      {qrFullscreenAperta && (
        <div
          className={`fixed inset-0 z-[70] overflow-y-auto flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in transition-colors ${
            modalitaAntiriflessoSolare
              ? 'bg-white text-black'
              : 'bg-[#070b10] text-white'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setQrFullscreenAperta(false);
          }}
        >
          {/* Barra superiore Fullscreen QR */}
          <div
            className="w-full max-w-2xl flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-current/15 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#f59e0b] text-[#0f1720] font-extrabold shadow-md shrink-0">
                <QrCode className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#f59e0b] text-[#0f1720]">
                    ID #{intervento.id.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-80">
                    ECC-H 30% Anti-Riflesso
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold truncate max-w-[230px] sm:max-w-md mt-0.5">
                  {intervento.titolo}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setModalitaAntiriflessoSolare((prev) => !prev)
                }
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                  modalitaAntiriflessoSolare
                    ? 'bg-black text-white border-black hover:bg-slate-800'
                    : 'bg-white text-black border-white hover:bg-slate-200'
                }`}
                title="Alterna sfondo Bianco Puro Anti-Riflesso Solare / Scuro OLED"
              >
                <Sun className="w-4 h-4 text-[#f59e0b]" />
                <span>
                  {modalitaAntiriflessoSolare
                    ? 'Modalità Sole: ON'
                    : 'Modalità OLED'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setQrFullscreenAperta(false)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border-2 transition-all ${
                  modalitaAntiriflessoSolare
                    ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300'
                    : 'bg-[#1a2332] hover:bg-slate-800 text-white border-[#2a3a4f]'
                }`}
                aria-label="Riduci QR Code"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Chiudi</span>
              </button>
            </div>
          </div>

          {/* Area Centrale Gigante QR Code ad Altissimo Contrasto con Quiet Zone */}
          <div
            className="my-auto flex flex-col items-center justify-center text-center max-w-lg w-full py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`bg-white p-4 sm:p-7 rounded-3xl transition-all inline-flex items-center justify-center max-w-full ${
                modalitaAntiriflessoSolare
                  ? 'border-[5px] border-black shadow-2xl'
                  : 'border-[5px] border-[#f59e0b] shadow-2xl'
              }`}
            >
              <QRCodeSVG
                value={qrDeepLinkUrl}
                size={240}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
                className="max-w-full h-auto"
              />
            </div>

            <div className="mt-4 space-y-1.5 px-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981] text-[#0f1720] text-xs font-extrabold uppercase tracking-wider shadow-sm">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Deep-Link Diretto allo Stato di Modifica</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold mt-1">
                👷 Tecnico: {intervento.tecnico} · 📍 {intervento.indirizzo}
              </p>
              <p className="text-[11px] font-mono opacity-75 break-all max-w-md mx-auto">
                {qrDeepLinkUrl}
              </p>
            </div>
          </div>

          {/* Barra inferiore Azioni Rapide dal Fullscreen */}
          <div
            className="w-full max-w-2xl flex flex-wrap items-center justify-center sm:justify-between gap-2.5 pt-3 border-t border-current/15 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs font-bold opacity-75 text-center sm:text-left">
              💡 Cornice ad alto contrasto ECC-H per lettura sotto luce solare diretta.
            </span>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleScaricaQrPng}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-colors ${
                  modalitaAntiriflessoSolare
                    ? 'bg-slate-100 hover:bg-slate-200 text-black border-slate-300'
                    : 'bg-[#1a2332] hover:bg-slate-800 text-white border-[#2a3a4f]'
                }`}
              >
                <Download className="w-4 h-4 text-sky-500" />
                <span>Scarica PNG</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQrFullscreenAperta(false);
                  showToast(
                    'success',
                    `📲 Deep-Link QR attivato: apertura diretta stato modifica per #${intervento.id.toUpperCase()} (${intervento.tecnico})`,
                  );
                  onModifica(intervento);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] text-xs font-extrabold transition-colors shadow-md"
              >
                <ScanLine className="w-4 h-4" />
                <span>Simula Scansione & Apri Modifica</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. MODALE FORM INTERVENTO (Aggiungi / Modifica Intervento)
// ============================================================================
interface ModaleFormInterventoProps {
  aperto: boolean;
  interventoInModifica: InterventoItem | null;
  clienti: ClienteItem[];
  dataPreselezionata?: string;
  clienteIdPreselezionato?: string;
  apertaDaQr?: boolean;
  onChiudi: () => void;
  onSalva: (dati: Omit<InterventoItem, 'id'>, idEsistente?: string) => void;
}

export function ModaleFormIntervento({
  aperto,
  interventoInModifica,
  clienti,
  dataPreselezionata,
  clienteIdPreselezionato,
  apertaDaQr = false,
  onChiudi,
  onSalva,
}: ModaleFormInterventoProps) {
  const { oggiIso } = getSettimanaCorrente();

  const [clienteId, setClienteId] = React.useState('');
  const [titolo, setTitolo] = React.useState('');
  const [descrizione, setDescrizione] = React.useState('');
  const [tipo, setTipo] = React.useState('Idraulico / Termico');
  const [data, setData] = React.useState(oggiIso);
  const [oraInizio, setOraInizio] = React.useState('09:00');
  const [oraFine, setOraFine] = React.useState('11:30');
  const [durataOre, setDurataOre] = React.useState('2.5');
  const [stato, setStato] = React.useState<InterventoItem['stato']>('Programmato');
  const [tecnico, setTecnico] = React.useState('Luca');
  const [indirizzo, setIndirizzo] = React.useState('');
  const [telefonoCliente, setTelefonoCliente] = React.useState('');
  const [importoStimato, setImportoStimato] = React.useState('450');
  const [priorita, setPriorita] = React.useState<'Bassa' | 'Media' | 'Alta'>('Media');
  const [noteTecniche, setNoteTecniche] = React.useState('');

  React.useEffect(() => {
    if (!aperto) return;
    if (interventoInModifica) {
      setClienteId(interventoInModifica.clienteId);
      setTitolo(interventoInModifica.titolo);
      setDescrizione(interventoInModifica.descrizione);
      setTipo(interventoInModifica.tipo);
      setData(interventoInModifica.data);
      setOraInizio(interventoInModifica.oraInizio);
      setOraFine(interventoInModifica.oraFine);
      setDurataOre(String(interventoInModifica.durataOre || 2.5));
      setStato(interventoInModifica.stato);
      setTecnico(interventoInModifica.tecnico);
      setIndirizzo(interventoInModifica.indirizzo);
      setTelefonoCliente(interventoInModifica.telefonoCliente);
      setImportoStimato(String(interventoInModifica.importoStimato));
      setPriorita(interventoInModifica.priorita);
      setNoteTecniche(interventoInModifica.noteTecniche || '');
    } else {
      const cliDefault =
        clienti.find((c) => c.id === clienteIdPreselezionato) || clienti[0];
      setClienteId(cliDefault?.id || '');
      setTitolo(
        cliDefault
          ? `${cliDefault.nome.split('(')[0].trim()} — Manutenzione impianto`
          : '',
      );
      setDescrizione('Controllo generale, verifica tenuta e taratura impianto.');
      setTipo('Idraulico / Termico');
      setData(dataPreselezionata || oggiIso);
      setOraInizio('09:00');
      setOraFine('11:30');
      setDurataOre('2.5');
      setStato('Programmato');
      setTecnico('Luca');
      setIndirizzo(cliDefault?.indirizzo || 'Vicenza (VI)');
      setTelefonoCliente(cliDefault?.cellulare || cliDefault?.telefono || '');
      setImportoStimato('450');
      setPriorita('Media');
      setNoteTecniche('');
    }
  }, [
    aperto,
    interventoInModifica,
    clienti,
    dataPreselezionata,
    clienteIdPreselezionato,
    oggiIso,
  ]);

  if (!aperto) return null;

  const handleCambioCliente = (nuovoClienteId: string) => {
    setClienteId(nuovoClienteId);
    const cli = clienti.find((c) => c.id === nuovoClienteId);
    if (cli) {
      setIndirizzo(cli.indirizzo);
      setTelefonoCliente(cli.cellulare || cli.telefono);
      if (!interventoInModifica) {
        const nomeBreve = cli.nome.split('(')[0].trim();
        setTitolo(`${nomeBreve} — Intervento tecnico`);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cli = clienti.find((c) => c.id === clienteId);
    const clienteNome = cli
      ? cli.nome.split('(')[0].trim()
      : 'Cliente Cantiere';

    onSalva(
      {
        clienteId: clienteId || 'cli-1',
        clienteNome,
        titolo: titolo.trim() || `${clienteNome} — Intervento`,
        descrizione: descrizione.trim(),
        tipo,
        data,
        oraInizio,
        oraFine,
        durataOre: Math.max(0.5, Number(durataOre) || 2.5),
        stato,
        tecnico,
        indirizzo: indirizzo.trim() || 'Vicenza (VI)',
        telefonoCliente: telefonoCliente.trim() || '0444 512389',
        importoStimato: Number(importoStimato) || 0,
        priorita,
        noteTecniche: noteTecniche.trim(),
      },
      interventoInModifica?.id,
    );
    onChiudi();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onChiudi}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a2332] border border-[#2a3a4f] rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3a4f]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#f1f5f9] flex items-center gap-2">
              <span>
                {interventoInModifica
                  ? 'Modifica Intervento'
                  : '➕ Nuovo Intervento Tecnico'}
              </span>
              {interventoInModifica && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-[#0f1720] border border-[#2a3a4f] text-[#f59e0b]">
                  #{interventoInModifica.id.toUpperCase()}
                </span>
              )}
            </h2>
            {apertaDaQr && interventoInModifica && (
              <p className="text-xs text-[#10b981] font-bold flex items-center gap-1.5 mt-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span>
                  Deep-Link QR Mobile Attivo — Modifica Rapida Tecnico ({interventoInModifica.tecnico})
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onChiudi}
            className="p-2 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selettore rapido 1-Tap Stato quando siamo in modifica (specialmente da QR mobile) */}
        {interventoInModifica && (
          <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#f59e0b] flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>Aggiornamento Rapido Stato & Ore (1-Tap)</span>
              </span>
              <span className="text-[11px] font-mono text-[#94a3b8]">
                Durata: {durataOre}h
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['Programmato', 'In corso', 'Completato'] as const).map((st) => {
                const attivo = stato === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStato(st)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      attivo
                        ? st === 'Completato'
                          ? 'bg-[#10b981] text-[#0f1720]'
                          : st === 'In corso'
                            ? 'bg-[#f59e0b] text-[#0f1720]'
                            : 'bg-slate-600 text-white'
                        : 'bg-[#1a2332] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]'
                    }`}
                  >
                    {st === 'Completato' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : st === 'In corso' ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : (
                      <Wrench className="w-3.5 h-3.5" />
                    )}
                    <span>{st}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Cliente Associato
            </label>
            <select
              value={clienteId}
              onChange={(e) => handleCambioCliente(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {c.indirizzo}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Titolo Intervento *
            </label>
            <input
              type="text"
              required
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              placeholder="Es. Fam. Bianchi — Sostituzione caldaia"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Data Intervento *
            </label>
            <input
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                Ora Inizio
              </label>
              <input
                type="time"
                value={oraInizio}
                onChange={(e) => setOraInizio(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                Ora Fine
              </label>
              <input
                type="time"
                value={oraFine}
                onChange={(e) => setOraFine(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Tecnico Incaricato (👷)
            </label>
            <select
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              {TECNICI_INIZIALI.map((t) => (
                <option key={t.id} value={t.nome}>
                  {t.nome} ({t.specializzazione})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Stato Intervento
            </label>
            <select
              value={stato}
              onChange={(e) =>
                setStato(e.target.value as InterventoItem['stato'])
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              <option value="Programmato">Programmato</option>
              <option value="In corso">In corso</option>
              <option value="Completato">Completato</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Reparto / Tipologia
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              <option value="Idraulico / Termico">Idraulico / Termico</option>
              <option value="Elettrico">Elettrico</option>
              <option value="Climatizzazione">Climatizzazione</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Importo Stimato (€)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={importoStimato}
              onChange={(e) => setImportoStimato(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] font-mono focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Durata Effettiva / Stimata (Ore)
            </label>
            <input
              type="number"
              min="0.5"
              max="16"
              step="0.5"
              value={durataOre}
              onChange={(e) => setDurataOre(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] font-mono focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Priorità Intervento
            </label>
            <select
              value={priorita}
              onChange={(e) =>
                setPriorita(e.target.value as 'Bassa' | 'Media' | 'Alta')
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              <option value="Bassa">Bassa</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta (Urgente)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Indirizzo Cantiere (📍)
            </label>
            <input
              type="text"
              required
              value={indirizzo}
              onChange={(e) => setIndirizzo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Descrizione Lavori
            </label>
            <textarea
              rows={2}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Note Tecniche & Materiali da Furgone
            </label>
            <input
              type="text"
              value={noteTecniche}
              onChange={(e) => setNoteTecniche(e.target.value)}
              placeholder="Es. Portare defangatore magnetico 3/4 e sonda tiracavi"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-[#2a3a4f]">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-sm transition-colors min-h-[46px]"
          >
            <Save className="w-4 h-4" />
            <span>
              {interventoInModifica
                ? 'Salva Modifiche'
                : 'Salva Intervento in Agenda'}
            </span>
          </button>
          <button
            type="button"
            onClick={onChiudi}
            className="py-3 px-5 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] font-semibold text-sm min-h-[46px]"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 3. MODALE FORM CLIENTE (Aggiungi / Modifica Cliente)
// ============================================================================
interface ModaleFormClienteProps {
  aperto: boolean;
  clienteInModifica: ClienteItem | null;
  onChiudi: () => void;
  onSalva: (dati: Omit<ClienteItem, 'id'>, idEsistente?: string) => void;
}

export function ModaleFormCliente({
  aperto,
  clienteInModifica,
  onChiudi,
  onSalva,
}: ModaleFormClienteProps) {
  const { oggiIso } = getSettimanaCorrente();

  const [nome, setNome] = React.useState('');
  const [tipo, setTipo] = React.useState('Privato Residenziale');
  const [telefono, setTelefono] = React.useState('');
  const [cellulare, setCellulare] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [indirizzo, setIndirizzo] = React.useState('');
  const [piva, setPiva] = React.useState('');
  const [codiceFiscale, setCodiceFiscale] = React.useState('');
  const [ultimoIntervento, setUltimoIntervento] = React.useState('');
  const [fatturatoTotale, setFatturatoTotale] = React.useState('1200');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    if (!aperto) return;
    if (clienteInModifica) {
      setNome(clienteInModifica.nome);
      setTipo(clienteInModifica.tipo);
      setTelefono(clienteInModifica.telefono);
      setCellulare(clienteInModifica.cellulare || '');
      setEmail(clienteInModifica.email);
      setIndirizzo(clienteInModifica.indirizzo);
      setPiva(clienteInModifica.piva);
      setCodiceFiscale(clienteInModifica.codiceFiscale || '');
      setUltimoIntervento(clienteInModifica.ultimoIntervento);
      setFatturatoTotale(String(clienteInModifica.fatturatoTotale));
      setNote(clienteInModifica.note);
    } else {
      setNome('');
      setTipo('Privato Residenziale');
      setTelefono('0444 ');
      setCellulare('+39 348 ');
      setEmail('');
      setIndirizzo('Via , 36100 Vicenza (VI)');
      setPiva('');
      setCodiceFiscale('');
      setUltimoIntervento('Sopralluogo tecnico impianto');
      setFatturatoTotale('0');
      setNote('');
    }
  }, [aperto, clienteInModifica]);

  if (!aperto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSalva(
      {
        nome: nome.trim() || 'Nuovo Cliente Vicenza',
        tipo,
        telefono: telefono.trim() || '0444 000000',
        cellulare: cellulare.trim(),
        email: email.trim(),
        indirizzo: indirizzo.trim() || 'Vicenza (VI)',
        piva: piva.trim(),
        codiceFiscale: codiceFiscale.trim(),
        ultimoIntervento:
          ultimoIntervento.trim() || 'Primo sopralluogo tecnico',
        dataUltimoIntervento: clienteInModifica?.dataUltimoIntervento || oggiIso,
        fatturatoTotale: Number(fatturatoTotale) || 0,
        note: note.trim(),
      },
      clienteInModifica?.id,
    );
    onChiudi();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onChiudi}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a2332] border border-[#2a3a4f] rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3a4f]">
          <h2 className="text-lg sm:text-xl font-bold text-[#f1f5f9]">
            {clienteInModifica ? 'Modifica Scheda Cliente' : '👤 Nuovo Cliente'}
          </h2>
          <button
            type="button"
            onClick={onChiudi}
            className="p-2 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Nome / Ragione Sociale *
            </label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Es. Fam. Rossi o Officina Veneta S.r.l."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Tipologia Cliente
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              <option value="Privato Residenziale">Privato Residenziale</option>
              <option value="Condominio">Condominio</option>
              <option value="Azienda Industriale">Azienda Industriale</option>
              <option value="Attività Commerciale">Attività Commerciale</option>
              <option value="Studio Medico">Studio Medico</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Telefono Fisso / Ufficio *
            </label>
            <input
              type="text"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="0444 512389"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Cellulare Referente
            </label>
            <input
              type="text"
              value={cellulare}
              onChange={(e) => setCellulare(e.target.value)}
              placeholder="+39 348 000 0000"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Email / PEC
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.it"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Indirizzo Completo (Vicenza e provincia) *
            </label>
            <input
              type="text"
              required
              value={indirizzo}
              onChange={(e) => setIndirizzo(e.target.value)}
              placeholder="Viale Roma 42, 36100 Vicenza (VI)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Partita IVA
            </label>
            <input
              type="text"
              value={piva}
              onChange={(e) => setPiva(e.target.value)}
              placeholder="IT00000000240"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] font-mono focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Codice Fiscale
            </label>
            <input
              type="text"
              value={codiceFiscale}
              onChange={(e) => setCodiceFiscale(e.target.value)}
              placeholder="RSSMRA75A01L840X"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] font-mono focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Ultimo Intervento Eseguito
            </label>
            <input
              type="text"
              value={ultimoIntervento}
              onChange={(e) => setUltimoIntervento(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Note Interne (Accesso, citofono, matricola caldaia/quadro)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-[#2a3a4f]">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-sm transition-colors min-h-[46px]"
          >
            <Save className="w-4 h-4" />
            <span>
              {clienteInModifica ? 'Aggiorna Cliente' : 'Salva Nuovo Cliente'}
            </span>
          </button>
          <button
            type="button"
            onClick={onChiudi}
            className="py-3 px-5 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] font-semibold text-sm min-h-[46px]"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// 4. MODALE FORM PREVENTIVO (Aggiungi / Modifica Preventivo)
// ============================================================================
interface ModaleFormPreventivoProps {
  aperto: boolean;
  preventivoInModifica: PreventivoItem | null;
  clienti: ClienteItem[];
  clienteIdPreselezionato?: string;
  onChiudi: () => void;
  onSalva: (dati: Omit<PreventivoItem, 'id'>, idEsistente?: string) => void;
}

export function ModaleFormPreventivo({
  aperto,
  preventivoInModifica,
  clienti,
  clienteIdPreselezionato,
  onChiudi,
  onSalva,
}: ModaleFormPreventivoProps) {
  const { oggiIso } = getSettimanaCorrente();

  const [clienteId, setClienteId] = React.useState('');
  const [numero, setNumero] = React.useState('');
  const [titolo, setTitolo] = React.useState('');
  const [descrizione, setDescrizione] = React.useState('');
  const [importo, setImporto] = React.useState('2800');
  const [tipo, setTipo] = React.useState('Idraulico / Termico');
  const [stato, setStato] = React.useState<PreventivoItem['stato']>('In attesa');

  React.useEffect(() => {
    if (!aperto) return;
    if (preventivoInModifica) {
      setClienteId(preventivoInModifica.clienteId);
      setNumero(preventivoInModifica.numero);
      setTitolo(preventivoInModifica.titolo);
      setDescrizione(preventivoInModifica.descrizione);
      setImporto(String(preventivoInModifica.importo));
      setTipo(preventivoInModifica.tipo);
      setStato(preventivoInModifica.stato);
    } else {
      const cliDefault =
        clienti.find((c) => c.id === clienteIdPreselezionato) || clienti[0];
      setClienteId(cliDefault?.id || '');
      setNumero(`PRV-2026-0${Math.floor(44 + Math.random() * 50)}`);
      setTitolo('Fornitura e posa impianto ad alta efficienza');
      setDescrizione(
        'Fornitura materiali certificati, manodopera specializzata, collaudo e rilascio Dichiarazione di Conformità DM 37/08.',
      );
      setImporto('3200');
      setTipo('Idraulico / Termico');
      setStato('In attesa');
    }
  }, [aperto, preventivoInModifica, clienti, clienteIdPreselezionato]);

  if (!aperto) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cli = clienti.find((c) => c.id === clienteId);
    onSalva(
      {
        numero: numero.trim() || 'PRV-2026-050',
        clienteId: clienteId || 'cli-1',
        clienteNome: cli ? cli.nome : 'Cliente Vicenza',
        titolo: titolo.trim() || 'Offerta tecnica impiantistica',
        descrizione: descrizione.trim(),
        importo: Number(importo) || 0,
        dataEmissione: preventivoInModifica?.dataEmissione || oggiIso,
        validitaFino: '2026-11-30',
        stato,
        tipo,
      },
      preventivoInModifica?.id,
    );
    onChiudi();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onChiudi}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a2332] border border-[#2a3a4f] rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#2a3a4f]">
          <h2 className="text-lg sm:text-xl font-bold text-[#f1f5f9]">
            {preventivoInModifica
              ? 'Modifica Preventivo'
              : '📄 Nuovo Preventivo'}
          </h2>
          <button
            type="button"
            onClick={onChiudi}
            className="p-2 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Numero Preventivo
            </label>
            <input
              type="text"
              required
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] font-mono focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Stato Offerta
            </label>
            <select
              value={stato}
              onChange={(e) =>
                setStato(e.target.value as PreventivoItem['stato'])
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              <option value="In attesa">In attesa</option>
              <option value="Accettato">Accettato</option>
              <option value="Rifiutato">Rifiutato</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Cliente Destinatario
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Oggetto Preventivo *
            </label>
            <input
              type="text"
              required
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Tipologia Impianto
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            >
              <option value="Idraulico / Termico">Idraulico / Termico</option>
              <option value="Elettrico">Elettrico</option>
              <option value="Climatizzazione">Climatizzazione</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Importo Totale Stimato (€) *
            </label>
            <input
              type="number"
              required
              min="50"
              step="50"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] font-mono focus:border-[#f59e0b] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
              Dettaglio Voci & Fornitura
            </label>
            <textarea
              rows={3}
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-3 border-t border-[#2a3a4f]">
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-sm transition-colors min-h-[46px]"
          >
            <Save className="w-4 h-4" />
            <span>
              {preventivoInModifica ? 'Salva Modifiche' : 'Salva Preventivo'}
            </span>
          </button>
          <button
            type="button"
            onClick={onChiudi}
            className="py-3 px-5 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] font-semibold text-sm min-h-[46px]"
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}
