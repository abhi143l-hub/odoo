import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const { email, password, name, role = "WAREHOUSE_STAFF" } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const validRole = ["ADMIN", "INVENTORY_MANAGER", "WAREHOUSE_STAFF"].includes(role)
      ? (role as Role)
      : Role.WAREHOUSE_STAFF;

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name,
        passwordHash,
        role: validRole,
      },
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Registration failed" },
      { status: 500 }
    );
  }
}
