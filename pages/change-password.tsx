import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { LogoMark } from "../components/product/workflow";
import { Icon } from "../components/ui/icons";
import { Button, Field, Input } from "../components/ui";

export default function ChangePassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoading(true);

    await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    router.push("/dashboard");
  };

  return (
    <>
      <Head>
        <title>Set a new password · Prolific OS</title>
      </Head>
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-card md:p-10">
          <LogoMark />
          <div className="mt-8 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
            <Icon name="lock" size={20} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">
            Set a new password
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Choose a new password before entering your Prolific OS workspace.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <Field label="New password">
              <Input
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
