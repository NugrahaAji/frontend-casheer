/**
 * productDB.ts
 * IndexedDB wrapper untuk menyimpan cache seluruh produk secara persisten.
 * Data tetap ada meskipun browser ditutup atau offline.
 * Saat online  → fetch dari MongoDB via API, lalu simpan ke IndexedDB.
 * Saat offline → baca langsung dari IndexedDB sebagai fallback.
 *
 * DB      : casheer_db   (sama dengan shiftDB agar satu database)
 * Version : 2            (naik dari 1 agar onupgradeneeded tambahkan store baru)
 * Store   : products_cache
 */

const DB_NAME = "casheer_db";
const DB_VERSION = 3; // harus sinkron dengan shiftDB.ts & transactionDB.ts
const STORE_NAME = "products_cache";
const META_STORE = "products_meta";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StockBatch {
  batch: number;
  jumlah: number;
  hargaBeli: number;
  stok: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GrosirPricing {
  jumlah: number;
  hargaJual: number;
}

export interface Produk {
  kodeProduk: string;
  namaProduk: string;
  kategoriProduk: string;
  stock: StockBatch[];
  pricing: {
    eceran: { hargaJual: number };
    grosir: GrosirPricing[];
  };
  kepemilikan: "titipan" | "sendiri";
  status: "aktif" | "tidak";
  biayaAdmin?: number;
}

export interface ProductCategory {
  kategori: "fisik" | "digital";
  produk: Produk[];
}

/** Record yang disimpan per-kategori di IndexedDB */
export interface ProductCacheRecord {
  /** key: "fisik" | "digital" */
  id: string;
  kategori: "fisik" | "digital";
  produk: Produk[];
  cachedAt: string; // ISO timestamp
}

export interface CacheMeta {
  id: "last_sync";
  syncedAt: string; // ISO timestamp kapan terakhir sync dari server
  isStale: boolean; // true jika data sudah kedaluwarsa (> 1 jam)
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

      // Store dari shiftDB v1 — jaga agar tidak dihapus
      if (!db.objectStoreNames.contains("active_shift")) {
        db.createObjectStore("active_shift", { keyPath: "id" });
      }

      // Store baru untuk cache produk (v2)
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
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
 * Simpan seluruh data produk (array ProductCategory) ke IndexedDB.
 * Setiap kategori disimpan sebagai record terpisah dengan key = kategori.
 */
export async function saveProducts(categories: ProductCategory[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME, META_STORE], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const meta = tx.objectStore(META_STORE);
      const now = new Date().toISOString();

      for (const cat of categories) {
        const record: ProductCacheRecord = {
          id: cat.kategori,
          kategori: cat.kategori,
          produk: cat.produk,
          cachedAt: now,
        };
        store.put(record);
      }

      const metaRecord: CacheMeta = {
        id: "last_sync",
        syncedAt: now,
        isStale: false,
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
    console.error("[productDB] saveProducts error:", err);
  }
}

/**
 * Ambil semua produk dari IndexedDB.
 * Mengembalikan array kosong jika belum ada cache.
 */
export async function getCachedProducts(): Promise<ProductCategory[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records: ProductCacheRecord[] = req.result ?? [];
        const categories: ProductCategory[] = records.map((r) => ({
          kategori: r.kategori,
          produk: r.produk,
        }));
        resolve(categories);
      };
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[productDB] getCachedProducts error:", err);
    return [];
  }
}

/**
 * Ambil metadata cache (kapan terakhir sync, apakah stale).
 */
export async function getCacheMeta(): Promise<CacheMeta | null> {
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
    console.error("[productDB] getCacheMeta error:", err);
    return null;
  }
}

/**
 * Hapus semua cache produk dari IndexedDB.
 */
export async function clearProductCache(): Promise<void> {
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
    console.error("[productDB] clearProductCache error:", err);
  }
}

/**
 * Periksa apakah cache sudah kedaluwarsa (lebih dari maxAgeMs, default 1 jam).
 */
export async function isCacheStale(maxAgeMs = 60 * 60 * 1000): Promise<boolean> {
  const meta = await getCacheMeta();
  if (!meta) return true;
  const age = Date.now() - new Date(meta.syncedAt).getTime();
  return age > maxAgeMs;
}
