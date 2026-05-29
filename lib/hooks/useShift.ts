/**
 * useShift.ts
 * Custom hook untuk mengelola lifecycle session shift kasir.
 *
 * Alur:
 *  1. Saat mount → Baca sesi yang tersimpan dari IndexedDB (persist saat offline/reload)
 *  2. Mulai Shift → Kirim POST /api/shift/start dengan credentials: "include" (cookie JWT dikirim otomatis)
 *     → Simpan respons (shiftId) ke IndexedDB
 *     → Jika offline → simpan lokal dulu, tandai isSynced=false
 *  3. Saat online kembali → Auto-sync shift yang belum ter-sync ke server
 *  4. Akhiri Shift → Kirim POST /api/shift/end → Hapus dari IndexedDB
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getShiftSession,
  saveShiftSession,
  clearShiftSession,
  defaultSession,
  type ShiftSession,
} from "@/lib/db/shiftDB";

export interface UseShiftReturn {
  /** State sesi shift saat ini */
  session: ShiftSession;
  /** true saat data sedang dimuat dari IndexedDB (menghindari flash content) */
  isHydrating: boolean;
  /** true saat sedang memproses request ke server */
  isSubmitting: boolean;
  /** Error message terakhir, null jika tidak ada */
  error: string | null;
  /** Apakah koneksi internet saat ini tersedia */
  isOnline: boolean;
  /** Mulai shift baru */
  startShift: (balance: number) => Promise<void>;
  /** Akhiri shift aktif */
  endShift: () => Promise<void>;
}

export function useShift(): UseShiftReturn {
  const [session, setSession] = useState<ShiftSession>(defaultSession);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Gunakan ref untuk memantau session saat ini agar bisa dibaca di auto-sync useEffect tanpa memicu loop dependencies
  const sessionRef = useRef<ShiftSession>(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // ─── 1. Hydrate dari IndexedDB saat component pertama kali mount ───────────
  useEffect(() => {
    (async () => {
      const saved = await getShiftSession();
      if (saved) {
        setSession(saved);
      }
      setIsHydrating(false);
    })();
  }, []);

  // ─── 2. Monitor status koneksi internet ────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial state secara asinkron untuk menghindari synchronous setState warning
    setTimeout(() => {
      setIsOnline(navigator.onLine);
    }, 0);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ─── 3. Auto-sync ke server saat koneksi internet kembali ──────────────────
  useEffect(() => {
    if (!isOnline) return;
    const currentSession = sessionRef.current;
    if (!currentSession.isShiftStarted || currentSession.isSynced) return;

    // Shift aktif tetapi belum tersinkronisasi (dibuat saat offline)
    (async () => {
      try {
        const res = await fetch("/api/shift/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Kirim httpOnly cookie 'token' ke backend
          body: JSON.stringify({
            startingBalance: currentSession.startingBalance,
            shiftStartTime: currentSession.shiftStartTime,
            cashierId: currentSession.cashierId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const synced: ShiftSession = {
            ...currentSession,
            shiftId: data?.data?._id ?? currentSession.shiftId,
            isSynced: true,
          };
          setSession(synced);
          await saveShiftSession(synced);
          console.info("[useShift] Auto-sync berhasil! shiftId:", synced.shiftId);
        }
      } catch (err) {
        // Gagal sync, coba lagi nanti saat online
        console.warn("[useShift] Auto-sync gagal, akan dicoba ulang:", err);
      }
    })();
  }, [isOnline]); // Hanya dijalankan ulang saat status online berubah

  /** Helper: simpan shift ke IndexedDB tanpa mengirim ke server */
  const _saveOfflineShift = useCallback(async (
    balance: number,
    startTime: string,
    cashierId: string | null
  ) => {
    const offlineSession: ShiftSession = {
      id: "current",
      isShiftStarted: true,
      startingBalance: balance,
      shiftStartTime: startTime,
      shiftId: null,
      isSynced: false,
      cashierId,
    };
    setSession(offlineSession);
    await saveShiftSession(offlineSession);
  }, []);

  // ─── 4. Mulai Shift ────────────────────────────────────────────────────────
  const startShift = useCallback(
    async (balance: number) => {
      setIsSubmitting(true);
      setError(null);

      const cashierId = typeof window !== "undefined"
        ? localStorage.getItem("username") ?? null
        : null;

      const startTime = new Date().toISOString();

      if (isOnline) {
        try {
          const res = await fetch("/api/shift/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // Cookie JWT dikirim otomatis oleh browser
            body: JSON.stringify({
              startingBalance: balance,
              shiftStartTime: startTime,
              cashierId,
            }),
          });

          const data = await res.json();

          // Simpan ke IndexedDB, tandai sudah sync (isSynced: true)
          const newSession: ShiftSession = {
            id: "current",
            isShiftStarted: true,
            startingBalance: balance,
            shiftStartTime: startTime,
            shiftId: data?.data?._id ?? null,
            isSynced: true,
            cashierId,
          };

          setSession(newSession);
          await saveShiftSession(newSession);
        } catch (err) {
          // Jika request gagal (contoh: server error), tetap simpan lokal dulu
          console.warn("[useShift] startShift request gagal, simpan offline:", err);
          await _saveOfflineShift(balance, startTime, cashierId);
        }
      } else {
        // Mode offline: simpan lokal, set isSynced=false agar di-sync nanti
        await _saveOfflineShift(balance, startTime, cashierId);
      }

      setIsSubmitting(false);
    },
    [isOnline, _saveOfflineShift]
  );

  // ─── 5. Akhiri Shift ───────────────────────────────────────────────────────
  const endShift = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    const currentSession = sessionRef.current;
    if (isOnline && currentSession.shiftId) {
      try {
        await fetch(`/api/shift/${currentSession.shiftId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Cookie JWT dikirim otomatis
          body: JSON.stringify({ shiftEndTime: new Date().toISOString() }),
        });
      } catch (err) {
        // Meskipun gagal, tetap bersihkan data lokal
        console.warn("[useShift] endShift request gagal:", err);
      }
    }

    // Hapus dari IndexedDB dan reset state
    await clearShiftSession();
    setSession(defaultSession);
    setIsSubmitting(false);
  }, [isOnline]);

  return {
    session,
    isHydrating,
    isSubmitting,
    error,
    isOnline,
    startShift,
    endShift,
  };
}
