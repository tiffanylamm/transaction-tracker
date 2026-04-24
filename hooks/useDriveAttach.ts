import { useEffect, useRef, useState } from "react";
import { Transaction } from "@/types/transaction";

type AttachableTx = Pick<
  Transaction,
  "id" | "date" | "category" | "description"
>;

interface useDriveAttachOptions {
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
}

interface useDriveAttachReturn {
  driveConnected: boolean | null;
  uploadingIds: Set<string>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAttach: (tx: AttachableTx) => void;
  handleFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

const buildReceiptName = (
  tx: { date: string; category: string | null; description: string },
  ext: string,
): string => {
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
};

const useDriveAttach = ({
  onUpdate,
}: useDriveAttachOptions): useDriveAttachReturn => {
  const [driveConnected, setDriveConnected] = useState<boolean | null>(null);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachingTxIdRef = useRef<AttachableTx | null>(null);

  useEffect(() => {
    fetch("/api/drive/token").then((r) => setDriveConnected(r.ok));
  }, []);

  const handleAttach = (tx: AttachableTx) => {
    if (!driveConnected) {
      alert(
        "Google Drive is not connected. Go to Settings → Integrations → Connect.",
      );
      return;
    }
    attachingTxIdRef.current = tx;
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

  return {
    driveConnected,
    uploadingIds,
    fileInputRef,
    handleAttach,
    handleFileSelected,
  };
};

export default useDriveAttach;
