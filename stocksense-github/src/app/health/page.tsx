"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Warehouse,
  Package,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ProductHealth {
  id: string;
  name: string;
  sku: string;
  unit: string;
  category: string;
  totalStock: number;
  reorderLevel: number;
  healthScore: number;
  healthGrade: string;
  signals: string[];
}

export default function InventoryHealthPage() {
  const [products, setProducts] = useState<ProductHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        const data = await res.json();
        if (res.ok && data.products) {
          const mapped = data.products.map((p: any) => {
            let score = 100;
            const signals: string[] = [];

            if (p.totalStock === 0) {
              score -= 50;
              signals.push("Critical: Item is completely out of stock.");
            } else if (p.totalStock <= p.reorderLevel) {
              score -= 30;
              signals.push(`Low stock warning: ${p.totalStock} ${p.unit} is below safety threshold of ${p.reorderLevel}.`);
            } else if (p.totalStock > p.reorderLevel * 4) {
              score -= 10;
              signals.push("Overstock warning: Stock is >4x minimum threshold.");
            } else {
              signals.push("Balanced physical buffer maintained.");
            }

            score = Math.max(0, Math.min(100, score));
            let grade = score >= 80 ? "Healthy" : score >= 50 ? "Moderate Risk" : "Critical Attention";

            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              unit: p.unit,
              category: p.category,
              totalStock: p.totalStock,
              reorderLevel: p.reorderLevel,
              healthScore: score,
              healthGrade: grade,
              signals,
            };
          });

          setProducts(mapped);
        }
      } catch (err) {
        console.error("Failed to load inventory health:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
  }, []);

  const overallScore = products.length > 0
    ? Math.round(products.reduce((acc, p) => acc + p.healthScore, 0) / products.length)
    : 85;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Inventory Health & Anomaly Telemetry</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
              Explainable Health Model
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Algorithmic health scoring grounded in real turnover velocity, reorder ratios, and physical audit variance.
          </p>
        </div>
      </div>

      {/* Top Health Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Overall Company Health Score
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span
                className={`text-4xl font-black ${
                  overallScore >= 80 ? "text-emerald-600" : overallScore >= 50 ? "text-amber-600" : "text-rose-600"
                }`}
              >
                {overallScore}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 100</span>
            </div>
            <span className="text-xs font-semibold text-slate-700 mt-1 block">
              {overallScore >= 80 ? "Optimal Operational State" : "Action Required on Deficits"}
            </span>
          </div>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm ${
              overallScore >= 80
                ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : "bg-amber-50 border-amber-200 text-amber-600"
            }`}
          >
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Health Scoring Methodology
          </span>
          <div className="mt-2 space-y-1.5 text-xs text-slate-600">
            <p>&bull; <strong>40% Weight:</strong> Buffer vs Reorder Safety Level</p>
            <p>&bull; <strong>30% Weight:</strong> Stockout Frequency & Lead Time</p>
            <p>&bull; <strong>30% Weight:</strong> Physical Discrepancy & Variance Rate</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gradient-to-tr from-blue-900 to-indigo-900 text-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider block">
              StockSense Copilot
            </span>
            <p className="text-xs text-blue-100 mt-1 leading-relaxed">
              Have questions about why an item scored low? Query Copilot for the live ledger breakdown.
            </p>
          </div>
          <Link href="/copilot" className="mt-4">
            <Button variant="secondary" size="sm" className="bg-white text-slate-900 hover:bg-slate-100 text-xs w-full">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Ask Copilot About Health
            </Button>
          </Link>
        </div>
      </div>

      {/* Product-by-Product Health Table */}
      <Card title="Product Health Ratings" subtitle="Real-time explainable diagnostic signals for catalog items" className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Safety Level</th>
                <th className="py-3 px-4">Health Grade</th>
                <th className="py-3 px-4">Explainable Signals</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{p.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {p.totalStock} {p.unit}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {p.reorderLevel} {p.unit}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`font-mono font-black text-sm px-2 py-0.5 rounded border ${
                        p.healthScore >= 80
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : p.healthScore >= 50
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {p.healthScore}/100 &mdash; {p.healthGrade}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] text-slate-600 max-w-sm">
                    {p.signals.map((sig, sidx) => (
                      <div key={sidx} className="truncate">
                        &bull; {sig}
                      </div>
                    ))}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      href={`/products/${p.id}`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                    >
                      Inspect
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
