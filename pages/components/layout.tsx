import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Create Fund", href: "/create" },
    { label: "Transactions", href: "/transactions" },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-200">

      {/* Sidebar */}
      <aside className="w-64 bg-white p-8 flex flex-col">

        {/* Logo */}
        <div className="flex justify-center mb-12">
          <Image
            src="/logo.png"
            alt="Logo"
            width={90}
            height={70}
            priority
          />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-5">
          {navItems.map((item) => {
            const active = router.pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={`block w-full rounded-2xl px-6 py-4 bg-black font-medium transition-all duration-200 ease-in-out ${
                    active
                      ? "bg-black text-white shadow-lg"
                      : "bg-zinc-100 text-zinc-800 hover:bg-black hover:text-white hover:shadow-lg cursor-pointer"
                  }`}
                >
                  {item.label}
                </a>
              </Link>
            );
          })}
        </nav>

      </aside>

      {/* Main */}
      <main className="flex-1 p-16">
        {children}
      </main>

    </div>
  );
}
