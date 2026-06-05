/**
 * useProducts.ts
 * Custom hook untuk mengambil data produk dengan strategi cache-first:
 *
 *   Fase 0  — Baca IndexedDB segera → tampilkan data tanpa menunggu API
 *   Fase 1  — Fetch dari API (background) → update cache & state jika berhasil
 *   Offline — Jika data sudah di memory, hanya update status (tidak re-read DB)
 *   Online  — Auto-sync saat browser kembali terhubung
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
export type ProductStatus =
  | "loading"
  | "online"
  | "offline"
  | "server_error"
  | "error";

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

function isNetworkError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch"))
    return true;
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

  // Ref untuk tahu apakah sudah pernah ada data di state
  const hasDataRef = useRef(false);

  // ── Core fetch logic ─────────────────────────────────────────────────────────

  const loadProducts = useCallback(async (isBackground = false) => {
    setError(null);

    // ── Fase 0: Tampilkan cache IndexedDB segera (hanya pada load pertama) ──
    // Ini membuat UI langsung muncul tanpa menunggu API — krusial saat offline.
    if (!isBackground) {
      setIsLoading(true);
      try {
        const cached = await getCachedProducts();
        const meta = await getCacheMeta();
        if (cached.length > 0) {
          setCategories(cached);
          setSource("indexeddb");
          setLastSyncedAt(meta?.syncedAt ?? null);
          setIsLoading(false); // tampilkan data segera
          hasDataRef.current = true;
        }
      } catch {
        // Abaikan, tetap lanjutkan ke API
      }
    } else {
      setIsSyncing(true);
    }

    let httpStatus: number | null = null;

    // ── Fase 1: Fetch dari API ───────────────────────────────────────────────
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
      hasDataRef.current = true;
    } catch (err) {
      const networkError = isNetworkError(err);
      const label = networkError
        ? "[useProducts] Koneksi terputus"
        : `[useProducts] Server error (${httpStatus ?? "?"})`;
      console.warn(label, "— mencoba cache IndexedDB:", err);

      if (isBackground) {
        // Background sync gagal tapi data lama masih tampil — update status saja
        if (networkError) setStatus("offline");
        return;
      }

      // Fallback: gunakan cache jika Fase 0 belum berhasil memuat data
      if (!hasDataRef.current) {
        try {
          const cached = await getCachedProducts();
          const meta = await getCacheMeta();

          if (cached.length > 0) {
            setCategories(cached);
            setSource("indexeddb");
            if (networkError) {
              setStatus("offline");
              setError(null);
            } else {
              setStatus("server_error");
              setError(
                `Server mengembalikan error ${httpStatus ?? ""}. Menampilkan data cache terakhir.`,
              );
            }
            setLastSyncedAt(meta?.syncedAt ?? null);
            hasDataRef.current = true;
          } else {
            setCategories([]);
            setSource("none");
            setStatus("error");
            setError(
              networkError
                ? "Tidak dapat terhubung ke server dan belum ada cache offline tersedia."
                : `Server error ${httpStatus ?? ""}. Tidak ada cache offline tersedia.`,
            );
          }
        } catch (dbErr) {
          console.error("[useProducts] IndexedDB error:", dbErr);
          setCategories([]);
          setSource("none");
          setStatus("error");
          setError("Terjadi kesalahan saat membaca data offline.");
        }
      } else {
        // Data sudah tampil dari cache (Fase 0) — hanya update status
        if (networkError) {
          setStatus("offline");
        } else {
          setStatus("server_error");
          setError(
            `Server mengembalikan error ${httpStatus ?? ""}. Menampilkan data cache terakhir.`,
          );
        }
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

  // ── Online / Offline event handlers ──────────────────────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      const cur = statusRef.current;
      if (cur === "offline" || cur === "server_error" || cur === "error") {
        console.info(
          "[useProducts] Koneksi pulih — menyinkronkan ulang produk...",
        );
        loadProducts(true);
      }
    };

    const handleOffline = () => {
      const cur = statusRef.current;
      if (cur === "online") {
        console.warn(
          "[useProducts] Koneksi terputus — beralih ke mode offline.",
        );
        // Data sudah ada di memory (dari API), tidak perlu re-read IndexedDB
        setStatus("offline");
        setSource("indexeddb");
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
