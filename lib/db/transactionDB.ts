/**
 * transactionDB.ts
 * IndexedDB wrapper untuk menyimpan cache daftar transaksi secara persisten.
 * Saat online  → fetch dari API, simpan ke IndexedDB.
 * Saat offline → baca dari IndexedDB sebagai fallback.
 *
 * DB      : casheer_db  (shared dengan shiftDB & productDB)
 * Version : 3           (naik dari 2)
 * Store   : transactions_cache
 * Store   : transactions_meta
 */

const DB_NAME = "casheer_db";
const DB_VERSION = 3; // harus sinkron dengan shiftDB.ts & productDB.ts
const STORE_NAME = "transactions_cache";
const META_STORE = "transactions_meta";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TransactionItem {
  kodeProduk: string;
  namaProduk?: string;
  qty: number;
  harga?: number;
  hargaFinal?: number;
  subtotal: number;
  batch?: number;
}

export interface Transaction {
  _id: string;
  kodeTransaksi: string;
  customer: string;
  items: TransactionItem[];
  total: number;
  paymentType: "cash" | "utang";
  paid: number;
  status: "lunas" | "utang";
  createdAt: string;
}

export interface TransactionCacheMeta {
  id: "last_sync";
  syncedAt: string;
  totalRecords: number;
}

// ── Internal: buka DB ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB tidak tersedia di server-side rendering."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Jaga store dari versi sebelumnya
      if (!db.objectStoreNames.contains("active_shift")) {
        db.createObjectStore("active_shift", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("products_cache")) {
        db.createObjectStore("products_cache", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("products_meta")) {
        db.createObjectStore("products_meta", { keyPath: "id" });
      }

      // Store baru untuk cache transaksi (v3)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // keyPath "_id" — setiap transaksi disimpan sebagai record terpisah
        db.createObjectStore(STORE_NAME, { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Simpan seluruh daftar transaksi ke IndexedDB.
 * Menghapus semua data lama dan menulis ulang (full replace).
 */
export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const meta = tx.objectStore(META_STORE);

      // Hapus semua data lama
      store.clear();

      // Tulis semua transaksi baru
      for (const trx of transactions) {
        store.put(trx);
      }

      const metaRecord: TransactionCacheMeta = {
        id: "last_sync",
        syncedAt: new Date().toISOString(),
        totalRecords: transactions.length,
      };
      meta.put(metaRecord);

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.error("[transactionDB] saveTransactions error:", err);
  }
}

/**
 * Ambil semua transaksi dari IndexedDB, diurutkan dari terbaru.
 */
export async function getCachedTransactions(): Promise<Transaction[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: Transaction[] = req.result ?? [];
        // Urutkan dari terbaru ke terlama
        all.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(all);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[transactionDB] getCachedTransactions error:", err);
    return [];
  }
}

/**
 * Ambil metadata cache transaksi.
 */
export async function getTransactionCacheMeta(): Promise<TransactionCacheMeta | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readonly");
      const store = tx.objectStore(META_STORE);
      const req = store.get("last_sync");

      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[transactionDB] getTransactionCacheMeta error:", err);
    return null;
  }
}

/**
 * Hapus seluruh cache transaksi dari IndexedDB.
 */
export async function clearTransactionCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
      tx.objectStore(STORE_NAME).clear();
      tx.objectStore(META_STORE).clear();

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.error("[transactionDB] clearTransactionCache error:", err);
  }
}
