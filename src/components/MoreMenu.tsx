import { HelpCircle, Images, UserCog, BookHeart, Palette } from "lucide-react";
import { useSoundSetting } from "@/hooks/use-sound";

/** Everything that lives under More: shown in the side bar and on the More page. */
export const MORE_LINKS = [
  { to: "/photos", label: "Memories", icon: Images, tint: "tile-sky" },
  {
    to: "/questions",
    label: "Daily Questions",
    icon: HelpCircle,
    badge: "question",
    tint: "tile-lilac",
  },
  { to: "/memory-book", label: "Memory Book", icon: BookHeart, tint: "tile-pink" },
  { to: "/appearance", label: "Appearance", icon: Palette, tint: "tile-peach" },
  { to: "/profile", label: "Profile & Settings", icon: UserCog, tint: "tile-cream" },
] as const;

export function SoundToggle({ className = "" }: { className?: string }) {
  const { enabled, setEnabled } = useSoundSetting();
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-sm font-semibold">Sound effects</span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Sound effects"
        onClick={() => setEnabled(!enabled)}
        className={`press h-7 w-12 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`block size-6 rounded-full bg-card shadow-soft transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
