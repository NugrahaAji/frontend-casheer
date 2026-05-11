"use client";

import { IconReceipt } from "@tabler/icons-react";

export default function PengeluaranPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#f7f8f9] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">Pengeluaran</h1>
          <p className="text-sm text-zinc-500 mt-1">Catat dan kelola pengeluaran operasional toko.</p>
        </div>

        <div className="bg-white border border-zinc-200/60 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-zinc-100 p-2 rounded-lg">
              <IconReceipt className="w-5 h-5 text-zinc-700" stroke={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">Daftar Pengeluaran</h2>
          </div>
          <div className="h-64 flex items-center justify-center text-zinc-400 text-sm border border-dashed border-zinc-200 rounded-lg">
            Fitur pengeluaran sedang dalam pengembangan.
          </div>
        </div>
      </div>
    </div>
  );
}
