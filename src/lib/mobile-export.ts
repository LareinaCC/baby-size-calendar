/** 移动端 / 微信内保存图片 */

export function isWeChatBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isValidImageBlob(blob: Blob | null | undefined): boolean {
  return Boolean(blob && blob.size > 500);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadBlobAsFile(blob: Blob, filename: string): boolean {
  try {
    if (!isValidImageBlob(blob)) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch {
    return false;
  }
}

export async function createServerDownloadUrl(
  blob: Blob,
  options?: { attachment?: boolean },
): Promise<string> {
  const dataUrl = await blobToBase64(blob);
  const res = await fetch("/api/baby-size-calendar/poster", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: dataUrl }),
  });
  if (!res.ok) throw new Error("upload failed");
  const json = (await res.json()) as { url?: string };
  if (!json.url) throw new Error("no url");
  const q = options?.attachment ? "?dl=1" : "";
  return `${window.location.origin}${json.url}${q}`;
}

/** 微信内：在当前页预览 PNG（可长按保存），与 attachment 强制下载区分 */
export function openPosterInWeChat(absoluteUrl: string): void {
  window.location.assign(absoluteUrl);
}

/**
 * 保存长图：优先本机 Blob；微信内失败则用同源预览链接（可多次生成）。
 */
export async function savePosterBlob(
  blob: Blob,
  filename: string,
): Promise<"blob" | "preview" | "download"> {
  if (!isValidImageBlob(blob)) {
    throw new Error("empty image");
  }

  if (downloadBlobAsFile(blob, filename)) {
    return "blob";
  }

  if (isWeChatBrowser()) {
    const previewUrl = await createServerDownloadUrl(blob, { attachment: false });
    openPosterInWeChat(previewUrl);
    return "preview";
  }

  throw new Error("download blocked");
}
