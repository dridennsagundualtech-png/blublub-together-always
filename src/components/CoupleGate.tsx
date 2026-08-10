import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Doodle } from "@/components/Doodles";
import { Field, PrimaryButton, TextInput } from "@/components/ui-kit";
import { playChirp } from "@/hooks/use-sound";
import { useAuthUser } from "@/lib/session";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let out = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** Shown instead of a feature while the user has no couple space yet. */
export function PairingScreen() {
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    void qc.invalidateQueries();
  }

  async function createSpace() {
    if (!user) return;
    setBusy(true);
    try {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const invite = makeCode();
        const { data, error } = await supabase
          .from("couples")
          .insert({ invite_code: invite, created_by: user.id })
          .select("id")
          .single();
        if (!error && data) {
          const { error: upErr } = await supabase
            .from("profiles")
            .update({ couple_id: data.id })
            .eq("id", user.id);
          if (upErr) throw upErr;
          playChirp("success");
          refresh();
          return;
        }
        lastError = error;
      }
      throw lastError ?? new Error("Could not create your space");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create your space");
    } finally {
      setBusy(false);
    }
  }

  async function joinSpace() {
    setBusy(true);
    try {
      const { error } = await supabase.rpc("join_couple", { _code: code.trim().toUpperCase() });
      if (error) throw error;
      playChirp("success");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code didn't work");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-soft relative overflow-hidden p-6 text-center">
        <Doodle critter="penguin" pose="curious" size={56} className="absolute -left-1 bottom-0 opacity-40" />
        <Doodle critter="cat" pose="wave" size={64} className="mx-auto" />

        <h2 className="mt-2 text-xl font-extrabold">Pair with your partner</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a private space and share the 6-character code, or enter theirs.
        </p>
        <PrimaryButton className="mt-4" disabled={busy} onClick={createSpace}>
          Create our space
        </PrimaryButton>
      </div>

      <div className="card-soft p-5">
        <Field label="Join with an invite code">
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="text-center text-2xl font-extrabold tracking-[0.4em]"
          />
        </Field>
        <PrimaryButton className="mt-3" disabled={busy || code.trim().length < 6} onClick={joinSpace}>
          Join space
        </PrimaryButton>
      </div>
    </div>
  );
}
