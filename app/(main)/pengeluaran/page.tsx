"use client";

import { useState, useEffect, useMemo } from "react";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  IconSearch,
  IconPackage,
  IconAlertTriangle,
  IconSelector,
  IconChevronLeft,
  IconChevronRight,
  IconTrash,
  IconBoxOff,
} from "@tabler/icons-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StockAdjustmentItem {
  kodeProduk: string;
  qty: number;
  batch?: number;
  harga?: number;
  hargaModal: number;
  subtotal: number;
  kategoriProduk: "fisik" | "digital";
}

interface StockAdjustment {
  _id: string;
  jenis: string;
  note?: string;
  items: StockAdjustmentItem[];
  totalKerugian: number;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const JENIS_LIST = [
  "Semua",
  "sedekah",
  "hilang",
  "rusak",
  "dipakai_sendiri",
  "sample",
  "expired",
  "giveaway",
];

const JENIS_LABEL: Record<string, string> = {
  sedekah: "Sedekah",
  hilang: "Hilang",
  rusak: "Rusak",
  dipakai_sendiri: "Dipakai Sendiri",
  sample: "Sample",
  expired: "Expired",
  giveaway: "Giveaway",
};

const JENIS_COLORS: Record<string, string> = {
  sedekah: "bg-green-50 text-green-700 border-green-200",
  hilang: "bg-red-50 text-red-700 border-red-200",
  rusak: "bg-orange-50 text-orange-700 border-orange-200",
  dipakai_sendiri: "bg-blue-50 text-blue-700 border-blue-200",
  sample: "bg-purple-50 text-purple-700 border-purple-200",
  expired: "bg-zinc-100 text-zinc-700 border-zinc-200",
  giveaway: "bg-pink-50 text-pink-700 border-pink-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatRupiah = (num: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  })
    .format(num)
    .replace("Rp", "Rp ");

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── Component ─────────────────────────────────────────────────────────────────

export default function PengeluaranPage() {
  const [data, setData] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeJenis, setActiveJenis] = useState("Semua");
  const [search, setSearch] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockAdjustment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/nontransaction", { credentials: "include" });
      const json = res.ok ? await res.json() : { success: false };
      if (json.success) {
        setData(json.data || []);
      }
    } catch (e) {
      console.error("Gagal mengambil data pengeluaran stok:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeJenis, search, pageSize]);

  // Filtered data
  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchJenis =
        activeJenis === "Semua" || item.jenis === activeJenis;
      const q = search.toLowerCase();
      const kodeList = item.items.map((i) => i.kodeProduk.toLowerCase()).join(" ");
      const matchSearch =
        !q ||
        (item.note ?? "").toLowerCase().includes(q) ||
        item.jenis.toLowerCase().includes(q) ||
        kodeList.includes(q) ||
        item._id.toLowerCase().includes(q);
      return matchJenis && matchSearch;
    });
  }, [data, activeJenis, search]);

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedData = filtered.slice(startIdx, endIdx);

  // Stats
  const totalSemua = useMemo(
    () => data.reduce((s, i) => s + i.totalKerugian, 0),
    [data]
  );

  const totalBulanIni = useMemo(() => {
    const now = new Date();
    return data
      .filter((i) => {
        const d = new Date(i.createdAt);
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, i) => s + i.totalKerugian, 0);
  }, [data]);

  const totalHariIni = useMemo(() => {
    const today = new Date().toDateString();
    return data
      .filter((i) => new Date(i.createdAt).toDateString() === today)
      .reduce((s, i) => s + i.totalKerugian, 0);
  }, [data]);

  const handleDelete = async () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/nontransaction/${selectedItem._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = res.ok ? await res.json() : { success: false };
      if (json.success) {
        await fetchData();
        setIsDeleteOpen(false);
        setSelectedItem(null);
      }
    } catch (e) {
      console.error("Gagal menghapus:", e);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Pengeluaran Stok
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Riwayat pengurangan stok non-transaksi (rusak, hilang, expired, dll).
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <div>
              <h3 className="text-sm font-medium text-zinc-500">Total Kerugian Stok</h3>
              <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-2 mb-1">
                {formatRupiah(totalSemua)}
              </p>
            </div>
            <div className="text-xs text-zinc-400 font-medium">Akumulasi seluruh kerugian stok</div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <div>
              <h3 className="text-sm font-medium text-zinc-500">Kerugian Bulan Ini</h3>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-2 mb-1">
                {formatRupiah(totalBulanIni)}
              </p>
            </div>
            <div className="text-xs text-zinc-400 font-medium">Kerugian bulan berjalan</div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
            <div>
              <h3 className="text-sm font-medium text-zinc-500">Kerugian Hari Ini</h3>
              <p className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-2 mb-1">
                {formatRupiah(totalHariIni)}
              </p>
            </div>
            <div className="text-xs text-zinc-400 font-medium">Kerugian hari berjalan</div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden flex flex-col">

          {/* Filter + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100">
            <div className="flex items-center gap-0.5 bg-zinc-100 rounded-lg p-1 overflow-x-auto shrink-0">
              {JENIS_LIST.map((j) => (
                <button
                  key={j}
                  onClick={() => setActiveJenis(j)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all duration-150 cursor-pointer
                    ${activeJenis === j
                      ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/40"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-white/60"
                    }
                  `}
                >
                  {j === "Semua" ? "Semua" : JENIS_LABEL[j]}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64 shrink-0">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" stroke={1.5} />
              <input
                type="text"
                placeholder="Cari kode produk / catatan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-transparent bg-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="w-[60px] text-center font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Jenis</TableHead>
                  <TableHead className="font-semibold">Catatan</TableHead>
                  <TableHead className="font-semibold text-center">Jml Produk</TableHead>
                  <TableHead className="font-semibold text-right">Kerugian</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <div className="flex items-center justify-center gap-2 text-zinc-500">
                        <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconBoxOff className="w-10 h-10" stroke={1} />
                        <span className="text-sm">
                          {search || activeJenis !== "Semua"
                            ? "Tidak ada data yang sesuai filter."
                            : "Belum ada catatan pengeluaran stok."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((item, index) => {
                    const displayedIndex = startIdx + index + 1;
                    return (
                      <TableRow key={item._id} className="hover:bg-zinc-50/40 transition-colors">
                        <TableCell className="text-center text-zinc-500 font-medium">{displayedIndex}</TableCell>
                        <TableCell className="text-[13px] text-zinc-600 whitespace-nowrap font-medium">
                          {formatDate(item.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              JENIS_COLORS[item.jenis] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"
                            }`}
                          >
                            {JENIS_LABEL[item.jenis] ?? item.jenis}
                          </span>
                        </TableCell>
                        <TableCell className="text-[13px] font-medium text-zinc-700 max-w-xs truncate">
                          {item.note
                            ? item.note
                            : <span className="text-zinc-400 italic">Tidak ada catatan</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-[13px] font-medium text-zinc-600">
                            <IconPackage className="w-3.5 h-3.5 text-zinc-400" stroke={1.5} />
                            {item.items.length} item
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-[13px] font-semibold text-red-600 whitespace-nowrap">
                          {formatRupiah(item.totalKerugian)}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => { setSelectedItem(item); setIsDeleteOpen(true); }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Hapus & rollback stok"
                          >
                            <IconTrash className="w-4 h-4" stroke={1.5} />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
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
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
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
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="h-8 px-2 flex items-center gap-1 bg-white border-zinc-200 hover:bg-zinc-50 text-xs font-medium text-zinc-600"
                >
                  <IconChevronRight className="h-4 w-4" stroke={2} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={(o) => { if (!o) setSelectedItem(null); setIsDeleteOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Catatan Stok</DialogTitle>
            <DialogDescription>
              Menghapus catatan ini akan mengembalikan stok ke inventori secara otomatis.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Jenis</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    JENIS_COLORS[selectedItem.jenis] ?? ""
                  }`}
                >
                  {JENIS_LABEL[selectedItem.jenis]}
                </span>
              </div>
              <div className="h-[1px] bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Jumlah Produk</span>
                <span className="font-semibold">{selectedItem.items.length} item</span>
              </div>
              <div className="h-[1px] bg-border" />
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Total Kerugian</span>
                <span className="font-bold text-destructive">{formatRupiah(selectedItem.totalKerugian)}</span>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-950/20 dark:border-yellow-900/30">
            <IconAlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" stroke={2} />
            <p className="text-[13px] text-yellow-700 dark:text-yellow-400 font-medium">
              Tindakan ini tidak dapat dibatalkan setelah stok dikembalikan.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsDeleteOpen(false); setSelectedItem(null); }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menghapus...</span>
                </div>
              ) : "Hapus & Rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
