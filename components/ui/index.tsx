import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from "react";
import { Icon, IconName } from "./icons";

type ClassValue = string | false | null | undefined;
export const cn = (...classes: ClassValue[]) =>
  classes.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ Button */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "subtle";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-600 text-white shadow-soft hover:bg-accent-700 hover:shadow-glow active:translate-y-px",
  secondary:
    "bg-ink text-white shadow-soft hover:bg-ink/90 active:translate-y-px",
  ghost:
    "border border-line bg-surface text-ink hover:border-ink/25 hover:bg-ink/[0.03] active:translate-y-px",
  subtle: "bg-ink/[0.04] text-ink hover:bg-ink/[0.07] active:translate-y-px",
  danger:
    "border border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100 active:translate-y-px",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string
) {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], extra);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconName;
  iconRight?: IconName;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner />
      ) : (
        icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />
      )}
      {children}
      {iconRight && !loading && (
        <Icon name={iconRight} size={size === "sm" ? 14 : 16} />
      )}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70",
        className
      )}
    />
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  className,
  children,
  interactive = false,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
  as?: "div" | "article" | "section";
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-line bg-surface shadow-card",
        interactive &&
          "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------- Badge */

type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "dark";

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: "bg-ink/[0.05] text-ink-soft",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-600",
  dark: "bg-ink text-white",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  uppercase = false,
}: {
  tone?: BadgeTone;
  icon?: IconName;
  children: ReactNode;
  className?: string;
  uppercase?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        uppercase && "uppercase tracking-[0.08em]",
        BADGE_TONES[tone],
        className
      )}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- StatusPill */

const DOC_STATUS: Record<
  string,
  { label: string; tone: BadgeTone; dot: string }
> = {
  DRAFT: { label: "Draft", tone: "neutral", dot: "bg-ink-faint" },
  GENERATING: { label: "Generating", tone: "accent", dot: "bg-accent-500" },
  READY_FOR_REVIEW: {
    label: "Ready for review",
    tone: "warning",
    dot: "bg-amber-500",
  },
  APPROVED: { label: "Approved", tone: "success", dot: "bg-emerald-500" },
  ARCHIVED: { label: "Archived", tone: "neutral", dot: "bg-ink-faint" },
  ACTIVE: { label: "Active", tone: "success", dot: "bg-emerald-500" },
  PENDING: { label: "Pending", tone: "neutral", dot: "bg-ink-faint" },
  RUNNING: { label: "Running", tone: "accent", dot: "bg-accent-500" },
  SUCCEEDED: { label: "Succeeded", tone: "success", dot: "bg-emerald-500" },
  FAILED: { label: "Failed", tone: "danger", dot: "bg-red-500" },
};

export function StatusPill({ status }: { status: string }) {
  const cfg = DOC_STATUS[status] || {
    label: status,
    tone: "neutral" as BadgeTone,
    dot: "bg-ink-faint",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        BADGE_TONES[cfg.tone]
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          cfg.dot,
          (status === "GENERATING" || status === "RUNNING") &&
            "animate-pulse-soft"
        )}
      />
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------- Fields */

export function Label({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

const FIELD_BASE =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium text-ink outline-none transition-all duration-200 placeholder:text-ink-faint/70 hover:border-ink/15 focus:border-accent-500 focus:ring-4 focus:ring-accent-500/12";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(FIELD_BASE, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(FIELD_BASE, "min-h-[130px] resize-y leading-6", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(FIELD_BASE, "cursor-pointer appearance-none pr-9", className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b6e7b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 0.75rem center",
    }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </label>
  );
}

/* ------------------------------------------------------------------- Alerts */

type AlertTone = "danger" | "success" | "info" | "warning";

const ALERT_TONES: Record<
  AlertTone,
  { wrap: string; icon: IconName; iconColor: string }
> = {
  danger: {
    wrap: "border-red-200 bg-red-50 text-red-700",
    icon: "alert",
    iconColor: "text-red-500",
  },
  success: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: "check-circle",
    iconColor: "text-emerald-500",
  },
  info: {
    wrap: "border-accent-200 bg-accent-50 text-accent-700",
    icon: "info",
    iconColor: "text-accent-500",
  },
  warning: {
    wrap: "border-amber-200 bg-amber-50 text-amber-700",
    icon: "alert",
    iconColor: "text-amber-500",
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const cfg = ALERT_TONES[tone];
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border px-4 py-3 text-sm font-medium animate-fade-in",
        cfg.wrap,
        className
      )}
    >
      <Icon name={cfg.icon} size={18} className={cn("mt-0.5 shrink-0", cfg.iconColor)} />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-line bg-ink/[0.015] px-6 py-12 text-center animate-fade-in",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 shadow-soft">
        <Icon name={icon} size={24} />
      </div>
      <p className="mt-5 text-base font-semibold tracking-tight text-ink">
        {title}
      </p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- SectionCard */

export function SectionCard({
  eyebrow,
  icon,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  eyebrow?: string;
  icon?: IconName;
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("p-6", className)}>
      {(title || eyebrow || action) && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent-600">
                {icon && <Icon name={icon} size={14} />}
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
        </div>
      )}
      {children && (
        <div className={cn(title || eyebrow ? "mt-6" : "", bodyClassName)}>
          {children}
        </div>
      )}
    </Card>
  );
}

/* ---------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export { Icon };
export type { IconName };
