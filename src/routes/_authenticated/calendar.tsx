import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { todayISO, useMarkSeen } from "@/lib/badges";
import { useAuthUser, useCoupleId } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Shared Calendar — BLUBLUB" },
      { name: "description", content: "Plan dates, events and anniversaries together." },
      { property: "og:title", content: "Shared Calendar — BLUBLUB" },
      { property: "og:description", content: "Plan dates, events and anniversaries together." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  useMarkSeen("calendar");
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");

  const { data: events } = useQuery({
    queryKey: ["events", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("event_date");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim(),
        event_date: date,
        event_time: time || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setTime("");
      void qc.invalidateQueries({ queryKey: ["events"] });
      void qc.invalidateQueries({ queryKey: ["upcoming-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["events"] });
      void qc.invalidateQueries({ queryKey: ["upcoming-events"] });
    },
  });

  const today = todayISO();
  const upcoming = (events ?? []).filter((e) => e.event_date >= today);
  const past = (events ?? []).filter((e) => e.event_date < today).reverse();

  return (
    <AppLayout title="Calendar" subtitle="Dates & anniversaries" critter="penguin">
      <Card>
        <div className="space-y-3">
          <Field label="What's happening?">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Dinner at our spot"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Time">
              <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </Field>
          </div>
          <PrimaryButton disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
            Add to calendar
          </PrimaryButton>
        </div>
      </Card>

      <SectionTitle>Upcoming</SectionTitle>
      {upcoming.length === 0 ? (
        <Card className="text-sm text-muted-foreground">Nothing yet — plan something cozy.</Card>
      ) : (
        <ul className="space-y-2">
          {upcoming.map((e) => (
            <li key={e.id} className="card-soft flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.event_date}
                  {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
                </p>
              </div>
              <button
                aria-label="Delete event"
                onClick={() => remove.mutate(e.id)}
                className="press rounded-full p-2 text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 ? (
        <>
          <SectionTitle>Been there</SectionTitle>
          <ul className="space-y-2 opacity-70">
            {past.map((e) => (
              <li key={e.id} className="card-soft p-4">
                <p className="truncate text-sm font-bold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.event_date}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </AppLayout>
  );
}
