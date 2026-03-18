# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Architecture

This is a Next.js 16 App Router project using React 19, TypeScript, and Tailwind CSS v4.

**Data flow:** All state lives in `app/page.tsx` (the single-page app). No backend, no persistence — data resets on page reload. The `INITIAL_TRANSACTIONS` array in `page.tsx` serves as seed data.

**Key data types** (`types/transaction.ts`):
- `Transaction` — core entity with `id`, `date` (YYYY-MM-DD string), `description`, `category`, `amount` (positive = income, negative = expense), `status`, and `createdAt` (timestamp, never displayed)
- `Category` union: `'Income' | 'Subscriptions' | 'Entertainment' | 'Shopping' | 'None'`
- `Status` union: `'Completed' | 'Refunding' | 'Owed'`
- `SortConfig` — tracks active sort column and direction

**Component responsibilities:**
- `app/page.tsx` — owns all state; handles filtering (search by description/category), sorting (tri-state: asc → desc → none), and CRUD operations; passes derived `processedTransactions` down to `TransactionTable`
- `components/TransactionTable.tsx` — renders the table with inline cell editing (click a cell to edit, Enter/blur to commit, Escape to cancel); also renders the "add row" form when `showAddRow` is true
- `components/CSVImportModal.tsx` — two-step modal: file upload → column mapping UI; auto-detects header row using signal words; requires mapping date, description, and amount columns before import is enabled
- `components/StatusBadge.tsx` — display-only pill for transaction status
- `components/SummaryBar.tsx` — stub, currently commented out

**Path alias:** `@/` maps to the project root (configured in `tsconfig.json`).

**Styling:** Tailwind v4 with `@import "tailwindcss"` in `globals.css`. No custom theme extensions — uses default Tailwind utilities directly in JSX. Fonts are Geist Sans and Geist Mono loaded via `next/font/google`.
