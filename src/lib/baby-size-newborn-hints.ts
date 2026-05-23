/** 新生儿 / 前 3 月龄家长的囤衣避坑提示 */
export function buildNewbornParentTips(ageMonths: number): string[] {
  if (ageMonths > 3) return [];

  return [
    "不要囤太多 52 码：52 码通常只能穿满月，甚至有的偏大宝宝半个月就穿不下了。建议 52 码备 2–3 件，主力直接囤 59 码。",
    "不要买套头衫：新生儿骨骼软，前三个月（59、66 码）只买蝴蝶衣、绑带衣或前开扣的哈衣。",
  ];
}
