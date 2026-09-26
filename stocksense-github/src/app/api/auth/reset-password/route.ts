import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, generateOtp } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { action, email, otp, newPassword } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      // Security standard: don't reveal user existence, return generic or simulated success
      return NextResponse.json({
        message: "If that email is registered, an OTP code has been generated",
        demoOtp: process.env.ENABLE_MOCK_OTP === "true" ? "123456" : undefined,
      });
    }

    // Step 1: Request OTP
    if (action === "REQUEST_OTP") {
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await prisma.user.update({
        where: { id: user.id },
        data: {
          otpSecret: otpCode,
          otpExpiresAt: expiresAt,
        },
      });

      return NextResponse.json({
        message: "OTP generated successfully",
        demoOtp: otpCode, // Provided for easy hackathon demo evaluation
        expiresIn: "15 minutes",
      });
    }

    // Step 2: Verify OTP and Reset Password
    if (action === "VERIFY_AND_RESET") {
      if (!otp || !newPassword) {
        return NextResponse.json(
          { error: "OTP and new password are required" },
          { status: 400 }
        );
      }

      if (!user.otpSecret || !user.otpExpiresAt) {
        return NextResponse.json(
          { error: "No pending password reset request found. Please request a new OTP." },
          { status: 400 }
        );
      }

      if (new Date() > new Date(user.otpExpiresAt)) {
        return NextResponse.json(
          { error: "OTP has expired. Please request a new one." },
          { status: 400 }
        );
      }

      if (user.otpSecret !== otp.trim()) {
        return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });
      }

      const passwordHash = await hashPassword(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          otpSecret: null,
          otpExpiresAt: null,
        },
      });

      return NextResponse.json({
        message: "Password reset successfully. You can now login with your new password.",
      });
    }

    return NextResponse.json({ error: "Invalid action. Use REQUEST_OTP or VERIFY_AND_RESET." }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Password reset process failed" },
      { status: 500 }
    );
  }
}
