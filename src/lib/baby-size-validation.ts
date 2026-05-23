import type { Gender } from "@/lib/who-height-reference";
import { whoInterpolateHeight } from "@/lib/who-height-reference";

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12;
  months -= from.getMonth();
  months += to.getMonth();
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * 身高/体重是否明显不合理（含常见错填单位、BMI/比例异常）。
 * 仅作友好提示，不阻断计算。
 */
export function getHeightWeightWarning(
  birthDateYmd: string,
  heightCm: number,
  weightKg: number,
  gender: Gender,
  measuredAt: Date = new Date(),
): string | null {
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) return null;
  if (heightCm <= 0 || weightKg <= 0) return null;

  const birth = parseLocalDate(birthDateYmd);
  const ageMonths = monthsBetween(birth, measuredAt);

  if (heightCm >= 200) {
    return "身高数值偏大，请确认单位是「厘米 cm」，而不是毫米或误多输入了一位。";
  }
  if (weightKg >= 45) {
    return "体重数值偏大，请确认单位是「千克 kg」，而不是斤（1 斤 ≈ 0.5 kg）。";
  }
  if (heightCm < 40) {
    return "身高过小，请核对是否漏写或单位填错。";
  }
  if (weightKg < 2) {
    return "体重过小，请核对是否漏写小数点或单位。";
  }

  const whoH = whoInterpolateHeight(gender, ageMonths, "P50");
  const whoLo = whoInterpolateHeight(gender, ageMonths, "P3");
  const whoHi = whoInterpolateHeight(gender, ageMonths, "P97");

  if (heightCm < whoLo - 12 || heightCm > whoHi + 15) {
    return `当前身高 ${heightCm} cm 与 WHO 同月龄常见范围（约 ${Math.round(whoLo)}–${Math.round(whoHi)} cm）相差较大，请核对是否填错；若宝宝确有特殊情况，结果仅供参考。`;
  }

  const hM = heightCm / 100;
  const bmi = weightKg / (hM * hM);
  const ratio = weightKg / heightCm;

  if (ageMonths < 12) {
    if (ratio < 0.065) {
      return `身高 ${heightCm} cm、体重 ${weightKg} kg 的比例偏轻，请确认两项是否填反或漏写小数点。`;
    }
    if (ratio > 0.32) {
      return `身高 ${heightCm} cm、体重 ${weightKg} kg 的比例偏重，请确认体重单位是否为 kg（不是斤）。`;
    }
  } else if (ageMonths < 24) {
    if (bmi < 13.5 || bmi > 21) {
      return `按当前身高体重估算 BMI 约 ${bmi.toFixed(1)}，与 ${ageMonths} 月龄常见区间不太一致，请核对后再参考下方码数。`;
    }
  } else {
    if (bmi < 12.5 || bmi > 22) {
      return `按当前身高体重估算 BMI 约 ${bmi.toFixed(1)}，明显偏离常见范围，请核对是否错填后再使用囤衣建议。`;
    }
  }

  const roughWeightAtHeight =
    ageMonths < 6
      ? heightCm * 0.14
      : ageMonths < 12
        ? heightCm * 0.125
        : ageMonths < 24
          ? heightCm * 0.115
          : heightCm * 0.105;

  if (weightKg < roughWeightAtHeight * 0.55 || weightKg > roughWeightAtHeight * 1.75) {
    return `体重 ${weightKg} kg 与身高 ${heightCm} cm 的组合不太常见，建议对照体检单核对；填错会影响尺码推算。`;
  }

  if (Math.abs(heightCm - whoH) <= 3 && Math.abs(weightKg - roughWeightAtHeight) > roughWeightAtHeight * 0.45) {
    return "身高接近中位线，但体重与常见搭配相差较大，请确认体重是否填错。";
  }

  return null;
}
