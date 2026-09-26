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

    // Lookups for creation form: products with current available stock
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
      return NextResponse.json(
        { error: "Customer name and at least one line item are required" },
        { status: 400 }
      );
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
        items: {
          include: {
            product: { include: { unit: true } },
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Delivery order created successfully", delivery },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
