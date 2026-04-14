"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SortConfig, Transaction, PaginatedResponse } from "@/types/transaction";
import TransactionTable from "@/components/TransactionTable";
import CSVImportModal from "@/components/CSVImportModal";
import Pagination from "@/components/Pagination";
import { Search, Plus, Upload } from "lucide-react";
import { computeGroupFields } from "@/lib/groupUtils";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import SettingsDrawer from "@/components/SettingsDrawer";

const Home = () => {
  const [pageRows, setPageRows] = useState<Transaction[]>([]);
  const [childRows, setChildRows] = useState<Record<string, Transaction[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([]));
  const [selectedIds, setSelectedIds] = useState<Map<string, Transaction>>(new Map());
  const [allGroups, setAllGroups] = useState<Transaction[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]);

  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  const fetchPage = useCallback(
    async (opts: {
      page: number;
      search: string;
      sortBy: string | null;
      sortDir: string | null;
    }) => {
      if (!session?.user?.id) return;
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(opts.page));
      if (opts.search) params.set("search", opts.search);
      if (opts.sortBy && opts.sortDir) {
        params.set("sortBy", opts.sortBy);
        params.set("sortDir", opts.sortDir);
      }

      try {
        const res = await fetch(`/api/transactions?${params}`);
        if (!res.ok) throw new Error("Fetch failed");
        const json: PaginatedResponse = await res.json();
        setPageRows(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
        setCurrentPage(json.page);
      } finally {
        setIsLoading(false);
      }
    },
    [session?.user?.id],
  );

  const fetchMetadata = useCallback(async () => {
    if (!session?.user?.id) return;
    const res = await fetch("/api/transactions?metadata=true");
    if (!res.ok) return;
    const data = await res.json();
    setAllGroups(data.groups);
    setAllCategories(data.categories);
    setAllSources(data.sources);
  }, [session?.user?.id]);

  // Debounce search — reset to page 1 on new query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Main fetch trigger
  useEffect(() => {
    if (!session?.user?.id) return;
    if (prevUserIdRef.current !== session.user.id) {
      prevUserIdRef.current = session.user.id;
      fetchMetadata();
    }
    fetchPage({
      page: currentPage,
      search: debouncedSearch,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, currentPage, debouncedSearch, sortConfig]);

  const handleSort = (key: keyof Transaction) => {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
    setCurrentPage(1);
  };

  const addMetadata = (updates: Partial<Transaction>) => {
    if (updates.category && !allCategories.includes(updates.category)) {
      setAllCategories((prev) => [...prev, updates.category!]);
    }
    if (updates.source && !allSources.includes(updates.source)) {
      setAllSources((prev) => [...prev, updates.source!]);
    }
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

    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    }).then(() => {
      addMetadata(newTransaction);
      setCurrentPage(1);
      // If already on page 1, currentPage state won't change so trigger manually
      fetchPage({
        page: 1,
        search: debouncedSearch,
        sortBy: sortConfig?.key ?? null,
        sortDir: sortConfig?.direction ?? null,
      });
    });

    setShowAddRow(false);
  };

  const handleUpdateTransaction = (
    id: string,
    updates: Partial<Transaction>,
  ) => {
    setPageRows((prev) =>
      prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx)),
    );
    setAllGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    );
    setChildRows((prev) => {
      const next = { ...prev };
      for (const groupId of Object.keys(next)) {
        next[groupId] = next[groupId].map((tx) =>
          tx.id === id ? { ...tx, ...updates } : tx,
        );
      }
      return next;
    });

    fetch(`/api/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).then(() => {
      if (updates.category !== undefined || updates.source !== undefined) {
        fetchMetadata();
      }
    });
  };

  const handleDeleteTransaction = (id: string) => {
    fetch(`/api/transactions/${id}`, {
      method: "DELETE",
    }).then(() => {
      if (allGroups.some((g) => g.id === id)) {
        setAllGroups((prev) => prev.filter((g) => g.id !== id));
      }
      const isLastOnPage = pageRows.length === 1 && currentPage > 1;
      const nextPage = isLastOnPage ? currentPage - 1 : currentPage;
      setChildRows((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchPage({
        page: nextPage,
        search: debouncedSearch,
        sortBy: sortConfig?.key ?? null,
        sortDir: sortConfig?.direction ?? null,
      });
      fetchMetadata();
      if (isLastOnPage) setCurrentPage(nextPage);
    });

    setExpandedIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  };

  const handleToggleExpand = async (id: string) => {
    setExpandedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

    if (!childRows[id]) {
      const res = await fetch(`/api/transactions?parentId=${id}`);
      const data: Transaction[] = await res.json();
      console.log(`DEBUG: ${data}`)
      setChildRows((prev) => ({ ...prev, [id]: data }));
    }
  };

  const allTransactions = [
    ...pageRows,
    ...Object.values(childRows).flat(),
  ];

  const selectedUngrouped = [...selectedIds.values()].filter(
    (tx) => !tx.isGroup && tx.parentId === null,
  );

  const clearSelected = () => setSelectedIds(new Map());

  const handleCreateGroup = async (name: string): Promise<string> => {
    const children = selectedUngrouped;
    const childIds = children.map((tx) => tx.id);
    const groupInfo = computeGroupFields(children);
    const groupTx = {
      description: name,
      category: null,
      ...groupInfo,
      createdAt: Date.now(),
      isGroup: true,
      parentId: null,
    };

    clearSelected();

    // POST first — children's parentId FK requires the group row to exist
    const groupRes = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupTx),
    });
    if (!groupRes.ok) return "";

    const createdGroup = await groupRes.json();
    const actualGroupId = createdGroup.id;

    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: childIds, updates: { parentId: actualGroupId } }),
    });

    setCurrentPage(1);
    await fetchPage({
      page: 1,
      search: debouncedSearch,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
    });
    setAllGroups((prev) => [createdGroup, ...prev]);

    return actualGroupId;
  };

  const handleAddToGroup = (groupId: string) => {
    if (selectedUngrouped.length === 0) return;

    const addedTransactions = selectedUngrouped;
    const childIds = addedTransactions.map((tx) => tx.id);

    clearSelected();

    fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: childIds, updates: { parentId: groupId } }),
    }).then(() => {
      if (childRows[groupId]) {
        const updatedChildren = [
          ...childRows[groupId],
          ...addedTransactions.map((tx) => ({ ...tx, parentId: groupId })),
        ];
        setChildRows((prev) => ({ ...prev, [groupId]: updatedChildren }));
        handleUpdateTransaction(groupId, computeGroupFields(updatedChildren));
      }

      fetchPage({
        page: currentPage,
        search: debouncedSearch,
        sortBy: sortConfig?.key ?? null,
        sortDir: sortConfig?.direction ?? null,
      });
    });
  };

  const handleUnlinkChild = (childId: string) => {
    const parentGroupId =
      Object.keys(childRows).find((gid) =>
        childRows[gid].some((tx) => tx.id === childId),
      ) ?? null;

    fetch(`/api/transactions/${childId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: null }),
    }).then(() => {
      setChildRows((prev) => {
        const next = { ...prev };
        for (const groupId of Object.keys(next)) {
          next[groupId] = next[groupId].filter((tx) => tx.id !== childId);
        }
        return next;
      });

      if (parentGroupId) {
        const remaining = childRows[parentGroupId].filter((tx) => tx.id !== childId);
        if (remaining.length === 0) {
          handleDeleteTransaction(parentGroupId);
          return;
        }
        handleUpdateTransaction(parentGroupId, computeGroupFields(remaining));
      }

      fetchPage({
        page: currentPage,
        search: debouncedSearch,
        sortBy: sortConfig?.key ?? null,
        sortDir: sortConfig?.direction ?? null,
      });
    });
  };

  const handleBulkDelete = (ids: string[]) => {
    fetch("/api/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).then(() => {
      clearSelected();
      fetchPage({
        page: currentPage,
        search: debouncedSearch,
        sortBy: sortConfig?.key ?? null,
        sortDir: sortConfig?.direction ?? null,
      });
    });
  };

  const handleBulkUpdate = (ids: string[], updates: Partial<Transaction>) => {
    setPageRows((prev) =>
      prev.map((tx) => (ids.includes(tx.id) ? { ...tx, ...updates } : tx)),
    );
    fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, updates }),
    }).then(() => {
      clearSelected();
      fetchPage({
        page: currentPage,
        search: debouncedSearch,
        sortBy: sortConfig?.key ?? null,
        sortDir: sortConfig?.direction ?? null,
      });
    });
  };

  const handleImportTransactions = (
    newTransactions: Omit<Transaction, "id" | "createdAt">[],
  ) => {
    const now = Date.now();
    const sorted = [...newTransactions].sort((a, b) => b.date.localeCompare(a.date))
    const withTimestamps = sorted.map((tx, i) => ({
      ...tx,
      createdAt: now - i,
    }));

    fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withTimestamps),
    })
      .then((res) => res.json())
      .then((created: Transaction[]) => {
        setSelectedIds(new Map(created.map((row: Transaction) => [row.id, row])));
        setCurrentPage(1);
        fetchPage({
          page: 1,
          search: debouncedSearch,
          sortBy: sortConfig?.key ?? null,
          sortDir: sortConfig?.direction ?? null,
        });
      });
  };

  if (isPending || !session) return null;

  return (
    <main className="h-screen overflow-hidden bg-white text-gray-900 font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header Area */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" width={28} height={28} />
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              Transactions
            </h1>
          </div>
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

            <SettingsDrawer />
          </div>
        </header>

        {/* Main Table */}
        <div
          className={`mt-4 transition-opacity ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
        >
          <TransactionTable
            transactions={pageRows}
            allTransactions={allTransactions}
            sortConfig={sortConfig}
            onSort={handleSort}
            onDelete={handleDeleteTransaction}
            onUpdate={handleUpdateTransaction}
            showAddRow={showAddRow}
            onAdd={handleAddTransaction}
            onCancelAdd={() => setShowAddRow(false)}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            selectedIds={selectedIds}
            onToggleSelect={(tx) =>
              setSelectedIds((prev) => {
                const next = new Map(prev);
                next.has(tx.id) ? next.delete(tx.id) : next.set(tx.id, tx);
                return next;
              })
            }
            onSelectAll={(txs) =>
              setSelectedIds((prev) => {
                const next = new Map(prev);
                for (const tx of txs) next.set(tx.id, tx);
                return next;
              })
            }
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
          />
        </div>
        <div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
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
