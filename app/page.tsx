"use client";

import React, { useState, useMemo } from "react";
import { SortConfig, Transaction } from "@/types/transaction";
import TransactionTable from "@/components/TransactionTable";
import CSVImportModal from "@/components/CSVImportModal";
import { Search, Plus, Upload } from "lucide-react";

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
    createdAt: created,
  },
  {
    id: "2",
    date: "2026-01-16",
    description: "Whole Foods Market",
    category: "Shopping",
    amount: -145.2,
    status: "Completed",
    createdAt: created + 1,
  },
  {
    id: "3",
    date: "2026-01-18",
    description: "Downtown Apartment",
    category: "Subscriptions",
    amount: -1850.0,
    status: "Completed",
    createdAt: created + 2,
  },
  {
    id: "4",
    date: "2026-01-19",
    description: "Blue Bottle Coffee",
    category: "Shopping",
    amount: -6.5,
    status: "Completed",
    createdAt: created + 3,
  },
  {
    id: "5",
    date: "2026-01-20",
    description: "Netflix Subscription",
    category: "Entertainment",
    amount: -15.99,
    status: "Completed",
    createdAt: created + 4,
  },
  {
    id: "6",
    date: "2026-01-22",
    description: "Electric Bill",
    category: "None",
    amount: -85.4,
    status: "Completed",
    createdAt: created + 5,
  },
  {
    id: "7",
    date: "2026-01-24",
    description: "Freelance Design Work",
    category: "Subscriptions",
    amount: 850.0,
    status: "Completed",
    createdAt: created + 6,
  },
  {
    id: "8",
    date: "2026-01-25",
    description: "AMC Theatres",
    category: "None",
    amount: -32.0,
    status: "Completed",
    createdAt: created + 7,
  },
  {
    id: "9",
    date: "2026-01-28",
    description: "Internet Service",
    category: "Entertainment",
    amount: -65.0,
    status: "Owed",
    createdAt: created + 8,
  },
];

const Home = () => {
  const [transactions, setTransactions] =
    useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
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
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  };

  //filter + sort transactions
  const processedTransactions = useMemo(() => {
    let result = [...transactions];
    //Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (tx) =>
          tx.description.toLowerCase().includes(query) ||
          tx.category.toLowerCase().includes(query),
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
      result.sort((a, b) => a.createdAt - b.createdAt);
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
            sortConfig={sortConfig}
            onSort={handleSort}
            onDelete={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
            showAddRow={showAddRow}
            onAdd={handleAddTransaction}
            onCancelAdd={() => setShowAddRow(false)}
          />
        </div>
        {/*CSVImportModal */}
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
