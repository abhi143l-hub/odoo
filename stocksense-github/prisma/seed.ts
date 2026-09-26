import { PrismaClient, Role, OperationType, DocumentStatus, AdjustmentReason } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding StockSense PostgreSQL Database...");

  // 1. Clean existing records in reverse dependency order
  await prisma.stockLedger.deleteMany({});
  await prisma.stockAdjustment.deleteMany({});
  await prisma.transferItem.deleteMany({});
  await prisma.transfer.deleteMany({});
  await prisma.deliveryItem.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.receiptItem.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.stockBalance.deleteMany({});
  await prisma.reorderRule.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Users
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@stocksense.io",
      name: "Alex Vance (Admin)",
      passwordHash,
      role: Role.ADMIN,
      phone: "+1-555-0100",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@stocksense.io",
      name: "Marcus Green (Inv Manager)",
      passwordHash,
      role: Role.INVENTORY_MANAGER,
      phone: "+1-555-0101",
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@stocksense.io",
      name: "Elena Rostova (Warehouse Staff)",
      passwordHash,
      role: Role.WAREHOUSE_STAFF,
      phone: "+1-555-0102",
    },
  });

  console.log("✅ Created users: admin, manager, staff");

  // 3. Create Categories
  const catRaw = await prisma.category.create({
    data: { name: "Raw Materials", description: "Raw production inputs and metals" },
  });
  const catFurn = await prisma.category.create({
    data: { name: "Furniture", description: "Office desks, chairs, and assemblies" },
  });
  const catElec = await prisma.category.create({
    data: { name: "Electronics", description: "Computing, hardware and peripherals" },
  });
  const catPkg = await prisma.category.create({
    data: { name: "Packaging", description: "Cartons, protective wraps and boxes" },
  });
  const catSaf = await prisma.category.create({
    data: { name: "Safety Gear", description: "PPE, helmets, gloves, and protective gear" },
  });
  const catHard = await prisma.category.create({
    data: { name: "Industrial Hardware", description: "Bearings, fasteners, and gears" },
  });

  // 4. Create Units
  const unitKg = await prisma.unit.create({ data: { name: "Kilogram", symbol: "KG" } });
  const unitPcs = await prisma.unit.create({ data: { name: "Piece", symbol: "PCS" } });
  const unitBox = await prisma.unit.create({ data: { name: "Box", symbol: "BOX" } });

  // 5. Create Warehouses & Locations
  const whMain = await prisma.warehouse.create({
    data: {
      code: "WH-MAIN",
      name: "Main Central Warehouse",
      address: "Building 1, Logistics Boulevard, Dock 4",
      locations: {
        create: [
          { code: "RACK-A1", name: "Heavy Metals Staging (Rack A1)", type: "STORAGE" },
          { code: "RACK-A2", name: "High-Bay Aisle 2 (Rack A2)", type: "STORAGE" },
          { code: "RACK-B1", name: "Finished Goods Bay (Rack B1)", type: "STORAGE" },
        ],
      },
    },
    include: { locations: true },
  });

  const whProd = await prisma.warehouse.create({
    data: {
      code: "WH-PROD",
      name: "Production Store & Assembly",
      address: "Building 2, Manufacturing Floor, Bay 3",
      locations: {
        create: [
          { code: "RACK-P1", name: "Active Assembly Buffer (Rack P1)", type: "PRODUCTION" },
          { code: "RACK-P2", name: "Sub-assembly Storage (Rack P2)", type: "PRODUCTION" },
        ],
      },
    },
    include: { locations: true },
  });

  const whSec = await prisma.warehouse.create({
    data: {
      code: "WH-SEC",
      name: "Secondary Overflow Depot",
      address: "Building 5, Outer Yard Warehouse",
      locations: {
        create: [{ code: "RACK-S1", name: "Bulk Pallet Floor (Rack S1)", type: "STORAGE" }],
      },
    },
    include: { locations: true },
  });

  console.log("✅ Created 3 warehouses and 6 locations");

  // 6. Create Suppliers
  const supApex = await prisma.supplier.create({
    data: {
      name: "Apex Metals Ltd",
      code: "SUP-APEX",
      email: "orders@apexmetals.com",
      phone: "+1-800-555-APEX",
    },
  });

  const supGlobal = await prisma.supplier.create({
    data: {
      name: "Global Tech Supplies",
      code: "SUP-GTECH",
      email: "sales@globaltechsupplies.com",
      phone: "+1-800-555-TECH",
    },
  });

  // 7. Create Products
  const prodSteel = await prisma.product.create({
    data: {
      sku: "STL-ROD-01",
      name: "Steel Rod (Structural Grade)",
      description: "Standard 12mm high-tensile structural steel rod",
      categoryId: catRaw.id,
      unitId: unitKg.id,
      reorderLevel: 20,
      reorderQuantity: 100,
      preferredWarehouseId: whMain.id,
    },
  });

  const prodChair = await prisma.product.create({
    data: {
      sku: "OFF-CHR-02",
      name: "Office Chair (Ergonomic Pro)",
      description: "Mesh ergonomic adjustable high-back office chair",
      categoryId: catFurn.id,
      unitId: unitPcs.id,
      reorderLevel: 10,
      reorderQuantity: 25,
      preferredWarehouseId: whMain.id,
    },
  });

  const prodLaptop = await prisma.product.create({
    data: {
      sku: "TECH-LAP-03",
      name: "Engineering Laptop Core-i7",
      description: "16-inch high-performance workstations for engineering floor",
      categoryId: catElec.id,
      unitId: unitPcs.id,
      reorderLevel: 5,
      reorderQuantity: 15,
      preferredWarehouseId: whMain.id,
    },
  });

  const prodWood = await prisma.product.create({
    data: {
      sku: "MAT-WOOD-04",
      name: "Wooden Panel (Treated Hardwood)",
      description: "2.4m x 1.2m treated timber hardwood sheets",
      categoryId: catRaw.id,
      unitId: unitPcs.id,
      reorderLevel: 15,
      reorderQuantity: 50,
      preferredWarehouseId: whMain.id,
    },
  });

  const prodBox = await prisma.product.create({
    data: {
      sku: "PKG-BOX-05",
      name: "Packaging Box (Heavy Corrugated)",
      description: "Double-walled shipping cartons 60x40x40cm",
      categoryId: catPkg.id,
      unitId: unitBox.id,
      reorderLevel: 40,
      reorderQuantity: 200,
      preferredWarehouseId: whSec.id,
    },
  });

  const prodHelmet = await prisma.product.create({
    data: {
      sku: "SAF-HLM-06",
      name: "Safety Helmet (ANSI Z89.1)",
      description: "Industrial yellow hard hats with chin strap",
      categoryId: catSaf.id,
      unitId: unitPcs.id,
      reorderLevel: 20,
      reorderQuantity: 60,
      preferredWarehouseId: whProd.id,
    },
  });

  const prodBearing = await prisma.product.create({
    data: {
      sku: "IND-BRG-07",
      name: "Industrial Bearing (Precision 6002)",
      description: "Sealed deep groove radial ball bearings",
      categoryId: catHard.id,
      unitId: unitPcs.id,
      reorderLevel: 25,
      reorderQuantity: 100,
      preferredWarehouseId: whMain.id,
    },
  });

  console.log("✅ Created 7 core demo products");

  // 8. Assign Initial Stock Balances & Seed Historical Stock Ledger
  const rackMainA1 = whMain.locations[0].id;
  const rackMainB1 = whMain.locations[2].id;
  const rackProdP1 = whProd.locations[0].id;

  // Steel Rod initial stock: 50 KG in Rack A1
  await prisma.stockBalance.create({
    data: {
      productId: prodSteel.id,
      locationId: rackMainA1,
      quantity: 50,
    },
  });

  await prisma.stockLedger.create({
    data: {
      productId: prodSteel.id,
      operationType: OperationType.RECEIPT,
      documentRef: "INIT-BAL-001",
      quantityChange: 50,
      previousQuantity: 0,
      newQuantity: 50,
      sourceLocation: "Initial Opening Stock",
      destLocation: "Main Central Warehouse / Heavy Metals Staging (Rack A1)",
      reason: "Initial migration audit baseline",
      userId: admin.id,
    },
  });

  // Office Chair: 35 PCS in Rack B1
  await prisma.stockBalance.create({
    data: {
      productId: prodChair.id,
      locationId: rackMainB1,
      quantity: 35,
    },
  });

  // Laptops: 12 PCS in Rack B1
  await prisma.stockBalance.create({
    data: {
      productId: prodLaptop.id,
      locationId: rackMainB1,
      quantity: 12,
    },
  });

  // Packaging Box: 140 Boxes in whSec Rack S1
  await prisma.stockBalance.create({
    data: {
      productId: prodBox.id,
      locationId: whSec.locations[0].id,
      quantity: 140,
    },
  });

  // Industrial Bearing: 80 PCS in Rack A2
  await prisma.stockBalance.create({
    data: {
      productId: prodBearing.id,
      locationId: whMain.locations[1].id,
      quantity: 80,
    },
  });

  console.log("✅ Seeded stock balances and initial ledger");

  // 9. Create Notifications
  await prisma.notification.create({
    data: {
      type: "LOW_STOCK",
      title: "Steel Rod Reorder Threshold Approaching",
      message: "Steel Rod (STL-ROD-01) stock is close to 20 KG reorder minimum.",
      userId: manager.id,
    },
  });

  console.log("🎉 StockSense Database Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
