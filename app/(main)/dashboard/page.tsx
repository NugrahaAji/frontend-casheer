"use client";

import { useState, useEffect } from "react";
import { useShift } from "@/lib/hooks/useShift";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  IconSearch,
  IconShoppingCart,
  IconPackage,
  IconLayoutGrid,
  IconList,
  IconMinus,
  IconPlus,
  IconTrash,
  IconCircleCheck
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { session, isHydrating } = useShift();
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [cart, setCart] = useState<any[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "utang">("cash");
  const [customerName, setCustomerName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [trxSuccess, setTrxSuccess] = useState<string | null>(null);
  const [trxError, setTrxError] = useState<string | null>(null);

  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchAllProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const [resFisik, resDigital] = await Promise.all([
          fetch("/api/product/fisik", { credentials: "include" }),
          fetch("/api/product/digital", { credentials: "include" })
        ]);

        const dataFisik = resFisik.ok ? await resFisik.json() : { success: false };
        const dataDigital = resDigital.ok ? await resDigital.json() : { success: false };

        // Backend returns array: [{ kategori, produk: [...] }]
        const fisik = dataFisik.success ? (dataFisik.data[0]?.produk || []) : [];
        const digital = dataDigital.success ? (dataDigital.data[0]?.produk || []) : [];

        // format to match expected properties
        const formattedFisik = fisik.map((p: any) => ({
          ...p,
          id: p.kodeProduk,
          name: p.namaProduk,
          category: "Produk Fisik",
          type: p.kepemilikan,
          retailPrice: p.pricing?.eceran?.hargaJual || 0,
          wholesalePrice: p.pricing?.grosir?.[0]?.hargaJual || p.pricing?.eceran?.hargaJual || 0,
          stockRaw: p.stock || [],
          stock: p.stock?.reduce((acc: number, cur: any) => acc + (cur.stok || 0), 0) || 0
        }));

        const formattedDigital = digital.map((p: any) => ({
          ...p,
          id: p.kodeProduk,
          name: p.namaProduk,
          category: "Produk Digital",
          type: p.kepemilikan || "sendiri",
          retailPrice: p.biayaAdmin || 0,
          wholesalePrice: p.biayaAdmin || 0,
          stock: null
        }));

        setProducts([...formattedFisik, ...formattedDigital]);
      } catch (error) {
        console.error("Failed to fetch products", error);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    fetchAllProducts();
  }, []);

  const categories = ["Semua", "Produk Fisik", "Produk Digital"];
  const filteredProducts = products.filter(p => {
    const matchCategory = selectedCategory === "Semua" || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Format Rupiah
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(num).replace("Rp", "Rp ");
  };

  // Cart Functions
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1, pricingMode: "retail", harga: product.retailPrice }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((item) => {
        if (item.product.id === id) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        }
        return item;
      });
      return updated.filter(Boolean); // remove nulls
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const setPricingMode = (id: number, mode: "retail" | "wholesale") => {
    setCart((prev) => prev.map((item) => {
      if (item.product.id === id) {
        const harga = mode === "retail" ? item.product.retailPrice : item.product.wholesalePrice;
        return { ...item, pricingMode: mode, harga };
      }
      return item;
    }));
  };

  const setDigitalHarga = (id: number, harga: number) => {
    setCart((prev) => prev.map((item) =>
      item.product.id === id ? { ...item, harga } : item
    ));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => {
    if (item.product.category === "Produk Digital") {
      return sum + ((item.harga || 0) + (item.product.biayaAdmin || 0)) * item.qty;
    }
    const price = item.pricingMode === "retail" ? item.product.retailPrice : item.product.wholesalePrice;
    return sum + (price * item.qty);
  }, 0);
  const total = subtotal;
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setPaymentAmount(value);
  };

  const processTransaction = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    setTrxError(null);
    setTrxSuccess(null);

    const body = {
      customer: customerName.trim() || undefined,
      paymentType,
      items: cart.map((item) => {
        const isDigital = item.product.category === "Produk Digital";
        if (isDigital) {
          return {
            kodeProduk: item.product.kodeProduk,
            qty: item.qty,
            harga: item.harga || item.product.retailPrice,  // harga manual untuk digital
          };
        }
        // Fisik: pilih batch yang stoknya cukup, atau batch pertama
        const stockBatches: any[] = item.product.stockRaw || [];
        const activeBatch = stockBatches.find((b: any) => b.stok >= item.qty) || stockBatches[0];
        // Map pricingMode ke tipeHarga yang dikenali backend: retail->ecer, wholesale->grosir
        const tipeHarga = item.pricingMode === "wholesale" ? "grosir" : "ecer";
        return {
          kodeProduk: item.product.kodeProduk,
          qty: item.qty,
          batch: activeBatch?.batch ?? 1,
          tipeHarga,  // wajib untuk produk fisik
        };
      }),
    };

    try {
      const res = await fetch("/api/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrxSuccess(`Transaksi berhasil! No. ${data.data?.nomorTransaksi || data.data?._id || ""}`);
        setTimeout(() => {
          setCart([]);
          setIsPaymentModalOpen(false);
          setPaymentAmount("");
          setCustomerName("");
          setPaymentType("cash");
          setTrxSuccess(null);
        }, 1500);
      } else {
        setTrxError(data.message || "Gagal memproses transaksi.");
      }
    } catch {
      setTrxError("Terjadi kesalahan jaringan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const cartContent = (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 lg:p-6 border-b border-zinc-100 flex-none">
        <h2 className="text-lg font-bold text-zinc-900">Keranjang Belanja</h2>
        <p className="text-[13px] text-zinc-500 mt-1">{totalItems} item</p>
      </div>

      {/* Cart Items Area */}
      <div className={`flex-1 flex flex-col ${cart.length === 0 ? "items-center justify-center p-6 text-center bg-[#fdfdfd]" : "overflow-y-auto custom-scrollbar p-4"}`}>
        {cart.length === 0 ? (
          <>
            <IconShoppingCart className="w-16 h-16 text-zinc-300 mb-4" stroke={1} />
            <p className="text-zinc-500 text-[15px] mb-1">Keranjang masih kosong</p>
            <p className="text-[13px] text-zinc-400">Tambahkan produk untuk memulai transaksi</p>
          </>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.product.id} className="flex gap-3">
                  <div className="w-12 h-12 bg-[#f4f4f5] rounded-lg flex items-center justify-center shrink-0">
                    <IconPackage className="w-6 h-6 text-[#b07b54]" stroke={1.5} />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 pr-2">
                        <h4 className="text-[14px] font-medium text-zinc-900 line-clamp-1 mb-1.5">{item.product.name}</h4>
                        {item.product.category === "Produk Fisik" ? (
                          <div className="relative inline-block w-full max-w-[130px]">
                            <select
                              value={item.pricingMode}
                              onChange={(e) => setPricingMode(item.product.id, e.target.value as "retail" | "wholesale")}
                              className="w-full appearance-none bg-zinc-50 border border-zinc-200 text-zinc-600 text-[11px] font-medium rounded-md px-2.5 py-1.5 pr-7 focus:outline-none focus:ring-1 focus:ring-zinc-300 cursor-pointer"
                            >
                              <option value="retail">Harga Eceran</option>
                              <option value="wholesale">Harga Grosir</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full max-w-[140px]">
                            <input
                              type="number"
                              placeholder="Masukkan harga"
                              value={item.harga || ""}
                              onChange={(e) => setDigitalHarga(item.product.id, Number(e.target.value))}
                              className="w-full bg-zinc-50 border border-zinc-200 text-zinc-700 text-[11px] font-medium rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                            />
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-zinc-400 hover:text-red-500 transition-colors shrink-0 pt-0.5">
                        <IconTrash className="w-4 h-4" stroke={1.5} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-[13px] font-bold text-zinc-900">
                        {item.product.category === "Produk Digital"
                          ? formatRupiah((item.harga || 0) + (item.product.biayaAdmin || 0))
                          : formatRupiah(item.pricingMode === "retail" ? item.product.retailPrice : item.product.wholesalePrice)
                        }
                      </p>

                      <div className="flex items-center gap-2 bg-[#f4f4f5] rounded-md px-1 py-0.5">
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-white rounded transition-colors"
                        >
                          <IconMinus className="w-3.5 h-3.5" stroke={2} />
                        </button>
                        <span className="text-[13px] font-medium w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-white rounded transition-colors"
                        >
                          <IconPlus className="w-3.5 h-3.5" stroke={2} />
                        </button>
                      </div>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Summary & Action */}
      <div className="p-4 lg:p-6 border-t border-zinc-200 bg-white flex-none">
        <div className="space-y-3 mb-6">
            <div className="flex justify-between items-end">
              <span className="font-bold text-zinc-900">Total</span>
              <span className="text-xl font-bold text-zinc-900">{formatRupiah(total)}</span>
            </div>
        </div>

        <Button
          onClick={() => {
            if (cart.length > 0) {
              setIsMobileCartOpen(false);
              setIsPaymentModalOpen(true);
            }
          }}
          className={`w-full h-[46px] font-semibold text-[13px] tracking-wide rounded-md transition-colors ${
            cart.length > 0
              ? "bg-[#09090b] hover:bg-[#27272a] text-white cursor-pointer shadow-sm"
              : "bg-[#84848a] hover:bg-[#84848a] text-white opacity-100 cursor-not-allowed"
          }`}
        >
          BAYAR
        </Button>
      </div>
    </div>
  );

  // ─── Hydration and Shift Check ──────────────────────────────────────────────
  if (isHydrating) {
    return (
      <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
          <div className="h-8 bg-zinc-200 rounded-lg w-48" />
          <div className="h-4 bg-zinc-100 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-28 bg-white border border-zinc-200 rounded-xl" />
            <div className="h-28 bg-white border border-zinc-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!session.isShiftStarted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f8fafc] p-4 text-center">
        <div className="max-w-md w-full bg-white border border-zinc-200/80 rounded-2xl p-8 shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-6 border border-amber-200">
            <svg className="w-8 h-8 text-amber-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Shift Belum Dimulai</h2>
          <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
            Anda harus memasukkan saldo awal kasir (uang modal) untuk memulai transaksi hari ini agar keuangan tercatat dengan rapi.
          </p>
          <a
            href="/keuangan"
            className="w-full py-3 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-xl text-sm transition-colors shadow-sm text-center flex items-center justify-center gap-2"
          >
            Mulai Shift Sekarang
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-[#f8fafc]">
      {/* Product Area */}
      <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden relative">
         {/* Main Container mirroring Owner Product Page */}
         <div className="bg-white border border-zinc-100 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 border-b border-zinc-100 shrink-0">
               <div className="flex gap-1 bg-zinc-100 rounded-lg p-1 w-full md:w-fit overflow-x-auto [&::-webkit-scrollbar]:hidden">
                 {categories.map((cat) => (
                   <button
                     key={cat}
                     onClick={() => setSelectedCategory(cat)}
                     className={`shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                       selectedCategory === cat
                         ? "bg-white text-zinc-900 shadow-sm"
                         : "text-zinc-500 hover:text-zinc-700"
                     }`}
                   >
                     {cat}
                   </button>
                 ))}
               </div>

               <div className="flex items-center gap-3 w-full md:w-auto">
                 <div className="relative w-full md:w-64">
                   <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                      <IconSearch className="w-4 h-4" stroke={1.5} />
                   </div>
                   <Input
                     placeholder="Cari produk..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="pl-9 h-9 bg-zinc-50 border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg w-full"
                   />
                 </div>

                 {/* View Toggle */}
                 <div className="flex bg-zinc-100 rounded-lg p-1 shrink-0">
                    <button
                      onClick={() => setViewMode("card")}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === "card" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      <IconLayoutGrid className="w-4 h-4" stroke={1.5} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
                    >
                      <IconList className="w-4 h-4" stroke={1.5} />
                    </button>
                 </div>
               </div>
            </div>

            {/* Product Grid / List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-zinc-50/30">
            {isLoadingProducts ? (
               <div className="flex items-center justify-center h-full">
                 <div className="flex items-center gap-2 text-zinc-500">
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                    Memuat data produk...
                 </div>
               </div>
            ) : filteredProducts.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-2">
                  <IconPackage className="w-10 h-10" stroke={1} />
                  <span className="text-sm">Belum ada produk yang terdaftar.</span>
               </div>
            ) : viewMode === "card" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                 {filteredProducts.map((p) => (
                   <div
                     key={p.id}
                     onClick={() => addToCart(p)}
                     className="border border-zinc-200/80 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer bg-white flex flex-col group active:scale-95"
                   >
                      <div className="h-[120px] lg:h-[140px] bg-[#f4f4f5] flex items-center justify-center p-4 group-hover:bg-zinc-100 transition-colors">
                         <IconPackage className="w-10 h-10 lg:w-12 lg:h-12 text-[#b07b54]" strokeWidth={1.5} />
                      </div>
                      <div className="p-3 lg:p-4 flex-1 flex flex-col justify-between">
                         <div>
                           <h3 className="font-medium text-zinc-900 text-[14px] lg:text-[15px] mb-1">{p.name}</h3>
                           <div className="flex flex-wrap gap-1.5 mb-2">
                             <Badge variant={p.type === "sendiri" ? "default" : "secondary"} className="capitalize text-[10px] px-1.5 py-0">
                               {p.type}
                             </Badge>
                             <span className="text-[11px] text-zinc-500 bg-zinc-100 px-1.5 rounded flex items-center">
                               {p.category === "Produk Fisik" ? `Stok: ${p.stock}` : "Digital"}
                             </span>
                           </div>
                         </div>
                         <p className="font-bold text-zinc-900 text-[14px] lg:text-base">{formatRupiah(p.retailPrice)}</p>
                      </div>
                   </div>
                 ))}
              </div>
            ) : (
              <div className="space-y-2">
                 {filteredProducts.map((p) => (
                   <div
                     key={p.id}
                     onClick={() => addToCart(p)}
                     className="flex items-center gap-4 p-3 border border-zinc-200/80 rounded-xl hover:bg-zinc-50 cursor-pointer active:scale-[0.99] transition-transform bg-white"
                   >
                      <div className="w-12 h-12 rounded-lg bg-[#f4f4f5] flex items-center justify-center shrink-0">
                         <IconPackage className="w-6 h-6 text-[#b07b54]" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                         <h3 className="font-medium text-zinc-900 text-[15px]">{p.name}</h3>
                         <div className="flex flex-wrap gap-2 mt-1">
                           <Badge variant={p.type === "sendiri" ? "default" : "secondary"} className="capitalize text-[10px] px-1.5 py-0">
                             {p.type}
                           </Badge>
                           <span className="text-[12px] text-zinc-500">
                             {p.category === "Produk Fisik" ? `Stok: ${p.stock}` : "Digital"}
                           </span>
                         </div>
                      </div>
                      <div className="text-right pr-2">
                         <p className="font-bold text-zinc-900 text-[15px]">{formatRupiah(p.retailPrice)}</p>
                      </div>
                   </div>
                 ))}
              </div>
            )}
         </div>
         </div>

         {/* Mobile Floating Cart Button */}
         <div className="lg:hidden fixed bottom-[80px] right-4 z-40">
           <button
             onClick={() => setIsMobileCartOpen(true)}
             className="w-14 h-14 bg-[#09090b] text-white rounded-full flex items-center justify-center shadow-lg relative hover:bg-zinc-800 active:scale-95 transition-transform"
           >
             <IconShoppingCart className="w-6 h-6" stroke={1.5} />
             {totalItems > 0 && (
               <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#09090b]">
                 {totalItems}
               </span>
             )}
           </button>
         </div>
      </div>

      {/* Right Sidebar - Cart (Hidden on Mobile) */}
      <div className="hidden lg:flex w-[360px] border-l border-zinc-200 bg-white flex-col shrink-0">
         {cartContent}
      </div>

      {/* Mobile Cart Sheet */}
      <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
        <SheetContent className="w-full sm:max-w-md p-0 flex flex-col bg-white">
          <SheetHeader className="sr-only">
            <SheetTitle>Keranjang Belanja</SheetTitle>
          </SheetHeader>
          {cartContent}
        </SheetContent>
      </Sheet>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={(o) => {
        if (!o) { setTrxError(null); setTrxSuccess(null); }
        setIsPaymentModalOpen(o);
      }}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white rounded-xl border border-zinc-200 shadow-xl">
          <DialogHeader className="p-6 pb-4 border-b border-zinc-100 bg-[#fafafa]">
            <DialogTitle className="text-lg font-bold text-zinc-900">Pembayaran</DialogTitle>
          </DialogHeader>

          <div className="p-6 pt-4 space-y-5">
             {/* Total */}
             <div className="text-center space-y-1">
                <p className="text-sm text-zinc-500 font-medium">Total Tagihan</p>
                <h2 className="text-3xl font-bold text-zinc-900">{formatRupiah(total)}</h2>
             </div>

             {/* Customer Name */}
             <div className="space-y-1.5">
               <label className="text-[13px] font-semibold text-zinc-800">Nama Customer <span className="text-zinc-400 font-normal">(Opsional)</span></label>
               <Input
                 value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
                 placeholder="Nama pelanggan"
                 className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg"
               />
             </div>

             {/* Payment Type */}
             <div className="space-y-1.5">
               <label className="text-[13px] font-semibold text-zinc-800">Tipe Pembayaran</label>
               <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
                 {(["cash", "utang"] as const).map((t) => (
                   <button key={t} onClick={() => setPaymentType(t)}
                     className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                       paymentType === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                     }`}>
                     {t === "cash" ? "Tunai" : "Utang"}
                   </button>
                 ))}
               </div>
             </div>

             {/* Cash amount & kembalian (only for cash) */}
             {paymentType === "cash" && (
               <div className="space-y-2">
                 <label className="text-[13px] font-semibold text-zinc-800">Jumlah Uang Diterima</label>
                 <Input
                   type="text"
                   value={paymentAmount ? formatRupiah(Number(paymentAmount)) : ""}
                   onChange={handlePaymentChange}
                   placeholder="Masukkan nominal uang"
                   className="h-12 text-lg bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 font-bold tracking-wide"
                 />
                 {paymentAmount && Number(paymentAmount) >= total && (
                   <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
                     <IconCircleCheck className="w-5 h-5 text-green-500 shrink-0" stroke={1.5} />
                     <div>
                       <p className="text-[11px] text-green-600 font-medium leading-none mb-1">Kembalian</p>
                       <p className="text-sm font-bold text-green-700">{formatRupiah(Number(paymentAmount) - total)}</p>
                     </div>
                   </div>
                 )}
               </div>
             )}

             {/* Success / Error feedback */}
             {trxSuccess && (
               <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                 <IconCircleCheck className="w-5 h-5 text-green-600 shrink-0" stroke={1.5} />
                 <p className="text-[13px] text-green-700 font-medium">{trxSuccess}</p>
               </div>
             )}
             {trxError && (
               <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                 <p className="text-[13px] text-red-600 font-medium">{trxError}</p>
               </div>
             )}

             <Button
               onClick={processTransaction}
               disabled={isProcessing || (paymentType === "cash" && (!paymentAmount || Number(paymentAmount) < total))}
               className="w-full h-12 bg-[#09090b] hover:bg-[#27272a] text-white font-medium rounded-lg cursor-pointer transition-colors shadow-sm text-[15px]"
             >
               {isProcessing ? (
                 <div className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   Memproses...
                 </div>
               ) : "Proses Transaksi"}
             </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
