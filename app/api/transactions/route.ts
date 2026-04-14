import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, desc, asc, and, isNull, ilike, or, count, inArray, SQL } from "drizzle-orm";
import { STATUSES, UPDATABLE_FIELDS } from "@/types/transaction";

const SORTABLE_COLUMNS = {
  date: transactions.date,
  description: transactions.description,
  category: transactions.category,
  amount: transactions.amount,
  status: transactions.status,
  source: transactions.source,
} as const;

type SortableKey = keyof typeof SORTABLE_COLUMNS;

function isSortable(key: string | null): key is SortableKey {
  return key !== null && key in SORTABLE_COLUMNS;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);

  // Metadata branch — all groups, distinct categories, distinct sources
  if (url.searchParams.get("metadata") === "true") {
    const userFilter = eq(transactions.userId, session.user.id);
    const [groups, categories, sources] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(and(userFilter, eq(transactions.isGroup, true)))
        .orderBy(desc(transactions.createdAt)),
      db
        .selectDistinct({ category: transactions.category })
        .from(transactions)
        .where(userFilter),
      db
        .selectDistinct({ source: transactions.source })
        .from(transactions)
        .where(userFilter),
    ]);
    return Response.json({
      groups,
      categories: categories.map((r) => r.category).filter(Boolean),
      sources: sources.map((r) => r.source).filter(Boolean),
    });
  }

  const parentIdParam = url.searchParams.get("parentId");

  // Child fetch branch — return children of a group, no pagination
  if (parentIdParam) {
    const children = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, session.user.id),
          eq(transactions.parentId, parentIdParam),
        ),
      )
      .orderBy(asc(transactions.createdAt));
    return Response.json(children);
  }

  // Paginated top-level branch
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = 50;
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search")?.trim() ?? "";
  const sortBy = url.searchParams.get("sortBy");
  const sortDir = url.searchParams.get("sortDir");

  const conditions: SQL[] = [
    eq(transactions.userId, session.user.id),
    isNull(transactions.parentId),
  ];

  if (search) {
    conditions.push(
      or(
        ilike(transactions.description, `%${search}%`),
        ilike(transactions.category, `%${search}%`),
      ) as SQL,
    );
  }

  const whereClause = and(...conditions);

  let orderByClause;
  if (isSortable(sortBy) && (sortDir === "asc" || sortDir === "desc")) {
    const col = SORTABLE_COLUMNS[sortBy];
    orderByClause = sortDir === "asc" ? asc(col) : desc(col);
  } else {
    orderByClause = desc(transactions.createdAt);
  }

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(transactions).where(whereClause),
  ]);

  const total = Number(countResult[0].total);

  // Fetch child counts for any group rows on this page
  const groupIds = data.filter((tx) => tx.isGroup).map((tx) => tx.id);
  const childCountMap: Record<string, number> = {};
  if (groupIds.length > 0) {
    const childCounts = await db
      .select({ parentId: transactions.parentId, total: count() })
      .from(transactions)
      .where(and(eq(transactions.userId, session.user.id), inArray(transactions.parentId, groupIds)))
      .groupBy(transactions.parentId);
    for (const row of childCounts) {
      if (row.parentId) childCountMap[row.parentId] = Number(row.total);
    }
  }

  const dataWithCounts = data.map((tx) =>
    tx.isGroup ? { ...tx, childCount: childCountMap[tx.id] ?? 0 } : tx,
  );

  return Response.json({
    data: dataWithCounts,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  });
}

function validateTransaction(tx: Record<string, unknown>): string | null {
  if (!tx.date || typeof tx.date !== "string") return "date is required and must be a string";
  if (!tx.description || typeof tx.description !== "string") return "description is required and must be a string";
  if (tx.amount === undefined || (typeof tx.amount !== "number" && typeof tx.amount !== "string")) return "amount is required and must be a number";
  if (isNaN(Number(tx.amount))) return "amount must be a valid number";
  if (tx.status && !(STATUSES as string[]).includes(tx.status as string)) return `status must be one of: ${STATUSES.join(", ")}`;
  return null;
}

function toInsertValues(tx: Record<string, unknown>, userId: string) {
  return {
    id: crypto.randomUUID(),
    date: tx.date as string,
    description: tx.description as string,
    category: (tx.category as string) ?? null,
    amount: String(tx.amount),
    status: (tx.status as string) ?? "Completed",
    source: (tx.source as string) ?? null,
    createdAt: typeof tx.createdAt === "number" ? tx.createdAt : Date.now(),
    isGroup: (tx.isGroup as boolean) ?? false,
    parentId: (tx.parentId as string) ?? null,
    userId,
  };
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  // Bulk insert
  if (Array.isArray(body)) {
    for (let i = 0; i < body.length; i++) {
      const err = validateTransaction(body[i]);
      if (err) return Response.json({ error: `Row ${i}: ${err}` }, { status: 400 });
    }
    const rows = await db
      .insert(transactions)
      .values(body.map((tx: Record<string, unknown>) => toInsertValues(tx, session.user.id)))
      .returning();
    return Response.json(rows, { status: 201 });
  }

  // Single insert
  const err = validateTransaction(body);
  if (err) return Response.json({ error: err }, { status: 400 });

  const [row] = await db
    .insert(transactions)
    .values(toInsertValues(body, session.user.id))
    .returning();

  return Response.json(row, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ids, updates } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  const filtered: Record<string, unknown> = {};
  for (const key of UPDATABLE_FIELDS) {
    if (key in updates) filtered[key] = updates[key];
  }
  if (Object.keys(filtered).length === 0) {
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }
  if (filtered.amount !== undefined) {
    if (isNaN(Number(filtered.amount))) {
      return Response.json({ error: "amount must be a valid number" }, { status: 400 });
    }
    filtered.amount = String(filtered.amount);
  }
  if (filtered.status !== undefined && !(STATUSES as string[]).includes(filtered.status as string)) {
    return Response.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }

  const rows = await db
    .update(transactions)
    .set(filtered)
    .where(
      and(eq(transactions.userId, session.user.id), inArray(transactions.id, ids)),
    )
    .returning();

  return Response.json(rows);
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return Response.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  await db
    .delete(transactions)
    .where(
      and(eq(transactions.userId, session.user.id), inArray(transactions.id, ids)),
    );

  return new Response(null, { status: 204 });
}
