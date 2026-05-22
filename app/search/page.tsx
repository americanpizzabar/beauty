"use client";

import { useState, useRef } from "react";
import {
  Search, Send, ArrowRight, Star, Lightbulb, Plus, ExternalLink,
  MessageCircle, Check, ChevronDown, Table2,
} from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import { addCustomProduct } from "@/lib/storage";
import type { SearchResult, ProductRecommendation } from "@/lib/types";

const QUICK_SEARCHES = [
  "乾燥肌向けの保湿美容液",
  "ニキビ跡のケア方法と商品",
  "30代向けエイジングケア",
  "敏感肌でも使えるSPF50日焼け止め",
  "毛穴を引き締めるトナー",
  "ビタミンC配合の美白コスメ",
];

function shopLinks(brand: string, name: string) {
  const q = encodeURIComponent(`${brand} ${name}`.trim());
  return [
    { label: "Google", url: `https://www.google.com/search?q=${q}+購入` },
    { label: "Amazon", url: `https://www.amazon.co.jp/s?k=${q}` },
    { label: "楽天", url: `https://search.rakuten.co.jp/search/mall/${q}/` },
  ];
}

function scoreClass(score: number) {
  if (score >= 90) return "bg-gold/20 text-gold";
  if (score >= 75) return "bg-emerald-500/15 text-emerald-400";
  if (score >= 60) return "bg-sky-500/15 text-sky-400";
  return "bg-white/10 text-pearl-muted";
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "検索に失敗しました");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "検索に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleQuick = (q: string) => {
    setQuery(q);
    setResult(null);
    handleSearch(q);
  };

  const reset = () => {
    setResult(null);
    setQuery("");
    setError(null);
    setSavedIds(new Set());
    textareaRef.current?.focus();
  };

  const handleSave = (item: ProductRecommendation) => {
    addCustomProduct({
      name: item.name,
      brand: item.brand,
      category: item.category,
      price: item.price,
      description: item.reasons?.join(" ") || "",
      key_ingredients: item.keyIngredients || [],
      skin_types: [],
      concerns: [],
      how_to_use: item.howToUse || "",
    });
    setSavedIds((prev) => new Set([...prev, item.id]));
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">Free Search</p>
        <h1
          className="text-3xl font-semibold text-pearl"
          style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
        >
          フリー検索
        </h1>
        <p className="text-pearl-muted text-sm mt-2">気になることを自由に質問してください</p>
      </div>

      {/* Search input */}
      <div className="relative mb-6">
        <div className="glass-gold rounded-2xl p-4 border border-gold/10 focus-within:border-gold/30 transition-colors">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：30代の乾燥肌に合う保湿美容液を教えて。プチプラでも効果的なものが知りたい。"
            rows={3}
            className="w-full bg-transparent border-none text-pearl text-sm leading-relaxed resize-none focus:outline-none placeholder:text-pearl-dim/50"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-pearl-dim/40 text-[10px]">Enter で送信・Shift+Enter で改行</p>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                query.trim() && !loading
                  ? "bg-gold text-obsidian hover:bg-gold-light"
                  : "bg-white/5 text-pearl-dim cursor-not-allowed"
              }`}
            >
              {loading ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={13} />
              )}
              検索
            </button>
          </div>
        </div>
      </div>

      {/* Quick searches */}
      {!result && !loading && (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={14} className="text-gold/60" />
              <p className="text-pearl-dim text-xs font-semibold tracking-wider">クイック検索</p>
            </div>
            <div className="space-y-2">
              {QUICK_SEARCHES.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuick(q)}
                  className="w-full flex items-center justify-between glass border border-white/6 hover:border-gold/20 rounded-xl px-4 py-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Search size={13} className="text-pearl-dim/50 flex-shrink-0" />
                    <span className="text-pearl-muted text-sm group-hover:text-pearl transition-colors">{q}</span>
                  </div>
                  <ArrowRight size={12} className="text-pearl-dim/30 group-hover:text-gold group-hover:translate-x-1 transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-radial from-gold/5 to-transparent flex items-center justify-center">
              <Search size={24} className="text-gold/30" />
            </div>
            <p className="text-pearl-dim/50 text-xs">何でも自由に質問してください</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border border-gold/20 animate-spin border-t-gold" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Search size={18} className="text-gold" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-gold text-sm font-medium">AIが検索中</p>
            <p className="text-pearl-dim text-xs mt-1 max-w-[200px] leading-relaxed">&ldquo;{query}&rdquo;</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-6 animate-slide-up">
          {/* AI Summary */}
          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-[10px] font-bold">B</span>
              </div>
              <h3 className="text-gold text-sm font-semibold tracking-wider">AIの回答</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.summary}</p>
          </div>

          {/* Comparison table */}
          {result.results?.length > 0 && (
            <ComparisonTable results={result.results} />
          )}

          {/* Individual cards */}
          {result.results?.length > 0 && (
            <div>
              <h3
                className="text-pearl text-base font-semibold mb-4"
                style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
              >
                商品詳細 ({result.results.length}件)
              </h3>
              <div className="space-y-4">
                {result.results.map((item: ProductRecommendation, i: number) => (
                  <SearchResultCard
                    key={item.id}
                    item={item}
                    rank={i + 1}
                    saved={savedIds.has(item.id)}
                    onSave={() => handleSave(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Expert advice */}
          {result.expertAdvice && (
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={14} className="text-gold" />
                <h3 className="text-pearl text-sm font-semibold tracking-wider">専門家のアドバイス</h3>
              </div>
              <p className="text-pearl-muted text-sm leading-relaxed italic">{result.expertAdvice}</p>
            </div>
          )}

          <button
            onClick={reset}
            className="w-full glass border border-white/10 hover:border-gold/20 text-pearl-muted hover:text-pearl py-4 rounded-xl transition-all text-sm"
          >
            新しい検索をする
          </button>
        </div>
      )}

      {error && (
        <div className="glass border border-red-500/20 rounded-xl px-4 py-3 mt-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </PageWrapper>
  );
}

// ── Comparison table ───────────────────────────────────

function ComparisonTable({ results }: { results: ProductRecommendation[] }) {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-white/5">
        <Table2 size={14} className="text-gold" />
        <h3 className="text-pearl text-sm font-semibold tracking-wider">
          全商品比較 ({results.length}件)
        </h3>
        <span className="text-pearl-dim/40 text-[10px] ml-auto">← 横にスクロール</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[580px]">
          <thead>
            <tr className="border-b border-white/5">
              {["#", "商品名 / ブランド", "カテゴリー", "価格", "スコア", "主成分"].map((h) => (
                <th key={h} className="text-pearl-dim/60 text-[10px] px-4 py-3 font-semibold tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((item, i) => (
              <tr key={item.id} className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${i === results.length - 1 ? "border-b-0" : ""}`}>
                <td className="px-4 py-3">
                  {i === 0 ? (
                    <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center">
                      <Star size={10} fill="currentColor" className="text-obsidian" />
                    </div>
                  ) : (
                    <span className="text-pearl-dim text-xs font-medium">{i + 1}</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[160px]">
                  {item.brand && (
                    <p className="text-gold/70 text-[10px] mb-0.5 truncate">{item.brand}</p>
                  )}
                  <p className="text-pearl text-xs font-semibold leading-tight">{item.name}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="text-pearl-muted text-[11px] whitespace-nowrap">{item.category || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-pearl-muted text-[11px] whitespace-nowrap">{item.price || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreClass(item.matchScore)}`}>
                    {item.matchScore}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.keyIngredients?.slice(0, 2).map((ing, j) => (
                      <span key={j} className="text-[9px] bg-white/5 text-pearl-dim px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        {ing}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Individual card ────────────────────────────────────

type DeepenAnswer = { answer: string; tips: string[]; relatedProducts: string[] };

function SearchResultCard({
  item,
  rank,
  saved,
  onSave,
}: {
  item: ProductRecommendation;
  rank: number;
  saved: boolean;
  onSave: () => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [deepOpen, setDeepOpen] = useState(false);
  const [deepQ, setDeepQ] = useState("");
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepAnswer, setDeepAnswer] = useState<DeepenAnswer | null>(null);
  const [deepError, setDeepError] = useState<string | null>(null);

  const handleDeepen = async () => {
    if (!deepQ.trim()) return;
    setDeepLoading(true);
    setDeepError(null);
    try {
      const res = await fetch("/api/search/deepen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            name: item.name,
            brand: item.brand,
            category: item.category,
            price: item.price,
            keyIngredients: item.keyIngredients,
          },
          question: deepQ,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "エラーが発生しました");
      setDeepAnswer(data);
    } catch (err) {
      setDeepError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setDeepLoading(false);
    }
  };

  const links = shopLinks(item.brand || "", item.name);
  const hasDetail = (item.reasons?.length ?? 0) > 1 || !!item.howToUse;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header row */}
      <div className="p-5">
        <div className="flex items-start gap-3">
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
            {item.brand && <p className="text-gold/70 text-xs font-medium mb-0.5">{item.brand}</p>}
            <h4
              className="text-pearl font-semibold text-sm"
              style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
            >
              {item.name}
            </h4>
            {item.category && <p className="text-pearl-dim text-xs mt-0.5">{item.category}</p>}
          </div>

          {item.matchScore > 0 && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${scoreClass(item.matchScore)}`}>
              {item.matchScore}
            </span>
          )}
        </div>

        {item.price && (
          <p className="text-pearl-muted text-xs mt-2 ml-11">参考価格: {item.price}</p>
        )}
        {item.reasons?.[0] && (
          <p className="text-pearl-muted text-xs mt-2 ml-11 leading-relaxed">{item.reasons[0]}</p>
        )}
        {item.keyIngredients?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-11">
            {item.keyIngredients.slice(0, 3).map((ing: string, i: number) => (
              <span key={i} className="tag-chip bg-white/5 text-pearl-dim">{ing}</span>
            ))}
          </div>
        )}

        {/* Action row */}
        <div className="flex flex-wrap items-center gap-2 mt-3 ml-11">
          <button
            onClick={onSave}
            disabled={saved}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              saved
                ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                : "bg-gold/10 text-gold hover:bg-gold/20 border border-gold/20"
            }`}
          >
            {saved ? <Check size={10} /> : <Plus size={10} />}
            {saved ? "DB保存済み" : "DBに保存"}
          </button>

          {links.map(({ label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] bg-white/5 text-pearl-dim hover:text-pearl hover:bg-white/10 transition-all"
            >
              <ExternalLink size={9} />
              {label}で検索
            </a>
          ))}
        </div>
      </div>

      {/* Detail toggle */}
      {hasDetail && (
        <>
          <button
            onClick={() => setDetailOpen(!detailOpen)}
            className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-white/5 text-pearl-dim hover:text-gold text-xs transition-colors"
          >
            {detailOpen ? "詳細を閉じる" : "詳細を見る"}
            <ChevronDown size={11} className={`transition-transform ${detailOpen ? "rotate-180" : ""}`} />
          </button>

          {detailOpen && (
            <div className="px-5 pb-4 border-t border-white/5 space-y-3">
              {(item.reasons?.length ?? 0) > 1 && (
                <div>
                  <p className="text-pearl-dim text-[10px] font-semibold mb-1.5 tracking-wider mt-3">選定理由</p>
                  <ul className="space-y-1.5">
                    {item.reasons.slice(1).map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-pearl-muted">
                        <span className="text-gold flex-shrink-0 mt-0.5">✦</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {item.howToUse && (
                <div>
                  <p className="text-pearl-dim text-[10px] font-semibold mb-1.5 tracking-wider">使用方法</p>
                  <p className="text-pearl-muted text-xs">{item.howToUse}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Deep-dive section */}
      <button
        onClick={() => setDeepOpen(!deepOpen)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-white/5 text-pearl-dim hover:text-gold text-xs transition-colors"
      >
        <MessageCircle size={11} />
        {deepOpen ? "質問を閉じる" : "この商品について深掘りする"}
        <ChevronDown size={10} className={`transition-transform ${deepOpen ? "rotate-180" : ""}`} />
      </button>

      {deepOpen && (
        <div className="px-5 pb-5 border-t border-white/5">
          <p className="text-pearl-dim/60 text-[11px] mt-3 mb-2 leading-relaxed">
            この商品についてさらに知りたいことはありますか？AIがプロの視点でお答えします。
          </p>
          <p className="text-pearl-dim/40 text-[10px] mb-2">
            例：敏感肌でも使えますか？ / 他の美容液と重ねて使えますか？ / どのような肌悩みに最も効果的ですか？
          </p>
          <div className="flex gap-2">
            <textarea
              value={deepQ}
              onChange={(e) => setDeepQ(e.target.value)}
              placeholder="質問を入力してください..."
              rows={2}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-pearl text-xs placeholder:text-pearl-dim/40 focus:outline-none focus:border-gold/30 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleDeepen();
                }
              }}
            />
            <button
              onClick={handleDeepen}
              disabled={deepLoading || !deepQ.trim()}
              className={`px-3 rounded-xl text-xs font-semibold transition-all self-stretch flex items-center justify-center ${
                deepQ.trim() && !deepLoading
                  ? "bg-gold text-obsidian hover:bg-gold-light"
                  : "bg-white/5 text-pearl-dim cursor-not-allowed"
              }`}
            >
              {deepLoading ? (
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={12} />
              )}
            </button>
          </div>

          {deepError && (
            <p className="text-red-400 text-xs mt-2">{deepError}</p>
          )}

          {deepAnswer && (
            <div className="mt-4 space-y-3">
              <div className="glass-gold rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-4 h-4 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold text-[8px] font-bold">B</span>
                  </div>
                  <span className="text-gold text-[10px] font-semibold tracking-wider">AIの回答</span>
                </div>
                <p className="text-pearl-muted text-xs leading-relaxed">{deepAnswer.answer}</p>
              </div>

              {deepAnswer.tips?.length > 0 && (
                <ul className="space-y-1.5">
                  {deepAnswer.tips.filter(Boolean).map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-pearl-muted">
                      <span className="text-gold/60 flex-shrink-0 mt-0.5">✦</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              )}

              {deepAnswer.relatedProducts?.filter(Boolean).length > 0 && (
                <div>
                  <p className="text-pearl-dim text-[10px] font-semibold tracking-wider mb-1.5">関連商品</p>
                  <div className="flex flex-wrap gap-1">
                    {deepAnswer.relatedProducts.filter(Boolean).map((p, i) => (
                      <span key={i} className="text-[10px] bg-white/5 text-pearl-dim px-2 py-1 rounded-full border border-white/8">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => { setDeepQ(""); setDeepAnswer(null); }}
                className="text-pearl-dim/50 hover:text-pearl-dim text-[10px] transition-colors"
              >
                別の質問をする
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
