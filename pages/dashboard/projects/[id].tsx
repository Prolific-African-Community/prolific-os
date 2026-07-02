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

interface KnowledgeItem {
  id: string;
  projectId: string;
  title: string;
  content: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeForm {
  title: string;
  category: string;
  content: string;
}

interface ResourceItem {
  id: string;
  projectId: string;
  documentId?: string | null;
  filename: string;
  mimeType: string;
  sizeBytes?: number | null;
  storageUrl?: string | null;
  extractedText?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ResourceForm {
  filename: string;
  mimeType: string;
  sizeBytes: string;
  storageUrl: string;
  extractedText: string;
}

const CARD =
  "rounded-[1.5rem] border border-black/10 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]";
const INPUT =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black outline-none transition placeholder:text-black/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const TEXTAREA = `${INPUT} min-h-[140px] resize-y leading-6`;
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

function formatSize(value?: number | null) {
  if (value === undefined || value === null) return "Size not set";

  return `${new Intl.NumberFormat("en-GB").format(value)} bytes`;
}

const initialKnowledgeForm = (): KnowledgeForm => ({
  title: "",
  category: "",
  content: "",
});

const initialResourceForm = (): ResourceForm => ({
  filename: "",
  mimeType: "",
  sizeBytes: "",
  storageUrl: "",
  extractedText: "",
});

export default function ProjectDetailPage() {
  const router = useRouter();
  const projectId =
    typeof router.query.id === "string" ? router.query.id : undefined;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [knowledgeForm, setKnowledgeForm] =
    useState<KnowledgeForm>(initialKnowledgeForm);
  const [editingKnowledgeId, setEditingKnowledgeId] = useState<string | null>(
    null
  );
  const [knowledgeEditForm, setKnowledgeEditForm] =
    useState<KnowledgeForm>(initialKnowledgeForm);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourceForm, setResourceForm] =
    useState<ResourceForm>(initialResourceForm);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null
  );
  const [resourceEditForm, setResourceEditForm] =
    useState<ResourceForm>(initialResourceForm);
  const [loading, setLoading] = useState(true);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [savingResource, setSavingResource] = useState(false);
  const [updatingKnowledgeId, setUpdatingKnowledgeId] = useState<string | null>(
    null
  );
  const [updatingResourceId, setUpdatingResourceId] = useState<string | null>(
    null
  );
  const [deletingKnowledgeId, setDeletingKnowledgeId] = useState<string | null>(
    null
  );
  const [deletingResourceId, setDeletingResourceId] = useState<string | null>(
    null
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

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

  const loadKnowledge = async () => {
    if (!projectId) return;

    setKnowledgeError(null);

    try {
      const data = await request<KnowledgeItem[]>(
        `/api/projects/${projectId}/knowledge`
      );
      setKnowledgeItems(data);
    } catch (loadError) {
      setKnowledgeError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load knowledge"
      );
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const loadResources = async () => {
    if (!projectId) return;

    setResourcesError(null);

    try {
      const data = await request<ResourceItem[]>(
        `/api/projects/${projectId}/resources`
      );
      setResources(data);
    } catch (loadError) {
      setResourcesError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load resources"
      );
    } finally {
      setResourcesLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !projectId) return;
    loadProject();
    loadKnowledge();
    loadResources();
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

  const handleKnowledgeCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId) return;

    setSavingKnowledge(true);
    setKnowledgeError(null);

    try {
      const knowledgeItem = await request<KnowledgeItem>(
        `/api/projects/${projectId}/knowledge`,
        {
          method: "POST",
          body: JSON.stringify(knowledgeForm),
        }
      );
      setKnowledgeItems((current) => [knowledgeItem, ...current]);
      setKnowledgeForm(initialKnowledgeForm);
    } catch (createError) {
      setKnowledgeError(
        createError instanceof Error
          ? createError.message
          : "Unable to create knowledge"
      );
    } finally {
      setSavingKnowledge(false);
    }
  };

  const startKnowledgeEdit = (item: KnowledgeItem) => {
    setEditingKnowledgeId(item.id);
    setKnowledgeEditForm({
      title: item.title,
      category: item.category || "",
      content: item.content,
    });
    setKnowledgeError(null);
  };

  const handleKnowledgeUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId || !editingKnowledgeId) return;

    setUpdatingKnowledgeId(editingKnowledgeId);
    setKnowledgeError(null);

    try {
      const knowledgeItem = await request<KnowledgeItem>(
        `/api/projects/${projectId}/knowledge/${editingKnowledgeId}`,
        {
          method: "PATCH",
          body: JSON.stringify(knowledgeEditForm),
        }
      );
      setKnowledgeItems((current) =>
        current.map((item) =>
          item.id === knowledgeItem.id ? knowledgeItem : item
        )
      );
      setEditingKnowledgeId(null);
      setKnowledgeEditForm(initialKnowledgeForm);
    } catch (updateError) {
      setKnowledgeError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update knowledge"
      );
    } finally {
      setUpdatingKnowledgeId(null);
    }
  };

  const handleKnowledgeDelete = async (item: KnowledgeItem) => {
    if (!projectId) return;

    const confirmed = window.confirm(
      `Delete "${item.title}" from this project's knowledge?`
    );

    if (!confirmed) return;

    setDeletingKnowledgeId(item.id);
    setKnowledgeError(null);

    try {
      await request<{ id: string }>(
        `/api/projects/${projectId}/knowledge/${item.id}`,
        {
          method: "DELETE",
        }
      );
      setKnowledgeItems((current) =>
        current.filter((knowledgeItem) => knowledgeItem.id !== item.id)
      );

      if (editingKnowledgeId === item.id) {
        setEditingKnowledgeId(null);
      }
    } catch (deleteError) {
      setKnowledgeError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete knowledge"
      );
    } finally {
      setDeletingKnowledgeId(null);
    }
  };

  const handleResourceCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId) return;

    setSavingResource(true);
    setResourcesError(null);

    try {
      await request<ResourceItem>(`/api/projects/${projectId}/resources`, {
        method: "POST",
        body: JSON.stringify(resourceForm),
      });
      setResourceForm(initialResourceForm);
      await loadResources();
    } catch (createError) {
      setResourcesError(
        createError instanceof Error
          ? createError.message
          : "Unable to create resource"
      );
    } finally {
      setSavingResource(false);
    }
  };

  const startResourceEdit = (item: ResourceItem) => {
    setEditingResourceId(item.id);
    setResourceEditForm({
      filename: item.filename,
      mimeType: item.mimeType,
      sizeBytes:
        item.sizeBytes === undefined || item.sizeBytes === null
          ? ""
          : String(item.sizeBytes),
      storageUrl: item.storageUrl || "",
      extractedText: item.extractedText || "",
    });
    setResourcesError(null);
  };

  const handleResourceUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId || !editingResourceId) return;

    setUpdatingResourceId(editingResourceId);
    setResourcesError(null);

    try {
      await request<ResourceItem>(
        `/api/projects/${projectId}/resources/${editingResourceId}`,
        {
          method: "PATCH",
          body: JSON.stringify(resourceEditForm),
        }
      );
      setEditingResourceId(null);
      setResourceEditForm(initialResourceForm);
      await loadResources();
    } catch (updateError) {
      setResourcesError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update resource"
      );
    } finally {
      setUpdatingResourceId(null);
    }
  };

  const handleResourceDelete = async (item: ResourceItem) => {
    if (!projectId) return;

    const confirmed = window.confirm(
      `Delete "${item.filename}" from this project's resources?`
    );

    if (!confirmed) return;

    setDeletingResourceId(item.id);
    setResourcesError(null);

    try {
      await request<{ id: string }>(
        `/api/projects/${projectId}/resources/${item.id}`,
        {
          method: "DELETE",
        }
      );
      await loadResources();

      if (editingResourceId === item.id) {
        setEditingResourceId(null);
      }
    } catch (deleteError) {
      setResourcesError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete resource"
      );
    } finally {
      setDeletingResourceId(null);
    }
  };

  const knowledgeCount = knowledgeItems.length;
  const resourcesCount = resources.length;

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
                value: knowledgeCount,
                copy: "Knowledge will store reusable project facts and instructions.",
              },
              {
                label: "Resources",
                value: resourcesCount,
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

          <section className={`${CARD} mt-4 p-6`}>
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
                Knowledge
              </p>
              <h2 className="text-xl font-semibold tracking-[-0.04em]">
                Project knowledge
              </h2>
              <p className="max-w-2xl text-sm font-medium leading-6 text-black/55">
                Store reusable facts, instructions, constraints, and context
                that future documents can use from this project.
              </p>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={handleKnowledgeCreate}>
              <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    Title
                  </span>
                  <input
                    value={knowledgeForm.title}
                    onChange={(event) =>
                      setKnowledgeForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className={INPUT}
                    placeholder="Client positioning"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    Category
                  </span>
                  <input
                    value={knowledgeForm.category}
                    onChange={(event) =>
                      setKnowledgeForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className={INPUT}
                    placeholder="Strategy"
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Content
                </span>
                <textarea
                  value={knowledgeForm.content}
                  onChange={(event) =>
                    setKnowledgeForm((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  className={TEXTAREA}
                  placeholder="Add the reusable context, decision, source note, or instruction."
                  required
                />
              </label>
              <div>
                <button
                  type="submit"
                  disabled={savingKnowledge}
                  className={BUTTON_BLUE}
                >
                  {savingKnowledge ? "Adding..." : "Add knowledge"}
                </button>
              </div>
            </form>

            {knowledgeError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                {knowledgeError}
              </div>
            )}

            <div className="mt-6">
              {knowledgeLoading ? (
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-24 rounded-2xl bg-black/5" />
                  ))}
                </div>
              ) : !knowledgeItems.length ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-8 text-center">
                  <p className="text-sm font-semibold">
                    No project knowledge yet.
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-black/55">
                    Add facts, instructions, reference notes, or constraints
                    that should remain available throughout this project.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {knowledgeItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-black/10 bg-black/[0.02] p-5"
                    >
                      {editingKnowledgeId === item.id ? (
                        <form
                          className="grid gap-4"
                          onSubmit={handleKnowledgeUpdate}
                        >
                          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                            <input
                              value={knowledgeEditForm.title}
                              onChange={(event) =>
                                setKnowledgeEditForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              className={INPUT}
                              required
                            />
                            <input
                              value={knowledgeEditForm.category}
                              onChange={(event) =>
                                setKnowledgeEditForm((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                              className={INPUT}
                              placeholder="Category"
                            />
                          </div>
                          <textarea
                            value={knowledgeEditForm.content}
                            onChange={(event) =>
                              setKnowledgeEditForm((current) => ({
                                ...current,
                                content: event.target.value,
                              }))
                            }
                            className={TEXTAREA}
                            required
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              disabled={updatingKnowledgeId === item.id}
                              className={BUTTON_DARK}
                            >
                              {updatingKnowledgeId === item.id
                                ? "Saving..."
                                : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingKnowledgeId(null)}
                              className={BUTTON_SUBTLE}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold tracking-[-0.03em]">
                                  {item.title}
                                </h3>
                                {item.category && (
                                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-600">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                                {item.content.length > 240
                                  ? `${item.content.slice(0, 240)}...`
                                  : item.content}
                              </p>
                              <p className="mt-3 text-xs font-medium text-black/40">
                                Updated {formatDate(item.updatedAt)}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => startKnowledgeEdit(item)}
                                className={BUTTON_SUBTLE}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingKnowledgeId === item.id}
                                onClick={() => handleKnowledgeDelete(item)}
                                className={BUTTON_SUBTLE}
                              >
                                {deletingKnowledgeId === item.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={`${CARD} mt-4 p-6`}>
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
                Resources
              </p>
              <h2 className="text-xl font-semibold tracking-[-0.04em]">
                Project resources
              </h2>
              <p className="max-w-2xl text-sm font-medium leading-6 text-black/55">
                Register source files, reference URLs, and extracted notes that
                belong to this project. Binary upload will be handled separately.
              </p>
            </div>

            <form className="mt-6 grid gap-4" onSubmit={handleResourceCreate}>
              <div className="grid gap-4 md:grid-cols-[1fr_220px_180px]">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    File name
                  </span>
                  <input
                    value={resourceForm.filename}
                    onChange={(event) =>
                      setResourceForm((current) => ({
                        ...current,
                        filename: event.target.value,
                      }))
                    }
                    className={INPUT}
                    placeholder="brief.pdf"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    MIME type
                  </span>
                  <input
                    value={resourceForm.mimeType}
                    onChange={(event) =>
                      setResourceForm((current) => ({
                        ...current,
                        mimeType: event.target.value,
                      }))
                    }
                    className={INPUT}
                    placeholder="application/pdf"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    Size in bytes
                  </span>
                  <input
                    value={resourceForm.sizeBytes}
                    onChange={(event) =>
                      setResourceForm((current) => ({
                        ...current,
                        sizeBytes: event.target.value,
                      }))
                    }
                    className={INPUT}
                    inputMode="numeric"
                    placeholder="204800"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  File URL
                </span>
                <input
                  value={resourceForm.storageUrl}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      storageUrl: event.target.value,
                    }))
                  }
                  className={INPUT}
                  placeholder="https://..."
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Extracted text / notes
                </span>
                <textarea
                  value={resourceForm.extractedText}
                  onChange={(event) =>
                    setResourceForm((current) => ({
                      ...current,
                      extractedText: event.target.value,
                    }))
                  }
                  className={TEXTAREA}
                  placeholder="Paste useful extracted text or reference notes."
                />
              </label>

              <div>
                <button
                  type="submit"
                  disabled={savingResource}
                  className={BUTTON_BLUE}
                >
                  {savingResource ? "Adding..." : "Add resource"}
                </button>
              </div>
            </form>

            {resourcesError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                {resourcesError}
              </div>
            )}

            <div className="mt-6">
              {resourcesLoading ? (
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-24 rounded-2xl bg-black/5" />
                  ))}
                </div>
              ) : !resources.length ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-8 text-center">
                  <p className="text-sm font-semibold">
                    No project resources yet.
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-black/55">
                    Add file metadata, reference URLs, and extracted notes that
                    should be available when this project starts producing documents.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resources.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-black/10 bg-black/[0.02] p-5"
                    >
                      {editingResourceId === item.id ? (
                        <form
                          className="grid gap-4"
                          onSubmit={handleResourceUpdate}
                        >
                          <div className="grid gap-4 md:grid-cols-[1fr_220px_180px]">
                            <input
                              value={resourceEditForm.filename}
                              onChange={(event) =>
                                setResourceEditForm((current) => ({
                                  ...current,
                                  filename: event.target.value,
                                }))
                              }
                              className={INPUT}
                              required
                            />
                            <input
                              value={resourceEditForm.mimeType}
                              onChange={(event) =>
                                setResourceEditForm((current) => ({
                                  ...current,
                                  mimeType: event.target.value,
                                }))
                              }
                              className={INPUT}
                              required
                            />
                            <input
                              value={resourceEditForm.sizeBytes}
                              onChange={(event) =>
                                setResourceEditForm((current) => ({
                                  ...current,
                                  sizeBytes: event.target.value,
                                }))
                              }
                              className={INPUT}
                              inputMode="numeric"
                              placeholder="Size in bytes"
                            />
                          </div>
                          <input
                            value={resourceEditForm.storageUrl}
                            onChange={(event) =>
                              setResourceEditForm((current) => ({
                                ...current,
                                storageUrl: event.target.value,
                              }))
                            }
                            className={INPUT}
                            placeholder="File URL"
                          />
                          <textarea
                            value={resourceEditForm.extractedText}
                            onChange={(event) =>
                              setResourceEditForm((current) => ({
                                ...current,
                                extractedText: event.target.value,
                              }))
                            }
                            className={TEXTAREA}
                            placeholder="Extracted text / notes"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              disabled={updatingResourceId === item.id}
                              className={BUTTON_DARK}
                            >
                              {updatingResourceId === item.id
                                ? "Saving..."
                                : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingResourceId(null)}
                              className={BUTTON_SUBTLE}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h3 className="text-base font-semibold tracking-[-0.03em]">
                              {item.filename}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-black/50">
                              <span className="rounded-full bg-white px-3 py-1">
                                {item.mimeType}
                              </span>
                              <span className="rounded-full bg-white px-3 py-1">
                                {formatSize(item.sizeBytes)}
                              </span>
                            </div>
                            {item.storageUrl && (
                              <a
                                href={item.storageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex max-w-full text-sm font-semibold text-blue-600 underline decoration-blue-600/25 underline-offset-4"
                              >
                                {item.storageUrl}
                              </a>
                            )}
                            {item.extractedText && (
                              <p className="mt-3 text-sm font-medium leading-6 text-black/60">
                                {item.extractedText.length > 220
                                  ? `${item.extractedText.slice(0, 220)}...`
                                  : item.extractedText}
                              </p>
                            )}
                            <p className="mt-3 text-xs font-medium text-black/40">
                              Updated {formatDate(item.updatedAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => startResourceEdit(item)}
                              className={BUTTON_SUBTLE}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={deletingResourceId === item.id}
                              onClick={() => handleResourceDelete(item)}
                              className={BUTTON_SUBTLE}
                            >
                              {deletingResourceId === item.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
