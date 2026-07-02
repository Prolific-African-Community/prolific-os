import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../../../../components/app-shell";

type DocumentStatus =
  | "DRAFT"
  | "GENERATING"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "ARCHIVED";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface TemplateRecord {
  id: string;
  name: string;
  type: string;
  description?: string | null;
}

interface DocumentDetail {
  id: string;
  projectId: string;
  templateId?: string | null;
  template?: {
    id: string;
    name: string;
    type: string;
  } | null;
  title: string;
  type: string;
  objective: string;
  instructions?: string | null;
  status: DocumentStatus;
  outline?: string | null;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentDetailForm {
  title: string;
  type: string;
  objective: string;
  instructions: string;
  outline: string;
  content: string;
  templateId: string;
}

interface GenerationRun {
  id: string;
  documentId: string;
  provider: string;
  model: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
  inputSummary?: string | null;
  output?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

const CARD =
  "rounded-[1.5rem] border border-black/10 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.05)]";
const INPUT =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-medium text-black outline-none transition placeholder:text-black/30 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";
const TEXTAREA = `${INPUT} min-h-[150px] resize-y leading-6`;
const CONTENT_TEXTAREA = `${INPUT} min-h-[320px] resize-y font-mono text-[13px] leading-6`;
const BUTTON_BLUE =
  "inline-flex items-center justify-center rounded-full bg-blue-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50";
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

const initialForm = (): DocumentDetailForm => ({
  title: "",
  type: "",
  objective: "",
  instructions: "",
  outline: "",
  content: "",
  templateId: "",
});

export default function DocumentDetailPage() {
  const router = useRouter();
  const projectId =
    typeof router.query.id === "string" ? router.query.id : undefined;
  const documentId =
    typeof router.query.documentId === "string"
      ? router.query.documentId
      : undefined;
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [form, setForm] = useState<DocumentDetailForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [runs, setRuns] = useState<GenerationRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingRun, setCreatingRun] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exportingMarkdown, setExportingMarkdown] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(
    null
  );

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

  const loadTemplates = async () => {
    try {
      const data = await request<TemplateRecord[]>("/api/templates");
      setTemplates(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load templates"
      );
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadDocument = async () => {
    if (!projectId || !documentId) return;

    setError(null);

    try {
      const data = await request<DocumentDetail>(
        `/api/projects/${projectId}/documents/${documentId}`
      );
      setDocument(data);
      setForm({
        title: data.title,
        type: data.type,
        objective: data.objective,
        instructions: data.instructions || "",
        outline: data.outline || "",
        content: data.content || "",
        templateId: data.templateId || "",
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load document"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRuns = async () => {
    if (!projectId || !documentId) return;

    setRunsError(null);

    try {
      const data = await request<GenerationRun[]>(
        `/api/projects/${projectId}/documents/${documentId}/generation-runs`
      );
      setRuns(data);
    } catch (loadError) {
      setRunsError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load generation runs"
      );
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !projectId || !documentId) return;
    loadTemplates();
    loadDocument();
    loadRuns();
  }, [router.isReady, projectId, documentId]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!projectId || !documentId) return;

    setSaving(true);
    setError(null);

    try {
      const updatedDocument = await request<DocumentDetail>(
        `/api/projects/${projectId}/documents/${documentId}`,
        {
          method: "PATCH",
          body: JSON.stringify(form),
        }
      );
      setDocument(updatedDocument);
      setForm({
        title: updatedDocument.title,
        type: updatedDocument.type,
        objective: updatedDocument.objective,
        instructions: updatedDocument.instructions || "",
        outline: updatedDocument.outline || "",
        content: updatedDocument.content || "",
        templateId: updatedDocument.templateId || "",
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save document"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRun = async () => {
    if (!projectId || !documentId) return;

    setCreatingRun(true);
    setRunsError(null);

    try {
      await request<GenerationRun>(
        `/api/projects/${projectId}/documents/${documentId}/generation-runs`,
        {
          method: "POST",
        }
      );
      await loadRuns();
    } catch (createError) {
      setRunsError(
        createError instanceof Error
          ? createError.message
          : "Unable to prepare generation context"
      );
    } finally {
      setCreatingRun(false);
    }
  };

  const handleGenerate = async () => {
    if (!projectId || !documentId) return;

    setGenerating(true);
    setRunsError(null);
    setGenerationSuccess(null);

    try {
      const result = await request<{
        document: DocumentDetail;
        generationRun: GenerationRun;
      }>(`/api/projects/${projectId}/documents/${documentId}/generate`, {
        method: "POST",
      });
      const updatedDocument = result.document;
      setDocument(updatedDocument);
      setForm({
        title: updatedDocument.title,
        type: updatedDocument.type,
        objective: updatedDocument.objective,
        instructions: updatedDocument.instructions || "",
        outline: updatedDocument.outline || "",
        content: updatedDocument.content || "",
        templateId: updatedDocument.templateId || "",
      });
      setGenerationSuccess("Generated Markdown has been saved into the document content.");
      await loadRuns();
    } catch (generateError) {
      setRunsError(
        generateError instanceof Error
          ? generateError.message
          : "Unable to generate document"
      );
      await loadRuns();
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async (format: "markdown" | "docx" | "pdf") => {
    if (!projectId || !documentId) return;

    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (format === "markdown") {
      setExportingMarkdown(true);
    } else if (format === "docx") {
      setExportingDocx(true);
    } else {
      setExportingPdf(true);
    }

    setExportError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentId}/export/${format}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | ApiResponse<unknown>
          | null;
        throw new Error(payload?.message || `Unable to export ${format}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename =
        filenameMatch?.[1] ||
        (format === "markdown" ? "document.md" : `document.${format}`);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.download = filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setExportError(
        downloadError instanceof Error
          ? downloadError.message
          : `Unable to export ${format}`
      );
    } finally {
      if (format === "markdown") {
        setExportingMarkdown(false);
      } else if (format === "docx") {
        setExportingDocx(false);
      } else {
        setExportingPdf(false);
      }
    }
  };

  const hasSavedContent = Boolean(document?.content?.trim());

  return (
    <AppShell
      eyebrow="Document"
      title={document?.title || "Document"}
      description="Manual document workspace for metadata, outline, and draft content."
    >
      <div className="mb-4">
        <Link href={projectId ? `/dashboard/projects/${projectId}` : "/dashboard/projects"}>
          <a className={BUTTON_SUBTLE}>Back to project</a>
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
            <div className="h-40 rounded-2xl bg-black/5" />
          </div>
        </section>
      ) : !document ? (
        <section className={`${CARD} p-10 text-center`}>
          <p className="text-lg font-semibold">Document not found.</p>
          <p className="mt-3 text-sm font-medium text-black/55">
            The document may have been removed or belongs to another project.
          </p>
        </section>
      ) : (
        <>
          <section className={`${CARD} p-6`}>
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-black/50">
              <span className="rounded-full bg-black px-3 py-1 text-white">
                {document.status}
              </span>
              <span className="rounded-full bg-black/5 px-3 py-1">
                {document.type}
              </span>
              <span className="rounded-full bg-black/5 px-3 py-1">
                {document.template?.name || "No template"}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium text-black/45">
              <span>Created {formatDate(document.createdAt)}</span>
              <span>Updated {formatDate(document.updatedAt)}</span>
            </div>
          </section>

          <section className={`${CARD} mt-4 p-6`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
                  Generation runs
                </p>
                <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
                  Generation context history
                </h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-black/55">
                  Prepare and review the exact project, template, knowledge, and
                  resource context that future AI generation will use. Real AI
                  generation is not enabled yet.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateRun}
                disabled={creatingRun || generating}
                className={BUTTON_SUBTLE}
              >
                {creatingRun ? "Preparing..." : "Prepare context"}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || creatingRun}
                className={BUTTON_BLUE}
              >
                {generating ? "Generating..." : "Generate document"}
              </button>
            </div>

            {generationSuccess && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
                {generationSuccess}
              </div>
            )}

            {runsError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                {runsError}
              </div>
            )}

            <div className="mt-6">
              {runsLoading ? (
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-28 rounded-2xl bg-black/5" />
                  ))}
                </div>
              ) : !runs.length ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-black/[0.02] p-8 text-center">
                  <p className="text-sm font-semibold">
                    No generation runs yet.
                  </p>
                  <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-black/55">
                    Prepare the first context preview before real generation is
                    connected.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {runs.map((run) => (
                    <article
                      key={run.id}
                      className="rounded-2xl border border-black/10 bg-black/[0.02] p-5"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2 text-xs font-semibold text-black/50">
                            <span className="rounded-full bg-black px-3 py-1 text-white">
                              {run.status}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1">
                              {run.provider}
                            </span>
                            <span className="rounded-full bg-white px-3 py-1">
                              {run.model}
                            </span>
                          </div>
                          <p className="mt-3 text-xs font-medium text-black/40">
                            Created {formatDate(run.createdAt)}
                          </p>
                        </div>
                      </div>
                      <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-medium leading-6 text-black/70">
                        {run.inputSummary || "No input summary saved."}
                      </pre>
                      {run.output && (
                        <div className="mt-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45">
                            Output preview
                          </p>
                          <pre className="mt-2 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-xs font-medium leading-6 text-black/70">
                            {run.output.length > 3000
                              ? `${run.output.slice(0, 3000)}...`
                              : run.output}
                          </pre>
                        </div>
                      )}
                      {run.error && (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                          {run.error}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <form className="mt-4 grid gap-4" onSubmit={handleSave}>
            <section className={`${CARD} p-6`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
                Metadata
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_260px]">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    Title
                  </span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className={INPUT}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    Type
                  </span>
                  <input
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value,
                      }))
                    }
                    className={INPUT}
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                    Template
                  </span>
                  <select
                    value={form.templateId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        templateId: event.target.value,
                      }))
                    }
                    className={INPUT}
                    disabled={templatesLoading}
                  >
                    <option value="">No template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Objective
                </span>
                <textarea
                  value={form.objective}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      objective: event.target.value,
                    }))
                  }
                  className={TEXTAREA}
                  required
                />
              </label>
              <label className="mt-4 block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
                  Instructions
                </span>
                <textarea
                  value={form.instructions}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      instructions: event.target.value,
                    }))
                  }
                  className={TEXTAREA}
                />
              </label>
            </section>

            <section className={`${CARD} p-6`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
                Outline
              </p>
              <textarea
                value={form.outline}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    outline: event.target.value,
                  }))
                }
                className={`${TEXTAREA} mt-5`}
                placeholder="Draft the document outline manually."
              />
            </section>

            <section className={`${CARD} p-6`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-500">
                    Content
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-black/55">
                    Export uses the latest saved document content.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport("markdown")}
                    disabled={exportingMarkdown || !hasSavedContent}
                    className={BUTTON_SUBTLE}
                  >
                    {exportingMarkdown ? "Exporting..." : "Export Markdown"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("docx")}
                    disabled={exportingDocx || !hasSavedContent}
                    className={BUTTON_SUBTLE}
                  >
                    {exportingDocx ? "Exporting..." : "Export DOCX"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("pdf")}
                    disabled={exportingPdf || !hasSavedContent}
                    className={BUTTON_SUBTLE}
                  >
                    {exportingPdf ? "Exporting..." : "Export PDF"}
                  </button>
                </div>
              </div>
              {!hasSavedContent && (
                <p className="mt-4 text-sm font-semibold text-black/45">
                  Generate or write content before exporting.
                </p>
              )}
              {exportError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                  {exportError}
                </div>
              )}
              <textarea
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    content: event.target.value,
                  }))
                }
                className={`${CONTENT_TEXTAREA} mt-5`}
                placeholder="Write or paste draft content here."
              />
            </section>

            <div>
              <button type="submit" disabled={saving} className={BUTTON_BLUE}>
                {saving ? "Saving..." : "Save document"}
              </button>
            </div>
          </form>
        </>
      )}
    </AppShell>
  );
}
