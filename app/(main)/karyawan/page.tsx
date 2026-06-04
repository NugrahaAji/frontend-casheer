"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IconUsers,
  IconPlus,
  IconUserCheck,
  IconUserCog,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconCircleCheck,
  IconInfoCircle,
  IconKey,
} from "@tabler/icons-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreatedUser {
  username: string;
  role: "kasir" | "owner";
  createdAt: string;
}

type Role = "kasir" | "owner";

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  kasir: {
    label: "Kasir",
    description: "Akses transaksi, kasbon, dan keuangan harian",
    icon: IconUserCheck,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  owner: {
    label: "Owner",
    description: "Akses penuh termasuk laporan, stok, dan manajemen",
    icon: IconUserCog,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
} satisfies Record<Role, unknown>;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── Validation ────────────────────────────────────────────────────────────────

function validateForm(username: string, password: string, role: string) {
  if (!username) return "Username wajib diisi.";
  if (username.length < 3) return "Username minimal 3 karakter.";
  if (username.length > 30) return "Username maksimal 30 karakter.";
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return "Username hanya boleh huruf, angka, dan underscore (_).";
  if (!password) return "Password wajib diisi.";
  if (password.length < 6) return "Password minimal 6 karakter.";
  if (!role) return "Role wajib dipilih.";
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KaryawanPage() {
  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Session-created users (in-memory; no GET endpoint available)
  const [sessionUsers, setSessionUsers] = useState<CreatedUser[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setRole("");
    setShowPassword(false);
    setFormError(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    const err = validateForm(username, password, role);
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, role }),
      });

      const json = await res.json();

      if (!res.ok) {
        // Extract message from backend error response
        const msg =
          json?.message ||
          json?.errors?.[0]?.message ||
          "Gagal membuat akun. Coba lagi.";
        setFormError(msg);
        return;
      }

      // Success
      const created: CreatedUser = {
        username,
        role: role as Role,
        createdAt: new Date().toISOString(),
      };
      setSessionUsers((prev) => [created, ...prev]);
      setSuccessMsg(`Akun "${username}" berhasil dibuat.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setIsDialogOpen(false);
      resetForm();
    } catch {
      setFormError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
              User Management
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Kelola akun pengguna sistem Casheer (kasir &amp; owner).
            </p>
          </div>
          <Button onClick={handleOpenDialog} size="default">
            <IconPlus className="w-4 h-4" />
            Tambah Akun
          </Button>
        </div>

        {/* ── Success Toast ── */}
        {successMsg && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-medium">
            <IconCircleCheck className="w-5 h-5 text-green-600 shrink-0" stroke={2} />
            {successMsg}
          </div>
        )}

        {/* ── Info Notice ── */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <IconInfoCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" stroke={2} />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-0.5">Informasi Endpoint</p>
            <p className="text-blue-700 leading-relaxed">
              Backend menyediakan endpoint <code className="bg-blue-100 px-1 py-0.5 rounded text-xs font-mono">POST /auth/register</code> untuk membuat akun baru.
              Daftar pengguna yang aktif dapat dilihat langsung melalui database.
              Akun yang dibuat pada sesi ini ditampilkan di bawah hingga halaman di-refresh.
            </p>
          </div>
        </div>

        {/* ── Role Info Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["kasir", "owner"] as Role[]).map((r) => {
            const cfg = ROLE_CONFIG[r];
            const Icon = cfg.icon;
            const count = sessionUsers.filter((u) => u.role === r).length;
            return (
              <div
                key={r}
                className="bg-white border border-zinc-100 rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-100">
                      <Icon className="w-5 h-5 text-zinc-600" stroke={1.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {cfg.label}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5 max-w-[200px]">
                        {cfg.description}
                      </p>
                    </div>
                  </div>
                  {count > 0 && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                      +{count} baru
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Session Users Table ── */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
            <IconUsers className="w-4 h-4 text-zinc-500" stroke={1.5} />
            <span className="text-sm font-semibold text-zinc-800">
              Akun Dibuat Sesi Ini
            </span>
            {sessionUsers.length > 0 && (
              <span className="ml-auto text-xs text-zinc-400 font-medium">
                {sessionUsers.length} akun
              </span>
            )}
          </div>

          {sessionUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3 text-zinc-400">
              <div className="p-4 bg-zinc-50 rounded-full border border-zinc-100">
                <IconUsers className="w-8 h-8" stroke={1} />
              </div>
              <p className="text-sm font-medium">Belum ada akun yang dibuat</p>
              <p className="text-xs text-zinc-400">
                Klik &quot;Tambah Akun&quot; untuk membuat akun baru.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {sessionUsers.map((u, i) => {
                const cfg = ROLE_CONFIG[u.role];
                const Icon = cfg.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-100 text-zinc-600 font-semibold text-sm shrink-0">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">
                        {u.username}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Dibuat {formatDate(u.createdAt)} · {formatTime(u.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-zinc-400" stroke={1.5} />
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Account Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setIsDialogOpen(o); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconKey className="w-4 h-4 text-zinc-500" stroke={1.5} />
              Tambah Akun Baru
            </DialogTitle>
            <DialogDescription>
              Buat akun pengguna baru dengan username, password, dan role yang sesuai.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="um-username">Username</Label>
              <Input
                id="um-username"
                placeholder="contoh: kasir_toko1"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFormError(null);
                }}
                autoComplete="off"
              />
              <p className="text-xs text-zinc-400">
                3–30 karakter, hanya huruf, angka, dan underscore (_).
              </p>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="um-password">Password</Label>
              <div className="relative">
                <Input
                  id="um-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFormError(null);
                  }}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword
                    ? <IconEyeOff className="w-4 h-4" stroke={1.5} />
                    : <IconEye className="w-4 h-4" stroke={1.5} />
                  }
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label htmlFor="um-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => {
                  setRole(v as Role);
                  setFormError(null);
                }}
              >
                <SelectTrigger id="um-role">
                  <SelectValue placeholder="Pilih role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kasir">
                    <div className="flex items-center gap-2">
                      <IconUserCheck className="w-4 h-4 text-blue-500" stroke={1.5} />
                      Kasir
                    </div>
                  </SelectItem>
                  <SelectItem value="owner">
                    <div className="flex items-center gap-2">
                      <IconUserCog className="w-4 h-4 text-violet-500" stroke={1.5} />
                      Owner
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {role && (
                <p className="text-xs text-zinc-400">
                  {ROLE_CONFIG[role as Role].description}
                </p>
              )}
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <IconAlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" stroke={2} />
                <p className="text-[13px] text-destructive font-medium">{formError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsDialogOpen(false); resetForm(); }}
              disabled={isSaving}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Menyimpan...
                </div>
              ) : (
                <>
                  <IconPlus className="w-4 h-4" />
                  Buat Akun
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
