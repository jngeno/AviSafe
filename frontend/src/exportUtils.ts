// Client-side export helpers -- turn already-fetched real API data into
// downloadable files. Nothing here talks to a new backend endpoint or
// invents data; it only serializes what's already on screen.

export function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n');
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  downloadBlob(filename, toCsv(rows), 'text/csv;charset=utf-8');
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json');
}

// Strips the most common markdown syntax down to plain text so a
// narrative report reads cleanly as PDF body text, without pulling in
// a full markdown renderer for a one-off export.
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '- ')
    .replace(/\|/g, '  ');
}

export async function downloadMarkdownAsPdf(filename: string, title: string, markdown: string) {
  const [{ jsPDF }] = await Promise.all([import('jspdf')]);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  pdf.setFontSize(14);
  const titleLines = pdf.splitTextToSize(title, maxWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 6 + 4;

  pdf.setFontSize(10);
  const bodyLines = pdf.splitTextToSize(stripMarkdown(markdown), maxWidth);
  const lineHeight = 5;

  for (const line of bodyLines) {
    if (y + lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += lineHeight;
  }

  pdf.save(filename);
}
