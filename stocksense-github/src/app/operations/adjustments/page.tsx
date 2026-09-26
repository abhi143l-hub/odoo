"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  X,
  FileText,
  Search,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface AdjustmentItem {
  id: string;
  adjustmentNumber: string;
  productName: string;
  sku: string;
  unit: string;
  locationName: string;
  locationId: string;
  systemQuantity: number;
  physicalQuantity: number;
  difference: number;
  reason: string;
  notes?: string;
  performedBy: string;
  createdAt: string;
}

interface Lookups {
  products: Array<{
    id: string;
    sku: string;
    name: string;
    unit: string;
    locations: Array<{
      locationId: string;
      locationName: string;
      currentQuantity: number;
    }>;
  }>;
  reasons: string[];
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [physicalCount, setPhysicalCount] = useState("");
  const [reason, setReason] = useState("DAMAGED");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/operations/adjustments");
      const data = await res.json();
      if (res.ok) {
        setAdjustments(data.adjustments || []);
        if (data.lookups) setLookups(data.lookups);
      }
    } catch (err) {
      console.error("Error loading adjustments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const handleOpenModal = () => {
    if (lookups && lookups.products.length > 0) {
      const firstProd = lookups.products[0];
      setSelectedProductId(firstProd.id);
      setSelectedLocationId(firstProd.locations[0]?.locationId || "");
      setPhysicalCount(firstProd.locations[0]?.currentQuantity.toString() || "0");
      setReason(lookups.reasons[0] || "DAMAGED");
    }
    setIsModalOpen(true);
  };

  const currentProduct = lookups?.products.find((p) => p.id === selectedProductId);
  const currentLocation = currentProduct?.locations.find((l) => l.locationId === selectedLocationId);
  const recordedStock = currentLocation ? currentLocation.currentQuantity : 0;
  const countedNum = parseFloat(physicalCount) || 0;
  const variance = countedNum - recordedStock;

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/operations/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          locationId: selectedLocationId,
          physicalQuantity: countedNum,
          reason,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit adjustment");

      setSuccessMsg(data.message);
      setIsModalOpen(false);
      setNotes("");
      fetchAdjustments();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Adjustments & Reconciliation</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Audit Discrepancy Reconciliation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compare physical cycle counts with recorded system balances and log variance reason codes with immutable ledger traceability.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Record Physical Count
        </Button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <Link href="/ledger" className="font-semibold underline flex items-center gap-1">
            View in Stock Ledger &rarr;
          </Link>
        </div>
      )}

      {/* Adjustments Catalog Table */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Adjustment #</th>
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4">Recorded vs Physical</th>
                <th className="py-3 px-4">Variance</th>
                <th className="py-3 px-4">Reason Code</th>
                <th className="py-3 px-4">Audited Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading stock adjustments from PostgreSQL...
                  </td>
                </tr>
              ) : adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No physical count adjustments recorded yet.
                  </td>
                </tr>
              ) : (
                adjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-700">
                      {a.adjustmentNumber}
                      <span className="block text-[10px] text-slate-400 font-sans font-normal">
                        By {a.performedBy}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{a.productName}</span>
                      <span className="font-mono text-[10px] text-slate-400">{a.sku}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {a.locationName}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-slate-500">{a.systemQuantity}</span>
                      <span className="text-slate-400 mx-1.5">&rarr;</span>
                      <span className="font-bold text-slate-900">{a.physicalQuantity} {a.unit}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-mono font-bold inline-flex items-center gap-1 ${
                          a.difference < 0 ? "text-rose-600" : a.difference > 0 ? "text-emerald-600" : "text-slate-600"
                        }`}
                      >
                        {a.difference < 0 ? (
                          <TrendingDown className="w-3.5 h-3.5" />
                        ) : a.difference > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : null}
                        {a.difference > 0 ? `+${a.difference}` : a.difference} {a.unit}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          a.reason === "DAMAGED"
                            ? "danger"
                            : a.reason === "LOST"
                            ? "warning"
                            : a.reason === "FOUND"
                            ? "success"
                            : "default"
                        }
                        size="sm"
                      >
                        {a.reason}
                      </Badge>
                      {a.notes && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{a.notes}</p>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(a.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Physical Stock Count Reconciliation</h3>
                <p className="text-xs text-slate-500">Record audit findings and reconcile physical inventory with ledger</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Product *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = lookups?.products.find((p) => p.id === e.target.value);
                    if (prod && prod.locations.length > 0) {
                      setSelectedLocationId(prod.locations[0].locationId);
                      setPhysicalCount(prod.locations[0].currentQuantity.toString());
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  {lookups?.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Warehouse Location *
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => {
                    setSelectedLocationId(e.target.value);
                    const loc = currentProduct?.locations.find((l) => l.locationId === e.target.value);
                    if (loc) setPhysicalCount(loc.currentQuantity.toString());
                  }}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  {currentProduct?.locations.map((loc) => (
                    <option key={loc.locationId} value={loc.locationId}>
                      {loc.locationName} &mdash; Current: {loc.currentQuantity} {currentProduct.unit}
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Variance Calculator */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Recorded System Quantity:</span>
                  <span className="font-mono font-bold text-slate-900">{recordedStock} {currentProduct?.unit}</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">
                    Physical Counted Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={physicalCount}
                    onChange={(e) => setPhysicalCount(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter physical count"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs">
                  <span className="font-bold text-slate-700">Calculated Adjustment Variance:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      variance < 0 ? "text-rose-600" : variance > 0 ? "text-emerald-600" : "text-slate-600"
                    }`}
                  >
                    {variance > 0 ? `+${variance}` : variance} {currentProduct?.unit}
                    {variance < 0 ? " (Shrinkage)" : variance > 0 ? " (Overage)" : " (Exact Match)"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Adjustment Reason Code *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  >
                    {lookups?.reasons.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Audit Notes / Justification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 kg damaged during forklift transit in aisle A1"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Confirm & Reconcile Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
