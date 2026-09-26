"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, ArrowRight, Eye, EyeOff, ShieldCheck, Warehouse, Sparkles } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("admin@stocksense.io");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password credentials");
      }

      // Update global auth context & cookies (Role is automatically loaded from DB)
      login(data.token, data.user);

      // Redirect to return url or dashboard
      const returnUrl = searchParams.get("from") || "/";
      router.replace(returnUrl);
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoUser = (userEmail: string) => {
    setEmail(userEmail);
    setPassword("password123");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center gap-2.5 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-blue-500/30">
            S
          </div>
          <span className="text-3xl font-extrabold text-white tracking-tight">StockSense</span>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Smart Inventory Operating System & Explainable Stock Ledger
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-800">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Sign In to Your Account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your credentials. Role-based permissions will be automatically applied upon authentication.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@stocksense.io"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-750 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-950 border border-slate-750 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium leading-relaxed animate-in fade-in duration-200">
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30"
              isLoading={loading}
            >
              Sign In to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Demo Credentials Switcher for Judges */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Demo Accounts (1-Click Fill)
              </span>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 font-mono">
                password123
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectDemoUser("admin@stocksense.io")}
                className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all ${
                  email === "admin@stocksense.io"
                    ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemoUser("manager@stocksense.io")}
                className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all ${
                  email === "manager@stocksense.io"
                    ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                }`}
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemoUser("staff@stocksense.io")}
                className={`py-2 px-2 text-center rounded-xl border text-xs font-semibold transition-all ${
                  email === "staff@stocksense.io"
                    ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20"
                    : "bg-slate-950/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                }`}
              >
                Employee
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link to Register */}
        <p className="text-center text-xs text-slate-500 mt-5">
          Don&apos;t have an account yet?{" "}
          <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold underline-offset-4 hover:underline">
            Register new account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/30 animate-pulse">
            S
          </div>
          <p className="text-xs text-slate-400 font-medium">Loading StockSense Portal...</p>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
