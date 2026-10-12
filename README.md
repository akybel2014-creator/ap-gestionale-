# 🏗️ Rossi Impianti — Gestione Impianti Idraulici ed Elettrici

Web app completa **mobile-first** in italiano per la gestione operativa da cantiere e da ufficio di un'impresa di impianti idraulici, termici ed elettrici operante a **Vicenza e provincia**.

## 🚀 Avvio Rapido

Assicurati di avere Node.js installato sul tuo sistema, quindi esegui i comandi seguenti nella cartella del progetto:

```bash
# 1. Installa le dipendenze del progetto
npm install

# 2. Avvia il server di sviluppo (accessibile su http://localhost:3000)
npm run dev
```

Per compilare la versione di produzione:

```bash
npm run build
```

---

## 🧱 Stack Tecnologico & Design System

- **React 18 + Vite** (Architettura modulare a componenti separati)
- **Tailwind CSS** configurato con palette scura ad alto contrasto per visibilità in cantiere:
  - Sfondo principale: `#0f1720`
  - Superfici Card: `#1a2332` con bordo `#2a3a4f`
  - Accento primario: `#f59e0b` (Arancione Ambra)
  - Successo: `#10b981` (Verde Smeraldo)
  - Errore / Urgenza: `#ef4444` (Rosso)
- **Lucide React** per l'iconografia tecnica e operativa
- **LocalStorage** per la persistenza automatica di clienti, interventi, preventivi, fatture e avvisi (nessun backend richiesto per l'operatività gestionale)

---

## 📂 Struttura dei File Principali

- `data.js` / `src/data.js`: Dati mock completi (8 clienti di Vicenza e provincia, 15 interventi distribuiti nella settimana corrente, 5 preventivi, 10 fatture dell'anno, 3 tecnici: Luca, Andrea, Marco).
- `src/components/RossiImpiantiApp.tsx`: Contenitore principale con gestione stato e sincronizzazione automatica in `localStorage`.
- `src/components/rossi/HeaderENavigazione.tsx`: Header fisso con logo `🏗️ Rossi Impianti`, centro notifiche dinamico, avatar `MR`, Bottom Navigation mobile (5 voci) e Sidebar laterale su desktop.
- `src/components/rossi/HomeDashboard.tsx`: Pagina 1 (Home) con saluto a Mario, 3 KPI Card (`OGGI`, `PREVENTIVI`, `MESE`), 3 Azioni rapide, card Interventi di oggi, grafico Andamento settimana (Lun-Dom) e sezione Avvisi.
- `src/components/rossi/AgendaSettimanale.tsx`: Pagina 2 (Agenda) con vista calendario settimanale a 7 colonne per fasce orarie, filtro per tecnico e pulsante `+` flottante.
- `src/components/rossi/GestioneClienti.tsx`: Pagina 3 (Clienti) con ricerca in tempo reale, lista clienti e modale scheda dettaglio (anagrafica, P.IVA, storico interventi, preventivi associati, note interne).
- `src/components/rossi/GestioneFatture.tsx`: Pagina 4 (Fatture) con totali annui, filtri per mese/anno/stato, lista fatture e modale dettaglio con scaricamento PDF.
- `src/components/rossi/ReportStatistiche.tsx`: Pagina 5 (Report) con grafico fatturato mensile (Line Chart SVG), Top 5 clienti, grafico a torta interventi per tipo, ore lavorate per tecnico e confronto anno precedente.
- `src/components/rossi/ModaliOperative.tsx`: Modali per visualizzazione dettagli, creazione e modifica di interventi, clienti e preventivi.
