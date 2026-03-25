"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Trash } from "lucide-react";
import { Transaction, STATUSES } from "@/types/transaction";

interface BulkActionsProps {
  selectedIds: Set<string>;
  allTransactions: Transaction[];
  onBulkDelete: (ids: string[]) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Transaction>) => void;
  onClearSelection: () => void;
}

type HoveredItem = "category" | "status" | "source" | null;

const BulkActions = ({
  selectedIds,
  allTransactions,
  onBulkDelete,
  onBulkUpdate,
  onClearSelection,
}: BulkActionsProps) => {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<HoveredItem>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ids = [...selectedIds];

  const categorySuggestions = [
    ...new Set(
      allTransactions.map((t) => t.category).filter(Boolean) as string[],
    ),
  ];
  const sourceSuggestions = [
    ...new Set(
      allTransactions
        .map((t) => t.source)
        .filter((s): s is string => s !== null),
    ),
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setHoveredItem(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (selectedIds.size === 0) return null;

  const closeAll = () => {
    setOpen(false);
    setHoveredItem(null);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setOpen(!open);
          setHoveredItem(null);
        }}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
      >
        Actions
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {/* Category */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredItem("category")}
          >
            <button className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between">
              Category
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>

            {hoveredItem === "category" && (
              <div
                className="absolute left-full top-0 ml-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                onMouseEnter={() => setHoveredItem("category")}
              >
                {categorySuggestions.length > 0 ? (
                  categorySuggestions.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        onBulkUpdate(ids, { category: c });
                        closeAll();
                      }}
                      className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {c}
                    </button>
                  ))
                ) : (
                  <span className="px-3 py-1.5 text-[12px] text-gray-400 block">
                    No categories yet
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Status */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredItem("status")}
          >
            <button className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between">
              Status
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>

            {hoveredItem === "status" && (
              <div
                className="absolute left-full top-0 ml-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                onMouseEnter={() => setHoveredItem("status")}
              >
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onBulkUpdate(ids, { status: s });
                      closeAll();
                    }}
                    className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Source */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredItem("source")}
          >
            <button className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between">
              Source
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>

            {hoveredItem === "source" && (
              <div
                className="absolute left-full top-0 ml-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1"
                onMouseEnter={() => setHoveredItem("source")}
              >
                {sourceSuggestions.length > 0 ? (
                  sourceSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        onBulkUpdate(ids, { source: s });
                        closeAll();
                      }}
                      className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))
                ) : (
                  <span className="px-3 py-1.5 text-[12px] text-gray-400 block">
                    No sources yet
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Delete */}
          <div
            className="border-t border-gray-100 my-1"
            onMouseEnter={() => setHoveredItem(null)}
          />
          <button
            onMouseEnter={() => setHoveredItem(null)}
            onClick={() => {
              onBulkDelete(ids);
              closeAll();
            }}
            className="w-full text-left px-3 py-1.5 text-[13px] text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
          >
            <Trash className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkActions;
