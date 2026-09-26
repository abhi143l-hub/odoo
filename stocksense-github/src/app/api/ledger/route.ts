import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OperationType } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim();
    const operationType = searchParams.get("operationType");
    const productId = searchParams.get("productId");

    const entries = await prisma.stockLedger.findMany({
      where: {
        AND: [
          operationType && operationType !== "ALL"
            ? { operationType: operationType as OperationType }
            : {},
          productId && productId !== "ALL" ? { productId } : {},
          query
            ? {
                OR: [
                  { documentRef: { contains: query, mode: "insensitive" } },
                  { reason: { contains: query, mode: "insensitive" } },
                  { sourceLocation: { contains: query, mode: "insensitive" } },
                  { destLocation: { contains: query, mode: "insensitive" } },
                  { product: { name: { contains: query, mode: "insensitive" } } },
                  { product: { sku: { contains: query, mode: "insensitive" } } },
                ],
              }
            : {},
        ],
      },
      include: {
        product: {
          include: { unit: true, category: true },
        },
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    const mapped = entries.map((e) => ({
      id: e.id,
      timestamp: e.timestamp.toISOString(),
      productId: e.productId,
      productName: e.product.name,
      sku: e.product.sku,
      unit: e.product.unit.symbol,
      category: e.product.category.name,
      operationType: e.operationType,
      documentRef: e.documentRef,
      quantityChange: e.quantityChange,
      previousQuantity: e.previousQuantity,
      newQuantity: e.newQuantity,
      sourceLocation: e.sourceLocation || "N/A",
      destLocation: e.destLocation || "N/A",
      reason: e.reason || "Operational Transaction",
      performedBy: e.user.name,
      userRole: e.user.role,
    }));

    return NextResponse.json({
      ledger: mapped,
      totalCount: mapped.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
