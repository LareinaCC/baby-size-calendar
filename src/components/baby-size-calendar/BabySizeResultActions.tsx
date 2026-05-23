"use client";

import type { BabySizeResultExportBundle } from "@/lib/baby-size-export";
import {
  downloadTextFile,
  exportBabySizeAdviceToHtml,
  exportBabySizeAdviceToMarkdown,
} from "@/lib/baby-size-export";

type Props = {
  exportBundle: BabySizeResultExportBundle;
};

/** 结果页底部：Markdown / HTML 文件导出 */
export function BabySizeResultActions({ exportBundle }: Props) {
  const slugDate = exportBundle.meta.birth.replace(/\//g, "-");

  function exportMd() {
    const md = exportBabySizeAdviceToMarkdown(exportBundle);
    downloadTextFile(`宝宝尺码建议-${slugDate}.md`, md, "text/markdown");
  }

  function exportHtml() {
    const html = exportBabySizeAdviceToHtml(exportBundle);
    downloadTextFile(`宝宝尺码建议-${slugDate}.html`, html, "text/html");
  }

  return (
    <section
      className="mb-8 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm sm:p-6"
      aria-labelledby="export-files-heading"
    >
      <h2
        id="export-files-heading"
        className="text-sm font-semibold uppercase tracking-wide text-orange-600"
      >
        导出文件
      </h2>
      <div className="mt-3 space-y-2 text-pretty text-xs leading-relaxed text-stone-600 sm:text-sm">
        <p>可下载 Markdown 或 HTML，便于存档或二次编辑。</p>
        <p>HTML 可在浏览器中打开后，使用「打印 → 另存为 PDF」得到排版良好的 PDF。</p>
      </div>

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-2">
        <button
          type="button"
          onClick={exportMd}
          className="min-h-11 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-800 hover:bg-stone-100 sm:w-auto"
        >
          下载 Markdown（.md）
        </button>
        <button
          type="button"
          onClick={exportHtml}
          className="min-h-11 w-full rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-900 hover:bg-orange-100 sm:w-auto"
        >
          下载 HTML（可转 PDF）
        </button>
      </div>
    </section>
  );
}
