import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Ping PostgreSQL by executing simple count
    const [userCount, productCount, warehouseCount] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.warehouse.count(),
    ]);

    return NextResponse.json({
      status: "healthy",
      service: "StockSense IMS API",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        counts: {
          users: userCount,
          products: productCount,
          warehouses: warehouseCount,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "degraded",
        service: "StockSense IMS API",
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error.message || "Database connection unavailable",
        },
      },
      { status: 500 }
    );
  }
}
