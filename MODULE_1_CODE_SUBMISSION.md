# STOCKSENSE — MODULE 1 / CHECKPOINT 1 CODE SUBMISSION
## Foundation, PostgreSQL Relational Schema, Auth Engine & Base UI

This file consolidates all code developed for **Module 1 (Checkpoint 1)** of StockSense. You can copy the code from here directly or upload this document.

---

### 1. `prisma/schema.prisma` (Complete PostgreSQL 18-Model Schema)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  INVENTORY_MANAGER
  WAREHOUSE_STAFF
}

enum OperationType {
  RECEIPT
  DELIVERY
  TRANSFER_OUT
  TRANSFER_IN
  ADJUSTMENT
}

enum DocumentStatus {
  DRAFT
  WAITING
  READY
  DONE
  CANCELLED
}

enum AdjustmentReason {
  DAMAGED
  LOST
  FOUND
  COUNTING_ERROR
  EXPIRED
  OTHER
}

model User {
  id           String        @id @default(uuid())
  email        String        @unique
  name         String
  passwordHash String
  role         Role          @default(WAREHOUSE_STAFF)
  phone        String?
  otpSecret    String?
  otpExpiresAt DateTime?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  receipts     Receipt[]
  deliveries   Delivery[]
  transfers    Transfer[]
  adjustments  StockAdjustment[]
  ledgerLogs   StockLedger[]
  notifications Notification[]
}

model Category {
  id          String    @id @default(uuid())
  name        String    @unique
  description String?
  products    Product[]
  createdAt   DateTime  @default(now())
}

model Unit {
  id        String    @id @default(uuid())
  name      String    @unique
  symbol    String    @unique
  products  Product[]
}

model Product {
  id              String         @id @default(uuid())
  sku             String         @unique
  name            String
  description     String?
  categoryId      String
  category        Category       @relation(fields: [categoryId], references: [id])
  unitId          String
  unit            Unit           @relation(fields: [unitId], references: [id])
  reorderLevel    Float          @default(10)
  reorderQuantity Float          @default(50)
  preferredWarehouseId String?
  preferredWarehouse   Warehouse? @relation("PreferredWarehouse", fields: [preferredWarehouseId], references: [id])
  status          String         @default("ACTIVE")
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  stockBalances   StockBalance[]
  ledgerEntries   StockLedger[]
  receiptItems    ReceiptItem[]
  deliveryItems   DeliveryItem[]
  transferItems   TransferItem[]
  adjustments     StockAdjustment[]
  reorderRules    ReorderRule[]

  @@index([sku])
  @@index([categoryId])
  @@index([status])
}

model Warehouse {
  id          String         @id @default(uuid())
  code        String         @unique
  name        String
  address     String?
  locations   Location[]
  products    Product[]      @relation("PreferredWarehouse")
  sourceTransfers Transfer[] @relation("SourceWarehouse")
  destTransfers   Transfer[] @relation("DestWarehouse")
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model Location {
  id          String         @id @default(uuid())
  warehouseId String
  warehouse   Warehouse      @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
  code        String
  name        String
  type        String         @default("STORAGE")
  createdAt   DateTime       @default(now())

  stockBalances StockBalance[]
  sourceTransfers Transfer[] @relation("SourceLocation")
  destTransfers   Transfer[] @relation("DestLocation")
  adjustments   StockAdjustment[]

  @@unique([warehouseId, code])
}

model StockBalance {
  id          String    @id @default(uuid())
  productId   String
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  locationId  String
  location    Location  @relation(fields: [locationId], references: [id], onDelete: Cascade)
  quantity    Float     @default(0)
  updatedAt   DateTime  @updatedAt

  @@unique([productId, locationId])
  @@index([productId])
  @@index([locationId])
}

model StockLedger {
  id              String        @id @default(uuid())
  timestamp       DateTime      @default(now())
  productId       String
  product         Product       @relation(fields: [productId], references: [id])
  operationType   OperationType
  documentRef     String
  quantityChange  Float
  previousQuantity Float
  newQuantity     Float
  sourceLocation  String?
  destLocation    String?
  reason          String?
  userId          String
  user            User          @relation(fields: [userId], references: [id])

  @@index([productId])
  @@index([timestamp])
  @@index([operationType])
  @@index([documentRef])
}

model Supplier {
  id        String    @id @default(uuid())
  name      String
  code      String    @unique
  email     String?
  phone     String?
  receipts  Receipt[]
  createdAt DateTime  @default(now())
}

model Receipt {
  id           String         @id @default(uuid())
  receiptNumber String        @unique
  supplierId   String
  supplier     Supplier       @relation(fields: [supplierId], references: [id])
  destinationLocationId String
  status       DocumentStatus @default(DRAFT)
  notes        String?
  createdById  String
  createdBy    User           @relation(fields: [createdById], references: [id])
  validatedAt  DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  items        ReceiptItem[]

  @@index([status])
  @@index([receiptNumber])
}

model ReceiptItem {
  id         String   @id @default(uuid())
  receiptId  String
  receipt    Receipt  @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  quantity   Float
}

model Delivery {
  id             String         @id @default(uuid())
  deliveryNumber String         @unique
  customerName   String
  status         DocumentStatus @default(DRAFT)
  picked         Boolean        @default(false)
  packed         Boolean        @default(false)
  notes          String?
  createdById    String
  createdBy      User           @relation(fields: [createdById], references: [id])
  validatedAt    DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  items          DeliveryItem[]

  @@index([status])
  @@index([deliveryNumber])
}

model DeliveryItem {
  id          String   @id @default(uuid())
  deliveryId  String
  delivery    Delivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  quantity    Float
}

model Transfer {
  id             String         @id @default(uuid())
  transferNumber String         @unique
  sourceWarehouseId String
  sourceWarehouse   Warehouse   @relation("SourceWarehouse", fields: [sourceWarehouseId], references: [id])
  sourceLocationId  String
  sourceLocation    Location    @relation("SourceLocation", fields: [sourceLocationId], references: [id])
  destWarehouseId   String
  destWarehouse     Warehouse   @relation("DestWarehouse", fields: [destWarehouseId], references: [id])
  destLocationId    String
  destLocation      Location    @relation("DestLocation", fields: [destLocationId], references: [id])
  status         DocumentStatus @default(DRAFT)
  createdById    String
  createdBy      User           @relation(fields: [createdById], references: [id])
  validatedAt    DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  items          TransferItem[]

  @@index([status])
}

model TransferItem {
  id         String   @id @default(uuid())
  transferId String
  transfer   Transfer @relation(fields: [transferId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  quantity   Float
}

model StockAdjustment {
  id               String           @id @default(uuid())
  adjustmentNumber String           @unique
  productId        String
  product          Product          @relation(fields: [productId], references: [id])
  locationId       String
  location         Location         @relation(fields: [locationId], references: [id])
  systemQuantity   Float
  physicalQuantity Float
  difference       Float
  reason           AdjustmentReason
  notes            String?
  createdById      String
  createdBy        User             @relation(fields: [createdById], references: [id])
  createdAt        DateTime         @default(now())

  @@index([productId])
  @@index([locationId])
}

model Notification {
  id        String   @id @default(uuid())
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  type      String
  title     String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model ReorderRule {
  id          String   @id @default(uuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  minQuantity Float
  maxQuantity Float
  createdAt   DateTime @default(now())
}
```

---

### 2. `src/lib/auth.ts` (Authentication, JWT & OTP Engine)
```typescript
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
```

---

### 3. `src/lib/prisma.ts` (Database Connection Singleton)
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

---

### 4. `src/app/api/auth/login/route.ts` (User Login Endpoint)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({
      message: "Authentication successful",
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}
```

---

### 5. `src/app/api/auth/reset-password/route.ts` (OTP Password Recovery)
```typescript
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, generateOtp } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { action, email, otp, newPassword } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      return NextResponse.json({
        message: "If that email is registered, an OTP code has been generated",
        demoOtp: process.env.ENABLE_MOCK_OTP === "true" ? "123456" : undefined,
      });
    }

    if (action === "REQUEST_OTP") {
      const otpCode = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.user.update({
        where: { id: user.id },
        data: { otpSecret: otpCode, otpExpiresAt: expiresAt },
      });

      return NextResponse.json({
        message: "OTP generated successfully",
        demoOtp: otpCode,
        expiresIn: "15 minutes",
      });
    }

    if (action === "VERIFY_AND_RESET") {
      if (!otp || !newPassword) return NextResponse.json({ error: "OTP and new password required" }, { status: 400 });
      if (!user.otpSecret || !user.otpExpiresAt) return NextResponse.json({ error: "No pending OTP" }, { status: 400 });
      if (new Date() > new Date(user.otpExpiresAt)) return NextResponse.json({ error: "OTP expired" }, { status: 400 });
      if (user.otpSecret !== otp.trim()) return NextResponse.json({ error: "Invalid OTP code" }, { status: 400 });

      const passwordHash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, otpSecret: null, otpExpiresAt: null },
      });

      return NextResponse.json({ message: "Password reset successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

### 6. `package.json`
```json
{
  "name": "stocksense",
  "version": "1.0.0",
  "private": true,
  "description": "StockSense — Smart Inventory Operating System with PostgreSQL & Intelligence Engine",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "prisma:generate": "prisma generate",
    "prisma:push": "prisma db push",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "bcryptjs": "^2.4.3",
    "clsx": "^2.1.1",
    "jsonwebtoken": "^9.0.2",
    "lucide-react": "^0.460.0",
    "next": "14.2.18",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^20.17.6",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "prisma": "^5.22.0",
    "tailwindcss": "^3.4.15",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3"
  }
}
```
