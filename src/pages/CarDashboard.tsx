import { useLocation, useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export default function CarDashboard() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const uploadedData = state?.salesData || [];

  const totalSales = uploadedData.reduce((sum: any, r: any) => sum + r.sales, 0);

  const brandStats = Object.values(
    uploadedData.reduce((acc: any, item: any) => {
      acc[item.brand] = acc[item.brand] || { name: item.brand, value: 0 };
      acc[item.brand].value += item.sales;
      return acc;
    }, {})
  ).map((b: any) => ({
    ...b,
    percentage: ((b.value / totalSales) * 100).toFixed(2),
  }));

  const COLORS = ["#10b981", "#f97316", "#3b82f6", "#a855f7", "#fbbf24"];

  return (
    <div className="min-h-screen bg-slate-900 text-white px-8 py-10">
      <div className="max-w-5xl mx-auto space-y-10">

        {/* ✅ Title Row */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-semibold">Car Sales Dashboard</h1>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
          >
            ← Back to Predictor
          </button>
        </div>

        {/* ✅ PIE CHART SECTION */}
        <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
          <h2 className="text-center text-lg mb-6 font-medium">
            Brand Sales Share (%)
          </h2>

          <div className="flex justify-center">
            <PieChart width={380} height={320}>
              <Pie
                data={brandStats}
                dataKey="value"
                nameKey="name"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={3}
              >
                {brandStats.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1e293b", borderRadius: "8px" }}
              />
              <Legend />
            </PieChart>
          </div>

          {/* ✅ Download button */}
          <div className="text-center mt-6">
            <button className="px-5 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg">
              ⬇ Download Chart as PNG
            </button>
          </div>
        </div>

        {/* ✅ BRAND BREAKDOWN */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl mb-4 font-medium">Brand Breakdown</h3>

          <ul className="space-y-2 text-slate-300">
            {brandStats.map((b: any, i: number) => (
              <li
                key={i}
                className="flex justify-between border-b border-slate-700 pb-2"
              >
                <span>{b.name}</span>
                <span>
                  {b.value} sales • {b.percentage}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
