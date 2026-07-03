import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../../../../components/app-shell";
import { MarkdownPreview } from "../../../../../components/product/markdown";
import { Icon, IconName } from "../../../../../components/ui/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Skeleton,
  StatusPill,
  Textarea,
  buttonClass,
  cn,
} from "../../../../../components/ui";

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
  template?: { id: string; name: string; type: string } | null;
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

interface ProjectMeta {
  id: string;
  name: string;
  counts?: { documents: number; knowledgeItems: number; resources: number };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
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
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [showSetup, setShowSetup] = useState(false);

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

  const loadProjectMeta = async () => {
    if (!projectId) return;
    try {
      const data = await request<ProjectMeta>(`/api/projects/${projectId}`);
      setProjectMeta(data);
    } catch {
      // Non-fatal: readiness panel just shows less detail.
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
          : "Unable to load generation history"
      );
    } finally {
      setRunsLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady || !projectId || !documentId) return;
    loadTemplates();
    loadProjectMeta();
    loadDocument();
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, projectId, documentId]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || !documentId) return;
    setSaving(true);
    setError(null);
    try {
      const updatedDocument = await request<DocumentDetail>(
        `/api/projects/${projectId}/documents/${documentId}`,
        { method: "PATCH", body: JSON.stringify(form) }
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
        { method: "POST" }
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
      setGenerationSuccess(
        "Draft generated and saved to the document content. Review it below."
      );
      setView("preview");
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
    if (format === "markdown") setExportingMarkdown(true);
    else if (format === "docx") setExportingDocx(true);
    else setExportingPdf(true);
    setExportError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentId}/export/${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
      if (format === "markdown") setExportingMarkdown(false);
      else if (format === "docx") setExportingDocx(false);
      else setExportingPdf(false);
    }
  };

  const hasSavedContent = Boolean(document?.content?.trim());
  const hasUnsavedContent = form.content !== (document?.content || "");
  const wordCount = form.content.trim()
    ? form.content.trim().split(/\s+/).length
    : 0;

  const readiness: { icon: IconName; label: string; value: string; ok: boolean }[] =
    [
      {
        icon: "knowledge",
        label: "Knowledge items",
        value: String(projectMeta?.counts?.knowledgeItems ?? "—"),
        ok: (projectMeta?.counts?.knowledgeItems ?? 0) > 0,
      },
      {
        icon: "resources",
        label: "Source resources",
        value: String(projectMeta?.counts?.resources ?? "—"),
        ok: (projectMeta?.counts?.resources ?? 0) > 0,
      },
      {
        icon: "templates",
        label: "Template",
        value: document?.template?.name || "None",
        ok: Boolean(document?.templateId),
      },
    ];

  const EXPORTS: {
    format: "markdown" | "docx" | "pdf";
    label: string;
    busy: boolean;
  }[] = [
    { format: "markdown", label: "Markdown", busy: exportingMarkdown },
    { format: "docx", label: "Word (DOCX)", busy: exportingDocx },
    { format: "pdf", label: "PDF", busy: exportingPdf },
  ];

  return (
    <AppShell
      eyebrow="Document studio"
      icon="documents"
      title={document?.title || "Document"}
      description="Set up, generate, review and export — everything for this document in one place."
      backHref={projectId ? `/dashboard/projects/${projectId}` : "/dashboard/projects"}
      backLabel="Back to project"
      actions={
        document ? <StatusPill status={document.status} /> : undefined
      }
    >
      {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          <Skeleton className="h-[420px]" />
          <div className="space-y-6">
            <Skeleton className="h-52" />
            <Skeleton className="h-40" />
          </div>
        </div>
      ) : !document ? (
        <Card className="p-10 text-center">
          <p className="text-lg font-semibold text-ink">Document not found</p>
          <p className="mt-2 text-sm text-ink-muted">
            The document may have been removed or belongs to another project.
          </p>
        </Card>
      ) : (
        <form onSubmit={handleSave}>
          <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
            {/* Main: editor + setup */}
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                  <div className="inline-flex rounded-xl border border-line bg-canvas p-1">
                    <button
                      type="button"
                      onClick={() => setView("edit")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                        view === "edit"
                          ? "bg-surface text-ink shadow-soft"
                          : "text-ink-muted hover:text-ink"
                      )}
                    >
                      <Icon name="edit" size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setView("preview")}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                        view === "preview"
                          ? "bg-surface text-ink shadow-soft"
                          : "text-ink-muted hover:text-ink"
                      )}
                    >
                      <Icon name="documents" size={14} />
                      Preview
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-ink-faint">
                      {wordCount} words
                      {hasUnsavedContent && (
                        <span className="ml-2 text-amber-600">• Unsaved</span>
                      )}
                    </span>
                    <Button type="submit" size="sm" loading={saving} icon="check">
                      Save
                    </Button>
                  </div>
                </div>

                <div className="p-5">
                  {view === "edit" ? (
                    <Textarea
                      value={form.content}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          content: event.target.value,
                        }))
                      }
                      placeholder="Write or paste your document content here — or generate a first draft from the panel on the right. Markdown is supported."
                      className="min-h-[440px] border-0 font-mono text-[13px] leading-6 shadow-none focus:ring-0 focus:ring-offset-0"
                    />
                  ) : form.content.trim() ? (
                    <div className="min-h-[440px] max-h-[640px] overflow-auto rounded-xl bg-ink/[0.015] p-6">
                      <MarkdownPreview content={form.content} />
                    </div>
                  ) : (
                    <div className="flex min-h-[440px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink/[0.015] text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
                        <Icon name="documents" size={24} />
                      </div>
                      <p className="mt-4 text-base font-semibold text-ink">
                        No content yet
                      </p>
                      <p className="mt-1.5 max-w-sm text-sm leading-6 text-ink-muted">
                        Generate a first draft from the panel on the right, or
                        switch to Edit and start writing.
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Setup */}
              <Card className="p-6">
                <button
                  type="button"
                  onClick={() => setShowSetup((v) => !v)}
                  className="flex w-full items-center justify-between"
                >
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                    <Icon name="info" size={14} />
                    Document setup
                  </span>
                  <Icon
                    name={showSetup ? "chevron-down" : "chevron-right"}
                    size={16}
                    className="text-ink-muted"
                  />
                </button>

                {!showSetup && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge tone="neutral">{document.type}</Badge>
                    <Badge tone="accent" icon="templates">
                      {document.template?.name || "No template"}
                    </Badge>
                    <span className="text-xs font-medium text-ink-faint">
                      Objective: {document.objective.slice(0, 80)}
                      {document.objective.length > 80 ? "…" : ""}
                    </span>
                  </div>
                )}

                {showSetup && (
                  <div className="mt-5 grid gap-4 animate-fade-up">
                    <div className="grid gap-4 md:grid-cols-[1fr_180px_220px]">
                      <Field label="Title">
                        <Input
                          value={form.title}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          required
                        />
                      </Field>
                      <Field label="Type">
                        <Input
                          value={form.type}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              type: event.target.value,
                            }))
                          }
                          required
                        />
                      </Field>
                      <Field label="Template">
                        <Select
                          value={form.templateId}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              templateId: event.target.value,
                            }))
                          }
                          disabled={templatesLoading}
                        >
                          <option value="">No template</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    <Field label="Objective">
                      <Textarea
                        value={form.objective}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            objective: event.target.value,
                          }))
                        }
                        className="min-h-[100px]"
                        required
                      />
                    </Field>
                    <Field label="Instructions">
                      <Textarea
                        value={form.instructions}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            instructions: event.target.value,
                          }))
                        }
                        className="min-h-[100px]"
                        placeholder="Optional tone, structure, constraints, or source priorities."
                      />
                    </Field>
                    <Field label="Outline">
                      <Textarea
                        value={form.outline}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            outline: event.target.value,
                          }))
                        }
                        className="min-h-[100px]"
                        placeholder="Draft the document outline (optional)."
                      />
                    </Field>
                    <div>
                      <Button type="submit" loading={saving} icon="check">
                        Save setup
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Side panel */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Generate */}
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="generate" size={14} />
                  Generate with AI
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  We&apos;ll use this project&apos;s context to draft the
                  document. Review before generating.
                </p>

                <div className="mt-4 space-y-2">
                  {readiness.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between rounded-xl bg-ink/[0.03] px-3.5 py-2.5"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                        <Icon
                          name={r.icon}
                          size={16}
                          className="text-ink-muted"
                        />
                        {r.label}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1.5 text-sm font-semibold",
                          r.ok ? "text-emerald-600" : "text-ink-faint"
                        )}
                      >
                        {r.value}
                        {r.ok && <Icon name="check" size={14} />}
                      </span>
                    </div>
                  ))}
                </div>

                {generationSuccess && (
                  <Alert tone="success" className="mt-4">
                    {generationSuccess}
                  </Alert>
                )}
                {runsError && (
                  <Alert tone="danger" className="mt-4">
                    {runsError}
                  </Alert>
                )}

                {generating && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                    <span className="text-sm font-medium text-accent-700">
                      Generating your draft…
                    </span>
                  </div>
                )}

                <div className="mt-5 flex flex-col gap-2">
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    loading={generating}
                    disabled={creatingRun}
                    icon="generate"
                    className="w-full"
                  >
                    {generating ? "Generating…" : "Generate document"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCreateRun}
                    loading={creatingRun}
                    disabled={generating}
                    icon="layers"
                    className="w-full"
                  >
                    {creatingRun ? "Preparing…" : "Preview context only"}
                  </Button>
                </div>
              </Card>

              {/* Export */}
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="export" size={14} />
                  Export
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  Exports use the latest saved content.
                </p>

                {exportError && (
                  <Alert tone="danger" className="mt-4">
                    {exportError}
                  </Alert>
                )}

                <div className="mt-4 space-y-2">
                  {EXPORTS.map((exp) => (
                    <button
                      key={exp.format}
                      type="button"
                      onClick={() => handleExport(exp.format)}
                      disabled={exp.busy || !hasSavedContent}
                      className="group flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-left transition-all duration-200 hover:border-accent-300 hover:bg-accent-50/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:bg-transparent"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon
                          name="download"
                          size={16}
                          className="text-ink-muted"
                        />
                        <span className="text-sm font-semibold text-ink">
                          {exp.label}
                        </span>
                      </span>
                      {exp.busy ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                      ) : hasSavedContent ? (
                        <Badge tone="success">Ready</Badge>
                      ) : (
                        <Badge tone="neutral">No content</Badge>
                      )}
                    </button>
                  ))}
                </div>

                <p className="mt-4 text-xs text-ink-faint">
                  {hasSavedContent
                    ? `Last saved ${formatDate(document.updatedAt)}`
                    : "Generate or write content, then save to enable exports."}
                </p>
              </Card>

              {/* History */}
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="clock" size={14} />
                  Generation history
                </div>

                <div className="mt-4">
                  {runsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : !runs.length ? (
                    <p className="rounded-xl border border-dashed border-line bg-ink/[0.015] px-4 py-6 text-center text-sm text-ink-muted">
                      No runs yet. Generate or preview context to see the history
                      here.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {runs.map((run) => (
                        <div
                          key={run.id}
                          className="rounded-xl border border-line bg-ink/[0.015] p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <StatusPill status={run.status} />
                            <span className="text-xs font-medium text-ink-faint">
                              {formatDate(run.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-medium text-ink-muted">
                            {run.provider} · {run.model}
                          </p>
                          {run.error && (
                            <Alert tone="danger" className="mt-3">
                              {run.error}
                            </Alert>
                          )}
                          {run.inputSummary && (
                            <details className="mt-3 group">
                              <summary className="cursor-pointer text-xs font-semibold text-accent-600 hover:text-accent-700">
                                View context used
                              </summary>
                              <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-[11px] leading-5 text-ink-soft">
                                {run.inputSummary}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </form>
      )}
    </AppShell>
  );
}
