"use client";

import { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconReceipt,
  IconSearch,
  IconPlus,
  IconPackage,
  IconAlertCircle,
  IconWallet,
  IconCalendarStats,
  IconTrash,
} from "@tabler/icons-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Pengeluaran {
  id: string;
  tanggal: string;
  keterangan: string;
  kategori: string;
  jumlah: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const KATEGORI_LIST = [
  "Semua",
  "Listrik",
  "Gaji",
  "Sewa",
  "Pembelian Barang",
  "Perawatan",
  "Transportasi",
  "Lainnya",
];

const KATEGORI_COLORS: Record<string, string> = {
  Listrik: "bg-amber-50 text-amber-700 border-amber-200",
  Gaji: "bg-blue-50 text-blue-700 border-blue-200",
  Sewa: "bg-purple-50 text-purple-700 border-purple-200",
  "Pembelian Barang": "bg-green-50 text-green-700 border-green-200",
  Perawatan: "bg-orange-50 text-orange-700 border-orange-200",
  Transportasi: "bg-cyan-50 text-cyan-700 border-cyan-200",
  Lainnya: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

// ── Seed Data ────────────────────────────────────────────────────────────────

const SEED_DATA: Pengeluaran[] = [
  { id: "PGL-001", tanggal: new Date(Date.now() - 0 * 86400000).toISOString(), keterangan: "Bayar tagihan listrik bulan ini", kategori: "Listrik", jumlah: 450000 },
  { id: "PGL-002", tanggal: new Date(Date.now() - 1 * 86400000).toISOString(), keterangan: "Gaji karyawan bulan Mei", kategori: "Gaji", jumlah: 3500000 },
  { id: "PGL-003", tanggal: new Date(Date.now() - 2 * 86400000).toISOString(), keterangan: "Sewa ruko bulan Mei", kategori: "Sewa", jumlah: 2000000 },
  { id: "PGL-004", tanggal: new Date(Date.now() - 3 * 86400000).toISOString(), keterangan: "Beli stok bahan baku", kategori: "Pembelian Barang", jumlah: 850000 },
  { id: "PGL-005", tanggal: new Date(Date.now() - 4 * 86400000).toISOString(), keterangan: "Service AC dan kipas angin", kategori: "Perawatan", jumlah: 300000 },
  { id: "PGL-006", tanggal: new Date(Date.now() - 5 * 86400000).toISOString(), keterangan: "Ongkos kirim supplier", kategori: "Transportasi", jumlah: 120000 },
  { id: "PGL-007", tanggal: new Date(Date.now() - 6 * 86400000).toISOString(), keterangan: "Biaya administrasi lain-lain", kategori: "Lainnya", jumlah: 75000 },
  { id: "PGL-008", tanggal: new Date(Date.now() - 7 * 86400000).toISOString(), keterangan: "Token listrik prabayar", kategori: "Listrik", jumlah: 200000 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

export default function PengeluaranPage() {
  const [data, setData] = useState<Pengeluaran[]>(SEED_DATA);
  const [activeKategori, setActiveKategori] = useState("Semua");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Pengeluaran | null>(null);

  // Form state
  const [formKeterangan, setFormKeterangan] = useState("");
  const [formKategori, setFormKategori] = useState("");
  const [formJumlah, setFormJumlah] = useState("");
  const [formJumlahRaw, setFormJumlahRaw] = useState("");
  const [formTanggal, setFormTanggal] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Filtered + searched data
  const filtered = useMemo(() => {
    return data.filter((item) => {
      const matchKat =
        activeKategori === "Semua" || item.kategori === activeKategori;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.keterangan.toLowerCase().includes(q) ||
        item.kategori.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);
      return matchKat && matchSearch;
    });
  }, [data, activeKategori, search]);

  // Stats
  const totalBulanIni = useMemo(() => {
    const now = new Date();
    return data
      .filter((i) => {
        const d = new Date(i.tanggal);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, i) => s + i.jumlah, 0);
  }, [data]);

  const totalHariIni = useMemo(() => {
    const today = new Date().toDateString();
    return data
      .filter((i) => new Date(i.tanggal).toDateString() === today)
      .reduce((s, i) => s + i.jumlah, 0);
  }, [data]);

  const totalSemua = useMemo(() => data.reduce((s, i) => s + i.jumlah, 0), [data]);

  // Form handlers
  const handleJumlahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setFormJumlahRaw(raw);
    setFormJumlah(raw ? formatRupiah(Number(raw)) : "");
  };

  const resetForm = () => {
    setFormKeterangan("");
    setFormKategori("");
    setFormJumlah("");
    setFormJumlahRaw("");
    setFormTanggal(new Date().toISOString().split("T")[0]);
    setFormError("");
  };

  const handleSave = async () => {
    if (!formKeterangan.trim()) { setFormError("Keterangan wajib diisi."); return; }
    if (!formKategori) { setFormError("Pilih kategori pengeluaran."); return; }
    if (!formJumlahRaw || Number(formJumlahRaw) <= 0) { setFormError("Masukkan jumlah yang valid."); return; }

    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 600)); // Simulate API
    const newItem: Pengeluaran = {
      id: `PGL-${String(data.length + 1).padStart(3, "0")}`,
      tanggal: new Date(formTanggal).toISOString(),
      keterangan: formKeterangan.trim(),
      kategori: formKategori,
      jumlah: Number(formJumlahRaw),
    };
    setData((prev) => [newItem, ...prev]);
    setIsSaving(false);
    setIsAddOpen(false);
    resetForm();
  };

  const openDelete = (item: Pengeluaran) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    setData((prev) => prev.filter((i) => i.id !== selectedItem.id));
    setIsDeleteOpen(false);
    setSelectedItem(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f8f9] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              Pengeluaran
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Catat dan kelola pengeluaran operasional toko.
            </p>
          </div>
          <Button
            onClick={() => { resetForm(); setIsAddOpen(true); }}
            className="h-10 px-5 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-lg shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <IconPlus className="w-4 h-4" stroke={2} />
            Tambah Pengeluaran
          </Button>
        </div>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <IconWallet className="w-5 h-5 text-red-500" stroke={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Total Semua Pengeluaran</p>
              <p className="text-xl font-bold text-red-600">{formatRupiah(totalSemua)}</p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
              <IconCalendarStats className="w-5 h-5 text-zinc-600" stroke={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Pengeluaran Bulan Ini</p>
              <p className="text-xl font-bold text-zinc-900">{formatRupiah(totalBulanIni)}</p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
              <IconReceipt className="w-5 h-5 text-zinc-600" stroke={1.5} />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-0.5">Pengeluaran Hari Ini</p>
              <p className="text-xl font-bold text-zinc-900">{formatRupiah(totalHariIni)}</p>
            </div>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">

          {/* ── Filter + Search Bar ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100">
            {/* Category Tabs */}
            <div className="flex items-center gap-0.5 bg-zinc-100/70 rounded-lg p-1 overflow-x-auto shrink-0">
              {KATEGORI_LIST.map((kat) => (
                <button
                  key={kat}
                  onClick={() => setActiveKategori(kat)}
                  className={`
                    px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-all duration-150 cursor-pointer
                    ${activeKategori === kat
                      ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/80"
                      : "text-zinc-500 hover:text-zinc-700 hover:bg-white/60"
                    }
                  `}
                >
                  {kat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64 shrink-0">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" stroke={1.5} />
              <input
                type="text"
                placeholder="Cari keterangan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-zinc-200 bg-transparent placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-zinc-300 transition"
              />
            </div>
          </div>

          {/* ── Table ── */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                  <TableHead className="font-semibold text-zinc-900 h-11">Tanggal</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">ID</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Keterangan</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11">Kategori</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-right">Jumlah</TableHead>
                  <TableHead className="font-semibold text-zinc-900 h-11 text-center w-16">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconPackage className="w-10 h-10" stroke={1} />
                        <span className="text-sm">
                          {search || activeKategori !== "Semua"
                            ? "Tidak ada pengeluaran yang sesuai filter."
                            : "Belum ada data pengeluaran."}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                      <TableCell className="text-[13px] text-zinc-500 whitespace-nowrap">
                        {formatDate(item.tanggal)}
                      </TableCell>
                      <TableCell className="text-[13px] text-zinc-400 font-mono">
                        {item.id}
                      </TableCell>
                      <TableCell className="text-[13px] font-medium text-zinc-900 max-w-xs">
                        {item.keterangan}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            KATEGORI_COLORS[item.kategori] ?? "bg-zinc-100 text-zinc-700 border-zinc-200"
                          }`}
                        >
                          {item.kategori}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-[13px] font-semibold text-red-600 whitespace-nowrap">
                        {formatRupiah(item.jumlah)}
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => openDelete(item)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <IconTrash className="w-4 h-4" stroke={1.5} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer */}
          {filtered.length > 0 && (
            <div className="px-6 py-3 border-t border-zinc-100 flex justify-between items-center">
              <span className="text-xs text-zinc-400">
                Menampilkan {filtered.length} dari {data.length} pengeluaran
              </span>
              <span className="text-sm font-semibold text-red-600">
                Total: {formatRupiah(filtered.reduce((s, i) => s + i.jumlah, 0))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Pengeluaran Modal ── */}
      <Dialog open={isAddOpen} onOpenChange={(o) => { if (!o) resetForm(); setIsAddOpen(o); }}>
        <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-100">
            <DialogTitle className="text-lg font-bold text-zinc-900">
              Tambah Pengeluaran
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-5 space-y-4">
            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-zinc-800">Tanggal</label>
              <input
                type="date"
                value={formTanggal}
                onChange={(e) => setFormTanggal(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-200 bg-[#f4f4f5] focus:outline-none focus:ring-1 focus:ring-zinc-300 transition font-medium text-zinc-800"
              />
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-zinc-800">Keterangan</label>
              <Input
                type="text"
                value={formKeterangan}
                onChange={(e) => setFormKeterangan(e.target.value)}
                placeholder="Contoh: Bayar tagihan listrik..."
                className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 font-medium"
              />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-zinc-800">Kategori</label>
              <Select value={formKategori} onValueChange={setFormKategori}>
                <SelectTrigger className="h-10 bg-[#f4f4f5] border-transparent focus:ring-1 focus:ring-zinc-300 font-medium text-sm">
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI_LIST.filter((k) => k !== "Semua").map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Jumlah */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-zinc-800">Jumlah (Rp)</label>
              <Input
                type="text"
                value={formJumlah}
                onChange={handleJumlahChange}
                placeholder="Rp 0"
                className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 font-medium"
              />
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <IconAlertCircle className="w-4 h-4 text-red-500 shrink-0" stroke={2} />
                <p className="text-[13px] text-red-600 font-medium">{formError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setIsAddOpen(false); resetForm(); }}
                className="flex-1 h-11 border-zinc-200 text-zinc-700 font-medium rounded-lg"
              >
                Batal
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 h-11 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Menyimpan...
                  </div>
                ) : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={isDeleteOpen} onOpenChange={(o) => { if (!o) setSelectedItem(null); setIsDeleteOpen(o); }}>
        <DialogContent className="sm:max-w-[380px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-100">
            <DialogTitle className="text-lg font-bold text-zinc-900">Hapus Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-4 space-y-4">
            {selectedItem && (
              <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-500 font-medium">Keterangan</span>
                  <span className="font-semibold text-zinc-900 text-right max-w-[180px]">{selectedItem.keterangan}</span>
                </div>
                <div className="h-[1px] bg-zinc-200" />
                <div className="flex justify-between text-[13px]">
                  <span className="text-zinc-500 font-medium">Jumlah</span>
                  <span className="font-bold text-red-600">{formatRupiah(selectedItem.jumlah)}</span>
                </div>
              </div>
            )}
            <p className="text-[13px] text-zinc-500">
              Data pengeluaran ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => { setIsDeleteOpen(false); setSelectedItem(null); }}
                className="flex-1 h-11 border-zinc-200 text-zinc-700 font-medium rounded-lg"
              >
                Batal
              </Button>
              <Button
                onClick={handleDelete}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg cursor-pointer transition-colors"
              >
                Hapus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
