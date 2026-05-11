import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-1.5-flash"];

async function generateWithFallback(
  buildContent: () => Parameters<GenerativeModel["generateContent"]>[0]
): Promise<string> {
  let lastError: Error | null = null;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(buildContent());
      return result.response.text();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const msg = lastError.message;
      if (msg.includes("429") || msg.includes("quota") || msg.includes("limit: 0") || msg.includes("403")) {
        continue;
      }
      throw lastError;
    }
  }
  throw lastError || new Error("All models failed");
}

// ── 製品画像分析 ────────────────────────────────────────
export async function analyzeCosmetic(imageBase64: string, mimeType: string) {
  const prompt = `あなたはプロの美容・化粧品専門家です。この画像の化粧品・美容品を詳しく分析してください。

以下のJSON形式で回答してください（コードブロックなし、純粋なJSONのみ）:
{
  "productName": "製品名（画像から読み取れる場合）",
  "brand": "ブランド名",
  "category": "カテゴリー（美容液/保湿クリーム/洗顔料/日焼け止め等）",
  "overview": "製品の概要説明（2-3文）",
  "effects": [
    { "name": "効果名", "description": "詳細説明", "intensity": "high/medium/low" }
  ],
  "ingredients": [
    { "name": "成分名", "purpose": "目的・役割", "safety": "safe/caution/avoid", "concentration": "配合濃度（推定・任意）" }
  ],
  "skinTypes": [
    { "type": "肌タイプ（乾燥肌/脂性肌/混合肌/敏感肌/普通肌）", "compatibility": "excellent/good/fair/poor", "reason": "相性の理由" }
  ],
  "irritants": [
    { "name": "刺激成分名", "risk": "high/medium/low", "description": "リスクの説明" }
  ],
  "usage": "正しい使い方・使用方法",
  "rating": { "hydration": 0から100, "brightening": 0から100, "antiAging": 0から100, "sensitivity": 0から100 },
  "expertAdvice": "プロとしてのアドバイス（2-3文）",
  "warnings": ["注意事項1", "注意事項2"]
}

画像から読み取れない情報は外観・カテゴリーから推定してください。日本語で詳しく、丁寧に回答してください。`;

  const text = await generateWithFallback(() => [
    { inlineData: { data: imageBase64, mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif" } },
    { text: prompt },
  ]);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── 商品情報をURLや説明から抽出 ────────────────────────
export async function extractProductFromUrl(url: string, description?: string) {
  const prompt = `あなたはプロの美容・化粧品専門家です。以下の情報から化粧品・美容品の詳細情報を抽出・推測してください。

URL: ${url}
追加情報: ${description || "なし"}

URLのドメインやパス、商品名などから製品を特定し、JSON形式で回答してください（コードブロックなし）:
{
  "name": "製品名",
  "brand": "ブランド名",
  "category": "カテゴリー",
  "price": "参考価格（不明な場合は空文字）",
  "description": "製品説明",
  "key_ingredients": ["主要成分1", "主要成分2"],
  "skin_types": ["適した肌タイプ1", "適した肌タイプ2"],
  "concerns": ["対応する悩み1", "対応する悩み2"],
  "how_to_use": "使用方法"
}`;

  const text = await generateWithFallback(() => prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── パーソナル推薦 ──────────────────────────────────────
export async function getRecommendations(
  skinProfile: Record<string, unknown>,
  searchQuery: string,
  useDatabase: boolean,
  dbProducts?: Record<string, unknown>[]
) {
  const priceRange = skinProfile.priceRange ? `希望価格帯: ${skinProfile.priceRange}` : "";
  const prompt = useDatabase && dbProducts?.length
    ? `あなたはプロの美容コンサルタントです。お客様の肌データに基づいて最適な化粧品を推薦してください。

お客様のプロフィール:
${JSON.stringify(skinProfile, null, 2)}
${priceRange}

お探しの商品: ${searchQuery}

以下のデータベース商品の中から最適なものを推薦してください（希望価格帯がある場合は価格も考慮してください）:
${JSON.stringify(dbProducts, null, 2)}

JSON形式で回答（コードブロックなし）:
{
  "products": [
    {
      "id": "商品ID",
      "name": "商品名",
      "brand": "ブランド",
      "category": "カテゴリー",
      "price": "価格",
      "matchScore": 0から100,
      "reasons": ["推薦理由1", "推薦理由2", "推薦理由3"],
      "howToUse": "使用方法",
      "keyIngredients": ["主要成分1", "主要成分2"],
      "source": "database",
      "purchaseUrl": "公式サイトURL or 購入できるサイトのURL（推定でも可）"
    }
  ],
  "skinAnalysis": "肌の状態分析（2-3文）",
  "routineAdvice": "スキンケアルーティンのアドバイス",
  "expertNote": "専門家からのメモ"
}`
    : `あなたはプロの美容コンサルタントです。お客様の肌データに基づいて最適な化粧品を推薦してください。

お客様のプロフィール:
${JSON.stringify(skinProfile, null, 2)}
${priceRange}

お探しの商品: ${searchQuery}

インターネット上の知識から最適な化粧品・美容品を5つ推薦してください（希望価格帯がある場合は価格も考慮してください）。

JSON形式で回答（コードブロックなし）:
{
  "products": [
    {
      "id": "product-1",
      "name": "商品名",
      "brand": "ブランド名",
      "category": "カテゴリー",
      "price": "参考価格",
      "matchScore": 0から100,
      "reasons": ["推薦理由1", "推薦理由2", "推薦理由3"],
      "howToUse": "使用方法",
      "keyIngredients": ["主要成分1", "主要成分2"],
      "source": "internet",
      "purchaseUrl": "公式サイトURL or 購入できるサイトのURL（推定でも可）"
    }
  ],
  "skinAnalysis": "肌の状態分析（2-3文）",
  "routineAdvice": "スキンケアルーティンのアドバイス",
  "expertNote": "専門家からのメモ"
}`;

  const text = await generateWithFallback(() => prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── フリー検索 ──────────────────────────────────────────
export async function freeSearch(query: string) {
  const prompt = `あなたはプロの美容コンサルタントです。最新の美容・化粧品の知識を持ち、あらゆる美容に関する質問に詳しく答えます。

以下の質問・検索に対して、プロの美容コンサルタントとして詳しく回答してください:
「${query}」

JSON形式で回答（コードブロックなし）:
{
  "query": "入力されたクエリ",
  "results": [
    {
      "id": "result-1",
      "name": "商品名または情報タイトル",
      "brand": "ブランド（該当する場合）",
      "category": "カテゴリー",
      "price": "参考価格（該当する場合）",
      "matchScore": 85,
      "reasons": ["理由1", "理由2"],
      "howToUse": "使用方法（該当する場合）",
      "keyIngredients": ["成分1", "成分2"],
      "source": "internet",
      "purchaseUrl": "公式サイトURL or 購入できるURLの推定"
    }
  ],
  "summary": "検索結果の総合まとめ（2-3文）",
  "expertAdvice": "専門家からのアドバイス（2-3文）"
}`;

  const text = await generateWithFallback(() => prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── 商品比較 ────────────────────────────────────────────
export async function compareProducts(products: Record<string, unknown>[]) {
  const prompt = `あなたはプロの美容・化粧品専門家です。以下の${products.length}つの化粧品・美容品を詳しく比較分析してください。

比較商品:
${JSON.stringify(products, null, 2)}

各商品の成分・効果・価格・適した肌タイプなどを踏まえて詳細に比較し、JSON形式で回答してください（コードブロックなし）:
{
  "comparison": "全商品の総合的な比較分析（3-4文）",
  "winner": "総合的に最もおすすめの商品名（特定できない場合はnull）",
  "products": [
    {
      "id": "商品ID",
      "name": "商品名",
      "brand": "ブランド",
      "scores": {
        "hydration": 0から100（保湿力）,
        "brightening": 0から100（美白・透明感）,
        "antiAging": 0から100（エイジングケア）,
        "sensitivity": 0から100（敏感肌への優しさ）,
        "valueForMoney": 0から100（コスパ）
      },
      "strengths": ["強み1", "強み2", "強み3"],
      "weaknesses": ["弱み1", "弱み2"],
      "bestFor": "どんな人に向いているか（1-2文）"
    }
  ],
  "recommendation": "どのような人にどの商品をすすめるか、購入アドバイス（2-3文）"
}

比較商品リスト全${products.length}商品を必ずproductsに含めてください。`;

  const text = await generateWithFallback(() => prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── 商品ステータス確認 ──────────────────────────────────
export async function checkProductsStatus(
  products: { id: string; name: string; brand: string; category: string }[]
) {
  const prompt = `あなたはプロの美容・化粧品専門家です。以下の化粧品・美容品が現在も販売されているか、廃盤になったか、リニューアルされたかを確認してください。

商品リスト:
${JSON.stringify(products, null, 2)}

知識の範囲内で各商品のステータスを確認し、JSON形式で回答してください（コードブロックなし）:
{
  "results": [
    {
      "id": "商品ID",
      "name": "商品名",
      "brand": "ブランド",
      "status": "active/discontinued/updated/unknown",
      "statusNote": "ステータスの詳細説明（例：2023年にリニューアル、廃盤等）",
      "newProductName": "リニューアル後の商品名（updatedの場合）"
    }
  ],
  "checkedAt": "確認日時の説明",
  "note": "全体的な注意事項（情報が古い可能性など）"
}`;

  const text = await generateWithFallback(() => prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}
