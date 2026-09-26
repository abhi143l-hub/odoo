# STOCKSENSE — MODULE 3 / CHECKPOINT 3 CODE SUBMISSION
## Product Management, Location Availability Matrix & Dynamic Inventory Intelligence

This file consolidates all code developed for **Module 3 (Checkpoint 3)** of StockSense.

---

### 1. `src/app/api/products/route.ts` (Product List, Search, Filter & Atomic Creation)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OperationType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();
    const categoryId = searchParams.get("categoryId");
    const warehouseId = searchParams.get("warehouseId");
    const stockStatus = searchParams.get("stockStatus");

    const products = await prisma.product.findMany({
      where: {
        AND: [
          query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { sku: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          categoryId && categoryId !== "ALL" ? { categoryId } : {},
        ],
      },
      include: {
        category: true,
        unit: true,
        preferredWarehouse: true,
        stockBalances: {
          include: {
            location: {
              include: { warehouse: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = products.map((prod) => {
      const activeBalances = warehouseId && warehouseId !== "ALL"
        ? prod.stockBalances.filter((sb) => sb.location.warehouseId === warehouseId)
        : prod.stockBalances;

      const totalStock = activeBalances.reduce((acc, sb) => acc + sb.quantity, 0);

      let status = "NORMAL";
      if (totalStock === 0) status = "OUT_OF_STOCK";
      else if (totalStock <= prod.reorderLevel) status = "LOW_STOCK";

      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        description: prod.description,
        category: prod.category.name,
        categoryId: prod.categoryId,
        unit: prod.unit.symbol,
        unitName: prod.unit.name,
        reorderLevel: prod.reorderLevel,
        reorderQuantity: prod.reorderQuantity,
        preferredWarehouse: prod.preferredWarehouse ? prod.preferredWarehouse.name : "None assigned",
        preferredWarehouseId: prod.preferredWarehouseId,
        totalStock,
        status,
        balances: prod.stockBalances.map((sb) => ({
          locationId: sb.locationId,
          locationCode: sb.location.code,
          locationName: sb.location.name,
          warehouseName: sb.location.warehouse.name,
          quantity: sb.quantity,
        })),
      };
    });

    const filtered = stockStatus && stockStatus !== "ALL"
      ? mapped.filter((p) => p.status === stockStatus)
      : mapped;

    const [categories, units, warehouses, locations] = await Promise.all([
      prisma.category.findMany(),
      prisma.unit.findMany(),
      prisma.warehouse.findMany(),
      prisma.location.findMany({ include: { warehouse: true } }),
    ]);

    return NextResponse.json({
      products: filtered,
      totalCount: filtered.length,
      lookups: { categories, units, warehouses, locations },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sku,
      name,
      description,
      categoryId,
      unitId,
      reorderLevel = 10,
      reorderQuantity = 50,
      preferredWarehouseId,
      initialStock = 0,
      initialLocationId,
    } = body;

    const cleanSku = sku.toUpperCase().trim();

    const existing = await prisma.product.findUnique({ where: { sku: cleanSku } });
    if (existing) {
      return NextResponse.json({ error: `SKU ${cleanSku} already exists` }, { status: 409 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: cleanSku,
          name: name.trim(),
          description: description?.trim() || null,
          categoryId,
          unitId,
          reorderLevel: parseFloat(reorderLevel) || 10,
          reorderQuantity: parseFloat(reorderQuantity) || 50,
          preferredWarehouseId: preferredWarehouseId || null,
        },
      });

      const initStockNum = parseFloat(initialStock);
      if (initStockNum > 0 && initialLocationId) {
        await tx.stockBalance.create({
          data: {
            productId: product.id,
            locationId: initialLocationId,
            quantity: initStockNum,
          },
        });

        const loc = await tx.location.findUnique({
          where: { id: initialLocationId },
          include: { warehouse: true },
        });

        const adminUser = await tx.user.findFirst();

        await tx.stockLedger.create({
          data: {
            productId: product.id,
            operationType: OperationType.RECEIPT,
            documentRef: `INIT-${cleanSku}`,
            quantityChange: initStockNum,
            previousQuantity: 0,
            newQuantity: initStockNum,
            sourceLocation: "Initial Opening Balance",
            destLocation: loc ? `${loc.warehouse.name} / ${loc.name} (${loc.code})` : "Initial Location",
            reason: "Initial product registration opening stock",
            userId: adminUser?.id || "system",
          },
        });
      }

      return product;
    });

    return NextResponse.json({ message: "Product created", product: result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### 2. `src/app/api/products/[id]/route.ts` (Waterfall 'Why Stock Changed', Health Score & Timeline)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        unit: true,
        preferredWarehouse: true,
        stockBalances: {
          include: {
            location: { include: { warehouse: true } },
          },
        },
        ledgerEntries: {
          orderBy: { timestamp: "desc" },
          take: 30,
          include: {
            user: { select: { name: true, email: true, role: true } },
          },
        },
      },
    });

    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const totalCurrentStock = product.stockBalances.reduce((acc, sb) => acc + sb.quantity, 0);

    const pendingReceiptItems = await prisma.receiptItem.findMany({
      where: { productId: product.id, receipt: { status: { in: ["DRAFT", "WAITING", "READY"] } } },
      select: { quantity: true },
    });
    const incomingStock = pendingReceiptItems.reduce((acc, item) => acc + item.quantity, 0);

    const pendingDeliveryItems = await prisma.deliveryItem.findMany({
      where: { productId: product.id, delivery: { status: { in: ["DRAFT", "WAITING", "READY"] } } },
      select: { quantity: true },
    });
    const outgoingStock = pendingDeliveryItems.reduce((acc, item) => acc + item.quantity, 0);
    const availableStock = Math.max(0, totalCurrentStock - outgoingStock);

    const allLedger = await prisma.stockLedger.findMany({
      where: { productId: product.id },
      orderBy: { timestamp: "asc" },
    });

    let initialStock = 0;
    let totalReceived = 0;
    let totalDelivered = 0;
    let totalAdjustments = 0;
    let totalTransfers = 0;

    allLedger.forEach((entry) => {
      if (entry.documentRef.startsWith("INIT-")) initialStock += entry.quantityChange;
      else if (entry.operationType === "RECEIPT") totalReceived += entry.quantityChange;
      else if (entry.operationType === "DELIVERY") totalDelivered += Math.abs(entry.quantityChange);
      else if (entry.operationType === "ADJUSTMENT") totalAdjustments += entry.quantityChange;
      else if (entry.operationType === "TRANSFER_IN" || entry.operationType === "TRANSFER_OUT") totalTransfers += entry.quantityChange;
    });

    const whyStockChanged = {
      initialStock,
      totalReceived,
      totalDelivered,
      totalAdjustments,
      totalTransfers,
      calculatedCurrent: initialStock + totalReceived - totalDelivered + totalAdjustments,
      ledgerEntriesCount: allLedger.length,
      formula: `Starting (${initialStock}) + Received (+${totalReceived}) - Delivered (-${totalDelivered}) ${
        totalAdjustments >= 0 ? `+ Adjusted (+${totalAdjustments})` : `- Adjusted (${totalAdjustments})`
      } = ${totalCurrentStock} ${product.unit.symbol}`,
    };

    let healthScore = 100;
    const healthSignals: string[] = [];

    if (totalCurrentStock === 0) {
      healthScore -= 50;
      healthSignals.push("Critical: Item is completely out of stock.");
    } else if (totalCurrentStock <= product.reorderLevel) {
      healthScore -= 30;
      healthSignals.push(`Low stock warning: Current ${totalCurrentStock} is below reorder threshold of ${product.reorderLevel}.`);
    } else {
      healthSignals.push("Healthy stock levels maintained relative to reorder minimum.");
    }

    healthScore = Math.max(0, Math.min(100, healthScore));
    let healthGrade = healthScore >= 80 ? "Excellent" : healthScore >= 50 ? "Moderate Risk" : "Critical";

    const deliveryEntries = allLedger.filter((l) => l.operationType === "DELIVERY");
    let avgDailyUsage = 0;
    let daysOfCoverage: string | number = "N/A";
    let reorderRecommendation = "Stock levels are optimal.";

    if (deliveryEntries.length > 0) {
      const totalOutflow = deliveryEntries.reduce((acc, d) => acc + Math.abs(d.quantityChange), 0);
      avgDailyUsage = Math.round((totalOutflow / 7) * 10) / 10 || 5;
      daysOfCoverage = Math.round((totalCurrentStock / avgDailyUsage) * 10) / 10;
      if (totalCurrentStock <= product.reorderLevel) {
        reorderRecommendation = `Replenish ${product.reorderQuantity} ${product.unit.symbol} promptly. Estimated ~${daysOfCoverage} days of stock remaining.`;
      }
    } else {
      daysOfCoverage = totalCurrentStock > 0 ? "> 30 days" : "0 days";
      if (totalCurrentStock <= product.reorderLevel) {
        reorderRecommendation = `Replenish ${product.reorderQuantity} ${product.unit.symbol} to meet safety buffer.`;
      }
    }

    return NextResponse.json({
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        category: product.category.name,
        unit: product.unit.symbol,
        unitName: product.unit.name,
        reorderLevel: product.reorderLevel,
        reorderQuantity: product.reorderQuantity,
        preferredWarehouse: product.preferredWarehouse?.name || "Unassigned",
        status: totalCurrentStock === 0 ? "OUT_OF_STOCK" : totalCurrentStock <= product.reorderLevel ? "LOW_STOCK" : "NORMAL",
        totalCurrentStock,
        availableStock,
        incomingStock,
        outgoingStock,
        stockBalances: product.stockBalances.map((sb) => ({
          locationId: sb.locationId,
          code: sb.location.code,
          name: sb.location.name,
          type: sb.location.type,
          warehouseName: sb.location.warehouse.name,
          quantity: sb.quantity,
        })),
        whyStockChanged,
        health: { score: healthScore, grade: healthGrade, signals: healthSignals },
        reorderInsight: {
          avgDailyUsage: `${avgDailyUsage} ${product.unit.symbol}/day`,
          daysOfCoverage: typeof daysOfCoverage === "number" ? `~${daysOfCoverage} days` : daysOfCoverage,
          recommendedAction: reorderRecommendation,
        },
        timeline: product.ledgerEntries.map((l) => ({
          id: l.id,
          timestamp: l.timestamp.toISOString(),
          operationType: l.operationType,
          documentRef: l.documentRef,
          quantityChange: l.quantityChange,
          newQuantity: l.newQuantity,
          sourceLocation: l.sourceLocation,
          destLocation: l.destLocation,
          reason: l.reason,
          performedBy: l.user.name,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```
