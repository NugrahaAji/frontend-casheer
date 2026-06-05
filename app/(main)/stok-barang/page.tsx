"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { PageSizeSelect } from "@/components/ui/native-select";
import {
  IconPlus, IconAlertCircle, IconCheck, IconTrash, IconSearch, IconPackage,
  IconPencil, IconStack2, IconChevronLeft, IconChevronRight, IconAlertTriangle
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


export default function StokBarangPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState<"fisik" | "digital">("fisik");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // Edit state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editKategori, setEditKategori] = useState("");
  const [editKepemilikan, setEditKepemilikan] = useState<"sendiri" | "titipan">("sendiri");
  const [editHargaEceran, setEditHargaEceran] = useState("");
  const [editBiayaAdmin, setEditBiayaAdmin] = useState("");
  const [editGrosirList, setEditGrosirList] = useState<GrosirPricing[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Delete state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async (kategori: string) => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch(`/api/product/${kategori}`, { credentials: "include" });
      const data = await res.json();
      setProducts(res.ok && data.success ? (data.data[0]?.produk || []) : []);
    } catch { setProducts([]); }
    finally { setIsLoadingProducts(false); }
  };

  useEffect(() => { fetchProducts(activeTab); }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, pageSize]);

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
      const res = await fetch(`/api/product/${activeTab}/${batchTarget.kodeProduk}/`, {
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

  const openDeleteDialog = (product: Product) => {
    setDeleteTarget(product);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/product/${activeTab}/${deleteTarget.kodeProduk}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchProducts(activeTab);
        setIsDeleteOpen(false);
        setDeleteTarget(null);
      }
    } catch { /* silent */ }
    finally { setIsDeleting(false); }
  };

  const openEditSheet = (product: Product) => {
    setEditTarget(product);
    setEditNama(product.namaProduk);
    setEditKategori(product.kategoriProduk || "");
    setEditKepemilikan((product.kepemilikan as "sendiri" | "titipan") || "sendiri");
    setEditHargaEceran(product.pricing?.eceran?.hargaJual?.toString() || "");
    setEditBiayaAdmin(product.biayaAdmin?.toString() || "");
    setEditGrosirList(product.pricing?.grosir || []);
    setEditError(""); setEditSuccess("");
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditError(""); setEditSuccess("");
    if (!editNama.trim() || editNama.trim().length < 2) { setEditError("Nama produk minimal 2 karakter."); return; }
    const isFisik = activeTab === "fisik";
    if (isFisik && (!editKategori.trim() || editKategori.trim().length < 2)) { setEditError("Kategori wajib diisi."); return; }
    if (isFisik) {
      const h = parseInt(editHargaEceran);
      if (isNaN(h) || h < 0) { setEditError("Harga eceran wajib diisi."); return; }
    } else {
      const a = parseInt(editBiayaAdmin);
      if (isNaN(a) || a < 0) { setEditError("Biaya admin wajib diisi."); return; }
    }
    setIsEditSubmitting(true);
    const body: Record<string, any> = { namaProduk: editNama.trim() };
    if (isFisik) {
      body.kategoriProduk = editKategori.trim();
      body.kepemilikan = editKepemilikan;
      const pricing: Record<string, any> = { eceran: { hargaJual: parseInt(editHargaEceran) } };
      if (editGrosirList.length > 0) pricing.grosir = editGrosirList;
      body.pricing = pricing;
    } else {
      body.kategoriProduk = "Digital";
      body.kepemilikan = "sendiri";
      body.biayaAdmin = parseInt(editBiayaAdmin);
    }
    try {
      const res = await fetch(`/api/product/${activeTab}/${editTarget.kodeProduk}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEditSuccess("Produk berhasil diperbarui!");
        fetchProducts(activeTab);
        setTimeout(() => setIsEditOpen(false), 1200);
      } else {
        setEditError(data.message || data.error || "Gagal memperbarui produk.");
      }
    } catch { setEditError("Terjadi kesalahan jaringan."); }
    finally { setIsEditSubmitting(false); }
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
    if (formKategori === "fisik") {
      if (!kategoriProduk.trim() || kategoriProduk.trim().length < 2) {
        setErrorMsg("Kategori produk wajib diisi (minimal 2 karakter)."); return;
      }
      const h = parseInt(hargaJualEceran);
      if (isNaN(h) || h < 0) { setErrorMsg("Harga eceran wajib diisi untuk produk fisik."); return; }
    }
    if (formKategori === "digital") {
      const a = parseInt(biayaAdmin);
      if (isNaN(a) || a < 0) { setErrorMsg("Biaya admin wajib diisi untuk produk digital."); return; }
    }

    setIsSubmitting(true);

    const body: Record<string, any> = { namaProduk: namaProduk.trim() };

    if (formKategori === "fisik") {
      body.kategoriProduk = kategoriProduk.trim();
      body.kepemilikan = kepemilikan;
      const pricing: Record<string, any> = {};
      const h = parseInt(hargaJualEceran);
      pricing.eceran = { hargaJual: h };
      if (grosirList.length > 0) pricing.grosir = grosirList;
      body.pricing = pricing;
    } else {
      body.kategoriProduk = "Digital";      // default wajib untuk backend
      body.kepemilikan = "sendiri";         // default untuk produk digital
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

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalItems);
  const paginatedProducts = filteredProducts.slice(startIdx, endIdx);

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
                {formKategori === "fisik" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-zinc-800">Nama Produk <span className="text-red-500">*</span></Label>
                      <Input value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)}
                        placeholder="Contoh: Indomie Goreng" required
                        className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[13px] font-semibold text-zinc-800">Kategori Produk <span className="text-red-500">*</span></Label>
                      <Combobox
                        value={kategoriProduk}
                        onChange={setKategoriProduk}
                        options={KATEGORI_PRESETS}
                        placeholder="Pilih atau ketik kategori"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-zinc-800">Nama Produk <span className="text-red-500">*</span></Label>
                    <Input value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)}
                      placeholder="Contoh: Pulsa Telkomsel" required
                      className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
                  </div>
                )}

                {/* Kepemilikan — hanya untuk produk fisik */}
                {formKategori === "fisik" && (
                  <div className="space-y-2">
                    <Label className="text-[13px] font-semibold text-zinc-800">Kepemilikan <span className="text-red-500">*</span></Label>
                    <Combobox
                      value={kepemilikan}
                      onChange={(v) => setKepemilikan(v as "sendiri" | "titipan")}
                      options={[
                        { value: "sendiri", label: "Barang Sendiri" },
                        { value: "titipan", label: "Barang Titipan" },
                      ]}
                      placeholder="Pilih kepemilikan"
                      allowCustomValue={false}
                    />
                  </div>
                )}
                {/* Harga Modal Penitip (only for titipan + fisik) */}
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
                  paginatedProducts.map((product, index) => {
                    const displayedIndex = startIdx + index + 1;
                    return (
                      <TableRow key={product.kodeProduk}>
                        <TableCell className="text-center text-zinc-500 font-medium">{displayedIndex}</TableCell>
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
                            <Button variant="ghost" size="icon" onClick={() => openEditSheet(product)} className="h-8 w-8 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100" title="Edit produk">
                              <IconPencil className="h-4 w-4" stroke={1.5} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(product)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" title="Hapus produk">
                              <IconTrash className="h-4 w-4" stroke={1.5} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Footer */}
          {!isLoadingProducts && totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-100 bg-zinc-50/50">
              <PageSizeSelect value={pageSize} onChange={setPageSize} />


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
    {/* ── Edit Sheet ─────────────────────────────────────────────────── */}
    <Sheet open={isEditOpen} onOpenChange={(o) => { if (!o && !isEditSubmitting) setIsEditOpen(false); }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b border-zinc-100">
          <SheetTitle className="text-base font-semibold text-zinc-900">
            Edit Produk {activeTab === "fisik" ? "Fisik" : "Digital"}
          </SheetTitle>
          {editTarget && (
            <p className="text-xs text-zinc-400 font-mono mt-0.5">{editTarget.kodeProduk.slice(0, 8).toUpperCase()}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {editError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <IconAlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" stroke={1.5} />
              <p className="text-[13px] text-red-600 font-medium">{editError}</p>
            </div>
          )}
          {editSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <IconCheck className="w-4 h-4 text-green-600 shrink-0 mt-0.5" stroke={1.5} />
              <p className="text-[13px] text-green-700 font-medium">{editSuccess}</p>
            </div>
          )}

          {/* Nama */}
          <div className="space-y-2">
            <Label className="text-[13px] font-semibold text-zinc-800">Nama Produk <span className="text-red-500">*</span></Label>
            <Input value={editNama} onChange={(e) => setEditNama(e.target.value)}
              placeholder="Nama produk" className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
          </div>

          {/* Fisik-only fields */}
          {activeTab === "fisik" && (
            <>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-zinc-800">Kategori Produk <span className="text-red-500">*</span></Label>
                <Combobox value={editKategori} onChange={setEditKategori} options={KATEGORI_PRESETS} placeholder="Pilih atau ketik kategori" />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px] font-semibold text-zinc-800">Kepemilikan <span className="text-red-500">*</span></Label>
                <Combobox
                  value={editKepemilikan}
                  onChange={(v) => setEditKepemilikan(v as "sendiri" | "titipan")}
                  options={[{ value: "sendiri", label: "Barang Sendiri" }, { value: "titipan", label: "Barang Titipan" }]}
                  placeholder="Pilih kepemilikan"
                  allowCustomValue={false}
                />
              </div>
              <div className="space-y-2 border-t border-zinc-100 pt-4">
                <Label className="text-[13px] font-semibold text-zinc-800">Harga Eceran <span className="text-red-500">*</span></Label>
                <Input type="number" value={editHargaEceran} onChange={(e) => setEditHargaEceran(e.target.value)}
                  placeholder="Contoh: 3500" min={0} className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
              </div>
              {/* Grosir list read-only summary */}
              {editGrosirList.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-zinc-800">Harga Grosir</Label>
                  <div className="space-y-1.5">
                    {editGrosirList.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 bg-zinc-50 px-3 py-2 rounded-lg text-sm">
                        <span className="flex-1 text-zinc-700">Beli ≥ <strong>{g.jumlah}</strong> pcs → <strong>{formatRupiah(g.hargaJual)}</strong>/pcs</span>
                        <button type="button" onClick={() => setEditGrosirList(editGrosirList.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                          <IconTrash className="w-3.5 h-3.5" stroke={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Digital-only fields */}
          {activeTab === "digital" && (
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-zinc-800">Biaya Admin <span className="text-red-500">*</span></Label>
              <Input type="number" value={editBiayaAdmin} onChange={(e) => setEditBiayaAdmin(e.target.value)}
                placeholder="Contoh: 2500" min={0} className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex gap-3 justify-end">
          <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isEditSubmitting} className="h-10 px-5 rounded-lg">
            Batal
          </Button>
          <Button onClick={handleEdit} disabled={isEditSubmitting} className="h-10 px-6 bg-[#09090b] hover:bg-[#27272a] text-white rounded-lg font-medium">
            {isEditSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </span>
            ) : "Simpan Perubahan"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>

    {/* ── Delete Dialog ───────────────────────────────────────────────── */}
    <Dialog open={isDeleteOpen} onOpenChange={(o) => { if (!o && !isDeleting) { setIsDeleteOpen(false); setDeleteTarget(null); } }}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <IconAlertTriangle className="w-5 h-5 text-red-500" stroke={2} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-900">Hapus Produk?</DialogTitle>
              <DialogDescription className="text-[13px] text-zinc-500 mt-0.5">
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {deleteTarget && (
          <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-zinc-500">Nama</span>
              <span className="font-medium text-zinc-900 text-right max-w-[200px] truncate">{deleteTarget.namaProduk}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Kode</span>
              <span className="font-mono text-xs text-zinc-600">{deleteTarget.kodeProduk.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Tipe</span>
              <span className="font-medium text-zinc-700 capitalize">{activeTab}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setIsDeleteOpen(false); setDeleteTarget(null); }} disabled={isDeleting}>
            Batal
          </Button>
          <Button onClick={handleDelete} disabled={isDeleting}
            className="bg-red-600 hover:bg-red-500 text-white font-medium">
            {isDeleting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menghapus...
              </span>
            ) : "Hapus Produk"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
