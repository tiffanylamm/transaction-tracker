export interface CSVPreset {
  name: string;
  detect: (headers: string[]) => boolean;
  mapRow: (row: string[], headers: string[]) => {
    date: string;
    description: string;
    amount: number;
    category: null;
  };
}

const capitalOneCredit: CSVPreset = {
  name: "Capital One Credit Card",
  detect: (headers) => {
    const h = headers.map((s) => s.toLowerCase());
    return (
      h.includes("transaction date") &&
      h.includes("description") &&
      h.includes("debit") &&
      h.includes("credit")
    );
  },
  mapRow: (row, headers) => {
    const h = headers.map((s) => s.toLowerCase());
    const dateStr = row[h.indexOf("transaction date")] ?? "";
    const description = row[h.indexOf("description")] ?? "";
    const debitStr = row[h.indexOf("debit")] ?? "";
    const creditStr = row[h.indexOf("credit")] ?? "";

    const creditVal = parseFloat(creditStr.replace(/[^0-9.-]+/g, ""));
    const debitVal = parseFloat(debitStr.replace(/[^0-9.-]+/g, ""));
    const amount = !isNaN(creditVal) && creditStr.trim() !== ""
      ? creditVal
      : !isNaN(debitVal) && debitStr.trim() !== ""
      ? -debitVal
      : 0;

    // CapOne dates are already YYYY-MM-DD
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : new Date().toISOString().split("T")[0];

    return { date, description, amount, category: null };
  },
};

export const CSV_PRESETS: CSVPreset[] = [capitalOneCredit];
