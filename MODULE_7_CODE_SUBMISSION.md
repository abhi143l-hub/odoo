# STOCKSENSE — MODULE 7 / CHECKPOINT 7 CODE SUBMISSION
## Physical Stock Adjustments, Reason Coding & Complete Immutable Stock Ledger

This file consolidates all code developed for **Module 7 (Checkpoint 7)** of StockSense.

---

### 1. `src/app/api/operations/adjustments/route.ts` (Physical Reconciliation & Variance Engine)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AdjustmentReason, OperationType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const adjustments = await prisma.stockAdjustment.findMany({
      include: {
        product: { include: { unit: true } },
        location: { include: { warehouse: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = adjustments.map((a) => ({
      id: a.id,
      adjustmentNumber: a.adjustmentNumber,
      productName: a.product.name,
      sku: a.product.sku,
      unit: a.product.unit.symbol,
      locationName: `${a.location.warehouse.name} / ${a.location.name} (${a.location.code})`,
      locationId: a.locationId,
      systemQuantity: a.systemQuantity,
      physicalQuantity: a.physicalQuantity,
      difference: a.difference,
      reason: a.reason,
      notes: a.notes,
      performedBy: a.createdBy.name,
      createdAt: a.createdAt.toISOString(),
    }));

    const productsWithBalances = await prisma.product.findMany({
      include: {
        unit: true,
        stockBalances: {
          include: { location: { include: { warehouse: true } } },
        },
      },
    });

    return NextResponse.json({
      adjustments: mapped,
      lookups: {
        products: productsWithBalances.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit.symbol,
          locations: p.stockBalances.map((sb) => ({
            locationId: sb.locationId,
            locationName: `${sb.location.warehouse.name} / ${sb.location.name} (${sb.location.code})`,
            currentQuantity: sb.quantity,
          })),
        })),
        reasons: Object.values(AdjustmentReason),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, locationId, physicalQuantity, reason, notes } = body;

    if (!productId || !locationId || physicalQuantity === undefined || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const countedQty = parseFloat(physicalQuantity);
    const adminUser = await prisma.user.findFirst();

    const result = await prisma.$transaction(async (tx) => {
      let balance = await tx.stockBalance.findUnique({
        where: { productId_locationId: { productId, locationId } },
        include: { product: { include: { unit: true } }, location: { include: { warehouse: true } } },
      });

      const systemQty = balance ? balance.quantity : 0;
      const difference = countedQty - systemQty;

      if (balance) {
        await tx.stockBalance.update({ where: { id: balance.id }, data: { quantity: countedQty } });
      } else {
        balance = await tx.stockBalance.create({
          data: { productId, locationId, quantity: countedQty },
          include: { product: { include: { unit: true } }, location: { include: { warehouse: true } } },
        });
      }

      const count = await tx.stockAdjustment.count();
      const adjustmentNumber = `ADJ-2026-${String(count + 1).padStart(4, "0")}`;

      const adjustmentRecord = await tx.stockAdjustment.create({
        data: {
          adjustmentNumber,
          productId,
          locationId,
          systemQuantity: systemQty,
          physicalQuantity: countedQty,
          difference,
          reason: reason as AdjustmentReason,
          notes: notes?.trim() || null,
          createdById: adminUser?.id || "system",
        },
      });

      const allProductBalances = await tx.stockBalance.findMany({ where: { productId } });
      const newTotalProductStock = allProductBalances.reduce((sum, b) => sum + b.quantity, 0);
      const locationString = `${balance.location.warehouse.name} / ${balance.location.name} (${balance.location.code})`;

      // Create Immutable StockLedger Entry
      await tx.stockLedger.create({
        data: {
          productId,
          operationType: OperationType.ADJUSTMENT,
          documentRef: adjustmentNumber,
          quantityChange: difference,
          previousQuantity: newTotalProductStock - difference,
          newQuantity: newTotalProductStock,
          sourceLocation: locationString,
          destLocation: difference < 0 ? `Adjustment: Discrepancy (${reason})` : locationString,
          reason: `Physical count variance reconciliation: ${reason}${notes ? ` - ${notes}` : ""}`,
          userId: adminUser?.id || "system",
        },
      });

      return { adjustment: adjustmentRecord, difference, systemQuantity: systemQty, physicalQuantity: countedQty };
    });

    return NextResponse.json({
      message: `Stock reconciliation successfully applied. Difference of ${result.difference} recorded in Stock Ledger.`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### 2. `src/app/api/ledger/route.ts` (Complete Audit Ledger Trail)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OperationType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();
    const operationType = searchParams.get("operationType");
    const productId = searchParams.get("productId");

    const entries = await prisma.stockLedger.findMany({
      where: {
        AND: [
          operationType && operationType !== "ALL" ? { operationType: operationType as OperationType } : {},
          productId && productId !== "ALL" ? { productId } : {},
          query
            ? {
                OR: [
                  { documentRef: { contains: query, mode: "insensitive" } },
                  { reason: { contains: query, mode: "insensitive" } },
                  { sourceLocation: { contains: query, mode: "insensitive" } },
                  { destLocation: { contains: query, mode: "insensitive" } },
                  { product: { name: { contains: query, mode: "insensitive" } } },
                  { product: { sku: { contains: query, mode: "insensitive" } } },
                ],
              }
            : {},
        ],
      },
      include: {
        product: { include: { unit: true, category: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { timestamp: "desc" },
    });

    const mapped = entries.map((e) => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      productId: e.productId,
      productName: e.product.name,
      sku: e.product.sku,
      unit: e.product.unit.symbol,
      category: e.product.category.name,
      operationType: e.operationType,
      documentRef: e.documentRef,
      quantityChange: e.quantityChange,
      previousQuantity: e.previousQuantity,
      newQuantity: e.newQuantity,
      sourceLocation: e.sourceLocation || "N/A",
      destLocation: e.destLocation || "N/A",
      reason: e.reason || "Operational Transaction",
      performedBy: e.user.name,
      userRole: e.user.role,
    }));

    return NextResponse.json({ ledger: mapped, totalCount: mapped.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```
