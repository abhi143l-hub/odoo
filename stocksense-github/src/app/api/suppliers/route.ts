import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { receipts: true },
        },
      },
    });
    return NextResponse.json({ suppliers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, email, phone } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    // Generate code if not provided
    const supplierCode = (code && code.trim())
      ? code.trim().toUpperCase()
      : `SUP-${name.trim().substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    // Check unique code
    const existing = await prisma.supplier.findUnique({
      where: { code: supplierCode },
    });
    if (existing) {
      return NextResponse.json({ error: `Supplier with code '${supplierCode}' already exists.` }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        code: supplierCode,
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
      },
    });

    return NextResponse.json({ supplier, message: "Supplier created successfully" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
