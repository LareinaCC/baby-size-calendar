import Link from "next/link";
import { PERCENTILE_BAND_UI, percentileBandTitle } from "@/lib/percentile-band-labels";

export default function BabySizeCalendarAboutPage() {
  return (
    <main className="mx-auto max-w-lg px-3 pb-[max(4rem,env(safe-area-inset-bottom,0px))] pt-6 sm:px-4 sm:pb-16 sm:pt-12">
      <div className="mb-8">
        <Link
          href="/baby-size-calendar"
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          ← 返回首页
        </Link>
      </div>

      <article className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-stone-900">说明页</h1>
        <p className="mt-2 text-sm text-stone-500">宝宝尺码日历 · 囤衣计算器</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-stone-700">
          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">52、59、66、73 和「爬爬服」是什么关系？</h2>
            <p className="mt-2">
              国内常说的「码」多指<strong>身高档</strong>（如 52 表示约 52cm 档）。
            </p>
            <p className="mt-2">
              <strong>52 码</strong>多对应<strong>刚出生到满月前后</strong>（具体看身长与品牌表；早产或偏小可能多穿一阵 52）。
            </p>
            <p className="mt-2">
              <strong>59、66、73</strong>大致覆盖<strong>前几个月到半岁左右</strong>；市面上连体哈衣、包屁衣、开裆/闭裆连体多，口语里常叫「爬爬服」——同码也有分体，只是小月龄连体更常见。
            </p>
            <p className="mt-3">
              本工具映射码段时已含<strong>52</strong>档；下单前仍请以各品牌尺码表为准。
            </p>
          </section>

          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">「身高偏矮 / 中等 / 偏高」怎么选？</h2>
            <p className="mt-2">
              对应 WHO 同月龄身高标准里的三档参考线，用日常说法帮你估未来身高，不必记 P3、P50 这些代号：
            </p>
            <ul className="mt-2 list-none space-y-2.5 border-l-2 border-orange-200 pl-4">
              {(["P3", "P50", "P97"] as const).map((band) => (
                <li key={band}>
                  <strong className="text-stone-900">{percentileBandTitle(band)}</strong>
                  <span className="mt-0.5 block text-stone-600">
                    {PERCENTILE_BAND_UI[band].hint}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-2 border-t border-stone-200 pt-3">
              <p>
                <strong className="text-stone-800">未填身高：</strong>
                按你选的「偏矮 / 中等 / 偏高」对照 WHO 曲线估算。
              </p>
              <p>
                <strong className="text-stone-800">已填身高：</strong>
                先按实测匹配最接近的一档，再推算以后各月参考身高。
              </p>
            </div>
            <p className="mt-3 text-stone-600">
              体检单若写 P10、P25 等，可粗略对照「身高中等」；具体以医生解读为准。
            </p>
          </section>

          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">参考身高从哪来？</h2>
            <p className="mt-2">
              工具内置 WHO 儿童生长标准中「男童 / 女童身长（身高）」在 P3、P50、P97
              的参考值（0、1、2… 月至 60 个月等节点）。
            </p>
            <p className="mt-2">
              相邻节点之间对 P3/P50/P97 同步<strong>线性插值</strong>（身高保留一位小数）；超过 60 个月时取表中
              <strong>60 月龄</strong>那一行，不再向表外延伸。仅作买衣参考而非医学判断。
            </p>
          </section>

          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">没有填身高可以吗？</h2>
            <p className="mt-2">
              可以。未填身高时，按你选的「偏矮 / 中等 / 偏高」读取 WHO 曲线，得到当前月龄参考身高，再映射到常见码段。
            </p>
            <p className="mt-2">
              若填写了最近身高，会先判断更接近哪一档，再按 WHO 标准推算以后各月的参考身高。
            </p>
          </section>

          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">这个工具在算什么？</h2>
            <p className="mt-2">
              根据宝宝<strong>出生年月</strong>、性别、可选百分位与身高、以及你选择的<strong>所在省与地级市</strong>，估算「当前主力码段」以及夏/秋/冬三类场景的尺码推荐。
            </p>
            <p className="mt-2">
              并给出未来约 9 个月的身高与码段变化表，方便大促前一次性对齐家庭决策。
            </p>
          </section>

          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">省市列表从哪来？</h2>
            <p className="mt-2">
              省与地级市名称来自开源区划数据（国家统计局口径的省 / 地级条目），在页面上分两级选择。
            </p>
            <p className="mt-2">
              气候带先按<strong>省级默认</strong>归类，再对部分地级市做<strong>修正</strong>（例如山东半岛部分城市按江淮换季体验处理），不调用实时气象接口。
            </p>
          </section>

          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">气候带起什么作用？</h2>
            <p className="mt-2">
              仅用于粗略影响「冬装厚度与囤货量」「外套是否要留叠穿松量」等文字建议；同一省内城市默认一致，除非命中少数覆盖规则。
            </p>
          </section>

          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">为什么不给「绝对正确」的码？</h2>
            <p className="mt-2">
              童装版型、裆长、肩宽、国标与品牌自有尺码表差异很大；同身高也可能因胖瘦、穿衣习惯而不同。本工具输出的是决策辅助文案，下单前仍建议对照具体商品的尺码表与评价里的「身高体重对照」。
            </p>
          </section>

          <section className="text-pretty">
            <h2 className="font-semibold text-stone-900">数据隐私</h2>
            <p className="mt-2">
              当前版本仅在浏览器跳转时通过 URL 查询参数传递你填写的信息，用于生成结果页；不会写入服务器数据库（除非你后续自行接入统计或账号体系）。
            </p>
          </section>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/baby-size-calendar"
            className="inline-flex justify-center rounded-xl bg-orange-500 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-orange-600"
          >
            去填写宝宝信息
          </Link>
          <Link
            href="/baby-size-calendar/result?birth=2023-06-01&pc=31&muni=上海市&gender=boy&p=P50&height=85&weight=11"
            className="inline-flex justify-center rounded-xl border border-stone-200 bg-stone-50 px-5 py-3 text-center text-sm font-medium text-stone-800 hover:bg-stone-100"
          >
            查看示例结果
          </Link>
        </div>
      </article>
    </main>
  );
}
