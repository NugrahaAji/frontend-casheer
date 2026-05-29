"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  IconPlus, IconTrash, IconSearch, IconPackage, IconSelector,
  IconChevronLeft, IconChevronRight, IconArrowBackUp, IconAlertCircle,
  IconMinus, IconX,
} from "@tabler/icons-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Batch { batch: number; jumlah: number; hargaBeli: number; stok: number; }
interface Product { kodeProduk: string; namaProduk: string; kategoriProduk: string; stock?: Batch[]; }
interface FlatProduct extends Product { kategori: "fisik" | "digital"; }
interface AdjItem { kodeProduk: string; qty: number; batch?: number; harga?: number; hargaModal?: number; subtotal?: number; kategoriProduk?: string; }
interface Adjustment { _id: string; jenis: string; note?: string; items: AdjItem[]; totalKerugian: number; createdAt: string; }
interface FormItem { produk: FlatProduct | null; batch: number | ""; qty: number; harga: string; }

// ── Constants ─────────────────────────────────────────────────────────────────
const JENIS_LIST = ["rusak","hilang","expired","sedekah","dipakai_sendiri","sample","giveaway"] as const;
const JENIS_LABEL: Record<string,string> = { rusak:"Rusak", hilang:"Hilang", expired:"Kadaluarsa", sedekah:"Sedekah", dipakai_sendiri:"Dipakai Sendiri", sample:"Sample", giveaway:"Giveaway" };
const JENIS_COLOR: Record<string,string> = { rusak:"bg-rose-50 text-rose-700 border-rose-200", hilang:"bg-red-50 text-red-700 border-red-200", expired:"bg-orange-50 text-orange-700 border-orange-200", sedekah:"bg-emerald-50 text-emerald-700 border-emerald-200", dipakai_sendiri:"bg-blue-50 text-blue-700 border-blue-200", sample:"bg-purple-50 text-purple-700 border-purple-200", giveaway:"bg-pink-50 text-pink-700 border-pink-200" };

const fmtRp = (n: number) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",minimumFractionDigits:0}).format(n).replace("Rp","Rp ");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});
const emptyItem = (): FormItem => ({ produk:null, batch:"", qty:1, harga:"" });

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReturBarangPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [allProducts, setAllProducts] = useState<FlatProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Adjustment|null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Form state
  const [formJenis, setFormJenis] = useState<string>("rusak");
  const [formNote, setFormNote] = useState("");
  const [formItems, setFormItems] = useState<FormItem[]>([emptyItem()]);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch adjustments
  const fetchAdjustments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/nontransaction", { credentials:"include" });
      const json = await res.json();
      if (json.success) setAdjustments(json.data || []);
    } catch(e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  // Fetch all products (fisik + digital)
  const fetchProducts = async () => {
    try {
      const [rFisik, rDigital] = await Promise.all([
        fetch("/api/product/fisik", { credentials:"include" }),
        fetch("/api/product/digital", { credentials:"include" }),
      ]);
      const [dFisik, dDigital] = await Promise.all([rFisik.json(), rDigital.json()]);
      const fisik: FlatProduct[] = (dFisik?.data?.[0]?.produk || []).map((p: Product) => ({ ...p, kategori:"fisik" as const }));
      const digital: FlatProduct[] = (dDigital?.data?.[0]?.produk || []).map((p: Product) => ({ ...p, kategori:"digital" as const }));
      setAllProducts([...fisik, ...digital]);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchAdjustments(); fetchProducts(); }, []);
  useEffect(() => { setCurrentPage(1); }, [search, pageSize]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return adjustments.filter(a => !q || a.jenis.includes(q) || (a.note||"").toLowerCase().includes(q));
  }, [adjustments, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedData = filtered.slice(startIdx, startIdx + pageSize);

  const totalKerugianAll = useMemo(() => adjustments.reduce((s,a) => s+a.totalKerugian, 0), [adjustments]);

  const resetForm = () => { setFormJenis("rusak"); setFormNote(""); setFormItems([emptyItem()]); setFormError(""); };

  const updateFormItem = (i: number, patch: Partial<FormItem>) => {
    setFormItems(prev => prev.map((item,idx) => idx===i ? {...item,...patch} : item));
  };

  const handleSave = async () => {
    const validItems = formItems.filter(fi => fi.produk && fi.qty > 0);
    if (validItems.length === 0) { setFormError("Tambahkan minimal 1 produk."); return; }
    for (const fi of validItems) {
      if (fi.produk!.kategori === "fisik" && fi.batch === "") { setFormError(`Pilih batch untuk ${fi.produk!.namaProduk}.`); return; }
      if (fi.produk!.kategori === "digital" && !fi.harga) { setFormError(`Masukkan harga untuk ${fi.produk!.namaProduk}.`); return; }
    }
    setIsSaving(true); setFormError("");
    try {
      const items = validItems.map(fi => {
        const base: any = { kodeProduk: fi.produk!.kodeProduk, qty: fi.qty };
        if (fi.produk!.kategori === "fisik") base.batch = Number(fi.batch);
        else base.harga = Number(fi.harga.replace(/\D/g,""));
        return base;
      });
      const res = await fetch("/api/nontransaction", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ jenis:formJenis, note:formNote.trim()||undefined, items }),
        credentials:"include",
      });
      let json: any = {};
      try { json = await res.json(); } catch(_) {}
      if (res.ok && json.success) {
        await fetchAdjustments();
        setIsAddOpen(false); resetForm();
      } else {
        const errs = Array.isArray(json.errors) && json.errors.length > 0
          ? json.errors.map((e:any) => e.message).join("; ")
          : json.message || `Gagal menyimpan (${res.status})`;
        setFormError(errs);
      }
    } catch(e) { setFormError("Terjadi kesalahan jaringan."); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const res = await fetch(`/api/nontransaction/${selectedItem._id}`, { method:"DELETE", credentials:"include" });
      const json = await res.json().catch(()=>({success:false}));
      if (json.success) { await fetchAdjustments(); setIsDeleteOpen(false); setSelectedItem(null); }
    } catch(e) { console.error(e); }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Pengeluaran Stok</h1>
            <p className="text-sm text-zinc-500 mt-1">Catat barang yang keluar bukan dari transaksi — rusak, hilang, expired, dll.</p>
          </div>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }} className="h-10 bg-zinc-900 hover:bg-zinc-800 text-white gap-2 font-medium px-4 rounded-xl shadow-sm self-start sm:self-auto cursor-pointer">
            <IconPlus className="w-4 h-4" stroke={2.5} /> Tambah Pengeluaran
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-zinc-100 text-zinc-600"><IconArrowBackUp className="w-5 h-5" stroke={1.5}/></div>
              <div><p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Transaksi</p><p className="text-2xl font-bold text-zinc-900 mt-1">{adjustments.length} catatan</p></div>
            </div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-50 text-rose-600"><IconMinus className="w-5 h-5" stroke={1.5}/></div>
              <div><p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Total Kerugian</p><p className="text-2xl font-bold text-zinc-900 mt-1">{fmtRp(totalKerugianAll)}</p></div>
            </div>
          </div>
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><IconPackage className="w-5 h-5" stroke={1.5}/></div>
              <div><p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Bulan Ini</p><p className="text-2xl font-bold text-zinc-900 mt-1">{adjustments.filter(a=>new Date(a.createdAt).getMonth()===new Date().getMonth()).length} catatan</p></div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 p-4 border-b border-zinc-100">
            <div className="relative w-full sm:w-64">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" stroke={1.5}/>
              <input type="text" placeholder="Cari jenis / catatan..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-transparent bg-zinc-50 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-300 transition"/>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="w-[60px] text-center font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Tanggal</TableHead>
                  <TableHead className="font-semibold">Jenis</TableHead>
                  <TableHead className="font-semibold">Produk</TableHead>
                  <TableHead className="font-semibold">Catatan</TableHead>
                  <TableHead className="text-right font-semibold">Total Kerugian</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-40 text-center"><div className="flex items-center justify-center gap-2 text-zinc-500"><div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"/>Memuat data...</div></TableCell></TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-40 text-center"><div className="flex flex-col items-center gap-2 text-zinc-400"><IconPackage className="w-10 h-10" stroke={1}/><span className="text-sm">{search ? "Tidak ada data yang sesuai filter." : "Belum ada catatan pengeluaran stok."}</span></div></TableCell></TableRow>
                ) : paginatedData.map((item, index) => (
                  <TableRow key={item._id} className="hover:bg-zinc-50/40 transition-colors">
                    <TableCell className="text-center text-zinc-500 font-medium">{startIdx+index+1}</TableCell>
                    <TableCell className="text-[13px] text-zinc-600 whitespace-nowrap font-medium">{fmtDate(item.createdAt)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${JENIS_COLOR[item.jenis]??""}`}>{JENIS_LABEL[item.jenis]||item.jenis}</span>
                    </TableCell>
                    <TableCell className="text-[13px] text-zinc-600 font-medium">{item.items?.length ?? 0} item</TableCell>
                    <TableCell className="text-[13px] text-zinc-500 max-w-[200px] truncate">{item.note||"-"}</TableCell>
                    <TableCell className="text-right text-[13px] font-semibold text-rose-600 whitespace-nowrap">{fmtRp(item.totalKerugian)}</TableCell>
                    <TableCell className="text-right">
                      <button onClick={()=>{setSelectedItem(item);setIsDeleteOpen(true);}} className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Hapus">
                        <IconTrash className="w-4 h-4" stroke={1.5}/>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span>Tampilkan</span>
                <div className="relative flex items-center">
                  <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="bg-[#f4f4f5] text-zinc-700 text-sm font-medium rounded-xl h-9 px-3 pr-8 outline-none border-transparent cursor-pointer appearance-none">
                    <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
                  </select>
                  <IconSelector className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"/>
                </div>
                <span>data per halaman</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={()=>setCurrentPage(p=>Math.max(p-1,1))} disabled={currentPage===1} className="h-8 px-2 bg-white border-zinc-200 hover:bg-zinc-50 cursor-pointer"><IconChevronLeft className="w-4 h-4 text-zinc-600"/></Button>
                <span className="text-xs font-semibold text-zinc-600 px-1">{currentPage} dari {totalPages||1}</span>
                <Button variant="outline" size="sm" onClick={()=>setCurrentPage(p=>Math.min(p+1,totalPages))} disabled={currentPage===totalPages||totalPages===0} className="h-8 px-2 bg-white border-zinc-200 hover:bg-zinc-50 cursor-pointer"><IconChevronRight className="w-4 h-4 text-zinc-600"/></Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={o=>{if(!o){setIsAddOpen(false);resetForm();}}}>
        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
            <DialogTitle className="text-lg font-bold text-zinc-900">Tambah Pengeluaran Stok</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-5 space-y-4">

            {/* Jenis */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold text-zinc-800">Jenis Pengeluaran</Label>
              <Select value={formJenis} onValueChange={setFormJenis}>
                <SelectTrigger className="w-full h-10 bg-[#f4f4f5] border-transparent rounded-xl text-sm font-medium">
                  <SelectValue placeholder="Pilih jenis..."/>
                </SelectTrigger>
                <SelectContent>
                  {JENIS_LIST.map(j => <SelectItem key={j} value={j}>{JENIS_LABEL[j]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Catatan */}
            <div className="space-y-1.5">
              <Label className="text-[13px] font-semibold text-zinc-800">Catatan <span className="font-normal text-muted-foreground">(opsional)</span></Label>
              <textarea value={formNote} onChange={e=>setFormNote(e.target.value)} placeholder="Contoh: Ditemukan saat stock opname..." className="w-full h-16 p-3 text-sm rounded-lg border border-input bg-transparent focus:outline-none focus:ring-3 focus:ring-ring/50 transition resize-none placeholder:text-muted-foreground"/>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-semibold text-zinc-800">Produk</Label>
                <button type="button" onClick={()=>setFormItems(p=>[...p,emptyItem()])} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition cursor-pointer">
                  <IconPlus className="w-3.5 h-3.5" stroke={2}/> Tambah Produk
                </button>
              </div>
              {formItems.map((fi, i) => {
                const isFisik = fi.produk?.kategori === "fisik";
                const batches = fi.produk?.stock?.filter(b => b.stok > 0) || [];
                return (
                  <div key={i} className="p-3 bg-zinc-50 rounded-lg space-y-2 border border-zinc-100">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        {/* Pilih produk */}
                        <Select
                          value={fi.produk?.kodeProduk||""}
                          onValueChange={val => {
                            const found = allProducts.find(p=>p.kodeProduk===val)||null;
                            updateFormItem(i,{produk:found, batch:"", qty:1, harga:""});
                          }}
                        >
                          <SelectTrigger className="w-full h-9 text-sm">
                            <SelectValue placeholder="Pilih produk..."/>
                          </SelectTrigger>
                          <SelectContent>
                            {allProducts.map(p => (
                              <SelectItem key={p.kodeProduk} value={p.kodeProduk}>
                                {p.namaProduk} <span className="text-muted-foreground">({p.kodeProduk})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fi.produk && (
                          <div className="grid grid-cols-2 gap-2">
                            {isFisik ? (
                              <Select
                                value={fi.batch === "" ? "" : String(fi.batch)}
                                onValueChange={val => updateFormItem(i,{batch:Number(val)})}
                              >
                                <SelectTrigger className="w-full h-9 text-sm">
                                  <SelectValue placeholder="Pilih batch..."/>
                                </SelectTrigger>
                                <SelectContent>
                                  {batches.map(b => (
                                    <SelectItem key={b.batch} value={String(b.batch)}>
                                      Batch {b.batch} — stok {b.stok}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input type="text" placeholder="Harga (Rp)" value={fi.harga} onChange={e=>updateFormItem(i,{harga:e.target.value.replace(/\D/g,"")})} className="h-9 text-sm"/>
                            )}
                            <Input type="number" min={1} placeholder="Qty" value={fi.qty} onChange={e=>updateFormItem(i,{qty:Math.max(1,Number(e.target.value))})} className="h-9 text-sm"/>
                          </div>
                        )}
                      </div>
                      {formItems.length > 1 && (
                        <button type="button" onClick={()=>setFormItems(p=>p.filter((_,idx)=>idx!==i))} className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer shrink-0">
                          <IconX className="w-4 h-4" stroke={2}/>
                        </button>
                      )}
                    </div>
                    {fi.produk && isFisik && fi.batch !== "" && (
                      <p className="text-xs text-zinc-400">
                        Stok tersedia: <strong className="text-zinc-600">{fi.produk.stock?.find(b=>b.batch===fi.batch)?.stok??0}</strong>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <IconAlertCircle className="w-4 h-4 text-rose-500 shrink-0" stroke={2}/>
                <p className="text-[13px] text-rose-600 font-medium">{formError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={()=>{setIsAddOpen(false);resetForm();}} className="flex-1 h-11 border-zinc-200 text-zinc-700 font-medium rounded-lg cursor-pointer">Batal</Button>
              <Button onClick={handleSave} disabled={isSaving} className="flex-1 h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg cursor-pointer">{isSaving?"Menyimpan...":"Simpan"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={o=>{if(!o){setIsDeleteOpen(false);setSelectedItem(null);}}}>
        <DialogContent className="sm:max-w-[360px] p-6 bg-white rounded-xl border border-zinc-200 shadow-xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500"><IconTrash className="w-6 h-6" stroke={1.5}/></div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Hapus Catatan?</h3>
              <p className="text-xs text-zinc-500 mt-1">Stok akan dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex w-full gap-3 pt-2">
              <Button variant="outline" onClick={()=>{setIsDeleteOpen(false);setSelectedItem(null);}} className="flex-1 h-10 border-zinc-200 text-zinc-700 font-medium rounded-lg cursor-pointer">Batal</Button>
              <Button onClick={handleDelete} className="flex-1 h-10 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg cursor-pointer">Hapus</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
