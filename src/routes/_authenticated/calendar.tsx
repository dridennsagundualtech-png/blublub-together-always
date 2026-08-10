import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, SectionTitle, TextInput } from "@/components/ui-kit";
import { todayISO, useMarkSeen } from "@/lib/badges";
import { useAuthUser, useCoupleId } from "@/lib/session";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function isoOf(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });

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
  const { data: derived } = useDerivedDates();

  // Everything with a date in the app, normalised into one list.
  const allItems = useMemo(() => {
    const fromEvents = (events ?? []).map((e) => ({
      id: e.id,
      date: e.event_date,
      title: e.title,
      time: e.event_time as string | null,
      kind: "event" as const,
      removable: true,
    }));
    const fromDerived = (derived ?? []).map((d) => ({
      id: d.id,
      date: d.date,
      title: d.title,
      time: null,
      kind: d.kind,
      removable: false,
    }));
    return [...fromEvents, ...fromDerived].sort((a, b) => a.date.localeCompare(b.date));
  }, [events, derived]);

  const upcoming = allItems.filter((e) => e.date >= today);
  const past = allItems.filter((e) => e.date < today).reverse();

  const byDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of allItems) {
      map.set(e.date, (map.get(e.date) ?? 0) + 1);
    }
    return map;
  }, [allItems]);


  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shiftMonth = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const selectedEvents = (events ?? []).filter((e) => e.event_date === date);

  return (
    <AppLayout title="Calendar" subtitle="Dates & anniversaries" critter="penguin">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
            className="press rounded-full p-2 text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="font-display text-base font-extrabold">
            {MONTH_NAMES[view.month]} {view.year}
          </p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
            className="press rounded-full p-2 text-muted-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="text-[10px] font-bold uppercase text-muted-foreground">
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={`e${i}`} />;
            const iso = isoOf(view.year, view.month, day);
            const count = byDate.get(iso) ?? 0;
            const isToday = iso === today;
            const isSelected = iso === date;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setDate(iso)}
                className={`press flex aspect-square flex-col items-center justify-center rounded-2xl text-sm font-semibold ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "tile-lilac text-primary"
                      : "bg-muted/60"
                }`}
              >
                {day}
                <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                  {count > 0
                    ? Array.from({ length: Math.min(count, 3) }, (_, k) => (
                        <span
                          key={k}
                          className={`size-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`}
                        />
                      ))
                    : null}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <SectionTitle>{date === today ? "Today" : date}</SectionTitle>
      {selectedEvents.length === 0 ? (
        <Card className="text-sm text-muted-foreground">Nothing planned on this day yet.</Card>
      ) : (
        <ul className="space-y-2">
          {selectedEvents.map((e) => (
            <li key={e.id} className="card-soft flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{e.title}</p>
                {e.event_time ? (
                  <p className="text-xs text-muted-foreground">{e.event_time.slice(0, 5)}</p>
                ) : null}
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

      <SectionTitle>Add an event</SectionTitle>
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
