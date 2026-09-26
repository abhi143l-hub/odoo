import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OperationType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();
    const categoryId = searchParams.get("categoryId");
    const warehouseId = searchParams.get("warehouseId");
    const stockStatus = searchParams.get("stockStatus"); // ALL, NORMAL, LOW_STOCK, OUT_OF_STOCK

    // Fetch products with category, unit, preferred warehouse, and location balances
    const products = await prisma.product.findMany({
      where: {
        AND: [
          query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { sku: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          categoryId && categoryId !== "ALL" ? { categoryId } : {},
        ],
      },
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
      },
      orderBy: { createdAt: "desc" },
    });

    // Map and calculate stock metrics
    const mapped = products.map((prod) => {
      // Filter balances if warehouseId is selected
      const activeBalances = warehouseId && warehouseId !== "ALL"
        ? prod.stockBalances.filter((sb) => sb.location.warehouseId === warehouseId)
        : prod.stockBalances;

      const totalStock = activeBalances.reduce((acc, sb) => acc + sb.quantity, 0);

      let status = "NORMAL";
      if (totalStock === 0) {
        status = "OUT_OF_STOCK";
      } else if (totalStock <= prod.reorderLevel) {
        status = "LOW_STOCK";
      }

      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        description: prod.description,
        category: prod.category.name,
        categoryId: prod.categoryId,
        unit: prod.unit.symbol,
        unitName: prod.unit.name,
        reorderLevel: prod.reorderLevel,
        reorderQuantity: prod.reorderQuantity,
        preferredWarehouse: prod.preferredWarehouse ? prod.preferredWarehouse.name : "None assigned",
        preferredWarehouseId: prod.preferredWarehouseId,
        totalStock,
        status,
        balances: prod.stockBalances.map((sb) => ({
          locationId: sb.locationId,
          locationCode: sb.location.code,
          locationName: sb.location.name,
          warehouseName: sb.location.warehouse.name,
          warehouseCode: sb.location.warehouse.code,
          quantity: sb.quantity,
        })),
      };
    });

    // Filter by stockStatus if specified
    const filtered = stockStatus && stockStatus !== "ALL"
      ? mapped.filter((p) => p.status === stockStatus)
      : mapped;

    // Also fetch lookup lists for creation form
    const [categories, units, warehouses, locations] = await Promise.all([
      prisma.category.findMany(),
      prisma.unit.findMany(),
      prisma.warehouse.findMany(),
      prisma.location.findMany({ include: { warehouse: true } }),
    ]);

    return NextResponse.json({
      products: filtered,
      totalCount: filtered.length,
      lookups: {
        categories,
        units,
        warehouses,
        locations: locations.map((loc) => ({
          id: loc.id,
          code: loc.code,
          name: loc.name,
          warehouseName: loc.warehouse.name,
          warehouseId: loc.warehouseId,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sku,
      name,
      description,
      categoryId,
      unitId,
      reorderLevel = 10,
      reorderQuantity = 50,
      preferredWarehouseId,
      initialStock = 0,
      initialLocationId,
    } = body;

    if (!sku || !name || !categoryId || !unitId) {
      return NextResponse.json(
        { error: "SKU, Product Name, Category, and Unit of Measure are required" },
        { status: 400 }
      );
    }

    const cleanSku = sku.toUpperCase().trim();

    // Check SKU uniqueness
    const existing = await prisma.product.findUnique({
      where: { sku: cleanSku },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A product with SKU ${cleanSku} already exists` },
        { status: 409 }
      );
    }

    // Atomic transaction: Create Product + Initial Balance + Stock Ledger
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create product
      const product = await tx.product.create({
        data: {
          sku: cleanSku,
          name: name.trim(),
          description: description?.trim() || null,
          categoryId,
          unitId,
          reorderLevel: parseFloat(reorderLevel) || 10,
          reorderQuantity: parseFloat(reorderQuantity) || 50,
          preferredWarehouseId: preferredWarehouseId || null,
        },
      });

      // 2. Handle optional initial stock
      const initStockNum = parseFloat(initialStock);
      if (initStockNum > 0 && initialLocationId) {
        // Create stock balance
        await tx.stockBalance.create({
          data: {
            productId: product.id,
            locationId: initialLocationId,
            quantity: initStockNum,
          },
        });

        // Find location info for readable audit ledger
        const loc = await tx.location.findUnique({
          where: { id: initialLocationId },
          include: { warehouse: true },
        });

        // Find default admin user for audit attribution
        const adminUser = await tx.user.findFirst();

        // Create immutable ledger record
        await tx.stockLedger.create({
          data: {
            productId: product.id,
            operationType: OperationType.RECEIPT,
            documentRef: `INIT-${cleanSku}`,
            quantityChange: initStockNum,
            previousQuantity: 0,
            newQuantity: initStockNum,
            sourceLocation: "Initial Opening Balance",
            destLocation: loc ? `${loc.warehouse.name} / ${loc.name} (${loc.code})` : "Initial Location",
            reason: "Initial product registration opening stock",
            userId: adminUser?.id || "system",
          },
        });
      }

      return product;
    });

    return NextResponse.json(
      { message: "Product created successfully", product: result },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
