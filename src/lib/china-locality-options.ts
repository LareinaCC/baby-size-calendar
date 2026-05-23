import provincesData from "@/data/china-admin/provinces.json";
import citiesData from "@/data/china-admin/cities.json";
import { LEGACY_SHORT_CITY_TO_SELECTION } from "@/lib/china-locality-climate";

export interface AdminProvince {
  code: string;
  name: string;
}

export interface AdminCity {
  code: string;
  name: string;
  provinceCode: string;
}

const provinces = provincesData as AdminProvince[];
const cities = citiesData as AdminCity[];

const DIRECT_MUNI_CODES = new Set(["11", "12", "31"]);

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export function getProvincesSorted(): AdminProvince[] {
  return [...provinces].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

export function getProvinceName(provinceCode: string): string | undefined {
  return provinces.find((p) => p.code === provinceCode)?.name;
}

export interface MunicipalityOption {
  muni: string;
}

/** 某省下的地级行政区（直辖市为整市一条） */
export function getMunicipalitiesForProvince(provinceCode: string): MunicipalityOption[] {
  const p = provinces.find((x) => x.code === provinceCode);
  if (!p) return [];

  if (DIRECT_MUNI_CODES.has(provinceCode) || provinceCode === "50") {
    return [{ muni: p.name }];
  }

  return cities
    .filter((c) => c.provinceCode === provinceCode && c.name !== "市辖区" && c.name !== "县")
    .map((c) => ({ muni: c.name }))
    .sort((a, b) => a.muni.localeCompare(b.muni, "zh-Hans-CN"));
}

/** 仅带地级市全称时反查省代码 */
export function inferProvinceCodeFromMunicipality(muni: string): string | undefined {
  return cities.find((c) => c.name === muni)?.provinceCode;
}

/**
 * 解析 URL：优先 `pc`+`muni`；仅有 `muni` 则反查省；旧版 `city` 短名或「××市」全名兜底。
 */
export function resolveLocalitySelection(
  pc: string | undefined,
  muni: string | undefined,
  legacyCityParam: string | undefined,
): { provinceCode: string; municipality: string } {
  const muniDec = muni ? safeDecode(muni) : "";
  if (pc && muniDec) {
    return { provinceCode: pc, municipality: muniDec };
  }
  if (muniDec) {
    const inferred = inferProvinceCodeFromMunicipality(muniDec);
    if (inferred) return { provinceCode: inferred, municipality: muniDec };
  }
  if (legacyCityParam) {
    const key = legacyCityParam.trim();
    const hit = LEGACY_SHORT_CITY_TO_SELECTION[key];
    if (hit) return { provinceCode: hit.pc, municipality: hit.muni };
    if (/[市县州盟]|地区|林区|新区/.test(key)) {
      const inferred = inferProvinceCodeFromMunicipality(key);
      if (inferred) return { provinceCode: inferred, municipality: key };
    }
  }
  return { provinceCode: "31", municipality: "上海市" };
}
