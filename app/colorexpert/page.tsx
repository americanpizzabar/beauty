"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Palette, Camera, Upload, Zap, Clock, AlertTriangle,
  Package, Plus, Trash2, ChevronDown, ArrowRight, CheckCircle,
} from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import {
  getColorInventory, addColorInventoryItem, deleteColorInventoryItem,
  type ColorInventoryItem,
} from "@/lib/storage";
import type { HairAnalysis, ColorTarget, ColorRecipe } from "@/lib/types";

type Tab = "analyze" | "recipe" | "inventory";

const DAMAGE_STYLE: Record<string, string> = {
  healthy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  mild: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  moderate: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  severe: "text-red-400 bg-red-400/10 border-red-400/20",
};
const DAMAGE_LABEL: Record<string, string> = {
  healthy: "健康", mild: "軽微", moderate: "中程度", severe: "重度",
};
const POROSITY_LABEL: Record<string, string> = { low: "低", medium: "普通", high: "高" };
const ELASTICITY_LABEL: Record<string, string> = { good: "良好", normal: "普通", poor: "低下" };
const DIFFICULTY_STYLE: Record<string, string> = {
  easy: "text-emerald-400", moderate: "text-yellow-400", challenging: "text-red-400",
};
const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "易しい", moderate: "普通", challenging: "難しい",
};
const TYPE_STYLE: Record<string, string> = {
  base: "bg-blue-500/10 text-blue-400",
  control: "bg-purple-500/10 text-purple-400",
  oxi: "bg-amber-500/10 text-amber-400",
};
const TYPE_LABEL: Record<string, string> = {
  base: "1剤", control: "コントロール", oxi: "2剤",
};

const HAIR_LENGTHS = ["ショート（〜10cm）", "ボブ（10〜20cm）", "ミディアム（20〜40cm）", "ロング（40cm〜）"];
const HAIR_DENSITIES = ["少なめ", "普通", "多め", "非常に多め"];

const BLANK_ITEM = { brand: "", series: "", name: "", code: "", type: "base" as ColorInventoryItem["type"], stock: 300, expiresAt: "" };

export default function ColorExpertPage() {
  const [tab, setTab] = useState<Tab>("analyze");

  // ── Analyze state ──────────────────────────────────
  const [hairImageUrl, setHairImageUrl] = useState<string | null>(null);
  const [hairImageFile, setHairImageFile] = useState<File | null>(null);
  const [hairAnalysis, setHairAnalysis] = useState<HairAnalysis | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const hairCameraRef = useRef<HTMLInputElement>(null);
  const hairFileRef = useRef<HTMLInputElement>(null);

  // ── Recipe state ───────────────────────────────────
  const [targetImageUrl, setTargetImageUrl] = useState<string | null>(null);
  const [targetImageFile, setTargetImageFile] = useState<File | null>(null);
  const [targetDescription, setTargetDescription] = useState("");
  const [colorTarget, setColorTarget] = useState<ColorTarget | null>(null);
  const [targetLoading, setTargetLoading] = useState(false);
  const [hairLength, setHairLength] = useState("");
  const [hairDensity, setHairDensity] = useState("");
  const [allergies, setAllergies] = useState("");
  const [recipe, setRecipe] = useState<ColorRecipe | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const targetFileRef = useRef<HTMLInputElement>(null);

  // ── Inventory state ────────────────────────────────
  const [inventory, setInventory] = useState<ColorInventoryItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<typeof BLANK_ITEM>(BLANK_ITEM);

  useEffect(() => {
    setInventory(getColorInventory());
  }, []);

  // ── Handlers ───────────────────────────────────────
  const handleHairFile = useCallback((file: File) => {
    setHairImageFile(file);
    setHairImageUrl(URL.createObjectURL(file));
    setHairAnalysis(null);
    setAnalyzeError(null);
  }, []);

  const handleTargetFile = useCallback((file: File) => {
    setTargetImageFile(file);
    setTargetImageUrl(URL.createObjectURL(file));
    setColorTarget(null);
  }, []);

  const analyzeHair = async () => {
    if (!hairImageFile) { setAnalyzeError("髪の写真を選択してください"); return; }
    setAnalyzeError(null);
    setAnalyzeLoading(true);
    try {
      const formData = new FormData();
      formData.append("image", hairImageFile);
      const res = await fetch("/api/colorexpert/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHairAnalysis(data as HairAnalysis);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "解析に失敗しました");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const analyzeTarget = async () => {
    setTargetLoading(true);
    try {
      let res: Response;
      if (targetImageFile) {
        const formData = new FormData();
        formData.append("image", targetImageFile);
        if (targetDescription) formData.append("description", targetDescription);
        res = await fetch("/api/colorexpert/target", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/colorexpert/target", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: targetDescription }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setColorTarget(data as ColorTarget);
    } catch (err) {
      setRecipeError(err instanceof Error ? err.message : "ターゲット解析に失敗しました");
    } finally {
      setTargetLoading(false);
    }
  };

  const generateRecipe = async () => {
    if (!hairAnalysis) { setRecipeError("まず「髪の診断」タブで解析を行ってください"); return; }
    setRecipeError(null);
    setRecipeLoading(true);
    try {
      const res = await fetch("/api/colorexpert/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hairAnalysis,
          colorTarget: colorTarget ?? { textDescription: targetDescription },
          inventory,
          hairLength,
          hairDensity,
          allergies,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecipe(data as ColorRecipe);
    } catch (err) {
      setRecipeError(err instanceof Error ? err.message : "レシピ生成に失敗しました");
    } finally {
      setRecipeLoading(false);
    }
  };

  const addItem = () => {
    if (!newItem.brand || !newItem.name) return;
    addColorInventoryItem(newItem);
    setInventory(getColorInventory());
    setNewItem(BLANK_ITEM);
    setShowAddForm(false);
  };

  const deleteItem = (id: string) => {
    deleteColorInventoryItem(id);
    setInventory(getColorInventory());
  };

  // ── Render ─────────────────────────────────────────
  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6">
        <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">Color Expert AI</p>
        <h1 className="text-3xl font-semibold text-pearl" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)" }}>
          COLOREXPERT
        </h1>
        <p className="text-pearl-muted text-sm mt-2">ヘアカラー診断・AIレシピ生成システム</p>
      </div>

      {/* In-page tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1 mb-6">
        {([
          { key: "analyze" as Tab, label: "髪の診断" },
          { key: "recipe" as Tab, label: "レシピ" },
          { key: "inventory" as Tab, label: "在庫管理" },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === key ? "bg-gold/10 text-gold border border-gold/20" : "text-pearl-muted hover:text-pearl"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Analyze ── */}
      {tab === "analyze" && (
        <div className="space-y-5">
          {/* Hidden file inputs */}
          <input ref={hairCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => e.target.files?.[0] && handleHairFile(e.target.files[0])} />
          <input ref={hairFileRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && handleHairFile(e.target.files[0])} />

          <div className="glass rounded-2xl p-5">
            <p className="text-pearl text-xs font-semibold tracking-wider mb-4">髪の写真を撮影・アップロード</p>

            {hairImageUrl ? (
              <div className="relative rounded-xl overflow-hidden mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hairImageUrl} alt="Hair" className="w-full max-h-64 object-cover" />
                <button onClick={() => { setHairImageUrl(null); setHairImageFile(null); setHairAnalysis(null); }}
                  className="absolute top-2 right-2 glass rounded-full p-1.5 text-pearl-muted hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center gap-3 mb-4">
                <Camera size={32} className="text-pearl-dim/40" />
                <p className="text-pearl-dim text-xs text-center leading-relaxed">
                  根元・中間・毛先が映るように<br />全体を撮影してください
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => hairCameraRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 glass border border-white/10 rounded-xl text-sm text-pearl-muted hover:text-pearl transition-colors">
                <Camera size={14} /> カメラ撮影
              </button>
              <button onClick={() => hairFileRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 glass border border-white/10 rounded-xl text-sm text-pearl-muted hover:text-pearl transition-colors">
                <Upload size={14} /> ライブラリ
              </button>
            </div>
            <p className="text-pearl-dim/40 text-[10px] mt-3 text-center">
              ✦ 自然光またはサロンライトで撮影すると精度が向上します
            </p>
          </div>

          {analyzeError && (
            <div className="glass border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{analyzeError}</p>
            </div>
          )}

          <button onClick={analyzeHair} disabled={!hairImageFile || analyzeLoading}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-obsidian font-semibold py-4 rounded-xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(212,165,116,0.2)]">
            {analyzeLoading
              ? <><div className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin" /> 解析中...</>
              : <><Zap size={16} /> AIで髪質・色調を解析する</>}
          </button>

          {/* ── Analysis Results ── */}
          {hairAnalysis && (
            <div className="space-y-4 animate-slide-up">
              {/* Zone levels */}
              <div className="glass-gold rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold text-[10px] font-bold">B</span>
                  </div>
                  <h3 className="text-gold text-sm font-semibold tracking-wider">部位別レベル診断</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(["roots", "mid", "tips"] as const).map(zone => {
                    const z = hairAnalysis.zones[zone];
                    const label = zone === "roots" ? "根元" : zone === "mid" ? "中間" : "毛先";
                    return (
                      <div key={zone} className="glass rounded-xl p-3 text-center">
                        <p className="text-pearl-dim text-[10px] mb-2">{label}</p>
                        <div className="text-3xl font-bold text-gold">{z.level}</div>
                        <p className="text-pearl-dim text-[9px]">レベル</p>
                        <span className={`mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full border ${DAMAGE_STYLE[z.damage] ?? ""}`}>
                          {DAMAGE_LABEL[z.damage]}
                        </span>
                        {z.undertone && <p className="text-pearl-dim/70 text-[9px] mt-1">{z.undertone}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Undertone analysis */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-pearl text-xs font-semibold tracking-wider mb-4">アンダートーン分析</h3>
                {([
                  { key: "red" as const, label: "赤み", gradient: "from-red-500/60 to-red-400" },
                  { key: "yellow" as const, label: "黄み", gradient: "from-yellow-500/60 to-yellow-400" },
                  { key: "orange" as const, label: "オレンジみ", gradient: "from-orange-500/60 to-orange-400" },
                ]).map(({ key, label, gradient }) => (
                  <div key={key} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-pearl-muted">{label}</span>
                      <span className="text-pearl font-semibold">{hairAnalysis.undertoneAnalysis[key]}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all`}
                        style={{ width: `${hairAnalysis.undertoneAnalysis[key]}%` }} />
                    </div>
                  </div>
                ))}
                <p className="text-pearl-muted text-xs mt-4 leading-relaxed">{hairAnalysis.undertoneDescription}</p>
              </div>

              {/* Condition */}
              <div className="glass rounded-2xl p-5">
                <h3 className="text-pearl text-xs font-semibold tracking-wider mb-4">コンディション診断</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <p className="text-pearl-dim text-[10px] mb-1">総合ダメージ</p>
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${DAMAGE_STYLE[hairAnalysis.overallDamage] ?? ""}`}>
                      {DAMAGE_LABEL[hairAnalysis.overallDamage]}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-pearl-dim text-[10px] mb-1">浸透性</p>
                    <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-pearl">
                      {POROSITY_LABEL[hairAnalysis.porosity] ?? hairAnalysis.porosity}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-pearl-dim text-[10px] mb-1">弾力</p>
                    <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-pearl">
                      {ELASTICITY_LABEL[hairAnalysis.elasticity] ?? hairAnalysis.elasticity}
                    </span>
                  </div>
                </div>
                {hairAnalysis.damageDetails && (
                  <p className="text-pearl-muted text-xs leading-relaxed">{hairAnalysis.damageDetails}</p>
                )}
                {hairAnalysis.cuticleCondition && (
                  <p className="text-pearl-dim text-xs mt-2 leading-relaxed">キューティクル: {hairAnalysis.cuticleCondition}</p>
                )}
              </div>

              {/* Recommended Oxi */}
              <div className="glass-gold rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold font-bold text-sm">{hairAnalysis.recommendedOxi}</span>
                </div>
                <div>
                  <p className="text-gold/60 text-xs tracking-wider">推奨オキシ濃度</p>
                  <p className="text-pearl font-semibold">
                    {hairAnalysis.recommendedOxi === "3%" ? "3%（ダメージ配慮）" :
                     hairAnalysis.recommendedOxi === "6%" ? "6%（標準）" :
                     "AC（低アルカリ・敏感肌向け）"}
                  </p>
                </div>
              </div>

              {hairAnalysis.notes && (
                <div className="glass rounded-2xl p-4">
                  <p className="text-pearl-dim text-xs font-semibold mb-2">施術上のコメント</p>
                  <p className="text-pearl-muted text-sm leading-relaxed italic">{hairAnalysis.notes}</p>
                </div>
              )}

              <button onClick={() => setTab("recipe")}
                className="w-full glass border border-gold/20 text-gold py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gold/5 transition-all">
                レシピ設定へ <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Recipe ── */}
      {tab === "recipe" && (
        <div className="space-y-5">
          {/* Analysis status */}
          <div className={`glass rounded-2xl p-4 flex items-center gap-3 border ${hairAnalysis ? "border-emerald-500/20" : "border-white/5"}`}>
            {hairAnalysis
              ? <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
              : <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0" />}
            <div>
              <p className="text-pearl text-xs font-semibold">髪の診断データ</p>
              {hairAnalysis ? (
                <p className="text-pearl-dim text-[10px]">
                  根元Lv.{hairAnalysis.zones.roots.level} / 中間Lv.{hairAnalysis.zones.mid.level} / 毛先Lv.{hairAnalysis.zones.tips.level}
                  {" · "}推奨オキシ: {hairAnalysis.recommendedOxi}
                </p>
              ) : (
                <button onClick={() => setTab("analyze")} className="text-gold text-[10px] underline">
                  解析タブで先に診断してください
                </button>
              )}
            </div>
          </div>

          {/* Target color */}
          <div className="glass rounded-2xl p-5">
            <p className="text-pearl text-xs font-semibold tracking-wider mb-4">目標カラー設定</p>

            <input ref={targetFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && handleTargetFile(e.target.files[0])} />

            {targetImageUrl && (
              <div className="relative rounded-xl overflow-hidden mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={targetImageUrl} alt="Target" className="w-full max-h-40 object-cover" />
                <button onClick={() => { setTargetImageUrl(null); setTargetImageFile(null); setColorTarget(null); }}
                  className="absolute top-2 right-2 glass rounded-full p-1.5 text-pearl-muted hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            )}

            <button onClick={() => targetFileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 glass border border-white/10 rounded-xl text-sm text-pearl-muted hover:text-pearl transition-colors mb-3">
              <Upload size={14} /> 参考画像（ヘアカタログ等）
            </button>

            <textarea value={targetDescription} onChange={e => setTargetDescription(e.target.value)}
              placeholder="または目標カラーをテキストで入力&#10;例: ラベンダーアッシュ、レベル10、透明感のあるクールトーン"
              rows={3} className="w-full px-4 py-3 rounded-xl text-sm resize-none mb-3" />

            {(targetImageFile || targetDescription.trim()) && !colorTarget && (
              <button onClick={analyzeTarget} disabled={targetLoading}
                className="w-full py-3 bg-gold/10 border border-gold/20 text-gold rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:bg-gold/15">
                {targetLoading
                  ? <><div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /> 解析中...</>
                  : <><Zap size={14} /> ターゲットカラーを解析</>}
              </button>
            )}

            {colorTarget && (
              <div className="glass-gold rounded-xl p-4 mt-3">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <p className="text-gold text-xs font-semibold">ターゲット解析完了</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                  {[
                    { k: "目標レベル", v: String(colorTarget.targetLevel) },
                    { k: "トーン", v: colorTarget.toneFamily },
                    { k: "彩度", v: colorTarget.saturation === "vivid" ? "ビビッド" : colorTarget.saturation === "natural" ? "ナチュラル" : "ミュート" },
                    { k: "難易度", v: DIFFICULTY_LABEL[colorTarget.processDifficulty] },
                  ].map(({ k, v }) => (
                    <div key={k}><span className="text-pearl-dim">{k}: </span>
                      <span className={`font-semibold ${k === "難易度" ? DIFFICULTY_STYLE[colorTarget.processDifficulty] : "text-pearl"}`}>{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-pearl-muted text-xs leading-relaxed">{colorTarget.colorDescription}</p>
                {colorTarget.notes && <p className="text-pearl-dim text-[10px] mt-2 italic">{colorTarget.notes}</p>}
              </div>
            )}
          </div>

          {/* Hair metadata */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <p className="text-pearl text-xs font-semibold tracking-wider">施術データ</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "髪の長さ", value: hairLength, setter: setHairLength, options: HAIR_LENGTHS },
                { label: "毛量", value: hairDensity, setter: setHairDensity, options: HAIR_DENSITIES },
              ].map(({ label, value, setter, options }) => (
                <div key={label}>
                  <label className="text-pearl-dim text-xs mb-1.5 block">{label}</label>
                  <div className="relative">
                    <select value={value} onChange={e => setter(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs appearance-none pr-7">
                      <option value="">選択</option>
                      {options.map(o => <option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="text-pearl-dim text-xs mb-1.5 block">アレルギー・禁忌成分</label>
              <input type="text" value={allergies} onChange={e => setAllergies(e.target.value)}
                placeholder="例：ジアミンアレルギー、パラフェニレンジアミン..."
                className="w-full px-4 py-2.5 rounded-xl text-sm" />
            </div>
          </div>

          {recipeError && (
            <div className="glass border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{recipeError}</p>
            </div>
          )}

          <button onClick={generateRecipe} disabled={recipeLoading || !hairAnalysis}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-obsidian font-semibold py-4 rounded-xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(212,165,116,0.2)]">
            {recipeLoading
              ? <><div className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin" /> レシピ生成中...</>
              : <><Palette size={16} /> カラーレシピを生成する</>}
          </button>

          {/* ── Recipe Results ── */}
          {recipe && (
            <div className="space-y-4 animate-slide-up">
              {/* Warnings */}
              {recipe.warnings.length > 0 && (
                <div className="glass border border-orange-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-orange-400 flex-shrink-0" />
                    <p className="text-orange-400 text-sm font-semibold">注意事項</p>
                  </div>
                  <ul className="space-y-1.5">
                    {recipe.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-orange-300/80">
                        <span className="flex-shrink-0">⚠</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Summary strip */}
              <div className="glass-gold rounded-2xl p-4 grid grid-cols-3 divide-x divide-white/10">
                {[
                  { icon: <Clock size={14} className="text-gold" />, value: recipe.totalTime, unit: "分", label: "総放置時間" },
                  { icon: <Package size={14} className="text-gold" />, value: recipe.totalAmount, unit: "g", label: "総グラム数" },
                  { icon: <Palette size={14} className="text-gold" />, value: recipe.steps.length, unit: "工程", label: "施術ステップ" },
                ].map(({ icon, value, unit, label }, i) => (
                  <div key={i} className="text-center px-3">
                    <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
                    <div className="text-xl font-bold text-gold">{value}<span className="text-xs font-normal ml-0.5 text-pearl-dim">{unit}</span></div>
                    <p className="text-pearl-dim text-[10px]">{label}</p>
                  </div>
                ))}
              </div>

              {/* Steps */}
              {recipe.steps.map((step, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1">
                      <p className="text-pearl text-sm font-semibold">{step.area}</p>
                      <p className="text-pearl-dim text-[10px] flex items-center gap-1">
                        <Clock size={9} /> {step.processingTime}分
                        {step.temperature !== "room" && ` · ${step.temperature === "warm" ? "ウォーム" : "クール"}`}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {step.agents.map((agent, j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="glass rounded-lg px-2 py-1 text-[10px] text-pearl-dim min-w-[72px] text-center flex-shrink-0">
                          {agent.role}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gold/70 text-[10px]">{agent.brand}</p>
                          <p className="text-pearl text-xs font-semibold truncate">
                            {agent.name}{agent.code ? ` [${agent.code}]` : ""}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-gold font-bold">{agent.amount}</span>
                          <span className="text-pearl-dim text-xs ml-0.5">{agent.unit}</span>
                        </div>
                      </div>
                    ))}
                    <p className="text-pearl-muted text-xs leading-relaxed border-t border-white/5 pt-3">
                      {step.instructions}
                    </p>
                  </div>
                </div>
              ))}

              {/* Allergy safety */}
              {recipe.allergySafety && (
                <div className="glass rounded-2xl p-4">
                  <p className="text-pearl-dim text-xs font-semibold tracking-wider mb-2">アレルギー安全性</p>
                  <p className="text-pearl-muted text-sm leading-relaxed">{recipe.allergySafety}</p>
                </div>
              )}

              {/* Aftercare */}
              <div className="glass rounded-2xl p-4">
                <p className="text-pearl-dim text-xs font-semibold tracking-wider mb-2">アフターケア</p>
                <p className="text-pearl-muted text-sm leading-relaxed">{recipe.aftercare}</p>
              </div>

              {recipe.notes && (
                <div className="glass-gold rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                      <span className="text-gold text-[9px] font-bold">B</span>
                    </div>
                    <p className="text-gold text-xs font-semibold">プロのコメント</p>
                  </div>
                  <p className="text-pearl-muted text-sm leading-relaxed italic">{recipe.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Inventory ── */}
      {tab === "inventory" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-pearl text-sm font-semibold">カラー剤在庫 ({inventory.length}件)</p>
            <button onClick={() => setShowAddForm(!showAddForm)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showAddForm ? "bg-gold/10 text-gold border border-gold/20" : "glass border border-white/10 text-pearl-muted hover:text-gold"}`}>
              <Plus size={13} /> 追加
            </button>
          </div>

          {showAddForm && (
            <div className="glass rounded-2xl p-5 space-y-3">
              <p className="text-pearl text-xs font-semibold tracking-wider">新規薬剤を追加</p>
              <div className="grid grid-cols-2 gap-3">
                {(["brand", "series", "name", "code"] as const).map(key => (
                  <div key={key} className={key === "name" ? "col-span-2" : ""}>
                    <label className="text-pearl-dim text-xs mb-1 block">
                      {key === "brand" ? "ブランド" : key === "series" ? "シリーズ" : key === "name" ? "商品名 *" : "カラーコード"}
                    </label>
                    <input type="text"
                      placeholder={key === "brand" ? "例: WELLA" : key === "series" ? "例: イルミナカラー" : key === "name" ? "例: LAVENDER" : "例: 6LA"}
                      value={newItem[key]}
                      onChange={e => setNewItem(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-pearl-dim text-xs mb-1 block">タイプ</label>
                  <div className="relative">
                    <select value={newItem.type}
                      onChange={e => setNewItem(p => ({ ...p, type: e.target.value as ColorInventoryItem["type"] }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none pr-7">
                      <option value="base">1剤（ベース）</option>
                      <option value="control">コントロール</option>
                      <option value="oxi">2剤（オキシ）</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-pearl-dim text-xs mb-1 block">在庫（g）</label>
                  <input type="number" min={0} value={newItem.stock}
                    onChange={e => setNewItem(p => ({ ...p, stock: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="text-pearl-dim text-xs mb-1 block">有効期限</label>
                <input type="date" value={newItem.expiresAt}
                  onChange={e => setNewItem(p => ({ ...p, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={addItem} disabled={!newItem.brand || !newItem.name}
                  className="flex-1 bg-gold disabled:opacity-40 text-obsidian font-semibold py-3 rounded-xl text-sm">
                  追加する
                </button>
                <button onClick={() => setShowAddForm(false)}
                  className="px-5 glass border border-white/10 text-pearl-muted rounded-xl text-sm">
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {inventory.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Package size={36} className="text-pearl-dim/20 mx-auto mb-3" />
              <p className="text-pearl-dim text-sm">在庫が登録されていません</p>
              <p className="text-pearl-dim/50 text-xs mt-1">「追加」からカラー剤を登録してください</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/5">
                {inventory.map(item => {
                  const isLow = item.stock < 50;
                  const isExpiringSoon = !!item.expiresAt &&
                    new Date(item.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_STYLE[item.type]}`}>
                            {TYPE_LABEL[item.type]}
                          </span>
                          {item.code && <span className="text-pearl-dim text-[10px] font-mono">{item.code}</span>}
                          {isLow && <span className="text-red-400 text-[10px]">残少</span>}
                          {isExpiringSoon && <span className="text-orange-400 text-[10px]">期限近</span>}
                        </div>
                        <p className="text-pearl text-sm font-medium truncate">
                          {item.brand}{item.series ? ` / ${item.series}` : ""} {item.name}
                        </p>
                        <p className="text-pearl-dim text-[10px]">
                          残量: {item.stock}g{item.expiresAt ? ` · 期限: ${item.expiresAt}` : ""}
                        </p>
                      </div>
                      <button onClick={() => deleteItem(item.id)}
                        className="text-pearl-dim/40 hover:text-red-400 transition-colors p-1.5">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
