import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, hashPassword, comparePassword } from "@/lib/auth";

function getAuthUser(request: Request) {
  // Check Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    return verifyToken(token);
  }

  // Check cookie next
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/stocksense_token=([^;]+)/);
    if (match) {
      return verifyToken(match[1]);
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const session = getAuthUser(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            receipts: true,
            deliveries: true,
            transfers: true,
            adjustments: true,
            ledgerLogs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = getAuthUser(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await request.json();
    const { action, name, phone, oldPassword, newPassword } = body;

    // Action 1: Update Profile Details
    if (action === "UPDATE_PROFILE") {
      const updated = await prisma.user.update({
        where: { id: session.id },
        data: {
          name: name ? name.trim() : undefined,
          phone: phone !== undefined ? phone.trim() : undefined,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
        },
      });

      return NextResponse.json({
        message: "Profile updated successfully",
        user: updated,
      });
    }

    // Action 2: Change Password
    if (action === "CHANGE_PASSWORD") {
      if (!oldPassword || !newPassword) {
        return NextResponse.json(
          { error: "Both current password and new password are required" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: session.id },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const isMatch = await comparePassword(oldPassword, user.passwordHash);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      const newHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      return NextResponse.json({
        message: "Password changed successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
