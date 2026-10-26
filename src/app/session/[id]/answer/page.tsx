import type { Metadata } from "next";
import { Suspense } from "react";
import { AnswerScreen } from "@/components/screens/answer-screen";
import { Loading } from "@/components/ui";

export const metadata: Metadata = { title: "作答" };

export default function AnswerPage() {
  return (
    <Suspense fallback={<Loading label="题目翻开中…" />}>
      <AnswerScreen />
    </Suspense>
  );
}
