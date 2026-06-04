"use client";

import { IconWifiOff, IconCloudCheck, IconRefresh, IconLoader, IconServerOff } from "@tabler/icons-react";
import type { DataSource, ProductStatus } from "@/lib/hooks/useProducts";
import type { TrxStatus, TrxDataSource } from "@/lib/hooks/useTransactions";

// Gabungan status dari kedua hook agar satu komponen bisa dipakai keduanya
type AnyStatus = ProductStatus | TrxStatus;
type AnySource = DataSource | TrxDataSource;

interface OfflineBannerProps {
  status: AnyStatus;
  source: AnySource;
  lastSyncedAt: string | null;
  isSyncing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const formatSync = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function OfflineBanner({
  status,
  source,
  lastSyncedAt,
  isSyncing = false,
  error,
  onRefresh,
}: OfflineBannerProps) {
  if (status === "loading" || status === "online") return null;

  // ── Background sync (reconnecting) ──────────────────────────────────────────
  if (isSyncing) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
        <IconLoader className="w-4 h-4 text-blue-600 shrink-0 animate-spin" stroke={2} />
        <span className="text-blue-800 font-medium">
          Koneksi pulih — menyinkronkan data dari server...
        </span>
      </div>
    );
  }

  // ── Server error tapi cache tersedia ─────────────────────────────────────────
  if (status === "server_error" && source === "indexeddb") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm">
        <IconServerOff className="w-4 h-4 text-orange-600 shrink-0" stroke={2} />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-orange-800">Server Error — </span>
          <span className="text-orange-700">
            {error ?? "Server mengalami masalah."}{" "}
            {lastSyncedAt && (
              <>Cache terakhir: <strong>{formatSync(lastSyncedAt)}</strong>.</>
            )}
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <IconRefresh className="w-3.5 h-3.5" stroke={2} />
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  // ── Offline dengan cache tersedia ────────────────────────────────────────────
  if (status === "offline" && source === "indexeddb") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <IconWifiOff className="w-4 h-4 text-amber-600 shrink-0" stroke={2} />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-amber-800">Mode Offline — </span>
          <span className="text-amber-700">
            Data diambil dari cache lokal (IndexedDB).
            {lastSyncedAt && (
              <> Terakhir sync: <strong>{formatSync(lastSyncedAt)}</strong>.</>
            )}
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <IconRefresh className="w-3.5 h-3.5" stroke={2} />
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  // ── Error: tidak ada koneksi & tidak ada cache ────────────────────────────────
  if (status === "error") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm">
        <IconWifiOff className="w-4 h-4 text-red-600 shrink-0" stroke={2} />
        <div className="flex-1">
          <span className="font-semibold text-red-800">Gagal memuat data — </span>
          <span className="text-red-700">
            {error ?? "Tidak dapat terhubung ke server dan belum ada cache offline."}
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <IconRefresh className="w-3.5 h-3.5" stroke={2} />
            Coba Lagi
          </button>
        )}
      </div>
    );
  }

  return null;
}

// ── Status Badge ──────────────────────────────────────────────────────────────

interface OfflineBadgeProps {
  status: AnyStatus;
  source: AnySource;
  isSyncing?: boolean;
}

export function OfflineBadge({ status, source, isSyncing = false }: OfflineBadgeProps) {
  if (isSyncing) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <IconLoader className="w-3 h-3 animate-spin" stroke={2} />
        Sinkronisasi...
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
        <IconLoader className="w-3 h-3 animate-spin" stroke={2} />
        Memuat...
      </span>
    );
  }
  if (status === "online") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <IconCloudCheck className="w-3 h-3" stroke={2} />
        Live
      </span>
    );
  }
  if (status === "server_error" && source === "indexeddb") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
        <IconServerOff className="w-3 h-3" stroke={2} />
        Server Error (Cache)
      </span>
    );
  }
  if (status === "offline" && source === "indexeddb") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <IconWifiOff className="w-3 h-3" stroke={2} />
        Offline Cache
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <IconWifiOff className="w-3 h-3" stroke={2} />
      Tidak Terhubung
    </span>
  );
}
