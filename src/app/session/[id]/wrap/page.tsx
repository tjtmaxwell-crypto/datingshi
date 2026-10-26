import type { Metadata } from "next";
import { Suspense } from "react";
import { WrapScreen } from "@/components/screens/wrap-screen";
import { Loading } from "@/components/ui";

export const metadata: Metadata = { title: "学习档案" };

export default function WrapPage() {
  return (
    <Suspense fallback={<Loading label="档案正在合上…" />}>
      <WrapScreen />
    </Suspense>
  );
}