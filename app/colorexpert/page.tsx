"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Palette, Camera, Upload, Zap, Clock, AlertTriangle,
  Package, Plus, Trash2, ChevronDown, ArrowRight, CheckCircle, Link2,
} from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import {
  getColorInventory, addColorInventoryItem, deleteColorInventoryItem,
  type ColorInventoryItem,
} from "@/lib/storage";
import type { HairAnalysis, ColorTarget, ColorRecipe } from "@/lib/types";

// ─────────────────────────────────────────────────────────
// Color computation utilities
// ─────────────────────────────────────────────────────────

// Natural hair base RGB values for levels 1–20
const HAIR_BASES: [number, number, number][] = [
  [15, 10, 5],   [25, 15, 8],   [38, 22, 10],  [55, 32, 15],  [78, 46, 22],
  [102, 62, 30], [125, 78, 40], [152, 100, 52], [180, 125, 65],[208, 155, 82],
  [224, 178, 104],[238, 200, 128],[246, 220, 152],[251, 234, 175],[253, 244, 200],
  [254, 249, 218],[255, 252, 232],[255, 254, 242],[255, 255, 250],[255, 255, 255],
];

const TONE_TARGETS: Record<string, [number, number, number]> = {
  "ナチュラル":  [0,   0,   0],   // unused – keeps base
  "アッシュ":   [112, 128, 134],
  "マット":     [85,  90,  65],
  "ウォーム":   [200, 120, 40],
  "ベージュ":   [200, 168, 112],
  "ラベンダー": [155, 108, 198],
  "ピンク":     [218, 108, 128],
  "シルバー":   [175, 178, 192],
};

const TONES = Object.keys(TONE_TARGETS);

function computeHairColor(level: number, tone: string, sat: string): string {
  const base = HAIR_BASES[Math.min(Math.max(level - 1, 0), 19)];
  let [r, g, b] = base;
  if (tone !== "ナチュラル") {
    const tc = TONE_TARGETS[tone] ?? base;
    const strength = Math.pow(Math.max(0, level - 3) / 17, 0.7) * 0.65;
    r = Math.round(r * (1 - strength) + tc[0] * strength);
    g = Math.round(g * (1 - strength) + tc[1] * strength);
    b = Math.round(b * (1 - strength) + tc[2] * strength);
  }
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  const sf = sat === "vivid" ? 1.6 : sat === "muted" ? 0.4 : 1.0;
  r = Math.min(255, Math.max(0, Math.round(gray + (r - gray) * sf)));
  g = Math.min(255, Math.max(0, Math.round(gray + (g - gray) * sf)));
  b = Math.min(255, Math.max(0, Math.round(gray + (b - gray) * sf)));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.min(255, Math.max(0, v)).toString(16).padStart(2, "0");
  return `#${clamp((n >> 16) + amount)}${clamp(((n >> 8) & 0xff) + amount)}${clamp((n & 0xff) + amount)}`;
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function HairColorPreview({ color, level, tone }: { color: string; level: number; tone: string }) {
  const root = shadeHex(color, level > 4 ? -35 : -12);
  const tip  = shadeHex(color, 18);
  return (
    <div className="relative rounded-2xl overflow-hidden flex-shrink-0" style={{ width: 88, height: 160 }}>
      <div className="absolute inset-0" style={{
        background: `linear-gradient(to bottom, ${root} 0%, ${color} 38%, ${color} 72%, ${tip} 100%)`,
      }} />
      {/* shine */}
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(108deg, rgba(255,255,255,0.18) 0%, transparent 55%)" }} />
      {/* label */}
      <div className="absolute bottom-0 inset-x-0 px-2 py-1.5 bg-gradient-to-t from-black/50 to-transparent">
        <p className="text-white text-[9px] font-bold leading-tight">Lv.{level}</p>
        <p className="text-white/70 text-[8px] leading-tight">{tone}</p>
      </div>
    </div>
  );
}

function LevelSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const stops = [1, 4, 7, 10, 13, 17, 20].map(l => computeHairColor(l, "ナチュラル", "natural"));
  const pct = ((value - 1) / 19) * 100;
  return (
    <div className="relative h-8 flex items-center">
      {/* gradient track */}
      <div className="absolute inset-x-0 h-3 rounded-full pointer-events-none"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }} />
      {/* invisible range input */}
      <input type="range" min={1} max={20} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-3"
      />
      {/* custom thumb */}
      <div className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all duration-75"
        style={{ left: `calc(${pct}% - 12px)`, background: computeHairColor(value, "ナチュラル", "natural") }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const DAMAGE_STYLE: Record<string, string> = {
  healthy:  "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  mild:     "text-yellow-400  bg-yellow-400/10  border-yellow-400/20",
  moderate: "text-orange-400  bg-orange-400/10  border-orange-400/20",
  severe:   "text-red-400     bg-red-400/10     border-red-400/20",
};
const DAMAGE_LABEL:    Record<string, string> = { healthy:"健康", mild:"軽微", moderate:"中程度", severe:"重度" };
const POROSITY_LABEL:  Record<string, string> = { low:"低", medium:"普通", high:"高" };
const ELASTICITY_LABEL:Record<string, string> = { good:"良好", normal:"普通", poor:"低下" };
const DIFFICULTY_STYLE:Record<string, string> = { easy:"text-emerald-400", moderate:"text-yellow-400", challenging:"text-red-400" };
const DIFFICULTY_LABEL:Record<string, string> = { easy:"易しい", moderate:"普通", challenging:"難しい" };
const TYPE_STYLE:      Record<string, string> = {
  base:"bg-blue-500/10 text-blue-400", control:"bg-purple-500/10 text-purple-400", oxi:"bg-amber-500/10 text-amber-400",
};
const TYPE_LABEL: Record<string, string> = { base:"1剤", control:"コントロール", oxi:"2剤" };

const HAIR_LENGTHS   = ["ショート（〜10cm）","ボブ（10〜20cm）","ミディアム（20〜40cm）","ロング（40cm〜）"];
const HAIR_DENSITIES = ["少なめ","普通","多め","非常に多め"];
const BLANK_ITEM = { brand:"", series:"", name:"", code:"", type:"base" as ColorInventoryItem["type"], stock:300, expiresAt:"" };

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

type Tab        = "analyze" | "recipe" | "inventory";
type TargetMode = "picker" | "image" | "text";
type AddMode    = "manual" | "scan" | "url";

export default function ColorExpertPage() {
  const [tab, setTab] = useState<Tab>("analyze");

  // ── Analyze ────────────────────────────────────────────
  const [hairImageUrl,  setHairImageUrl]  = useState<string | null>(null);
  const [hairImageFile, setHairImageFile] = useState<File | null>(null);
  const [hairAnalysis,  setHairAnalysis]  = useState<HairAnalysis | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeError,   setAnalyzeError]   = useState<string | null>(null);
  const hairCameraRef = useRef<HTMLInputElement>(null);
  const hairFileRef   = useRef<HTMLInputElement>(null);

  // ── Recipe / target ────────────────────────────────────
  const [targetMode,      setTargetMode]      = useState<TargetMode>("picker");
  const [pickerLevel,     setPickerLevel]     = useState(10);
  const [pickerTone,      setPickerTone]      = useState("ナチュラル");
  const [pickerSat,       setPickerSat]       = useState<"vivid"|"natural"|"muted">("natural");
  const [targetImageUrl,  setTargetImageUrl]  = useState<string | null>(null);
  const [targetImageFile, setTargetImageFile] = useState<File | null>(null);
  const [targetDescription, setTargetDescription] = useState("");
  const [colorTarget,     setColorTarget]     = useState<ColorTarget | null>(null);
  const [targetLoading,   setTargetLoading]   = useState(false);
  const [hairLength,      setHairLength]      = useState("");
  const [hairDensity,     setHairDensity]     = useState("");
  const [allergies,       setAllergies]       = useState("");
  const [recipe,          setRecipe]          = useState<ColorRecipe | null>(null);
  const [recipeLoading,   setRecipeLoading]   = useState(false);
  const [recipeError,     setRecipeError]     = useState<string | null>(null);
  const targetFileRef = useRef<HTMLInputElement>(null);

  // ── Inventory ──────────────────────────────────────────
  const [inventory,      setInventory]      = useState<ColorInventoryItem[]>([]);
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [addMode,        setAddMode]        = useState<AddMode>("manual");
  const [newItem,        setNewItem]        = useState<typeof BLANK_ITEM>(BLANK_ITEM);
  const [scanImageUrl,   setScanImageUrl]   = useState<string | null>(null);
  const [scanImageFile,  setScanImageFile]  = useState<File | null>(null);
  const [scanUrl,        setScanUrl]        = useState("");
  const [scanLoading,    setScanLoading]    = useState(false);
  const [scanError,      setScanError]      = useState<string | null>(null);
  const scanCameraRef = useRef<HTMLInputElement>(null);
  const scanFileRef   = useRef<HTMLInputElement>(null);

  useEffect(() => { setInventory(getColorInventory()); }, []);

  // ── Computed preview color ─────────────────────────────
  const previewColor = computeHairColor(pickerLevel, pickerTone, pickerSat);

  // ── Handlers: analyze ──────────────────────────────────
  const handleHairFile = useCallback((file: File) => {
    setHairImageFile(file);
    setHairImageUrl(URL.createObjectURL(file));
    setHairAnalysis(null);
    setAnalyzeError(null);
  }, []);

  const analyzeHair = async () => {
    if (!hairImageFile) { setAnalyzeError("髪の写真を選択してください"); return; }
    setAnalyzeError(null); setAnalyzeLoading(true);
    try {
      const fd = new FormData(); fd.append("image", hairImageFile);
      const res = await fetch("/api/colorexpert/analyze", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHairAnalysis(data as HairAnalysis);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "解析に失敗しました");
    } finally { setAnalyzeLoading(false); }
  };

  // ── Handlers: target ───────────────────────────────────
  const handleTargetFile = useCallback((file: File) => {
    setTargetImageFile(file);
    setTargetImageUrl(URL.createObjectURL(file));
    setColorTarget(null);
  }, []);

  const applyPicker = () => {
    const satLabel = pickerSat === "vivid" ? "ビビッド" : pickerSat === "natural" ? "ナチュラル" : "ミュート";
    setColorTarget({
      targetLevel: pickerLevel,
      hue: previewColor,
      saturation: pickerSat,
      toneFamily: pickerTone,
      colorDescription: `レベル${pickerLevel}・${pickerTone}トーン・${satLabel}な仕上がり`,
      baseColorNeeded: pickerLevel > 12
        ? `レベル${pickerLevel}以上のブリーチベース推奨`
        : `現状ベース（レベル${pickerLevel}台）で対応可能`,
      processDifficulty: pickerLevel > 14 ? "challenging" : pickerLevel > 9 ? "moderate" : "easy",
      notes: "",
    });
  };

  const analyzeTarget = async () => {
    setTargetLoading(true);
    try {
      let res: Response;
      if (targetImageFile) {
        const fd = new FormData();
        fd.append("image", targetImageFile);
        if (targetDescription) fd.append("description", targetDescription);
        res = await fetch("/api/colorexpert/target", { method: "POST", body: fd });
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
    } finally { setTargetLoading(false); }
  };

  // ── Handlers: recipe ───────────────────────────────────
  const generateRecipe = async () => {
    if (!hairAnalysis) { setRecipeError("まず「髪の診断」タブで解析を行ってください"); return; }
    setRecipeError(null); setRecipeLoading(true);
    try {
      const res = await fetch("/api/colorexpert/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hairAnalysis,
          colorTarget: colorTarget ?? { textDescription: targetDescription },
          inventory, hairLength, hairDensity, allergies,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecipe(data as ColorRecipe);
    } catch (err) {
      setRecipeError(err instanceof Error ? err.message : "レシピ生成に失敗しました");
    } finally { setRecipeLoading(false); }
  };

  // ── Handlers: inventory scan ───────────────────────────
  const handleScanFile = useCallback((file: File) => {
    setScanImageFile(file);
    setScanImageUrl(URL.createObjectURL(file));
    setScanError(null);
  }, []);

  const runScanFromPhoto = async () => {
    if (!scanImageFile) return;
    setScanLoading(true); setScanError(null);
    try {
      const fd = new FormData(); fd.append("image", scanImageFile);
      const res = await fetch("/api/colorexpert/scan-agent", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewItem(p => ({ ...p, ...data }));
      setAddMode("manual");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "スキャンに失敗しました");
    } finally { setScanLoading(false); }
  };

  const runScanFromUrl = async () => {
    if (!scanUrl.trim()) return;
    setScanLoading(true); setScanError(null);
    try {
      const res = await fetch("/api/colorexpert/scan-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewItem(p => ({ ...p, ...data }));
      setAddMode("manual");
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally { setScanLoading(false); }
  };

  const addItem = () => {
    if (!newItem.brand || !newItem.name) return;
    addColorInventoryItem(newItem);
    setInventory(getColorInventory());
    setNewItem(BLANK_ITEM);
    setShowAddForm(false);
    setScanImageUrl(null); setScanImageFile(null); setScanUrl("");
    setAddMode("manual");
  };

  const deleteItem = (id: string) => {
    deleteColorInventoryItem(id);
    setInventory(getColorInventory());
  };

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────
  return (
    <PageWrapper>
      <div className="mb-6">
        <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">Color Expert AI</p>
        <h1 className="text-3xl font-semibold text-pearl" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)" }}>
          COLOREXPERT
        </h1>
        <p className="text-pearl-muted text-sm mt-2">ヘアカラー診断・AIレシピ生成システム</p>
      </div>

      {/* In-page tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1 mb-6">
        {(["analyze","recipe","inventory"] as Tab[]).map(k => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab===k?"bg-gold/10 text-gold border border-gold/20":"text-pearl-muted hover:text-pearl"}`}>
            {k==="analyze"?"髪の診断":k==="recipe"?"レシピ":"在庫管理"}
          </button>
        ))}
      </div>

      {/* ══ Tab: Analyze ══════════════════════════════════ */}
      {tab === "analyze" && (
        <div className="space-y-5">
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
                  根元・中間・毛先が映るよう全体を撮影してください
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

          {analyzeError && <div className="glass border border-red-500/20 rounded-xl px-4 py-3"><p className="text-red-400 text-sm">{analyzeError}</p></div>}

          <button onClick={analyzeHair} disabled={!hairImageFile || analyzeLoading}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-obsidian font-semibold py-4 rounded-xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(212,165,116,0.2)]">
            {analyzeLoading
              ? <><div className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin"/>解析中...</>
              : <><Zap size={16}/>AIで髪質・色調を解析する</>}
          </button>

          {hairAnalysis && (
            <div className="space-y-4 animate-slide-up">
              <div className="glass-gold rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold text-[10px] font-bold">B</span>
                  </div>
                  <h3 className="text-gold text-sm font-semibold tracking-wider">部位別レベル診断</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(["roots","mid","tips"] as const).map(zone => {
                    const z = hairAnalysis.zones[zone];
                    const label = zone==="roots"?"根元":zone==="mid"?"中間":"毛先";
                    return (
                      <div key={zone} className="glass rounded-xl p-3 text-center">
                        <p className="text-pearl-dim text-[10px] mb-2">{label}</p>
                        <div className="text-3xl font-bold text-gold">{z.level}</div>
                        <p className="text-pearl-dim text-[9px]">レベル</p>
                        <span className={`mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full border ${DAMAGE_STYLE[z.damage]??""}`}>
                          {DAMAGE_LABEL[z.damage]}
                        </span>
                        {z.undertone && <p className="text-pearl-dim/70 text-[9px] mt-1">{z.undertone}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="glass rounded-2xl p-5">
                <h3 className="text-pearl text-xs font-semibold tracking-wider mb-4">アンダートーン分析</h3>
                {([
                  {key:"red" as const,   label:"赤み",       gradient:"from-red-500/60 to-red-400"},
                  {key:"yellow" as const,label:"黄み",       gradient:"from-yellow-500/60 to-yellow-400"},
                  {key:"orange" as const,label:"オレンジみ", gradient:"from-orange-500/60 to-orange-400"},
                ]).map(({key,label,gradient}) => (
                  <div key={key} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-pearl-muted">{label}</span>
                      <span className="text-pearl font-semibold">{hairAnalysis.undertoneAnalysis[key]}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
                        style={{width:`${hairAnalysis.undertoneAnalysis[key]}%`}}/>
                    </div>
                  </div>
                ))}
                <p className="text-pearl-muted text-xs mt-4 leading-relaxed">{hairAnalysis.undertoneDescription}</p>
              </div>

              <div className="glass rounded-2xl p-5">
                <h3 className="text-pearl text-xs font-semibold tracking-wider mb-4">コンディション診断</h3>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <p className="text-pearl-dim text-[10px] mb-1">総合ダメージ</p>
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${DAMAGE_STYLE[hairAnalysis.overallDamage]??""}`}>
                      {DAMAGE_LABEL[hairAnalysis.overallDamage]}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-pearl-dim text-[10px] mb-1">浸透性</p>
                    <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-pearl">
                      {POROSITY_LABEL[hairAnalysis.porosity]??hairAnalysis.porosity}
                    </span>
                  </div>
                  <div className="text-center">
                    <p className="text-pearl-dim text-[10px] mb-1">弾力</p>
                    <span className="text-[11px] px-2 py-1 rounded-full border border-white/10 text-pearl">
                      {ELASTICITY_LABEL[hairAnalysis.elasticity]??hairAnalysis.elasticity}
                    </span>
                  </div>
                </div>
                {hairAnalysis.damageDetails && <p className="text-pearl-muted text-xs leading-relaxed">{hairAnalysis.damageDetails}</p>}
                {hairAnalysis.cuticleCondition && <p className="text-pearl-dim text-xs mt-2">キューティクル: {hairAnalysis.cuticleCondition}</p>}
              </div>

              <div className="glass-gold rounded-2xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold font-bold text-sm">{hairAnalysis.recommendedOxi}</span>
                </div>
                <div>
                  <p className="text-gold/60 text-xs tracking-wider">推奨オキシ濃度</p>
                  <p className="text-pearl font-semibold">
                    {hairAnalysis.recommendedOxi==="3%"?"3%（ダメージ配慮）":hairAnalysis.recommendedOxi==="6%"?"6%（標準）":"AC（低アルカリ・敏感肌向け）"}
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
                レシピ設定へ <ArrowRight size={14}/>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ Tab: Recipe ═══════════════════════════════════ */}
      {tab === "recipe" && (
        <div className="space-y-5">
          {/* Analysis status */}
          <div className={`glass rounded-2xl p-4 flex items-center gap-3 border ${hairAnalysis?"border-emerald-500/20":"border-white/5"}`}>
            {hairAnalysis
              ? <CheckCircle size={18} className="text-emerald-400 flex-shrink-0"/>
              : <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0"/>}
            <div>
              <p className="text-pearl text-xs font-semibold">髪の診断データ</p>
              {hairAnalysis
                ? <p className="text-pearl-dim text-[10px]">根元Lv.{hairAnalysis.zones.roots.level} / 中間Lv.{hairAnalysis.zones.mid.level} / 毛先Lv.{hairAnalysis.zones.tips.level} · 推奨オキシ: {hairAnalysis.recommendedOxi}</p>
                : <button onClick={()=>setTab("analyze")} className="text-gold text-[10px] underline">解析タブで先に診断してください</button>}
            </div>
          </div>

          {/* ── Target color section ── */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <p className="text-pearl text-xs font-semibold tracking-wider mb-3">目標カラー設定</p>
              {/* Mode tabs */}
              <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                {([
                  {key:"picker" as TargetMode, label:"🎨 ビジュアル"},
                  {key:"image"  as TargetMode, label:"📷 参考画像"},
                  {key:"text"   as TargetMode, label:"✏️ テキスト"},
                ]).map(({key,label}) => (
                  <button key={key} onClick={()=>setTargetMode(key)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${targetMode===key?"bg-gold/10 text-gold border border-gold/20":"text-pearl-muted hover:text-pearl"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Visual picker mode ── */}
            {targetMode === "picker" && (
              <div className="px-5 pb-5 space-y-4">
                <div className="flex gap-4">
                  {/* Hair preview */}
                  <HairColorPreview color={previewColor} level={pickerLevel} tone={pickerTone}/>
                  {/* Controls */}
                  <div className="flex-1 space-y-4 min-w-0">
                    {/* Level slider */}
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-pearl-dim">明度レベル</span>
                        <span className="text-gold font-bold">{pickerLevel}</span>
                      </div>
                      <LevelSlider value={pickerLevel} onChange={setPickerLevel}/>
                      <div className="flex justify-between text-[9px] text-pearl-dim/50 mt-1">
                        <span>黒 (1)</span><span>白 (20)</span>
                      </div>
                    </div>
                    {/* Saturation */}
                    <div>
                      <p className="text-pearl-dim text-[10px] mb-1.5">彩度</p>
                      <div className="flex gap-1">
                        {([
                          {v:"vivid"   as const, label:"ビビッド"},
                          {v:"natural" as const, label:"ナチュラル"},
                          {v:"muted"   as const, label:"ミュート"},
                        ]).map(({v,label}) => (
                          <button key={v} onClick={()=>setPickerSat(v)}
                            className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${pickerSat===v?"bg-gold/10 border border-gold/20 text-gold":"glass border border-white/8 text-pearl-muted"}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tone selector */}
                <div>
                  <p className="text-pearl-dim text-[10px] mb-2">色調・トーン</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TONES.map(tone => {
                      const swatch = computeHairColor(Math.max(pickerLevel, 7), tone, "natural");
                      return (
                        <button key={tone} onClick={()=>setPickerTone(tone)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all ${pickerTone===tone?"border-gold/40 text-gold bg-gold/10":"border-white/10 text-pearl-muted hover:border-white/20"}`}>
                          <span className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
                            style={{background: swatch}}/>
                          {tone}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Current selection + apply button */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 flex-shrink-0"
                      style={{background: previewColor}}/>
                    <div>
                      <p className="text-pearl text-xs font-semibold">Lv.{pickerLevel} · {pickerTone}</p>
                      <p className="text-pearl-dim text-[10px] font-mono">{previewColor.toUpperCase()}</p>
                    </div>
                  </div>
                  {colorTarget ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                      <CheckCircle size={13}/>設定済み
                    </div>
                  ) : null}
                </div>
                <button onClick={applyPicker}
                  className="w-full py-3 bg-gold/10 border border-gold/20 text-gold rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gold/15 transition-all">
                  <Palette size={14}/> この色を目標カラーに設定
                </button>
              </div>
            )}

            {/* ── Image mode ── */}
            {targetMode === "image" && (
              <div className="px-5 pb-5 space-y-3">
                <input ref={targetFileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleTargetFile(e.target.files[0])}/>
                {targetImageUrl && (
                  <div className="relative rounded-xl overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={targetImageUrl} alt="Target" className="w-full max-h-40 object-cover"/>
                    <button onClick={()=>{setTargetImageUrl(null);setTargetImageFile(null);setColorTarget(null);}}
                      className="absolute top-2 right-2 glass rounded-full p-1.5 text-pearl-muted hover:text-red-400 transition-colors">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                )}
                <button onClick={()=>targetFileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 glass border border-white/10 rounded-xl text-sm text-pearl-muted hover:text-pearl transition-colors">
                  <Upload size={14}/> 参考画像（ヘアカタログ等）
                </button>
                {targetImageFile && !colorTarget && (
                  <button onClick={analyzeTarget} disabled={targetLoading}
                    className="w-full py-3 bg-gold/10 border border-gold/20 text-gold rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    {targetLoading
                      ? <><div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin"/>解析中...</>
                      : <><Zap size={14}/>画像からカラーを解析</>}
                  </button>
                )}
                {colorTarget && (
                  <div className="glass-gold rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400 flex-shrink-0"/>
                    <p className="text-gold text-xs font-semibold">解析完了: Lv.{colorTarget.targetLevel} {colorTarget.toneFamily}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Text mode ── */}
            {targetMode === "text" && (
              <div className="px-5 pb-5 space-y-3">
                <textarea value={targetDescription} onChange={e=>setTargetDescription(e.target.value)}
                  placeholder="目標カラーをテキストで入力&#10;例: ラベンダーアッシュ、レベル10、透明感のあるクールトーン"
                  rows={3} className="w-full px-4 py-3 rounded-xl text-sm resize-none"/>
                {targetDescription.trim() && !colorTarget && (
                  <button onClick={analyzeTarget} disabled={targetLoading}
                    className="w-full py-3 bg-gold/10 border border-gold/20 text-gold rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                    {targetLoading
                      ? <><div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin"/>解析中...</>
                      : <><Zap size={14}/>テキストからカラーを解析</>}
                  </button>
                )}
                {colorTarget && (
                  <div className="glass-gold rounded-xl p-3 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400 flex-shrink-0"/>
                    <p className="text-gold text-xs font-semibold">解析完了: Lv.{colorTarget.targetLevel} {colorTarget.toneFamily}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm target if set */}
          {colorTarget && (
            <div className="glass-gold rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full border-2 border-white/30" style={{background: colorTarget.hue || previewColor}}/>
                <p className="text-gold text-xs font-semibold">目標カラー確認</p>
                <button onClick={()=>setColorTarget(null)} className="ml-auto text-pearl-dim/50 hover:text-red-400 transition-colors text-[10px]">×クリア</button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div><span className="text-pearl-dim">目標レベル: </span><span className="text-pearl font-semibold">{colorTarget.targetLevel}</span></div>
                <div><span className="text-pearl-dim">トーン: </span><span className="text-pearl font-semibold">{colorTarget.toneFamily}</span></div>
                <div><span className="text-pearl-dim">難易度: </span><span className={`font-semibold ${DIFFICULTY_STYLE[colorTarget.processDifficulty]}`}>{DIFFICULTY_LABEL[colorTarget.processDifficulty]}</span></div>
              </div>
              <p className="text-pearl-muted text-xs leading-relaxed">{colorTarget.colorDescription}</p>
            </div>
          )}

          {/* Hair metadata */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <p className="text-pearl text-xs font-semibold tracking-wider">施術データ</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                {label:"髪の長さ",  val:hairLength,  set:setHairLength,  opts:HAIR_LENGTHS},
                {label:"毛量",      val:hairDensity, set:setHairDensity, opts:HAIR_DENSITIES},
              ].map(({label,val,set,opts}) => (
                <div key={label}>
                  <label className="text-pearl-dim text-xs mb-1.5 block">{label}</label>
                  <div className="relative">
                    <select value={val} onChange={e=>set(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-xs appearance-none pr-7">
                      <option value="">選択</option>
                      {opts.map(o=><option key={o}>{o}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none"/>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="text-pearl-dim text-xs mb-1.5 block">アレルギー・禁忌成分</label>
              <input type="text" value={allergies} onChange={e=>setAllergies(e.target.value)}
                placeholder="例：ジアミンアレルギー..."
                className="w-full px-4 py-2.5 rounded-xl text-sm"/>
            </div>
          </div>

          {recipeError && <div className="glass border border-red-500/20 rounded-xl px-4 py-3"><p className="text-red-400 text-sm">{recipeError}</p></div>}

          <button onClick={generateRecipe} disabled={recipeLoading || !hairAnalysis}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-40 disabled:cursor-not-allowed text-obsidian font-semibold py-4 rounded-xl transition-all text-sm tracking-wide flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(212,165,116,0.2)]">
            {recipeLoading
              ? <><div className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin"/>レシピ生成中...</>
              : <><Palette size={16}/>カラーレシピを生成する</>}
          </button>

          {/* ── Recipe results ── */}
          {recipe && (
            <div className="space-y-4 animate-slide-up">
              {recipe.warnings.length > 0 && (
                <div className="glass border border-orange-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-orange-400 flex-shrink-0"/>
                    <p className="text-orange-400 text-sm font-semibold">注意事項</p>
                  </div>
                  <ul className="space-y-1.5">
                    {recipe.warnings.map((w,i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-orange-300/80">
                        <span className="flex-shrink-0">⚠</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="glass-gold rounded-2xl p-4 grid grid-cols-3 divide-x divide-white/10">
                {[
                  {icon:<Clock size={14} className="text-gold"/>, v:recipe.totalTime,   u:"分",  l:"総放置時間"},
                  {icon:<Package size={14} className="text-gold"/>, v:recipe.totalAmount, u:"g",   l:"総グラム数"},
                  {icon:<Palette size={14} className="text-gold"/>, v:recipe.steps.length,u:"工程",l:"施術ステップ"},
                ].map(({icon,v,u,l},i) => (
                  <div key={i} className="text-center px-3">
                    <div className="flex items-center justify-center gap-1 mb-1">{icon}</div>
                    <div className="text-xl font-bold text-gold">{v}<span className="text-xs font-normal ml-0.5 text-pearl-dim">{u}</span></div>
                    <p className="text-pearl-dim text-[10px]">{l}</p>
                  </div>
                ))}
              </div>
              {recipe.steps.map((step,i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold flex-shrink-0">
                      {step.stepNumber}
                    </div>
                    <div>
                      <p className="text-pearl text-sm font-semibold">{step.area}</p>
                      <p className="text-pearl-dim text-[10px]"><Clock size={9} className="inline mr-0.5"/>{step.processingTime}分{step.temperature!=="room"?` · ${step.temperature==="warm"?"ウォーム":"クール"}`:""}</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {step.agents.map((agent,j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="glass rounded-lg px-2 py-1 text-[10px] text-pearl-dim min-w-[72px] text-center flex-shrink-0">{agent.role}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gold/70 text-[10px]">{agent.brand}</p>
                          <p className="text-pearl text-xs font-semibold truncate">{agent.name}{agent.code?` [${agent.code}]`:""}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-gold font-bold">{agent.amount}</span>
                          <span className="text-pearl-dim text-xs ml-0.5">{agent.unit}</span>
                        </div>
                      </div>
                    ))}
                    <p className="text-pearl-muted text-xs leading-relaxed border-t border-white/5 pt-3">{step.instructions}</p>
                  </div>
                </div>
              ))}
              {recipe.allergySafety && (
                <div className="glass rounded-2xl p-4">
                  <p className="text-pearl-dim text-xs font-semibold tracking-wider mb-2">アレルギー安全性</p>
                  <p className="text-pearl-muted text-sm leading-relaxed">{recipe.allergySafety}</p>
                </div>
              )}
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

      {/* ══ Tab: Inventory ════════════════════════════════ */}
      {tab === "inventory" && (
        <div className="space-y-5">
          <input ref={scanCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e=>e.target.files?.[0]&&handleScanFile(e.target.files[0])}/>
          <input ref={scanFileRef} type="file" accept="image/*" className="hidden"
            onChange={e=>e.target.files?.[0]&&handleScanFile(e.target.files[0])}/>

          <div className="flex items-center justify-between">
            <p className="text-pearl text-sm font-semibold">カラー剤在庫 ({inventory.length}件)</p>
            <button onClick={()=>setShowAddForm(!showAddForm)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${showAddForm?"bg-gold/10 text-gold border border-gold/20":"glass border border-white/10 text-pearl-muted hover:text-gold"}`}>
              <Plus size={13}/> 追加
            </button>
          </div>

          {showAddForm && (
            <div className="glass rounded-2xl overflow-hidden">
              {/* Add mode selector */}
              <div className="flex gap-1 bg-white/5 p-1 m-4 rounded-xl">
                {([
                  {k:"manual" as AddMode, label:"手入力"},
                  {k:"scan"   as AddMode, label:"📷 写真スキャン"},
                  {k:"url"    as AddMode, label:"🔗 WEBリンク"},
                ]).map(({k,label}) => (
                  <button key={k} onClick={()=>setAddMode(k)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${addMode===k?"bg-gold/10 text-gold border border-gold/20":"text-pearl-muted hover:text-pearl"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* ── Scan mode ── */}
              {addMode === "scan" && (
                <div className="px-4 pb-4 space-y-3">
                  {scanImageUrl ? (
                    <div className="relative rounded-xl overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={scanImageUrl} alt="Scan" className="w-full max-h-48 object-cover"/>
                      <button onClick={()=>{setScanImageUrl(null);setScanImageFile(null);}}
                        className="absolute top-2 right-2 glass rounded-full p-1.5 text-pearl-muted hover:text-red-400">
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center gap-2">
                      <Camera size={24} className="text-pearl-dim/40"/>
                      <p className="text-pearl-dim text-xs text-center">カラー剤のボトルや箱を撮影してください</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={()=>scanCameraRef.current?.click()}
                      className="flex items-center justify-center gap-2 py-2.5 glass border border-white/10 rounded-xl text-sm text-pearl-muted hover:text-pearl transition-colors">
                      <Camera size={14}/> カメラ
                    </button>
                    <button onClick={()=>scanFileRef.current?.click()}
                      className="flex items-center justify-center gap-2 py-2.5 glass border border-white/10 rounded-xl text-sm text-pearl-muted hover:text-pearl transition-colors">
                      <Upload size={14}/> ライブラリ
                    </button>
                  </div>
                  {scanError && <p className="text-red-400 text-xs">{scanError}</p>}
                  <button onClick={runScanFromPhoto} disabled={!scanImageFile||scanLoading}
                    className="w-full bg-gold disabled:opacity-40 text-obsidian font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2">
                    {scanLoading
                      ? <><div className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin"/>解析中...</>
                      : <><Zap size={14}/>写真からAI解析して追加</>}
                  </button>
                </div>
              )}

              {/* ── URL mode ── */}
              {addMode === "url" && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-pearl-dim text-xs">商品ページのURLを入力してください</p>
                  <div className="flex gap-2">
                    <input type="url" value={scanUrl} onChange={e=>setScanUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm"/>
                    <button onClick={runScanFromUrl} disabled={!scanUrl.trim()||scanLoading}
                      className="px-4 bg-gold disabled:opacity-40 text-obsidian font-semibold rounded-xl text-sm flex items-center gap-1.5 whitespace-nowrap">
                      {scanLoading
                        ? <div className="w-4 h-4 border-2 border-obsidian/30 border-t-obsidian rounded-full animate-spin"/>
                        : <><Link2 size={13}/>解析</>}
                    </button>
                  </div>
                  {scanError && <p className="text-red-400 text-xs">{scanError}</p>}
                  <p className="text-pearl-dim/50 text-[10px]">✦ AIがURLからブランド・シリーズ・コード等を自動抽出します</p>
                </div>
              )}

              {/* ── Manual / confirm form ── */}
              {addMode === "manual" && (
                <div className="px-4 pb-4 space-y-3">
                  {(newItem.brand || newItem.name) && (
                    <div className="glass-gold rounded-xl p-3 text-xs text-gold/80 flex items-center gap-2">
                      <CheckCircle size={13} className="text-emerald-400 flex-shrink-0"/>
                      <span>スキャン結果を自動入力しました。内容を確認してください。</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      {key:"brand",  label:"ブランド",    placeholder:"例: WELLA",         span:1},
                      {key:"series", label:"シリーズ",    placeholder:"例: イルミナカラー", span:1},
                      {key:"name",   label:"商品名 *",    placeholder:"例: LAVENDER",       span:2},
                      {key:"code",   label:"カラーコード", placeholder:"例: 6LA",           span:1},
                    ] as {key:keyof typeof BLANK_ITEM, label:string, placeholder:string, span:number}[]).map(({key,label,placeholder,span}) => (
                      <div key={key} className={span===2?"col-span-2":""}>
                        <label className="text-pearl-dim text-xs mb-1 block">{label}</label>
                        <input type="text" placeholder={placeholder}
                          value={newItem[key] as string}
                          onChange={e=>setNewItem(p=>({...p,[key]:e.target.value}))}
                          className="w-full px-3 py-2.5 rounded-xl text-sm"/>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-pearl-dim text-xs mb-1 block">タイプ</label>
                      <div className="relative">
                        <select value={newItem.type} onChange={e=>setNewItem(p=>({...p,type:e.target.value as ColorInventoryItem["type"]}))}
                          className="w-full px-3 py-2.5 rounded-xl text-sm appearance-none pr-7">
                          <option value="base">1剤（ベース）</option>
                          <option value="control">コントロール</option>
                          <option value="oxi">2剤（オキシ）</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-pearl-dim pointer-events-none"/>
                      </div>
                    </div>
                    <div>
                      <label className="text-pearl-dim text-xs mb-1 block">在庫（g）</label>
                      <input type="number" min={0} value={newItem.stock}
                        onChange={e=>setNewItem(p=>({...p,stock:Number(e.target.value)}))}
                        className="w-full px-3 py-2.5 rounded-xl text-sm"/>
                    </div>
                  </div>
                  <div>
                    <label className="text-pearl-dim text-xs mb-1 block">有効期限</label>
                    <input type="date" value={newItem.expiresAt}
                      onChange={e=>setNewItem(p=>({...p,expiresAt:e.target.value}))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm"/>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={addItem} disabled={!newItem.brand||!newItem.name}
                      className="flex-1 bg-gold disabled:opacity-40 text-obsidian font-semibold py-3 rounded-xl text-sm">
                      追加する
                    </button>
                    <button onClick={()=>{setShowAddForm(false);setNewItem(BLANK_ITEM);setScanImageUrl(null);setScanImageFile(null);setScanUrl("");setAddMode("manual");}}
                      className="px-5 glass border border-white/10 text-pearl-muted rounded-xl text-sm">
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {inventory.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Package size={36} className="text-pearl-dim/20 mx-auto mb-3"/>
              <p className="text-pearl-dim text-sm">在庫が登録されていません</p>
              <p className="text-pearl-dim/50 text-xs mt-1">「追加」からカラー剤を登録してください</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/5">
                {inventory.map(item => {
                  const isLow = item.stock < 50;
                  const isExpiringSoon = !!item.expiresAt &&
                    new Date(item.expiresAt) < new Date(Date.now() + 30*24*60*60*1000);
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${TYPE_STYLE[item.type]}`}>{TYPE_LABEL[item.type]}</span>
                          {item.code && <span className="text-pearl-dim text-[10px] font-mono">{item.code}</span>}
                          {isLow && <span className="text-red-400 text-[10px]">残少</span>}
                          {isExpiringSoon && <span className="text-orange-400 text-[10px]">期限近</span>}
                        </div>
                        <p className="text-pearl text-sm font-medium truncate">
                          {item.brand}{item.series?` / ${item.series}`:""} {item.name}
                        </p>
                        <p className="text-pearl-dim text-[10px]">残量: {item.stock}g{item.expiresAt?` · 期限: ${item.expiresAt}`:""}</p>
                      </div>
                      <button onClick={()=>deleteItem(item.id)} className="text-pearl-dim/40 hover:text-red-400 transition-colors p-1.5">
                        <Trash2 size={13}/>
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
