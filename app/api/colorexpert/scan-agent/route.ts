import { NextRequest, NextResponse } from "next/server";
import { extractColorAgentFromImage, extractColorAgentFromUrl } from "@/lib/claude";

const VALID_TYPES = ["base", "control", "oxi"];

function sanitize(raw: Record<string, unknown>) {
  return {
    brand: String(raw.brand ?? ""),
    series: String(raw.series ?? ""),
    name: String(raw.name ?? ""),
    code: String(raw.code ?? ""),
    type: VALID_TYPES.includes(String(raw.type)) ? (raw.type as "base" | "control" | "oxi") : "base",
    level: typeof raw.level === "number" ? raw.level : null,
  };
}

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json({ error: "APIキーが設定されていません。" }, { status: 500 });
  }
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File;
      if (!file) return NextResponse.json({ error: "画像が見つかりません" }, { status: 400 });
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = file.type || "image/jpeg";
      const raw = await extractColorAgentFromImage(base64, mimeType);
      return NextResponse.json(sanitize(raw as Record<string, unknown>));
    } else {
      const { url } = await req.json();
      if (!url) return NextResponse.json({ error: "URLを入力してください" }, { status: 400 });
      const raw = await extractColorAgentFromUrl(url as string);
      return NextResponse.json(sanitize(raw as Record<string, unknown>));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `スキャン中にエラーが発生しました: ${message}` }, { status: 500 });
  }
}
