"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { IconShoppingCart, IconAlertCircle, IconEye, IconEyeOff } from "@tabler/icons-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Token is stored as httpOnly cookie by the backend automatically
        // Save user info for client-side usage
        if (data.role) {
          localStorage.setItem("role", data.role);
        }
        if (data.username) {
          localStorage.setItem("username", data.username);
        }
        if (data.role === 'owner') {
          router.push("/owner/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        setErrorMsg(data.message || "Gagal melakukan login. Periksa kembali kredensial Anda.");
      }
    } catch (error) {
      setErrorMsg("Terjadi kesalahan jaringan. Tidak dapat terhubung ke server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#f7f8f9] p-4">
      <div className="w-full max-w-[400px] flex flex-col items-center">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#09090b] text-white p-3 rounded-2xl mb-4">
            <IconShoppingCart className="w-8 h-8" stroke={1.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#09090b]">Casheer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Masuk ke akun Anda
          </p>
        </div>

        {/* Login Form Card */}
        <div className="w-full bg-white border border-zinc-200/60 rounded-xl p-6 sm:p-8 shadow-sm">
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" stroke={1.5} />
              <p className="text-[13px] text-red-600 font-medium">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[13px] font-semibold text-zinc-800">
                  Email atau Username
                </Label>
                <Input 
                  id="username" 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan email atau username" 
                  required 
                  className="h-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm placeholder:text-zinc-400 rounded-lg transition-colors"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[13px] font-semibold text-zinc-800">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi" 
                    required 
                    className="h-10 pr-10 bg-[#f4f4f5] border-transparent focus-visible:ring-1 focus-visible:ring-zinc-300 text-sm placeholder:text-zinc-400 rounded-lg transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? (
                      <IconEyeOff className="w-5 h-5" stroke={1.5} />
                    ) : (
                      <IconEye className="w-5 h-5" stroke={1.5} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="remember" className="border-zinc-300 data-[state=checked]:bg-[#09090b] rounded-[4px]" />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none text-zinc-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Ingat saya
              </label>
            </div>

            <div className="space-y-4 pt-2">
              <Button 
                type="submit" 
                className="w-full h-10 bg-[#09090b] hover:bg-[#27272a] text-white rounded-lg font-medium transition-colors" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : (
                  "Masuk"
                )}
              </Button>

              <div className="text-center">
                <a href="#" className="text-[13px] font-medium text-zinc-800 hover:text-zinc-600 transition-colors">
                  Lupa kata sandi?
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
