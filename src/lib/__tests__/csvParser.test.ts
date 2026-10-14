import { describe, it, expect } from 'vitest';
import { parseSalesCsv, aggregateByDate } from '../csvParser';

describe('parseSalesCsv', () => {
  it('parses a valid CSV and sorts chronologically', () => {
    const rows = parseSalesCsv('date,sales,brand\n2024-01-03,30,B\n2024-01-01,10,A\n2024-01-02,20,A');
    expect(rows.map((r) => r.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect(rows[0]).toEqual({ date: '2024-01-01', sales: 10, brand: 'A' });
  });

  it('defaults brand to "General" when the column is absent', () => {
    const rows = parseSalesCsv('date,sales\n2024-01-01,1\n2024-01-02,2\n2024-01-03,3');
    expect(rows.every((r) => r.brand === 'General')).toBe(true);
  });

  it('handles CRLF line endings, a BOM and quoted fields containing commas', () => {
    const csv = 'date,sales,brand\r\n2024-01-01,1,"Toyota, Japan"\r\n2024-01-02,2,Honda\r\n2024-01-03,3,Ford';
    const rows = parseSalesCsv(csv);
    expect(rows[0].brand).toBe('Toyota, Japan');
    expect(rows).toHaveLength(3);
  });

  it('skips rows with bad dates, non-numeric or negative sales', () => {
    const csv = [
      'date,sales',
      '2024-01-01,10',
      'not-a-date,20',
      '2024-01-03,abc',
      '2024-01-04,-5',
      '2024-01-05,',
      '2024-01-06,30',
      '2024-01-07,40',
    ].join('\n');
    expect(parseSalesCsv(csv).map((r) => r.sales)).toEqual([10, 30, 40]);
  });

  it('throws when required columns are missing', () => {
    expect(() => parseSalesCsv('day,units\n2024-01-01,1')).toThrow(/date.*sales/i);
  });

  it('throws when fewer than 3 valid rows remain', () => {
    expect(() => parseSalesCsv('date,sales\n2024-01-01,1\n2024-01-02,2')).toThrow();
  });
});

describe('aggregateByDate', () => {
  it('sums rows sharing a date and returns them sorted', () => {
    const out = aggregateByDate([
      { date: '2024-01-02', sales: 5, brand: 'A' },
      { date: '2024-01-01', sales: 1, brand: 'A' },
      { date: '2024-01-01', sales: 2, brand: 'B' },
    ]);
    expect(out).toEqual([
      { date: '2024-01-01', sales: 3 },
      { date: '2024-01-02', sales: 5 },
    ]);
  });
});
