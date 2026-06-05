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
  Legend,
} from "recharts";
import {
  IconCalendarEvent,
  IconPackage,
  IconCurrencyDollar,
  IconReceipt,
  IconTrendingUp,
} from "@tabler/icons-react";
import { format, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { NativeSelect } from "@/components/ui/native-select";

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

// Menentukan formatter sumbu-Y secara dinamis berdasarkan nilai maksimum data
function getYAxisFormatter(data: { penjualan: number }[]) {
  const maxVal = Math.max(...data.map((d) => d.penjualan || 0), 0);

  if (maxVal >= 1_000_000_000) {
    // Miliar
    return (v: number) => `${+(v / 1_000_000_000).toFixed(1)}M`;
  }
  if (maxVal >= 1_000_000) {
    // Jutaan
    return (v: number) => `${+(v / 1_000_000).toFixed(1)}jt`;
  }
  if (maxVal >= 1_000) {
    // Ribuan
    return (v: number) => `${+(v / 1_000).toFixed(0)}rb`;
  }
  // Di bawah seribu — tampilkan angka mentah
  return (v: number) => `Rp ${v}`;
}

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
      const res = await fetch(`/api/dashboard/owner/summary?days=${days}`, {
        credentials: "include",
      });
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
      const res = await fetch(`/api/dashboard/owner/sales-chart?days=${days}`, {
        credentials: "include",
      });
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
      const res = await fetch("/api/dashboard/owner/top-products?limit=5", {
        credentials: "include",
      });
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
      const res = await fetch(
        "/api/dashboard/owner/recent-transactions?limit=5",
        { credentials: "include" },
      );
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
      const res = await fetch("/api/dashboard/owner/low-stock?threshold=10", {
        credentials: "include",
      });
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

  const handleDateRangeChange = (value: string) => {
    const days = parseInt(value);
    setDateRange(value);
    fetchSummary(days);
    fetchChartData(days);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-sm">
          <p className="text-sm font-medium text-zinc-900 mb-1">
            {payload[0].payload.fullDate}
          </p>
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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Dashboard Pemilik
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Analisis keuangan dan performa bisnis
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg px-3 py-1.5 shadow-sm">
            <IconCalendarEvent className="w-4 h-4 text-zinc-500 shrink-0" />
            <NativeSelect
              value={dateRange}
              onChange={handleDateRangeChange}
              options={[
                { value: "7", label: "7 Hari Terakhir" },
                { value: "14", label: "14 Hari Terakhir" },
                { value: "30", label: "30 Hari Terakhir" },
              ]}
              className="h-8 bg-transparent border-none focus:ring-0 text-zinc-700 font-medium text-sm w-40"
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center shrink-0 border border-teal-100">
              <IconCurrencyDollar
                className="w-6 h-6 text-teal-600"
                stroke={1.5}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-zinc-500 mb-1">
                Total Pendapatan
              </h3>
              {isLoadingSummary ? (
                <div className="h-8 w-32 bg-zinc-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900">
                  {formatRupiah(summary.totalRevenue)}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0 border border-rose-100">
              <IconReceipt className="w-6 h-6 text-rose-600" stroke={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-zinc-500 mb-1">
                Total Pengeluaran
              </h3>
              {isLoadingSummary ? (
                <div className="h-8 w-32 bg-zinc-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900">
                  {formatRupiah(summary.totalExpense)}
                </p>
              )}
            </div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
              <IconTrendingUp
                className="w-6 h-6 text-indigo-600"
                stroke={1.5}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-zinc-500 mb-1">
                Laba Bersih
              </h3>
              {isLoadingSummary ? (
                <div className="h-8 w-32 bg-zinc-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-zinc-900">
                  {formatRupiah(summary.netProfit)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              Grafik Penjualan Harian
            </h2>
            <p className="text-sm text-zinc-500">
              Total penjualan per hari dalam rentang waktu terpilih
            </p>
          </div>
          <div className="h-[300px] w-full flex items-center justify-center">
            {isLoadingChart ? (
              <div className="flex items-center gap-2 text-zinc-500">
                <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                Memuat grafik penjualan...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e4e4e7"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#71717a", fontSize: 12 }}
                    tickFormatter={getYAxisFormatter(chartData)}
                    tickCount={5}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "#f4f4f5" }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
                  />
                  <Bar
                    dataKey="penjualan"
                    name="Penjualan"
                    fill="#14b8a6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="lg:col-span-2 bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">
              Produk Terlaris
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              Top 5 produk dengan penjualan tertinggi
            </p>
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
                      <td
                        colSpan={3}
                        className="py-8 text-center text-zinc-500"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                          Memuat produk terlaris...
                        </div>
                      </td>
                    </tr>
                  ) : topProducts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-8 text-center text-zinc-400 text-sm"
                      >
                        Belum ada penjualan tercatat.
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((product, idx) => (
                      <tr key={product.id || idx}>
                        <td className="py-4 flex items-center gap-3">
                          <span className="text-zinc-400 font-medium w-4">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-zinc-900">
                            {product.name}
                          </span>
                        </td>
                        <td className="py-4 text-right text-zinc-600">
                          {product.sold} unit
                        </td>
                        <td className="py-4 text-right font-medium text-zinc-900">
                          {formatRupiah(product.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900 mb-1">
              Transaksi Terbaru
            </h2>
            <p className="text-sm text-zinc-500 mb-6">5 transaksi terakhir</p>
            <div className="space-y-6">
              {isLoadingActivities ? (
                <div className="py-8 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                    Memuat aktivitas...
                  </div>
                </div>
              ) : recentActivities.length === 0 ? (
                <p className="text-center text-zinc-400 text-sm py-8">
                  Belum ada aktivitas transaksi.
                </p>
              ) : (
                recentActivities.map((activity, idx) => (
                  <div key={activity.id || idx} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center border border-teal-100">
                        <IconPackage
                          className="w-4 h-4 text-teal-500"
                          stroke={1.5}
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-zinc-900">
                        {activity.type}
                      </h4>
                      <p className="text-[13px] font-semibold text-zinc-700 mt-0.5">
                        {formatRupiah(activity.amount)}
                      </p>
                      <p className="text-[12px] text-zinc-400 mt-1">
                        {activity.date}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Low Stock — fetched from backend */}
        <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900 mb-1">
            Stok Menipis
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Produk dengan stok di bawah minimum (≤ 10)
          </p>
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
                    <td
                      colSpan={3}
                      className="py-8 text-center text-zinc-500 text-sm"
                    >
                      ✅ Semua stok dalam kondisi aman.
                    </td>
                  </tr>
                ) : (
                  lowStocks.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 font-medium text-zinc-900">
                        {item.name}
                      </td>
                      <td className="py-4 text-zinc-500 font-mono text-xs">
                        {item.sku}
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.stock === 0
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
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
