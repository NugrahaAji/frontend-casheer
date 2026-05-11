"use client";

import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  IconCalendarEvent
} from "@tabler/icons-react";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";

// Generate dummy report data for daily profits
const generateChartData = (days: number) => {
  const data = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const penjualan = Math.floor(Math.random() * 5000000) + 1000000;
    const hpp = Math.floor(penjualan * 0.6); // Modal
    const laba = penjualan - hpp;
    
    data.push({
      date: format(date, "d MMM", { locale: id }),
      fullDate: format(date, "dd MMM yyyy", { locale: id }),
      penjualan,
      hpp,
      laba,
      transaksi: Math.floor(Math.random() * 50) + 10,
    });
  }
  return data;
};

// Generate dummy data for category sales
const generateCategoryData = () => {
  return [
    { name: 'Makanan', value: 15400000 },
    { name: 'Minuman', value: 8200000 },
    { name: 'Snack', value: 5300000 },
    { name: 'Rokok', value: 12500000 },
    { name: 'Lainnya', value: 2100000 },
  ];
};

const CATEGORY_COLORS = [
  'var(--color-chart-1)', 
  'var(--color-chart-2)', 
  'var(--color-chart-3)', 
  'var(--color-chart-4)', 
  'var(--color-chart-5)'
];

const formatRupiah = (number: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

export default function LaporanPage() {
  const [dateRange, setDateRange] = useState("7");
  const [chartData, setChartData] = useState(() => generateChartData(7));
  const [categoryData] = useState(() => generateCategoryData());

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = parseInt(e.target.value);
    setDateRange(e.target.value);
    setChartData(generateChartData(days));
  };

  // Calculate totals from data
  const totalPendapatan = chartData.reduce((sum, item) => sum + item.penjualan, 0);
  const totalHPP = chartData.reduce((sum, item) => sum + item.hpp, 0);
  const totalLaba = chartData.reduce((sum, item) => sum + item.laba, 0);
  const totalCategoryValue = categoryData.reduce((sum, item) => sum + item.value, 0);

  const renderLegendText = (value: string, entry: any) => {
    const percent = ((entry.payload.value / totalCategoryValue) * 100).toFixed(1);
    return <span className="text-zinc-600 font-medium ml-1">{value} ({percent}%)</span>;
  };

  const CustomTooltipBar = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-zinc-900 mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-sm text-[#14b8a6] font-semibold">
            Keuntungan: {formatRupiah(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltipPie = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-zinc-900 mb-1">{payload[0].name}</p>
          <p className="text-sm text-zinc-600 font-medium">
            Pendapatan: {formatRupiah(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Laporan Keuangan</h1>
            <p className="text-sm text-zinc-500 mt-1">Laporan penjualan dan rincian transaksi toko Anda</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-sm">
            <IconCalendarEvent className="w-4 h-4 text-zinc-500" />
            <select 
              value={dateRange}
              onChange={handleDateRangeChange}
              className="bg-transparent text-sm font-medium text-zinc-700 outline-none cursor-pointer appearance-none pr-6"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2371717a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '0.65rem auto' }}
            >
              <option value="7">Mingguan (7 Hari)</option>
              <option value="30">Bulanan (30 Hari)</option>
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 mb-4">Total Pendapatan</h3>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">{formatRupiah(totalPendapatan)}</p>
            <div className="flex items-center text-sm text-emerald-600 font-medium">
              +12.5% dari periode lalu
            </div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 mb-4">Total Pengeluaran</h3>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">{formatRupiah(totalHPP)}</p>
            <div className="flex items-center text-sm text-rose-600 font-medium">
              +4.2% dari periode lalu
            </div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-medium text-zinc-500 mb-4">Laba Bersih</h3>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">{formatRupiah(totalLaba)}</p>
            <div className="flex items-center text-sm text-emerald-600 font-medium">
              +15.8% dari periode lalu
            </div>
          </div>
        </div>

        {/* Charts Section: 2 Charts Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Chart: Grafik Keuntungan */}
          <div className="lg:col-span-3 bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-900">Grafik Keuntungan</h2>
              <p className="text-sm text-zinc-500">Total laba bersih harian</p>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }} 
                    dy={10}
                    interval={dateRange === "30" ? 4 : 0} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(value) => `Rp ${value / 1000000}jt`}
                  />
                  <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#f4f4f5' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                  <Bar 
                    dataKey="laba" 
                    name="Keuntungan" 
                    fill="#14b8a6" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Chart: Grafik Penjualan Per Kategori */}
          <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-900">Penjualan per Kategori</h2>
              <p className="text-sm text-zinc-500">Distribusi pendapatan berdasarkan kategori produk</p>
            </div>
            <div className="h-[300px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipPie />} />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    formatter={renderLegendText}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Detail Table */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Rincian Laporan</h2>
          <p className="text-sm text-zinc-500 mb-6">Tabel rincian laporan per hari</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-zinc-500 border-b border-zinc-100">
                <tr>
                  <th className="pb-3 font-medium">Tanggal</th>
                  <th className="pb-3 font-medium text-right">Jml Transaksi</th>
                  <th className="pb-3 font-medium text-right">Pendapatan</th>
                  <th className="pb-3 font-medium text-right">HPP / Modal</th>
                  <th className="pb-3 font-medium text-right">Laba Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {[...chartData].reverse().map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-4 font-medium text-zinc-900 whitespace-nowrap">{row.fullDate}</td>
                    <td className="py-4 text-right text-zinc-600">{row.transaksi}</td>
                    <td className="py-4 text-right font-medium text-zinc-900 whitespace-nowrap">{formatRupiah(row.penjualan)}</td>
                    <td className="py-4 text-right text-zinc-600 whitespace-nowrap">{formatRupiah(row.hpp)}</td>
                    <td className="py-4 text-right font-medium text-zinc-900 whitespace-nowrap">{formatRupiah(row.laba)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
