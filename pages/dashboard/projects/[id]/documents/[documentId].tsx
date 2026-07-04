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
import {
  DOCUMENT_PLAN_STATUS_UI,
  DocumentPlan,
  DocumentPlanStatus,
  planKeyFigureCount,
} from "../../../../../lib/documents/document-plan";
import {
  SECTION_STATUS_UI,
  SectionDTO,
} from "../../../../../lib/documents/document-sections";

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
  documentPlan?: DocumentPlan | null;
  documentPlanStatus?: DocumentPlanStatus | null;
  documentPlanUpdatedAt?: string | null;
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
  const [plan, setPlan] = useState<DocumentPlan | null>(null);
  const [planStatus, setPlanStatus] = useState<DocumentPlanStatus | null>(null);
  const [planUpdatedAt, setPlanUpdatedAt] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [sections, setSections] = useState<SectionDTO[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [generatingSectionId, setGeneratingSectionId] = useState<string | null>(
    null
  );
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionEdit, setSectionEdit] = useState("");
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionsNote, setSectionsNote] = useState<string | null>(null);
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

  const requestFull = async <T,>(url: string, options: RequestInit = {}) => {
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
    return { data: payload.data as T, message: payload.message };
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
      setPlan(data.documentPlan ?? null);
      setPlanStatus(data.documentPlanStatus ?? null);
      setPlanUpdatedAt(data.documentPlanUpdatedAt ?? null);
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
    loadSections();
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

  const handleGeneratePlan = async () => {
    if (!projectId || !documentId) return;
    setPlanning(true);
    setPlanError(null);
    try {
      const res = await request<{
        documentPlan: DocumentPlan | null;
        documentPlanStatus: DocumentPlanStatus;
        documentPlanUpdatedAt: string | null;
        warning?: string | null;
      }>(`/api/projects/${projectId}/documents/${documentId}/plan`, {
        method: "POST",
      });
      setPlan(res.documentPlan);
      setPlanStatus(res.documentPlanStatus);
      setPlanUpdatedAt(res.documentPlanUpdatedAt);
      if (res.documentPlanStatus === "failed") {
        setPlanError(
          res.warning ||
            "Document plan could not be generated. Check OpenAI configuration."
        );
      } else if (res.documentPlan) {
        setShowPlan(true);
      }
    } catch (planErr) {
      setPlanError(
        planErr instanceof Error
          ? planErr.message
          : "Unable to generate document plan"
      );
    } finally {
      setPlanning(false);
    }
  };

  const sectionsBase = () =>
    `/api/projects/${projectId}/documents/${documentId}/sections`;

  const loadSections = async () => {
    if (!projectId || !documentId) return;
    try {
      const data = await request<SectionDTO[]>(sectionsBase());
      setSections(data);
    } catch {
      // Non-fatal: the sections panel simply shows an empty state.
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleSyncSections = async () => {
    setSyncing(true);
    setSectionsError(null);
    setSectionsNote(null);
    try {
      const { data, message } = await requestFull<SectionDTO[]>(
        `${sectionsBase()}/sync-from-plan`,
        { method: "POST" }
      );
      setSections(data);
      setSectionsNote(message ?? "Sections synced from plan.");
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to sync sections"
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateSection = async (id: string) => {
    setGeneratingSectionId(id);
    setSectionsError(null);
    setSectionsNote(null);
    try {
      const section = await request<SectionDTO>(
        `${sectionsBase()}/${id}/generate`,
        { method: "POST" }
      );
      setSections((cur) => cur.map((s) => (s.id === id ? section : s)));
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to generate section"
      );
    } finally {
      setGeneratingSectionId(null);
    }
  };

  const handleGenerateSections = async (mode: "missing" | "all") => {
    setGeneratingAll(true);
    setSectionsError(null);
    setSectionsNote(null);
    try {
      const { data, message } = await requestFull<{ sections: SectionDTO[] }>(
        `${sectionsBase()}/generate`,
        { method: "POST", body: JSON.stringify({ mode }) }
      );
      setSections(data.sections);
      setSectionsNote(message ?? "Sections generated.");
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to generate sections"
      );
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleAssemble = async () => {
    setAssembling(true);
    setSectionsError(null);
    setSectionsNote(null);
    try {
      const { data, message } = await requestFull<{ content: string }>(
        `${sectionsBase()}/assemble`,
        { method: "POST" }
      );
      setForm((cur) => ({ ...cur, content: data.content }));
      setDocument((cur) =>
        cur ? { ...cur, content: data.content, status: "READY_FOR_REVIEW" } : cur
      );
      setSectionsNote(message ?? "Document assembled from sections.");
      setView("preview");
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to assemble document"
      );
    } finally {
      setAssembling(false);
    }
  };

  const startSectionEdit = (section: SectionDTO) => {
    setEditingSectionId(section.id);
    setSectionEdit(section.content || "");
  };

  const handleSaveSection = async (id: string) => {
    setSavingSectionId(id);
    setSectionsError(null);
    try {
      const section = await request<SectionDTO>(`${sectionsBase()}/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: sectionEdit }),
      });
      setSections((cur) => cur.map((s) => (s.id === id ? section : s)));
      setEditingSectionId(null);
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to save section"
      );
    } finally {
      setSavingSectionId(null);
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

              {/* Sections */}
              <Card className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                      <Icon name="layers" size={14} />
                      Sections
                    </div>
                    <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
                      Generate the document section by section from the plan, then
                      assemble. Regenerate or edit any section without touching the
                      others.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon="layers"
                    loading={syncing}
                    onClick={handleSyncSections}
                  >
                    {sections.length ? "Sync from plan" : "Create from plan"}
                  </Button>
                </div>

                {sectionsError && (
                  <Alert tone="danger" className="mt-4">
                    {sectionsError}
                  </Alert>
                )}
                {sectionsNote && !sectionsError && (
                  <Alert tone="info" className="mt-4">
                    {sectionsNote}
                  </Alert>
                )}

                {sectionsLoading ? (
                  <div className="mt-4 space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : !sections.length ? (
                  <div className="mt-4 rounded-xl border border-dashed border-line bg-ink/[0.015] px-4 py-6 text-center text-sm text-ink-muted">
                    No sections yet. Generate a document plan, then sync sections
                    from it to generate the document piece by piece.
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        icon="generate"
                        loading={generatingAll}
                        onClick={() => handleGenerateSections("missing")}
                      >
                        Generate missing
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateSections("all")}
                        disabled={generatingAll}
                      >
                        Regenerate all
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon="check"
                        loading={assembling}
                        onClick={handleAssemble}
                      >
                        Assemble document
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {sections.map((s, index) => {
                        const ui = SECTION_STATUS_UI[s.status];
                        const busy = generatingSectionId === s.id;
                        return (
                          <div
                            key={s.id}
                            className="rounded-xl border border-line p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold text-ink-faint">
                                    {index + 1}.
                                  </span>
                                  <h4 className="text-sm font-semibold tracking-tight text-ink">
                                    {s.title}
                                  </h4>
                                  <Badge tone={ui.tone}>{ui.label}</Badge>
                                </div>
                                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-ink-muted">
                                  <span>
                                    {s.wordCount}
                                    {s.targetWords ? `/${s.targetWords}` : ""} words
                                  </span>
                                  {s.sourceBriefs.length > 0 && (
                                    <span>{s.sourceBriefs.length} sources</span>
                                  )}
                                  {s.keyFigures.length > 0 && (
                                    <span>{s.keyFigures.length} figures</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex shrink-0 gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleGenerateSection(s.id)}
                                  title={s.content ? "Regenerate" : "Generate"}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-accent-300 hover:text-accent-700 disabled:opacity-50"
                                >
                                  {busy ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                                  ) : (
                                    <Icon name="generate" size={15} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    editingSectionId === s.id
                                      ? setEditingSectionId(null)
                                      : startSectionEdit(s)
                                  }
                                  title="Edit"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                                >
                                  <Icon name="edit" size={15} />
                                </button>
                              </div>
                            </div>

                            {editingSectionId === s.id ? (
                              <div className="mt-3">
                                <Textarea
                                  value={sectionEdit}
                                  onChange={(e) => setSectionEdit(e.target.value)}
                                  className="min-h-[180px] font-mono text-[13px] leading-6"
                                />
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    icon="check"
                                    loading={savingSectionId === s.id}
                                    onClick={() => handleSaveSection(s.id)}
                                  >
                                    Save section
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingSectionId(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : s.content ? (
                              <div className="mt-3 max-h-56 overflow-auto rounded-lg bg-ink/[0.02] p-3">
                                <MarkdownPreview content={s.content} />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* Side panel */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Document plan */}
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="layers" size={14} />
                  Document plan
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  Plan the sections and source allocation before writing — it
                  makes the document more controlled and specific.
                </p>

                {(() => {
                  const status: DocumentPlanStatus = planStatus ?? "pending";
                  const ui = DOCUMENT_PLAN_STATUS_UI[status];
                  return (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Badge
                        tone={ui.tone}
                        icon={
                          status === "ready"
                            ? "check"
                            : status === "failed"
                            ? "alert"
                            : undefined
                        }
                      >
                        {ui.label}
                      </Badge>
                      {plan ? (
                        <>
                          <Badge tone="neutral" icon="documents">
                            {plan.sections.length} sections
                          </Badge>
                          {planKeyFigureCount(plan) > 0 && (
                            <Badge tone="neutral" icon="bolt">
                              {planKeyFigureCount(plan)} figures
                            </Badge>
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })()}

                {planError && (
                  <Alert tone="danger" className="mt-4">
                    {planError}
                  </Alert>
                )}

                {plan && (
                  <div className="mt-4 space-y-3">
                    {plan.executiveIntent && (
                      <p className="text-sm leading-6 text-ink-soft">
                        {plan.executiveIntent.length > 220
                          ? `${plan.executiveIntent.slice(0, 220)}…`
                          : plan.executiveIntent}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-ink/[0.03] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                          Sources used
                        </p>
                        <p className="text-sm font-semibold text-ink">
                          {plan.sourceCoverage.resourcesUsed.length}
                        </p>
                      </div>
                      <div className="rounded-lg bg-ink/[0.03] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                          Missing info
                        </p>
                        <p className="text-sm font-semibold text-ink">
                          {plan.missingInformation.length}
                        </p>
                      </div>
                    </div>

                    {plan.sourceCoverage.warnings.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                          Coverage warnings
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {plan.sourceCoverage.warnings.slice(0, 3).map((w, i) => (
                            <li key={i} className="text-xs leading-5 text-amber-700">
                              • {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowPlan((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
                    >
                      <Icon
                        name={showPlan ? "chevron-down" : "chevron-right"}
                        size={14}
                      />
                      {showPlan ? "Hide" : "Show"} planned sections
                    </button>

                    {showPlan && (
                      <ol className="space-y-1.5 rounded-xl bg-ink/[0.02] p-3">
                        {plan.sections.map((s, i) => (
                          <li key={s.id} className="text-xs leading-5">
                            <span className="font-semibold text-ink">
                              {i + 1}. {s.title}
                            </span>
                            {s.keyFigures.length > 0 && (
                              <span className="text-ink-muted">
                                {" "}
                                · {s.keyFigures.length} figure
                                {s.keyFigures.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                <div className="mt-5">
                  <Button
                    type="button"
                    variant={plan ? "ghost" : "primary"}
                    onClick={handleGeneratePlan}
                    loading={planning}
                    icon="layers"
                    className="w-full"
                  >
                    {planning
                      ? "Planning…"
                      : plan
                      ? "Refresh plan"
                      : "Generate document plan"}
                  </Button>
                  {planUpdatedAt && (
                    <p className="mt-2 text-xs text-ink-faint">
                      Updated {formatDate(planUpdatedAt)}
                    </p>
                  )}
                </div>
              </Card>

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

                {planStatus === "ready" || planStatus === "partial" ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                    <Icon
                      name="check-circle"
                      size={16}
                      className="shrink-0 text-emerald-500"
                    />
                    <p className="text-xs leading-5 text-emerald-700">
                      A document plan is ready — generation will follow it.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-ink/[0.02] px-3.5 py-2.5">
                    <Icon
                      name="info"
                      size={16}
                      className="shrink-0 text-ink-muted"
                    />
                    <p className="text-xs leading-5 text-ink-muted">
                      Tip: generate a document plan first for a more controlled,
                      specific result.
                    </p>
                  </div>
                )}

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
                    {generating
                      ? "Generating…"
                      : planStatus === "ready" || planStatus === "partial"
                      ? "Generate from plan"
                      : "Generate document"}
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
