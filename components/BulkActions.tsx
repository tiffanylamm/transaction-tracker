"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Trash } from "lucide-react";
import { Transaction, STATUSES } from "@/types/transaction";

interface BulkActionsProps {
  selectedIds: Map<string, Transaction>;
  onBulkDelete: (ids: string[]) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Transaction>) => void;
  onClearSelection: () => void;
  onAddToGroup: (groupId: string) => void;
  allGroups: Transaction[];
  allCategories: string[];
  allSources: string[];
}

type HoveredItem = "category" | "status" | "source" | "group" | null;

const BulkActions = ({
  selectedIds,
  onBulkDelete,
  onBulkUpdate,
  onClearSelection,
  onAddToGroup,
  allGroups,
  allCategories,
  allSources,
}: BulkActionsProps) => {
  const [open, setOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<HoveredItem>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ids = [...selectedIds.keys()];

  const categorySuggestions = allCategories;
  const sourceSuggestions = allSources;

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

  const disabled = selectedIds.size === 0;

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
        className="inline-flex items-center gap-1 px-2.5 h-7 text-[12px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors cursor-pointer"
      >
        Actions
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {/* Group */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredItem("group")}
          >
            <button className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between">
              Group
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>

            {hoveredItem === "group" && (
              <div
                className="absolute left-full top-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto"
                onMouseEnter={() => setHoveredItem("group")}
              >
                {allGroups.length > 0 ? (
                  allGroups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => {
                        if (disabled) return;
                        onAddToGroup(g.id);
                        closeAll();
                      }}
                      className="w-full text-left px-3 py-1.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors truncate"
                    >
                      {g.description}
                    </button>
                  ))
                ) : (
                  <span className="px-3 py-1.5 text-[12px] text-gray-400 block">
                    No groups yet
                  </span>
                )}
              </div>
            )}
          </div>

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
                className="absolute left-full top-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto"
                onMouseEnter={() => setHoveredItem("category")}
              >
                {categorySuggestions.length > 0 ? (
                  categorySuggestions.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        if (disabled) return;
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
                      if (disabled) return;
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
                className="absolute left-full top-0 ml-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto"
                onMouseEnter={() => setHoveredItem("source")}
              >
                {sourceSuggestions.length > 0 ? (
                  sourceSuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        if (disabled) return;
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
              if (disabled) return;
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
