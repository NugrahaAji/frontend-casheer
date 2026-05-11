"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  IconAlertCircle,
  IconCheck,
  IconUserPlus,
  IconTrash,
  IconSearch,
  IconUsers,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react";

interface UserAccount {
  _id: string;
  username: string;
  role: string;
  createdAt?: string;
}

export default function KaryawanPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("kasir");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [users, setUsers] = useState<UserAccount[]>([
    { _id: "1", username: "admin_owner", role: "owner", createdAt: "2026-04-01" },
    { _id: "2", username: "kasir_utama", role: "kasir", createdAt: "2026-04-15" },
    { _id: "3", username: "kasir_sore", role: "kasir", createdAt: "2026-04-20" },
  ]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const fetchUsers = async () => {
    // Backend endpoint does not exist yet
    // To implement real fetch:
    // const response = await fetch("/api/auth/users");
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setRole("kasir");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMsg("Akun berhasil dibuat!");
        resetForm();
        fetchUsers();
        setTimeout(() => setIsDialogOpen(false), 1200);
      } else {
        setErrorMsg(data.message || "Gagal membuat akun.");
      }
    } catch (error) {
      setErrorMsg("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalKasir = users.filter((u) => u.role === "kasir").length;
  const totalOwner = users.filter((u) => u.role === "owner").length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">User Management</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Kelola akun kasir dan owner untuk sistem kasir Anda.
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(o) => {
              setIsDialogOpen(o);
              if (!o) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="h-10 px-5 bg-[#09090b] hover:bg-[#27272a] text-white rounded-lg font-medium">
                <IconUserPlus className="w-4 h-4 mr-2" stroke={2} /> Tambah Akun
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[460px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Buat Akun Baru</DialogTitle>
              </DialogHeader>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" stroke={1.5} />
                  <p className="text-[13px] text-red-600 font-medium">{errorMsg}</p>
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <IconCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" stroke={1.5} />
                  <p className="text-[13px] text-green-700 font-medium">{successMsg}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-zinc-800">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    required
                    className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg"
                  />
                  <p className="text-xs text-zinc-400">Min 3 karakter, hanya huruf, angka, dan underscore.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-zinc-800">
                    Kata Sandi <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    required
                    className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg"
                  />
                  <p className="text-xs text-zinc-400">Minimal 6 karakter.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-zinc-800">
                    Role <span className="text-red-500">*</span>
                  </Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-10 bg-[#f4f4f5] border-transparent focus:ring-1 focus:ring-zinc-300 text-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kasir">Kasir</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="h-10 px-5 rounded-lg"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="h-10 px-6 bg-[#09090b] hover:bg-[#27272a] text-white rounded-lg font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </div>
                    ) : (
                      "Buat Akun"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-500">Total Akun</span>
              <div className="p-2 rounded-lg border bg-zinc-50 text-zinc-600 border-zinc-100">
                <IconUsers className="w-5 h-5" stroke={1.5} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{users.length}</p>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-500">Akun Kasir</span>
              <div className="p-2 rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-100">
                <IconUser className="w-5 h-5" stroke={1.5} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{totalKasir}</p>
          </div>
          <div className="bg-white border border-zinc-100 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-zinc-500">Akun Owner</span>
              <div className="p-2 rounded-lg border bg-indigo-50 text-indigo-600 border-indigo-100">
                <IconShieldCheck className="w-5 h-5" stroke={1.5} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-zinc-900">{totalOwner}</p>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white border border-zinc-100 rounded-xl shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-zinc-100">
            <h2 className="text-lg font-semibold text-zinc-900">Daftar Akun</h2>
            <div className="relative w-full sm:w-64">
              <IconSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" stroke={1.5} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari username..."
                className="pl-9 h-9 bg-zinc-50 border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm rounded-lg"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-50/50">
                <TableRow>
                  <TableHead className="w-[50px] text-center font-semibold">No</TableHead>
                  <TableHead className="font-semibold">Username</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-400">
                        <IconUsers className="w-10 h-10" stroke={1} />
                        <span className="text-sm">Tidak ada akun ditemukan.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user, index) => (
                    <TableRow key={user._id}>
                      <TableCell className="text-center text-zinc-500 font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium text-zinc-900">{user.username}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                            user.role === "owner"
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          title="Hapus akun"
                        >
                          <IconTrash className="h-4 w-4" stroke={1.5} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
