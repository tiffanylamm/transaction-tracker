import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

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

  const row = await db
    .update(transactions)
    .set(body)
    .where(
      and(eq(transactions.id, id), eq(transactions.userId, session.user.id)),
    )
    .returning();

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
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
