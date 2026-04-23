import React, { useEffect, useMemo } from "react";
import { useState, useRef } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Trash,
  Unlink,
  X,
} from "lucide-react";
import { Transaction, SortConfig, Status, STATUSES } from "@/types/transaction";
import StatusBadge from "./StatusBadge";
import BulkActions from "./BulkActions";
import ContextMenu from "./ContextMenu";
import TransactionTableHeader from "./TransactionTableHeader";
import DriveFile, { AttachButton } from "./DriveFileCell";
import AddTransactionRow from "./AddTransactionRow";
import useEditingCell from "@/hooks/useEditingCell";
import { formatDate, formatAmount } from "@/lib/formatters";
import useDriveAttach from "@/hooks/useDriveAttach";

interface TransactionTableProps {
  transactions: Transaction[];
  allTransactions: Transaction[];
  sortConfig: SortConfig | null;
  onSort: (key: keyof Transaction) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  showAddRow: boolean;
  onAdd: (transaction: Omit<Transaction, "id" | "createdAt">) => Promise<void>;
  onCancelAdd: () => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  selectedIds: Map<string, Transaction>;
  onToggleSelect: (tx: Transaction) => void;
  onSelectAll: (txs: Transaction[]) => void;
  onClearSelection: () => void;
  onCreateGroup: (name: string) => Promise<string>;
  onAddToGroup: (groupId: string) => void;
  onUnlinkChild: (childId: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Transaction>) => void;
  allGroups: Transaction[];
  allCategories: string[];
  allSources: string[];
  currentPage: number;
  columnFilters: { category: string[]; status: string[]; source: string[] };
  onFilterChange: (
    col: "category" | "status" | "source",
    values: string[],
  ) => void;
  textFilters: {
    description: string;
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
  };
  onTextFilterChange: (
    col: "description" | "dateFrom" | "dateTo" | "amountMin" | "amountMax",
    value: string,
  ) => void;
  totalAmount: number;
  showTotalsRow: boolean;
  scrollToTopRef?: React.RefObject<(() => void) | null>;
  groupFilters: Record<string, string[]>;
  onGroupFilterChange: (groupId: string, categories: string[]) => void;
  showGroupFilters: boolean;
  onToggleAbsSort: () => void;
  absValue: boolean;
}



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
  onSelectAll,
  onClearSelection,
  onCreateGroup,
  onAddToGroup,
  onUnlinkChild,
  onBulkDelete,
  onBulkUpdate,
  allGroups,
  allCategories,
  allSources,
  currentPage,
  columnFilters,
  onFilterChange,
  textFilters,
  onTextFilterChange,
  totalAmount,
  showTotalsRow,
  scrollToTopRef,
  groupFilters,
  onGroupFilterChange,
  showGroupFilters,
  onToggleAbsSort,
  absValue,
}: TransactionTableProps) => {
  const [contextMenuPos, setContextMenuPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const handleRowContextMenu = (e: React.MouseEvent, tx: Transaction) => {
    e.preventDefault();
    if (!selectedIds.has(tx.id)) {
      onToggleSelect(tx);
    }
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };
  const [groupDescSearch, setGroupDescSearch] = useState<
    Record<string, string>
  >({});
  const lastClickedIdRef = useRef<string | null>(null);
  const shiftKeyRef = useRef(false);

  const {
    editingCell,
    editValue,
    inputRef,
    isEditing,
    startEditing,
    commitEdit,
    handleKeyDown,
    setEditValue,
    setEditingCell,
  } = useEditingCell({ allTransactions, onUpdate });

  const {
    driveConnected,
    uploadingIds,
    fileInputRef,
    handleAttach,
    handleFileSelected,
  } = useDriveAttach({ onUpdate });

  const pendingFocusIdRef = useRef<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToTopRef) {
      scrollToTopRef.current = () =>
        tableContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [scrollToTopRef]);
  const [openFilterCol, setOpenFilterCol] = useState<
    "date" | "description" | "amount" | "category" | "status" | "source" | null
  >(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tableContainerRef.current?.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    if (!openFilterCol) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilterCol(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openFilterCol]);

  const canGroup = useMemo(() => {
    const selected = [...selectedIds.values()];
    if (selected.length < 1) return false;
    const firstParentId = selected[0].parentId ?? null;
    return selected.every((tx) => (tx.parentId ?? null) === firstParentId);
  }, [selectedIds]);

  useEffect(() => {
    if (pendingFocusIdRef.current) {
      const id = pendingFocusIdRef.current;
      pendingFocusIdRef.current = null;
      setEditingCell({ id, field: "description" });
      setEditValue("New Group");
    }
  }, [transactions, allTransactions]);

  const handleCreateGroup = async () => {
    if (!canGroup) return;
    const newGroupId = await onCreateGroup("New Group");
    pendingFocusIdRef.current = newGroupId;
  };

  const tdClass = `h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 whitespace-nowrap`;
  const editInputClass = `w-full bg-transparent border-0 outline-none text-[13px] text-gray-900 dark:text-foreground p-0 m-0 focus:ring-0 caret-gray-400 dark:caret-gray-500`;

  // Recursive child row renderer — handles groups at any nesting depth
  const renderChildRows = (children: Transaction[]): React.ReactNode =>
    children.map((child) => {
      const childIsExpanded = child.isGroup && expandedIds.has(child.id);
      const grandchildren = child.isGroup
        ? allTransactions.filter((gc) => gc.parentId === child.id)
        : [];

      return (
        <React.Fragment key={child.id}>
          <tr
            className={`group transition-colors ${
              selectedIds.has(child.id)
                ? "bg-blue-50/60 hover:bg-gray-50 dark:bg-[#282828] dark:hover:bg-[#424242]"
                : "hover:bg-gray-50/70 dark:hover:bg-[#424242]"
            }`}
            onContextMenu={(e) => handleRowContextMenu(e, child)}
          >
            <td className={`${tdClass} w-8 align-middle`}>
              <label
                className="flex items-center justify-center w-full h-full min-h-8 cursor-pointer select-none"
                onMouseDown={(e) => {
                  shiftKeyRef.current = e.shiftKey;
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(child.id)}
                  onChange={() => {
                    if (
                      shiftKeyRef.current &&
                      lastClickedIdRef.current !== null
                    ) {
                      const lastIdx = children.findIndex(
                        (c) => c.id === lastClickedIdRef.current,
                      );
                      const currIdx = children.findIndex(
                        (c) => c.id === child.id,
                      );
                      if (lastIdx !== -1) {
                        const from = Math.min(lastIdx, currIdx);
                        const to = Math.max(lastIdx, currIdx);
                        onSelectAll(children.slice(from, to + 1));
                        return;
                      }
                    }
                    onToggleSelect(child);
                    lastClickedIdRef.current = child.id;
                  }}
                  className="w-3.5 h-3.5 accent-gray-900 dark:accent-gray-300 cursor-pointer"
                />
              </label>
            </td>

            {/* Date */}
            <td className={`${tdClass}`}>
              <div className="flex items-center gap-1.5">
                {isEditing(child.id, "date") ? (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="date"
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      if (e.target.value) {
                        onUpdate(child.id, { date: e.target.value });
                        setEditingCell(null);
                      }
                    }}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    className={`${editInputClass}`}
                  />
                ) : (
                  <span
                    className="cursor-text"
                    onClick={() =>
                      !isEditing(child.id, "date") &&
                      startEditing(child.id, "date", child.date, child.isGroup)
                    }
                  >
                    {formatDate(child.date)}
                  </span>
                )}
              </div>
            </td>

            {/* Description */}
            <td
              className={`${tdClass} dark:text-foreground`}
              onClick={() =>
                !isEditing(child.id, "description") &&
                startEditing(
                  child.id,
                  "description",
                  child.description,
                  child.isGroup,
                )
              }
            >
              {isEditing(child.id, "description") ? (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  className={`${editInputClass}`}
                />
              ) : (
                <span className="flex items-center justify-between gap-1.5 cursor-text py-px min-w-0">
                  <span className="uppercase truncate block">
                    {child.description}
                  </span>
                  {/* {child.isGroup && child.childCount !== undefined && (
                    <span className="text-gray-400 dark:text-gray-500 text-[11px] font-normal shrink-0">
                      · {child.childCount}{" "}
                      {child.childCount === 1 ? "Transaction" : "Transactions"}
                    </span>
                  )} */}
                  {child.isGroup && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleExpand(child.id);
                      }}
                      className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-foreground transition-colors shrink-0"
                      aria-label={
                        childIsExpanded ? "Collapse group" : "Expand group"
                      }
                    >
                      {childIsExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </span>
              )}
            </td>

            {/* Category */}
            <td
              className={`${tdClass}`}
              onClick={() =>
                !isEditing(child.id, "category") &&
                startEditing(
                  child.id,
                  "category",
                  child.category ?? "",
                  child.isGroup,
                )
              }
            >
              {isEditing(child.id, "category") ? (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={editValue}
                  autoCapitalize="none"
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  className={editInputClass}
                />
              ) : (
                <span className="cursor-text block py-px">
                  {child.category ?? ""}
                </span>
              )}
            </td>

            {/* Amount */}
            <td
              className={`${tdClass} text-right`}
              onClick={() =>
                !isEditing(child.id, "amount") &&
                startEditing(child.id, "amount", child.amount, child.isGroup)
              }
            >
              {isEditing(child.id, "amount") ? (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  className={`${editInputClass} text-right`}
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
                startEditing(child.id, "status", child.status, child.isGroup)
              }
            >
              {isEditing(child.id, "status") ? (
                <select
                  ref={inputRef as React.RefObject<HTMLSelectElement>}
                  value={editValue}
                  onChange={(e) => {
                    onUpdate(child.id, { status: e.target.value as Status });
                    setEditingCell(null);
                  }}
                  onBlur={() => setEditingCell(null)}
                  className={`${editInputClass}`}
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
              className={`${tdClass}`}
              onClick={() =>
                !isEditing(child.id, "source") &&
                startEditing(
                  child.id,
                  "source",
                  child.source ?? "",
                  child.isGroup,
                )
              }
            >
              {isEditing(child.id, "source") ? (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={editValue}
                  autoCapitalize="none"
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  className={editInputClass}
                />
              ) : (
                <span className="cursor-text block py-px">
                  {child.source ?? ""}
                </span>
              )}
            </td>

            {/* File */}
            <td className={`${tdClass} align-middle`}>
              {!child.isGroup &&
                (uploadingIds.has(child.id) ? (
                  <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-pulse" />
                ) : child.driveFileId ? (
                  <DriveFile
                    fileId={child.driveFileId}
                    onUnlink={() => onUpdate(child.id, { driveFileId: null })}
                  />
                ) : (
                  <AttachButton onClick={() => handleAttach(child)} />
                ))}
            </td>

            {/* Unlink from group */}
            <td className={`${tdClass}`}>
              <button
                aria-label="Remove from group"
                title="Remove from group"
                className="p-1 text-gray-400 hover:text-orange-500 dark:text-gray-500 dark:hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                onClick={() => onUnlinkChild(child.id)}
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>

          {/* Nested children when this child is itself an expanded group */}
          {childIsExpanded && renderChildRows(grandchildren)}
        </React.Fragment>
      );
    });

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar — always reserves space to prevent table shift */}
      <div className="flex items-center gap-1 mb-3 flex-wrap h-8 shrink-0">
        <span className="text-[12px] text-gray-400 dark:text-gray-500 tabular-nums w-18 shrink-0 text-right">
          {selectedIds.size} selected
        </span>
        <button
          onClick={() => {
            onClearSelection();
          }}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors cursor-pointer"
          aria-label="Clear selection"
          title="Clear All Selected"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          disabled={!canGroup}
          onClick={handleCreateGroup}
          className="flex items-center gap-1 px-2 h-7 text-[12px] font-medium text-white bg-gray-800 dark:bg-[#e3e3e3] dark:text-background rounded transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Layers className="w-3.5 h-3.5" />
          Group
        </button>
        <BulkActions
          selectedIds={selectedIds}
          onBulkDelete={onBulkDelete}
          onBulkUpdate={onBulkUpdate}
          onClearSelection={onClearSelection}
          onAddToGroup={onAddToGroup}
          allGroups={allGroups}
          allCategories={allCategories}
          allSources={allSources}
        />
      </div>

      <div
        ref={tableContainerRef}
        className="overflow-x-auto overflow-y-auto flex-1 min-h-0"
      >
        <table className="w-full min-w-274 text-left border-collapse table-fixed">
          <colgroup>
            <col className="w-8" />
            <col className="w-34" />
            <col />
            <col className="w-38" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-38" />
            <col className="w-14" />
            <col className="w-14" />
          </colgroup>
          {/* Header */}
          <TransactionTableHeader
            transactions={transactions}
            sortConfig={sortConfig}
            onSort={onSort}
            columnFilters={columnFilters}
            onFilterSelectChange={onFilterChange}
            textFilters={textFilters}
            onFilterTextChange={onTextFilterChange}
            allCategories={allCategories}
            allSources={allSources}
            selectedIdsMap={selectedIds}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onToggleAbsSort={onToggleAbsSort}
            absValue={absValue}
          />
          <tbody>
            {/* Totals Row */}
            {showTotalsRow && (
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <td className="border-r border-gray-100 dark:border-gray-800" />
                <td className="border-r border-gray-100 dark:border-gray-800" />
                <td className="border-r border-gray-100 dark:border-gray-800" />
                <td className="border-r border-gray-100 dark:border-gray-800" />
                <td className="h-9 px-4 text-[13px] font-medium whitespace-nowrap text-right border-r border-gray-100 dark:border-gray-800">
                  {(() => {
                    const isPositive = totalAmount >= 0;
                    const formatted = new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                    }).format(Math.abs(totalAmount));
                    return (
                      <span
                        className={
                          isPositive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }
                      >
                        {isPositive ? "+" : "-"}
                        {formatted}
                      </span>
                    );
                  })()}
                </td>
                <td className="border-r border-gray-100 dark:border-gray-800" />
                <td className="border-r border-gray-100 dark:border-gray-800" />
                <td className="border-r border-gray-100 dark:border-gray-800" />
                <td className="border-r border-gray-100 dark:border-gray-800" />
              </tr>
            )}
            {/* Add Transaction Row */}
            <AddTransactionRow
              showAddRow={showAddRow}
              onAdd={onAdd}
              onCancelAdd={onCancelAdd}
            />

            {/* Transaction rows */}
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-8 text-center text-[13px] text-gray-400 dark:text-gray-500"
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
                const isSelected = selectedIds.has(tx.id);

                // Group filter state — computed here so parent row can use it
                const activeFilters =
                  tx.isGroup && isExpanded && showGroupFilters
                    ? (groupFilters[tx.id] ?? [])
                    : [];
                const descSearch =
                  tx.isGroup && isExpanded && showGroupFilters
                    ? (groupDescSearch[tx.id] ?? "")
                    : "";
                const uniqueCategories =
                  tx.isGroup && isExpanded
                    ? [...new Set(children.map((c) => c.category ?? ""))].sort()
                    : [];
                const filteredChildren =
                  tx.isGroup && isExpanded
                    ? children.filter((c) => {
                        const matchesCategory =
                          activeFilters.length === 0 ||
                          activeFilters.includes(c.category ?? "");
                        const matchesDesc =
                          !descSearch ||
                          c.description
                            .toLowerCase()
                            .includes(descSearch.toLowerCase());
                        return matchesCategory && matchesDesc;
                      })
                    : children;
                const filteredTotal = filteredChildren.reduce(
                  (sum, c) => sum + Number(c.amount),
                  0,
                );
                const isFiltered = activeFilters.length > 0 || !!descSearch;

                return (
                  <React.Fragment key={tx.id}>
                    {/* Parent / regular row */}
                    <tr
                      className={`group transition-colors ${
                        isSelected
                          ? "bg-blue-50/60 hover:bg-gray-50 dark:bg-[#282828] dark:hover:bg-[#424242]"
                          : "hover:bg-gray-50 dark:hover:bg-[#424242]"
                      }`}
                      onContextMenu={(e) => handleRowContextMenu(e, tx)}
                    >
                      {/* Col 1: checkbox for all rows */}
                      <td className={`${tdClass} w-8 align-middle`}>
                        <label
                          className="flex items-center justify-center w-full h-full min-h-8 cursor-pointer select-none"
                          onMouseDown={(e) => {
                            shiftKeyRef.current = e.shiftKey;
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (
                                shiftKeyRef.current &&
                                lastClickedIdRef.current !== null
                              ) {
                                const lastIdx = transactions.findIndex(
                                  (t) => t.id === lastClickedIdRef.current,
                                );
                                const currIdx = transactions.findIndex(
                                  (t) => t.id === tx.id,
                                );
                                if (lastIdx !== -1) {
                                  const from = Math.min(lastIdx, currIdx);
                                  const to = Math.max(lastIdx, currIdx);
                                  onSelectAll(transactions.slice(from, to + 1));
                                  return;
                                }
                              }
                              onToggleSelect(tx);
                              lastClickedIdRef.current = tx.id;
                            }}
                            className="w-3.5 h-3.5 accent-gray-900 dark:accent-gray-300 cursor-pointer"
                          />
                        </label>
                      </td>

                      {/* Date */}
                      <td
                        className={`${tdClass}`}
                        onClick={() =>
                          !isEditing(tx.id, "date") &&
                          startEditing(tx.id, "date", tx.date, tx.isGroup)
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
                            className={`${editInputClass} text-gray-600 dark:text-gray-400`}
                          />
                        ) : (
                          <span className="block py-px">
                            {formatDate(tx.date)}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td
                        className={`h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 whitespace-nowrap text-gray-900 dark:text-foreground font-medium`}
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
                          <span className="flex items-center justify-between gap-1.5 py-px min-w-0 w-full">
                            <span className="uppercase truncate">
                              {tx.description}
                            </span>

                            <div className="flex items-center gap-2">
                              {tx.isGroup &&
                                tx.childCount !== undefined &&
                                isFiltered &&
                                isExpanded && (
                                  <span className="text-gray-400 dark:text-gray-500 text-[11px] font-normal">
                                    {filteredChildren.length}/{tx.childCount}{" "}
                                    {tx.childCount === 1 ? "Txn" : "Txns"}
                                  </span>
                                )}
                              {tx.isGroup && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleExpand(tx.id);
                                  }}
                                  className="px-1 py-1 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-foreground transition-colors shrink-0 cursor-pointer"
                                  aria-label={
                                    isExpanded
                                      ? "Collapse group"
                                      : "Expand group"
                                  }
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td
                        className={tdClass}
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
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            value={editValue}
                            autoCapitalize="none"
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className={editInputClass}
                          />
                        ) : (
                          <span className="block py-px">
                            {tx.category ?? ""}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td
                        className={`h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 whitespace-nowrap text-gray-900 dark:text-foreground font-medium text-right`}
                        onClick={() =>
                          !isEditing(tx.id, "amount") &&
                          startEditing(tx.id, "amount", tx.amount, tx.isGroup)
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
                            {tx.isGroup && isExpanded && isFiltered
                              ? formatAmount(filteredTotal)
                              : formatAmount(tx.amount)}
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
                          <StatusBadge status={tx.status} />
                        )}
                      </td>

                      {/* Source */}
                      <td
                        className={tdClass}
                        onClick={() =>
                          !isEditing(tx.id, "source") &&
                          startEditing(
                            tx.id,
                            "source",
                            tx.source ?? "",
                            tx.isGroup,
                          )
                        }
                      >
                        {isEditing(tx.id, "source") ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            value={editValue}
                            autoCapitalize="none"
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleKeyDown}
                            className={editInputClass}
                          />
                        ) : (
                          <span className="block py-px">{tx.source ?? ""}</span>
                        )}
                      </td>

                      {/* File */}
                      <td className={`${tdClass} align-middle`}>
                        {!tx.isGroup &&
                          (uploadingIds.has(tx.id) ? (
                            <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-pulse" />
                          ) : tx.driveFileId ? (
                            <DriveFile
                              fileId={tx.driveFileId}
                              onUnlink={() =>
                                onUpdate(tx.id, { driveFileId: null })
                              }
                            />
                          ) : (
                            <AttachButton onClick={() => handleAttach(tx)} />
                          ))}
                      </td>

                      {/* Controls */}
                      <td className={tdClass}>
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
                          className="p-1 text-gray-400 hover:text-rose-600 dark:text-gray-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                          onClick={() => onDelete(tx.id)}
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Child rows */}
                    {tx.isGroup &&
                      isExpanded &&
                      (() => {
                        return (
                          <>
                            {/* Filter bar */}
                            {showGroupFilters && (
                              <tr className="border-b border-gray-100 dark:border-gray-800 bg-transparent">
                                {/* chevron col — x clear */}
                                <td className="py-1.5 w-8 align-middle text-center border-r border-gray-100 dark:border-gray-800">
                                  {isFiltered && (
                                    <button
                                      onClick={() => {
                                        onGroupFilterChange(tx.id, []);
                                        setGroupDescSearch((prev) => ({
                                          ...prev,
                                          [tx.id]: "",
                                        }));
                                      }}
                                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                                      aria-label="Clear filters"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </td>
                                {/* date col — empty */}
                                <td className="py-1.5 border-r border-gray-100 dark:border-gray-800" />
                                {/* description col */}
                                <td className="px-4 py-1.5 border-r border-gray-100 dark:border-gray-800">
                                  <input
                                    type="text"
                                    placeholder="Search..."
                                    value={groupDescSearch[tx.id] ?? ""}
                                    onChange={(e) =>
                                      setGroupDescSearch((prev) => ({
                                        ...prev,
                                        [tx.id]: e.target.value,
                                      }))
                                    }
                                    className="h-6 w-full bg-transparent text-[12px] text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 rounded px-1.5 outline-none transition-colors"
                                  />
                                </td>
                                {/* category col */}
                                <td className="px-4 py-1.5 border-r border-gray-100 dark:border-gray-800">
                                  <select
                                    value={
                                      activeFilters.length === 0
                                        ? "__all__"
                                        : activeFilters[0]
                                    }
                                    onChange={(e) =>
                                      onGroupFilterChange(
                                        tx.id,
                                        e.target.value !== "__all__"
                                          ? [e.target.value]
                                          : [],
                                      )
                                    }
                                    className="h-6 w-full rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-[12px] text-gray-700 dark:text-gray-300 px-1.5 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors cursor-pointer"
                                  >
                                    <option value="__all__">All</option>
                                    {uniqueCategories.map((cat) => (
                                      <option key={cat} value={cat}>
                                        {cat === "" ? "None" : cat}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                {/* remaining cols */}
                                <td className="border-r border-gray-100 dark:border-gray-800" />
                                <td className="border-r border-gray-100 dark:border-gray-800" />
                                <td className="border-r border-gray-100 dark:border-gray-800" />
                                <td className="border-r border-gray-100 dark:border-gray-800" />
                                <td className="border-r border-gray-100 dark:border-gray-800" />
                              </tr>
                            )}

                            {/* Filtered child rows */}
                            {renderChildRows(filteredChildren)}
                          </>
                        );
                      })()}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelected}
      />
      {contextMenuPos && (
        <ContextMenu
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          selectedIds={selectedIds}
          onBulkDelete={onBulkDelete}
          onBulkUpdate={onBulkUpdate}
          onClearSelection={onClearSelection}
          onAddToGroup={onAddToGroup}
          onCreateGroup={handleCreateGroup}
          allGroups={allGroups}
          allCategories={allCategories}
          allSources={allSources}
        />
      )}
    </div>
  );
};

export default TransactionTable;
