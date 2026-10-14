import { useLocation, useNavigate } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ArrowLeft, Download, PieChart as PieIcon, Award, Layers, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { exportElementAsPng, exportBrandSummaryCsv } from '../lib/exportUtils';
import { SAMPLE_DATASETS } from '../lib/sampleDatasets';
import { SalesRow } from '../lib/ml';

import CarDataTable from '../components/CarDataTable';

export default function CarDashboard() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const uploadedData: SalesRow[] = state?.salesData || SAMPLE_DATASETS[0].rows;

  const totalSales = uploadedData.reduce((sum, r) => sum + r.sales, 0);

  // Group by brand
  const brandStatsMap = uploadedData.reduce((acc: Record<string, { name: string; value: number }>, item) => {
    const brandName = item.brand || 'Unspecified';
    if (!acc[brandName]) {
      acc[brandName] = { name: brandName, value: 0 };
    }
    acc[brandName].value += item.sales;
    return acc;
  }, {});

  const brandStats = Object.values(brandStatsMap)
    .sort((a, b) => b.value - a.value)
    .map((b) => ({
      ...b,
      percentage: totalSales > 0 ? ((b.value / totalSales) * 100).toFixed(1) : '0.0',
    }));

  const topBrand = brandStats[0] || { name: 'N/A', value: 0, percentage: '0' };
  const avgSalesPerBrand = brandStats.length > 0 ? Math.round(totalSales / brandStats.length) : 0;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#8b5cf6', '#14b8a6'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center space-x-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Predictor</span>
            </Button>
            <div className="h-4 w-[1px] bg-slate-700 mx-2" />
            <h1 className="text-base font-semibold text-white tracking-tight flex items-center space-x-2">
              <PieIcon className="h-4 w-4 text-emerald-400" />
              <span>Brand Distribution & Market Share Analytics</span>
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            <CarDataTable />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportBrandSummaryCsv(brandStats)}
              className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportElementAsPng('brand-analytics-panel', 'predictx_brand_analytics.png')}
              className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              Download PNG
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="brand-analytics-panel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Total Volume</div>
                <div className="text-xl font-bold text-white mt-0.5">{totalSales.toLocaleString()} units</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Top Performer</div>
                <div className="text-xl font-bold text-emerald-400 mt-0.5">
                  {topBrand.name} ({topBrand.percentage}%)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Unique Segments</div>
                <div className="text-xl font-bold text-purple-300 mt-0.5">{brandStats.length} Brands</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800">
            <CardContent className="p-4 flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Avg Sales / Brand</div>
                <div className="text-xl font-bold text-amber-300 mt-0.5">{avgSalesPerBrand.toLocaleString()} units</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Table Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Donut Chart View */}
          <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Market Share Distribution</h2>
              <p className="text-xs text-slate-400 mt-0.5">Relative sales volume contribution by brand segment.</p>
            </div>

            <div className="h-[340px] w-full my-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={brandStats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={115}
                    paddingAngle={3}
                  >
                    {brandStats.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} units`, 'Volume']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="text-center text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
              Generated from {uploadedData.length} records of historical sales data
            </div>
          </div>

          {/* Breakdown List & Progress Bars */}
          <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight">Segment Volume Ranking</h2>
              <p className="text-xs text-slate-400 mt-0.5">Detailed breakdown of total sales and proportional share.</p>
            </div>

            <div className="space-y-4 pt-2">
              {brandStats.map((b, i) => (
                <div key={b.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-200 flex items-center space-x-2">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span>{b.name}</span>
                    </span>
                    <span className="text-slate-400 font-mono">
                      {b.value.toLocaleString()} units ({b.percentage}%)
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${b.percentage}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
