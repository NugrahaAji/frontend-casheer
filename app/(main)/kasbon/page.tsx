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
import { IconAlertTriangle, IconCircleCheck, IconPackage } from "@tabler/icons-react";

interface Transaction {
  _id: string;
  kodeTransaksi: string;
  createdAt: string;
  customer: string;
  total: number;
  paid: number;
  status: "lunas" | "utang";
}

export default function KasbonPage() {
  const [kasbonList, setKasbonList] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKasbon, setSelectedKasbon] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paySuccess, setPaySuccess] = useState("");

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num).replace("Rp", "Rp ");
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const fetchKasbon = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/transaction", { credentials: "include" });
      const data = res.ok ? await res.json() : { success: false };
      if (data.success) {
        // Tampilkan semua transaksi utang (belum lunas)
        const utang = (data.data || []).filter((t: Transaction) => t.status === "utang");
        setKasbonList(utang);
      }
    } catch (e) {
      console.error("Failed to fetch kasbon", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchKasbon(); }, []);

  const openPaymentModal = (item: Transaction) => {
    setSelectedKasbon(item);
    setPayAmount("");
    setPayError("");
    setPaySuccess("");
    setIsModalOpen(true);
  };

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayAmount(e.target.value.replace(/\D/g, ""));
  };

  const handlePayment = async () => {
    if (!selectedKasbon) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { setPayError("Masukkan jumlah pembayaran yang valid."); return; }
    setIsPaying(true); setPayError(""); setPaySuccess("");
    try {
      const res = await fetch(`/api/transaction/${selectedKasbon._id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPaySuccess("Pembayaran berhasil dicatat!");
        fetchKasbon();
        setTimeout(() => setIsModalOpen(false), 1200);
      } else {
        setPayError(data.message || "Gagal memproses pembayaran.");
      }
    } catch {
      setPayError("Terjadi kesalahan jaringan.");
    } finally {
      setIsPaying(false);
    }
  };

  // Derived stats
  const totalPiutangAktif = kasbonList.reduce((s, t) => s + (t.total - t.paid), 0);
  const todayStr = new Date().toDateString();
  const lunasHariIni = kasbonList
    .filter(t => t.status === "lunas" && new Date(t.createdAt).toDateString() === todayStr)
    .reduce((s, t) => s + t.total, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Manajemen Kasbon</h1>
            <p className="text-sm text-zinc-500 mt-1">Kelola piutang dan pembayaran kasbon pelanggan.</p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-zinc-200/80 rounded-xl p-6 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <IconAlertTriangle className="w-6 h-6 text-red-500" stroke={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Total Piutang Aktif</p>
              <h2 className="text-2xl font-bold text-red-600">{formatRupiah(totalPiutangAktif)}</h2>
            </div>
          </div>

          <div className="border border-zinc-200/80 rounded-xl p-6 bg-white shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <IconCircleCheck className="w-6 h-6 text-green-500" stroke={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500 mb-1">Piutang Lunas Hari Ini</p>
              <h2 className="text-2xl font-bold text-green-600">{formatRupiah(lunasHariIni)}</h2>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-lg font-bold text-zinc-900">Daftar Kasbon</h2>
            <p className="text-sm text-zinc-500">Semua catatan kasbon pelanggan</p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                  <TableHead className="font-semibold text-zinc-900 h-11">Tanggal</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Nama Pelanggan</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">ID Transaksi</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Total Piutang</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Sudah Dibayar</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Sisa</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Status</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-500">
                        <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        Memuat data kasbon...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : kasbonList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconPackage className="w-10 h-10" stroke={1} />
                        <span className="text-sm">Tidak ada kasbon aktif saat ini.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  kasbonList.map((item) => {
                    const sisa = item.total - item.paid;
                    const statusLabel = item.status === "lunas" ? "Lunas" : item.paid > 0 ? "Sebagian" : "Belum Bayar";
                    return (
                      <TableRow key={item._id}>
                        <TableCell className="font-medium text-[13px] whitespace-nowrap">{formatDate(item.createdAt)}</TableCell>
                        <TableCell className="text-[13px]">{item.customer || "-"}</TableCell>
                        <TableCell className="text-zinc-500 text-[13px] font-mono">{item.kodeTransaksi}</TableCell>
                        <TableCell className="text-right font-medium text-[13px]">{formatRupiah(item.total)}</TableCell>
                        <TableCell className="text-right text-[13px]">{formatRupiah(item.paid)}</TableCell>
                        <TableCell className={`text-right font-medium text-[13px] ${sisa > 0 ? "text-red-600" : ""}`}>
                          {formatRupiah(sisa)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === "lunas" ? "default" : "outline"}
                            className={`font-medium ${
                              statusLabel === "Belum Bayar" ? "bg-[#d82c4f] hover:bg-[#d82c4f] text-white border-transparent" :
                              statusLabel === "Sebagian" ? "bg-zinc-100 text-zinc-800 border-transparent hover:bg-zinc-100" :
                              "bg-[#09090b] text-white hover:bg-[#09090b]"
                            }`}>
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {item.status !== "lunas" && (
                            <Button variant="outline" size="sm"
                              className="h-8 text-[13px] font-medium border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900 px-4"
                              onClick={() => openPaymentModal(item)}>
                              Bayar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Payment Modal */}
        <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) { setPayError(""); setPaySuccess(""); } setIsModalOpen(o); }}>
          <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
            <DialogHeader className="p-6 pb-4 border-b border-zinc-100">
              <DialogTitle className="text-lg font-bold text-zinc-900">Bayar Kasbon</DialogTitle>
            </DialogHeader>

            <div className="p-6 pt-4 space-y-5">
              {selectedKasbon && (
                <div className="bg-[#f4f4f5] rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-zinc-500 font-medium">Nama Pelanggan</span>
                    <span className="font-semibold text-zinc-900">{selectedKasbon.customer || "-"}</span>
                  </div>
                  <div className="h-[1px] bg-zinc-200"></div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-zinc-500 font-medium">Sisa Piutang</span>
                    <span className="font-bold text-red-600 text-[15px]">{formatRupiah(selectedKasbon.total - selectedKasbon.paid)}</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-zinc-800">Jumlah Pembayaran</label>
                <Input
                  type="text"
                  value={payAmount ? formatRupiah(Number(payAmount)) : ""}
                  onChange={handlePayAmountChange}
                  placeholder="Masukkan nominal pembayaran"
                  className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 font-medium"
                />
                {selectedKasbon && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm"
                      className="h-8 text-xs font-medium border-zinc-200 rounded-lg"
                      onClick={() => setPayAmount(String(Math.floor((selectedKasbon.total - selectedKasbon.paid) / 2)))}>
                      50%
                    </Button>
                    <Button variant="outline" size="sm"
                      className="h-8 text-xs font-medium border-zinc-200 rounded-lg"
                      onClick={() => setPayAmount(String(selectedKasbon.total - selectedKasbon.paid))}>
                      Lunas
                    </Button>
                  </div>
                )}
              </div>

              {payError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-[13px] text-red-600 font-medium">{payError}</p>
                </div>
              )}
              {paySuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-[13px] text-green-700 font-medium">{paySuccess}</p>
                </div>
              )}

              <Button onClick={handlePayment} disabled={isPaying || !payAmount}
                className="w-full h-11 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-lg cursor-pointer transition-colors shadow-sm">
                {isPaying ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </div>
                ) : "Konfirmasi Pembayaran"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
