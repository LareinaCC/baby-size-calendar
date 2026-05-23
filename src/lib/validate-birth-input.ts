/** 表单出生年月校验 */

import { BIRTH_ASSUMED_DAY } from "@/lib/birth-date-parts";

const BIRTH_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isBirthDateFilled(value: string): boolean {
  return BIRTH_RE.test(value.trim());
}

export function birthDateValidationMessage(value: string): string | null {
  const v = value.trim();
  if (!v) return "请先选择宝宝出生年月，再生成尺码建议。";
  if (!BIRTH_RE.test(v)) return "出生年月格式不正确，请重新选择。";
  const [y, m, d] = v.split("-").map(Number);
  if (d !== BIRTH_ASSUMED_DAY) {
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (
      dt.getFullYear() !== y ||
      dt.getMonth() !== (m ?? 1) - 1 ||
      dt.getDate() !== d
    ) {
      return "出生年月无效，请重新选择。";
    }
    return null;
  }
  if (!m || m < 1 || m > 12 || !y) return "出生年月无效，请重新选择。";
  return null;
}
