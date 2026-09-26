"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  Search,
  Filter,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ClipboardCheck,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface LedgerRecord {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  category: string;
  operationType: "RECEIPT" | "DELIVERY" | "TRANSFER_OUT" | "TRANSFER_IN" | "ADJUSTMENT";
  documentRef: string;
  quantityChange: number;
  previousQuantity: number;
  newQuantity: number;
  sourceLocation: string;
  destLocation: string;
  reason: string;
  performedBy: string;
  userRole: string;
}

export default function LedgerPage() {
  const [ledger, setLedger] = useState<LedgerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [opFilter, setOpFilter] = useState("ALL");

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("q", search);
      if (opFilter !== "ALL") params.append("operationType", opFilter);

      const res = await fetch(`/api/ledger?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setLedger(data.ledger || []);
      }
    } catch (err) {
      console.error("Error loading ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLedger();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, opFilter]);

  const handleExportCSV = () => {
    if (ledger.length === 0) return;

    const headers = [
      "Timestamp",
      "Operation Type",
      "Document Ref",
      "Product Name",
      "SKU",
      "Quantity Change",
      "Unit",
      "Previous Balance",
      "New Balance",
      "Source Location",
      "Destination Location",
      "Reason",
      "Performed By",
    ];

    const rows = ledger.map((l) => [
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.operationType}"`,
      `"${l.documentRef}"`,
      `"${l.productName.replace(/"/g, '""')}"`,
      `"${l.sku}"`,
      l.quantityChange,
      `"${l.unit}"`,
      l.previousQuantity,
      l.newQuantity,
      `"${l.sourceLocation.replace(/"/g, '""')}"`,
      `"${l.destLocation.replace(/"/g, '""')}"`,
      `"${l.reason.replace(/"/g, '""')}"`,
      `"${l.performedBy.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stocksense-stock-ledger-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Movement Ledger</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
              Immutable Single Source of Truth
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Every inventory change is cryptographically audited and permanently traceable across all warehouses.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={ledger.length === 0}>
          <Download className="w-4 h-4 mr-1.5 text-blue-600" />
          Export Audit Ledger (CSV)
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference #, SKU, product, location, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Operation Type Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "ALL", label: "All Operations" },
              { id: "RECEIPT", label: "Receipts (+)" },
              { id: "DELIVERY", label: "Deliveries (-)" },
              { id: "TRANSFER_OUT", label: "Transfers Out" },
              { id: "TRANSFER_IN", label: "Transfers In" },
              { id: "ADJUSTMENT", label: "Adjustments (±)" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOpFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  opFilter === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operation & Ref</th>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Movement Flow (Source &rarr; Dest)</th>
                <th className="py-3 px-4">Delta (Units)</th>
                <th className="py-3 px-4">Balance Snapshot</th>
                <th className="py-3 px-4">Audit Reason</th>
                <th className="py-3 px-4">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading immutable ledger trail from PostgreSQL...
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No ledger entries found matching search or filter.
                  </td>
                </tr>
              ) : (
                ledger.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(l.timestamp).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          l.operationType === "RECEIPT"
                            ? "success"
                            : l.operationType === "DELIVERY"
                            ? "danger"
                            : l.operationType === "TRANSFER_IN" || l.operationType === "TRANSFER_OUT"
                            ? "purple"
                            : "warning"
                        }
                        size="sm"
                      >
                        {l.operationType.replace("_", " ")}
                      </Badge>
                      <span className="font-mono text-[10px] text-slate-500 block mt-0.5">
                        {l.documentRef}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/products/${l.productId}`} className="font-bold text-slate-900 hover:text-blue-600">
                        {l.productName}
                      </Link>
                      <span className="font-mono text-[10px] text-slate-400 block">{l.sku}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-[11px] text-slate-600">
                      <span className="truncate block font-medium">{l.sourceLocation}</span>
                      <span className="text-slate-400 block text-[10px]">&darr;</span>
                      <span className="truncate block font-semibold text-slate-800">{l.destLocation}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono font-bold text-sm ${
                          l.quantityChange < 0
                            ? "text-rose-600"
                            : l.quantityChange > 0
                            ? "text-emerald-600"
                            : "text-slate-600"
                        }`}
                      >
                        {l.quantityChange > 0 ? `+${l.quantityChange}` : l.quantityChange} {l.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      <span>{l.previousQuantity}</span>
                      <span className="text-slate-400 mx-1">&rarr;</span>
                      <span className="font-bold text-slate-900">{l.newQuantity} {l.unit}</span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-700 whitespace-nowrap">
                      <span className="font-medium block">{l.performedBy}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{l.userRole}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
