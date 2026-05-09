import { NextRequest, NextResponse } from "next/server";
import { freeSearch } from "@/lib/claude";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json(
      { error: "APIキーが設定されていません。.env.local に GEMINI_API_KEY を設定してください。" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { query } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: "検索クエリを入力してください" }, { status: 400 });
    }

    const result = await freeSearch(query);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Search error:", message);

    if (message.includes("401") || message.includes("authentication") || message.includes("api_key")) {
      return NextResponse.json(
        { error: "APIキーが無効です。ANTHROPIC_API_KEY を確認してください。" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: `検索中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}
