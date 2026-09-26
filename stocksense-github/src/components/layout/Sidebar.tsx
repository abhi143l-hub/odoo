"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  History,
  Building2,
  Settings,
  Sparkles,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, switchDemoUser } = useAuth();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    {
      name: "Products",
      href: "/products",
      icon: Package,
    },
    {
      name: "Operations",
      header: true,
    },
    { name: "Receipts (Inbound)", href: "/operations/receipts", icon: ArrowDownLeft, badge: "Incoming" },
    { name: "Deliveries (Outbound)", href: "/operations/deliveries", icon: ArrowUpRight, badge: "Outgoing" },
    { name: "Internal Transfers", href: "/operations/transfers", icon: ArrowLeftRight },
    { name: "Adjustments", href: "/operations/adjustments", icon: ClipboardCheck },
    {
      name: "Intelligence & Audit",
      header: true,
    },
    { name: "Stock Ledger", href: "/ledger", icon: History },
    { name: "Inventory Health", href: "/health", icon: ShieldCheck },
    { name: "StockSense Copilot", href: "/copilot", icon: Sparkles, highlight: true },
    {
      name: "Administration",
      header: true,
    },
    { name: "My Profile", href: "/profile", icon: UserIcon },
    { name: "Warehouses & Racks", href: "/settings/warehouses", icon: Building2, badge: "Admin" },
    { name: "Settings", href: "/settings", icon: Settings, badge: "Admin" },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
          S
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            StockSense
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              v1.0
            </span>
          </h1>
          <p className="text-[11px] text-slate-400">Inventory Operating System</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item, idx) => {
          if (item.header) {
            return (
              <div
                key={`header-${idx}`}
                className="px-3 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                {item.name}
              </div>
            );
          }

          const isActive = pathname === item.href;
          const Icon = item.icon!;

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "bg-blue-600 text-white font-semibold"
                  : item.highlight
                  ? "text-blue-400 hover:bg-slate-800/80 hover:text-blue-300"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : item.highlight ? "text-blue-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Demo Switcher Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-2">
          <Link href="/profile" className="flex items-center gap-2 group flex-1 overflow-hidden pr-2">
            <div className="w-8 h-8 rounded-full bg-blue-900/60 border border-blue-500/40 flex items-center justify-center text-xs font-bold text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              {user?.name ? user.name[0] : "U"}
            </div>
            <div className="text-left overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{user?.name || "Inventory User"}</p>
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-semibold">
                {user?.role === "ADMIN" ? "SYSTEM ADMIN" : user?.role === "WAREHOUSE_STAFF" ? "WAREHOUSE EMPLOYEE" : "INVENTORY MANAGER"}
              </p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Role Switcher for Hackathon Judges */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span>Switch Role:</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <button
              onClick={() => switchDemoUser("ADMIN")}
              className={`px-1.5 py-1 text-[10px] rounded font-medium border text-center transition-colors ${
                user?.role === "ADMIN"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchDemoUser("INVENTORY_MANAGER")}
              className={`px-1.5 py-1 text-[10px] rounded font-medium border text-center transition-colors ${
                user?.role === "INVENTORY_MANAGER"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
              }`}
            >
              Manager
            </button>
            <button
              onClick={() => switchDemoUser("WAREHOUSE_STAFF")}
              className={`px-1.5 py-1 text-[10px] rounded font-medium border text-center transition-colors ${
                user?.role === "WAREHOUSE_STAFF"
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750"
              }`}
            >
              Employee
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
