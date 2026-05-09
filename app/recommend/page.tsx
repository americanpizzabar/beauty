"use client";

import { useState } from "react";
import { Sparkles, Database, Globe, ChevronDown, Star, ArrowRight } from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import type { RecommendationResult, ProductRecommendation } from "@/lib/types";

const SKIN_TYPES = ["乾燥肌", "脂性肌", "混合肌", "敏感肌", "普通肌", "ニキビ肌"];
const CONCERNS_LIST = [
  "乾燥・保湿", "毛穴・テカリ", "ニキビ・吹き出物", "シミ・くすみ",
  "美白・透明感", "シワ・たるみ", "ハリ・弾力", "敏感肌・赤み",
  "毛穴の開き", "エイジングケア",
];
const SENSITIVITY_LEVELS = ["低（刺激に強い）", "中（普通）", "高（敏感）", "超高（アレルギーあり）"];
const AGE_RANGES = ["10代", "20代前半", "20代後半", "30代前半", "30代後半", "40代", "50代以上"];
const SKIN_TONES = ["明るい（ライト）", "普通（ミディアム）", "やや暗め（タン）", "暗め（ダーク）"];
const TEXTURES = ["なめらか", "毛穴が目立つ", "凸凹・ざらつき", "薄い・繊細", "厚め・丈夫"];

export default function RecommendPage() {
  const [step, setStep] = useState<"form" | "loading" | "results">("form");
  const [useDatabase, setUseDatabase] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [skinProfile, setSkinProfile] = useState({
    skinType: "",
    concerns: [] as string[],
    sensitivity: "",
    age: "",
    tone: "",
    texture: "",
    allergies: "",
    currentRoutine: "",
  });

  const toggleConcern = (concern: string) => {
    setSkinProfile((prev) => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter((c) => c !== concern)
        : [...prev.concerns, concern],
    }));
  };

  const handleSubmit = async () => {
    if (!skinProfile.skinType) {
      setError("肌タイプを選択してください");
      return;
    }
    if (!searchQuery.trim()) {
      setError("検索したい商品の種類を入力してください");
      return;
    }
    setError(null);
    setStep("loading");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skinProfile, searchQuery, useDatabase }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
      setStep("results");
    } catch {
      setError("推薦の生成に失敗しました。もう一度お試しください。");
      setStep("form");
    }
  };

  const reset = () => {
    setStep("form");
    setResult(null);
    setError(null);
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">
          AI Recommendation
        </p>
        <h1
          className="text-3xl font-semibold text-pearl"
          style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
        >
          パーソナル推薦
        </h1>
        <p className="text-pearl-muted text-sm mt-2">
          肌のデータを入力して最適な美容品を見つけましょう
        </p>
      </div>

      {/* Form */}
      {step === "form" && (
        <div className="space-y-5">
          {/* Data source toggle */}
          <div className="glass rounded-2xl p-4">
            <p className="text-pearl text-xs font-semibold tracking-wider mb-3">検索ソース</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setUseDatabase(true)}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  useDatabase
                    ? "bg-gold/10 border border-gold/30 text-gold"
                    : "glass border border-white/8 text-pearl-muted"
                }`}
              >
                <Database size={14} />
                <div className="text-left">
                  <div className="text-xs font-semibold">データベース</div>
                  <div className="text-[10px] opacity-70">登録商品から検索</div>
                </div>
              </button>
              <button
                onClick={() => setUseDatabase(false)}
                className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  !useDatabase
                    ? "bg-gold/10 border border-gold/30 text-gold"
                    : "glass border border-white/8 text-pearl-muted"
                }`}
              >
                <Globe size={14} />
                <div className="text-left">
                  <div className="text-xs font-semibold">インターネット</div>
                  <div className="text-[10px] opacity-70">AIが幅広く検索</div>
                </div>
              </button>
            </div>
          </div>

          {/* Search query */}
          <div className="glass rounded-2xl p-5">
            <label className="text-pearl text-xs font-semibold tracking-wider mb-3 block">
              探したい商品・カテゴリー <span className="text-gold">*</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="例：保湿美容液、日焼け止め、洗顔料..."
              className="w-full px-4 py-3 rounded-xl text-sm"
            />
          </div>

          {/* Skin type */}
          <div className="glass rounded-2xl p-5">
            <label className="text-pearl text-xs font-semibold tracking-wider mb-3 block">
              肌タイプ <span className="text-gold">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SKIN_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setSkinProfile((p) => ({ ...p, skinType: type }))}
                  className={`py-2 px-3 rounded-xl text-xs font-medium transition-all ${
                    skinProfile.skinType === type
                      ? "bg-gold/15 border border-gold/30 text-gold"
                      : "glass border border-white/8 text-pearl-muted hover:text-pearl"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Concerns */}
          <div className="glass rounded-2xl p-5">
            <label className="text-pearl text-xs font-semibold tracking-wider mb-3 block">
              肌の悩み（複数選択可）
            </label>
            <div className="flex flex-wrap gap-2">
              {CONCERNS_LIST.map((concern) => (
                <button
                  key={concern}
                  onClick={() => toggleConcern(concern)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    skinProfile.concerns.includes(concern)
                      ? "bg-gold/10 border-gold/30 text-gold"
                      : "border-white/10 text-pearl-muted hover:border-white/20"
                  }`}
                >
                  {concern}
                </button>
              ))}
            </div>
          </div>

          {/* Additional details */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <p className="text-pearl text-xs font-semibold tracking-wider">詳細プロフィール</p>

            <div>
              <label className="text-pearl-dim text-xs mb-2 block">肌の敏感度</label>
              <div className="relative">
                <select
                  value={skinProfile.sensitivity}
                  onChange={(e) => setSkinProfile((p) => ({ ...p, sensitivity: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm appearance-none pr-8"
                >
                  <option value="">選択してください</option>
                  {SENSITIVITY_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-pearl-dim text-xs mb-2 block">年齢帯</label>
              <div className="relative">
                <select
                  value={skinProfile.age}
                  onChange={(e) => setSkinProfile((p) => ({ ...p, age: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm appearance-none pr-8"
                >
                  <option value="">選択してください</option>
                  {AGE_RANGES.map((a) => <option key={a}>{a}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-pearl-dim text-xs mb-2 block">肌色</label>
                <div className="relative">
                  <select
                    value={skinProfile.tone}
                    onChange={(e) => setSkinProfile((p) => ({ ...p, tone: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none pr-6"
                  >
                    <option value="">選択</option>
                    {SKIN_TONES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-pearl-dim text-xs mb-2 block">肌テクスチャー</label>
                <div className="relative">
                  <select
                    value={skinProfile.texture}
                    onChange={(e) => setSkinProfile((p) => ({ ...p, texture: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none pr-6"
                  >
                    <option value="">選択</option>
                    {TEXTURES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-pearl-dim text-xs mb-2 block">アレルギー・使えない成分</label>
              <input
                type="text"
                value={skinProfile.allergies}
                onChange={(e) => setSkinProfile((p) => ({ ...p, allergies: e.target.value }))}
                placeholder="例：アルコール、パラベン、香料..."
                className="w-full px-4 py-2.5 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="text-pearl-dim text-xs mb-2 block">現在のスキンケアルーティン</label>
              <textarea
                value={skinProfile.currentRoutine}
                onChange={(e) => setSkinProfile((p) => ({ ...p, currentRoutine: e.target.value }))}
                placeholder="現在使っているアイテムや悩みを自由に記入..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl text-sm resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="glass border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-gold hover:bg-gold-light text-obsidian font-semibold py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,165,116,0.2)] text-sm tracking-wide flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            AIに最適な商品を探してもらう
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
          {/* Skin analysis */}
          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-[10px] font-bold">B</span>
              </div>
              <h3 className="text-gold text-sm font-semibold tracking-wider">肌の状態分析</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.skinAnalysis}</p>
          </div>

          {/* Products */}
          <div>
            <h3
              className="text-pearl text-base font-semibold mb-4"
              style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
            >
              おすすめ商品 ({result.products.length}件)
            </h3>
            <div className="space-y-4">
              {result.products.map((product: ProductRecommendation, i: number) => (
                <ProductCard key={product.id} product={product} rank={i + 1} />
              ))}
            </div>
          </div>

          {/* Routine advice */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-pearl text-sm font-semibold mb-3 tracking-wider">スキンケアルーティン</h3>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.routineAdvice}</p>
          </div>

          {/* Expert note */}
          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-[10px] font-bold">B</span>
              </div>
              <h3 className="text-gold text-sm font-semibold tracking-wider">専門家メモ</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed italic">{result.expertNote}</p>
          </div>

          <button
            onClick={reset}
            className="w-full glass border border-white/10 hover:border-gold/20 text-pearl-muted hover:text-pearl py-4 rounded-xl transition-all text-sm"
          >
            新しい検索をする
          </button>
        </div>
      )}
    </PageWrapper>
  );
}

function ProductCard({ product, rank }: { product: ProductRecommendation; rank: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Rank */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              rank === 1
                ? "bg-gold text-obsidian"
                : rank === 2
                ? "bg-gold/30 text-gold"
                : "bg-white/10 text-pearl-muted"
            }`}
          >
            {rank === 1 ? <Star size={12} fill="currentColor" /> : rank}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-gold/70 text-xs font-medium">{product.brand}</p>
              <span className={`tag-chip ${product.source === "database" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>
                {product.source === "database" ? "DB" : "Web"}
              </span>
            </div>
            <h4
              className="text-pearl font-semibold text-sm"
              style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
            >
              {product.name}
            </h4>
            <p className="text-pearl-dim text-xs mt-0.5">{product.category}</p>
          </div>

          {/* Match score */}
          <div className="text-right flex-shrink-0">
            <div className="text-gold font-bold text-lg">{product.matchScore}</div>
            <div className="text-pearl-dim text-[10px]">マッチ度</div>
          </div>
        </div>

        {product.price && (
          <p className="text-pearl-muted text-xs mt-2 ml-11">参考価格: {product.price}</p>
        )}

        {/* Key ingredients */}
        <div className="flex flex-wrap gap-1 mt-3 ml-11">
          {product.keyIngredients.slice(0, 3).map((ing: string, i: number) => (
            <span key={i} className="tag-chip bg-white/5 text-pearl-dim">{ing}</span>
          ))}
        </div>

        {/* Reasons preview */}
        <div className="mt-3 ml-11">
          <p className="text-pearl-muted text-xs">{product.reasons[0]}</p>
        </div>
      </div>

      {/* Expand button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-center gap-1 py-3 border-t border-white/5 text-pearl-dim hover:text-gold text-xs transition-colors"
      >
        {open ? "閉じる" : "詳細を見る"}
        <ArrowRight size={11} className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-white/5 space-y-4">
          <div>
            <p className="text-pearl-dim text-xs font-semibold mb-2 tracking-wider">推薦理由</p>
            <ul className="space-y-1.5">
              {product.reasons.map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-pearl-muted">
                  <span className="text-gold flex-shrink-0 mt-0.5">✦</span>
                  {r}
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
              {product.keyIngredients.map((ing: string, i: number) => (
                <span key={i} className="tag-chip bg-gold/5 text-gold/80 border border-gold/10">{ing}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
