import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "../api/auth";
import { apiRequest } from "../api/client";
import { errorText } from "../components/states";
import { Backdrop } from "../components/ui";

type Mode = "signin" | "signup" | "forgot" | "reset" | "verify";
const inputClass = "panel-inner w-full rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-brand";
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "KES", "NGN", "GHS", "UGX", "TZS", "ZAR", "PKR", "BDT", "NPR", "LKR", "PHP", "IDR", "VND", "THB", "BRL", "MXN", "AUD", "CAD"];
/** Best guess from the browser's language; some browsers report locales Intl.Locale rejects, so never throw. */
const guessCurrency = () => {
  let region: string | undefined;
  try {
    region = new Intl.Locale(navigator.language || "en-US").maximize().region;
  } catch {
    region = undefined;
  }
  const map: Record<string, string> = { IN: "INR", US: "USD", GB: "GBP", KE: "KES", NG: "NGN", GH: "GHS", UG: "UGX", TZ: "TZS", ZA: "ZAR", PK: "PKR", BD: "BDT", NP: "NPR", LK: "LKR", PH: "PHP", ID: "IDR", VN: "VND", TH: "THB", BR: "BRL", MX: "MXN", AU: "AUD", CA: "CAD" };
  return (region && map[region]) || "USD";
};

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] tracking-[0.15em] text-inksoft uppercase">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[12px] text-inksoft">{hint}</span> : null}
    </label>
  );
}

/** Google Identity Services button, shown only when a client id is configured. */
function GoogleButton({ onToken }: { onToken: (idToken: string) => void }) {
  const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!clientId || !ref.current) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      const g = (window as unknown as { google?: { accounts: { id: { initialize(o: object): void; renderButton(el: HTMLElement, o: object): void } } } }).google;
      g?.accounts.id.initialize({ client_id: clientId, callback: (r: { credential: string }) => onToken(r.credential) });
      if (ref.current) g?.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", width: 320, text: "continue_with" });
    };
    document.head.appendChild(s);
    return () => s.remove();
  }, [clientId, onToken]);
  if (!clientId) return null;
  return <div ref={ref} className="mt-3 flex justify-center" />;
}

export function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { mode?: Mode; token?: string; redirect?: string };
  const [mode, setMode] = useState<Mode>(search.mode ?? (search.token ? "reset" : "signin"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [f, setF] = useState({ email: "", password: "", fullName: "", farmName: "", currency: guessCurrency() });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((c) => ({ ...c, [k]: e.target.value }));
  const goIn = () => navigate({ to: search.redirect && search.redirect.startsWith("/") ? search.redirect : "/dashboard", replace: true });

  useEffect(() => {
    if (auth.status === "signedIn" && mode !== "verify") void goIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.status]);

  useEffect(() => {
    if (mode !== "verify" || !search.token) return;
    apiRequest("/auth/verify-email", { method: "POST", body: JSON.stringify({ token: search.token }) })
      .then(() => setNotice("Your email is confirmed. You can continue."))
      .catch((e: unknown) => setError(errorText(e)));
  }, [mode, search.token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await auth.login(f.email, f.password);
      else if (mode === "signup") await auth.register({ email: f.email, password: f.password, fullName: f.fullName, farm: { name: f.farmName || "My Farm", currency: f.currency, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" } });
      else if (mode === "forgot") {
        await apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: f.email }) });
        setNotice("If that email has an account, a reset link is on its way.");
      } else if (mode === "reset") {
        await apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: search.token, newPassword: f.password }) });
        setNotice("Password changed. Sign in with your new password.");
        setMode("signin");
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, string> = { signin: "Sign in to your farm", signup: "Create your farm account", forgot: "Reset your password", reset: "Choose a new password", verify: "Confirm your email" };
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 font-body text-ink">
      <Backdrop />
      <div className="prism-glass prism-edge relative z-10 w-full max-w-md rounded-2xl p-6 sm:p-7">
        <p className="text-[12px] tracking-[0.2em] text-inksoft uppercase">PoultryPilot</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{titles[mode]}</h1>
        {notice ? <p role="status" className="mt-4 rounded-xl bg-mint/12 p-3 text-[13px] text-mint-ink">{notice}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl bg-rose/10 p-3 text-[13px] text-rose-ink">{error}</p> : null}
        {mode !== "verify" ? (
          <form className="mt-5 space-y-3" onSubmit={submit}>
            {mode === "signup" ? (
              <>
                <Field label="Your name"><input required autoComplete="name" value={f.fullName} onChange={set("fullName")} className={inputClass} /></Field>
                <Field label="Farm name"><input value={f.farmName} onChange={set("farmName")} className={inputClass} placeholder="Green Valley Poultry" /></Field>
                <Field label="Currency" hint={`Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone} (from this device; change it later in Farm)`}>
                  <select value={f.currency} onChange={set("currency")} className={inputClass}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
                </Field>
              </>
            ) : null}
            {mode !== "reset" ? <Field label="Email"><input type="email" required autoComplete="email" value={f.email} onChange={set("email")} className={inputClass} /></Field> : null}
            {mode !== "forgot" ? (
              <Field label={mode === "reset" ? "New password" : "Password"} hint={mode === "signin" ? undefined : "At least 10 characters, with letters and a number."}>
                <input type="password" required minLength={mode === "signin" ? 1 : 10} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={f.password} onChange={set("password")} className={inputClass} />
              </Field>
            ) : null}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
              {busy ? "Please wait…" : { signin: "Sign in", signup: "Create account", forgot: "Send reset link", reset: "Change password", verify: "" }[mode]}
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => void goIn()} className="mt-5 w-full rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-white">Continue</button>
        )}
        {mode === "signin" || mode === "signup" ? <GoogleButton onToken={(t) => auth.google(t).catch((e: unknown) => setError(errorText(e)))} /> : null}
        <div className="mt-4 flex flex-col items-center gap-2 text-[12px] font-medium text-inksoft">
          {mode === "signin" ? <button type="button" onClick={() => { setMode("forgot"); setError(null); setNotice(null); }} className="hover:text-brand-ink">Forgot your password?</button> : null}
          <button type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }} className="hover:text-brand-ink">
            {mode === "signin" ? "New here? Create a farm account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
