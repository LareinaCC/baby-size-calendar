"use client";

import { useEffect, useMemo, useState } from "react";
import {
  birthYearOptions,
  composeBirthYmdFromYearMonth,
  splitBirthYmd,
} from "@/lib/birth-date-parts";

type Props = {
  value: string;
  onChange: (ymd: string) => void;
  highlight?: boolean;
  idPrefix?: string;
};

export function BabyBirthDateFields({
  value,
  onChange,
  highlight = false,
  idPrefix = "birth",
}: Props) {
  const parsed = splitBirthYmd(value);
  const [year, setYear] = useState(parsed?.year ?? "");
  const [month, setMonth] = useState(parsed?.month ?? "");

  useEffect(() => {
    const p = splitBirthYmd(value);
    if (p) {
      setYear(p.year);
      setMonth(p.month);
    } else if (!value) {
      setYear("");
      setMonth("");
    }
  }, [value]);

  const years = useMemo(() => birthYearOptions(), []);

  function emitIfComplete(y: string, m: string) {
    if (!y || !m) {
      onChange("");
      return;
    }
    onChange(composeBirthYmdFromYearMonth(Number(y), Number(m)));
  }

  function onYearChange(nextYear: string) {
    setYear(nextYear);
    emitIfComplete(nextYear, month);
  }

  function onMonthChange(nextMonth: string) {
    setMonth(nextMonth);
    emitIfComplete(year, nextMonth);
  }

  const selectClass =
    "min-h-12 w-full min-w-0 appearance-none rounded-xl border border-stone-200 bg-white px-2 py-3 text-base text-stone-900 outline-none ring-orange-200 transition focus:border-orange-300 focus:ring-2";

  return (
    <div
      className={`grid grid-cols-2 gap-2 sm:gap-3 ${highlight ? "rounded-xl ring-2 ring-red-300" : ""}`}
      role="group"
      aria-labelledby={`${idPrefix}-label`}
    >
      <div className="relative min-w-0">
        <label htmlFor={`${idPrefix}-y`} className="sr-only">
          年
        </label>
        <select
          id={`${idPrefix}-y`}
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className={selectClass}
          aria-invalid={highlight}
        >
          <option value="">年</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y} 年
            </option>
          ))}
        </select>
      </div>
      <div className="relative min-w-0">
        <label htmlFor={`${idPrefix}-m`} className="sr-only">
          月
        </label>
        <select
          id={`${idPrefix}-m`}
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className={selectClass}
          aria-invalid={highlight}
        >
          <option value="">月</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={String(m).padStart(2, "0")}>
              {m} 月
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
