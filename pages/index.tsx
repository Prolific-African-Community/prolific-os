"use client";

import Head from "next/head";
import { FormEvent, HTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";

/* ------------------ Utils ------------------ */
type ClassValue = string | false | null | undefined;
const cn = (...c: ClassValue[]) => c.filter(Boolean).join(" ");

/* ------------------ Design tokens ------------------ */
const PAGE_BG = "bg-[#ececf1]";
const SECTION_BG_LIGHT = "bg-white";
const CONTAINER = "mx-auto w-full max-w-7xl px-6";
const SECTION_Y = "py-20 md:py-28";
const CARD =
  "rounded-[2rem] border border-black/10 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]";
const MUTED_CARD =
  "rounded-[2rem] border border-black/5 bg-[#f7f7f9] shadow-[0_14px_35px_rgba(15,23,42,0.04)]";
const BTN_BLUE =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-6 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(59,130,246,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-[0_18px_42px_rgba(59,130,246,0.28)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20";
const BTN_DARK =
  "group inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-[0_18px_42px_rgba(15,23,42,0.24)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-black/10";
const BTN_OUTLINE =
  "group inline-flex items-center justify-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2.5 text-xs font-black text-black no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black hover:bg-black hover:text-white hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15";
const BADGE =
  "inline-flex rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-blue-500 shadow-sm";
const H2 =
  "text-[2.4rem] font-black leading-[0.98] tracking-[-0.06em] md:text-[4rem]";
const PARAGRAPH = "text-sm font-semibold leading-7 text-black/60 md:text-base";

/* ------------------ Data ------------------ */

const SERVICE_PROOF_POINTS = [
  "Company formation",
  "Accounting & tax compliance",
  "Banking assistance",
  "Investor reporting",
] as const;

const SERVICES = [
  {
    title: "Company Formation",
    description:
      "Support for Luxembourg companies, holdings, SPVs and investment vehicles.",
  },
  {
    title: "Banking Assistance",
    description:
      "Preparation and coordination of bank account opening files with Luxembourg and international banking partners.",
  },
  {
    title: "Accounting & Tax",
    description:
      "Bookkeeping, VAT, annual accounts, tax compliance and audit-ready financial records.",
  },
  {
    title: "Holding & SPV Administration",
    description:
      "Administration of participations, capital movements, shareholder records, distributions and investment flows.",
  },
  {
    title: "Investor Reporting",
    description:
      "Clear reporting for investors, shareholders and stakeholders, including statements, documents and performance views.",
  },
  {
    title: "Family Office Support",
    description:
      "Structured financial oversight for families managing companies, assets and private investments.",
  },
];

type FeatureCardType = "structure" | "flow" | "documents";

type FeatureCard = {
  title: string;
  description: string;
  visual: FeatureCardType;
};

const FEATURE_CARDS: FeatureCard[] = [
  {
    title: "Entity Dashboard",
    description:
      "View companies, holdings, SPVs and key financial indicators from one controlled interface.",
    visual: "structure",
  },
  {
    title: "Secure Document Room",
    description:
      "Centralize statements, agreements, reports, notices and compliance documents.",
    visual: "documents",
  },
  {
    title: "Investor Access",
    description:
      "Give investors and shareholders structured access to relevant reports and documents.",
    visual: "flow",
  },
  {
    title: "Accounting Visibility",
    description:
      "Track accounting status, reporting deadlines, open items and period-close progress.",
    visual: "structure",
  },
  {
    title: "Audit Trail",
    description:
      "Maintain traceable records of uploads, approvals, financial movements and key actions.",
    visual: "documents",
  },
  {
    title: "Workflow Controls",
    description:
      "Structure approvals, document requests and recurring administrative tasks.",
    visual: "flow",
  },
];

const DISTINCTIVE_FEATURES = [
  {
    title: "Secure client portal",
    description: "Centralized access to entities, reports, documents and key financial information.",
    icon: "lock",
  },
  {
    title: "Accounting visibility",
    description: "Track reporting status, deadlines, open items and period-close progress.",
    icon: "ledger",
  },
  {
    title: "Structured reporting",
    description: "Investor-ready reports built from organized financial and operational data.",
    icon: "report",
  },
  {
    title: "Controlled workflows",
    description: "Traceable approvals, document requests and administrative actions.",
    icon: "shield",
  },
] as const;

const LUXEMBOURG_REASONS = [
  {
    title: "Credibility",
    description:
      "An internationally recognized jurisdiction for serious businesses, investors and private wealth structures.",
  },
  {
    title: "Stability",
    description:
      "A trusted legal and regulatory environment with strong institutional reputation.",
  },
  {
    title: "European access",
    description:
      "A strategic base to operate, invest and structure activities across Europe.",
  },
  {
    title: "Banking ecosystem",
    description:
      "A mature financial center that supports professional banking, administration and reporting needs.",
  },
] as const;

const COMPARISON_ITEMS = [
  {
    title: "Traditional administration",
    items: [
      "Scattered emails",
      "Excel-based reporting",
      "Limited visibility between reporting periods",
      "Manual follow-up",
      "Fragmented investor communication",
    ],
  },
  {
    title: "Proliquid",
    items: [
      "Secure client portal",
      "Structured financial data",
      "Real-time operational visibility",
      "Workflow-based administration",
      "Centralized investor reporting",
    ],
  },
] as const;

const CONSULTATION_NEEDS = [
  "Company formation",
  "Banking assistance",
  "Accounting & tax",
  "Holding / SPV administration",
  "Investor reporting",
  "Family office support",
  "Other",
] as const;

const CLIENT_PROFILES = [
  {
    label: "Entrepreneurs",
    title: "Entrepreneurs establishing Luxembourg structures",
    subtitle: "For founders and operators who need a credible Luxembourg base.",
    needs: [
      "Company formation and administrative setup",
      "Bank account preparation and KYC coordination",
      "Accounting, VAT and annual compliance",
    ],
    value:
      "Proliquid helps entrepreneurs move from fragmented setup tasks to a structured Luxembourg operating base with clear financial visibility.",
  },
  {
    label: "International Investors",
    title: "International investors",
    subtitle:
      "For investors using Luxembourg to structure cross-border holdings and private investments.",
    needs: [
      "Investment vehicle administration",
      "Banking and compliance documentation",
      "Reporting on positions, flows and distributions",
    ],
    value:
      "Proliquid provides a controlled administration layer to monitor investments, documents and reporting from one secure workspace.",
  },
  {
    label: "Holding Companies",
    title: "Holding companies",
    subtitle:
      "For structures holding participations, subsidiaries, loans or investment assets.",
    needs: [
      "Bookkeeping and annual accounts",
      "Tracking of participations and intercompany flows",
      "Shareholder and management reporting",
    ],
    value:
      "Proliquid gives holding companies cleaner records, better reporting cadence and centralized access to financial documentation.",
  },
  {
    label: "SPVs",
    title: "SPVs and private investment vehicles",
    subtitle:
      "For single-asset or deal-specific structures that need disciplined administration.",
    needs: [
      "Capital movements and investor records",
      "Deal-level document management",
      "Distributions, reporting and audit trail",
    ],
    value:
      "Proliquid helps SPVs stay organized, investor-ready and easier to monitor across the full lifecycle of the vehicle.",
  },
  {
    label: "Family Offices",
    title: "Family offices",
    subtitle:
      "For families managing companies, real assets, private investments and financial documentation.",
    needs: [
      "Consolidated view of entities and assets",
      "Document room for legal and financial records",
      "Structured reporting for family stakeholders",
    ],
    value:
      "Proliquid brings order, visibility and governance to family wealth structures without relying only on spreadsheets and email.",
  },
  {
    label: "Real Estate Structures",
    title: "Real estate investment structures",
    subtitle:
      "For vehicles holding property assets, development projects or income-generating real estate.",
    needs: [
      "Property vehicle accounting",
      "Tracking of capital calls, loans and distributions",
      "Investor and asset-level reporting",
    ],
    value:
      "Proliquid supports real estate structures with organized accounting, documentation and reporting across assets and investors.",
  },
  {
    label: "Cross-Border Groups",
    title: "Cross-border groups",
    subtitle:
      "For groups operating across jurisdictions that need Luxembourg-level structure and reporting discipline.",
    needs: [
      "Multi-entity financial administration",
      "Intercompany flow tracking",
      "Centralized reporting and documentation",
    ],
    value:
      "Proliquid helps cross-border groups centralize financial oversight and maintain cleaner records across entities.",
  },
] as const;

const CLIENT_JOURNEY = [
  {
    title: "Understand the structure",
    description:
      "We review your activity, objectives, ownership and reporting needs.",
  },
  {
    title: "Set up the Luxembourg vehicle",
    description:
      "We coordinate company formation, documentation and onboarding.",
  },
  {
    title: "Prepare banking and compliance",
    description:
      "We support the bank account file, KYC documentation and administrative requirements.",
  },
  {
    title: "Run accounting and reporting",
    description:
      "We manage bookkeeping, tax obligations, financial records and investor reporting.",
  },
  {
    title: "Monitor through Proliquid",
    description:
      "You follow entities, documents and financial activity through the Proliquid platform.",
  },
] as const;

type DistinctiveFeatureIcon = (typeof DISTINCTIVE_FEATURES)[number]["icon"];

/* ------------------ Visual Components ------------------ */

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-7 items-center gap-[3px]">
        <span className="h-6 w-3 rounded-[2px] bg-black" />
        <span className="h-6 w-3 rounded-[2px] bg-black" />
      </div>
      <span className="text-sm font-bold tracking-tight">Proliquid</span>
    </div>
  );
}

function Reveal({
  children,
  className,
  delay = 0,
  ...props
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
} & HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out will-change-transform",
        visible ? "translate-y-0 opacity-100 blur-0" : "translate-y-8 opacity-0 blur-[2px]",
        className
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
      {...props}
    >
      {children}
    </div>
  );
}

function PixelCardVisual() {
  const pixels = Array.from({ length: 72 });

  return (
    <div className="relative mx-auto h-[430px] w-full max-w-[520px]">
      <div className="pointer-events-none absolute left-12 top-12 h-32 w-32 rounded-full bg-white/50 blur-3xl motion-safe:animate-float-slow" />
      <div className="pointer-events-none absolute right-0 top-16 h-28 w-28 rounded-[1.5rem] bg-blue-500 motion-safe:animate-float-medium" />
      <div className="pointer-events-none absolute right-14 top-48 h-24 w-24 rounded-[1.5rem] bg-sky-400 motion-safe:animate-float-slow" />

      <div className="absolute left-10 top-8 h-[350px] w-[245px] rotate-[24deg] rounded-[2rem] bg-black p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)] motion-safe:animate-float-slow">
        <div className="flex justify-between text-[10px] text-white/70">
          <div>
            <p className="text-blue-300">Proliquid</p>
            <p className="mt-1">4044 6285 0028 1175</p>
          </div>
          <div className="h-6 w-8 rounded border border-white/40" />
        </div>

        <div className="mt-12 grid grid-cols-7 gap-2">
          {pixels.map((_, i) => {
            const color =
              i % 11 === 0
                ? "bg-blue-400"
                : i % 7 === 0
                ? "bg-sky-300"
                : i % 5 === 0
                ? "bg-white"
                : "bg-blue-600";

            return (
              <span
                key={i}
                className={cn(
                  "h-4 w-4 rounded-[3px]",
                  color,
                  i % 9 === 0 && "translate-y-4",
                  i % 13 === 0 && "translate-x-3"
                )}
              />
            );
          })}
        </div>
      </div>

      <span className="absolute left-4 top-20 h-3 w-3 rounded-sm bg-blue-500 motion-safe:animate-pulse-soft" />
      <span className="absolute right-20 top-4 h-3 w-3 rounded-sm bg-sky-400 motion-safe:animate-float-medium" />
      <span className="absolute bottom-16 left-20 h-4 w-4 rounded-sm bg-blue-600 motion-safe:animate-float-slow" />
      <span className="absolute bottom-8 right-28 h-2 w-2 rounded-sm bg-black/70 motion-safe:animate-pulse-soft" />
    </div>
  );
}

function CircleVisual() {
  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      <div className="absolute h-40 w-40 rounded-full border border-blue-200" />
      <div className="absolute h-28 w-28 rounded-full border border-blue-300" />
      <div className="absolute h-16 w-16 rounded-full border border-blue-400" />
      <div className="absolute bottom-8 h-9 w-9 rounded-full bg-blue-500" />
      <div className="absolute top-4 h-3 w-3 rounded-full border border-blue-500 bg-white" />
    </div>
  );
}

function MiniToggleVisual() {
  return (
    <div className="mx-auto flex h-44 w-full max-w-[220px] flex-col justify-center gap-5">
      <div className="h-6 rounded-full border border-slate-200 bg-white px-1">
        <div className="ml-auto mt-1 h-4 w-4 rounded-full bg-slate-900" />
      </div>
      <div className="h-6 rounded-full border border-blue-300 bg-blue-50 px-1">
        <div className="ml-auto mt-1 h-4 w-14 rounded-full bg-blue-500" />
      </div>
      <div className="h-6 rounded-full border border-slate-200 bg-white px-1">
        <div className="ml-auto mt-1 h-4 w-4 rounded-full bg-slate-900" />
      </div>
    </div>
  );
}

function FeatureIcon({ type }: { type: DistinctiveFeatureIcon }) {
  const commonProps = {
    className: "h-6 w-6",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  if (type === "ledger") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M6 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
        <path d="M16 4v16" />
      </svg>
    );
  }

  if (type === "shield") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M12 3 19 6v5c0 4.5-2.8 8.2-7 10-4.2-1.8-7-5.5-7-10V6l7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.8-4" />
      </svg>
    );
  }

  if (type === "report") {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M5 19V5M5 19h15" />
        <path d="M9 16v-5M13 16V8M17 16v-8" />
        <path d="m8 8 3-3 3 2 4-4" />
      </svg>
    );
  }

  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M12 15v2" />
    </svg>
  );
}

function VisualModule({
  label,
  icon,
  className,
}: {
  label: string;
  icon: DistinctiveFeatureIcon;
  className: string;
}) {
  return (
    <div
      className={cn(
        "absolute z-20 flex w-[190px] items-center gap-3 rounded-2xl border border-black/10 bg-white/95 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur",
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
        <FeatureIcon type={icon} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-black uppercase tracking-[-0.01em]">
          {label}
        </p>
        <div className="mt-2 space-y-1.5">
          <span className="block h-1.5 w-24 rounded-full bg-slate-200" />
          <span className="block h-1.5 w-16 rounded-full bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

function StructuredFinanceVisual() {
  return (
    <div className="relative mx-auto min-h-[420px] w-full overflow-hidden rounded-[2rem] border border-black/10 bg-gradient-to-br from-white via-[#f8fafc] to-blue-50/50 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.14),transparent_42%)] motion-safe:animate-pulse-soft" />
      <div className="pointer-events-none absolute left-10 top-10 h-28 w-28 rounded-full bg-blue-100/50 blur-3xl motion-safe:animate-float-slow" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-24 w-24 rounded-full bg-sky-100/60 blur-3xl motion-safe:animate-float-medium" />
      <div className="absolute left-1/2 top-1/2 hidden h-[300px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[42%] border border-blue-200/70 md:block motion-safe:animate-float-slow" />
      <div className="absolute left-1/2 top-1/2 hidden h-[210px] w-[315px] -translate-x-1/2 -translate-y-1/2 rounded-[42%] border border-slate-200 md:block motion-safe:animate-float-medium" />

      <div className="absolute left-1/2 top-[7.5rem] hidden h-[5.5rem] w-px -translate-x-1/2 bg-blue-200 md:block" />
      <div className="absolute bottom-[7.5rem] left-1/2 hidden h-[5.5rem] w-px -translate-x-1/2 bg-blue-200 md:block" />
      <div className="absolute left-[10.5rem] top-1/2 hidden h-px w-[8.5rem] -translate-y-1/2 bg-blue-200 md:block" />
      <div className="absolute right-[10.5rem] top-1/2 hidden h-px w-[8.5rem] -translate-y-1/2 bg-blue-200 md:block" />

      {[
        "left-1/2 top-[12rem] -translate-x-1/2",
        "left-1/2 bottom-[12rem] -translate-x-1/2",
        "left-[17rem] top-1/2 -translate-y-1/2",
        "right-[17rem] top-1/2 -translate-y-1/2",
      ].map((position) => (
        <span
          key={position}
          className={cn(
            "absolute z-10 hidden h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.12)] md:block",
            position,
            "motion-safe:animate-pulse-soft"
          )}
        />
      ))}

      <VisualModule
        label="General Ledger"
        icon="ledger"
        className="left-1/2 top-8 -translate-x-1/2"
      />
      <VisualModule
        label="Workflows"
        icon="shield"
        className="left-5 top-1/2 -translate-y-1/2"
      />
      <VisualModule
        label="Investor Portal"
        icon="lock"
        className="right-5 top-1/2 -translate-y-1/2"
      />
      <VisualModule
        label="Reporting"
        icon="report"
        className="bottom-8 left-1/2 -translate-x-1/2"
      />

      <div className="absolute left-1/2 top-1/2 z-20 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-black/10 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.16)] motion-safe:animate-float-slow">
        <div className="absolute inset-3 rounded-[1.45rem] border border-blue-100" />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
          <svg
            className="h-10 w-10"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13 24c3.5-7 18.5-7 22 0-3.5 7-18.5 7-22 0Z"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M24 16v16M16 24h16"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10 grid grid-cols-2 gap-3 md:hidden">
        {["Ledger", "Workflows", "Portal", "Reports"].map((label) => (
          <div
            key={label}
            className="rounded-2xl border border-black/10 bg-white/90 px-4 py-3 text-[10px] font-black uppercase"
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceIcon({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="relative mx-auto h-32 w-32">
        <div className="absolute left-2 top-10 h-20 w-20 rounded-full border border-slate-300" />
        <div className="absolute left-8 top-6 h-20 w-20 rounded-full border border-blue-300" />
        <div className="absolute left-14 top-2 h-20 w-20 rounded-full border border-blue-500" />
      </div>
    );
  }

  if (index === 1) return <MiniToggleVisual />;

  if (index === 2) return <CircleVisual />;

  return (
    <div className="mx-auto flex h-44 w-40 items-center justify-center">
      <div className="relative h-28 w-28 rounded-[2rem] border border-slate-300">
        <div className="absolute left-1/2 top-[-18px] h-12 w-12 -translate-x-1/2 rounded-full border border-blue-400 bg-white" />
        <div className="absolute left-1/2 top-[-3px] h-3 w-3 -translate-x-1/2 rounded-full bg-black" />
        <div className="absolute left-6 top-8 h-16 w-px bg-slate-300" />
        <div className="absolute right-6 top-8 h-16 w-px bg-slate-300" />
      </div>
    </div>
  );
}

function FeatureCardVisual({ type }: { type: FeatureCardType }) {
  if (type === "structure") {
    return (
      <div className="relative mx-auto h-40 w-48">
        <div className="absolute left-1/2 top-2 h-12 w-20 -translate-x-1/2 rounded-2xl border border-blue-200 bg-blue-50" />
        <div className="absolute left-1/2 top-14 h-8 w-px -translate-x-1/2 bg-slate-300" />
        <div className="absolute left-1/2 top-[5.5rem] h-px w-32 -translate-x-1/2 bg-slate-300" />

        <div className="absolute left-2 top-24 h-12 w-16 rounded-2xl border border-slate-200 bg-white" />
        <div className="absolute left-1/2 top-24 h-12 w-16 -translate-x-1/2 rounded-2xl border border-blue-300 bg-blue-100" />
        <div className="absolute right-2 top-24 h-12 w-16 rounded-2xl border border-slate-200 bg-white" />

        <div className="absolute left-[2.85rem] top-[5.5rem] h-6 w-px bg-slate-300" />
        <div className="absolute left-1/2 top-[5.5rem] h-6 w-px -translate-x-1/2 bg-slate-300" />
        <div className="absolute right-[2.85rem] top-[5.5rem] h-6 w-px bg-slate-300" />
      </div>
    );
  }

  if (type === "flow") {
    return (
      <div className="relative mx-auto h-40 w-48">
        <div className="absolute left-2 top-14 h-12 w-14 rounded-xl bg-blue-500" />
        <div className="absolute left-1/2 top-8 h-14 w-16 -translate-x-1/2 rounded-xl bg-sky-300" />
        <div className="absolute right-2 top-14 h-12 w-14 rounded-xl bg-blue-700" />

        <div className="absolute left-[4.25rem] top-[4.1rem] h-px w-10 bg-slate-400" />
        <div className="absolute left-[6.55rem] top-[3.1rem] h-4 w-px bg-slate-400" />

        <div className="absolute left-1/2 top-[5.2rem] h-px w-10 -translate-x-1/2 bg-slate-400" />

        <div className="absolute right-[4.25rem] top-[4.1rem] h-px w-10 bg-slate-400" />
        <div className="absolute right-[6.55rem] top-[3.1rem] h-4 w-px bg-slate-400" />

        <div className="absolute left-[4.05rem] top-[3.95rem] h-2.5 w-2.5 rounded-full bg-slate-700" />
        <div className="absolute left-1/2 top-[5rem] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-blue-500" />
        <div className="absolute right-[4.05rem] top-[3.95rem] h-2.5 w-2.5 rounded-full bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-40 w-48">
      <div className="absolute left-10 top-6 h-20 w-16 rotate-[-8deg] rounded-2xl border border-slate-200 bg-white" />
      <div className="absolute left-[4.4rem] top-8 h-20 w-16 rounded-2xl border border-blue-200 bg-blue-50" />
      <div className="absolute left-[5.7rem] top-10 h-20 w-16 rotate-[8deg] rounded-2xl border border-blue-400 bg-white" />

      <div className="absolute left-[6.5rem] top-[3.6rem] h-1.5 w-8 rounded-full bg-blue-500" />
      <div className="absolute left-[6.5rem] top-[4.2rem] h-1.5 w-6 rounded-full bg-slate-300" />
      <div className="absolute left-[6.5rem] top-[4.8rem] h-1.5 w-7 rounded-full bg-slate-300" />

      <div className="absolute right-8 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
        +
      </div>
    </div>
  );
}

function FooterSignalVisual() {
  const nodes = [
    { left: "2%", top: "58%", size: "h-3 w-3", color: "bg-white" },
    { left: "12%", top: "38%", size: "h-2.5 w-2.5", color: "bg-blue-400" },
    { left: "22%", top: "60%", size: "h-4 w-4", color: "bg-white" },
    { left: "32%", top: "28%", size: "h-2.5 w-2.5", color: "bg-sky-300" },
    { left: "43%", top: "55%", size: "h-3 w-3", color: "bg-white" },
    { left: "54%", top: "34%", size: "h-5 w-5", color: "bg-blue-500" },
    { left: "66%", top: "62%", size: "h-3 w-3", color: "bg-white" },
    { left: "77%", top: "36%", size: "h-2.5 w-2.5", color: "bg-sky-300" },
    { left: "88%", top: "56%", size: "h-4 w-4", color: "bg-blue-400" },
    { left: "96%", top: "42%", size: "h-3 w-3", color: "bg-white" },
  ];

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="relative h-24 overflow-hidden rounded-full border border-white/10 bg-white/[0.03] px-6">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="absolute left-[7%] top-1/2 h-px w-[14%] -translate-y-1/2 bg-white/15" />
        <div className="absolute left-[26%] top-[42%] h-px w-[13%] rotate-[-12deg] bg-white/15" />
        <div className="absolute left-[40%] top-[44%] h-px w-[14%] rotate-[10deg] bg-white/15" />
        <div className="absolute left-[55%] top-[51%] h-px w-[14%] rotate-[-10deg] bg-white/15" />
        <div className="absolute left-[70%] top-[47%] h-px w-[14%] rotate-[8deg] bg-white/15" />

        {nodes.map((node, i) => (
          <span
            key={i}
            className={cn(
              "absolute rounded-full shadow-[0_0_18px_rgba(59,130,246,0.18)] motion-safe:animate-pulse-soft",
              node.size,
              node.color
            )}
            style={{ left: node.left, top: node.top }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------ Page ------------------ */

export default function ProLiquidHome() {
  const [scrolled, setScrolled] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [activeProfileIndex, setActiveProfileIndex] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveCard((i) => (i + 1) % FEATURE_CARDS.length);
    }, 4200);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveProfileIndex((index) => (index + 1) % CLIENT_PROFILES.length);
    }, 15000);

    return () => clearInterval(id);
  }, []);

  const activeProfile = CLIENT_PROFILES[activeProfileIndex];

  const handleConsultationSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") || "");
    const email = String(formData.get("email") || "");
    const companyName = String(formData.get("companyName") || "");
    const country = String(formData.get("country") || "");
    const need = String(formData.get("need") || "");
    const message = String(formData.get("message") || "");
    const subject = `Consultation request${companyName ? ` - ${companyName}` : ""}`;
    const body = [
      `Full name: ${fullName}`,
      `Email: ${email}`,
      `Company name: ${companyName}`,
      `Country: ${country}`,
      `Need: ${need}`,
      "",
      "Message:",
      message,
    ].join("\n");

    window.location.href = `mailto:contact@proliquid.lu?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  };

  return (
    <main className={cn(PAGE_BG, "min-h-screen overflow-hidden text-black")}>
      <Head>
        <title>Proliquid | Luxembourg Accounting & Investment Administration</title>
        <meta
          name="description"
          content="Proliquid helps entrepreneurs, investors, holdings, SPVs and family offices establish, manage and monitor Luxembourg structures through accounting, reporting, banking assistance and a secure financial platform."
        />
      </Head>

      {/* HEADER */}
      <header
        className={cn(
          "fixed left-0 top-0 z-50 w-full transition-all",
          scrolled
            ? "border-b border-black/5 bg-[#ececf1]/90 backdrop-blur-md"
            : "bg-transparent"
        )}
      >
        <nav className={cn(CONTAINER, "flex items-center justify-between py-7")}>
          <a href="#" className="no-underline">
            <LogoMark />
          </a>

          <div className="hidden items-center gap-9 text-xs font-semibold md:flex">
            <a href="#services" className="text-black no-underline">
              Services
            </a>
            <a href="#technology" className="text-black no-underline">
              Platform
            </a>
            <a href="#luxembourg" className="text-black no-underline">
              Luxembourg
            </a>
            <a href="#contact" className="text-black no-underline">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-4">
            
            <a href="/login" className={BTN_OUTLINE}>
              Sign In
            </a>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section id="home" className="relative px-6 pb-16 pt-32 md:pt-40">
        <div className="pointer-events-none absolute left-1/2 top-16 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl motion-safe:animate-float-slow" />
        <div className="pointer-events-none absolute left-[8%] top-28 hidden h-28 w-28 rounded-[2rem] bg-white/45 blur-2xl motion-safe:animate-float-medium md:block" />
        <div className="pointer-events-none absolute right-[8%] top-40 hidden h-36 w-36 rounded-full bg-slate-950/5 blur-3xl motion-safe:animate-pulse-soft lg:block" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 md:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <h1 className="max-w-3xl text-[3rem] font-black leading-[0.98] tracking-[-0.07em] text-black md:text-[5.4rem]">
              Luxembourg Structures. Managed Properly.
            </h1>

            <p className={cn(PARAGRAPH, "mt-10 mb-10 md:mb-28 max-w-2xl text-black/72")}>
              Accounting, corporate administration and investment reporting for
              entrepreneurs, holding companies, SPVs and family offices operating
              through Luxembourg.
            </p>

            <div className="mt-8 grid max-w-xl gap-3 text-sm font-semibold text-black/70 sm:grid-cols-2">
              {SERVICE_PROOF_POINTS.map((point) => (
                <div key={point} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                  {point}
                </div>
              ))}
            </div>

            <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            
            </div>
          </Reveal>

          <Reveal className="hidden md:block" delay={120}>
            <PixelCardVisual />
          </Reveal>
        </div>
      </section>

      {/* CONSULTATION STRIP */}
      <section className="relative px-6 pb-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-80 -translate-x-1/2 rounded-full bg-blue-500/8 blur-3xl motion-safe:animate-float-slow" />
        <Reveal
          className={cn(
            CARD,
            "relative mx-auto flex max-w-7xl flex-col gap-6 px-7 py-7 md:flex-row md:items-center md:justify-between md:px-9"
          )}
        >
          <div>
            <h2 className="text-xl font-black tracking-[-0.03em] text-black md:text-2xl">
              Need a Luxembourg structure, accountant or reporting setup?
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-black/58">
              Tell us what you are building. We will help you understand the
              right setup, administration process and expected next steps.
            </p>
          </div>
          <a href="#contact" className={cn(BTN_DARK, "shrink-0")}>
            Request Consultation{" "}
            <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              ↗
            </span>
          </a>
        </Reveal>
      </section>

      {/* WHY LUXEMBOURG */}
      <section id="luxembourg" className={cn(SECTION_Y, "relative overflow-hidden")}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_70%)]" />
        <div className="pointer-events-none absolute left-[8%] top-24 hidden h-24 w-24 rounded-full bg-blue-500/8 blur-3xl motion-safe:animate-float-slow lg:block" />
        <div className={CONTAINER}>
          <Reveal className="max-w-4xl">
            <div className={cn(BADGE, "normal-case tracking-normal")}>
              Luxembourg credibility
            </div>
            <h2 className={cn(H2, "mt-8")}>Why Luxembourg</h2>
            <p className={cn(PARAGRAPH, "mt-6 max-w-3xl")}>
              A stable, reputable and internationally recognized financial center
              for entrepreneurs, investors and cross-border structures.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {LUXEMBOURG_REASONS.map((item, index) => (
              <Reveal
                key={item.title}
                delay={index * 70}
                className={cn(
                  MUTED_CARD,
                  "p-6 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
                )}
              >
                <span className="inline-flex h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.12)] motion-safe:animate-pulse-soft" />
                <h3 className="mt-5 text-lg font-black leading-6">{item.title}</h3>
                <p className="mt-4 text-sm font-medium leading-6 text-black/55">
                  {item.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GLOBAL SERVICES CARD */}
      <section id="services" className="px-6 py-10 md:py-14">
        <Reveal className={cn(CARD, "mx-auto max-w-7xl px-7 py-10 md:px-10 md:py-12")}>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <h2 className={cn(H2, "max-w-xl")}>
              What We Do
            </h2>

            <div className="flex flex-col justify-center">
              <p className={cn(PARAGRAPH, "max-w-xl")}>
                Financial administration supported by modern technology.
              </p>

              <div className="mt-8">
                <a href="#contact" className={BTN_DARK}>
                  Request Consultation{" "}
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, index) => (
              <Reveal
                key={service.title}
                delay={index * 80}
                className={cn(
                  "min-h-[330px] rounded-[1.5rem] border p-7 text-center transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-blue-500/20 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]",
                  index === 0
                    ? "border-black/5 bg-[#f4f4f7]"
                    : "border-black/5 bg-white"
                )}
              >
                <h3 className="min-h-[44px] text-sm font-black leading-5">
                  {service.title}
                </h3>

                <div className="mt-8">
                  <ServiceIcon index={index % 4} />
                </div>

                <p className="mt-7 text-xs font-medium leading-6 text-black/50">
                  {service.description}
                </p>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FEATURE CARDS */}
      <section id="technology" className={cn(SECTION_Y, "relative overflow-hidden")}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.06),transparent_72%)]" />
        <div className={CONTAINER}>
          <Reveal className="mb-10 flex items-end justify-between gap-8">
            <div>
              <h2 className={cn(H2, "max-w-2xl")}>The Proliquid Platform</h2>
              <p className={cn(PARAGRAPH, "mt-5 max-w-2xl")}>
                Every client receives access to a secure workspace to monitor
                entities, documents, investments and financial reporting in one
                place.
              </p>
            </div>

            
          </Reveal>

          <div className="grid gap-7 md:grid-cols-3">
            {FEATURE_CARDS.map((card, index) => (
              <Reveal
                key={card.title}
                delay={index * 90}
                onMouseEnter={() => setActiveCard(index)}
                className={cn(
                  CARD,
                  "min-h-[330px] p-9 text-center transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-blue-500/20 hover:shadow-[0_22px_55px_rgba(15,23,42,0.09)]",
                  activeCard === index && "scale-[1.01] border-blue-500/20"
                )}
              >
                <h3 className="text-xl font-black leading-7">{card.title}</h3>

                <p className="mx-auto mt-5 max-w-xs text-xs font-medium leading-6 text-black/50">
                  {card.description}
                </p>

                <div className="mt-10 flex justify-center">
                  <FeatureCardVisual type={card.visual} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section className={SECTION_Y}>
        <div className={CONTAINER}>
          <Reveal className="max-w-4xl">
            <h2 className={cn(H2, "max-w-3xl")}>Who We Serve</h2>
            <p className={cn(PARAGRAPH, "mt-6 max-w-3xl")}>
              Built for clients who need credible Luxembourg administration with
              better visibility and control.
            </p>
          </Reveal>

          <Reveal className="mt-10">
            <div className="-mx-6 overflow-x-auto px-6 pb-3">
              <div className="flex min-w-max gap-5 border-b border-black/10">
                {CLIENT_PROFILES.map((profile, index) => {
                  const isActive = index === activeProfileIndex;

                  return (
                    <button
                      key={profile.label}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveProfileIndex(index)}
                      className={cn(
                        "relative -mb-px flex items-center gap-2 px-1 pb-3 pt-1 text-xs font-semibold transition-all duration-300",
                        isActive
                          ? "text-black"
                          : "text-black/45 hover:text-black/80"
                      )}
                    >
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_0_5px_rgba(59,130,246,0.10)] motion-safe:animate-profile-dot" />
                      )}
                      {profile.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 h-px rounded-full bg-blue-500 motion-safe:animate-profile-progress" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          <div
            key={activeProfile.title}
            className="mt-7 grid gap-7 transition-all duration-500 motion-safe:animate-profile-enter lg:grid-cols-[0.8fr_1.2fr]"
          >
            <Reveal
              className={cn(
                "relative min-h-[280px] md:mb-36 overflow-hidden rounded-[2rem] border border-black/5 bg-white p-8 shadow-[0_16px_46px_rgba(15,23,42,0.045)] md:p-20"
              )}
            >
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/7 blur-3xl motion-safe:animate-float-slow" />
              <div className="relative flex h-full min-h-[220px] flex-col justify-center">
                <span className="mb-8 h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_0_7px_rgba(59,130,246,0.10)] motion-safe:animate-profile-dot" />
                <h3 className="max-w-md text-4xl font-black leading-[1.02] tracking-[-0.055em] text-black md:text-5xl">
                  {activeProfile.title}
                </h3>
              </div>
            </Reveal>

            <Reveal
              delay={80}
              className={cn(
                "relative overflow-hidden rounded-[2rem] border border-black/5 bg-[#f8f8fa] p-8 shadow-[0_16px_46px_rgba(15,23,42,0.04)] md:p-10"
              )}
            >
              <div className="relative">
                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-black/40">
                  Typical needs
                </h3>
                <ul className="mt-6 grid gap-4">
                  {activeProfile.needs.map((need) => (
                    <li
                      key={need}
                      className="flex items-start gap-4 text-sm font-semibold leading-7 text-black/70 md:text-base"
                    >
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      {need}
                    </li>
                  ))}
                </ul>

                <div className="my-9 h-px bg-black/10" />

                <h3 className="text-xs font-black uppercase tracking-[0.16em] text-black/40">
                  How Proliquid helps
                </h3>
                <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-black/60 md:text-base">
                  {activeProfile.value}
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* WHY PROLIQUID */}
      <section
        id="about"
        className={cn(SECTION_BG_LIGHT, "relative overflow-hidden px-6 py-24 md:py-36")}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_72%)]" />
        <div className="mx-auto max-w-7xl">
          <Reveal className="max-w-4xl">
            <div className={cn(BADGE, "normal-case tracking-normal")}>
              Why Proliquid
            </div>
            <h2 className={cn(H2, "mt-8 max-w-3xl")}>
              A more controlled way to manage Luxembourg financial structures.
            </h2>
            <p className={cn(PARAGRAPH, "mt-6 max-w-3xl")}>
              The service remains human and Luxembourg-focused. The platform
              makes the administration cleaner, more visible and easier to
              govern.
            </p>
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {COMPARISON_ITEMS.map((column, index) => (
              <Reveal
                key={column.title}
                delay={index * 100}
                className={cn(
                  index === 0 ? MUTED_CARD : CARD,
                  "p-7 md:p-8"
                )}
              >
                <h3 className="text-xl font-black tracking-[-0.03em] text-black">
                  {column.title}
                </h3>
                <div className="mt-7 grid gap-4">
                  {column.items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-4 text-sm font-semibold leading-6 text-black/65"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          index === 0 ? "bg-black/25" : "bg-blue-500"
                        )}
                      />
                      {item}
                    </div>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CLIENT JOURNEY */}
      <section className="px-6 pt-8 pb-24 bg-white">
        <div className={cn(CONTAINER, CARD, "px-7 py-10 md:px-10 md:py-12")}>
          <Reveal className="max-w-4xl">
            <h2 className={cn(H2, "max-w-3xl")}>Typical Client Journey</h2>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-5">
            {CLIENT_JOURNEY.map((step, index) => (
              <Reveal
                key={step.title}
                delay={index * 70}
                className={cn(
                  MUTED_CARD,
                  "relative p-6 transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-blue-200 hover:shadow-[0_20px_50px_rgba(15,23,42,0.08)]"
                )}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-xs font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-black leading-6">{step.title}</h3>
                <p className="mt-4 text-sm font-medium leading-6 text-black/55">
                  {step.description}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <section
        id="contact"
        className="relative overflow-hidden bg-[#18181b] px-6 pt-24 text-white"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_72%)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl motion-safe:animate-float-slow" />
        <div className="pointer-events-none absolute left-0 bottom-16 hidden h-40 w-40 rounded-full bg-white/6 blur-3xl motion-safe:animate-float-medium lg:block" />
        <div className="mx-auto grid max-w-7xl gap-16 pb-20 md:grid-cols-[1fr_1fr_1.2fr]">
          <Reveal>
            <LogoMark />
            <p className="mt-8 max-w-xs text-xs font-medium leading-6 text-white/45">
              Accounting, corporate and investment administration for Luxembourg
              structures, supported by the Proliquid platform.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h3 className="text-sm font-black">Quick Access</h3>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-white/70">
              <a href="#services" className="no-underline transition hover:text-white">
                Services
              </a>
              <a href="#technology" className="no-underline transition hover:text-white">
                Platform
              </a>
              <a href="#luxembourg" className="no-underline transition hover:text-white">
                Luxembourg
              </a>
              <a href="#contact" className="no-underline transition hover:text-white">
                Contact
              </a>
              <a href="/login" className="no-underline transition hover:text-white">
                Login
              </a>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <h3 className="max-w-md text-3xl font-black leading-[1.05] tracking-[-0.05em] md:text-4xl">
              Let&apos;s discuss your Luxembourg structure
            </h3>
            <p className="mt-5 max-w-md text-sm font-medium leading-6 text-white/60">
              Tell us about your project and we will contact you to discuss the
              most suitable setup, accounting and reporting support.
            </p>

            <form onSubmit={handleConsultationSubmit} className="mt-8 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">
                  Full name
                  <input
                    name="fullName"
                    required
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/25 focus:border-blue-400/60"
                    placeholder="Your name"
                  />
                </label>
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">
                  Email
                  <input
                    name="email"
                    type="email"
                    required
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/25 focus:border-blue-400/60"
                    placeholder="you@example.com"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">
                  Company name
                  <input
                    name="companyName"
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/25 focus:border-blue-400/60"
                    placeholder="Company or project"
                  />
                </label>
                <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">
                  Country
                  <input
                    name="country"
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/25 focus:border-blue-400/60"
                    placeholder="Country"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">
                What do you need help with?
                <select
                  name="need"
                  required
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition focus:border-blue-400/60"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a service
                  </option>
                  {CONSULTATION_NEEDS.map((need) => (
                    <option key={need} value={need} className="text-black">
                      {need}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">
                Message
                <textarea
                  name="message"
                  rows={4}
                  className="resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold normal-case tracking-normal text-white outline-none transition placeholder:text-white/25 focus:border-blue-400/60"
                  placeholder="Briefly describe your structure, timeline or reporting needs."
                />
              </label>

              <button type="submit" className={cn(BTN_BLUE, "mt-2 w-full sm:w-fit")}>
                Request Consultation{" "}
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/60">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_5px_rgba(59,130,246,0.15)]" />
              <a
                href="mailto:contact@proliquid.lu"
                className="text-white/70 no-underline transition hover:text-white"
              >
                contact@proliquid.lu
              </a>
            </div>
          </Reveal>
        </div>

        {/* New footer visual */}
        <FooterSignalVisual />

        <div className="bg-[#ececf1] py-6 text-center text-xs font-semibold text-black/70">
          Copyright © {new Date().getFullYear()} Proliquid. All Rights Reserved.
        </div>
      </section>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .motion-safe\\:animate-float-slow {
            animation: floatSlow 10s ease-in-out infinite alternate;
          }

          .motion-safe\\:animate-float-medium {
            animation: floatMedium 7s ease-in-out infinite alternate;
          }

          .motion-safe\\:animate-pulse-soft {
            animation: pulseSoft 8s ease-in-out infinite alternate;
          }

          .motion-safe\\:animate-profile-progress {
            animation: profileProgress 15s linear;
          }

          .motion-safe\\:animate-profile-enter {
            animation: profileEnter 500ms ease-out;
          }

          .motion-safe\\:animate-profile-dot {
            animation: profileDot 3s ease-in-out infinite;
          }
        }

        @keyframes floatSlow {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(6px, -8px, 0);
          }
        }

        @keyframes floatMedium {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-6px, 8px, 0);
          }
        }

        @keyframes pulseSoft {
          0% {
            opacity: 0.55;
            transform: scale(1);
          }
          100% {
            opacity: 0.85;
            transform: scale(1.04);
          }
        }

        @keyframes profileProgress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        @keyframes profileEnter {
          from {
            opacity: 0;
            transform: translate3d(0, 10px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes profileDot {
          0%,
          100% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }
      `}</style>
    </main>
  );
}
