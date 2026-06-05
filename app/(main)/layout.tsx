import { ReactNode } from "react";
import Link from "next/link";
import { MainSidebar } from "@/components/layout/sidebar";
import { MainHeader } from "@/components/layout/header";
import {
  IconLayoutGrid,
  IconShoppingCart,
  IconWallet,
  IconFileInvoice,
  IconSettings,
} from "@tabler/icons-react";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] bg-white text-zinc-950 font-sans overflow-hidden">
      <MainSidebar className="hidden lg:flex" />

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <MainHeader />

        {/* Page Content */}
        <div className="flex-1 overflow-hidden flex">
          {children}
        </div>
      </main>
    </div>
  );
}
