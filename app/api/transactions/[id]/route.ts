import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { STATUSES, UPDATABLE_FIELDS } from "@/types/transaction";

type DbRow = typeof transactions.$inferSelect;

// Recomputes group summary fields from its DB children rows
function computeSummary(children: DbRow[]) {
  const date = children.reduce(
    (e, c) => (c.date < e ? c.date : e),
    children[0].date,
  );
  const amount = String(children.reduce((s, c) => s + Number(c.amount), 0));
  const priority: Record<string, number> = { Owed: 3, Refunding: 2, Completed: 1 };
  const status = children.reduce(
    (top, c) => ((priority[c.status] ?? 0) > (priority[top] ?? 0) ? c.status : top),
    children[0].status,
  );
  const srcs = [...new Set(children.map((c) => c.source).filter(Boolean))] as string[];
  const source = srcs.length === 0 ? null : srcs.length === 1 ? srcs[0] : "Mixed";
  return { date, amount, status, source };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Only allow whitelisted fields
  const updates: Record<string, unknown> = {};
  for (const key of UPDATABLE_FIELDS) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return Response.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  // Validate specific fields if present
  if (updates.amount !== undefined) {
    if (isNaN(Number(updates.amount))) {
      return Response.json(
        { error: "amount must be a valid number" },
        { status: 400 },
      );
    }
    updates.amount = String(updates.amount);
  }
  if (
    updates.status !== undefined &&
    !STATUSES.includes(updates.status as (typeof STATUSES)[number])
  ) {
    return Response.json(
      { error: `status must be one of: ${STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const row = await db
    .update(transactions)
    .set(updates)
    .where(
      and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
    )
    .returning();

  if (!row.length)
    return Response.json({ error: "Not found" }, { status: 404 });

  // Walk up the parentId chain and recompute each ancestor group's summary
  const ancestors: DbRow[] = [];
  let currentId = id;
  while (true) {
    const [current] = await db
      .select({ parentId: transactions.parentId })
      .from(transactions)
      .where(
        and(eq(transactions.id, currentId), eq(transactions.userId, session.user.id)),
      );
    if (!current?.parentId) break;

    const children = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.parentId, current.parentId),
          eq(transactions.userId, session.user.id),
        ),
      );
    if (children.length === 0) break;

    const summary = computeSummary(children);
    const [updatedAncestor] = await db
      .update(transactions)
      .set(summary)
      .where(
        and(
          eq(transactions.id, current.parentId),
          eq(transactions.userId, session.user.id),
        ),
      )
      .returning();
    ancestors.push(updatedAncestor);
    currentId = current.parentId;
  }

  return Response.json({ updated: row[0], ancestors });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [row] = await db
    .delete(transactions)
    .where(
      and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
    )
    .returning();

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
