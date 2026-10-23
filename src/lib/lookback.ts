/** Look Back: fetches your memories for a date range and builds the story (lookback-story.ts). */
import { supabase } from "@/integrations/supabase/client";
import { buildLookBack, type LookPhoto, type LookQuestion, type Slide } from "@/lib/lookback-story";
import { signedUrls } from "@/lib/signed-urls";

export type { Slide } from "@/lib/lookback-story";
export { SLIDE_MS } from "@/lib/lookback-story";

/** Fetches everything the story needs for a date range. */
export async function loadLookBack(opts: {
  coupleId: string;
  from: string;
  to: string;
  today: string;
  names: string[];
  anniversary: string | null;
  nameOf: (id: string) => string;
}): Promise<Slide[]> {
  const { coupleId, from, to } = opts;
  const [photos, reactions, comments, diary, answers, dreams] = await Promise.all([
    supabase
      .from("photos")
      .select("id,storage_path,caption,taken_on")
      .eq("couple_id", coupleId)
      .gte("taken_on", from)
      .lte("taken_on", to)
      .not("storage_path", "is", null),
    supabase.from("photo_reactions").select("photo_id").eq("couple_id", coupleId),
    supabase.from("photo_comments").select("photo_id").eq("couple_id", coupleId),
    supabase
      .from("diary_entries")
      .select("created_by,mood,title,body,entry_date")
      .eq("couple_id", coupleId)
      .gte("entry_date", from)
      .lte("entry_date", to),
    supabase
      .from("question_answers")
      .select("question_id,answer_date,created_by,body")
      .eq("couple_id", coupleId)
      .gte("answer_date", from)
      .lte("answer_date", to),
    supabase
      .from("bucket_list")
      .select("id")
      .eq("couple_id", coupleId)
      .eq("done", true)
      .gte("done_on", from)
      .lte("done_on", to),
  ]);
  for (const r of [photos, reactions, comments, diary, answers, dreams]) if (r.error) throw r.error;

  const count = (rows: { photo_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.photo_id, (m.get(r.photo_id) ?? 0) + 1);
    return m;
  };
  const reactionCount = count(reactions.data);
  const commentCount = count(comments.data);

  const rows = photos.data ?? [];
  const paths = rows.map((p) => p.storage_path!).filter(Boolean);
  const urlByPath = await signedUrls("photos", paths);
  const lookPhotos: LookPhoto[] = rows
    .map((p) => ({
      id: p.id,
      url: urlByPath.get(p.storage_path!) ?? "",
      caption: p.caption,
      date: p.taken_on,
      reactions: reactionCount.get(p.id) ?? 0,
      comments: commentCount.get(p.id) ?? 0,
    }))
    .filter((p) => p.url);

  // Questions you both answered on the same day.
  const byDay = new Map<
    string,
    { question_id: string; answer_date: string; created_by: string; body: string }[]
  >();
  for (const a of answers.data ?? []) {
    const k = `${a.question_id}|${a.answer_date}`;
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  const both = [...byDay.values()].filter(
    (list) => new Set(list.map((a) => a.created_by)).size >= 2,
  );
  const ids = [...new Set(both.map((list) => list[0]!.question_id))];
  const { data: prompts } = ids.length
    ? await supabase.from("questions").select("id,prompt").in("id", ids)
    : { data: [] };
  const promptOf = new Map((prompts ?? []).map((q) => [q.id, q.prompt] as const));
  const questions: LookQuestion[] = both
    .map((list) => ({
      prompt: promptOf.get(list[0]!.question_id) ?? "",
      date: list[0]!.answer_date,
      answers: list.slice(0, 2).map((a) => ({ who: opts.nameOf(a.created_by), body: a.body })),
    }))
    .filter((q) => q.prompt);

  return buildLookBack({
    names: opts.names,
    anniversary: opts.anniversary,
    from,
    to,
    today: opts.today,
    photos: lookPhotos,
    diary: (diary.data ?? []).map((e) => ({
      who: opts.nameOf(e.created_by),
      mood: e.mood,
      title: e.title,
      body: e.body ?? "",
      date: e.entry_date,
    })),
    questions,
    dreamsDone: dreams.data?.length ?? 0,
  });
}
