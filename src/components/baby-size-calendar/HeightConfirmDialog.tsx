"use client";

import type { MeasuredHeightAssessment } from "@/lib/baby-size-measured-height";

type Props = {
  assessment: MeasuredHeightAssessment;
  onConfirm: () => void;
  onEdit: () => void;
};

export function HeightConfirmDialog({ assessment, onConfirm, onEdit }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/45 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="height-confirm-title"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-200 bg-white p-5 shadow-xl">
        <h2
          id="height-confirm-title"
          className="text-base font-bold text-stone-900"
        >
          {assessment.title}
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-stone-700">
          {assessment.bodyLines.map((line) => (
            <li key={line} className="text-pretty">
              {line}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            数据无误，按实测推算
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="min-h-11 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            返回修改
          </button>
        </div>
      </div>
    </div>
  );
}
