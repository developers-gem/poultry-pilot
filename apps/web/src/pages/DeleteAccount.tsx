
import { useState } from "react";
import type { FormEvent } from "react";
import {
    ShieldCheck,
    Trash2,
    Mail,
    AlertTriangle,
    LockKeyhole,
    Database,
    UserRound,
} from "lucide-react";

const SUPPORT_EMAIL = "support@poultrypilot.com";

export default function DeleteAccount() {
    const [email, setEmail] = useState("");
    const [reason, setReason] = useState("No longer need the service");
    const [details, setDetails] = useState("");
    const [confirmed, setConfirmed] = useState(false);
    const [error, setError] = useState("");

 const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
        setError("");

        if (!confirmed) {
            setError(
                "Please confirm that you understand the deletion process."
            );
            return;
        }

        const subject = encodeURIComponent(
            "PoultryPilot Account Deletion Request"
        );

        const body = encodeURIComponent(
            `Hello PoultryPilot Support,\n\n` +
            `I would like to request deletion of my PoultryPilot account.\n\n` +
            `Registered email: ${email}\n` +
            `Reason: ${reason}\n` +
            `Additional details: ${details || "Not provided"}\n\n` +
            `I understand that account deletion may be permanent.\n\n` +
            `Thank you.`
        );

        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    };

    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f5f8ff] via-[#f8f7ff] to-[#eefaff] px-4 py-10 text-[#171a35] sm:px-6 sm:py-14">
            {/* Background decoration */}
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
                        We’re sorry to see you go. You can request the deletion of your
                        PoultryPilot account and associated personal data using the form
                        below.
                    </p>
                </section>

                <div className="flex justify-center">
                    <section className="w-full max-w-2xl rounded-3xl border border-white/90 bg-white/80 p-5 text-center shadow-[0_20px_70px_rgba(85,105,170,0.10)] backdrop-blur-2xl sm:p-8">
                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-bold">
                                Account deletion request
                            </h2>

                            <p className="mt-2 text-sm leading-6 text-[#74809d]">
                                Enter your registered email address and confirm your request.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
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
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full rounded-2xl border border-[#e1e6f3] bg-white/80 py-3.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-[#a0a9bf] focus:border-[#8ba0ff] focus:ring-4 focus:ring-[#8ba0ff]/15"
                                    />
                                </div>
                            </div>


                            {error && (
                                <p
                                    role="alert"
                                    className="text-sm font-medium text-red-600"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ef777f] to-[#e85f79] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-rose-200/50 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-200/60 focus:outline-none focus:ring-4 focus:ring-rose-200 active:translate-y-0"
                            >
                                <Trash2 size={17} />
                                Request Account Deletion
                            </button>

                            <p className="text-center text-xs leading-5 text-[#929bb1]">
                                This opens your email app to send a request to our support team.
                                Your account is not deleted automatically by this form.
                            </p>
                        </form>
                    </section>
                </div>
            </div>
        </main>
    );
}
