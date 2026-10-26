import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "花果山数学小课堂",
    template: "%s · 花果山数学小课堂",
  },
  description: "初中代数辅导：核对题目、分步提示、苏格拉底追问。没有钥匙也能把六屏走完。",
};

export const viewport: Viewport = {
  themeColor: "#f3eadc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
