"use client";

import { HTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";

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

const PILLARS = [
  "Financial Administration",
  "Investor Portal",
  "Automation",
  "Auditability",
];

const SERVICES = [
  {
    title: "Financial Administration",
    description:
      "Bookkeeping, NAV preparation, period close, capital accounts and financial reporting for investment structures.",
  },
  {
    title: "Investor Portal",
    description:
      "Secure access to documents, positions, investor statements and reporting history from one clean interface.",
  },
  {
    title: "Investment Tracking",
    description:
      "Track SPVs, holdings, capital movements, distributions and operational activity with structured visibility.",
  },
  {
    title: "Automation & Controls",
    description:
      "AI-assisted extraction, reconciliations, workflows and audit trails — always controlled and reviewable.",
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
    title: "SPV & Holding Company Reporting",
    description:
      "Clean reporting for single-asset vehicles, holding structures and family investment entities.",
    visual: "structure",
  },
  {
    title: "Private Equity Operations",
    description:
      "Capital calls, distributions, NAV support, investor records and structured deal-level follow-up.",
    visual: "flow",
  },
  {
    title: "Document & Data Room",
    description:
      "Centralized access to statements, reports, agreements, notices and audit-ready documentation.",
    visual: "documents",
  },
];

const DISTINCTIVE_FEATURES = [
  {
    title: "Controlled accounting engine",
    description: "Precision-built general ledger with rule-based workflows.",
    icon: "ledger",
  },
  {
    title: "Immutable audit trail",
    description: "Complete traceability with time-stamped records.",
    icon: "shield",
  },
  {
    title: "Reporting clarity",
    description: "Consistent, investor-ready reports from structured data.",
    icon: "report",
  },
  {
    title: "Secure investor access",
    description: "Role-based permissions for sensitive financial information.",
    icon: "lock",
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
      <div className="absolute right-0 top-16 h-28 w-28 rounded-[1.5rem] bg-blue-500" />
      <div className="absolute right-14 top-48 h-24 w-24 rounded-[1.5rem] bg-sky-400" />

      <div className="absolute left-10 top-8 h-[350px] w-[245px] rotate-[24deg] rounded-[2rem] bg-black p-6 shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
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

      <span className="absolute left-4 top-20 h-3 w-3 rounded-sm bg-blue-500" />
      <span className="absolute right-20 top-4 h-3 w-3 rounded-sm bg-sky-400" />
      <span className="absolute bottom-16 left-20 h-4 w-4 rounded-sm bg-blue-600" />
      <span className="absolute bottom-8 right-28 h-2 w-2 rounded-sm bg-black" />
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.14),transparent_42%)]" />
      <div className="absolute left-1/2 top-1/2 hidden h-[300px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-[42%] border border-blue-200/70 md:block" />
      <div className="absolute left-1/2 top-1/2 hidden h-[210px] w-[315px] -translate-x-1/2 -translate-y-1/2 rounded-[42%] border border-slate-200 md:block" />

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
            position
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

      <div className="absolute left-1/2 top-1/2 z-20 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-black/10 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
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
              "absolute rounded-full shadow-[0_0_18px_rgba(59,130,246,0.18)]",
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

  return (
    <main className={cn(PAGE_BG, "min-h-screen overflow-hidden text-black")}>
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
            <a href="#home" className="text-blue-500 no-underline">
              Home
            </a>
            <a href="#services" className="text-black no-underline">
              Services
            </a>
            <a href="#technology" className="text-black no-underline">
              Platform
            </a>
            <a href="#about" className="text-black no-underline">
              About
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
        <div className="pointer-events-none absolute left-1/2 top-16 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 md:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <h1 className="max-w-3xl text-[3.2rem] font-black leading-[0.98] tracking-[-0.07em] text-black md:text-[5.4rem]">
              A Modern Finance Platform For Modern Investment Structures
            </h1>

            <p className={cn(PARAGRAPH, "mt-10 max-w-2xl text-black/72")}>
              Proliquid helps SPVs, holding companies, private investment
              vehicles and family offices run cleaner accounting, reporting,
              investor access and operational workflows from one controlled
              platform.
            </p>

            <div className="mt-9">
              <a href="#services" className={BTN_BLUE}>
                Explore More{" "}
                <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </a>
            </div>

            <div className="mt-14 grid grid-cols-2 gap-3 text-xs font-black text-black/75 md:grid-cols-4">
              {PILLARS.map((p) => (
                <div
                  key={p}
                  className="flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 shadow-sm backdrop-blur"
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
                  {p}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="hidden md:block" delay={120}>
            <PixelCardVisual />
          </Reveal>
        </div>
      </section>

      {/* GLOBAL SERVICES CARD */}
      <section id="services" className="px-6 py-10 md:py-14">
        <Reveal className={cn(CARD, "mx-auto max-w-7xl px-7 py-10 md:px-10 md:py-12")}>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <h2 className={cn(H2, "max-w-xl")}>
              We Provide You With Clear Investment Operations
            </h2>

            <div className="flex flex-col justify-center">
              <p className={cn(PARAGRAPH, "max-w-xl")}>
                We are building a structured financial administration layer for
                modern investment vehicles. The goal is simple: better data,
                faster reporting, cleaner documentation and stronger control
                over every operation.
              </p>

              <div className="mt-8">
                <a href="#contact" className={BTN_DARK}>
                  Request Access{" "}
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-7 md:grid-cols-4">
            {SERVICES.map((service, index) => (
              <Reveal
                key={service.title}
                delay={index * 80}
                className={cn(
                  "min-h-[360px] rounded-[1.5rem] border p-7 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/20 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]",
                  index === 0
                    ? "border-black/5 bg-[#f4f4f7]"
                    : "border-black/5 bg-white"
                )}
              >
                <h3 className="min-h-[44px] text-sm font-black leading-5">
                  {service.title}
                </h3>

                <div className="mt-8">
                  <ServiceIcon index={index} />
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
      <section id="technology" className={SECTION_Y}>
        <div className={CONTAINER}>
          <Reveal className="mb-10 flex items-end justify-between gap-8">
            <h2 className={cn(H2, "max-w-2xl")}>
              Up-To-Date And Fast Financial Services In One Place
            </h2>

            <div className="hidden items-center gap-3 md:flex">
              <button
                type="button"
                onClick={() =>
                  setActiveCard(
                    (activeCard - 1 + FEATURE_CARDS.length) %
                      FEATURE_CARDS.length
                  )
                }
                className="h-10 w-10 rounded-full border border-black/10 bg-white text-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md active:translate-y-0"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveCard((activeCard + 1) % FEATURE_CARDS.length)
                }
                className="h-10 w-14 rounded-full bg-blue-500 text-white shadow-[0_14px_30px_rgba(59,130,246,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-[0_18px_42px_rgba(59,130,246,0.26)] active:translate-y-0"
              >
                →
              </button>
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
                  "min-h-[330px] p-9 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/20 hover:shadow-[0_22px_55px_rgba(15,23,42,0.09)]",
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

      {/* DISTINCTIVE FEATURES */}
      <section id="about" className={cn(SECTION_BG_LIGHT, "px-6 py-24 md:py-28")}>
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal>
            <div className={cn(BADGE, "normal-case tracking-normal")}>
              Built for institutional finance
            </div>

            <h2 className={cn(H2, "mt-8 max-w-3xl")}>
              Financial operations.{" "}
              <span className="text-blue-500">Structured</span> to perform.
            </h2>

            <p className={cn(PARAGRAPH, "mt-7 max-w-xl")}>
              Proliquid brings structure, control, and clarity to complex fund
              accounting, so teams can operate with confidence.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {DISTINCTIVE_FEATURES.map((feature, index) => (
                <Reveal
                  key={feature.title}
                  delay={index * 80}
                  className="flex gap-4 rounded-[1.25rem] border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/20 hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                    <FeatureIcon type={feature.icon} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black leading-5">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/55">
                      {feature.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120}>
            <StructuredFinanceVisual />
          </Reveal>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <section
        id="contact"
        className="relative overflow-hidden bg-[#18181b] px-6 pt-24 text-white"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-16 pb-20 md:grid-cols-[1fr_1fr_1.2fr]">
          <Reveal>
            <LogoMark />
            <p className="mt-8 max-w-xs text-xs font-medium leading-6 text-white/45">
              A modern finance administration platform for SPVs, holding
              companies, private investment vehicles and family offices.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <h3 className="text-sm font-black">Quick Access</h3>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm text-white/70">
              <a href="#about" className="no-underline transition hover:text-white">
                About Us
              </a>
              <a href="#services" className="no-underline transition hover:text-white">
                Services
              </a>
              <a href="#technology" className="no-underline transition hover:text-white">
                Platform
              </a>
              <a href="/login" className="no-underline transition hover:text-white">
                Login
              </a>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <h3 className="max-w-md text-sm font-black leading-6">
              To Receive More Information, Enter Your Email So That We Can
              Contact You
            </h3>

            <form className="mt-8 flex max-w-md overflow-hidden rounded-full border border-white/10 bg-white shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
              <input
                type="email"
                placeholder="Enter Email Address"
                className="min-w-0 flex-1 px-6 py-4 text-sm font-semibold text-black outline-none placeholder:text-black/35"
              />
              <button
                type="submit"
                className="group bg-blue-500 px-7 text-sm font-black text-white transition-all duration-200 hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/30"
              >
                Subscribe{" "}
                <span className="inline-block transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  ↗
                </span>
              </button>
            </form>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-white/60">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_0_5px_rgba(59,130,246,0.15)]" />
              <span>Contact: hello@proliquid.local</span>
            </div>
          </Reveal>
        </div>

        {/* New footer visual */}
        <FooterSignalVisual />

        <div className="bg-[#ececf1] py-6 text-center text-xs font-semibold text-black/70">
          Copyright © {new Date().getFullYear()} Proliquid. All Rights Reserved.
        </div>
      </section>
    </main>
  );
}
