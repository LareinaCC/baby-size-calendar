export type ClimateZone =
  | "hot_humid"
  | "north_cold"
  | "yangtze"
  | "dry_north"
  | "southwest_mild";

export const ZONE_LABEL: Record<ClimateZone, string> = {
  hot_humid: "华南 / 湿热冬季偏短",
  north_cold: "华北 / 东北 — 冬季长、叠穿多",
  yangtze: "长江中下游 — 四季分明、换季快",
  dry_north: "西北 / 干冷 — 保暖防风优先",
  southwest_mild: "西南 — 湿冷偏温和，冬装不必过厚",
};
