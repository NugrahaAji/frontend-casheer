/**
 * useTransactions.ts
 * Custom hook untuk mengambil data transaksi dengan strategi:
 *
 *   1. Fetch dari API (MongoDB) → simpan ke IndexedDB & return
 *   2. Jika network error (offline/timeout) → baca IndexedDB → status "offline"
 *   3. Jika server error (5xx/4xx) → baca IndexedDB → status "server_error"
 *   4. Auto-sync saat browser kembali online (window 'online' event)
 *
 * Endpoint: GET /api/transaction
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getCachedTransactions,
  saveTransactions,
  getTransactionCacheMeta,
  type Transaction,
} from "@/lib/db/transactionDB";

// ── Types ──────────────────────────────────────────────────────────────────────

export type TrxDataSource = "api" | "indexeddb" | "none";
export type TrxStatus = "loading" | "online" | "offline" | "server_error" | "error";

export interface UseTransactionsResult {
  transactions: Transaction[];
  status: TrxStatus;
  source: TrxDataSource;
  lastSyncedAt: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  refresh: () => void;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) return true;
  return false;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTransactions(): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [status, setStatus] = useState<TrxStatus>("loading");
  const [source, setSource] = useState<TrxDataSource>("none");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const statusRef = useRef<TrxStatus>("loading");
  statusRef.current = status;

  // ── Core fetch logic ─────────────────────────────────────────────────────────

  const loadTransactions = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setIsSyncing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    let httpStatus: number | null = null;

    // ── Langkah 1: Fetch dari API ────────────────────────────────────────────
    try {
      const res = await fetch("/api/transaction", {
        credentials: "include",
        signal: AbortSignal.timeout(8000),
      });

      httpStatus = res.status;
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) {
        throw new Error("Format respons tidak valid.");
      }

      const fresh: Transaction[] = json.data;
      await saveTransactions(fresh);

      setTransactions(fresh);
      setSource("api");
      setStatus("online");
      setLastSyncedAt(new Date().toISOString());

    } catch (err) {
      const networkError = isNetworkError(err);
      const label = networkError
        ? "[useTransactions] Koneksi terputus"
        : `[useTransactions] Server error (${httpStatus ?? "?"})`;
      console.warn(label, "— mencoba cache IndexedDB:", err);

      // Background sync & data lama masih tampil → biarkan
      if (isBackground && (statusRef.current === "offline" || statusRef.current === "server_error")) {
        return;
      }

      // ── Langkah 2: Fallback ke IndexedDB ─────────────────────────────────
      try {
        const cached = await getCachedTransactions();
        const meta = await getTransactionCacheMeta();

        if (cached.length > 0) {
          setTransactions(cached);
          setSource("indexeddb");
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
          setTransactions([]);
          setSource("none");
          setStatus("error");
          setError(
            networkError
              ? "Tidak dapat terhubung ke server dan belum ada cache offline tersedia."
              : `Server error ${httpStatus ?? ""}. Tidak ada cache offline tersedia.`
          );
        }
      } catch (dbErr) {
        console.error("[useTransactions] IndexedDB error:", dbErr);
        setTransactions([]);
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
    loadTransactions(false);
  }, [loadTransactions]);

  // ── Auto-sync saat online / switch cache saat offline ─────────────────────────

  useEffect(() => {
    const handleOnline = () => {
      const cur = statusRef.current;
      if (cur === "offline" || cur === "server_error" || cur === "error") {
        console.info("[useTransactions] Koneksi pulih — sinkronisasi ulang transaksi...");
        loadTransactions(true);
      }
    };

    const handleOffline = () => {
      if (statusRef.current === "online") {
        console.warn("[useTransactions] Koneksi terputus — beralih ke cache.");
        getCachedTransactions().then((cached) => {
          getTransactionCacheMeta().then((meta) => {
            if (cached.length > 0) {
              setTransactions(cached);
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
  }, [loadTransactions]);

  return {
    transactions,
    status,
    source,
    lastSyncedAt,
    isLoading,
    isSyncing,
    error,
    refresh: () => loadTransactions(false),
  };
}
