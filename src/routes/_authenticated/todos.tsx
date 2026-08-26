import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  AddPanel,
  Card,
  Field,
  PrimaryButton,
  ProgressBar,
  SectionTitle,
  TextInput,
} from "@/components/ui-kit";
import { useAuthUser, useCoupleId } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/todos")({
  head: () => ({
    meta: [
      { title: "To-dos & Goals — BLUBLUB" },
      { name: "description", content: "A shared checklist plus relationship goals with progress." },
      { property: "og:title", content: "To-dos & Goals — BLUBLUB" },
      {
        property: "og:description",
        content: "A shared checklist plus relationship goals with progress.",
      },
    ],
  }),
  component: TodosPage,
});

function TodosPage() {
  const coupleId = useCoupleId();
  const { data: user } = useAuthUser();
  const qc = useQueryClient();
  const [todoTitle, setTodoTitle] = useState("");
  const [goalTitle, setGoalTitle] = useState("");

  const { data: todos } = useQuery({
    queryKey: ["todos", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("done")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: goals } = useQuery({
    queryKey: ["goals", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("couple_id", coupleId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const addTodo = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("todos")
        .insert({ couple_id: coupleId!, created_by: user!.id, title: todoTitle.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setTodoTitle("");
      void qc.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTodo = useMutation({
    mutationFn: async (t: { id: string; done: boolean }) => {
      const { error } = await supabase.from("todos").update({ done: !t.done }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  const removeTodo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["todos"] }),
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("goals")
        .insert({ couple_id: coupleId!, created_by: user!.id, title: goalTitle.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setGoalTitle("");
      void qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setProgress = useMutation({
    mutationFn: async (g: { id: string; progress: number }) => {
      const { error } = await supabase
        .from("goals")
        .update({ progress: g.progress })
        .eq("id", g.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  return (
    <AppLayout title="To-dos & Goals" subtitle="Little things, big things" critter="penguin">
      <AddPanel label="New to-do">
        {(close) => (
          <div className="flex gap-2">
            <TextInput
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.target.value)}
              maxLength={140}
              placeholder="Buy groceries"
            />
            <PrimaryButton
              className="w-auto px-5"
              disabled={!todoTitle.trim() || addTodo.isPending}
              onClick={() => addTodo.mutate(undefined, { onSuccess: close })}
            >
              Add
            </PrimaryButton>
          </div>
        )}
      </AddPanel>

      <SectionTitle>Checklist</SectionTitle>
      {!todos || todos.length === 0 ? (
        <Card className="text-sm text-muted-foreground">Nothing on the list.</Card>
      ) : (
        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t.id} className="card-soft flex items-center gap-3 p-3">
              <button
                aria-label="Toggle done"
                onClick={() => toggleTodo.mutate({ id: t.id, done: t.done })}
                className={`press grid size-7 shrink-0 place-items-center rounded-full border-2 ${
                  t.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {t.done ? <Check className="size-4" /> : null}
              </button>
              <span className={`flex-1 text-sm font-semibold ${t.done ? "line-through opacity-50" : ""}`}>
                {t.title}
              </span>
              <button
                aria-label="Delete to-do"
                onClick={() => removeTodo.mutate(t.id)}
                className="press rounded-full p-2 text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Relationship goals</SectionTitle>
      <Card>
        <div className="flex gap-2">
          <TextInput
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            maxLength={140}
            placeholder="Visit Kyoto together"
          />
          <PrimaryButton
            className="w-auto px-5"
            disabled={!goalTitle.trim() || addGoal.isPending}
            onClick={() => addGoal.mutate()}
          >
            Add
          </PrimaryButton>
        </div>
      </Card>

      <ul className="mt-3 space-y-3">
        {(goals ?? []).map((g) => (
          <li key={g.id} className="card-soft p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{g.title}</p>
              <span className="text-xs text-muted-foreground">{g.progress}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={g.progress} />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={g.progress}
              onChange={(e) => setProgress.mutate({ id: g.id, progress: Number(e.target.value) })}
              className="mt-3 w-full accent-primary"
            />
          </li>
        ))}
      </ul>
    </AppLayout>
  );
}
