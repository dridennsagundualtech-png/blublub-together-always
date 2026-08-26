import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, SectionTitle, TextInput } from "@/components/ui-kit";
import { useIsAdmin } from "@/lib/admin";
import { listAppUsers, setUserAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin-users")({
  head: () => ({
    meta: [
      { title: "Member access — BLUBLUB" },
      { name: "description", content: "Owner-only panel to grant or revoke premium and 18+ access." },
      { property: "og:title", content: "Member access — BLUBLUB" },
      {
        property: "og:description",
        content: "Owner-only panel to grant or revoke premium and 18+ access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsersPage,
});

function Toggle({
  on,
  label,
  disabled,
  onToggle,
}: {
  on: boolean;
  label: string;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`press rounded-full px-3 py-1.5 text-xs font-extrabold disabled:opacity-50 ${
        on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      {label} {on ? "on" : "off"}
    </button>
  );
}

function AdminUsersPage() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const fetchUsers = useServerFn(listAppUsers);
  const updateAccess = useServerFn(setUserAccess);

  const { data: users, isFetching, error } = useQuery({
    queryKey: ["admin-users"],
    enabled: !!isAdmin,
    retry: false,
    queryFn: () => fetchUsers(),
  });

  const save = useMutation({
    mutationFn: (vars: { userId: string; isPremium?: boolean; spicyEnabled?: boolean }) =>
      updateAccess({ data: vars }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Access updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const term = q.trim().toLowerCase();
  const rows = (users ?? []).filter(
    (u) =>
      !term ||
      u.email.toLowerCase().includes(term) ||
      u.display_name.toLowerCase().includes(term),
  );

  return (
    <AppLayout title="Member access" subtitle="Owner only" critter="penguin">
      {isLoading ? (
        <Card className="text-sm text-muted-foreground">Checking…</Card>
      ) : !isAdmin ? (
        <Card className="text-sm text-muted-foreground">This page is for the owner account.</Card>
      ) : (
        <>
          <Card className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <TextInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email or name"
            />
          </Card>

          <SectionTitle>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" /> {rows.length} account{rows.length === 1 ? "" : "s"}
            </span>
          </SectionTitle>

          {error ? (
            <Card className="text-sm text-destructive">
              Couldn&apos;t load accounts: {(error as Error).message}
            </Card>
          ) : isFetching && !users ? (
            <Card className="text-sm text-muted-foreground">Loading members…</Card>
          ) : rows.length === 0 ? (
            <Card className="text-sm text-muted-foreground">No accounts match that search.</Card>
          ) : (
            <ul className="space-y-3">
              {rows.map((u) => (
                <li key={u.id}>
                  <Card>
                    <p className="truncate text-sm font-bold">{u.display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Toggle
                        on={u.is_premium}
                        label="Premium"
                        disabled={save.isPending}
                        onToggle={() =>
                          save.mutate({ userId: u.id, isPremium: !u.is_premium })
                        }
                      />
                      <Toggle
                        on={u.spicy_enabled}
                        label="18+ dice"
                        disabled={save.isPending}
                        onToggle={() =>
                          save.mutate({ userId: u.id, spicyEnabled: !u.spicy_enabled })
                        }
                      />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AppLayout>
  );
}
