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
        <rect x="0" y="0" width="132" height="64" fill="#cfae84" />
        <g transform="rotate(-2 42 32)">
          <rect x="14" y="14" width="56" height="36" rx="1" fill="#fbf3e3" />
          {["M14 14h9l-9 9z", "M70 14h-9l9 9z", "M14 50h9l-9-9z", "M70 50h-9l9-9z"].map((d) => (
            <path key={d} d={d} style={{ fill: P }} stroke="#3b2a1a" strokeWidth="0.6" />
          ))}
          {text("Caveat", 42, 39, "Aa", 17, "#3b2a1a")}
        </g>
        <rect x="78" y="22" width="40" height="20" rx="4" style={{ fill: P }} />
        <rect
          x="81"
          y="25"
          width="34"
          height="14"
          rx="2"
          fill="none"
          stroke="white"
          strokeDasharray="3 2"
        />
        {text("Caveat", 98, 37, "Go", 13)}
      </>
    ),
    cyberpunk: (
      <>
        <rect x="0" y="0" width="132" height="64" fill="#070b1d" />
        <rect
          x="14"
          y="14"
          width="56"
          height="36"
          rx="8"
          fill="#0d1330"
          stroke="#6ee8ff"
          strokeWidth="1.5"
          style={{ filter: "drop-shadow(0 0 3px #6ee8ff)" }}
        />
        {text("Orbitron", 42, 37, "Aa", 12, "#eaf6ff")}
        <defs>
          <linearGradient id="neon-go" x1="0" x2="1">
            <stop offset="0" stopColor="#6ee8ff" />
            <stop offset="1" stopColor="#c59cff" />
          </linearGradient>
        </defs>
        <rect
          x="78"
          y="22"
          width="40"
          height="20"
          rx="10"
          fill="url(#neon-go)"
          style={{ filter: "drop-shadow(0 0 4px #c59cff)" }}
        />
        {text("Orbitron", 98, 36, "GO", 8, "#06102a")}
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
        <path d="M0 52c30-8 60-6 90-1s32 3 42 1V64H0z" fill="#6f9a6a" opacity="0.35" />
        <path d="M104 52c1-8 1-14-1-20h6c-2 6-2 12-1 20z" fill="#7a5a3c" />
        <circle cx="106" cy="22" r="12" fill="#6f9a6a" opacity="0.8" />
        <circle cx="98" cy="28" r="8" fill="#8fb87f" opacity="0.8" />
        <path d="M104 52c-4 4-9 6-14 7M108 52c4 4 9 6 14 7" stroke="#7a5a3c" fill="none" />
        <path
          d="M30 14h36v20a10 10 0 0 1-10 10H14V24a10 10 0 0 1 10-10z"
          style={{ fill: CARD }}
          stroke="#6f9a6a"
          strokeOpacity="0.4"
        />
        <path d="M22 14q1-5 3-7M26 14q0-4-2-6M30 14q1-5 4-7" stroke="#5f8a58" fill="none" />
        <circle cx="35" cy="7" r="2.4" fill="#f4a6c1" />
        {text("Fraunces", 40, 34, "Aa")}
        <path d="M80 50c6-8 12-9 18-8" stroke="#6f9a6a" strokeOpacity="0.5" fill="none" />
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
