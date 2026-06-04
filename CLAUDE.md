

# Claude Coding Instructions

## Overview
You are an expert full-stack web developer and UI/UX designer. You are building a **Fintech SaaS dashboard** using **Next.js 16 + TypeScript + Tailwind CSS**. The goal is to create a modern, fast, and highly intuitive dashboard for managing bank transactions, invoices, and finances.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (latest version)
- **UI Library**: Shadcn UI (components only, build your own wrappers)
- **Icons**: Tabler React
- **Date Handling**: date-fns
- **Charts**: Recharts or Chart.js
- **State Management**: React Context API (for theme, user, etc.) or Zustand (optional)
- **Data Fetching**: React Query / TanStack Query

## Project Structure (App Router)
```
app/
├── Cashier/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── transactions/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   ├── invoices/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   ├── debt/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
├── Owner/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── products/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   ├── stock-adjustments/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   ├── transactions/
│   │   ├── page.tsx
│   │   ├── [id]/
│   │   │   └── page.tsx
│   ├── debt/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── setting/  // owner (also can add cashier account)
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
├── layout.tsx
└── page.tsx  // auth form
```

## UI/UX Guidelines

### Shadcn UI Preset
- j

## API Integration
Use the following API endpoints (mocked initially):

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/:id` - Get transaction by ID
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `GET /api/transactions/stats` - Get statistics

### Invoices
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `GET /api/invoices/:id` - Get invoice by ID
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Bank Accounts
- `GET /api/bank-accounts` - Get all accounts
- `POST /api/bank-accounts` - Create new account
- `GET /api/bank-accounts/:id` - Get account by ID
- `PUT /api/bank-accounts/:id` - Update account
- `DELETE /api/bank-accounts/:id` - Delete account

## Key Features by Page

### 1. Dashboard
- **Welcome banner** with user greeting
- **Quick stats cards**:
  - Total transactions (today, this month)
  - Total revenue (today, this month)
  - Number of customers
  - Open invoices
- **Recent transactions** table (last 5-10)
- **Revenue chart** (line or bar)
- **Quick actions** buttons:
  - Add transaction
  - Create invoice
  - Add customer

### 2. Transactions Page
- **Filter bar**: Date range, transaction type, customer
- **Search bar** by description or amount
- **Data table** with columns:
  - Date
  - Description
  - Amount
  - Type (Deposit
