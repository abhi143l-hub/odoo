"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock,
  Package,
  X,
  User,
  AlertTriangle,
  Boxes,
  Truck,
  Layers,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface DeliveryItem {
  id: string;
  deliveryNumber: string;
  customerName: string;
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELLED";
  picked: boolean;
  packed: boolean;
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
    availableStock: number;
    hasSufficientStock: boolean;
  }>;
  createdAt: string;
  validatedAt?: string;
}

interface Lookups {
  products: Array<{
    id: string;
    sku: string;
    name: string;
    unit: string;
    totalStock: number;
  }>;
}

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formCustomer, setFormCustomer] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<Array<{ productId: string; quantity: number }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/operations/deliveries?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setDeliveries(data.deliveries || []);
        if (data.lookups) setLookups(data.lookups);
      }
    } catch (err) {
      console.error("Error loading deliveries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter]);

  const handleOpenCreateModal = () => {
    if (lookups && lookups.products.length > 0) {
      setFormCustomer("Metro Fabrication Ltd");
      setFormItems([
        {
          productId: lookups.products[0].id,
          quantity: 10,
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    if (lookups && lookups.products.length > 0) {
      setFormItems([...formItems, { productId: lookups.products[0].id, quantity: 5 }]);
    }
  };

  const handleRemoveItemRow = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/operations/deliveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formCustomer,
          notes: formNotes,
          items: formItems,
          status: "WAITING",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create delivery order");

      setIsModalOpen(false);
      fetchDeliveries();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleValidateDelivery = async (id: string) => {
    if (!confirm("Validate and ship this delivery order? Stock will be atomically deducted and logged in the Stock Ledger.")) {
      return;
    }

    try {
      const res = await fetch(`/api/operations/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VALIDATE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      alert(data.message);
      fetchDeliveries();
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
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Outgoing Delivery Orders (Outbound Stock)</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
              Customer Fulfillment
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pick and pack customer shipments with overdraft protection, automatically decreasing stock upon validation.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create Delivery Order
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        {[
          { id: "ALL", label: "All Deliveries" },
          { id: "WAITING", label: "Waiting to Pick" },
          { id: "READY", label: "Ready to Ship (Packed)" },
          { id: "DONE", label: "Shipped & Validated" },
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

      {/* Deliveries Table */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Delivery #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items / Total Units</th>
                <th className="py-3 px-4">Fulfillment Stage</th>
                <th className="py-3 px-4">Stock Availability</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading outbound deliveries from PostgreSQL...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No delivery orders found matching active filter.
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => {
                  const hasStockDeficit = d.items.some((it) => !it.hasSufficientStock);

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link href={`/operations/deliveries/${d.id}`} className="group block">
                          <span className="font-mono font-bold text-blue-600 group-hover:underline">
                            {d.deliveryNumber}
                          </span>
                          <span className="block text-[10px] text-slate-400">By {d.createdByName}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {d.customerName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold font-mono text-slate-900">{d.totalQuantity} Units</span>
                        <span className="text-[10px] text-slate-400 block">
                          ({d.itemCount} line item{d.itemCount > 1 ? "s" : ""})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                              d.picked
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {d.picked ? "Picked ✓" : "Unpicked"}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                              d.packed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {d.packed ? "Packed ✓" : "Unpacked"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {d.status === "DONE" ? (
                          <span className="text-[11px] font-medium text-slate-500">Fulfilled & Shipped</span>
                        ) : hasStockDeficit ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                            <AlertTriangle className="w-3.5 h-3.5" /> Insufficient Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Available to Ship
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            d.status === "DONE"
                              ? "success"
                              : d.status === "READY"
                              ? "info"
                              : d.status === "WAITING"
                              ? "warning"
                              : "default"
                          }
                          size="sm"
                        >
                          {d.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {d.status !== "DONE" && d.status !== "CANCELLED" && (
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-xs bg-blue-600 hover:bg-blue-700"
                            disabled={hasStockDeficit}
                            onClick={() => handleValidateDelivery(d.id)}
                          >
                            <Truck className="w-3.5 h-3.5 mr-1" />
                            Ship (-Stock)
                          </Button>
                        )}
                        <Link href={`/operations/deliveries/${d.id}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            Details
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Delivery Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Outbound Customer Delivery</h3>
                <p className="text-xs text-slate-500">Pick and ship inventory items to customer destination</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Customer / Destination Entity *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Fabrication Ltd"
                  value={formCustomer}
                  onChange={(e) => setFormCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Shipment Items (Real-Time Stock Checked)
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
                  {formItems.map((item, index) => {
                    const selectedProd = lookups?.products.find((p) => p.id === item.productId);
                    const isAvailable = (selectedProd?.totalStock || 0) >= item.quantity;

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
                                {p.name} ({p.sku}) &mdash; Available: {p.totalStock} {p.unit}
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
                            className={`w-full px-2.5 py-1.5 text-xs bg-white border rounded-md font-mono ${
                              !isAvailable ? "border-rose-400 text-rose-700" : "border-slate-300"
                            }`}
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
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Delivery / Dispatch Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sales Order #SO-8819, Deliver to Bay 2 loading ramp"
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
                  Register Delivery Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
