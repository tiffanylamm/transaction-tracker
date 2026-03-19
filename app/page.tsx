"use client";

import React, { useState, useMemo } from "react";
import { SortConfig, Transaction } from "@/types/transaction";
import TransactionTable from "@/components/TransactionTable";
import CSVImportModal from "@/components/CSVImportModal";
import { Search, Plus, Upload } from "lucide-react";
import { computeGroupFields } from "@/lib/groupUtils";

//sample data
const created = Date.now();
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "1",
    date: "2026-01-15",
    description: "TechCorp Salary",
    category: "Income",
    amount: 4250.0,
    status: "Refunding",
    source: "BofA Checking",
    createdAt: created,
    isGroup: false,
    parentId: null,
  },
  {
    id: "2",
    date: "2026-01-16",
    description: "Whole Foods Market",
    category: "Shopping",
    amount: -145.2,
    status: "Completed",
    source: "BofA Credit Card",
    createdAt: created + 1,
    isGroup: true,
    parentId: null,
  },
  {
    id: "3",
    date: "2026-01-18",
    description: "Downtown Apartment",
    category: "Subscriptions",
    amount: -1850.0,
    status: "Completed",
    source: "BofA Checking",
    createdAt: created + 2,
    isGroup: false,
    parentId: "2",
  },
  {
    id: "4",
    date: "2026-01-19",
    description: "Blue Bottle Coffee",
    category: "Shopping",
    amount: -6.5,
    status: "Completed",
    source: "BofA Debit Card",
    createdAt: created + 3,
    isGroup: false,
    parentId: "2",
  },
  {
    id: "5",
    date: "2026-01-20",
    description: "Netflix Subscription",
    category: "Entertainment",
    amount: -15.99,
    status: "Completed",
    source: "BofA Credit Card",
    createdAt: created + 4,
    isGroup: false,
    parentId: null,
  },
  {
    id: "6",
    date: "2026-01-22",
    description: "Electric Bill",
    category: null,
    amount: -85.4,
    status: "Completed",
    source: null,
    createdAt: created + 5,
    isGroup: false,
    parentId: null,
  },
  {
    id: "7",
    date: "2026-01-24",
    description: "Freelance Design Work",
    category: "Subscriptions",
    amount: 850.0,
    status: "Completed",
    source: "BofA Checking",
    createdAt: created + 6,
    isGroup: false,
    parentId: null,
  },
  {
    id: "8",
    date: "2026-01-25",
    description: "AMC Theatres",
    category: null,
    amount: -32.0,
    status: "Completed",
    source: "BofA Credit Card",
    createdAt: created + 7,
    isGroup: false,
    parentId: null,
  },
  {
    id: "9",
    date: "2026-01-28",
    description: "Internet Service",
    category: "Entertainment",
    amount: -65.0,
    status: "Owed",
    source: null,
    createdAt: created + 8,
    isGroup: false,
    parentId: null,
  },
];

const Home = () => {
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([]));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([]));

  const handleSort = (key: keyof Transaction) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return {
          key,
          direction: "desc",
        };
      }
      return null;
    });
  };

  const handleAddTransaction = (
    newTransaction: Omit<Transaction, "id" | "createdAt">,
  ) => {
    const now = Date.now();
    const transaction: Transaction = {
      ...newTransaction,
      id: crypto.randomUUID(),
      createdAt: now,
    };
    setTransactions((prev) => [...prev, transaction]);
    setShowAddRow(false);
  };

  const handleUpdateTransaction = (
    id: string,
    updates: Partial<Transaction>,
  ) => {
    setTransactions((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)),
    );
  };

  const handleDeleteTransaction = (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (tx?.isGroup) {
      setTransactions((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
      setExpandedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  //filter + sort transactions
  const processedTransactions = useMemo(() => {
    let result = transactions.filter((tx) => tx.parentId === null);
    //Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(query) ||
          (tx.category && tx.category.toLowerCase().includes(query)),
      );
    }
    //Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      //default is sort by created at
      result.sort((a, b) => b.createdAt - a.createdAt);
    }
    return result;
  }, [transactions, searchQuery, sortConfig]);

  const handleImportTransactions = (
    newTransactions: Omit<Transaction, "id" | "createdAt">[],
  ) => {
    const now = Date.now();
    const transactionsComplete = newTransactions.map((tx, i) => ({
      ...tx,
      id: crypto.randomUUID(),
      createdAt: now + i,
    }));
    setTransactions((prev) => [...prev, ...transactionsComplete]);
  };

  const selectedUngroupedIds = [...selectedIds].filter((id) => {
    const item = transactions.find((tx) => tx.id === id);
    return item && !item.isGroup && item.parentId === null;
  });

  const clearSelected = () => setSelectedIds(new Set());

  const handleCreateGroup = () => {
    if (selectedUngroupedIds.length < 2) return;
    const children = selectedUngroupedIds.map(
      (id) => transactions.find((tx) => tx.id === id)!,
    );
    const groupInfo = computeGroupFields(children);
    const groupId = crypto.randomUUID();

    setTransactions((prev) => [
      ...prev.map((tx) =>
        selectedUngroupedIds.includes(tx.id)
          ? { ...tx, parentId: groupId }
          : tx,
      ),
      {
        id: groupId,
        description: "New Group",
        category: null,
        ...groupInfo,
        createdAt: Date.now(),
        isGroup: true,
        parentId: null,
      },
    ]);

    setExpandedIds((prev) => new Set([...prev, groupId]));

    clearSelected();
  };

  const handleAddToGroup = (groupId: string) => {
    if (selectedUngroupedIds.length === 0) return;

    setTransactions((prev) => [
      ...prev.map((tx) =>
        selectedUngroupedIds.includes(tx.id)
          ? { ...tx, parentId: groupId }
          : tx,
      ),
    ]);

    clearSelected();
  };

  const handleUnlinkChild = (childId: string) => {
    const child = transactions.find((tx) => tx.id === childId);
    if (!child?.parentId) return;
    setTransactions((prev) => [
      ...prev.map((tx) => (tx.id === childId ? { ...tx, parentId: null } : tx)),
    ]);
    //no auto-dissolving can have 1 child under parent
  };

  return (
    <main className="min-h-screen bg-white text-gray-900 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header Area */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Transactions
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-6 pr-2 py-1 w-48 text-[13px] bg-transparent border-0 border-b border-gray-200 focus:border-gray-400 focus:ring-0 outline-none transition-colors placeholder-gray-400"
              />
            </div>

            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-4 h-4" />
              Import
            </button>

            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
              onClick={() => setShowAddRow(true)}
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </header>
        {/* Main Table */}
        <div className="mt-4">
          <TransactionTable
            transactions={processedTransactions}
            allTransactions={transactions}
            sortConfig={sortConfig}
            onSort={handleSort}
            onDelete={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
            showAddRow={showAddRow}
            onAdd={handleAddTransaction}
            onCancelAdd={() => setShowAddRow(false)}
            expandedIds={expandedIds}
            onToggleExpand={(id) =>
              setExpandedIds((prev) => {
                const s = new Set(prev);
                s.has(id) ? s.delete(id) : s.add(id);
                return s;
              })
            }
            selectedIds={selectedIds}
            onToggleSelect={(id) =>
              setSelectedIds((prev) => {
                const s = new Set(prev);
                s.has(id) ? s.delete(id) : s.add(id);
                return s;
              })
            }
            onClearSelection={clearSelected}
            onCreateGroup={handleCreateGroup}
            onAddToGroup={handleAddToGroup}
            onUnlinkChild={handleUnlinkChild}
          />
        </div>
        {/*CSVImportModal */}
        <CSVImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportTransactions}
          sourceSuggestions={[
            ...new Set(
              transactions
                .map((t) => t.source)
                .filter((s): s is string => s !== null),
            ),
          ]}
        />
      </div>
    </main>
  );
};

export default Home;
