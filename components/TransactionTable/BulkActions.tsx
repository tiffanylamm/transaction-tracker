"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, ChevronLeft, Trash } from "lucide-react";
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
  const [groupNavStack, setGroupNavStack] = useState<(string | null)[]>([null]);
  const containerRef = useRef<HTMLDivElement>(null);

  const ids = [...selectedIds.keys()];
  const nonGroupIds = [...selectedIds.values()]
    .filter((tx) => !tx.isGroup)
    .map((tx) => tx.id);

  const categorySuggestions = allCategories;
  const sourceSuggestions = allSources;

  const currentParentId = groupNavStack[groupNavStack.length - 1];
  const visibleGroups = allGroups.filter((g) => g.parentId === currentParentId);
  const groupIdsWithChildren = new Set(
    allGroups.map((g) => g.parentId).filter(Boolean),
  );

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
    setGroupNavStack([null]);
  };

  const actionsDropdownItem =
    "w-full text-left pl-2 pr-1 py-1.5 text-[13px] text-gray-900 dark:text-foreground rounded hover:bg-gray-50 dark:hover:bg-[#424242] transition-colors flex items-center justify-between";
  const actionsDropdownHover =
    "px-1 absolute left-full top-0 ml-1 w-48 bg-white dark:bg-[#1b1b1b] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1 max-h-48 overflow-y-auto";
  const actionsDropdownItemHoverItem =
     "w-full text-left pl-2 pr-1 py-1.5 text-[13px] text-gray-900 dark:text-foreground rounded hover:bg-gray-50 dark:hover:bg-[#424242] transition-colors";

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          setOpen(!open);
          setHoveredItem(null);
        }}
        className="inline-flex items-center gap-1 px-2.5 h-7 text-[12px] font-medium text-gray-900 hover:bg-gray-100 dark:text-foreground dark:hover:bg-[#424242] rounded transition-colors cursor-pointer"
      >
        Actions
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 px-1 w-44 bg-white dark:bg-[#1b1b1b] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
          {/* Group */}
          <div
            className="relative"
            onMouseEnter={() => setHoveredItem("group")}
          >
            <button className={actionsDropdownItem}>
              Group
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>

            {hoveredItem === "group" && (
              <div
                className={actionsDropdownHover}
                onMouseEnter={() => setHoveredItem("group")}
              >
                {/* Back Button */}
                {groupNavStack.length > 1 && (
                  <button
                    className={`${actionsDropdownItemHoverItem} flex items-center gap-1 text-gray-400 dark:text-gray-500`}
                    onClick={() =>
                      setGroupNavStack((prev) => prev.slice(0, -1))
                    }
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Back
                  </button>
                )}
                {/* Items */}
                {visibleGroups.length > 0 ? (
                  visibleGroups.map((g) => {
                    const hasChildren = groupIdsWithChildren.has(g.id);
                    return (
                      <div
                        key={g.id}
                        className={`${actionsDropdownItemHoverItem} flex items-center`}
                      >
                        <button
                          onClick={() => {
                            if (disabled) return;
                            onAddToGroup(g.id);
                            closeAll();
                          }}
                          className={`uppercase flex-1 text-left`}
                        >
                          {g.description}
                        </button>
                        {hasChildren && (
                          <button
                            onClick={() =>
                              setGroupNavStack((prev) => [...prev, g.id])
                            }
                            className="group px-1.5 py-1.5 rounded transition-colors shrink-0 cursor-pointer"
                          >
                            <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-500 dark:group-hover:text-foreground group-hover:text-gray-900" />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span className="px-3 py-1.5 text-[12px] text-gray-400 dark:text-gray-500 block">
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
            <button className={actionsDropdownItem}>
              Category
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>

            {hoveredItem === "category" && (
              <div
                className={actionsDropdownHover}
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
                      className={actionsDropdownItemHoverItem}
                    >
                      {c}
                    </button>
                  ))
                ) : (
                  <span className="px-3 py-1.5 text-[12px] text-gray-400 dark:text-gray-500 block">
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
            <button className={actionsDropdownItem}>
              Status
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>

            {hoveredItem === "status" && (
              <div
                className={actionsDropdownHover}
                onMouseEnter={() => setHoveredItem("status")}
              >
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      if (disabled) return;
                      onBulkUpdate(nonGroupIds, { status: s });
                      closeAll();
                    }}
                    className={actionsDropdownItemHoverItem}
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
            <button className={actionsDropdownItem}>
              Source
              <ChevronRight className="w-3 h-3 text-gray-400" />
            </button>

            {hoveredItem === "source" && (
              <div
                className={actionsDropdownHover}
                onMouseEnter={() => setHoveredItem("source")}
              >
                {sourceSuggestions.length > 0 ? (
                  sourceSuggestions
                    .filter((source) => source !== "Mixed")
                    .map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          if (disabled) return;
                          onBulkUpdate(nonGroupIds, { source: s });
                          closeAll();
                        }}
                        className={actionsDropdownItemHoverItem}
                      >
                        {s}
                      </button>
                    ))
                ) : (
                  <span className="px-3 py-1.5 text-[12px] text-gray-400 dark:text-gray-500 block">
                    No sources yet
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Delete */}
          <div
            className="border-t border-gray-100 dark:border-gray-800 my-1"
            onMouseEnter={() => setHoveredItem(null)}
          />
          <button
            onMouseEnter={() => setHoveredItem(null)}
            onClick={() => {
              if (disabled) return;
              onBulkDelete(ids);
              closeAll();
            }}
            className="rounded w-full text-left px-2 py-1.5 text-[13px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors flex items-center gap-2"
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
