import type { Metadata } from "next";
import { PhotoScreen } from "@/components/screens/photo-screen";

export const metadata: Metadata = { title: "确认题目" };

export default function PhotoPage() {
  return <PhotoScreen />;
}
