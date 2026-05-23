"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type Ctx = {
  registerDownload: (fn: () => Promise<void>) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

const PosterDownloadContext = createContext<Ctx | null>(null);

export function PosterDownloadProvider({ children }: { children: ReactNode }) {
  const downloadRef = useRef<(() => Promise<void>) | null>(null);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const registerDownload = useCallback((fn: () => Promise<void>) => {
    downloadRef.current = fn;
  }, []);

  const trigger = useCallback(() => {
    void downloadRef.current?.();
    document.getElementById("export-poster")?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  const stickyBar =
    mounted &&
    createPortal(
      <div
        className="fixed inset-x-0 bottom-0 z-[9999] border-t border-orange-200 bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_28px_rgba(28,25,23,0.12)]"
        role="region"
        aria-label="保存清单长图"
      >
        <div className="mx-auto flex w-full max-w-lg flex-col gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={trigger}
            className="min-h-12 w-full rounded-xl bg-orange-500 px-4 py-3.5 text-base font-semibold text-white shadow-md active:scale-[0.99] hover:bg-orange-600 disabled:opacity-60"
          >
            {busy ? "正在生成图片…" : "保存清单长图"}
          </button>
          <p className="text-center text-[10px] text-stone-500">
            固定在屏幕底部 · 含购买清单与尺码日历
          </p>
        </div>
      </div>,
      document.body,
    );

  return (
    <PosterDownloadContext.Provider
      value={{ registerDownload, busy, setBusy }}
    >
      {children}
      {stickyBar}
    </PosterDownloadContext.Provider>
  );
}

export function usePosterDownload() {
  const ctx = useContext(PosterDownloadContext);
  if (!ctx) {
    throw new Error("usePosterDownload must be used within PosterDownloadProvider");
  }
  return ctx;
}
