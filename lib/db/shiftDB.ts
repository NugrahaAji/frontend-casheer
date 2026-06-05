/**
 * shiftDB.ts
 * IndexedDB wrapper untuk menyimpan session shift kasir secara persisten.
 * Data tetap ada meskipun tab browser ditutup, halaman di-refresh, atau offline.
 * Murni Web API IndexedDB — tanpa library tambahan.
 */

const DB_NAME = "casheer_db";
const DB_VERSION = 4; // harus sama dengan productDB.ts & transactionDB.ts
const STORE_NAME = "active_shift";

export interface ShiftSession {
  id: "current"; // Hanya ada 1 shift aktif pada satu waktu
  isShiftStarted: boolean;
  startingBalance: number;
  shiftStartTime: string | null; // ISO string
  shiftId: string | null; // ID dari MongoDB, null jika shift dibuat offline
  isSynced: boolean; // true jika sudah berhasil disimpan ke server MongoDB
  cashierId: string | null; // username kasir aktif
}

// Buka (atau inisialisasi) IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB tidak tersedia di server-side rendering."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("active_shift")) {
        db.createObjectStore("active_shift", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("products_cache")) {
        db.createObjectStore("products_cache", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("products_meta")) {
        db.createObjectStore("products_meta", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("transactions_cache")) {
        db.createObjectStore("transactions_cache", { keyPath: "_id" });
      }
      if (!db.objectStoreNames.contains("transactions_meta")) {
        db.createObjectStore("transactions_meta", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pending_transactions")) {
        db.createObjectStore("pending_transactions", { keyPath: "localId" });
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

/** Ambil sesi shift aktif dari IndexedDB. Mengembalikan null jika tidak ada. */
export async function getShiftSession(): Promise<ShiftSession | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("current");

      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[shiftDB] getShiftSession error:", err);
    return null;
  }
}

/** Simpan atau update sesi shift ke IndexedDB. */
export async function saveShiftSession(session: ShiftSession): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(session); // put = insert atau update (upsert)

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[shiftDB] saveShiftSession error:", err);
  }
}

/** Hapus sesi shift dari IndexedDB (dipanggil saat shift diakhiri). */
export async function clearShiftSession(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete("current");

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.error("[shiftDB] clearShiftSession error:", err);
  }
}

/** Default/kosong session yang digunakan sebelum data dimuat dari IndexedDB. */
export const defaultSession: ShiftSession = {
  id: "current",
  isShiftStarted: false,
  startingBalance: 0,
  shiftStartTime: null,
  shiftId: null,
  isSynced: false,
  cashierId: null,
};
