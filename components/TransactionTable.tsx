import React, { useEffect, useMemo } from "react";
import { useState, useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  ListFilter,
  Paperclip,
  Trash,
  Unlink,
  X,
} from "lucide-react";
import { Transaction, SortConfig, Status, STATUSES } from "@/types/transaction";
import StatusBadge from "./StatusBadge";
import BulkActions from "./BulkActions";

function DriveFileCell({
  fileId,
  onUnlink,
}: {
  fileId: string;
  onUnlink: () => void;
}) {
  const [file, setFile] = useState<{
    name: string;
    webViewLink: string;
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/drive/file/${fileId}`)
      .then((r) => {
        if (!r.ok) {
          setError(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.name)
          setFile({ name: data.name, webViewLink: data.webViewLink });
        else if (data) setError(true);
      })
      .catch(() => setError(true));
  }, [fileId]);

  if (error) {
    return (
      <span title="Could not load file">
        <FileText className="w-3.5 h-3.5 text-red-800" />
      </span>
    );
  }

  if (!file) {
    return (
      <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 animate-pulse" />
    );
  }
  return (
    <div className="flex relative">
      <a
        href={file.webViewLink}
        target="_blank"
        rel="noopener noreferrer"
        title={file.name}
        onClick={(e) => e.stopPropagation()}
        className="p-0.5"
      >
        <FileText className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors" />
      </a>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onUnlink();
        }}
        className="absolute -top-1.5 -right-2.5 w-3 h-3 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-rose-100 dark:hover:bg-rose-900 hover:text-rose-600 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Remove file"
        title="Remove file"
      >
        <X className="w-2 h-2" />
      </button>
    </div>
  );
}

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

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function buildReceiptName(
  tx: { date: string; category: string | null; description: string },
  ext: string,
): string {
  const sanitize = (s: string) => s.replace(/[^\w]/g, "");
  const titleCase = (s: string) =>
    s
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  const parts: string[] = [tx.date, "Receipt"];
  if (tx.category && tx.category !== "None") parts.push(sanitize(tx.category));
  if (tx.description) parts.push(sanitize(titleCase(tx.description)));
  const base = parts.join("_");
  return ext ? `${base}.${ext}` : base;
}

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
  const emptyNewTransaction: Partial<Transaction> = {
    date: localToday(),
    description: "",
    category: null,
    amount: 0,
    status: "Completed",
    source: null,
    isGroup: false,
    parentId: null,
    driveFileId: null,
  };
  const [newTransaction, setNewTransaction] =
    useState<Partial<Transaction>>(emptyNewTransaction);
  const [showAddErrors, setShowAddErrors] = useState(false);

  useEffect(() => {
    if (!showAddRow) {
      setNewTransaction(emptyNewTransaction);
      setShowAddErrors(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddRow]);

  const newDescriptionRef = useRef<HTMLInputElement>(null);
  const [groupDescSearch, setGroupDescSearch] = useState<
    Record<string, string>
  >({});
  const lastClickedIdRef = useRef<string | null>(null);
  const shiftKeyRef = useRef(false);

  const attachingTxIdRef = useRef<{
    id: string;
    date: string;
    category: string | null;
    description: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/drive/token").then((r) => setDriveConnected(r.ok));
  }, []);

  const handleAttach = (
    tx: Pick<Transaction, "id" | "date" | "category" | "description">,
  ) => {
    if (!driveConnected) {
      alert(
        "Google Drive is not connected. Go to Settings → Integrations → Connect.",
      );
      return;
    }
    attachingTxIdRef.current = {
      id: tx.id,
      date: tx.date,
      category: tx.category,
      description: tx.description,
    };
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const txMeta = attachingTxIdRef.current;
    e.target.value = "";
    if (!file || !txMeta) return;

    const txId = txMeta.id;
    const ext = file.name.includes(".") ? file.name.split(".").pop()! : "";
    const renamedFile = new File([file], buildReceiptName(txMeta, ext), {
      type: file.type,
    });

    setUploadingIds((prev) => new Set([...prev, txId]));
    try {
      const formData = new FormData();
      formData.append("file", renamedFile);
      const res = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Upload failed");
        return;
      }
      const { id } = await res.json();
      onUpdate(txId, { driveFileId: id });
    } catch {
      alert("Upload failed");
    } finally {
      setUploadingIds((prev) => {
        const next = new Set(prev);
        next.delete(txId);
        return next;
      });
      attachingTxIdRef.current = null;
    }
  };
  const pendingFocusIdRef = useRef<string | null>(null);
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: EditableFields;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
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

  const dropdownBase =
    "absolute top-full left-0 mt-0.5 bg-white dark:bg-[#1b1b1b] border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 py-1 font-normal normal-case tracking-normal text-left select-auto";

  const renderFilterDropdown = (
    col: "category" | "status" | "source",
    options: string[],
    showNone = false,
  ) => {
    const active = columnFilters[col];
    return (
      <div
        ref={filterRef}
        className={`${dropdownBase} min-w-44`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Filter
          </span>
          {active.length > 0 && (
            <button
              onClick={() => onFilterChange(col, [])}
              className="text-[11px] text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="max-h-52 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-[12px] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#282828] text-gray-900 dark:text-foreground"
            >
              <input
                type="checkbox"
                checked={active.includes(opt)}
                onChange={() => {
                  const next = active.includes(opt)
                    ? active.filter((v) => v !== opt)
                    : [...active, opt];
                  onFilterChange(col, next);
                }}
                className="w-3 h-3 accent-gray-700 dark:accent-gray-300 cursor-pointer"
              />
              {opt}
            </label>
          ))}
          {showNone && (
            <label className="flex items-center gap-2 px-3 py-1.5 text-[12px] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#282828] text-gray-400 dark:text-gray-500">
              <input
                type="checkbox"
                checked={active.includes("__none__")}
                onChange={() => {
                  const next = active.includes("__none__")
                    ? active.filter((v) => v !== "__none__")
                    : [...active, "__none__"];
                  onFilterChange(col, next);
                }}
                className="w-3 h-3 accent-gray-700 dark:accent-gray-300 cursor-pointer"
              />
              (None)
            </label>
          )}
        </div>
      </div>
    );
  };

  const dropdownInputClass =
    "w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 outline-none text-[12px] text-gray-900 dark:text-foreground py-1 px-0 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0";

  const renderDescriptionDropdown = () => {
    const active = textFilters.description !== "";
    return (
      <div
        ref={filterRef}
        className={`${dropdownBase} w-full`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Filter
          </span>
          {active && (
            <button
              onClick={() => onTextFilterChange("description", "")}
              className="text-[11px] text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="px-3 py-2">
          <input
            autoFocus
            type="text"
            placeholder="Search description..."
            value={textFilters.description}
            onChange={(e) => onTextFilterChange("description", e.target.value)}
            className={dropdownInputClass}
          />
        </div>
      </div>
    );
  };

  const renderDateRangeDropdown = () => {
    const active = textFilters.dateFrom !== "" || textFilters.dateTo !== "";
    return (
      <div
        ref={filterRef}
        className={`${dropdownBase} w-52`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Filter
          </span>
          {active && (
            <button
              onClick={() => {
                onTextFilterChange("dateFrom", "");
                onTextFilterChange("dateTo", "");
              }}
              className="text-[11px] text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="px-3 py-2 flex flex-col gap-2">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">
              From
            </p>
            <input
              type="date"
              value={textFilters.dateFrom}
              onChange={(e) => onTextFilterChange("dateFrom", e.target.value)}
              className={dropdownInputClass}
            />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">
              To
            </p>
            <input
              type="date"
              value={textFilters.dateTo}
              onChange={(e) => onTextFilterChange("dateTo", e.target.value)}
              className={dropdownInputClass}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderAmountRangeDropdown = () => {
    const active = textFilters.amountMin !== "" || textFilters.amountMax !== "";
    return (
      <div
        ref={filterRef}
        className={`${dropdownBase} w-44`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Filter
          </span>
          {active && (
            <button
              onClick={() => {
                onTextFilterChange("amountMin", "");
                onTextFilterChange("amountMax", "");
              }}
              className="text-[11px] text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        <div className="px-3 py-2 flex flex-col gap-2">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">
              Min
            </p>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. -100"
              value={textFilters.amountMin}
              onChange={(e) => onTextFilterChange("amountMin", e.target.value)}
              className={dropdownInputClass}
            />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">
              Max
            </p>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 500"
              value={textFilters.amountMax}
              onChange={(e) => onTextFilterChange("amountMax", e.target.value)}
              className={dropdownInputClass}
            />
          </div>
        </div>
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Sort by abs value</span>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onToggleAbsSort()}
            className={`relative w-7 h-4 rounded-full transition-colors ${
              absValue
                ? "bg-blue-500"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white transition-transform ${
                absValue
                  ? "translate-x-3.5"
                  : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    );
  };

  const selectableIds = useMemo(
    () => transactions.map((tx) => tx.id),
    [transactions],
  );

  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectableIds.some((id) => selectedIds.has(id));

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
    const tx = allTransactions.find((t) => t.id === id);
    if (field === "amount") {
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed) && parsed !== Number(tx?.amount))
        onUpdate(id, { amount: parsed });
    } else if (field === "date") {
      if (editValue && editValue !== tx?.date)
        onUpdate(id, { date: editValue });
    } else if (field === "description") {
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== tx?.description)
        onUpdate(id, { description: trimmed });
    } else if (field === "category") {
      const val = editValue.trim() || null;
      if (val !== (tx?.category ?? null)) onUpdate(id, { category: val });
    } else if (field === "source") {
      const val = editValue.trim() || null;
      if (val !== (tx?.source ?? null)) onUpdate(id, { source: val });
    } else if (field === "status") {
      if (editValue !== tx?.status)
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

  const handleNewRowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveNew();
    } else if (e.key === "Escape") {
      onCancelAdd();
    }
  };

  const handleSaveNew = async () => {
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
    setNewTransaction(emptyNewTransaction);
    newDescriptionRef.current?.focus();
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
      <ArrowUp className="w-3 h-3 ml-1 inline-block text-gray-400 dark:text-gray-500" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline-block text-gray-400 dark:text-gray-500" />
    );
  };

  const isEditing = (id: string, field: EditableFields) =>
    editingCell?.id === id && editingCell?.field === field;

  const thClass = `h-9 px-4 font-normal text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700 select-none`;
  const tdClass = `h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 whitespace-nowrap`;
  const addInputClass = `w-full bg-transparent border-0 border-b border-transparent hover:border-gray-200 dark:hover:border-gray-700 focus:ring-0 p-1 text-[13px] text-gray-900 dark:text-foreground placeholder-gray-400 dark:placeholder-gray-500 transition-colors outline-none`;
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
                  {child.isGroup && child.childCount !== undefined && (
                    <span className="text-gray-400 dark:text-gray-500 text-[11px] font-normal shrink-0">
                      · {child.childCount}{" "}
                      {child.childCount === 1 ? "Transaction" : "Transactions"}
                    </span>
                  )}
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
                  <FileText className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 animate-pulse" />
                ) : child.driveFileId ? (
                  <DriveFileCell
                    fileId={child.driveFileId}
                    onUnlink={() => onUpdate(child.id, { driveFileId: null })}
                  />
                ) : (
                  <button
                    onClick={() => handleAttach(child)}
                    className="p-0.5 text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    aria-label="Upload file to Drive"
                    title="Upload file to Google Drive"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
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
        <span className="text-[12px] text-gray-400 dark:text-gray-500 tabular-nums w-18 shrink-0">
          {selectedIds.size} selected
        </span>
        <button
          disabled={!canGroup}
          onClick={async () => {
            if (!canGroup) return;
            const newGroupId = await onCreateGroup("New Group");
            pendingFocusIdRef.current = newGroupId;
          }}
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
        <button
          onClick={() => {
            onClearSelection();
          }}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
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
          <thead className="sticky top-0 bg-white dark:bg-[#131314] z-2">
            <tr>
              <th className={`${thClass} w-8`}>
                {selectableIds.length > 0 && (
                  <label className="flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected;
                      }}
                      onChange={() => {
                        if (allSelected) {
                          for (const tx of transactions) {
                            onToggleSelect(tx);
                          }
                        } else {
                          onSelectAll(transactions);
                        }
                      }}
                      className="w-3.5 h-3.5 accent-gray-700 dark:accent-gray-300 cursor-pointer"
                    />
                  </label>
                )}
              </th>
              <th className={`${thClass} relative w-34`}>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-foreground transition-colors"
                    onClick={() => onSort("date")}
                  >
                    Date {renderSortIcon("date")}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterCol(
                        openFilterCol === "date" ? null : "date",
                      );
                    }}
                    className={`p-0.5 rounded transition-colors ${textFilters.dateFrom || textFilters.dateTo ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
                  >
                    <ListFilter className="w-3 h-3" />
                  </button>
                </div>
                {openFilterCol === "date" && renderDateRangeDropdown()}
              </th>
              <th className={`${thClass} relative min-w-64`}>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-foreground transition-colors"
                    onClick={() => onSort("description")}
                  >
                    Description {renderSortIcon("description")}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterCol(
                        openFilterCol === "description" ? null : "description",
                      );
                    }}
                    className={`p-0.5 rounded transition-colors ${textFilters.description ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
                  >
                    <ListFilter className="w-3 h-3" />
                  </button>
                </div>
                {openFilterCol === "description" && renderDescriptionDropdown()}
              </th>
              <th className={`${thClass} relative w-38`}>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-foreground transition-colors"
                    onClick={() => onSort("category")}
                  >
                    Category {renderSortIcon("category")}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterCol(
                        openFilterCol === "category" ? null : "category",
                      );
                    }}
                    className={`p-0.5 rounded transition-colors ${columnFilters.category.length > 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
                  >
                    <ListFilter className="w-3 h-3" />
                  </button>
                </div>
                {openFilterCol === "category" &&
                  renderFilterDropdown("category", allCategories, true)}
              </th>
              <th className={`${thClass} relative w-32`}>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-foreground transition-colors"
                    onClick={() => onSort("amount")}
                  >
                    Amount {renderSortIcon("amount")}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterCol(
                        openFilterCol === "amount" ? null : "amount",
                      );
                    }}
                    className={`p-0.5 rounded transition-colors ${textFilters.amountMin || textFilters.amountMax || (absValue) ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
                  >
                    <ListFilter className="w-3 h-3" />
                  </button>
                </div>
                {openFilterCol === "amount" && renderAmountRangeDropdown()}
              </th>
              <th className={`${thClass} relative w-32`}>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-foreground transition-colors"
                    onClick={() => onSort("status")}
                  >
                    Status {renderSortIcon("status")}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterCol(
                        openFilterCol === "status" ? null : "status",
                      );
                    }}
                    className={`p-0.5 rounded transition-colors ${columnFilters.status.length > 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
                  >
                    <ListFilter className="w-3 h-3" />
                  </button>
                </div>
                {openFilterCol === "status" &&
                  renderFilterDropdown("status", STATUSES)}
              </th>
              <th className={`${thClass} relative w-38`}>
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="flex items-center cursor-pointer hover:text-gray-900 dark:hover:text-foreground transition-colors"
                    onClick={() => onSort("source")}
                  >
                    Source {renderSortIcon("source")}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterCol(
                        openFilterCol === "source" ? null : "source",
                      );
                    }}
                    className={`p-0.5 rounded transition-colors ${columnFilters.source.length > 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
                  >
                    <ListFilter className="w-3 h-3" />
                  </button>
                </div>
                {openFilterCol === "source" &&
                  renderFilterDropdown("source", allSources, true)}
              </th>
              <th className={`${thClass} w-14`}>File</th>
              <th className={`${thClass} w-14`} />
            </tr>
          </thead>
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
            {showAddRow && (
              <tr
                className="border-b border-gray-100 dark:border-gray-800"
                onKeyDown={handleNewRowKeyDown}
              >
                <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800" />
                {/* Date */}
                <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800">
                  <input
                    type="date"
                    value={newTransaction.date}
                    className={`${addInputClass} ${showAddErrors && !newTransaction.date ? "border-rose-400! dark:border-rose-500!" : ""}`}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        date: e.target.value,
                      })
                    }
                    autoFocus
                  />
                </td>
                {/* Description */}
                <td className="h-9 px-3 border-r border-gray-100 dark:border-gray-800">
                  <input
                    ref={newDescriptionRef}
                    type="text"
                    placeholder="Description..."
                    value={newTransaction.description}
                    className={`${addInputClass} ${showAddErrors && !newTransaction.description ? "border-rose-400! dark:border-rose-500!" : ""}`}
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
                    className={`${addInputClass} text-right ${showAddErrors && newTransaction.amount === undefined ? "border-rose-400! dark:border-rose-500!" : ""}`}
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
                {/* Extra */}
                <td className={tdClass}>
                  <button
                    onClick={handleSaveNew}
                    aria-label="Save Transaction"
                    className="p-1 text-gray-400 hover:text-emerald-600 dark:text-gray-500 dark:hover:text-emerald-400 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            )}

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
                                  className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-foreground transition-colors shrink-0"
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
                            <DriveFileCell
                              fileId={tx.driveFileId}
                              onUnlink={() =>
                                onUpdate(tx.id, { driveFileId: null })
                              }
                            />
                          ) : (
                            <button
                              onClick={() => handleAttach(tx)}
                              className="p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                              aria-label="Upload file to Drive"
                              title="Upload file to Google Drive"
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
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
    </div>
  );
};

export default TransactionTable;
