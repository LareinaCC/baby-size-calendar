"use client";

import type { BabySizeResultExportBundle } from "@/lib/baby-size-export";
import { BabySizeSharePoster } from "@/components/baby-size-calendar/BabySizeSharePoster";
import { usePosterDownload } from "@/components/baby-size-calendar/poster-download-context";

type Props = {
  bundle: BabySizeResultExportBundle;
};

export function BabySizePosterExportZone({ bundle }: Props) {
  const { registerDownload, setBusy } = usePosterDownload();

  return (
    <section
      id="export-poster"
      className="mb-6 scroll-mt-24 rounded-2xl border-2 border-orange-300 bg-gradient-to-b from-orange-50 via-white to-white p-4 shadow-sm shadow-orange-900/5 sm:scroll-mt-28 sm:p-6"
      aria-labelledby="export-poster-heading"
    >
      <p className="text-xs font-semibold tracking-wide text-orange-600">推荐</p>
      <h2
        id="export-poster-heading"
        className="mt-1 text-base font-bold leading-snug text-stone-900 sm:text-lg"
      >
        保存 / 转发清单长图
      </h2>
      <p className="mt-2 text-pretty text-sm leading-relaxed text-stone-600">
        一键生成高清 PNG，比截整页更清晰。屏幕<strong>最底部</strong>也有橙色「保存清单长图」按钮。
      </p>
      <BabySizeSharePoster
        bundle={bundle}
        onDownloadReady={registerDownload}
        onBusyChange={setBusy}
        buttonLabel="保存清单长图"
      />
    </section>
  );
}
