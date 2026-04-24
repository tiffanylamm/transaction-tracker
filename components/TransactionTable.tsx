import React, { useEffect, useMemo } from "react";
import { useState, useRef } from "react";
import { Layers, X } from "lucide-react";
import { Transaction, SortConfig } from "@/types/transaction";
import BulkActions from "./TransactionTable/BulkActions";
import ContextMenu from "./TransactionTable/ContextMenu";
import TableHeader from "./TransactionTable/TableHeader";
import AddTransactionRow from "./TransactionTable/AddTransactionRow";
import useEditingCell from "@/hooks/useEditingCell";
import useDriveAttach from "@/hooks/useDriveAttach";
import TopLevelRow from "./TransactionTable/TopLevelRow";
import ChildRow from "./TransactionTable/ChildRow";
import GroupFilterBar from "./TransactionTable/GroupFilterBar";
import TotalAmountRow from "./TransactionTable/TotalAmountRow";

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

  const { uploadingIds, fileInputRef, handleAttach, handleFileSelected } =
    useDriveAttach({ onUpdate });

  const pendingFocusIdRef = useRef<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollToTopRef) {
      scrollToTopRef.current = () =>
        tableContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [scrollToTopRef]);

  useEffect(() => {
    tableContainerRef.current?.scrollTo(0, 0);
  }, [currentPage]);

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

  return (
    <div className="w-full h-full flex flex-col">
      {/* Toolbar */}
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
          <TableHeader
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
            {showTotalsRow && <TotalAmountRow totalAmount={totalAmount} />}

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
                    <TopLevelRow
                      key={tx.id}
                      tx={tx}
                      isExpanded={isExpanded}
                      isSelected={isSelected}
                      isFiltered={isFiltered}
                      filteredTotal={filteredTotal}
                      filteredChildCount={filteredChildren.length}
                      onToggleExpand={onToggleExpand}
                      onToggleSelect={onToggleSelect}
                      onSelectAll={onSelectAll}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      onContextMenu={handleRowContextMenu}
                      uploadingIds={uploadingIds}
                      onAttach={handleAttach}
                      shiftKeyRef={shiftKeyRef}
                      lastClickedIdRef={lastClickedIdRef}
                      transactions={transactions}
                      allTransactions={allTransactions}
                      // editing
                      editingCell={editingCell}
                      editValue={editValue}
                      inputRef={inputRef}
                      isEditing={isEditing}
                      startEditing={startEditing}
                      commitEdit={commitEdit}
                      handleKeyDown={handleKeyDown}
                      setEditValue={setEditValue}
                      setEditingCell={setEditingCell}
                    />

                    {/* Child rows */}
                    {tx.isGroup && isExpanded && (
                      <>
                        {/* Filter bar */}
                        {showGroupFilters && (
                          <GroupFilterBar
                            activeFilters={groupFilters[tx.id] ?? []}
                            descSearch={groupDescSearch[tx.id] ?? ""}
                            uniqueCategories={uniqueCategories}
                            isFiltered={isFiltered}
                            onFilterChange={(categories) =>
                              onGroupFilterChange(tx.id, categories)
                            }
                            onDescSearchChange={(value) =>
                              setGroupDescSearch((prev) => ({
                                ...prev,
                                [tx.id]: value,
                              }))
                            }
                            onClearFilters={() => {
                              onGroupFilterChange(tx.id, []);
                              setGroupDescSearch((prev) => ({
                                ...prev,
                                [tx.id]: "",
                              }));
                            }}
                          />
                        )}

                        {/* Filtered child rows */}
                        {filteredChildren.map((child) => (
                          <ChildRow
                            key={child.id}
                            child={child}
                            allTransactions={allTransactions}
                            siblings={filteredChildren}
                            isSelected={selectedIds.has(child.id)}
                            isExpanded={expandedIds.has(child.id)}
                            selectedIds={selectedIds}
                            expandedIds={expandedIds}
                            onToggleExpand={onToggleExpand}
                            onToggleSelect={onToggleSelect}
                            onSelectAll={onSelectAll}
                            onUnlinkChild={onUnlinkChild}
                            onUpdate={onUpdate}
                            onContextMenu={handleRowContextMenu}
                            uploadingIds={uploadingIds}
                            onAttach={handleAttach}
                            shiftKeyRef={shiftKeyRef}
                            lastClickedIdRef={lastClickedIdRef}
                            editingCell={editingCell}
                            editValue={editValue}
                            inputRef={inputRef}
                            isEditing={isEditing}
                            startEditing={startEditing}
                            commitEdit={commitEdit}
                            handleKeyDown={handleKeyDown}
                            setEditValue={setEditValue}
                            setEditingCell={setEditingCell}
                          />
                        ))}
                      </>
                    )}
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
