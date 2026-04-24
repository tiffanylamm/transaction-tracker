"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronLeft, Trash, Layers, X } from "lucide-react";
import { Transaction, STATUSES } from "@/types/transaction";

interface ContextMenuProps {
  position: { x: number; y: number };
  onClose: () => void;
  selectedIds: Map<string, Transaction>;
  onBulkDelete: (ids: string[]) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Transaction>) => void;
  onClearSelection: () => void;
  onAddToGroup: (groupId: string) => void;
  onCreateGroup: () => void;
  allGroups: Transaction[];
  allCategories: string[];
  allSources: string[];
}

type HoveredItem = "category" | "status" | "source" | "group" | null;

const ContextMenu = ({
  position,
  onClose,
  selectedIds,
  onBulkDelete,
  onBulkUpdate,
  onClearSelection,
  onAddToGroup,
  onCreateGroup,
  allGroups,
  allCategories,
  allSources,
}: ContextMenuProps) => {
  const [hoveredItem, setHoveredItem] = useState<HoveredItem>(null);
  const [groupNavStack, setGroupNavStack] = useState<(string | null)[]>([null]);
  const menuRef = useRef<HTMLDivElement>(null);

  const ids = [...selectedIds.keys()];

  const nonGroupIds = [...selectedIds.values()]
    .filter((tx) => !tx.isGroup)
    .map((tx) => tx.id);

  const currentParentId = groupNavStack[groupNavStack.length - 1];
  const visibleGroups = allGroups.filter((g) => g.parentId === currentParentId);
  const groupIdsWithChildren = new Set(
    allGroups.map((g) => g.parentId).filter(Boolean),
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const closeAll = () => {
    onClose();
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
    <div
      ref={menuRef}
      style={{ position: "fixed", top: position.y, left: position.x }}
      className="px-1 w-44 bg-white dark:bg-[#1b1b1b] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1"
    >
      {/* Create Group */}
      <div
        className="border-b border-gray-100 dark:border-gray-800 my-1"
        onMouseEnter={() => setHoveredItem(null)}
      >
        <button
          onMouseEnter={() => setHoveredItem(null)}
          onClick={() => {
            onCreateGroup();
            closeAll();
          }}
          className={`${actionsDropdownItem} my-1 flex items-center justify-start gap-2`}
        >
          <Layers className="w-3.5 h-3.5" />
          Create Group
        </button>
      </div>
      {/* Group */}
      <div className="relative" onMouseEnter={() => setHoveredItem("group")}>
        <button className={actionsDropdownItem}>
          Group
          <ChevronRight className="w-3 h-3 text-gray-400" />
        </button>

        {hoveredItem === "group" && (
          <div
            className={actionsDropdownHover}
            onMouseEnter={() => setHoveredItem("group")}
          >
            {groupNavStack.length > 1 && (
              <button
                className={`${actionsDropdownItemHoverItem} flex items-center gap-1 text-gray-400 dark:text-gray-500`}
                onClick={() => setGroupNavStack((prev) => prev.slice(0, -1))}
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}
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
                        onAddToGroup(g.id);
                        closeAll();
                      }}
                      className="uppercase flex-1 text-left"
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
      <div className="relative" onMouseEnter={() => setHoveredItem("category")}>
        <button className={actionsDropdownItem}>
          Category
          <ChevronRight className="w-3 h-3 text-gray-400" />
        </button>

        {hoveredItem === "category" && (
          <div
            className={actionsDropdownHover}
            onMouseEnter={() => setHoveredItem("category")}
          >
            {allCategories.length > 0 ? (
              allCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
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
      <div className="relative" onMouseEnter={() => setHoveredItem("status")}>
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
      <div className="relative" onMouseEnter={() => setHoveredItem("source")}>
        <button className={actionsDropdownItem}>
          Source
          <ChevronRight className="w-3 h-3 text-gray-400" />
        </button>

        {hoveredItem === "source" && (
          <div
            className={actionsDropdownHover}
            onMouseEnter={() => setHoveredItem("source")}
          >
            {allSources.length > 0 ? (
              allSources
                .filter((source) => source !== "Mixed")
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => {
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
      {/*Clear Selected */}
      <div
        className="border-t border-gray-100 dark:border-gray-800 my-1"
        onMouseEnter={() => setHoveredItem(null)}
      >
        <button
          onMouseEnter={() => setHoveredItem(null)}
          onClick={() => {
            onClearSelection();
            closeAll();
          }}
          className={`${actionsDropdownItem} flex items-center justify-start gap-2 mt-1`}
        >
          <X className="w-3.5 h-3.5" />
          Clear Selected
        </button>
      </div>

      {/* Delete */}
      <div
        className="border-t border-gray-100 dark:border-gray-800 my-1"
        onMouseEnter={() => setHoveredItem(null)}
      />
      <button
        onMouseEnter={() => setHoveredItem(null)}
        onClick={() => {
          onBulkDelete(ids);
          closeAll();
        }}
        className="rounded w-full text-left px-2 py-1.5 text-[13px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors flex items-center gap-2"
      >
        <Trash className="w-3.5 h-3.5" />
        Delete
      </button>
    </div>
  );
};

export default ContextMenu;
