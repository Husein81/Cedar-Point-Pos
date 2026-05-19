# CedarPoint POS System

Pointverse is a modern, offline-first, enterprise-grade Point of Sale (POS) and ERP-like system designed for retail and restaurant businesses. It is built as a monorepo using Turborepo, ensuring scalability, maintainability, and high performance.

The system comprises a powerful NestJS backend, a cross-platform Electron/React desktop POS application, and a Next.js-based System Administration dashboard.

## 🚀 Key Features

### 🖥️ POS Desktop Application (`apps/pos-desktop`)

A robust, offline-capable desktop application built with Electron and React.

- **Dashboard**: Real-time overview of sales, orders, and key metrics.
- **Order Management**: seamless order creation, table management, and kitchen display integration.
- **Inventory & Stock**: Real-time stock tracking, varying product attributes (variants, modifiers), and supplier management.
- **Kitchen Display System (KDS)**: Dedicated interface for kitchen staff to view and manage incoming orders.
- **Table Management**: Visual floor plan editor and table status tracking (Occupied, Reserved, Available).
- **Customers**: CRM functionality to track customer purchase history and loyalty.
- **Invoices & Payments**: Split payments, multiple payment methods, and invoice generation.
- **Reporting**: Detailed financial and operational reports.
- **Offline Mode**: Continue operations even when the internet connection is lost (data syncs when back online).

### ⚙️ Backend API (`apps/api`)

A scalable server-side application built with NestJS.

- **Modular Architecture**: Clean separation of concerns (Auth, Orders, Inventory, Users, etc.).
- **Authentication**: Secure JWT-based authentication with Passport strategy.
- **Database**: PostgreSQL database managed via Prisma ORM for type-safe database access.
- **Reporting Engine**: Aggregation and analytics for business intelligence.
- **Tenant Management**: Multi-tenancy support for managing multiple business entities.

### 🛠️ System Admin (`apps/system-admin`)

A web-based administration panel for platform owners.

- **Tenant Management**: Onboard and manage different businesses/tenants.
- **User Management**: System-wide user administration.
- **System Health**: Monitoring system performance and status.
- **Global Settings**: Configuration of currencies, regions, and system-wide defaults.

---

## 🏗️ Technology Stack

### Monorepo & Build Tools

- **Turborepo**: High-performance build system for monorepos.
- **pnpm**: Fast, disk space-efficient package manager.
- **TypeScript**: Statically typed JavaScript for type safety across the entire stack.

### Backend (`apps/api`)

- **Framework**: [NestJS](https://nestjs.com/) (Node.js framework)
- **Database**: PostgreSQL
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: Passport.js (JWT)
- **Testing**: Jest
- **Validation**: Class-validator & Class-transformer

### Frontend POS (`apps/pos-desktop`)

- **Runtime**: [Electron](https://www.electronjs.org/)
- **Framework**: [React](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **State Management**: React Hooks / Context / Zustand (implied)
- **UI Library**: [Shadcn UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Data Fetching/Sync**: Supabase / TanStack Query

### Frontend System Admin (`apps/system-admin`)

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Styling**: Tailwind CSS

### Shared Packages (`packages/`)

- **@repo/ui**: Shared React component library (Shadcn UI based).
- **@repo/types**: Shared TypeScript interfaces and DTOs.
- **@repo/eslint-config**: Shared linting configuration.
- **@repo/typescript-config**: Shared tsconfig bases.

---

## 📂 Project Structure

```
c:\Users\fadix\POS-SYS\Pointverse
├── apps
│   ├── api             # NestJS Backend API
│   ├── pos-desktop     # Electron POS Application
│   └── system-admin    # Next.js Admin Dashboard
├── packages
│   ├── ui              # Shared UI Components
│   ├── types           # Shared Types
│   └── ...             # Config packages
├── package.json        # Root package.json
├── pnpm-workspace.yaml # pnpm workspace config
└── turbo.json          # Turborepo pipeline config
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.0.0 (Recommended package manager)
- **PostgreSQL**: Local installed or Docker container

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd Pointverse
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Environment Setup:**
   - Navigate to `apps/api` and create a `.env` file based on `.env.example`.
   - Ensure your PostgreSQL connection string (`DATABASE_URL`) is correctly set.

4. **Database Setup:**
   Run the following command from the root or `apps/api` to generate the Prisma client and push the schema to your database.
   ```bash
   pnpm db:generate
   pnpm db:push
   # Optional: Seed the database
   pnpm db:seed
   ```

### Running the Project

You can run individual apps or the entire stack using Turbo.

**Run All Apps (Dev Mode):**

```bash
pnpm dev
```

**Run Specific App:**

```bash
# Run only Backend API
pnpm dev --filter=api

# Run only POS Desktop
pnpm dev --filter=pos-desktop

# Run only System Admin
pnpm dev --filter=admin
```

### Building for Production

To build all apps and packages:

```bash
pnpm build
```

---

## 🤝 Contributing

1. Create a new branch for your feature or fix.
2. Commit your changes with clear messages.
3. Push the branch and open a Pull Request.
4. Ensure all linting and tests pass before merging.

## 📄 License

This project is licensed under the UNLICENSED license.
