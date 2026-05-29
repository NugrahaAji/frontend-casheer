"use client";

import React from "react";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  IconAlertTriangle, IconCircleCheck, IconPackage,
  IconSearch, IconEye, IconCreditCard, IconChevronDown,
  IconChevronUp, IconReceipt,
} from "@tabler/icons-react";

// ── Types ──────────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n).replace("Rp", "Rp ");

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

// ── Component ──────────────────────────────────────────────────────────────

export default function KasbonPage() {
  const [list, setList]           = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState<string | null>(null);

  // payment modal state
  const [selected, setSelected]   = useState<Transaction | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [payRaw, setPayRaw]       = useState("");
  const [isPaying, setIsPaying]   = useState(false);
  const [payErr, setPayErr]       = useState("");
  const [payOk, setPayOk]         = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchKasbon = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const res  = await fetch("/api/transaction", { credentials: "include" });
      console.log("[kasbon] status:", res.status);

      if (res.status === 401 || res.status === 403) {
        setFetchError("Sesi tidak valid. Silakan logout dan login ulang.");
        return;
      }

      const data = await res.json();
      console.log("[kasbon] data:", data);

      if (data.success) {
        const utang = (data.data as Transaction[]).filter(
          (t) => t.paymentType === "utang" && t.status === "utang"
        );
        setList(utang);
      } else {
        setFetchError(data.message || "Gagal mengambil data kasbon.");
      }
    } catch (err) {
      console.error("[kasbon] fetch error:", err);
      setFetchError("Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchKasbon(); }, [fetchKasbon]);

  // ── Payment ──────────────────────────────────────────────────────────────

  const openPay = (item: Transaction) => {
    setSelected(item);
    setPayRaw("");
    setPayErr("");
    setPayOk("");
    setIsPayOpen(true);
  };

  const handlePay = async () => {
    if (!selected) return;
    const amount = Number(payRaw);
    if (!amount || amount <= 0) {
      setPayErr("Masukkan jumlah yang valid.");
      return;
    }
    setIsPaying(true);
    setPayErr("");
    setPayOk("");
    try {
      const res = await fetch(`/api/transaction/${selected._id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPayOk(
          data.data?.status === "lunas"
            ? "Utang berhasil dilunasi! 🎉"
            : `Pembayaran ${fmt(data.data?.paidThisTime ?? amount)} berhasil dicatat.`
        );
        await fetchKasbon();
        setTimeout(() => {
          setIsPayOpen(false);
          setSelected(null);
        }, 1400);
      } else {
        setPayErr(data.message || "Gagal memproses pembayaran.");
      }
    } catch {
      setPayErr("Terjadi kesalahan jaringan.");
    } finally {
      setIsPaying(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = list.filter((t) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (t.customer || "").toLowerCase().includes(q) ||
      (t.kodeTransaksi || "").toLowerCase().includes(q)
    );
  });

  const totalPiutang = list.reduce((s, t) => s + (t.total - t.paid), 0);
  const jumlahKasbon = list.length;

  const sisa = selected ? selected.total - selected.paid : 0;
  const payAmount = Number(payRaw);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Manajemen Kasbon</h1>
          <p className="text-sm text-zinc-500 mt-1">Kelola piutang dan pembayaran kasbon pelanggan.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <IconAlertTriangle className="w-5 h-5 text-red-500" stroke={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Total Piutang Aktif</p>
              <p className="text-xl font-bold text-red-600">{fmt(totalPiutang)}</p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <IconReceipt className="w-5 h-5 text-amber-500" stroke={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Jumlah Kasbon Aktif</p>
              <p className="text-xl font-bold text-zinc-900">{jumlahKasbon} transaksi</p>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <IconAlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" stroke={1.5} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">Gagal memuat kasbon</p>
              <p className="text-[13px] text-red-600 mt-0.5">{fetchError}</p>
            </div>
            <button
              onClick={fetchKasbon}
              className="text-[13px] font-medium text-red-600 hover:text-red-800 underline shrink-0"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">

          {/* Search */}
          <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" stroke={1.5} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama pelanggan atau kode transaksi..."
                className="pl-9 h-9 bg-zinc-50 border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                  <TableHead className="font-semibold text-zinc-900 h-11">Tanggal</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Pelanggan</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Kode Transaksi</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Total</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Sudah Bayar</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Sisa Utang</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Progress</TableHead>
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
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconPackage className="w-10 h-10" stroke={1} />
                        <span className="text-sm">
                          {search ? "Tidak ada kasbon yang sesuai pencarian." : "Tidak ada kasbon aktif saat ini."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const sisaItem = item.total - item.paid;
                    const progress = item.total > 0 ? (item.paid / item.total) * 100 : 0;
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
                            {fmt(item.total)}
                          </TableCell>
                          <TableCell className="text-right text-[13px] whitespace-nowrap">
                            <span className={item.paid > 0 ? "text-emerald-600 font-medium" : "text-zinc-400"}>
                              {fmt(item.paid)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-red-600 text-[13px] whitespace-nowrap">
                            {fmt(sisaItem)}
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[11px] text-zinc-500 shrink-0">{Math.round(progress)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpanded(isExpanded ? null : item._id)}
                                className="h-8 w-8 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                                title="Lihat detail items"
                              >
                                {isExpanded
                                  ? <IconChevronUp className="h-4 w-4" stroke={1.5} />
                                  : <IconChevronDown className="h-4 w-4" stroke={1.5} />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPay(item)}
                                className="h-8 px-3 text-[12px] font-medium border-zinc-200 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-colors gap-1.5"
                              >
                                <IconCreditCard className="h-3.5 w-3.5" stroke={1.5} />
                                Bayar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded: item detail */}
                        {isExpanded && (
                          <TableRow key={`${item._id}-detail`} className="bg-zinc-50/40">
                            <TableCell colSpan={8} className="py-0">
                              <div className="px-4 py-3">
                                <p className="text-[12px] font-semibold text-zinc-500 mb-2 uppercase tracking-wide">
                                  Detail Item
                                </p>
                                <div className="rounded-lg border border-zinc-200 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-zinc-100 text-zinc-500">
                                      <tr>
                                        <th className="py-2 px-3 text-left font-medium text-[12px]">Kode Produk</th>
                                        <th className="py-2 px-3 text-right font-medium text-[12px]">Qty</th>
                                        <th className="py-2 px-3 text-right font-medium text-[12px]">Harga</th>
                                        <th className="py-2 px-3 text-right font-medium text-[12px]">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 bg-white">
                                      {item.items.map((it, idx) => (
                                        <tr key={idx}>
                                          <td className="py-2 px-3 font-mono text-[12px] text-zinc-700">{it.kodeProduk}</td>
                                          <td className="py-2 px-3 text-right text-[12px] text-zinc-600">{it.qty}</td>
                                          <td className="py-2 px-3 text-right text-[12px] text-zinc-600 whitespace-nowrap">{fmt(it.harga)}</td>
                                          <td className="py-2 px-3 text-right text-[12px] font-medium text-zinc-900 whitespace-nowrap">{fmt(it.subtotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="bg-zinc-50 border-t border-zinc-200">
                                      <tr>
                                        <td colSpan={3} className="py-2 px-3 text-right text-[12px] font-semibold text-zinc-700">Total</td>
                                        <td className="py-2 px-3 text-right text-[13px] font-bold text-zinc-900 whitespace-nowrap">{fmt(item.total)}</td>
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

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-zinc-100 flex justify-between items-center">
              <span className="text-xs text-zinc-400">
                {filtered.length} kasbon aktif
              </span>
              <span className="text-sm font-semibold text-red-600">
                Total piutang: {fmt(filtered.reduce((s, t) => s + (t.total - t.paid), 0))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Payment Modal ─────────────────────────────────────────────────── */}
      <Dialog
        open={isPayOpen}
        onOpenChange={(o) => {
          if (!o) { setPayErr(""); setPayOk(""); setPayRaw(""); }
          setIsPayOpen(o);
        }}
      >
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-100 bg-zinc-50/60">
            <DialogTitle className="text-lg font-bold text-zinc-900">Bayar Kasbon</DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5">
            {selected && (
              <>
                {/* Info */}
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 space-y-3">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-zinc-500 font-medium">Pelanggan</span>
                    <span className="font-semibold text-zinc-900">{selected.customer || "Umum"}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-zinc-500 font-medium">Total Tagihan</span>
                    <span className="font-semibold text-zinc-900">{fmt(selected.total)}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-zinc-500 font-medium">Sudah Dibayar</span>
                    <span className="font-semibold text-emerald-600">{fmt(selected.paid)}</span>
                  </div>
                  <div className="h-px bg-zinc-200" />
                  <div className="flex justify-between text-[13px]">
                    <span className="text-zinc-500 font-medium">Sisa Utang</span>
                    <span className="text-lg font-bold text-red-600">{fmt(sisa)}</span>
                  </div>
                  {/* Progress */}
                  <div>
                    <div className="bg-zinc-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${selected.total > 0 ? (selected.paid / selected.total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 text-right">
                      {Math.round(selected.total > 0 ? (selected.paid / selected.total) * 100 : 0)}% terbayar
                    </p>
                  </div>
                </div>

                {/* Amount input */}
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-zinc-800">Jumlah Pembayaran</label>
                  <Input
                    type="text"
                    value={payRaw ? fmt(Number(payRaw)) : ""}
                    onChange={(e) => setPayRaw(e.target.value.replace(/\D/g, ""))}
                    placeholder="Masukkan nominal..."
                    className="h-11 text-base bg-zinc-50 border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400 font-semibold"
                  />
                  {/* Quick buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline" size="sm"
                      className="flex-1 h-8 text-xs border-zinc-200 rounded-lg"
                      onClick={() => setPayRaw(String(Math.floor(sisa / 2)))}
                    >
                      50%
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="flex-1 h-8 text-xs border-zinc-200 rounded-lg"
                      onClick={() => setPayRaw(String(Math.floor(sisa * 0.75)))}
                    >
                      75%
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="flex-1 h-8 text-xs border-zinc-200 rounded-lg font-semibold"
                      onClick={() => setPayRaw(String(sisa))}
                    >
                      Lunas
                    </Button>
                  </div>

                  {/* Preview kembalian / sisa */}
                  {payAmount > 0 && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-[13px] text-blue-700 font-medium">
                      {payAmount >= sisa
                        ? `✅ Utang akan lunas sepenuhnya.`
                        : `Sisa setelah bayar: ${fmt(sisa - payAmount)}`}
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {payErr && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-[13px] text-red-600 font-medium">{payErr}</p>
                  </div>
                )}
                {payOk && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                    <IconCircleCheck className="w-4 h-4 text-emerald-600 shrink-0" stroke={1.5} />
                    <p className="text-[13px] text-emerald-700 font-medium">{payOk}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setIsPayOpen(false)}
                    className="flex-1 h-11 border-zinc-200 text-zinc-700 font-medium rounded-lg"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handlePay}
                    disabled={isPaying || !payRaw || payAmount <= 0}
                    className="flex-1 h-11 bg-zinc-900 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors"
                  >
                    {isPaying ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Memproses...
                      </div>
                    ) : "Konfirmasi Pembayaran"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
