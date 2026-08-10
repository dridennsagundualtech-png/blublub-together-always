import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BookHeart } from "lucide-react";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, Field, PrimaryButton, TextInput } from "@/components/ui-kit";
import { todayISO } from "@/lib/badges";
import { useCoupleId, useMembers } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/memory-book")({
  head: () => ({
    meta: [
      { title: "Memory Book — BLUBLUB" },
      {
        name: "description",
        content: "Export your diary entries and photos from any date range as a PDF keepsake.",
      },
      { property: "og:title", content: "Memory Book — BLUBLUB" },
      {
        property: "og:description",
        content: "Export your diary entries and photos from any date range as a PDF keepsake.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemoryBookPage,
});

function monthsAgoISO(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

async function toDataUrl(url: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

function imageSize(dataUrl: string) {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 4, h: 3 });
    img.src = dataUrl;
  });
}

function MemoryBookPage() {
  const coupleId = useCoupleId();
  const { data: members } = useMembers();
  const [from, setFrom] = useState(monthsAgoISO(6));
  const [to, setTo] = useState(todayISO());

  const exportPdf = useMutation({
    mutationFn: async () => {
      const [{ data: entries, error: dErr }, { data: photos, error: pErr }] = await Promise.all([
        supabase
          .from("diary_entries")
          .select("*")
          .eq("couple_id", coupleId!)
          .gte("entry_date", from)
          .lte("entry_date", to)
          .order("entry_date"),
        supabase
          .from("photos")
          .select("*")
          .eq("couple_id", coupleId!)
          .gte("taken_on", from)
          .lte("taken_on", to)
          .order("taken_on"),
      ]);
      if (dErr) throw dErr;
      if (pErr) throw pErr;
      if ((entries?.length ?? 0) === 0 && (photos?.length ?? 0) === 0) {
        throw new Error("Nothing found in that date range");
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 48;
      let y = M;

      const nameOf = (id: string) => members?.find((m) => m.id === id)?.display_name ?? "Partner";
      const nextPage = (needed: number) => {
        if (y + needed > H - M) {
          doc.addPage();
          y = M;
        }
      };

      // Cover
      doc.setFontSize(34);
      doc.setTextColor(214, 106, 133);
      doc.text("BLUBLUB", W / 2, H / 2 - 40, { align: "center" });
      doc.setFontSize(16);
      doc.setTextColor(90, 80, 85);
      doc.text("Our memory book", W / 2, H / 2, { align: "center" });
      doc.setFontSize(11);
      doc.text(`${from} — ${to}`, W / 2, H / 2 + 24, { align: "center" });
      if (members && members.length > 0) {
        doc.text(members.map((m) => m.display_name ?? "Partner").join("  &  "), W / 2, H / 2 + 44, {
          align: "center",
        });
      }

      // Diary
      if (entries && entries.length > 0) {
        doc.addPage();
        y = M;
        doc.setFontSize(20);
        doc.setTextColor(214, 106, 133);
        doc.text("Diary", M, y);
        y += 26;
        for (const e of entries) {
          nextPage(80);
          doc.setFontSize(12);
          doc.setTextColor(40, 35, 38);
          doc.text(`${e.mood ?? ""} ${e.title ?? "Untitled"}`.trim(), M, y);
          y += 15;
          doc.setFontSize(9);
          doc.setTextColor(140, 130, 135);
          doc.text(`${e.entry_date} · ${nameOf(e.created_by)}`, M, y);
          y += 15;
          doc.setFontSize(11);
          doc.setTextColor(60, 55, 58);
          const lines = doc.splitTextToSize(e.body ?? "", W - M * 2) as string[];
          for (const line of lines) {
            nextPage(16);
            doc.text(line, M, y);
            y += 14;
          }
          y += 14;
        }
      }

      // Photos
      if (photos && photos.length > 0) {
        doc.addPage();
        y = M;
        doc.setFontSize(20);
        doc.setTextColor(214, 106, 133);
        doc.text("Photos", M, y);
        y += 26;
        for (const p of photos) {
          const { data: signed } = await supabase.storage
            .from("photos")
            .createSignedUrl(p.storage_path, 600);
          if (!signed?.signedUrl) continue;
          try {
            const dataUrl = await toDataUrl(signed.signedUrl);
            const { w, h } = await imageSize(dataUrl);
            const drawW = W - M * 2;
            const drawH = (h / w) * drawW;
            nextPage(drawH + 32);
            doc.addImage(dataUrl, "JPEG", M, y, drawW, drawH);
            y += drawH + 14;
            doc.setFontSize(10);
            doc.setTextColor(120, 110, 115);
            doc.text(`${p.taken_on}${p.caption ? ` · ${p.caption}` : ""}`, M, y);
            y += 24;
          } catch {
            // Skip photos that can't be fetched rather than failing the export.
          }
        }
      }

      doc.save(`blublub-memory-book-${from}-to-${to}.pdf`);
    },
    onSuccess: () => toast.success("Memory book downloaded 🩷"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppLayout title="Memory book" subtitle="Export a PDF keepsake" critter="seal" critterPose="sleep">
      <Card>
        <div className="flex items-start gap-3">
          <BookHeart className="mt-0.5 size-5 shrink-0 text-primary" />
          <p className="text-xs text-muted-foreground">
            Pick a date range and we&apos;ll bundle your diary entries and photos into one PDF you
            can keep or print.
          </p>
        </div>
      </Card>

      <Card className="mt-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="From">
              <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To">
              <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <PrimaryButton disabled={exportPdf.isPending} onClick={() => exportPdf.mutate()}>
            {exportPdf.isPending ? "Building your book…" : "Export PDF"}
          </PrimaryButton>
        </div>
      </Card>
    </AppLayout>
  );
}
