import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { useIsAdmin } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin-codes")({
  head: () => ({
    meta: [
      { title: "Redeem code generator — BLUBLUB" },
      { name: "description", content: "Owner-only generator for expiring premium redeem codes." },
      { property: "og:title", content: "Redeem code generator — BLUBLUB" },
      {
        property: "og:description",
        content: "Owner-only generator for expiring premium redeem codes.",
      },
    ],
  }),
  component: AdminCodesPage,
});

type CodeRow = {
  code: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

function status(row: CodeRow) {
  if (row.used_at) return { label: "Used", tone: "text-muted-foreground" };
  if (new Date(row.expires_at).getTime() < Date.now())
    return { label: "Expired", tone: "text-destructive" };
  return { label: "Active", tone: "text-primary" };
}

function AdminCodesPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const qc = useQueryClient();
  const [hours, setHours] = useState("24");

  const codes = useQuery({
    queryKey: ["redeem-codes"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redeem_codes")
        .select("code, expires_at, used_at, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CodeRow[];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_redeem_code", {
        _valid_hours: Number(hours),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["redeem-codes"] });
      toast.success("New code generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout title="Code generator" subtitle="Owner only" critter="penguin" requireCouple={false}>
      {isLoading ? (
        <Card className="text-sm text-muted-foreground">Checking access…</Card>
      ) : !isAdmin ? (
        <Card className="text-sm text-muted-foreground">
          This area is not available on your account.
        </Card>
      ) : (
        <>
          <Card>
            <div className="space-y-3">
              <Field label="Valid for (hours)">
                <TextInput
                  type="number"
                  min={1}
                  max={168}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </Field>
              <PrimaryButton
                disabled={generate.isPending || !hours}
                onClick={() => generate.mutate()}
              >
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="size-4" /> Generate code
                </span>
              </PrimaryButton>
            </div>
          </Card>

          <SectionTitle>Recent codes</SectionTitle>
          {codes.data && codes.data.length > 0 ? (
            <ul className="space-y-2">
              {codes.data.map((row) => {
                const s = status(row);
                return (
                  <li key={row.code} className="card-soft flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-extrabold tracking-widest">{row.code}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className={s.tone}>{s.label}</span> · expires{" "}
                        {new Date(row.expires_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Copy ${row.code}`}
                      className="press rounded-full bg-muted p-2"
                      onClick={() => {
                        void navigator.clipboard.writeText(row.code);
                        toast.success("Copied");
                      }}
                    >
                      <Copy className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Card className="text-sm text-muted-foreground">No codes yet.</Card>
          )}
        </>
      )}
    </AppLayout>
  );
}
