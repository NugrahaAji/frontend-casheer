"use client";

import { useState, useEffect } from "react";
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
import { IconCurrencyDollar, IconReceipt, IconClockHour4, IconWallet, IconTrendingUp, IconPackage } from "@tabler/icons-react";

interface Transaction {
  _id: string;
  kodeTransaksi: string;
  createdAt: string;
  customer: string;
  paymentType: "cash" | "utang";
  total: number;
  paid: number;
  status: "lunas" | "utang";
}

export default function KeuanganHarianPage() {
  const [isShiftStarted, setIsShiftStarted] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [startingBalance, setStartingBalance] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatRupiah = (num: number | string) => {
    if (!num) return "Rp 0";
    const n = typeof num === "string" ? parseInt(num.replace(/\D/g, ""), 10) : num;
    if (isNaN(n)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n).replace("Rp", "Rp ");
  };

  const formatTime = (d: string) => {
    return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const fetchTodayTransactions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/transaction");
      const data = res.ok ? await res.json() : { success: false };
      if (data.success) {
        const today = new Date().toDateString();
        const todayTrx = (data.data || []).filter(
          (t: Transaction) => new Date(t.createdAt).toDateString() === today
        );
        setTransactions(todayTrx);
      }
    } catch (e) {
      console.error("Failed to fetch transactions", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isShiftStarted) {
      fetchTodayTransactions();
      // Refresh every 30s
      const interval = setInterval(fetchTodayTransactions, 30000);
      return () => clearInterval(interval);
    }
  }, [isShiftStarted]);

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartingBalance(e.target.value.replace(/\D/g, ""));
  };

  const startShift = () => {
    setIsShiftStarted(true);
    setShiftStartTime(new Date());
    setIsStartModalOpen(false);
  };

  const endShift = () => {
    setIsShiftStarted(false);
    setIsSummaryModalOpen(false);
    setStartingBalance("");
    setShiftStartTime(null);
    setTransactions([]);
  };

  // Derived stats
  const totalPendapatan = transactions.reduce((s, t) => s + t.total, 0);
  const totalTunai = transactions.filter(t => t.paymentType === "cash").reduce((s, t) => s + t.total, 0);
  const totalUtang = transactions.filter(t => t.paymentType === "utang").reduce((s, t) => s + t.total, 0);
  const kasPernutupan = Number(startingBalance) + totalTunai;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Keuangan Harian</h1>
            <p className="text-sm text-zinc-500 mt-1">Ringkasan keuangan shift Anda hari ini.</p>
          </div>

          {!isShiftStarted ? (
            <Button onClick={() => setIsStartModalOpen(true)}
              className="bg-[#09090b] hover:bg-[#27272a] text-white font-medium shadow-sm h-10 px-5 rounded-lg">
              Mulai Shift
            </Button>
          ) : (
            <Button onClick={() => setIsSummaryModalOpen(true)}
              className="bg-[#09090b] hover:bg-[#27272a] text-white font-medium shadow-sm h-10 px-5 rounded-lg flex items-center gap-2">
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
              <h2 className="text-2xl font-bold text-zinc-900">{isShiftStarted ? formatRupiah(totalPendapatan) : "Rp 0"}</h2>
            </div>
          </div>

          <div className="border border-zinc-200/80 rounded-xl p-6 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
              <IconReceipt className="w-6 h-6 text-zinc-600" stroke={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Total Transaksi</p>
              <div className="flex items-baseline gap-1.5">
                <h2 className="text-2xl font-bold text-zinc-900">{isShiftStarted ? transactions.length : "0"}</h2>
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
                  <TableHead className="font-semibold text-zinc-900 h-11">Waktu</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">ID Transaksi</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Customer</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Tipe</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Total</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isShiftStarted ? (
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
                        <span className="text-sm">Belum ada transaksi hari ini.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((trx) => (
                    <TableRow key={trx._id}>
                      <TableCell className="font-medium text-[13px]">{formatTime(trx.createdAt)}</TableCell>
                      <TableCell className="text-zinc-500 text-[13px] font-mono">{trx.kodeTransaksi}</TableCell>
                      <TableCell className="text-[13px]">{trx.customer || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={trx.paymentType === "cash" ? "default" : "secondary"} className="capitalize text-xs">
                          {trx.paymentType === "cash" ? "Tunai" : "Utang"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-[13px]">{formatRupiah(trx.total)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          trx.status === "lunas"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>{trx.status}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Start Shift Modal */}
        <Dialog open={isStartModalOpen} onOpenChange={setIsStartModalOpen}>
          <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-100">
              <DialogTitle className="text-lg font-bold text-zinc-900">Mulai Shift Baru</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4 space-y-4">
              <div className="space-y-3">
                <label className="text-[13px] font-semibold text-zinc-800">Saldo Awal Kasir (Uang Modal)</label>
                <Input
                  type="text"
                  value={startingBalance ? formatRupiah(startingBalance) : ""}
                  onChange={handleBalanceChange}
                  placeholder="Rp 0"
                  className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 font-medium"
                />
                <p className="text-[12px] text-zinc-500">
                  Masukkan jumlah uang tunai yang ada di laci kasir saat ini sebagai modal awal kembalian.
                </p>
              </div>
              <Button onClick={startShift} disabled={!startingBalance}
                className="w-full h-11 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-lg mt-4">
                Mulai Shift
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* End Shift Summary Modal */}
        <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-100">
              <DialogTitle className="text-lg font-bold text-zinc-900">Ringkasan Shift</DialogTitle>
            </DialogHeader>
            <div className="p-6 pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[11px] font-medium text-zinc-500 mb-1">Waktu Mulai</p>
                  <p className="font-bold text-zinc-900 text-sm">
                    {shiftStartTime ? shiftStartTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}
                  </p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-100">
                  <p className="text-[11px] font-medium text-zinc-500 mb-1">Waktu Sekarang</p>
                  <p className="font-bold text-zinc-900 text-sm">
                    {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <div className="space-y-3 border border-zinc-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <IconWallet className="w-4 h-4 text-blue-600" stroke={2} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-500">Saldo Awal</p>
                    <p className="font-bold text-zinc-900 text-sm">{formatRupiah(startingBalance)}</p>
                  </div>
                </div>

                <div className="h-[1px] bg-zinc-100 w-full my-2"></div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <IconTrendingUp className="w-4 h-4 text-green-600" stroke={2} />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500">Total Penjualan</p>
                      <p className="font-bold text-zinc-900 text-sm">{formatRupiah(totalPendapatan)}</p>
                    </div>
                    <span className="text-[10px] text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{transactions.length} transaksi</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 py-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-500">Pembayaran Tunai</span>
                  <span className="font-medium text-zinc-900">{formatRupiah(totalTunai)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-500">Piutang / Utang</span>
                  <span className="font-medium text-amber-600">{formatRupiah(totalUtang)}</span>
                </div>
              </div>

              <div className="bg-zinc-100/80 rounded-xl p-4 flex justify-between items-center border border-zinc-200/60 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                    <IconCurrencyDollar className="w-4 h-4 text-zinc-600" stroke={2} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-zinc-500">Kas Penutupan (Ekspektasi)</p>
                    <p className="font-bold text-zinc-900 text-lg">{formatRupiah(kasPernutupan)}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsSummaryModalOpen(false)}
                  className="flex-1 h-11 border-zinc-200 text-zinc-700 font-medium rounded-lg">
                  Tutup
                </Button>
                <Button onClick={endShift}
                  className="flex-1 h-11 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-lg">
                  Akhiri Shift
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
