/** 5–9 月大促期：线下/电商以当季夏装为主，季末尾货很少 */
export function is618SummerShoppingWindow(now = new Date()): boolean {
  const m = now.getMonth();
  return m >= 4 && m <= 8;
}

export type PurchaseListFocus = "summer_618" | "all_seasons";

export function resolvePurchaseListFocus(
  now: Date,
  summer: { garments: unknown[] },
): PurchaseListFocus {
  if (is618SummerShoppingWindow(now) && summer.garments.length > 0) {
    return "summer_618";
  }
  return "all_seasons";
}

export function buildShoppingFocusNote(focus: PurchaseListFocus): string | null {
  if (focus !== "summer_618") return null;
  return "清单以当季夏装为主；秋/冬码数见下方分季参考，有需要可按表选购。";
}

export function fallWinterSeasonSectionHint(focus: PurchaseListFocus): string | null {
  if (focus !== "summer_618") return null;
  return "秋/冬分季参考（大促期店家以夏装为主，有需要可查看建议码与件数）。";
}

export function purchaseListHeading(focus: PurchaseListFocus): string {
  return focus === "summer_618" ? "618 夏装购买清单" : "购买清单汇总";
}

/** 大促夏装已并入购买清单时，不再单独展示「夏装建议」卡片 */
export function shouldShowSummerSeasonCard(focus: PurchaseListFocus): boolean {
  return focus !== "summer_618";
}
