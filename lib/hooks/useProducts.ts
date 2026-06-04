/**
 * useProducts.ts
 * Custom hook untuk mengambil data produk dengan strategi:
 *
 *   1. Fetch dari API (MongoDB) → simpan ke IndexedDB & return
 *   2. Jika network error (offline/timeout) → baca IndexedDB → status "offline"
 *   3. Jika server error (5xx/4xx) → baca IndexedDB → status "server_error"
 *   4. Auto-sync saat browser kembali online (window 'online' event)
 *
 * Endpoint: GET /api/product/allproduct
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCachedProducts,
  saveProducts,
  getCacheMeta,
  type ProductCategory,
  type Produk,
} from "@/lib/db/productDB";

// ── Types ──────────────────────────────────────────────────────────────────────

export type DataSource = "api" | "indexeddb" | "none";
export type ProductStatus = "loading" | "online" | "offline" | "server_error" | "error";

export interface UseProductsResult {
  categories: ProductCategory[];
  allProducts: Produk[];
  status: ProductStatus;
  source: DataSource;
  lastSyncedAt: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  refresh: () => void;
}

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Periksa apakah error adalah masalah konektivitas jaringan (bukan server error).
 * Network error: timeout, DNS gagal, koneksi ditolak, browser offline.
 * Server error: HTTP 4xx / 5xx — server bisa dijangkau tapi mengembalikan error.
 */
function isNetworkError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) return true;
  return false;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProducts(): UseProductsResult {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [status, setStatus] = useState<ProductStatus>("loading");
  const [source, setSource] = useState<DataSource>("none");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const statusRef = useRef<ProductStatus>("loading");
  statusRef.current = status;

  // ── Core fetch logic ─────────────────────────────────────────────────────────

  const loadProducts = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    let apiError: unknown = null;
    let httpStatus: number | null = null;

    // ── Langkah 1: Fetch dari API ────────────────────────────────────────────
    try {
      const res = await fetch("/api/product/allproduct", {
        credentials: "include",
        signal: AbortSignal.timeout(8000),
      });

      httpStatus = res.status;
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error("Format respons tidak valid.");
      }

      const fresh: ProductCategory[] = json.data;
      await saveProducts(fresh);

      setCategories(fresh);
      setSource("api");
      setStatus("online");
      setLastSyncedAt(new Date().toISOString());
      apiError = null;

    } catch (err) {
      apiError = err;

      const networkError = isNetworkError(err);
      const label = networkError
        ? "[useProducts] Koneksi terputus"
        : `[useProducts] Server error (${httpStatus ?? "?"})`;
      console.warn(label, "— mencoba cache IndexedDB:", err);

      // Background sync & data lama masih tampil → biarkan
      if (isBackground && (statusRef.current === "offline" || statusRef.current === "server_error")) {
        return;
      }

      // ── Langkah 2: Fallback ke IndexedDB ─────────────────────────────────
      try {
        const cached = await getCachedProducts();
        const meta = await getCacheMeta();

        if (cached.length > 0) {
          setCategories(cached);
          setSource("indexeddb");
          // Bedakan pesan berdasarkan tipe error
          if (networkError) {
            setStatus("offline");
            setError(null);
          } else {
            setStatus("server_error");
            setError(
              `Server mengembalikan error ${httpStatus ?? ""}. Menampilkan data cache terakhir.`
            );
          }
          setLastSyncedAt(meta?.syncedAt ?? null);
        } else {
          setCategories([]);
          setSource("none");
          setStatus("error");
          setError(
            networkError
              ? "Tidak dapat terhubung ke server dan belum ada cache offline tersedia."
              : `Server error ${httpStatus ?? ""}. Tidak ada cache offline tersedia.`
          );
        }
      } catch (dbErr) {
        console.error("[useProducts] IndexedDB error:", dbErr);
        setCategories([]);
        setSource("none");
        setStatus("error");
        setError("Terjadi kesalahan saat membaca data offline.");
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // ── Initial load ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadProducts(false);
  }, [loadProducts]);

  // ── Auto-sync saat online / switch cache saat offline ─────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      const cur = statusRef.current;
      if (cur === "offline" || cur === "server_error" || cur === "error") {
        console.info("[useProducts] Koneksi pulih — sinkronisasi ulang produk...");
        loadProducts(true);
      }
    };

    const handleOffline = () => {
      if (statusRef.current === "online") {
        console.warn("[useProducts] Koneksi terputus — beralih ke cache.");
        getCachedProducts().then((cached) => {
          getCacheMeta().then((meta) => {
            if (cached.length > 0) {
              setCategories(cached);
              setSource("indexeddb");
              setStatus("offline");
              setLastSyncedAt(meta?.syncedAt ?? null);
            } else {
              setStatus("error");
              setSource("none");
            }
          });
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadProducts]);

  // ── Derived ───────────────────────────────────────────────────────────────────

  const allProducts: Produk[] = categories.flatMap((cat) => cat.produk ?? []);

  return {
    categories,
    allProducts,
    status,
    source,
    lastSyncedAt,
    isLoading,
    isSyncing,
    error,
    refresh: () => loadProducts(false),
  };
}
