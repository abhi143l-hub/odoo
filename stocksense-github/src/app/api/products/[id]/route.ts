import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
            location: {
              include: { warehouse: true },
            },
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

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 1. Current stock by location
    const totalCurrentStock = product.stockBalances.reduce((acc, sb) => acc + sb.quantity, 0);

    // 2. Calculate Incoming (Pending Receipts)
    const pendingReceiptItems = await prisma.receiptItem.findMany({
      where: {
        productId: product.id,
        receipt: {
          status: { in: ["DRAFT", "WAITING", "READY"] },
        },
      },
      select: { quantity: true },
    });
    const incomingStock = pendingReceiptItems.reduce((acc, item) => acc + item.quantity, 0);

    // 3. Calculate Outgoing (Pending Deliveries)
    const pendingDeliveryItems = await prisma.deliveryItem.findMany({
      where: {
        productId: product.id,
        delivery: {
          status: { in: ["DRAFT", "WAITING", "READY"] },
        },
      },
      select: { quantity: true },
    });
    const outgoingStock = pendingDeliveryItems.reduce((acc, item) => acc + item.quantity, 0);

    // Available stock = Current - Outgoing (cannot deliver stock already committed to pending orders)
    const availableStock = Math.max(0, totalCurrentStock - outgoingStock);

    // 4. SIGNATURE FEATURE: "Why Did Stock Change?" Waterfall Calculation
    // Aggregate all historical ledger entries for this product
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
      if (entry.documentRef.startsWith("INIT-")) {
        initialStock += entry.quantityChange;
      } else if (entry.operationType === "RECEIPT") {
        totalReceived += entry.quantityChange;
      } else if (entry.operationType === "DELIVERY") {
        totalDelivered += Math.abs(entry.quantityChange);
      } else if (entry.operationType === "ADJUSTMENT") {
        totalAdjustments += entry.quantityChange; // Can be positive or negative
      } else if (entry.operationType === "TRANSFER_IN" || entry.operationType === "TRANSFER_OUT") {
        totalTransfers += entry.quantityChange;
      }
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

    // 5. SIGNATURE FEATURE: Explainable Inventory Health Score
    let healthScore = 100;
    const healthSignals: string[] = [];

    // Factor A: Stock vs Reorder Level
    if (totalCurrentStock === 0) {
      healthScore -= 50;
      healthSignals.push("Critical: Item is completely out of stock.");
    } else if (totalCurrentStock <= product.reorderLevel) {
      healthScore -= 30;
      healthSignals.push(`Low stock warning: Current ${totalCurrentStock} is below reorder threshold of ${product.reorderLevel}.`);
    } else if (totalCurrentStock > product.reorderLevel * 4) {
      healthScore -= 10;
      healthSignals.push(`Overstock caution: Current stock is over 4x the reorder threshold.`);
    } else {
      healthSignals.push("Healthy stock levels maintained relative to reorder minimum.");
    }

    // Factor B: Adjustments / Discrepancies
    const recentDiscrepancies = allLedger.filter((l) => l.operationType === "ADJUSTMENT").length;
    if (recentDiscrepancies > 2) {
      healthScore -= 15;
      healthSignals.push(`Frequent physical count discrepancies (${recentDiscrepancies} recorded).`);
    }

    // Factor C: Incoming replenishment status
    if (totalCurrentStock <= product.reorderLevel && incomingStock > 0) {
      healthScore += 10;
      healthSignals.push(`Inbound replenishment of ${incomingStock} ${product.unit.symbol} is already scheduled.`);
    }

    healthScore = Math.max(0, Math.min(100, healthScore));
    let healthGrade = "Excellent";
    if (healthScore < 50) healthGrade = "Critical";
    else if (healthScore < 75) healthGrade = "Moderate Risk";
    else if (healthScore < 90) healthGrade = "Good";

    // 6. SIGNATURE FEATURE: Smart Reorder Insights
    // Calculate average daily usage based on past deliveries
    const deliveryEntries = allLedger.filter((l) => l.operationType === "DELIVERY");
    let avgDailyUsage = 0;
    let daysOfCoverage: string | number = "N/A";
    let reorderRecommendation = "Stock levels are optimal.";

    if (deliveryEntries.length > 0) {
      const totalOutflow = deliveryEntries.reduce((acc, d) => acc + Math.abs(d.quantityChange), 0);
      avgDailyUsage = Math.round((totalOutflow / 7) * 10) / 10 || 5; // 7-day normalized
      daysOfCoverage = Math.round((totalCurrentStock / avgDailyUsage) * 10) / 10;

      if (totalCurrentStock <= product.reorderLevel) {
        reorderRecommendation = `Replenish ${product.reorderQuantity} ${product.unit.symbol} promptly. Estimated ~${daysOfCoverage} days of stock remaining at current consumption.`;
      }
    } else {
      daysOfCoverage = totalCurrentStock > 0 ? "> 30 days" : "0 days";
      if (totalCurrentStock <= product.reorderLevel) {
        reorderRecommendation = `Replenish ${product.reorderQuantity} ${product.unit.symbol} to meet minimum safety buffer.`;
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
          warehouseCode: sb.location.warehouse.code,
          quantity: sb.quantity,
        })),
        whyStockChanged,
        health: {
          score: healthScore,
          grade: healthGrade,
          signals: healthSignals,
        },
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
          previousQuantity: l.previousQuantity,
          newQuantity: l.newQuantity,
          sourceLocation: l.sourceLocation,
          destLocation: l.destLocation,
          reason: l.reason,
          performedBy: l.user.name,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch product details" },
      { status: 500 }
    );
  }
}
