import { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import CarDashboard from "./pages/CarDashboard";

import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Upload,
  TrendingUp,
  Brain,
  FileText,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type SalesRow = {
  date: string;
  sales: number;
  brand?: string; // used for dashboard pie chart
};

type ChartPoint = {
  date: string;
  actual?: number;
  predicted?: number;
};

/**
 * Main UI of your app (existing screen)
 */
function MainApp() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [model, setModel] = useState("linear-regression"); // fixed to LR
  const [futureDays, setFutureDays] = useState("30");
  const [hasResults, setHasResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [salesData, setSalesData] = useState<SalesRow[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [mae, setMae] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // --- CSV parsing helper ---
  const parseCsv = (text: string): SalesRow[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error("CSV must have a header and at least one data row.");
    }

    const headerLine = lines[0];
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

    const dateIdx = headers.findIndex((h) => h === "date");
    const salesIdx = headers.findIndex((h) => h === "sales");
    const brandIdx = headers.findIndex((h) => h === "brand"); // optional

    if (dateIdx === -1 || salesIdx === -1) {
      throw new Error("CSV must have 'date' and 'sales' columns.");
    }

    const rows = lines.slice(1);
    const data: SalesRow[] = [];

    for (const line of rows) {
      if (!line.trim()) continue;
      const cols = line.split(",");
      if (cols.length <= Math.max(dateIdx, salesIdx)) continue;

      const date = cols[dateIdx].trim();
      const sales = Number(cols[salesIdx]);
      const brand =
        brandIdx !== -1 && cols.length > brandIdx
          ? cols[brandIdx].trim() || undefined
          : undefined;

      if (!date || isNaN(sales)) continue;

      data.push({ date, sales, brand });
    }

    if (data.length < 3) {
      throw new Error("Need at least 3 valid rows of data.");
    }

    // Sort by date so our time index is in order
    data.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return data;
  };

  // --- Linear regression helper ---
  const fitLinearRegression = (data: SalesRow[]) => {
    const n = data.length;
    const xs = data.map((_, i) => i + 1); // 1..n
    const ys = data.map((d) => d.sales);

    const meanX = xs.reduce((sum, x) => sum + x, 0) / n;
    const meanY = ys.reduce((sum, y) => sum + y, 0) / n;

    let num = 0;
    let den = 0;

    for (let i = 0; i < n; i++) {
      const dx = xs[i] - meanX;
      const dy = ys[i] - meanY;
      num += dx * dy;
      den += dx * dx;
    }

    const slope = den === 0 ? 0 : num / den;
    const intercept = meanY - slope * meanX;

    return { slope, intercept };
  };

  // --- Build chart data + MAE + Accuracy ---
  const buildChartDataAndMetrics = (
    data: SalesRow[],
    slope: number,
    intercept: number,
    future: number
  ) => {
    const n = data.length;
    const points: ChartPoint[] = [];

    // Historical part (actual + model's predicted)
    for (let i = 0; i < n; i++) {
      const t = i + 1;
      const predicted = intercept + slope * t;
      points.push({
        date: data[i].date,
        actual: data[i].sales,
        predicted,
      });
    }

    // Forecast future days (only predicted)
    const lastDate = new Date(data[n - 1].date);
    for (let i = 1; i <= future; i++) {
      const t = n + i;
      const predicted = intercept + slope * t;
      const futureDate = new Date(lastDate);
      futureDate.setDate(lastDate.getDate() + i);
      points.push({
        date: futureDate.toISOString().slice(0, 10),
        predicted,
      });
    }

    // Simple test MAE on last 20% of history
    const startTest = Math.floor(n * 0.8);
    let errorSum = 0;
    let count = 0;

    for (let i = startTest; i < n; i++) {
      const t = i + 1;
      const pred = intercept + slope * t;
      const actual = data[i].sales;
      errorSum += Math.abs(pred - actual);
      count++;
    }

    const mae = count > 0 ? errorSum / count : null;

    // Accuracy (%) based on MAE vs average actual in test set
    let accuracy: number | null = null;
    if (mae !== null && count > 0) {
      const testData = data.slice(startTest);
      const avgActual =
        testData.reduce((sum, d) => sum + d.sales, 0) / testData.length;
      if (avgActual !== 0) {
        accuracy = Math.max(0, 100 - (mae / avgActual) * 100);
      }
    }

    return { points, mae, accuracy };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setHasResults(false);
    setMae(null);
    setAccuracy(null);
    setChartData([]);

    if (!e.target.files || !e.target.files[0]) {
      setSelectedFile(null);
      setSalesData([]);
      return;
    }

    const file = e.target.files[0];
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = parseCsv(text);
        setSalesData(parsed);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to parse CSV.");
        setSalesData([]);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsText(file);
  };

  const handlePredict = () => {
    setError(null);

    if (!salesData.length) {
      setError("Please upload a valid CSV first.");
      return;
    }

    const future = Math.min(Math.max(Number(futureDays) || 0, 1), 365);

    setIsProcessing(true);
    try {
      const { slope, intercept } = fitLinearRegression(salesData);
      const { points, mae, accuracy } = buildChartDataAndMetrics(
        salesData,
        slope,
        intercept,
        future
      );
      setChartData(points);
      setMae(mae);
      setAccuracy(accuracy);
      setHasResults(true);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate predictions."
      );
      setHasResults(false);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Brain className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-white text-xl font-bold">🚀 PredictX</h1>
                <p className="text-slate-400 text-sm">
                   AI-Powered Sales Forecasting Dashboard
                </p>
              </div>
            </div>

            {/* 🔗 Button to open animated dashboard with uploaded CSV */}
            <Button
              onClick={() => navigate("/dashboard", { state: { salesData } })}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
              disabled={salesData.length === 0}
            >
              📈 Open Sales Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left Panel - Upload & Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Card */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Upload className="size-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Upload CSV</CardTitle>
                    <CardDescription>
                      CSV with <code>date</code>, <code>sales</code> and optional{" "}
                      <code>brand</code> columns
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload" className="text-slate-300">
                    Data File
                  </Label>
                  <div className="relative">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="bg-slate-900/50 border-slate-600 text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer"
                    />
                  </div>
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-400 mt-2">
                      <CheckCircle2 className="size-4" />
                      <span>{selectedFile.name}</span>
                    </div>
                  )}
                  {error && (
                    <p className="text-sm text-red-400 mt-2">{error}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Model Configuration Card */}
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Brain className="size-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">
                      Model Configuration
                    </CardTitle>
                    <CardDescription>
                      Linear Regression time trend
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="model" className="text-slate-300">
                    Model
                  </Label>
                  {/* Locked to Linear Regression for now */}
                  <Select value={model} onValueChange={setModel} disabled>
                    <SelectTrigger
                      id="model"
                      className="bg-slate-900/50 border-slate-600 text-slate-300"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear-regression">
                        Linear Regression
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Prototype uses a simple linear trend model on the client
                    side.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="days" className="text-slate-300">
                    Predict Future Days
                  </Label>
                  <Input
                    id="days"
                    type="number"
                    value={futureDays}
                    onChange={(e) => setFutureDays(e.target.value)}
                    min="1"
                    max="365"
                    className="bg-slate-900/50 border-slate-600 text-slate-300"
                  />
                </div>

                <Button
                  onClick={handlePredict}
                  disabled={!salesData.length || isProcessing}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <TrendingUp className="size-4 mr-2" />
                      Generate Forecast
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-slate-700 bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <FileText className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-300">
                    <p>
                      Upload a CSV file containing your historical sales data.
                      The app will fit a simple linear trend and forecast future
                      sales.
                    </p>
                    <p className="text-slate-400 mt-2 text-xs">
                      Example header:{" "}
                      <code>date,sales,brand</code> with dates like{" "}
                      <code>2024-01-01</code>.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 🔍 Car Sales Data Button + Modal (inside left panel) */}
            
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-3">
            <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <BarChart3 className="size-5 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Results</CardTitle>
                    <CardDescription>
                      Prediction analysis and visualization
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!hasResults ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="p-4 bg-slate-700/30 rounded-full mb-4">
                      <TrendingUp className="size-12 text-slate-500" />
                    </div>
                    <p className="text-slate-400">
                      Upload a CSV file and click Generate Forecast to see
                      results
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                      Your predictions will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-400 text-sm">
                          Error (MAE)
                        </p>
                        <p className="text-white mt-1">
                          {mae !== null ? mae.toFixed(2) : "N/A"}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-400 text-sm">
                          Accuracy
                        </p>
                        <p className="text-white mt-1">
                          {accuracy !== null
                            ? `${accuracy.toFixed(2)}%`
                            : "N/A"}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-400 text-sm">Model</p>
                        <p className="text-white mt-1">
                          Linear Regression
                        </p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <p className="text-slate-400 text-sm">
                          Future Days
                        </p>
                        <p className="text-white mt-1">{futureDays}</p>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <h3 className="text-white mb-4">
                        Sales Prediction Forecast
                      </h3>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={chartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#334155"
                          />
                          <XAxis dataKey="date" stroke="#94a3b8" />
                          <YAxis stroke="#94a3b8" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#1e293b",
                              border: "1px solid #334155",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="actual"
                            fill="#8b5cf6"
                            name="Actual"
                            barSize={20}
                          />
                          <Bar
                            dataKey="predicted"
                            fill="#3b82f6"
                            name="Predicted"
                            barSize={20}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Insights */}
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
                      <div className="flex gap-3">
                        <CheckCircle2 className="size-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-green-400 mb-1">
                            Prediction Complete
                          </p>
                          <p className="text-slate-300 text-sm">
                            Based on your historical data, a linear trend model
                            has been fitted and used to forecast the next{" "}
                            {futureDays} days of sales. Actual and predicted
                            values are shown as grouped bars for easy
                            comparison, with MAE and an approximate accuracy
                            percentage summarizing model performance on recent
                            data.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * App with routes:
 *  /          → main prediction UI
 *  /dashboard → animated dashboard (pie, top brand, etc.)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/dashboard" element={<CarDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
