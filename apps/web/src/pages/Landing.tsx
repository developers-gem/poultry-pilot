import { Link } from "@tanstack/react-router";
import { useAuth } from "../api/auth";
import { Backdrop, Logo } from "../components/ui";

/** Product modules (marketing copy from the prototype's landing page; not farm data). */
const MODULES = [
  { name: "PoultryPilot", text: "Flocks, daily tasks, feed, deaths, expenses and sales in one place." },
  { name: "BroilerProfit", text: "Weight gain, feed use, costs and expected profit for every batch." },
  { name: "EggCount", text: "Eggs collected by house or flock, including broken eggs and sales." },
  { name: "FeedWise", text: "Feed stock, daily use, supplier prices and cost per bird or egg." },
  { name: "ChickStart", text: "Chick arrival prep with early feeding, temperature and losses." },
  { name: "HatcheryHub", text: "Egg setting, incubation dates, hatch results, orders and deliveries." },
  { name: "FlockHealth", text: "Vet visits, vaccination schedules, symptoms, treatments, mortality." },
  { name: "BioSecure Farm", text: "Cleaning checklists plus visitor and equipment logs." },
  { name: "PoultryMarket", text: "Reach buyers of live birds, eggs and day-old chicks." },
  { name: "FarmAlert", text: "Warnings when eggs fall, deaths rise or feed use shifts." },
];

export function Landing() {
  const { status } = useAuth();
  const signedIn = status === "signedIn";
  return (
    <div className="relative min-h-screen w-full bg-background font-body text-ink">
      <Backdrop />
      <header className="relative z-10 px-4 pt-4 sm:px-6 sm:pt-6 lg:px-10">
        <nav className="prism-glass prism-edge flex items-center justify-between rounded-2xl px-5 py-3">
          <Logo subtitle="Flock OS" />
          <Link to={signedIn ? "/dashboard" : "/auth"} className="rounded-xl bg-ink px-4 py-2 text-[13px] font-semibold text-white">
            {signedIn ? "Open your farm" : "Sign in"}
          </Link>
        </nav>
      </header>
      <main className="relative z-10 px-4 py-12 sm:px-6 sm:py-14 lg:px-10">
        <div className="max-w-2xl">
          <p className="mb-2 text-[12px] tracking-[0.2em] text-inksoft uppercase">Poultry farm management</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight lg:text-5xl">Every bird, egg and bag of feed accounted for.</h1>
          <p className="mt-4 text-[15px] text-inksoft">Record the day's eggs, feed and losses in seconds, then see batch profit, flock health and buyer demand without a spreadsheet in sight.</p>
          <div className="mt-6 flex items-center gap-2">
            <Link to={signedIn ? "/dashboard" : "/auth"} search={signedIn ? {} : { mode: "signup" }} className="rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-white">
              {signedIn ? "Go to your dashboard" : "Start your farm record"}
            </Link>
          </div>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <section key={m.name} className="prism-glass prism-edge rounded-2xl p-5">
              <h2 className="font-display text-[16px] font-semibold tracking-tight">{m.name}</h2>
              <p className="mt-2 text-[13px] text-inksoft">{m.text}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
