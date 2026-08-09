import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { playChirp } from "@/hooks/use-sound";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("card-soft p-4", className)}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between gap-2">
      <h2 className="text-base font-extrabold">{children}</h2>
      {action}
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
        "press w-full rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-soft disabled:opacity-60",
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

export function EmptyState({ text }: { text: string }) {
  return <p className="card-soft p-5 text-center text-sm text-muted-foreground">{text}</p>;
}

export function Money({ value }: { value: number }) {
  return <>{new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value)}</>;
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
