import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarHeart,
  CalendarPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  Plus,
  Trash2,
} from "lucide-react";
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
import { useAuthUser, useCoupleId, useProfile } from "@/lib/session";
import { DERIVED_META, useDerivedDates } from "@/lib/calendar-sources";

const WEEKDAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function isoOf(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

/** Build a 7-day strip centered around selected date (selected near middle). */
function weekStrip(selectedIso: string) {
  const selected = parseISODate(selectedIso);
  const day = selected.getDay(); // 0 Sun
  const start = new Date(selected);
  start.setDate(selected.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = isoOf(d.getFullYear(), d.getMonth(), d.getDate());
    return {
      iso,
      dateNum: d.getDate(),
      weekday: WEEKDAYS_SHORT[d.getDay()]!,
    };
  });
}

const EVENT_COLORS = [
  "bg-[#F86B8F] text-white",
  "bg-[#8E97FD] text-white",
  "bg-[#FFC97E] text-[#3F414E]",
  "bg-[#AFDBC5] text-[#3F414E]",
  "bg-[#E0D7FF] text-[#3F414E]",
];

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
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [addMode, setAddMode] = useState<AddMode>(null);
  const now = new Date();
  const [view, setView] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [showMonth, setShowMonth] = useState(false);

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
      time: null as string | null,
      kind: d.kind,
      removable: false,
    }));
    return [...fromEvents, ...fromDerived].sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      if (c !== 0) return c;
      return (a.time ?? "").localeCompare(b.time ?? "");
    });
  }, [events, derived]);

  const upcoming = allItems.filter((e) => e.date >= today);
  const selectedEvents = allItems.filter((e) => e.date === date);
  const reminders = upcoming.filter((e) => e.date !== date).slice(0, 4);

  const byDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of allItems) map.set(e.date, (map.get(e.date) ?? 0) + 1);
    return map;
  }, [allItems]);

  const week = weekStrip(date);

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

  const selectDay = (iso: string) => {
    setDate(iso);
    const d = parseISODate(iso);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const name = profile?.display_name ?? "there";
  const h = new Date().getHours();
  const greet = h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";

  // Timeline hours for selected day (only show if timed events exist)
  const timed = selectedEvents.filter((e) => e.time);
  const untimed = selectedEvents.filter((e) => !e.time);

  return (
    <AppLayout title="Calendar" subtitle="Dates & plans" critter="penguin">
      {/* Greeting row */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[1.5rem] font-bold leading-tight text-[#3F414E]">
            {greet},
            <br />
            {name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMonth((v) => !v)}
          className="press rounded-full bg-[#F2F2F2] px-3 py-1.5 text-xs font-bold text-[#3F414E]"
        >
          {showMonth ? "Week" : "Month"}
        </button>
      </div>

      {/* Week strip — like the schedule mockup */}
      {!showMonth ? (
        <div className="mb-5 flex items-end justify-between gap-1">
          {week.map((d) => {
            const selected = d.iso === date;
            const has = (byDate.get(d.iso) ?? 0) > 0;
            const isToday = d.iso === today;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => selectDay(d.iso)}
                className="press flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-[10px] font-semibold text-[#A1A4B2]">{d.weekday}</span>
                <span
                  className={
                    selected
                      ? "grid size-10 place-items-center rounded-2xl bg-[#F86B8F] text-sm font-bold text-white"
                      : isToday
                        ? "grid size-10 place-items-center rounded-2xl bg-[#F6F1FB] text-sm font-bold text-[#8E97FD]"
                        : "grid size-10 place-items-center rounded-2xl text-sm font-bold text-[#3F414E]"
                  }
                >
                  {d.dateNum}
                </span>
                <span
                  className={`size-1 rounded-full ${has ? (selected ? "bg-white" : "bg-[#F86B8F]") : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grad-box mb-5 rounded-[1.5rem] bg-[#F8F8FA] p-3">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className="press rounded-full p-2">
              <ChevronLeft className="size-4 text-[#A1A4B2]" />
            </button>
            <p className="font-display text-sm font-bold text-[#3F414E]">
              {MONTH_NAMES[view.month]} {view.year}
            </p>
            <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className="press rounded-full p-2">
              <ChevronRight className="size-4 text-[#A1A4B2]" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS_SHORT.map((w) => (
              <span key={w} className="text-[10px] font-bold text-[#A1A4B2]">
                {w}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`e${i}`} />;
              const iso = isoOf(view.year, view.month, day);
              const selected = iso === date;
              const isToday = iso === today;
              const has = (byDate.get(iso) ?? 0) > 0;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => selectDay(iso)}
                  className={`press relative flex aspect-square items-center justify-center rounded-xl text-sm font-semibold ${
                    selected
                      ? "bg-[#F86B8F] text-white"
                      : isToday
                        ? "bg-[#F6F1FB] text-[#8E97FD]"
                        : "text-[#3F414E]"
                  }`}
                >
                  {day}
                  {has && !selected ? (
                    <span className="absolute bottom-1 size-1 rounded-full bg-[#F86B8F]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule for selected day */}
      <p className="mb-3 font-display text-lg font-bold text-[#3F414E]">
        {date === today ? "Schedule Today" : `Schedule · ${date.slice(5)}`}
      </p>

      {selectedEvents.length === 0 ? (
        <div className="grad-box mb-4 rounded-[1.25rem] bg-[#F2F2F2] px-4 py-6 text-center text-sm text-[#A1A4B2]">
          Nothing planned on this day yet.
        </div>
      ) : (
        <div className="relative mb-4 space-y-3">
          {/* Timed events as colorful cards */}
          {timed.map((e, i) => (
            <div key={e.id} className="flex gap-3">
              <div className="w-12 shrink-0 pt-3 text-right text-xs font-bold text-[#A1A4B2]">
                {e.time!.slice(0, 5)}
              </div>
              <div
                className={`grad-box min-w-0 flex-1 rounded-[1.15rem] px-4 py-3 ${EVENT_COLORS[i % EVENT_COLORS.length]}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-snug">{e.title}</p>
                  {e.removable ? (
                    <button
                      type="button"
                      aria-label="Delete"
                      onClick={() => remove.mutate(e.id)}
                      className="press shrink-0 rounded-full p-1 opacity-80"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {/* Untimed */}
          {untimed.map((e, i) => (
            <div
              key={e.id}
              className={`grad-box flex items-center justify-between gap-3 rounded-[1.15rem] px-4 py-3 ${EVENT_COLORS[(i + timed.length) % EVENT_COLORS.length]}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold">{e.title}</p>
                {e.kind !== "event" ? (
                  <p className="text-[11px] opacity-80">{DERIVED_META[e.kind].label}</p>
                ) : null}
              </div>
              {e.removable ? (
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => remove.mutate(e.id)}
                  className="press rounded-full p-1 opacity-80"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {/* Reminders — upcoming other days */}
      {reminders.length > 0 ? (
        <>
          <p className="mb-1 font-display text-lg font-bold text-[#3F414E]">Reminder</p>
          <p className="mb-3 text-xs text-[#A1A4B2]">Coming up next</p>
          <ul className="space-y-2">
            {reminders.map((e, i) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => selectDay(e.date)}
                  className={`grad-box press flex w-full items-center gap-3 rounded-[1.15rem] px-4 py-3 text-left ${
                    i % 2 === 0 ? "bg-[#8E97FD] text-white" : "bg-[#B8A9F5] text-white"
                  }`}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/20">
                    <CalendarPlus className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{e.title}</span>
                    <span className="block text-[11px] opacity-90">
                      {e.date}
                      {e.time ? ` · ${e.time.slice(0, 5)}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* Primary CTA */}
      <button
        type="button"
        onClick={() => setAddMode("choose")}
        className="press mt-6 w-full rounded-full bg-gradient-to-r from-[#F86B8F] to-[#FF8FAB] py-3.5 text-sm font-bold text-white shadow-none"
      >
        Set schedule
      </button>

      {addMode === "choose" ? (
        <Sheet title="Add to calendar" onClose={() => setAddMode(null)}>
          <div className="space-y-2">
            <ChoiceRow
              icon={<CalendarPlus className="size-5" />}
              title="Event"
              subtitle="Dinner, trip, anything shared"
              onClick={() => setAddMode("event")}
            />
            <ChoiceRow
              icon={<CalendarHeart className="size-5" />}
              title="Date night"
              subtitle="Plan something just for two"
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
      className="grad-box press flex w-full items-center gap-3 rounded-[1.15rem] bg-[#F2F2F2] p-4 text-left"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#E0D7FF] text-[#8E97FD]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#3F414E]">{title}</span>
        <span className="block text-xs text-[#A1A4B2]">{subtitle}</span>
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
