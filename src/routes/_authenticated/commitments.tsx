import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  Field,
  PrimaryButton,
  ProgressBar,
  SectionTitle,
  SelectInput,
  StreakChip,
  TextInput,
} from "@/components/ui-kit";
import { askNotificationPermission, canNotify } from "@/lib/reminders";
import { useAuthUser, useCoupleId, usePartner } from "@/lib/session";
import { todayISO } from "@/lib/badges";
import {
  WEEKDAYS,
  doneDates,
  isDueOn,
  prettyTime,
  scheduleLabel,
  streakFor,
  useCommitmentLogs,
  useCommitments,
  weekCount,
  weekTarget,
  type Commitment,
} from "@/lib/commitments";

export const Route = createFileRoute("/_authenticated/commitments")({
  head: () => ({
    meta: [
      { title: "Commitments — BLUBLUB" },
      {
        name: "description",
        content: "Keep the promises you make to yourself, with gentle partner encouragement.",
      },
      { property: "og:title", content: "Commitments — BLUBLUB" },
      {
        property: "og:description",
        content: "Keep the promises you make to yourself, with gentle partner encouragement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CommitmentsPage,
});

function CommitmentsPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const partner = usePartner();
  const qc = useQueryClient();
  const { data: commitments } = useCommitments();
  const { data: logs } = useCommitmentLogs();

  const [title, setTitle] = useState("");
  const [scheduleType, setScheduleType] = useState("daily");
  const [weekday, setWeekday] = useState("0");
  const [target, setTarget] = useState(3);
  const [reminder, setReminder] = useState("19:00");
  const [shared, setShared] = useState(false);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["commitments"] });
    void qc.invalidateQueries({ queryKey: ["commitment-logs"] });
  };

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("commitments").insert({
        couple_id: coupleId!,
        user_id: user!.id,
        title: title.trim(),
        schedule_type: scheduleType,
        weekday: scheduleType === "weekday" ? Number(weekday) : null,
        weekly_target: scheduleType === "weekly_count" ? Math.max(1, target) : null,
        reminder_time: reminder,
        shared,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setShared(false);
      invalidate();
      toast.success("Commitment added 🩷");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleToday = useMutation({
    mutationFn: async (c: Commitment) => {
      const today = todayISO();
      const existing = (logs ?? []).find(
        (l) => l.commitment_id === c.id && l.log_date === today && l.user_id === user?.id,
      );
      if (existing) {
        const { error } = await supabase.from("commitment_logs").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("commitment_logs").insert({
          commitment_id: c.id,
          couple_id: coupleId!,
          user_id: user!.id,
          log_date: today,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const setShare = useMutation({
    mutationFn: async (v: { id: string; shared: boolean }) => {
      const { error } = await supabase
        .from("commitments")
        .update({ shared: v.shared })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("commitments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const all = commitments ?? [];
  const mine = all.filter((c) => c.user_id === user?.id);
  const theirs = all.filter((c) => c.user_id !== user?.id && c.shared);
  const today = todayISO();

  return (
    <AppLayout title="Commitments" subtitle="Promises you keep, together" critter="penguin">
      <Card>
        <div className="space-y-3">
          <Field label="What are you committing to?">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="Go to the gym"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="How often">
              <SelectInput value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
                <option value="daily">Every day</option>
                <option value="weekday">A weekday</option>
                <option value="weekly_count">Times a week</option>
              </SelectInput>
            </Field>
            {scheduleType === "weekday" ? (
              <Field label="Which day">
                <SelectInput value={weekday} onChange={(e) => setWeekday(e.target.value)}>
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={String(i)}>
                      {d}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : scheduleType === "weekly_count" ? (
              <Field label="Times a week">
                <TextInput
                  type="number"
                  min={1}
                  max={7}
                  value={target}
                  onChange={(e) => setTarget(Number(e.target.value))}
                />
              </Field>
            ) : (
              <Field label="Reminder time">
                <TextInput
                  type="time"
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                />
              </Field>
            )}
          </div>
          {scheduleType !== "daily" ? (
            <Field label="Reminder time">
              <TextInput
                type="time"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
              />
            </Field>
          ) : null}
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
              className="size-4 accent-primary"
            />
            <span>
              Share with {partner?.display_name ?? "partner"}
              <span className="block text-xs text-muted-foreground">
                They&apos;ll only see today&apos;s status — never a history.
              </span>
            </span>
          </label>
          <PrimaryButton
            disabled={!title.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Add commitment
          </PrimaryButton>
        </div>
      </Card>

      {canNotify() && typeof Notification !== "undefined" && Notification.permission !== "granted" ? (
        <Card className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Turn on notifications to get your reminder times.
          </p>
          <button
            className="press shrink-0 text-xs font-bold text-primary"
            onClick={() =>
              void askNotificationPermission().then((r) =>
                toast(r === "granted" ? "Reminders on 🩷" : "Notifications are blocked"),
              )
            }
          >
            Enable
          </button>
        </Card>
      ) : null}

      <SectionTitle>Yours</SectionTitle>
      {mine.length === 0 ? (
        <Card className="text-sm text-muted-foreground">
          Nothing yet — add something you&apos;d love to keep up.
        </Card>
      ) : (
        <ul className="space-y-3">
          {mine.map((c) => {
            const done = doneDates(logs ?? [], c.id).has(today);
            const count = weekCount(logs ?? [], c);
            const goal = weekTarget(c);
            const due = isDueOn(c, today);
            return (
              <li key={c.id} className="card-soft p-4">
                <div className="flex items-start gap-3">
                  <button
                    aria-label={done ? "Undo today" : "Mark done today"}
                    onClick={() => toggleToday.mutate(c)}
                    className={`press mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border-2 ${
                      done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    }`}
                  >
                    {done ? <Check className="size-4" /> : null}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {scheduleLabel(c)} · reminder {prettyTime(c.reminder_time)}
                      {due ? "" : " · resting today"}
                    </p>
                    <div className="mt-2">
                      <ProgressBar value={Math.min(100, (count / goal) * 100)} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {count}/{goal} this week — every one counts 🩷
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <StreakChip days={streakFor(logs ?? [], c)} />
                      <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={c.shared}
                          onChange={(e) => setShare.mutate({ id: c.id, shared: e.target.checked })}
                          className="size-3.5 accent-primary"
                        />
                        Shared
                      </label>
                      <button
                        aria-label="Delete commitment"
                        onClick={() => remove.mutate(c.id)}
                        className="press rounded-full p-1.5 text-muted-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SectionTitle>{partner?.display_name ?? "Partner"}&apos;s shared</SectionTitle>
      {theirs.length === 0 ? (
        <Card className="text-sm text-muted-foreground">
          Nothing shared with you — that&apos;s okay, commitments are private by default.
        </Card>
      ) : (
        <ul className="space-y-3">
          {theirs.map((c) => {
            const done = doneDates(logs ?? [], c.id).has(today);
            return (
              <li key={c.id} className="card-soft flex items-center gap-3 p-4">
                <span
                  className={`grid size-9 shrink-0 place-items-center rounded-full ${
                    done ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {done ? <Check className="size-4" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{c.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {done
                      ? "Done today — cheer them on! 🎉"
                      : isDueOn(c, today)
                        ? "Not yet today — a little encouragement helps 💛"
                        : "Resting today"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </AppLayout>
  );
}
