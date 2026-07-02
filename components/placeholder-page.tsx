import { AppShell } from "./app-shell";

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <AppShell eyebrow={eyebrow} title={title} description={description}>
      <section className="rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-medium leading-7 text-black/60">
          This area is intentionally kept minimal in the current shell cleanup.
        </p>
      </section>
    </AppShell>
  );
}
