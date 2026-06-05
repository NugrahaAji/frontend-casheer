"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  IconLayoutSidebar,
  IconChevronDown,
  IconLogout
} from "@tabler/icons-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MainSidebar } from "./sidebar";
import { MainBreadcrumb } from "./breadcrumb";

export function MainHeader() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [userRole, setUserRole] = useState<string>("Kasir");
  const [userName, setUserName] = useState<string>("");
  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("role");
    const username = localStorage.getItem("username") || "";
    setUserRole(role === "owner" ? "Owner" : "Kasir");
    setUserName(username);

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  return (
    <header className="h-[72px] border-b border-zinc-200 bg-white flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
       <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Sheet>
            <SheetTrigger asChild>
              <button className="lg:hidden p-2 -ml-2 rounded-md hover:bg-zinc-100 transition-colors">
                <IconLayoutSidebar className="w-5 h-5" stroke={1.5}/>
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px] border-r-0">
               <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
               <MainSidebar className="border-none w-full h-full" />
            </SheetContent>
          </Sheet>

          <MainBreadcrumb />
       </div>
       
       <div className="flex items-center gap-2 lg:gap-5 relative" ref={dropdownRef}>
          <div 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 bg-zinc-100 rounded-full py-1.5 px-3 lg:pr-2 cursor-pointer hover:bg-zinc-200 transition-colors select-none"
          >
             <div className="hidden lg:flex w-6 h-6 rounded-full bg-zinc-300 items-center justify-center text-zinc-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
             </div>
             <span className="text-sm font-medium lg:ml-1">{userRole}</span>
             <IconChevronDown className="w-4 h-4 text-zinc-400" />
          </div>

          {dropdownOpen && (
            <div className="absolute right-8 top-full mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {userName && (
                <div className="px-4 py-2 border-b border-zinc-100">
                  <p className="text-xs text-zinc-400">Masuk sebagai</p>
                  <p className="text-sm font-semibold text-zinc-800 truncate">{userName}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors font-medium text-left"
              >
                <IconLogout className="w-4.5 h-4.5" stroke={1.5} />
                Logout
              </button>
            </div>
          )}
          
          <div className="w-8 h-8 rounded-full bg-[#09090b] text-white flex items-center justify-center font-medium text-sm cursor-pointer ml-1">
             {userName ? userName[0].toUpperCase() : (userRole === "Owner" ? "O" : "K")}
          </div>
       </div>
    </header>
  );
}
