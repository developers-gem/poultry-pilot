import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../api/auth";
import { authedRequest } from "../api/client";
import { Form } from "../components/forms";
import { Backdrop } from "../components/ui";
import { CURRENCIES } from "./Auth";

/** Signed in (e.g. with Google) but not on any farm yet: create one. */
export function CreateFarm() {
  const { reload, logout, me } = useAuth();
  const qc = useQueryClient();
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Backdrop />
      <div className="prism-glass prism-edge relative z-10 w-full max-w-md rounded-2xl p-6 sm:p-7">
        <p className="text-[12px] tracking-[0.2em] text-inksoft uppercase">Welcome{me ? `, ${me.user.fullName}` : ""}</p>
        <h1 className="mt-1 mb-5 font-display text-2xl font-semibold tracking-tight">Set up your farm</h1>
        <Form
          columns={1}
          submitLabel="Create farm"
          fields={[
            { name: "name", label: "Farm name", required: true, placeholder: "Green Valley Poultry" },
            { name: "currency", label: "Currency", type: "select", defaultValue: "INR", options: CURRENCIES.map((c) => ({ value: c, label: c })) },
          ]}
          onSubmit={async (v) => {
            await authedRequest("/farms", { method: "POST", body: JSON.stringify({ ...v, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }) });
            qc.clear();
            await reload();
          }}
          footer={<button type="button" onClick={() => void logout()} className="text-[12px] text-inksoft hover:underline">Sign out</button>}
        />
      </div>
    </div>
  );
}
