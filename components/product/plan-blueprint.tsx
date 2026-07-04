import { useState } from "react";
import { Icon } from "../ui/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Textarea,
  cn,
} from "../ui";
import {
  DOCUMENT_PLAN_STATUS_UI,
  DocumentPlan,
  DocumentPlanStatus,
  PlanSection,
  planKeyFigureCount,
  planTotalTargetWords,
} from "../../lib/documents/document-plan";

function fmt(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
}

export interface PlanBlueprintProps {
  plan: DocumentPlan | null;
  status: DocumentPlanStatus | null;
  updatedAt: string | null;
  outOfSync: boolean;
  sectionsExist: boolean;
  dirty: boolean;
  generating: boolean;
  revising: boolean;
  saving: boolean;
  applying: boolean;
  feedback: string;
  error: string | null;
  note: string | null;
  onFeedbackChange: (v: string) => void;
  onGenerate: () => void;
  onRevise: () => void;
  onSave: () => void;
  onApply: () => void;
  onSectionChange: (index: number, patch: Partial<PlanSection>) => void;
  onSectionMove: (index: number, dir: -1 | 1) => void;
  onSectionRemove: (index: number) => void;
  onSectionAdd: () => void;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-ink/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tracking-tight text-ink">
        {value}
      </p>
    </div>
  );
}

export function PlanBlueprint(props: PlanBlueprintProps) {
  const { plan } = props;
  const [expanded, setExpanded] = useState<string | null>(null);
  const status: DocumentPlanStatus = props.status ?? "pending";
  const ui = DOCUMENT_PLAN_STATUS_UI[status];

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
            <Icon name="layers" size={14} />
            Document blueprint
          </div>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink-muted">
            Review and adjust the plan before generation. Sources and figures
            are allocated per section.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
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
            {props.dirty ? "Unsaved edits" : ui.label}
          </Badge>
          {props.updatedAt && (
            <span className="text-xs text-ink-faint">
              Updated {fmt(props.updatedAt)}
            </span>
          )}
        </div>
      </div>

      {props.error && (
        <Alert tone="danger" className="mt-4">
          {props.error}
        </Alert>
      )}
      {props.note && !props.error && (
        <Alert tone="info" className="mt-4">
          {props.note}
        </Alert>
      )}

      {!plan ? (
        <div className="mt-5 rounded-2xl border border-dashed border-line bg-ink/[0.015] px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
            <Icon name="layers" size={22} />
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">No plan yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-ink-muted">
            Generate a document blueprint from this project&apos;s knowledge and
            sources, then review it before writing.
          </p>
          <div className="mt-5">
            <Button
              type="button"
              icon="layers"
              loading={props.generating}
              onClick={props.onGenerate}
            >
              Generate plan
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Sections" value={plan.sections.length} />
            <Stat label="Target words" value={planTotalTargetWords(plan)} />
            <Stat label="Key figures" value={planKeyFigureCount(plan)} />
            <Stat label="Missing info" value={plan.missingInformation.length} />
          </div>

          {/* Out of sync */}
          {props.outOfSync && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <Icon name="alert" size={17} className="mt-0.5 shrink-0 text-amber-500" />
                <p className="text-xs leading-5 text-amber-700">
                  Plan changed after sections were synced. Apply it to update
                  section metadata — existing generated content is preserved.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon="check"
                loading={props.applying}
                disabled={props.dirty}
                onClick={props.onApply}
                className="shrink-0"
              >
                Apply changes
              </Button>
            </div>
          )}

          {/* Coverage warnings */}
          {plan.sourceCoverage.warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-line bg-ink/[0.02] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                Coverage notes
              </p>
              <ul className="mt-1.5 space-y-1">
                {plan.sourceCoverage.warnings.slice(0, 4).map((w, i) => (
                  <li key={i} className="text-xs leading-5 text-ink-soft">
                    • {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Feedback box */}
          <div className="mt-5 rounded-2xl border border-accent-100 bg-accent-50/40 p-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
              <Icon name="sparkles" size={14} />
              Improve plan with AI
            </div>
            <Textarea
              value={props.feedback}
              onChange={(e) => props.onFeedbackChange(e.target.value)}
              placeholder="Tell the AI how to improve this plan… e.g. “Add a detailed budget section and make it suitable for a bank financing file.”"
              className="mt-3 min-h-[80px] bg-surface"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                icon="sparkles"
                loading={props.revising}
                disabled={!props.feedback.trim()}
                onClick={props.onRevise}
              >
                Improve plan
              </Button>
              <Button
                type="button"
                variant="ghost"
                icon="layers"
                loading={props.generating}
                onClick={props.onGenerate}
              >
                Regenerate from scratch
              </Button>
            </div>
          </div>

          {/* Section blueprint list */}
          <div className="mt-5 space-y-2.5">
            {plan.sections.map((section, index) => {
              const isOpen = expanded === section.id;
              return (
                <div
                  key={section.id}
                  className="rounded-xl border border-line"
                >
                  <div className="flex items-start gap-3 p-3.5">
                    <div className="flex flex-col gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => props.onSectionMove(index, -1)}
                        disabled={index === 0}
                        className="flex h-5 w-5 items-center justify-center rounded text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
                        title="Move up"
                      >
                        <Icon name="chevron-down" size={13} className="rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onSectionMove(index, 1)}
                        disabled={index === plan.sections.length - 1}
                        className="flex h-5 w-5 items-center justify-center rounded text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
                        title="Move down"
                      >
                        <Icon name="chevron-down" size={13} />
                      </button>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-ink-faint">
                          {index + 1}.
                        </span>
                        <h4 className="truncate text-sm font-semibold text-ink">
                          {section.title}
                        </h4>
                        {section.openQuestions.length > 0 && (
                          <span
                            title={`${section.openQuestions.length} open questions`}
                            className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-100 text-amber-600"
                          >
                            <Icon name="alert" size={11} />
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-ink-muted">
                        <span>{section.targetWords || "—"} words</span>
                        <span>{section.sourceBriefs.length} sources</span>
                        <span>{section.keyFigures.length} figures</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : section.id)}
                        title="Edit"
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border border-line transition-colors",
                          isOpen
                            ? "border-accent-300 bg-accent-50 text-accent-700"
                            : "text-ink-muted hover:border-ink/20 hover:text-ink"
                        )}
                      >
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onSectionRemove(index)}
                        title="Remove section"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="space-y-3 border-t border-line p-3.5">
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                          Title
                        </span>
                        <Input
                          value={section.title}
                          onChange={(e) =>
                            props.onSectionChange(index, { title: e.target.value })
                          }
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                          Purpose / instructions
                        </span>
                        <Textarea
                          value={section.purpose}
                          onChange={(e) =>
                            props.onSectionChange(index, {
                              purpose: e.target.value,
                            })
                          }
                          className="min-h-[70px]"
                        />
                      </label>
                      <label className="block max-w-[160px]">
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                          Target words
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={section.targetWords ?? ""}
                          onChange={(e) =>
                            props.onSectionChange(index, {
                              targetWords: e.target.value
                                ? Math.max(0, parseInt(e.target.value, 10) || 0)
                                : undefined,
                            })
                          }
                        />
                      </label>
                      {section.sourceBriefs.length > 0 && (
                        <p className="text-xs text-ink-muted">
                          <span className="font-semibold">Sources:</span>{" "}
                          {section.sourceBriefs.join(", ")}
                        </p>
                      )}
                      {section.keyFigures.length > 0 && (
                        <p className="text-xs text-ink-muted">
                          <span className="font-semibold">Key figures:</span>{" "}
                          {section.keyFigures
                            .map((f) => `${f.label} = ${f.value}`)
                            .join("; ")}
                        </p>
                      )}
                      {section.openQuestions.length > 0 && (
                        <p className="text-xs text-ink-muted">
                          <span className="font-semibold">Open questions:</span>{" "}
                          {section.openQuestions.join("; ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={props.onSectionAdd}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-accent-300 hover:text-accent-700"
            >
              <Icon name="plus" size={15} />
              Add section
            </button>
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
            <Button
              type="button"
              icon="check"
              loading={props.saving}
              disabled={!props.dirty}
              onClick={props.onSave}
            >
              {props.dirty ? "Save plan" : "Saved"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon="arrow-right"
              loading={props.applying}
              disabled={props.dirty}
              onClick={props.onApply}
            >
              {props.sectionsExist ? "Apply plan to sections" : "Create sections"}
            </Button>
            {props.dirty && (
              <p className="w-full text-xs text-ink-muted">
                Save your edits before applying them to sections.
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
