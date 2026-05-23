import type { ClimateZone } from "@/lib/climate-types";
import { ZONE_LABEL } from "@/lib/climate-types";
import type { SeasonAdviceDetail } from "@/lib/baby-size-calculator";
import {
  getProvinceDefaultClimateZone,
  hasLocalityClimateOverride,
} from "@/lib/china-locality-climate";

function cityShort(municipality: string): string {
  return municipality.replace(/(市|地区|盟|州)$/, "") || municipality;
}

/** 文案用尺码：garment.size 可能已是「80 码」或「66、73 码」，避免再拼出「码 码」 */
function hintSizeLabel(raw: string): string {
  const t = raw.trim();
  if (!t || t === "见下方冬装表") return t;
  const core = t.replace(/\s*码\s*$/, "").trim();
  return core ? `${core} 码` : t;
}

function pickWinterSizes(winter: SeasonAdviceDetail): { inner: string; outer: string } {
  let inner = "见下方冬装表";
  let outer = "见下方冬装表";
  for (const g of winter.garments) {
    const cat = g.category;
    if (/连体|打底|毛衣|夹棉|哈衣|内衣|保暖/.test(cat) && inner === "见下方冬装表") {
      inner = g.size;
    }
    if (/羽绒|棉服|外套|大衣/.test(cat) && outer === "见下方冬装表") {
      outer = g.size;
    }
  }
  if (winter.garments.length > 0 && inner === "见下方冬装表") {
    inner = winter.garments[0]?.size ?? inner;
  }
  if (winter.garments.length > 0 && outer === "见下方冬装表") {
    outer = winter.garments[winter.garments.length - 1]?.size ?? outer;
  }
  return { inner, outer };
}

/** 南北提示标题里的气候标签（避免青岛等沿海城市误显示「江淮」） */
function regionalZoneTag(municipality: string, provinceName: string, zone: ClimateZone): string {
  const city = cityShort(municipality);
  const coastalShandong =
    provinceName.includes("山东") &&
    /青岛|烟台|威海|日照/.test(municipality);

  if (coastalShandong && zone === "yangtze") {
    return `${city}（山东沿海 · 湿冷无暖气为主）`;
  }
  if (zone === "north_cold" || zone === "dry_north") {
    const isBeijingLike =
      municipality.includes("北京") ||
      provinceName.includes("北京") ||
      provinceName.includes("天津") ||
      provinceName.includes("河北");
    return isBeijingLike ? `${city}（北方 · 集中供暖）` : `${city}（北方 / 干冷）`;
  }
  if (zone === "yangtze") {
    return `${city}（长江中下游 · 湿冷换季）`;
  }
  if (zone === "southwest_mild") {
    return `${city}（西南 · 湿冷偏温和）`;
  }
  return `${city}（华南 / 湿热）`;
}

/** 为何归入该气候带（结果页 / 海报展示） */
export function buildClimateZoneExplanation(
  municipality: string,
  provinceName: string,
  zone: ClimateZone,
): string {
  const city = cityShort(municipality);
  const provinceDefault = getProvinceDefaultClimateZone(provinceName);
  const overridden = hasLocalityClimateOverride(provinceName, municipality);

  if (provinceName.includes("山东") && zone === "yangtze" && /青岛|烟台|威海|日照/.test(municipality)) {
    return (
      `气候说明：山东省内陆默认按「${ZONE_LABEL.north_cold}」估算（冬季多有集中供暖）；` +
      `${city}位于山东半岛沿海，冬季海风带来高湿度、体感阴冷，且不少住宅冬季室内无集中暖气或暖气不足，` +
      `囤衣策略按「湿冷型」调整（与长江中下游室内体感相近）。` +
      `此处「湿冷」指穿衣体感分类，并非指您住在江淮地理区域。`
    );
  }

  if (overridden && provinceDefault !== zone) {
    return (
      `气候说明：已根据「${provinceName} · ${municipality}」做本地化修正：` +
      `省级默认「${ZONE_LABEL[provinceDefault]}」→ 当前「${ZONE_LABEL[zone]}」，` +
      `以便更贴近当地换季节奏与室内外温差。`
    );
  }

  return (
    `气候说明：按「${provinceName} · ${municipality}」归入「${ZONE_LABEL[zone]}」囤货模型。` +
    `若同城不同小区供暖、楼层朝向差异大，可结合下方南北穿衣提示微调。`
  );
}

/** 南北方室内穿衣差异的人性化提示 */
export function buildRegionalLivingHint(
  municipality: string,
  provinceName: string,
  zone: ClimateZone,
  winter: SeasonAdviceDetail,
): string {
  const tag = regionalZoneTag(municipality, provinceName, zone);
  const { inner, outer } = pickWinterSizes(winter);

  if (zone === "north_cold" || zone === "dry_north") {
    return `${tag}：室内常有暖气，体感偏暖。建议冬装多备透气内搭（约 ${hintSizeLabel(inner)}），厚外套（约 ${hintSizeLabel(outer)}）主要在出门、楼道和朝北房间穿即可，不必按「全天户外严寒」囤满屋厚棉服。`;
  }

  if (zone === "yangtze") {
    return `${tag}：冬季室内可能没有暖气或体感阴冷。除出门穿的厚外套（约 ${hintSizeLabel(outer)}）外，建议准备可在室内活动的保暖层（约 ${hintSizeLabel(inner)}），不要只囤「出门才穿」的一件大衣。`;
  }

  if (zone === "southwest_mild") {
    return `${tag}：室内外温差不如北方大，但阴冷天室内也建议有保暖内搭（约 ${hintSizeLabel(inner)}）；外套（约 ${hintSizeLabel(outer)}）按户外最低温准备即可。`;
  }

  return `${tag}：冬季短，厚羽绒不必囤太多；室内单层长袖往往够用，外套（约 ${hintSizeLabel(outer)}）按最冷那几周准备。`;
}

export const BRAND_SIZING_NOTE =
  "注：优衣库、Gap 等部分欧美版型常偏大，同身高可对照该品牌尺码表酌情选小一码；ZARA、部分快时尚偏修身修长，偏胖宝宝可能要选大。不同系列差异也大，下单前仍以商品详情页的身高体重对照为准。";
