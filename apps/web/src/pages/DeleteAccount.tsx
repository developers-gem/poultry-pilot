import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  Trash2,
  Mail,
  AlertTriangle,
  UserRound,
  CheckCircle2,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { apiRequest, ApiError } from "../api/client";
import { setTokens, setSelectedFarm } from "../api/session";
import { useAuth } from "../api/auth";

interface AccountInfo {
  exists: boolean;
  email: string;
  fullName: string;
}

export default function DeleteAccount() {
  const navigate = useNavigate();
  const { me } = useAuth();

  const [step, setStep] = useState<"input" | "confirm" | "deleted">("input");
  const [email, setEmail] = useState("");
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill email if user is already logged in
  useEffect(() => {
    if (me?.user?.email && !email) {
      setEmail(me.user.email);
    }
  }, [me?.user?.email]);

  // Step 1: Check if email exists in database
  const handleCheckEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setIsChecking(true);
      const res = await apiRequest<AccountInfo>("/auth/check-email", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail }),
      });

      setAccountInfo(res.data);
      setConfirmed(false);
      setStep("confirm");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("No account found with this email address. Please check your spelling and try again.");
      } else if (err instanceof ApiError) {
        setError(err.message || "Failed to check account. Please try again.");
      } else {
        setError("Unable to connect to the server. Please check your network connection.");
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Step 2: Confirm and delete account
  const handleDeleteAccount = async () => {
    if (!confirmed) {
      setError("Please check the confirmation box to proceed.");
      return;
    }

    if (!accountInfo) return;

    try {
      setIsDeleting(true);
      setError("");

      await apiRequest<{ success: boolean; message: string }>("/auth/delete-account", {
        method: "POST",
        body: JSON.stringify({ email: accountInfo.email }),
      });

      // Clear session data from localStorage
      setTokens(null);
      setSelectedFarm(null);
      setStep("deleted");

      // Auto-redirect to home page after 2.5 seconds
      setTimeout(() => {
        navigate({ to: "/", replace: true });
      }, 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to delete account. Please try again.");
      } else {
        setError("An unexpected error occurred while deleting your account.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f5f8ff] via-[#f8f7ff] to-[#eefaff] px-4 py-10 text-[#171a35] sm:px-6 sm:py-14">
      {/* Background decorations */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#8ca8ff]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-[#bba2ff]/20 blur-3xl"
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Page introduction */}
        <section className="mx-auto mb-9 max-w-2xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-white/90 bg-white/75 text-[#7188f7] shadow-lg shadow-indigo-100/60">
            <UserRound size={29} strokeWidth={1.8} />
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dfe5ff] bg-white/65 px-3.5 py-1.5 text-xs font-semibold text-[#6c7ed7]">
            <ShieldCheck size={14} />
            Your privacy matters
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Delete Your{" "}
            <span className="bg-gradient-to-r from-[#6384f8] to-[#a078e8] bg-clip-text text-transparent">
              Account
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#687391] sm:text-base">
            We’re sorry to see you go. You can permanently delete your PoultryPilot
            account and all associated data using the form below.
          </p>
        </section>

        <div className="flex justify-center">
          <section className="w-full max-w-2xl rounded-3xl border border-white/90 bg-white/80 p-6 text-center shadow-[0_20px_70px_rgba(85,105,170,0.10)] backdrop-blur-2xl sm:p-9">

            {/* STEP 1: Enter email and check */}
            {step === "input" && (
              <>
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-bold text-[#171a35]">
                    Account deletion request
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#74809d]">
                    Enter your registered email address to verify your account before deletion.
                  </p>
                </div>

                <form onSubmit={handleCheckEmail} className="space-y-5 text-left">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-semibold text-[#303957]"
                    >
                      Registered email address
                    </label>

                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#929db8]"
                      />
                      <input
                        id="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (error) setError("");
                        }}
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border border-[#e1e6f3] bg-white/80 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-[#a0a9bf] focus:border-[#8ba0ff] focus:ring-4 focus:ring-[#8ba0ff]/15"
                      />
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm font-medium text-red-700"
                    >
                      <AlertTriangle size={18} className="shrink-0 text-red-500" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isChecking}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ef777f] to-[#e85f79] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-rose-200/50 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-200/60 focus:outline-none focus:ring-4 focus:ring-rose-200 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Verifying Account...
                      </>
                    ) : (
                      <>
                        <Trash2 size={17} />
                        Request Account Deletion
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs leading-5 text-[#929bb1]">
                    The server will check if your email exists before confirming deletion.
                  </p>
                </form>
              </>
            )}

            {/* STEP 2: Account found -> Confirm deletion */}
            {step === "confirm" && accountInfo && (
              <div className="space-y-6 text-left">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                    <AlertTriangle size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-[#171a35]">
                    Confirm Account Deletion
                  </h2>
                  <p className="mt-1 text-sm text-[#74809d]">
                    Please review the details below before proceeding.
                  </p>
                </div>

                {/* Account details card */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                    Account Found
                  </p>
                  <p className="mt-1 text-base font-bold text-[#171a35]">
                    {accountInfo.fullName}
                  </p>
                  <p className="text-sm text-[#505d84]">
                    {accountInfo.email}
                  </p>
                </div>

                {/* Warning notification */}
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm leading-6 text-rose-900">
                  <p className="font-semibold text-rose-950">
                    Warning: This action is permanent and cannot be undone!
                  </p>
                  <p className="mt-1 text-rose-800">
                    Deleting your account will immediately remove your profile, revoke all
                    active sessions, and remove access to your farms and operational records.
                  </p>
                </div>

                {/* Checkbox confirmation */}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => {
                      setConfirmed(e.target.checked);
                      if (error) setError("");
                    }}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-sm font-medium text-[#303957]">
                    Yes, I want to permanently delete my account and understand that all my data will be deleted.
                  </span>
                </label>

                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50/80 p-3 text-sm font-medium text-red-700"
                  >
                    <AlertTriangle size={18} className="shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Buttons: Delete and Cancel */}
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("input");
                      setConfirmed(false);
                      setError("");
                    }}
                    disabled={isDeleting}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    <ArrowLeft size={16} />
                    Back / Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={!confirmed || isDeleting}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-200/50 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-300/60 focus:outline-none focus:ring-4 focus:ring-rose-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Deleting Account...
                      </>
                    ) : (
                      <>
                        <Trash2 size={17} />
                        Permanently Delete Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Deletion successful */}
            {step === "deleted" && (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={36} />
                </div>

                <h2 className="text-2xl font-bold text-[#171a35]">
                  Account Successfully Deleted
                </h2>

                <p className="mt-3 text-sm leading-6 text-[#687391]">
                  Your account has been permanently removed from PoultryPilot.
                  We have logged you out and cleared your session.
                </p>

                <p className="mt-2 text-xs font-semibold text-indigo-600">
                  Redirecting you to the home page...
                </p>

                <button
                  type="button"
                  onClick={() => navigate({ to: "/", replace: true })}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#171a35] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#303657]"
                >
                  Go to Home Page
                </button>
              </div>
            )}

          </section>
        </div>
      </div>
    </main>
  );
}
