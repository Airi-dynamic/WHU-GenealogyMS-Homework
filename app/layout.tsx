import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "寻根溯源 — 族谱管理系统",
  description: "家族族谱管理、成员关系追溯与亲缘查询系统",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
