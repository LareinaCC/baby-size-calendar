/** 服务端暂存海报 PNG，供微信内通过 HTTPS 打开/下载（可重复访问至过期） */

type Entry = { buffer: Buffer; expiresAt: number };

const cache = new Map<string, Entry>();
const TTL_MS = 10 * 60 * 1000;

function prune(): void {
  const now = Date.now();
  cache.forEach((entry, key) => {
    if (entry.expiresAt < now) cache.delete(key);
  });
}

export function storePosterPng(buffer: Buffer): string {
  prune();
  const token = crypto.randomUUID().replace(/-/g, "");
  cache.set(token, { buffer, expiresAt: Date.now() + TTL_MS });
  return token;
}

/** 可多次读取，直至过期（避免第二次生成时链接已失效） */
export function getPosterPng(token: string): Buffer | null {
  const entry = cache.get(token);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(token);
    return null;
  }
  return entry.buffer;
}
