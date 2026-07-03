import Head from "next/head";
import Link from "next/link";
import { LogoMark } from "../components/product/workflow";
import { Icon, IconName } from "../components/ui/icons";
import { buttonClass } from "../components/ui";

const STEPS: { icon: IconName; title: string; copy: string }[] = [
  {
    icon: "knowledge",
    title: "Capture knowledge",
    copy: "Store reusable context, facts and decisions once — reuse them everywhere.",
  },
  {
    icon: "resources",
    title: "Add source material",
    copy: "Upload files and references. We extract the text your documents rely on.",
  },
  {
    icon: "generate",
    title: "Generate & refine",
    copy: "Produce a professional first draft from your context, then review and edit.",
  },
  {
    icon: "export",
    title: "Export anywhere",
    copy: "Ship polished Markdown, DOCX and PDF that match your standards.",
  },
];

const OUTPUTS = [
  "Proposals",
  "Technical specs",
  "Reports",
  "Statements of work",
  "Briefs",
  "Case studies",
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Prolific OS — Turn project knowledge into professional documents</title>
        <meta
          name="description"
          content="An AI-native workspace that turns your project knowledge and source material into professional, standardized documents."
        />
      </Head>

      <main className="min-h-screen bg-canvas">
        {/* Nav */}
        <header className="sticky top-0 z-30 border-b border-line frost">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
            <LogoMark />
            <div className="flex items-center gap-2">
              <Link href="/login">
                <a className={buttonClass("ghost", "md")}>Sign in</a>
              </Link>
              <Link href="/dashboard">
                <a className={buttonClass("primary", "md")}>
                  Open workspace
                  <Icon name="arrow-right" size={16} />
                </a>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-grid-fade" />
          <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-16 text-center md:px-8 md:pt-24">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-soft shadow-soft animate-fade-up">
              <span className="flex h-1.5 w-1.5 rounded-full bg-accent-500" />
              AI-native document workspace
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink animate-fade-up md:text-6xl">
              Turn project knowledge into
              <span className="text-accent-600"> professional documents.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-ink-muted animate-fade-up md:text-lg">
              Prolific OS gathers your context, source files and standards, then
              produces standardized, business-grade documents you can review,
              edit and export — Markdown, DOCX and PDF.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 animate-fade-up">
              <Link href="/dashboard">
                <a className={buttonClass("primary", "lg")}>
                  Enter workspace
                  <Icon name="arrow-right" size={17} />
                </a>
              </Link>
              <Link href="/login">
                <a className={buttonClass("ghost", "lg")}>Sign in</a>
              </Link>
            </div>

            {/* Product preview */}
            <div className="mx-auto mt-16 max-w-5xl animate-fade-up">
              <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
                <div className="flex items-center gap-2 border-b border-line bg-ink/[0.015] px-5 py-3">
                  <span className="h-3 w-3 rounded-full bg-ink/10" />
                  <span className="h-3 w-3 rounded-full bg-ink/10" />
                  <span className="h-3 w-3 rounded-full bg-ink/10" />
                  <span className="ml-3 text-xs font-medium text-ink-faint">
                    Prolific OS · Document studio
                  </span>
                </div>
                <div className="grid gap-4 p-5 text-left md:grid-cols-[1.6fr_1fr]">
                  <div className="rounded-2xl border border-line bg-canvas p-5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Ready for review
                      </span>
                      <span className="rounded-full bg-ink/[0.05] px-2.5 py-1 text-[11px] font-semibold text-ink-soft">
                        Proposal
                      </span>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      <div className="h-3 w-2/3 rounded-full bg-ink/10" />
                      <div className="h-2.5 w-full rounded-full bg-ink/[0.06]" />
                      <div className="h-2.5 w-11/12 rounded-full bg-ink/[0.06]" />
                      <div className="h-2.5 w-4/5 rounded-full bg-ink/[0.06]" />
                      <div className="mt-4 h-3 w-1/2 rounded-full bg-ink/10" />
                      <div className="h-2.5 w-full rounded-full bg-ink/[0.06]" />
                      <div className="h-2.5 w-10/12 rounded-full bg-ink/[0.06]" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4">
                      <div className="flex items-center gap-2 text-accent-700">
                        <Icon name="generate" size={16} />
                        <span className="text-sm font-semibold">
                          Generate document
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-accent-700/80">
                        Uses 6 knowledge items and 3 sources.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-line bg-surface p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                        Export
                      </p>
                      <div className="mt-3 space-y-2">
                        {["Markdown", "DOCX", "PDF"].map((f) => (
                          <div
                            key={f}
                            className="flex items-center justify-between rounded-lg bg-ink/[0.03] px-3 py-2"
                          >
                            <span className="text-xs font-medium text-ink-soft">
                              {f}
                            </span>
                            <Icon
                              name="check-circle"
                              size={15}
                              className="text-emerald-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-600">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
              A guided production line for documents
            </h2>
            <p className="mt-3 text-base leading-7 text-ink-muted">
              Every step is connected, so context flows from knowledge to final
              export without the copy-paste chaos.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="group rounded-2xl border border-line bg-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-colors group-hover:bg-accent-600 group-hover:text-white">
                    <Icon name={step.icon} size={20} />
                  </div>
                  <span className="text-sm font-semibold text-ink-faint">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {step.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Outputs */}
        <section className="mx-auto max-w-6xl px-5 pb-20 md:px-8">
          <div className="overflow-hidden rounded-3xl border border-line bg-ink px-8 py-12 text-white shadow-lift md:px-14 md:py-16">
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-300">
                  Built for serious output
                </p>
                <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
                  One workspace for every professional document.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-7 text-white/60">
                  Standardize how your team produces deliverables. Consistent
                  structure, consistent quality, every time.
                </p>
                <Link href="/dashboard">
                  <a className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5">
                    Open your workspace
                    <Icon name="arrow-up-right" size={16} />
                  </a>
                </Link>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {OUTPUTS.map((o) => (
                  <span
                    key={o}
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/85"
                  >
                    <Icon name="documents" size={15} className="text-accent-300" />
                    {o}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-ink-muted md:flex-row md:px-8">
            <LogoMark size="sm" />
            <p>Private AI workspace · Structured, validated output.</p>
          </div>
        </footer>
      </main>
    </>
  );
}
