"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  Plus,
  CheckCircle2,
  Clock,
  Building2,
  Package,
  X,
  FileCheck,
  ChevronRight,
  Truck,
  Layers,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ReceiptItem {
  id: string;
  receiptNumber: string;
  supplierName: string;
  supplierCode: string;
  destinationLocation: string;
  destinationLocationId: string;
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELLED";
  notes?: string;
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
  suppliers: Array<{ id: string; name: string; code: string }>;
  products: Array<{ id: string; sku: string; name: string; unit: string }>;
  locations: Array<{ id: string; name: string }>;
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formSupplier, setFormSupplier] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Supplier Quick Creation State
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupCode, setNewSupCode] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [creatingSup, setCreatingSup] = useState(false);

  const handleQuickCreateSupplier = async () => {
    if (!newSupName.trim()) return;
    setCreatingSup(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSupName,
          code: newSupCode,
          email: newSupEmail,
          phone: newSupPhone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create supplier");

      if (lookups) {
        setLookups({
          ...lookups,
          suppliers: [...lookups.suppliers, data.supplier],
        });
      }
      setFormSupplier(data.supplier.id);
      setShowAddSupplier(false);
      setNewSupName("");
      setNewSupCode("");
      setNewSupEmail("");
      setNewSupPhone("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingSup(false);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/operations/receipts?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setReceipts(data.receipts || []);
        if (data.lookups) setLookups(data.lookups);
      }
    } catch (err) {
      console.error("Error loading receipts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [statusFilter]);

  const handleOpenCreateModal = () => {
    if (lookups) {
      setFormSupplier(lookups.suppliers[0]?.id || "");
      setFormLocation(lookups.locations[0]?.id || "");
      setFormItems([
        {
          productId: lookups.products[0]?.id || "",
          quantity: 50,
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (lookups && lookups.products.length > 0) {
      setFormItems([...formItems, { productId: lookups.products[0].id, quantity: 10 }]);
    }
  };

  const handleRemoveItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleCreateReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/operations/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: formSupplier,
          destinationLocationId: formLocation,
          notes: formNotes,
          items: formItems,
          status: "WAITING",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create receipt");

      setIsModalOpen(false);
      fetchReceipts();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateReceipt = async (id: string) => {
    if (!confirm("Are you sure you want to validate this receipt? Stock will immediately increase in the destination location and an immutable ledger entry will be created.")) {
      return;
    }

    try {
      const res = await fetch(`/api/operations/receipts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VALIDATE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      alert(data.message);
      fetchReceipts();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Inbound Receipts (Incoming Goods)</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Vendor Procurement
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Receive items from suppliers, verify shipments, and automatically increase stock with immutable ledger logging.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create Inbound Receipt
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        {[
          { id: "ALL", label: "All Receipts" },
          { id: "WAITING", label: "Waiting Physical Arrival" },
          { id: "READY", label: "Ready to Shelf" },
          { id: "DONE", label: "Validated & Shelved" },
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

      {/* Receipts Table */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Destination Location</th>
                <th className="py-3 px-4">Items / Total Units</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading inbound receipts from PostgreSQL...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No inbound receipts found matching active filter.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link href={`/operations/receipts/${r.id}`} className="group block">
                        <span className="font-mono font-bold text-blue-600 group-hover:underline">
                          {r.receiptNumber}
                        </span>
                        <span className="block text-[10px] text-slate-400">By {r.createdByName}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800 block">{r.supplierName}</span>
                      <span className="font-mono text-[10px] text-slate-400">{r.supplierCode}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate font-medium">
                      {r.destinationLocation}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold font-mono text-slate-900">{r.totalQuantity} Units</span>
                      <span className="text-[10px] text-slate-400 block">({r.itemCount} line item{r.itemCount > 1 ? "s" : ""})</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          r.status === "DONE"
                            ? "success"
                            : r.status === "READY"
                            ? "info"
                            : r.status === "WAITING"
                            ? "warning"
                            : "default"
                        }
                        size="sm"
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {r.status !== "DONE" && r.status !== "CANCELLED" && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleValidateReceipt(r.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Validate (+Stock)
                        </Button>
                      )}
                      <Link href={`/operations/receipts/${r.id}`}>
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

      {/* New Inbound Receipt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Inbound Vendor Receipt</h3>
                <p className="text-xs text-slate-500">Record incoming goods from vendor before physical shelving</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Select Supplier *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(!showAddSupplier)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold inline-flex items-center gap-0.5 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> {showAddSupplier ? "Cancel" : "New Supplier"}
                    </button>
                  </div>

                  {showAddSupplier ? (
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 mb-2">
                      <span className="text-[11px] font-bold text-blue-900 block">Add New Vendor / Supplier</span>
                      <input
                        type="text"
                        placeholder="Supplier Name * (e.g. Tata Steel)"
                        value={newSupName}
                        onChange={(e) => setNewSupName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Code (optional, e.g. SUP-TAT-01)"
                        value={newSupCode}
                        onChange={(e) => setNewSupCode(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          placeholder="Email (optional)"
                          value={newSupEmail}
                          onChange={(e) => setNewSupEmail(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="tel"
                          placeholder="Phone (optional)"
                          value={newSupPhone}
                          onChange={(e) => setNewSupPhone(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!newSupName.trim() || creatingSup}
                        onClick={handleQuickCreateSupplier}
                        className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm transition-colors"
                      >
                        {creatingSup ? "Creating..." : "Save & Select Supplier"}
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formSupplier}
                      onChange={(e) => setFormSupplier(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {lookups?.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Destination Rack / Location *
                  </label>
                  <select
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {lookups?.locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Inbound Products & Quantities
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Another Item
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formItems.map((item, index) => (
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
                              {p.name} ({p.sku}) &mdash; {p.unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
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
                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(index)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Shipment Notes / Po Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bill of lading #99102, Truck arrival dock 4"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Register Inbound Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
