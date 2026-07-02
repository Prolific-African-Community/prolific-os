import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../../components/app-shell";

type ProjectStatus = "ACTIVE" | "ARCHIVED";

interface ProjectDetail {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  counts?: {
    documents: number;
    knowledgeItems: number;
    resources: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const CARD =
  "rounded-[1.5rem] border border-black/10 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]";
const INPUT =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black outline-none transition placeholder:text-black/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const BUTTON_BLUE =
  "inline-flex items-center justify-center rounded-full bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_DARK =
  "inline-flex items-center justify-center rounded-full bg-black px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
const BUTTON_SUBTLE =
  "inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2.5 text-xs font-semibold text-black transition hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function statusClass(status: ProjectStatus) {
  return status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-600";
}

export default function ProjectDetailPage() {
  const router = useRouter();
  const projectId =
    typeof router.query.id === "string" ? router.query.id : undefined;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async <T,>(url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      throw new Error("Your session has expired. Please sign in again.");
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    const payload = (await response.json()) as ApiResponse<T>;

    if (response.status === 401) {
      localStorage.removeItem("token");
      router.replace("/login");
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.message || "Unable to complete request");
    }

    return payload.data as T;
  };

  const loadProject = async () => {
    if (!projectId) return;

    setError(null);

    try {
      const data = await request<ProjectDetail>(`/api/projects/${projectId}`);
      setProject(data);
      setForm({
        name: data.name,
        description: data.description || "",
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load project"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !projectId) return;
    loadProject();
  }, [router.isReady, projectId]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!project) return;

    setSaving(true);
    setError(null);

    try {
      const updatedProject = await request<ProjectDetail>(
        `/api/projects/${project.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(form),
        }
      );
      setProject({
        ...updatedProject,
        counts: project.counts,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save project"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!project) return;

    setUpdatingStatus(true);
    setError(null);

    try {
      const updatedProject = await request<ProjectDetail>(
        `/api/projects/${project.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status: project.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
          }),
        }
      );
      setProject({
        ...updatedProject,
        counts: project.counts,
      });
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update project status"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <AppShell
      eyebrow="Project"
      title={project?.name || "Project"}
      description="Project details, context areas, and future document production workspace."
    >
      <div className="mb-4">
        <Link href="/dashboard/projects">
          <a className={BUTTON_SUBTLE}>Back to projects</a>
        </Link>
      </div>

      {error && (
        <section className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {error}
        </section>
      )}

      {loading ? (
        <section className={`${CARD} p-6`}>
          <div className="animate-pulse space-y-3">
            <div className="h-10 rounded-2xl bg-black/5" />
            <div className="h-24 rounded-2xl bg-black/5" />
          </div>
        </section>
      ) : !project ? (
        <section className={`${CARD} p-10 text-center`}>
          <p className="text-lg font-semibold">Project not found.</p>
          <p className="mt-3 text-sm font-medium text-black/55">
            The project may have been archived, removed, or created by another user.
          </p>
        </section>
      ) : (
        <>
          <section className={`${CARD} p-6`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <span
                  className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(
                    project.status
                  )}`}
                >
                  {project.status}
                </span>
                <p className="mt-5 max-w-2xl text-sm font-medium leading-7 text-black/60">
                  {project.description || "No description yet."}
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium text-black/45">
                  <span>Created {formatDate(project.createdAt)}</span>
                  <span>Updated {formatDate(project.updatedAt)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={updatingStatus}
                onClick={handleStatusChange}
                className={BUTTON_DARK}
              >
                {updatingStatus
                  ? "Updating..."
                  : project.status === "ACTIVE"
                  ? "Archive"
                  : "Reactivate"}
              </button>
            </div>
          </section>

          <section className={`${CARD} mt-4 p-6`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
              Basic information
            </p>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSave}>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Name
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className={INPUT}
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Description
                </span>
                <input
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </label>
              <div className="md:col-span-2">
                <button type="submit" disabled={saving} className={BUTTON_BLUE}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          <section className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                label: "Documents",
                value: project.counts?.documents ?? 0,
                copy: "Documents will be generated from this project context.",
              },
              {
                label: "Knowledge",
                value: project.counts?.knowledgeItems ?? 0,
                copy: "Knowledge will store reusable project facts and instructions.",
              },
              {
                label: "Resources",
                value: project.counts?.resources ?? 0,
                copy: "Resources will contain uploaded files used for generation.",
              },
            ].map((item) => (
              <article key={item.label} className={`${CARD} p-5`}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">
                    {item.label}
                  </p>
                  <span className="text-2xl font-bold tracking-[-0.04em]">
                    {item.value}
                  </span>
                </div>
                <p className="mt-4 text-sm font-medium leading-6 text-black/60">
                  {item.copy}
                </p>
              </article>
            ))}
          </section>
        </>
      )}
    </AppShell>
  );
}
