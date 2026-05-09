"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Minus } from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import AnalysisLoader from "@/components/AnalysisLoader";
import ScoreBar from "@/components/ScoreBar";
import type { AnalysisResult } from "@/lib/types";

type SafetyLevel = "safe" | "caution" | "avoid";
type CompatibilityLevel = "excellent" | "good" | "fair" | "poor";
type IntensityLevel = "high" | "medium" | "low";

const SAFETY_CONFIG: Record<SafetyLevel, { label: string; color: string; bg: string }> = {
  safe: { label: "安全", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  caution: { label: "注意", color: "text-amber-400", bg: "bg-amber-500/10" },
  avoid: { label: "要注意", color: "text-red-400", bg: "bg-red-500/10" },
};

const COMPAT_CONFIG: Record<CompatibilityLevel, { label: string; color: string; dots: number }> = {
  excellent: { label: "◎ 最適", color: "text-emerald-400", dots: 4 },
  good: { label: "○ 良好", color: "text-green-400", dots: 3 },
  fair: { label: "△ 普通", color: "text-amber-400", dots: 2 },
  poor: { label: "✕ 不向き", color: "text-red-400", dots: 1 },
};

const INTENSITY_CONFIG: Record<IntensityLevel, string> = {
  high: "bg-gold text-obsidian",
  medium: "bg-gold/40 text-gold",
  low: "bg-white/10 text-pearl-muted",
};

export default function AnalyzePage() {
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    effects: true,
    ingredients: false,
    skinTypes: true,
    irritants: false,
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImage(url);
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const analyze = async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "分析に失敗しました");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageFile(null);
    setResult(null);
    setError(null);
  };

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">
          AI Analysis
        </p>
        <h1
          className="text-3xl font-semibold text-pearl"
          style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
        >
          製品分析
        </h1>
        <p className="text-pearl-muted text-sm mt-2">
          化粧品・美容品の写真を撮影または選択してください
        </p>
      </div>

      {/* Image upload area */}
      {!result && !loading && (
        <div className="space-y-4">
          {image ? (
            <div className="relative rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt="分析する製品"
                className="w-full max-h-72 object-contain bg-white/3 rounded-2xl"
              />
              <button
                onClick={reset}
                className="absolute top-3 right-3 w-8 h-8 glass rounded-full flex items-center justify-center text-pearl-muted hover:text-gold transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="glass border-2 border-dashed border-white/10 hover:border-gold/30 rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer group"
              onClick={() => fileRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gold/5 border border-gold/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-gold/60" />
                </div>
                <div>
                  <p className="text-pearl font-medium text-sm">画像をドロップまたはタップ</p>
                  <p className="text-pearl-dim text-xs mt-1">JPG, PNG, WEBP 対応</p>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 glass-gold border border-gold/20 rounded-xl py-3.5 text-sm font-medium text-gold hover:bg-gold/10 transition-all"
            >
              <Camera size={16} />
              カメラで撮影
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 glass border border-white/10 rounded-xl py-3.5 text-sm font-medium text-pearl hover:border-gold/20 transition-all"
            >
              <Upload size={16} />
              ファイルを選択
            </button>
          </div>

          {image && (
            <button
              onClick={analyze}
              className="w-full bg-gold hover:bg-gold-light text-obsidian font-semibold py-4 rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(212,165,116,0.2)] text-sm tracking-wide"
            >
              ✦ AI分析を開始する
            </button>
          )}

          {error && (
            <div className="flex items-center gap-3 glass border border-red-500/20 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && <AnalysisLoader />}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5 animate-slide-up">
          {/* Product header */}
          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gold/60 text-xs tracking-[0.2em] uppercase font-medium">
                  {result.brand}
                </p>
                <h2
                  className="text-xl font-semibold text-pearl mt-1"
                  style={{ fontFamily: "var(--font-playfair, 'Playfair Display', serif)" }}
                >
                  {result.productName}
                </h2>
                <span className="inline-block mt-1 tag-chip bg-gold/10 text-gold border border-gold/15">
                  {result.category}
                </span>
              </div>
              <button
                onClick={reset}
                className="text-pearl-dim hover:text-gold transition-colors text-xs underline"
              >
                再分析
              </button>
            </div>
            <p className="text-pearl-muted text-sm mt-3 leading-relaxed">{result.overview}</p>
          </div>

          {/* Score cards */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="text-pearl text-sm font-semibold tracking-wider">スコア評価</h3>
            <ScoreBar label="保湿力" value={result.rating.hydration} delay={0} />
            <ScoreBar label="美白・透明感" value={result.rating.brightening} delay={100} />
            <ScoreBar label="エイジングケア" value={result.rating.antiAging} delay={200} />
            <ScoreBar label="敏感肌適合度" value={result.rating.sensitivity} color="rose" delay={300} />
          </div>

          {/* Effects */}
          <div className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle("effects")}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <h3 className="text-pearl text-sm font-semibold tracking-wider">効果・効能</h3>
              {expanded.effects ? <ChevronUp size={16} className="text-pearl-dim" /> : <ChevronDown size={16} className="text-pearl-dim" />}
            </button>
            {expanded.effects && (
              <div className="px-5 pb-5 space-y-3 border-t border-white/5">
                {result.effects.map((effect, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`tag-chip mt-0.5 flex-shrink-0 ${INTENSITY_CONFIG[effect.intensity as IntensityLevel]}`}>
                      {effect.intensity === "high" ? "高" : effect.intensity === "medium" ? "中" : "低"}
                    </span>
                    <div>
                      <p className="text-pearl text-sm font-medium">{effect.name}</p>
                      <p className="text-pearl-muted text-xs mt-0.5 leading-relaxed">{effect.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skin type compatibility */}
          <div className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle("skinTypes")}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <h3 className="text-pearl text-sm font-semibold tracking-wider">肌タイプ別相性</h3>
              {expanded.skinTypes ? <ChevronUp size={16} className="text-pearl-dim" /> : <ChevronDown size={16} className="text-pearl-dim" />}
            </button>
            {expanded.skinTypes && (
              <div className="px-5 pb-5 space-y-3 border-t border-white/5">
                {result.skinTypes.map((st, i) => {
                  const cfg = COMPAT_CONFIG[st.compatibility as CompatibilityLevel];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`text-sm flex-shrink-0 font-medium ${cfg.color} min-w-[70px]`}>
                        {cfg.label}
                      </span>
                      <div>
                        <p className="text-pearl text-sm font-medium">{st.type}</p>
                        <p className="text-pearl-muted text-xs mt-0.5 leading-relaxed">{st.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ingredients */}
          <div className="glass rounded-2xl overflow-hidden">
            <button
              onClick={() => toggle("ingredients")}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <h3 className="text-pearl text-sm font-semibold tracking-wider">主要成分</h3>
              {expanded.ingredients ? <ChevronUp size={16} className="text-pearl-dim" /> : <ChevronDown size={16} className="text-pearl-dim" />}
            </button>
            {expanded.ingredients && (
              <div className="px-5 pb-5 space-y-3 border-t border-white/5">
                {result.ingredients.map((ing, i) => {
                  const safety = SAFETY_CONFIG[ing.safety as SafetyLevel];
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`tag-chip flex-shrink-0 ${safety.bg} ${safety.color}`}>
                        {safety.label}
                      </span>
                      <div>
                        <p className="text-pearl text-sm font-medium">{ing.name}</p>
                        <p className="text-pearl-muted text-xs mt-0.5">{ing.purpose}</p>
                        {ing.concentration && (
                          <p className="text-pearl-dim text-[10px] mt-0.5">配合量: {ing.concentration}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Irritants */}
          {result.irritants.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden border border-amber-500/10">
              <button
                onClick={() => toggle("irritants")}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <h3 className="text-pearl text-sm font-semibold tracking-wider">注意成分</h3>
                </div>
                {expanded.irritants ? <ChevronUp size={16} className="text-pearl-dim" /> : <ChevronDown size={16} className="text-pearl-dim" />}
              </button>
              {expanded.irritants && (
                <div className="px-5 pb-5 space-y-3 border-t border-white/5">
                  {result.irritants.map((ir, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`tag-chip flex-shrink-0 ${ir.risk === "high" ? "bg-red-500/10 text-red-400" : ir.risk === "medium" ? "bg-amber-500/10 text-amber-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                        {ir.risk === "high" ? "高" : ir.risk === "medium" ? "中" : "低"}リスク
                      </span>
                      <div>
                        <p className="text-pearl text-sm font-medium">{ir.name}</p>
                        <p className="text-pearl-muted text-xs mt-0.5 leading-relaxed">{ir.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Usage */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={14} className="text-gold" />
              <h3 className="text-pearl text-sm font-semibold tracking-wider">使用方法</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed">{result.usage}</p>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="glass border border-red-500/10 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-400" />
                <h3 className="text-pearl text-sm font-semibold tracking-wider">注意事項</h3>
              </div>
              {result.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Minus size={12} className="text-red-400 mt-1 flex-shrink-0" />
                  <p className="text-pearl-muted text-sm">{w}</p>
                </div>
              ))}
            </div>
          )}

          {/* Expert advice */}
          <div className="glass-gold rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold text-[10px] font-bold">B</span>
              </div>
              <h3 className="text-gold text-sm font-semibold tracking-wider">専門家のアドバイス</h3>
            </div>
            <p className="text-pearl-muted text-sm leading-relaxed italic">{result.expertAdvice}</p>
          </div>

          {/* Reset button */}
          <button
            onClick={reset}
            className="w-full glass border border-white/10 hover:border-gold/20 text-pearl-muted hover:text-pearl py-4 rounded-xl transition-all text-sm"
          >
            別の製品を分析する
          </button>
        </div>
      )}
    </PageWrapper>
  );
}
