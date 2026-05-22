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
  const priceRanges = Array.isArray(skinProfile.priceRanges) && (skinProfile.priceRanges as string[]).length > 0
    ? `希望価格帯: ${(skinProfile.priceRanges as string[]).join("、")}`
    : "";
  const prompt = useDatabase && dbProducts?.length
    ? `あなたはプロの美容コンサルタントです。お客様の肌データに基づいて最適な化粧品を推薦してください。

お客様のプロフィール:
${JSON.stringify(skinProfile, null, 2)}
${priceRanges}

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
${priceRanges}

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

JSON形式で回答（コードブロックなし）。purchaseUrlは含めないこと:
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
      "reasons": ["理由1", "理由2", "理由3"],
      "howToUse": "使用方法（該当する場合）",
      "keyIngredients": ["成分1", "成分2", "成分3"],
      "source": "internet"
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

// ── 商品深掘り検索 ────────────────────────────────────
export async function deepenProductSearch(
  product: { name: string; brand: string; category: string; price?: string; keyIngredients?: string[] },
  question: string
) {
  const prompt = `あなたはプロの美容コンサルタントです。以下の化粧品・美容品についての追加質問に詳しく答えてください。

商品: ${product.brand} ${product.name}（${product.category}）
価格: ${product.price || "不明"}
主成分: ${product.keyIngredients?.join(", ") || "不明"}

質問: 「${question}」

JSON形式のみで回答（コードブロックなし）:
{
  "answer": "詳しい回答（3-5文）",
  "tips": ["追加のアドバイスや注意点1", "追加のアドバイスや注意点2", "追加のアドバイスや注意点3"],
  "relatedProducts": ["関連するおすすめ商品名1（あれば）", "関連するおすすめ商品名2（あれば）"]
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

// ── COLOREXPERT: カラー剤スキャン（画像） ───────────────
export async function extractColorAgentFromImage(imageBase64: string, mimeType: string) {
  const prompt = `あなたはプロのヘアカラーリストです。この写真に写っているカラー剤（ヘアカラー薬剤）の情報を抽出してください。

JSON形式のみで回答してください（コードブロックなし）:
{
  "brand": "ブランド名（例：WELLA, MILBON, SHISEIDO PROFESSIONAL, Lebel, THROW）",
  "series": "シリーズ名（例：イルミナカラー、アディクシーカラー、N.カラー）",
  "name": "商品名・カラー名（例：LAVENDER, DEEP SMOKY, SMOKY BEIGE）",
  "code": "カラーコード（例：6LA, 7V, 9OL など。不明なら空文字）",
  "type": "base/control/oxi",
  "level": 1から20の整数またはnull
}

typeの判断基準:
- base: 1剤・メインカラー剤
- control: コントロール剤・補色剤
- oxi: 2剤・オキシ・過酸化水素水`;

  const text = await generateWithFallback(() => [
    { inlineData: { data: imageBase64, mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif" } },
    { text: prompt },
  ]);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── COLOREXPERT: カラー剤スキャン（URL） ────────────────
export async function extractColorAgentFromUrl(url: string) {
  const prompt = `あなたはプロのヘアカラーリストです。以下のURLの商品ページからカラー剤情報を抽出してください。

URL: ${url}

URLのドメイン・パス・パラメータから製品を特定し、JSON形式のみで回答してください（コードブロックなし）:
{
  "brand": "ブランド名",
  "series": "シリーズ名",
  "name": "商品名・カラー名",
  "code": "カラーコード（例：6LA, 7V など。不明なら空文字）",
  "type": "base/control/oxi",
  "level": 1から20の整数またはnull
}`;

  const text = await generateWithFallback(() => prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── COLOREXPERT: 髪質・色調解析 ─────────────────────────
export async function analyzeHairFromImage(imageBase64: string, mimeType: string) {
  const prompt = `あなたはプロのヘアカラーリストです。この髪の写真を専門家の視点で詳しく分析してください。

レベルスケール: 1（黒）〜 6（ナチュラルブラウン）〜 10（ゴールド）〜 14（ペール）〜 20（ホワイト）

JSON形式のみで回答してください（コードブロックなし）:
{
  "zones": {
    "roots": { "level": 1から20の整数, "undertone": "赤み/黄み/オレンジみ等", "damage": "healthy/mild/moderate/severe", "notes": "根元の状態" },
    "mid": { "level": 整数, "undertone": "...", "damage": "...", "notes": "中間の状態" },
    "tips": { "level": 整数, "undertone": "...", "damage": "...", "notes": "毛先の状態" }
  },
  "overallDamage": "healthy/mild/moderate/severe",
  "damageDetails": "ダメージの詳細説明（2-3文）",
  "undertoneAnalysis": { "red": 0から100, "yellow": 0から100, "orange": 0から100 },
  "undertoneDescription": "残留色素のアンダートーン説明",
  "cuticleCondition": "キューティクルの状態",
  "recommendedOxi": "3%または6%またはAC",
  "porosity": "low/medium/high",
  "elasticity": "good/normal/poor",
  "notes": "プロとしての施術上の注意コメント"
}`;

  const text = await generateWithFallback(() => [
    { inlineData: { data: imageBase64, mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif" } },
    { text: prompt },
  ]);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── COLOREXPERT: ターゲットカラー解析 ───────────────────
export async function analyzeTargetColor(description?: string, imageBase64?: string, mimeType?: string) {
  const descLine = description ? `目標の説明: ${description}\n` : "";
  const prompt = `あなたはプロのヘアカラーリストです。${imageBase64 ? "この参考画像のヘアカラー" : "以下の目標カラーの説明"}を分析してください。\n${descLine}
JSON形式のみで回答してください（コードブロックなし）:
{
  "targetLevel": 1から20,
  "hue": "色相の説明",
  "saturation": "vivid/natural/muted",
  "toneFamily": "アッシュ/マット/ウォーム/ベージュ/ラベンダー/ピンク/シルバー等",
  "colorDescription": "詳しい色の説明（2-3文）",
  "baseColorNeeded": "実現に必要なベースカラーのレベル・条件",
  "processDifficulty": "easy/moderate/challenging",
  "notes": "達成のための重要ポイント"
}`;

  const text = imageBase64 && mimeType
    ? await generateWithFallback(() => [
        { inlineData: { data: imageBase64, mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif" } },
        { text: prompt },
      ])
    : await generateWithFallback(() => prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

// ── COLOREXPERT: レシピ生成 ──────────────────────────────
export async function generateColorRecipe(
  hairAnalysis: Record<string, unknown>,
  colorTarget: Record<string, unknown>,
  inventory: Record<string, unknown>[],
  hairLength: string,
  hairDensity: string,
  allergies: string
) {
  const inventorySection = inventory.length > 0
    ? `利用可能な薬剤在庫:\n${JSON.stringify(inventory, null, 2)}`
    : "在庫情報なし（一般的な薬剤を使用してください）";

  const prompt = `あなたはプロのヘアカラーリストです。以下のデータから最適なカラーレシピを作成してください。

【現在の髪の状態】
${JSON.stringify(hairAnalysis, null, 2)}

【目標カラー】
${JSON.stringify(colorTarget, null, 2)}

【${inventorySection}】

【施術情報】
髪の長さ: ${hairLength || "不明"}
毛量: ${hairDensity || "不明"}
アレルギー・禁忌: ${allergies || "なし"}

在庫がある場合は在庫の薬剤を優先し、ない場合は一般的な薬剤名を使用してください。
アレルギー情報がある場合は必ずwarningsに含め、危険な施術は強くブロックしてください。

JSON形式のみで回答してください（コードブロックなし）:
{
  "steps": [
    {
      "stepNumber": 1,
      "area": "全体/根元/中間/毛先",
      "agents": [
        { "role": "ベース/コントロール/オキシ", "name": "商品名", "brand": "ブランド", "code": "コード例:6LA", "amount": 数値, "unit": "g" }
      ],
      "processingTime": 分数（整数）,
      "temperature": "room/warm/cool",
      "instructions": "この工程の塗布手順と注意事項"
    }
  ],
  "totalTime": 総放置時間（分・整数）,
  "totalAmount": 総グラム数（整数）,
  "warnings": ["注意事項1", "注意事項2"],
  "allergySafety": "アレルギーに関する安全性コメント",
  "aftercare": "施術後のホームケアアドバイス",
  "notes": "プロとしての施術上の補足コメント"
}`;

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
