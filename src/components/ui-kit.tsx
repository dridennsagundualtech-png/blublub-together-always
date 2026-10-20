import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Flame, Heart, Plus, X } from "lucide-react";
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
            className="press -mr-2 inline-flex min-h-11 items-center px-2 text-xs font-semibold text-primary-ink"
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
        "press inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-card px-4 text-xs font-bold",
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
      <div className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary-ink"><Heart className="size-6" /></div>
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
          "grid size-11 shrink-0 place-items-center rounded-2xl text-primary-ink",
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

/**
 * Bottom panel frame with the dialog basics: focus stays inside, Esc closes,
 * focus returns to the button that opened it. Every bottom sheet uses this.
 */
export function SheetFrame({
  label,
  onClose,
  className,
  children,
}: {
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  // Sheets open from plain buttons (no Radix trigger), so remember the opener ourselves.
  const opener = useRef(typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null));
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[80] bg-foreground/30 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Focus the panel, not its first field, so the phone keyboard doesn't pop up on open.
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus();
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
          className={cn(className, "fixed inset-x-0 bottom-0 z-[80] outline-none")}
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
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
    <SheetFrame
      label={title}
      onClose={onClose}
      className="max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-float"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg font-extrabold">{title}</p>
        <DialogPrimitive.Close
          aria-label="Close"
          className="press grid size-11 place-items-center rounded-full bg-muted"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </div>
      {children}
    </SheetFrame>
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
              className="press -m-1.5 grid size-11 place-items-center rounded-full bg-muted"
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

export type Tint = "tile-pink" | "tile-lilac" | "tile-peach" | "tile-sky" | "tile-cream";

/** A tappable row: icon, name, and what's going on with it right now. */
export function LinkRow({
  to,
  icon,
  tint,
  title,
  status,
  dot,
}: {
  to: string;
  icon: ReactNode;
  tint: Tint;
  title: string;
  status: ReactNode;
  dot?: boolean | undefined;
}) {
  return (
    <li>
      <Link to={to} className="press flex min-h-16 items-center gap-3 px-4 py-3">
        <span
          className={cn("grid size-11 shrink-0 place-items-center rounded-2xl text-primary-ink", tint)}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{status}</span>
        </span>
        {dot ? (
          <span className="size-2.5 shrink-0 rounded-full bg-destructive">
            <span className="sr-only">New</span>
          </span>
        ) : null}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/** A titled card of LinkRows. */
export function RowGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-1">
      <h2 className="mb-2 px-1 font-display text-lg font-bold">{title}</h2>
      <ul className="card-soft divide-y divide-border/60 overflow-hidden">{children}</ul>
    </section>
  );
}

/** On/off switch with a 44px tap area; the track passes 3:1 against the card in both states. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean | undefined;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="press -my-2 grid min-h-11 shrink-0 place-items-center rounded-full disabled:opacity-60"
    >
      <span
        className={cn(
          "block h-7 w-12 rounded-full p-0.5 transition-colors",
          checked ? "bg-primary-ink" : "bg-muted-foreground/45",
        )}
      >
        <span
          className={cn(
            "block size-6 rounded-full bg-card shadow-soft transition-transform",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}
