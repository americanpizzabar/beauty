import { NextRequest, NextResponse } from "next/server";
import { deepenProductSearch } from "@/lib/claude";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json({ error: "APIキーが設定されていません。" }, { status: 500 });
  }
  try {
    const { product, question } = await req.json();
    if (!product || !question?.trim()) {
      return NextResponse.json({ error: "商品情報と質問を入力してください" }, { status: 400 });
    }
    const result = await deepenProductSearch(product, question);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `エラーが発生しました: ${message}` }, { status: 500 });
  }
}
