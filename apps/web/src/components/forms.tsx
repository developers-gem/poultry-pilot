import { useId, useState, type ReactNode } from "react";
import { ApiError } from "../api/client";
import { errorText } from "./states";
import { Button, GlassCard } from "./ui";

export type FieldType = "text" | "email" | "password" | "number" | "date" | "select" | "textarea" | "money" | "checkbox";
export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  hint?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  /** Full width on two-column layouts. */
  span?: boolean;
  /** Only shown (and sent) when this returns true for the current values. */
  show?: (values: Record<string, string | boolean>) => boolean;
}

export type FormValues = Record<string, string | number | boolean>;

const inputClass = "panel-inner w-full rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-brand aria-[invalid=true]:border-rose";

/** Converts the form's strings into typed values; empty fields are left out. */
export function collect(fields: FieldDef[], raw: Record<string, string | boolean>): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    if (f.show && !f.show(raw)) continue;
    const v = raw[f.name];
    if (f.type === "checkbox") {
      out[f.name] = !!v;
      continue;
    }
    if (v === undefined || v === "") continue;
    out[f.name] = f.type === "number" || f.type === "money" ? Number(v) : String(v);
  }
  return out;
}

/** Field-level messages from the API's validation details (`path` like "eggs.collected" or "amount"). */
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || !Array.isArray(e.details)) return {};
  const out: Record<string, string> = {};
  for (const d of e.details as { path?: string; message?: string }[]) {
    if (!d.path || !d.message) continue;
    out[d.path] = d.message;
    const top = d.path.split(".")[0]!;
    out[top] ??= d.message;
  }
  return out;
}

const initialValues = (fields: FieldDef[], initial?: FormValues) =>
  Object.fromEntries(fields.map((f) => [f.name, initial?.[f.name] !== undefined ? (f.type === "checkbox" ? !!initial[f.name] : String(initial[f.name])) : f.defaultValue !== undefined ? (f.type === "checkbox" ? !!f.defaultValue : String(f.defaultValue)) : f.type === "checkbox" ? false : ""])) as Record<string, string | boolean>;

/**
 * A form for one write. Keeps what was typed if saving fails, shows the server's message next to the field, and
 * clears itself only after a successful save. `errorMap` renames API paths to field names where they differ.
 */
export function Form({ fields, onSubmit, submitLabel = "Save record", initial, columns = 2, errorMap, footer, resetOnSuccess = true, onSuccess }: {
  fields: FieldDef[];
  onSubmit: (values: FormValues) => Promise<unknown>;
  submitLabel?: string;
  initial?: FormValues;
  columns?: 1 | 2;
  errorMap?: Record<string, string>;
  footer?: ReactNode;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [values, setValues] = useState(() => initialValues(fields, initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const id = useId();
  const set = (name: string, v: string | boolean) => setValues((cur) => ({ ...cur, [name]: v }));

  return (
    <form
      noValidate={false}
      className={`grid gap-3 ${columns === 2 ? "sm:grid-cols-2" : ""}`}
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        setErrors({});
        setGeneral(null);
        try {
          await onSubmit(collect(fields, values));
          if (resetOnSuccess) setValues(initialValues(fields, initial));
          onSuccess?.();
        } catch (err) {
          if (err && typeof err === "object") (err as { shownInline?: boolean }).shownInline = true;
          const fe = fieldErrors(err);
          const mapped = Object.fromEntries(Object.entries(fe).map(([k, v]) => [errorMap?.[k] ?? k, v]));
          const known = Object.keys(mapped).filter((k) => fields.some((f) => f.name === k));
          setErrors(mapped);
          setGeneral(known.length ? null : errorText(err));
        } finally {
          setPending(false);
        }
      }}
    >
      {general ? (
        <p role="alert" className={`rounded-xl bg-rose/10 px-3 py-2 text-[13px] text-rose-ink ${columns === 2 ? "sm:col-span-2" : ""}`}>
          {general}
        </p>
      ) : null}
      {fields.map((f) => {
        if (f.show && !f.show(values)) return null;
        const fid = `${id}-${f.name}`;
        const err = errors[f.name];
        const span = f.span || f.type === "textarea" ? (columns === 2 ? "sm:col-span-2" : "") : "";
        if (f.type === "checkbox") {
          return (
            <label key={f.name} className={`flex items-center gap-2 text-[13px] ${span}`}>
              <input type="checkbox" checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
              {f.label}
            </label>
          );
        }
        const common = { id: fid, name: f.name, required: f.required, "aria-invalid": err ? true : undefined, "aria-describedby": err || f.hint ? `${fid}-msg` : undefined, className: inputClass };
        return (
          <div key={f.name} className={span}>
            <label htmlFor={fid} className="mb-1 block text-[11px] tracking-[0.15em] text-inksoft uppercase">
              {f.label}
              {f.required ? <span aria-hidden> *</span> : null}
            </label>
            {f.type === "select" ? (
              <select {...common} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)}>
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea {...common} rows={2} placeholder={f.placeholder} value={String(values[f.name] ?? "")} onChange={(e) => set(f.name, e.target.value)} />
            ) : (
              <input
                {...common}
                type={f.type === "money" ? "number" : (f.type ?? "text")}
                inputMode={f.type === "number" || f.type === "money" ? "decimal" : undefined}
                step={f.type === "money" ? "0.01" : f.type === "number" ? (f.step ?? "any") : undefined}
                min={f.min}
                max={f.max}
                placeholder={f.placeholder}
                value={String(values[f.name] ?? "")}
                onChange={(e) => set(f.name, e.target.value)}
              />
            )}
            {err || f.hint ? (
              <p id={`${fid}-msg`} className={`mt-1 text-[12px] ${err ? "text-rose-ink" : "text-inksoft"}`}>
                {err ?? f.hint}
              </p>
            ) : null}
          </div>
        );
      })}
      <div className={`flex flex-wrap items-center gap-3 ${columns === 2 ? "sm:col-span-2" : ""}`}>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}

/** The prototype's collapsible "Open form" card, around a Form. Hidden for people who may not make this change. */
export function FormCard({ title, description, allowed = true, defaultOpen = false, ...form }: Parameters<typeof Form>[0] & { title: string; description?: ReactNode; allowed?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!allowed) return null;
  return (
    <GlassCard>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <h2 className="font-display text-[16px] font-semibold tracking-tight">{title}</h2>
        <span className="shrink-0 text-[12px] font-medium text-inksoft">{open ? "Close" : "Open form"}</span>
      </button>
      {open ? (
        <div className="mt-4">
          {description ? <p className="mb-3 text-[13px] text-inksoft">{description}</p> : null}
          <Form {...form} onSuccess={() => { form.onSuccess?.(); setOpen(false); }} />
        </div>
      ) : null}
    </GlassCard>
  );
}
