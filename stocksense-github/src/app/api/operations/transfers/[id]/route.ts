import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus, OperationType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
                stockBalances: {
                  include: { location: { include: { warehouse: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer order not found" }, { status: 404 });
    }

    const itemsMapped = transfer.items.map((it) => {
      const sourceBalance = it.product.stockBalances.find(
        (sb) => sb.locationId === transfer.sourceLocationId
      );
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

    const isAllSufficient = itemsMapped.every((it) => it.hasSufficientStock);

    return NextResponse.json({
      transfer: {
        ...transfer,
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

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        sourceWarehouse: true,
        sourceLocation: true,
        destWarehouse: true,
        destLocation: true,
        items: {
          include: {
            product: {
              include: { unit: true },
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    if (transfer.status === DocumentStatus.DONE) {
      return NextResponse.json(
        { error: "Cannot modify or re-validate a transfer that is already completed." },
        { status: 400 }
      );
    }

    // ATOMIC INTERNAL TRANSFER VALIDATION
    if (action === "VALIDATE") {
      const adminUser = await prisma.user.findFirst();

      const sourceString = `${transfer.sourceWarehouse.name} / ${transfer.sourceLocation.name} (${transfer.sourceLocation.code})`;
      const destString = `${transfer.destWarehouse.name} / ${transfer.destLocation.name} (${transfer.destLocation.code})`;

      const result = await prisma.$transaction(async (tx) => {
        let totalMoved = 0;

        for (const item of transfer.items) {
          // 1. Check stock in source location
          const sourceBal = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: transfer.sourceLocationId,
              },
            },
          });

          const currentSourceQty = sourceBal ? sourceBal.quantity : 0;

          if (currentSourceQty < item.quantity) {
            throw new Error(
              `Insufficient stock at source location. ${sourceString} has only ${currentSourceQty} ${item.product.unit.symbol} of ${item.product.name}. Requested: ${item.quantity} ${item.product.unit.symbol}.`
            );
          }

          // 2. Deduct from source location
          await tx.stockBalance.update({
            where: { id: sourceBal!.id },
            data: { quantity: currentSourceQty - item.quantity },
          });

          // 3. Add to destination location
          const destBal = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: transfer.destLocationId,
              },
            },
          });

          const currentDestQty = destBal ? destBal.quantity : 0;
          if (destBal) {
            await tx.stockBalance.update({
              where: { id: destBal.id },
              data: { quantity: currentDestQty + item.quantity },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                locationId: transfer.destLocationId,
                quantity: item.quantity,
              },
            });
          }

          // Total product stock across all locations remains identical!
          const allBalances = await tx.stockBalance.findMany({
            where: { productId: item.productId },
          });
          const totalCompanyStock = allBalances.reduce((acc, b) => acc + b.quantity, 0);

          // 4. Log Immutable Ledger Entry (Dual-flow traceable transfer)
          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              operationType: OperationType.TRANSFER_OUT,
              documentRef: transfer.transferNumber,
              quantityChange: -item.quantity,
              previousQuantity: totalCompanyStock,
              newQuantity: totalCompanyStock, // Total company stock is conserved
              sourceLocation: sourceString,
              destLocation: destString,
              reason: `Internal transfer: moved from ${sourceString} to ${destString}`,
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
              reason: `Internal transfer: received at ${destString} from ${sourceString}`,
              userId: adminUser?.id || "system",
            },
          });

          totalMoved += item.quantity;
        }

        // 5. Update transfer record to DONE
        const updatedTransfer = await tx.transfer.update({
          where: { id: transfer.id },
          data: {
            status: DocumentStatus.DONE,
            validatedAt: new Date(),
          },
        });

        // 6. System notification
        await tx.notification.create({
          data: {
            type: "TRANSFER_COMPLETED",
            title: `Internal Transfer ${transfer.transferNumber} Completed`,
            message: `Successfully moved ${totalMoved} unit(s) from ${transfer.sourceWarehouse.name} to ${transfer.destWarehouse.name}. Total stock conserved.`,
            userId: adminUser?.id,
          },
        });

        return updatedTransfer;
      });

      return NextResponse.json({
        message: `Internal Transfer ${transfer.transferNumber} validated! Inventory location successfully updated with zero loss to company totals.`,
        transfer: result,
      });
    }

    if (status) {
      const updated = await prisma.transfer.update({
        where: { id },
        data: { status: status as DocumentStatus },
      });
      return NextResponse.json({ message: "Status updated", transfer: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
