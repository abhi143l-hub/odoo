"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Warehouse,
  ChevronRight,
  TrendingDown,
  CheckCircle2,
  X,
  Layers,
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  categoryId: string;
  unit: string;
  reorderLevel: number;
  reorderQuantity: number;
  preferredWarehouse: string;
  totalStock: number;
  status: "NORMAL" | "LOW_STOCK" | "OUT_OF_STOCK";
  balances: Array<{
    locationId: string;
    locationCode: string;
    locationName: string;
    warehouseName: string;
    quantity: number;
  }>;
}

interface Lookups {
  categories: Array<{ id: string; name: string }>;
  units: Array<{ id: string; name: string; symbol: string }>;
  warehouses: Array<{ id: string; name: string; code: string }>;
  locations: Array<{ id: string; code: string; name: string; warehouseName: string }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for New Product
  const [formSku, setFormSku] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formReorderLevel, setFormReorderLevel] = useState("10");
  const [formReorderQty, setFormReorderQty] = useState("50");
  const [formInitialStock, setFormInitialStock] = useState("0");
  const [formLocation, setFormLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("q", search);
      if (statusFilter !== "ALL") params.append("stockStatus", statusFilter);
      if (categoryFilter !== "ALL") params.append("categoryId", categoryFilter);
      if (warehouseFilter !== "ALL") params.append("warehouseId", warehouseFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setProducts(data.products || []);
        if (data.lookups) setLookups(data.lookups);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, categoryFilter, warehouseFilter]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: formSku,
          name: formName,
          description: formDesc,
          categoryId: formCategory || lookups?.categories[0]?.id,
          unitId: formUnit || lookups?.units[0]?.id,
          reorderLevel: parseFloat(formReorderLevel),
          reorderQuantity: parseFloat(formReorderQty),
          initialStock: parseFloat(formInitialStock) || 0,
          initialLocationId: formLocation || lookups?.locations[0]?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      setIsModalOpen(false);
      // Reset form
      setFormSku("");
      setFormName("");
      setFormDesc("");
      setFormInitialStock("0");
      fetchProducts();
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog & Inventory Matrix</h2>
          <p className="text-xs text-slate-500 mt-1">
            SKU registry, reorder thresholds, and multi-location physical stock distribution.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (lookups) {
              setFormCategory(lookups.categories[0]?.id || "");
              setFormUnit(lookups.units[0]?.id || "");
              setFormLocation(lookups.locations[0]?.id || "");
            }
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add New Product
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name, SKU, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "ALL", label: "All Items" },
              { id: "NORMAL", label: "Normal Stock" },
              { id: "LOW_STOCK", label: "Low Stock" },
              { id: "OUT_OF_STOCK", label: "Out of Stock" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Category & Warehouse Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Categories</option>
              {lookups?.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Warehouse Filter
            </label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Warehouses</option>
              {lookups?.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <span className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{products.length}</span> product(s) in catalog
            </span>
          </div>
        </div>
      </div>

      {/* Product List Table */}
      <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">UOM</th>
                <th className="py-3 px-4">Total Stock</th>
                <th className="py-3 px-4">Reorder Level</th>
                <th className="py-3 px-4">Location Breakdown</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading inventory catalog from PostgreSQL...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No products found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <Link href={`/products/${p.id}`} className="group block">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </span>
                        <span className="block font-mono text-[11px] text-slate-400 mt-0.5">{p.sku}</span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{p.category}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{p.unit}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-sm font-mono text-slate-900">{p.totalStock}</span>
                      <span className="text-[11px] text-slate-400 ml-1">{p.unit}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-600 font-mono">{p.reorderLevel}</span>
                      <span className="text-[10px] text-slate-400 block">Min Buffer</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {p.balances.length === 0 ? (
                        <span className="text-slate-400 italic">No assigned stock</span>
                      ) : (
                        <div className="space-y-0.5 max-w-xs">
                          {p.balances.map((b, idx) => (
                            <div key={idx} className="flex justify-between gap-2 text-[11px]">
                              <span className="text-slate-600 truncate">{b.warehouseName} ({b.locationCode}):</span>
                              <span className="font-mono font-bold text-slate-800">{b.quantity} {p.unit}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          p.status === "NORMAL"
                            ? "success"
                            : p.status === "LOW_STOCK"
                            ? "danger"
                            : "default"
                        }
                        size="sm"
                      >
                        {p.status === "NORMAL" ? "In Stock" : p.status === "LOW_STOCK" ? "Low Stock" : "Out of Stock"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/products/${p.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Inspect &rarr;
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

      {/* Create Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Product to Inventory</h3>
                <p className="text-xs text-slate-500">Configure SKU, category, UOM, and optional opening stock</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    SKU / Product Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. STL-ROD-99"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {lookups?.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Galvanized Steel Bracket"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {lookups?.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Reorder Minimum Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formReorderLevel}
                    onChange={(e) => setFormReorderLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Initial Stock Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Initial Opening Stock (Optional)</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Initial Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formInitialStock}
                      onChange={(e) => setFormInitialStock(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Storage Rack / Location
                    </label>
                    <select
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      disabled={parseFloat(formInitialStock) <= 0}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {lookups?.locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.warehouseName} — {loc.name} ({loc.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Save & Register Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
