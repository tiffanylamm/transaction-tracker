import { Transaction, Status, STATUSES } from "@/types/transaction";
import { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";

interface AddTransactionRowProps {
  showAddRow: boolean;
  onAdd: (transaction: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
  onCancelAdd: () => void;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const emptyTransaction = (): Partial<Transaction> => ({
  date: localToday(),
  description: "",
  category: null,
  amount: 0,
  status: "Completed",
  source: null,
  isGroup: false,
  parentId: null,
  driveFileId: null,
});

const AddTransactionRow = ({
  showAddRow,
  onAdd,
  onCancelAdd,
}: AddTransactionRowProps) => {
  const [newTransaction, setNewTransaction] =
    useState<Partial<Transaction>>(emptyTransaction());
  const [showAddErrors, setShowAddErrors] = useState(false);
  const descriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showAddRow) {
      setNewTransaction(emptyTransaction());
      setShowAddErrors(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddRow]);

  const handleSave = async () => {
    if (
      !newTransaction.date ||
      !newTransaction.description ||
      newTransaction.amount === undefined ||
      newTransaction.category === undefined
    ) {
      setShowAddErrors(true);
      return;
    }
    await onAdd({
      date: newTransaction.date,
      description: newTransaction.description,
      category: newTransaction.category,
      amount: newTransaction.amount,
      status: newTransaction.status as Status,
      source: newTransaction.source ?? null,
      isGroup: false,
      parentId: null,
      driveFileId: null,
    });
    setShowAddErrors(false);
    setNewTransaction(emptyTransaction());
    descriptionRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setShowAddErrors(false);
      onCancelAdd();
    }
  };

  if (!showAddRow) return null;

  const addInputClass = `w-full bg-transparent border-0 border-b border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:ring-0 p-1 text-[13px] text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-gray-500 transition-colors outline-none`;
  const tdClass = `h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 whitespace-nowrap`;

  return (
    <tr
      className="border-b border-gray-100 dark:border-gray-800"
      onKeyDown={handleKeyDown}
    >
      {/* Checkbox placeholder */}
      <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800" />

      {/* Date */}
      <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800">
        <input
          type="date"
          value={newTransaction.date}
          className={`${addInputClass} ${
            showAddErrors && !newTransaction.date
              ? "border-rose-400! dark:border-rose-500!"
              : ""
          }`}
          onChange={(e) =>
            setNewTransaction({ ...newTransaction, date: e.target.value })
          }
          autoFocus
        />
      </td>

      {/* Description */}
      <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800">
        <input
          ref={descriptionRef}
          type="text"
          placeholder="Description..."
          value={newTransaction.description}
          className={`${addInputClass} ${
            showAddErrors && !newTransaction.description
              ? "border-rose-400! dark:border-rose-500!"
              : ""
          }`}
          onChange={(e) =>
            setNewTransaction({
              ...newTransaction,
              description: e.target.value,
            })
          }
        />
      </td>

      {/* Category */}
      <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800">
        <input
          type="text"
          list="add-row-categories"
          placeholder="Category..."
          value={newTransaction.category ?? ""}
          autoCapitalize="none"
          className={addInputClass}
          onChange={(e) =>
            setNewTransaction({
              ...newTransaction,
              category: e.target.value || null,
            })
          }
        />
      </td>

      {/* Amount */}
      <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800">
        <input
          type="number"
          placeholder="0.00"
          step="0.01"
          value={newTransaction.amount || ""}
          className={`${addInputClass} text-right ${
            showAddErrors && newTransaction.amount === undefined
              ? "border-rose-400! dark:border-rose-500!"
              : ""
          }`}
          onChange={(e) =>
            setNewTransaction({
              ...newTransaction,
              amount: parseFloat(e.target.value),
            })
          }
        />
      </td>

      {/* Status */}
      <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800">
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

      {/* Source */}
      <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800">
        <input
          type="text"
          list="add-row-sources"
          placeholder="Source..."
          value={newTransaction.source ?? ""}
          autoCapitalize="none"
          className={addInputClass}
          onChange={(e) =>
            setNewTransaction({
              ...newTransaction,
              source: e.target.value || null,
            })
          }
        />
      </td>

      {/* File — not available on new row */}
      <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800" />

      {/* Save button */}
      <td className={tdClass}>
        <button
          onClick={handleSave}
          aria-label="Save Transaction"
          className="p-1 text-gray-400 hover:text-emerald-600 dark:text-gray-500 dark:hover:text-emerald-400 transition-colors"
        >
          <Check className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export default AddTransactionRow;
