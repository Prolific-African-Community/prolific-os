import { AppShell } from "../../components/app-shell";

const METRICS = [
  {
    label: "Projects",
    description: "Space reserved for project-level work management.",
  },
  {
    label: "Documents",
    description: "Space reserved for deliverable drafting and editing.",
  },
  {
    label: "Resources",
    description: "Space reserved for uploaded files and reference material.",
  },
  {
    label: "Exports",
    description: "Space reserved for Markdown, DOCX, and PDF outputs.",
  },
] as const;

export default function DashboardPage() {
  return (
    <AppShell
      eyebrow="Workspace"
      title="Dashboard"
      description="Prolific OS transforms project knowledge into professional deliverables."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <article
            key={metric.label}
            className="rounded-[1.5rem] border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">
              {metric.label}
            </p>
            <p className="mt-4 text-sm font-medium leading-6 text-black/60">
              {metric.description}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-4 rounded-[1.5rem] border border-black/10 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-medium leading-7 text-black/60">
          The current MVP shell keeps navigation, authentication, and workspace
          framing in place while product-specific modules remain hidden.
        </p>
      </section>
    </AppShell>
  );
}
