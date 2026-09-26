"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Building2,
  Truck,
  Package,
  Layers,
  ShieldCheck,
  AlertCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ReceiptDetail {
  id: string;
  receiptNumber: string;
  supplier: {
    id: string;
    name: string;
    code: string;
    email?: string;
    phone?: string;
  };
  destinationLocationName: string;
  destinationLocationId: string;
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELLED";
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
    quantity: number;
    product: {
      name: string;
      sku: string;
      unit: { symbol: string; name: string };
      category: { name: string };
    };
  }>;
  createdAt: string;
  validatedAt?: string;
}

export default function ReceiptDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operations/receipts/${id}`);
      if (!res.ok) throw new Error("Failed to load receipt details");
      const data = await res.json();
      setReceipt(data.receipt);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchReceipt();
  }, [id]);

  const handleValidate = async () => {
    if (!receipt) return;
    setValidating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/operations/receipts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VALIDATE" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to validate receipt");

      setSuccessMsg(data.message);
      fetchReceipt();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading inbound receipt telemetry...</p>
      </div>
    );
  }

  if (error && !receipt) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Receipt Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link href="/operations/receipts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Return to Receipts List
          </Button>
        </Link>
      </div>
    );
  }

  if (!receipt) return null;

  const totalUnits = receipt.items.reduce((acc, it) => acc + it.quantity, 0);

  // Workflow steps
  const steps = [
    { label: "Drafted", done: true },
    { label: "Waiting Physical Dock Arrival", done: receipt.status !== "DRAFT" },
    { label: "Inspected & Ready", done: receipt.status === "READY" || receipt.status === "DONE" },
    { label: "Validated & Shelved (+Stock)", done: receipt.status === "DONE" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          href="/operations/receipts"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Inbound Receipts
        </Link>
        <div className="flex items-center gap-2">
          {receipt.status !== "DONE" && receipt.status !== "CANCELLED" && (
            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              isLoading={validating}
              onClick={handleValidate}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Validate & Increase Stock
            </Button>
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
            Inspect in Stock Ledger &rarr;
          </Link>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {receipt.receiptNumber}
              </span>
              <Badge
                variant={
                  receipt.status === "DONE"
                    ? "success"
                    : receipt.status === "READY"
                    ? "info"
                    : receipt.status === "WAITING"
                    ? "warning"
                    : "default"
                }
                size="sm"
              >
                {receipt.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Inbound Procurement Receipt
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Registered by {receipt.createdBy.name} on {new Date(receipt.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Inbound Units
            </span>
            <span className="text-3xl font-extrabold font-mono text-slate-900">{totalUnits}</span>
            <span className="text-xs text-slate-500 block mt-0.5">Across {receipt.items.length} item line(s)</span>
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

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vendor Details */}
        <Card title="Vendor & Procurement Info" subtitle="Origin supplier contact and reference">
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Supplier Name:</span>
              <span className="font-bold text-slate-800">{receipt.supplier.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Supplier Code:</span>
              <span className="font-mono text-slate-700">{receipt.supplier.code}</span>
            </div>
            {receipt.supplier.email && (
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-700">{receipt.supplier.email}</span>
              </div>
            )}
            {receipt.notes && (
              <div className="pt-1">
                <span className="text-slate-500 block mb-0.5">Receiving Notes / Bill of Lading:</span>
                <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">{receipt.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Destination Location Info */}
        <Card title="Physical Shelving Target" subtitle="Designated warehouse bay & rack">
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
              <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block mb-1">
                Target Rack Location
              </span>
              <span className="text-sm font-bold text-slate-900 block">{receipt.destinationLocationName}</span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Stock will be directly allocated to this location balance upon validation.
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Validation Timestamp:</span>
              <span className="font-mono text-slate-800">
                {receipt.validatedAt ? new Date(receipt.validatedAt).toLocaleString() : "Pending Validation"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Items Breakdown Table */}
      <Card title="Inbound Line Items" subtitle="Quantities received and verified from supplier bill" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Quantity Received</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Inspect Product</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-bold text-slate-900">{it.product.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{it.product.sku}</td>
                  <td className="py-3 px-4 text-slate-600">{it.product.category.name}</td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold font-mono text-sm text-emerald-700">+{it.quantity}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">{it.product.unit.symbol}</td>
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
