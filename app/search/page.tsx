"use client";

import { useState, useRef } from "react";
import { Search, Send, ArrowRight, Star, Lightbulb } from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import type { SearchResult, ProductRecommendation } from "@/lib/types";

const QUICK_SEARCHES = [
  "乾燥肌向けの保湿美容液",
  "ニキビ跡のケア方法と商品",
  "30代向けエイジングケア",
  "敏感肌でも使えるSPF50日焼け止め",
  "毛穴を引き締めるトナー",
  "ビタミンC配合の美白コスメ",
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
    } catch {
      setError("検索に失敗しました。もう一度お試しください。");
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
    textareaRef.current?.focus();
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">
          Free Search
        </p>
        <h1
          className="text-3xl font-semibold text-pearl"
          style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
        >
          フリー検索
        </h1>
        <p className="text-pearl-muted text-sm mt-2">
          気になることを自由に質問してください
        </p>
      </div>

      {/* Search input (always visible) */}
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

      {/* Quick searches (when no result) */}
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
                    <span className="text-pearl-muted text-sm group-hover:text-pearl transition-colors">
                      {q}
                    </span>
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
            <p className="text-pearl-dim/50 text-xs">
              何でも自由に質問してください
            </p>
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
            <p className="text-pearl-dim text-xs mt-1 max-w-[200px] leading-relaxed">
              &ldquo;{query}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5 animate-slide-up">
          {/* Summary */}
          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-[10px] font-bold">B</span>
              </div>
              <h3 className="text-gold text-sm font-semibold tracking-wider">AIの回答</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.summary}</p>
          </div>

          {/* Results */}
          {result.results && result.results.length > 0 && (
            <div>
              <h3
                className="text-pearl text-base font-semibold mb-4"
                style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
              >
                検索結果 ({result.results.length}件)
              </h3>
              <div className="space-y-4">
                {result.results.map((item: ProductRecommendation, i: number) => (
                  <SearchResultCard key={item.id} item={item} rank={i + 1} />
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

function SearchResultCard({ item, rank }: { item: ProductRecommendation; rank: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold flex-shrink-0 ${
              rank === 1 ? "bg-gold text-obsidian" : rank === 2 ? "bg-gold/30 text-gold" : "bg-white/10 text-pearl-muted"
            }`}
          >
            {rank === 1 ? <Star size={12} fill="currentColor" /> : rank}
          </div>

          <div className="flex-1 min-w-0">
            {item.brand && (
              <p className="text-gold/70 text-xs font-medium mb-0.5">{item.brand}</p>
            )}
            <h4
              className="text-pearl font-semibold text-sm"
              style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
            >
              {item.name}
            </h4>
            {item.category && (
              <p className="text-pearl-dim text-xs mt-0.5">{item.category}</p>
            )}
          </div>

          {item.matchScore > 0 && (
            <div className="text-right flex-shrink-0">
              <div className="text-gold font-bold text-lg">{item.matchScore}</div>
              <div className="text-pearl-dim text-[10px]">スコア</div>
            </div>
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
      </div>

      {(item.reasons?.length > 1 || item.howToUse) && (
        <>
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-center gap-1 py-3 border-t border-white/5 text-pearl-dim hover:text-gold text-xs transition-colors"
          >
            {open ? "閉じる" : "詳細を見る"}
            <ArrowRight size={11} className={`transition-transform ${open ? "rotate-90" : ""}`} />
          </button>

          {open && (
            <div className="px-5 pb-5 border-t border-white/5 space-y-4">
              {item.reasons?.length > 1 && (
                <div>
                  <p className="text-pearl-dim text-xs font-semibold mb-2 tracking-wider">詳細</p>
                  <ul className="space-y-1.5">
                    {item.reasons.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-pearl-muted">
                        <span className="text-gold flex-shrink-0 mt-0.5">✦</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {item.howToUse && (
                <div>
                  <p className="text-pearl-dim text-xs font-semibold mb-2 tracking-wider">使用方法</p>
                  <p className="text-pearl-muted text-sm">{item.howToUse}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
