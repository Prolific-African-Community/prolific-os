import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

type ClassValue = string | false | null | undefined;

const cn = (...classes: ClassValue[]) => classes.filter(Boolean).join(" ");
const PAGE_BG = "bg-[#ececf1]";
const CARD =
  "rounded-[1.5rem] border border-black/10 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]";

export function LegacyRouteRedirect() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    router.replace("/dashboard");
  }, [router]);

  return (
    <main className={cn(PAGE_BG, "min-h-screen px-6 py-20 text-black")}>
      <div className="mx-auto max-w-2xl">
        <div className={cn(CARD, "p-8 text-center")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
            Legacy module
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
            This legacy module is no longer available in Prolific OS.
          </h1>
          <p className="mt-3 text-sm font-medium text-black/50">
            Redirecting to the main workspace.
          </p>
          <div className="mt-6">
            <Link href="/dashboard">
              <a className="inline-flex rounded-full border border-black px-4 py-2 text-sm font-semibold text-black transition hover:bg-black hover:text-white">
                Back to dashboard
              </a>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
