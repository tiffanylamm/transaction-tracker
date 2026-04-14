import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { STATUSES, UPDATABLE_FIELDS } from "@/types/transaction";

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
    return Response.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Validate specific fields if present
  if (updates.amount !== undefined) {
    if (isNaN(Number(updates.amount))) {
      return Response.json({ error: "amount must be a valid number" }, { status: 400 });
    }
    updates.amount = String(updates.amount);
  }
  if (updates.status !== undefined && !STATUSES.includes(updates.status as typeof STATUSES[number])) {
    return Response.json({ error: `status must be one of: ${STATUSES.join(", ")}` }, { status: 400 });
  }

  const row = await db
    .update(transactions)
    .set(updates)
    .where(
      and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
    )
    .returning();

  if (!row.length) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(row);
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
