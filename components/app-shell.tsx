import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import { Icon, IconName } from "./ui/icons";
import { cn } from "./ui";
import { LogoMark } from "./product/workflow";

export { LogoMark };

const NAV_ITEMS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/projects", label: "Projects", icon: "projects" },
  { href: "/dashboard/templates", label: "Templates", icon: "templates" },
  { href: "/dashboard/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href);
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Link href="/dashboard">
          <a className="inline-flex">
            <LogoMark />
          </a>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Workspace
        </p>
        {NAV_ITEMS.map((item) => {
          const active = isActive(router.pathname, item.href);
          return (
            <Link key={item.href} href={item.href}>
              <a
                onClick={onNavigate}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-ink text-white shadow-soft"
                    : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink"
                )}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  className={cn(
                    active ? "text-white" : "text-ink-muted group-hover:text-ink"
                  )}
                />
                {item.label}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft transition-all duration-200 hover:bg-red-50 hover:text-red-600"
        >
          <Icon name="logout" size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  title,
  eyebrow,
  description,
  icon,
  actions,
  backHref,
  backLabel,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  icon?: IconName;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    setMobileNav(false);
  }, [router.pathname]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm font-medium text-ink-muted shadow-card">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
          Opening your workspace…
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line frost px-4 py-3 lg:hidden">
        <LogoMark />
        <button
          type="button"
          onClick={() => setMobileNav((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink"
        >
          <Icon name={mobileNav ? "close" : "menu"} size={18} />
        </button>
      </header>

      {mobileNav && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
            onClick={() => setMobileNav(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-line bg-surface animate-fade-in">
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-5 pb-20 pt-6 md:px-8 lg:pt-10">
          <div className="animate-fade-up">
            {backHref && (
              <Link href={backHref}>
                <a className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink">
                  <Icon name="chevron-right" size={15} className="rotate-180" />
                  {backLabel || "Back"}
                </a>
              </Link>
            )}

            <div className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-600">
                  {icon && <Icon name={icon} size={14} />}
                  {eyebrow}
                </div>
                <h1 className="truncate text-3xl font-semibold tracking-tight text-ink md:text-[2rem]">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  {description}
                </p>
              </div>
              {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {actions}
                </div>
              )}
            </div>

            <div className="pt-7">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
