
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  LockKeyhole,
  Database,
  Bell,
  Camera,
  MapPin,
  Eye,
  Users,
  CalendarDays,
  Scale,
  Baby,
  Mail,
  Menu,
  X,
  ChevronRight,
  FileText,
  ExternalLink,
  Leaf,
  CheckCircle2,
} from "lucide-react";

const sections = [
  { id: "introduction", title: "Introduction", icon: ShieldCheck },
  { id: "information", title: "Information We Collect", icon: Database },
  { id: "usage", title: "How We Use Your Information", icon: Eye },
  { id: "security", title: "Data Storage & Security", icon: LockKeyhole },
  { id: "sharing", title: "Data Sharing & Disclosure", icon: Users },
  { id: "retention", title: "Data Retention", icon: CalendarDays },
  { id: "rights", title: "Your Rights", icon: Scale },
  { id: "children", title: "Children's Privacy", icon: Baby },
  { id: "third-party", title: "Third-Party Services", icon: ExternalLink },
  { id: "changes", title: "Policy Changes", icon: FileText },
  { id: "contact", title: "Contact Us", icon: Mail },
];

const informationItems = [
  {
    title: "Account Information",
    description:
      "Name, email address, phone number, and password when you register.",
  },
  {
    title: "Farm Profile Data",
    description:
      "Farm name, location (city or region), flock details, house information, and operational data.",
  },
  {
    title: "Daily Records",
    description:
      "Bird counts, mortality data, feed and water consumption, egg production, weight records, health observations, and photos you upload.",
  },
  {
    title: "Financial Data",
    description:
      "Revenue, expense, and task records entered into the App.",
  },
  {
    title: "Profile & Settings",
    description:
      "Preferences, notification settings, and account preferences.",
  },
];

const automaticItems = [
  {
    title: "Device Information",
    description:
      "Device type, operating system version, and unique device identifiers.",
  },
  {
    title: "Usage Data",
    description:
      "Features used, screens visited, session duration, and app interaction patterns.",
  },
  {
    title: "Log Data",
    description:
      "Error logs, crash reports, and diagnostic information.",
  },
  {
    title: "Network Information",
    description: "IP address and connection type.",
  },
];

const purposes = [
  {
    title: "Provide the Service",
    description:
      "Create and manage your account, sync farm records, and display your data across devices.",
  },
  {
    title: "Sync & Backup",
    description:
      "Store your records on our servers so you can access them from multiple devices.",
  },
  {
    title: "Analytics & Insights",
    description:
      "Generate production reports, mortality trends, and farm performance dashboards for your use.",
  },
  {
    title: "Push Notifications",
    description:
      "Send task reminders, health alerts, and sync status updates.",
  },
  {
    title: "Improve the App",
    description:
      "Analyze usage patterns to improve features, fix bugs, and enhance performance.",
  },
  {
    title: "Customer Support",
    description: "Respond to your queries and troubleshoot issues.",
  },
  {
    title: "Security",
    description:
      "Detect and prevent fraud, unauthorized access, and abuse.",
  },
  {
    title: "Legal Compliance",
    description: "Comply with applicable laws and regulations.",
  },
];

const sharingItems = [
  {
    scenario: "Service Providers",
    details:
      "Trusted third-party vendors for cloud hosting, analytics, and crash reporting, subject to applicable data processing agreements.",
  },
  {
    scenario: "Firebase / Google",
    details:
      "Push notifications and crash analytics, governed by applicable Google privacy policies.",
  },
  {
    scenario: "Legal Requirements",
    details:
      "When required by law, court order, or government authority.",
  },
  {
    scenario: "Business Transfer",
    details:
      "In connection with a merger, acquisition, or sale of assets. You will be notified as required by applicable law.",
  },
  {
    scenario: "Your Consent",
    details:
      "When you explicitly authorize us to share your data.",
  },
];

const rightsItems = [
  {
    title: "Access",
    description: "Request a copy of the personal data we hold about you.",
    icon: Eye,
  },
  {
    title: "Correction",
    description:
      "Request correction of inaccurate or incomplete data.",
    icon: FileText,
  },
  {
    title: "Deletion",
    description:
      "Request deletion of your account and personal data.",
    icon: X,
  },
  {
    title: "Data Portability",
    description:
      "Request your data in a machine-readable format, where applicable.",
    icon: Database,
  },
  {
    title: "Opt-Out",
    description:
      "Opt out of non-essential communications and analytics where available.",
    icon: Scale,
  },
  {
    title: "Notification Control",
    description:
      "Manage push notifications through your device settings.",
    icon: Bell,
  },
];

const thirdPartyItems = [
  {
    service: "Firebase (Google)",
    purpose: "Push notifications and crash analytics",
    url: "https://policies.google.com/privacy",
  },
  {
    service: "Google Fonts",
    purpose: "Typography",
    url: "https://policies.google.com/privacy",
  },
];

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white bg-gradient-to-br from-blue-100 via-cyan-50 to-violet-100 text-sm font-bold text-[#171a35] shadow-sm">
          {number}
        </span>
        <h2 className="text-xl font-bold tracking-tight text-[#171a35] sm:text-2xl">
          {title}
        </h2>
      </div>
      {description && (
        <p className="mt-4 text-sm leading-7 text-[#485477]">
          {description}
        </p>
      )}
    </div>
  );
}

function PolicyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/90 bg-white/65 p-5 shadow-[0_3px_15px_rgba(48,58,100,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-white/90">
      <h3 className="font-semibold text-[#171a35]">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[#485477]">
        {description}
      </p>
    </div>
  );
}

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState("introduction");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigateTo = (id: string) => {
    setActiveSection(id);
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_8%_8%,rgba(160,181,255,0.43),transparent_36%),radial-gradient(ellipse_at_92%_12%,rgba(200,173,255,0.36),transparent_34%),radial-gradient(ellipse_at_55%_65%,rgba(155,245,233,0.27),transparent_38%),linear-gradient(135deg,#f0f4ff_0%,#e9f5f8_52%,#f4f0ff_100%)] font-sans text-[#171a35]">
      {/* Header */}
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-5">
        <div className="mx-auto max-w-[1440px] rounded-[24px] border border-white/90 bg-white/65 shadow-[0_2px_12px_rgba(57,68,110,0.04)] backdrop-blur-xl">
          <div className="flex min-h-[62px] items-center justify-between gap-4 px-4 sm:px-6">
            <a href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6384f8] text-sm font-bold text-white shadow-sm">
                PP
              </span>
              <span>
                <span className="block text-sm font-semibold tracking-tight text-[#171a35] sm:text-base">
                  Poultry Pilot
                </span>
                <span className="block text-[9px] uppercase tracking-[0.24em] text-[#485477]">
                  Flock OS
                </span>
              </span>
            </a>

            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="/"
                className="text-sm font-medium text-[#485477] transition hover:text-[#171a35]"
              >
                Home
              </a>
              <a
                href="/#features"
                className="text-sm font-medium text-[#485477] transition hover:text-[#171a35]"
              >
                Features
              </a>
              <a
                href="/privacy-policy"
                className="text-sm font-semibold text-[#171a35]"
              >
                Privacy Policy
              </a>
              <a
                href="/login"
                className="rounded-full bg-[#171a35] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#303657]"
              >
                Sign in
              </a>
            </nav>

            <a
              href="/login"
              className="rounded-full bg-[#171a35] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#303657] md:hidden"
            >
              Sign in
            </a>

            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className="hidden rounded-full border border-white bg-white/80 p-2.5 text-[#171a35] sm:p-3"
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>

          {menuOpen && (
            <nav className="border-t border-white/80 p-3 md:hidden">
              <a href="/" className="block rounded-xl px-4 py-3 text-sm hover:bg-white/70">
                Home
              </a>
              <a href="/#features" className="block rounded-xl px-4 py-3 text-sm hover:bg-white/70">
                Features
              </a>
              <a href="/privacy-policy" className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-white/70">
                Privacy Policy
              </a>
            </nav>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pb-10 pt-14 sm:px-8 sm:pb-14 sm:pt-20">
        <div className="mx-auto max-w-[1440px]">
          <a
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/55 px-4 py-2 text-sm font-medium text-[#485477] transition hover:bg-white/85"
          >
            <ArrowLeft size={16} />
            Back to home
          </a>

          <div className="mt-8 max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-[0.17em] text-[#485477]">
              <ShieldCheck size={15} className="text-[#6384f8]" />
              Transparency & trust
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-[#171a35] sm:text-5xl lg:text-7xl">
              Your farm data.
              <br />
              <span className="bg-gradient-to-r from-[#5678ef] via-[#5c86d9] to-[#9274e8] bg-clip-text text-transparent">
                Your privacy.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#485477] sm:text-lg">
              We believe managing your poultry farm should be simple and your
              information should stay protected. Learn how PoultryPilot
              collects, uses, stores, and shares your information.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/60 px-4 py-2.5 text-sm font-medium text-[#303957]">
                <LockKeyhole size={16} className="text-[#6384f8]" />
                Data protection
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/60 px-4 py-2.5 text-sm font-medium text-[#303957]">
                <Eye size={16} className="text-[#6384f8]" />
                Transparent practices
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/60 px-4 py-2.5 text-sm font-medium text-[#303957]">
                <ShieldCheck size={16} className="text-[#6384f8]" />
                Your control
              </div>
            </div>
          </div>

          {/* Quick summary cards */}
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: LockKeyhole,
                title: "Security first",
                text: "We describe the safeguards used to protect your information.",
              },
              {
                icon: Database,
                title: "Your farm records",
                text: "Understand what farm, flock, production, and financial data we collect.",
              },
              {
                icon: Scale,
                title: "Your choices",
                text: "Learn how to request access, correction, or deletion of your data.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-[24px] border border-white/90 bg-white/55 p-5 shadow-[0_4px_20px_rgba(48,58,100,0.035)] backdrop-blur-sm sm:p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white bg-gradient-to-br from-blue-100 via-cyan-50 to-violet-100">
                    <Icon size={21} className="text-[#303957]" />
                  </div>
                  <h3 className="mt-4 font-bold text-[#171a35]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#485477]">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Policy body */}
      <main className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-8">
        <div className="grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          {/* Contents */}
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-[24px] border border-white/90 bg-white/60 p-4 shadow-[0_4px_20px_rgba(48,58,100,0.035)] backdrop-blur-xl">
              <p className="px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#697493]">
                On this page
              </p>

              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => navigateTo(section.id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] transition ${
                        active
                          ? "border border-white bg-gradient-to-r from-blue-100/80 via-cyan-50/80 to-violet-100/80 font-semibold text-[#171a35]"
                          : "text-[#485477] hover:bg-white/70 hover:text-[#171a35]"
                      }`}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="flex-1">{section.title}</span>
                      {active && <ChevronRight size={15} />}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 rounded-2xl border border-white bg-gradient-to-br from-blue-50 via-cyan-50 to-violet-50 p-4">
                <Mail size={20} className="text-[#6384f8]" />
                <p className="mt-3 text-sm font-bold text-[#171a35]">
                  Need help?
                </p>
                <p className="mt-1 text-xs leading-6 text-[#485477]">
                  Questions about your data? Get in touch with our privacy team.
                </p>
                <a
                  href="mailto:privacy@poultrypilot.com"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#405ec8] hover:underline"
                >
                  Contact support <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </aside>

          {/* Sections */}
          <div className="min-w-0 space-y-6">
            <section
              id="introduction"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading number="01" title="Introduction" />
              <p className="text-sm leading-8 text-[#485477] sm:text-base">
                Welcome to PoultryPilot (&quot;we&quot;, &quot;our&quot;, or
                &quot;us&quot;). We are committed to protecting your personal
                information and your right to privacy. This Privacy Policy
                explains how we collect, use, store, and share your information
                when you use our mobile application PoultryPilot (the
                &quot;App&quot;).
              </p>
              <p className="mt-4 text-sm leading-8 text-[#485477] sm:text-base">
                Please read this policy carefully. If you disagree with its
                terms, please discontinue use of the App.
              </p>
            </section>

            <section
              id="information"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading
                number="02"
                title="Information We Collect"
                description="We collect information you provide directly and certain technical information associated with your use of the App."
              />
              <h3 className="mb-4 text-lg font-bold text-[#171a35]">
                2.1 Information You Provide to Us
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {informationItems.map((item) => (
                  <PolicyCard key={item.title} {...item} />
                ))}
              </div>

              <h3 className="mb-4 mt-8 text-lg font-bold text-[#171a35]">
                2.2 Information Collected Automatically
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {automaticItems.map((item) => (
                  <PolicyCard key={item.title} {...item} />
                ))}
              </div>

              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl border border-white bg-gradient-to-r from-blue-50/80 via-white/60 to-cyan-50/80 p-5">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 shrink-0 text-[#6384f8]" size={21} />
                    <div>
                      <h3 className="font-bold text-[#171a35]">
                        2.3 Location Information
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#485477]">
                        We may collect your general location (city or region)
                        to provide weather data and relevant agricultural
                        insights. We do not collect precise GPS coordinates
                        without your explicit consent.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white bg-gradient-to-r from-cyan-50/80 via-white/60 to-violet-50/80 p-5">
                  <div className="flex items-start gap-3">
                    <Camera className="mt-1 shrink-0 text-[#6384f8]" size={21} />
                    <div>
                      <h3 className="font-bold text-[#171a35]">
                        2.4 Photos and Camera
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#485477]">
                        The App may access your camera and photo library to
                        allow you to upload flock photos and health
                        documentation. Photos are only accessed when you
                        explicitly choose to upload them.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white bg-gradient-to-r from-violet-50/80 via-white/60 to-blue-50/80 p-5">
                  <div className="flex items-start gap-3">
                    <Bell className="mt-1 shrink-0 text-[#6384f8]" size={21} />
                    <div>
                      <h3 className="font-bold text-[#171a35]">
                        2.5 Push Notifications
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#485477]">
                        We use Firebase Cloud Messaging (FCM) to send push
                        notifications such as reminders and alerts. A device
                        token is generated for this purpose.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="usage"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading
                number="03"
                title="How We Use Your Information"
                description="We use the information we collect to provide and improve PoultryPilot."
              />
              <div className="space-y-5">
                {purposes.map((item, index) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white bg-gradient-to-br from-blue-100 via-cyan-50 to-violet-100 text-sm font-bold text-[#303957]">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#171a35]">{item.title}</h3>
                      <p className="mt-1 text-sm leading-7 text-[#485477]">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-white bg-gradient-to-r from-blue-50 via-cyan-50 to-violet-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#536fda]" size={21} />
                  <p className="text-sm font-semibold leading-7 text-[#303957]">
                    We do not sell your personal data to third parties.
                  </p>
                </div>
              </div>
            </section>

            <section
              id="security"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading number="04" title="Data Storage & Security" />
              <p className="text-sm leading-8 text-[#485477] sm:text-base">
                Your data is stored on secure cloud servers with
                industry-standard encryption (AES-256 at rest and TLS in
                transit). The App also stores data locally on your device using
                an encrypted SQLite database for offline access.
              </p>
              <p className="mt-4 text-sm leading-8 text-[#485477] sm:text-base">
                Sensitive credentials, including tokens and passwords, are
                stored in the device&apos;s secure keychain or keystore. We
                implement access controls, regular security audits, and
                intrusion detection systems.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { value: "AES-256", label: "Encryption at rest" },
                  { value: "TLS", label: "Encryption in transit" },
                  { value: "SQLite", label: "Offline data storage" },
                ].map((item) => (
                  <div
                    key={item.value}
                    className="rounded-2xl border border-white bg-gradient-to-br from-blue-50/90 to-violet-50/80 p-5"
                  >
                    <p className="text-xl font-extrabold text-[#303957]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs text-[#697493]">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-sm leading-7 text-[#697493]">
                While we take all reasonable steps to protect your data, no
                method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section
              id="sharing"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading
                number="05"
                title="Data Sharing & Disclosure"
                description="We may share your information only in the following circumstances."
              />
              <div className="overflow-x-auto rounded-2xl border border-white bg-white/50">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead className="bg-gradient-to-r from-blue-100/70 via-cyan-50/80 to-violet-100/70">
                    <tr>
                      <th className="px-4 py-4 font-bold text-[#171a35]">Scenario</th>
                      <th className="px-4 py-4 font-bold text-[#171a35]">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white">
                    {sharingItems.map((item) => (
                      <tr key={item.scenario}>
                        <td className="px-4 py-4 align-top font-semibold text-[#303957]">
                          {item.scenario}
                        </td>
                        <td className="px-4 py-4 leading-7 text-[#485477]">
                          {item.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-5 rounded-2xl border border-white bg-white/60 p-5 text-sm leading-7 text-[#485477]">
                We never sell, rent, or trade your personal information to
                advertisers or data brokers.
              </p>
            </section>

            <section
              id="retention"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading number="06" title="Data Retention" />
              <ul className="space-y-4">
                {[
                  "Your data is retained for as long as your account is active.",
                  "If you delete your account, your personal data will be permanently deleted within 30 days.",
                  "Anonymized, aggregated data that is not linked to you may be retained for analytical purposes.",
                  "Local device data is deleted when you uninstall the App or clear app storage.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-7 text-[#485477]">
                    <CheckCircle2 size={18} className="mt-1 shrink-0 text-[#6384f8]" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section
              id="rights"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading
                number="07"
                title="Your Rights"
                description="Depending on your location, you may have the following rights regarding your personal information."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {rightsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-white bg-white/60 p-5"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 via-cyan-50 to-violet-100">
                        <Icon size={19} className="text-[#405ec8]" />
                      </div>
                      <h3 className="mt-3 font-bold text-[#171a35]">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#485477]">
                        {item.description}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-sm leading-7 text-[#485477]">
                To exercise any of these rights, contact us at{" "}
                <a
                  href="mailto:privacy@poultrypilot.com"
                  className="font-semibold text-[#405ec8] underline underline-offset-4"
                >
                  privacy@poultrypilot.com
                </a>
                .
              </p>
            </section>

            <section
              id="children"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading number="08" title="Children's Privacy" />
              <p className="text-sm leading-8 text-[#485477] sm:text-base">
                PoultryPilot is not directed at children under the age of 13.
                We do not knowingly collect personal information from children.
                If you believe a child has provided us with personal data,
                please contact us immediately.
              </p>
            </section>

            <section
              id="third-party"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading
                number="09"
                title="Third-Party Services"
                description="The App integrates with the following services. Each has its own privacy policies and data practices."
              />
              <div className="overflow-x-auto rounded-2xl border border-white bg-white/50">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-gradient-to-r from-blue-100/70 via-cyan-50/80 to-violet-100/70">
                    <tr>
                      <th className="px-4 py-4 font-bold text-[#171a35]">Service</th>
                      <th className="px-4 py-4 font-bold text-[#171a35]">Purpose</th>
                      <th className="px-4 py-4 font-bold text-[#171a35]">Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white">
                    {thirdPartyItems.map((item) => (
                      <tr key={item.service}>
                        <td className="px-4 py-4 font-semibold text-[#303957]">
                          {item.service}
                        </td>
                        <td className="px-4 py-4 text-[#485477]">{item.purpose}</td>
                        <td className="px-4 py-4">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#405ec8] hover:underline"
                          >
                            View policy <ExternalLink size={13} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm leading-7 text-[#485477]">
                We encourage you to review the applicable third-party privacy
                policies to understand their data practices.
              </p>
            </section>

            <section
              id="changes"
              className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
            >
              <SectionHeading number="10" title="Changes to This Privacy Policy" />
              <p className="text-sm leading-8 text-[#485477] sm:text-base">
                We may update this Privacy Policy from time to time. We will
                notify you of significant changes via:
              </p>
              <ul className="mt-5 space-y-4">
                {[
                  { icon: Bell, text: "A push notification in the App" },
                  { icon: FileText, text: "A notice on the login screen" },
                  { icon: Mail, text: "An email to your registered address" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.text} className="flex items-center gap-3 text-sm text-[#485477]">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white bg-gradient-to-br from-blue-100 via-cyan-50 to-violet-100">
                        <Icon size={17} className="text-[#405ec8]" />
                      </span>
                      {item.text}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-5 text-sm leading-7 text-[#485477]">
                Continued use of the App after changes constitutes acceptance
                of the updated policy, to the extent permitted by applicable law.
              </p>
            </section>

            <section
              id="contact"
              className="scroll-mt-28 overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br from-[#202746] via-[#30395f] to-[#4c5180] p-7 shadow-[0_12px_35px_rgba(36,43,82,0.12)] sm:p-10"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white">
                  <Mail size={25} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                    Section 11
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                    Contact Us
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                    If you have any questions or concerns about this Privacy
                    Policy or how we handle your personal information, please
                    contact our privacy team.
                  </p>
                  <a
                    href="mailto:privacy@poultrypilot.com"
                    className="mt-6 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 font-semibold text-[#202746] transition hover:bg-blue-50"
                  >
                    <Mail size={17} />
                    privacy@poultrypilot.com
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </section>

            <p className="px-3 py-2 text-center text-xs leading-6 text-[#697493]">
              PoultryPilot · Privacy Policy · We respect your data and your trust.
            </p>
          </div>
        </div>
      </main>

     
<footer className="border-t border-white/80 bg-white/45 backdrop-blur-xl">
  <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10">
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

      {/* Brand */}
      <a
        href="/"
        className="group flex items-center justify-center gap-3 md:justify-start"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6384f8] via-[#648de9] to-[#9274e8] text-sm font-extrabold text-white shadow-md shadow-indigo-200/50 transition-transform duration-300 group-hover:scale-105">
          PP
        </span>

        <span className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-[#171a35]">
            PoultryPilot
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#697493]">
            Smarter poultry farming
          </span>
        </span>
      </a>

      {/* Legal Links */}
      <nav
        aria-label="Legal links"
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3"
      >
        <a
          href="/privacy-policy"
          className="text-sm font-medium text-[#485477] transition-colors duration-200 hover:text-[#6384f8]"
        >
          Privacy Policy
        </a>

        <span className="hidden h-4 w-px bg-[#d9deed] sm:block" />

        <a
          href="/terms-and-conditions"
          className="text-sm font-medium text-[#485477] transition-colors duration-200 hover:text-[#6384f8]"
        >
          Terms &amp; Conditions
        </a>

        <span className="hidden h-4 w-px bg-[#d9deed] sm:block" />

        <a
          href="mailto:support@poultrypilot.com"
          className="text-sm font-medium text-[#485477] transition-colors duration-200 hover:text-[#6384f8]"
        >
          Contact Support
        </a>
      </nav>
    </div>

    {/* Bottom Bar */}
    <div className="mt-7 border-t border-[#dfe4f1]/80 pt-5">
      <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <p className="text-xs leading-6 text-[#697493]">
          © {new Date().getFullYear()} PoultryPilot Technologies. All rights reserved.
        </p>

        <p className="text-xs text-[#697493]">
          Built for healthier flocks and smarter farms.
        </p>
      </div>
    </div>
  </div>
</footer>

    </div>
  );
}
