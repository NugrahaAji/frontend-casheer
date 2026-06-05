"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { IconSelector, IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Optional color class, e.g. "text-green-600" */
  colorClass?: string;
}

interface ComboboxProps {
  /** Current value */
  value: string;
  /** Called with the new value whenever selection changes or user types */
  onChange: (value: string) => void;
  /** List of preset options shown in the dropdown */
  options: ComboboxOption[] | string[];
  placeholder?: string;
  className?: string;
  /** Whether the user can freely type a value that isn't in the list */
  allowCustomValue?: boolean;
  disabled?: boolean;
}

function normalizeOptions(raw: ComboboxOption[] | string[]): ComboboxOption[] {
  return raw.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

/**
 * Combobox — searchable + typeable dropdown.
 *
 * Usage:
 * ```tsx
 * <Combobox
 *   value={kategori}
 *   onChange={setKategori}
 *   options={["Makanan", "Minuman", "Snack"]}
 *   placeholder="Pilih atau ketik kategori"
 * />
 * ```
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Pilih atau ketik...",
  className,
  allowCustomValue = true,
  disabled = false,
}: ComboboxProps) {
  const normalized = normalizeOptions(options);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // Sync external value → input
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = normalized.filter((o) =>
    o.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (allowCustomValue) onChange(e.target.value);
    setOpen(true);
  };

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.value);
    setInputValue(option.label);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg pr-8"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none"
        >
          <IconSelector className="w-4 h-4" stroke={2} />
        </button>
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option)}
              className={cn(
                "w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors",
                option.colorClass
              )}
            >
              <span className="flex-1">{option.label}</span>
              {value === option.value && (
                <IconCheck className="w-3.5 h-3.5 text-zinc-500 shrink-0" stroke={2} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
