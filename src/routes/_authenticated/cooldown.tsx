import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, HeartHandshake, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, EmptyState, Field, PrimaryButton, SectionTitle, TextArea } from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { useAuthUser, useCoupleId, useMembers } from "@/lib/session";
import { FEELINGS, FEELING_BY_KEY, decodeFeeling, encodeFeeling } from "@/lib/feelings";


export const Route = createFileRoute("/_authenticated/cooldown")({
  head: () => ({
    meta: [
      { title: "Cool-Down — BLUBLUB" },
      {
        name: "description",
        content: "A gentle guided template to fill in separately after a disagreement, then share.",
      },
      { property: "og:title", content: "Cool-Down — BLUBLUB" },
      {
        property: "og:description",
        content: "A gentle guided template to fill in separately after a disagreement, then share.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CooldownPage,
});

function CooldownPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const { data: members } = useMembers();
  const qc = useQueryClient();

  const [feeling, setFeeling] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [need, setNeed] = useState("");
  const [responsibility, setResponsibility] = useState("");

  const { data: entries } = useQuery({
    queryKey: ["cooldowns", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cooldowns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (share: boolean) => {
      const { error } = await supabase.from("cooldowns").insert({
        couple_id: coupleId!,
        created_by: user!.id,
        feeling: encodeFeeling(moods, feeling.trim()),
        need: need.trim(),
        responsibility: responsibility.trim(),
        shared: share,
      });
      if (error) throw error;
    },
    onSuccess: (_d, share) => {
      setFeeling("");
      setMoods([]);
      setNeed("");
      setResponsibility("");
      void qc.invalidateQueries({ queryKey: ["cooldowns"] });
      toast.success(share ? "Shared with your partner 🩷" : "Saved just for you");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shareOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cooldowns").update({ shared: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["cooldowns"] }),
  });

  const nameOf = (id: string) =>
    id === user?.id ? "You" : (members?.find((m) => m.id === id)?.display_name ?? "Partner");

  const filled = moods.length > 0 || feeling.trim() || need.trim() || responsibility.trim();

  return (
    <AppLayout title="Cool-down" subtitle="Fill it in alone, then share" critter="cat" critterPose="curious">
      <Card>
        <div className="flex items-start gap-3">
          <HeartHandshake className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Take a breath first. Answer honestly and gently — you choose whether to keep it private
            or share it when you&apos;re ready.
          </p>
        </div>
      </Card>

      <Card className="mt-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
          My feelings
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tap whatever fits right now — pick as many as you like.
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {FEELINGS.map((f) => {
            const on = moods.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  playChirp("tap");
                  setMoods((m) => (on ? m.filter((k) => k !== f.key) : [...m, f.key]));
                }}
                className={`press flex flex-col items-center gap-1 rounded-2xl p-2 ${
                  on ? "bg-accent ring-2 ring-primary" : "bg-secondary/60"
                }`}
                aria-pressed={on}
              >
                <img
                  src={f.url}
                  alt=""
                  loading="lazy"
                  className="size-12 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="text-[10px] font-bold leading-tight">{f.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            playChirp("tap");
            setDetailOpen((v) => !v);
          }}
          className="press mt-4 flex w-full items-center justify-between rounded-2xl bg-secondary px-4 py-2.5 text-xs font-extrabold text-secondary-foreground"
        >
          {detailOpen ? "Hide the guided questions" : "Want to say more? Open the guided questions"}
          <ChevronDown className={`size-4 transition-transform ${detailOpen ? "rotate-180" : ""}`} />
        </button>

        {detailOpen ? (
          <div className="mt-3 space-y-3">
            <Field label="What I'm feeling">
              <TextArea
                rows={3}
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                maxLength={1000}
                placeholder="I felt hurt when…"
              />
            </Field>
            <Field label="What I need right now">
              <TextArea
                rows={3}
                value={need}
                onChange={(e) => setNeed(e.target.value)}
                maxLength={1000}
                placeholder="A hug, some quiet time, to be heard…"
              />
            </Field>
            <Field label="My part in it">
              <TextArea
                rows={3}
                value={responsibility}
                onChange={(e) => setResponsibility(e.target.value)}
                maxLength={1000}
                placeholder="Something I could have done differently…"
              />
            </Field>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <PrimaryButton
            disabled={!filled || save.isPending}
            onClick={() => {
              playChirp("success");
              save.mutate(true);
            }}
          >
            Save &amp; share
          </PrimaryButton>
          <PrimaryButton
            className="w-auto whitespace-nowrap bg-secondary px-4 text-secondary-foreground"
            disabled={!filled || save.isPending}
            onClick={() => save.mutate(false)}
          >
            Keep private
          </PrimaryButton>
        </div>
      </Card>


      <SectionTitle>Past reflections</SectionTitle>
      {(entries ?? []).length === 0 ? (
        <EmptyState text="Nothing here — hopefully it stays that way 🩷" />
      ) : (
        <ul className="space-y-2 pb-4">
          {(entries ?? []).map((c) => {
            const decoded = decodeFeeling(c.feeling ?? "");
            return (
            <li key={c.id}>
              <Card>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{nameOf(c.created_by)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                    {c.shared ? "" : " · private"}
                  </p>
                </div>
                {decoded.keys.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {decoded.keys.map((k) => {
                      const f = FEELING_BY_KEY.get(k);
                      if (!f) return null;
                      return (
                        <span
                          key={k}
                          className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-bold"
                        >
                          <img
                            src={f.url}
                            alt=""
                            className="size-6 object-contain"
                            style={{ imageRendering: "pixelated" }}
                          />
                          {f.label}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                {decoded.text ? (
                  <p className="mt-2 text-xs">
                    <span className="font-bold">Feeling: </span>
                    {decoded.text}
                  </p>
                ) : null}
                {c.need ? (
                  <p className="mt-1 text-xs">
                    <span className="font-bold">Needs: </span>
                    {c.need}
                  </p>
                ) : null}
                {c.responsibility ? (
                  <p className="mt-1 text-xs">
                    <span className="font-bold">My part: </span>
                    {c.responsibility}
                  </p>
                ) : null}
                {!c.shared && c.created_by === user?.id ? (
                  <button
                    type="button"
                    onClick={() => shareOne.mutate(c.id)}
                    className="press mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"
                  >
                    <Share2 className="size-3.5" />
                    Share with partner
                  </button>
                ) : null}
              </Card>
            </li>
            );
          })}
        </ul>
      )}
    </AppLayout>
  );
}
