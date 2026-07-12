# TransitOps — Smart Transport Operations Platform

A full-stack fleet management platform for tracking vehicles, drivers, trips, maintenance, fuel, and expenses — with role-based access, real-time KPI dashboards, and financial analytics.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Roles & Access](#roles--access)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Folder Structure](#folder-structure)
- [License](#license)

---

## Tech Stack

**Backend**
- Node.js + Express 5
- PostgreSQL + Prisma ORM
- JWT authentication (access + refresh tokens), `bcryptjs` password hashing
- Zod validation, `express-rate-limit`, `helmet`, `cors`, `morgan` logging
- `nodemailer` for email alerts

**Frontend**
- React 19 + Vite
- Tailwind CSS
- Zustand (state management)
- React Hook Form + Zod (forms & validation)
- Recharts (charts/graphs)
- React Hot Toast (notifications)
- jsPDF + jsPDF-AutoTable (PDF export)
- Lucide React (icons)

---

## Features

### 1. Authentication & Role-Based Access Control
- JWT login, token refresh, logout, and "get current user" endpoint
- 4 roles: `FleetManager`, `Dispatcher`, `SafetyOfficer`, `FinancialAnalyst`
- Account lockout after repeated failed login attempts
- Rate-limited login endpoint (brute-force protection)
- Protected routes and role-based route guards on the frontend

### 2. Vehicle Management
- Full CRUD: registration number, name, model, type, max load capacity, odometer, acquisition cost
- Status lifecycle: `Available → OnTrip → InShop → Retired`
- List view + Grid/Card view toggle
- Search, filter (by status/type), and pagination

### 3. Driver Management
- Full CRUD: name, license number, license category, license expiry date, contact number, safety score
- Status: `Available`, `OnTrip`, `OffDuty`, `Suspended`
- List view + Grid/Card view toggle
- Search, filter, sort, and pagination
- License expiry tracking (expired / expiring within 30 days)

### 4. Trip Management
- Full workflow: `Draft → Dispatched → Completed / Cancelled`
- Assigns a vehicle and driver per trip
- Tracks source, destination, cargo weight, planned distance, actual distance, fuel consumed, and revenue
- Auto-updates vehicle/driver status on dispatch, completion, or cancellation
- **List view + Kanban board view** (drag-free status columns by trip stage)

### 5. Maintenance Logs
- Per-vehicle service records: description, cost, start date, end date
- Status: `Active` / `Closed` — an active log auto-flips the vehicle to `InShop`
- **Three view modes: Table, Grid/Card, and Calendar view** (month-based calendar showing scheduled/active maintenance)

### 6. Fuel Logs
- Per-vehicle fuel entries: liters, cost, date
- Feeds fuel efficiency analytics

### 7. Expense Tracking
- Per-vehicle expenses: type (Toll / Other), amount, date
- Feeds operational cost analytics

### 8. Dashboard (KPI Overview)
- Active vehicles, available vehicles, vehicles in maintenance
- Active trips, pending trips, drivers on duty
- Fleet utilization % (on-trip vehicles ÷ total non-retired vehicles)
- Vehicle status breakdown (chart-ready data)

### 9. Analytics Module
*(Restricted to `FleetManager` and `FinancialAnalyst` roles)*
- **Fuel Efficiency** — km/liter per vehicle
- **Fleet Utilization** — % of fleet currently on trip
- **Operational Cost** — fuel + maintenance + expense breakdown per vehicle
- **Vehicle ROI** — revenue vs. acquisition + running cost
- **Trip Trends** — trip volume/performance over time
- CSV export of analytics data

### 10. Notifications & Alerts
- Computed alert panel: driver license expiry/expired alerts
- Manual "send license reminder" email trigger (SafetyOfficer role) via SMTP/Nodemailer

### 11. Export
- CSV export (backend, analytics data)
- PDF export on the frontend (jsPDF + AutoTable)

### 12. UI/UX
- Reusable UI kit: Modal, Table, Badge, Select, Skeleton loaders, Spinner, Toast
- Responsive, role-aware sidebar + topbar app shell
- Dark/light theme toggle
- Inline form validation with error states
- Search, filter, sort, and pagination across list pages

---

## Roles & Access

| Role | Access |
|---|---|
| **Fleet Manager** | Full access — vehicles, drivers, trips, maintenance, analytics, dashboard |
| **Dispatcher** | Trip creation/dispatch, vehicle & driver assignment |
| **Safety Officer** | Driver records, license alerts, safety scores, maintenance oversight, sends license reminder emails |
| **Financial Analyst** | Analytics, fuel/expense reports, ROI, CSV export |

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env    # fill in DATABASE_URL, JWT secrets, SMTP config
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## Folder Structure

```
backend/
  src/
    controllers/     # request handlers
    services/        # business logic
    routes/           # API route definitions
    validators/        # Zod schemas
    middlewares/        # auth, rate limiting, role checks
    utils/               # helpers (CSV, decimal, tokens, mailer, etc.)
  prisma/
    schema.prisma       # DB models
    seed.js

frontend/
  src/
    features/            # page-level modules (auth, vehicles, drivers, trips, maintenance, fuelExpenses, analytics, dashboard)
    components/          # ui/ (reusable) and layout/ (Sidebar, Topbar, AppShell)
    api/                  # axios API clients per module
    store/                # Zustand stores (auth, theme)
    routes/               # route guards (ProtectedRoute, RoleRoute)
    lib/                   # constants, utils
```

## Made by ❤️ & ☕ by Team Code2Win
