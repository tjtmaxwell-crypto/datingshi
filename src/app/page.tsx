import type { Metadata } from "next";
import { HomeScreen } from "@/components/screens/home-screen";

export const metadata: Metadata = { title: "课堂" };

export default function HomePage() {
  return <HomeScreen />;
}
