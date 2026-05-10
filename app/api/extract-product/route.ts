import { NextRequest, NextResponse } from "next/server";
import { extractProductFromUrl, analyzeCosmetic } from "@/lib/claude";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json({ error: "APIキーが設定されていません。" }, { status: 500 });
  }
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Camera photo
      const formData = await req.formData();
      const file = formData.get("image") as File;
      if (!file) return NextResponse.json({ error: "画像が見つかりません" }, { status: 400 });
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      const mimeType = file.type || "image/jpeg";
      const result = await analyzeCosmetic(base64, mimeType);
      // Return simplified product info
      return NextResponse.json({
        name: result.productName || "不明",
        brand: result.brand || "不明",
        category: result.category || "",
        price: "",
        description: result.overview || "",
        key_ingredients: result.ingredients?.map((i: { name: string }) => i.name) || [],
        skin_types: result.skinTypes?.map((s: { type: string }) => s.type) || [],
        concerns: result.effects?.map((e: { name: string }) => e.name) || [],
        how_to_use: result.usage || "",
      });
    } else {
      // URL extraction
      const { url, description } = await req.json();
      if (!url) return NextResponse.json({ error: "URLを入力してください" }, { status: 400 });
      const result = await extractProductFromUrl(url, description);
      return NextResponse.json(result);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `抽出中にエラーが発生しました: ${message}` }, { status: 500 });
  }
}
