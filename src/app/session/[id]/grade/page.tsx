import type { Metadata } from "next";
import { Suspense } from "react";
import { GradeScreen } from "@/components/screens/grade-screen";
import { Loading } from "@/components/ui";

export const metadata: Metadata = { title: "批改" };

export default function GradePage() {
  return (
    <Suspense fallback={<Loading label="批改本翻开中…" />}>
      <GradeScreen />
    </Suspense>
  );
}
