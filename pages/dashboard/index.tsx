import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AppShell } from "../../components/app-shell";
import { StatTile, WorkflowStep, WorkflowStepper } from "../../components/product/workflow";
import { Icon } from "../../components/ui/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  StatusPill,
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
}

interface ProjectDetail extends ProjectRecord {
  counts?: { documents: number; knowledgeItems: number; resources: number };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
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

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectDetail[]>([]);
  const [loading, setLoading] = useState(true);
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

  const load = async () => {
    setError(null);
    try {
      const list = await request<ProjectRecord[]>("/api/projects");
      // Enrich with counts (parallel) for the overview totals.
      const detailed = await Promise.all(
        list.map(async (project) => {
          try {
            return await request<ProjectDetail>(`/api/projects/${project.id}`);
          } catch {
            return project as ProjectDetail;
          }
        })
      );
      setProjects(detailed);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load workspace"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  const totals = projects.reduce(
    (acc, p) => {
      acc.documents += p.counts?.documents ?? 0;
      acc.knowledge += p.counts?.knowledgeItems ?? 0;
      acc.resources += p.counts?.resources ?? 0;
      if (p.status === "ACTIVE") acc.active += 1;
      return acc;
    },
    { documents: 0, knowledge: 0, resources: 0, active: 0 }
  );

  const recent = [...projects]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5);

  const hasProjects = projects.length > 0;
  const hasKnowledge = totals.knowledge > 0;
  const hasResources = totals.resources > 0;
  const hasDocuments = totals.documents > 0;

  const steps: WorkflowStep[] = [
    {
      icon: "projects",
      label: "Create a project",
      hint: "Your workspace for one output stream.",
      state: hasProjects ? "done" : "current",
    },
    {
      icon: "knowledge",
      label: "Add knowledge",
      hint: "Reusable context for every document.",
      state: hasKnowledge ? "done" : hasProjects ? "current" : "todo",
    },
    {
      icon: "resources",
      label: "Upload resources",
      hint: "Source files we extract text from.",
      state: hasResources ? "done" : hasKnowledge ? "current" : "todo",
    },
    {
      icon: "documents",
      label: "Create a document",
      hint: "Define the deliverable you need.",
      state: hasDocuments ? "done" : hasResources ? "current" : "todo",
    },
    {
      icon: "generate",
      label: "Generate & review",
      hint: "Draft with AI, then refine.",
      state: hasDocuments ? "current" : "todo",
    },
    {
      icon: "export",
      label: "Export",
      hint: "Markdown, DOCX or PDF.",
      state: "todo",
    },
  ];

  return (
    <AppShell
      eyebrow="Workspace"
      icon="dashboard"
      title="Dashboard"
      description="Your command center — track projects, monitor progress, and jump back into work."
      actions={
        <Link href="/dashboard/projects">
          <a className={buttonClass("primary", "md")}>
            <Icon name="plus" size={16} />
            New project
          </a>
        </Link>
      }
    >
      {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

      {/* Overview */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon="projects"
            label="Projects"
            value={projects.length}
            hint={`${totals.active} active`}
          />
          <StatTile
            icon="knowledge"
            label="Knowledge items"
            value={totals.knowledge}
            hint="Reusable project memory"
          />
          <StatTile
            icon="resources"
            label="Resources"
            value={totals.resources}
            hint="Source material files"
          />
          <StatTile
            icon="documents"
            label="Documents"
            value={totals.documents}
            hint="Deliverables in progress"
          />
        </div>
      )}

      {/* Workflow progress */}
      <Card className="mt-6 p-6">
        <div className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
          <Icon name="layers" size={14} />
          Your production pipeline
        </div>
        <WorkflowStepper steps={steps} />
      </Card>

      {/* Recent projects */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
              <Icon name="clock" size={14} />
              Recent projects
            </div>
            <Link href="/dashboard/projects">
              <a className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition-colors hover:text-ink">
                View all <Icon name="arrow-right" size={13} />
              </a>
            </Link>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : !recent.length ? (
              <EmptyState
                icon="projects"
                title="No projects yet"
                description="Create your first project to start turning knowledge into documents."
                action={
                  <Link href="/dashboard/projects">
                    <a className={buttonClass("primary", "md")}>
                      <Icon name="plus" size={16} />
                      Create project
                    </a>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {recent.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                  >
                    <a className="group flex items-center gap-4 rounded-xl border border-transparent px-3 py-3 transition-all duration-200 hover:border-line hover:bg-ink/[0.015]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                        <Icon name="projects" size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-ink">
                            {project.name}
                          </p>
                          <StatusPill status={project.status} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-muted">
                          {project.counts
                            ? `${project.counts.documents} docs · ${project.counts.knowledgeItems} knowledge · ${project.counts.resources} resources`
                            : `Updated ${formatDate(project.updatedAt)}`}
                        </p>
                      </div>
                      <Icon
                        name="chevron-right"
                        size={16}
                        className="text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                      />
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="p-6">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
            <Icon name="bolt" size={14} />
            Quick actions
          </div>
          <div className="mt-5 space-y-2.5">
            <Link href="/dashboard/projects">
              <a className="flex items-center gap-3 rounded-xl border border-line p-3.5 transition-all duration-200 hover:border-accent-300 hover:bg-accent-50/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <Icon name="plus" size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">New project</p>
                  <p className="text-xs text-ink-muted">
                    Start a fresh output stream
                  </p>
                </div>
              </a>
            </Link>
            <Link href="/dashboard/projects">
              <a className="flex items-center gap-3 rounded-xl border border-line p-3.5 transition-all duration-200 hover:border-accent-300 hover:bg-accent-50/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <Icon name="documents" size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">
                    Open a project
                  </p>
                  <p className="text-xs text-ink-muted">
                    Add knowledge, resources & docs
                  </p>
                </div>
              </a>
            </Link>
            <Link href="/dashboard/templates">
              <a className="flex items-center gap-3 rounded-xl border border-line p-3.5 transition-all duration-200 hover:border-accent-300 hover:bg-accent-50/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <Icon name="templates" size={17} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Templates</p>
                  <p className="text-xs text-ink-muted">
                    Standardize document structure
                  </p>
                </div>
              </a>
            </Link>
          </div>

          <div className="mt-5 rounded-xl bg-ink/[0.03] p-4">
            <div className="flex items-center gap-2">
              <Icon name="sparkles" size={15} className="text-accent-600" />
              <Badge tone="accent">Tip</Badge>
            </div>
            <p className="mt-2 text-xs leading-5 text-ink-muted">
              The more knowledge and source material a project holds, the
              stronger your generated documents will be.
            </p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
