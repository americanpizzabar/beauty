import { NextRequest, NextResponse } from "next/server";
import { analyzeCosmetic } from "@/lib/claude";

export async function POST(req: NextRequest) {
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
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "分析中にエラーが発生しました。もう一度お試しください。" },
      { status: 500 }
    );
  }
}
