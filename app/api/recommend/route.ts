import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/claude";
import { searchProducts } from "@/lib/db";
import { verifyUrls } from "@/lib/verifyUrl";
import type { ProductRecommendation } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
    return NextResponse.json(
      { error: "APIキーが設定されていません。.env.local に GEMINI_API_KEY を設定してください。" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { skinProfile, searchQuery, useDatabase } = body;

    let dbProducts: Record<string, unknown>[] | undefined;

    if (useDatabase) {
      const concerns = skinProfile.concerns || [];
      dbProducts = (searchProducts(
        searchQuery,
        skinProfile.skinType,
        concerns
      ) as unknown) as Record<string, unknown>[];
    }

    const result = await getRecommendations(
      skinProfile,
      searchQuery,
      useDatabase,
      dbProducts
    );

    if (Array.isArray(result.products)) {
      const products = result.products as ProductRecommendation[];
      const flags = await verifyUrls(products.map(p => p.purchaseUrl));
      result.products = products.map((p, i) => ({
        ...p,
        urlVerified: flags[i],
        purchaseUrl: flags[i] ? p.purchaseUrl : undefined,
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Recommendation error:", message);

    if (message.includes("401") || message.includes("authentication") || message.includes("api_key")) {
      return NextResponse.json(
        { error: "APIキーが無効です。ANTHROPIC_API_KEY を確認してください。" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: `推薦の生成中にエラーが発生しました: ${message}` },
      { status: 500 }
    );
  }
}
