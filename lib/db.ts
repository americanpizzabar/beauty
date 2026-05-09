import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "products.db");

function ensureDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  ensureDir();
  _db = new Database(DB_PATH);
  _db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      category TEXT NOT NULL,
      price TEXT,
      description TEXT,
      key_ingredients TEXT,
      skin_types TEXT,
      concerns TEXT,
      how_to_use TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS skin_profiles (
      id TEXT PRIMARY KEY,
      name TEXT,
      skin_type TEXT,
      concerns TEXT,
      sensitivity TEXT,
      age TEXT,
      tone TEXT,
      texture TEXT,
      allergies TEXT,
      current_routine TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);

  const count = (_db.prepare("SELECT COUNT(*) as c FROM products").get() as { c: number }).c;
  if (count === 0) {
    seedProducts(_db);
  }

  return _db;
}

function seedProducts(db: Database.Database) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, brand, category, price, description, key_ingredients, skin_types, concerns, how_to_use)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    ["p001", "モイスチャライジング セラム", "LA MER", "美容液", "¥32,000", "深海から生まれたブレスエッセンスが肌の奥まで浸透し、乾燥した肌を集中保湿。", '["ブレスエッセンス","ケルプ","カルシウム","マグネシウム"]', '["乾燥肌","普通肌","混合肌"]', '["乾燥","ハリ不足","くすみ"]', "朝晩の洗顔後、化粧水の前に数滴を顔全体に馴染ませる"],
    ["p002", "クリーム ドゥ ラ メール", "LA MER", "保湿クリーム", "¥28,000", "伝説のブレスエッセンスを凝縮した保湿クリーム。肌の再生を促し、深い潤いを与える。", '["ブレスエッセンス","シーケルプ","ライム","茶"]', '["乾燥肌","普通肌","敏感肌"]', '["乾燥","エイジングケア","敏感"]', "洗顔後の最後のステップとして、適量を顔全体に優しくプレスするように馴染ませる"],
    ["p003", "エクセプション スキンケア ローション", "CHANEL", "化粧水", "¥18,000", "シャネル独自のポリ-グルタミン酸が肌のバリア機能を強化し、潤いをキープ。", '["ポリ-グルタミン酸","ナイアシンアミド","ペプチド"]', '["普通肌","乾燥肌","混合肌","敏感肌"]', '["保湿","毛穴","透明感"]', "洗顔後、コットンまたは手のひらを使って顔全体に優しく馴染ませる"],
    ["p004", "ジェントルクレンジングフォーム", "COSRX", "洗顔料", "¥2,500", "低刺激で肌に優しい泡立ちタイプの洗顔料。肌のうるおいを守りながら汚れを落とす。", '["サリチル酸","パンテノール","アロエベラ"]', '["脂性肌","混合肌","ニキビ肌"]', '["毛穴","ニキビ","皮脂コントロール"]', "濡れた手で適量を泡立て、顔を優しくマッサージして洗い流す"],
    ["p005", "ヒアルロン酸 美容液", "The Ordinary", "美容液", "¥1,500", "2%ヒアルロン酸複合体が肌の複数の層に潤いを届ける、シンプルで効果的な美容液。", '["ヒアルロン酸","グリセリン","セラミド"]', '["全肌質"]', '["乾燥","ハリ不足"]', "洗顔後、化粧水の後に数滴を顔に馴染ませる"],
    ["p006", "ビタミンC誘導体 美容液", "OBAGI", "美容液", "¥12,000", "高濃度ビタミンC誘導体が美白・エイジングケアに効果的。医薬部外品。", '["アスコルビン酸","ビタミンE","フェルラ酸"]', '["普通肌","脂性肌","混合肌"]', '["美白","シミ","ハリ不足","エイジングケア"]', "朝の洗顔後に3〜4滴を顔全体に馴染ませ、必ず日焼け止めを使用する"],
    ["p007", "SPF50+ 日焼け止め乳液", "ANESSA", "日焼け止め", "¥2,800", "アクアブースター技術で汗や水に強く、紫外線を強力にカット。美容液成分も配合。", '["酸化亜鉛","ナイアシンアミド","ヒアルロン酸"]', '["全肌質"]', '["紫外線対策","エイジングケア"]', "外出前の最後のステップとして顔全体に均一に塗布する"],
    ["p008", "レチノール クリーム", "RoC", "エイジングケアクリーム", "¥4,500", "純粋レチノールがシワやたるみに働きかけ、肌のターンオーバーを促進する夜用クリーム。", '["レチノール","ペプチド","ビタミンE"]', '["普通肌","乾燥肌","混合肌"]', '["エイジングケア","シワ","たるみ"]', "夜の洗顔後に顔全体に薄く塗布する。使い始めは週2〜3回から"],
    ["p009", "センシティブ スキン トナー", "HADA LABO", "化粧水", "¥800", "5種のヒアルロン酸が肌の角層まで浸透。肌にやさしく高保湿を実現。", '["ヒアルロン酸","アセチルヒアルロン酸","加水分解ヒアルロン酸"]', '["敏感肌","乾燥肌","普通肌"]', '["乾燥","保湿","敏感肌ケア"]', "洗顔後、コットンまたは手のひらで顔全体にパッティングする"],
    ["p010", "ナイアシンアミド 10% + 亜鉛 1%", "The Ordinary", "美容液", "¥1,800", "高濃度ナイアシンアミドが毛穴の目立ちを改善し、皮脂バランスを整える。", '["ナイアシンアミド","亜鉛PCA","ヒアルロン酸"]', '["脂性肌","混合肌","ニキビ肌"]', '["毛穴","皮脂コントロール","ニキビ","くすみ"]', "朝晩の化粧水後に顔全体に馴染ませる"],
  ];

  const insertMany = db.transaction((prods: (string | number | null)[][]) => {
    for (const p of prods) insert.run(...p);
  });
  insertMany(products);
}

export function searchProducts(query: string, skinType?: string, concerns?: string[]) {
  const db = getDb();

  let sql = "SELECT * FROM products WHERE 1=1";
  const params: string[] = [];

  if (query) {
    sql += " AND (name LIKE ? OR brand LIKE ? OR category LIKE ? OR description LIKE ? OR key_ingredients LIKE ? OR concerns LIKE ?)";
    const q = `%${query}%`;
    params.push(q, q, q, q, q, q);
  }

  if (skinType) {
    sql += " AND skin_types LIKE ?";
    params.push(`%${skinType}%`);
  }

  if (concerns?.length) {
    const concernClauses = concerns.map(() => "concerns LIKE ?").join(" OR ");
    sql += ` AND (${concernClauses})`;
    concerns.forEach((c) => params.push(`%${c}%`));
  }

  sql += " LIMIT 20";

  const rows = db.prepare(sql).all(...params) as Record<string, string>[];
  return rows.map((r) => ({
    ...r,
    key_ingredients: JSON.parse(r.key_ingredients || "[]"),
    skin_types: JSON.parse(r.skin_types || "[]"),
    concerns: JSON.parse(r.concerns || "[]"),
  }));
}

export function getAllProducts() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM products").all() as Record<string, string>[];
  return rows.map((r) => ({
    ...r,
    key_ingredients: JSON.parse(r.key_ingredients || "[]"),
    skin_types: JSON.parse(r.skin_types || "[]"),
    concerns: JSON.parse(r.concerns || "[]"),
  }));
}
