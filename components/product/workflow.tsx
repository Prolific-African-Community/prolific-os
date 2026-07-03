import { ReactNode } from "react";
import { Icon, IconName } from "../ui/icons";
import { cn } from "../ui";

/* ---------------------------------------------------------------- LogoMark */

export function LogoMark({
  size = "md",
  invert = false,
}: {
  size?: "sm" | "md";
  invert?: boolean;
}) {
  const markSize = size === "sm" ? "h-6 w-6" : "h-7 w-7";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-[9px] shadow-soft",
          markSize,
          invert ? "bg-white" : "bg-ink"
        )}
      >
        <span className="absolute inset-y-1 left-1.5 w-[3px] rounded-full bg-accent-500" />
        <span
          className={cn(
            "absolute inset-y-1 right-1.5 w-[3px] rounded-full",
            invert ? "bg-ink/70" : "bg-white/85"
          )}
        />
      </div>
      <span
        className={cn(
          "text-[15px] font-semibold tracking-tight",
          invert ? "text-white" : "text-ink"
        )}
      >
        Prolific<span className="text-ink-faint"> OS</span>
      </span>
    </div>
  );
}

/* -------------------------------------------------------------- StatTile */

export function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: IconName;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
          <Icon name={icon} size={17} />
        </div>
        <span className="text-2xl font-semibold tracking-tight text-ink">
          {value}
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-ink">{label}</p>
      {hint && <p className="mt-1 text-xs leading-5 text-ink-muted">{hint}</p>}
    </div>
  );
}

/* ---------------------------------------------------------- WorkflowStepper */

export type StepState = "done" | "current" | "todo";

export interface WorkflowStep {
  icon: IconName;
  label: string;
  hint?: string;
  state: StepState;
}

export function WorkflowStepper({
  steps,
  className,
}: {
  steps: WorkflowStep[];
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:gap-2">
        {steps.map((step, index) => (
          <div key={step.label} className="relative flex lg:flex-col">
            {index < steps.length - 1 && (
              <span className="pointer-events-none absolute left-[19px] top-10 h-[calc(100%-1.5rem)] w-px bg-line lg:left-auto lg:right-[-4px] lg:top-[19px] lg:h-px lg:w-[calc(100%-2.5rem)]" />
            )}
            <div className="flex items-start gap-3 lg:flex-col lg:items-start">
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-300",
                  step.state === "done" &&
                    "border-transparent bg-accent-600 text-white shadow-soft",
                  step.state === "current" &&
                    "border-accent-300 bg-accent-50 text-accent-600 shadow-glow",
                  step.state === "todo" &&
                    "border-line bg-surface text-ink-faint"
                )}
              >
                {step.state === "done" ? (
                  <Icon name="check" size={18} />
                ) : (
                  <Icon name={step.icon} size={17} />
                )}
                {step.state === "current" && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-soft rounded-full bg-accent-500 ring-2 ring-surface" />
                )}
              </div>
              <div className="pt-1 lg:pt-3">
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.09em]",
                    step.state === "todo" ? "text-ink-faint" : "text-ink-muted"
                  )}
                >
                  Step {index + 1}
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold tracking-tight",
                    step.state === "todo" ? "text-ink-muted" : "text-ink"
                  )}
                >
                  {step.label}
                </p>
                {step.hint && (
                  <p className="mt-0.5 hidden text-xs leading-5 text-ink-muted lg:block">
                    {step.hint}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
