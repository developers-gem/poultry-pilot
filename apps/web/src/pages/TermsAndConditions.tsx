
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  UserRound,
  LockKeyhole,
  CircleCheck,
  CircleX,
  CreditCard,
  Database,
  Copyright,
  AlertTriangle,
  Scale,
  Handshake,
  ExternalLink,
  RefreshCw,
  Ban,
  Gavel,
  Mail,
  Menu,
  X,
  ChevronRight,
  Leaf,
  Bell,
} from "lucide-react";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms", icon: FileText },
  { id: "service", title: "Description of Service", icon: Leaf },
  { id: "accounts", title: "User Accounts", icon: UserRound },
  { id: "acceptable-use", title: "Acceptable Use", icon: ShieldCheck },
  { id: "subscriptions", title: "Subscriptions & Payments", icon: CreditCard },
  { id: "data", title: "Data & Content", icon: Database },
  { id: "intellectual-property", title: "Intellectual Property", icon: Copyright },
  { id: "disclaimers", title: "Disclaimers", icon: AlertTriangle },
  { id: "liability", title: "Limitation of Liability", icon: Scale },
  { id: "indemnification", title: "Indemnification", icon: Handshake },
  { id: "third-party", title: "Third-Party Services", icon: ExternalLink },
  { id: "updates", title: "App Updates", icon: RefreshCw },
  { id: "termination", title: "Termination", icon: Ban },
  { id: "governing-law", title: "Governing Law", icon: Gavel },
  { id: "changes", title: "Changes to These Terms", icon: Bell },
  { id: "contact", title: "Contact Us", icon: Mail },
];

const services = [
  "Record and track daily flock data, including mortality, feed, water, eggs, and weight.",
  "Manage multiple flocks and farm houses.",
  "Monitor farm performance through dashboards and reports.",
  "Sync data across devices.",
  "Receive health alerts and task reminders.",
  "Manage farm operations, inventory, and finances.",
];

const prohibitedActivities = [
  "Use the App for any illegal or unauthorized purpose.",
  "Attempt to gain unauthorized access to our systems or another user's account.",
  "Upload malicious code, viruses, or harmful software.",
  "Reverse engineer, decompile, or disassemble the App.",
  "Use the App to transmit spam, unsolicited messages, or harmful content.",
  "Impersonate any person or entity.",
  "Collect or harvest other users' data without consent.",
  "Use the App in a way that could damage, disable, or overburden our infrastructure.",
  "Resell, sublicense, or redistribute the App or its data.",
  "Remove or alter copyright, trademark, or proprietary notices.",
];

const dataSharingNote =
  "You retain full ownership of all data you enter into PoultryPilot. By using the App, you grant us a limited license to store, process, and display your data for the purpose of providing the Service.";

const sectionsContent = [
  {
    id: "acceptance",
    number: "01",
    title: "Acceptance of Terms",
    content: (
      <>
        <p>
          By downloading, installing, or using the PoultryPilot mobile
          application, you agree to be bound by these Terms and Conditions
          (&quot;Terms&quot;). If you do not agree to these Terms, do not use
          the App.
        </p>
        <p>
          These Terms constitute a legally binding agreement between you
          (&quot;User&quot;, &quot;you&quot;) and PoultryPilot Technologies
          (&quot;Company&quot;, &quot;we&quot;, or &quot;us&quot;).
        </p>
      </>
    ),
  },
  {
    id: "service",
    number: "02",
    title: "Description of Service",
    content: (
      <>
        <p>
          PoultryPilot is a farm management application designed to help
          poultry farmers manage their operations, monitor production, and
          maintain farm records.
        </p>
        <p className="mt-4 font-semibold text-[#303957]">
          The App may provide the following features:
        </p>
        <CheckList items={services} />
      </>
    ),
  },
  {
    id: "accounts",
    number: "03",
    title: "User Accounts",
    content: (
      <>
        <Subheading>3.1 Registration</Subheading>
        <CheckList
          items={[
            "You must create an account to use PoultryPilot.",
            "You must provide accurate, complete, and current information during registration.",
            "You must be at least 18 years of age to create an account.",
          ]}
        />

        <Subheading>3.2 Account Security</Subheading>
        <CheckList
          items={[
            "You are responsible for maintaining the confidentiality of your login credentials.",
            "You are responsible for all activity that occurs under your account.",
            <>
              You must notify us immediately at{" "}
              <EmailLink email="support@poultrypilot.com" /> if you suspect
              unauthorized use of your account.
            </>,
            "We are not liable for losses resulting from unauthorized account access caused by your failure to secure your credentials, to the extent permitted by applicable law.",
          ]}
        />

        <Subheading>3.3 Account Termination</Subheading>
        <CheckList
          items={[
            "You may delete your account at any time through the App settings, where the feature is available.",
            "We reserve the right to suspend or terminate your account if you violate these Terms.",
          ]}
        />
      </>
    ),
  },
  {
    id: "acceptable-use",
    number: "04",
    title: "Acceptable Use",
    content: (
      <>
        <Subheading>4.1 Permitted Use</Subheading>
        <p>
          You may use PoultryPilot only for lawful purposes related to poultry
          farm management and in accordance with these Terms.
        </p>

        <Subheading>4.2 Prohibited Activities</Subheading>
        <p>You must not engage in any of the following activities:</p>

        <div className="mt-4 space-y-3">
          {prohibitedActivities.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CircleX
                size={18}
                className="mt-0.5 shrink-0 text-rose-500"
              />
              <p>{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={21}
              className="mt-0.5 shrink-0 text-rose-600"
            />
            <p className="font-medium text-rose-900">
              Violations may result in suspension or termination of your
              account and, where appropriate, legal action.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "subscriptions",
    number: "05",
    title: "Subscription & Payments",
    content: (
      <>
        <Subheading>5.1 Free & Paid Plans</Subheading>
        <p>
          PoultryPilot may offer both free and paid subscription tiers.
          Features available under each tier will be clearly disclosed in
          the App.
        </p>

        <Subheading>5.2 Billing</Subheading>
        <CheckList
          items={[
            "Paid subscriptions are billed monthly or annually, depending on the plan selected.",
            "Charges are made in the currency displayed at the time of purchase.",
            "Payments are non-refundable except as required by applicable law or the applicable purchase terms.",
            "Prices may change with 30 days' prior notice.",
          ]}
        />

        <Subheading>5.3 Cancellation</Subheading>
        <CheckList
          items={[
            "You may cancel your subscription through the App, where supported, or through your device's app store account, as applicable.",
            "Cancellation generally takes effect at the end of the current billing period.",
            "You will not receive a prorated refund for unused time except as required by applicable law or the applicable purchase terms.",
          ]}
        />
      </>
    ),
  },
  {
    id: "data",
    number: "06",
    title: "Data & Content",
    content: (
      <>
        <Subheading>6.1 Your Data</Subheading>
        <p>{dataSharingNote}</p>

        <Subheading>6.2 Data Accuracy</Subheading>
        <p>
          You are responsible for the accuracy of the data you enter.
          PoultryPilot's reports and insights are based on the information you
          provide. We are not responsible for decisions made based on
          inaccurate or incomplete input data, to the extent permitted by
          applicable law.
        </p>

        <Subheading>6.3 Data Backup</Subheading>
        <p>
          Although we take measures to back up your data, we recommend
          maintaining your own records and backups. We are not liable for
          data loss resulting from technical failures beyond our reasonable
          control, subject to applicable law.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    number: "07",
    title: "Intellectual Property",
    content: (
      <>
        <p>
          The App, including its design, code, logos, content, and features,
          is the intellectual property of PoultryPilot Technologies and is
          protected by copyright, trademark, and other intellectual property
          laws.
        </p>
        <p>
          You may not copy, modify, distribute, or create derivative works
          of the App without our written permission, except where permitted
          by applicable law.
        </p>
        <p>
          The PoultryPilot name, logo, and branding are trademarks of
          PoultryPilot Technologies. Nothing in these Terms grants you
          ownership of our intellectual property.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    number: "08",
    title: "Disclaimers",
    content: (
      <>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={24}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div>
              <p className="font-bold uppercase tracking-wide text-amber-900">
                Important Notice
              </p>
              <p className="mt-2 leading-7 text-amber-950">
                The App is provided on an &quot;AS IS&quot; and
                &quot;AS AVAILABLE&quot; basis without warranties of any kind,
                express or implied, to the extent permitted by applicable law.
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5">
          To the extent permitted by applicable law, we do not warrant that:
        </p>
        <CheckList
          items={[
            "The App will always be available, uninterrupted, or error-free.",
            "The data, reports, and insights will be completely accurate or suitable for any specific purpose.",
            "Any defects or errors will be corrected immediately.",
            "The App will be free from viruses or other harmful components.",
          ]}
        />

        <div className="mt-5 rounded-2xl border border-white bg-gradient-to-r from-blue-50 via-cyan-50 to-violet-50 p-5">
          <h3 className="font-bold text-[#171a35]">
            Agricultural Advisory Disclaimer
          </h3>
          <p className="mt-2">
            PoultryPilot is a data management tool. It does not replace
            professional veterinary advice, diagnosis, or treatment. Always
            consult a licensed veterinarian for animal health decisions.
          </p>
        </div>
      </>
    ),
  },
  {
    id: "liability",
    number: "09",
    title: "Limitation of Liability",
    content: (
      <>
        <p>
          To the maximum extent permitted by applicable law, PoultryPilot
          Technologies shall not be liable for indirect, incidental, special,
          consequential, or punitive damages.
        </p>
        <p>
          This includes loss of profits, data, goodwill, or other intangible
          losses, even if we have been advised of the possibility of such
          damages.
        </p>
        <p>
          To the maximum extent permitted by applicable law, our total
          liability for any claim arising from or related to your use of the
          App shall not exceed the amount you paid us in the 12 months
          preceding the event giving rise to the claim.
        </p>
        <p className="text-xs text-[#697493]">
          Nothing in these Terms excludes or limits liability that cannot
          lawfully be excluded or limited.
        </p>
      </>
    ),
  },
  {
    id: "indemnification",
    number: "10",
    title: "Indemnification",
    content: (
      <>
        <p>
          To the extent permitted by applicable law, you agree to indemnify
          and hold harmless PoultryPilot Technologies, its directors,
          employees, and partners from claims, damages, liabilities, and
          expenses, including reasonable legal fees, arising out of:
        </p>
        <CheckList
          items={[
            "Your use of the App.",
            "Your violation of these Terms.",
            "Your violation of any third-party rights.",
            "Any data or content you submit that causes harm or gives rise to a claim.",
          ]}
        />
      </>
    ),
  },
  {
    id: "third-party",
    number: "11",
    title: "Third-Party Links & Services",
    content: (
      <>
        <p>
          The App may contain links to or integrations with third-party
          services. These services may operate under their own terms,
          policies, and data practices.
        </p>
        <p>
          We do not control and are not responsible for third-party content,
          availability, privacy practices, or terms. Your use of third-party
          services is subject to the applicable third party's terms and
          policies.
        </p>
      </>
    ),
  },
  {
    id: "updates",
    number: "12",
    title: "Updates to the App",
    content: (
      <>
        <p>
          We may release updates, patches, or new versions of the App at any
          time. Some updates may be required for continued use of the Service.
        </p>
        <p>
          We reserve the right to add, modify, suspend, or discontinue
          features with reasonable notice where practicable and as required
          by applicable law.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    number: "13",
    title: "Termination",
    content: (
      <>
        <p>
          We may suspend or terminate your access to the App if we reasonably
          believe you have violated these Terms, or where suspension or
          termination is otherwise permitted by applicable law.
        </p>
        <p>
          Where appropriate or legally required, we will provide notice or an
          opportunity to address the issue before termination.
        </p>
        <p>
          Upon termination, your right to use the App ceases. Provisions that
          by their nature should survive termination, including intellectual
          property, disclaimers, limitation of liability, and indemnification,
          will survive to the extent applicable.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    number: "14",
    title: "Governing Law & Dispute Resolution",
    content: (
      <>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
          <p className="font-semibold text-amber-900">
            Jurisdiction details need to be completed before publication.
          </p>
          <p className="mt-2 text-sm leading-7 text-amber-900">
            Replace the bracketed placeholders below with the applicable
            country, state, and jurisdiction after obtaining appropriate
            legal advice.
          </p>
        </div>

        <p className="mt-5">
          These Terms shall be governed by and construed in accordance with
          the laws of [Your Country/State], without regard to conflict of law
          principles.
        </p>
        <p>
          Any disputes arising from these Terms or your use of the App shall
          first be addressed through good-faith negotiation.
        </p>
        <p>
          If a dispute remains unresolved, it shall be submitted to binding
          arbitration in [Your Jurisdiction], except where arbitration is
          prohibited by applicable law.
        </p>
        <p>
          Any waiver of the right to participate in a class-action lawsuit
          applies only to the extent permitted by applicable law.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    number: "15",
    title: "Changes to These Terms",
    content: (
      <>
        <p>
          We reserve the right to update these Terms from time to time. We
          will notify you of material changes through the App or by email,
          ordinarily at least 14 days before they take effect, unless a
          different period is required or permitted by applicable law.
        </p>
        <p>
          Continued use of the App after revised Terms take effect constitutes
          acceptance of the revised Terms where legally permitted.
        </p>
        <p>
          If you do not agree to the revised Terms, you must stop using the
          App and may delete your account through the available account
          settings.
        </p>
      </>
    ),
  },
];

function EmailLink({ email }: { email: string }) {
  return (
    <a
      href={`mailto:${email}`}
      className="font-semibold text-[#405ec8] underline decoration-[#a9b9ff] underline-offset-4 hover:text-[#171a35]"
    >
      {email}
    </a>
  );
}

function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 mt-6 text-base font-bold text-[#303957] first:mt-0">
      {children}
    </h3>
  );
}

function CheckList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3">
          <CircleCheck
            size={18}
            className="mt-1 shrink-0 text-[#6384f8]"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

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

export default function TermsAndConditions() {
  const [activeSection, setActiveSection] = useState("acceptance");
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
                className="text-sm font-medium text-[#485477] hover:text-[#171a35]"
              >
                Home
              </a>
              <a
                href="/privacy-policy"
                className="text-sm font-medium text-[#485477] hover:text-[#171a35]"
              >
                Privacy Policy
              </a>
              <a
                href="/terms-and-conditions"
                className="text-sm font-semibold text-[#171a35]"
              >
                Terms & Conditions
              </a>
              <a
                href="/auth"
                className="rounded-full bg-[#171a35] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#303657]"
              >
                Sign in
              </a>
            </nav>

            <div className="flex items-center gap-2 md:hidden">
              <a
                href="/auth"
                className="rounded-full bg-[#171a35] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Sign in
              </a>
              <button
                type="button"
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
                className="rounded-full border border-white bg-white/80 p-2.5 text-[#171a35]"
              >
                {menuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <nav className="border-t border-white/80 p-3 md:hidden">
              <a href="/" className="block rounded-xl px-4 py-3 text-sm hover:bg-white/70">
                Home
              </a>
              <a href="/privacy-policy" className="block rounded-xl px-4 py-3 text-sm hover:bg-white/70">
                Privacy Policy
              </a>
              <a href="/terms-and-conditions" className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-white/70">
                Terms & Conditions
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
              <Scale size={15} className="text-[#6384f8]" />
              Terms of service
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] text-[#171a35] sm:text-5xl lg:text-7xl">
              Clear terms.
              <br />
              <span className="bg-gradient-to-r from-[#5678ef] via-[#5c86d9] to-[#9274e8] bg-clip-text text-transparent">
                Better farming.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#485477] sm:text-lg">
              These Terms explain the rules for using PoultryPilot, your
              responsibilities as a user, and the terms that apply to our
              farm management services.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/60 px-4 py-2.5 text-sm font-medium text-[#303957]">
                <FileText size={16} className="text-[#6384f8]" />
                16 sections
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/60 px-4 py-2.5 text-sm font-medium text-[#303957]">
                <ShieldCheck size={16} className="text-[#6384f8]" />
                User responsibilities
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/90 bg-white/60 px-4 py-2.5 text-sm font-medium text-[#303957]">
                <LockKeyhole size={16} className="text-[#6384f8]" />
                Account & data
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: UserRound,
                title: "Your account",
                text: "Understand account security, eligibility, and your responsibilities.",
              },
              {
                icon: Database,
                title: "Your farm data",
                text: "Learn about data ownership, accuracy, and backups.",
              },
              {
                icon: Scale,
                title: "Fair use",
                text: "Review subscriptions, acceptable use, and service limitations.",
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

      {/* Terms content */}
      <main className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-8">
        <div className="grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
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
                  Questions about these terms?
                </p>
                <p className="mt-1 text-xs leading-6 text-[#485477]">
                  Contact our support team for assistance.
                </p>
                <a
                  href="mailto:support@poultrypilot.com"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#405ec8] hover:underline"
                >
                  Contact support <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-6">
            {sectionsContent.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28 rounded-[26px] border border-white/95 bg-white/65 p-6 shadow-[0_5px_25px_rgba(48,58,100,0.035)] sm:p-8"
              >
                <SectionHeading
                  number={section.number}
                  title={section.title}
                />
                <div className="space-y-4 text-sm leading-8 text-[#485477] sm:text-base">
                  {section.content}
                </div>
              </section>
            ))}

            {/* Section 16 */}
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
                    Section 16
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                    Contact Us
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
                    For questions, concerns, or notices regarding these Terms
                    and Conditions, please contact PoultryPilot Technologies.
                  </p>
                  <a
                    href="mailto:support@poultrypilot.com"
                    className="mt-6 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 font-semibold text-[#202746] transition hover:bg-blue-50"
                  >
                    <Mail size={17} />
                    support@poultrypilot.com
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </div>
            </section>

            <p className="px-3 py-2 text-center text-xs leading-6 text-[#697493]">
              PoultryPilot · Terms & Conditions · Please review these terms
              periodically for updates.
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
