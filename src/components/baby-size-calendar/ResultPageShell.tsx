"use client";

import type { ReactNode } from "react";
import { PosterDownloadProvider } from "@/components/baby-size-calendar/poster-download-context";

type Props = {
  children: ReactNode;
};

/** 结果页客户端外壳：挂载底部固定「保存清单长图」条（挂到 body，避免被布局挡住） */
export function ResultPageShell({ children }: Props) {
  return <PosterDownloadProvider>{children}</PosterDownloadProvider>;
}
