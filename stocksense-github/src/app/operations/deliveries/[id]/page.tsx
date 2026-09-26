"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Layers,
  ShieldCheck,
  AlertCircle,
  Truck,
  Box,
  FileCheck,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface DeliveryDetail {
  id: string;
  deliveryNumber: string;
  customerName: string;
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELLED";
  picked: boolean;
  packed: boolean;
  notes?: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unit: string;
    category: string;
    availableStock: number;
    hasSufficientStock: boolean;
    locations: Array<{
      locationName: string;
      quantity: number;
    }>;
  }>;
  isAllSufficient: boolean;
  createdAt: string;
  validatedAt?: string;
}

export default function DeliveryDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDelivery = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operations/deliveries/${id}`);
      if (!res.ok) throw new Error("Failed to load delivery details");
      const data = await res.json();
      setDelivery(data.delivery);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDelivery();
  }, [id]);

  const handleAction = async (action: "PICK" | "PACK" | "VALIDATE") => {
    if (!delivery) return;
    setProcessing(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/operations/deliveries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");

      setSuccessMsg(data.message);
      fetchDelivery();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading delivery order telemetry...</p>
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Delivery Order Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link href="/operations/deliveries">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Return to Deliveries List
          </Button>
        </Link>
      </div>
    );
  }

  if (!delivery) return null;

  const totalUnits = delivery.items.reduce((acc, it) => acc + it.quantity, 0);

  // Workflow steps
  const steps = [
    { label: "Drafted", done: true },
    { label: "Picked from Racks", done: delivery.picked || delivery.status === "DONE" },
    { label: "Packed & Labeled", done: delivery.packed || delivery.status === "DONE" },
    { label: "Validated & Shipped (-Stock)", done: delivery.status === "DONE" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          href="/operations/deliveries"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Delivery Orders
        </Link>
        <div className="flex items-center gap-2">
          {delivery.status !== "DONE" && delivery.status !== "CANCELLED" && (
            <>
              {!delivery.picked && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={processing}
                  onClick={() => handleAction("PICK")}
                >
                  <Package className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Mark Items Picked
                </Button>
              )}
              {delivery.picked && !delivery.packed && (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={processing}
                  onClick={() => handleAction("PACK")}
                >
                  <Box className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Mark Packed
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                disabled={!delivery.isAllSufficient}
                isLoading={processing}
                onClick={() => handleAction("VALIDATE")}
              >
                <Truck className="w-3.5 h-3.5 mr-1.5" />
                Validate Shipment (-Stock)
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
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

      {/* Overdraft Warning Banner */}
      {!delivery.isAllSufficient && delivery.status !== "DONE" && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-rose-900">Insufficient Physical Stock to Complete Shipment!</h4>
            <p className="mt-0.5 text-rose-700">
              One or more requested line items exceed the current warehouse inventory balance. The system will prevent shipment validation to protect against negative stock.
            </p>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {delivery.deliveryNumber}
              </span>
              <Badge
                variant={
                  delivery.status === "DONE"
                    ? "success"
                    : delivery.status === "READY"
                    ? "info"
                    : delivery.status === "WAITING"
                    ? "warning"
                    : "default"
                }
                size="sm"
              >
                {delivery.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Customer Outbound Shipment
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Destination: <span className="font-bold text-slate-800">{delivery.customerName}</span> &bull; Operator: {delivery.createdBy.name}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Units to Ship
            </span>
            <span className="text-3xl font-extrabold font-mono text-slate-900">-{totalUnits}</span>
            <span className="text-xs text-slate-500 block mt-0.5">Across {delivery.items.length} line item(s)</span>
          </div>
        </div>

        {/* Guided Step Workflow Indicator */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {steps.map((st, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-center text-xs font-medium transition-colors ${
                  st.done
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      st.done ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-[11px] font-bold">{st.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Line Items Table with Stock Check */}
      <Card title="Outbound Line Items" subtitle="Picked products and real-time inventory deduction" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Quantity to Ship</th>
                <th className="py-3 px-4">Available in Warehouse</th>
                <th className="py-3 px-4">Source Racks</th>
                <th className="py-3 px-4 text-right">Inspect Product</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {delivery.items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-bold text-slate-900">{it.productName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{it.sku}</td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold font-mono text-sm text-rose-600">-{it.quantity} {it.unit}</span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span
                      className={`font-bold ${
                        it.hasSufficientStock ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {it.availableStock} {it.unit}
                    </span>
                    {!it.hasSufficientStock && (
                      <span className="text-[10px] text-rose-600 block font-sans">Overdraft risk</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-600 max-w-xs">
                    {it.locations.map((loc, lidx) => (
                      <div key={lidx} className="truncate">
                        {loc.locationName}: <span className="font-bold">{loc.quantity} {it.unit}</span>
                      </div>
                    ))}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/products/${it.productId}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                    >
                      View Stock
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
