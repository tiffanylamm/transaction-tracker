"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  SortConfig,
  Transaction,
  PaginatedResponse,
} from "@/types/transaction";
import TransactionTable from "@/components/TransactionTable";
import CSVImportModal from "@/components/CSVImportModal";
import Pagination from "@/components/Pagination";
import { Plus, Upload, X } from "lucide-react";
import { computeGroupFields } from "@/lib/groupUtils";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import SettingsDrawer from "@/components/SettingsDrawer";

type ColumnFilters = { category: string[]; status: string[]; source: string[] };
type TextFilters = {
  description: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
};
const EMPTY_TEXT_FILTERS: TextFilters = {
  description: "",
  dateFrom: "",
  dateTo: "",
  amountMin: "",
  amountMax: "",
};

const Home = () => {
  const [pageRows, setPageRows] = useState<Transaction[]>([]);
  const [childRows, setChildRows] = useState<Record<string, Transaction[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showTotalsRow, setShowTotalsRow] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("showTotalsRow");
    return stored === null ? true : stored === "true";
  });
  const [textFilters, setTextFilters] =
    useState<TextFilters>(EMPTY_TEXT_FILTERS);
  const [debouncedTextFilters, setDebouncedTextFilters] =
    useState<TextFilters>(EMPTY_TEXT_FILTERS);
  const textFiltersRef = useRef<TextFilters>(EMPTY_TEXT_FILTERS);
  const [showAddRow, setShowAddRow] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [absValue, setAbsValue] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([]));
  const [selectedMap, setSelectedMap] = useState<Map<string, Transaction>>(
    new Map(),
  );
  const [allGroups, setAllGroups] = useState<Transaction[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]);
  const [groupFilters, setGroupFilters] = useState<Record<string, string[]>>(
    {},
  );
  const [showGroupFilters, setShowGroupFilters] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("showGroupFilters");
    return stored === null ? true : stored === "true";
  });
  const [pinnedRow, setPinnedRow] = useState<Transaction | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    category: [],
    status: [],
    source: [],
  });
  const columnFiltersRef = useRef<ColumnFilters>({
    category: [],
    status: [],
    source: [],
  });

  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const prevUserIdRef = useRef<string | null>(null);
  const scrollToTopRef = useRef<(() => void) | null>(null);

  // Keep refs in sync so fetchPage always reads latest values without being recreated
  useEffect(() => {
    columnFiltersRef.current = columnFilters;
  }, [columnFilters]);
  useEffect(() => {
    textFiltersRef.current = debouncedTextFilters;
  }, [debouncedTextFilters]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  const fetchPage = useCallback(
    async (opts: {
      page: number;
      sortBy: string | null;
      sortDir: string | null;
      sortAbs?: boolean;
    }) => {
      if (!session?.user?.id) return;
      setIsLoading(true);

      const params = new URLSearchParams();
      params.set("page", String(opts.page));
      if (opts.sortBy && opts.sortDir) {
        params.set("sortBy", opts.sortBy);
        params.set("sortDir", opts.sortDir);
        if (opts.sortAbs) params.set("sortAbs", "true");
      }

      const tf = textFiltersRef.current;
      if (tf.description) params.set("filterDescription", tf.description);
      if (tf.dateFrom) params.set("filterDateFrom", tf.dateFrom);
      if (tf.dateTo) params.set("filterDateTo", tf.dateTo);
      if (tf.amountMin !== "") params.set("filterAmountMin", tf.amountMin);
      if (tf.amountMax !== "") params.set("filterAmountMax", tf.amountMax);

      const f = columnFiltersRef.current;
      if (f.category.length > 0)
        params.set("filterCategory", f.category.join(","));
      if (f.status.length > 0) params.set("filterStatus", f.status.join(","));
      if (f.source.length > 0) params.set("filterSource", f.source.join(","));

      try {
        const res = await fetch(`/api/transactions?${params}`);
        if (!res.ok) throw new Error("Fetch failed");
        const json: PaginatedResponse = await res.json();
        setPageRows(json.data);
        setTotalAmount(json.totalAmount);
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

  // Debounce text/range filters — reset to page 1 and clear pinned row
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTextFilters(textFilters);
      setCurrentPage(1);
      setPinnedRow(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [textFilters]);

  // Main fetch trigger
  useEffect(() => {
    if (!session?.user?.id) return;
    if (prevUserIdRef.current !== session.user.id) {
      prevUserIdRef.current = session.user.id;
      fetchMetadata();
    }
    fetchPage({
      page: currentPage,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
      sortAbs: absValue,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session?.user?.id,
    currentPage,
    debouncedTextFilters,
    sortConfig,
    absValue,
    columnFilters,
  ]);

  const handleTextFilterChange = (col: keyof TextFilters, value: string) => {
    setTextFilters((prev) => ({ ...prev, [col]: value }));
  };

  const handleFilterChange = (col: keyof ColumnFilters, values: string[]) => {
    setColumnFilters((prev) => ({ ...prev, [col]: values }));
    setCurrentPage(1);
    setPinnedRow(null);
  };

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

  const handleToggleAbsSort = () => {
    setAbsValue((v) => !v);
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

  const handleAddTransaction = async (
    newTransaction: Omit<Transaction, "id" | "createdAt">,
  ): Promise<void> => {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTransaction }),
    });
    const created: Transaction = await res.json();
    addMetadata(newTransaction);
    setPageRows((prev) => [created, ...prev]);
  };

  const handleUpdateTransaction = async (
    id: string,
    updates: Partial<Transaction>,
  ) => {
    // Optimistically update all local state before awaiting the network call
    if (updates.amount !== undefined) {
      const existing =
        pageRows.find((tx) => tx.id === id) ??
        (pinnedRow?.id === id ? pinnedRow : null) ??
        Object.values(childRows)
          .flat()
          .find((tx) => tx.id === id) ??
        null;
      if (existing) {
        setTotalAmount((prev) => prev + (updates.amount! - existing.amount));
      }
    }

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
    setPinnedRow((prev) => (prev?.id === id ? { ...prev, ...updates } : prev));

    if (updates.category !== undefined || updates.source !== undefined) {
      fetchMetadata();
    }

    let currentId = id;
    let currentUpdates = updates;

    while (true) {
      const parentGroupId = parentMap.get(currentId) ?? null;

      if (!parentGroupId) break;

      const updatedChildren = childRows[parentGroupId].map((tx) =>
        tx.id === currentId ? { ...tx, ...currentUpdates } : tx,
      );
      const groupUpdates = computeGroupFields(updatedChildren);

      setPageRows((prev) =>
        prev.map((tx) =>
          tx.id === parentGroupId ? { ...tx, ...groupUpdates } : tx,
        ),
      );
      setAllGroups((prev) =>
        prev.map((g) =>
          g.id === parentGroupId ? { ...g, ...groupUpdates } : g,
        ),
      );
      setPinnedRow((prev) =>
        prev?.id === parentGroupId ? { ...prev, ...groupUpdates } : prev,
      );
      fetch(`/api/transactions/${parentGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupUpdates),
      });

      currentId = parentGroupId;
      currentUpdates = groupUpdates;
    }

    await fetch(`/api/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  };

  const handleDeleteTransaction = async (id: string) => {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });

    setExpandedIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });

    setChildRows((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    if (pinnedRow?.id === id) setPinnedRow(null);

    const isLastOnPage = pageRows.length === 1 && currentPage > 1;
    const nextPage = isLastOnPage ? currentPage - 1 : currentPage;

    fetchPage({
      page: nextPage,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
      sortAbs: absValue,
    });
    fetchMetadata();

    if (isLastOnPage) setCurrentPage(nextPage);
  };

  const handleToggleExpand = async (id: string) => {
    setExpandedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        // Collapsing: recursively collapse all expanded descendant groups too
        const toCollapse = [id];
        while (toCollapse.length > 0) {
          const current = toCollapse.pop()!;
          s.delete(current);
          for (const child of childRows[current] ?? []) {
            if (child.isGroup && s.has(child.id)) toCollapse.push(child.id);
          }
        }
      } else {
        s.add(id);
      }
      return s;
    });

    if (!childRows[id]) {
      const res = await fetch(`/api/transactions?parentId=${id}`);
      const data: Transaction[] = await res.json();
      setChildRows((prev) => ({ ...prev, [id]: data }));
    }
  };

  const displayRows = useMemo(() => {
    if (!pinnedRow || pageRows.some((r) => r.id === pinnedRow.id))
      return pageRows;
    return [pinnedRow, ...pageRows];
  }, [pinnedRow, pageRows]);

  const allTransactions = [...displayRows, ...Object.values(childRows).flat()];

  // O(1) parent lookup: childId -> parentGroupId
  const parentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [groupId, children] of Object.entries(childRows)) {
      for (const child of children) {
        map.set(child.id, groupId);
      }
    }
    return map;
  }, [childRows]);

  const clearSelected = () => setSelectedMap(new Map());

  const selectedTransactions = [...selectedMap.values()];
  const validGroup = selectedTransactions.every(
    (tx) => tx.parentId === selectedTransactions[0].parentId,
  );

  const handleCreateGroup = async (name: string): Promise<string> => {
    if (!validGroup || selectedTransactions.length === 0) return "";

    const selectedIds = [...selectedMap.keys()];
    // All selected items share the same parentId (enforced by validGroup check)
    const sharedParentId = selectedTransactions[0].parentId ?? null;
    const groupInfo = computeGroupFields(selectedTransactions);
    const groupTx = {
      description: name,
      category: null,
      ...groupInfo,
      isGroup: true,
      parentId: sharedParentId,
    };

    // POST first — children's parentId FK requires the group row to exist
    const groupRes = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupTx),
    });
    if (!groupRes.ok) return "";

    const createdGroup = await groupRes.json();
    const createdGroupId = createdGroup.id;

    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: selectedIds,
        updates: { parentId: createdGroupId },
      }),
    });

    clearSelected();
    setAllGroups((prev) => [createdGroup, ...prev]);

    if (sharedParentId) {
      // Sub-group: re-fetch the parent's children (now includes the new sub-group,
      // without the items that moved into it) and cascade the parent's summary up
      const res = await fetch(`/api/transactions?parentId=${sharedParentId}`);
      const newChildren: Transaction[] = await res.json();
      setChildRows((prev) => ({ ...prev, [sharedParentId]: newChildren }));
      await handleUpdateTransaction(
        sharedParentId,
        computeGroupFields(newChildren),
      );
      return createdGroupId;
    }

    await fetchPage({
      page: currentPage,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
      sortAbs: absValue,
    });
    setPinnedRow(createdGroup);
    scrollToTopRef.current?.();

    return createdGroupId;
  };

  const handleAddToGroup = async (groupId: string) => {
    const selectedTxs = [...selectedMap.values()].filter(
      (tx) => tx.id !== groupId,
    );
    if (selectedTxs.length === 0) return;

    const childIds = selectedTxs.map((tx) => tx.id);

    // Snapshot old-group remaining arrays before any state mutation
    const oldGroupIds = [
      ...new Set(
        selectedTxs.map((tx) => tx.parentId).filter(Boolean) as string[],
      ),
    ].filter((id) => id !== groupId);

    const oldGroupRemainders = new Map(
      oldGroupIds
        .filter((id) => childRows[id])
        .map((id) => [
          id,
          childRows[id].filter((tx) => !childIds.includes(tx.id)),
        ]),
    );

    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: childIds, updates: { parentId: groupId } }),
    });

    clearSelected();

    // Update childRows: remove from old groups, add to new group
    setChildRows((prev) => {
      const next = { ...prev };
      for (const oldId of oldGroupIds) {
        if (next[oldId]) {
          next[oldId] = next[oldId].filter((tx) => !childIds.includes(tx.id));
        }
      }
      if (next[groupId]) {
        const existing = next[groupId].filter(
          (tx) => !childIds.includes(tx.id),
        );
        next[groupId] = [
          ...existing,
          ...selectedTxs.map((tx) => ({ ...tx, parentId: groupId })),
        ];
      }
      return next;
    });

    // Recompute or delete old groups
    for (const [oldId, remaining] of oldGroupRemainders) {
      if (remaining.length === 0) {
        await fetch(`/api/transactions/${oldId}`, { method: "DELETE" });
        setExpandedIds((prev) => {
          const s = new Set(prev);
          s.delete(oldId);
          return s;
        });
        setChildRows((prev) => {
          const next = { ...prev };
          delete next[oldId];
          return next;
        });
        setPageRows((prev) => prev.filter((tx) => tx.id !== oldId));
        setAllGroups((prev) => prev.filter((g) => g.id !== oldId));
      } else {
        const groupUpdates = computeGroupFields(remaining);
        setPageRows((prev) =>
          prev.map((tx) => (tx.id === oldId ? { ...tx, ...groupUpdates } : tx)),
        );
        setAllGroups((prev) =>
          prev.map((g) => (g.id === oldId ? { ...g, ...groupUpdates } : g)),
        );
        await fetch(`/api/transactions/${oldId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupUpdates),
        });
      }
    }

    // Recompute new group summary
    if (childRows[groupId]) {
      const updatedChildren = [
        ...childRows[groupId].filter((tx) => !childIds.includes(tx.id)),
        ...selectedTxs.map((tx) => ({ ...tx, parentId: groupId })),
      ];
      const groupUpdates = computeGroupFields(updatedChildren);
      setPageRows((prev) =>
        prev.map((tx) => (tx.id === groupId ? { ...tx, ...groupUpdates } : tx)),
      );
      setAllGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, ...groupUpdates } : g)),
      );
      await fetch(`/api/transactions/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupUpdates),
      });
    }

    fetchPage({
      page: currentPage,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
      sortAbs: absValue,
    });
  };

  const handleUnlinkChild = async (childId: string) => {
    const parentGroupId = parentMap.get(childId) ?? null;

    await fetch(`/api/transactions/${childId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: null }),
    });

    if (parentGroupId) {
      const remaining = childRows[parentGroupId].filter(
        (tx) => tx.id !== childId,
      );
      if (remaining.length === 0) {
        await handleDeleteTransaction(parentGroupId);
        return;
      }
      await handleUpdateTransaction(
        parentGroupId,
        computeGroupFields(remaining),
      );
    }

    fetchPage({
      page: currentPage,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
      sortAbs: absValue,
    });

    setChildRows((prev) => {
      const next = { ...prev };
      for (const groupId of Object.keys(next)) {
        next[groupId] = next[groupId].filter((tx) => tx.id !== childId);
      }
      return next;
    });
  };

  const handleBulkDelete = async (ids: string[]) => {
    const idSet = new Set(ids);

    // Snapshot affected parent groups before mutation — O(deleted) via parentMap
    const affectedGroups = new Map<string, Transaction[]>();
    for (const id of ids) {
      const parentId = parentMap.get(id);
      if (parentId && !idSet.has(parentId) && !affectedGroups.has(parentId)) {
        affectedGroups.set(
          parentId,
          (childRows[parentId] ?? []).filter((c) => !idSet.has(c.id)),
        );
      }
    }

    await fetch("/api/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    clearSelected();

    // Remove deleted children from childRows
    setChildRows((prev) => {
      const next = { ...prev };
      for (const groupId of Object.keys(next)) {
        next[groupId] = next[groupId].filter((tx) => !idSet.has(tx.id));
      }
      return next;
    });

    // Recompute or delete parent groups whose children were deleted
    for (const [groupId, remaining] of affectedGroups) {
      if (idSet.has(groupId)) continue; // group itself was also deleted
      if (remaining.length === 0) {
        await fetch(`/api/transactions/${groupId}`, { method: "DELETE" });
        setExpandedIds((prev) => {
          const s = new Set(prev);
          s.delete(groupId);
          return s;
        });
        setChildRows((prev) => {
          const next = { ...prev };
          delete next[groupId];
          return next;
        });
        setPageRows((prev) => prev.filter((tx) => tx.id !== groupId));
        setAllGroups((prev) => prev.filter((g) => g.id !== groupId));
      } else {
        const groupUpdates = computeGroupFields(remaining);
        setPageRows((prev) =>
          prev.map((tx) =>
            tx.id === groupId ? { ...tx, ...groupUpdates } : tx,
          ),
        );
        setAllGroups((prev) =>
          prev.map((g) => (g.id === groupId ? { ...g, ...groupUpdates } : g)),
        );
        await fetch(`/api/transactions/${groupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupUpdates),
        });
      }
    }

    fetchPage({
      page: currentPage,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
      sortAbs: absValue,
    });

    fetchMetadata();
  };

  const handleBulkUpdate = async (
    ids: string[],
    updates: Partial<Transaction>,
  ) => {
    const idSet = new Set(ids);
    setPageRows((prev) =>
      prev.map((tx) => (idSet.has(tx.id) ? { ...tx, ...updates } : tx)),
    );
    setChildRows((prev) => {
      const next = { ...prev };
      for (const groupId of Object.keys(next)) {
        if (next[groupId].some((tx) => idSet.has(tx.id))) {
          next[groupId] = next[groupId].map((tx) =>
            idSet.has(tx.id) ? { ...tx, ...updates } : tx,
          );
        }
      }
      return next;
    });
    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, updates }),
    });
    clearSelected();
    fetchPage({
      page: currentPage,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
      sortAbs: absValue,
    });
  };

  const handleImportTransactions = async (
    newTransactions: Omit<Transaction, "id" | "createdAt">[],
  ) => {
    const now = Date.now();
    const sorted = [...newTransactions].sort((a, b) =>
      b.date.localeCompare(a.date),
    );
    const withTimestamps = sorted.map((tx, i) => ({
      ...tx,
      createdAt: now - i,
    }));

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withTimestamps),
    });

    const created: Transaction[] = await res.json();
    setSelectedMap(new Map(created.map((row: Transaction) => [row.id, row])));
    setCurrentPage(1);
    fetchPage({
      page: 1,
      sortBy: sortConfig?.key ?? null,
      sortDir: sortConfig?.direction ?? null,
      sortAbs: absValue,
    });
  };

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
            onToggleSelect={(tx) =>
              setSelectedMap((prev) => {
                const next = new Map(prev);
                next.has(tx.id) ? next.delete(tx.id) : next.set(tx.id, tx);
                return next;
              })
            }
            onSelectAll={(txs) =>
              setSelectedMap((prev) => {
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
