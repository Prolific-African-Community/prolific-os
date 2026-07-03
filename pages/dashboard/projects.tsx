import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/app-shell";
import { Icon } from "../../components/ui/icons";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Skeleton,
  StatusPill,
  Textarea,
  buttonClass,
} from "../../components/ui";

type ProjectStatus = "ACTIVE" | "ARCHIVED";

interface ProjectRecord {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  counts?: { documents: number; knowledgeItems: number; resources: number };
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

const initialForm = (): ProjectForm => ({ name: "", description: "" });

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
  const [showCreate, setShowCreate] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | ProjectStatus>("ALL");

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
      // Enrich with counts in the background for richer cards.
      const detailed = await Promise.all(
        data.map(async (project) => {
          try {
            return await request<ProjectRecord>(`/api/projects/${project.id}`);
          } catch {
            return project;
          }
        })
      );
      setProjects(detailed);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setShowCreate(false);
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
          project.id === projectId
            ? { ...updatedProject, counts: project.counts }
            : project
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

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const matchesFilter = filter === "ALL" || project.status === filter;
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        project.name.toLowerCase().includes(q) ||
        (project.description || "").toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [projects, filter, query]);

  const FILTERS: { key: "ALL" | ProjectStatus; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "ACTIVE", label: "Active" },
    { key: "ARCHIVED", label: "Archived" },
  ];

  return (
    <AppShell
      eyebrow="Workspace"
      icon="projects"
      title="Projects"
      description="Each project is a workspace that centralizes knowledge, source material and the documents you produce from them."
      actions={
        <Button
          icon={showCreate ? "close" : "plus"}
          variant={showCreate ? "ghost" : "primary"}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? "Cancel" : "New project"}
        </Button>
      }
    >
      {/* Create panel */}
      {showCreate && (
        <Card className="mb-6 p-6 animate-fade-up">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
            <Icon name="plus" size={14} />
            New project
          </div>
          <form
            className="mt-5 grid gap-4 md:grid-cols-[1fr_1.4fr_auto] md:items-end"
            onSubmit={handleCreate}
          >
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Client proposal"
                required
                autoFocus
              />
            </Field>
            <Field label="Description">
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Context, goal, or expected deliverable"
              />
            </Field>
            <Button type="submit" loading={submitting} icon="check">
              {submitting ? "Creating…" : "Create"}
            </Button>
          </form>
        </Card>
      )}

      {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

      {/* Toolbar */}
      {!loading && projects.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects"
              className="pl-10"
            />
          </div>
          <div className="inline-flex rounded-xl border border-line bg-surface p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={
                  filter === f.key
                    ? "rounded-lg bg-ink px-3.5 py-1.5 text-xs font-semibold text-white"
                    : "rounded-lg px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44" />
          ))}
        </div>
      ) : !projects.length ? (
        <EmptyState
          icon="projects"
          title="No projects yet"
          description="Projects centralize knowledge, resources and generated documents so each deliverable has one controlled source of context."
          action={
            <Button icon="plus" onClick={() => setShowCreate(true)}>
              Create your first project
            </Button>
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          icon="search"
          title="No matching projects"
          description="Try a different search or filter."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((project) => (
            <Card key={project.id} interactive className="p-5">
              {editingId === project.id ? (
                <form className="space-y-4" onSubmit={handleEditSubmit}>
                  <Field label="Name">
                    <Input
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      required
                    />
                  </Field>
                  <Field label="Description">
                    <Textarea
                      value={editForm.description}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className="min-h-[90px]"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant="secondary"
                      loading={updatingId === project.id}
                    >
                      {updatingId === project.id ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                        <Icon name="projects" size={20} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold tracking-tight text-ink">
                          {project.name}
                        </h2>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
                          {project.description || "No description yet."}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={project.status} />
                  </div>

                  {project.counts && (
                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {[
                        {
                          icon: "documents" as const,
                          label: "Docs",
                          value: project.counts.documents,
                        },
                        {
                          icon: "knowledge" as const,
                          label: "Knowledge",
                          value: project.counts.knowledgeItems,
                        },
                        {
                          icon: "resources" as const,
                          label: "Resources",
                          value: project.counts.resources,
                        },
                      ].map((c) => (
                        <div
                          key={c.label}
                          className="rounded-xl bg-ink/[0.03] px-3 py-2.5"
                        >
                          <div className="flex items-center gap-1.5 text-ink-muted">
                            <Icon name={c.icon} size={13} />
                            <span className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                              {c.label}
                            </span>
                          </div>
                          <p className="mt-1 text-lg font-semibold text-ink">
                            {c.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between">
                    <p className="text-xs font-medium text-ink-faint">
                      Updated {formatDate(project.updatedAt)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(project)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                        title="Edit"
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === project.id}
                        onClick={() =>
                          handleUpdate(project.id, {
                            status:
                              project.status === "ACTIVE"
                                ? "ARCHIVED"
                                : "ACTIVE",
                          })
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-50"
                        title={
                          project.status === "ACTIVE" ? "Archive" : "Reactivate"
                        }
                      >
                        <Icon name="archive" size={15} />
                      </button>
                      <Link href={`/dashboard/projects/${project.id}`}>
                        <a className={buttonClass("secondary", "sm")}>
                          Open
                          <Icon name="arrow-right" size={14} />
                        </a>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
