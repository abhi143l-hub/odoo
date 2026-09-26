"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeftRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Warehouse,
  Package,
  Layers,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  FileText,
  ExternalLink,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface TransferDetail {
  id: string;
  transferNumber: string;
  sourceWarehouse: { name: string; code: string };
  sourceLocation: { name: string; code: string };
  destWarehouse: { name: string; code: string };
  destLocation: { name: string; code: string };
  status: "DRAFT" | "WAITING" | "READY" | "DONE" | "CANCELLED";
  createdBy: { id: string; name: string; email: string; role: string };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    unit: string;
    availableAtSource: number;
    hasSufficientStock: boolean;
  }>;
  isAllSufficient: boolean;
  createdAt: string;
  validatedAt?: string;
}

export default function TransferDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchTransfer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/operations/transfers/${id}`);
      if (!res.ok) throw new Error("Failed to load transfer order details");
      const data = await res.json();
      setTransfer(data.transfer);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTransfer();
  }, [id]);

  const handleValidate = async () => {
    if (!transfer) return;
    setValidating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/operations/transfers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "VALIDATE" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to validate transfer");

      setSuccessMsg(data.message);
      fetchTransfer();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500">Loading internal transfer telemetry...</p>
      </div>
    );
  }

  if (error && !transfer) {
    return (
      <div className="max-w-5xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Transfer Order Not Found</h3>
        <p className="text-xs text-slate-500">{error}</p>
        <Link href="/operations/transfers">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Transfers
          </Button>
        </Link>
      </div>
    );
  }

  if (!transfer) return null;

  const totalUnits = transfer.items.reduce((acc, it) => acc + it.quantity, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          href="/operations/transfers"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Internal Transfers
        </Link>
        <div className="flex items-center gap-2">
          {transfer.status !== "DONE" && transfer.status !== "CANCELLED" && (
            <Button
              variant="primary"
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 shadow-sm"
              disabled={!transfer.isAllSufficient}
              isLoading={validating}
              onClick={handleValidate}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
              Complete & Validate Move
            </Button>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <Link href="/ledger" className="font-semibold underline flex items-center gap-1">
            View Dual-Ledger Entries &rarr;
          </Link>
        </div>
      )}

      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                {transfer.transferNumber}
              </span>
              <Badge variant={transfer.status === "DONE" ? "success" : "purple"} size="sm">
                {transfer.status === "DONE" ? "Completed & Shelved" : transfer.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Internal Facility Relocation
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Initiated by {transfer.createdBy.name} on {new Date(transfer.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Moving Quantity
            </span>
            <span className="text-3xl font-extrabold font-mono text-purple-700">{totalUnits}</span>
            <span className="text-xs text-slate-500 block mt-0.5">Units in relocation</span>
          </div>
        </div>

        {/* Visual Flow Architecture */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Origin */}
          <div className="flex-1 text-center md:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Source Facility</span>
            <span className="text-sm font-bold text-slate-900 block">{transfer.sourceWarehouse.name}</span>
            <span className="text-xs text-slate-600 block">
              {transfer.sourceLocation.name} ({transfer.sourceLocation.code})
            </span>
          </div>

          {/* Flow Indicator */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-mono font-bold text-purple-600 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
              {totalUnits} Units
            </span>
            <div className="w-24 h-0.5 bg-purple-300 relative my-2">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 border-t-2 border-r-2 border-purple-600 rotate-45"></div>
            </div>
            <span className="text-[10px] text-slate-400">Total company stock conserved</span>
          </div>

          {/* Destination */}
          <div className="flex-1 text-center md:text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Facility</span>
            <span className="text-sm font-bold text-slate-900 block">{transfer.destWarehouse.name}</span>
            <span className="text-xs text-slate-600 block">
              {transfer.destLocation.name} ({transfer.destLocation.code})
            </span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <Card title="Transfer Line Items" subtitle="Inventory balances scheduled for physical relocation" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Transfer Quantity</th>
                <th className="py-3 px-4">Available at Source</th>
                <th className="py-3 px-4">Conservation Impact</th>
                <th className="py-3 px-4 text-right">Inspect Product</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfer.items.map((it) => (
                <tr key={it.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-bold text-slate-900">{it.productName}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{it.sku}</td>
                  <td className="py-3 px-4 font-bold font-mono text-sm text-purple-700">
                    {it.quantity} {it.unit}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className={it.hasSufficientStock ? "text-slate-800 font-bold" : "text-rose-600 font-bold"}>
                      {it.availableAtSource} {it.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                      ±0 Net Change (Conserved)
                    </span>
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
