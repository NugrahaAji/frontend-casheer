"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  IconPlus, IconAlertCircle, IconCheck, IconTrash, IconSearch, IconPackage, IconSelector, IconPencil, IconDots, IconStack2
} from "@tabler/icons-react";

interface GrosirPricing { jumlah: number; hargaJual: number; }
interface Product {
  kodeProduk: string; namaProduk: string; kategoriProduk: string;
  kepemilikan: string; status: string; biayaAdmin?: number;
  pricing?: { eceran?: { hargaJual: number }; grosir?: GrosirPricing[]; };
  stock?: { batch: number; jumlah: number; hargaBeli: number; stok: number }[];
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const KATEGORI_PRESETS = ["Makanan", "Minuman", "Snack", "Rokok", "Sabun", "ATK", "Pulsa", "Token Listrik", "E-Wallet"];

// Combobox component for kategori
function KategoriCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputValue(value); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = KATEGORI_PRESETS.filter(k => k.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Pilih atau ketik kategori"
          className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg pr-8"
        />
        <button type="button" onClick={() => setOpen(!open)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
          <IconSelector className="w-4 h-4" />
        </button>
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(k => (
            <button key={k} type="button" onClick={() => { onChange(k); setInputValue(k); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors">
              {k}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StokBarangPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState<"fisik" | "digital">("fisik");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form
  const [formKategori, setFormKategori] = useState<"fisik" | "digital">("fisik");
  const [namaProduk, setNamaProduk] = useState("");
  const [kategoriProduk, setKategoriProduk] = useState("");
  const [kepemilikan, setKepemilikan] = useState<"sendiri" | "titipan">("sendiri");
  const [hargaJualEceran, setHargaJualEceran] = useState("");
  const [hargaModal, setHargaModal] = useState("");
  const [biayaAdmin, setBiayaAdmin] = useState("");
  const [grosirList, setGrosirList] = useState<GrosirPricing[]>([]);
  const [grosirJumlah, setGrosirJumlah] = useState("");
  const [grosirHarga, setGrosirHarga] = useState("");
  const [grosirInputError, setGrosirInputError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Batch state
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [batchTarget, setBatchTarget] = useState<Product | null>(null);
  const [batchJumlah, setBatchJumlah] = useState("");
  const [batchHargaBeli, setBatchHargaBeli] = useState("");
  const [batchStok, setBatchStok] = useState("");
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchSuccess, setBatchSuccess] = useState("");

  const fetchProducts = async (kategori: string) => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch(`/api/product/${kategori}`);
      const data = await res.json();
      setProducts(res.ok && data.success ? (data.data?.produk || []) : []);
    } catch { setProducts([]); }
    finally { setIsLoadingProducts(false); }
  };

  useEffect(() => { fetchProducts(activeTab); }, [activeTab]);

  const resetForm = () => {
    setNamaProduk(""); setKategoriProduk(""); setKepemilikan("sendiri");
    setHargaJualEceran(""); setHargaModal(""); setBiayaAdmin("");
    setGrosirList([]); setGrosirJumlah(""); setGrosirHarga("");
    setGrosirInputError(""); setErrorMsg(""); setSuccessMsg("");
  };

  const openAddDialog = () => {
    resetForm();
    setFormKategori(activeTab);
    setIsDialogOpen(true);
  };

  const openBatchDialog = (product: Product) => {
    setBatchTarget(product);
    setBatchJumlah(""); setBatchHargaBeli(""); setBatchStok("");
    setBatchError(""); setBatchSuccess("");
    setIsBatchDialogOpen(true);
  };

  const handleAddBatch = async () => {
    if (!batchTarget) return;
    const j = parseInt(batchJumlah);
    const hb = parseInt(batchHargaBeli);
    const s = parseInt(batchStok);
    if (isNaN(j) || j < 1) { setBatchError("Jumlah harus diisi dan minimal 1."); return; }
    if (isNaN(hb) || hb < 0) { setBatchError("Harga beli harus diisi."); return; }
    if (isNaN(s) || s < 0) { setBatchError("Stok harus diisi."); return; }

    setIsBatchSubmitting(true); setBatchError(""); setBatchSuccess("");
    try {
      const res = await fetch(`/api/product/fisik/${batchTarget.kodeProduk}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ jumlah: j, hargaBeli: hb, stok: s }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBatchSuccess("Batch berhasil ditambahkan!");
        fetchProducts(activeTab);
        setTimeout(() => setIsBatchDialogOpen(false), 1200);
      } else {
        setBatchError(data.message || data.error || "Gagal menambahkan batch.");
      }
    } catch { setBatchError("Terjadi kesalahan jaringan."); }
    finally { setIsBatchSubmitting(false); }
  };

  const handleDelete = async (kodeProduk: string) => {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;
    try {
      const res = await fetch(`/api/product/${activeTab}/${kodeProduk}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success) fetchProducts(activeTab);
      else alert(data.message || "Gagal menghapus.");
    } catch { alert("Kesalahan jaringan."); }
  };

  const addGrosirRow = () => {
    const j = parseInt(grosirJumlah), h = parseInt(grosirHarga);
    if (isNaN(j) || j < 1) { setGrosirInputError("Min. Qty harus diisi dan minimal 1."); return; }
    if (isNaN(h) || h < 0) { setGrosirInputError("Harga/pcs harus diisi."); return; }
    setGrosirInputError("");
    setGrosirList([...grosirList, { jumlah: j, hargaJual: h }]);
    setGrosirJumlah(""); setGrosirHarga("");
  };

  const parseBackendError = (data: any): string => {
    if (!data) return "Gagal menambahkan produk.";
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message)) {
      return data.message.map((e: any) => e.message || JSON.stringify(e)).join(", ");
    }
    if (data.error) return data.error;
    return "Gagal menambahkan produk.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(""); setSuccessMsg("");

    // Frontend validation
    if (!namaProduk.trim() || namaProduk.trim().length < 2) {
      setErrorMsg("Nama produk minimal 2 karakter."); return;
    }
    if (!kategoriProduk.trim() || kategoriProduk.trim().length < 2) {
      setErrorMsg("Kategori produk wajib diisi (minimal 2 karakter)."); return;
    }
    if (formKategori === "fisik") {
      const h = parseInt(hargaJualEceran);
      if (isNaN(h) || h < 0) { setErrorMsg("Harga eceran wajib diisi untuk produk fisik."); return; }
    }
    if (formKategori === "digital") {
      const a = parseInt(biayaAdmin);
      if (isNaN(a) || a < 0) { setErrorMsg("Biaya admin wajib diisi untuk produk digital."); return; }
    }

    setIsSubmitting(true);

    const body: Record<string, any> = { namaProduk: namaProduk.trim(), kategoriProduk: kategoriProduk.trim(), kepemilikan };

    if (formKategori === "fisik") {
      const pricing: Record<string, any> = {};
      const h = parseInt(hargaJualEceran);
      pricing.eceran = { hargaJual: h };
      if (grosirList.length > 0) pricing.grosir = grosirList;
      body.pricing = pricing;
    } else {
      body.biayaAdmin = parseInt(biayaAdmin);
    }

    try {
      const res = await fetch(`/api/product/${formKategori}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg("Produk berhasil ditambahkan!");
        // Refresh produk & switch tab jika perlu
        if (formKategori !== activeTab) setActiveTab(formKategori);
        else fetchProducts(activeTab);
        setTimeout(() => { setIsDialogOpen(false); resetForm(); }, 1200);
      } else {
        setErrorMsg(parseBackendError(data));
      }
    } catch { setErrorMsg("Terjadi kesalahan jaringan."); }
    finally { setIsSubmitting(false); }
  };

  const filteredProducts = products.filter(p =>
    p.namaProduk.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.kodeProduk.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.kategoriProduk.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTotalStock = (p: Product) => p.stock?.reduce((s, b) => s + b.stok, 0) || 0;

  return (
    <>
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Stok Barang</h1>
            <p className="text-sm text-zinc-500 mt-1">Kelola dan pantau stok barang di toko Anda.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o && !isSubmitting) { setIsDialogOpen(false); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} className="h-10 px-5 bg-[#09090b] hover:bg-[#27272a] text-white rounded-lg font-medium">
                <IconPlus className="w-4 h-4 mr-2" stroke={2} /> Tambah Produk
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="text-lg font-semibold">Tambah Produk Baru</DialogTitle></DialogHeader>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" stroke={1.5} />
                  <p className="text-[13px] text-red-600 font-medium">{errorMsg}</p>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <IconCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" stroke={1.5} />
                  <p className="text-[13px] text-green-700 font-medium">{successMsg}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                {/* Tipe Produk */}
                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-zinc-800">Tipe Produk</Label>
                  <div className="flex gap-2">
                    {(["fisik", "digital"] as const).map(t => (
                      <button key={t} type="button" onClick={() => setFormKategori(t)}
                        className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors capitalize ${
                          formKategori === t ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                        }`}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Nama & Kategori */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-zinc-800">Nama Produk <span className="text-red-500">*</span></Label>
                    <Input value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)}
                      placeholder="Contoh: Indomie Goreng" required
                      className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-zinc-800">Kategori Produk <span className="text-red-500">*</span></Label>
                    <KategoriCombobox value={kategoriProduk} onChange={setKategoriProduk} />
                  </div>
                </div>

                {/* Kepemilikan */}
                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-zinc-800">Kepemilikan <span className="text-red-500">*</span></Label>
                  <Select value={kepemilikan} onValueChange={(v: "sendiri" | "titipan") => setKepemilikan(v)}>
                    <SelectTrigger className="h-10 bg-[#f4f4f5] border-transparent focus:ring-1 focus:ring-zinc-300 text-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sendiri">Barang Sendiri</SelectItem>
                      <SelectItem value="titipan">Barang Titipan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Harga Modal Penitip (only for titipan) */}
                {kepemilikan === "titipan" && formKategori === "fisik" && (
                  <div className="space-y-2 bg-amber-50/50 border border-amber-200 rounded-lg p-4">
                    <Label className="text-[13px] font-semibold text-amber-800">
                      Harga Modal / Harga Penitip <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-xs text-amber-600 mb-2">Harga yang dibayarkan kepada penitip per unit barang.</p>
                    <Input type="number" value={hargaModal} onChange={(e) => setHargaModal(e.target.value)}
                      placeholder="Contoh: 2500" required min={0}
                      className="h-10 bg-white border-amber-200 focus-visible:ring-1 focus-visible:ring-amber-300 text-sm rounded-lg" />
                  </div>
                )}

                {/* Fisik: Pricing */}
                {formKategori === "fisik" && (
                  <div className="space-y-4 border-t border-zinc-100 pt-4">
                    <h3 className="text-sm font-semibold text-zinc-700">Harga Jual</h3>
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-zinc-800">Harga Eceran <span className="text-red-500">*</span></Label>
                      <Input type="number" value={hargaJualEceran} onChange={(e) => setHargaJualEceran(e.target.value)}
                        placeholder="Contoh: 3500" required min={0}
                        className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
                    </div>

                    {/* Grosir */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-[13px] font-semibold text-zinc-800">
                          Harga Grosir <span className="text-zinc-400 font-normal">(Opsional)</span>
                        </Label>
                        <p className="text-xs text-zinc-500 mt-0.5">Atur harga khusus untuk pembelian dalam jumlah banyak. Isi qty minimum dan harga per pcs, lalu klik tombol tambah.</p>
                      </div>

                      {grosirList.length > 0 && (
                        <div className="space-y-2">
                          {grosirList.map((g, i) => (
                            <div key={i} className="flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-lg text-sm">
                              <span className="text-zinc-700 flex-1">
                                Beli ≥ <span className="font-semibold">{g.jumlah}</span> pcs → <span className="font-semibold">{formatRupiah(g.hargaJual)}</span>/pcs
                              </span>
                              <button type="button" onClick={() => setGrosirList(grosirList.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                                <IconTrash className="w-4 h-4" stroke={1.5} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <span className="text-xs text-zinc-500">Min. Qty (pcs)</span>
                          <Input type="number" value={grosirJumlah}
                            onChange={(e) => { setGrosirJumlah(e.target.value); setGrosirInputError(""); }}
                            placeholder="12" min={1}
                            className={`h-9 bg-[#f4f4f5] border-transparent text-sm rounded-lg ${grosirInputError ? "ring-1 ring-red-400" : ""}`} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <span className="text-xs text-zinc-500">Harga/pcs (Rp)</span>
                          <Input type="number" value={grosirHarga}
                            onChange={(e) => { setGrosirHarga(e.target.value); setGrosirInputError(""); }}
                            placeholder="3000" min={0}
                            className={`h-9 bg-[#f4f4f5] border-transparent text-sm rounded-lg ${grosirInputError ? "ring-1 ring-red-400" : ""}`} />
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addGrosirRow}
                          className="h-9 px-3 shrink-0" title="Tambah tier harga grosir">
                          <IconPlus className="w-4 h-4 mr-1" stroke={2} /> Tambah
                        </Button>
                      </div>
                      {grosirInputError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <IconAlertCircle className="w-3.5 h-3.5" stroke={2} /> {grosirInputError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Digital: Biaya Admin */}
                {formKategori === "digital" && (
                  <div className="space-y-4 border-t border-zinc-100 pt-4">
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-zinc-800">Biaya Admin <span className="text-red-500">*</span></Label>
                      <Input type="number" value={biayaAdmin} onChange={(e) => setBiayaAdmin(e.target.value)}
                        placeholder="Contoh: 2500" required min={0}
                        className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                  <Button type="button" variant="outline" onClick={() => { if (!isSubmitting) { setIsDialogOpen(false); resetForm(); } }} disabled={isSubmitting} className="h-10 px-5 rounded-lg">Batal</Button>
                  <Button type="submit" className="h-10 px-6 bg-[#09090b] hover:bg-[#27272a] text-white rounded-lg font-medium" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </div>
                    ) : "Simpan Produk"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tab & Search */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-zinc-100">
            <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
              {(["fisik", "digital"] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                    activeTab === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  }`}>Produk {t}</button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <IconSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" stroke={1.5} />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari produk..."
                className="pl-9 h-9 bg-zinc-50 border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="w-[50px] text-center font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Nama Produk</TableHead>
                  <TableHead className="font-semibold">Kategori</TableHead>
                  <TableHead className="font-semibold">Kepemilikan</TableHead>
                  {activeTab === "fisik" ? (
                    <><TableHead className="font-semibold">Harga Eceran</TableHead><TableHead className="font-semibold">Stok</TableHead></>
                  ) : (<TableHead className="font-semibold">Biaya Admin</TableHead>)}
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-center font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProducts ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === "fisik" ? 8 : 7} className="h-32 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        Memuat data produk...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={activeTab === "fisik" ? 8 : 7} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconPackage className="w-10 h-10" stroke={1} />
                        <span className="text-sm">Belum ada produk {activeTab} yang terdaftar.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product, index) => (
                    <TableRow key={product.kodeProduk}>
                      <TableCell className="text-center text-zinc-500 font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium text-zinc-900">{product.namaProduk}</TableCell>
                      <TableCell className="text-zinc-600">{product.kategoriProduk}</TableCell>
                      <TableCell>
                        <Badge variant={product.kepemilikan === "sendiri" ? "default" : "secondary"} className="capitalize text-xs">{product.kepemilikan}</Badge>
                      </TableCell>
                      {activeTab === "fisik" ? (
                        <>
                          <TableCell className="font-medium text-zinc-900">{product.pricing?.eceran ? formatRupiah(product.pricing.eceran.hargaJual) : "-"}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${getTotalStock(product) <= 10 ? "text-rose-600" : "text-zinc-900"}`}>{getTotalStock(product)}</span>
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="font-medium text-zinc-900">{product.biayaAdmin ? formatRupiah(product.biayaAdmin) : "-"}</TableCell>
                      )}
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          product.status === "aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                        }`}>{product.status}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {activeTab === "fisik" && (
                            <Button variant="ghost" size="icon" onClick={() => openBatchDialog(product)} className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="Tambah batch stok">
                              <IconStack2 className="h-4 w-4" stroke={1.5} />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" title="Edit produk">
                            <IconPencil className="h-4 w-4" stroke={1.5} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(product.kodeProduk)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" title="Hapus produk">
                            <IconTrash className="h-4 w-4" stroke={1.5} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>

    {/* Batch Dialog */}
    <Dialog open={isBatchDialogOpen} onOpenChange={(o) => { if (!o) { setBatchError(""); setBatchSuccess(""); } setIsBatchDialogOpen(o); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Tambah Batch Stok</DialogTitle>
          {batchTarget && (
            <p className="text-sm text-zinc-500 mt-1">
              Produk: <span className="font-medium text-zinc-800">{batchTarget.namaProduk}</span>
            </p>
          )}
        </DialogHeader>

        {batchError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" stroke={1.5} />
            <p className="text-[13px] text-red-600 font-medium">{batchError}</p>
          </div>
        )}
        {batchSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <IconCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" stroke={1.5} />
            <p className="text-[13px] text-green-700 font-medium">{batchSuccess}</p>
          </div>
        )}

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-zinc-800">Jumlah Pembelian <span className="text-red-500">*</span></Label>
            <Input type="number" value={batchJumlah} onChange={(e) => setBatchJumlah(e.target.value)}
              placeholder="Contoh: 100" min={1}
              className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
            <p className="text-xs text-zinc-400">Total unit yang dibeli dalam batch ini.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-zinc-800">Harga Beli / pcs <span className="text-red-500">*</span></Label>
            <Input type="number" value={batchHargaBeli} onChange={(e) => setBatchHargaBeli(e.target.value)}
              placeholder="Contoh: 2500" min={0}
              className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
          </div>
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-zinc-800">Stok Tersedia Saat Ini <span className="text-red-500">*</span></Label>
            <Input type="number" value={batchStok} onChange={(e) => setBatchStok(e.target.value)}
              placeholder="Contoh: 100" min={0}
              className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
            <p className="text-xs text-zinc-400">Stok aktual yang siap dijual dari batch ini.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
            <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)} className="h-10 px-5 rounded-lg">Batal</Button>
            <Button onClick={handleAddBatch} disabled={isBatchSubmitting}
              className="h-10 px-6 bg-[#09090b] hover:bg-[#27272a] text-white rounded-lg font-medium">
              {isBatchSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </div>
              ) : "Simpan Batch"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
