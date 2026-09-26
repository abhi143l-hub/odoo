"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Package,
  ArrowLeft,
  Warehouse,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  Clock,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Calendar,
  Layers,
  CheckCircle2,
  FileText,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ProductDetailData {
  product: {
    id: string;
    sku: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    unitName: string;
    reorderLevel: number;
    reorderQuantity: number;
    preferredWarehouse: string;
    status: "NORMAL" | "LOW_STOCK" | "OUT_OF_STOCK";
    totalCurrentStock: number;
    availableStock: number;
    incomingStock: number;
    outgoingStock: number;
    stockBalances: Array<{
      locationId: string;
      code: string;
      name: string;
      type: string;
      warehouseName: string;
      warehouseCode: string;
      quantity: number;
    }>;
    whyStockChanged: {
      initialStock: number;
      totalReceived: number;
      totalDelivered: number;
      totalAdjustments: number;
      totalTransfers: number;
      calculatedCurrent: number;
      ledgerEntriesCount: number;
      formula: string;
    };
    health: {
      score: number;
      grade: string;
      signals: string[];
    };
    reorderInsight: {
      avgDailyUsage: string;
      daysOfCoverage: string;
      recommendedAction: string;
    };
    timeline: Array<{
      id: string;
      timestamp: string;
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
  };
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("Failed to load product details");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading inventory ledger and health telemetry...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Product Not Found</h3>
        <p className="text-xs text-slate-500">{error || "Unable to retrieve product"}</p>
        <Link href="/products">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Products Catalog
          </Button>
        </Link>
      </div>
    );
  }

  const { product } = data;
  const { whyStockChanged, health, reorderInsight, timeline } = product;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          href="/products"
          className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Product Catalog
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/operations/receipts">
            <Button variant="outline" size="sm">
              <ArrowDownLeft className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Receive Stock
            </Button>
          </Link>
          <Link href="/operations/transfers">
            <Button variant="outline" size="sm">
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1 text-purple-600" />
              Transfer
            </Button>
          </Link>
        </div>
      </div>

      {/* Product Hero Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {product.sku}
            </span>
            <Badge
              variant={
                product.status === "NORMAL"
                  ? "success"
                  : product.status === "LOW_STOCK"
                  ? "danger"
                  : "default"
              }
              size="sm"
            >
              {product.status === "NORMAL" ? "In Stock" : product.status === "LOW_STOCK" ? "Low Stock Risk" : "Out of Stock"}
            </Badge>
            <span className="text-xs text-slate-400 font-medium">Category: {product.category}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{product.name}</h1>
          {product.description && <p className="text-xs text-slate-500 mt-1 max-w-2xl">{product.description}</p>}
        </div>

        {/* Quick Health Meter Pill */}
        <div className="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-6">
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Inventory Health
            </span>
            <div className="flex items-baseline gap-1 justify-end">
              <span
                className={`text-2xl font-black ${
                  health.score >= 80 ? "text-emerald-600" : health.score >= 50 ? "text-amber-600" : "text-rose-600"
                }`}
              >
                {health.score}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">{health.grade}</span>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${
              health.score >= 80
                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : health.score >= 50
                ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-rose-50 border-rose-200 text-rose-600"
            }`}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Stock Quantities 4-Way Balance Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Current Stock
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{product.totalCurrentStock}</span>
            <span className="text-xs font-semibold text-slate-400">{product.unit}</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Physical count in all warehouses</span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
            Available to Promise
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-emerald-700">{product.availableStock}</span>
            <span className="text-xs font-semibold text-emerald-600">{product.unit}</span>
          </div>
          <span className="text-[10px] text-emerald-600 mt-1 block">Uncommitted & ready to ship</span>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block mb-1">
            Incoming (On Order)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-blue-700">+{product.incomingStock}</span>
            <span className="text-xs font-semibold text-blue-600">{product.unit}</span>
          </div>
          <span className="text-[10px] text-blue-600 mt-1 block">Pending arrival from vendors</span>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block mb-1">
            Outgoing (Committed)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-amber-700">-{product.outgoingStock}</span>
            <span className="text-xs font-semibold text-amber-600">{product.unit}</span>
          </div>
          <span className="text-[10px] text-amber-600 mt-1 block">Reserved for customer orders</span>
        </div>
      </div>

      {/* SIGNATURE FEATURE: "Why Did Stock Change?" Waterfall Engine */}
      <Card
        title="Why Did Stock Change? (Audit Waterfall)"
        subtitle="Dynamic reconciliation computed directly from immutable stock ledger transactions"
        className="border-slate-200 shadow-sm"
      >
        <div className="bg-slate-900 text-white rounded-xl p-5 font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-slate-400 text-[11px] uppercase">
            <span>Transaction Category</span>
            <span>Quantity Delta</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Starting Baseline Stock:
              </span>
              <span className="font-bold">{whyStockChanged.initialStock} {product.unit}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                + Inbound Receipts (Validated):
              </span>
              <span className="font-bold">+{whyStockChanged.totalReceived} {product.unit}</span>
            </div>

            <div className="flex justify-between items-center text-rose-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                - Outbound Deliveries (Shipped):
              </span>
              <span className="font-bold">-{whyStockChanged.totalDelivered} {product.unit}</span>
            </div>

            <div className="flex justify-between items-center text-amber-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                &plusmn; Physical Adjustments (Damaged/Found):
              </span>
              <span className="font-bold">
                {whyStockChanged.totalAdjustments >= 0 ? `+${whyStockChanged.totalAdjustments}` : whyStockChanged.totalAdjustments} {product.unit}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700 flex justify-between items-center text-sm font-bold text-white">
            <span>Current Real-Time Ledger Balance:</span>
            <span className="text-base text-blue-400 font-extrabold">
              {product.totalCurrentStock} {product.unit}
            </span>
          </div>

          <p className="text-[10px] text-slate-400 pt-1 font-sans italic">
            &lowast; Verified across {whyStockChanged.ledgerEntriesCount} immutable transaction records logged in PostgreSQL.
          </p>
        </div>
      </Card>

      {/* Location Availability Matrix & Reorder Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exact Location Breakdown */}
        <Card
          title="Location Availability Matrix"
          subtitle="Exact stock distribution across warehouses, aisles, and storage racks"
          className="border-slate-200 shadow-sm"
        >
          {product.stockBalances.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No physical stock assigned to any rack yet.</p>
          ) : (
            <div className="space-y-3">
              {product.stockBalances.map((loc) => (
                <div
                  key={loc.locationId}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white border border-slate-200 text-blue-600">
                      <Warehouse className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{loc.warehouseName}</h4>
                      <p className="text-[11px] text-slate-500">
                        {loc.name} <span className="font-mono text-slate-400">[{loc.code}]</span> &bull; {loc.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-slate-900">{loc.quantity}</span>
                    <span className="text-xs text-slate-400 ml-1">{product.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Smart Reorder & Health Signals */}
        <div className="space-y-6">
          {/* Smart Reorder Insights */}
          <Card
            title="Smart Reorder Recommendation"
            subtitle="Automated inventory replenishment advisor"
            className="border-slate-200 shadow-sm"
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                    Estimated Daily Consumption
                  </span>
                  <span className="font-bold font-mono text-slate-900">{reorderInsight.avgDailyUsage}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-0.5">
                    Stock Coverage Remaining
                  </span>
                  <span className="font-bold font-mono text-slate-900">{reorderInsight.daysOfCoverage}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200 text-xs">
                <span className="font-bold text-blue-900 block mb-1">Recommended Action:</span>
                <p className="text-blue-800 text-[11px] leading-relaxed">{reorderInsight.recommendedAction}</p>
              </div>
            </div>
          </Card>

          {/* Explainable Health Factors */}
          <Card
            title="Explainable Health Telemetry"
            subtitle="Signals contributing to this product's health grade"
            className="border-slate-200 shadow-sm"
          >
            <div className="space-y-2">
              {health.signals.map((sig, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span>{sig}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Visual Chronological Movement Timeline */}
      <Card
        title="Visual Stock Movement Timeline"
        subtitle="Chronological audit history of inbound, outbound, transfer, and adjustment operations"
        className="border-slate-200 shadow-sm"
      >
        {timeline.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No movement operations recorded yet.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-2">
            {timeline.map((event) => (
              <div key={event.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm ${
                    event.operationType === "RECEIPT"
                      ? "bg-emerald-600"
                      : event.operationType === "DELIVERY"
                      ? "bg-rose-600"
                      : event.operationType === "TRANSFER_IN" || event.operationType === "TRANSFER_OUT"
                      ? "bg-purple-600"
                      : "bg-amber-600"
                  }`}
                >
                  {event.operationType === "RECEIPT" ? (
                    <ArrowDownLeft className="w-3 h-3" />
                  ) : event.operationType === "DELIVERY" ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : event.operationType === "ADJUSTMENT" ? (
                    <FileText className="w-3 h-3" />
                  ) : (
                    <ArrowLeftRight className="w-3 h-3" />
                  )}
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{event.operationType}</span>
                      <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {event.documentRef}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold text-xs ${
                        event.quantityChange < 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {event.quantityChange > 0 ? `+${event.quantityChange}` : event.quantityChange} {product.unit}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p>
                      <span className="text-slate-400">Flow:</span> {event.sourceLocation || "Origin"} &rarr;{" "}
                      {event.destLocation || "Destination"}
                    </p>
                    {event.reason && (
                      <p>
                        <span className="text-slate-400">Reason:</span> {event.reason}
                      </p>
                    )}
                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-400">
                      <span>Recorded by: {event.performedBy}</span>
                      <span>&bull;</span>
                      <span>{new Date(event.timestamp).toLocaleString()}</span>
                      <span>&bull;</span>
                      <span className="font-mono">
                        Balance after: {event.newQuantity} {product.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
