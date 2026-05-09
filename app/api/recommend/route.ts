import { NextRequest, NextResponse } from "next/server";
import { getRecommendations } from "@/lib/claude";
import { searchProducts } from "@/lib/db";

export async function POST(req: NextRequest) {
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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Recommendation error:", error);
    return NextResponse.json(
      { error: "推薦の生成中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
