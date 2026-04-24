import { useEffect, useRef, useState } from "react";
import { Transaction, Status } from "@/types/transaction";

export type EditableField =
  | "date"
  | "description"
  | "category"
  | "amount"
  | "status"
  | "source";

interface EditingCell {
  id: string;
  field: EditableField;
}

interface useEditingCellOptions {
  allTransactions: Transaction[];
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

interface useEditingCellReturn {
  editingCell: EditingCell | null;
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
  setEditingCell: React.Dispatch<React.SetStateAction<EditingCell | null>>;
}

const LOCKED_GROUP_FIELDS = new Set<EditableField>([
  "date",
  "amount",
  "status",
  "source",
]);

const useEditingCell = ({
  allTransactions,
  onUpdate,
}: useEditingCellOptions): useEditingCellReturn => {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  //focus and select text when a new cell enters edit mode
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

  const isEditing = (id: string, field: EditableField) =>
    editingCell?.id === id && editingCell?.field === field;

  const startEditing = (
    id: string,
    field: EditableField,
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
      if (!isNaN(parsed) && parsed !== Number(tx?.amount)) {
        onUpdate(id, { amount: parsed });
      }
    } else if (field === "date") {
      if (editValue && editValue !== tx?.date) {
        onUpdate(id, { date: editValue });
      }
    } else if (field === "description") {
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== tx?.description) {
        onUpdate(id, { description: trimmed });
      }
    } else if (field === "category") {
      const val = editValue.trim() || null;
      if (val !== (tx?.category ?? null)) {
        onUpdate(id, { category: val });
      }
    } else if (field === "source") {
      const val = editValue.trim() || null;
      if (val !== (tx?.source ?? null)) {
        onUpdate(id, { source: val });
      }
    } else if (field === "status") {
      if (editValue !== tx?.status) {
        onUpdate(id, { status: editValue as Status });
      }
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

  return {
    editingCell,
    editValue,
    inputRef,
    isEditing,
    startEditing,
    commitEdit,
    handleKeyDown,
    setEditValue,
    setEditingCell,
  };
};

export default useEditingCell;
