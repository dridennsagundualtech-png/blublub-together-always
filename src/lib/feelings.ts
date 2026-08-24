// AUTO-GENERATED from the uploaded pixel cat reaction pack.
export type FeelingOption = { key: string; label: string; url: string };

export const FEELINGS: FeelingOption[] = [
  { key: "bad", label: "Not okay", url: "/__l5e/assets-v1/113e573b-e639-4725-9919-dd43e491a277/feel-assets_playground_todayeat_bad.png" },
  { key: "balanced-diet", label: "Balanced", url: "/__l5e/assets-v1/57ea2c81-3982-4bf7-82f3-cd09cd1850dc/feel-assets_playground_todayeat_balanced_diet.png" },
  { key: "bit-tired", label: "A bit tired", url: "/__l5e/assets-v1/08a1160b-0f2d-4968-b696-8e4d654a28a9/feel-assets_playground_todayeat_bit_tired.png" },
  { key: "busy", label: "Busy", url: "/__l5e/assets-v1/d3a2f5e8-426f-44eb-984b-f0bf2b575cce/feel-assets_playground_todayeat_busy.png" },
  { key: "eat-and-relax", label: "Relaxed", url: "/__l5e/assets-v1/6bd0a804-6757-46b0-83cc-37d932ac9649/feel-assets_playground_todayeat_eat_and_relax.png" },
  { key: "fairly-free", label: "Fairly free", url: "/__l5e/assets-v1/9e31d422-9957-45cf-a479-c5464b39f916/feel-assets_playground_todayeat_fairly_free.png" },
  { key: "fine", label: "Fine", url: "/__l5e/assets-v1/a5759109-4a72-4473-a99d-2597d491c9ae/feel-assets_playground_todayeat_fine.png" },
  { key: "happy", label: "Happy", url: "/__l5e/assets-v1/b74fc56d-5c25-470c-b735-1e162e1adde2/feel-assets_playground_todayeat_happy.png" },
  { key: "hungry", label: "Craving comfort", url: "/__l5e/assets-v1/d8f986cd-f0bc-4338-88f4-dc8e49f6cb62/feel-assets_playground_todayeat_hungry.png" },
  { key: "moderate-meal", label: "Steady", url: "/__l5e/assets-v1/a5d31b9d-fff5-4e86-97f2-fc25db0484b0/feel-assets_playground_todayeat_moderate_meal.png" },
  { key: "not-tired", label: "Rested", url: "/__l5e/assets-v1/55a9c070-2165-44ca-9890-ed8796b45172/feel-assets_playground_todayeat_not_tired.png" },
  { key: "proper-meal", label: "Cared for", url: "/__l5e/assets-v1/5961cb16-6a39-4916-8535-d32cc0eb867e/feel-assets_playground_todayeat_proper_meal.png" },
  { key: "sad", label: "Sad", url: "/__l5e/assets-v1/9d44e4d0-3579-4a8e-8252-e07680238b93/feel-assets_playground_todayeat_sad.png" },
  { key: "tired", label: "Tired", url: "/__l5e/assets-v1/9419502e-f83e-4128-b049-e3242616e664/feel-assets_playground_todayeat_tired.png" },
  { key: "very-busy", label: "Overwhelmed", url: "/__l5e/assets-v1/eab23c55-3cf8-423a-8703-4dc2102deba7/feel-assets_playground_todayeat_very_busy.png" },
  { key: "very-free", label: "Free", url: "/__l5e/assets-v1/fa2c0934-13d0-4f7b-ac45-60781f169315/feel-assets_playground_todayeat_very_free.png" },
  { key: "very-happy", label: "Very happy", url: "/__l5e/assets-v1/8e998019-1942-4fe3-96e2-ecbe8a8b61cf/feel-assets_playground_todayeat_very_happy.png" },
  { key: "very-tired", label: "Drained", url: "/__l5e/assets-v1/6824f856-e6c0-46c1-8e07-aa0c91104012/feel-assets_playground_todayeat_very_tired.png" },
  { key: "vivid", label: "Full of energy", url: "/__l5e/assets-v1/7413a081-3c01-443f-a923-cf77d1dec782/feel-assets_playground_todayeat_vivid.png" },
];

export const FEELING_BY_KEY = new Map(FEELINGS.map((f) => [f.key, f]));

/** Feelings are stored inline in a cool-down note so a picked mood survives a round trip. */
const FEEL_RE = /^\[feel:([a-z0-9,-]+)\]\s*/i;

export function encodeFeeling(keys: string[], text: string) {
  return keys.length ? `[feel:${keys.join(",")}] ${text}`.trim() : text;
}

export function decodeFeeling(raw: string) {
  const m = FEEL_RE.exec(raw ?? "");
  if (!m) return { keys: [] as string[], text: raw ?? "" };
  return { keys: m[1]!.split(",").filter(Boolean), text: (raw ?? "").replace(FEEL_RE, "") };
}
