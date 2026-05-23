import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeBabySizeAdvice,
  parseHeightCmInput,
  type BabyInput,
  type Gender,
} from "@/lib/baby-size-calculator";
import {
  auditSizeAdvice,
  assertSizeAdviceSanity,
  maxAllowedSizeForContext,
} from "@/lib/baby-size-sanity";

const NOW = new Date(2026, 4, 16); // 2026-05-16 本地

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMonthsLocal(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setMonth(x.getMonth() + n);
  return x;
}

function baseInput(
  birthDate: string,
  overrides: Partial<BabyInput> = {},
): BabyInput {
  return {
    birthDate,
    provinceCode: "31",
    municipality: "上海市",
    gender: "boy",
    percentileBand: "P50",
    heightCm: null,
    weightKg: null,
    ...overrides,
  };
}

function compute(
  birthDate: string,
  overrides: Partial<BabyInput> = {},
  heightRaw?: string,
) {
  const gender = (overrides.gender ?? "boy") as Gender;
  const heightCm =
    heightRaw !== undefined
      ? parseHeightCmInput(birthDate, gender, heightRaw, NOW)
      : (overrides.heightCm ?? null);
  const input = baseInput(birthDate, { ...overrides, heightCm });
  const advice = computeBabySizeAdvice(input, NOW);
  return { input, advice };
}

function assertNoExtremeSizes(
  label: string,
  advice: ReturnType<typeof computeBabySizeAdvice>,
  gender: Gender,
): void {
  const err = assertSizeAdviceSanity(advice, gender);
  assert.equal(err, null, `${label}\n${err ?? ""}`);
}

describe("尺码极端值自检", () => {
  it("0 月龄新生儿：无 100+ 码", () => {
    const birth = localYmd(NOW);
    const { advice } = compute(birth);
    assertNoExtremeSizes("0月龄", advice, "boy");
    assert.ok(advice.currentMainSize <= 80, `主力码应 ≤80，实际 ${advice.currentMainSize}`);
    for (const row of advice.calendar) {
      assert.ok(row.size <= 90, `日历 ${row.label} 出现 ${row.size}`);
    }
    const codes = new Set(
      auditSizeAdvice(advice, "boy").map((i) => i.code),
    );
    assert.equal(codes.has(130), false);
    assert.equal(codes.has(120), false);
  });

  it("0 月龄错填身高 130：钳制后仍无极端码", () => {
    const birth = localYmd(NOW);
    const { advice } = compute(birth, {}, "130");
    assertNoExtremeSizes("0月龄身高130", advice, "boy");
    assert.ok(
      advice.currentMainSize <= 80,
      `钳制后主力码 ${advice.currentMainSize}`,
    );
  });

  it("出生当月 + 超 WHO 上限身高：measured_anchor 不压回上限", () => {
    const birth = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, "0")}-15`;
    const rawHeight = 65;
    const { advice } = compute(birth, { heightCm: rawHeight, heightProjectionMode: "measured_anchor" });
    assert.equal(advice.currentMainSize, 66, "65cm 约对应 66 码而非压到 60cm 档");
    assert.ok(advice.measuredHeightNotice?.includes("实测"));
  });

  it("防晒衣 90、100 码：使用时长不应同为整季 6–8 月", () => {
    const birth = "2025-02-15";
    const { advice } = compute(birth);
    const outer = advice.purchaseList.find((r) => r.style.includes("防晒"));
    assert.ok(outer, "应有防晒衣行");
    assert.match(outer.wearPeriod, /90 码约 2026年6–8月/);
    assert.match(outer.wearPeriod, /100 码约 2026年8月/);
    assert.doesNotMatch(outer.wearPeriod, /100 码约 2026年6–8月/);
  });

  it("1 月龄女宝夏季：8 月仅 73 时不应被并成 80 码囤货", () => {
    const birth = "2026-04-15";
    const { advice } = compute(birth, { gender: "girl", percentileBand: "P50" });
    assert.match(advice.summer.summary, /66/);
    assert.doesNotMatch(advice.summer.summary, /\b80\b/);
    for (const g of advice.summer.garments) {
      assert.doesNotMatch(g.size, /\b80\b/, `${g.category} 出现 80：${g.size}`);
    }
    const summerRows = advice.calendar.filter((r) =>
      /2026年[678]月/.test(r.label),
    );
    assert.deepEqual(
      summerRows.map((r) => r.size),
      [66, 66, 73],
    );
  });

  it("1–3 月龄与女童 P97：购买清单与日历无超龄码", () => {
    for (const monthsAgo of [1, 2, 3]) {
      const birth = localYmd(addMonthsLocal(NOW, -monthsAgo));
      for (const gender of ["boy", "girl"] as const) {
        for (const band of ["P50", "P97"] as const) {
          const { advice } = compute(birth, {
            gender,
            percentileBand: band,
          });
          assertNoExtremeSizes(
            `${monthsAgo}月前出生 ${gender} ${band}`,
            advice,
            gender,
          );
        }
      }
    }
  });

  it("未出生（预产期在未来）：日历从预产月起算仍无 130", () => {
    const birth = localYmd(addMonthsLocal(NOW, 2));
    const { advice } = compute(birth);
    assertNoExtremeSizes("预产期+2月", advice, "boy");
    for (const row of advice.calendar) {
      assert.ok(row.size <= 90, `预产期日历 ${row.label} → ${row.size}`);
    }
  });

  it("12 月龄以内任意组合扫描：主力码不超过有效月龄上限", () => {
    const heights = [undefined, "52", "65", "130", "600"] as const;
    for (let ago = 0; ago <= 12; ago++) {
      const birth = localYmd(addMonthsLocal(NOW, -ago));
      for (const gender of ["boy", "girl"] as const) {
        for (const h of heights) {
          const { advice } = compute(birth, { gender }, h);
          assertNoExtremeSizes(
            `ago=${ago} gender=${gender} height=${h ?? "—"}`,
            advice,
            gender,
          );
          const maxMain = maxAllowedSizeForContext(gender, advice.ageMonths, advice.ageMonths);
          assert.ok(
            advice.currentMainSize <= maxMain,
            `主力码 ${advice.currentMainSize} > ${maxMain}`,
          );
        }
      }
    }
  });

  it("24 月龄仍不应出现 130（除非月龄上下文允许）", () => {
    const birth = localYmd(addMonthsLocal(NOW, -24));
    const { advice } = compute(birth);
    assertNoExtremeSizes("24月龄", advice, "boy");
    assert.ok(
      advice.currentMainSize < 130,
      `24 月主力码不应为 130，实际 ${advice.currentMainSize}`,
    );
  });
});
