"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/reset-password";

  // Route protection logic on client
  useEffect(() => {
    if (!isLoading) {
      if (!user && !isAuthRoute) {
        router.replace("/login");
      } else if (user && isAuthRoute) {
        router.replace("/");
      }
    }
  }, [user, isLoading, isAuthRoute, router]);

  // If on auth route (login/register/reset-password), show full-screen auth layout without sidebar/navbar
  if (isAuthRoute) {
    return <main className="min-h-screen w-full bg-slate-950">{children}</main>;
  }

  // If verifying session, show clean loader
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-blue-500/30 animate-pulse">
          S
        </div>
        <p className="text-xs text-slate-400 font-medium">Verifying StockSense Session...</p>
      </div>
    );
  }

  // If not logged in and not auth route, return null while redirecting
  if (!user) {
    return null;
  }

  // Protected App Layout
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50">
          {children}
        </main>
      </div>
    </div>
  );
}
