import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, desc, asc, and, isNull, ilike, or, count, inArray, SQL } from "drizzle-orm";
import { STATUSES } from "@/types/transaction";

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

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const { date, description, category, amount, status, source, isGroup, parentId, createdAt } = body;

  if (!date || typeof date !== "string") {
    return Response.json({ error: "date is required and must be a string" }, { status: 400 });
  }
  if (!description || typeof description !== "string") {
    return Response.json({ error: "description is required and must be a string" }, { status: 400 });
  }
  if (amount === undefined || (typeof amount !== "number" && typeof amount !== "string")) {
    return Response.json({ error: "amount is required and must be a number" }, { status: 400 });
  }
  if (isNaN(Number(amount))) {
    return Response.json({ error: "amount must be a valid number" }, { status: 400 });
  }
  if (status && !STATUSES.includes(status)) {
    return Response.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }

  const [row] = await db
    .insert(transactions)
    .values({
      id: crypto.randomUUID(),
      date,
      description,
      category: category ?? null,
      amount: String(amount),
      status: status ?? "Completed",
      source: source ?? null,
      createdAt: typeof createdAt === "number" ? createdAt : Date.now(),
      isGroup: isGroup ?? false,
      parentId: parentId ?? null,
      userId: session.user.id,
    })
    .returning();

  return Response.json(row, { status: 201 });
}
