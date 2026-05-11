"use client";

import { useState } from "react";
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
  IconEye,
  IconReceipt,
  IconCalendarEvent,
} from "@tabler/icons-react";

interface TransactionItem {
  kodeProduk: string;
  namaProduk: string;
  qty: number;
  harga: number;
  batch?: number;
}

interface Transaction {
  _id: string;
  createdAt: string;
  customer: string;
  paymentType: "cash" | "utang";
  items: TransactionItem[];
  total: number;
  status: string;
}

// Dummy transactions matching POST /api/transaction fields
const dummyTransactions: Transaction[] = [
  {
    _id: "TRX-2026-00421",
    createdAt: "2026-05-03T14:32:00",
    customer: "Budi",
    paymentType: "cash",
    items: [
      { kodeProduk: "PRD-001", namaProduk: "Indomie Goreng", qty: 5, harga: 3500 },
      { kodeProduk: "PRD-002", namaProduk: "Aqua 600ml", qty: 3, harga: 4000 },
    ],
    total: 29500,
    status: "lunas",
  },
  {
    _id: "TRX-2026-00420",
    createdAt: "2026-05-03T13:15:00",
    customer: "Siti",
    paymentType: "utang",
    items: [
      { kodeProduk: "PRD-003", namaProduk: "Teh Botol 350ml", qty: 10, harga: 5000 },
    ],
    total: 50000,
    status: "belum lunas",
  },
  {
    _id: "TRX-2026-00419",
    createdAt: "2026-05-03T11:45:00",
    customer: "-",
    paymentType: "cash",
    items: [
      { kodeProduk: "PRD-004", namaProduk: "Sabun Lifebuoy", qty: 2, harga: 5500 },
      { kodeProduk: "PRD-005", namaProduk: "Roma Kelapa", qty: 4, harga: 2000 },
      { kodeProduk: "PRD-001", namaProduk: "Indomie Goreng", qty: 10, harga: 3500 },
    ],
    total: 54000,
    status: "lunas",
  },
  {
    _id: "TRX-2026-00418",
    createdAt: "2026-05-02T17:20:00",
    customer: "Andi",
    paymentType: "cash",
    items: [
      { kodeProduk: "PRD-002", namaProduk: "Aqua 600ml", qty: 12, harga: 3000, batch: 2 },
    ],
    total: 36000,
    status: "lunas",
  },
  {
    _id: "TRX-2026-00417",
    createdAt: "2026-05-02T16:05:00",
    customer: "Rini",
    paymentType: "utang",
    items: [
      { kodeProduk: "PRD-003", namaProduk: "Teh Botol 350ml", qty: 5, harga: 5000 },
      { kodeProduk: "PRD-004", namaProduk: "Sabun Lifebuoy", qty: 1, harga: 5500 },
    ],
    total: 30500,
    status: "belum lunas",
  },
  {
    _id: "TRX-2026-00416",
    createdAt: "2026-05-02T14:30:00",
    customer: "-",
    paymentType: "cash",
    items: [
      { kodeProduk: "PRD-001", namaProduk: "Indomie Goreng", qty: 3, harga: 3500 },
    ],
    total: 10500,
    status: "lunas",
  },
  {
    _id: "TRX-2026-00415",
    createdAt: "2026-05-01T10:00:00",
    customer: "Dewi",
    paymentType: "cash",
    items: [
      { kodeProduk: "PRD-005", namaProduk: "Roma Kelapa", qty: 6, harga: 2000 },
      { kodeProduk: "PRD-002", namaProduk: "Aqua 600ml", qty: 2, harga: 4000 },
    ],
    total: 20000,
    status: "lunas",
  },
];

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (d: string) => {
  const date = new Date(d);
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
};

export default function OwnerTransaksiPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPayment, setFilterPayment] = useState<"semua" | "cash" | "utang">("semua");
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const filtered = dummyTransactions.filter(t => {
    const matchSearch =
      t._id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPayment = filterPayment === "semua" || t.paymentType === filterPayment;
    return matchSearch && matchPayment;
  });

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
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-zinc-100">
            <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
              {(["semua", "cash", "utang"] as const).map(t => (
                <button key={t} onClick={() => setFilterPayment(t)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                    filterPayment === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  }`}>{t === "semua" ? "Semua" : t === "cash" ? "Tunai" : "Utang"}</button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <IconSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" stroke={1.5} />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari ID transaksi..."
                className="pl-9 h-9 bg-zinc-50 border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="w-[50px] text-center font-semibold">No.</TableHead>
                  <TableHead className="font-semibold">ID Transaksi</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Pembayaran</TableHead>
                  <TableHead className="font-semibold">Jumlah Item</TableHead>
                  <TableHead className="font-semibold text-right">Total</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconReceipt className="w-10 h-10" stroke={1} />
                        <span className="text-sm">Tidak ada transaksi ditemukan.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((trx, index) => (
                    <TableRow key={trx._id}>
                      <TableCell className="text-center text-zinc-500 font-medium">{index + 1}</TableCell>
                      <TableCell className="font-mono text-sm text-zinc-700">{trx._id}</TableCell>
                      <TableCell className="text-zinc-600 text-sm whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <IconCalendarEvent className="w-3.5 h-3.5 text-zinc-400" />
                          {formatDate(trx.createdAt)}, {formatTime(trx.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={trx.paymentType === "cash" ? "default" : "secondary"} className="capitalize text-xs">
                          {trx.paymentType === "cash" ? "Tunai" : "Utang"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-600">{trx.items.reduce((s, i) => s + i.qty, 0)} pcs</TableCell>
                      <TableCell className="text-right font-medium text-zinc-900 whitespace-nowrap">{formatRupiah(trx.total)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          trx.status === "lunas"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>{trx.status}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(trx)}
                          className="h-8 w-8 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" title="Lihat detail">
                          <IconEye className="h-4 w-4" stroke={1.5} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Detail Transaksi</DialogTitle>
            </DialogHeader>
            {selectedTrx && (
              <div className="space-y-5 pt-2">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1">ID Transaksi</p>
                    <p className="font-semibold text-zinc-900 text-sm font-mono">{selectedTrx._id}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1">Tanggal</p>
                    <p className="font-semibold text-zinc-900 text-sm">{formatDate(selectedTrx.createdAt)}, {formatTime(selectedTrx.createdAt)}</p>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                    <p className="text-[11px] font-medium text-zinc-500 mb-1">Customer</p>
                    <p className="font-semibold text-zinc-900 text-sm">{selectedTrx.customer}</p>
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
                  <div className="border border-zinc-100 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                          <th className="py-2.5 px-3 text-left font-medium">Produk</th>
                          <th className="py-2.5 px-3 text-left font-medium">Kode</th>
                          <th className="py-2.5 px-3 text-right font-medium">Qty</th>
                          <th className="py-2.5 px-3 text-right font-medium">Harga</th>
                          <th className="py-2.5 px-3 text-right font-medium">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {selectedTrx.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-medium text-zinc-900">{item.namaProduk}</td>
                            <td className="py-2.5 px-3 text-zinc-500 font-mono text-xs">{item.kodeProduk}</td>
                            <td className="py-2.5 px-3 text-right text-zinc-600">{item.qty}</td>
                            <td className="py-2.5 px-3 text-right text-zinc-600 whitespace-nowrap">{formatRupiah(item.harga)}</td>
                            <td className="py-2.5 px-3 text-right font-medium text-zinc-900 whitespace-nowrap">{formatRupiah(item.qty * item.harga)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-zinc-900 text-white rounded-lg p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-300">Total Pembayaran</span>
                  <span className="text-xl font-bold">{formatRupiah(selectedTrx.total)}</span>
                </div>

                {/* Status */}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm text-zinc-500">Status:</span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                    selectedTrx.status === "lunas"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}>{selectedTrx.status}</span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
