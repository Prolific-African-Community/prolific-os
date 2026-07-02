import Head from "next/head";
import Link from "next/link";

type ClassValue = string | false | null | undefined;

const cn = (...classes: ClassValue[]) => classes.filter(Boolean).join(" ");
const PAGE_BG =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_35%),linear-gradient(180deg,_#f4f7fb_0%,_#ececf1_100%)] text-black";
const CARD =
  "rounded-[2rem] border border-black/10 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]";
const BUTTON_PRIMARY =
  "inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800";
const BUTTON_SECONDARY =
  "inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:border-black hover:bg-black hover:text-white";

function LogoMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-7 items-center gap-[3px]">
        <span className="h-6 w-3 rounded-[2px] bg-black" />
        <span className="h-6 w-3 rounded-[2px] bg-blue-500" />
      </div>
      <span className="text-sm font-bold tracking-tight text-black">
        Prolific OS
      </span>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Prolific OS</title>
        <meta
          name="description"
          content="Private AI workspace for structured projects and professional deliverables."
        />
      </Head>

      <main className={PAGE_BG}>
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6">
          <header className="flex items-center justify-between py-3">
            <LogoMark />
            <div className="flex items-center gap-3">
              <Link href="/login">
                <a className={BUTTON_SECONDARY}>Sign in</a>
              </Link>
              <Link href="/dashboard">
                <a className={BUTTON_PRIMARY}>Open workspace</a>
              </Link>
            </div>
          </header>

          <div className="flex flex-1 items-center py-12">
            <section className={cn(CARD, "w-full p-8 md:p-12")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-500">
                Internal workspace
              </p>
              <h1 className="mt-4 max-w-3xl text-[2.8rem] font-bold leading-[0.96] tracking-[-0.05em] md:text-[4.5rem]">
                Prolific OS transforms project knowledge into professional
                deliverables.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-black/60">
                A private AI workspace for structured projects, reusable
                context, and validated outputs.
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-4">
                {["Projects", "Documents", "Resources", "Exports"].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.5rem] border border-black/10 bg-[#f7f7f9] px-5 py-6"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                      {item}
                    </p>
                    <p className="mt-3 text-sm font-medium leading-6 text-black/60">
                      Workspace placeholder for the future MVP flow.
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
