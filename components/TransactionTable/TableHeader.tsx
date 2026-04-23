import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ListFilter } from "lucide-react";
import { Transaction, SortConfig, STATUSES } from "@/types/transaction";

interface TableHeaderProps {
  transactions: Transaction[];
  sortConfig: SortConfig | null;
  onSort: (key: keyof Transaction) => void;
  columnFilters: { category: string[]; status: string[]; source: string[] };
  onFilterSelectChange: (
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
  onFilterTextChange: (
    col: "description" | "dateFrom" | "dateTo" | "amountMin" | "amountMax",
    value: string,
  ) => void;
  allCategories: string[];
  allSources: string[];
  selectedIdsMap: Map<string, Transaction>;
  onSelectAll: (txs: Transaction[]) => void;
  onToggleSelect: (tx: Transaction) => void;
  onToggleAbsSort: () => void;
  absValue: boolean;
}

const TableHeader = ({
  transactions,
  sortConfig,
  onSort,
  columnFilters,
  onFilterSelectChange,
  onFilterTextChange,
  textFilters,
  allCategories,
  allSources,
  selectedIdsMap,
  onSelectAll,
  onToggleSelect,
  onToggleAbsSort,
  absValue,
}: TableHeaderProps) => {
  const [openFilterCol, setOpenFilterCol] = useState<
    "date" | "description" | "amount" | "category" | "status" | "source" | null
  >(null);
  const filterRef = useRef<HTMLDivElement>(null);

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

  const allSelectableIds = transactions.map((tx) => tx.id);

  const isAllSelected =
    allSelectableIds.length > 0 &&
    allSelectableIds.every((id) => selectedIdsMap.has(id));

  const isSomeSelected = allSelectableIds.some((id) => selectedIdsMap.has(id));

  const thClass = `h-9 px-4 font-normal text-[11px] uppercase tracking-wider text-gray-600 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700 select-none`;

  const dropdownBase =
    "absolute top-full left-0 mt-0.5 bg-white dark:bg-[#1b1b1b] border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 py-1 font-normal normal-case tracking-normal text-left select-auto";

  const dropdownInputClass =
    "w-full bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 outline-none text-[12px] text-gray-900 dark:text-foreground py-1 px-0 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-0";

  const renderSortIcon = (key: keyof Transaction) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 inline-block text-gray-400 dark:text-gray-500" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline-block text-gray-400 dark:text-gray-500" />
    );
  };

  const renderFilterDropdownSelect = (
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
        {/* Header */}
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Filter
          </span>
          {active.length > 0 && (
            <button
              onClick={() => onFilterSelectChange(col, [])}
              className="text-[11px] text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        {/* Body */}
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
                  onFilterSelectChange(col, next);
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
                  onFilterSelectChange(col, next);
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

  const renderDescriptionDropdown = () => {
    const active = textFilters.description !== "";
    return (
      <div
        ref={filterRef}
        className={`${dropdownBase} w-full`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Filter
          </span>
          {active && (
            <button
              onClick={() => onFilterTextChange("description", "")}
              className="text-[11px] text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        {/* Body */}
        <div className="px-3 py-2">
          <input
            autoFocus
            type="text"
            placeholder="Search description..."
            value={textFilters.description}
            onChange={(e) => onFilterTextChange("description", e.target.value)}
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
        {/* Header */}
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Filter
          </span>
          {active && (
            <button
              onClick={() => {
                onFilterTextChange("dateFrom", "");
                onFilterTextChange("dateTo", "");
              }}
              className="text-[11px] text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
        {/* Body */}
        <div className="px-3 py-2 flex flex-col gap-2">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wider">
              From
            </p>
            <input
              type="date"
              value={textFilters.dateFrom}
              onChange={(e) => onFilterTextChange("dateFrom", e.target.value)}
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
              onChange={(e) => onFilterTextChange("dateTo", e.target.value)}
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
        {/* Header */}
        <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Filter
          </span>
          {active && (
            <button
              onClick={() => {
                onFilterTextChange("amountMin", "");
                onFilterTextChange("amountMax", "");
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
              onChange={(e) => onFilterTextChange("amountMin", e.target.value)}
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
              onChange={(e) => onFilterTextChange("amountMax", e.target.value)}
              className={dropdownInputClass}
            />
          </div>
        </div>
        <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            Sort by abs value
          </span>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onToggleAbsSort()}
            className={`relative w-7 h-4 rounded-full transition-colors ${
              absValue ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0 w-3 h-3 rounded-full bg-white transition-transform ${
                absValue ? "translate-x-3.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <thead className="sticky top-0 bg-white dark:bg-[#131314] z-2">
      <tr>
        {/* Checkbox */}
        <th className={`${thClass} w-8`}>
          {allSelectableIds.length > 0 && (
            <label className="flex items-center justify-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                }}
                onChange={() => {
                  if (isAllSelected) {
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

        {/* Date */}
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
                setOpenFilterCol(openFilterCol === "date" ? null : "date");
              }}
              className={`p-0.5 rounded transition-colors ${textFilters.dateFrom || textFilters.dateTo ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
            >
              <ListFilter className="w-3 h-3" />
            </button>
          </div>
          {openFilterCol === "date" && renderDateRangeDropdown()}
        </th>

        {/* Description */}
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

        {/* Category */}
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
            renderFilterDropdownSelect("category", allCategories, true)}
        </th>

        {/* Amount */}
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
                setOpenFilterCol(openFilterCol === "amount" ? null : "amount");
              }}
              className={`p-0.5 rounded transition-colors ${textFilters.amountMin || textFilters.amountMax || absValue ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
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
                setOpenFilterCol(openFilterCol === "status" ? null : "status");
              }}
              className={`p-0.5 rounded transition-colors ${columnFilters.status.length > 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
            >
              <ListFilter className="w-3 h-3" />
            </button>
          </div>
          {openFilterCol === "status" &&
            renderFilterDropdownSelect("status", STATUSES)}
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
                setOpenFilterCol(openFilterCol === "source" ? null : "source");
              }}
              className={`p-0.5 rounded transition-colors ${columnFilters.source.length > 0 ? "text-blue-500 dark:text-blue-400" : "text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400"}`}
            >
              <ListFilter className="w-3 h-3" />
            </button>
          </div>
          {openFilterCol === "source" &&
            renderFilterDropdownSelect("source", allSources, true)}
        </th>
        <th className={`${thClass} w-14`}>File</th>
        <th className={`${thClass} w-14`} />
      </tr>
    </thead>
  );
};

export default TableHeader;
