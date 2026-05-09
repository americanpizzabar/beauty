import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function analyzeCosmetic(imageBase64: string, mimeType: string) {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `あなたはプロの美容・化粧品専門家です。この画像の化粧品・美容品を詳しく分析してください。

以下のJSON形式で回答してください（コードブロックなし、純粋なJSONのみ）:
{
  "productName": "製品名（画像から読み取れる場合）",
  "brand": "ブランド名",
  "category": "カテゴリー（美容液/保湿クリーム/洗顔料/日焼け止め等）",
  "overview": "製品の概要説明（2-3文）",
  "effects": [
    {
      "name": "効果名",
      "description": "詳細説明",
      "intensity": "high/medium/low"
    }
  ],
  "ingredients": [
    {
      "name": "成分名",
      "purpose": "目的・役割",
      "safety": "safe/caution/avoid",
      "concentration": "配合濃度（推定・任意）"
    }
  ],
  "skinTypes": [
    {
      "type": "肌タイプ（乾燥肌/脂性肌/混合肌/敏感肌/普通肌）",
      "compatibility": "excellent/good/fair/poor",
      "reason": "相性の理由"
    }
  ],
  "irritants": [
    {
      "name": "刺激成分名",
      "risk": "high/medium/low",
      "description": "リスクの説明"
    }
  ],
  "usage": "正しい使い方・使用方法",
  "rating": {
    "hydration": 0〜100の数値,
    "brightening": 0〜100の数値,
    "antiAging": 0〜100の数値,
    "sensitivity": 0〜100の数値（高いほど敏感肌向け）
  },
  "expertAdvice": "プロとしてのアドバイス（2-3文）",
  "warnings": ["注意事項1", "注意事項2"]
}

画像から読み取れない情報は、カテゴリーや外観から推定して回答してください。
日本語で詳しく、丁寧に回答してください。`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

export async function getRecommendations(
  skinProfile: Record<string, unknown>,
  searchQuery: string,
  useDatabase: boolean,
  dbProducts?: Record<string, unknown>[]
) {
  const systemPrompt = `あなたはプロの美容コンサルタントです。お客様の肌データに基づいて、最適な化粧品・美容品を推薦します。
科学的根拠に基づいた、詳細で親切なアドバイスを提供してください。`;

  const userPrompt = useDatabase && dbProducts?.length
    ? `お客様の肌プロフィール:
${JSON.stringify(skinProfile, null, 2)}

お探しの商品: ${searchQuery}

以下のデータベース商品の中から最適なものを推薦してください:
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
      "matchScore": 0〜100,
      "reasons": ["推薦理由1", "推薦理由2", "推薦理由3"],
      "howToUse": "使用方法",
      "keyIngredients": ["主要成分1", "主要成分2"],
      "source": "database"
    }
  ],
  "skinAnalysis": "肌の状態分析（2-3文）",
  "routineAdvice": "スキンケアルーティンのアドバイス",
  "expertNote": "専門家からのメモ"
}`
    : `お客様の肌プロフィール:
${JSON.stringify(skinProfile, null, 2)}

お探しの商品: ${searchQuery}

インターネット上の知識から最適な化粧品・美容品を5つ推薦してください。

JSON形式で回答（コードブロックなし）:
{
  "products": [
    {
      "id": "product-1",
      "name": "商品名",
      "brand": "ブランド名",
      "category": "カテゴリー",
      "price": "参考価格",
      "matchScore": 0〜100,
      "reasons": ["推薦理由1", "推薦理由2", "推薦理由3"],
      "howToUse": "使用方法",
      "keyIngredients": ["主要成分1", "主要成分2"],
      "source": "internet"
    }
  ],
  "skinAnalysis": "肌の状態分析（2-3文）",
  "routineAdvice": "スキンケアルーティンのアドバイス",
  "expertNote": "専門家からのメモ"
}`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}

export async function freeSearch(query: string) {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 3000,
    system: `あなたはプロの美容コンサルタントです。最新の美容・化粧品の知識を持ち、お客様のあらゆる美容に関する質問に詳しく答えます。`,
    messages: [
      {
        role: "user",
        content: `以下の質問・検索に対して、プロの美容コンサルタントとして詳しく回答してください:

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
      "source": "internet"
    }
  ],
  "summary": "検索結果の総合まとめ（2-3文）",
  "expertAdvice": "専門家からのアドバイス（2-3文）"
}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response format");
  return JSON.parse(jsonMatch[0]);
}
