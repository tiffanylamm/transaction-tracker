import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq, desc, asc, and, isNull, ilike, or, count, SQL } from "drizzle-orm";

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

  return Response.json({
    data,
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

  const [row] = await db
    .insert(transactions)
    .values({ ...body, userId: session.user.id })
    .returning();

  return Response.json(row, { status: 201 });
}
