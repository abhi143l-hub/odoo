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

    // Lookups for creation form: products with active balances
    const productsWithBalances = await prisma.product.findMany({
      include: {
        unit: true,
        stockBalances: {
          include: {
            location: { include: { warehouse: true } },
          },
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
      return NextResponse.json(
        { error: "Product, location, physical counted quantity, and adjustment reason are required" },
        { status: 400 }
      );
    }

    const countedQty = parseFloat(physicalQuantity);
    if (isNaN(countedQty) || countedQty < 0) {
      return NextResponse.json(
        { error: "Physical counted quantity must be a non-negative number" },
        { status: 400 }
      );
    }

    const adminUser = await prisma.user.findFirst();

    // ATOMIC ADJUSTMENT TRANSACTION
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current balance
      let balance = await tx.stockBalance.findUnique({
        where: {
          productId_locationId: { productId, locationId },
        },
        include: {
          product: { include: { unit: true } },
          location: { include: { warehouse: true } },
        },
      });

      const systemQty = balance ? balance.quantity : 0;
      const difference = countedQty - systemQty;

      // 2. Update or create balance with physical count
      if (balance) {
        await tx.stockBalance.update({
          where: { id: balance.id },
          data: { quantity: countedQty },
        });
      } else {
        balance = await tx.stockBalance.create({
          data: {
            productId,
            locationId,
            quantity: countedQty,
          },
          include: {
            product: { include: { unit: true } },
            location: { include: { warehouse: true } },
          },
        });
      }

      // 3. Generate sequential adjustment document reference
      const count = await tx.stockAdjustment.count();
      const adjustmentNumber = `ADJ-2026-${String(count + 1).padStart(4, "0")}`;

      // 4. Create StockAdjustment record
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

      // 5. Total product stock across all locations
      const allProductBalances = await tx.stockBalance.findMany({
        where: { productId },
      });
      const newTotalProductStock = allProductBalances.reduce((sum, b) => sum + b.quantity, 0);

      const locationString = `${balance.location.warehouse.name} / ${balance.location.name} (${balance.location.code})`;

      // 6. Create Immutable StockLedger Entry
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

      // 7. System notification if discrepancy exists
      if (difference !== 0) {
        await tx.notification.create({
          data: {
            type: "STOCK_ADJUSTMENT",
            title: `Stock Adjustment ${adjustmentNumber} Recorded`,
            message: `Reconciled ${balance.product.name} at ${locationString}. Variance: ${difference > 0 ? `+${difference}` : difference} ${balance.product.unit.symbol} (${reason}).`,
            userId: adminUser?.id,
          },
        });
      }

      return {
        adjustment: adjustmentRecord,
        difference,
        systemQuantity: systemQty,
        physicalQuantity: countedQty,
      };
    });

    return NextResponse.json({
      message: `Stock reconciliation successfully applied. Difference of ${
        result.difference >= 0 ? `+${result.difference}` : result.difference
      } units permanently recorded in Stock Ledger.`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
