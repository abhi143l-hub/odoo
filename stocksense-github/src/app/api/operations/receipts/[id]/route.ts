import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DocumentStatus, OperationType } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            product: { include: { unit: true, category: true } },
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const location = await prisma.location.findUnique({
      where: { id: receipt.destinationLocationId },
      include: { warehouse: true },
    });

    return NextResponse.json({
      receipt: {
        ...receipt,
        destinationLocationName: location
          ? `${location.warehouse.name} / ${location.name} (${location.code})`
          : "Unknown Location",
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

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: {
            product: { include: { unit: true } },
          },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // Prevent modifying completed or cancelled receipts
    if (receipt.status === DocumentStatus.DONE) {
      return NextResponse.json(
        { error: "Cannot modify or re-validate a receipt that is already marked as DONE." },
        { status: 400 }
      );
    }

    if (receipt.status === DocumentStatus.CANCELLED && action === "VALIDATE") {
      return NextResponse.json(
        { error: "Cannot validate a cancelled receipt." },
        { status: 400 }
      );
    }

    // Step Transition / Status update
    if (status && action !== "VALIDATE") {
      const updated = await prisma.receipt.update({
        where: { id },
        data: { status: status as DocumentStatus },
      });
      return NextResponse.json({ message: "Receipt status updated", receipt: updated });
    }

    // ATOMIC VALIDATION WORKFLOW
    if (action === "VALIDATE") {
      const destinationLoc = await prisma.location.findUnique({
        where: { id: receipt.destinationLocationId },
        include: { warehouse: true },
      });
      const destString = destinationLoc
        ? `${destinationLoc.warehouse.name} / ${destinationLoc.name} (${destinationLoc.code})`
        : "Storage Location";

      const adminUser = await prisma.user.findFirst();

      const validationResult = await prisma.$transaction(async (tx) => {
        let totalItemsReceived = 0;

        for (const item of receipt.items) {
          // 1. Find or create StockBalance for this product at the destination location
          const balance = await tx.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: receipt.destinationLocationId,
              },
            },
          });

          const previousLocQty = balance ? balance.quantity : 0;
          const newLocQty = previousLocQty + item.quantity;

          if (balance) {
            await tx.stockBalance.update({
              where: { id: balance.id },
              data: { quantity: newLocQty },
            });
          } else {
            await tx.stockBalance.create({
              data: {
                productId: item.productId,
                locationId: receipt.destinationLocationId,
                quantity: newLocQty,
              },
            });
          }

          // 2. Compute total product stock for the immutable ledger snapshot
          const allProductBalances = await tx.stockBalance.findMany({
            where: { productId: item.productId },
          });
          const currentTotalProductStock = allProductBalances.reduce((sum, b) => sum + b.quantity, 0);

          // 3. Create Immutable StockLedger Entry
          await tx.stockLedger.create({
            data: {
              productId: item.productId,
              operationType: OperationType.RECEIPT,
              documentRef: receipt.receiptNumber,
              quantityChange: item.quantity, // Positive for receipts
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

        // 4. Mark Receipt as DONE
        const updatedReceipt = await tx.receipt.update({
          where: { id: receipt.id },
          data: {
            status: DocumentStatus.DONE,
            validatedAt: new Date(),
          },
        });

        // 5. Create System Notification
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

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
