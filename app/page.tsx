/* eslint-disable */
"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ExternalLink,
  FileText,
  Gavel,
  Lock,
  MessageCircle,
  Mic,
  MonitorSmartphone,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import FesteazyLogo from "@/components/FesteazyLogo";

const WHATSAPP_NUMBER = "971552957607";

type FaqItem = {
  question: string;
  answer: string;
};

const tickerItems = [
  "Quran Recitation — result published live",
  "Speech Malayalam — marks calculated automatically",
  "Team championship points updated instantly",
  "Result posters ready to share on WhatsApp",
  "Mobile judge mark entry without Excel",
  "Live public portal for parents and students",
];

const features = [
  {
    title: "Students and teams",
    description:
      "Bulk import, chest numbers, team assignment, categories and class grouping.",
    icon: Users,
  },
  {
    title: "Programme builder",
    description:
      "Create individual or group items, stage or off-stage programmes, points and grades.",
    icon: Mic,
  },
  {
    title: "Mobile mark entry",
    description:
      "Judges can enter marks directly from phone without paper sheets or Excel.",
    icon: Gavel,
  },
  {
    title: "Auto results",
    description:
      "Positions, grades, points and team standings are calculated automatically.",
    icon: Trophy,
  },
  {
    title: "Live public portal",
    description:
      "Parents and participants can follow results from a clean mobile-friendly link.",
    icon: MonitorSmartphone,
  },
  {
    title: "Reports and exports",
    description:
      "Generate call lists, valuation sheets, winners list, result reports and CSV exports.",
    icon: FileText,
  },
  {
    title: "Role-based access",
    description:
      "Super admin, madrasa admin, staff and judges get separate controlled access.",
    icon: Lock,
  },
  {
    title: "Multi-institution",
    description:
      "Manage many madrasas or schools from one Super Admin panel with separate data.",
    icon: Building2,
  },
];

const steps = [
  {
    number: "01",
    title: "Create institution",
    description:
      "Super Admin creates the madrasa or school and gives a clean public URL.",
  },
  {
    number: "02",
    title: "Add event data",
    description:
      "Add teams, categories, students, programmes, participants and judges.",
  },
  {
    number: "03",
    title: "Enter marks",
    description:
      "Judges or admins enter marks. Festeazy calculates results and points.",
  },
  {
    number: "04",
    title: "Publish live",
    description:
      "Publish results to the public portal and share posters or links instantly.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "Can I run multiple madrasas or events?",
    answer:
      "Yes. Festeazy is built for multiple institutions. Each institution gets its own public URL and separate admin access.",
  },
  {
    question: "Do judges need to install an app?",
    answer:
      "No. Judges can use the browser on any mobile phone. No app installation is required.",
  },
  {
    question: "How fast can we go live?",
    answer:
      "Once the institution and admin login are created, you can start adding data immediately. A basic event can be prepared the same day.",
  },
  {
    question: "Can parents see live results?",
    answer:
      "Yes. Every public event gets a mobile-friendly public portal where results, points, gallery and posters can be shown.",
  },
  {
    question: "What happens when the plan expires?",
    answer:
      "The Super Admin can control plan expiry. Expired or inactive institutions can be blocked from admin and public access.",
  },
  {
    question: "Is each institution data private?",
    answer:
      "Yes. Admins are linked to their own institution, and the database rules keep each institution’s data separate.",
  },
];

function getWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f7ff] text-[#0d0a1e]">
      <style jsx global>{`
        @keyframes festeazyTicker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .festeazy-ticker-track {
          animation: festeazyTicker 32s linear infinite;
        }

        .festeazy-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <header className="sticky top-0 z-50 border-b border-violet-100/80 bg-[#f8f7ff]/95 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <FesteazyLogo />

          <nav className="hidden items-center gap-7 text-sm font-black text-slate-600 lg:flex">
            <a href="#features" className="transition hover:text-violet-700">
              Features
            </a>
            <a href="#how" className="transition hover:text-violet-700">
              How it works
            </a>
            <a href="#pricing" className="transition hover:text-violet-700">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-violet-700">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">

            <a
              href={getWhatsAppUrl(
                "Assalamu Alaikum, I want to set up Festeazy for my event.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700"
            >
              <MessageCircle size={17} />
              <span className="hidden sm:inline">Get started</span>
            </a>
          </div>
        </div>
      </header>

      <div className="relative h-8 overflow-hidden bg-violet-600">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-violet-600 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-violet-600 to-transparent" />

        <div className="festeazy-ticker-track flex h-full w-max items-center gap-8 whitespace-nowrap text-xs font-bold text-white/85">
          {[0, 1].map((group) => (
            <div key={group} className="flex h-full shrink-0 items-center gap-8">
              {tickerItems.map((item) => (
                <TickerItem key={`${group}-${item}`} text={item} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="relative border-b border-violet-100 px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(91,78,248,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-violet-300/25 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-violet-700">
            <Sparkles size={15} />
            For madrasa fests, school competitions and cultural events
          </div>

          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.08em] text-slate-950 sm:text-7xl lg:text-8xl">
            Run your <span className="text-violet-600">fest</span>, the{" "}
            <span className="text-orange-500">easy</span> way.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
            Make your fest easy with our tool. Manage students, programmes,
            judges, marks, live results, reports, posters and public portals
            from one clean dashboard.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={getWhatsAppUrl(
                "I want to start my fest with Festeazy. What details do you need?",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-7 py-4 text-sm font-black text-white shadow-xl shadow-violet-900/20 transition hover:scale-[1.01] hover:bg-violet-700"
            >
              Start your fest
              <ArrowRight size={18} />
            </a>

            <a
              href={getWhatsAppUrl(
                "Assalamu Alaikum, I want to know Festeazy pricing and setup details.",
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-7 py-4 text-sm font-black text-white shadow-xl shadow-orange-900/20 transition hover:scale-[1.01] hover:bg-orange-600"
            >
              <MessageCircle size={18} />
              Talk to us
            </a>

            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-white px-7 py-4 text-sm font-black text-slate-700 shadow-lg shadow-slate-900/5 transition hover:text-violet-700"
            >
              Institute login
              <ExternalLink size={18} />
            </Link>
          </div>

          <p className="mt-4 text-xs font-bold text-slate-400">
            Free to try · Setup in one day · Works on mobile · No app install
          </p>

          <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat
              label="Students"
              value="248"
              sub="registered"
              icon={<Users size={15} />}
            />
            <HeroStat
              label="Programmes"
              value="32"
              sub="stage & off-stage"
              icon={<Mic size={15} />}
            />
            <HeroStat
              label="Results"
              value="18"
              sub="published live"
              icon={<Trophy size={15} />}
            />
            <HeroStat
              label="Top team"
              value="Furqan"
              sub="42 pts · #1"
              icon={<ShieldCheck size={15} />}
              orange
            />
          </div>
        </div>
      </section>

      <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          label="What's inside"
          title="Everything a fest needs, nothing it doesn't"
          description="From student registration to prize distribution, every tool is built for how real events are managed."
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-[1.4rem] border border-violet-100 bg-white p-5 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <Icon size={22} />
                </div>

                <h3 className="mt-5 text-base font-black tracking-[-0.03em] text-slate-950">
                  {feature.title}
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="how"
        className="border-y border-violet-100 bg-[#f0eeff] px-4 py-16 sm:px-6 lg:px-8"
      >
        <SectionTitle
          label="Process"
          title="Up and running in four steps"
          description="From blank dashboard to a live public result portal, the full process is simple."
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-4 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative rounded-[1.4rem] border border-violet-100 bg-white p-5 shadow-lg shadow-slate-900/5"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-white ${
                  index === 3 ? "bg-orange-500" : "bg-violet-600"
                }`}
              >
                {step.number}
              </div>

              <h3 className="mt-5 text-base font-black tracking-[-0.03em] text-slate-950">
                {step.title}
              </h3>

              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          label="Product preview"
          title="See Festeazy in action"
          description="Admin dashboard, mark entry and live result sharing are designed to work beautifully on mobile."
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
          <DashboardPreview />
          <MarkEntryPreview />
          <ResultPreview />
        </div>
      </section>

      <section
        id="pricing"
        className="border-y border-violet-100 bg-[#f0eeff] px-4 py-16 sm:px-6 lg:px-8"
      >
        <SectionTitle
          label="Pricing"
          title="Transparent pricing, no surprises"
          description="Choose a plan that fits your event. Upgrade anytime when your institution grows."
        />

        <div className="mx-auto mt-10 grid max-w-6xl gap-4 lg:grid-cols-3">
          <PricingCard
            title="Single event"
            description="For one Meelad programme, annual day or cultural event."
            price="₹1,499"
            period="/ 3 months"
            features={[
              "1 institution portal",
              "Unlimited students and programmes",
              "Judge mark entry",
              "Live result page",
              "Reports and poster sharing",
            ]}
            cta="Get this plan"
          />

          <PricingCard
            popular
            title="Full year"
            description="For institutions running several events throughout the year."
            price="₹3,999"
            period="/ 12 months"
            features={[
              "Everything in Single event",
              "Unlimited events all year",
              "Priority WhatsApp support",
              "Custom logo and theme",
              "Early access to new modules",
            ]}
            cta="Most popular plan"
          />

          <PricingCard
            title="Federation / Zone"
            description="For managing many madrasas, units or schools under one umbrella."
            price="Custom"
            period="talk to us"
            features={[
              "Multiple institutions",
              "Super Admin management",
              "Zone-level reporting",
              "Dedicated onboarding",
              "Custom domain support",
            ]}
            cta="Contact us"
          />
        </div>

        <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-3">
          <TrustBadge icon={<ShieldCheck size={15} />} text="Secure data" />
          <TrustBadge icon={<MonitorSmartphone size={15} />} text="Mobile-first" />
          <TrustBadge icon={<RefreshCcw size={15} />} text="No app needed" />
          <TrustBadge icon={<MessageCircle size={15} />} text="WhatsApp support" />
        </div>
      </section>

      <section
        id="faq"
        className="border-y border-violet-100 bg-white px-4 py-16 sm:px-6 lg:px-8"
      >
        <SectionTitle
          label="FAQ"
          title="Common questions"
          description="Quick answers about setup, access, public pages and data safety."
        />

        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <button
                key={faq.question}
                type="button"
                onClick={() => setOpenFaq(isOpen ? -1 : index)}
                className="w-full rounded-[1.3rem] border border-violet-100 bg-[#f8f7ff] p-5 text-left shadow-sm transition hover:border-violet-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-base font-black text-slate-950">
                    {faq.question}
                  </p>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown size={18} />
                  </div>
                </div>

                {isOpen && (
                  <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
                    {faq.answer}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-[#f8f7ff] px-4 py-16 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-violet-600 px-6 py-14 text-center text-white shadow-2xl shadow-violet-900/20 sm:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />

          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
              Get started today
            </p>

            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-black tracking-[-0.06em] sm:text-5xl">
              Your fest deserves better than spreadsheets.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-7 text-white/75">
              Message us on WhatsApp. We can help you create your Festeazy
              portal and prepare your event workflow.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={getWhatsAppUrl(
                  "Assalamu Alaikum, I want to create a Festeazy portal for my institution.",
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-orange-900/20 transition hover:bg-orange-600"
              >
                <MessageCircle size={18} />
                Chat on WhatsApp
              </a>

              <Link
                href="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white/15"
              >
                Institute login
                <ExternalLink size={17} />
              </Link>
            </div>

            <p className="mt-5 text-xs font-bold text-white/45">
              Same-day setup · Free trial · No credit card required
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-[#0d0a1e] px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <FesteazyLogo dark />

          <p className="text-xs font-bold text-white/35">
            © 2026 Festeazy. All rights reserved.
          </p>

          <div className="flex flex-wrap gap-4 text-xs font-bold text-white/45">
            <Link href="/admin" className="hover:text-white">
              Institute login
            </Link>
            <Link href="/super-admin" className="hover:text-white">
              Super Admin
            </Link>
            <a
              href={getWhatsAppUrl("I want to know more about Festeazy.")}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function TickerItem({ text }: { text: string }) {
  return (
    <span className="flex h-full shrink-0 items-center gap-2">
      <Trophy size={14} className="shrink-0" />
      <span>{text}</span>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
    </span>
  );
}

function HeroStat({
  label,
  value,
  sub,
  icon,
  orange = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  orange?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 text-left shadow-xl shadow-slate-900/5">
      <p
        className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] ${
          orange ? "text-orange-500" : "text-violet-600"
        }`}
      >
        {icon}
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-[-0.07em] text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-400">{sub}</p>
    </div>
  );
}

function SectionTitle({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
        {label}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950 sm:text-5xl">
        {title}
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm font-semibold leading-7 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="rounded-[1.7rem] bg-violet-600 p-6 text-white shadow-2xl shadow-violet-900/20">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/50">
        Admin dashboard
      </p>
      <h3 className="mt-3 text-2xl font-black tracking-[-0.05em]">
        Your fest at a glance
      </h3>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniDark label="Students" value="248" />
        <MiniDark label="Published" value="18" />
        <MiniDark label="Programmes" value="32" />
        <MiniDark label="Pending" value="14" />
      </div>

      <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-white/45">
        Team standings
      </p>

      <div className="mt-3 space-y-2">
        <TeamRow rank="#1" team="Furqan" points="42" color="bg-orange-300" />
        <TeamRow rank="#2" team="Hira" points="35" color="bg-violet-300" />
        <TeamRow rank="#3" team="Badr" points="28" color="bg-emerald-300" />
        <TeamRow rank="#4" team="Uhud" points="21" color="bg-blue-300" />
      </div>
    </div>
  );
}

function MarkEntryPreview() {
  return (
    <div className="rounded-[1.7rem] border border-violet-100 bg-white p-6 shadow-xl shadow-slate-900/5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
        Judge mark entry
      </p>
      <h3 className="mt-3 text-xl font-black tracking-[-0.05em] text-slate-950">
        Phone-first scoring
      </h3>

      <div className="mt-5 space-y-2">
        <MarkRow chest="#101" name="Ahmed Sinan" mark="45" />
        <MarkRow chest="#102" name="Fathima N." mark="41" />
        <MarkRow chest="#103" name="M. Adnan" mark="—" />
      </div>

      <button className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white">
        Save marks
      </button>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-3 text-xs font-bold text-violet-700">
        <Lock size={15} />
        2 of 3 judges submitted
      </div>
    </div>
  );
}

function ResultPreview() {
  return (
    <div className="rounded-[1.7rem] border-2 border-orange-100 bg-orange-50 p-6 shadow-xl shadow-orange-900/5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-500">
        Live result poster
      </p>
      <h3 className="mt-3 text-xl font-black tracking-[-0.05em] text-orange-950">
        Share to WhatsApp
      </h3>

      <div className="mt-5 rounded-2xl bg-violet-600 p-4 text-white">
        <p className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-white/50">
          Quran Recitation · LP
        </p>

        <ResultLine rank="1" name="#101 Ahmed Sinan" grade="A+" first />
        <ResultLine rank="2" name="#102 Fathima N." grade="A" />
        <ResultLine rank="3" name="#104 Ayisha Riha" grade="B" />
      </div>

      <p className="mt-4 text-xs font-black text-orange-800">
        festeazy.in/event/demo
      </p>

      <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-black text-white">
        <MessageCircle size={17} />
        Share result
      </button>
    </div>
  );
}

function MiniDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black tracking-[-0.07em]">{value}</p>
    </div>
  );
}

function TeamRow({
  rank,
  team,
  points,
  color,
}: {
  rank: string;
  team: string;
  points: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2">
      <span className="text-xs font-black text-white/40">{rank}</span>
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="flex-1 text-sm font-black text-white/85">{team}</span>
      <span className="text-sm font-black">{points}</span>
    </div>
  );
}

function MarkRow({
  chest,
  name,
  mark,
}: {
  chest: string;
  name: string;
  mark: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-violet-100 bg-[#f8f7ff] px-3 py-3">
      <div>
        <span className="text-xs font-black text-violet-700">{chest}</span>
        <span className="ml-2 text-sm font-black text-slate-800">{name}</span>
      </div>

      <div className="flex h-9 w-12 items-center justify-center rounded-lg border border-violet-200 bg-white text-sm font-black text-violet-700">
        {mark}
      </div>
    </div>
  );
}

function ResultLine({
  rank,
  name,
  grade,
  first = false,
}: {
  rank: string;
  name: string;
  grade: string;
  first?: boolean;
}) {
  return (
    <div
      className={`mt-2 flex items-center gap-2 rounded-xl px-3 py-2 ${
        first ? "bg-white text-orange-950" : "bg-white/10 text-white"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
          first ? "bg-orange-500 text-white" : "bg-white/20 text-white"
        }`}
      >
        {rank}
      </span>

      <span className="flex-1 text-xs font-black">{name}</span>

      <span
        className={`rounded-md px-2 py-1 text-[10px] font-black ${
          first ? "bg-orange-50 text-orange-600" : "bg-white/20 text-white"
        }`}
      >
        {grade}
      </span>
    </div>
  );
}

function PricingCard({
  title,
  description,
  price,
  period,
  features,
  cta,
  popular = false,
}: {
  title: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  popular?: boolean;
}) {
  return (
    <div
      className={`relative rounded-[1.7rem] p-6 shadow-xl ${
        popular
          ? "bg-violet-600 text-white shadow-violet-900/20"
          : "border border-violet-100 bg-white text-slate-950 shadow-slate-900/5"
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-white">
          Most popular
        </div>
      )}

      <h3 className="text-2xl font-black tracking-[-0.05em]">{title}</h3>

      <p
        className={`mt-2 text-sm font-semibold leading-6 ${
          popular ? "text-white/70" : "text-slate-500"
        }`}
      >
        {description}
      </p>

      <div className="mt-6 flex items-end gap-2">
        <span className="text-4xl font-black tracking-[-0.07em]">{price}</span>
        <span
          className={`pb-1 text-sm font-bold ${
            popular ? "text-white/50" : "text-slate-400"
          }`}
        >
          {period}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {features.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <Check
              size={16}
              className={
                popular ? "mt-0.5 text-white/70" : "mt-0.5 text-violet-600"
              }
            />
            <p
              className={`text-sm font-semibold leading-6 ${
                popular ? "text-white/85" : "text-slate-600"
              }`}
            >
              {item}
            </p>
          </div>
        ))}
      </div>

      <a
        href={getWhatsAppUrl(`I am interested in Festeazy ${title} plan.`)}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-7 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-black ${
          popular
            ? "bg-orange-500 text-white hover:bg-orange-600"
            : "bg-violet-50 text-violet-700 hover:bg-violet-100"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm">
      <span className="text-violet-600">{icon}</span>
      {text}
    </div>
  );
}