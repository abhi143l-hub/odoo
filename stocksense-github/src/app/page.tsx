"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Warehouse as WarehouseIcon,
  RefreshCw,
  Filter,
  X,
  Layers,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface DashboardData {
  kpis: {
    totalProducts: number;
    totalStockUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
    pendingReceipts: number;
    pendingDeliveries: number;
    scheduledTransfers: number;
    totalAdjustments: number;
  };
  attentionItems: Array<{
    id: string;
    type: string;
    severity: "danger" | "warning" | "info";
    title: string;
    detail: string;
    actionText: string;
    href: string;
  }>;
  warehouseBreakdown: Array<{
    id: string;
    code: string;
    name: string;
    units: number;
    locationsCount: number;
    capacityPct: number;
  }>;
  ledgerEntries: Array<{
    id: string;
    timestamp: string;
    productName: string;
    sku: string;
    unit: string;
    operationType: string;
    documentRef: string;
    quantityChange: number;
    previousQuantity: number;
    newQuantity: number;
    sourceLocation?: string;
    destLocation?: string;
    reason?: string;
    performedBy: string;
  }>;
  filterOptions: {
    categories: Array<{ id: string; name: string }>;
    warehouses: Array<{ id: string; code: string; name: string }>;
    documentTypes: string[];
    statuses: string[];
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  // PDF Dynamic Filter States
  const [selectedDocType, setSelectedDocType] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      if (selectedDocType !== "ALL") params.append("docType", selectedDocType);
      if (selectedStatus !== "ALL") params.append("status", selectedStatus);
      if (selectedWarehouse !== "ALL") params.append("warehouseId", selectedWarehouse);
      if (selectedCategory !== "ALL") params.append("categoryId", selectedCategory);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDocType, selectedStatus, selectedWarehouse, selectedCategory]);

  const kpis = data
    ? [
        {
          title: "Total Products",
          value: data.kpis.totalProducts.toString(),
          change: "Active in catalog",
          icon: Package,
          color: "text-blue-600 bg-blue-50 border-blue-100",
        },
        {
          title: "Total Units in Stock",
          value: data.kpis.totalStockUnits.toLocaleString(),
          unit: "Units",
          change: "Real-time balance",
          icon: WarehouseIcon,
          color: "text-indigo-600 bg-indigo-50 border-indigo-100",
        },
        {
          title: "Low / Out of Stock",
          value: (data.kpis.lowStockCount + data.kpis.outOfStockCount).toString(),
          change: `${data.kpis.lowStockCount} Low, ${data.kpis.outOfStockCount} Out`,
          icon: TrendingDown,
          color: "text-rose-600 bg-rose-50 border-rose-100",
          highlight: data.kpis.lowStockCount + data.kpis.outOfStockCount > 0,
        },
        {
          title: "Pending Receipts",
          value: data.kpis.pendingReceipts.toString(),
          change: "Incoming from vendors",
          icon: ArrowDownLeft,
          color: "text-emerald-600 bg-emerald-50 border-emerald-100",
        },
        {
          title: "Pending Deliveries",
          value: data.kpis.pendingDeliveries.toString(),
          change: "Outgoing shipments",
          icon: ArrowUpRight,
          color: "text-amber-600 bg-amber-50 border-amber-100",
        },
        {
          title: "Internal Transfers",
          value: data.kpis.scheduledTransfers.toString(),
          change: "Warehouse to warehouse",
          icon: ArrowLeftRight,
          color: "text-purple-600 bg-purple-50 border-purple-100",
        },
      ]
    : [];

  const visibleAttentionItems = data?.attentionItems.filter(
    (item) => !dismissedAlerts.includes(item.id)
  ) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Operations Dashboard</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Live PostgreSQL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock ledger, multi-warehouse tracking & automated inventory triage engine.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            isLoading={refreshing}
            title="Refresh database state"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/operations/receipts">
            <Button variant="outline" size="sm">
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Receipt
            </Button>
          </Link>
          <Link href="/operations/deliveries">
            <Button variant="outline" size="sm">
              <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-blue-600" />
              Delivery
            </Button>
          </Link>
          <Link href="/copilot">
            <Button variant="primary" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" />
              Ask Copilot
            </Button>
          </Link>
        </div>
      </div>

      {/* Dynamic Filters Bar (PDF Requirement) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Dynamic Operational Filters</span>
          </div>
          {(selectedDocType !== "ALL" ||
            selectedStatus !== "ALL" ||
            selectedWarehouse !== "ALL" ||
            selectedCategory !== "ALL") && (
            <button
              onClick={() => {
                setSelectedDocType("ALL");
                setSelectedStatus("ALL");
                setSelectedWarehouse("ALL");
                setSelectedCategory("ALL");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Document Type Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Document Type
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Documents</option>
              <option value="RECEIPT">Receipts (Incoming)</option>
              <option value="DELIVERY">Delivery Orders (Outgoing)</option>
              <option value="TRANSFER">Internal Transfers</option>
              <option value="ADJUSTMENT">Stock Adjustments</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Operation Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="WAITING">Waiting</option>
              <option value="READY">Ready</option>
              <option value="DONE">Done</option>
              <option value="CANCELLED">Canceled</option>
            </select>
          </div>

          {/* Warehouse Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Warehouse / Facility
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Warehouses & Depots</option>
              {data?.filterOptions?.warehouses?.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.code})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Product Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              {data?.filterOptions?.categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse p-4" />
            ))
          : kpis.map((kpi, index) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${
                    kpi.highlight ? "border-rose-300 ring-1 ring-rose-200 bg-rose-50/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      {kpi.title}
                    </span>
                    <div className={`p-1.5 rounded-lg border ${kpi.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-slate-900">{kpi.value}</span>
                    {kpi.unit && <span className="text-xs font-medium text-slate-400">{kpi.unit}</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">{kpi.change}</p>
                </div>
              );
            })}
      </div>

      {/* Needs Your Attention Section (Signature StockSense Feature) */}
      <Card
        title="Needs Your Attention"
        subtitle="Automated inventory triage engine alerting on out-of-stock items, replenishment limits, and pending authorizations"
        className="border-slate-200 shadow-sm"
      >
        {visibleAttentionItems.length === 0 ? (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>All inventory thresholds healthy! No immediate stock-out risks or critical pending orders.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleAttentionItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  item.severity === "danger"
                    ? "bg-rose-50/60 border-rose-200 text-rose-950"
                    : item.severity === "warning"
                    ? "bg-amber-50/60 border-amber-200 text-amber-950"
                    : "bg-blue-50/60 border-blue-200 text-blue-950"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <AlertTriangle
                      className={`w-4 h-4 ${
                        item.severity === "danger"
                          ? "text-rose-600"
                          : item.severity === "warning"
                          ? "text-amber-600"
                          : "text-blue-600"
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">{item.detail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                  <button
                    onClick={() => setDismissedAlerts((prev) => [...prev, item.id])}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded text-xs"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <Link href={item.href}>
                    <Button variant="outline" size="sm" className="bg-white text-xs border-slate-300 hover:bg-slate-50">
                      {item.actionText}
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Warehouse Distribution & Stock Ledger Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Warehouse Stock Breakdown */}
        <Card
          title="Warehouse Utilization"
          subtitle="Inventory balances & storage locations across physical facilities"
          className="lg:col-span-1"
        >
          <div className="space-y-4">
            {data?.warehouseBreakdown.map((wh) => (
              <div key={wh.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-slate-800">{wh.name}</span>
                  <span className="text-xs font-mono font-bold text-slate-900">{wh.units.toLocaleString()} Units</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, wh.capacityPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>{wh.locationsCount} registered racks/locations</span>
                  <span>{wh.code}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live Immutable Stock Ledger Feed */}
        <Card
          title="Stock Ledger Audit Stream"
          subtitle="Chronological trail of every stock modification logged by the backend engine"
          action={
            <Link href="/ledger" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Complete Ledger
              <ExternalLink className="w-3 h-3" />
            </Link>
          }
          className="lg:col-span-2"
        >
          {data?.ledgerEntries.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No ledger operations found matching active filters.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data?.ledgerEntries.map((mov) => (
                <div key={mov.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        mov.operationType === "RECEIPT"
                          ? "success"
                          : mov.operationType === "DELIVERY"
                          ? "warning"
                          : mov.operationType === "TRANSFER_IN" || mov.operationType === "TRANSFER_OUT"
                          ? "purple"
                          : "danger"
                      }
                      size="sm"
                    >
                      {mov.operationType.replace("_", " ")}
                    </Badge>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">
                        {mov.productName} <span className="font-mono text-slate-400 text-[10px]">({mov.sku})</span>
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        {mov.sourceLocation || "Origin"} &rarr; {mov.destLocation || "Destination"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-xs font-mono font-bold ${
                        mov.quantityChange < 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {mov.quantityChange > 0 ? `+${mov.quantityChange}` : mov.quantityChange} {mov.unit}
                    </span>
                    <div className="flex items-center gap-1 justify-end text-[10px] text-slate-400 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{new Date(mov.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span className="font-mono text-slate-500">[{mov.documentRef}]</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
