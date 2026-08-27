import { Link } from "@tanstack/react-router";
import { FEELING_BY_KEY, decodeFeeling } from "@/lib/feelings";
import { timeAgo } from "@/lib/location";

export type FeelingRow = { feeling: string | null; created_at: string } | null | undefined;

/** Transparent mood card — used on Home (partner only) and Cool-down (both). */
export function FeelingTile({
  who,
  row,
  linkTo,
  compact,
}: {
  who: string;
  row?: FeelingRow;
  linkTo?: string;
  compact?: boolean;
}) {
  const decoded = decodeFeeling(row?.feeling ?? "");
  const picks = decoded.keys.map((k) => FEELING_BY_KEY.get(k)).filter(Boolean);

  const body = (
    <>
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {who}
      </span>
      {picks.length > 0 ? (
        <span className="flex flex-wrap items-center justify-center gap-2">
          {picks.slice(0, 2).map((f) => (
            <img
              key={f!.key}
              src={f!.url}
              alt={f!.label}
              className={`${compact ? "w-[70%] min-w-24" : "w-[46%] min-w-40"} max-w-none object-contain`}
              style={{ imageRendering: "pixelated" }}
              loading="lazy"
            />
          ))}
        </span>
      ) : (
        <span className={`grid place-items-center ${compact ? "h-24 text-5xl" : "h-40 text-7xl"}`}>
          🫧
        </span>
      )}
      <span className="text-sm font-bold leading-snug">
        {picks.length > 0
          ? picks.map((f) => f!.label).join(", ")
          : row
            ? decoded.text.slice(0, 40) || "Shared a note"
            : "Nothing shared yet"}
      </span>
      {row ? (
        <span className="text-[11px] text-muted-foreground">{timeAgo(row.created_at)}</span>
      ) : null}
    </>
  );

  const cls = "flex flex-col items-center gap-2 bg-transparent p-2 text-center";
  return linkTo ? (
    <Link to={linkTo} className={`press ${cls}`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
