export type Gender = "boy" | "girl";
export type PercentileBand = "P3" | "P50" | "P97";

export type GrowthRow = {
  ageMonths: number;
  p3: number;
  p50: number;
  p97: number;
};

export const WHO_HEIGHT_REFERENCE: Record<Gender, GrowthRow[]> = {
  boy: [
    { ageMonths: 0, p3: 46.3, p50: 49.9, p97: 53.4 },
    { ageMonths: 1, p3: 51.1, p50: 54.7, p97: 58.4 },
    { ageMonths: 2, p3: 54.7, p50: 58.4, p97: 62.2 },
    { ageMonths: 3, p3: 57.6, p50: 61.4, p97: 65.3 },
    { ageMonths: 4, p3: 60.0, p50: 63.9, p97: 67.8 },
    { ageMonths: 5, p3: 61.9, p50: 65.9, p97: 69.9 },
    { ageMonths: 6, p3: 63.6, p50: 67.6, p97: 71.6 },
    { ageMonths: 9, p3: 67.7, p50: 72.0, p97: 76.5 },
    { ageMonths: 12, p3: 71.0, p50: 75.7, p97: 80.5 },
    { ageMonths: 15, p3: 74.1, p50: 79.1, p97: 84.2 },
    { ageMonths: 18, p3: 76.9, p50: 82.3, p97: 87.7 },
    { ageMonths: 21, p3: 79.4, p50: 85.1, p97: 90.9 },
    { ageMonths: 24, p3: 81.7, p50: 87.1, p97: 92.9 },
    { ageMonths: 30, p3: 85.1, p50: 91.9, p97: 98.7 },
    { ageMonths: 36, p3: 88.7, p50: 96.1, p97: 103.5 },
    { ageMonths: 42, p3: 92.3, p50: 99.9, p97: 107.8 },
    { ageMonths: 48, p3: 95.9, p50: 103.3, p97: 111.2 },
    { ageMonths: 54, p3: 99.0, p50: 106.7, p97: 115.0 },
    { ageMonths: 60, p3: 101.8, p50: 110.0, p97: 118.7 },
  ],
  girl: [
    { ageMonths: 0, p3: 45.6, p50: 49.1, p97: 52.7 },
    { ageMonths: 1, p3: 50.0, p50: 53.7, p97: 57.4 },
    { ageMonths: 2, p3: 53.2, p50: 57.1, p97: 60.9 },
    { ageMonths: 3, p3: 55.8, p50: 59.8, p97: 63.8 },
    { ageMonths: 4, p3: 58.0, p50: 62.1, p97: 66.2 },
    { ageMonths: 5, p3: 59.9, p50: 64.0, p97: 68.2 },
    { ageMonths: 6, p3: 61.5, p50: 65.7, p97: 70.0 },
    { ageMonths: 9, p3: 65.3, p50: 70.1, p97: 74.8 },
    { ageMonths: 12, p3: 68.9, p50: 74.0, p97: 79.2 },
    { ageMonths: 15, p3: 72.0, p50: 77.5, p97: 83.0 },
    { ageMonths: 18, p3: 74.9, p50: 80.7, p97: 86.5 },
    { ageMonths: 21, p3: 77.5, p50: 83.7, p97: 89.8 },
    { ageMonths: 24, p3: 80.0, p50: 85.7, p97: 91.4 },
    { ageMonths: 30, p3: 83.6, p50: 90.7, p97: 97.7 },
    { ageMonths: 36, p3: 87.4, p50: 95.1, p97: 102.7 },
    { ageMonths: 42, p3: 91.0, p50: 99.0, p97: 106.9 },
    { ageMonths: 48, p3: 94.5, p50: 102.7, p97: 110.9 },
    { ageMonths: 54, p3: 97.7, p50: 106.2, p97: 114.6 },
    { ageMonths: 60, p3: 100.7, p50: 109.4, p97: 118.2 },
  ],
};

function sortedRows(gender: Gender): GrowthRow[] {
  return [...WHO_HEIGHT_REFERENCE[gender]].sort((a, b) => a.ageMonths - b.ageMonths);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * `table` 需按 `ageMonths` 升序。小于首节点取首行；大于末节点取末行；
 * 中间月龄对 p3/p50/p97 同步线性插值并保留一位小数。
 */
export function interpolateGrowthRow(table: GrowthRow[], ageMonths: number): GrowthRow {
  if (table.length === 0) {
    throw new Error("WHO table is empty");
  }
  if (ageMonths <= table[0].ageMonths) return table[0];
  if (ageMonths >= table[table.length - 1].ageMonths) {
    return table[table.length - 1];
  }

  const lower = [...table].reverse().find((row) => row.ageMonths <= ageMonths)!;
  const upper = table.find((row) => row.ageMonths >= ageMonths)!;

  if (lower.ageMonths === upper.ageMonths) return lower;

  const ratio = (ageMonths - lower.ageMonths) / (upper.ageMonths - lower.ageMonths);

  return {
    ageMonths,
    p3: round1(lower.p3 + (upper.p3 - lower.p3) * ratio),
    p50: round1(lower.p50 + (upper.p50 - lower.p50) * ratio),
    p97: round1(lower.p97 + (upper.p97 - lower.p97) * ratio),
  };
}

/** 按指定 WHO 百分位带，读取目标月龄上的插值身高（cm） */
export function estimateFutureHeightByBand(
  gender: Gender,
  futureAgeMonths: number,
  band: PercentileBand,
): number {
  const table = sortedRows(gender);
  const row = interpolateGrowthRow(table, Math.max(0, futureAgeMonths));
  if (band === "P3") return row.p3;
  if (band === "P50") return row.p50;
  return row.p97;
}

/** WHO 表内身高（cm），按性别 + 月龄 + P3/P50/P97（同 {@link estimateFutureHeightByBand}） */
export function whoInterpolateHeight(
  gender: Gender,
  ageMonths: number,
  band: PercentileBand,
): number {
  return estimateFutureHeightByBand(gender, ageMonths, band);
}

/**
 * 用「当前月龄在 P3–P97 之间的相对位置」映射到目标月龄（同一相对位置），
 * 用于有实测身高时的外推；超过表范围时由 interpolateGrowthRow 夹到端点行。
 */
export function whoProjectFromP3P97Position(
  gender: Gender,
  ageNowMonths: number,
  ageTargetMonths: number,
  measuredCm: number,
): number {
  const table = sortedRows(gender);
  const rowNow = interpolateGrowthRow(table, Math.max(0, ageNowMonths));
  const rowT = interpolateGrowthRow(table, Math.max(0, ageTargetMonths));
  const span = rowNow.p97 - rowNow.p3;
  if (span < 0.5) {
    return rowT.p50;
  }
  const t = Math.min(1, Math.max(0, (measuredCm - rowNow.p3) / span));
  return round1(rowT.p3 + t * (rowT.p97 - rowT.p3));
}

/** 当前月龄 WHO 插值行上，与实测身高差值最小的百分位档 */
export function getNearestPercentileBand(
  gender: Gender,
  ageMonths: number,
  currentHeight: number,
): PercentileBand {
  const table = sortedRows(gender);
  const row = interpolateGrowthRow(table, Math.max(0, ageMonths));

  const distances: { band: PercentileBand; diff: number }[] = [
    { band: "P3", diff: Math.abs(currentHeight - row.p3) },
    { band: "P50", diff: Math.abs(currentHeight - row.p50) },
    { band: "P97", diff: Math.abs(currentHeight - row.p97) },
  ];

  distances.sort((a, b) => a.diff - b.diff);

  return distances[0]!.band;
}

export function parseGenderParam(v: string | undefined): Gender {
  return v === "girl" ? "girl" : "boy";
}

export function parsePercentileParam(v: string | undefined): PercentileBand {
  const u = (v ?? "").toUpperCase();
  if (u === "P3") return "P3";
  if (u === "P97") return "P97";
  return "P50";
}
