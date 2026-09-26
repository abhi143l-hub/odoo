# STOCKSENSE — MODULE 4 / CHECKPOINT 4 CODE SUBMISSION
## Inbound Receipts Workflow, Multi-Item Procurement & Atomic Stock Validation

This file consolidates all code developed for **Module 4 (Checkpoint 4)** of StockSense.

---

### 1. `src/app/api/operations/receipts/route.ts` (List Receipts & Create Inbound Orders)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const receipts = await prisma.receipt.findMany({
      where: status && status !== "ALL" ? { status: status as DocumentStatus } : undefined,
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { include: { unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const locations = await prisma.location.findMany({ include: { warehouse: true } });
    const locationMap = new Map(locations.map((l) => [l.id, `${l.warehouse.name} / ${l.name} (${l.code})`]));

    const mapped = receipts.map((r) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      supplierName: r.supplier.name,
      supplierCode: r.supplier.code,
      destinationLocation: locationMap.get(r.destinationLocationId) || "Unknown Destination",
      destinationLocationId: r.destinationLocationId,
      status: r.status,
      notes: r.notes,
      createdByName: r.createdBy.name,
      itemCount: r.items.length,
      totalQuantity: r.items.reduce((acc, it) => acc + it.quantity, 0),
      items: r.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product.name,
        sku: it.product.sku,
        quantity: it.quantity,
        unit: it.product.unit.symbol,
      })),
      createdAt: r.createdAt.toISOString(),
      validatedAt: r.validatedAt ? r.validatedAt.toISOString() : null,
    }));

    const [suppliersList, productsList] = await Promise.all([
      prisma.supplier.findMany(),
      prisma.product.findMany({ include: { unit: true } }),
    ]);

    return NextResponse.json({
      receipts: mapped,
      lookups: {
        suppliers: suppliersList,
        products: productsList.map((p) => ({ id: p.id, sku: p.sku, name: p.name, unit: p.unit.symbol })),
        locations: locations.map((l) => ({ id: l.id, name: `${l.warehouse.name} — ${l.name} (${l.code})` })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplierId, destinationLocationId, notes, items, status = "WAITING" } = body;

    if (!supplierId || !destinationLocationId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Supplier, destination location, and items required" }, { status: 400 });
    }

    const count = await prisma.receipt.count();
    const receiptNumber = `REC-2026-${String(count + 1).padStart(4, "0")}`;
    const user = await prisma.user.findFirst();

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        supplierId,
        destinationLocationId,
        notes: notes?.trim() || null,
        status: status as DocumentStatus,
        createdById: user?.id || "system",
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity) || 1,
          })),
        },
      },
      include: {
        items: { include: { product: { include: { unit: true } } } },
        supplier: true,
      },
    });

    return NextResponse.json({ message: "Receipt created successfully", receipt }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### 2. `src/app/api/operations/receipts/[id]/route.ts` (Atomic Stock Increment & Ledger Logging)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus, OperationType } from "@prisma/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: { include: { product: { include: { unit: true, category: true } } } },
      },
    });
    if (!receipt) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });

    const location = await prisma.location.findUnique({
      where: { id: receipt.destinationLocationId },
      include: { warehouse: true },
    });

    return NextResponse.json({
      receipt: {
        ...receipt,
        destinationLocationName: location ? `${location.warehouse.name} / ${location.name} (${location.code})` : "Unknown Location",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, status } = body;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: { include: { unit: true } } } },
      },
    });

    if (!receipt) return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    if (receipt.status === DocumentStatus.DONE) {
      return NextResponse.json({ error: "Cannot modify or re-validate a receipt that is already marked as DONE." }, { status: 400 });
    }

    if (action === "VALIDATE") {
      const destinationLoc = await prisma.location.findUnique({
        where: { id: receipt.destinationLocationId },
        include: { warehouse: true },
      });
      const destString = destinationLoc ? `${destinationLoc.warehouse.name} / ${destinationLoc.name} (${destinationLoc.code})` : "Storage Location";
      const adminUser = await prisma.user.findFirst();

      const validationResult = await prisma.$transaction(async (tx) => {
        let totalItemsReceived = 0;

        for (const item of receipt.items) {
          // Increment StockBalance at destination location
          const balance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: { productId: item.productId, locationId: receipt.destinationLocationId },
            },
          });

          const previousLocQty = balance ? balance.quantity : 0;
          const newLocQty = previousLocQty + item.quantity;

          if (balance) {
            await tx.stockBalance.update({ where: { id: balance.id }, data: { quantity: newLocQty } });
          } else {
            await tx.stockBalance.create({
              data: { productId: item.productId, locationId: receipt.destinationLocationId, quantity: newLocQty },
            });
          }

          const allProductBalances = await tx.stockBalance.findMany({ where: { productId: item.productId } });
          const currentTotalProductStock = allProductBalances.reduce((sum, b) => sum + b.quantity, 0);

          // Create Immutable StockLedger Entry
          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              operationType: OperationType.RECEIPT,
              documentRef: receipt.receiptNumber,
              quantityChange: item.quantity,
              previousQuantity: currentTotalProductStock - item.quantity,
              newQuantity: currentTotalProductStock,
              sourceLocation: `Vendor: ${receipt.supplier.name} (${receipt.supplier.code})`,
              destLocation: destString,
              reason: `Inbound shipment received and physically shelved`,
              userId: adminUser?.id || "system",
            },
          });

          totalItemsReceived += item.quantity;
        }

        const updatedReceipt = await tx.receipt.update({
          where: { id: receipt.id },
          data: { status: DocumentStatus.DONE, validatedAt: new Date() },
        });

        await tx.notification.create({
          data: {
            type: "RECEIPT_VALIDATED",
            title: `Receipt ${receipt.receiptNumber} Validated`,
            message: `Successfully received and shelved ${totalItemsReceived} unit(s) into ${destString}.`,
            userId: adminUser?.id,
          },
        });

        return updatedReceipt;
      });

      return NextResponse.json({
        message: `Receipt ${receipt.receiptNumber} successfully validated and inventory updated!`,
        receipt: validationResult,
      });
    }

    if (status) {
      const updated = await prisma.receipt.update({ where: { id }, data: { status: status as DocumentStatus } });
      return NextResponse.json({ message: "Receipt status updated", receipt: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```
