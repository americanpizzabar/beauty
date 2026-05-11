import { NextRequest, NextResponse } from "next/server";
import { generateColorRecipe } from "@/lib/claude";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json({ error: "APIキーが設定されていません。" }, { status: 500 });
  }
  try {
    const { hairAnalysis, colorTarget, inventory = [], hairLength = "", hairDensity = "", allergies = "" } = await req.json();
    if (!hairAnalysis) return NextResponse.json({ error: "髪の解析データが必要です" }, { status: 400 });
    const result = await generateColorRecipe(
      hairAnalysis as Record<string, unknown>,
      (colorTarget ?? {}) as Record<string, unknown>,
      (inventory as Record<string, unknown>[]),
      hairLength as string,
      hairDensity as string,
      allergies as string
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `レシピ生成中にエラーが発生しました: ${message}` }, { status: 500 });
  }
}
