# STOCKSENSE — MODULE 6 / CHECKPOINT 6 CODE SUBMISSION
## Internal Facility Transfers, Dual-Location Rebalancing & Zero-Loss Inventory Conservation

This file consolidates all code developed for **Module 6 (Checkpoint 6)** of StockSense.

---

### 1. `src/app/api/operations/transfers/route.ts` (List Transfers & Creation Endpoint)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const transfers = await prisma.transfer.findMany({
      where: status && status !== "ALL" ? { status: status as DocumentStatus } : undefined,
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { include: { unit: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = transfers.map((t) => ({
      id: t.id,
      transferNumber: t.transferNumber,
      sourceWarehouseName: t.sourceWarehouse.name,
      sourceLocationName: `${t.sourceLocation.name} (${t.sourceLocation.code})`,
      destWarehouseName: t.destWarehouse.name,
      destLocationName: `${t.destLocation.name} (${t.destLocation.code})`,
      status: t.status,
      createdByName: t.createdBy.name,
      itemCount: t.items.length,
      totalQuantity: t.items.reduce((acc, it) => acc + it.quantity, 0),
      items: t.items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product.name,
        sku: it.product.sku,
        quantity: it.quantity,
        unit: it.product.unit.symbol,
      })),
      createdAt: t.createdAt.toISOString(),
      validatedAt: t.validatedAt ? t.validatedAt.toISOString() : null,
    }));

    const [warehouses, locations, products] = await Promise.all([
      prisma.warehouse.findMany(),
      prisma.location.findMany({
        include: {
          warehouse: true,
          stockBalances: {
            include: { product: { include: { unit: true } } },
          },
        },
      }),
      prisma.product.findMany({ include: { unit: true } }),
    ]);

    return NextResponse.json({
      transfers: mapped,
      lookups: {
        warehouses,
        locations: locations.map((loc) => ({
          id: loc.id,
          code: loc.code,
          name: loc.name,
          warehouseId: loc.warehouseId,
          warehouseName: loc.warehouse.name,
          balances: loc.stockBalances.map((sb) => ({
            productId: sb.productId,
            productName: sb.product.name,
            sku: sb.product.sku,
            quantity: sb.quantity,
            unit: sb.product.unit.symbol,
          })),
        })),
        products: products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit.symbol,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceWarehouseId, sourceLocationId, destWarehouseId, destLocationId, items, status = "WAITING" } = body;

    if (!sourceWarehouseId || !sourceLocationId || !destWarehouseId || !destLocationId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Source, destination, and items required" }, { status: 400 });
    }

    if (sourceLocationId === destLocationId) {
      return NextResponse.json({ error: "Source and destination location cannot be identical" }, { status: 400 });
    }

    const count = await prisma.transfer.count();
    const transferNumber = `TRF-2026-${String(count + 1).padStart(4, "0")}`;
    const user = await prisma.user.findFirst();

    const transfer = await prisma.transfer.create({
      data: {
        transferNumber,
        sourceWarehouseId,
        sourceLocationId,
        destWarehouseId,
        destLocationId,
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
      },
    });

    return NextResponse.json({ message: "Transfer order created successfully", transfer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### 2. `src/app/api/operations/transfers/[id]/route.ts` (Atomic Dual-Balance Rebalance & Zero Total Impact)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus, OperationType } from "@prisma/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: {
              include: {
                unit: true,
                stockBalances: { include: { location: { include: { warehouse: true } } } },
              },
            },
          },
        },
      },
    });

    if (!transfer) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });

    const itemsMapped = transfer.items.map((it) => {
      const sourceBalance = it.product.stockBalances.find((sb) => sb.locationId === transfer.sourceLocationId);
      const availableAtSource = sourceBalance ? sourceBalance.quantity : 0;
      return {
        id: it.id,
        productId: it.productId,
        productName: it.product.name,
        sku: it.product.sku,
        quantity: it.quantity,
        unit: it.product.unit.symbol,
        availableAtSource,
        hasSufficientStock: availableAtSource >= it.quantity,
      };
    });

    return NextResponse.json({
      transfer: { ...transfer, items: itemsMapped, isAllSufficient: itemsMapped.every((it) => it.hasSufficientStock) },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action } = body;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
        items: { include: { product: { include: { unit: true } } } },
      },
    });

    if (!transfer) return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    if (transfer.status === DocumentStatus.DONE) {
      return NextResponse.json({ error: "Transfer already completed" }, { status: 400 });
    }

    if (action === "VALIDATE") {
      const adminUser = await prisma.user.findFirst();
      const sourceString = `${transfer.sourceWarehouse.name} / ${transfer.sourceLocation.name} (${transfer.sourceLocation.code})`;
      const destString = `${transfer.destWarehouse.name} / ${transfer.destLocation.name} (${transfer.destLocation.code})`;

      const result = await prisma.$transaction(async (tx) => {
        let totalMoved = 0;

        for (const item of transfer.items) {
          // 1. Check source balance
          const sourceBal = await tx.stockBalance.findUnique({
            where: { productId_locationId: { productId: item.productId, locationId: transfer.sourceLocationId } },
          });

          const currentSourceQty = sourceBal ? sourceBal.quantity : 0;
          if (currentSourceQty < item.quantity) {
            throw new Error(`Insufficient stock at source location. Available: ${currentSourceQty}. Requested: ${item.quantity}.`);
          }

          // 2. Decrement source location
          await tx.stockBalance.update({
            where: { id: sourceBal!.id },
            data: { quantity: currentSourceQty - item.quantity },
          });

          // 3. Increment destination location
          const destBal = await tx.stockBalance.findUnique({
            where: { productId_locationId: { productId: item.productId, locationId: transfer.destLocationId } },
          });

          const currentDestQty = destBal ? destBal.quantity : 0;
          if (destBal) {
            await tx.stockBalance.update({
              where: { id: destBal.id },
              data: { quantity: currentDestQty + item.quantity },
            });
          } else {
            await tx.stockBalance.create({
              data: { productId: item.productId, locationId: transfer.destLocationId, quantity: item.quantity },
            });
          }

          const allBalances = await tx.stockBalance.findMany({ where: { productId: item.productId } });
          const totalCompanyStock = allBalances.reduce((acc, b) => acc + b.quantity, 0);

          // 4. Traceable dual-movement ledger logging
          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              operationType: OperationType.TRANSFER_OUT,
              documentRef: transfer.transferNumber,
              quantityChange: -item.quantity,
              previousQuantity: totalCompanyStock,
              newQuantity: totalCompanyStock,
              sourceLocation: sourceString,
              destLocation: destString,
              reason: `Internal transfer dispatch`,
              userId: adminUser?.id || "system",
            },
          });

          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              operationType: OperationType.TRANSFER_IN,
              documentRef: transfer.transferNumber,
              quantityChange: item.quantity,
              previousQuantity: totalCompanyStock,
              newQuantity: totalCompanyStock,
              sourceLocation: sourceString,
              destLocation: destString,
              reason: `Internal transfer receiving`,
              userId: adminUser?.id || "system",
            },
          });

          totalMoved += item.quantity;
        }

        const updatedTransfer = await tx.transfer.update({
          where: { id: transfer.id },
          data: { status: DocumentStatus.DONE, validatedAt: new Date() },
        });

        await tx.notification.create({
          data: {
            type: "TRANSFER_COMPLETED",
            title: `Transfer ${transfer.transferNumber} Completed`,
            message: `Relocated ${totalMoved} unit(s) from ${transfer.sourceWarehouse.name} to ${transfer.destWarehouse.name}. Total company stock preserved.`,
            userId: adminUser?.id,
          },
        });

        return updatedTransfer;
      });

      return NextResponse.json({
        message: `Transfer ${transfer.transferNumber} validated! Relocated inventory between locations with zero change to total company stock.`,
        transfer: result,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```
