import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";

interface CarData {
  id: number;
  brand: string;
  model: string;
  price: number;
  sales: number;
}

export default function CarDataTable() {
  const [open, setOpen] = useState(false);
  const [carData, setCarData] = useState<CarData[]>([]);
  const [search, setSearch] = useState("");

  // ✅ Fetch data from backend API
  useEffect(() => {
    if (!open) return;

    fetch("http://127.0.0.1:8000/api/car-data/")
      .then((res) => res.json())
      .then((data) => setCarData(data))
      .catch(() => console.error("Failed to fetch car data"));
  }, [open]);

  // ✅ Filter by brand or model
  const filtered = carData.filter(
    (row) =>
      row.brand.toLowerCase().includes(search.toLowerCase()) ||
      row.model.toLowerCase().includes(search.toLowerCase())
  );

  // ✅ Download CSV
  const downloadCSV = () => {
    const header = "id,brand,model,price,sales\n";
    const rows = carData
      .map((r) => `${r.id},${r.brand},${r.model},${r.price},${r.sales}`)
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "car_sales_data.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* ✅ Button that opens modal */}
      <Button
        onClick={() => setOpen(true)}
        className="w-full bg-slate-700 text-white hover:bg-slate-600"
      >
        📋 View Car Sales Data
      </Button>

      {/* ✅ Simple Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-4xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Car Sales Data</h2>
              <Button
                onClick={() => setOpen(false)}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                ✖ Close
              </Button>
            </div>

            {/* 🔍 Search */}
            <input
              type="text"
              placeholder="Search brand or model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full mb-3 border rounded-lg px-3 py-2"
            />

            {/* 🧾 Table */}
            <div className="overflow-auto max-h-80 border rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 border">ID</th>
                    <th className="p-2 border">Brand</th>
                    <th className="p-2 border">Model</th>
                    <th className="p-2 border">Price</th>
                    <th className="p-2 border">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length > 0 ? (
                    filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="p-2 border">{row.id}</td>
                        <td className="p-2 border">{row.brand}</td>
                        <td className="p-2 border">{row.model}</td>
                        <td className="p-2 border">₹{row.price}</td>
                        <td className="p-2 border">{row.sales}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="text-center p-3 text-gray-500">
                        No matching results
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ✅ Download Button */}
            <div className="mt-4 text-right">
              <Button
                onClick={downloadCSV}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                ⬇ Download CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
