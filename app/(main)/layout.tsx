import { ReactNode } from "react";
import { MainSidebar } from "@/components/layout/sidebar";
import { MainHeader } from "@/components/layout/header";
import { IconLayoutGrid, IconShoppingCart, IconWallet, IconFileInvoice, IconSettings } from "@tabler/icons-react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] bg-white text-zinc-950 font-sans overflow-hidden">
      <MainSidebar className="hidden lg:flex" />

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <MainHeader />
        
        {/* Page Content */}
        <div className="flex-1 overflow-hidden flex pb-[64px] lg:pb-0">
           {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t border-zinc-200 flex items-center justify-around px-2 z-40">
           <a href="#" className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-900 w-16">
              <IconLayoutGrid className="w-6 h-6" stroke={1.5} />
              <span className="text-[11px] font-medium">Home</span>
           </a>
           <a href="/dashboard" className="flex flex-col items-center gap-1 text-zinc-900 w-16">
              <IconShoppingCart className="w-6 h-6" stroke={1.5} />
              <span className="text-[11px] font-medium">Transaksi</span>
           </a>
           <a href="#" className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-900 w-16">
              <IconWallet className="w-6 h-6" stroke={1.5} />
              <span className="text-[11px] font-medium">Keuangan</span>
           </a>
           <a href="/kasbon" className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-900 w-16">
              <IconFileInvoice className="w-6 h-6" stroke={1.5} />
              <span className="text-[11px] font-medium">Kasbon</span>
           </a>
           <a href="#" className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-900 w-16">
              <IconSettings className="w-6 h-6" stroke={1.5} />
              <span className="text-[11px] font-medium">Lainnya</span>
           </a>
        </div>
      </main>
    </div>
  );
}
