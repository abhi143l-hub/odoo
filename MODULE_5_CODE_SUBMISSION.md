# STOCKSENSE — MODULE 5 / CHECKPOINT 5 CODE SUBMISSION
## Outgoing Delivery Orders, Picking & Packing Workflow, Overdraft Protection & Atomic Stock Reduction

This file consolidates all code developed for **Module 5 (Checkpoint 5)** of StockSense.

---

### 1. `src/app/api/operations/deliveries/route.ts` (List Deliveries & Order Creation)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const deliveries = await prisma.delivery.findMany({
      where: status && status !== "ALL" ? { status: status as DocumentStatus } : undefined,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: {
              include: {
                unit: true,
                stockBalances: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = deliveries.map((d) => ({
      id: d.id,
      deliveryNumber: d.deliveryNumber,
      customerName: d.customerName,
      status: d.status,
      picked: d.picked,
      packed: d.packed,
      notes: d.notes,
      createdByName: d.createdBy.name,
      itemCount: d.items.length,
      totalQuantity: d.items.reduce((acc, it) => acc + it.quantity, 0),
      items: d.items.map((it) => {
        const totalCurrentStock = it.product.stockBalances.reduce((sum, sb) => sum + sb.quantity, 0);
        return {
          id: it.id,
          productId: it.productId,
          productName: it.product.name,
          sku: it.product.sku,
          quantity: it.quantity,
          unit: it.product.unit.symbol,
          availableStock: totalCurrentStock,
          hasSufficientStock: totalCurrentStock >= it.quantity,
        };
      }),
      createdAt: d.createdAt.toISOString(),
      validatedAt: d.validatedAt ? d.validatedAt.toISOString() : null,
    }));

    const productsList = await prisma.product.findMany({
      include: {
        unit: true,
        stockBalances: {
          include: { location: { include: { warehouse: true } } },
        },
      },
    });

    return NextResponse.json({
      deliveries: mapped,
      lookups: {
        products: productsList.map((p) => {
          const totalStock = p.stockBalances.reduce((acc, sb) => acc + sb.quantity, 0);
          return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit.symbol,
            totalStock,
            locations: p.stockBalances.map((sb) => ({
              locationId: sb.locationId,
              name: `${sb.location.warehouse.name} / ${sb.location.name} (${sb.location.code})`,
              quantity: sb.quantity,
            })),
          };
        }),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, notes, items, status = "WAITING" } = body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Customer name and line items required" }, { status: 400 });
    }

    const count = await prisma.delivery.count();
    const deliveryNumber = `DEL-2026-${String(count + 1).padStart(4, "0")}`;
    const user = await prisma.user.findFirst();

    const delivery = await prisma.delivery.create({
      data: {
        deliveryNumber,
        customerName: customerName.trim(),
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
      },
    });

    return NextResponse.json({ message: "Delivery order created successfully", delivery }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### 2. `src/app/api/operations/deliveries/[id]/route.ts` (Atomic Stock Deduction & Overdraft Protection)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus, OperationType } from "@prisma/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: {
              include: {
                unit: true,
                category: true,
                stockBalances: { include: { location: { include: { warehouse: true } } } },
              },
            },
          },
        },
      },
    });

    if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });

    const itemsMapped = delivery.items.map((it) => {
      const totalStock = it.product.stockBalances.reduce((sum, sb) => sum + sb.quantity, 0);
      return {
        id: it.id,
        productId: it.productId,
        productName: it.product.name,
        sku: it.product.sku,
        quantity: it.quantity,
        unit: it.product.unit.symbol,
        category: it.product.category.name,
        availableStock: totalStock,
        hasSufficientStock: totalStock >= it.quantity,
        locations: it.product.stockBalances.map((sb) => ({
          locationName: `${sb.location.warehouse.name} / ${sb.location.name} (${sb.location.code})`,
          quantity: sb.quantity,
        })),
      };
    });

    return NextResponse.json({
      delivery: {
        ...delivery,
        items: itemsMapped,
        isAllSufficient: itemsMapped.every((it) => it.hasSufficientStock),
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

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: {
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

    if (!delivery) return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    if (delivery.status === DocumentStatus.DONE) {
      return NextResponse.json({ error: "Cannot modify completed delivery" }, { status: 400 });
    }

    if (action === "PICK") {
      const updated = await prisma.delivery.update({ where: { id }, data: { picked: true, status: DocumentStatus.READY } });
      return NextResponse.json({ message: "Items picked", delivery: updated });
    }

    if (action === "PACK") {
      const updated = await prisma.delivery.update({ where: { id }, data: { packed: true } });
      return NextResponse.json({ message: "Items packed", delivery: updated });
    }

    if (action === "VALIDATE") {
      const adminUser = await prisma.user.findFirst();

      const validationResult = await prisma.$transaction(async (tx) => {
        let totalShipped = 0;

        for (const item of delivery.items) {
          const balances = await tx.stockBalance.findMany({
            where: { productId: item.productId },
            include: { location: { include: { warehouse: true } } },
            orderBy: { quantity: "desc" },
          });

          const totalStock = balances.reduce((sum, b) => sum + b.quantity, 0);

          // OVERDRAFT PROTECTION: Strictly prevent negative stock
          if (totalStock < item.quantity) {
            throw new Error(
              `Unable to complete this delivery. Available stock for ${item.product.name}: ${totalStock} ${item.product.unit.symbol}. Requested quantity: ${item.quantity} ${item.product.unit.symbol}. Please reduce the quantity or review inventory.`
            );
          }

          let remainingToDeduct = item.quantity;
          let sourceLocationName = "";

          for (const bal of balances) {
            if (remainingToDeduct <= 0) break;
            const deductFromThis = Math.min(bal.quantity, remainingToDeduct);
            await tx.stockBalance.update({ where: { id: bal.id }, data: { quantity: bal.quantity - deductFromThis } });
            remainingToDeduct -= deductFromThis;
            sourceLocationName = `${bal.location.warehouse.name} / ${bal.location.name} (${bal.location.code})`;
          }

          const allProductBalances = await tx.stockBalance.findMany({ where: { productId: item.productId } });
          const newTotalStock = allProductBalances.reduce((sum, b) => sum + b.quantity, 0);

          // Create Immutable StockLedger Entry (Negative delta for outgoing shipment)
          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              operationType: OperationType.DELIVERY,
              documentRef: delivery.deliveryNumber,
              quantityChange: -item.quantity,
              previousQuantity: newTotalStock + item.quantity,
              newQuantity: newTotalStock,
              sourceLocation: sourceLocationName || "Warehouse Storage",
              destLocation: `Customer: ${delivery.customerName}`,
              reason: "Customer outbound shipment fulfillment",
              userId: adminUser?.id || "system",
            },
          });

          totalShipped += item.quantity;
        }

        const updatedDelivery = await tx.delivery.update({
          where: { id: delivery.id },
          data: { status: DocumentStatus.DONE, picked: true, packed: true, validatedAt: new Date() },
        });

        await tx.notification.create({
          data: {
            type: "DELIVERY_COMPLETED",
            title: `Delivery ${delivery.deliveryNumber} Dispatched`,
            message: `Shipped ${totalShipped} unit(s) to ${delivery.customerName}. Stock updated in PostgreSQL.`,
            userId: adminUser?.id,
          },
        });

        return updatedDelivery;
      });

      return NextResponse.json({
        message: `Delivery ${delivery.deliveryNumber} validated! Stock decreased by ${delivery.items.reduce(
          (acc, it) => acc + it.quantity,
          0
        )} units and recorded in the Stock Ledger.`,
        delivery: validationResult,
      });
    }

    if (status) {
      const updated = await prisma.delivery.update({ where: { id }, data: { status: status as DocumentStatus } });
      return NextResponse.json({ message: "Status updated", delivery: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```
