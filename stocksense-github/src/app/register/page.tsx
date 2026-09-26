"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, KeyRound, Shield, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("WAREHOUSE_STAFF");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Update global auth context & cookies
      login(data.token, data.user);

      // Redirect to dashboard
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Failed to register account");
    } finally {
      setLoading(false);
    }
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
        <p className="text-xs text-slate-400 font-medium">Create a New Warehouse Operator Account</p>
      </div>

      {/* Main Register Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-800">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">Register New Profile</h2>
            <p className="text-xs text-slate-400 mt-0.5">Enter details to join the StockSense warehouse network</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Elena Rostova"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-750 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Email Address */}
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
                  placeholder="elena@stocksense.io"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-750 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password with Show/Hide */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Secure Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
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

            {/* Organizational Role */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Operational Role
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-slate-950 border border-slate-750 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none cursor-pointer"
                >
                  <option value="WAREHOUSE_STAFF">Warehouse Staff (Pick, Pack, Shelve, Count)</option>
                  <option value="INVENTORY_MANAGER">Inventory Manager (Approvals & Stock Audits)</option>
                  <option value="ADMIN">System Administrator (Full Control & Config)</option>
                </select>
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
              Create Account & Enter
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>

        {/* Footer Link to Login */}
        <p className="text-center text-xs text-slate-500 mt-5">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline-offset-4 hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
