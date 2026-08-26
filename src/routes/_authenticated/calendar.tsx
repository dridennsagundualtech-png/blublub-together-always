import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarHeart, CalendarPlus, Check, ChevronLeft, ChevronRight, Lock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  Field,
  PrimaryButton,
  SectionTitle,
  Sheet,
  TextArea,
  TextInput,
} from "@/components/ui-kit";
import { todayISO, useMarkSeen } from "@/lib/badges";
import { useAuthUser, useCoupleId } from "@/lib/session";
import { DERIVED_META, useDerivedDates } from "@/lib/calendar-sources";

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

type AddMode = null | "choose" | "event" | "date";

function CalendarPage() {
  useMarkSeen("calendar");
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [addMode, setAddMode] = useState<AddMode>(null);
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
      setAddMode(null);
      void qc.invalidateQueries({ queryKey: ["events"] });
      void qc.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Added to your calendar");
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

  const selectedEvents = allItems.filter((e) => e.date === date);

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
                <p className="truncate text-sm font-bold">
                  {e.kind === "event" ? "" : `${DERIVED_META[e.kind].emoji} `}
                  {e.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.time ? `${e.time.slice(0, 5)}` : ""}
                  {e.kind === "event" ? "" : `${e.time ? " · " : ""}${DERIVED_META[e.kind].label}`}
                </p>
              </div>
              {e.removable ? (
                <button
                  aria-label="Delete event"
                  onClick={() => remove.mutate(e.id)}
                  className="press rounded-full p-2 text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Upcoming</SectionTitle>
      {upcoming.length === 0 ? (
        <Card className="text-sm text-muted-foreground">Nothing yet — plan something cozy.</Card>
      ) : (
        <ul className="space-y-2">
          {upcoming.slice(0, 20).map((e) => (
            <li key={e.id} className="card-soft flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {e.kind === "event" ? "" : `${DERIVED_META[e.kind].emoji} `}
                  {e.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.date}
                  {e.time ? ` · ${e.time.slice(0, 5)}` : ""}
                  {e.kind === "event" ? "" : ` · ${DERIVED_META[e.kind].label}`}
                </p>
              </div>
              {e.removable ? (
                <button
                  aria-label="Delete event"
                  onClick={() => remove.mutate(e.id)}
                  className="press rounded-full p-2 text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 ? (
        <>
          <SectionTitle>Been there</SectionTitle>
          <ul className="space-y-2 opacity-70">
            {past.slice(0, 20).map((e) => (
              <li key={e.id} className="card-soft p-4">
                <p className="truncate text-sm font-bold">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.date}</p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <button
        type="button"
        aria-label="Add to calendar"
        onClick={() => setAddMode("choose")}
        className="press fixed bottom-28 right-[max(1rem,calc(50%-15rem))] z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-float"
      >
        <Plus className="size-6" />
      </button>

      {addMode === "choose" ? (
        <Sheet title="What are we adding?" onClose={() => setAddMode(null)}>
          <div className="grid gap-3">
            <ChoiceRow
              icon={<CalendarPlus className="size-5" />}
              title="Add Event"
              subtitle="Something happening on a day"
              onClick={() => setAddMode("event")}
            />
            <ChoiceRow
              icon={<CalendarHeart className="size-5" />}
              title="Plan a Date Night"
              subtitle="Ideas, wishlist and planned nights"
              onClick={() => setAddMode("date")}
            />
          </div>
        </Sheet>
      ) : null}

      {addMode === "event" ? (
        <Sheet title="Add an event" onClose={() => setAddMode(null)}>
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
        </Sheet>
      ) : null}

      {addMode === "date" ? (
        <Sheet title="Plan a date night" onClose={() => setAddMode(null)}>
          <DateNightPlanner defaultDate={date} />
        </Sheet>
      ) : null}
    </AppLayout>
  );
}

function ChoiceRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press card-soft flex items-center gap-3 p-4 text-left"
    >
      <span className="tile-lilac grid size-11 shrink-0 place-items-center rounded-2xl text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

/** The old Date Night Planner — now only reachable from the calendar add flow. */
export function DateNightPlanner({ defaultDate }: { defaultDate?: string }) {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [plannedFor, setPlannedFor] = useState(defaultDate ?? "");
  const [intimate, setIntimate] = useState(false);

  const { data: ideas } = useQuery({
    queryKey: ["date-ideas", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("date_ideas")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("date_ideas").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        title: title.trim(),
        notes: notes.trim() || null,
        planned_for: plannedFor || null,
        is_private_note: intimate,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setNotes("");
      void qc.invalidateQueries({ queryKey: ["date-ideas"] });
      void qc.invalidateQueries({ queryKey: ["derived-dates"] });
      toast.success("Date idea saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleDone = useMutation({
    mutationFn: async (d: { id: string; done: boolean }) => {
      const { error } = await supabase.from("date_ideas").update({ done: !d.done }).eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["date-ideas"] });
      void qc.invalidateQueries({ queryKey: ["derived-dates"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("date_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["date-ideas"] });
      void qc.invalidateQueries({ queryKey: ["derived-dates"] });
    },
  });

  const list = ideas ?? [];
  const planned = list.filter((d) => d.planned_for && !d.done && !d.is_private_note);
  const wishlist = list.filter((d) => !d.planned_for && !d.done && !d.is_private_note);
  const privateNotes = list.filter((d) => d.is_private_note);

  return (
    <div className="space-y-3 pb-4">
      <Field label="Idea">
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          placeholder="Picnic + sunset walk"
        />
      </Field>
      <Field label="Notes">
        <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
      </Field>
      <Field label="Planned for (optional)">
        <TextInput type="date" value={plannedFor} onChange={(e) => setPlannedFor(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={intimate}
          onChange={(e) => setIntimate(e.target.checked)}
          className="size-4 accent-primary"
        />
        Save under private intimacy notes
      </label>
      <PrimaryButton disabled={!title.trim() || add.isPending} onClick={() => add.mutate()}>
        Add date idea
      </PrimaryButton>

      <IdeaList
        title="Planned nights"
        items={planned}
        onToggle={toggleDone.mutate}
        onRemove={remove.mutate}
      />
      <IdeaList
        title="Idea wishlist"
        items={wishlist}
        onToggle={toggleDone.mutate}
        onRemove={remove.mutate}
      />

      <p className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold">
        <Lock className="size-4" /> Private notes
      </p>
      {privateNotes.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Just for the two of you — planning, moods, things you&apos;d like to try together.
        </p>
      ) : (
        <ul className="space-y-2">
          {privateNotes.map((d) => (
            <li key={d.id} className="card-soft p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">{d.title}</p>
                <button
                  aria-label="Delete note"
                  onClick={() => remove.mutate(d.id)}
                  className="press rounded-full p-1 text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {d.notes ? <p className="mt-1 whitespace-pre-wrap text-sm">{d.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Idea = {
  id: string;
  title: string;
  notes: string | null;
  planned_for: string | null;
  done: boolean;
};

function IdeaList({
  title,
  items,
  onToggle,
  onRemove,
}: {
  title: string;
  items: Idea[];
  onToggle: (d: { id: string; done: boolean }) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <p className="mt-4 text-sm font-extrabold">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id} className="card-soft flex items-start gap-3 p-4">
              <button
                aria-label="Mark done"
                onClick={() => onToggle({ id: d.id, done: d.done })}
                className="press mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 border-border"
              >
                <Check className="size-4 opacity-30" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{d.title}</p>
                {d.planned_for ? (
                  <p className="text-xs text-muted-foreground">{d.planned_for}</p>
                ) : null}
                {d.notes ? <p className="mt-1 whitespace-pre-wrap text-sm">{d.notes}</p> : null}
              </div>
              <button
                aria-label="Delete idea"
                onClick={() => onRemove(d.id)}
                className="press rounded-full p-1 text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
