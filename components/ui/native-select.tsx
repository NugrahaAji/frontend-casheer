"use client";

import { useRef } from "react";
import { IconSelector } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string | number;
  label: string;
}

interface NativeSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[] | string[] | number[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

function normalizeOptions(
  raw: SelectOption[] | string[] | number[]
): SelectOption[] {
  return raw.map((o) =>
    typeof o === "object" ? o : { value: o, label: String(o) }
  );
}

/**
 * NativeSelect — styled native `<select>` with a custom caret icon.
 *
 * Usage:
 * ```tsx
 * <NativeSelect
 *   value={kepemilikan}
 *   onChange={(v) => setKepemilikan(v as "sendiri" | "titipan")}
 *   options={[
 *     { value: "sendiri", label: "Barang Sendiri" },
 *     { value: "titipan", label: "Barang Titipan" },
 *   ]}
 * />
 *
 * // or with pageSize numbers:
 * <NativeSelect
 *   value={pageSize}
 *   onChange={(v) => setPageSize(Number(v))}
 *   options={[25, 50, 100]}
 * />
 * ```
 */
export function NativeSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled = false,
  id,
}: NativeSelectProps) {
  const normalized = normalizeOptions(options);

  return (
    <div className="relative flex items-center">
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-10 px-3 pr-9 bg-[#f4f4f5] border-transparent rounded-xl text-sm font-medium text-zinc-700",
          "outline-none focus:ring-1 focus:ring-zinc-300 appearance-none cursor-pointer transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <IconSelector className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/**
 * PageSizeSelect — convenience wrapper for the "rows per page" pattern.
 *
 * Usage:
 * ```tsx
 * <PageSizeSelect value={pageSize} onChange={setPageSize} />
 * ```
 */
export function PageSizeSelect({
  value,
  onChange,
  sizes = [25, 50, 100],
}: {
  value: number;
  onChange: (v: number) => void;
  sizes?: number[];
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500">
      <span>Tampilkan</span>
      <NativeSelect
        value={value}
        onChange={(v) => onChange(Number(v))}
        options={sizes}
        className="h-9 w-20"
      />
      <span>data per halaman</span>
    </div>
  );
}
