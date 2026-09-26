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
            product: {
              include: { unit: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Also fetch locations to display destination location names
    const locations = await prisma.location.findMany({
      include: { warehouse: true },
    });
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

    // Lookups for creation form
    const [suppliersList, productsList] = await Promise.all([
      prisma.supplier.findMany(),
      prisma.product.findMany({
        include: { unit: true },
      }),
    ]);

    return NextResponse.json({
      receipts: mapped,
      lookups: {
        suppliers: suppliersList,
        products: productsList.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit.symbol,
        })),
        locations: locations.map((l) => ({
          id: l.id,
          name: `${l.warehouse.name} — ${l.name} (${l.code})`,
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
    const { supplierId, destinationLocationId, notes, items, status = "WAITING" } = body;

    if (!supplierId || !destinationLocationId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Supplier, destination location, and at least one product item are required" },
        { status: 400 }
      );
    }

    // Generate unique sequential receipt number
    const count = await prisma.receipt.count();
    const receiptNumber = `REC-2026-${String(count + 1).padStart(4, "0")}`;

    // Get an active user to attribute the creation
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
        items: {
          include: {
            product: { include: { unit: true } },
          },
        },
        supplier: true,
      },
    });

    return NextResponse.json(
      { message: "Receipt created successfully", receipt },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
