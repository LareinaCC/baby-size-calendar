import type { ClimateZone } from "@/lib/climate-types";

/** 省级默认气候带（囤衣场景粗分） */
const PROVINCE_DEFAULT_ZONE: Record<string, ClimateZone> = {
  北京市: "north_cold",
  天津市: "north_cold",
  河北省: "north_cold",
  山西省: "dry_north",
  内蒙古自治区: "north_cold",
  辽宁省: "north_cold",
  吉林省: "north_cold",
  黑龙江省: "north_cold",
  上海市: "yangtze",
  江苏省: "yangtze",
  浙江省: "yangtze",
  安徽省: "yangtze",
  福建省: "hot_humid",
  江西省: "yangtze",
  山东省: "north_cold",
  河南省: "dry_north",
  湖北省: "yangtze",
  湖南省: "yangtze",
  广东省: "hot_humid",
  广西壮族自治区: "hot_humid",
  海南省: "hot_humid",
  重庆市: "southwest_mild",
  四川省: "southwest_mild",
  贵州省: "southwest_mild",
  云南省: "southwest_mild",
  西藏自治区: "dry_north",
  陕西省: "dry_north",
  甘肃省: "dry_north",
  青海省: "dry_north",
  宁夏回族自治区: "dry_north",
  新疆维吾尔自治区: "dry_north",
};

/** 地级市覆盖省级默认：`省全称|市全称` */
const LOCALITY_ZONE_OVERRIDE: Record<string, ClimateZone> = {
  // 山东半岛 / 黄海沿岸，换季与海雾更接近江淮体验
  "山东省|青岛市": "yangtze",
  "山东省|烟台市": "yangtze",
  "山东省|威海市": "yangtze",
  "山东省|日照市": "yangtze",
  // 闽北内陆
  "福建省|南平市": "yangtze",
  "福建省|三明市": "yangtze",
  "福建省|龙岩市": "yangtze",
  // 粤北
  "广东省|韶关市": "yangtze",
  "广东省|清远市": "yangtze",
  // 桂北相对温和
  "广西壮族自治区|桂林市": "southwest_mild",
  "广西壮族自治区|柳州市": "southwest_mild",
  // 陕南近四川盆地
  "陕西省|汉中市": "southwest_mild",
  "陕西省|安康市": "yangtze",
  "陕西省|商洛市": "yangtze",
  // 内蒙古东西差异
  "内蒙古自治区|阿拉善盟": "dry_north",
  "内蒙古自治区|锡林郭勒盟": "dry_north",
  "内蒙古自治区|巴彦淖尔市": "dry_north",
  "内蒙古自治区|鄂尔多斯市": "dry_north",
  "内蒙古自治区|乌兰察布市": "dry_north",
  // 陇南山地
  "甘肃省|陇南市": "southwest_mild",
  // 川西高原
  "四川省|阿坝藏族羌族自治州": "dry_north",
  "四川省|甘孜藏族自治州": "dry_north",
  "四川省|凉山彝族自治州": "southwest_mild",
  // 滇西北高原
  "云南省|迪庆藏族自治州": "dry_north",
  "云南省|怒江傈僳族自治州": "southwest_mild",
};

export function getProvinceDefaultClimateZone(provinceName: string): ClimateZone {
  return PROVINCE_DEFAULT_ZONE[provinceName] ?? "yangtze";
}

export function getClimateZoneForLocality(
  provinceName: string,
  municipalityName: string,
): ClimateZone {
  const key = `${provinceName}|${municipalityName}`;
  if (LOCALITY_ZONE_OVERRIDE[key]) return LOCALITY_ZONE_OVERRIDE[key];
  return getProvinceDefaultClimateZone(provinceName);
}

export function hasLocalityClimateOverride(
  provinceName: string,
  municipalityName: string,
): boolean {
  return `${provinceName}|${municipalityName}` in LOCALITY_ZONE_OVERRIDE;
}

/** 旧版单字段城市短名 → 省代码 + 地级市全称（与 modood 数据一致） */
export const LEGACY_SHORT_CITY_TO_SELECTION: Record<string, { pc: string; muni: string }> = {
  北京: { pc: "11", muni: "北京市" },
  天津: { pc: "12", muni: "天津市" },
  石家庄: { pc: "13", muni: "石家庄市" },
  太原: { pc: "14", muni: "太原市" },
  沈阳: { pc: "21", muni: "沈阳市" },
  长春: { pc: "22", muni: "长春市" },
  哈尔滨: { pc: "23", muni: "哈尔滨市" },
  济南: { pc: "37", muni: "济南市" },
  青岛: { pc: "37", muni: "青岛市" },
  上海: { pc: "31", muni: "上海市" },
  南京: { pc: "32", muni: "南京市" },
  杭州: { pc: "33", muni: "杭州市" },
  合肥: { pc: "34", muni: "合肥市" },
  武汉: { pc: "42", muni: "武汉市" },
  长沙: { pc: "43", muni: "长沙市" },
  南昌: { pc: "36", muni: "南昌市" },
  福州: { pc: "35", muni: "福州市" },
  厦门: { pc: "35", muni: "厦门市" },
  广州: { pc: "44", muni: "广州市" },
  深圳: { pc: "44", muni: "深圳市" },
  珠海: { pc: "44", muni: "珠海市" },
  南宁: { pc: "45", muni: "南宁市" },
  海口: { pc: "46", muni: "海口市" },
  成都: { pc: "51", muni: "成都市" },
  重庆: { pc: "50", muni: "重庆市" },
  昆明: { pc: "53", muni: "昆明市" },
  贵阳: { pc: "52", muni: "贵阳市" },
  西安: { pc: "61", muni: "西安市" },
  兰州: { pc: "62", muni: "兰州市" },
  乌鲁木齐: { pc: "65", muni: "乌鲁木齐市" },
  郑州: { pc: "41", muni: "郑州市" },
};
