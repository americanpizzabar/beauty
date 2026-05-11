"use client";

import { useState, useEffect } from "react";
import {
  Sparkles, Database, Globe, ChevronDown, Star, ArrowRight,
  History, Trash2, ExternalLink, Edit2, Check, Plus, X,
} from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import type { RecommendationResult, ProductRecommendation } from "@/lib/types";
import {
  getRecommendHistory, saveRecommendEntry, deleteRecommendEntry,
  getCategories, saveCategories, getCustomProducts,
  type RecommendEntry,
} from "@/lib/storage";
import { getAllProducts } from "@/lib/db";
import type { CustomProduct } from "@/lib/storage";

const SKIN_TYPES = ["乾燥肌", "脂性肌", "混合肌", "敏感肌", "普通肌", "ニキビ肌"];
const PRICE_RANGES = ["〜¥1,000", "¥1,000〜¥3,000", "¥3,000〜¥5,000", "¥5,000〜¥10,000", "¥10,000〜"];
const CONCERNS_LIST = [
  "乾燥・保湿", "毛穴・テカリ", "ニキビ・吹き出物", "シミ・くすみ",
  "美白・透明感", "シワ・たるみ", "ハリ・弾力", "敏感肌・赤み",
  "毛穴の開き", "エイジングケア",
];
const SENSITIVITY = ["低（刺激に強い）", "中（普通）", "高（敏感）", "超高（アレルギーあり）"];
const AGE_RANGES = ["10代", "20代前半", "20代後半", "30代前半", "30代後半", "40代", "50代以上"];
const SKIN_TONES = ["明るい（ライト）", "普通（ミディアム）", "やや暗め（タン）", "暗め（ダーク）"];
const TEXTURES = ["なめらか", "毛穴が目立つ", "凸凹・ざらつき", "薄い・繊細", "厚め・丈夫"];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function RecommendPage() {
  const [step, setStep] = useState<"form" | "loading" | "results">("form");
  const [useDatabase, setUseDatabase] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<RecommendEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingCategories, setEditingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showCategoryList, setShowCategoryList] = useState(false);

  const [skinProfile, setSkinProfile] = useState({
    gender: "",
    skinType: "",
    concerns: [] as string[],
    sensitivity: "",
    age: "",
    tone: "",
    texture: "",
    allergies: "",
    currentRoutine: "",
    priceRanges: [] as string[],
  });

  useEffect(() => {
    setHistory(getRecommendHistory());
    setCategories(getCategories());
  }, []);

  const refreshHistory = () => setHistory(getRecommendHistory());

  const toggleConcern = (c: string) => {
    setSkinProfile(p => ({
      ...p,
      concerns: p.concerns.includes(c) ? p.concerns.filter(x => x !== c) : [...p.concerns, c],
    }));
  };

  const handleSubmit = async () => {
    if (!skinProfile.skinType) { setError("肌タイプを選択してください"); return; }
    if (!searchQuery.trim()) { setError("探したい商品・カテゴリーを入力してください"); return; }
    setError(null);
    setStep("loading");
    try {
      // Merge builtin + custom products for DB search
      const builtIn = getAllProducts() as unknown as Record<string, unknown>[];
      const custom = getCustomProducts() as unknown as Record<string, unknown>[];
      const allDb = [...builtIn, ...custom];

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skinProfile,
          searchQuery,
          useDatabase,
          dbProducts: useDatabase ? allDb : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "推薦の生成に失敗しました");
      setResult(data);
      saveRecommendEntry(skinProfile as unknown as Record<string, unknown>, searchQuery, useDatabase, data);
      refreshHistory();
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "推薦の生成に失敗しました。");
      setStep("form");
    }
  };

  const reset = () => { setStep("form"); setResult(null); setError(null); };

  const loadFromHistory = (entry: RecommendEntry) => {
    setResult(entry.result);
    setStep("results");
    setShowHistory(false);
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteRecommendEntry(id);
    refreshHistory();
  };

  // Category management
  const addCategory = () => {
    if (!newCategory.trim()) return;
    const updated = [...categories, newCategory.trim()];
    setCategories(updated);
    saveCategories(updated);
    setNewCategory("");
  };

  const removeCategory = (idx: number) => {
    const updated = categories.filter((_, i) => i !== idx);
    setCategories(updated);
    saveCategories(updated);
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">AI Recommendation</p>
          <h1 className="text-3xl font-semibold text-pearl" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)" }}>
            パーソナル推薦
          </h1>
          <p className="text-pearl-muted text-sm mt-2">肌データを入力して最適な美容品を見つけましょう</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showHistory ? "bg-gold/10 text-gold border border-gold/20" : "glass border border-white/10 text-pearl-muted hover:text-gold"}`}
          >
            <History size={13} /> 履歴 {history.length}
          </button>
        )}
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="glass rounded-2xl mb-6 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-pearl text-sm font-semibold">推薦履歴</p>
          </div>
          <div className="divide-y divide-white/5 max-h-60 overflow-y-auto">
            {history.map(entry => (
              <button key={entry.id} onClick={() => loadFromHistory(entry)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left">
                <Sparkles size={14} className="text-gold/50 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-pearl text-xs font-medium truncate">{entry.searchQuery}</p>
                  <p className="text-pearl-dim text-[10px]">{formatDate(entry.timestamp)} · {entry.useDatabase ? "DB" : "Web"}</p>
                </div>
                <button onClick={e => handleDeleteHistory(entry.id, e)}
                  className="text-pearl-dim/50 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={12} />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {step === "form" && (
        <div className="space-y-5">
          {/* Data source */}
          <div className="glass rounded-2xl p-4">
            <p className="text-pearl text-xs font-semibold tracking-wider mb-3">検索ソース</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: true, icon: Database, title: "データベース", sub: "登録商品から検索" },
                { val: false, icon: Globe, title: "インターネット", sub: "AIが幅広く検索" },
              ].map(({ val, icon: Icon, title, sub }) => (
                <button key={String(val)} onClick={() => setUseDatabase(val)}
                  className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm transition-all ${useDatabase === val ? "bg-gold/10 border border-gold/30 text-gold" : "glass border border-white/8 text-pearl-muted"}`}>
                  <Icon size={14} />
                  <div className="text-left">
                    <div className="text-xs font-semibold">{title}</div>
                    <div className="text-[10px] opacity-70">{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Search query with category list */}
          <div className="glass rounded-2xl p-5">
            <label className="text-pearl text-xs font-semibold tracking-wider mb-3 block">
              探したい商品・カテゴリー <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="例：保湿美容液、日焼け止め..."
              className="w-full px-4 py-3 rounded-xl text-sm mb-3"
            />
            {/* Category list toggle */}
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setShowCategoryList(!showCategoryList)}
                className="text-xs text-pearl-dim hover:text-gold transition-colors flex items-center gap-1"
              >
                <ChevronDown size={12} className={showCategoryList ? "rotate-180" : ""} />
                リストから選択
              </button>
              <button
                onClick={() => setEditingCategories(!editingCategories)}
                className="text-xs text-pearl-dim/60 hover:text-gold transition-colors flex items-center gap-1 ml-auto"
              >
                <Edit2 size={11} /> リストを編集
              </button>
            </div>

            {showCategoryList && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {categories.map((cat, i) => (
                  <div key={i} className="flex items-center gap-0.5">
                    <button
                      onClick={() => { setSearchQuery(cat); setShowCategoryList(false); }}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${searchQuery === cat ? "bg-gold/10 border-gold/30 text-gold" : "border-white/10 text-pearl-muted hover:border-white/20"}`}
                    >
                      {cat}
                    </button>
                    {editingCategories && (
                      <button onClick={() => removeCategory(i)} className="text-pearl-dim/50 hover:text-red-400 transition-colors">
                        <X size={10} />
                      </button>
                    )}
                  </div>
                ))}
                {editingCategories && (
                  <div className="flex items-center gap-1 mt-1 w-full">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCategory()}
                      placeholder="新しいカテゴリーを追加..."
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs"
                    />
                    <button onClick={addCategory} className="p-1.5 glass-gold border border-gold/20 rounded-lg text-gold">
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gender + Skin type */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-pearl text-xs font-semibold tracking-wider mb-3 block">性別</label>
              <div className="grid grid-cols-3 gap-2">
                {["女性", "男性", "指定なし"].map(g => (
                  <button key={g} onClick={() => setSkinProfile(p => ({ ...p, gender: g }))}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${skinProfile.gender === g ? "bg-gold/15 border border-gold/30 text-gold" : "glass border border-white/8 text-pearl-muted hover:text-pearl"}`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-pearl text-xs font-semibold tracking-wider mb-3 block">
                肌タイプ <span className="text-gold">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SKIN_TYPES.map(type => (
                  <button key={type} onClick={() => setSkinProfile(p => ({ ...p, skinType: type }))}
                    className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${skinProfile.skinType === type ? "bg-gold/15 border border-gold/30 text-gold" : "glass border border-white/8 text-pearl-muted hover:text-pearl"}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Price range */}
          <div className="glass rounded-2xl p-5">
            <label className="text-pearl text-xs font-semibold tracking-wider mb-3 block">希望価格帯（複数選択可）</label>
            <div className="flex flex-wrap gap-2">
              {PRICE_RANGES.map(r => {
                const active = skinProfile.priceRanges.includes(r);
                return (
                  <button key={r}
                    onClick={() => setSkinProfile(p => ({
                      ...p,
                      priceRanges: active ? p.priceRanges.filter(x => x !== r) : [...p.priceRanges, r],
                    }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${active ? "bg-gold/10 border-gold/30 text-gold" : "border-white/10 text-pearl-muted hover:border-white/20"}`}>
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Concerns */}
          <div className="glass rounded-2xl p-5">
            <label className="text-pearl text-xs font-semibold tracking-wider mb-3 block">肌の悩み（複数選択可）</label>
            <div className="flex flex-wrap gap-2">
              {CONCERNS_LIST.map(concern => (
                <button key={concern} onClick={() => toggleConcern(concern)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${skinProfile.concerns.includes(concern) ? "bg-gold/10 border-gold/30 text-gold" : "border-white/10 text-pearl-muted hover:border-white/20"}`}>
                  {concern}
                </button>
              ))}
            </div>
          </div>

          {/* Additional details */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <p className="text-pearl text-xs font-semibold tracking-wider">詳細プロフィール</p>
            {[
              { label: "肌の敏感度", field: "sensitivity", options: SENSITIVITY },
              { label: "年齢帯", field: "age", options: AGE_RANGES },
            ].map(({ label, field, options }) => (
              <div key={field}>
                <label className="text-pearl-dim text-xs mb-2 block">{label}</label>
                <div className="relative">
                  <select
                    value={(skinProfile as unknown as Record<string, string>)[field]}
                    onChange={e => setSkinProfile(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm appearance-none pr-8"
                  >
                    <option value="">選択してください</option>
                    {options.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none" />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "肌色", field: "tone", options: SKIN_TONES },
                { label: "肌テクスチャー", field: "texture", options: TEXTURES },
              ].map(({ label, field, options }) => (
                <div key={field}>
                  <label className="text-pearl-dim text-xs mb-2 block">{label}</label>
                  <div className="relative">
                    <select
                      value={(skinProfile as unknown as Record<string, string>)[field]}
                      onChange={e => setSkinProfile(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none pr-6"
                    >
                      <option value="">選択</option>
                      {options.map(o => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="text-pearl-dim text-xs mb-2 block">アレルギー・使えない成分</label>
              <input type="text" value={skinProfile.allergies}
                onChange={e => setSkinProfile(p => ({ ...p, allergies: e.target.value }))}
                placeholder="例：アルコール、パラベン..."
                className="w-full px-4 py-2.5 rounded-xl text-sm" />
            </div>
            <div>
              <label className="text-pearl-dim text-xs mb-2 block">現在のスキンケアルーティン</label>
              <textarea value={skinProfile.currentRoutine}
                onChange={e => setSkinProfile(p => ({ ...p, currentRoutine: e.target.value }))}
                placeholder="現在使っているアイテムや悩みを自由に記入..."
                rows={3} className="w-full px-4 py-2.5 rounded-xl text-sm resize-none" />
            </div>
          </div>

          {error && (
            <div className="glass border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button onClick={handleSubmit}
            className="w-full bg-gold hover:bg-gold-light text-obsidian font-semibold py-4 rounded-xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(212,165,116,0.2)]">
            <Sparkles size={16} /> AIに最適な商品を探してもらう
          </button>
        </div>
      )}

      {/* Loading */}
      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-16 space-y-8">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full border border-gold/20 animate-ping" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-radial from-gold/15 to-transparent flex items-center justify-center">
                <Sparkles size={32} className="text-gold animate-pulse" />
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gold text-sm font-medium tracking-wider">最適な商品を探しています</p>
            <p className="text-pearl-dim text-xs mt-1">肌データを分析中...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {step === "results" && result && (
        <div className="space-y-5 animate-slide-up">
          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-[10px] font-bold">B</span>
              </div>
              <h3 className="text-gold text-sm font-semibold tracking-wider">肌の状態分析</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.skinAnalysis}</p>
          </div>

          <div>
            <h3 className="text-pearl text-base font-semibold mb-4" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)" }}>
              おすすめ商品 ({result.products.length}件)
            </h3>
            <div className="space-y-4">
              {result.products.map((product, i) => (
                <ProductCard key={product.id} product={product} rank={i + 1} />
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-pearl text-sm font-semibold mb-3 tracking-wider">スキンケアルーティン</h3>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.routineAdvice}</p>
          </div>

          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-[10px] font-bold">B</span>
              </div>
              <h3 className="text-gold text-sm font-semibold tracking-wider">専門家メモ</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed italic">{result.expertNote}</p>
          </div>

          <p className="text-pearl-dim/50 text-[10px] text-center">✦ この結果は自動的に履歴に保存されました</p>

          <button onClick={reset}
            className="w-full glass border border-white/10 hover:border-gold/20 text-pearl-muted hover:text-pearl py-4 rounded-xl transition-all text-sm">
            新しい検索をする
          </button>
        </div>
      )}
    </PageWrapper>
  );
}

function ProductCard({ product, rank }: { product: ProductRecommendation; rank: number }) {
  const [open, setOpen] = useState(false);

  const searchUrl = product.purchaseUrl && product.purchaseUrl.startsWith("http")
    ? product.purchaseUrl
    : `https://www.google.com/search?q=${encodeURIComponent(`${product.brand} ${product.name} 購入`)}`;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${rank === 1 ? "bg-gold text-obsidian" : rank === 2 ? "bg-gold/30 text-gold" : "bg-white/10 text-pearl-muted"}`}>
            {rank === 1 ? <Star size={12} fill="currentColor" /> : rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-gold/70 text-xs font-medium">{product.brand}</p>
              <span className={`tag-chip ${product.source === "database" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>
                {product.source === "database" ? "DB" : "Web"}
              </span>
            </div>
            <h4 className="text-pearl font-semibold text-sm" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)" }}>
              {product.name}
            </h4>
            <p className="text-pearl-dim text-xs mt-0.5">{product.category}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-gold font-bold text-lg">{product.matchScore}</div>
            <div className="text-pearl-dim text-[10px]">マッチ度</div>
          </div>
        </div>

        {product.price && <p className="text-pearl-muted text-xs mt-2 ml-11">参考価格: {product.price}</p>}

        <div className="flex flex-wrap gap-1 mt-3 ml-11">
          {product.keyIngredients.slice(0, 3).map((ing, i) => (
            <span key={i} className="tag-chip bg-white/5 text-pearl-dim">{ing}</span>
          ))}
        </div>

        <p className="text-pearl-muted text-xs mt-2 ml-11 leading-relaxed">{product.reasons[0]}</p>

        {/* Purchase link */}
        <div className="mt-3 ml-11">
          <a href={searchUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gold/80 hover:text-gold transition-colors border border-gold/15 hover:border-gold/30 rounded-full px-3 py-1">
            <ExternalLink size={11} /> 購入・詳細を検索する
          </a>
        </div>
      </div>

      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-1 py-3 border-t border-white/5 text-pearl-dim hover:text-gold text-xs transition-colors">
        {open ? "閉じる" : "詳細を見る"}
        <ArrowRight size={11} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/5 space-y-4">
          <div>
            <p className="text-pearl-dim text-xs font-semibold mb-2 tracking-wider">推薦理由</p>
            <ul className="space-y-1.5">
              {product.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-pearl-muted">
                  <span className="text-gold flex-shrink-0 mt-0.5">✦</span>{r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-pearl-dim text-xs font-semibold mb-2 tracking-wider">使用方法</p>
            <p className="text-pearl-muted text-sm">{product.howToUse}</p>
          </div>
          <div>
            <p className="text-pearl-dim text-xs font-semibold mb-2 tracking-wider">主要成分</p>
            <div className="flex flex-wrap gap-1">
              {product.keyIngredients.map((ing, i) => (
                <span key={i} className="tag-chip bg-gold/5 text-gold/80 border border-gold/10">{ing}</span>
              ))}
            </div>
          </div>
          <a href={searchUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 glass-gold border border-gold/20 rounded-xl py-3 text-sm text-gold hover:bg-gold/10 transition-all">
            <ExternalLink size={14} /> 購入・詳細を見る
          </a>
        </div>
      )}
    </div>
  );
}

// Suppress unused import warning
const _Check = Check;
void _Check;
