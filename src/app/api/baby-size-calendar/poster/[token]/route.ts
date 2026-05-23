import { NextResponse } from "next/server";
import { getPosterPng } from "@/lib/poster-export-cache";

export const runtime = "nodejs";

type Params = { params: { token: string } };

export async function GET(_req: Request, { params }: Params) {
  const token = params.token?.replace(/[^a-f0-9]/gi, "");
  if (!token || token.length < 16) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const buf = getPosterPng(token);
  if (!buf) {
    return NextResponse.json({ error: "expired" }, { status: 404 });
  }

  const { searchParams } = new URL(_req.url);
  const asAttachment = searchParams.get("dl") === "1";

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": asAttachment
        ? 'attachment; filename="baby-size-list.png"'
        : 'inline; filename="baby-size-list.png"',
      "Cache-Control": "no-store, no-cache",
      "Content-Length": String(buf.length),
    },
  });
}
