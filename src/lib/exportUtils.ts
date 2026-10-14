import html2canvas from 'html2canvas';
import { ChartPoint } from './ml';

export function exportForecastCsv(data: ChartPoint[], filename = 'predictx_forecast_export.csv') {
  const headers = ['Date', 'Actual Sales', 'Predicted Sales', 'Lower Bound (approx. 95%)', 'Upper Bound (approx. 95%)'];
  const rows = data.map((d) => [
    d.date,
    d.actual !== undefined ? d.actual : '',
    d.predicted !== undefined ? d.predicted : '',
    d.lowerBound !== undefined ? d.lowerBound : '',
    d.upperBound !== undefined ? d.upperBound : '',
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportBrandSummaryCsv(
  brands: { name: string; value: number; percentage: string }[],
  filename = 'predictx_brand_analytics.csv'
) {
  const headers = ['Brand', 'Total Sales Units', 'Market Share Percentage'];
  const rows = brands.map((b) => [b.name, b.value, `${b.percentage}%`]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportElementAsPng(elementId: string, filename = 'predictx_dashboard.png'): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f172a',
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error('Failed to export PNG:', err);
    return false;
  }
}
