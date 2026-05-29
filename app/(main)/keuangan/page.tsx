"use client";

import React, { useState, useEffect } from "react";
import { useShift } from "@/lib/hooks/useShift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconCurrencyDollar,
  IconReceipt,
  IconClockHour4,
  IconWallet,
  IconTrendingUp,
  IconPackage,
  IconWifi,
  IconWifiOff,
  IconCloud,
  IconCloudOff,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";

interface TrxItem {
  kodeProduk: string;
  qty: number;
  harga: number;
  subtotal: number;
  batch?: number;
}

interface Transaction {
  _id: string;
  kodeTransaksi: string;
  createdAt: string;
  customer: string;
  paymentType: "cash" | "utang";
  items: TrxItem[];
  total: number;
  paid: number;
  status: "lunas" | "utang";
}

export default function KeuanganHarianPage() {
  // ─── Shift state dari IndexedDB via custom hook ─────────────────────────────
  const {
    session,
    isHydrating,
    isSubmitting,
    isOnline,
    startShift,
    endShift,
  } = useShift();

  // ─── UI state lokal ─────────────────────────────────────────────────────────
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // ─── Nama Produk Mapping ───────────────────────────────────────────────────
  const [productMap, setProductMap] = useState<Record<string, string>>({});

  // ─── Data transaksi ─────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Memuat nama produk untuk pemetaan kode -> nama ─────────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const [resFisik, resDigital] = await Promise.all([
          fetch("/api/product/fisik", { credentials: "include" }),
          fetch("/api/product/digital", { credentials: "include" })
        ]);
        const dataFisik = resFisik.ok ? await resFisik.json() : { success: false };
        const dataDigital = resDigital.ok ? await resDigital.json() : { success: false };

        const map: Record<string, string> = {};
        if (dataFisik.success && dataFisik.data?.[0]?.produk) {
          dataFisik.data[0].produk.forEach((p: any) => {
            map[p.kodeProduk] = p.namaProduk;
          });
        }
        if (dataDigital.success && dataDigital.data?.[0]?.produk) {
          dataDigital.data[0].produk.forEach((p: any) => {
            map[p.kodeProduk] = p.namaProduk;
          });
        }
        setProductMap(map);
      } catch (err) {
        console.error("Gagal memuat nama produk:", err);
      }
    };
    fetchProducts();
  }, []);

  // ─── Format helpers ─────────────────────────────────────────────────────────
  const formatRupiah = (num: number | string) => {
    if (!num) return "Rp 0";
    const n = typeof num === "string" ? parseInt(num.replace(/\D/g, ""), 10) : num;
    if (isNaN(n)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    })
      .format(n)
      .replace("Rp", "Rp ");
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatShiftStartTime = () => {
    if (!session.shiftStartTime) return "-";
    return new Date(session.shiftStartTime).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ─── Fetch transaksi hari ini yang sesuai dengan waktu aktif shift ───────────
  const fetchTodayTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/transaction", {
        credentials: "include", // Kirim cookie JWT ke backend
      });
      const data = res.ok ? await res.json() : { success: false };
      if (data.success) {
        const today = new Date().toDateString();
        const shiftStart = session.shiftStartTime ? new Date(session.shiftStartTime) : null;
        const activeTrx = (data.data || []).filter((t: Transaction) => {
          const trxTime = new Date(t.createdAt);
          const isToday = trxTime.toDateString() === today;
          if (!shiftStart) return false;
          // Hanya ambil transaksi yang terjadi setelah shift kasir ini dimulai
          return isToday && trxTime >= shiftStart;
        });
        setTransactions(activeTrx);
      }
    } catch (e) {
      console.error("Gagal memuat transaksi:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Muat transaksi saat shift aktif, refresh tiap 30 detik
  useEffect(() => {
    if (session.isShiftStarted && !isHydrating) {
      fetchTodayTransactions();
      const interval = setInterval(fetchTodayTransactions, 30000);
      return () => clearInterval(interval);
    }
  }, [session.isShiftStarted, isHydrating, session.shiftStartTime]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBalanceInput(e.target.value.replace(/\D/g, ""));
  };

  const handleStartShift = async () => {
    const balance = Number(balanceInput);
    if (!balance) return;
    await startShift(balance);
    setBalanceInput("");
    setIsStartModalOpen(false);
  };

  const handleEndShift = async () => {
    await endShift();
    setIsSummaryModalOpen(false);
    setTransactions([]);
  };

  // ─── Derived stats ───────────────────────────────────────────────────────────
  const totalPendapatan = transactions.reduce((s, t) => s + t.total, 0);
  const totalTunai = transactions
    .filter((t) => t.paymentType === "cash")
    .reduce((s, t) => s + t.total, 0);
  const totalUtang = transactions
    .filter((t) => t.paymentType === "utang")
    .reduce((s, t) => s + t.total, 0);
  const kasPernutupan = session.startingBalance + totalTunai;

  // ─── Skeleton saat hydrating dari IndexedDB ──────────────────────────────────
  if (isHydrating) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-zinc-200 rounded-lg w-48" />
          <div className="h-4 bg-zinc-100 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-28 bg-white border border-zinc-200 rounded-xl" />
            <div className="h-28 bg-white border border-zinc-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Keuangan Harian</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-zinc-500">Ringkasan keuangan shift Anda hari ini.</p>
              {/* Indikator status online/offline + sync */}
              <div className="flex items-center gap-1.5">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                    <IconWifi className="w-3 h-3" stroke={2} />
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                    <IconWifiOff className="w-3 h-3" stroke={2} />
                    Offline
                  </span>
                )}
                {session.isShiftStarted && (
                  session.isSynced ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full px-2 py-0.5">
                      <IconCloud className="w-3 h-3" stroke={2} />
                      Tersimpan
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                      <IconCloudOff className="w-3 h-3" stroke={2} />
                      Lokal
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {!session.isShiftStarted ? (
            <Button
              onClick={() => setIsStartModalOpen(true)}
              className="bg-[#09090b] hover:bg-[#27272a] text-white font-medium shadow-sm h-10 px-5 rounded-lg"
            >
              Mulai Shift
            </Button>
          ) : (
            <Button
              onClick={() => setIsSummaryModalOpen(true)}
              className="bg-[#09090b] hover:bg-[#27272a] text-white font-medium shadow-sm h-10 px-5 rounded-lg flex items-center gap-2"
            >
              <IconClockHour4 className="w-4 h-4" stroke={2} />
              Ringkasan Shift
            </Button>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-zinc-200/80 rounded-xl p-6 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
              <IconCurrencyDollar className="w-6 h-6 text-zinc-600" stroke={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Pendapatan Hari Ini</p>
              <h2 className="text-2xl font-bold text-zinc-900">
                {session.isShiftStarted ? formatRupiah(totalPendapatan) : "Rp 0"}
              </h2>
            </div>
          </div>

          <div className="border border-zinc-200/80 rounded-xl p-6 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
              <IconReceipt className="w-6 h-6 text-zinc-600" stroke={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Total Transaksi</p>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-2xl font-bold text-zinc-900">
                  {session.isShiftStarted ? transactions.length : "0"}
                </h2>
                <span className="text-sm text-zinc-500">transaksi selesai</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-lg font-bold text-zinc-900">Transaksi Terbaru</h2>
            <p className="text-sm text-zinc-500">Daftar transaksi yang baru saja diselesaikan</p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                  <TableHead className="font-semibold text-zinc-900 h-11">Tanggal</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Pelanggan</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Kode Transaksi</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Total</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Status</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!session.isShiftStarted ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                      Shift belum dimulai. Mulai shift untuk melihat transaksi.
                    </TableCell>
                  </TableRow>
                ) : isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-500">
                        <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        Memuat transaksi...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconPackage className="w-10 h-10" stroke={1} />
                        <span className="text-sm">Belum ada transaksi pada shift ini.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((item) => {
                    const isExpanded = expanded === item._id;
                    return (
                      <React.Fragment key={item._id}>
                        <TableRow
                          className="cursor-pointer hover:bg-zinc-50/60 transition-colors"
                          onClick={() => setExpanded(isExpanded ? null : item._id)}
                        >
                          <TableCell className="text-[13px] text-zinc-600 whitespace-nowrap">
                            <div>{fmtDate(item.createdAt)}</div>
                            <div className="text-zinc-400 text-[11px]">{fmtTime(item.createdAt)}</div>
                          </TableCell>
                          <TableCell className="font-medium text-zinc-900 text-[13px]">
                            {item.customer || <span className="text-zinc-400 italic">Umum</span>}
                          </TableCell>
                          <TableCell className="font-mono text-zinc-500 text-[12px]">
                            {item.kodeTransaksi
                              ? item.kodeTransaksi.slice(0, 8).toUpperCase()
                              : item._id.slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-zinc-900 text-[13px] whitespace-nowrap">
                            {formatRupiah(item.total)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                                item.status === "lunas"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpanded(isExpanded ? null : item._id)}
                              className="h-8 w-8 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                              title="Lihat detail items"
                            >
                              {isExpanded ? (
                                <IconChevronUp className="h-4 w-4" stroke={1.5} />
                              ) : (
                                <IconChevronDown className="h-4 w-4" stroke={1.5} />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded: item detail */}
                        {isExpanded && (
                          <TableRow key={`${item._id}-detail`} className="bg-zinc-50/40">
                            <TableCell colSpan={6} className="py-0">
                              <div className="px-4 py-3">
                                <p className="text-[12px] font-semibold text-zinc-500 mb-2 uppercase tracking-wide">
                                  Detail Item Belanja
                                </p>
                                <div className="rounded-lg border border-zinc-200 overflow-hidden bg-white shadow-inner animate-in fade-in slide-in-from-top-1 duration-150">
                                  <table className="w-full text-sm">
                                    <thead className="bg-zinc-100 text-zinc-500 border-b border-zinc-200">
                                      <tr>
                                        <th className="py-2 px-3 text-left font-semibold text-[12px]">Nama Produk</th>
                                        <th className="py-2 px-3 text-right font-semibold text-[12px]">Qty</th>
                                        <th className="py-2 px-3 text-right font-semibold text-[12px]">Harga</th>
                                        <th className="py-2 px-3 text-right font-semibold text-[12px]">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 bg-white">
                                      {item.items && item.items.map((it, idx) => (
                                        <tr key={idx} className="hover:bg-zinc-50/30 transition-colors">
                                          <td className="py-2.5 px-3 text-[12.5px] text-zinc-800 font-medium">
                                            {productMap[it.kodeProduk] || it.kodeProduk}
                                          </td>
                                          <td className="py-2.5 px-3 text-right text-[12px] text-zinc-600">{it.qty}</td>
                                          <td className="py-2.5 px-3 text-right text-[12px] text-zinc-600 whitespace-nowrap">{formatRupiah(it.harga)}</td>
                                          <td className="py-2.5 px-3 text-right text-[12px] font-semibold text-zinc-900 whitespace-nowrap">{formatRupiah(it.subtotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-zinc-50/80 border-t border-zinc-200">
                                      <tr>
                                        <td colSpan={3} className="py-2 px-3 text-right text-[12.5px] font-semibold text-zinc-700">Total Belanja</td>
                                        <td className="py-2 px-3 text-right text-[13.5px] font-bold text-zinc-900 whitespace-nowrap">{formatRupiah(item.total)}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Modal: Mulai Shift ──────────────────────────────────────────────── */}
        <Dialog open={isStartModalOpen} onOpenChange={setIsStartModalOpen}>
          <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-100">
              <DialogTitle className="text-lg font-bold text-zinc-900">Mulai Shift Baru</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4 space-y-4">
              {/* Info penyimpanan */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <IconCloud className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" stroke={2} />
                <p className="text-[12px] text-blue-700 leading-relaxed">
                  {isOnline
                    ? "Data shift akan disimpan secara lokal dan disinkronkan ke server."
                    : "Anda sedang offline. Data shift akan disimpan lokal dan disinkronkan otomatis saat online."}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-[13px] font-semibold text-zinc-800">
                  Saldo Awal Kasir (Uang Modal)
                </label>
                <Input
                  type="text"
                  id="starting-balance-input"
                  value={balanceInput ? formatRupiah(balanceInput) : ""}
                  onChange={handleBalanceChange}
                  placeholder="Rp 0"
                  className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 font-medium"
                />
                <p className="text-[12px] text-zinc-500">
                  Masukkan jumlah uang tunai yang ada di laci kasir saat ini sebagai modal awal kembalian.
                </p>
              </div>

              <Button
                id="confirm-start-shift-btn"
                onClick={handleStartShift}
                disabled={!balanceInput || isSubmitting}
                className="w-full h-11 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-lg mt-4"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memulai...
                  </div>
                ) : (
                  "Mulai Shift"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ── Modal: Ringkasan & Akhiri Shift ────────────────────────────────── */}
        <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-bold text-zinc-900">Ringkasan Shift</DialogTitle>
                {/* Badge sync status di modal */}
                {session.isSynced ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                    <IconCloud className="w-3 h-3" stroke={2} />
                    Tersinkronisasi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1">
                    <IconCloudOff className="w-3 h-3" stroke={2} />
                    Tersimpan Lokal
                  </span>
                )}
              </div>
            </DialogHeader>

            <div className="p-6 pt-4 space-y-4">
              {/* Waktu */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[11px] font-medium text-zinc-500 mb-1">Waktu Mulai</p>
                  <p className="font-bold text-zinc-900 text-sm">{formatShiftStartTime()}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[11px] font-medium text-zinc-500 mb-1">Waktu Sekarang</p>
                  <p className="font-bold text-zinc-900 text-sm">
                    {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* Saldo & Penjualan */}
              <div className="space-y-3 border border-zinc-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <IconWallet className="w-4 h-4 text-blue-600" stroke={2} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-500">Saldo Awal</p>
                    <p className="font-bold text-zinc-900 text-sm">{formatRupiah(session.startingBalance)}</p>
                  </div>
                </div>

                <div className="h-[1px] bg-zinc-100 w-full" />

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <IconTrendingUp className="w-4 h-4 text-green-600" stroke={2} />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500">Total Penjualan</p>
                      <p className="font-bold text-zinc-900 text-sm">{formatRupiah(totalPendapatan)}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                      {transactions.length} transaksi
                    </span>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 py-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-500">Pembayaran Tunai</span>
                  <span className="font-medium text-zinc-900">{formatRupiah(totalTunai)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-500">Piutang / Utang</span>
                  <span className="font-medium text-amber-600">{formatRupiah(totalUtang)}</span>
                </div>
              </div>

              {/* Kas Penutupan */}
              <div className="bg-zinc-100/80 rounded-xl p-4 flex items-center gap-3 border border-zinc-200/60">
                <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                  <IconCurrencyDollar className="w-4 h-4 text-zinc-600" stroke={2} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-zinc-500">Kas Penutupan (Ekspektasi)</p>
                  <p className="font-bold text-zinc-900 text-lg">{formatRupiah(kasPernutupan)}</p>
                </div>
              </div>

              {/* Tombol aksi */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsSummaryModalOpen(false)}
                  className="flex-1 h-11 border-zinc-200 text-zinc-700 font-medium rounded-lg"
                >
                  Tutup
                </Button>
                <Button
                  id="confirm-end-shift-btn"
                  onClick={handleEndShift}
                  disabled={isSubmitting}
                  className="flex-1 h-11 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-lg"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Mengakhiri...
                    </div>
                  ) : (
                    "Akhiri Shift"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
