"use client";

import { useEffect } from "react";

/**
 * Komponen ini mendaftarkan service worker Casheer ke browser.
 * Harus diletakkan di RootLayout (client component).
 * SW hanya diregister di production (bukan localhost dev).
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // Versi baru tersedia — bisa tampilkan notifikasi update
              console.log("[SW] Update tersedia. Refresh untuk versi terbaru.");
            }
          });
        });

        console.log("[SW] Terdaftar dengan scope:", registration.scope);
      } catch (err) {
        console.error("[SW] Gagal mendaftar:", err);
      }
    };

    // Daftar setelah halaman load penuh agar tidak block rendering
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }

    return () => {
      window.removeEventListener("load", registerSW);
    };
  }, []);

  return null;
}
