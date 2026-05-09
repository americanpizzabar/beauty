import { NextRequest, NextResponse } from "next/server";
import { freeSearch } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: "検索クエリを入力してください" }, { status: 400 });
    }

    const result = await freeSearch(query);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "検索中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
