"use client";

import React, { useState, useEffect } from "react";
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
  IconCalendarEvent,
  IconPresentationAnalytics
} from "@tabler/icons-react";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { NativeSelect } from "@/components/ui/native-select";

const CATEGORY_COLORS = [
  '#0d9488', // Teal 600
  '#2563eb', // Blue 600
  '#db2777', // Pink 600
  '#ea580c', // Orange 600
  '#8b5cf6', // Violet 500
  '#16a34a', // Green 600
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
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async (days: number) => {
    setIsLoading(true);
    try {
      // 1. Fetch category sales
      const catRes = await fetch(`/api/dashboard/financial/category-sales?days=${days}`, {
        credentials: "include",
      });
      const catJson = catRes.ok ? await catRes.json() : { success: false };
      
      let mappedCat = [];
      if (catJson.success && Array.isArray(catJson.data)) {
        mappedCat = catJson.data.map((c: any) => ({
          name: c.kategori || "Lainnya",
          value: c.totalSales || 0,
        }));
      }
      
      // Fallback if empty to look pretty
      if (mappedCat.length === 0) {
        mappedCat = [{ name: "Tanpa Kategori", value: 0 }];
      }
      setCategoryData(mappedCat);

      // 2. Fetch daily transactions
      const dailyRes = await fetch("/api/dashboard/financial/daily-transaction", {
        credentials: "include",
      });
      const dailyJson = dailyRes.ok ? await dailyRes.json() : { success: false };
      const dailyTrxFromApi = dailyJson.success ? (dailyJson.data || []) : [];

      // 3. Map timeline N days back up to today
      const mappedTimeline = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, "yyyy-MM-dd"); // Matches YYYY-MM-DD from database format

        const matched = dailyTrxFromApi.find((d: any) => {
          return d.tanggal && d.tanggal.startsWith(dateStr);
        });

        mappedTimeline.push({
          date: format(date, "d MMM", { locale: id }),
          fullDate: format(date, "dd MMM yyyy", { locale: id }),
          penjualan: matched ? matched.pendapatan : 0,
          hpp: matched ? matched.modal : 0,
          laba: matched ? matched.keuntungan : 0,
          transaksi: matched ? matched.jumlahTransaksi : 0,
        });
      }
      setChartData(mappedTimeline);

    } catch (error) {
      console.error("Gagal mengambil data laporan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(parseInt(dateRange));
  }, [dateRange]);

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
  };

  // Calculate totals from mapped timeline
  const totalPendapatan = chartData.reduce((sum, item) => sum + item.penjualan, 0);
  const totalHPP = chartData.reduce((sum, item) => sum + item.hpp, 0);
  const totalLaba = chartData.reduce((sum, item) => sum + item.laba, 0);
  const totalCategoryValue = categoryData.reduce((sum, item) => sum + item.value, 0);

  const renderLegendText = (value: string, entry: any) => {
    if (totalCategoryValue === 0) {
      return <span className="text-zinc-600 font-medium ml-1">{value} (0%)</span>;
    }
    const percent = ((entry.payload.value / totalCategoryValue) * 100).toFixed(1);
    return <span className="text-zinc-600 font-medium ml-1">{value} ({percent}%)</span>;
  };

  const CustomTooltipBar = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-zinc-900 mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-sm text-emerald-600 font-semibold mb-0.5">
            Pendapatan: {formatRupiah(payload[0].payload.penjualan)}
          </p>
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
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 shadow-sm">
            <IconCalendarEvent className="w-4 h-4 text-zinc-500 shrink-0" />
            <NativeSelect
              value={dateRange}
              onChange={handleDateRangeChange}
              options={[
                { value: "7", label: "Mingguan (7 Hari)" },
                { value: "30", label: "Bulanan (30 Hari)" },
              ]}
              className="h-8 bg-transparent border-none focus:ring-0 text-zinc-700 font-medium text-sm w-44"
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <div>
              <h3 className="text-sm font-medium text-zinc-500">Total Pendapatan</h3>
              {isLoading ? (
                <div className="h-8 w-40 bg-zinc-100 rounded animate-pulse mt-3 mb-2" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-2 mb-1">{formatRupiah(totalPendapatan)}</p>
              )}
            </div>
            <div className="text-xs text-zinc-400 font-medium">Periode {dateRange} hari terakhir</div>
          </div>
          {/* Card 2 */}
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <div>
              <h3 className="text-sm font-medium text-zinc-500">Total Pengeluaran (HPP)</h3>
              {isLoading ? (
                <div className="h-8 w-40 bg-zinc-100 rounded animate-pulse mt-3 mb-2" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-2 mb-1">{formatRupiah(totalHPP)}</p>
              )}
            </div>
            <div className="text-xs text-zinc-400 font-medium">Periode {dateRange} hari terakhir</div>
          </div>
          {/* Card 3 */}
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <div>
              <h3 className="text-sm font-medium text-zinc-500">Laba Bersih</h3>
              {isLoading ? (
                <div className="h-8 w-40 bg-zinc-100 rounded animate-pulse mt-3 mb-2" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2 mb-1">{formatRupiah(totalLaba)}</p>
              )}
            </div>
            <div className="text-xs text-zinc-400 font-medium">Periode {dateRange} hari terakhir</div>
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
            <div className="h-[300px] w-full flex items-center justify-center relative">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <div className="w-8 h-8 border-2 border-zinc-200 border-t-teal-600 rounded-full animate-spin mb-1" />
                  <span className="text-xs">Memuat grafik...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-zinc-400 text-sm">Tidak ada data untuk ditampilkan</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 11 }} 
                      dy={10}
                      interval={dateRange === "30" ? 4 : 0} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      tickFormatter={(value) => `Rp ${value / 1000000}jt`}
                    />
                    <Tooltip content={<CustomTooltipBar />} cursor={{ fill: '#f4f4f5' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px' }} />
                    <Bar 
                      dataKey="laba" 
                      name="Keuntungan" 
                      fill="#14b8a6" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Right Chart: Grafik Penjualan Per Kategori */}
          <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-900">Penjualan per Kategori</h2>
              <p className="text-sm text-zinc-500">Distribusi pendapatan berdasarkan kategori produk</p>
            </div>
            <div className="h-[300px] w-full flex items-center justify-center relative">
              {isLoading ? (
                <div className="flex flex-col items-center gap-2 text-zinc-400">
                  <div className="w-8 h-8 border-2 border-zinc-200 border-t-teal-600 rounded-full animate-spin mb-1" />
                  <span className="text-xs">Memuat grafik...</span>
                </div>
              ) : totalCategoryValue === 0 ? (
                <div className="text-zinc-400 text-sm flex flex-col items-center gap-1">
                  <IconPresentationAnalytics className="w-8 h-8 text-zinc-300" />
                  <span>Tidak ada data kategori</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={90}
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
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
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
                  <th className="pb-3 font-semibold">Tanggal</th>
                  <th className="pb-3 font-semibold text-right">Jml Transaksi</th>
                  <th className="pb-3 font-semibold text-right">Pendapatan</th>
                  <th className="pb-3 font-semibold text-right">HPP / Modal</th>
                  <th className="pb-3 font-semibold text-right">Laba Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        Memuat data rincian...
                      </div>
                    </td>
                  </tr>
                ) : chartData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-400">
                      Belum ada transaksi pada periode ini.
                    </td>
                  </tr>
                ) : (
                  [...chartData].reverse().map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/20 transition-colors">
                      <td className="py-4 font-semibold text-zinc-900 whitespace-nowrap">{row.fullDate}</td>
                      <td className="py-4 text-right text-zinc-600 font-medium">{row.transaksi}</td>
                      <td className="py-4 text-right font-semibold text-zinc-900 whitespace-nowrap">{formatRupiah(row.penjualan)}</td>
                      <td className="py-4 text-right text-zinc-600 whitespace-nowrap font-medium">{formatRupiah(row.hpp)}</td>
                      <td className="py-4 text-right font-semibold text-emerald-600 whitespace-nowrap">{formatRupiah(row.laba)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
