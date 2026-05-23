import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "AI计算器 · 618囤衣清单",
  description:
    "输入宝宝出生年月、所在省市与身高体重。生成夏装/秋装/冬装买码建议与未来尺码日历。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function BabySizeCalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh min-h-screen bg-[#FFF7F2] text-stone-900 supports-[min-height:100dvh]:min-h-[100dvh]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100/60 via-transparent to-transparent" />
      <div className="relative z-10 overflow-x-hidden pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </div>
  );
}
