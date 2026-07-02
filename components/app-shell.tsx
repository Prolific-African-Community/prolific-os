import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";

type ClassValue = string | false | null | undefined;

const cn = (...classes: ClassValue[]) => classes.filter(Boolean).join(" ");

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/templates", label: "Templates" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function LogoMark() {
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

export function AppShell({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ececf1] px-6 text-black">
        <div className="rounded-[1.5rem] border border-black/10 bg-white px-6 py-5 text-sm font-medium text-black/55 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          Loading workspace...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#ececf1] text-black">
      <header className="border-b border-black/5 bg-[#ececf1]/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <LogoMark />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-black px-4 py-2 text-xs font-bold text-black transition hover:bg-black hover:text-white lg:hidden"
            >
              Logout
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive =
                router.pathname === item.href ||
                (item.href !== "/dashboard" &&
                  router.pathname.startsWith(item.href));

              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      isActive
                        ? "bg-black text-white"
                        : "border border-black/10 bg-white text-black hover:border-black hover:bg-black hover:text-white"
                    )}
                  >
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden rounded-full border border-black px-4 py-2 text-xs font-bold text-black transition hover:bg-black hover:text-white lg:inline-flex"
          >
            Logout
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <section className="rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em]">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-black/55">
            {description}
          </p>
        </section>

        <div className="mt-4">{children}</div>
      </main>
    </div>
  );
}
