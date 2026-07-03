import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../../components/app-shell";
import { Icon, IconName } from "../../../components/ui/icons";
import {
  WorkflowStep,
  WorkflowStepper,
} from "../../../components/product/workflow";
import {
  EXTRACTION_STATUS_UI,
  ExtractionStatus,
} from "../../../lib/resources/extraction-meta";
import {
  SOURCE_BRIEF_STATUS_UI,
  SourceBriefStatus,
} from "../../../lib/resources/source-brief";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Skeleton,
  StatusPill,
  Textarea,
  buttonClass,
  cn,
} from "../../../components/ui";

type ProjectStatus = "ACTIVE" | "ARCHIVED";
type DocumentStatus =
  | "DRAFT"
  | "GENERATING"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "ARCHIVED";

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

interface TemplateRecord {
  id: string;
  name: string;
  type: string;
  description?: string | null;
}

interface DocumentItem {
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

interface DocumentForm {
  title: string;
  type: string;
  objective: string;
  instructions: string;
  templateId: string;
}

interface ResourceExtraction {
  status: ExtractionStatus;
  summary?: string | null;
  fileType?: string;
  pages?: number;
  sheets?: number;
  characters?: number;
  words?: number;
  tablesDetected?: number;
  warnings?: string[];
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
  extraction?: ResourceExtraction | null;
  sourceBriefStatus?: SourceBriefStatus | null;
  sourceBriefSummary?: string | null;
  keyFigureCount?: number;
  sourceBriefUpdatedAt?: string | null;
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

function formatSize(value?: number | null) {
  if (value === undefined || value === null) return "Size unknown";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType: string): IconName {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "sheet";
  return "file";
}

const initialKnowledgeForm = (): KnowledgeForm => ({
  title: "",
  category: "",
  content: "",
});
const initialDocumentForm = (): DocumentForm => ({
  title: "",
  type: "",
  objective: "",
  instructions: "",
  templateId: "",
});
const initialResourceForm = (): ResourceForm => ({
  filename: "",
  mimeType: "",
  sizeBytes: "",
  storageUrl: "",
  extractedText: "",
});

type Tab = "overview" | "knowledge" | "resources" | "documents";

export default function ProjectDetailPage() {
  const router = useRouter();
  const projectId =
    typeof router.query.id === "string" ? router.query.id : undefined;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showBasicEdit, setShowBasicEdit] = useState(false);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [documentForm, setDocumentForm] =
    useState<DocumentForm>(initialDocumentForm);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null
  );
  const [documentEditForm, setDocumentEditForm] =
    useState<DocumentForm>(initialDocumentForm);
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
  const [resourceUploadFile, setResourceUploadFile] = useState<File | null>(
    null
  );
  const [showManualResource, setShowManualResource] = useState(false);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(
    null
  );
  const [resourceEditForm, setResourceEditForm] =
    useState<ResourceForm>(initialResourceForm);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [knowledgeLoading, setKnowledgeLoading] = useState(true);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [savingKnowledge, setSavingKnowledge] = useState(false);
  const [savingResource, setSavingResource] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [updatingDocumentId, setUpdatingDocumentId] = useState<string | null>(
    null
  );
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
  const [distillingResourceId, setDistillingResourceId] = useState<
    string | null
  >(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
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
      setForm({ name: data.name, description: data.description || "" });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load project"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setDocumentsError(null);
    try {
      const data = await request<TemplateRecord[]>("/api/templates");
      setTemplates(data);
    } catch (loadError) {
      setDocumentsError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load templates"
      );
    } finally {
      setTemplatesLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!projectId) return;
    setDocumentsError(null);
    try {
      const data = await request<DocumentItem[]>(
        `/api/projects/${projectId}/documents`
      );
      setDocuments(data);
    } catch (loadError) {
      setDocumentsError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load documents"
      );
    } finally {
      setDocumentsLoading(false);
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
    loadTemplates();
    loadDocuments();
    loadKnowledge();
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, projectId]);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      const updatedProject = await request<ProjectDetail>(
        `/api/projects/${project.id}`,
        { method: "PATCH", body: JSON.stringify(form) }
      );
      setProject({ ...updatedProject, counts: project.counts });
      setShowBasicEdit(false);
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
      setProject({ ...updatedProject, counts: project.counts });
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

  const handleDocumentCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId) return;
    setSavingDocument(true);
    setDocumentsError(null);
    try {
      await request<DocumentItem>(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body: JSON.stringify(documentForm),
      });
      setDocumentForm(initialDocumentForm);
      await loadDocuments();
    } catch (createError) {
      setDocumentsError(
        createError instanceof Error
          ? createError.message
          : "Unable to create document"
      );
    } finally {
      setSavingDocument(false);
    }
  };

  const startDocumentEdit = (item: DocumentItem) => {
    setEditingDocumentId(item.id);
    setDocumentEditForm({
      title: item.title,
      type: item.type,
      objective: item.objective,
      instructions: item.instructions || "",
      templateId: item.templateId || "",
    });
    setDocumentsError(null);
  };

  const handleDocumentUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId || !editingDocumentId) return;
    setUpdatingDocumentId(editingDocumentId);
    setDocumentsError(null);
    try {
      await request<DocumentItem>(
        `/api/projects/${projectId}/documents/${editingDocumentId}`,
        { method: "PATCH", body: JSON.stringify(documentEditForm) }
      );
      setEditingDocumentId(null);
      setDocumentEditForm(initialDocumentForm);
      await loadDocuments();
    } catch (updateError) {
      setDocumentsError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update document"
      );
    } finally {
      setUpdatingDocumentId(null);
    }
  };

  const handleDocumentDelete = async (item: DocumentItem) => {
    if (!projectId) return;
    const confirmed = window.confirm(
      `Delete "${item.title}" from this project's documents?`
    );
    if (!confirmed) return;
    setDeletingDocumentId(item.id);
    setDocumentsError(null);
    try {
      await request<{ id: string }>(
        `/api/projects/${projectId}/documents/${item.id}`,
        { method: "DELETE" }
      );
      await loadDocuments();
      if (editingDocumentId === item.id) setEditingDocumentId(null);
    } catch (deleteError) {
      setDocumentsError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete document"
      );
    } finally {
      setDeletingDocumentId(null);
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
        { method: "POST", body: JSON.stringify(knowledgeForm) }
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
        { method: "PATCH", body: JSON.stringify(knowledgeEditForm) }
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
        { method: "DELETE" }
      );
      setKnowledgeItems((current) =>
        current.filter((knowledgeItem) => knowledgeItem.id !== item.id)
      );
      if (editingKnowledgeId === item.id) setEditingKnowledgeId(null);
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
      setShowManualResource(false);
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

  const handleResourceUploadFileChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    setResourceUploadFile(event.target.files?.[0] || null);
    setResourcesError(null);
  };

  const uploadResourceFile = async (file: File) => {
    if (!projectId) return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setUploadingResource(true);
    setResourcesError(null);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/resources/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );
      const payload = (await response.json()) as ApiResponse<ResourceItem>;
      if (response.status === 401) {
        localStorage.removeItem("token");
        router.replace("/login");
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Unable to upload resource");
      }
      setResourceUploadFile(null);
      await loadResources();
    } catch (uploadError) {
      setResourcesError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload resource"
      );
    } finally {
      setUploadingResource(false);
    }
  };

  const handleResourceUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resourceUploadFile) {
      setResourcesError("Choose a file to upload");
      return;
    }
    await uploadResourceFile(resourceUploadFile);
  };

  const handleDrop = async (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setResourceUploadFile(file);
      await uploadResourceFile(file);
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
        { method: "PATCH", body: JSON.stringify(resourceEditForm) }
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

  const handleResourceDistill = async (item: ResourceItem) => {
    if (!projectId) return;
    setDistillingResourceId(item.id);
    setResourcesError(null);
    try {
      const updated = await request<ResourceItem>(
        `/api/projects/${projectId}/resources/${item.id}/distill`,
        { method: "POST" }
      );
      setResources((current) =>
        current.map((resource) =>
          resource.id === item.id ? { ...resource, ...updated } : resource
        )
      );
    } catch (distillError) {
      setResourcesError(
        distillError instanceof Error
          ? distillError.message
          : "Unable to generate source brief"
      );
    } finally {
      setDistillingResourceId(null);
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
        { method: "DELETE" }
      );
      await loadResources();
      if (editingResourceId === item.id) setEditingResourceId(null);
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

  const documentsCount = documents.length;
  const knowledgeCount = knowledgeItems.length;
  const resourcesCount = resources.length;
  const generatedCount = documents.filter((d) =>
    ["READY_FOR_REVIEW", "APPROVED"].includes(d.status)
  ).length;

  const steps: WorkflowStep[] = [
    {
      icon: "knowledge",
      label: "Add knowledge",
      hint: "Reusable project memory.",
      state: knowledgeCount > 0 ? "done" : "current",
    },
    {
      icon: "resources",
      label: "Upload resources",
      hint: "Source material to draw from.",
      state:
        resourcesCount > 0 ? "done" : knowledgeCount > 0 ? "current" : "todo",
    },
    {
      icon: "documents",
      label: "Create document",
      hint: "Define the deliverable.",
      state: documentsCount > 0 ? "done" : resourcesCount > 0 ? "current" : "todo",
    },
    {
      icon: "generate",
      label: "Generate",
      hint: "Draft with AI.",
      state:
        generatedCount > 0 ? "done" : documentsCount > 0 ? "current" : "todo",
    },
    {
      icon: "check-circle",
      label: "Review",
      hint: "Refine the draft.",
      state: generatedCount > 0 ? "current" : "todo",
    },
    {
      icon: "export",
      label: "Export",
      hint: "Ship the document.",
      state: "todo",
    },
  ];

  const nextAction =
    knowledgeCount === 0
      ? { label: "Add your first knowledge item", tab: "knowledge" as Tab }
      : resourcesCount === 0
      ? { label: "Upload source material", tab: "resources" as Tab }
      : documentsCount === 0
      ? { label: "Create your first document", tab: "documents" as Tab }
      : { label: "Open a document to generate", tab: "documents" as Tab };

  const TABS: { key: Tab; label: string; icon: IconName; count?: number }[] = [
    { key: "overview", label: "Overview", icon: "dashboard" },
    { key: "knowledge", label: "Knowledge", icon: "knowledge", count: knowledgeCount },
    { key: "resources", label: "Resources", icon: "resources", count: resourcesCount },
    { key: "documents", label: "Documents", icon: "documents", count: documentsCount },
  ];

  return (
    <AppShell
      eyebrow="Project"
      icon="projects"
      title={project?.name || "Project"}
      description={
        project?.description ||
        "Your cockpit for knowledge, source material and the documents you produce."
      }
      backHref="/dashboard/projects"
      backLabel="All projects"
      actions={
        project ? (
          <>
            <StatusPill status={project.status} />
            <Button
              variant="ghost"
              size="md"
              icon="archive"
              loading={updatingStatus}
              onClick={handleStatusChange}
            >
              {project.status === "ACTIVE" ? "Archive" : "Reactivate"}
            </Button>
          </>
        ) : undefined
      }
    >
      {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-40" />
        </div>
      ) : !project ? (
        <EmptyState
          icon="alert"
          title="Project not found"
          description="The project may have been archived, removed, or created by another user."
          action={
            <Link href="/dashboard/projects">
              <a className={buttonClass("primary", "md")}>Back to projects</a>
            </Link>
          }
        />
      ) : (
        <>
          {/* Tabs */}
          <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-soft">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                  activeTab === tab.key
                    ? "bg-ink text-white shadow-soft"
                    : "text-ink-muted hover:bg-ink/[0.04] hover:text-ink"
                )}
              >
                <Icon name={tab.icon} size={16} />
                {tab.label}
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      activeTab === tab.key
                        ? "bg-white/20 text-white"
                        : "bg-ink/[0.06] text-ink-muted"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: "knowledge" as IconName,
                    label: "Knowledge",
                    value: knowledgeCount,
                  },
                  {
                    icon: "resources" as IconName,
                    label: "Resources",
                    value: resourcesCount,
                  },
                  {
                    icon: "documents" as IconName,
                    label: "Documents",
                    value: documentsCount,
                  },
                  {
                    icon: "generate" as IconName,
                    label: "Generated",
                    value: generatedCount,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-line bg-surface p-5 shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                        <Icon name={s.icon} size={17} />
                      </span>
                      <span className="text-2xl font-semibold tracking-tight text-ink">
                        {s.value}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-ink">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pipeline */}
              <Card className="p-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                    <Icon name="layers" size={14} />
                    Production pipeline
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    iconRight="arrow-right"
                    onClick={() => setActiveTab(nextAction.tab)}
                  >
                    {nextAction.label}
                  </Button>
                </div>
                <WorkflowStepper steps={steps} />
              </Card>

              {/* Basic info */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                    <Icon name="info" size={14} />
                    Project details
                  </div>
                  {!showBasicEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="edit"
                      onClick={() => setShowBasicEdit(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>

                {showBasicEdit ? (
                  <form
                    className="mt-5 grid gap-4 md:grid-cols-2"
                    onSubmit={handleSave}
                  >
                    <Field label="Name">
                      <Input
                        value={form.name}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        required
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
                      />
                    </Field>
                    <div className="flex gap-2 md:col-span-2">
                      <Button type="submit" loading={saving} icon="check">
                        {saving ? "Saving…" : "Save changes"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowBasicEdit(false);
                          setForm({
                            name: project.name,
                            description: project.description || "",
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-ink/[0.02] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                        Description
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-ink-soft">
                        {project.description || "No description yet."}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl bg-ink/[0.02] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                          Created
                        </p>
                        <p className="mt-1.5 text-sm font-medium text-ink-soft">
                          {formatDate(project.createdAt)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-ink/[0.02] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                          Updated
                        </p>
                        <p className="mt-1.5 text-sm font-medium text-ink-soft">
                          {formatDate(project.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "knowledge" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="knowledge" size={14} />
                  Add knowledge
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  Knowledge is reusable context — facts, decisions and
                  constraints — that every generated document can draw on.
                </p>
                <form className="mt-5 grid gap-4" onSubmit={handleKnowledgeCreate}>
                  <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                    <Field label="Title">
                      <Input
                        value={knowledgeForm.title}
                        onChange={(event) =>
                          setKnowledgeForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Client positioning"
                        required
                      />
                    </Field>
                    <Field label="Category">
                      <Input
                        value={knowledgeForm.category}
                        onChange={(event) =>
                          setKnowledgeForm((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                        placeholder="Strategy"
                      />
                    </Field>
                  </div>
                  <Field label="Content">
                    <Textarea
                      value={knowledgeForm.content}
                      onChange={(event) =>
                        setKnowledgeForm((current) => ({
                          ...current,
                          content: event.target.value,
                        }))
                      }
                      placeholder="Add the reusable context, decision, source note, or instruction."
                      required
                    />
                  </Field>
                  <div>
                    <Button
                      type="submit"
                      loading={savingKnowledge}
                      icon="plus"
                    >
                      {savingKnowledge ? "Adding…" : "Add knowledge"}
                    </Button>
                  </div>
                </form>
              </Card>

              {knowledgeError && <Alert tone="danger">{knowledgeError}</Alert>}

              {knowledgeLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : !knowledgeItems.length ? (
                <EmptyState
                  icon="knowledge"
                  title="No knowledge yet"
                  description="Add facts, instructions and constraints that should stay available throughout this project."
                />
              ) : (
                <div className="grid gap-3">
                  {knowledgeItems.map((item) => (
                    <Card key={item.id} className="p-5">
                      {editingKnowledgeId === item.id ? (
                        <form
                          className="grid gap-4"
                          onSubmit={handleKnowledgeUpdate}
                        >
                          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                            <Input
                              value={knowledgeEditForm.title}
                              onChange={(event) =>
                                setKnowledgeEditForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              required
                            />
                            <Input
                              value={knowledgeEditForm.category}
                              onChange={(event) =>
                                setKnowledgeEditForm((current) => ({
                                  ...current,
                                  category: event.target.value,
                                }))
                              }
                              placeholder="Category"
                            />
                          </div>
                          <Textarea
                            value={knowledgeEditForm.content}
                            onChange={(event) =>
                              setKnowledgeEditForm((current) => ({
                                ...current,
                                content: event.target.value,
                              }))
                            }
                            required
                          />
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              variant="secondary"
                              loading={updatingKnowledgeId === item.id}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setEditingKnowledgeId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                                <Icon name="knowledge" size={16} />
                              </span>
                              <h3 className="text-base font-semibold tracking-tight text-ink">
                                {item.title}
                              </h3>
                              {item.category && (
                                <Badge tone="accent">{item.category}</Badge>
                              )}
                            </div>
                            <p className="mt-3 text-sm leading-6 text-ink-muted">
                              {item.content.length > 260
                                ? `${item.content.slice(0, 260)}…`
                                : item.content}
                            </p>
                            <p className="mt-3 text-xs font-medium text-ink-faint">
                              Updated {formatDate(item.updatedAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => startKnowledgeEdit(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                              title="Edit"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={deletingKnowledgeId === item.id}
                              onClick={() => handleKnowledgeDelete(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "resources" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="resources" size={14} />
                  Source material
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  Upload the files this project draws from. We extract text where
                  we can, so your documents can reference the content.
                </p>

                <form className="mt-5" onSubmit={handleResourceUpload}>
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200",
                      dragActive
                        ? "border-accent-400 bg-accent-50"
                        : "border-line bg-ink/[0.015] hover:border-accent-300 hover:bg-accent-50/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl text-accent-600 transition-transform",
                        dragActive
                          ? "scale-110 bg-accent-100"
                          : "bg-accent-50"
                      )}
                    >
                      {uploadingResource ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                      ) : (
                        <Icon name="upload" size={22} />
                      )}
                    </span>
                    <p className="mt-4 text-sm font-semibold text-ink">
                      {uploadingResource
                        ? "Uploading…"
                        : resourceUploadFile
                        ? resourceUploadFile.name
                        : "Drop a file here, or click to browse"}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      PDF, DOCX, XLSX, Markdown, TXT, PNG, JPG, WebP · Max 10 MB
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.docx,.xlsx,.md,.markdown,.txt,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/markdown,text/plain,image/png,image/jpeg,image/webp"
                      onChange={handleResourceUploadFileChange}
                      className="hidden"
                    />
                  </label>
                  {resourceUploadFile && !uploadingResource && (
                    <div className="mt-3">
                      <Button type="submit" icon="upload">
                        Upload file
                      </Button>
                    </div>
                  )}
                </form>

                <div className="mt-5 border-t border-line pt-5">
                  <button
                    type="button"
                    onClick={() => setShowManualResource((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                  >
                    <Icon
                      name={showManualResource ? "chevron-down" : "chevron-right"}
                      size={15}
                    />
                    Add a reference or link instead
                  </button>

                  {showManualResource && (
                    <form
                      className="mt-4 grid gap-4 animate-fade-up"
                      onSubmit={handleResourceCreate}
                    >
                      <div className="grid gap-4 md:grid-cols-[1fr_220px_160px]">
                        <Field label="Name">
                          <Input
                            value={resourceForm.filename}
                            onChange={(event) =>
                              setResourceForm((current) => ({
                                ...current,
                                filename: event.target.value,
                              }))
                            }
                            placeholder="brief.pdf"
                            required
                          />
                        </Field>
                        <Field label="Type">
                          <Input
                            value={resourceForm.mimeType}
                            onChange={(event) =>
                              setResourceForm((current) => ({
                                ...current,
                                mimeType: event.target.value,
                              }))
                            }
                            placeholder="application/pdf"
                            required
                          />
                        </Field>
                        <Field label="Size (bytes)">
                          <Input
                            value={resourceForm.sizeBytes}
                            onChange={(event) =>
                              setResourceForm((current) => ({
                                ...current,
                                sizeBytes: event.target.value,
                              }))
                            }
                            inputMode="numeric"
                            placeholder="204800"
                          />
                        </Field>
                      </div>
                      <Field label="File URL">
                        <Input
                          value={resourceForm.storageUrl}
                          onChange={(event) =>
                            setResourceForm((current) => ({
                              ...current,
                              storageUrl: event.target.value,
                            }))
                          }
                          placeholder="https://…"
                        />
                      </Field>
                      <Field label="Extracted text / notes">
                        <Textarea
                          value={resourceForm.extractedText}
                          onChange={(event) =>
                            setResourceForm((current) => ({
                              ...current,
                              extractedText: event.target.value,
                            }))
                          }
                          placeholder="Paste useful extracted text or reference notes."
                        />
                      </Field>
                      <div>
                        <Button
                          type="submit"
                          variant="secondary"
                          loading={savingResource}
                          icon="plus"
                        >
                          {savingResource ? "Adding…" : "Add reference"}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </Card>

              {resourcesError && <Alert tone="danger">{resourcesError}</Alert>}

              {resourcesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : !resources.length ? (
                <EmptyState
                  icon="resources"
                  title="No source material yet"
                  description="Upload files or add references so this project has material to produce documents from."
                />
              ) : (
                <div className="grid gap-3">
                  {resources.map((item) => (
                    <Card key={item.id} className="p-5">
                      {editingResourceId === item.id ? (
                        <form
                          className="grid gap-4"
                          onSubmit={handleResourceUpdate}
                        >
                          <div className="grid gap-4 md:grid-cols-[1fr_220px_160px]">
                            <Input
                              value={resourceEditForm.filename}
                              onChange={(event) =>
                                setResourceEditForm((current) => ({
                                  ...current,
                                  filename: event.target.value,
                                }))
                              }
                              required
                            />
                            <Input
                              value={resourceEditForm.mimeType}
                              onChange={(event) =>
                                setResourceEditForm((current) => ({
                                  ...current,
                                  mimeType: event.target.value,
                                }))
                              }
                              required
                            />
                            <Input
                              value={resourceEditForm.sizeBytes}
                              onChange={(event) =>
                                setResourceEditForm((current) => ({
                                  ...current,
                                  sizeBytes: event.target.value,
                                }))
                              }
                              inputMode="numeric"
                              placeholder="Size in bytes"
                            />
                          </div>
                          <Input
                            value={resourceEditForm.storageUrl}
                            onChange={(event) =>
                              setResourceEditForm((current) => ({
                                ...current,
                                storageUrl: event.target.value,
                              }))
                            }
                            placeholder="File URL"
                          />
                          <Textarea
                            value={resourceEditForm.extractedText}
                            onChange={(event) =>
                              setResourceEditForm((current) => ({
                                ...current,
                                extractedText: event.target.value,
                              }))
                            }
                            placeholder="Extracted text / notes"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              variant="secondary"
                              loading={updatingResourceId === item.id}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setEditingResourceId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink/[0.04] text-ink-soft">
                              <Icon name={fileIcon(item.mimeType)} size={20} />
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-semibold tracking-tight text-ink">
                                {item.filename}
                              </h3>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium text-ink-muted">
                                  {formatSize(item.sizeBytes)}
                                </span>
                                {(() => {
                                  const status: ExtractionStatus =
                                    item.extraction?.status ||
                                    (item.extractedText
                                      ? "provided"
                                      : item.storageUrl
                                      ? "empty"
                                      : "empty");
                                  const ui = EXTRACTION_STATUS_UI[status];
                                  return (
                                    <Badge
                                      tone={ui.tone}
                                      icon={
                                        status === "extracted" ||
                                        status === "provided"
                                          ? "check"
                                          : status === "failed"
                                          ? "alert"
                                          : status === "visual"
                                          ? "image"
                                          : undefined
                                      }
                                    >
                                      {ui.label}
                                    </Badge>
                                  );
                                })()}
                                {item.extraction?.pages ? (
                                  <Badge tone="neutral">
                                    {item.extraction.pages} page
                                    {item.extraction.pages > 1 ? "s" : ""}
                                  </Badge>
                                ) : null}
                                {item.extraction?.sheets ? (
                                  <Badge tone="neutral">
                                    {item.extraction.sheets} sheet
                                    {item.extraction.sheets > 1 ? "s" : ""}
                                  </Badge>
                                ) : null}
                                {item.extraction?.words ? (
                                  <Badge tone="neutral">
                                    {item.extraction.words.toLocaleString()} words
                                  </Badge>
                                ) : null}
                              </div>
                              {item.storageUrl && (
                                <a
                                  href={`/api/projects/${projectId}/resources/${item.id}/download`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-600 hover:text-accent-700"
                                >
                                  <Icon name="external" size={14} />
                                  Open file
                                </a>
                              )}
                              {item.extraction?.warnings?.length ? (
                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                                  <Icon
                                    name="alert"
                                    size={15}
                                    className="mt-0.5 shrink-0 text-amber-500"
                                  />
                                  <p className="text-xs leading-5 text-amber-700">
                                    {item.extraction.warnings[0]}
                                  </p>
                                </div>
                              ) : null}
                              {item.extractedText && (
                                <div className="mt-3 rounded-xl border border-line bg-ink/[0.02] px-4 py-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                                    Extraction preview
                                  </p>
                                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-ink-soft">
                                    {item.extractedText.length > 280
                                      ? `${item.extractedText.slice(0, 280)}…`
                                      : item.extractedText}
                                  </p>
                                </div>
                              )}
                              {(() => {
                                const status: SourceBriefStatus | null =
                                  item.sourceBriefStatus ??
                                  (item.extractedText ? "pending" : null);
                                if (!status || status === "not_applicable")
                                  return null;
                                const ui = SOURCE_BRIEF_STATUS_UI[status];
                                const busy = distillingResourceId === item.id;
                                const ready =
                                  status === "ready" || status === "partial";
                                return (
                                  <div className="mt-3 rounded-xl border border-line bg-accent-50/30 px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge
                                        tone={ui.tone}
                                        icon={
                                          status === "ready"
                                            ? "sparkles"
                                            : status === "failed"
                                            ? "alert"
                                            : undefined
                                        }
                                      >
                                        {ui.label}
                                      </Badge>
                                      {item.keyFigureCount ? (
                                        <Badge tone="neutral" icon="bolt">
                                          {item.keyFigureCount} key figure
                                          {item.keyFigureCount > 1 ? "s" : ""}
                                        </Badge>
                                      ) : null}
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => handleResourceDistill(item)}
                                        className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-accent-300 hover:text-accent-700 disabled:opacity-50"
                                      >
                                        {busy ? (
                                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                                        ) : (
                                          <Icon name="generate" size={13} />
                                        )}
                                        {busy
                                          ? "Distilling…"
                                          : ready
                                          ? "Refresh brief"
                                          : "Generate brief"}
                                      </button>
                                    </div>
                                    {item.sourceBriefSummary && (
                                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                                        {item.sourceBriefSummary.length > 240
                                          ? `${item.sourceBriefSummary.slice(0, 240)}…`
                                          : item.sourceBriefSummary}
                                      </p>
                                    )}
                                    <p className="mt-1.5 text-xs text-ink-muted">
                                      {ui.hint}
                                    </p>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => startResourceEdit(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                              title="Edit"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={deletingResourceId === item.id}
                              onClick={() => handleResourceDelete(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="documents" size={14} />
                  New document
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                  Define the deliverable you need. You can draft it manually or
                  generate a first version with AI from the document studio.
                </p>
                <form className="mt-5 grid gap-4" onSubmit={handleDocumentCreate}>
                  <div className="grid gap-4 md:grid-cols-[1fr_200px_240px]">
                    <Field label="Title">
                      <Input
                        value={documentForm.title}
                        onChange={(event) =>
                          setDocumentForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Partnership proposal"
                        required
                      />
                    </Field>
                    <Field label="Type">
                      <Input
                        value={documentForm.type}
                        onChange={(event) =>
                          setDocumentForm((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        placeholder="Proposal"
                        required
                      />
                    </Field>
                    <Field label="Template">
                      <Select
                        value={documentForm.templateId}
                        onChange={(event) =>
                          setDocumentForm((current) => ({
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
                      value={documentForm.objective}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          objective: event.target.value,
                        }))
                      }
                      placeholder="Describe what this document needs to achieve."
                      required
                    />
                  </Field>
                  <Field label="Instructions">
                    <Textarea
                      value={documentForm.instructions}
                      onChange={(event) =>
                        setDocumentForm((current) => ({
                          ...current,
                          instructions: event.target.value,
                        }))
                      }
                      placeholder="Optional tone, structure, constraints, or source priorities."
                    />
                  </Field>
                  <div>
                    <Button
                      type="submit"
                      loading={savingDocument}
                      icon="plus"
                    >
                      {savingDocument ? "Creating…" : "Create document"}
                    </Button>
                  </div>
                </form>
              </Card>

              {documentsError && <Alert tone="danger">{documentsError}</Alert>}

              {documentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28" />
                  ))}
                </div>
              ) : !documents.length ? (
                <EmptyState
                  icon="documents"
                  title="No documents yet"
                  description="Create your first document request. You can draft it now and generate with AI later."
                />
              ) : (
                <div className="grid gap-3">
                  {documents.map((item) => (
                    <Card key={item.id} interactive className="p-5">
                      {editingDocumentId === item.id ? (
                        <form
                          className="grid gap-4"
                          onSubmit={handleDocumentUpdate}
                        >
                          <div className="grid gap-4 md:grid-cols-[1fr_200px_240px]">
                            <Input
                              value={documentEditForm.title}
                              onChange={(event) =>
                                setDocumentEditForm((current) => ({
                                  ...current,
                                  title: event.target.value,
                                }))
                              }
                              required
                            />
                            <Input
                              value={documentEditForm.type}
                              onChange={(event) =>
                                setDocumentEditForm((current) => ({
                                  ...current,
                                  type: event.target.value,
                                }))
                              }
                              required
                            />
                            <Select
                              value={documentEditForm.templateId}
                              onChange={(event) =>
                                setDocumentEditForm((current) => ({
                                  ...current,
                                  templateId: event.target.value,
                                }))
                              }
                            >
                              <option value="">No template</option>
                              {templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <Textarea
                            value={documentEditForm.objective}
                            onChange={(event) =>
                              setDocumentEditForm((current) => ({
                                ...current,
                                objective: event.target.value,
                              }))
                            }
                            required
                          />
                          <Textarea
                            value={documentEditForm.instructions}
                            onChange={(event) =>
                              setDocumentEditForm((current) => ({
                                ...current,
                                instructions: event.target.value,
                              }))
                            }
                            placeholder="Instructions"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              variant="secondary"
                              loading={updatingDocumentId === item.id}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => setEditingDocumentId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                                <Icon name="documents" size={17} />
                              </span>
                              <h3 className="text-base font-semibold tracking-tight text-ink">
                                {item.title}
                              </h3>
                              <StatusPill status={item.status} />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge tone="neutral">{item.type}</Badge>
                              {item.template && (
                                <Badge tone="accent" icon="templates">
                                  {item.template.name}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-3 text-sm leading-6 text-ink-muted">
                              {item.objective.length > 200
                                ? `${item.objective.slice(0, 200)}…`
                                : item.objective}
                            </p>
                            <p className="mt-3 text-xs font-medium text-ink-faint">
                              Updated {formatDate(item.updatedAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/projects/${projectId}/documents/${item.id}`}
                            >
                              <a className={buttonClass("secondary", "sm")}>
                                Open studio
                                <Icon name="arrow-right" size={14} />
                              </a>
                            </Link>
                            <button
                              type="button"
                              onClick={() => startDocumentEdit(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink/20 hover:text-ink"
                              title="Edit"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              disabled={deletingDocumentId === item.id}
                              onClick={() => handleDocumentDelete(item)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
