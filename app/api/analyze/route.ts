import { NextRequest, NextResponse } from "next/server";
import { analyzeCosmetic } from "@/lib/claude";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === "your_api_key_here") {
    return NextResponse.json(
      { error: "APIキーが設定されていません。.env.local に ANTHROPIC_API_KEY を設定してください。" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;

    if (!file) {
      return NextResponse.json({ error: "画像が見つかりません" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    const result = await analyzeCosmetic(base64, mimeType);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Analysis error:", message);

    if (message.includes("401") || message.includes("authentication") || message.includes("api_key")) {
      return NextResponse.json(
        { error: "APIキーが無効です。ANTHROPIC_API_KEY を確認してください。" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: `分析中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}
