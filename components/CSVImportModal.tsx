import React, { useRef, useState, useEffect } from "react";
import { Transaction, Category, Status } from "@/types/transaction";
import { Upload, X } from "lucide-react";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Omit<Transaction, "id" | "createdAt">[]) => void;
}

interface CSVData {
  headers: string[];
  previewRows: string[][];
  allRows: string[][];
}

const FIELDS = [
  {
    key: "date",
    label: "Date",
    // bgColor: "bg-blue-50",
    // ringColor: "ring-blue-500",
    // borderColor: "border-blue-500",
    // textColor: "text-blue-700",
  },
  {
    key: "description",
    label: "Description",
    // bgColor: "bg-blue-50",
    // ringColor: "ring-blue-500",
    // borderColor: "border-blue-500",
    // textColor: "text-blue-700",
  },
  {
    key: "amount",
    label: "Amount",
    bgColor: "bg-blue-50",
    // ringColor: "ring-blue-500",
    // borderColor: "border-blue-500",
    // textColor: "text-blue-700",
  },
] as const;

const FIELD_STYLES: Record<
  string,
  {
    bg: string;
    text: string;
    ring: string;
    border: string;
    hover: string;
    // pill: string;
  }
> = {
  date: {
    bg: "bg-blue-50",
    ring: "ring-blue-500",
    border: "border-blue-500",
    text: "text-blue-700",
    hover: "hover:bg-blue-50 hover:text-blue-700",
    // pill: "bg-blue-200/80 text-blue-700",
  },
  description: {
    bg: "bg-purple-50",
    ring: "ring-purple-500",
    border: "border-purple-500",
    text: "text-purple-700",
    hover: "hover:bg-purple-50 hover:text-purple-700",
    // pill: "bg-blue-200/80 text-blue-700",
  },
  amount: {
    bg: "bg-pink-50",
    ring: "ring-pink-500",
    border: "border-pink-500",
    text: "text-pink-700",
    hover: "hover:bg-pink-50 hover:text-pink-700",
    // pill: "bg-blue-200/80 text-blue-700",
  },
};

type FieldKey = (typeof FIELDS)[number]["key"];
//type FieldKey = "date" | "description" | "amount"; value of above
const SIGNAL_WORDS = [
  "date",
  "amount",
  "description",
  "balance",
  "memo",
  "payee",
  "debit",
  "credit",
  "posted",
  "transaction",
];

const CSVImportModal = ({ isOpen, onClose, onImport }: CSVImportModalProps) => {
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [pendingField, setPendingField] = useState<FieldKey | null>(null);
  const [headerIdx, setHeaderIdx] = useState<number>(0);
  const [detectedIdx, setDetectedIdx] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  //reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCsvData(null);
        setMapping({});
        setPendingField(null);
        setHeaderIdx(0);
        setDetectedIdx(0);
        if (fileRef.current) fileRef.current.value = ""; //get rid of uploaded file
      }, 200); //wait for transition
    }
  }, [isOpen]);

  const findHeaderRowIndex = (text: string) => {
    const lines = text.trim().split(/\r?\n/);
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const lower = lines[i].toLowerCase();
      const hits = SIGNAL_WORDS.filter((w) => lower.includes(w));
      const cellCount = lines[i].split(",").length;
      if (hits.length >= 2 && cellCount >= 2) return i;
    }
    return 0;
  };

  const parseCSV = (text: string, headerIdx: number) => {
    const lines = text.trim().split(/\r?\n/); //split on linebreak
    if (lines.length < headerIdx + 2) return null;
    const headers = lines[headerIdx] //assumes header = line 0 fix this later
      .split(",")
      .map((h) => h.replace(/^"|"$/g, "").trim());
    const parseLine = (line: string) => {
      const cols: string[] = [];
      let cur = "",
        inQuotes = false;
      for (const ch of line) {
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          cols.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      cols.push(cur.trim());
      return headers.map((_, i) => cols[i]?.replace(/^"|"$/g, "") ?? "");
    };
    const allRows = lines
      .slice(headerIdx + 1)
      .filter((l) => l.trim().length > 0)
      .map(parseLine);
    const previewRows = allRows.slice(0, 5);
    return {
      headers,
      previewRows,
      allRows,
    };
  };

  //   const nudgeHeader = (text: string, delta: number) => {
  //     const next = Math.max(
  //       0,
  //       Math.min(csvData?.allRows.length - 2, headerIdx + delta),
  //     );
  //     setHeaderIdx(next);
  //     const parsed = parseCSV(text, headerIdx);
  //     if (parsed) {
  //       setCsvData(parsed);
  //     }
  //   };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("file input changed");
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text, findHeaderRowIndex(text));
      if (parsed) {
        setCsvData(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleColumnClick = (header: string) => {
    if (!pendingField) return;
    //remove header form any other field it is mapped to
    const newMapping = Object.fromEntries(
      Object.entries(mapping).filter(([_, v]) => v != header),
    ) as Partial<Record<FieldKey, string>>;
    newMapping[pendingField] = header;
    setMapping(newMapping);
    setPendingField(null);
  };

  const handleConfirm = () => {
    if (!csvData) return;
    const newTransactions = csvData.allRows.map((row) => {
      const dateStr =
        row[csvData.headers.indexOf(mapping.date as string)] || "";
      const descriptionStr =
        row[csvData.headers.indexOf(mapping.description as string)] || "";
      const amountStr =
        row[csvData.headers.indexOf(mapping.amount as string)] || "";

      //clean amount: remove currency symbols, commas, ect
      const cleanAmount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));

      //clean date: format as YYYY-MM-DD
      let cleanDate = new Date().toISOString().split("T")[0];
      try {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          cleanDate = parsedDate.toISOString().split("T")[0];
        }
      } catch (e) {
        //set as today if parsing fails
      }
      return {
        date: cleanDate,
        description: descriptionStr,
        category: "Other" as Category,
        amount: isNaN(cleanAmount) ? 0 : cleanAmount,
        status: "Completed" as Status,
        isSelected: false
      };
    });
    onImport(newTransactions);
    onClose();
  };
  if (!isOpen) return null;
  const allMapped = FIELDS.every((f) => mapping[f.key]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/*Backdrop for modal */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/*Modal content */}
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {!csvData ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            {/*Close Button */}
            <div className="flex justify-end w-full mb-4">
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/*Upload Container */}
            <div className="border-2 w-full max-w-md p-12 border-dashed border-gray-200 rounded-lg bg-gray-50/50 flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-3" />
              <h3 className="text-[14px] font-medium text-gray-900 mb-1">
                Upload CSV
              </h3>
              <p className="text-[13px] text-gray-500 mb-6">
                Select a CSV file to import transactions
              </p>
              <button
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[13px] font-medium rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                onClick={() => fileRef.current?.click()}
              >
                Select File
              </button>
              <input
                type="file"
                ref={fileRef}
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <>
            {/*Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-white">
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 tracking-tight">
                  Map Columns
                </h2>
                <p className="text-[13px] text-gray-500 mt-0.5">
                  Click a field below, then click the matching column header in
                  the table preview.
                </p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/*Field Pills */}
            <div className="px-6 py-4 flex gap-2 flex-wrap">
              {FIELDS.map((f) => {
                const isMapped = !!mapping[f.key];
                const isPending = pendingField === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setPendingField(isPending ? null : f.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${isPending ? `${FIELD_STYLES[f.key].bg} ${FIELD_STYLES[f.key].text} ring-1 ${FIELD_STYLES[f.key].ring} shadow-sm` : isMapped ? `${FIELD_STYLES[f.key].bg} ${FIELD_STYLES[f.key].text} border ${FIELD_STYLES[f.key].border}` : "bg-white text-gray-500 border border-gray-200 border-dashed hover:border-gray-300 hover:text-gray-700"}`}
                  >
                    {f.label}
                    {isMapped && !isPending && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="font-normal text-gray-500 truncate max-w-30">
                          {mapping[f.key]}
                        </span>
                        <X
                          className="w-3 h-3 ml-0.5 text-gray-400 hover:text-gray-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newMap = { ...mapping };
                            delete newMap[f.key];
                            setMapping(newMap);
                          }}
                        />
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto border-t border-b border-gray-100 flex-1 min-h-50">
              <div className="px-6 py-2 bg-gray-50/80 border-b border-gray-100 flex items-center">
                <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">
                  Preview · {csvData.previewRows.length} rows
                </span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    {csvData.headers.map((header) => {
                      const mappedField = Object.entries(mapping).find(
                        ([_, v]) => v === header,
                      )?.[0];
                      const fieldLabel = FIELDS.find(
                        (f) => f.key === mappedField,
                      )?.label;
                      const fieldKey = FIELDS.find(
                        (f) => f.key === mappedField,
                      )?.key;
                      const isClickable = !!pendingField;
                      return (
                        <th
                          key={header}
                          onClick={() =>
                            isClickable && handleColumnClick(header)
                          }
                          className={`py-3 px-4 font-normal text-[11px] uppercase tracking-wider border-b border-gray-200 select-none transition-colors whitespace-nowrap ${isClickable ? `cursor-pointer ${FIELD_STYLES[pendingField].hover}` : ""} ${mappedField ? "bg-gray-50 text-gray-900" : "text-gray-500"}`}
                        >
                          <div className="flex items-center gap-2">
                            {header}
                            {fieldLabel && fieldKey && (
                              <span
                                className={`px-1.5 py-0.5 ${FIELD_STYLES[fieldKey].text} ${FIELD_STYLES[fieldKey].bg}  rounded text-[9px] font-semibold tracking-wide`}
                              >
                                {fieldLabel}
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {csvData.previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {row.map((cell, j) => {
                        const header = csvData.headers[j];
                        const mappedKey = Object.entries(mapping).find(
                          ([_, v]) => v === header,
                        )?.[0];
                        return (
                          <td
                            key={j}
                            className={`py-2.5 px-4 text-[13px] border-b border-gray-50 whitespace-nowrap max-w-50 truncate ${mappedKey ? `text-gray-900 bg-blue-50 ${FIELD_STYLES[mappedKey].bg}` : "text-gray-400"}`}
                          >
                            {cell || <span className="text-gray-300">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center mt-auto">
              <span className="text-[13px] text-gray-500">
                {Object.keys(mapping).length} of {FIELDS.length} fields mapped
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!allMapped}
                  className={`px-4 py-2 text-[13px] font-medium rounded-md transition-colors shadow-sm ${allMapped ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
                >
                  Import Transactions
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CSVImportModal;
