import { useEffect, useState } from "react";

type Toast = { id: number; tone: "success" | "error"; text: string };
let items: Toast[] = [];
let next = 1;
const listeners = new Set<(t: Toast[]) => void>();
const emit = () => listeners.forEach((l) => l(items));

function push(tone: Toast["tone"], text: string) {
  const id = next++;
  items = [...items, { id, tone, text }].slice(-4);
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, tone === "error" ? 7000 : 3500);
}

export const toast = { success: (t: string) => push("success", t), error: (t: string) => push("error", t) };

/** Announced to screen readers; stacked bottom-right on desktop, bottom-centre on phones. */
export function Toaster() {
  const [list, setList] = useState<Toast[]>(items);
  useEffect(() => {
    listeners.add(setList);
    return () => void listeners.delete(setList);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {list.map((t) => (
        <div key={t.id} role="status" className={`prism-glass pointer-events-auto max-w-sm rounded-xl px-4 py-3 text-[13px] font-medium shadow-lg ${t.tone === "error" ? "text-rose-ink" : "text-ink"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
