/**
 * A report as data, independent of its file format. Builders fill it from backend records; renderers turn it into
 * PDF, CSV or Excel. Money is carried in minor units with the currency, and formatted only when rendered.
 */
export type CellType = "text" | "number" | "money" | "percent" | "date";
export type Cell = string | number | null;

export interface ReportColumn {
  key: string;
  label: string;
  type: CellType;
  /** Decimal places for numbers and percentages (default 0 for numbers, 1 for percentages). */
  decimals?: number;
}

export interface ReportTable {
  kind: "table";
  title: string;
  columns: ReportColumn[];
  rows: Record<string, Cell>[];
  totals?: Record<string, Cell>;
  note?: string;
}

export interface ReportSummary {
  kind: "summary";
  title: string;
  items: { label: string; value: Cell; type: CellType; decimals?: number }[];
}

export type ReportSection = ReportTable | ReportSummary;

export interface ReportDocument {
  type: string;
  title: string;
  farmName: string;
  period: { from: string; to: string } | null;
  generatedAt: string;
  generatedBy: string;
  currency: string;
  sections: ReportSection[];
  /** Shown at the end: what is omitted for this person, data caveats. */
  notes: string[];
}

/** Formats a cell for people (PDF): money as "INR 1,234.50", percentages with %. */
export function formatCell(v: Cell, type: CellType, currency: string, decimals?: number): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  const n = (x: number, dp: number) => x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  switch (type) {
    case "money":
      return `${currency} ${n(v / 100, 2)}`;
    case "percent":
      return `${n(v, decimals ?? 1)}%`;
    case "number":
      return n(v, decimals ?? (Number.isInteger(v) ? 0 : 2));
    default:
      return String(v);
  }
}

/** Value for spreadsheets: money in major units (a number), everything else as is. */
export function sheetValue(v: Cell, type: CellType): Cell {
  if (v === null || v === undefined) return null;
  if (type === "money" && typeof v === "number") return Math.round(v) / 100;
  return v;
}

/**
 * Neutralises spreadsheet formula injection: a text cell that starts with = + - @ tab or CR is prefixed with an
 * apostrophe so spreadsheet programs show it as text. Numbers are untouched (a negative number is not a formula).
 */
export function safeText(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
