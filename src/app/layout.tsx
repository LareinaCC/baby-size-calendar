import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI计算器 · 618囤衣清单",
  description: "按出生年月、省市与 WHO 身高参考生成尺码建议与购买清单。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
