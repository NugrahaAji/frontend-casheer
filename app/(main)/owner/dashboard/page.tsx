"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  IconCalendarEvent,
  IconPackage,
  IconCurrencyDollar,
  IconReceipt,
  IconTrendingUp
} from "@tabler/icons-react";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";

const generateChartData = (days: number, apiData: any[] = []) => {
  const data = [];
  const today = new Date();
  
  // Buat map cepat untuk pencarian penjualan real-time
  const apiMap: Record<string, number> = {};
  if (Array.isArray(apiData)) {
    apiData.forEach((item) => {
      // format tanggal dari backend "YYYY-MM-DD"
      apiMap[item.date] = item.totalSales || 0;
    });
  }

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(today, i);
    const dateKey = format(date, "yyyy-MM-dd");
    const penjualan = apiMap[dateKey] || 0;

    data.push({
      date: format(date, "d MMM", { locale: id }),
      fullDate: format(date, "dd MMM yyyy", { locale: id }),
      penjualan: penjualan,
    });
  }
  return data;
};

const formatRupiah = (number: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);

export default function OwnerDashboardPage() {
  const [dateRange, setDateRange] = useState("14");
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);

  // States untuk summary (KPI)
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalExpense: 0,
    netProfit: 0,
  });
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // States untuk Stok Menipis
  const [lowStocks, setLowStocks] = useState<any[]>([]);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  // States untuk Produk Terlaris
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [isLoadingTopProducts, setIsLoadingTopProducts] = useState(true);

  // States untuk Aktivitas Terbaru
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  // ─── Fetch Data Dashboard ──────────────────────────────────────────────────
  const fetchSummary = async (days: number) => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`/api/dashboard/owner/summary?days=${days}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setSummary({
          totalRevenue: data.data.totalRevenue || 0,
          totalExpense: data.data.totalExpense || 0,
          netProfit: data.data.netProfit || 0,
        });
      }
    } catch (e) {
      console.error("Gagal memuat ringkasan owner:", e);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const fetchChartData = async (days: number) => {
    setIsLoadingChart(true);
    try {
      const res = await fetch(`/api/dashboard/owner/sales-chart?days=${days}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success) {
        const formatted = generateChartData(days, data.data || []);
        setChartData(formatted);
      }
    } catch (e) {
      console.error("Gagal memuat grafik penjualan:", e);
    } finally {
      setIsLoadingChart(false);
    }
  };

  const fetchTopProducts = async () => {
    setIsLoadingTopProducts(true);
    try {
      const res = await fetch("/api/dashboard/owner/top-products?limit=5", { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success) {
        const mapped = (data.data || []).map((p: any) => ({
          id: p.kodeProduk,
          name: p.namaProduk,
          sold: p.jumlahTerjual,
          revenue: p.revenue,
        }));
        setTopProducts(mapped);
      }
    } catch (e) {
      console.error("Gagal memuat produk terlaris:", e);
    } finally {
      setIsLoadingTopProducts(false);
    }
  };

  const fetchRecentActivities = async () => {
    setIsLoadingActivities(true);
    try {
      const res = await fetch("/api/dashboard/owner/recent-transactions?limit=5", { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success) {
        const mapped = (data.data || []).map((trx: any) => ({
          id: trx.kodeTransaksi,
          type: "Penjualan Baru",
          trx: trx.kodeTransaksi,
          amount: trx.total,
          date: new Date(trx.createdAt).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setRecentActivities(mapped);
      }
    } catch (e) {
      console.error("Gagal memuat transaksi terbaru:", e);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const fetchLowStocks = async () => {
    setIsLoadingStocks(true);
    try {
      const res = await fetch("/api/dashboard/owner/low-stock?threshold=10", { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success) {
        const mapped = (data.data || []).map((p: any) => ({
          id: p.kodeProduk,
          name: p.namaProduk,
          sku: p.kodeProduk.slice(0, 8).toUpperCase(),
          stock: p.stokAkhir,
        }));
        setLowStocks(mapped);
      }
    } catch (e) {
      console.error("Gagal memuat produk stok menipis:", e);
    } finally {
      setIsLoadingStocks(false);
    }
  };

  // Muat data saat pertama kali dimuat
  useEffect(() => {
    const days = parseInt(dateRange);
    fetchSummary(days);
    fetchChartData(days);
    fetchTopProducts();
    fetchRecentActivities();
    fetchLowStocks();
  }, []);

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = parseInt(e.target.value);
    setDateRange(e.target.value);
    fetchSummary(days);
    fetchChartData(days);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-zinc-900 mb-1">{payload[0].payload.fullDate}</p>
          <p className="text-sm text-[#14b8a6] font-semibold">
            Penjualan: {formatRupiah(payload[0].value)}
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard Pemilik</h1>
            <p className="text-sm text-zinc-500 mt-1">Analisis keuangan dan performa bisnis</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-sm">
            <IconCalendarEvent className="w-4 h-4 text-zinc-500" />
            <select
              value={dateRange}
              onChange={handleDateRangeChange}
              className="bg-transparent text-sm font-medium text-zinc-700 outline-none cursor-pointer appearance-none pr-6"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2371717a%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '0.65rem auto' }}
            >
              <option value="7">7 Hari Terakhir</option>
              <option value="14">14 Hari Terakhir</option>
              <option value="30">30 Hari Terakhir</option>
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100">
              <IconCurrencyDollar className="w-6 h-6 text-teal-600" stroke={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-zinc-500 mb-1">Total Pendapatan</h3>
              {isLoadingSummary ? (
                <div className="h-8 w-32 bg-zinc-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{formatRupiah(summary.totalRevenue)}</p>
              )}
            </div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
              <IconReceipt className="w-6 h-6 text-rose-600" stroke={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-zinc-500 mb-1">Total Pengeluaran</h3>
              {isLoadingSummary ? (
                <div className="h-8 w-32 bg-zinc-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{formatRupiah(summary.totalExpense)}</p>
              )}
            </div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
              <IconTrendingUp className="w-6 h-6 text-indigo-600" stroke={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-zinc-500 mb-1">Laba Bersih</h3>
              {isLoadingSummary ? (
                <div className="h-8 w-32 bg-zinc-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{formatRupiah(summary.netProfit)}</p>
              )}
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">Grafik Penjualan Harian</h2>
            <p className="text-sm text-zinc-500">Total penjualan per hari dalam rentang waktu terpilih</p>
          </div>
          <div className="h-[300px] w-full flex items-center justify-center">
            {isLoadingChart ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                Memuat grafik penjualan...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} tickFormatter={(value) => `Rp ${value / 1000000}jt`} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                  <Bar dataKey="penjualan" name="Penjualan" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Produk Terlaris</h2>
            <p className="text-sm text-zinc-500 mb-6">Top 5 produk dengan penjualan tertinggi</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-zinc-500 border-b border-zinc-100">
                  <tr>
                    <th className="pb-3 font-medium">Produk</th>
                    <th className="pb-3 font-medium text-right">Terjual</th>
                    <th className="pb-3 font-medium text-right">Pendapatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {isLoadingTopProducts ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-zinc-500">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                          Memuat produk terlaris...
                        </div>
                      </td>
                    </tr>
                  ) : topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-zinc-400 text-sm">
                        Belum ada penjualan tercatat.
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((product, idx) => (
                      <tr key={product.id || idx}>
                        <td className="py-4 flex items-center gap-3">
                          <span className="text-zinc-400 font-medium w-4">{idx + 1}</span>
                          <span className="font-medium text-zinc-900">{product.name}</span>
                        </td>
                        <td className="py-4 text-right text-zinc-600">{product.sold} unit</td>
                        <td className="py-4 text-right font-medium text-zinc-900">{formatRupiah(product.revenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">Aktivitas Terbaru</h2>
            <p className="text-sm text-zinc-500 mb-6">Timeline aktivitas terkini</p>
            <div className="space-y-6">
              {isLoadingActivities ? (
                <div className="py-8 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                    Memuat aktivitas...
                  </div>
                </div>
              ) : recentActivities.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm py-8">Belum ada aktivitas transaksi.</p>
              ) : (
                recentActivities.map((activity, idx) => (
                  <div key={activity.id || idx} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center border border-teal-100">
                        <IconPackage className="w-4 h-4 text-teal-500" stroke={1.5} />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-zinc-900">{activity.type}</h4>
                      <p className="text-[13px] text-zinc-500 mt-0.5">
                        {activity.trx} - {formatRupiah(activity.amount)}
                      </p>
                      <p className="text-[12px] text-zinc-400 mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Low Stock — fetched from backend */}
        <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">Stok Menipis</h2>
          <p className="text-sm text-zinc-500 mb-6">Produk dengan stok di bawah minimum (≤ 10)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-zinc-500 border-b border-zinc-100">
                <tr>
                  <th className="pb-3 font-medium">Produk</th>
                  <th className="pb-3 font-medium">Kode</th>
                  <th className="pb-3 font-medium">Stok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {isLoadingStocks ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        Memuat data stok...
                      </div>
                    </td>
                  </tr>
                ) : lowStocks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-zinc-500 text-sm">
                      ✅ Semua stok dalam kondisi aman.
                    </td>
                  </tr>
                ) : (
                  lowStocks.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 font-medium text-zinc-900">{item.name}</td>
                      <td className="py-4 text-zinc-500 font-mono text-xs">{item.sku}</td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.stock === 0
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {item.stock === 0 ? "Habis" : `${item.stock} tersisa`}
                        </span>
                      </td>
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
