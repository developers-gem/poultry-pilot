import type { ReactNode } from "react";
import { EmptyState } from "./states";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right";
  /** Left out of the phone card layout (keep phone cards short). */
  hideOnPhone?: boolean;
}

/**
 * The prototype's table on larger screens; on phones each row becomes a small card, which reads better than a
 * table scrolled sideways.
 */
export function DataTable<T>({ columns, rows, rowKey, actions, empty = "Nothing recorded yet.", emptyBody }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; actions?: (row: T) => ReactNode; empty?: string; emptyBody?: ReactNode }) {
  if (!rows.length) return <EmptyState title={empty} body={emptyBody} />;
  const cell = (c: Column<T>, r: T): ReactNode => {
    const v = c.render ? c.render(r) : (r as Record<string, unknown>)[c.key];
    return v === null || v === undefined || v === "" ? "—" : (v as ReactNode);
  };
  return (
    <>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-separate border-spacing-y-1.5 text-left text-[13px]">
          <thead>
            <tr className="text-[11px] tracking-[0.15em] text-inksoft uppercase">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : ""}`}>
                  {c.label}
                </th>
              ))}
              {actions ? <th className="px-3 py-2"><span className="sr-only">Actions</span></th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="panel-inner">
                {columns.map((c, i) => (
                  <td key={c.key} className={`px-3 py-2.5 ${c.align === "right" ? "text-right tabular-nums" : ""} ${i === 0 ? "rounded-l-xl" : ""} ${!actions && i === columns.length - 1 ? "rounded-r-xl" : ""}`}>
                    {cell(c, r)}
                  </td>
                ))}
                {actions ? <td className="rounded-r-xl px-3 py-2.5 text-right whitespace-nowrap">{actions(r)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-2 sm:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="panel-inner rounded-xl p-3 text-[13px]">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {columns.filter((c) => !c.hideOnPhone).map((c) => (
                <div key={c.key} className="contents">
                  <dt className="text-[11px] tracking-[0.12em] text-inksoft uppercase">{c.label}</dt>
                  <dd className="text-right">{cell(c, r)}</dd>
                </div>
              ))}
            </dl>
            {actions ? <div className="mt-2 flex justify-end gap-3 border-t border-white/60 pt-2">{actions(r)}</div> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
