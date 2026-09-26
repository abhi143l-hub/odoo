"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Bell, Building2, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Navbar: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Global Search Bar */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search SKU, Product, Receipt, Delivery # (Ctrl+K)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Active Warehouse Selector */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span>All Warehouses</span>
          <span className="text-[10px] text-slate-400 px-1 py-0.2 rounded bg-slate-200 font-mono">3 Active</span>
        </div>

        {/* Database Status Indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PostgreSQL Active</span>
        </div>

        {/* Notifications Icon with Badge */}
        <button
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          title="Operational Alerts"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
        </button>

        {/* Profile Link with Avatar */}
        <Link
          href="/profile"
          className="flex items-center gap-2 pl-2 border-l border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors"
          title="View Profile & Security"
        >
          <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-300 text-blue-700 flex items-center justify-center font-bold text-xs">
            {user?.name ? user.name[0].toUpperCase() : "U"}
          </div>
          <span className="hidden sm:inline font-medium">{user?.name?.split(" ")[0] || "Account"}</span>
        </Link>
      </div>
    </header>
  );
};
export default Navbar;
