import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { todayISO } from "@/lib/badges";
import { useAuthUser, useCoupleId, useProfile, useRefreshSession, usePartner } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/period")({
  head: () => ({
    meta: [
      { title: "Cycle Tracking — BLUBLUB" },
      { name: "description", content: "Log your cycle and optionally share a simple summary." },
      { property: "og:title", content: "Cycle Tracking — BLUBLUB" },
      {
        property: "og:description",
        content: "Log your cycle and optionally share a simple summary.",
      },
    ],
  }),
  component: PeriodPage,
});

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function phaseFor(start: string, cycleLength: number, periodLength: number) {
  const day =
    Math.floor(
      (Date.parse(`${todayISO()}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 86_400_000,
    ) % cycleLength;
  if (day < periodLength) return "Period";
  if (day < cycleLength / 2 - 2) return "Follicular";
  if (day <= cycleLength / 2 + 1) return "Ovulation";
  return "Luteal";
}

function PeriodPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: profile } = useProfile();
  const partner = usePartner();
  const refresh = useRefreshSession();
  const qc = useQueryClient();
  const [start, setStart] = useState(todayISO());
  const [periodLength, setPeriodLength] = useState(5);
  const [cycleLength, setCycleLength] = useState(28);

  const { data: logs } = useQuery({
    queryKey: ["cycle-logs", coupleId, user?.id],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycle_logs")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("cycle_logs").insert({
        couple_id: coupleId!,
        user_id: user!.id,
        start_date: start,
        period_length: periodLength,
        cycle_length: cycleLength,
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cycle-logs"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleShare = useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase
        .from("profiles")
        .update({ share_cycle: value })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const myLogs = (logs ?? []).filter((l) => l.user_id === user?.id);
  const partnerLogs = (logs ?? []).filter((l) => l.user_id !== user?.id);
  const latest = myLogs[0] ?? null;
  const partnerLatest = partnerLogs[0] ?? null;
  const shared = partner?.share_cycle && partnerLatest;

  return (
    <AppLayout title="Cycle" subtitle="Gentle tracking" critter="seal">
      {latest ? (
        <Card className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Current phase
          </p>
          <p className="mt-1 text-3xl font-extrabold text-primary">
            {phaseFor(latest.start_date, latest.cycle_length, latest.period_length)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Next expected: {addDays(latest.start_date, latest.cycle_length)}
          </p>
        </Card>
      ) : null}

      <Card className="mt-4">
        <div className="space-y-3">
          <Field label="Period start date">
            <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Period days">
              <TextInput
                type="number"
                min={1}
                max={14}
                value={periodLength}
                onChange={(e) => setPeriodLength(Number(e.target.value))}
              />
            </Field>
            <Field label="Cycle days">
              <TextInput
                type="number"
                min={15}
                max={60}
                value={cycleLength}
                onChange={(e) => setCycleLength(Number(e.target.value))}
              />
            </Field>
          </div>
          <PrimaryButton disabled={add.isPending} onClick={() => add.mutate()}>
            Log cycle
          </PrimaryButton>
        </div>
      </Card>

      <Card className="mt-4 flex items-center justify-between">
        <span className="pr-3 text-sm font-semibold">
          Share a simple summary with {partner?.display_name ?? "your partner"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={!!profile?.share_cycle}
          onClick={() => toggleShare.mutate(!profile?.share_cycle)}
          className={`press h-7 w-12 shrink-0 rounded-full transition-colors ${
            profile?.share_cycle ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`block size-6 rounded-full bg-card shadow-soft transition-transform ${
              profile?.share_cycle ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </Card>

      {shared ? (
        <>
          <SectionTitle>{partner!.display_name}&apos;s summary</SectionTitle>
          <Card>
            <p className="text-sm font-bold">
              {phaseFor(
                partnerLatest!.start_date,
                partnerLatest!.cycle_length,
                partnerLatest!.period_length,
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Next expected: {addDays(partnerLatest!.start_date, partnerLatest!.cycle_length)}
            </p>
          </Card>
        </>
      ) : null}

      <SectionTitle>Your history</SectionTitle>
      {myLogs.length === 0 ? (
        <Card className="text-sm text-muted-foreground">No logs yet.</Card>
      ) : (
        <ul className="space-y-2">
          {myLogs.map((l) => (
            <li key={l.id} className="card-soft flex items-center justify-between p-4 text-sm">
              <span className="font-semibold">{l.start_date}</span>
              <span className="text-muted-foreground">
                {l.period_length}d period · {l.cycle_length}d cycle
              </span>
            </li>
          ))}
        </ul>
      )}
    </AppLayout>
  );
}
