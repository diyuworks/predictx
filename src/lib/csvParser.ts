import { SalesRow } from './ml';

/** Split one CSV line, honouring double-quoted fields (e.g. "Toyota, Japan"). */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseSalesCsv(text: string): SalesRow[] {
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const salesIdx = headers.indexOf('sales');
  const brandIdx = headers.indexOf('brand');

  if (dateIdx === -1 || salesIdx === -1) {
    throw new Error("CSV must include 'date' and 'sales' columns.");
  }

  const data: SalesRow[] = [];
  for (const rawLine of lines.slice(1)) {
    const line = rawLine.trim();
    if (!line) continue;

    const cols = splitCsvLine(line);
    if (cols.length <= Math.max(dateIdx, salesIdx)) continue;

    const rawDate = cols[dateIdx].trim();
    const rawSalesText = cols[salesIdx].trim();
    const rawSales = rawSalesText === '' ? NaN : Number(rawSalesText);
    const rawBrand = brandIdx !== -1 && cols.length > brandIdx ? cols[brandIdx].trim() : undefined;

    // Skip rows with an unparseable date, a non-numeric sales value, or negative sales.
    if (!rawDate || Number.isNaN(Date.parse(rawDate)) || !Number.isFinite(rawSales) || rawSales < 0) {
      continue;
    }

    data.push({ date: rawDate, sales: rawSales, brand: rawBrand || 'General' });
  }

  if (data.length < 3) {
    throw new Error('Dataset must contain at least 3 valid rows of historical sales data.');
  }

  data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return data;
}

/**
 * Collapse multiple rows that share a date into one daily total.
 * The forecasting engine models ONE value per date; feeding it duplicate dates
 * (e.g. several brands on the same day) would corrupt the time index.
 * Brand-level analytics should keep using the original, un-aggregated rows.
 */
export function aggregateByDate(rows: SalesRow[]): SalesRow[] {
  const totals = new Map<string, number>();
  for (const r of rows) {
    totals.set(r.date, (totals.get(r.date) ?? 0) + r.sales);
  }
  return Array.from(totals, ([date, sales]) => ({ date, sales })).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
