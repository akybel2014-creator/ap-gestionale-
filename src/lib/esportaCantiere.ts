import { formattaDataItaliana, formattaEuro } from '@/data.js';
import type { InterventoItem } from '@/components/rossi/HomeDashboard';

/**
 * Escapa un campo testuale per il formato CSV (separatore punto e virgola ';' ottimale per Excel in italiano)
 */
function escapeCsvField(valore: unknown): string {
  const testo = String(valore ?? '')
    .replace(/\r?\n|\r/g, ' ')
    .trim();
  if (testo.includes(';') || testo.includes('"') || testo.includes(',')) {
    return `"${testo.replace(/"/g, '""')}"`;
  }
  return testo;
}

/**
 * Genera e avvia il download del file CSV con l'elenco degli interventi odierni
 * Include BOM UTF-8 (\uFEFF) per la corretta lettura dei caratteri accentati e del simbolo € in Excel/Numbers
 */
export function esportaInterventiOdierniCsv(
  interventiOggi: InterventoItem[],
  dataIso: string,
): void {
  const dataIt = formattaDataItaliana(dataIso);

  const intestazioni = [
    'Data',
    'Ora Inizio',
    'Ora Fine',
    'Stato',
    'Tecnico',
    'Cliente',
    'Titolo Intervento',
    'Reparto / Tipo',
    'Priorità',
    'Indirizzo Cantiere',
    'Telefono Cliente',
    'Importo Stimato (EUR)',
    'Note Tecniche e Materiali',
  ];

  const righe = interventiOggi.map((item) => [
    dataIt,
    item.oraInizio,
    item.oraFine || '',
    item.stato,
    item.tecnico,
    item.clienteNome,
    item.titolo,
    item.tipo,
    item.priorita,
    item.indirizzo,
    item.telefonoCliente,
    String(item.importoStimato ?? 0),
    item.noteTecniche || item.descrizione || '',
  ]);

  const contenutoCsv =
    '\uFEFF' +
    [
      intestazioni.map(escapeCsvField).join(';'),
      ...righe.map((r) => r.map(escapeCsvField).join(';')),
    ].join('\r\n');

  const blob = new Blob([contenutoCsv], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Interventi_Oggi_${dataIso}_Rossi_Impianti.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Rimuove o converte caratteri non ASCII per garantire compatibilità nativa con il font standard Helvetica Type1 nello stream PDF
 */
function normalizzaTestoPdf(input: string): string {
  return String(input || '')
    .replace(/€/g, 'EUR ')
    .replace(/[—–]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/à/g, 'a\'')
    .replace(/è/g, 'e\'')
    .replace(/é/g, 'e\'')
    .replace(/ì/g, 'i\'')
    .replace(/ò/g, 'o\'')
    .replace(/ù/g, 'u\'')
    .replace(/°/g, ' gradi ')
    .replace(/Ø/g, 'diam. ')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Spezza una stringa lunga in più righe per l'impaginazione nel foglio PDF A4
 */
function spezzaRighePdf(testo: string, maxCaratteri = 84): string[] {
  const parole = testo.split(/\s+/).filter(Boolean);
  const righe: string[] = [];
  let rigaCorrente = '';

  for (const parola of parole) {
    if (!rigaCorrente) {
      rigaCorrente = parola;
    } else if (rigaCorrente.length + 1 + parola.length <= maxCaratteri) {
      rigaCorrente += ` ${parola}`;
    } else {
      righe.push(rigaCorrente);
      rigaCorrente = parola;
    }
  }
  if (rigaCorrente) {
    righe.push(rigaCorrente);
  }
  return righe.length > 0 ? righe : [''];
}

/**
 * Costruisce un file binario PDF 1.4 valido (formato A4 verticale) con il Foglio di Lavoro Giornaliero
 * di Rossi Impianti pronto per la consultazione offline in cantiere su smartphone, tablet o PC.
 */
export function esportaInterventiOdierniPdf(
  interventiOggi: InterventoItem[],
  dataIso: string,
): void {
  const dataIt = formattaDataItaliana(dataIso);
  const totaleStimato = interventiOggi.reduce(
    (acc, cur) => acc + (Number(cur.importoStimato) || 0),
    0,
  );

  // Costruzione dei comandi grafici/testuali PDF (coordinate A4: 595 x 842 pt)
  const comandiStream: string[] = [];

  // Fascia intestazione arancione ambra / scura in alto
  comandiStream.push('0.06 0.09 0.13 rg');
  comandiStream.push('36 765 523 48 re f');
  comandiStream.push('0.96 0.62 0.04 rg');
  comandiStream.push('36 762 523 4 re f');

  // Titolo intestazione nel box
  comandiStream.push('BT');
  comandiStream.push('/F2 15 Tf');
  comandiStream.push('1 1 1 rg');
  comandiStream.push('48 790 Td');
  comandiStream.push(
    `(${normalizzaTestoPdf('ROSSI IMPIANTI S.R.L. - FOGLIO INTERVENTI DI CANTIERE')}) Tj`,
  );
  comandiStream.push('/F1 9.5 Tf');
  comandiStream.push('0.85 0.88 0.92 rg');
  comandiStream.push('0 -15 Td');
  comandiStream.push(
    `(${normalizzaTestoPdf(`Data Operativa: ${dataIt}  |  Interventi in programma: ${interventiOggi.length}  |  Valore complessivo: ${formattaEuro(totaleStimato)}`)}) Tj`,
  );
  comandiStream.push('ET');

  let y = 740;

  const aggiungiRigaTesto = (
    testo: string,
    opzioni?: { grassetto?: boolean; size?: number; indent?: number },
  ) => {
    if (y < 55) return; // evita overflow pagina singola A4
    const font = opzioni?.grassetto ? '/F2' : '/F1';
    const size = opzioni?.size ?? 9.5;
    const x = 40 + (opzioni?.indent ?? 0);
    comandiStream.push('BT');
    comandiStream.push(`${font} ${size} Tf`);
    comandiStream.push('0.08 0.12 0.18 rg');
    comandiStream.push(`${x} ${y} Td`);
    comandiStream.push(`(${normalizzaTestoPdf(testo)}) Tj`);
    comandiStream.push('ET');
    y -= size + 5;
  };

  if (interventiOggi.length === 0) {
    aggiungiRigaTesto(
      'Nessun intervento programmato per la giornata odierna.',
      { grassetto: true, size: 11 },
    );
  } else {
    interventiOggi.forEach((item, idx) => {
      if (y < 110) return;

      // Linea separatrice scheda
      comandiStream.push('0.82 0.86 0.90 RG');
      comandiStream.push('0.8 w');
      comandiStream.push(`36 ${y + 6} m 559 ${y + 6} l S`);
      y -= 8;

      // 1. Riga Orario + Stato + Titolo
      aggiungiRigaTesto(
        `${idx + 1}. [${item.oraInizio}${item.oraFine ? '-' + item.oraFine : ''}]  (${item.stato.toUpperCase()})  ${item.titolo}`,
        { grassetto: true, size: 11 },
      );

      // 2. Riga Tecnico + Reparto + Importo + Telefono
      aggiungiRigaTesto(
        `Tecnico: ${item.tecnico}   |   Reparto: ${item.tipo}   |   Priorita: ${item.priorita}   |   Tel: ${item.telefonoCliente}   |   Importo: ${formattaEuro(item.importoStimato)}`,
        { grassetto: false, size: 9, indent: 12 },
      );

      // 3. Riga Indirizzo
      aggiungiRigaTesto(`Indirizzo Cantiere: ${item.indirizzo}`, {
        grassetto: true,
        size: 9.5,
        indent: 12,
      });

      // 4. Descrizione lavoro (spezzata su più righe se necessario)
      if (item.descrizione) {
        const righeDesc = spezzaRighePdf(
          `Lavorazione: ${item.descrizione}`,
          86,
        );
        for (const r of righeDesc) {
          aggiungiRigaTesto(r, { grassetto: false, size: 9, indent: 12 });
        }
      }

      // 5. Note tecniche e materiali da furgone
      if (item.noteTecniche) {
        const righeNote = spezzaRighePdf(
          `Note / Materiali furgone: ${item.noteTecniche}`,
          86,
        );
        for (const r of righeNote) {
          aggiungiRigaTesto(r, { grassetto: false, size: 9, indent: 12 });
        }
      }

      y -= 6;
    });
  }

  // Piè di pagina con firma tecnico e orario generazione
  comandiStream.push('0.75 0.80 0.86 RG');
  comandiStream.push('0.6 w');
  comandiStream.push('36 48 m 559 48 l S');
  comandiStream.push('BT');
  comandiStream.push('/F1 8.5 Tf');
  comandiStream.push('0.35 0.42 0.50 rg');
  comandiStream.push('40 34 Td');
  comandiStream.push(
    `(${normalizzaTestoPdf(`Rossi Impianti - Via dell'Artigianato 14, Vicenza (VI) - Documento per consultazione offline in cantiere (${dataIt})`)}) Tj`,
  );
  comandiStream.push('ET');

  const streamContent = comandiStream.join('\n');

  // Costruzione struttura oggetti PDF 1.4
  const oggettiPdf = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdfRaw = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of oggettiPdf) {
    offsets.push(pdfRaw.length);
    pdfRaw += obj;
  }

  const xrefStart = pdfRaw.length;
  pdfRaw += `xref\n0 ${oggettiPdf.length + 1}\n`;
  pdfRaw += '0000000000 65535 f \n';
  for (let i = 1; i <= oggettiPdf.length; i++) {
    pdfRaw += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdfRaw += `trailer\n<< /Size ${oggettiPdf.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdfRaw], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Foglio_Cantiere_${dataIso}_Rossi_Impianti.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Genera un file binario PDF 1.4 valido (formato A4) per una singola Fattura Elettronica di Rossi Impianti
 */
export function esportaFatturaPdf(fattura: {
  numero: string;
  cliente: string;
  indirizzoCliente: string;
  pivaCliente: string;
  descrizione: string;
  importoImponibile: number;
  ivaPercentuale: number;
  importo: number;
  data: string;
  scadenza: string;
  stato: string;
  metodoPagamento: string;
}): void {
  const comandiStream: string[] = [];

  // Fascia intestazione arancione/scura
  comandiStream.push('0.06 0.09 0.13 rg');
  comandiStream.push('36 755 523 58 re f');
  comandiStream.push('0.96 0.62 0.04 rg');
  comandiStream.push('36 752 523 4 re f');

  comandiStream.push('BT');
  comandiStream.push('/F2 15 Tf');
  comandiStream.push('1 1 1 rg');
  comandiStream.push('48 788 Td');
  comandiStream.push(
    `(${normalizzaTestoPdf('ROSSI IMPIANTI S.R.L. - FATTURA CORTESIA / PROSPETTO')}) Tj`,
  );
  comandiStream.push('/F1 9.5 Tf');
  comandiStream.push('0.85 0.88 0.92 rg');
  comandiStream.push('0 -16 Td');
  comandiStream.push(
    `(${normalizzaTestoPdf('Via dell\'Artigianato 14, 36100 Vicenza (VI) - P.IVA IT03948120240')}) Tj`,
  );
  comandiStream.push('ET');

  let y = 715;
  const riga = (testo: string, bold = false, size = 10.5) => {
    comandiStream.push('BT');
    comandiStream.push(`${bold ? '/F2' : '/F1'} ${size} Tf`);
    comandiStream.push('0.08 0.12 0.18 rg');
    comandiStream.push(`44 ${y} Td`);
    comandiStream.push(`(${normalizzaTestoPdf(testo)}) Tj`);
    comandiStream.push('ET');
    y -= size + 7;
  };

  riga(`FATTURA N.: ${fattura.numero}     |     STATO: ${fattura.stato.toUpperCase()}`, true, 12);
  riga(
    `Data Emissione: ${formattaDataItaliana(fattura.data)}     |     Scadenza: ${formattaDataItaliana(fattura.scadenza)}`,
    false,
    10,
  );
  riga(`Modalita di Pagamento: ${fattura.metodoPagamento}`, false, 10);

  y -= 10;
  riga('DESTINATARIO / COMMITTENTE:', true, 11);
  riga(`Cliente: ${fattura.cliente}`, true, 10.5);
  riga(`Indirizzo: ${fattura.indirizzoCliente}`, false, 10);
  riga(`P.IVA / Codice Fiscale: ${fattura.pivaCliente}`, false, 10);

  y -= 10;
  riga('OGGETTO DELLA FORNITURA / INTERVENTO IMPIANTISTICO:', true, 11);
  for (const r of spezzaRighePdf(fattura.descrizione, 82)) {
    riga(r, false, 10);
  }

  y -= 14;
  const ivaValore = fattura.importo - fattura.importoImponibile;
  riga('RIEPILOGO CONTABILE:', true, 11);
  riga(`Imponibile Lavori: ${formattaEuro(fattura.importoImponibile, true)}`, false, 10.5);
  riga(`IVA (${fattura.ivaPercentuale}%): ${formattaEuro(ivaValore, true)}`, false, 10.5);
  riga(`TOTALE FATTURA: ${formattaEuro(fattura.importo, true)}`, true, 13);

  const streamContent = comandiStream.join('\n');
  const oggettiPdf = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ];

  let pdfRaw = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of oggettiPdf) {
    offsets.push(pdfRaw.length);
    pdfRaw += obj;
  }
  const xrefStart = pdfRaw.length;
  pdfRaw += `xref\n0 ${oggettiPdf.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= oggettiPdf.length; i++) {
    pdfRaw += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdfRaw += `trailer\n<< /Size ${oggettiPdf.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdfRaw], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fattura.numero.replace('/', '-')}_Rossi_Impianti.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

