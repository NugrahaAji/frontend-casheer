"use client";

import { useEffect, useState } from "react";
import { 
  IconShoppingCart, 
  IconWallet, 
  IconFileInvoice, 
  IconLogout,
  IconChartBar,
  IconUsers,
  IconHome,
  IconBox,
  IconReceipt
} from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";

export function MainSidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Get role from localStorage after component mounts
    const role = localStorage.getItem("role");
    setUserRole(role || "cashier");
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // Ensure cookies are sent and cleared
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear client-side state regardless of server response
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      router.push("/");
    }
  };

  const commonClasses = "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-[15px] transition-colors";
  const activeClasses = "bg-zinc-100 text-zinc-900";
  const inactiveClasses = "text-zinc-600 hover:bg-zinc-50";

  return (
    <aside className={`w-[260px] border-r border-zinc-200 flex flex-col bg-white shrink-0 ${className}`}>
      <div className="h-[72px] flex items-center px-6">
         <div className="flex items-center gap-3">
            <div className="bg-[#09090b] text-white p-2 rounded-xl">
              <IconShoppingCart className="w-6 h-6" stroke={1.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">Casheer</span>
         </div>
      </div>

      <nav className={`flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto transition-opacity duration-200 ${userRole ? 'opacity-100' : 'opacity-0'}`}>
        {userRole === 'owner' ? (
          <>
            <a href="/owner/dashboard" className={`${commonClasses} ${pathname === '/owner/dashboard' ? activeClasses : inactiveClasses}`}>
               <IconHome className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Dashboard
            </a>
            <a href="/owner/transaksi" className={`${commonClasses} ${pathname === '/owner/transaksi' ? activeClasses : inactiveClasses}`}>
               <IconShoppingCart className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Transaksi
            </a>
            <a href="/stok-barang" className={`${commonClasses} ${pathname === '/stok-barang' ? activeClasses : inactiveClasses}`}>
               <IconBox className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Stok Barang
            </a>
            <a href="/laporan" className={`${commonClasses} ${pathname === '/laporan' ? activeClasses : inactiveClasses}`}>
               <IconChartBar className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Laporan
            </a>
            <a href="/kasbon" className={`${commonClasses} ${pathname === '/kasbon' ? activeClasses : inactiveClasses}`}>
               <IconFileInvoice className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Kasbon
            </a>
            <a href="/pengeluaran" className={`${commonClasses} ${pathname === '/pengeluaran' ? activeClasses : inactiveClasses}`}>
               <IconReceipt className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Pengeluaran
            </a>
            <a href="/karyawan" className={`${commonClasses} ${pathname === '/karyawan' ? activeClasses : inactiveClasses}`}>
               <IconUsers className="w-5 h-5 text-zinc-500" stroke={1.5} />
               User Management
            </a>
          </>
        ) : (
          <>
            <a href="/dashboard" className={`${commonClasses} ${pathname === '/dashboard' || pathname === '/' ? activeClasses : inactiveClasses}`}>
               <IconShoppingCart className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Transaksi
            </a>
            <a href="/keuangan" className={`${commonClasses} ${pathname === '/keuangan' ? activeClasses : inactiveClasses}`}>
               <IconWallet className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Keuangan Harian
            </a>
            <a href="/kasbon" className={`${commonClasses} ${pathname === '/kasbon' ? activeClasses : inactiveClasses}`}>
               <IconFileInvoice className="w-5 h-5 text-zinc-500" stroke={1.5} />
               Kasbon
            </a>
          </>
        )}
      </nav>

      <div className="p-4 mb-2">
         <hr className="mb-3 border-zinc-200" />
         <button 
           onClick={handleLogout} 
           className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg font-medium text-[15px] transition-colors"
         >
           <IconLogout className="w-5 h-5" stroke={1.5} />
           Logout
        </button>
      </div>
    </aside>
  );
}
