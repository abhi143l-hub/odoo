import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId");
    const categoryId = searchParams.get("categoryId");
    const status = searchParams.get("status");
    const docType = searchParams.get("docType");

    // 1. Fetch total products count
    const totalProducts = await prisma.product.count({
      where: categoryId && categoryId !== "ALL" ? { categoryId } : undefined,
    });

    // 2. Fetch stock balances and calculate total stock + low stock
    const productsWithStock = await prisma.product.findMany({
      where: categoryId && categoryId !== "ALL" ? { categoryId } : undefined,
      include: {
        stockBalances: {
          include: {
            location: {
              include: {
                warehouse: true,
              },
            },
          },
        },
        category: true,
        unit: true,
      },
    });

    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const attentionItems: Array<{
      id: string;
      type: string;
      severity: "danger" | "warning" | "info";
      title: string;
      detail: string;
      actionText: string;
      href: string;
    }> = [];

    productsWithStock.forEach((prod) => {
      const filteredBalances = warehouseId && warehouseId !== "ALL"
        ? prod.stockBalances.filter((sb) => sb.location.warehouseId === warehouseId)
        : prod.stockBalances;

      const currentStock = filteredBalances.reduce((acc, sb) => acc + sb.quantity, 0);
      totalStockUnits += currentStock;

      if (currentStock === 0) {
        outOfStockCount++;
        attentionItems.push({
          id: `oos-${prod.id}`,
          type: "OUT_OF_STOCK",
          severity: "danger",
          title: `${prod.name} (${prod.sku}) is Completely Out of Stock!`,
          detail: `Current stock: 0 ${prod.unit.symbol}. Immediate replenishment required.`,
          actionText: "Create Inbound Receipt",
          href: "/operations/receipts",
        });
      } else if (currentStock <= prod.reorderLevel) {
        lowStockCount++;
        attentionItems.push({
          id: `low-${prod.id}`,
          type: "LOW_STOCK",
          severity: "danger",
          title: `${prod.name} (${prod.sku}) below reorder threshold`,
          detail: `Current: ${currentStock} ${prod.unit.symbol} | Reorder Level: ${prod.reorderLevel} ${prod.unit.symbol} | Reorder Quantity: ${prod.reorderQuantity} ${prod.unit.symbol}`,
          actionText: "Review Replenishment",
          href: "/products",
        });
      }
    });

    // 3. Counts for Operations
    const [pendingReceipts, pendingDeliveries, scheduledTransfers, totalAdjustments] = await Promise.all([
      prisma.receipt.count({
        where: {
          status: { in: ["DRAFT", "WAITING", "READY"] },
        },
      }),
      prisma.delivery.count({
        where: {
          status: { in: ["DRAFT", "WAITING", "READY"] },
        },
      }),
      prisma.transfer.count({
        where: {
          status: { in: ["DRAFT", "WAITING", "READY"] },
        },
      }),
      prisma.stockAdjustment.count(),
    ]);

    // Add operation triage alerts to attention items
    if (pendingReceipts > 0) {
      attentionItems.push({
        id: "att-rec-pending",
        type: "PENDING_RECEIPT",
        severity: "warning",
        title: `${pendingReceipts} Inbound Receipt(s) Awaiting Physical Verification`,
        detail: "Supplies waiting at receiving dock. Verify and shelf to update available inventory.",
        actionText: "Validate Inbound",
        href: "/operations/receipts",
      });
    }

    if (pendingDeliveries > 0) {
      attentionItems.push({
        id: "att-del-pending",
        type: "PENDING_DELIVERY",
        severity: "info",
        title: `${pendingDeliveries} Customer Delivery Order(s) Ready for Picking & Packing`,
        detail: "Items scheduled for shipment. Verify pick lists to ensure on-time fulfillment.",
        actionText: "Process Shipments",
        href: "/operations/deliveries",
      });
    }

    // 4. Warehouse Stock Distribution
    const warehouses = await prisma.warehouse.findMany({
      include: {
        locations: {
          include: {
            stockBalances: true,
          },
        },
      },
    });

    const warehouseBreakdown = warehouses.map((wh) => {
      let whUnits = 0;
      let totalLocations = wh.locations.length;
      wh.locations.forEach((loc) => {
        loc.stockBalances.forEach((sb) => {
          whUnits += sb.quantity;
        });
      });
      return {
        id: wh.id,
        code: wh.code,
        name: wh.name,
        units: whUnits,
        locationsCount: totalLocations,
        capacityPct: Math.min(100, Math.round((whUnits / 1000) * 100)),
      };
    });

    // 5. Recent Immutable Stock Ledger Entries
    const ledgerEntries = await prisma.stockLedger.findMany({
      take: 8,
      orderBy: { timestamp: "desc" },
      include: {
        product: {
          include: { unit: true },
        },
        user: {
          select: { name: true, email: true, role: true },
        },
      },
    });

    // 6. Metadata for dynamic filter options
    const [categoriesList, warehousesList] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.warehouse.findMany({ select: { id: true, code: true, name: true } }),
    ]);

    return NextResponse.json({
      kpis: {
        totalProducts,
        totalStockUnits,
        lowStockCount,
        outOfStockCount,
        pendingReceipts,
        pendingDeliveries,
        scheduledTransfers,
        totalAdjustments,
      },
      attentionItems,
      warehouseBreakdown,
      ledgerEntries: ledgerEntries.map((l) => ({
        id: l.id,
        timestamp: l.timestamp.toISOString(),
        productName: l.product.name,
        sku: l.product.sku,
        unit: l.product.unit.symbol,
        operationType: l.operationType,
        documentRef: l.documentRef,
        quantityChange: l.quantityChange,
        previousQuantity: l.previousQuantity,
        newQuantity: l.newQuantity,
        sourceLocation: l.sourceLocation,
        destLocation: l.destLocation,
        reason: l.reason,
        performedBy: l.user.name,
      })),
      filterOptions: {
        categories: categoriesList,
        warehouses: warehousesList,
        documentTypes: ["ALL", "RECEIPT", "DELIVERY", "TRANSFER", "ADJUSTMENT"],
        statuses: ["ALL", "DRAFT", "WAITING", "READY", "DONE", "CANCELLED"],
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load dashboard statistics" },
      { status: 500 }
    );
  }
}
