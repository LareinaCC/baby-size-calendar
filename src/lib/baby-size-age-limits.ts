/** WHO 身高表覆盖 0–60 月龄，囤衣计算器面向 0–5 岁 */
export const MAX_SUPPORTED_AGE_MONTHS = 60;

export const OVER_AGE_FRIENDLY_MESSAGE =
  "哎呀，宝宝已经长大啦！我们的计算器是专门为 0-5 岁的小朋友设计的哦。大宝宝的衣服建议直接去商场试穿啦～";

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function getBabyAgeMonths(birthDateYmd: string, now = new Date()): number {
  const birth = parseLocalDate(birthDateYmd);
  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months -= birth.getMonth();
  months += now.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export type BabyAgeCheckResult =
  | { ok: true; ageMonths: number }
  | { ok: false; message: string };

export function checkBabyAgeSupported(
  birthDateYmd: string,
  now = new Date(),
): BabyAgeCheckResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateYmd)) {
    return { ok: false, message: "请填写宝宝出生年月。" };
  }
  const ageMonths = getBabyAgeMonths(birthDateYmd, now);
  if (ageMonths > MAX_SUPPORTED_AGE_MONTHS) {
    return { ok: false, message: OVER_AGE_FRIENDLY_MESSAGE };
  }
  return { ok: true, ageMonths };
}
