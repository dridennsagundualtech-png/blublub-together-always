import type { ReactNode } from "react";
import { Check, Lock } from "lucide-react";
import { SKINS, type SkinId } from "@/lib/theme";
import { cn } from "@/lib/utils";

const P = "var(--color-primary)";
const CARD = "var(--color-card)";
const FG = "var(--color-foreground)";

/**
 * A small picture of each style: a card with "Aa" and a button. Drawn as SVG so it shows that
 * style correctly whichever style the app is in right now (the style CSS reshapes HTML, not SVG).
 */
function Sample({ id }: { id: SkinId }) {
  const text = (font: string, x: number, y: number, label: string, size = 13, fill = FG) => (
    <text
      x={x}
      y={y}
      fontFamily={font}
      fontSize={size}
      fontWeight={700}
      fill={fill}
      textAnchor="middle"
    >
      {label}
    </text>
  );
  const art: Record<SkinId, ReactNode> = {
    classic: (
      <>
        <rect x="14" y="14" width="56" height="36" rx="10" style={{ fill: CARD }} />
        {text("Baloo 2", 42, 37, "Aa")}
        <rect x="78" y="22" width="40" height="20" rx="10" style={{ fill: P }} />
        {text("Nunito", 98, 36, "Go", 10)}
      </>
    ),
    pixel: (
      <g shapeRendering="crispEdges">
        <rect x="17" y="14" width="50" height="36" style={{ fill: FG }} />
        <rect x="14" y="17" width="56" height="30" style={{ fill: FG }} />
        <rect x="17" y="17" width="50" height="30" style={{ fill: CARD }} />
        {text("Pixelify Sans", 42, 37, "Aa")}
        <rect x="80" y="22" width="36" height="20" style={{ fill: FG }} />
        <rect x="78" y="24" width="40" height="16" style={{ fill: FG }} />
        <rect x="80" y="24" width="36" height="16" style={{ fill: P }} />
        {text("Pixelify Sans", 98, 36, "Go", 10)}
      </g>
    ),
    jelly: (
      <>
        <rect x="14" y="14" width="56" height="36" rx="18" style={{ fill: P, opacity: 0.55 }} />
        <ellipse cx="34" cy="21" rx="14" ry="4" fill="white" opacity="0.7" />
        {text("Fredoka", 42, 38, "Aa")}
        <rect x="78" y="21" width="40" height="22" rx="11" style={{ fill: P }} />
        <ellipse cx="92" cy="26" rx="9" ry="2.5" fill="white" opacity="0.75" />
        {text("Fredoka", 98, 37, "Go", 10)}
      </>
    ),
    glass: (
      <>
        <circle cx="30" cy="22" r="16" style={{ fill: P, opacity: 0.7 }} />
        <circle cx="104" cy="44" r="18" style={{ fill: "var(--color-sky)", opacity: 0.7 }} />
        <rect
          x="14"
          y="14"
          width="56"
          height="36"
          rx="10"
          fill="white"
          opacity="0.5"
          stroke="white"
        />
        {text("Nunito", 42, 37, "Aa")}
        <rect
          x="78"
          y="22"
          width="40"
          height="20"
          rx="10"
          stroke="white"
          style={{ fill: P, opacity: 0.8 }}
        />
        {text("Nunito", 98, 36, "Go", 10)}
      </>
    ),
    scrapbook: (
      <>
        <g transform="rotate(-3 42 32)">
          <rect x="14" y="14" width="56" height="36" rx="2" style={{ fill: CARD }} />
          <rect x="32" y="9" width="22" height="8" style={{ fill: P, opacity: 0.6 }} />
          {text("Caveat", 42, 39, "Aa", 17)}
        </g>
        <rect x="78" y="22" width="40" height="20" rx="5" style={{ fill: P }} />
        <rect
          x="81"
          y="25"
          width="34"
          height="14"
          rx="3"
          fill="none"
          stroke="white"
          strokeDasharray="3 2"
        />
        {text("Caveat", 98, 37, "Go", 13)}
      </>
    ),
    cyberpunk: (
      <>
        <rect x="0" y="0" width="132" height="64" fill="#0b0912" />
        <path d="M22 14h48v28l-8 8H14V22z" fill="#15111e" style={{ stroke: P }} />
        {text("Orbitron", 42, 37, "Aa", 12, "#f3ecff")}
        <path d="M84 22h34v14l-6 6H78V28z" style={{ fill: P }} />
        {text("Orbitron", 98, 36, "GO", 8, "#2a1a24")}
      </>
    ),
    steampunk: (
      <>
        <rect
          x="14"
          y="14"
          width="56"
          height="36"
          rx="3"
          style={{ fill: CARD }}
          stroke="#b08d57"
          strokeWidth="2.5"
        />
        {[18, 66].map((x) =>
          [18, 46].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill="#7a5a2b" />),
        )}
        {text("Cinzel", 42, 37, "Aa", 12)}
        <rect
          x="78"
          y="22"
          width="40"
          height="20"
          rx="3"
          style={{ fill: P }}
          stroke="#7a5a2b"
          strokeWidth="2"
        />
        {text("Cinzel", 98, 36, "Go", 9)}
      </>
    ),
    nature: (
      <>
        <path
          d="M30 14h40v24a12 12 0 0 1-12 12H14V26a12 12 0 0 1 12-12z"
          style={{ fill: CARD }}
          stroke="#6f9a6a"
          strokeOpacity="0.4"
        />
        <path d="M58 20c5-6 12-6 15-5-2 6-9 10-15 5z" fill="#6f9a6a" opacity="0.6" />
        {text("Fraunces", 42, 37, "Aa")}
        <path d="M86 22h32v12a8 8 0 0 1-8 8H78V30a8 8 0 0 1 8-8z" style={{ fill: P }} />
        {text("Fraunces", 98, 36, "Go", 10)}
      </>
    ),
  };
  return (
    <svg viewBox="0 0 132 64" className="block h-16 w-full bg-muted/60" aria-hidden="true">
      {art[id]}
    </svg>
  );
}

export function StylePicker({
  value,
  premium,
  previewing,
  onPick,
}: {
  value: SkinId;
  premium: boolean;
  /** Style being previewed right now (non-premium), with seconds left. */
  previewing: { skin: SkinId; left: number } | null;
  onPick: (id: SkinId) => void;
}) {
  return (
    <section className="card-soft mb-4 p-4" aria-labelledby="style-heading">
      <div className="mb-3 flex items-center justify-between">
        <p id="style-heading" className="text-sm font-bold">
          App style
        </p>
        <span className="text-[11px] text-muted-foreground">Shared with both of you</span>
      </div>

      <div role="radiogroup" aria-labelledby="style-heading" className="grid grid-cols-2 gap-3">
        {SKINS.map((k) => {
          const on = value === k.id;
          const locked = k.premium && !premium;
          const isPreview = previewing?.skin === k.id;
          return (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(k.id)}
              className={cn(
                "press relative overflow-hidden rounded-2xl border-2 bg-card text-left",
                on ? "border-primary" : "border-transparent shadow-soft",
              )}
            >
              <Sample id={k.id} />
              <span className="block px-3 py-2">
                <span className="flex items-center justify-between gap-2 text-sm font-bold">
                  {k.name}
                  {on ? (
                    <Check className="size-4 text-primary" aria-hidden />
                  ) : locked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                      <Lock className="size-3" aria-hidden /> Premium
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {isPreview ? `Previewing… ${previewing!.left}s` : k.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
