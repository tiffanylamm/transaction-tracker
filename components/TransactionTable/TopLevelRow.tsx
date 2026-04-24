import React from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Paperclip,
  Trash,
} from "lucide-react";
import { Transaction, Status, STATUSES } from "@/types/transaction";
import { EditableField } from "@/hooks/useEditingCell";
import { formatDate, formatAmount } from "@/lib/formatters";
import DriveFileCell from "./DriveFileCell";
import StatusBadge from "../StatusBadge";

interface TopLevelRowProps {
  tx: Transaction;
  isExpanded: boolean;
  isSelected: boolean;
  isFiltered: boolean;
  filteredTotal: number;
  filteredChildCount: number;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (tx: Transaction) => void;
  onSelectAll: (txs: Transaction[]) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onContextMenu: (e: React.MouseEvent, tx: Transaction) => void;
  uploadingIds: Set<string>;
  onAttach: (tx: Transaction) => void;
  shiftKeyRef: React.RefObject<boolean>;
  lastClickedIdRef: React.RefObject<string | null>;
  transactions: Transaction[];
  allTransactions: Transaction[];
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

const TopLevelRow = ({
  tx,
  isExpanded,
  isSelected,
  isFiltered,
  filteredTotal,
  filteredChildCount,
  onToggleExpand,
  onToggleSelect,
  onSelectAll,
  onDelete,
  onUpdate,
  onContextMenu,
  uploadingIds,
  onAttach,
  shiftKeyRef,
  lastClickedIdRef,
  transactions,
  allTransactions,
  editingCell,
  editValue,
  inputRef,
  isEditing,
  startEditing,
  commitEdit,
  handleKeyDown,
  setEditValue,
  setEditingCell,
}: TopLevelRowProps) => {
  const tdClass = `h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 whitespace-nowrap`;
  const editInputClass = `w-full bg-transparent border-0 outline-none text-[13px] text-gray-900 dark:text-foreground p-0 m-0 focus:ring-0 caret-gray-400 dark:caret-gray-500`;

  return (
    <tr
      className={`group transition-colors ${
        isSelected
          ? "bg-blue-50/60 hover:bg-gray-50 dark:bg-[#282828] dark:hover:bg-[#424242]"
          : "hover:bg-gray-50 dark:hover:bg-[#424242]"
      }`}
      onContextMenu={(e) => onContextMenu(e, tx)}
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
                const lastIdx = transactions.findIndex(
                  (t) => t.id === lastClickedIdRef.current,
                );
                const currIdx = transactions.findIndex((t) => t.id === tx.id);
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
        className={`${tdClass} ${tx.isGroup ? "cursor-not-allowed" : "cursor-text"}`}
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
          <span className="block py-px">{formatDate(tx.date)}</span>
        )}
      </td>

      {/* Description */}
      <td
        className={`h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 whitespace-nowrap text-gray-900 dark:text-foreground font-medium cursor-text`}
        onClick={() =>
          !isEditing(tx.id, "description") &&
          startEditing(tx.id, "description", tx.description, tx.isGroup)
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
            <span className="uppercase truncate">{tx.description}</span>
            <div className="flex items-center gap-2">
              {tx.isGroup &&
                tx.childCount !== undefined &&
                isFiltered &&
                isExpanded && (
                  <span className="text-gray-400 dark:text-gray-500 text-[11px] font-normal">
                    {filteredChildCount}/{tx.childCount}{" "}
                    {tx.childCount === 1 ? "Txn" : "Txns"}
                  </span>
                )}
              {tx.isGroup && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleExpand(tx.id);
                  }}
                  className="px-1 py-1 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-foreground transition-colors shrink-0 cursor-pointer"
                  aria-label={isExpanded ? "Collapse group" : "Expand group"}
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
        className={`${tdClass} cursor-text`}
        onClick={() =>
          !isEditing(tx.id, "category") &&
          startEditing(tx.id, "category", tx.category ?? "", tx.isGroup)
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
          <span className="block py-px">{tx.category ?? ""}</span>
        )}
      </td>

      {/* Amount */}
      <td
        className={`h-9 px-4 text-[13px] border-b border-r border-gray-100 dark:border-gray-800 whitespace-nowrap text-gray-900 dark:text-foreground font-medium text-right ${tx.isGroup ? "cursor-not-allowed" : "cursor-text"}`}
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
        className={`${tdClass} ${tx.isGroup ? "cursor-not-allowed" : "cursor-pointer"}`}
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
              onUpdate(tx.id, { status: e.target.value as Status });
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
        className={`${tdClass} ${tx.isGroup ? "cursor-not-allowed" : "cursor-text"}`}
        onClick={() =>
          !isEditing(tx.id, "source") &&
          startEditing(tx.id, "source", tx.source ?? "", tx.isGroup)
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
              onUnlink={() => onUpdate(tx.id, { driveFileId: null })}
            />
          ) : (
            <button
              onClick={() => onAttach(tx)}
              className="p-0.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
              aria-label="Upload file to Drive"
              title="Upload file to Google Drive"
            >
              <Paperclip className="w-4 h-4" />
            </button>
          ))}
      </td>

      {/* Delete */}
      <td className={tdClass}>
        <button
          aria-label={tx.isGroup ? "Delete group" : `Delete ${tx.description}`}
          title={
            tx.isGroup ? "Delete group and all its transactions" : "Delete"
          }
          className="p-1 text-gray-400 hover:text-rose-600 dark:text-gray-500 dark:hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
          onClick={() => onDelete(tx.id)}
        >
          <Trash className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

export default TopLevelRow;
