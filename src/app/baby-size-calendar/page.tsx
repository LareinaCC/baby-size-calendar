"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef, FormEvent } from "react";
import {
  suggestPercentileBandFromMeasuredHeight,
  type Gender,
  type PercentileBand,
} from "@/lib/baby-size-calculator";
import { checkBabyAgeSupported } from "@/lib/baby-size-age-limits";
import { getHeightWeightWarning } from "@/lib/baby-size-validation";
import { ClothingIconStrip } from "@/components/baby-size-calendar/ClothingIconStrip";
import {
  getMunicipalitiesForProvince,
  getProvincesSorted,
} from "@/lib/china-locality-options";
import { birthDateValidationMessage } from "@/lib/validate-birth-input";
import { isBirthMonthCurrent } from "@/lib/birth-date-parts";
import { BabyBirthDateFields } from "@/components/baby-size-calendar/BabyBirthDateFields";
import { HeightConfirmDialog } from "@/components/baby-size-calendar/HeightConfirmDialog";
import { assessMeasuredHeight } from "@/lib/baby-size-measured-height";
import {
  PERCENTILE_BAND_UI,
  percentileBandHintWhenMeasured,
  percentileBandOptionLabel,
  percentileBandTitle,
} from "@/lib/percentile-band-labels";

function parseHeightCmInput(raw: string): number | null {
  const h = parseFloat(raw.replace(",", ".").trim());
  return Number.isFinite(h) && h > 40 ? h : null;
}

function parseWeightKgInput(raw: string): number | null {
  const w = parseFloat(raw.replace(",", ".").trim());
  return Number.isFinite(w) && w > 0 && w <= 40 ? w : null;
}

export default function BabySizeCalendarHomePage() {
  const router = useRouter();
  const birthGroupRef = useRef<HTMLDivElement>(null);
  const provinces = useMemo(() => getProvincesSorted(), []);
  const [birthDate, setBirthDate] = useState("");
  const [birthHighlight, setBirthHighlight] = useState(false);
  const [provinceCode, setProvinceCode] = useState("31");
  const [municipality, setMunicipality] = useState("上海市");
  const [gender, setGender] = useState<Gender>("boy");
  const [percentileBand, setPercentileBand] = useState<PercentileBand>("P50");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const [ageBlock, setAgeBlock] = useState<string | null>(null);
  const [heightConfirm, setHeightConfirm] = useState<
    ReturnType<typeof assessMeasuredHeight> | null
  >(null);

  const muniOptions = useMemo(
    () => getMunicipalitiesForProvince(provinceCode),
    [provinceCode],
  );

  const heightWeightHint = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    const h = parseFloat(height.replace(",", ".").trim());
    const w = parseFloat(weight.replace(",", ".").trim());
    if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return null;
    return getHeightWeightWarning(birthDate, h, w, gender);
  }, [birthDate, gender, height, weight]);

  const heightCm = parseHeightCmInput(height);
  const weightKg = parseWeightKgInput(weight);
  const birthFilled = /^\d{4}-\d{2}-\d{2}$/.test(birthDate);

  /** 身高、体重均已填时，按实测身高锁定 WHO 分档，不再手动选择 */
  const lockedPercentileBand = useMemo((): PercentileBand | null => {
    if (!birthFilled || heightCm == null || weightKg == null) return null;
    try {
      return suggestPercentileBandFromMeasuredHeight(birthDate, gender, heightCm);
    } catch {
      return null;
    }
  }, [birthDate, birthFilled, gender, heightCm, weightKg]);

  const effectivePercentileBand = lockedPercentileBand ?? percentileBand;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("hint") !== "missing-birth") return;
    setError("请先填写宝宝出生年月，再查看尺码建议。");
    setBirthHighlight(true);
    window.setTimeout(() => {
      birthGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, []);

  const measuredHeightPreview = useMemo(() => {
    if (!birthFilled || heightCm == null) return null;
    return assessMeasuredHeight(
      birthDate,
      gender,
      heightCm,
      isBirthMonthCurrent(birthDate),
    );
  }, [birthDate, birthFilled, gender, heightCm]);

  function navigateToResult(heightTrustMeasured = false) {
    const params = new URLSearchParams();
    params.set("birth", birthDate);
    params.set("pc", provinceCode);
    params.set("muni", municipality);
    params.set("gender", gender);
    params.set("p", effectivePercentileBand);
    if (height.trim()) params.set("height", height.trim());
    if (weight.trim()) params.set("weight", weight.trim());
    if (heightTrustMeasured) params.set("heightTrust", "measured");
    router.push(`/baby-size-calendar/result?${params.toString()}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setAgeBlock(null);
    setBirthHighlight(false);
    setHeightConfirm(null);
    const birthMsg = birthDateValidationMessage(birthDate);
    if (birthMsg) {
      setError(birthMsg);
      setBirthHighlight(true);
      birthGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const ageCheck = checkBabyAgeSupported(birthDate);
    if (!ageCheck.ok) {
      setAgeBlock(ageCheck.message);
      return;
    }
    if (!municipality) {
      setError("请选择所在城市（地级市）。");
      return;
    }
    if (measuredHeightPreview?.needsConfirmation) {
      setHeightConfirm(measuredHeightPreview);
      return;
    }
    navigateToResult(false);
  }

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-lg flex-col overflow-x-hidden px-3 pb-[max(4rem,env(safe-area-inset-bottom,0px))] pt-8 sm:px-4 sm:pb-16 sm:pt-14">
      <header className="mb-10 text-center">
        <h1 className="text-balance text-[1.65rem] font-bold leading-snug tracking-tight text-stone-900 sm:text-[2rem]">
          AI计算器 · 618囤衣清单
        </h1>
        <ClothingIconStrip />
        <p className="mx-auto mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-stone-600">
          <span className="block">输入宝宝出生年月、所在省市与身高体重。</span>
          <span className="mt-2 block">大促以夏装为主，同时给出秋/冬参考码。</span>
        </p>
        <div className="mx-auto mt-8 max-w-md rounded-2xl border-2 border-orange-200 bg-gradient-to-b from-orange-50 to-white px-5 py-5 text-left shadow-sm shadow-orange-900/5">
          <ul className="space-y-3.5 text-[15px] font-semibold leading-snug text-stone-900">
            <li className="border-l-[3px] border-orange-400 pl-4">夏装买 80 还是 90？</li>
            <li className="border-l-[3px] border-orange-400 pl-4">夏天连体衣要买几个码？</li>
            <li className="border-l-[3px] border-orange-400 pl-4">外套能不能买大一码？</li>
          </ul>
        </div>
        <p className="mt-6 text-base font-bold tracking-wide text-orange-600">30 秒帮你算清楚。</p>
      </header>

      <form
        noValidate
        onSubmit={onSubmit}
        className="min-w-0 overflow-hidden rounded-2xl border border-orange-100/80 bg-white/90 p-4 shadow-sm shadow-orange-950/5 backdrop-blur-sm sm:p-8"
      >
        <div className="min-w-0 space-y-5">
          <div className="min-w-0" ref={birthGroupRef}>
            <span
              id="birth-label"
              className="mb-1.5 block text-sm font-medium text-stone-800"
            >
              出生年月
            </span>
            <BabyBirthDateFields
              value={birthDate}
              onChange={(v) => {
                setBirthDate(v);
                setBirthHighlight(false);
                if (error) setError("");
              }}
              highlight={birthHighlight}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
              已出生选实际出生年月；未出生可选预产期月份，系统从该月起算尺码日历（无需具体日期）。
            </p>
            {birthHighlight ? (
              <p id="birth-error" className="mt-1.5 text-sm font-medium text-red-600" role="alert">
                请完整选择年、月
              </p>
            ) : null}
            {/^\d{4}-\d{2}-\d{2}$/.test(birthDate) && isBirthMonthCurrent(birthDate) ? (
              <p className="mt-1.5 text-xs leading-relaxed text-amber-800">
                出生月份为当月：若已量过身高，请确认单位是 cm；明显超出同月龄常见值时会请您再确认一次。
              </p>
            ) : null}
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-stone-800">性别</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGender("boy")}
                className={`min-h-12 flex-1 rounded-xl border px-3 py-3 text-base font-medium transition active:scale-[0.98] ${
                  gender === "boy"
                    ? "border-orange-400 bg-orange-50 text-orange-900"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                男宝
              </button>
              <button
                type="button"
                onClick={() => setGender("girl")}
                className={`min-h-12 flex-1 rounded-xl border px-3 py-3 text-base font-medium transition active:scale-[0.98] ${
                  gender === "girl"
                    ? "border-orange-400 bg-orange-50 text-orange-900"
                    : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                }`}
              >
                女宝
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="province" className="mb-1.5 block text-sm font-medium text-stone-800">
              省 / 自治区 / 直辖市
            </label>
            <select
              id="province"
              value={provinceCode}
              onChange={(e) => {
                const pc = e.target.value;
                setProvinceCode(pc);
                const first = getMunicipalitiesForProvince(pc)[0]?.muni ?? "";
                setMunicipality(first);
              }}
              className="w-full min-h-12 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none ring-orange-200 transition focus:border-orange-300 focus:ring-2"
            >
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="muni" className="mb-1.5 block text-sm font-medium text-stone-800">
              地级市（含盟、州）
            </label>
            <select
              id="muni"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              className="w-full min-h-12 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none ring-orange-200 transition focus:border-orange-300 focus:ring-2"
            >
              {muniOptions.map((m) => (
                <option key={m.muni} value={m.muni}>
                  {m.muni}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-pretty text-xs leading-relaxed text-stone-500">
              数据为国家统计局区划口径（地级市一级）；气候带按省默认并辅以部分城市修正，供囤衣场景参考。
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="height" className="mb-1.5 block text-sm font-medium text-stone-800">
                身高（cm）
              </label>
              <input
                id="height"
                inputMode="decimal"
                placeholder="选填"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full min-h-12 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none ring-orange-200 transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2"
              />
            </div>
            <div>
              <label htmlFor="weight" className="mb-1.5 block text-sm font-medium text-stone-800">
                体重（kg）
              </label>
              <input
                id="weight"
                inputMode="decimal"
                placeholder="选填"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full min-h-12 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none ring-orange-200 transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2"
              />
            </div>
          </div>
          {heightWeightHint ? (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950"
              role="status"
            >
              {heightWeightHint}
            </p>
          ) : null}
          {measuredHeightPreview?.needsConfirmation && !heightConfirm ? (
            <p
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs leading-relaxed text-orange-950"
              role="status"
            >
              身高 {measuredHeightPreview.rawHeightCm} cm 与 WHO {measuredHeightPreview.ageMonths}{" "}
              月龄常见范围（约 {measuredHeightPreview.whoP3}–{measuredHeightPreview.whoP97} cm）相差较大。
              提交时将请您确认是否按实测推算。
            </p>
          ) : null}
          <div className="border-t border-stone-200/80 pt-5">
            <span className="mb-1.5 block text-sm font-medium text-stone-800">
              宝宝身高水平
            </span>
            {lockedPercentileBand ? (
              <div
                className="rounded-xl border border-orange-200/80 bg-orange-50/60 px-4 py-3.5"
                role="status"
                aria-live="polite"
              >
                <p className="text-base font-semibold text-stone-900">
                  {percentileBandTitle(lockedPercentileBand)}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-600">
                  {percentileBandHintWhenMeasured(lockedPercentileBand)}
                </p>
                <p className="mt-2 text-[11px] leading-relaxed text-stone-500">
                  已根据身高 {heightCm} cm、体重 {weightKg} kg 与同月龄参考自动判定，无需再选。
                </p>
              </div>
            ) : (
              <>
                <label htmlFor="p" className="sr-only">
                  宝宝身高水平
                </label>
                <select
                  id="p"
                  value={percentileBand}
                  onChange={(e) => setPercentileBand(e.target.value as PercentileBand)}
                  className="w-full min-h-12 rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none ring-orange-200 transition focus:border-orange-300 focus:ring-2"
                >
                  <option value="P3">{percentileBandOptionLabel("P3")}</option>
                  <option value="P50">{percentileBandOptionLabel("P50")}</option>
                  <option value="P97">{percentileBandOptionLabel("P97")}</option>
                </select>
                <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                  {PERCENTILE_BAND_UI[percentileBand].hint}
                </p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
                  未同时填写身高、体重时，请按日常观察选择；不确定可选「身高中等」。
                </p>
                <div className="mt-2 rounded-xl border border-stone-200/80 bg-stone-50/90 px-3 py-3 text-xs leading-relaxed text-stone-600 sm:text-[13px]">
                  <p className="text-[11px] font-semibold tracking-wide text-stone-500">
                    怎么选？
                  </p>
                  <ul className="mt-2.5 space-y-2.5 text-pretty text-stone-600">
                    {(["P3", "P50", "P97"] as const).map((band) => (
                      <li key={band}>
                        <strong className="text-stone-800">
                          {percentileBandTitle(band)}
                        </strong>
                        <span className="text-stone-600">
                          {" "}
                          — {PERCENTILE_BAND_UI[band].hint}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        {ageBlock ? (
          <div
            className="mt-4 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-sm"
            role="status"
          >
            <p className="text-center text-3xl" aria-hidden>
              🌱
            </p>
            <p className="mt-2 text-center text-base font-bold text-stone-900">
              哈哈，这位已经是大朋友啦
            </p>
            <p className="mt-2 text-pretty text-center text-sm leading-relaxed text-stone-700">
              {ageBlock}
            </p>
          </div>
        ) : null}

        {error ? (
          <div
            className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          className="mt-8 min-h-[3rem] w-full rounded-xl bg-orange-500 py-3.5 text-base font-semibold text-white shadow-md shadow-orange-900/15 transition hover:bg-orange-600 active:scale-[0.99]"
        >
          开始生成尺码建议
        </button>
      </form>

      {heightConfirm ? (
        <HeightConfirmDialog
          assessment={heightConfirm}
          onConfirm={() => {
            setHeightConfirm(null);
            navigateToResult(true);
          }}
          onEdit={() => setHeightConfirm(null)}
        />
      ) : null}

      <p className="mt-8 text-center text-xs leading-relaxed text-stone-500">
        结果仅供参考，请以实际试穿与品牌尺码表为准。
      </p>

      <nav className="mt-6 text-center">
        <Link
          href="/baby-size-calendar/about"
          className="text-sm font-medium text-orange-700 underline-offset-4 hover:underline"
        >
          说明与算法简介
        </Link>
      </nav>
    </main>
  );
}
