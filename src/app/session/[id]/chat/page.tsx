import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatScreen } from "@/components/screens/chat-screen";
import { Loading } from "@/components/ui";

export const metadata: Metadata = { title: "追问" };

export default function ChatPage() {
  return (
    <Suspense fallback={<Loading label="师父正在坐下…" />}>
      <ChatScreen />
    </Suspense>
  );
}
