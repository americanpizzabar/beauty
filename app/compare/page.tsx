"use client";

import { useState, useEffect } from "react";
import { Scale, Check, RotateCcw, Star, ChevronRight } from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import { getAllProducts } from "@/lib/db";
import { getCustomProducts } from "@/lib/storage";
import type { ComparisonResult } from "@/lib/types";

type ProductItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price?: string;
  key_ingredients: string[];
  skin_types: string[];
  concerns: string[];
};

const SCORE_LABELS = [
  { key: "hydration", label: "保湿力" },
  { key: "brightening", label: "美白・透明感" },
  { key: "antiAging", label: "エイジングケア" },
  { key: "sensitivity", label: "敏感肌への優しさ" },
  { key: "valueForMoney", label: "コスパ" },
];

const RANK_COLORS = [
  "bg-gold text-obsidian",
  "bg-silver/30 text-pearl",
  "bg-white/10 text-pearl-muted",
];

export default function ComparePage() {
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "loading" | "results">("select");
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const builtin = getAllProducts() as unknown as ProductItem[];
    const custom = getCustomProducts() as unknown as ProductItem[];
    setAllProducts([...builtin, ...custom]);
  }, []);

  const filtered = allProducts.filter(p =>
    search === "" ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  };

  const selectedProducts = selected
    .map(id => allProducts.find(p => p.id === id))
    .filter((p): p is ProductItem => !!p);

  const handleCompare = async () => {
    if (selected.length < 2) { setError("2つ以上の商品を選択してください"); return; }
    setError(null);
    setStep("loading");
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: selectedProducts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "比較に失敗しました");
      setResult(data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "比較に失敗しました。");
      setStep("select");
    }
  };

  const reset = () => { setStep("select"); setResult(null); setError(null); setSelected([]); };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">Product Compare</p>
        <h1 className="text-3xl font-semibold text-pearl" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)" }}>
          商品比較
        </h1>
        <p className="text-pearl-muted text-sm mt-2">2〜3つの商品を選んでAIが詳しく比較します</p>
      </div>

      {step === "select" && (
        <div className="space-y-5">
          {/* Selected products */}
          {selected.length > 0 && (
            <div className="glass-gold rounded-2xl p-4">
              <p className="text-gold/70 text-xs tracking-wider mb-3">選択中 ({selected.length}/3)</p>
              <div className="flex flex-wrap gap-2">
                {selectedProducts.map((p, i) => (
                  <button key={p.id} onClick={() => toggleSelect(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-xs text-gold">
                    <span className="font-bold text-gold/60">#{i + 1}</span> {p.name}
                    <span className="text-gold/40 text-[10px]">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search box */}
          <div className="glass rounded-2xl p-4">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="商品名・ブランド・カテゴリーで絞り込み..."
              className="w-full px-4 py-3 rounded-xl text-sm"
            />
          </div>

          {/* Product list */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <p className="text-pearl text-sm font-semibold">商品一覧 ({filtered.length}件)</p>
              <p className="text-pearl-dim text-xs">最大3つまで選択</p>
            </div>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-pearl-dim text-sm text-center py-8">商品が見つかりません</p>
              ) : filtered.map(product => {
                const isSelected = selected.includes(product.id);
                const isDisabled = !isSelected && selected.length >= 3;
                const rank = selected.indexOf(product.id);
                return (
                  <button key={product.id} onClick={() => toggleSelect(product.id)} disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${isSelected ? "bg-gold/5" : isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/3"}`}>
                    <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? "bg-gold border-gold" : "border-white/20"}`}>
                      {isSelected && <Check size={11} className="text-obsidian" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gold/70 text-[10px]">{product.brand}</p>
                      <p className="text-pearl text-sm font-medium truncate">{product.name}</p>
                      <p className="text-pearl-dim text-xs">{product.category}{product.price ? ` · ${product.price}` : ""}</p>
                    </div>
                    {isSelected && (
                      <span className="text-gold text-xs font-bold bg-gold/10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {rank + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="glass border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button onClick={handleCompare} disabled={selected.length < 2}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-obsidian font-semibold py-4 rounded-xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(212,165,116,0.2)]">
            <Scale size={16} />
            {selected.length < 2 ? `あと${2 - selected.length}つ選択してください` : `${selected.length}つの商品を比較する`}
          </button>
        </div>
      )}

      {step === "loading" && (
        <div className="flex flex-col items-center justify-center py-16 space-y-8">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full border border-gold/20 animate-ping" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gradient-radial from-gold/15 to-transparent flex items-center justify-center">
                <Scale size={32} className="text-gold animate-pulse" />
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gold text-sm font-medium tracking-wider">商品を比較しています</p>
            <p className="text-pearl-dim text-xs mt-1">AIが詳しく分析中...</p>
          </div>
        </div>
      )}

      {step === "results" && result && (
        <div className="space-y-5 animate-slide-up">
          {/* Winner banner */}
          {result.winner && (
            <div className="glass-gold rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <Star size={18} className="text-gold" fill="currentColor" />
              </div>
              <div>
                <p className="text-gold/60 text-xs tracking-wider mb-0.5">総合おすすめ</p>
                <p className="text-pearl font-semibold">{result.winner}</p>
              </div>
            </div>
          )}

          {/* Product cards – horizontal scroll */}
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-2" style={{ minWidth: `${result.products.length * 260}px` }}>
              {result.products.map((p, i) => {
                const orig = allProducts.find(o => o.id === p.id);
                const isWinner = result.winner && p.name === result.winner;
                return (
                  <div key={p.id} className={`rounded-2xl flex-shrink-0 overflow-hidden ${isWinner ? "glass-gold border border-gold/30" : "glass"}`}
                    style={{ width: "240px" }}>
                    {/* Header */}
                    <div className={`p-4 border-b ${isWinner ? "border-gold/20" : "border-white/5"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${RANK_COLORS[i] ?? "bg-white/10 text-pearl-muted"}`}>
                          {i + 1}
                        </div>
                        {isWinner && (
                          <span className="text-[10px] text-gold border border-gold/30 rounded-full px-2 py-0.5">おすすめ</span>
                        )}
                      </div>
                      <p className="text-gold/70 text-[10px]">{p.brand}</p>
                      <p className="text-pearl text-sm font-semibold leading-tight mt-0.5">{p.name}</p>
                      {orig?.price && <p className="text-pearl-dim text-xs mt-1">{orig.price}</p>}
                    </div>

                    {/* Score bars */}
                    <div className="p-4 space-y-3">
                      {SCORE_LABELS.map(({ key, label }) => {
                        const score = (p.scores as Record<string, number>)[key] ?? 0;
                        return (
                          <div key={key}>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-pearl-dim">{label}</span>
                              <span className="text-gold font-semibold">{score}</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-gold/60 to-gold rounded-full"
                                style={{ width: `${score}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Strengths */}
                    <div className="px-4 pb-3">
                      <p className="text-pearl-dim text-[10px] font-semibold tracking-wider mb-2">強み</p>
                      <ul className="space-y-1">
                        {p.strengths.slice(0, 3).map((s, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-[11px] text-pearl-muted">
                            <span className="text-gold flex-shrink-0 mt-0.5">✦</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    {p.weaknesses.length > 0 && (
                      <div className="px-4 pb-3">
                        <p className="text-pearl-dim text-[10px] font-semibold tracking-wider mb-2">弱み</p>
                        <ul className="space-y-1">
                          {p.weaknesses.slice(0, 2).map((w, j) => (
                            <li key={j} className="flex items-start gap-1.5 text-[11px] text-pearl-muted/70">
                              <span className="text-pearl-dim flex-shrink-0 mt-0.5">–</span>{w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Best for */}
                    <div className="px-4 pb-4">
                      <div className="bg-white/3 rounded-xl p-2.5">
                        <p className="text-pearl-dim text-[10px] font-semibold mb-1">こんな人に</p>
                        <p className="text-pearl-muted text-[11px] leading-relaxed">{p.bestFor}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scroll hint on mobile */}
          <p className="text-pearl-dim/40 text-[10px] text-center md:hidden flex items-center justify-center gap-1">
            <ChevronRight size={10} /> 横にスクロールして全商品を確認
          </p>

          {/* AI analysis */}
          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-[10px] font-bold">B</span>
              </div>
              <h3 className="text-gold text-sm font-semibold tracking-wider">AI比較分析</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.comparison}</p>
          </div>

          {/* Recommendation */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-pearl text-sm font-semibold mb-3 tracking-wider">購入アドバイス</h3>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.recommendation}</p>
          </div>

          <button onClick={reset}
            className="w-full glass border border-white/10 hover:border-gold/20 text-pearl-muted hover:text-pearl py-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
            <RotateCcw size={14} /> 別の商品を比較する
          </button>
        </div>
      )}
    </PageWrapper>
  );
}
