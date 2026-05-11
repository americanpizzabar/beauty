import { NextRequest, NextResponse } from "next/server";
import { compareProducts } from "@/lib/claude";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json({ error: "APIキーが設定されていません。" }, { status: 500 });
  }
  try {
    const { products } = await req.json();
    if (!products || products.length < 2) {
      return NextResponse.json({ error: "2つ以上の商品を選択してください" }, { status: 400 });
    }
    if (products.length > 3) {
      return NextResponse.json({ error: "比較できるのは最大3つまでです" }, { status: 400 });
    }
    const result = await compareProducts(products as Record<string, unknown>[]);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `比較中にエラーが発生しました: ${message}` }, { status: 500 });
  }
}
