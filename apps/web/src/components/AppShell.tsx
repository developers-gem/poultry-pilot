import { Link, Outlet } from "@tanstack/react-router";

export function AppShell() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-3 rounded-full">
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-brand font-display text-sm font-semibold text-white">
            PP
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">PoultryPilot</span>
        </Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-16">
        <Outlet />
      </main>
    </div>
  );
}

export function NotFound() {
  return (
    <section className="panel mx-auto mt-10 max-w-lg p-8">
      <h1 className="font-display text-2xl font-semibold">This page does not exist</h1>
      <p className="mt-2 text-inksoft">Check the address, or go back to the system status page.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white">
        Go to system status
      </Link>
    </section>
  );
}
