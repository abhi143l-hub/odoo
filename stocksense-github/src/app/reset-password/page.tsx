"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, ShieldCheck, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [email, setEmail] = useState("admin@stocksense.io");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [demoOtpNotice, setDemoOtpNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REQUEST_OTP", email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate OTP");

      setMessage(data.message);
      if (data.demoOtp) {
        setDemoOtpNotice(data.demoOtp);
        setOtp(data.demoOtp); // Auto-fill for convenience during demo evaluation
      }
      setStep("VERIFY");
    } catch (err: any) {
      setError(err.message || "Something went wrong while generating OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFY_AND_RESET",
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setMessage("Password successfully reset! Redirecting to login...");
      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
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
        <p className="text-xs text-slate-400 font-medium">Secure OTP-Based Password Recovery</p>
      </div>

      {/* Main Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-800">
          {step === "REQUEST" ? (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white tracking-tight">Forgot Your Password?</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter your registered email to receive a 6-digit verification code
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleRequestOtp}>
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

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium leading-relaxed animate-in fade-in duration-200">
                    ⚠️ {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30"
                  isLoading={loading}
                >
                  Generate 6-Digit OTP
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white tracking-tight">Verify OTP & Set Password</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter the 6-digit code sent to <strong className="text-slate-200">{email}</strong>
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleVerifyAndReset}>
                {demoOtpNotice && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between">
                    <span className="font-semibold">Demo Evaluation OTP:</span>
                    <span className="font-mono font-bold tracking-widest text-white text-sm bg-blue-600/50 px-2.5 py-0.5 rounded-lg border border-blue-400/40">
                      {demoOtpNotice}
                    </span>
                  </div>
                )}

                {/* OTP Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    6-Digit OTP Code
                  </label>
                  <div className="relative">
                    <ShieldCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      placeholder="123456"
                      className="w-full pl-10 pr-3 py-2.5 text-base font-mono tracking-widest text-center bg-slate-950 border border-slate-750 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    New Secure Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium leading-relaxed animate-in fade-in duration-200">
                    ⚠️ {error}
                  </div>
                )}

                {message && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium leading-relaxed flex items-center gap-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>{message}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30"
                  isLoading={loading}
                >
                  Confirm Password Reset
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <button
                  type="button"
                  onClick={() => setStep("REQUEST")}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-200 mt-2 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change email or request new OTP
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Link to Login */}
        <p className="text-center text-xs text-slate-500 mt-5">
          Remembered your password?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold underline-offset-4 hover:underline">
            Return to login
          </Link>
        </p>
      </div>
    </div>
  );
}
