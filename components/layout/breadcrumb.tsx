"use client";

import { usePathname } from "next/navigation";
import { IconLayoutSidebar } from "@tabler/icons-react";

const ROUTE_NAMES: Record<string, string> = {
  "/": "Transaksi",
  "/dashboard": "Transaksi",
  "/owner/dashboard": "Dashboard Owner",
  "/keuangan": "Keuangan Harian",
  "/kasbon": "Kasbon",
  "/stok-barang": "Stok Barang",
  "/laporan": "Laporan",
  "/pengeluaran": "Pengeluaran",
  "/karyawan": "User Management",
  "/owner/transaksi": "Riwayat Transaksi"
};

export function MainBreadcrumb() {
  const pathname = usePathname();
  
  const lowerPath = pathname?.toLowerCase() || "/";
  
  // Try exact match first
  let currentPathName = ROUTE_NAMES[lowerPath];
  
  // If no exact match, try prefix match or fallback format
  if (!currentPathName) {
    const segments = lowerPath.split('/').filter(Boolean);
    if (segments.length > 0) {
      currentPathName = segments.map(segment => 
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      ).join(' › ');
    } else {
      currentPathName = "Transaksi";
    }
  }

  return (
    <div className="hidden lg:flex items-center gap-2 text-[15px]">
      <IconLayoutSidebar className="w-5 h-5 text-zinc-500" stroke={1.5}/>
      <span className="text-zinc-500 font-medium">Casheer</span>
      <span className="text-zinc-400">›</span>
      <span className="text-zinc-900 font-semibold">{currentPathName}</span>
    </div>
  );
}
