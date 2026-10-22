import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { ChatThread } from "@/components/ChatThread";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Private Chat — BLUBLUB" },
      { name: "description", content: "Real-time private messaging just for the two of you." },
      { property: "og:title", content: "Private Chat — BLUBLUB" },
      {
        property: "og:description",
        content: "Real-time private messaging just for the two of you.",
      },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <AppLayout title="Chat" subtitle="Just the two of you" critter="penguin">
      <ChatThread variant="page" />
    </AppLayout>
  );
}
