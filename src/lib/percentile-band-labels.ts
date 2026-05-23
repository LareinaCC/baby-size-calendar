import type { PercentileBand } from "@/lib/who-height-reference";

/** 表单与结果页展示用，避免 P3/轻巧 等晦涩说法 */
export const PERCENTILE_BAND_UI: Record<
  PercentileBand,
  { title: string; hint: string }
> = {
  P3: {
    title: "身高偏矮",
    hint: "比同月龄多数宝宝矮一些，囤衣可参考偏小码",
  },
  P50: {
    title: "身高中等",
    hint: "差不多一半宝宝在这个范围，不确定时选这项",
  },
  P97: {
    title: "身高偏高",
    hint: "比同月龄多数宝宝高一些，囤衣可参考偏大码",
  },
};

export function percentileBandTitle(band: PercentileBand): string {
  return PERCENTILE_BAND_UI[band].title;
}

export function percentileBandHint(band: PercentileBand): string {
  return PERCENTILE_BAND_UI[band].hint;
}

/** 已填身高体重、系统自动判定时用（去掉「不确定时选这项」等手动选择话术） */
export function percentileBandHintWhenMeasured(band: PercentileBand): string {
  if (band === "P50") return "差不多一半宝宝在这个范围";
  return PERCENTILE_BAND_UI[band].hint;
}

/** 下拉选项文案 */
export function percentileBandOptionLabel(band: PercentileBand): string {
  return PERCENTILE_BAND_UI[band].title;
}
