"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  SortConfig,
  Transaction,
  PaginatedResponse,
} from "@/types/transaction";
import { computeGroupFields } from "@/lib/groupUtils";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

//Filters

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

//Hook
export function useTransactions() {
  const [pageRows, setPageRows] = useState<Transaction[]>([]);
  const [childRows, setChildRows] = useState<Record<string, Transaction[]>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [textFilters, setTextFilters] =
    useState<TextFilters>(EMPTY_TEXT_FILTERS);
  const [debouncedTextFilters, setDebouncedTextFilters] =
    useState<TextFilters>(EMPTY_TEXT_FILTERS);
  const textFiltersRef = useRef<TextFilters>(EMPTY_TEXT_FILTERS);
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

  //fetch

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

  // Shorthand to re-run fetchPage with current sort/abs state
  const refetchCurrentPage = useCallback(
    (page = currentPage) =>
      fetchPage({
        page,
        sortBy: sortConfig?.key ?? null,
        sortDir: sortConfig?.direction ?? null,
        sortAbs: absValue,
      }),
    [fetchPage, currentPage, sortConfig, absValue],
  );

  //Effects
  // Debounce text/range filters
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

  //Derived State

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

  const displayRows = useMemo(() => {
    if (!pinnedRow || pageRows.some((r) => r.id === pinnedRow.id))
      return pageRows;
    return [pinnedRow, ...pageRows];
  }, [pinnedRow, pageRows]);

  const allTransactions = [...displayRows, ...Object.values(childRows).flat()];

  const selectedTransactions = [...selectedMap.values()];

  const validGroup = selectedTransactions.every(
    (tx) => tx.parentId === selectedTransactions[0].parentId,
  );

  //Filter Handlers

  const handleTextFilterChange = (col: keyof TextFilters, value: string) => {
    setTextFilters((prev) => ({ ...prev, [col]: value }));
  };

  const handleFilterChange = (col: keyof ColumnFilters, values: string[]) => {
    setColumnFilters((prev) => ({ ...prev, [col]: values }));
    setCurrentPage(1);
    setPinnedRow(null);
  };

  //Sort Handlers

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

  //Selection Handlers
  const clearSelected = () => setSelectedMap(new Map());

  const handleToggleSelect = (tx: Transaction) =>
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(tx.id)) {
        next.delete(tx.id);
      } else {
        next.set(tx.id, tx);
      }
      return next;
    });

  const handleSelectAll = (txs: Transaction[]) =>
    setSelectedMap((prev) => {
      const next = new Map(prev);
      for (const tx of txs) next.set(tx.id, tx);
      return next;
    });

  //MetaData helper
  const addMetadata = (updates: Partial<Transaction>) => {
    if (updates.category && !allCategories.includes(updates.category)) {
      setAllCategories((prev) => [...prev, updates.category!]);
    }
    if (updates.source && !allSources.includes(updates.source)) {
      setAllSources((prev) => [...prev, updates.source!]);
    }
  };

  // Crud Handlers -------------------

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
    // Optimistically update local state before awaiting the network call
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

    const res = await fetch(`/api/transactions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const { ancestors } = await res.json();

    // Apply server-computed ancestor summaries (amount comes back as string from DB)
    for (const ancestor of ancestors as Array<Record<string, unknown>>) {
      const groupUpdates = {
        date: ancestor.date as string,
        amount: Number(ancestor.amount),
        status: ancestor.status as Transaction["status"],
        source: ancestor.source as string | null,
      };
      const ancestorId = ancestor.id as string;
      setPageRows((prev) =>
        prev.map((tx) => (tx.id === ancestorId ? { ...tx, ...groupUpdates } : tx)),
      );
      setAllGroups((prev) =>
        prev.map((g) => (g.id === ancestorId ? { ...g, ...groupUpdates } : g)),
      );
      setChildRows((prev) => {
        const next = { ...prev };
        for (const groupId of Object.keys(next)) {
          next[groupId] = next[groupId].map((tx) =>
            tx.id === ancestorId ? { ...tx, ...groupUpdates } : tx,
          );
        }
        return next;
      });
      setPinnedRow((prev) =>
        prev?.id === ancestorId ? { ...prev, ...groupUpdates } : prev,
      );
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const parentGroupId = parentMap.get(id) ?? null;
    const grandparentId = parentGroupId ? (parentMap.get(parentGroupId) ?? null) : null;

    await fetch(`/api/transactions/${id}`, { method: "DELETE" });

    setExpandedIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });

    setChildRows((prev) => {
      const next = { ...prev };
      delete next[id];
      if (parentGroupId && next[parentGroupId]) {
        next[parentGroupId] = next[parentGroupId].filter((tx) => tx.id !== id);
      }
      return next;
    });

    if (pinnedRow?.id === id) setPinnedRow(null);

    if (parentGroupId) {
      const remaining = (childRows[parentGroupId] ?? []).filter((tx) => tx.id !== id);

      if (remaining.length === 0) {
        await fetch(`/api/transactions/${parentGroupId}`, { method: "DELETE" });
        setExpandedIds((prev) => {
          const s = new Set(prev);
          s.delete(parentGroupId);
          return s;
        });
        setChildRows((prev) => {
          const next = { ...prev };
          delete next[parentGroupId];
          if (grandparentId && next[grandparentId]) {
            next[grandparentId] = next[grandparentId].filter((tx) => tx.id !== parentGroupId);
          }
          return next;
        });
        setPageRows((prev) => prev.filter((tx) => tx.id !== parentGroupId));
        setAllGroups((prev) => prev.filter((g) => g.id !== parentGroupId));
      } else {
        const groupUpdates = computeGroupFields(remaining);
        setPageRows((prev) =>
          prev.map((tx) => (tx.id === parentGroupId ? { ...tx, ...groupUpdates } : tx)),
        );
        setAllGroups((prev) =>
          prev.map((g) => (g.id === parentGroupId ? { ...g, ...groupUpdates } : g)),
        );
        if (grandparentId) {
          setChildRows((prev) => {
            const next = { ...prev };
            if (next[grandparentId]) {
              next[grandparentId] = next[grandparentId].map((tx) =>
                tx.id === parentGroupId ? { ...tx, ...groupUpdates } : tx,
              );
            }
            return next;
          });
        }
        await fetch(`/api/transactions/${parentGroupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupUpdates),
        });
      }
    }

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

  // Expand + Collapse ---------
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

  // Group handlers ---------
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

    await refetchCurrentPage();
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

    // Build remaining-children map for old groups — fetch from API if not loaded locally
    const oldGroupRemaindersEntries = await Promise.all(
      oldGroupIds.map(async (id) => {
        const existing = childRows[id];
        if (existing) {
          return [id, existing.filter((tx) => !childIds.includes(tx.id))] as const;
        }
        const res = await fetch(`/api/transactions?parentId=${id}`);
        const fetched: Transaction[] = await res.json();
        return [id, fetched.filter((tx) => !childIds.includes(tx.id))] as const;
      }),
    );
    const oldGroupRemainders = new Map(oldGroupRemaindersEntries);

    await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: childIds, updates: { parentId: groupId } }),
    });

    clearSelected();

    // Update parentId for any selected groups in allGroups
    const selectedGroupIds = selectedTxs
      .filter((tx) => tx.isGroup)
      .map((tx) => tx.id);
    if (selectedGroupIds.length > 0) {
      setAllGroups((prev) =>
        prev.map((g) =>
          selectedGroupIds.includes(g.id) ? { ...g, parentId: groupId } : g,
        ),
      );
    }

    // Remove any moved top-level items from pageRows immediately (avoids
    // duplicate render while fetchPage is in flight)
    const movedFromTopLevel = selectedTxs
      .filter((tx) => !tx.parentId)
      .map((tx) => tx.id);
    if (movedFromTopLevel.length > 0) {
      setPageRows((prev) =>
        prev.filter((tx) => !movedFromTopLevel.includes(tx.id)),
      );
      if (pinnedRow && movedFromTopLevel.includes(pinnedRow.id)) {
        setPinnedRow(null);
      }
    }

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
      const oldParentId = parentMap.get(oldId) ?? null;
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
          if (oldParentId && next[oldParentId]) {
            next[oldParentId] = next[oldParentId].filter((tx) => tx.id !== oldId);
          }
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
        if (oldParentId) {
          setChildRows((prev) => {
            const next = { ...prev };
            if (next[oldParentId]) {
              next[oldParentId] = next[oldParentId].map((tx) =>
                tx.id === oldId ? { ...tx, ...groupUpdates } : tx,
              );
            }
            return next;
          });
        }
        await fetch(`/api/transactions/${oldId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupUpdates),
        });
      }
    }

    // Recompute new group summary — always fetch fresh children so collapsed groups update correctly
    const newChildrenRes = await fetch(`/api/transactions?parentId=${groupId}`);
    const newChildren: Transaction[] = await newChildrenRes.json();
    const groupUpdates = computeGroupFields(newChildren);
    const targetParentId = parentMap.get(groupId) ?? null;
    setPageRows((prev) =>
      prev.map((tx) => (tx.id === groupId ? { ...tx, ...groupUpdates } : tx)),
    );
    setAllGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...groupUpdates } : g)),
    );
    setChildRows((prev) => {
      const next = { ...prev };
      if (next[groupId]) {
        next[groupId] = newChildren;
      }
      if (targetParentId && next[targetParentId]) {
        next[targetParentId] = next[targetParentId].map((tx) =>
          tx.id === groupId ? { ...tx, ...groupUpdates } : tx,
        );
      }
      return next;
    });
    await fetch(`/api/transactions/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(groupUpdates),
    });

    refetchCurrentPage();
  };

  const handleUnlinkChild = async (childId: string) => {
    const parentGroupId = parentMap.get(childId) ?? null;
    const grandparentId = parentGroupId
      ? (parentMap.get(parentGroupId) ?? null)
      : null;

    await fetch(`/api/transactions/${childId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: grandparentId }),
    });

    if (parentGroupId) {
      const remaining = (childRows[parentGroupId] ?? []).filter(
        (tx) => tx.id !== childId,
      );

      if (remaining.length === 0) {
        // Delete the now-empty parent group directly (avoids fetchPage for nested case)
        await fetch(`/api/transactions/${parentGroupId}`, { method: "DELETE" });

        setExpandedIds((prev) => {
          const s = new Set(prev);
          s.delete(parentGroupId);
          return s;
        });
        setChildRows((prev) => {
          const next = { ...prev };
          delete next[parentGroupId];
          // Remove deleted group from grandparent's children list
          if (grandparentId && next[grandparentId]) {
            next[grandparentId] = next[grandparentId].filter(
              (tx) => tx.id !== parentGroupId,
            );
          }
          return next;
        });
        setAllGroups((prev) => prev.filter((g) => g.id !== parentGroupId));
        setPageRows((prev) => prev.filter((tx) => tx.id !== parentGroupId));
        setPinnedRow((prev) => (prev?.id === parentGroupId ? null : prev));
        fetchMetadata();
      } else {
        // Update parent group summary and remove child from its list
        const groupUpdates = computeGroupFields(remaining);
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
        setChildRows((prev) => {
          const next = { ...prev };
          if (next[parentGroupId]) {
            next[parentGroupId] = next[parentGroupId].filter(
              (tx) => tx.id !== childId,
            );
          }
          // Update parent's entry in grandparent's children list
          if (grandparentId && next[grandparentId]) {
            next[grandparentId] = next[grandparentId].map((tx) =>
              tx.id === parentGroupId ? { ...tx, ...groupUpdates } : tx,
            );
          }
          return next;
        });
        await fetch(`/api/transactions/${parentGroupId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupUpdates),
        });
      }
    }

    if (grandparentId) {
      // Re-fetch grandparent's children — now includes the re-parented child
      const res = await fetch(`/api/transactions?parentId=${grandparentId}`);
      const newGrandparentChildren: Transaction[] = await res.json();
      setChildRows((prev) => ({
        ...prev,
        [grandparentId]: newGrandparentChildren,
      }));

      // Recompute and persist grandparent's summary
      const grandparentUpdates = computeGroupFields(newGrandparentChildren);
      setPageRows((prev) =>
        prev.map((tx) =>
          tx.id === grandparentId ? { ...tx, ...grandparentUpdates } : tx,
        ),
      );
      setAllGroups((prev) =>
        prev.map((g) =>
          g.id === grandparentId ? { ...g, ...grandparentUpdates } : g,
        ),
      );
      setPinnedRow((prev) =>
        prev?.id === grandparentId ? { ...prev, ...grandparentUpdates } : prev,
      );
      // If grandparent is itself nested, update its entry in its parent's list
      const greatGrandparentId = parentMap.get(grandparentId);
      if (greatGrandparentId) {
        setChildRows((prev) => {
          const next = { ...prev };
          if (next[greatGrandparentId]) {
            next[greatGrandparentId] = next[greatGrandparentId].map((tx) =>
              tx.id === grandparentId ? { ...tx, ...grandparentUpdates } : tx,
            );
          }
          return next;
        });
      }
      await fetch(`/api/transactions/${grandparentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(grandparentUpdates),
      });
    } else {
      // Child goes to root — remove from all child rows and refresh page
      setChildRows((prev) => {
        const next = { ...prev };
        for (const groupId of Object.keys(next)) {
          next[groupId] = next[groupId].filter((tx) => tx.id !== childId);
        }
        return next;
      });

      refetchCurrentPage();
    }
  };

  // Bulk Handlers -----------------------

  const handleBulkDelete = async (ids: string[]) => {
    const idSet = new Set(ids);

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

    refetchCurrentPage();
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
    refetchCurrentPage();
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

  return {
    // Auth
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
  };
}
