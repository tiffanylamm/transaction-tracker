import React from "react";
import { Status } from "../types/transaction";
interface StatusBadgeProps {
  status: Status;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const styles = {
    Completed: "bg-emerald-50 text-emerald-600",
    Refunding: "bg-amber-50 text-amber-600",
    Owed: "bg-rose-50 text-rose-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium tracking-wide ${styles[status]}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
