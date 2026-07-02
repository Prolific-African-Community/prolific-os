import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/app-shell";

type ProjectStatus = "ACTIVE" | "ARCHIVED";

interface ProjectRecord {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface ProjectForm {
  name: string;
  description: string;
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

const initialForm = (): ProjectForm => ({
  name: "",
  description: "",
});

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

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [form, setForm] = useState<ProjectForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ProjectForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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

  const loadProjects = async () => {
    setError(null);

    try {
      const data = await request<ProjectRecord[]>("/api/projects");
      setProjects(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load projects"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    loadProjects();
  }, [router.isReady]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const project = await request<ProjectRecord>("/api/projects", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setProjects((current) => [project, ...current]);
      setForm(initialForm);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create project"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (project: ProjectRecord) => {
    setEditingId(project.id);
    setEditForm({
      name: project.name,
      description: project.description || "",
    });
    setError(null);
  };

  const handleUpdate = async (
    projectId: string,
    payload: Partial<ProjectForm> & { status?: ProjectStatus }
  ) => {
    setUpdatingId(projectId);
    setError(null);

    try {
      const updatedProject = await request<ProjectRecord>(
        `/api/projects/${projectId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );
      setProjects((current) =>
        current.map((project) =>
          project.id === projectId ? updatedProject : project
        )
      );
      setEditingId(null);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update project"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingId) return;

    await handleUpdate(editingId, editForm);
  };

  return (
    <AppShell
      eyebrow="Workspace"
      title="Projects"
      description="Projects centralize knowledge, resources, instructions, and generated documents for a single professional output stream."
    >
      <section className={`${CARD} p-6`}>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
            New project
          </p>
          <h2 className="text-xl font-semibold tracking-[-0.04em]">
            Create a project
          </h2>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-[1fr_1.4fr_auto]" onSubmit={handleCreate}>
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
              Name
            </span>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              className={INPUT}
              placeholder="Client proposal"
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
              placeholder="Context, goal, or expected deliverable"
            />
          </label>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className={BUTTON_BLUE}>
              {submitting ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
          {error}
        </section>
      )}

      <section className="mt-4">
        {loading ? (
          <div className={`${CARD} p-6`}>
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-16 rounded-2xl bg-black/5" />
              ))}
            </div>
          </div>
        ) : !projects.length ? (
          <div className={`${CARD} p-10 text-center`}>
            <p className="text-lg font-semibold">No projects yet.</p>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-7 text-black/55">
              Projects centralize knowledge, resources, instructions, and
              generated documents so each deliverable has one controlled source
              of context.
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className={`${BUTTON_BLUE} mt-6`}
            >
              Create the first project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {projects.map((project) => (
              <article key={project.id} className={`${CARD} p-5`}>
                {editingId === project.id ? (
                  <form className="space-y-4" onSubmit={handleEditSubmit}>
                    <input
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className={INPUT}
                      required
                    />
                    <textarea
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className={`${INPUT} min-h-[96px] resize-y`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={updatingId === project.id}
                        className={BUTTON_DARK}
                      >
                        {updatingId === project.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className={BUTTON_SUBTLE}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold tracking-[-0.04em]">
                          {project.name}
                        </h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-black/55">
                          {project.description || "No description yet."}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${statusClass(
                          project.status
                        )}`}
                      >
                        {project.status}
                      </span>
                    </div>

                    <p className="mt-5 text-xs font-medium text-black/45">
                      Created {formatDate(project.createdAt)}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <a className={BUTTON_DARK}>Open</a>
                      </Link>
                      <button
                        type="button"
                        onClick={() => startEditing(project)}
                        className={BUTTON_SUBTLE}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === project.id}
                        onClick={() =>
                          handleUpdate(project.id, {
                            status:
                              project.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                          })
                        }
                        className={BUTTON_SUBTLE}
                      >
                        {project.status === "ACTIVE" ? "Archive" : "Reactivate"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
