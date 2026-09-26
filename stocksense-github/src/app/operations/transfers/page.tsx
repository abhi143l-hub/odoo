"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  Clock,
  Warehouse,
  Package,
  X,
  ArrowRight,
  Layers,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface TransferItem {
  id: string;
  transferNumber: string;
  sourceWarehouseName: string;
  sourceLocationName: string;
  destWarehouseName: string;
  destLocationName: string;
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELLED";
  createdByName: string;
  itemCount: number;
  totalQuantity: number;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unit: string;
  }>;
  createdAt: string;
  validatedAt?: string;
}

interface Lookups {
  warehouses: Array<{ id: string; name: string; code: string }>;
  locations: Array<{
    id: string;
    code: string;
    name: string;
    warehouseId: string;
    warehouseName: string;
    balances: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unit: string;
    }>;
  }>;
  products: Array<{ id: string; sku: string; name: string; unit: string }>;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [sourceWarehouse, setSourceWarehouse] = useState("");
  const [sourceLocation, setSourceLocation] = useState("");
  const [destWarehouse, setDestWarehouse] = useState("");
  const [destLocation, setDestLocation] = useState("");
  const [formItems, setFormItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/operations/transfers?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setTransfers(data.transfers || []);
        if (data.lookups) {
          setLookups(data.lookups);
        }
      }
    } catch (err) {
      console.error("Error loading transfers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  const handleOpenCreateModal = () => {
    if (lookups && lookups.warehouses.length >= 2 && lookups.locations.length >= 2) {
      const srcWh = lookups.warehouses[0].id;
      const dstWh = lookups.warehouses[1].id;
      const srcLocs = lookups.locations.filter((l) => l.warehouseId === srcWh);
      const dstLocs = lookups.locations.filter((l) => l.warehouseId === dstWh);

      setSourceWarehouse(srcWh);
      setSourceLocation(srcLocs[0]?.id || lookups.locations[0].id);
      setDestWarehouse(dstWh);
      setDestLocation(dstLocs[0]?.id || lookups.locations[1].id);

      setFormItems([
        {
          productId: lookups.products[0].id,
          quantity: 20,
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/operations/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWarehouseId: sourceWarehouse,
          sourceLocationId: sourceLocation,
          destWarehouseId: destWarehouse,
          destLocationId: destLocation,
          items: formItems,
          status: "WAITING",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create transfer");

      setIsModalOpen(false);
      fetchTransfers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateTransfer = async (id: string) => {
    if (!confirm("Validate and complete this internal transfer? Physical inventory will be moved between location balances while conserving total company stock.")) {
      return;
    }

    try {
      const res = await fetch(`/api/operations/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VALIDATE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      alert(data.message);
      fetchTransfers();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const availableSourceLocations = lookups?.locations.filter((l) => l.warehouseId === sourceWarehouse) || [];
  const availableDestLocations = lookups?.locations.filter((l) => l.warehouseId === destWarehouse) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Internal Stock Transfers</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
              Zero-Loss Inventory Conservation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Safely relocate stock between warehouses, production buffers, and racks without altering total company inventory.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create Internal Transfer
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        {[
          { id: "ALL", label: "All Transfers" },
          { id: "WAITING", label: "Pending Floor Movement" },
          { id: "DONE", label: "Completed & Relocated" },
          { id: "DRAFT", label: "Drafts" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transfers Table */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Transfer #</th>
                <th className="py-3 px-4">Origin &rarr; Destination Flow</th>
                <th className="py-3 px-4">Items / Total Units</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading internal transfer operations from PostgreSQL...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No internal transfers found matching active filter.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link href={`/operations/transfers/${t.id}`} className="group block">
                        <span className="font-mono font-bold text-purple-600 group-hover:underline">
                          {t.transferNumber}
                        </span>
                        <span className="block text-[10px] text-slate-400">By {t.createdByName}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 font-medium">
                        <span className="text-slate-800">{t.sourceWarehouseName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-800 font-bold">{t.destWarehouseName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {t.sourceLocationName} &rarr; {t.destLocationName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold font-mono text-slate-900">{t.totalQuantity} Units</span>
                      <span className="text-[10px] text-slate-400 block">
                        ({t.itemCount} line item{t.itemCount > 1 ? "s" : ""})
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          t.status === "DONE"
                            ? "success"
                            : t.status === "WAITING"
                            ? "purple"
                            : "default"
                        }
                        size="sm"
                      >
                        {t.status === "DONE" ? "Completed" : t.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {t.status !== "DONE" && t.status !== "CANCELLED" && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs bg-purple-600 hover:bg-purple-700"
                          onClick={() => handleValidateTransfer(t.id)}
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                          Complete Move
                        </Button>
                      )}
                      <Link href={`/operations/transfers/${t.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Internal Transfer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Internal Warehouse Transfer</h3>
                <p className="text-xs text-slate-500">Relocate stock between facilities with total company conservation</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Source Facility Selection */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Origin (Source)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Source Warehouse</label>
                    <select
                      value={sourceWarehouse}
                      onChange={(e) => {
                        setSourceWarehouse(e.target.value);
                        const firstLoc = lookups?.locations.find((l) => l.warehouseId === e.target.value);
                        if (firstLoc) setSourceLocation(firstLoc.id);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    >
                      {lookups?.warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Source Rack Location</label>
                    <select
                      value={sourceLocation}
                      onChange={(e) => setSourceLocation(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    >
                      {availableSourceLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Destination Facility Selection */}
              <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">Destination Target</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-800 mb-1">Destination Warehouse</label>
                    <select
                      value={destWarehouse}
                      onChange={(e) => {
                        setDestWarehouse(e.target.value);
                        const firstLoc = lookups?.locations.find((l) => l.warehouseId === e.target.value);
                        if (firstLoc) setDestLocation(firstLoc.id);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    >
                      {lookups?.warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-800 mb-1">Destination Rack Location</label>
                    <select
                      value={destLocation}
                      onChange={(e) => setDestLocation(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                    >
                      {availableDestLocations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Select Product & Transfer Quantity
                </label>
                {formItems.map((item, index) => {
                  const srcLocObj = lookups?.locations.find((l) => l.id === sourceLocation);
                  const bal = srcLocObj?.balances.find((b) => b.productId === item.productId);
                  const maxQty = bal ? bal.quantity : 0;

                  return (
                    <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex-1">
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const updated = [...formItems];
                            updated[index].productId = e.target.value;
                            setFormItems(updated);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                        >
                          {lookups?.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku}) &mdash; Available at Source: {maxQty} {p.unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          max={maxQty || undefined}
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...formItems];
                            updated[index].quantity = parseFloat(e.target.value) || 1;
                            setFormItems(updated);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
                          placeholder="Qty"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Register Internal Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
