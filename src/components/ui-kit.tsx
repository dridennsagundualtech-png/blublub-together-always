import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useState } from "react";
import { Flame, Heart, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { playChirp } from "@/hooks/use-sound";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("surface-quiet p-4", className)}>{children}</div>;
}

export function SectionTitle({
  children,
  action,
  actionLabel = "See All",
  onAction,
}: {
  children: ReactNode;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between gap-2">
      <h2 className="text-lg font-bold tracking-tight text-foreground">{children}</h2>
      {action ??
        (onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="press text-xs font-semibold text-primary"
          >
            {actionLabel}
          </button>
        ) : null)}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-border bg-background px-4 py-3 text-base outline-none focus:ring-2 focus:ring-ring";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, className)} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, "min-h-24", className)} />;
}

export function SelectInput({
  className,
  children,
  ...props
}: InputHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} className={cn(inputClass, className)}>
      {children}
    </select>
  );
}

export function PrimaryButton({
  children,
  className,
  onClick,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={() => {
        playChirp("tap");
        onClick?.();
      }}
      className={cn(
        "press w-full rounded-full bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-none disabled:opacity-60",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        playChirp("pop");
        onClick?.();
      }}
      className={cn(
        "press rounded-full border border-border bg-card px-4 py-2 text-xs font-bold",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  text,
  title,
  action,
}: {
  text: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-quiet flex flex-col items-center gap-2 px-5 py-10 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><Heart className="size-6" /></div>
      {title ? <p className="font-display text-base font-extrabold">{title}</p> : null}
      <p className="max-w-xs text-sm text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

export function Money({ value }: { value: number }) {
  return <>{new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value)}</>;
}

export function ProgressBar({
  value,
  tone = "pink",
}: {
  value: number;
  tone?: "pink" | "lilac" | "mint" | "peach";
}) {
  const tones: Record<string, string> = {
    pink: "bg-primary",
    lilac: "bg-lavender",
    mint: "bg-mint",
    peach: "bg-honey",
  };
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
      <div
        className={`h-full rounded-full transition-all duration-500 ${tones[tone] ?? tones["pink"]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** A gradient hero surface for headline stats. Palette-safe (pink → cream). */
export function StatHero({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("card-soft hero-gradient relative overflow-hidden p-6", className)}>
      {children}
    </section>
  );
}

/** Gradient card for secondary stats. */
export function StatCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("surface-quiet stat-gradient p-4", className)}>{children}</div>;
}

/** Small consistency indicator: 🔥 + count of consecutive days. */
export function StreakChip({ days, label = "day streak" }: { days: number; label?: string }) {
  if (days <= 0) return null;
  return (
    <span className="streak-chip">
      <Flame className="size-3.5" aria-hidden="true" />
      {days} {label}
    </span>
  );
}

/** Soft list row — mockup-style task / growth item. */
export function ListRow({
  icon,
  title,
  subtitle,
  onClick,
  trailing,
  tint = "pink",
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  tint?: "pink" | "lilac" | "peach" | "sky" | "mint";
}) {
  const tints: Record<string, string> = {
    pink: "tile-pink",
    lilac: "tile-lilac",
    peach: "tile-peach",
    sky: "tile-sky",
    mint: "bg-mint/40",
  };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "list-row w-full text-left",
        onClick && "press",
      )}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-2xl text-primary",
          tints[tint] ?? tints["pink"],
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{title}</span>
        {subtitle ? (
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {trailing}
    </Comp>
  );
}

/** Bottom sheet used for hidden add-flows across the app. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end" role="dialog" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/30 backdrop-blur-[2px]"
      />
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-card p-4 shadow-float">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-lg font-extrabold">{title}</p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="press grid size-9 place-items-center rounded-full bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Collapsed add-form: nothing but a "+" pill until the user asks for it.
 * Keeps every page's landing view clean.
 */
export function AddPanel({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className={className}>
      {open ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-extrabold">{label}</p>
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="press grid size-8 place-items-center rounded-full bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
          {typeof children === "function" ? children(close) : children}
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => {
            playChirp("pop");
            setOpen(true);
          }}
          className="press flex w-full items-center justify-center gap-2 rounded-full border-2 border-dashed border-border bg-card/60 py-3 text-sm font-bold text-muted-foreground"
        >
          <Plus className="size-4" />
          {label}
        </button>
      )}
    </div>
  );
}
