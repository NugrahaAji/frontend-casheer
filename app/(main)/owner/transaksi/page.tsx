"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  IconSearch,
  IconReceipt,
  IconCalendarEvent,
  IconEye,
  IconSelector,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";

interface TransactionItem {
  kodeProduk: string;
  namaProduk: string;
  qty: number;
  hargaFinal?: number;
  harga?: number;
  subtotal: number;
  batch?: number;
}

interface Transaction {
  _id: string;
  kodeTransaksi: string;
  createdAt: string;
  customer: string;
  paymentType: "cash" | "utang";
  items: TransactionItem[];
  total: number;
  status: string;
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtTime = (d: string) => {
  const date = new Date(d);
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

export default function OwnerTransaksiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPayment, setFilterPayment] = useState<"semua" | "cash" | "utang">("semua");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchTransactions = async () => {
    try {
      const res = await fetch("/api/transaction", {
        credentials: "include",
      });
      const data = res.ok ? await res.json() : { success: false };
      if (data.success) {
        setTransactions(data.data || []);
      }
    } catch (e) {
      console.error("Gagal memuat transaksi:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterPayment, searchQuery, pageSize]);

  const filtered = transactions.filter((t) => {
    const matchSearch =
      (t.kodeTransaksi || t._id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customer || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchPayment = filterPayment === "semua" || t.paymentType === filterPayment;
    return matchSearch && matchPayment;
  });

  // Paginate transactions
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedTransactions = filtered.slice(startIdx, endIdx);

  const openDetail = (trx: Transaction) => {
    setSelectedTrx(trx);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Riwayat Transaksi</h1>
            <p className="text-sm text-zinc-500 mt-1">Lihat seluruh riwayat transaksi penjualan toko.</p>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-zinc-100">
            <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
              {(["semua", "cash", "utang"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterPayment(t)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                    filterPayment === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {t === "semua" ? "Semua" : t === "cash" ? "Tunai" : "Utang"}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <IconSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" stroke={1.5} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ID transaksi atau nama..."
                className="pl-9 h-9 bg-zinc-50 border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="w-[60px] text-center font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Kode Transaksi</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Pembayaran</TableHead>
                  <TableHead className="font-semibold">Jumlah Item</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-500">
                        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        Memuat riwayat transaksi...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconReceipt className="w-10 h-10" stroke={1} />
                        <span className="text-sm">Tidak ada transaksi ditemukan.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map((item, index) => {
                    const displayedIndex = startIdx + index + 1;
                    return (
                      <TableRow key={item._id} className="hover:bg-zinc-50/40 transition-colors">
                        <TableCell className="text-center text-zinc-500 font-medium">{displayedIndex}</TableCell>
                        <TableCell className="font-mono text-sm text-zinc-700">
                          {item.kodeTransaksi
                            ? item.kodeTransaksi.slice(0, 8).toUpperCase()
                            : item._id.slice(-8).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-[13px] text-zinc-600 whitespace-nowrap">
                          <div>{fmtDate(item.createdAt)}</div>
                          <div className="text-zinc-400 text-[11px]">{fmtTime(item.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.paymentType === "cash" ? "default" : "secondary"} className="capitalize text-xs">
                            {item.paymentType === "cash" ? "Tunai" : "Utang"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-600 text-[13px]">
                          {item.items ? item.items.reduce((s, i) => s + i.qty, 0) : 0} pcs
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetail(item)}
                            className="h-8 w-8 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"
                            title="Lihat detail transaksi"
                          >
                            <IconEye className="h-4 w-4" stroke={1.5} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {!isLoading && totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span>Tampilkan</span>
                <div className="relative flex items-center">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-[#f4f4f5] text-zinc-700 text-sm font-medium rounded-xl h-9 px-3 pr-8 outline-none border-transparent cursor-pointer appearance-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <IconSelector className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <span>data per halaman</span>
              </div>


              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2 flex items-center gap-1 bg-white border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-600"
                >
                  <IconChevronLeft className="h-4 w-4" stroke={2} />
                </Button>
                <div className="text-xs font-semibold text-zinc-700 px-3 py-1 bg-white border border-zinc-200 rounded">
                  {currentPage} dari {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8 px-2 flex items-center gap-1 bg-white border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-600"
                >

                  <IconChevronRight className="h-4 w-4" stroke={2} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Dialog/Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-zinc-900">Detail Transaksi</DialogTitle>
            </DialogHeader>
            {selectedTrx && (
              <div className="space-y-5 pt-2">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1">Kode</p>
                    <p className="font-semibold text-zinc-900 text-sm font-mono">
                      {selectedTrx.kodeTransaksi
                        ? selectedTrx.kodeTransaksi.slice(0, 8).toUpperCase()
                        : selectedTrx._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1">Tanggal</p>
                    <p className="font-semibold text-zinc-900 text-sm">
                      {fmtDate(selectedTrx.createdAt)}, {fmtTime(selectedTrx.createdAt)}
                    </p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1">Customer</p>
                    <p className="font-semibold text-zinc-900 text-sm">
                      {selectedTrx.customer || <span className="text-zinc-400 italic">Umum</span>}
                    </p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1">Tipe Pembayaran</p>
                    <Badge variant={selectedTrx.paymentType === "cash" ? "default" : "secondary"} className="capitalize text-xs mt-0.5">
                      {selectedTrx.paymentType === "cash" ? "Tunai" : "Utang"}
                    </Badge>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-700 mb-3">Daftar Item</h3>
                  <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                        <tr>
                          <th className="py-2.5 px-3 text-left font-semibold text-[12px]">Nama Produk</th>
                          <th className="py-2.5 px-3 text-right font-semibold text-[12px]">Qty</th>
                          <th className="py-2.5 px-3 text-right font-semibold text-[12px]">Harga</th>
                          <th className="py-2.5 px-3 text-right font-semibold text-[12px]">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {selectedTrx.items &&
                          selectedTrx.items.map((item, idx) => {
                            const finalUnitPrice = item.harga || item.hargaFinal || 0;
                            return (
                              <tr key={idx} className="hover:bg-zinc-50/30 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-zinc-900 text-[12.5px]">
                                  {item.namaProduk || item.kodeProduk}
                                </td>
                                <td className="py-2.5 px-3 text-right text-zinc-600 text-[12px]">{item.qty}</td>
                                <td className="py-2.5 px-3 text-right text-zinc-600 text-[12px] whitespace-nowrap">
                                  {formatRupiah(finalUnitPrice)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-zinc-900 text-[12px] whitespace-nowrap">
                                  {formatRupiah(item.subtotal || finalUnitPrice * item.qty)}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-zinc-900 text-white rounded-lg p-4 flex justify-between items-center shadow-sm">
                  <span className="text-sm font-medium text-zinc-300">Total Pembayaran</span>
                  <span className="text-xl font-bold">{formatRupiah(selectedTrx.total)}</span>
                </div>

                {/* Status */}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-zinc-500">Status:</span>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                      selectedTrx.status === "lunas"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {selectedTrx.status}
                  </span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
