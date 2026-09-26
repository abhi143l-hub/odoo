# StockSense — Smart Inventory Operating System

StockSense is an enterprise-grade inventory operating system engineered with an **immutable stock ledger**, **atomic multi-warehouse transactions**, and an **explainable intelligence engine**. Built on PostgreSQL and Next.js, it solves inventory phantom counts, untracked shrinkage, blind stockouts, and multi-location desynchronization by treating inventory tracking with the same mathematical rigor as financial double-entry accounting.

---

## Product Overview

Traditional inventory management systems often update quantity columns in-place, leaving warehouse teams blind to why numbers change, who authorized the movement, or where stock was lost. 

**StockSense eliminates this vulnerability completely:**
- **Immutable Audit Ledger**: Every movement creates an unalterable ledger entry with timestamp, before/after balances, user attestation, and reference documents.
- **Zero-Tolerance Invariant**: Physical stock balances can never drop below zero. Deliveries and transfers that exceed on-hand inventory are blocked at the transactional database level.
- **Explainable Intelligence**: Instead of black-box AI predictions, StockSense provides fully auditable algorithms explaining exactly *why* stock changed, *when* a product needs reordering, and *where* operational anomalies occur.

---

## Key Features

- **Authentication & Role-Based Access Control (RBAC)**: Secure JWT session engine supporting Admin, Warehouse Manager, Inventory Analyst, and Auditor personas with an interactive permissions matrix.
- **Live Inventory Dashboard**: Real-time KPI metrics (Total Inventory Value, Low Stock Alerts, Active SKUs, Pending Inbound/Outbound) with instant warehouse filtering.
- **Product Catalog Management**: SKU, barcode, unit of measure, categorical classification, reorder threshold configuration, and dynamic supplier association.
- **Inbound Receipts (Procurement)**: Vendor purchase receipts with dynamic supplier creation, multi-item intake, draft staging, and atomic stock incrementation.
- **Outbound Deliveries (Fulfillment)**: Customer delivery orders with stock validation, allocation prevention against stockouts, and ledger write-down.
- **Internal Transfers (Inter-Warehouse)**: Dual-balance transfer engine with atomic source deduction and destination addition preserving total system inventory.
- **Physical Count Adjustments**: Cycle counting reconciliation with variance delta logging, reason categorization (Damage, Loss, Expiry, Found), and instant balance sync.
- **Immutable Stock Ledger**: Full transaction log filterable by product, warehouse, date range, and operation type with complete balance-after audit trails.
- **Multi-Warehouse Isolation**: Segregated tracking across Main Distribution Center, Northern Hub, and East Coast Warehouse.

---

## Intelligence Features

StockSense includes an advanced intelligence layer operating directly on historical transaction data:

1. **Inventory Health Score**: Classifies products into risk bands (Stockout, Low Stock, Overstock, Optimal) with real-time turnover velocity metrics.
2. **Smart Reorder Insights**: Computes dynamic reorder thresholds using historical daily demand, supplier lead times, and safety buffers:
   $$\text{Reorder Point} = (\text{Daily Demand} \times \text{Lead Time Days}) + \text{Safety Stock}$$
3. **"Why Did Stock Change?" Waterfall Engine**: Chronological breakdown attributing balance fluctuations to specific receipts, sales orders, transfers, and variance write-offs.
4. **Needs Attention Command Center**: Proactively highlights critical operational blockers (critical stockout risks, pending unvalidated documents, overdue orders).
5. **Anomaly Detection**: Flags unusual inventory write-downs, sudden consumption spikes, and zero-count variances exceeding expected operational thresholds.
6. **StockSense Copilot**: Natural-language operational assistant grounded in live PostgreSQL data, answering inventory queries, warehouse distribution, and replenishment recommendations.

---

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.6
- **Database & ORM**: PostgreSQL 14+ with Prisma ORM 5.22
- **Styling & UI**: Tailwind CSS 3.4, Lucide React icons
- **Authentication**: Stateless JSON Web Tokens (JWT), bcryptjs password hashing
- **Runtime & Tooling**: Node.js 18+, tsx runner, Next.js Server Components and Route Handlers

---

## Architecture

StockSense follows a layered, resilient architecture designed for data integrity:

```
┌─────────────────────────────────────────────────────────────┐
│                 Next.js 14 Frontend UI                      │
│   (AppShell, AuthContext, Tailwind CSS, Lucide Icons)       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON API
┌──────────────────────────────▼──────────────────────────────┐
│              Next.js Middleware & Route Handlers            │
│       (JWT Verification, Server-Side Route Guard, RBAC)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Prisma Client
┌──────────────────────────────▼──────────────────────────────┐
│                  StockSense Domain Services                 │
│  - Atomic Balance Rebalancer      - Explainability Engine   │
│  - Immutable Ledger Logger        - Reorder Calculator      │
└──────────────────────────────┬──────────────────────────────┘
                               │ ACID Transactions
┌──────────────────────────────▼──────────────────────────────┐
│               PostgreSQL Relational Database                │
│  (Users, Products, Warehouses, StockBalances, StockLedger)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Inventory Flow

```
[ Inbound Receipt ]   ──► (+ Units) ──► Increases Physical Warehouse Balance
                                              │
                                              ▼
[ Internal Transfer ] ──► (- Units at Source) ──► (+ Units at Destination)
                                              │
                                              ▼
[ Customer Delivery ] ──► (- Units) ──► Validates against Stock & Deducts Balance
                                              │
                                              ▼
[ Physical Adjustment]──► (± Delta) ──► Reconciles Physical Count Discrepancies
                                              │
                                              ▼
                             [ Immutable Stock Ledger ]
                             Every action creates an unalterable audit log
```

---

## Project Structure

```
stocksense-github-ready/
├── src/
│   ├── app/                      # Next.js App Router pages and REST API handlers
│   │   ├── api/                  # Backend endpoints (auth, dashboard, ledger, operations, copilot)
│   │   ├── operations/           # Receipts, Deliveries, Transfers, Adjustments UIs
│   │   ├── products/             # Product list & "Why Did Stock Change?" drilldown
│   │   ├── ledger/               # Immutable Stock Ledger audit table
│   │   ├── health/               # Inventory Health & Reorder insights
│   │   ├── copilot/              # AI Natural Language Assistant UI
│   │   ├── profile/              # User Profile & dynamic permissions matrix
│   │   └── login/                # Unified authentication page
│   ├── components/               # Reusable UI components & layouts (AppShell, Navbar, Sidebar)
│   ├── context/                  # React Context providers (AuthContext)
│   ├── lib/                      # Database client (prisma.ts) and authentication helpers (auth.ts)
│   └── middleware.ts             # Server-side route guard & 401 API protector
├── prisma/
│   ├── schema.prisma             # Relational schema (18 models, enums, indexes)
│   └── seed.ts                   # Realistic demo dataset seeder
├── public/                       # Static public assets (icons, logos)
├── scripts/                      # Portable developer utility scripts (start.bat, setup.bat)
├── tests/                        # Domain test suite verifying ledger math and invariants
├── docs/
│   └── HACKATHON_CHECKPOINTS.md  # Milestone checkpoint documentation (Checkpoints 1-8)
├── .env.example                  # Safe configuration template (placeholders only)
├── .gitignore                    # Robust git ignore configuration
├── package.json                  # NPM dependencies and scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## Setup & Installation

### Prerequisites
- **Node.js**: v18.17.0 or higher
- **PostgreSQL**: v14 or higher running locally or on a cloud provider (e.g. Supabase, Neon)
- **NPM** or **Yarn**

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/stocksense.git
cd stocksense
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```
Open `.env` and fill in your actual PostgreSQL connection string:
```ini
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/stocksense?schema=public"
JWT_SECRET="replace_with_a_secure_random_key_min_32_characters"
```

### 3. Database Initialization & Seeding
Push the Prisma schema to create all tables and relationships, then seed the database with initial demonstration data:
```bash
npm run prisma:push
npm run prisma:seed
```

### 4. Run Domain Invariant Tests
```bash
npm test
```

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable Name | Purpose | Example / Format |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public` |
| `PG_USER` | PostgreSQL username | `postgres` |
| `PG_PASSWORD` | PostgreSQL password | `YOUR_SECURE_PASSWORD` |
| `PG_HOST` | Database host | `localhost` |
| `PG_PORT` | Database port | `5432` |
| `PG_DATABASE` | Database name | `stocksense` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Local server port | `3000` |
| `JWT_SECRET` | Secret key used for signing JWT auth tokens | `secure_random_string_32_chars` |
| `ENABLE_MOCK_OTP` | Enable pre-filled OTP code for demo evaluation | `true` |
| `DEMO_OTP_CODE` | Standard demonstration OTP | `123456` |

---

## Demo Information

The database seed script (`prisma/seed.ts`) populates standard demonstration personas with secure demo credentials:

| Persona | Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Alex Vance** | System Admin | `admin@stocksense.io` | `password123` | Full system access, ledger inspection, user management |
| **Marcus Green** | Inventory Manager | `manager@stocksense.io` | `password123` | Create & validate receipts, deliveries, transfers, adjustments |
| **Elena Rostova** | Warehouse Staff | `staff@stocksense.io` | `password123` | Draft inbound & outbound movements, cycle counting |

> [!NOTE]
> The `/login` page features 1-click demo persona quick-fill buttons for evaluator convenience.

---

## Recommended Hackathon Demonstration Flow (5–6 Minutes)

1. **Unified Authentication & RBAC (0:00 – 0:45)**:
   - Log in using the 1-click **System Admin** persona.
   - Show the clean full-screen layout without navbar leakage.
   - Navigate to `/profile` to highlight the dynamic Role Permissions Matrix.

2. **Live Operational Dashboard (0:45 – 1:30)**:
   - Review live KPIs (Total Valuation, Active SKUs, Low Stock alerts).
   - Filter by warehouse (Main Distribution Center vs. Northern Hub) to demonstrate isolated stock balances.

3. **Inbound Receipt & Dynamic Supplier (1:30 – 2:30)**:
   - Navigate to **Operations > Receipts** and create an Inbound Order.
   - Demonstrate the **Quick-Add Supplier** modal to dynamically register a new vendor without leaving the workflow.
   - Validate the receipt to trigger an atomic balance increment and ledger entry.

4. **Fulfillment with Overdraft Protection (2:30 – 3:30)**:
   - Navigate to **Operations > Deliveries**.
   - Attempt to dispatch more units than physically available to showcase zero-tolerance overdraft prevention.
   - Adjust quantity to a valid count and validate delivery.

5. **Physical Reconciliation & Dual Transfer (3:30 – 4:15)**:
   - Perform an **Adjustment** with reason code (e.g., Damage / Cycle Count Variance).
   - Demonstrate an **Internal Transfer** between warehouses, verifying conservation of total inventory.

6. **Explainability & Copilot (4:15 – 5:30)**:
   - Visit a product page to demonstrate **"Why Did Stock Change?"** waterfall attribution.
   - Open **StockSense Copilot** and ask: *"Which products are at stockout risk?"* or *"What was our largest receipt today?"*
   - Inspect the **Stock Ledger** (`/ledger`) to prove immutable audit trail compliance.

---

## License

This project is licensed under the MIT License.
