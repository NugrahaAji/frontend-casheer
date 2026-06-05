"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPendingTransactions,
  deletePendingTransaction,
  getPendingCount,
} from "@/lib/db/transactionDB";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SyncResult {
  synced: number;
  failed: number;
}

export interface UsePendingSyncResult {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  sync: () => Promise<SyncResult>;
  refreshCount: () => Promise<void>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePendingSync(): UsePendingSyncResult {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Ref untuk mencegah double-sync lintas render cycle/concurrent calls
  const isSyncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  // ── Core sync ─────────────────────────────────────────────────────────────

  const sync = useCallback(async (): Promise<SyncResult> => {
    // Kunci ref secara SINKRON terlebih dahulu sebelum operasi asinkron apa pun
    // untuk mencegah race conditions saat beberapa trigger (mount, online) berjalan bersamaan
    if (isSyncingRef.current) return { synced: 0, failed: 0 };
    if (!navigator.onLine) return { synced: 0, failed: 0 };

    isSyncingRef.current = true;
    setIsSyncing(true);

    const result: SyncResult = { synced: 0, failed: 0 };

    try {
      const pending = await getPendingTransactions();
      if (pending.length === 0) {
        isSyncingRef.current = false;
        setIsSyncing(false);
        return result;
      }

      console.info(
        `[usePendingSync] Mulai sync ${pending.length} transaksi offline...`,
      );

      for (const p of pending) {
        try {
          const res = await fetch("/api/transaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(p.payload),
            signal: AbortSignal.timeout(10000),
          });
          const data = await res.json();

          if (res.ok && data.success) {
            await deletePendingTransaction(p.localId);
            result.synced++;
            console.info(`[usePendingSync] ✓ ${p.localId}`);
          } else {
            result.failed++;
            console.warn(`[usePendingSync] ✗ ${p.localId}:`, data.message);
          }
        } catch (err) {
          // Jaringan putus lagi — stop, coba lagi saat online berikutnya
          result.failed++;
          console.warn(`[usePendingSync] Network error, berhenti:`, err);
          break;
        }
      }

      console.info(
        `[usePendingSync] Selesai — ${result.synced} berhasil, ${result.failed} gagal`,
      );
    } catch (err) {
      console.error("[usePendingSync] sync error:", err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      setLastSyncResult(result);
      await refreshCount();
    }

    return result;
  }, [refreshCount]);

  // ── Bug fix #2: auto-sync saat mount (page load / refresh) ───────────────
  useEffect(() => {
    const trySyncOnMount = async () => {
      if (!navigator.onLine) return;
      const count = await getPendingCount();
      if (count > 0) {
        console.info(
          `[usePendingSync] Mount — ${count} transaksi pending ditemukan, auto-sync...`,
        );
        sync();
      } else {
        setPendingCount(0);
      }
    };
    trySyncOnMount();
  }, [sync]);

  // ── Auto-sync saat transisi offline → online ──────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      const count = await getPendingCount();
      if (count > 0) {
        console.info(
          `[usePendingSync] Online event — ${count} transaksi pending, auto-sync...`,
        );
        sync();
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sync]);

  return { pendingCount, isSyncing, lastSyncResult, sync, refreshCount };
}
