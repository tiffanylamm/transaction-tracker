"use client";

import { useState } from "react";
import TransactionTable from "@/components/TransactionTable";
import CSVImportModal from "@/components/CSVImportModal";
import Pagination from "@/components/Pagination";
import { Plus, Upload, X } from "lucide-react";
import SettingsDrawer from "@/components/SettingsDrawer";
import { useTransactions } from "@/hooks/useTransactions";

const Home = () => {
  const [showTotalsRow, setShowTotalsRow] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("showTotalsRow");
    return stored === null ? true : stored === "true";
  });
  const [showAddRow, setShowAddRow] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showGroupFilters, setShowGroupFilters] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("showGroupFilters");
    return stored === null ? true : stored === "true";
  });

  const {
    session,
    isPending,

    // Data
    displayRows,
    allTransactions,
    allGroups,
    allCategories,
    allSources,
    totalAmount,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,

    // UI state
    expandedIds,
    pinnedRow,
    scrollToTopRef,
    groupFilters,
    setGroupFilters,

    // Sort
    sortConfig,
    absValue,
    handleSort,
    handleToggleAbsSort,

    // Filters
    columnFilters,
    textFilters,
    handleFilterChange,
    handleTextFilterChange,

    // Selection
    selectedMap,
    selectedTransactions,
    validGroup,
    handleToggleSelect,
    handleSelectAll,
    clearSelected,

    // CRUD
    handleAddTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleImportTransactions,

    // Expand
    handleToggleExpand,
    childRows,

    // Grouping
    handleCreateGroup,
    handleAddToGroup,
    handleUnlinkChild,

    // Bulk
    handleBulkDelete,
    handleBulkUpdate,
  } = useTransactions();

  if (isPending || !session) return null;

  return (
    <main className="h-screen flex flex-col overflow-hidden text-gray-900 dark:text-foreground font-sans">
      <div className="w-full mx-auto px-4 md:px-16 xl:px-32 2xl:px-46 py-12 flex flex-col flex-1 min-h-0">
        {/* Header Area */}
        <header className="flex justify-between items-center gap-4 mb-8 shrink-0">
          {/* Main Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/logo-dark.png"
              alt="Logo"
              width={28}
              height={28}
              className="dark:hidden"
            />
            <img
              src="/logo-light.png"
              alt="Logo"
              width={28}
              height={28}
              className="hidden dark:block"
            />
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-foreground">
              Transactions
            </h1>
          </div>
          {/* Header Toolbar */}
          <div className="flex items-center">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-900 hover:bg-gray-50 dark:text-foreground dark:hover:bg-[#424242] rounded transition-colors"
              onClick={() => setShowAddRow(!showAddRow)}
            >
              {showAddRow ? (
                <X className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              New
            </button>

            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-900 hover:bg-gray-50 dark:text-foreground dark:hover:bg-[#424242] rounded transition-colors"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-4 h-4" />
              Import
            </button>

            <SettingsDrawer
              showTotalsRow={showTotalsRow}
              onToggleTotalsRow={(val) => {
                localStorage.setItem("showTotalsRow", String(val));
                setShowTotalsRow(val);
              }}
              showGroupFilters={showGroupFilters}
              onToggleGroupFilters={(val) => {
                localStorage.setItem("showGroupFilters", String(val));
                setShowGroupFilters(val);
              }}
            />
          </div>
        </header>

        {/* Main Table */}
        <div
          className={`mt-2 flex-1 min-h-0 flex flex-col transition-opacity ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <TransactionTable
            transactions={displayRows}
            allTransactions={allTransactions}
            sortConfig={sortConfig}
            onSort={handleSort}
            onToggleAbsSort={handleToggleAbsSort}
            absValue={absValue}
            onDelete={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
            showAddRow={showAddRow}
            onAdd={handleAddTransaction}
            onCancelAdd={() => setShowAddRow(false)}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            selectedIds={selectedMap}
            onToggleSelect={(tx) => handleToggleSelect(tx)}
            onSelectAll={(txs) => handleSelectAll(txs)}
            onClearSelection={clearSelected}
            onCreateGroup={handleCreateGroup}
            onAddToGroup={handleAddToGroup}
            onUnlinkChild={handleUnlinkChild}
            onBulkDelete={handleBulkDelete}
            onBulkUpdate={handleBulkUpdate}
            allGroups={allGroups}
            allCategories={allCategories}
            allSources={allSources}
            currentPage={currentPage}
            columnFilters={columnFilters}
            onFilterChange={handleFilterChange}
            textFilters={textFilters}
            onTextFilterChange={handleTextFilterChange}
            totalAmount={totalAmount}
            showTotalsRow={showTotalsRow}
            scrollToTopRef={scrollToTopRef}
            groupFilters={groupFilters}
            onGroupFilterChange={(groupId, categories) =>
              setGroupFilters((prev) => ({ ...prev, [groupId]: categories }))
            }
            showGroupFilters={showGroupFilters}
          />
        </div>
        <div className="shrink-0">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            isLoading={isLoading}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
        {/* CSVImportModal */}
        <CSVImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportTransactions}
        />
      </div>
    </main>
  );
};

export default Home;
