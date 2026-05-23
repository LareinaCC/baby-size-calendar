/** 出生年月选择（内部存 YYYY-MM-DD，日固定为 15 便于按月计龄） */

/** 用户只选年月时写入的「月中」日，尺码日历仍按自然月计龄 */
export const BIRTH_ASSUMED_DAY = 15;

export function localTodayYmd(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function composeBirthYmd(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 仅年月 → 内部 YYYY-MM-15 */
export function composeBirthYmdFromYearMonth(
  year: number,
  month: number,
): string {
  return composeBirthYmd(year, month, BIRTH_ASSUMED_DAY);
}

export function splitBirthYmd(ymd: string): {
  year: string;
  month: string;
  day: string;
} | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  return { year: m[1]!, month: m[2]!, day: m[3]! };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** 出生年：约 6 年前～次年（含预产期） */
export function birthYearOptions(now = new Date()): number[] {
  const y = now.getFullYear();
  const out: number[] = [];
  for (let i = y - 6; i <= y + 1; i++) out.push(i);
  return out;
}

export function clampDayForMonth(
  year: number,
  month: number,
  day: number,
): number {
  const max = daysInMonth(year, month);
  return Math.min(Math.max(1, day), max);
}

/** 出生月份是否为当前自然月（仅选年月时的「新生儿当月」提示） */
export function isBirthMonthCurrent(ymd: string, now = new Date()): boolean {
  const p = splitBirthYmd(ymd);
  if (!p) return false;
  const curM = String(now.getMonth() + 1).padStart(2, "0");
  return p.year === String(now.getFullYear()) && p.month === curM;
}

/** @deprecated 使用 isBirthMonthCurrent */
export function isBirthDateToday(ymd: string, now = new Date()): boolean {
  return isBirthMonthCurrent(ymd, now);
}

/** 结果页/导出展示：仅年月录入时不显示「15 日」 */
export function formatBirthDisplay(ymd: string): string {
  const p = splitBirthYmd(ymd);
  if (!p) return ymd;
  const assumed = String(BIRTH_ASSUMED_DAY).padStart(2, "0");
  if (p.day === assumed) {
    return `${p.year}年${Number(p.month)}月`;
  }
  return `${p.year}年${Number(p.month)}月${Number(p.day)}日`;
}
