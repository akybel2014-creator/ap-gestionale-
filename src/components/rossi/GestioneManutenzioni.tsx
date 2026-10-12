import React from 'react';
import {
  CalendarClock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Wrench,
  User,
  Phone,
  MapPin,
  Calendar,
  Edit3,
  Trash2,
  BellRing,
  ArrowRight,
  ShieldCheck,
  Zap,
  Flame,
  Wind,
  X,
  Save,
} from 'lucide-react';
import {
  formattaDataItaliana,
  formattaEuro,
  getSettimanaCorrente,
  TECNICI_INIZIALI,
  calcolaProssimaScadenza,
  calcolaStatoManutenzione,
} from '@/data.js';
import type { ClienteItem } from './GestioneClienti';

export type FrequenzaManutenzione =
  | 'Mensile'
  | 'Bimestrale'
  | 'Trimestrale'
  | 'Semestrale'
  | 'Annuale'
  | 'Biennale';

export interface ManutenzioneProgrammataItem {
  id: string;
  clienteId: string;
  clienteNome: string;
  indirizzoCliente: string;
  telefonoCliente: string;
  impianto: string;
  tipoImpianto: 'Idraulico / Termico' | 'Elettrico' | 'Climatizzazione';
  titolo: string;
  descrizione: string;
  frequenza: FrequenzaManutenzione;
  ultimaEsecuzione: string;
  prossimaScadenza: string;
  tecnicoAssegnato: 'Luca' | 'Andrea' | 'Marco' | string;
  costoStimato: number;
  matricola?: string;
  attiva: boolean;
  noteTecniche?: string;
}

interface GestioneManutenzioniProps {
  manutenzioni: ManutenzioneProgrammataItem[];
  clienti: ClienteItem[];
  onAggiungiManutenzione: (
    nuova: Omit<ManutenzioneProgrammataItem, 'id'>,
  ) => void;
  onModificaManutenzione: (manutenzione: ManutenzioneProgrammataItem) => void;
  onEliminaManutenzione: (id: string) => void;
  onRinnovaManutenzione: (id: string) => void;
  onPianificaInterventoInAgenda: (
    manutenzione: ManutenzioneProgrammataItem,
  ) => void;
  onChiamaCliente: (telefono: string, nome: string) => void;
}

const FREQUENZE_DISPONIBILI: FrequenzaManutenzione[] = [
  'Mensile',
  'Bimestrale',
  'Trimestrale',
  'Semestrale',
  'Annuale',
  'Biennale',
];

export default function GestioneManutenzioni({
  manutenzioni,
  clienti,
  onAggiungiManutenzione,
  onModificaManutenzione,
  onEliminaManutenzione,
  onRinnovaManutenzione,
  onPianificaInterventoInAgenda,
  onChiamaCliente,
}: GestioneManutenzioniProps) {
  const { oggiIso } = React.useMemo(() => getSettimanaCorrente(), []);

  const [ricerca, setRicerca] = React.useState('');
  const [filtroStato, setFiltroStato] = React.useState<string>('Tutte');
  const [filtroFrequenza, setFiltroFrequenza] = React.useState<string>('Tutte');
  const [filtroTecnico, setFiltroTecnico] = React.useState<string>('Tutti');
  const [filtroTipoImpianto, setFiltroTipoImpianto] =
    React.useState<string>('Tutti');

  // Stato Modale Form Creazione / Modifica
  const [modaleAperta, setModaleAperta] = React.useState(false);
  const [inModificaId, setInModificaId] = React.useState<string | null>(null);

  // Form Fields
  const [formClienteId, setFormClienteId] = React.useState(
    clienti[0]?.id || 'cli-1',
  );
  const [formImpianto, setFormImpianto] = React.useState('');
  const [formTipoImpianto, setFormTipoImpianto] = React.useState<
    ManutenzioneProgrammataItem['tipoImpianto']
  >('Idraulico / Termico');
  const [formTitolo, setFormTitolo] = React.useState('');
  const [formDescrizione, setFormDescrizione] = React.useState('');
  const [formFrequenza, setFormFrequenza] =
    React.useState<FrequenzaManutenzione>('Annuale');
  const [formUltimaEsecuzione, setFormUltimaEsecuzione] =
    React.useState(oggiIso);
  const [formProssimaScadenza, setFormProssimaScadenza] = React.useState(() =>
    calcolaProssimaScadenza(oggiIso, 'Annuale'),
  );
  const [formTecnico, setFormTecnico] = React.useState('Luca');
  const [formCosto, setFormCosto] = React.useState('150');
  const [formMatricola, setFormMatricola] = React.useState('');
  const [formNote, setFormNote] = React.useState('');

  const apriNuovaManutenzione = () => {
    setInModificaId(null);
    const cliDefault = clienti[0];
    setFormClienteId(cliDefault ? cliDefault.id : 'cli-1');
    setFormImpianto('Caldaia a condensazione');
    setFormTipoImpianto('Idraulico / Termico');
    setFormTitolo('Revisione Annuale Impianto Termico & Fumi DPR 74');
    setFormDescrizione(
      'Pulizia bruciatore, controllo tenuta gas, analisi rendimento di combustione ed emissione rapporto.',
    );
    setFormFrequenza('Annuale');
    setFormUltimaEsecuzione(oggiIso);
    setFormProssimaScadenza(calcolaProssimaScadenza(oggiIso, 'Annuale'));
    setFormTecnico('Luca');
    setFormCosto('140');
    setFormMatricola('');
    setFormNote('');
    setModaleAperta(true);
  };

  const apriModifica = (item: ManutenzioneProgrammataItem) => {
    setInModificaId(item.id);
    setFormClienteId(item.clienteId);
    setFormImpianto(item.impianto);
    setFormTipoImpianto(item.tipoImpianto);
    setFormTitolo(item.titolo);
    setFormDescrizione(item.descrizione);
    setFormFrequenza(item.frequenza);
    setFormUltimaEsecuzione(item.ultimaEsecuzione);
    setFormProssimaScadenza(item.prossimaScadenza);
    setFormTecnico(item.tecnicoAssegnato);
    setFormCosto(String(item.costoStimato));
    setFormMatricola(item.matricola || '');
    setFormNote(item.noteTecniche || '');
    setModaleAperta(true);
  };

  const handleSalvaForm = (e: React.FormEvent) => {
    e.preventDefault();
    const clienteTrovato = clienti.find((c) => c.id === formClienteId);
    const clienteNome = clienteTrovato
      ? clienteTrovato.nome
      : 'Cliente Selezionato';
    const indirizzoCliente = clienteTrovato
      ? clienteTrovato.indirizzo
      : 'Vicenza (VI)';
    const telefonoCliente = clienteTrovato
      ? clienteTrovato.cellulare || clienteTrovato.telefono
      : '+39 0444 000000';

    const payload: Omit<ManutenzioneProgrammataItem, 'id'> = {
      clienteId: formClienteId,
      clienteNome,
      indirizzoCliente,
      telefonoCliente,
      impianto: formImpianto.trim() || 'Impianto Tecnologico',
      tipoImpianto: formTipoImpianto,
      titolo: formTitolo.trim() || 'Manutenzione Programmata Ricorrente',
      descrizione: formDescrizione.trim(),
      frequenza: formFrequenza,
      ultimaEsecuzione: formUltimaEsecuzione || oggiIso,
      prossimaScadenza: formProssimaScadenza || oggiIso,
      tecnicoAssegnato: formTecnico,
      costoStimato: Math.max(0, Number(formCosto) || 0),
      matricola: formMatricola.trim() || undefined,
      noteTecniche: formNote.trim() || undefined,
      attiva: true,
    };

    if (inModificaId) {
      onModificaManutenzione({ ...payload, id: inModificaId });
    } else {
      onAggiungiManutenzione(payload);
    }
    setModaleAperta(false);
  };

  // KPI
  const totaleAttive = manutenzioni.filter((m) => m.attiva).length;
  const inScadenzaCount = manutenzioni.filter(
    (m) => m.attiva && calcolaStatoManutenzione(m.prossimaScadenza, oggiIso) === 'In scadenza',
  ).length;
  const scaduteCount = manutenzioni.filter(
    (m) => m.attiva && calcolaStatoManutenzione(m.prossimaScadenza, oggiIso) === 'Scaduta',
  ).length;
  const volumeCanoni = manutenzioni
    .filter((m) => m.attiva)
    .reduce((s, m) => s + (Number(m.costoStimato) || 0), 0);

  // Lista filtrata
  const manutenzioniFiltrate = React.useMemo(() => {
    const q = ricerca.trim().toLowerCase();
    return manutenzioni.filter((item) => {
      const stato = calcolaStatoManutenzione(item.prossimaScadenza, oggiIso);

      if (filtroStato !== 'Tutte' && stato !== filtroStato) return false;
      if (filtroFrequenza !== 'Tutte' && item.frequenza !== filtroFrequenza)
        return false;
      if (filtroTecnico !== 'Tutti' && item.tecnicoAssegnato !== filtroTecnico)
        return false;
      if (
        filtroTipoImpianto !== 'Tutti' &&
        item.tipoImpianto !== filtroTipoImpianto
      )
        return false;

      if (!q) return true;
      return (
        item.clienteNome.toLowerCase().includes(q) ||
        item.impianto.toLowerCase().includes(q) ||
        item.titolo.toLowerCase().includes(q) ||
        item.indirizzoCliente.toLowerCase().includes(q) ||
        (item.matricola && item.matricola.toLowerCase().includes(q))
      );
    });
  }, [
    manutenzioni,
    oggiIso,
    filtroStato,
    filtroFrequenza,
    filtroTecnico,
    filtroTipoImpianto,
    ricerca,
  ]);

  const renderIconaTipo = (tipo: ManutenzioneProgrammataItem['tipoImpianto']) => {
    if (tipo === 'Elettrico') return <Zap className="w-4 h-4 text-sky-400" />;
    if (tipo === 'Climatizzazione')
      return <Wind className="w-4 h-4 text-[#10b981]" />;
    return <Flame className="w-4 h-4 text-[#f59e0b]" />;
  };

  const calcolaGiorniRimanenti = (dataScadenza: string) => {
    const msDiff = new Date(dataScadenza).getTime() - new Date(oggiIso).getTime();
    const giorni = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    if (giorni < 0) return { label: `Scaduta da ${Math.abs(giorni)} gg`, giorni, classe: 'text-[#ef4444]' };
    if (giorni === 0) return { label: 'Scade OGGI!', giorni, classe: 'text-[#f59e0b] font-bold' };
    if (giorni === 1) return { label: 'Scade domani', giorni, classe: 'text-[#f59e0b]' };
    if (giorni <= 14) return { label: `Scade tra ${giorni} giorni`, giorni, classe: 'text-[#f59e0b]' };
    return { label: `Tra ${giorni} giorni`, giorni, classe: 'text-[#94a3b8]' };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* =====================================================================
          1. HEADER SEZIONE + PULSANTE "+ NUOVA SCADENZA"
         ===================================================================== */}
      <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CalendarClock className="w-5 h-5 text-[#f59e0b]" />
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#f1f5f9]">
                Manutenzioni Programmate Impianti
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/35 text-[11px] font-bold text-[#f59e0b]">
                <BellRing className="w-3 h-3" />
                <span>Notifiche Automatiche Agenda ON</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1">
              Scadenze periodiche ricorrenti (mensili, annuali) per libretti caldaia, clima F-Gas e quadri elettrici · Promemoria automatici ai tecnici
            </p>
          </div>

          <button
            type="button"
            onClick={apriNuovaManutenzione}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-sm transition-all shadow-md min-h-[44px] whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Nuova Scadenza Ricorrente</span>
          </button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-extrabold uppercase text-[#94a3b8] block">
              Contratti Attivi
            </span>
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[#f1f5f9] tabular-nums block">
              {totaleAttive}
            </span>
            <span className="text-[11px] text-[#94a3b8]">Impianti gestiti</span>
          </div>

          <button
            type="button"
            onClick={() => setFiltroStato((p) => (p === 'In scadenza' ? 'Tutte' : 'In scadenza'))}
            className={`text-left bg-[#0f1720] border rounded-xl p-3.5 space-y-1 transition-all ${
              filtroStato === 'In scadenza'
                ? 'border-[#f59e0b] bg-[#f59e0b]/10'
                : 'border-[#2a3a4f] hover:border-[#f59e0b]/50'
            }`}
          >
            <span className="text-[11px] font-extrabold uppercase text-[#f59e0b] block">
              In Scadenza (≤ 30 gg)
            </span>
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[#f59e0b] tabular-nums block">
              {inScadenzaCount}
            </span>
            <span className="text-[11px] text-[#f59e0b]/80">Richiede uscita</span>
          </button>

          <button
            type="button"
            onClick={() => setFiltroStato((p) => (p === 'Scaduta' ? 'Tutte' : 'Scaduta'))}
            className={`text-left bg-[#0f1720] border rounded-xl p-3.5 space-y-1 transition-all ${
              filtroStato === 'Scaduta'
                ? 'border-[#ef4444] bg-[#ef4444]/10'
                : 'border-[#2a3a4f] hover:border-[#ef4444]/50'
            }`}
          >
            <span className="text-[11px] font-extrabold uppercase text-[#ef4444] block">
              Scadute da Sollecitare
            </span>
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[#ef4444] tabular-nums block">
              {scaduteCount}
            </span>
            <span className="text-[11px] text-[#ef4444]/80">Oltre la data limite</span>
          </button>

          <div className="bg-[#0f1720] border border-[#2a3a4f] rounded-xl p-3.5 space-y-1">
            <span className="text-[11px] font-extrabold uppercase text-[#10b981] block">
              Valore Canoni Annuo
            </span>
            <span className="text-xl sm:text-2xl font-mono font-extrabold text-[#10b981] tabular-nums block">
              {formattaEuro(volumeCanoni)}
            </span>
            <span className="text-[11px] text-[#10b981]/80">Entrate ricorrenti</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. FILTRI & RICERCA IN TEMPO REALE
         ===================================================================== */}
      <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-4 space-y-3 shadow-md">
        <div className="relative">
          <Search className="w-4 h-4 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
            placeholder="Cerca per cliente, tipo impianto (es. caldaia, pompa di calore), matricola o indirizzo a Vicenza..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] focus:border-[#f59e0b] focus:outline-none text-xs sm:text-sm text-[#f1f5f9] placeholder-[#94a3b8]/70"
          />
          {ricerca && (
            <button
              type="button"
              onClick={() => setRicerca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f1f5f9] p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="inline-flex items-center gap-1 font-bold text-[#94a3b8] mr-1">
            <Filter className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span>Filtra per:</span>
          </span>

          {/* Filtro Stato */}
          <div className="flex flex-wrap items-center gap-1 bg-[#0f1720] p-1 rounded-xl border border-[#2a3a4f]">
            {(['Tutte', 'In scadenza', 'Scaduta', 'Programmata'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFiltroStato(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    filtroStato === st
                      ? 'bg-[#f59e0b] text-[#0f1720]'
                      : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                  }`}
                >
                  {st === 'Tutte' ? 'Tutti gli stati' : st}
                </button>
              ),
            )}
          </div>

          {/* Filtro Frequenza */}
          <select
            value={filtroFrequenza}
            onChange={(e) => setFiltroFrequenza(e.target.value)}
            aria-label="Filtra per frequenza ricorrente"
            className="px-3 py-1.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] font-bold text-xs focus:outline-none focus:border-[#f59e0b] min-h-[34px]"
          >
            <option value="Tutte">Tutte le frequenze</option>
            <option value="Mensile">Mensile</option>
            <option value="Bimestrale">Bimestrale</option>
            <option value="Trimestrale">Trimestrale</option>
            <option value="Semestrale">Semestrale</option>
            <option value="Annuale">Annuale</option>
            <option value="Biennale">Biennale</option>
          </select>

          {/* Filtro Tecnico */}
          <select
            value={filtroTecnico}
            onChange={(e) => setFiltroTecnico(e.target.value)}
            aria-label="Filtra per tecnico assegnato"
            className="px-3 py-1.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] font-bold text-xs focus:outline-none focus:border-[#f59e0b] min-h-[34px]"
          >
            <option value="Tutti">Tutti i tecnici</option>
            {TECNICI_INIZIALI.map((t) => (
              <option key={t.id} value={t.nome}>
                👷 {t.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =====================================================================
          3. ELENCO SCHEDE MANUTENZIONE PROGRAMMATA
         ===================================================================== */}
      {manutenzioniFiltrate.length === 0 ? (
        <div className="bg-[#1a2332] border border-[#2a3a4f] rounded-2xl p-8 text-center space-y-3">
          <p className="text-base font-bold text-[#f1f5f9]">
            Nessuna manutenzione programmata trovata con i filtri correnti
          </p>
          <p className="text-xs text-[#94a3b8]">
            Reimposta i filtri oppure crea una nuova scadenza ricorrente per un impianto cliente.
          </p>
          <button
            type="button"
            onClick={apriNuovaManutenzione}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f59e0b] text-[#0f1720] font-bold text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuova Manutenzione</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manutenzioniFiltrate.map((item) => {
            const stato = calcolaStatoManutenzione(item.prossimaScadenza, oggiIso);
            const rimanenti = calcolaGiorniRimanenti(item.prossimaScadenza);
            const isScaduta = stato === 'Scaduta';
            const isInScadenza = stato === 'In scadenza';

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all shadow-md ${
                  isScaduta
                    ? 'bg-[#1a2332] border-[#ef4444]/60 hover:border-[#ef4444]'
                    : isInScadenza
                      ? 'bg-[#1a2332] border-[#f59e0b]/60 hover:border-[#f59e0b]'
                      : 'bg-[#1a2332] border-[#2a3a4f] hover:border-slate-500'
                }`}
              >
                <div>
                  {/* Riga 1: Badge Impianto + Frequenza + Stato Scadenza */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9]">
                        {renderIconaTipo(item.tipoImpianto)}
                        <span>{item.tipoImpianto}</span>
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/35 text-purple-300">
                        🔄 {item.frequenza}
                      </span>
                      {item.matricola && (
                        <span className="text-[10px] font-mono text-[#94a3b8] px-1.5 py-0.5 rounded bg-[#0f1720] border border-[#2a3a4f]">
                          Matr: {item.matricola}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-xs font-mono font-extrabold px-2.5 py-1 rounded-lg border tabular-nums shrink-0 ${
                        isScaduta
                          ? 'bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/50'
                          : isInScadenza
                            ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/50'
                            : 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/35'
                      }`}
                    >
                      {stato}
                    </span>
                  </div>

                  {/* Titolo e Oggetto */}
                  <h3 className="text-base font-extrabold text-[#f1f5f9] mt-2.5 leading-snug">
                    {item.titolo}
                  </h3>
                  <p className="text-xs font-semibold text-[#f59e0b] mt-0.5">
                    🔧 {item.impianto}
                  </p>
                  <p className="text-xs text-[#94a3b8] mt-1.5 line-clamp-2 leading-relaxed">
                    {item.descrizione}
                  </p>

                  {/* Info Cliente e Date */}
                  <div className="mt-3.5 pt-3 border-t border-[#2a3a4f] space-y-1.5 text-xs text-[#94a3b8]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#f1f5f9] flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                        <span className="truncate">{item.clienteNome}</span>
                      </span>
                      <span className="font-mono font-bold text-[#10b981] shrink-0">
                        {formattaEuro(item.costoStimato)}
                      </span>
                    </div>

                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">{item.indirizzoCliente}</span>
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#2a3a4f]/70">
                      <div>
                        <span className="text-[10px] uppercase text-[#94a3b8] block">
                          Ultima Esecuzione
                        </span>
                        <span className="font-mono font-medium text-[#f1f5f9] tabular-nums">
                          {formattaDataItaliana(item.ultimaEsecuzione)}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase text-[#94a3b8] block">
                          Prossima Scadenza ({rimanenti.label})
                        </span>
                        <span
                          className={`font-mono font-bold tabular-nums ${rimanenti.classe}`}
                        >
                          📅 {formattaDataItaliana(item.prossimaScadenza)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Azioni: Pianifica in Agenda + Segna Eseguita & Rinnova + Modifica/Elimina */}
                <div className="pt-3 border-t border-[#2a3a4f] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-[#f1f5f9]">
                      👷 {item.tecnicoAssegnato}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onChiamaCliente(item.telefonoCliente, item.clienteNome)
                      }
                      className="p-1.5 rounded-lg bg-[#0f1720] hover:bg-[#10b981]/20 text-[#94a3b8] hover:text-[#10b981] border border-[#2a3a4f]"
                      title="Chiama cliente"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Pulsante primario: Pianifica Uscita in Agenda Settimanale */}
                    <button
                      type="button"
                      onClick={() => onPianificaInterventoInAgenda(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-amber-400 text-[#0f1720] font-extrabold text-xs transition-colors shadow-sm min-h-[34px]"
                      title="Genera un nuovo intervento programmato in agenda con i dati di questa manutenzione"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Pianifica in Agenda</span>
                    </button>

                    {/* Rinnova Ciclo */}
                    <button
                      type="button"
                      onClick={() => onRinnovaManutenzione(item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#10b981]/15 hover:bg-[#10b981] text-[#10b981] hover:text-[#0f1720] border border-[#10b981]/35 font-bold text-xs transition-colors min-h-[34px]"
                      title="Registra come eseguita oggi e calcola la prossima scadenza in base alla ricorrenza"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Eseguita & Rinnova</span>
                    </button>

                    {/* Modifica */}
                    <button
                      type="button"
                      onClick={() => apriModifica(item)}
                      className="p-2 rounded-xl bg-[#0f1720] hover:bg-[#f59e0b]/20 text-[#94a3b8] hover:text-[#f59e0b] border border-[#2a3a4f]"
                      title="Modifica parametri ricorrenza"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Elimina */}
                    <button
                      type="button"
                      onClick={() => onEliminaManutenzione(item.id)}
                      className="p-2 rounded-xl bg-[#0f1720] hover:bg-[#ef4444]/20 text-[#94a3b8] hover:text-[#ef4444] border border-[#2a3a4f]"
                      title="Elimina scadenza"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          4. MODALE INSERIMENTO / MODIFICA SCADENZA RICORRENTE
         ===================================================================== */}
      {modaleAperta && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setModaleAperta(false)}
        >
          <div
            className="bg-[#1a2332] border border-[#2a3a4f] rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[#2a3a4f]">
              <div>
                <span className="text-xs font-mono font-bold text-[#f59e0b]">
                  {inModificaId ? 'MODIFICA SCADENZA' : 'NUOVA SCADENZA RICORRENTE'}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-[#f1f5f9]">
                  Manutenzione Programmata Impianto
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModaleAperta(false)}
                className="p-2 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f]"
                aria-label="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvaForm} className="space-y-4 text-xs sm:text-sm">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Cliente Committente *
                </label>
                <select
                  value={formClienteId}
                  onChange={(e) => setFormClienteId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                >
                  {clienti.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.tipo}) — {c.indirizzo}
                    </option>
                  ))}
                </select>
              </div>

              {/* Impianto & Tipologia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                    Impianto / Modello *
                  </label>
                  <input
                    type="text"
                    required
                    value={formImpianto}
                    onChange={(e) => setFormImpianto(e.target.value)}
                    placeholder="Es. Caldaia Baxi 28kW o Clima Daikin"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                    Reparto Impianto
                  </label>
                  <select
                    value={formTipoImpianto}
                    onChange={(e) =>
                      setFormTipoImpianto(
                        e.target.value as ManutenzioneProgrammataItem['tipoImpianto'],
                      )
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                  >
                    <option value="Idraulico / Termico">🔥 Idraulico / Termico</option>
                    <option value="Elettrico">⚡ Elettrico</option>
                    <option value="Climatizzazione">❄️ Climatizzazione</option>
                  </select>
                </div>
              </div>

              {/* Titolo Operazione */}
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Titolo Operazione Manutenzione *
                </label>
                <input
                  type="text"
                  required
                  value={formTitolo}
                  onChange={(e) => setFormTitolo(e.target.value)}
                  placeholder="Es. Bollino Blu Caldaia & Controllo Rendimento Fumi"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                />
              </div>

              {/* Frequenza Ricorrente & Prossima Scadenza */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                    Frequenza Ricorrenza
                  </label>
                  <select
                    value={formFrequenza}
                    onChange={(e) => {
                      const nuovaFreq = e.target.value as FrequenzaManutenzione;
                      setFormFrequenza(nuovaFreq);
                      setFormProssimaScadenza(
                        calcolaProssimaScadenza(formUltimaEsecuzione, nuovaFreq),
                      );
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                  >
                    {FREQUENZE_DISPONIBILI.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                    Ultima Esecuzione
                  </label>
                  <input
                    type="date"
                    value={formUltimaEsecuzione}
                    onChange={(e) => {
                      setFormUltimaEsecuzione(e.target.value);
                      setFormProssimaScadenza(
                        calcolaProssimaScadenza(e.target.value, formFrequenza),
                      );
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#f59e0b] mb-1">
                    Prossima Scadenza *
                  </label>
                  <input
                    type="date"
                    required
                    value={formProssimaScadenza}
                    onChange={(e) => setFormProssimaScadenza(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#f59e0b]/60 text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                  />
                </div>
              </div>

              {/* Tecnico, Costo e Matricola */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                    Tecnico Assegnato
                  </label>
                  <select
                    value={formTecnico}
                    onChange={(e) => setFormTecnico(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                  >
                    {TECNICI_INIZIALI.map((t) => (
                      <option key={t.id} value={t.nome}>
                        👷 {t.nome} ({t.specializzazione})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                    Canone / Costo (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={formCosto}
                    onChange={(e) => setFormCosto(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                    Matricola / Libretto
                  </label>
                  <input
                    type="text"
                    value={formMatricola}
                    onChange={(e) => setFormMatricola(e.target.value)}
                    placeholder="Es. CIRCE-VI-4910"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none min-h-[40px]"
                  />
                </div>
              </div>

              {/* Descrizione & Note Tecniche */}
              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Descrizione Operazioni & Protocollo
                </label>
                <textarea
                  rows={2}
                  value={formDescrizione}
                  onChange={(e) => setFormDescrizione(e.target.value)}
                  placeholder="Elenco controlli da eseguire in loco..."
                  className="w-full p-2.5 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#94a3b8] mb-1">
                  Note Accesso / Centrale Termica
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Es. Chiavi dal custode o codici cancello"
                  className="w-full px-3 py-2 rounded-xl bg-[#0f1720] border border-[#2a3a4f] text-[#f1f5f9] focus:border-[#f59e0b] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2a3a4f]">
                <button
                  type="button"
                  onClick={() => setModaleAperta(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#0f1720] text-[#94a3b8] hover:text-[#f1f5f9] border border-[#2a3a4f] font-semibold text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#0f1720] font-bold text-xs shadow-md transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {inModificaId ? 'Salva Modifiche' : 'Crea Scadenza Ricorrente'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
