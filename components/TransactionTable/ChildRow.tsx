import React from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Paperclip,
  Unlink,
} from "lucide-react";
import { Transaction, Status, STATUSES } from "@/types/transaction";
import { EditableField } from "@/hooks/useEditingCell";
import { formatDate, formatAmount } from "@/lib/formatters";
import DriveFileCell from "./DriveFileCell";
import StatusBadge from "../StatusBadge";
interface ChildRowProps {
  child: Transaction;
  allTransactions: Transaction[];
  siblings: Transaction[];
  isSelected: boolean;
  isExpanded: boolean;
  selectedIds: Map<string, Transaction>;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (tx: Transaction) => void;
  onSelectAll: (txs: Transaction[]) => void;
  onUnlinkChild: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onContextMenu: (e: React.MouseEvent, tx: Transaction) => void;
  uploadingIds: Set<string>;
  onAttach: (tx: Transaction) => void;
  shiftKeyRef: React.RefObject<boolean>;
  lastClickedIdRef: React.RefObject<string | null>;
  // Editing — passed from useEditingCell in parent
  editingCell: { id: string; field: EditableField } | null;
  editValue: string;
  inputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
  isEditing: (id: string, field: EditableField) => boolean;
  startEditing: (
    id: string,
    field: EditableField,
    currentValue: string | number,
    isGroupRow: boolean,
  ) => void;
  commitEdit: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setEditValue: React.Dispatch<React.SetStateAction<string>>;
  setEditingCell: React.Dispatch<
    React.SetStateAction<{ id: string; field: EditableField } | null>
  >;
}

const ChildRow = ({
  child,
  allTransactions,
  siblings,
  isSelected,
  isExpanded,
  selectedIds,
  expandedIds,
  onToggleExpand,
  onToggleSelect,
  onSelectAll,
  onUnlinkChild,
  onUpdate,
  onContextMenu,
  uploadingIds,
  onAttach,
  shiftKeyRef,
  lastClickedIdRef,
  editingCell,
  editValue,
  inputRef,
  isEditing,
  startEditing,
  commitEdit,
  handleKeyDown,
  setEditValue,
  setEditingCell,
}: ChildRowProps) => {
  const tdClass = `h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 whitespace-nowrap`;
  const editInputClass = `w-full bg-transparent border-0 outline-none text-[13px] text-gray-900 dark:text-foreground p-0 m-0 focus:ring-0 caret-gray-400 dark:caret-gray-500`;

  const grandchildren = child.isGroup
    ? allTransactions.filter((gc) => gc.parentId === child.id)
    : [];

  return (
    <React.Fragment key={child.id}>
      <tr
        className={`group transition-colors ${
          isSelected
            ? "bg-blue-50/60 hover:bg-gray-50 dark:bg-[#282828] dark:hover:bg-[#424242]"
            : "hover:bg-gray-50/70 dark:hover:bg-[#424242]"
        }`}
        onContextMenu={(e) => onContextMenu(e, child)}
      >
        {/* Checkbox */}
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
                if (shiftKeyRef.current && lastClickedIdRef.current !== null) {
                  const lastIdx = siblings.findIndex(
                    (c) => c.id === lastClickedIdRef.current,
                  );
                  const currIdx = siblings.findIndex((c) => c.id === child.id);
                  if (lastIdx !== -1) {
                    const from = Math.min(lastIdx, currIdx);
                    const to = Math.max(lastIdx, currIdx);
                    onSelectAll(siblings.slice(from, to + 1));
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
                className={editInputClass}
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
              className={editInputClass}
            />
          ) : (
            <span className="flex items-center justify-between gap-1.5 cursor-text py-px min-w-0">
              <span className="uppercase truncate block">
                {child.description}
              </span>
              {child.isGroup && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(child.id);
                  }}
                  className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-foreground transition-colors shrink-0"
                  aria-label={isExpanded ? "Collapse group" : "Expand group"}
                >
                  {isExpanded ? (
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
              className={editInputClass}
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
            startEditing(child.id, "source", child.source ?? "", child.isGroup)
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
                onClick={() => onAttach(child)}
                className="p-0.5 text-gray-300 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                aria-label="Upload file to Drive"
                title="Upload file to Google Drive"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
            ))}
        </td>

        {/* Unlink */}
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

      {/* Recursively render nested children if this child is itself an expanded group */}
      {child.isGroup &&
        isExpanded &&
        grandchildren.map((gc) => (
          <ChildRow
            key={gc.id}
            child={gc}
            allTransactions={allTransactions}
            siblings={grandchildren}
            isSelected={selectedIds.has(gc.id)}
            isExpanded={expandedIds.has(gc.id)}
            selectedIds={selectedIds}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onUnlinkChild={onUnlinkChild}
            onUpdate={onUpdate}
            onContextMenu={onContextMenu}
            uploadingIds={uploadingIds}
            onAttach={onAttach}
            shiftKeyRef={shiftKeyRef}
            lastClickedIdRef={lastClickedIdRef}
            editingCell={editingCell}
            editValue={editValue}
            inputRef={inputRef}
            isEditing={isEditing}
            startEditing={startEditing}
            commitEdit={commitEdit}
            handleKeyDown={handleKeyDown}
            setEditValue={setEditValue}
            setEditingCell={setEditingCell}
          />
        ))}
    </React.Fragment>
  );
};

export default ChildRow;
