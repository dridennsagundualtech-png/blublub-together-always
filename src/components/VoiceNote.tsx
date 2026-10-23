import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { signedUrl } from "@/lib/signed-urls";

/** Plays a chat voice note from the private `voice` bucket via a signed URL. */
export function VoiceNote({
  path,
  durationMs,
  mine,
}: {
  path: string;
  durationMs?: number | null;
  mine: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void signedUrl("voice", path).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path]);

  const secs = durationMs ? Math.max(1, Math.round(durationMs / 1000)) : null;

  return (
    <div className="flex items-center gap-2">
      {url ? (
        <audio controls src={url} className="h-9 max-w-[220px]" preload="none" />
      ) : (
        <span className={`flex items-center gap-1.5 text-xs ${mine ? "opacity-80" : "text-muted-foreground"}`}>
          <Play className="size-3.5" /> loading…
        </span>
      )}
      {secs ? <span className="text-[10px] opacity-70">{secs}s</span> : null}
    </div>
  );
}
