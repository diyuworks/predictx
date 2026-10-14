import { useState, useEffect, useId } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import CarDashboard from './pages/CarDashboard';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import {
  Upload,
  TrendingUp,
  Brain,
  FileSpreadsheet,
  Download,
  PieChart as PieIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  BarChart2,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  SalesRow,
  ChartPoint,
  ModelType,
  ModelEvaluation,
  ModelMetrics,
  runForecastingEngine,
} from './lib/ml';
import { SAMPLE_DATASETS } from './lib/sampleDatasets';
import { parseSalesCsv, aggregateByDate } from './lib/csvParser';
import { exportForecastCsv, exportElementAsPng } from './lib/exportUtils';

function MainForecastingView() {
  const navigate = useNavigate();
  const chartContainerId = useId().replace(/:/g, '') || 'forecast-chart-panel';

  // State
  const [salesData, setSalesData] = useState<SalesRow[]>(SAMPLE_DATASETS[0].rows);
  const [dataOrigin, setDataOrigin] = useState<string>('Car Sales Demo (Automotive)');
  const [selectedModel, setSelectedModel] = useState<ModelType | 'auto'>('auto');
  const [futureDays, setFutureDays] = useState<number>(30);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Model Results State
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>([]);
  const [bestModelType, setBestModelType] = useState<ModelType>('linear');
  const [activeMetrics, setActiveMetrics] = useState<ModelMetrics | null>(null);

  // Run Forecast function
  const executeForecast = (dataToForecast = salesData, modelChoice = selectedModel, horizon = futureDays) => {
    if (!dataToForecast || dataToForecast.length < 3) {
      setError('Dataset must contain at least 3 rows to generate a forecast.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = runForecastingEngine(aggregateByDate(dataToForecast), modelChoice, horizon);
      setChartData(result.chartData);
      setEvaluations(result.evaluations);
      setBestModelType(result.bestModelType);
      setActiveMetrics(result.selectedMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error computing forecast.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Initial load
  useEffect(() => {
    executeForecast(SAMPLE_DATASETS[0].rows, 'auto', 30);
  }, []);

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = parseSalesCsv(reader.result as string);
        setSalesData(parsed);
        setDataOrigin(file.name);
        executeForecast(parsed, selectedModel, futureDays);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid CSV file format.');
      }
    };

    reader.onerror = () => {
      setError('Failed to read uploaded file.');
    };

    reader.readAsText(file);
  };

  // Handle Demo dataset selection
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (!sample) return;

    setSalesData(sample.rows);
    setDataOrigin(sample.name);
    executeForecast(sample.rows, selectedModel, futureDays);
  };

  // Re-run on parameter changes
  const handleModelChange = (val: string) => {
    const newModel = val as ModelType | 'auto';
    setSelectedModel(newModel);
    executeForecast(salesData, newModel, futureDays);
  };

  const handleHorizonChange = (val: number) => {
    const safeHorizon = Math.max(1, Math.min(365, val));
    setFutureDays(safeHorizon);
    executeForecast(salesData, selectedModel, safeHorizon);
  };

  // Total forecast calculation
  const futurePoints = chartData.filter((d) => d.actual === undefined && d.predicted !== undefined);
  const totalForecastedUnits = Math.round(futurePoints.reduce((acc, p) => acc + (p.predicted || 0), 0));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">PredictX</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">AI Sales Forecasting & Predictive Analytics</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard', { state: { salesData } })}
              className="bg-slate-800/80 border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center space-x-2"
            >
              <PieIcon className="h-4 w-4 text-emerald-400" />
              <span>Brand Analytics</span>
              <span className="ml-1 px-1.5 py-0.2 rounded bg-slate-700 text-[10px] text-slate-300">
                {salesData.length} records
              </span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/50 flex items-start space-x-3 text-red-200">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <strong className="font-semibold">Dataset Error: </strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Configuration Section: Ingestion & Parameters */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Data Ingestion Card */}
          <Card className="lg:col-span-6 bg-slate-900/50 border-slate-800 shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                  <span>Data Ingestion</span>
                </CardTitle>
                <span className="text-xs text-slate-400 truncate max-w-[200px]" title={dataOrigin}>
                  Active: {dataOrigin}
                </span>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Upload historical sales CSV or load a preconfigured demo dataset.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* File Upload Box */}
                <div className="relative border border-dashed border-slate-700 hover:border-indigo-500 transition-colors rounded-lg p-4 text-center bg-slate-950/40 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                  <span className="text-xs font-medium text-slate-300 block">Upload CSV</span>
                  <span className="text-[10px] text-slate-500">Headers: date, sales, brand</span>
                </div>

                {/* Preconfigured Demo Datasets */}
                <div className="border border-slate-800 rounded-lg p-3 bg-slate-950/40 flex flex-col justify-between">
                  <div className="text-xs font-medium text-slate-300 mb-2 flex items-center space-x-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Try Sample Dataset</span>
                  </div>
                  <div className="space-y-1.5">
                    {SAMPLE_DATASETS.map((sample) => (
                      <button
                        key={sample.id}
                        onClick={() => handleSelectSample(sample.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors truncate ${
                          dataOrigin === sample.name
                            ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-200'
                            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {sample.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span className="flex items-center space-x-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{salesData.length} records parsed</span>
                </span>
                <span>Date range: {salesData[0]?.date} to {salesData[salesData.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>

          {/* Model & Horizon Parameters Card */}
          <Card className="lg:col-span-6 bg-slate-900/50 border-slate-800 shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Brain className="h-4 w-4 text-emerald-400" />
                <span>Model & Forecast Horizon</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Select algorithm architecture and specify future projection horizon.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Algorithm Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Forecasting Algorithm</Label>
                  <Select value={selectedModel} onValueChange={handleModelChange}>
                    <SelectTrigger className="bg-slate-950/60 border-slate-700 text-xs text-slate-200">
                      <SelectValue placeholder="Select Algorithm" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 text-slate-200 text-xs">
                      <SelectItem value="auto">Auto (Select Optimal Model)</SelectItem>
                      <SelectItem value="linear">Linear Regression (Trend)</SelectItem>
                      <SelectItem value="exponential">Holt's Exponential Smoothing</SelectItem>
                      <SelectItem value="moving_avg">Moving Average (Momentum)</SelectItem>
                      <SelectItem value="polynomial">Polynomial Regression (Degree 2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Horizon Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Forecast Horizon (Days Ahead)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={futureDays}
                      onChange={(e) => handleHorizonChange(Number(e.target.value))}
                      className="bg-slate-950/60 border-slate-700 text-xs text-slate-200"
                    />
                    <div className="flex space-x-1">
                      {[14, 30, 60, 90].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleHorizonChange(d)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border ${
                            futureDays === d
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Info className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    Active Model:{' '}
                    <strong className="text-slate-200">
                      {selectedModel === 'auto' ? `Auto (${bestModelType})` : selectedModel}
                    </strong>
                  </span>
                </span>
                <Button
                  size="sm"
                  onClick={() => executeForecast(salesData, selectedModel, futureDays)}
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 px-3"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  Recalculate
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Executive Metrics Overview */}
        {activeMetrics && (
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Model Accuracy</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{activeMetrics.accuracy}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Based on 100 - MAPE</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Mean Abs Error (MAE)</div>
                <div className="text-2xl font-bold text-slate-100 mt-1">{activeMetrics.mae}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Average unit variance</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Root Mean Sq Err (RMSE)</div>
                <div className="text-2xl font-bold text-slate-100 mt-1">{activeMetrics.rmse}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Penalizes large outliers</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Goodness of Fit (R²)</div>
                <div className="text-2xl font-bold text-indigo-400 mt-1">{activeMetrics.r2}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Variance explained</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Forecast Horizon</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">+{futureDays} Days</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Out-of-sample projection</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/40 border-slate-800">
              <CardContent className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Projected Units</div>
                <div className="text-2xl font-bold text-purple-400 mt-1">{totalForecastedUnits.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Cumulative expected sales</div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Primary Forecast Chart Section */}
        <section id={chartContainerId} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center space-x-2">
                <BarChart2 className="h-5 w-5 text-indigo-400" />
                <span>Historical Sales & Predictive Trajectory</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Blue indicates observed actual sales. Emerald represents model predictions with a shaded approximate 95% prediction band.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportForecastCsv(chartData)}
                className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs h-8"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportElementAsPng(chartContainerId, 'predictx_forecast_chart.png')}
                className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs h-8"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-slate-400" />
                Export PNG
              </Button>
            </div>
          </div>

          <div className="h-[420px] w-full pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <defs>
                  <linearGradient id="confidenceArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  dy={10}
                  tickFormatter={(val) => (val ? val.slice(5) : '')}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  dx={-5}
                  tickFormatter={(val) => Number(val).toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any, name: string) => {
                    if (value === undefined || value === null) return ['-', name];
                    if (name === 'upperBound') return [`${value} units`, 'Upper Bound (approx. 95%)'];
                    if (name === 'lowerBound') return [`${value} units`, 'Lower Bound (approx. 95%)'];
                    if (name === 'predicted') return [`${value} units`, 'Model Forecast'];
                    if (name === 'actual') return [`${value} units`, 'Actual Sales'];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}
                />

                {/* Shaded Approximate 95% Prediction Band for Future Projections */}
                <Area
                  type="monotone"
                  dataKey="upperBound"
                  stroke="none"
                  fill="url(#confidenceArea)"
                  name="Approx. 95% Prediction Band"
                  isAnimationActive={false}
                />

                {/* Actual Sales Line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Sales"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#38bdf8' }}
                  activeDot={{ r: 6 }}
                />

                {/* Predicted / Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Forecasted Trend"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 2.5, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Model Evaluation & Leaderboard */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Algorithm Benchmark & Leaderboard</h3>
              <p className="text-xs text-slate-400">
                Performance evaluated on out-of-sample test split (20% holdout). Lower MAE and RMSE indicate higher accuracy.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Optimal Model: {bestModelType}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 rounded-l">Model Architecture</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">MAE</th>
                  <th className="py-2.5 px-3">RMSE</th>
                  <th className="py-2.5 px-3">MAPE</th>
                  <th className="py-2.5 px-3">R² Score</th>
                  <th className="py-2.5 px-4 rounded-r text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {evaluations.map((ev) => {
                  const isActive =
                    selectedModel === ev.modelType ||
                    (selectedModel === 'auto' && ev.modelType === bestModelType);

                  return (
                    <tr
                      key={ev.modelType}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isActive ? 'bg-indigo-950/20 text-white font-medium' : ''
                      }`}
                    >
                      <td className="py-3 px-4 flex items-center space-x-2">
                        <span>{ev.name}</span>
                        {ev.isBest && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Optimal
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs">{ev.description}</td>
                      <td className="py-3 px-3 font-mono">{ev.metrics.mae}</td>
                      <td className="py-3 px-3 font-mono">{ev.metrics.rmse}</td>
                      <td className="py-3 px-3 font-mono">{ev.metrics.mape}%</td>
                      <td className="py-3 px-3 font-mono text-indigo-400">{ev.metrics.r2}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleModelChange(ev.modelType)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px]"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>PredictX Dashboard • Machine Learning Sales Forecasting</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainForecastingView />} />
        <Route path="/dashboard" element={<CarDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
