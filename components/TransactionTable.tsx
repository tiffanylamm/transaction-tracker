import React, { useEffect, useMemo } from "react";
import { useState, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Trash,
  Unlink,
  X,
} from "lucide-react";
import { Transaction, SortConfig, Status } from "@/types/transaction";
import StatusBadge from "./StatusBadge";
import InputAutocomplete from "./InputAutocomplete";
import { computeGroupFields } from "@/lib/groupUtils";

interface TransactionTableProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  sortConfig: SortConfig | null;
  onSort: (key: keyof Transaction) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  showAddRow: boolean;
  onAdd: (transaction: Omit<Transaction, "id" | "createdAt">) => void;
  onCancelAdd: () => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onClearSelection: () => void;
  onCreateGroup: (name: string) => void;
  onAddToGroup: (groupId: string) => void;
  onUnlinkChild: (childId: string) => void;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const STATUSES: Status[] = ["Completed", "Owed", "Refunding"];

const LOCKED_GROUP_FIELDS = new Set(["date", "amount", "status", "source"]);

type EditableFields =
  | "date"
  | "description"
  | "category"
  | "amount"
  | "status"
  | "source";

const TransactionTable = ({
  transactions,
  allTransactions,
  sortConfig,
  onSort,
  onDelete,
  onUpdate,
  showAddRow,
  onAdd,
  onCancelAdd,
  expandedIds,
  onToggleExpand,
  selectedIds,
  onToggleSelect,
  onClearSelection,
  onCreateGroup,
  onAddToGroup,
  onUnlinkChild,
}: TransactionTableProps) => {
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    date: localToday(),
    description: "",
    category: null,
    amount: 0,
    status: "Completed",
    source: null,
    isGroup: false,
    parentId: null,
  });
  const [groupInput, setGroupInput] = useState("");
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: EditableFields;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const allSuggestions = useMemo(() => {
    const used = allTransactions
      .map((t) => t.category)
      .filter(Boolean) as string[];
    return Array.from(new Set(used));
  }, [allTransactions]);

  const allSourceSuggestions = useMemo(() => {
    const used = allTransactions
      .map((t) => t.source)
      .filter(Boolean) as string[];
    return Array.from(new Set(used));
  }, [allTransactions]);

  const selectedUngroupedIds = useMemo(
    () =>
      allTransactions
        .filter(
          (tx) => selectedIds.has(tx.id) && !tx.isGroup && tx.parentId === null,
        )
        .map((tx) => tx.id),
    [allTransactions, selectedIds],
  );

  const existingGroups = useMemo(
    () => transactions.filter((tx) => tx.isGroup),
    [transactions],
  );

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
    isGroupRow: boolean,
  ) => {
    if (isGroupRow && LOCKED_GROUP_FIELDS.has(field)) return;
    setEditingCell({ id, field });
    setEditValue(String(currentValue));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    if (field === "amount") {
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed)) onUpdate(id, { amount: parsed });
    } else if (field === "date") {
      if (editValue) onUpdate(id, { date: editValue });
    } else if (field === "description") {
      if (editValue.trim()) onUpdate(id, { description: editValue.trim() });
    } else if (field === "category") {
      onUpdate(id, { category: editValue.trim() || null });
    } else if (field === "source") {
      onUpdate(id, { source: editValue.trim() || null });
    } else if (field === "status") {
      onUpdate(id, { status: editValue as Status });
    }
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    else if (e.key === "Escape") {
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
      source: newTransaction.source ?? null,
      isGroup: false,
      parentId: null,
    });
    setNewTransaction({
      date: localToday(),
      description: "",
      category: null,
      amount: 0,
      status: "Completed",
      source: null,
      isGroup: false,
      parentId: null,
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
  const editInputClass = `w-full bg-transparent border-0 outline-none text-[13px] text-gray-900 p-0 m-0 focus:ring-0 caret-gray-400`;

  return (
    <div className="w-full">
      {/* Toolbar — always reserves space to prevent table shift */}
      <div className={`flex items-center gap-2 mb-3 flex-wrap h-8 ${selectedIds.size === 0 ? "invisible" : ""}`}>
          <span className="text-[12px] text-gray-400">
            {selectedUngroupedIds.length} selected
          </span>
          {selectedUngroupedIds.length >= 1 && (
            <div className="flex items-center gap-1">
              <InputAutocomplete
                value={groupInput}
                onChange={setGroupInput}
                suggestions={existingGroups.map((g) => g.description)}
                placeholder="Group as…"
                autoFocus={false}
                onCancel={() => setGroupInput("")}
                onCommit={(val) => {
                  const trimmed = val.trim();
                  if (!trimmed) return;
                  const existing = existingGroups.find(
                    (g) => g.description === trimmed,
                  );
                  if (existing) {
                    onAddToGroup(existing.id);
                  } else {
                    onCreateGroup(trimmed);
                  }
                  setGroupInput("");
                }}
              />
            </div>
          )}
          <button
            onClick={() => {
              onClearSelection();
              setGroupInput("");
            }}
            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-16rem)]">
        <table className="w-full text-left border-collapse">
          {/* Header */}
          <thead className="sticky top-0 bg-white z-2">
            <tr>
              <th className={`${thClass} w-8`} />
              <th
                className={`${thClass} cursor-pointer hover:bg-gray-50 w-32`}
                onClick={() => onSort("date")}
              >
                Date {renderSortIcon("date")}
              </th>
              <th
                className={`${thClass} cursor-pointer hover:bg-gray-50 min-w-50`}
                onClick={() => onSort("description")}
              >
                Description {renderSortIcon("description")}
              </th>
              <th
                className={`${thClass} cursor-pointer hover:bg-gray-50 w-40`}
                onClick={() => onSort("category")}
              >
                Category {renderSortIcon("category")}
              </th>
              <th
                className={`${thClass} cursor-pointer hover:bg-gray-50 text-right w-32`}
                onClick={() => onSort("amount")}
              >
                Amount {renderSortIcon("amount")}
              </th>
              <th
                className={`${thClass} cursor-pointer hover:bg-gray-50 w-32`}
                onClick={() => onSort("status")}
              >
                Status {renderSortIcon("status")}
              </th>
              <th
                className={`${thClass} cursor-pointer hover:bg-gray-50 w-40`}
                onClick={() => onSort("source")}
              >
                Source {renderSortIcon("source")}
              </th>
              <th className={`${thClass} w-16`} />
            </tr>
          </thead>
          <tbody>
            {/* Add Transaction Row */}
            {showAddRow && (
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <td className="py-2 px-3" />
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
                    placeholder="Category..."
                    positionerZIndex={50}
                  />
                </td>
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
                <td className="py-2 px-3">
                  <InputAutocomplete
                    value={newTransaction.source ?? ""}
                    onChange={(val) =>
                      setNewTransaction({
                        ...newTransaction,
                        source: val.trim() || null,
                      })
                    }
                    suggestions={allSourceSuggestions}
                    placeholder="Source..."
                    positionerZIndex={50}
                  />
                </td>
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

            {/* Transaction rows */}
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-8 text-center text-[13px] text-gray-500"
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isExpanded = expandedIds.has(tx.id);
                const children = tx.isGroup
                  ? allTransactions.filter((c) => c.parentId === tx.id)
                  : [];
                const display =
                  tx.isGroup && children.length > 0
                    ? { ...tx, ...computeGroupFields(children) }
                    : tx;
                const isSelected = selectedIds.has(tx.id) && !tx.isGroup;

                return (
                  <React.Fragment key={tx.id}>
                    {/* Parent / regular row */}
                    <tr
                      className={`group transition-colors ${
                        isSelected
                          ? "bg-blue-50/60 hover:bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Col 1: chevron for groups, checkbox for regular */}
                      <td className={`${tdClass} w-8 align-middle`}>
                        {tx.isGroup ? (
                          <button
                            onClick={() => onToggleExpand(tx.id)}
                            className="flex text-gray-400 hover:text-gray-700 transition-colors"
                            aria-label={
                              isExpanded ? "Collapse group" : "Expand group"
                            }
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <label className="flex items-center justify-center w-full h-full min-h-8 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelect(tx.id)}
                              className="w-3.5 h-3.5 accent-gray-700 cursor-pointer"
                            />
                          </label>
                        )}
                      </td>

                      {/* Date */}
                      <td
                        className={`${tdClass} text-gray-500`}
                        onClick={() =>
                          !isEditing(tx.id, "date") &&
                          startEditing(tx.id, "date", display.date, tx.isGroup)
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
                          <span className="block py-px">
                            {formatDate(display.date)}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td
                        className={`${tdClass} font-medium text-gray-900`}
                        onClick={() =>
                          !isEditing(tx.id, "description") &&
                          startEditing(
                            tx.id,
                            "description",
                            tx.description,
                            tx.isGroup,
                          )
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

                      {/* Category */}
                      <td
                        className={`${tdClass} text-gray-500`}
                        onClick={() =>
                          !isEditing(tx.id, "category") &&
                          startEditing(
                            tx.id,
                            "category",
                            tx.category ?? "",
                            tx.isGroup,
                          )
                        }
                      >
                        {isEditing(tx.id, "category") ? (
                          <InputAutocomplete
                            value={editValue}
                            onChange={setEditValue}
                            onBlur={commitEdit}
                            onCancel={() => {
                              setEditingCell(null);
                              setEditValue("");
                            }}
                            onCommit={(val) => {
                              onUpdate(tx.id, { category: val.trim() || null });
                              setEditingCell(null);
                              setEditValue("");
                            }}
                            suggestions={allSuggestions}
                            positionerZIndex={50}
                          />
                        ) : (
                          <span className="block py-px">
                            {tx.category ?? ""}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        className={`${tdClass} text-right font-medium`}
                        onClick={() =>
                          !isEditing(tx.id, "amount") &&
                          startEditing(
                            tx.id,
                            "amount",
                            display.amount,
                            tx.isGroup,
                          )
                        }
                      >
                        {isEditing(tx.id, "amount") ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="number"
                            step="0.01"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className={`${editInputClass} text-right font-medium`}
                          />
                        ) : (
                          <span className="block py-px">
                            {formatAmount(display.amount)}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td
                        className={`${tdClass}`}
                        onClick={() =>
                          !isEditing(tx.id, "status") &&
                          startEditing(tx.id, "status", tx.status, tx.isGroup)
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
                          <StatusBadge status={display.status} />
                        )}
                      </td>

                      {/* Source */}
                      <td
                        className={`${tdClass} text-gray-500`}
                        onClick={() =>
                          !isEditing(tx.id, "source") &&
                          startEditing(
                            tx.id,
                            "source",
                            display.source ?? "",
                            tx.isGroup,
                          )
                        }
                      >
                        {isEditing(tx.id, "source") ? (
                          <InputAutocomplete
                            value={editValue}
                            onChange={setEditValue}
                            onBlur={commitEdit}
                            onCancel={() => {
                              setEditingCell(null);
                              setEditValue("");
                            }}
                            onCommit={(val) => {
                              onUpdate(tx.id, { source: val.trim() || null });
                              setEditingCell(null);
                              setEditValue("");
                            }}
                            suggestions={allSourceSuggestions}
                            positionerZIndex={50}
                          />
                        ) : (
                          <span className="block py-px">
                            {display.source ?? ""}
                          </span>
                        )}
                      </td>

                      {/* Controls */}
                      <td className={`${tdClass} text-right`}>
                        <button
                          aria-label={
                            tx.isGroup
                              ? "Delete group"
                              : `Delete ${tx.description}`
                          }
                          title={
                            tx.isGroup
                              ? "Delete group and all its transactions"
                              : "Delete"
                          }
                          className="p-1 text-gray-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                          onClick={() => onDelete(tx.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Child rows */}
                    {tx.isGroup &&
                      isExpanded &&
                      children.map((child) => (
                        <tr
                          key={child.id}
                          className="group hover:bg-gray-50/70 transition-colors"
                        >
                          <td className={`${tdClass} w-8`} />

                          {/* Date indented */}
                          <td className={`${tdClass} text-gray-400`}>
                            <div className="flex items-center gap-1.5">
                              {isEditing(child.id, "date") ? (
                                <input
                                  ref={
                                    inputRef as React.RefObject<HTMLInputElement>
                                  }
                                  type="date"
                                  value={editValue}
                                  onChange={(e) => {
                                    setEditValue(e.target.value);
                                    if (e.target.value) {
                                      onUpdate(child.id, {
                                        date: e.target.value,
                                      });
                                      setEditingCell(null);
                                    }
                                  }}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                  className={`${editInputClass} text-[12px] text-gray-400`}
                                />
                              ) : (
                                <span
                                  className="cursor-text"
                                  onClick={() =>
                                    !isEditing(child.id, "date") &&
                                    startEditing(
                                      child.id,
                                      "date",
                                      child.date,
                                      false,
                                    )
                                  }
                                >
                                  {formatDate(child.date)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Description */}
                          <td
                            className={`${tdClass} text-gray-900`}
                            onClick={() =>
                              !isEditing(child.id, "description") &&
                              startEditing(
                                child.id,
                                "description",
                                child.description,
                                false,
                              )
                            }
                          >
                            <div className="">
                              {isEditing(child.id, "description") ? (
                                <input
                                  ref={
                                    inputRef as React.RefObject<HTMLInputElement>
                                  }
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={handleKeyDown}
                                  className={`${editInputClass}`}
                                />
                              ) : (
                                <span className="cursor-text block py-px">
                                  {child.description}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category */}
                          <td
                            className={`${tdClass} text-gray-400 text-[12px]`}
                            onClick={() =>
                              !isEditing(child.id, "category") &&
                              startEditing(
                                child.id,
                                "category",
                                child.category ?? "",
                                false,
                              )
                            }
                          >
                            {isEditing(child.id, "category") ? (
                              <InputAutocomplete
                                value={editValue}
                                onChange={setEditValue}
                                onBlur={commitEdit}
                                onCancel={() => {
                                  setEditingCell(null);
                                  setEditValue("");
                                }}
                                onCommit={(val) => {
                                  onUpdate(child.id, {
                                    category: val.trim() || null,
                                  });
                                  setEditingCell(null);
                                  setEditValue("");
                                }}
                                suggestions={allSuggestions}
                                positionerZIndex={50}
                              />
                            ) : (
                              <span className="cursor-text block py-px">
                                {child.category ?? ""}
                              </span>
                            )}
                          </td>

                          {/* Amount */}
                          <td
                            className={`${tdClass} text-right text-[12px] text-gray-700`}
                            onClick={() =>
                              !isEditing(child.id, "amount") &&
                              startEditing(
                                child.id,
                                "amount",
                                child.amount,
                                false,
                              )
                            }
                          >
                            {isEditing(child.id, "amount") ? (
                              <input
                                ref={
                                  inputRef as React.RefObject<HTMLInputElement>
                                }
                                type="number"
                                step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={handleKeyDown}
                                className={`${editInputClass} text-right text-[12px]`}
                              />
                            ) : (
                              <span className="cursor-text block py-px">
                                {formatAmount(child.amount)}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td
                            className={tdClass}
                            onClick={() =>
                              !isEditing(child.id, "status") &&
                              startEditing(
                                child.id,
                                "status",
                                child.status,
                                false,
                              )
                            }
                          >
                            {isEditing(child.id, "status") ? (
                              <select
                                ref={
                                  inputRef as React.RefObject<HTMLSelectElement>
                                }
                                value={editValue}
                                onChange={(e) => {
                                  onUpdate(child.id, {
                                    status: e.target.value as Status,
                                  });
                                  setEditingCell(null);
                                }}
                                onBlur={() => setEditingCell(null)}
                                className={`${editInputClass} bg-transparent text-[12px]`}
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="cursor-pointer">
                                <StatusBadge status={child.status} />
                              </span>
                            )}
                          </td>

                          {/* Source */}
                          <td
                            className={`${tdClass} text-gray-400`}
                            onClick={() =>
                              !isEditing(child.id, "source") &&
                              startEditing(
                                child.id,
                                "source",
                                child.source ?? "",
                                false,
                              )
                            }
                          >
                            {isEditing(child.id, "source") ? (
                              <InputAutocomplete
                                value={editValue}
                                onChange={setEditValue}
                                onBlur={commitEdit}
                                onCancel={() => {
                                  setEditingCell(null);
                                  setEditValue("");
                                }}
                                onCommit={(val) => {
                                  onUpdate(child.id, {
                                    source: val.trim() || null,
                                  });
                                  setEditingCell(null);
                                  setEditValue("");
                                }}
                                suggestions={allSourceSuggestions}
                                positionerZIndex={50}
                              />
                            ) : (
                              <span className="cursor-text block py-px">
                                {child.source ?? ""}
                              </span>
                            )}
                          </td>

                          {/* Unlink from group */}
                          <td className={`${tdClass} text-right`}>
                            <button
                              aria-label="Remove from group"
                              title="Remove from group"
                              className="p-1 text-gray-300 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                              onClick={() => onUnlinkChild(child.id)}
                            >
                              <Unlink className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
