import { Status, Transaction } from "@/types/transaction";

export const STATUS_PRIORITY: Record<Status, number> = {
  Owed: 3,
  Refunding: 2,
  Completed: 1,
};

export function computeGroupFields(
  children: Transaction[]
): Pick<Transaction, "date" | "amount" | "status" | "source"> {
  const date = children.reduce(
    (earliest, c) => (c.date < earliest ? c.date : earliest),
    children[0].date
  );
  const amount = children.reduce((sum, c) => sum + Number(c.amount), 0);
  const status = children.reduce(
    (top, c) =>
      STATUS_PRIORITY[c.status] > STATUS_PRIORITY[top] ? c.status : top,
    children[0].status
  );
  const sources = [
    ...new Set(children.map((c) => c.source).filter(Boolean)),
  ] as string[];
  const source =
    sources.length === 0 ? null : sources.length === 1 ? sources[0] : "Mixed";
  return { date, amount, status, source };
}
