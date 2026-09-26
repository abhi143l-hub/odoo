"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Layers,
  Warehouse,
  MapPin,
  CheckCircle2,
  Package,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

interface WarehouseData {
  id: string;
  code: string;
  name: string;
  address?: string;
  locations: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
    stockBalances: Array<{
      quantity: number;
      product: { name: string; sku: string; unit: { symbol: string } };
    }>;
  }>;
}

export default function WarehousesPage() {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        // Fetch detailed warehouses from custom endpoint or dashboard metadata
        const whRes = await fetch("/api/products");
        const whData = await whRes.json();
        // Fetch direct lookup info
        if (data && data.warehouseBreakdown) {
          // Setup state
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouses();
  }, []);

  const dummyWarehouses: WarehouseData[] = [
    {
      id: "wh-1",
      code: "WH-MAIN",
      name: "Main Central Warehouse",
      address: "Building 1, Logistics Boulevard, Dock 4",
      locations: [
        {
          id: "loc-1",
          code: "RACK-A1",
          name: "Heavy Metals Staging (Rack A1)",
          type: "STORAGE",
          stockBalances: [{ quantity: 150, product: { name: "Steel Rod (Structural Grade)", sku: "STL-ROD-01", unit: { symbol: "KG" } } }],
        },
        {
          id: "loc-2",
          code: "RACK-A2",
          name: "High-Bay Aisle 2 (Rack A2)",
          type: "STORAGE",
          stockBalances: [{ quantity: 80, product: { name: "Industrial Bearing", sku: "IND-BRG-07", unit: { symbol: "PCS" } } }],
        },
        {
          id: "loc-3",
          code: "RACK-B1",
          name: "Finished Goods Bay (Rack B1)",
          type: "STORAGE",
          stockBalances: [
            { quantity: 35, product: { name: "Office Chair", sku: "OFF-CHR-02", unit: { symbol: "PCS" } } },
            { quantity: 12, product: { name: "Engineering Laptop", sku: "TECH-LAP-03", unit: { symbol: "PCS" } } },
          ],
        },
      ],
    },
    {
      id: "wh-2",
      code: "WH-PROD",
      name: "Production Store & Assembly",
      address: "Building 2, Manufacturing Floor, Bay 3",
      locations: [
        {
          id: "loc-4",
          code: "RACK-P1",
          name: "Active Assembly Buffer (Rack P1)",
          type: "PRODUCTION",
          stockBalances: [{ quantity: 30, product: { name: "Steel Rod (Structural Grade)", sku: "STL-ROD-01", unit: { symbol: "KG" } } }],
        },
        {
          id: "loc-5",
          code: "RACK-P2",
          name: "Sub-assembly Storage (Rack P2)",
          type: "PRODUCTION",
          stockBalances: [{ quantity: 0, product: { name: "Safety Helmet", sku: "SAF-HLM-06", unit: { symbol: "PCS" } } }],
        },
      ],
    },
    {
      id: "wh-3",
      code: "WH-SEC",
      name: "Secondary Overflow Depot",
      address: "Building 5, Outer Yard Warehouse",
      locations: [
        {
          id: "loc-6",
          code: "RACK-S1",
          name: "Bulk Pallet Floor (Rack S1)",
          type: "STORAGE",
          stockBalances: [{ quantity: 140, product: { name: "Packaging Box", sku: "PKG-BOX-05", unit: { symbol: "BOX" } } }],
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Multi-Warehouse & Rack Hierarchy</h2>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
              Facility Physical Layout
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Overview of company warehouses, high-bay aisles, production buffer zones, and storage racks.
          </p>
        </div>
      </div>

      {/* Role Notice */}
      {user?.role !== "ADMIN" && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <span>🔒 <strong>Employee Viewing Mode:</strong> You are viewing company warehouse racks in read-only mode. Only System Administrators have permission to modify aisles or relocate storage racks.</span>
          <Badge variant="warning" size="sm">Read-Only</Badge>
        </div>
      )}

      {/* Warehouse Cards */}
      <div className="space-y-6">
        {dummyWarehouses.map((wh) => (
          <Card key={wh.id} className="border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{wh.name}</h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {wh.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {wh.address}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                {wh.locations.length} Physical Rack Locations
              </span>
            </div>

            {/* Racks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {wh.locations.map((loc) => (
                <div key={loc.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-900">{loc.name}</span>
                    <Badge variant={loc.type === "PRODUCTION" ? "purple" : "default"} size="sm">
                      {loc.code}
                    </Badge>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-slate-200/60 text-xs">
                    {loc.stockBalances.map((sb, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-slate-600 text-[11px] truncate max-w-[150px]">{sb.product.name}:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {sb.quantity} {sb.product.unit.symbol}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
