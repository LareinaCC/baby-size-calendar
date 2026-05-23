import { NextResponse } from "next/server";
import { storePosterPng } from "@/lib/poster-export-cache";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 12 * 1024 * 1024;

function parseBase64Image(raw: string): Buffer | null {
  const trimmed = raw.trim();
  const base64 = trimmed.includes(",") ? (trimmed.split(",")[1] ?? "") : trimmed;
  if (!base64) return null;
  try {
    const buf = Buffer.from(base64, "base64");
    if (buf.length < 100 || buf.length > MAX_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { image?: string };
  try {
    body = (await req.json()) as { image?: string };
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const buf = body.image ? parseBase64Image(body.image) : null;
  if (!buf) {
    return NextResponse.json({ error: "invalid image" }, { status: 400 });
  }

  const token = storePosterPng(buf);
  return NextResponse.json({
    url: `/api/baby-size-calendar/poster/${token}`,
  });
}
