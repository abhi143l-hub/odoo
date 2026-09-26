import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus, OperationType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
                stockBalances: {
                  include: { location: { include: { warehouse: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json({ error: "Delivery order not found" }, { status: 404 });
    }

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

    const isAllSufficient = itemsMapped.every((it) => it.hasSufficientStock);

    return NextResponse.json({
      delivery: {
        ...delivery,
        items: itemsMapped,
        isAllSufficient,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
                stockBalances: {
                  include: { location: { include: { warehouse: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!delivery) {
      return NextResponse.json({ error: "Delivery order not found" }, { status: 404 });
    }

    if (delivery.status === DocumentStatus.DONE) {
      return NextResponse.json(
        { error: "Cannot modify or re-validate a delivery that is already marked as DONE." },
        { status: 400 }
      );
    }

    // Step: Pick
    if (action === "PICK") {
      const updated = await prisma.delivery.update({
        where: { id },
        data: {
          picked: true,
          status: DocumentStatus.READY,
        },
      });
      return NextResponse.json({ message: "Items picked from warehouse floor", delivery: updated });
    }

    // Step: Pack
    if (action === "PACK") {
      const updated = await prisma.delivery.update({
        where: { id },
        data: { packed: true },
      });
      return NextResponse.json({ message: "Items packed into shipping container", delivery: updated });
    }

    // ATOMIC VALIDATION & STOCK REDUCTION WORKFLOW
    if (action === "VALIDATE") {
      const adminUser = await prisma.user.findFirst();

      const validationResult = await prisma.$transaction(async (tx) => {
        let totalShipped = 0;

        for (const item of delivery.items) {
          // 1. Check available stock across all location balances
          const balances = await tx.stockBalance.findMany({
            where: { productId: item.productId },
            include: { location: { include: { warehouse: true } } },
            orderBy: { quantity: "desc" },
          });

          const totalStock = balances.reduce((sum, b) => sum + b.quantity, 0);

          // 2. OVERDRAFT PROTECTION: Strictly prevent negative stock
          if (totalStock < item.quantity) {
            throw new Error(
              `Unable to complete this delivery. Available stock for ${item.product.name}: ${totalStock} ${item.product.unit.symbol}. Requested quantity: ${item.quantity} ${item.product.unit.symbol}. Please reduce the quantity or review inventory.`
            );
          }

          // 3. Deduct stock from the balance with the most stock available
          let remainingToDeduct = item.quantity;
          let sourceLocationName = "";

          for (const bal of balances) {
            if (remainingToDeduct <= 0) break;
            const deductFromThis = Math.min(bal.quantity, remainingToDeduct);
            const newBalQty = bal.quantity - deductFromThis;

            await tx.stockBalance.update({
              where: { id: bal.id },
              data: { quantity: newBalQty },
            });

            remainingToDeduct -= deductFromThis;
            sourceLocationName = `${bal.location.warehouse.name} / ${bal.location.name} (${bal.location.code})`;
          }

          // 4. Compute updated total product stock
          const allProductBalances = await tx.stockBalance.findMany({
            where: { productId: item.productId },
          });
          const newTotalStock = allProductBalances.reduce((sum, b) => sum + b.quantity, 0);

          // 5. Create Immutable StockLedger Entry (Negative delta for outgoing shipment)
          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              operationType: OperationType.DELIVERY,
              documentRef: delivery.deliveryNumber,
              quantityChange: -item.quantity, // Negative for delivery
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

        // 6. Mark delivery as DONE, picked, packed
        const updatedDelivery = await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            status: DocumentStatus.DONE,
            picked: true,
            packed: true,
            validatedAt: new Date(),
          },
        });

        // 7. System notification
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
      const updated = await prisma.delivery.update({
        where: { id },
        data: { status: status as DocumentStatus },
      });
      return NextResponse.json({ message: "Status updated", delivery: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
