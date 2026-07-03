import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { LogoMark } from "../components/product/workflow";
import { Icon, IconName } from "../components/ui/icons";
import { Button, Field, Input, Label, Alert } from "../components/ui";

const HIGHLIGHTS: { icon: IconName; label: string }[] = [
  { icon: "knowledge", label: "Reusable project memory" },
  { icon: "generate", label: "AI-assisted drafting" },
  { icon: "export", label: "Markdown, DOCX & PDF export" },
];

function LoginVisual() {
  return (
    <div className="relative hidden overflow-hidden rounded-3xl bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute right-[-6rem] top-[-6rem] h-72 w-72 rounded-full bg-accent-500/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-7rem] left-[-6rem] h-72 w-72 rounded-full bg-accent-400/15 blur-3xl" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-white/70">
          <Icon name="shield" size={14} className="text-accent-300" />
          Secure controlled access
        </div>
        <h2 className="mt-9 max-w-sm text-[2.75rem] font-semibold leading-[1.03] tracking-[-0.03em]">
          Structured work starts here.
        </h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-white/55">
          Your private AI workspace for projects, knowledge, source material and
          professional deliverables.
        </p>
      </div>

      <div className="relative z-10 space-y-3">
        {HIGHLIGHTS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 backdrop-blur"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-accent-300">
              <Icon name={item.icon} size={18} />
            </span>
            <span className="text-sm font-medium text-white/85">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.token) {
        throw new Error(data.message ?? "Invalid credentials");
      }

      const role = data.role ?? data.user?.role;
      const mustChangePassword =
        data.mustChangePassword ?? data.user?.mustChangePassword;

      if (!role) {
        throw new Error("Role missing from login response");
      }

      localStorage.clear();

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", role);

      if (mustChangePassword) {
        await router.push("/change-password");
        return;
      }

      await router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to login");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in · Prolific OS</title>
      </Head>
      <main className="min-h-screen bg-canvas px-4 py-6 md:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
          <div className="grid w-full gap-6 lg:grid-cols-[1fr_1.05fr]">
            {/* Login card */}
            <section className="flex items-center">
              <div className="w-full rounded-3xl border border-line bg-surface p-7 shadow-card md:p-10">
                <div className="flex items-center justify-between">
                  <LogoMark />
                  <Link href="/">
                    <a className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:text-ink">
                      <Icon
                        name="chevron-right"
                        size={14}
                        className="rotate-180"
                      />
                      Home
                    </a>
                  </Link>
                </div>

                <div className="mt-14">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-600">
                    Private AI workspace
                  </p>
                  <h1 className="mt-4 text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.03em] text-ink md:text-[3rem]">
                    Welcome back
                  </h1>
                  <p className="mt-4 max-w-sm text-sm leading-7 text-ink-muted">
                    Sign in to your structured workspace for projects,
                    knowledge, resources and deliverables.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-9 space-y-4">
                  <Field label="Email">
                    <Input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </Field>
                  <Field label="Password">
                    <Input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </Field>

                  {error && <Alert tone="danger">{error}</Alert>}

                  <Button
                    type="submit"
                    size="lg"
                    loading={isSubmitting}
                    iconRight={isSubmitting ? undefined : "arrow-right"}
                    className="w-full"
                  >
                    {isSubmitting ? "Signing in…" : "Sign in"}
                  </Button>
                </form>

                <div className="mt-8 flex items-center gap-2 text-xs font-medium text-ink-faint">
                  <Icon name="lock" size={14} />
                  Secure, controlled access · Validated workspace flow
                </div>
              </div>
            </section>

            <LoginVisual />
          </div>
        </div>
      </main>
    </>
  );
}
