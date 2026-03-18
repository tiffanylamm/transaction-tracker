import React, { useEffect, useMemo } from "react";
import { useState, useRef } from "react";
import { ArrowDown, ArrowUp, Check, Trash, X } from "lucide-react";
import { Transaction, SortConfig, Status } from "@/types/transaction";
import StatusBadge from "./StatusBadge";
import InputAutocomplete from "./InputAutocomplete"; 
interface TransactionTableProps {
  transactions: Transaction[];
  sortConfig: SortConfig | null;
  onSort: (key: keyof Transaction) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  showAddRow: boolean;
  onAdd: (transaction: Omit<Transaction, "id" | "createdAt">) => void;
  onCancelAdd: () => void;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUSES: Status[] = ["Completed", "Owed", "Refunding"];

type EditableFields = "date" | "description" | "category" | "amount" | "status";

const TransactionTable = ({
  transactions,
  sortConfig,
  onSort,
  onDelete,
  onUpdate,
  showAddRow,
  onAdd,
  onCancelAdd,
}: TransactionTableProps) => {
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    date: localToday(),
    description: "",
    category: null,
    amount: 0,
    status: "Completed",
  });
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: EditableFields;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const allSuggestions = useMemo(() => {
    const used = transactions.map((t) => t.category).filter(Boolean) as string[];
    return Array.from(new Set(used));
  }, [transactions]);

  //highlight all text in description on edit
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (
        inputRef.current instanceof HTMLInputElement &&
        inputRef.current.type === "text"
      ) {
        inputRef.current.select();
      }
    }
  }, [editingCell]);

  const startEditing = (
    id: string,
    field: EditableFields,
    currentValue: string | number,
  ) => {
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  };

  const commitEdit = () => {
    console.log(`Commiting edit: ${editValue}`)
    if (!editingCell) return;
    const { id, field } = editingCell;
    if (field === "amount") {
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed)) {
        onUpdate(id, { amount: parsed });
      }
    } else if (field === "date") {
      if (editValue) {
        onUpdate(id, { date: editValue });
      }
    } else if (field === "description") {
      if (editValue.trim()) {
        onUpdate(id, { description: editValue.trim() });
      }
    } else if (field === "category") {
      onUpdate(id, { category: editValue.trim() || null });
    } else if (field === "status") {
      onUpdate(id, { status: editValue as Status });
    }
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      commitEdit();
    } else if (e.key === "Escape") {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleSaveNew = () => {
    if (
      !newTransaction.date ||
      !newTransaction.description ||
      newTransaction.amount === undefined ||
      newTransaction.category === undefined
    )
      return;
    onAdd({
      date: newTransaction.date,
      description: newTransaction.description,
      category: newTransaction.category,
      amount: newTransaction.amount,
      status: newTransaction.status as Status,
    });

    setNewTransaction({
      date: localToday(),
      description: "",
      category: null,
      amount: 0,
      status: "Completed",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const userTimezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
    return adjustedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    const isIncome = amount > 0;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
    return (
      <span>
        {isIncome ? "+" : "-"}
        {formatted}
      </span>
    );
  };

  const renderSortIcon = (key: keyof Transaction) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 inline-block text-gray-400" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline-block text-gray-400" />
    );
  };

  const isEditing = (id: string, field: EditableFields) =>
    editingCell?.id === id && editingCell?.field === field;
  const thClass = `py-3 px-4 font-normal text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-200 select-none`;
  const tdClass = `py-2.5 px-4 text-[13px] border-b border-gray-100 whitespace-nowrap`;
  const addInputClass = `w-full bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:ring-0 p-1 text-[13px] text-gray-900 placeholder-gray-400 transition-colors outline-none`;
  const editInputClass =
    "w-full bg-transparent border-0 outline-none text-[13px] text-gray-900 p-0 m-0 focus:ring-0 caret-gray-400";
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        {/*Header*/}
        <thead>
          <tr>
            {/*Header Date*/}
            <th
              className={`${thClass} cursor-pointer hover:bg-gray-50 w-32`}
              onClick={() => onSort("date")}
            >
              Date {renderSortIcon("date")}
            </th>
            {/*Header Description*/}
            <th
              className={`${thClass} cursor-pointer hover:bg-gray-50 min-w-50`}
              onClick={() => onSort("description")}
            >
              Description {renderSortIcon("description")}
            </th>
            {/*Header Category*/}
            <th
              className={`${thClass} cursor-pointer hover:bg-gray-50 w-40`}
              onClick={() => onSort("category")}
            >
              Category {renderSortIcon("category")}
            </th>
            {/*Header Amount*/}
            <th
              className={`${thClass} cursor-pointer hover:bg-gray-50 text-right w-32`}
              onClick={() => onSort("amount")}
            >
              Amount {renderSortIcon("amount")}
            </th>
            {/*Header Status*/}
            <th
              className={`${thClass} cursor-pointer hover:bg-gray-50 w-32`}
              onClick={() => onSort("status")}
            >
              Status {renderSortIcon("status")}
            </th>
            {/*Header Empty on Right*/}
            <th className={`${thClass} w-16`}></th>
          </tr>
        </thead>
        <tbody>
          {/*Add Transaction Row*/}
          {showAddRow && (
            <tr className="bg-gray-50/50 border-b border-gray-200">
              {/*New Date*/}
              <td className="py-2 px-3">
                <input
                  type="date"
                  value={newTransaction.date}
                  className={addInputClass}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      date: e.target.value,
                    })
                  }
                  autoFocus
                />
              </td>
              {/*New Description*/}
              <td className="py-2 px-3">
                <input
                  type="text"
                  placeholder="Description..."
                  value={newTransaction.description}
                  className={addInputClass}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      description: e.target.value,
                    })
                  }
                />
              </td>
              {/*New Category*/}
              <td className="py-2 px-3">
                <InputAutocomplete
                  value={newTransaction.category ?? ""}
                  onChange={(val) =>
                    setNewTransaction({
                      ...newTransaction,
                      category: val.trim() || null,
                    })
                  }
                  suggestions={allSuggestions}
                />
              </td>
              {/*New Description*/}
              <td className="py-2 px-3">
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={newTransaction.amount || ""}
                  className={`${addInputClass} text-right`}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      amount: parseFloat(e.target.value),
                    })
                  }
                />
              </td>
              {/*New Status*/}
              <td className="py-2 px-3">
                <select
                  value={newTransaction.status}
                  className={addInputClass}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      status: e.target.value as Status,
                    })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              {/*New Extra At End*/}
              <td className="py-2 px-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handleSaveNew}
                    aria-label="Save Transaction"
                    className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                    disabled={
                      !newTransaction.description || !newTransaction.date
                    }
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onCancelAdd}
                    aria-label="Cancel"
                    className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          )}

          {/*Transaction Data*/}
          {transactions.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="py-8 text-center text-[13px] text-gray-500"
              >
                No transactions found.
              </td>
            </tr>
          ) : (
            transactions.map((tx) => (
              <tr
                key={tx.id}
                className="group hover:bg-gray-50 transition-colors"
              >
                {/*Date */}
                <td
                  className={`${tdClass} text-gray-500`}
                  onClick={() =>
                    !isEditing(tx.id, "date") &&
                    startEditing(tx.id, "date", tx.date)
                  }
                >
                  {isEditing(tx.id, "date") ? (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="date"
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        if (e.target.value) {
                          onUpdate(tx.id, { date: e.target.value });
                          setEditingCell(null);
                        }
                      }}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      className={`${editInputClass} text-gray-500`}
                    />
                  ) : (
                    <span className="bock py-px">{formatDate(tx.date)}</span>
                  )}
                </td>
                {/*Description */}
                <td
                  className={`${tdClass} font-medium text-gray-900`}
                  onClick={() =>
                    !isEditing(tx.id, "description") &&
                    startEditing(tx.id, "description", tx.description)
                  }
                >
                  {isEditing(tx.id, "description") ? (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      className={`${editInputClass} font-medium`}
                    />
                  ) : (
                    <span className="block py-px">{tx.description}</span>
                  )}
                </td>
                {/*Category */}
                <td
                  className={`${tdClass} text-gray-500`}
                  onClick={() =>
                    !isEditing(tx.id, "category") &&
                    startEditing(tx.id, "category", tx.category ?? "")
                  }
                >
                  {isEditing(tx.id, "category") ? (
                    <InputAutocomplete
                      value={editValue}
                      onChange={setEditValue}
                      onBlur={commitEdit}
                      onCancel={() => { setEditingCell(null); setEditValue(""); }}
                      onCommit={(val) => {
                        onUpdate(tx.id, { category: val.trim() || null });
                        setEditingCell(null);
                        setEditValue("");
                      }}
                      suggestions={allSuggestions}
                    />
                  ) : (
                    <span className="bock py-px">{tx.category ?? ""}</span>
                  )}
                </td>
                {/*Amount */}
                <td
                  className={`${tdClass} text-right font-medium`}
                  onClick={() =>
                    !isEditing(tx.id, "amount") &&
                    startEditing(tx.id, "amount", tx.amount)
                  }
                >
                  {isEditing(tx.id, "amount") ? (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="number"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                      }}
                      onBlur={commitEdit}
                      onKeyDown={handleKeyDown}
                      className={`${editInputClass} text-right font-medium`}
                    />
                  ) : (
                    <span className="bock py-px">
                      {formatAmount(tx.amount)}
                    </span>
                  )}
                </td>
                {/*Status */}
                <td
                  className={`${tdClass}`}
                  onClick={() =>
                    !isEditing(tx.id, "status") &&
                    startEditing(tx.id, "status", tx.status)
                  }
                >
                  {isEditing(tx.id, "status") ? (
                    <select
                      ref={inputRef as React.RefObject<HTMLSelectElement>}
                      value={editValue}
                      onChange={(e) => {
                        onUpdate(tx.id, {
                          status: e.target.value as Status,
                        });
                        setEditingCell(null);
                      }}
                      onBlur={() => setEditingCell(null)}
                      className={`${editInputClass} bg-transparent`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <StatusBadge status={tx.status} />
                  )}
                </td>
                {/*Controls */}
                <td className={`${tdClass} text-right`}>
                  <button
                    aria-label={`Delete ${tx.description}`}
                    className="p-1 text-gray-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    onClick={() => onDelete(tx.id)}
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
