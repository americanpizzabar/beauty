import { NextRequest, NextResponse } from "next/server";
import { checkProductsStatus } from "@/lib/claude";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json(
      { error: "APIキーが設定されていません。" },
      { status: 500 }
    );
  }
  try {
    const { products } = await req.json();
    if (!products?.length) {
      return NextResponse.json({ error: "商品リストが空です" }, { status: 400 });
    }
    const result = await checkProductsStatus(products);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `確認中にエラーが発生しました: ${message}` }, { status: 500 });
  }
}
