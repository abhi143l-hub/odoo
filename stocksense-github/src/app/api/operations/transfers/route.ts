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

    // Lookups for creation form
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
      prisma.product.findMany({
        include: { unit: true },
      }),
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
    const {
      sourceWarehouseId,
      sourceLocationId,
      destWarehouseId,
      destLocationId,
      items,
      status = "WAITING",
    } = body;

    if (!sourceWarehouseId || !sourceLocationId || !destWarehouseId || !destLocationId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Source, destination, and at least one item are required" },
        { status: 400 }
      );
    }

    if (sourceLocationId === destLocationId) {
      return NextResponse.json(
        { error: "Source location and destination location cannot be identical" },
        { status: 400 }
      );
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

    return NextResponse.json(
      { message: "Internal transfer order created successfully", transfer },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
