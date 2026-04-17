export interface CSVPreset {
  name: string;
  detect: (headers: string[]) => boolean;
  mapRow: (
    row: string[],
    headers: string[],
  ) => { date: string; description: string; amount: number; category: null }[];
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
    const description = row[h.indexOf("description")] ?? "";

    if (description === "CAPITAL ONE AUTOPAY PYMT") return [];

    const dateStr = row[h.indexOf("transaction date")] ?? "";
    const debitStr = row[h.indexOf("debit")] ?? "";
    const creditStr = row[h.indexOf("credit")] ?? "";

    const creditVal = parseFloat(creditStr.replace(/[^0-9.-]+/g, ""));
    const debitVal = parseFloat(debitStr.replace(/[^0-9.-]+/g, ""));
    const amount =
      !isNaN(creditVal) && creditStr.trim() !== ""
        ? creditVal
        : !isNaN(debitVal) && debitStr.trim() !== ""
          ? -debitVal
          : 0;

    // CapOne dates are already YYYY-MM-DD
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ? dateStr
      : new Date().toISOString().split("T")[0];

    return [{ date, description, amount, category: null }];
  },
};

const bankOfAmericaCredit: CSVPreset = {
  name: "Bank of America Credit Card",
  detect: (headers) => {
    const h = headers.map((s) => s.toLowerCase());
    return (
      h.includes("posted date") && h.includes("payee") && h.includes("amount")
    );
  },
  mapRow: (row, headers) => {
    const h = headers.map((s) => s.toLowerCase());
    const description = row[h.indexOf("payee")] ?? "";

    if (description === "PAYMENT - THANK YOU") return [];

    const dateStr = row[h.indexOf("posted date")] ?? "";
    const amountStr = row[h.indexOf("amount")] ?? "";
    const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));

    let date: string;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      date = dateStr;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [m, d, y] = dateStr.split("/");
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else {
      date = new Date().toISOString().split("T")[0];
    }

    return [{ date, description, amount, category: null }];
  },
};

const paypalDebit: CSVPreset = {
  name: "Paypal Debit Card",
  detect: (headers) => {
    const h = headers.map((s) => s.toLowerCase());
    return (
      h.includes("date") &&
      h.includes("name") &&
      h.includes("type") &&
      h.includes("total")
    );
  },
  mapRow: (row, headers) => {
    const h = headers.map((s) => s.toLowerCase());
    const type = row[h.indexOf("type")] ?? "";
    const status = row[h.indexOf("status")] ?? "";
    const validType = [
      "General Authorization",
      "General PayPal Debit Card Transaction",
      "Payment Refund",
    ];

    if (!validType.includes(type) || status != "Completed") return [];

    const dateStr = row[h.indexOf("date")] ?? "";
    const description = row[h.indexOf("name")] ?? "";
    const amountStr = row[h.indexOf("total")] ?? "";
    const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));

    let date: string;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      date = dateStr;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [m, d, y] = dateStr.split("/");
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else {
      date = new Date().toISOString().split("T")[0];
    }

    return [{ date, description, amount, category: null }];
  },
};

const chaseCredit: CSVPreset = {
  name: "Chase Credit Card",
  detect: (headers) => {
    const h = headers.map((s) => s.toLowerCase());
    return (
      h.includes("transaction date") &&
      h.includes("description") &&
      h.includes("type") &&
      h.includes("amount")
    );
  },
  mapRow: (row, headers) => {
    const h = headers.map((s) => s.toLowerCase());
    const type = row[h.indexOf("type")] ?? "";

    if (type === "Payment") return [];

    const dateStr = row[h.indexOf("transaction date")] ?? "";
    const description = row[h.indexOf("description")] ?? "";
    const amountStr = row[h.indexOf("amount")] ?? "";
    const amount = parseFloat(amountStr.replace(/[^0-9.-]+/g, ""));

    let date: string;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      date = dateStr;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const [m, d, y] = dateStr.split("/");
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else {
      date = new Date().toISOString().split("T")[0];
    }

    return [{ date, description, amount, category: null }];
  },
};

export const CSV_PRESETS: CSVPreset[] = [
  capitalOneCredit,
  bankOfAmericaCredit,
  paypalDebit,
  chaseCredit,
];
