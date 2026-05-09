export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: string;
  description: string;
  key_ingredients: string[];
  skin_types: string[];
  concerns: string[];
  how_to_use: string;
}

const PRODUCTS: Product[] = [
  {
    id: "p001",
    name: "モイスチャライジング セラム",
    brand: "LA MER",
    category: "美容液",
    price: "¥32,000",
    description: "深海から生まれたブレスエッセンスが肌の奥まで浸透し、乾燥した肌を集中保湿。",
    key_ingredients: ["ブレスエッセンス", "ケルプ", "カルシウム", "マグネシウム"],
    skin_types: ["乾燥肌", "普通肌", "混合肌"],
    concerns: ["乾燥", "ハリ不足", "くすみ"],
    how_to_use: "朝晩の洗顔後、化粧水の前に数滴を顔全体に馴染ませる",
  },
  {
    id: "p002",
    name: "クリーム ドゥ ラ メール",
    brand: "LA MER",
    category: "保湿クリーム",
    price: "¥28,000",
    description: "伝説のブレスエッセンスを凝縮した保湿クリーム。肌の再生を促し、深い潤いを与える。",
    key_ingredients: ["ブレスエッセンス", "シーケルプ", "ライム", "茶"],
    skin_types: ["乾燥肌", "普通肌", "敏感肌"],
    concerns: ["乾燥", "エイジングケア", "敏感"],
    how_to_use: "洗顔後の最後のステップとして、適量を顔全体に優しくプレスするように馴染ませる",
  },
  {
    id: "p003",
    name: "エクセプション スキンケア ローション",
    brand: "CHANEL",
    category: "化粧水",
    price: "¥18,000",
    description: "シャネル独自のポリ-グルタミン酸が肌のバリア機能を強化し、潤いをキープ。",
    key_ingredients: ["ポリ-グルタミン酸", "ナイアシンアミド", "ペプチド"],
    skin_types: ["普通肌", "乾燥肌", "混合肌", "敏感肌"],
    concerns: ["保湿", "毛穴", "透明感"],
    how_to_use: "洗顔後、コットンまたは手のひらを使って顔全体に優しく馴染ませる",
  },
  {
    id: "p004",
    name: "ジェントルクレンジングフォーム",
    brand: "COSRX",
    category: "洗顔料",
    price: "¥2,500",
    description: "低刺激で肌に優しい泡立ちタイプの洗顔料。肌のうるおいを守りながら汚れを落とす。",
    key_ingredients: ["サリチル酸", "パンテノール", "アロエベラ"],
    skin_types: ["脂性肌", "混合肌", "ニキビ肌"],
    concerns: ["毛穴", "ニキビ", "皮脂コントロール"],
    how_to_use: "濡れた手で適量を泡立て、顔を優しくマッサージして洗い流す",
  },
  {
    id: "p005",
    name: "ヒアルロン酸 美容液",
    brand: "The Ordinary",
    category: "美容液",
    price: "¥1,500",
    description: "2%ヒアルロン酸複合体が肌の複数の層に潤いを届ける、シンプルで効果的な美容液。",
    key_ingredients: ["ヒアルロン酸", "グリセリン", "セラミド"],
    skin_types: ["全肌質"],
    concerns: ["乾燥", "ハリ不足"],
    how_to_use: "洗顔後、化粧水の後に数滴を顔に馴染ませる",
  },
  {
    id: "p006",
    name: "ビタミンC誘導体 美容液",
    brand: "OBAGI",
    category: "美容液",
    price: "¥12,000",
    description: "高濃度ビタミンC誘導体が美白・エイジングケアに効果的。医薬部外品。",
    key_ingredients: ["アスコルビン酸", "ビタミンE", "フェルラ酸"],
    skin_types: ["普通肌", "脂性肌", "混合肌"],
    concerns: ["美白", "シミ", "ハリ不足", "エイジングケア"],
    how_to_use: "朝の洗顔後に3〜4滴を顔全体に馴染ませ、必ず日焼け止めを使用する",
  },
  {
    id: "p007",
    name: "SPF50+ 日焼け止め乳液",
    brand: "ANESSA",
    category: "日焼け止め",
    price: "¥2,800",
    description: "アクアブースター技術で汗や水に強く、紫外線を強力にカット。美容液成分も配合。",
    key_ingredients: ["酸化亜鉛", "ナイアシンアミド", "ヒアルロン酸"],
    skin_types: ["全肌質"],
    concerns: ["紫外線対策", "エイジングケア"],
    how_to_use: "外出前の最後のステップとして顔全体に均一に塗布する",
  },
  {
    id: "p008",
    name: "レチノール クリーム",
    brand: "RoC",
    category: "エイジングケアクリーム",
    price: "¥4,500",
    description: "純粋レチノールがシワやたるみに働きかけ、肌のターンオーバーを促進する夜用クリーム。",
    key_ingredients: ["レチノール", "ペプチド", "ビタミンE"],
    skin_types: ["普通肌", "乾燥肌", "混合肌"],
    concerns: ["エイジングケア", "シワ", "たるみ"],
    how_to_use: "夜の洗顔後に顔全体に薄く塗布する。使い始めは週2〜3回から",
  },
  {
    id: "p009",
    name: "センシティブ スキン トナー",
    brand: "HADA LABO",
    category: "化粧水",
    price: "¥800",
    description: "5種のヒアルロン酸が肌の角層まで浸透。肌にやさしく高保湿を実現。",
    key_ingredients: ["ヒアルロン酸", "アセチルヒアルロン酸", "加水分解ヒアルロン酸"],
    skin_types: ["敏感肌", "乾燥肌", "普通肌"],
    concerns: ["乾燥", "保湿", "敏感肌ケア"],
    how_to_use: "洗顔後、コットンまたは手のひらで顔全体にパッティングする",
  },
  {
    id: "p010",
    name: "ナイアシンアミド 10% + 亜鉛 1%",
    brand: "The Ordinary",
    category: "美容液",
    price: "¥1,800",
    description: "高濃度ナイアシンアミドが毛穴の目立ちを改善し、皮脂バランスを整える。",
    key_ingredients: ["ナイアシンアミド", "亜鉛PCA", "ヒアルロン酸"],
    skin_types: ["脂性肌", "混合肌", "ニキビ肌"],
    concerns: ["毛穴", "皮脂コントロール", "ニキビ", "くすみ"],
    how_to_use: "朝晩の化粧水後に顔全体に馴染ませる",
  },
];

function matches(product: Product, query: string, skinType?: string, concerns?: string[]): boolean {
  if (query) {
    const q = query.toLowerCase();
    const searchable = [
      product.name, product.brand, product.category,
      product.description,
      ...product.key_ingredients,
      ...product.concerns,
    ].join(" ").toLowerCase();
    if (!searchable.includes(q)) return false;
  }
  if (skinType) {
    const hasSkinType =
      product.skin_types.includes(skinType) ||
      product.skin_types.includes("全肌質");
    if (!hasSkinType) return false;
  }
  if (concerns?.length) {
    const hasAnyConcern = concerns.some((c) =>
      product.concerns.some((pc) => pc.includes(c) || c.includes(pc))
    );
    if (!hasAnyConcern) return false;
  }
  return true;
}

export function searchProducts(query: string, skinType?: string, concerns?: string[]): Product[] {
  const results = PRODUCTS.filter((p) => matches(p, query, skinType, concerns));
  return results.length > 0 ? results : PRODUCTS.slice(0, 5);
}

export function getAllProducts(): Product[] {
  return PRODUCTS;
}
