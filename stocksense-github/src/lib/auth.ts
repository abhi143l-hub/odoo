import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "stocksense_jwt_secret_dev_mode";

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function signToken(payload: { id: string; email: string; name: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { id: string; email: string; name: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string; name: string; role: string };
  } catch (error) {
    return null;
  }
}

export function generateOtp(): string {
  if (process.env.ENABLE_MOCK_OTP === "true" && process.env.DEMO_OTP_CODE) {
    return process.env.DEMO_OTP_CODE;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getAuthUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}
