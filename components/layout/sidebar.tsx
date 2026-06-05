"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconShoppingCart,
  IconWallet,
  IconFileInvoice,
  IconLogout,
  IconChartBar,
  IconUsers,
  IconHome,
  IconBox,
  IconReceipt,
  IconArrowBackUp,
} from "@tabler/icons-react";
import { usePathname, useRouter } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NavGroup = {
  category: string;
  items: NavItem[];
};

const ownerNavGroups: NavGroup[] = [
  {
    category: "Utama",
    items: [
      {
        href: "/owner/dashboard",
        label: "Dashboard",
        icon: <IconHome className="w-5 h-5 text-zinc-500" stroke={1.5} />,
      },
    ],
  },
  {
    category: "Penjualan",
    items: [
      {
        href: "/owner/transaksi",
        label: "Transaksi",
        icon: (
          <IconShoppingCart className="w-5 h-5 text-zinc-500" stroke={1.5} />
        ),
      },
    ],
  },
  {
    category: "Inventori",
    items: [
      {
        href: "/stok-barang",
        label: "Stok Barang",
        icon: <IconBox className="w-5 h-5 text-zinc-500" stroke={1.5} />,
      },
      {
        href: "/owner/retur",
        label: "Non-Transaksi",
        icon: (
          <IconArrowBackUp className="w-5 h-5 text-zinc-500" stroke={1.5} />
        ),
      },
    ],
  },
  {
    category: "Keuangan",
    items: [
      {
        href: "/laporan",
        label: "Laporan",
        icon: <IconChartBar className="w-5 h-5 text-zinc-500" stroke={1.5} />,
      },
      {
        href: "/kasbon",
        label: "Kasbon",
        icon: (
          <IconFileInvoice className="w-5 h-5 text-zinc-500" stroke={1.5} />
        ),
      },
    ],
  },
  {
    category: "Manajemen",
    items: [
      {
        href: "/karyawan",
        label: "User Management",
        icon: <IconUsers className="w-5 h-5 text-zinc-500" stroke={1.5} />,
      },
    ],
  },
];

const cashierNavItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Transaksi",
    icon: <IconShoppingCart className="w-5 h-5 text-zinc-500" stroke={1.5} />,
  },
  {
    href: "/keuangan",
    label: "Keuangan Harian",
    icon: <IconWallet className="w-5 h-5 text-zinc-500" stroke={1.5} />,
  },
  {
    href: "/kasbon",
    label: "Kasbon",
    icon: <IconFileInvoice className="w-5 h-5 text-zinc-500" stroke={1.5} />,
  },
];

export function MainSidebar({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("role");
    setTimeout(() => {
      setUserRole(role || "cashier");
    }, 0);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("role");
      localStorage.removeItem("username");
      document.cookie =
        "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict";
      document.cookie =
        "username=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict";
      router.push("/");
    }
  };

  const commonClasses =
    "flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-[15px] transition-colors";
  const activeClasses = "bg-zinc-100 text-zinc-900";
  const inactiveClasses = "text-zinc-600 hover:bg-zinc-50";

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname === "/"
      : pathname === href;

  return (
    <aside
      className={`w-[260px] border-r border-zinc-200 flex flex-col bg-white shrink-0 ${className}`}
    >
      {/* Logo */}
      <div className="h-[72px] flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#09090b] text-white p-2 rounded-xl">
            <IconShoppingCart className="w-6 h-6" stroke={1.5} />
          </div>
          <span className="text-xl font-bold tracking-tight">Casheer</span>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`flex-1 px-4 py-4 flex flex-col gap-1 overflow-y-auto transition-opacity duration-200 ${
          userRole ? "opacity-100" : "opacity-0"
        }`}
      >
        {userRole === "owner"
          ? /* Owner: grouped by category */
            ownerNavGroups.map((group) => (
              <div key={group.category} className="mb-3">
                <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 select-none">
                  {group.category}
                </p>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`${commonClasses} ${
                      isActive(item.href) ? activeClasses : inactiveClasses
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>
            ))
          : /* Cashier: flat list */
            cashierNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${commonClasses} ${
                  isActive(item.href) ? activeClasses : inactiveClasses
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
      </nav>

      {/* Logout */}
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
