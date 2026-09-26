"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Calendar,
  Building2,
  CheckCircle2,
  LogOut,
  Eye,
  EyeOff,
  Activity,
  Layers,
  ArrowRight,
  Phone,
  Clock,
  Sparkles,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

interface FullUserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    receipts: number;
    deliveries: number;
    transfers: number;
    adjustments: number;
    ledgerLogs: number;
  };
}

export default function ProfilePage() {
  const { user: authUser, logout, token } = useAuth();
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Profile State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change Password State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pwdUpdating, setPwdUpdating] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setProfile(data.user);
        setName(data.user.name);
        setPhone(data.user.phone || "");
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileUpdating(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "UPDATE_PROFILE",
          name,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update profile");

      setProfileSuccess("Profile details updated successfully!");
      fetchProfile();
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile");
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdUpdating(true);
    setPwdSuccess(null);
    setPwdError(null);

    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      setPwdUpdating(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "CHANGE_PASSWORD",
          oldPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password change failed");

      setPwdSuccess("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPwdError(err.message || "Password change failed");
    } finally {
      setPwdUpdating(false);
    }
  };

  const getRoleBadgeVariant = (role?: string): "purple" | "info" | "default" => {
    if (role === "ADMIN") return "purple";
    if (role === "INVENTORY_MANAGER") return "info";
    return "default";
  };

  const permissions = [
    { name: "View Inventory Dashboard & Stock Balances", allowed: true },
    { name: "Execute Inbound Receipts & Procurement Intake", allowed: true },
    { name: "Create & Fulfill Inter-Warehouse Transfers", allowed: true },
    { name: "Dispatch Outbound Customer Deliveries", allowed: true },
    {
      name: "Authorize Physical Stock Count Adjustments",
      allowed: profile?.role === "ADMIN" || profile?.role === "INVENTORY_MANAGER",
    },
    {
      name: "Configure Warehouses, Racks & Storage Layout",
      allowed: profile?.role === "ADMIN",
    },
    {
      name: "System Settings & Enterprise Security Configuration",
      allowed: profile?.role === "ADMIN",
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">User Account & Profile</h2>
            <Badge variant={getRoleBadgeVariant(profile?.role)} size="sm">
              {profile?.role?.replace("_", " ") || "STAFF"}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal identity, enterprise role privileges, and authentication credentials.
          </p>
        </div>

        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log Out
        </button>
      </div>

      {/* Main Identity Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-blue-500/25">
            {profile?.name ? profile.name[0].toUpperCase() : "U"}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">{profile?.name || "StockSense Operator"}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{profile?.email || "user@stocksense.io"}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                {profile?.role?.replace("_", " ")}
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Activity Counter */}
        <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 text-center">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-lg font-bold text-white block">{profile?._count?.receipts ?? 0}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Receipts</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-lg font-bold text-white block">{profile?._count?.deliveries ?? 0}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Deliveries</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-lg font-bold text-white block">{profile?._count?.ledgerLogs ?? 0}</span>
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Ledger Logs</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Profile Form & Password Change */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Details Edit Card */}
        <Card title="Personal Information" subtitle="Update your profile display name and contact phone number">
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {profileError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Full Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Email Address (Permanent)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  disabled
                  value={profile?.email || ""}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                />
              </div>
              <span className="text-[10px] text-slate-400">Email is linked to system audit records and cannot be modified.</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Contact Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="+1-555-0100"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="sm" className="w-full" isLoading={profileUpdating}>
              Save Profile Changes
            </Button>
          </form>
        </Card>

        {/* Change Password Card */}
        <Card title="Security & Password" subtitle="Update your account credentials using your current password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            {pwdSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{pwdSuccess}</span>
              </div>
            )}

            {pwdError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {pwdError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Current Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showOldPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOldPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="secondary" size="sm" className="w-full" isLoading={pwdUpdating}>
              Update Password
            </Button>
          </form>
        </Card>
      </div>

      {/* Role & Permissions Matrix Card */}
      <Card title="Role Permissions Matrix" subtitle={`Configured permissions for role: ${profile?.role || "STAFF"}`}>
        <div className="divide-y divide-slate-100 text-xs">
          {permissions.map((perm, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between">
              <span className="text-slate-700 font-medium">{perm.name}</span>
              <span
                className={`font-semibold inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] ${
                  perm.allowed
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {perm.allowed ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Authorized
                  </>
                ) : (
                  "Restricted"
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
