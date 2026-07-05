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
  DocumentPlan,
  DocumentPlanStatus,
  PlanSection,
  emptyPlanSection,
  isPlanOutOfSync,
} from "../../../../../lib/documents/document-plan";
import { PlanBlueprint } from "../../../../../components/product/plan-blueprint";
import {
  ProduceResult,
  REVIEW_STATUS_UI,
  SECTION_STATUS_UI,
  SectionDTO,
  isDocumentStale,
  summarizeSectionReadiness,
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
  documentPlanAppliedAt?: string | null;
  assembledAt?: string | null;
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

const deepClone = <T,>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

const REWRITE_QUICK_ACTIONS: {
  label: string;
  instruction: string;
  mode: string;
}[] = [
  {
    label: "More professional",
    instruction:
      "Rends cette section plus professionnelle, structurée et adaptée à un document livré à des partenaires externes.",
    mode: "professionalize",
  },
  {
    label: "More concise",
    instruction:
      "Réduis cette section d'environ 30 % en conservant les informations importantes et les chiffres exacts.",
    mode: "shorten",
  },
  {
    label: "Add a table",
    instruction:
      "Ajoute un tableau clair si cela améliore la lisibilité, sans inventer de données.",
    mode: "add_table",
  },
  {
    label: "More operational",
    instruction:
      "Ajoute les implications opérationnelles concrètes, les responsabilités et les points de mise en œuvre.",
    mode: "make_operational",
  },
  {
    label: "More executive",
    instruction:
      "Reformule cette section avec un ton plus synthétique et stratégique, adapté à un comité de direction ou un financeur.",
    mode: "make_executive",
  },
];

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
  const [planDraft, setPlanDraft] = useState<DocumentPlan | null>(null);
  const [planStatus, setPlanStatus] = useState<DocumentPlanStatus | null>(null);
  const [planUpdatedAt, setPlanUpdatedAt] = useState<string | null>(null);
  const [planAppliedAt, setPlanAppliedAt] = useState<string | null>(null);
  const [planDirty, setPlanDirty] = useState(false);
  const [planFeedback, setPlanFeedback] = useState("");
  const [planning, setPlanning] = useState(false);
  const [revising, setRevising] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);
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
  const [rewriteOpenId, setRewriteOpenId] = useState<string | null>(null);
  const [rewriteText, setRewriteText] = useState("");
  const [rewritingSectionId, setRewritingSectionId] = useState<string | null>(
    null
  );
  const [documentAssembledAt, setDocumentAssembledAt] = useState<string | null>(
    null
  );
  const [updatingSectionMetaId, setUpdatingSectionMetaId] = useState<
    string | null
  >(null);
  const [producing, setProducing] = useState(false);
  const [productionResult, setProductionResult] = useState<ProduceResult | null>(
    null
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);
  interface PlacementDTO {
    id: string;
    resourceId: string;
    filename: string;
    mimeType: string;
    role: string;
    target: string;
    sectionId: string | null;
    sectionTitle: string | null;
    position: string;
    size: string;
    caption: string | null;
    confidence: string | null;
    reason: string | null;
    isEnabled: boolean;
    isApproved: boolean;
    isSuggested: boolean;
    orderIndex: number;
  }

  const [placements, setPlacements] = useState<PlacementDTO[]>([]);
  const [placementsLoading, setPlacementsLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [updatingPlacementId, setUpdatingPlacementId] = useState<string | null>(
    null
  );
  const [placementsError, setPlacementsError] = useState<string | null>(null);
  const [placementsNote, setPlacementsNote] = useState<string | null>(null);
  const [exportStyle, setExportStyle] = useState("premium_consulting");
  const [exportOrientation, setExportOrientation] = useState<
    "portrait" | "landscape"
  >("portrait");
  const [exportConfidentiality, setExportConfidentiality] = useState("none");
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
      setPlanDraft(data.documentPlan ? deepClone(data.documentPlan) : null);
      setPlanDirty(false);
      setPlanStatus(data.documentPlanStatus ?? null);
      setPlanUpdatedAt(data.documentPlanUpdatedAt ?? null);
      setPlanAppliedAt(data.documentPlanAppliedAt ?? null);
      setDocumentAssembledAt(data.assembledAt ?? null);
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
    loadPlacements();
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

  interface PlanResp {
    documentPlan: DocumentPlan | null;
    documentPlanStatus: DocumentPlanStatus;
    documentPlanUpdatedAt: string | null;
    documentPlanAppliedAt?: string | null;
    warning?: string | null;
  }

  const planBase = () =>
    `/api/projects/${projectId}/documents/${documentId}/plan`;

  const applyPlanResponse = (res: PlanResp) => {
    setPlan(res.documentPlan);
    setPlanDraft(res.documentPlan ? deepClone(res.documentPlan) : null);
    setPlanDirty(false);
    setPlanStatus(res.documentPlanStatus);
    setPlanUpdatedAt(res.documentPlanUpdatedAt);
    if (res.documentPlanAppliedAt !== undefined) {
      setPlanAppliedAt(res.documentPlanAppliedAt ?? null);
    }
  };

  const handleGeneratePlan = async () => {
    if (!projectId || !documentId) return;
    setPlanning(true);
    setPlanError(null);
    setPlanNote(null);
    try {
      const res = await request<PlanResp>(planBase(), { method: "POST" });
      applyPlanResponse(res);
      if (res.documentPlanStatus === "failed") {
        setPlanError(
          res.warning ||
            "Document plan could not be generated. Check OpenAI configuration."
        );
      } else if (res.warning) {
        setPlanNote(res.warning);
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

  const handleRevisePlan = async () => {
    if (!projectId || !documentId || !planFeedback.trim()) return;
    setRevising(true);
    setPlanError(null);
    setPlanNote(null);
    try {
      const res = await request<PlanResp>(`${planBase()}/revise`, {
        method: "POST",
        body: JSON.stringify({ feedback: planFeedback }),
      });
      if (!res.documentPlan || res.documentPlanStatus === "failed") {
        setPlanError(res.warning || "The plan could not be revised.");
      } else {
        applyPlanResponse(res);
        setPlanFeedback("");
        setPlanNote(res.warning || "Plan improved.");
      }
    } catch (reviseErr) {
      setPlanError(
        reviseErr instanceof Error
          ? reviseErr.message
          : "Unable to revise the plan"
      );
    } finally {
      setRevising(false);
    }
  };

  const handleSavePlan = async () => {
    if (!projectId || !documentId || !planDraft) return;
    setSavingPlan(true);
    setPlanError(null);
    setPlanNote(null);
    try {
      const res = await request<PlanResp>(planBase(), {
        method: "PATCH",
        body: JSON.stringify({ documentPlan: planDraft }),
      });
      applyPlanResponse(res);
      setPlanNote("Plan saved. Existing sections were not changed.");
    } catch (saveErr) {
      setPlanError(
        saveErr instanceof Error ? saveErr.message : "Unable to save the plan"
      );
    } finally {
      setSavingPlan(false);
    }
  };

  const mutateDraft = (fn: (sections: PlanSection[]) => PlanSection[]) => {
    setPlanDraft((cur) =>
      cur ? { ...cur, sections: fn(cur.sections.map((s) => ({ ...s }))) } : cur
    );
    setPlanDirty(true);
  };

  const handlePlanSectionChange = (index: number, patch: Partial<PlanSection>) =>
    mutateDraft((secs) =>
      secs.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );

  const handlePlanSectionMove = (index: number, dir: -1 | 1) =>
    mutateDraft((secs) => {
      const j = index + dir;
      if (j < 0 || j >= secs.length) return secs;
      const copy = [...secs];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });

  const handlePlanSectionRemove = (index: number) =>
    mutateDraft((secs) => secs.filter((_, i) => i !== index));

  const handlePlanSectionAdd = () =>
    mutateDraft((secs) => [...secs, emptyPlanSection(secs.length)]);

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

  const placementsBase = () =>
    `/api/projects/${projectId}/documents/${documentId}/visual-placements`;

  const loadPlacements = async () => {
    if (!projectId || !documentId) return;
    try {
      const data = await request<PlacementDTO[]>(placementsBase());
      setPlacements(data);
    } catch {
      // Non-fatal: the visuals panel simply shows an empty state.
    } finally {
      setPlacementsLoading(false);
    }
  };

  const handleSuggestPlacements = async () => {
    setSuggesting(true);
    setPlacementsError(null);
    setPlacementsNote(null);
    try {
      const { data, message } = await requestFull<PlacementDTO[]>(
        `${placementsBase()}/suggest`,
        { method: "POST" }
      );
      setPlacements(data);
      setPlacementsNote(message ?? "Placement suggestions updated.");
    } catch (err) {
      setPlacementsError(
        err instanceof Error ? err.message : "Unable to suggest placements"
      );
    } finally {
      setSuggesting(false);
    }
  };

  const handlePlacementUpdate = async (
    id: string,
    patch: Record<string, unknown>
  ) => {
    setUpdatingPlacementId(id);
    setPlacementsError(null);
    try {
      const updated = await request<PlacementDTO>(`${placementsBase()}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setPlacements((cur) => cur.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setPlacementsError(
        err instanceof Error ? err.message : "Unable to update placement"
      );
    } finally {
      setUpdatingPlacementId(null);
    }
  };

  const handleSyncSections = async () => {
    setSyncing(true);
    setSectionsError(null);
    setSectionsNote(null);
    try {
      const { data, message } = await requestFull<{
        sections: SectionDTO[];
        appliedAt: string;
      }>(`${sectionsBase()}/sync-from-plan`, { method: "POST" });
      setSections(data.sections);
      setPlanAppliedAt(data.appliedAt);
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

  const openRewrite = (section: SectionDTO) => {
    setRewriteOpenId(section.id);
    setRewriteText(section.lastRewriteInstruction || "");
    setSectionsError(null);
    setSectionsNote(null);
  };

  const handleRewriteSection = async (
    id: string,
    instruction: string,
    mode: string
  ) => {
    if (!instruction.trim()) {
      setSectionsError("Add an instruction before rewriting.");
      return;
    }
    setRewritingSectionId(id);
    setSectionsError(null);
    setSectionsNote(null);
    try {
      const { data, message } = await requestFull<SectionDTO>(
        `${sectionsBase()}/${id}/rewrite`,
        { method: "POST", body: JSON.stringify({ instruction, mode }) }
      );
      setSections((cur) => cur.map((s) => (s.id === id ? data : s)));
      setSectionsNote(
        message ??
          "Section rewritten. Re-assemble to update the final document."
      );
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to rewrite section"
      );
    } finally {
      setRewritingSectionId(null);
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
      const { data, message } = await requestFull<{
        content: string;
        assembledAt: string;
      }>(`${sectionsBase()}/assemble`, { method: "POST" });
      setForm((cur) => ({ ...cur, content: data.content }));
      setDocument((cur) =>
        cur ? { ...cur, content: data.content, status: "READY_FOR_REVIEW" } : cur
      );
      setDocumentAssembledAt(data.assembledAt);
      setSectionsNote(message ?? "Document assembled with latest sections.");
      setView("preview");
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to assemble document"
      );
    } finally {
      setAssembling(false);
    }
  };

  const handleProduce = async (mode: "missing" | "refresh_unlocked") => {
    if (!projectId || !documentId) return;
    if (planDirty) {
      setSectionsError("Save the plan before generating.");
      return;
    }
    setProducing(true);
    setSectionsError(null);
    setSectionsNote(null);
    setProductionResult(null);
    try {
      const { data } = await requestFull<{
        result: ProduceResult;
        sections: SectionDTO[];
        content: string | null;
        documentPlan: DocumentPlan | null;
        documentPlanStatus: DocumentPlanStatus | null;
        documentPlanUpdatedAt: string | null;
        documentPlanAppliedAt: string | null;
        assembledAt: string | null;
      }>(`/api/projects/${projectId}/documents/${documentId}/produce`, {
        method: "POST",
        body: JSON.stringify({ mode }),
      });
      setSections(data.sections);
      setPlan(data.documentPlan);
      setPlanDraft(data.documentPlan ? deepClone(data.documentPlan) : null);
      setPlanDirty(false);
      setPlanStatus(data.documentPlanStatus);
      setPlanUpdatedAt(data.documentPlanUpdatedAt);
      setPlanAppliedAt(data.documentPlanAppliedAt);
      setDocumentAssembledAt(data.assembledAt);
      if (data.content != null) {
        const content = data.content;
        setForm((cur) => ({ ...cur, content }));
        setDocument((cur) =>
          cur ? { ...cur, content, status: "READY_FOR_REVIEW" } : cur
        );
      }
      setProductionResult(data.result);
      setSectionsNote(data.result.message);
      setView("preview");
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to produce document"
      );
    } finally {
      setProducing(false);
    }
  };

  const handleSectionMeta = async (
    id: string,
    patch: { reviewStatus?: string; isLocked?: boolean },
    note: string
  ) => {
    setUpdatingSectionMetaId(id);
    setSectionsError(null);
    setSectionsNote(null);
    try {
      const section = await request<SectionDTO>(`${sectionsBase()}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSections((cur) => cur.map((s) => (s.id === id ? section : s)));
      setSectionsNote(note);
    } catch (err) {
      setSectionsError(
        err instanceof Error ? err.message : "Unable to update section"
      );
    } finally {
      setUpdatingSectionMetaId(null);
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
      const query =
        format === "markdown"
          ? ""
          : `?preset=${exportStyle}&orientation=${exportOrientation}&confidentiality=${exportConfidentiality}`;
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentId}/export/${format}${query}`,
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
    { format: "docx", label: "Premium DOCX", busy: exportingDocx },
    { format: "pdf", label: "Premium PDF", busy: exportingPdf },
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
              <PlanBlueprint
                plan={planDraft}
                status={planStatus}
                updatedAt={planUpdatedAt}
                outOfSync={isPlanOutOfSync({
                  sectionsExist: sections.length > 0,
                  planUpdatedAt,
                  planAppliedAt,
                })}
                sectionsExist={sections.length > 0}
                dirty={planDirty}
                generating={planning}
                revising={revising}
                saving={savingPlan}
                applying={syncing}
                feedback={planFeedback}
                error={planError}
                note={planNote}
                onFeedbackChange={setPlanFeedback}
                onGenerate={handleGeneratePlan}
                onRevise={handleRevisePlan}
                onSave={handleSavePlan}
                onApply={handleSyncSections}
                onSectionChange={handlePlanSectionChange}
                onSectionMove={handlePlanSectionMove}
                onSectionRemove={handlePlanSectionRemove}
                onSectionAdd={handlePlanSectionAdd}
              />

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
                    {(() => {
                      const r = summarizeSectionReadiness(sections);
                      const stale = isDocumentStale(
                        documentAssembledAt,
                        sections
                      );
                      return (
                        <>
                          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                            <span className="font-semibold text-ink">
                              {r.total} sections
                            </span>
                            <span>· {r.withContent} written</span>
                            {r.approved > 0 && (
                              <span>· {r.approved} approved</span>
                            )}
                            {r.locked > 0 && (
                              <span className="text-amber-600">
                                · {r.locked} locked
                              </span>
                            )}
                            {r.failed > 0 && (
                              <span className="text-red-600">
                                · {r.failed} failed
                              </span>
                            )}
                          </div>
                          {r.withContent > 0 && (
                            <div
                              className={cn(
                                "mt-3 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                                stale
                                  ? "border-amber-200 bg-amber-50"
                                  : "border-emerald-200 bg-emerald-50"
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <Icon
                                  name={stale ? "alert" : "check-circle"}
                                  size={17}
                                  className={cn(
                                    "mt-0.5 shrink-0",
                                    stale ? "text-amber-500" : "text-emerald-500"
                                  )}
                                />
                                <p
                                  className={cn(
                                    "text-xs leading-5",
                                    stale ? "text-amber-700" : "text-emerald-700"
                                  )}
                                >
                                  {stale
                                    ? "Final document is out of date. Re-assemble to include the latest section changes."
                                    : "Final document is up to date."}
                                </p>
                              </div>
                              {stale && (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  icon="check"
                                  loading={assembling}
                                  onClick={handleAssemble}
                                  className="shrink-0"
                                >
                                  Assemble latest document
                                </Button>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

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
                                  {s.reviewStatus !== "DRAFT" && (
                                    <Badge
                                      tone={REVIEW_STATUS_UI[s.reviewStatus].tone}
                                    >
                                      {REVIEW_STATUS_UI[s.reviewStatus].label}
                                    </Badge>
                                  )}
                                  {s.isLocked && (
                                    <Badge tone="warning" icon="lock">
                                      Locked
                                    </Badge>
                                  )}
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
                                  disabled={busy || s.isLocked}
                                  onClick={() => handleGenerateSection(s.id)}
                                  title={
                                    s.isLocked
                                      ? "Unlock to regenerate"
                                      : s.content
                                      ? "Regenerate"
                                      : "Generate"
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-accent-300 hover:text-accent-700 disabled:opacity-40"
                                >
                                  {busy ? (
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                                  ) : (
                                    <Icon name="generate" size={15} />
                                  )}
                                </button>
                                {s.content && !s.isLocked && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      rewriteOpenId === s.id
                                        ? setRewriteOpenId(null)
                                        : openRewrite(s)
                                    }
                                    title="Improve with AI"
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                                      rewriteOpenId === s.id
                                        ? "border-accent-300 bg-accent-50 text-accent-700"
                                        : "border-line text-ink-muted hover:border-accent-300 hover:text-accent-700"
                                    )}
                                  >
                                    <Icon name="sparkles" size={15} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={s.isLocked}
                                  onClick={() =>
                                    editingSectionId === s.id
                                      ? setEditingSectionId(null)
                                      : startSectionEdit(s)
                                  }
                                  title={s.isLocked ? "Unlock to edit" : "Edit"}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-40"
                                >
                                  <Icon name="edit" size={15} />
                                </button>
                              </div>
                            </div>

                            {s.content && (
                              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                {!s.isLocked &&
                                  s.reviewStatus !== "REVIEWED" &&
                                  s.reviewStatus !== "APPROVED" && (
                                    <button
                                      type="button"
                                      disabled={updatingSectionMetaId === s.id}
                                      onClick={() =>
                                        handleSectionMeta(
                                          s.id,
                                          { reviewStatus: "REVIEWED" },
                                          "Section marked as reviewed."
                                        )
                                      }
                                      className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent-300 hover:text-accent-700 disabled:opacity-50"
                                    >
                                      Mark reviewed
                                    </button>
                                  )}
                                {!s.isLocked && s.reviewStatus !== "APPROVED" && (
                                  <button
                                    type="button"
                                    disabled={updatingSectionMetaId === s.id}
                                    onClick={() =>
                                      handleSectionMeta(
                                        s.id,
                                        { reviewStatus: "APPROVED", isLocked: true },
                                        "Section approved and locked."
                                      )
                                    }
                                    className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                                  >
                                    Approve &amp; lock
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={updatingSectionMetaId === s.id}
                                  onClick={() =>
                                    handleSectionMeta(
                                      s.id,
                                      { isLocked: !s.isLocked },
                                      s.isLocked
                                        ? "Section unlocked."
                                        : "Section locked."
                                    )
                                  }
                                  className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-50"
                                >
                                  <Icon name="lock" size={12} />
                                  {s.isLocked ? "Unlock" : "Lock"}
                                </button>
                              </div>
                            )}

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

                            {rewriteOpenId === s.id && s.content && (
                              <div className="mt-3 rounded-lg border border-accent-100 bg-accent-50/40 p-3">
                                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                                  <Icon name="sparkles" size={13} />
                                  Improve with AI
                                </div>
                                <Textarea
                                  value={rewriteText}
                                  onChange={(e) => setRewriteText(e.target.value)}
                                  placeholder="Tell AI how to improve this section… e.g. « Rends cette section plus concise et ajoute un tableau de phasage. »"
                                  className="mt-2 min-h-[68px] bg-surface text-sm"
                                />
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {REWRITE_QUICK_ACTIONS.map((q) => (
                                    <button
                                      key={q.label}
                                      type="button"
                                      disabled={rewritingSectionId === s.id}
                                      onClick={() =>
                                        handleRewriteSection(
                                          s.id,
                                          q.instruction,
                                          q.mode
                                        )
                                      }
                                      className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent-300 hover:text-accent-700 disabled:opacity-50"
                                    >
                                      {q.label}
                                    </button>
                                  ))}
                                </div>
                                <div className="mt-2.5 flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    icon="sparkles"
                                    loading={rewritingSectionId === s.id}
                                    disabled={!rewriteText.trim()}
                                    onClick={() =>
                                      handleRewriteSection(
                                        s.id,
                                        rewriteText,
                                        "rewrite"
                                      )
                                    }
                                  >
                                    Rewrite section
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setRewriteOpenId(null)}
                                  >
                                    Close
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>

              {/* Visual assets */}
              <Card className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                      <Icon name="image" size={14} />
                      Visual assets
                    </div>
                    <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
                      Project images are matched to sections. Only approved
                      visuals are included in exports; logos stay on the cover.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon="sparkles"
                    loading={suggesting}
                    onClick={handleSuggestPlacements}
                  >
                    Suggest placements
                  </Button>
                </div>

                {placementsError && (
                  <Alert tone="danger" className="mt-4">
                    {placementsError}
                  </Alert>
                )}
                {placementsNote && !placementsError && (
                  <Alert tone="info" className="mt-4">
                    {placementsNote}
                  </Alert>
                )}

                {placementsLoading ? (
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-16" />
                  </div>
                ) : !placements.length ? (
                  <div className="mt-4 rounded-xl border border-dashed border-line bg-ink/[0.015] px-4 py-6 text-center text-sm text-ink-muted">
                    No image resources detected yet. Upload images to the
                    project, then click “Suggest placements”.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {placements.map((p) => {
                      const busy = updatingPlacementId === p.id;
                      const isLogo = p.role === "logo" || p.target === "cover";
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "rounded-xl border p-3.5",
                            p.isApproved && p.isEnabled
                              ? "border-emerald-200"
                              : "border-line",
                            !p.isEnabled && "opacity-60"
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink/[0.04] text-ink-soft">
                              <Icon name="image" size={16} />
                            </span>
                            <span className="truncate text-sm font-semibold text-ink">
                              {p.filename}
                            </span>
                            <Badge tone="neutral">{p.role.replace("_", " ")}</Badge>
                            {p.confidence && (
                              <Badge
                                tone={
                                  p.confidence === "high"
                                    ? "success"
                                    : p.confidence === "medium"
                                    ? "accent"
                                    : "neutral"
                                }
                              >
                                {p.confidence}
                              </Badge>
                            )}
                            {p.isApproved && p.isEnabled && (
                              <Badge tone="success" icon="check">
                                Approved
                              </Badge>
                            )}
                            {!p.isEnabled && (
                              <Badge tone="neutral">Disabled</Badge>
                            )}
                          </div>
                          {p.reason && (
                            <p className="mt-1.5 text-xs leading-5 text-ink-muted">
                              {p.reason}
                            </p>
                          )}

                          {isLogo ? (
                            <p className="mt-2 text-xs text-ink-faint">
                              Used automatically on the cover page.
                            </p>
                          ) : (
                            <>
                              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                <Select
                                  value={
                                    p.target === "appendix"
                                      ? "__appendix__"
                                      : p.sectionId || "__appendix__"
                                  }
                                  disabled={busy}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "__appendix__") {
                                      handlePlacementUpdate(p.id, {
                                        target: "appendix",
                                        sectionId: null,
                                        position: "appendix",
                                      });
                                    } else {
                                      handlePlacementUpdate(p.id, {
                                        target: "section",
                                        sectionId: v,
                                        position: "after_heading",
                                      });
                                    }
                                  }}
                                  className="py-1.5 text-xs"
                                >
                                  <option value="__appendix__">Appendix</option>
                                  {sections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.title.slice(0, 46)}
                                    </option>
                                  ))}
                                </Select>
                                <Select
                                  value={p.size}
                                  disabled={busy}
                                  onChange={(e) =>
                                    handlePlacementUpdate(p.id, {
                                      size: e.target.value,
                                    })
                                  }
                                  className="py-1.5 text-xs"
                                >
                                  <option value="small">Small</option>
                                  <option value="medium">Medium</option>
                                  <option value="large">Large</option>
                                  <option value="full_width">Full width</option>
                                </Select>
                                <Input
                                  defaultValue={p.caption || ""}
                                  placeholder="Caption"
                                  disabled={busy}
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (v !== (p.caption || "")) {
                                      handlePlacementUpdate(p.id, {
                                        caption: v || null,
                                      });
                                    }
                                  }}
                                  className="py-1.5 text-xs"
                                />
                              </div>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {!p.isApproved ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    icon="check"
                                    loading={busy}
                                    onClick={() =>
                                      handlePlacementUpdate(p.id, {
                                        isApproved: true,
                                        isEnabled: true,
                                      })
                                    }
                                  >
                                    Approve
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    loading={busy}
                                    onClick={() =>
                                      handlePlacementUpdate(p.id, {
                                        isApproved: false,
                                      })
                                    }
                                  >
                                    Unapprove
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  loading={busy}
                                  onClick={() =>
                                    handlePlacementUpdate(p.id, {
                                      isEnabled: !p.isEnabled,
                                    })
                                  }
                                >
                                  {p.isEnabled ? "Disable" : "Enable"}
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Side panel */}
            <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
              {/* Document production (primary) */}
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="bolt" size={14} />
                  Document production
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  One click plans, generates the sections and assembles the final
                  document. Locked sections are always preserved.
                </p>
                {(() => {
                  const withContentCount = sections.filter(
                    (s) => s.content && s.content.trim()
                  ).length;
                  const stale = isDocumentStale(documentAssembledAt, sections);
                  const hasAny = Boolean(planStatus) || sections.length > 0;
                  const label = producing
                    ? "Producing…"
                    : !hasAny
                    ? "Generate document"
                    : sections.length > 0 && withContentCount < sections.length
                    ? "Continue generation"
                    : stale
                    ? "Update final document"
                    : "Update document";
                  return (
                    <>
                      <div className="mt-4 flex flex-col gap-2">
                        <Button
                          type="button"
                          icon="generate"
                          loading={producing}
                          disabled={planDirty}
                          onClick={() => handleProduce("missing")}
                          className="w-full"
                        >
                          {label}
                        </Button>
                        {planDirty && (
                          <p className="text-xs text-amber-600">
                            Save your plan edits before generating.
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          icon="generate"
                          loading={producing}
                          disabled={planDirty || sections.length === 0}
                          onClick={() => handleProduce("refresh_unlocked")}
                          className="w-full"
                        >
                          Regenerate unlocked sections
                        </Button>
                      </div>

                      {productionResult && (
                        <div className="mt-4 rounded-xl border border-line bg-ink/[0.02] p-3.5">
                          <div className="flex items-center gap-2">
                            <Badge
                              tone={
                                productionResult.status === "ready"
                                  ? "success"
                                  : productionResult.status === "partial"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {productionResult.status === "ready"
                                ? "Ready"
                                : productionResult.status === "partial"
                                ? "Partial"
                                : "Failed"}
                            </Badge>
                            {productionResult.assembly.wordCount ? (
                              <span className="text-xs text-ink-muted">
                                {productionResult.assembly.wordCount} words
                              </span>
                            ) : null}
                          </div>
                          <ul className="mt-2.5 space-y-1">
                            {productionResult.steps.map((st, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs"
                              >
                                <Icon
                                  name={
                                    st.status === "done"
                                      ? "check-circle"
                                      : st.status === "failed"
                                      ? "alert"
                                      : "info"
                                  }
                                  size={13}
                                  className={cn(
                                    "mt-0.5 shrink-0",
                                    st.status === "done"
                                      ? "text-emerald-500"
                                      : st.status === "failed"
                                      ? "text-red-500"
                                      : "text-ink-faint"
                                  )}
                                />
                                <span className="text-ink-soft">
                                  <span className="font-semibold text-ink">
                                    {st.name}:
                                  </span>{" "}
                                  {st.message}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {productionResult.warnings.length > 0 && (
                            <div className="mt-2.5 border-t border-line pt-2.5">
                              {productionResult.warnings
                                .slice(0, 4)
                                .map((w, i) => (
                                  <p
                                    key={i}
                                    className="text-xs leading-5 text-amber-700"
                                  >
                                    • {w}
                                  </p>
                                ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </Card>

              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
              >
                <Icon
                  name={advancedOpen ? "chevron-down" : "chevron-right"}
                  size={14}
                />
                Advanced: single draft
              </button>

              {advancedOpen && (
              /* Generate — legacy single-draft (advanced) */
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                  <Icon name="generate" size={14} />
                  Single draft (advanced)
                </div>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Generates the whole document in one pass, bypassing sections and
                  locks. Less controllable — prefer Document production above.
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
                    {generating ? "Generating…" : "Generate single draft"}
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
              )}

              {/* Export */}
              <Card className="p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                  <Icon name="export" size={14} />
                  Export &amp; presentation
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  Exports use the latest assembled document. The style shapes the
                  cover, typography, tables and page layout.
                </p>

                <div className="mt-4 space-y-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      Style
                    </span>
                    <Select
                      value={exportStyle}
                      onChange={(e) => setExportStyle(e.target.value)}
                    >
                      <option value="premium_consulting">Premium Consulting</option>
                      <option value="bank_financing">Bank Financing</option>
                      <option value="formal_legal">Formal Legal</option>
                      <option value="minimal_executive">Minimal Executive</option>
                    </Select>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                        Format
                      </span>
                      <Select
                        value={exportOrientation}
                        onChange={(e) =>
                          setExportOrientation(
                            e.target.value === "landscape"
                              ? "landscape"
                              : "portrait"
                          )
                        }
                      >
                        <option value="portrait">A4 Portrait</option>
                        <option value="landscape">A4 Landscape</option>
                      </Select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                        Confidentiality
                      </span>
                      <Select
                        value={exportConfidentiality}
                        onChange={(e) => setExportConfidentiality(e.target.value)}
                      >
                        <option value="none">None</option>
                        <option value="internal">Internal</option>
                        <option value="confidential">Confidential</option>
                        <option value="draft">Draft</option>
                        <option value="final">Final</option>
                      </Select>
                    </label>
                  </div>
                  <p className="text-xs text-ink-faint">
                    A project image named “logo” is placed on the cover
                    automatically.
                    {(() => {
                      const approved = placements.filter(
                        (p) =>
                          p.isApproved &&
                          p.isEnabled &&
                          (p.target === "section" || p.target === "appendix")
                      ).length;
                      return approved > 0
                        ? ` ${approved} approved visual${
                            approved > 1 ? "s" : ""
                          } will be included in the export.`
                        : " No approved section visuals.";
                    })()}
                  </p>
                </div>

                {isDocumentStale(documentAssembledAt, sections) && (
                  <div className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                    <div className="flex items-start gap-2">
                      <Icon
                        name="alert"
                        size={15}
                        className="mt-0.5 shrink-0 text-amber-500"
                      />
                      <p className="text-xs leading-5 text-amber-700">
                        Re-assemble before exporting the latest section changes.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      icon="check"
                      loading={assembling}
                      onClick={handleAssemble}
                    >
                      Assemble latest document
                    </Button>
                  </div>
                )}

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
