# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint
npx drizzle-kit generate   # Generate migrations from schema changes
npx drizzle-kit migrate    # Apply migrations to the database
```

No test suite is configured.

## Architecture

This is a Next.js 16 App Router project using React 19, TypeScript, and Tailwind CSS v4. It is a full-stack application with a Neon PostgreSQL database, Drizzle ORM, and Better Auth.

### Tech Stack

- **Database**: Neon serverless PostgreSQL (`@neondatabase/serverless`)
- **ORM**: Drizzle ORM (`drizzle-orm`) — schema at `lib/db/schema.ts`, client at `lib/db/index.ts`
- **Auth**: Better Auth (`better-auth`) — server config at `lib/auth.ts`, client at `lib/auth-client.ts`
- **UI components**: `@base-ui/react` (headless) + `lucide-react` (icons)
- **Fonts**: Geist Sans and Geist Mono via `next/font/google`

### Environment Variables

```
DATABASE_URL          # Neon PostgreSQL connection string (required)
BETTER_AUTH_SECRET    # Random secret for Better Auth (required)
BETTER_AUTH_URL       # Auth origin, e.g. http://localhost:3000 (required)
GOOGLE_CLIENT_ID      # Google OAuth (optional)
GOOGLE_CLIENT_SECRET  # Google OAuth (optional)
```

### Data Flow

Authentication is enforced by middleware (`middleware.ts`). Unauthenticated requests are redirected to `/sign-in`. All API routes verify the session via `auth.api.getSession()`.

All state lives in `app/page.tsx`. The page fetches data from the API on mount and on filter/sort/page changes. CRUD operations make individual API calls and optimistically update local state.

### Database Schema (`lib/db/schema.ts`)

**Better Auth tables** (managed by Better Auth): `user`, `session`, `account`, `verification`

**App table: `transactions`**
- `id` — text primary key
- `userId` — FK to `user`, cascade delete
- `date` — text (YYYY-MM-DD)
- `description` — text
- `category` — text (nullable)
- `amount` — decimal(12,2), positive = income, negative = expense
- `status` — text: `'Completed' | 'Refunding' | 'Owed'`
- `source` — text (nullable)
- `createdAt` — bigint (ms since epoch, never displayed)
- `isGroup` — boolean (default false)
- `parentId` — self-referential FK for transaction grouping (nullable)
- `driveFileId` — text (nullable, reserved for future use)
- Index on `(userId, parentId, createdAt)` for query performance

### API Routes

**Auth:** `app/api/auth/[...all]/route.ts` — Better Auth catch-all handler

**Transactions:** `app/api/transactions/route.ts`
- `GET` — paginated top-level transactions (50/page); query params: `page`, `search`, `sortBy`, `sortDir`
  - With `?parentId=ID`: returns children of that group (no pagination)
- `POST` — create transaction; required fields: `date`, `description`, `amount`

**Single transaction:** `app/api/transactions/[id]/route.ts`
- `PUT` — update whitelisted fields: `date`, `description`, `category`, `amount`, `status`, `source`, `parentId`
- `DELETE` — delete transaction and all its children

### Middleware (`middleware.ts`)

- **Auth guard**: Redirects unauthenticated users to `/sign-in`; public routes: `/sign-in`, `/api/auth/**`
- **Rate limiting** (in-memory, per-serverless-instance): auth routes 10 req/min, API routes 60 req/min
- **CORS**: Configured for `BETTER_AUTH_URL`
- **Security headers**: X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy

### Key Data Types (`types/transaction.ts`)

- `Transaction` — core entity: `id`, `userId`, `date`, `description`, `category`, `amount`, `status`, `source`, `createdAt`, `isGroup`, `parentId`
- `Category` union: `'Income' | 'Subscriptions' | 'Entertainment' | 'Shopping' | 'None'`
- `Status` union: `'Completed' | 'Refunding' | 'Owed'`
- `SortConfig` — active sort column + direction
- `PaginatedResponse<T>` — `{ data, total, page, totalPages, limit }`

### Component Responsibilities

- `app/page.tsx` — owns all client state; handles pagination (50/page), search, sorting, CRUD, CSV import, and group expansion. Uses `authClient.useSession()` for session data.
- `app/sign-in/page.tsx` — email/password sign-in and sign-up; Google OAuth wired but UI toggle commented out
- `components/TransactionTable/` — renders the table with inline cell editing (click to edit, Enter/blur to commit, Escape to cancel); expandable group rows; "add row" form; checkbox selection
- `components/BulkActions.tsx` — dropdown for selected rows: bulk update (category, status, source) or bulk delete
- `components/CSVImportModal.tsx` — two-step modal (file upload → column mapping); auto-detects headers using signal words; presets in `lib/csvPresets.ts` for Capital One, Bank of America, Chase, PayPal
- `components/Pagination.tsx` — page navigation with manual page input
- `components/InputAutocomplete.tsx` — @base-ui/react Autocomplete wrapper for category/source fields
- `components/SettingsDrawer.tsx` — @base-ui/react Drawer showing account info and logout button
- `components/StatusBadge.tsx` — display-only status pill (Completed = emerald, Refunding = amber, Owed = rose)
- `components/SummaryBar.tsx` — stub, currently commented out

### Utilities

- `lib/groupUtils.ts` — `computeGroupFields()`: derives group summary (earliest date, summed amount, highest-priority status, shared source or "Mixed") from child transactions
- `lib/csvPresets.ts` — CSV column-mapping presets and row-transform functions per bank format

### Transaction Grouping

A group is a transaction with `isGroup: true`. Children have `parentId` referencing the group's `id`. Expanding a group in the table fetches its children from `/api/transactions?parentId=ID`. Group summary fields are computed client-side via `computeGroupFields()` and written back to the DB.

### Path Alias

`@/` maps to the project root (configured in `tsconfig.json`).

### Styling

Tailwind v4 with `@import "tailwindcss"` in `globals.css`. No custom theme extensions — uses default Tailwind utilities directly in JSX.

### Drizzle Migrations

Migrations are defined by schema in `lib/db/schema.ts` and output to `lib/db/migrations/`. Run `npx drizzle-kit generate` then `npx drizzle-kit migrate` after schema changes. Config is in `drizzle.config.ts`.

## Pull Request Descriptions

When asked to write a PR description, output it as a raw GitHub Markdown code block (fenced with ` ```markdown `) so it can be copied directly. Use only `##` for section headers (no `#` or `###`). Follow this structure:

```
## Summary
<bullet points of what changed and why>

## Changes
<bullet points of specific implementation changes>

## Notes
<any caveats, follow-ups, or context reviewers should know — omit section if none>
```
