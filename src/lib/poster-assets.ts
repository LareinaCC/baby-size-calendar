/** 海报底部公众号图：展示用静态路径，导出用内嵌 base64（微信内不依赖 fetch） */

import { WECHAT_BANNER_DATA_URL } from "@/lib/wechat-banner-data-url";

export { WECHAT_BANNER_DATA_URL };

/** 与 public/baby-size-calendar/wechat-cc-banner.png 对应（结果页展示） */
export const WECHAT_BANNER_PATH = "/baby-size-calendar/wechat-cc-banner.png";

export const POSTER_BANNER_IMG_SELECTOR = "img[data-poster-banner]";

export function wechatBannerPublicUrl(): string {
  if (typeof window === "undefined") return WECHAT_BANNER_PATH;
  return `${window.location.origin}${WECHAT_BANNER_PATH}`;
}

/** 导出长图时必须用内嵌图，避免微信内请求静态资源失败 */
export function getPosterBannerDataUrl(): string {
  return WECHAT_BANNER_DATA_URL;
}

/** 导出前：强制把海报内公众号图设为已内嵌的 data URL */
export async function applyWechatBannerForPosterExport(
  img: HTMLImageElement,
): Promise<void> {
  const dataUrl = getPosterBannerDataUrl();
  img.removeAttribute("crossorigin");
  img.loading = "eager";
  img.decoding = "sync";
  img.src = dataUrl;

  if (img.complete && img.naturalWidth > 0) {
    await img.decode().catch(() => undefined);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("banner inline load failed"));
    };
    const cleanup = () => {
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
  });
  await img.decode().catch(() => undefined);

  if (img.naturalWidth <= 0) {
    throw new Error("banner has zero width");
  }
}

export function posterExportPixelRatio(elementHeight: number, width = 750): number {
  const limit = 16384;
  const h = Math.max(elementHeight, width, 1);
  let ratio = Math.min(3, Math.max(1, Math.floor(limit / h)));
  if (typeof navigator !== "undefined") {
    const wechatIos =
      /MicroMessenger/i.test(navigator.userAgent) &&
      /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (wechatIos) ratio = Math.min(ratio, 2);
  }
  return ratio;
}
