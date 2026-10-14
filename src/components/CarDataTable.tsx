import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Table as TableIcon, X, Search, Download, AlertCircle } from 'lucide-react';

interface CarData {
  id: number;
  date?: string;
  brand: string;
  model?: string;
  year?: number | null;
  price?: number | null;
  sales: number;
}

export default function CarDataTable() {
  const [open, setOpen] = useState(false);
  const [carData, setCarData] = useState<CarData[]>([]);
  const [search, setSearch] = useState('');
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch data from backend API
  useEffect(() => {
    if (!open) return;

    setIsLoading(true);
    setBackendError(null);

    fetch('http://127.0.0.1:8000/api/car-data/')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setCarData(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('Backend not reachable:', err);
        setBackendError(
          'The Django backend is optional and not running. To view database records, start the backend server with: cd backend && python manage.py runserver'
        );
        setCarData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open]);

  // Filter by brand or model
  const filtered = carData.filter(
    (row) =>
      row.brand?.toLowerCase().includes(search.toLowerCase()) ||
      (row.model && row.model.toLowerCase().includes(search.toLowerCase()))
  );

  // Download CSV
  const downloadCSV = () => {
    const header = 'id,date,brand,model,year,price,sales\n';
    const rows = carData
      .map(
        (r) =>
          `${r.id},${r.date || ''},${r.brand},${r.model || ''},${r.year ?? ''},${r.price ?? ''},${r.sales}`
      )
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'car_sales_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 text-xs flex items-center justify-center space-x-1.5 h-8"
      >
        <TableIcon className="h-3.5 w-3.5 text-indigo-400" />
        <span>Database Records</span>
      </Button>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-4xl shadow-2xl text-slate-100">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-base font-semibold flex items-center space-x-2">
                <TableIcon className="h-4 w-4 text-indigo-400" />
                <span>Backend Database Records</span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Backend notice if offline */}
            {backendError && (
              <div className="mb-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-200/90 text-xs flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{backendError}</span>
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search brand or model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={carData.length === 0}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-80 border border-slate-800 rounded-lg">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Brand</th>
                    <th className="p-2.5">Model</th>
                    <th className="p-2.5">Year</th>
                    <th className="p-2.5">Price</th>
                    <th className="p-2.5">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center p-6 text-slate-400">
                        Loading database records...
                      </td>
                    </tr>
                  ) : filtered.length > 0 ? (
                    filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono">{row.id}</td>
                        <td className="p-2.5 text-slate-400">{row.date || '-'}</td>
                        <td className="p-2.5">{row.brand}</td>
                        <td className="p-2.5 text-slate-400">{row.model || '-'}</td>
                        <td className="p-2.5 font-mono text-slate-400">{row.year ?? '-'}</td>
                        <td className="p-2.5 font-mono">
                          {row.price !== null && row.price !== undefined
                            ? `$${row.price.toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="p-2.5 font-mono">{row.sales}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center p-6 text-slate-500">
                        {backendError ? 'Backend is offline.' : 'No records found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / Download */}
            <div className="mt-4 flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
              <span className="text-slate-400">{filtered.length} records displayed</span>
              <Button
                size="sm"
                onClick={downloadCSV}
                disabled={carData.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 flex items-center space-x-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download CSV</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
