"use client";

import { 
  IconLayoutSidebar,
  IconBell, 
  IconChevronDown 
} from "@tabler/icons-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { MainSidebar } from "./sidebar";
import { MainBreadcrumb } from "./breadcrumb";

export function MainHeader() {
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
       
       <div className="flex items-center gap-2 lg:gap-5">
          <div className="flex items-center gap-2 bg-zinc-100 rounded-full py-1.5 px-3 lg:pr-2 cursor-pointer hover:bg-zinc-200 transition-colors">
             <div className="hidden lg:flex w-6 h-6 rounded-full bg-zinc-300 items-center justify-center text-zinc-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
             </div>
             <span className="text-sm font-medium lg:ml-1">Kasir</span>
             <IconChevronDown className="w-4 h-4 text-zinc-400" />
          </div>
          
          <div className="relative cursor-pointer hidden sm:block">
             <IconBell className="w-6 h-6 text-zinc-600" stroke={1.5} />
             <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">3</span>
          </div>
          
          <div className="w-8 h-8 rounded-full bg-[#09090b] text-white flex items-center justify-center font-medium text-sm cursor-pointer ml-1">
             K
          </div>
       </div>
    </header>
  );
}
