"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Palette, Camera, Upload, Zap, Clock, AlertTriangle,
  Package, Plus, Trash2, ChevronDown, ArrowRight, CheckCircle, Link2,
  Pipette, SlidersHorizontal,
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

const HAIR_BASES: [number, number, number][] = [
  [15, 10, 5],   [25, 15, 8],   [38, 22, 10],  [55, 32, 15],  [78, 46, 22],
  [102, 62, 30], [125, 78, 40], [152, 100, 52], [180, 125, 65],[208, 155, 82],
  [224, 178, 104],[238, 200, 128],[246, 220, 152],[251, 234, 175],[253, 244, 200],
  [254, 249, 218],[255, 252, 232],[255, 254, 242],[255, 255, 250],[255, 255, 255],
];

const TONE_TARGETS: Record<string, [number, number, number]> = {
  "ナチュラル":  [0,   0,   0],
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
// HSL / RGB utilities
// ─────────────────────────────────────────────────────────

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    case b: h = ((r - g) / d + 4) / 6; break;
  }
  return [h * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const h1 = h / 360;
  const hue2rgb = (p: number, q: number, t: number) => {
    const tt = ((t % 1) + 1) % 1;
    if (tt < 1/6) return p + (q - p) * 6 * tt;
    if (tt < 1/2) return q;
    if (tt < 2/3) return p + (q - p) * (2/3 - tt) * 6;
    return p;
  };
  if (s === 0) return [Math.round(l * 255), Math.round(l * 255), Math.round(l * 255)];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h1 + 1/3) * 255),
    Math.round(hue2rgb(p, q, h1) * 255),
    Math.round(hue2rgb(p, q, h1 - 1/3) * 255),
  ];
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return rgbToHsl(r, g, b);
}

function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
}

function hexToPickerState(hex: string): { level: number; tone: string; sat: "vivid" | "natural" | "muted" } {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [h, s, l] = rgbToHsl(r, g, b);
  const level = Math.min(20, Math.max(1, Math.round(1 + l * 19)));
  let tone = "ナチュラル";
  if (s < 0.08) {
    tone = l > 0.65 ? "シルバー" : "ナチュラル";
  } else if (h >= 330 || h < 20) {
    tone = "ピンク";
  } else if (h >= 20 && h < 55) {
    tone = "ウォーム";
  } else if (h >= 55 && h < 95) {
    tone = "ベージュ";
  } else if (h >= 95 && h < 160) {
    tone = "マット";
  } else if (h >= 160 && h < 265) {
    tone = "アッシュ";
  } else if (h >= 265 && h < 295) {
    tone = "ラベンダー";
  } else if (h >= 295 && h < 330) {
    tone = "ピンク";
  }
  const sat: "vivid" | "natural" | "muted" = s > 0.5 ? "vivid" : s < 0.18 ? "muted" : "natural";
  return { level, tone, sat };
}

// ─────────────────────────────────────────────────────────
// Canvas utilities
// ─────────────────────────────────────────────────────────

function applyAdjustmentsToCanvas(
  canvas: HTMLCanvasElement,
  brightness: number,
  contrast: number,
  temperature: number,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const cf = contrast === 0 ? 1 : (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < d.length; i += 4) {
    let rv = d[i] + brightness * 2.5;
    let gv = d[i + 1] + brightness * 2.5;
    let bv = d[i + 2] + brightness * 2.5;
    rv = cf * (rv - 128) + 128;
    gv = cf * (gv - 128) + 128;
    bv = cf * (bv - 128) + 128;
    rv += temperature * 1.5;
    bv -= temperature * 1.5;
    d[i]   = Math.min(255, Math.max(0, Math.round(rv)));
    d[i+1] = Math.min(255, Math.max(0, Math.round(gv)));
    d[i+2] = Math.min(255, Math.max(0, Math.round(bv)));
  }
  ctx.putImageData(imageData, 0, 0);
}

async function createAdjustedImageBlob(
  imageUrl: string,
  brightness: number,
  contrast: number,
  temperature: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      applyAdjustmentsToCanvas(canvas, brightness, contrast, temperature);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("toBlob failed")),
        "image/jpeg", 0.85,
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = imageUrl;
  });
}

function recolorHairOnCanvas(canvas: HTMLCanvasElement, targetHex: string, strength: number): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;
  const [tH, tS] = hexToHsl(targetHex);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    const [, , l] = rgbToHsl(r, g, b);
    if (l < 0.05 || l > 0.88) continue;
    const newS = Math.min(1, tS * 0.8 + (1 - l) * 0.2);
    const [nr, ng, nb] = hslToRgb(tH, newS, l);
    d[i]   = Math.round(nr * strength + r * (1 - strength));
    d[i+1] = Math.round(ng * strength + g * (1 - strength));
    d[i+2] = Math.round(nb * strength + b * (1 - strength));
  }
  ctx.putImageData(imageData, 0, 0);
}

// ─────────────────────────────────────────────────────────
// Popular hair colors gallery data
// ─────────────────────────────────────────────────────────

const POPULAR_COLORS = [
  { name: "ミルクティーベージュ", hex: "#C5A882" },
  { name: "シアーラベンダー",     hex: "#A894C8" },
  { name: "スモーキーアッシュ",   hex: "#8A9099" },
  { name: "ウォームキャラメル",   hex: "#B87E42" },
  { name: "ホワイトシルバー",     hex: "#DCDCE2" },
  { name: "ローズベージュ",       hex: "#C8947C" },
  { name: "ブルーブラック",       hex: "#1A1823" },
  { name: "サクラピンク",         hex: "#E8A0A8" },
  { name: "マットオリーブ",       hex: "#8C8860" },
  { name: "ナチュラルブラウン",   hex: "#8B5E3C" },
  { name: "プラチナムブロンド",   hex: "#F0E5C0" },
  { name: "コーラルオレンジ",     hex: "#D4825A" },
  { name: "ネイビーアッシュ",     hex: "#5A6080" },
  { name: "ダークチョコ",         hex: "#3D2010" },
  { name: "グリーンアッシュ",     hex: "#7A9080" },
  { name: "ライラック",           hex: "#C4A8D8" },
];

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
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(108deg, rgba(255,255,255,0.18) 0%, transparent 55%)" }} />
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
      <div className="absolute inset-x-0 h-3 rounded-full pointer-events-none"
        style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }} />
      <input type="range" min={1} max={20} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-3"
      />
      <div className="absolute w-6 h-6 rounded-full border-2 border-white shadow-lg pointer-events-none transition-all duration-75"
        style={{ left: `calc(${pct}% - 12px)`, background: computeHairColor(value, "ナチュラル", "natural") }} />
    </div>
  );
}

function ColorWheelPicker({
  hue, sat, lig, onChange,
}: {
  hue: number; sat: number; lig: number;
  onChange: (h: number, s: number, l: number) => void;
}) {
  const RING_SIZE = 180;
  const RING_WIDTH = 28;
  const RING_R = RING_SIZE / 2 - RING_WIDTH / 2;

  const getHue = (e: React.PointerEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - RING_SIZE / 2;
    const y = e.clientY - rect.top - RING_SIZE / 2;
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };

  const getSL = (e: React.PointerEvent, el: HTMLElement): [number, number] => {
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return [x, 0.92 - y * 0.87];
  };

  const thumbAngle = (hue * Math.PI) / 180;
  const thumbX = RING_SIZE / 2 + RING_R * Math.cos(thumbAngle);
  const thumbY = RING_SIZE / 2 + RING_R * Math.sin(thumbAngle);
  const padX = sat * 100;
  const padY = Math.max(0, Math.min(100, ((0.92 - lig) / 0.87) * 100));

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Hue ring */}
      <div
        className="relative flex-shrink-0 select-none"
        style={{ width: RING_SIZE, height: RING_SIZE, touchAction: "none", cursor: "crosshair" }}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          onChange(getHue(e, e.currentTarget), sat, lig);
        }}
        onPointerMove={e => { if (e.buttons > 0) onChange(getHue(e, e.currentTarget), sat, lig); }}
      >
        <div className="absolute inset-0 rounded-full pointer-events-none" style={{
          background: "conic-gradient(hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
        }}/>
        <div className="absolute rounded-full pointer-events-none flex items-center justify-center" style={{
          inset: RING_WIDTH, background: "#0f0e13",
        }}>
          <div className="rounded-full border-2 border-white/20 flex-shrink-0"
            style={{ width: 52, height: 52, background: hslToHex(hue, sat, lig) }}/>
        </div>
        <div className="absolute rounded-full border-2 border-white shadow-lg pointer-events-none" style={{
          width: 20, height: 20,
          left: thumbX - 10, top: thumbY - 10,
          background: `hsl(${hue}deg, 100%, 50%)`,
        }}/>
      </div>

      {/* SL pad */}
      <div
        className="relative w-full rounded-xl select-none overflow-hidden"
        style={{ height: 110, touchAction: "none", cursor: "crosshair" }}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const [s, l] = getSL(e, e.currentTarget);
          onChange(hue, s, l);
        }}
        onPointerMove={e => {
          if (e.buttons > 0) {
            const [s, l] = getSL(e, e.currentTarget);
            onChange(hue, s, l);
          }
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `linear-gradient(to right, #ffffff, hsl(${hue}deg, 100%, 50%))`,
        }}/>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, #000000)",
        }}/>
        <div className="absolute rounded-full border-2 border-white shadow-md pointer-events-none"
          style={{
            width: 16, height: 16,
            left: `calc(${padX}% - 8px)`,
            top: `calc(${padY}% - 8px)`,
            background: hslToHex(hue, sat, lig),
          }}
        />
      </div>
    </div>
  );
}

function HexInputPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [raw, setRaw] = useState(value);
  useEffect(() => { setRaw(value); }, [value]);

  const handleChange = (v: string) => {
    const normalized = v.startsWith("#") ? v : "#" + v;
    setRaw(normalized.toUpperCase());
    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
      onChange(normalized.toLowerCase());
    }
  };

  const isValid = /^#[0-9a-fA-F]{6}$/i.test(raw);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl border-2 border-white/20 flex-shrink-0"
          style={{ background: isValid ? raw : "#888" }}/>
        <div className="flex-1">
          <p className="text-pearl-dim text-[10px] mb-1">HEXカラーコード</p>
          <input
            type="text"
            value={raw}
            onChange={e => handleChange(e.target.value)}
            maxLength={7}
            placeholder="#C5A882"
            className={`w-full px-3 py-2 rounded-xl text-sm font-mono border ${isValid ? "border-emerald-500/40" : "border-red-500/30"}`}
          />
        </div>
      </div>
      <p className="text-pearl-dim/50 text-[10px]">例: #C5A882 · #A894C8 · #8A9099</p>
    </div>
  );
}

function HairColorGallery({ onSelect }: { onSelect: (hex: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {POPULAR_COLORS.map(({ name, hex }) => (
        <button key={hex} onClick={() => onSelect(hex)}
          className="flex flex-col items-center gap-1.5 p-2 glass rounded-xl border border-white/5 hover:border-gold/20 transition-all group">
          <div className="w-10 h-10 rounded-full border-2 border-white/15 group-hover:border-white/30 transition-all"
            style={{ background: hex }}/>
          <p className="text-[8px] text-pearl-dim/70 text-center leading-tight line-clamp-2">{name}</p>
        </button>
      ))}
    </div>
  );
}

function EyedropperPicker({
  defaultDataUrl,
  onColorPick,
}: {
  defaultDataUrl: string | null;
  onColorPick: (hex: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eyeFileRef = useRef<HTMLInputElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(defaultDataUrl);
  const [pickedHex, setPickedHex] = useState<string | null>(null);

  useEffect(() => { setDataUrl(defaultDataUrl); }, [defaultDataUrl]);

  useEffect(() => {
    if (!dataUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const img = new Image();
    img.onload = () => {
      const MAX = 320;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  }, [dataUrl]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));
    const [r, g, b] = canvas.getContext("2d")!.getImageData(x, y, 1, 1).data;
    const hex = `#${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`;
    setPickedHex(hex);
    onColorPick(hex);
  };

  return (
    <div className="space-y-3">
      {dataUrl ? (
        <div className="space-y-2">
          <canvas ref={canvasRef} className="w-full rounded-xl cursor-crosshair" onClick={handleClick}/>
          <p className="text-pearl-dim/60 text-[10px] text-center">画像をタップして色を取得</p>
          {pickedHex && (
            <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
              <div className="w-5 h-5 rounded-full border border-white/20 flex-shrink-0"
                style={{ background: pickedHex }}/>
              <span className="text-pearl text-xs font-mono">{pickedHex.toUpperCase()}</span>
              <span className="text-emerald-400 text-[10px] ml-auto">取得済み</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center gap-2">
          <Pipette size={24} className="text-pearl-dim/30"/>
          <p className="text-pearl-dim text-xs text-center">参考画像をアップロードして<br/>ピクセルの色を取得</p>
        </div>
      )}
      <input ref={eyeFileRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => setDataUrl(ev.target?.result as string);
          reader.readAsDataURL(file);
        }}
      />
      <button onClick={() => eyeFileRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 py-2.5 glass border border-white/10 rounded-xl text-sm text-pearl-muted hover:text-pearl transition-colors">
        <Upload size={14}/> 参考画像をアップロード
      </button>
    </div>
  );
}

function PhotoAdjustPanel({
  brightness, setBrightness,
  contrast, setContrast,
  temperature, setTemperature,
  onAutoWB,
}: {
  brightness: number; setBrightness: (v: number) => void;
  contrast: number; setContrast: (v: number) => void;
  temperature: number; setTemperature: (v: number) => void;
  onAutoWB: () => void;
}) {
  const hasAdjustment = brightness !== 0 || contrast !== 0 || temperature !== 0;
  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-pearl text-xs font-semibold tracking-wider">ライティング調整</p>
        <div className="flex items-center gap-2">
          {hasAdjustment && (
            <button onClick={() => { setBrightness(0); setContrast(0); setTemperature(0); }}
              className="text-[10px] text-pearl-dim/50 hover:text-pearl-dim transition-colors">
              リセット
            </button>
          )}
          <button onClick={onAutoWB}
            className="text-[10px] px-3 py-1 glass border border-gold/20 text-gold rounded-full hover:bg-gold/10 transition-all">
            オートWB
          </button>
        </div>
      </div>
      {([
        { label: "明るさ", value: brightness, set: setBrightness },
        { label: "コントラスト", value: contrast, set: setContrast },
      ] as { label: string; value: number; set: (v: number) => void }[]).map(({ label, value, set }) => (
        <div key={label}>
          <div className="flex justify-between text-[10px] mb-1.5">
            <span className="text-pearl-dim">{label}</span>
            <span className="text-pearl font-mono">{value > 0 ? "+" : ""}{value}</span>
          </div>
          <input type="range" min={-50} max={50} value={value}
            onChange={e => set(Number(e.target.value))}
            className="w-full h-1 rounded-full accent-gold cursor-pointer"/>
        </div>
      ))}
      <div>
        <div className="flex justify-between text-[10px] mb-1.5">
          <span className="text-pearl-dim">色温度</span>
          <span className="text-pearl font-mono">{temperature > 0 ? "+" : ""}{temperature}</span>
        </div>
        <input type="range" min={-50} max={50} value={temperature}
          onChange={e => setTemperature(Number(e.target.value))}
          className="w-full h-1 rounded-full accent-gold cursor-pointer"/>
        <div className="flex justify-between text-[9px] text-pearl-dim/40 mt-0.5">
          <span>寒色</span><span>暖色</span>
        </div>
      </div>
      {hasAdjustment && (
        <p className="text-gold/60 text-[10px] text-center">✦ 補正後の画像をAIに送信します</p>
      )}
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
type PickerInput = "sliders" | "wheel" | "hex" | "gallery" | "eyedropper";

export default function ColorExpertPage() {
  const [tab, setTab] = useState<Tab>("analyze");

  // ── Analyze ────────────────────────────────────────────
  const [hairImageUrl,     setHairImageUrl]     = useState<string | null>(null);
  const [hairImageFile,    setHairImageFile]    = useState<File | null>(null);
  const [hairImageDataUrl, setHairImageDataUrl] = useState<string | null>(null);
  const [hairAnalysis,     setHairAnalysis]     = useState<HairAnalysis | null>(null);
  const [analyzeLoading,   setAnalyzeLoading]   = useState(false);
  const [analyzeError,     setAnalyzeError]     = useState<string | null>(null);
  const hairCameraRef = useRef<HTMLInputElement>(null);
  const hairFileRef   = useRef<HTMLInputElement>(null);

  // ── Lighting adjustment ────────────────────────────────
  const [brightness,   setBrightness]   = useState(0);
  const [contrast,     setContrast]     = useState(0);
  const [temperature,  setTemperature]  = useState(0);

  // ── Recipe / target ────────────────────────────────────
  const [targetMode,      setTargetMode]      = useState<TargetMode>("picker");
  const [pickerLevel,     setPickerLevel]     = useState(10);
  const [pickerTone,      setPickerTone]      = useState("ナチュラル");
  const [pickerSat,       setPickerSat]       = useState<"vivid"|"natural"|"muted">("natural");
  const [pickerInput,     setPickerInput]     = useState<PickerInput>("sliders");
  const [wheelH,          setWheelH]          = useState(30);
  const [wheelS,          setWheelS]          = useState(0.35);
  const [wheelL,          setWheelL]          = useState(0.5);
  const [hexInputVal,     setHexInputVal]     = useState("#C8987C");
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

  // ── Recolor preview ────────────────────────────────────
  const [recolorStrength, setRecolorStrength] = useState(0.65);
  const [showAfter,       setShowAfter]       = useState(true);
  const recolorCanvasRef  = useRef<HTMLCanvasElement>(null);
  const recolorTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Sync hex display and wheel when picker mode switches
  const prevPickerInput = useRef<PickerInput>("sliders");
  useEffect(() => {
    if (prevPickerInput.current !== pickerInput) {
      if (pickerInput === "wheel") {
        const [h, s, l] = hexToHsl(previewColor);
        setWheelH(h); setWheelS(s); setWheelL(l);
      }
      if (pickerInput === "hex") {
        setHexInputVal(previewColor.toUpperCase());
      }
    }
    prevPickerInput.current = pickerInput;
  }, [pickerInput, previewColor]);

  // Recolor canvas effect
  useEffect(() => {
    if (!hairImageDataUrl || !recolorCanvasRef.current) return;
    if (recolorTimerRef.current) clearTimeout(recolorTimerRef.current);
    recolorTimerRef.current = setTimeout(() => {
      const canvas = recolorCanvasRef.current;
      if (!canvas) return;
      const img = new Image();
      img.onload = () => {
        const MAX = 380;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        if (showAfter) recolorHairOnCanvas(canvas, previewColor, recolorStrength);
      };
      img.src = hairImageDataUrl;
    }, 100);
  }, [hairImageDataUrl, previewColor, recolorStrength, showAfter]);

  useEffect(() => () => { if (recolorTimerRef.current) clearTimeout(recolorTimerRef.current); }, []);

  // ── Sync from hex (gallery / hex input / eyedropper) ──
  const syncFromHex = useCallback((hex: string) => {
    const { level, tone, sat } = hexToPickerState(hex);
    setPickerLevel(level);
    setPickerTone(tone);
    setPickerSat(sat);
    const [h, s, l] = hexToHsl(hex);
    setWheelH(h); setWheelS(s); setWheelL(l);
    setHexInputVal(hex.toUpperCase());
  }, []);

  // ── Handlers: analyze ──────────────────────────────────
  const handleHairFile = useCallback((file: File) => {
    setHairImageFile(file);
    setHairImageUrl(URL.createObjectURL(file));
    setHairImageDataUrl(null);
    setHairAnalysis(null);
    setAnalyzeError(null);
    setBrightness(0); setContrast(0); setTemperature(0);
    const reader = new FileReader();
    reader.onload = e => setHairImageDataUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const clearHairImage = () => {
    setHairImageUrl(null);
    setHairImageFile(null);
    setHairImageDataUrl(null);
    setHairAnalysis(null);
    setBrightness(0); setContrast(0); setTemperature(0);
  };

  const handleAutoWB = useCallback(async () => {
    if (!hairImageUrl) return;
    const img = new Image();
    img.src = hairImageUrl;
    await new Promise<void>(r => { img.onload = () => r(); });
    const MAX = 150;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width  = Math.round(img.width  * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let tR = 0, tG = 0, tB = 0;
    const n = canvas.width * canvas.height;
    for (let i = 0; i < data.length; i += 4) { tR += data[i]; tG += data[i+1]; tB += data[i+2]; }
    const aR = tR/n, aG = tG/n, aB = tB/n;
    const aL = 0.299*aR + 0.587*aG + 0.114*aB;
    setBrightness(Math.min(50, Math.max(-50, Math.round((145 - aL) * 0.25))));
    setTemperature(Math.min(50, Math.max(-50, Math.round((aB - aR) * 0.4))));
    setContrast(0);
  }, [hairImageUrl]);

  const analyzeHair = async () => {
    if (!hairImageFile) { setAnalyzeError("髪の写真を選択してください"); return; }
    setAnalyzeError(null); setAnalyzeLoading(true);
    try {
      let imageBlob: Blob = hairImageFile;
      if ((brightness !== 0 || contrast !== 0 || temperature !== 0) && hairImageUrl) {
        imageBlob = await createAdjustedImageBlob(hairImageUrl, brightness, contrast, temperature);
      }
      const fd = new FormData();
      fd.append("image", imageBlob, hairImageFile.name);
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

  // CSS filter for live photo preview
  const hairImgFilter = `brightness(${(1 + brightness / 100).toFixed(2)}) contrast(${(1 + contrast / 100).toFixed(2)}) sepia(${(Math.max(0, temperature) * 0.005).toFixed(3)}) hue-rotate(${(-temperature * 0.2).toFixed(1)}deg)`;

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
                <img src={hairImageUrl} alt="Hair" className="w-full max-h-64 object-cover"
                  style={{ filter: hairImgFilter }}/>
                <button onClick={clearHairImage}
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

          {/* Lighting adjustment panel */}
          {hairImageUrl && (
            <PhotoAdjustPanel
              brightness={brightness} setBrightness={setBrightness}
              contrast={contrast} setContrast={setContrast}
              temperature={temperature} setTemperature={setTemperature}
              onAutoWB={handleAutoWB}
            />
          )}

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
                {/* Picker input sub-tabs */}
                <div className="flex gap-1 bg-white/5 rounded-xl p-1 overflow-x-auto">
                  {([
                    { k: "sliders"    as PickerInput, icon: <SlidersHorizontal size={11}/>, label: "スライダー" },
                    { k: "wheel"      as PickerInput, icon: <Palette size={11}/>,           label: "ホイール"   },
                    { k: "hex"        as PickerInput, icon: <span className="text-[10px] font-mono">#</span>, label: "HEX" },
                    { k: "gallery"    as PickerInput, icon: <span className="text-[10px]">★</span>,           label: "ギャラリー" },
                    { k: "eyedropper" as PickerInput, icon: <Pipette size={11}/>,           label: "スポイト"   },
                  ]).map(({ k, icon, label }) => (
                    <button key={k} onClick={() => setPickerInput(k)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap flex-shrink-0 ${pickerInput===k?"bg-gold/10 text-gold border border-gold/20":"text-pearl-muted hover:text-pearl"}`}>
                      {icon}{label}
                    </button>
                  ))}
                </div>

                {/* Sliders mode */}
                {pickerInput === "sliders" && (
                  <div className="flex gap-4">
                    <HairColorPreview color={previewColor} level={pickerLevel} tone={pickerTone}/>
                    <div className="flex-1 space-y-4 min-w-0">
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
                )}

                {pickerInput === "sliders" && (
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
                )}

                {/* Wheel mode */}
                {pickerInput === "wheel" && (
                  <ColorWheelPicker
                    hue={wheelH} sat={wheelS} lig={wheelL}
                    onChange={(h, s, l) => {
                      setWheelH(h); setWheelS(s); setWheelL(l);
                      const hex = hslToHex(h, s, l);
                      setHexInputVal(hex.toUpperCase());
                      const { level, tone, sat } = hexToPickerState(hex);
                      setPickerLevel(level); setPickerTone(tone); setPickerSat(sat);
                    }}
                  />
                )}

                {/* HEX mode */}
                {pickerInput === "hex" && (
                  <HexInputPicker
                    value={hexInputVal}
                    onChange={hex => syncFromHex(hex)}
                  />
                )}

                {/* Gallery mode */}
                {pickerInput === "gallery" && (
                  <HairColorGallery onSelect={hex => { syncFromHex(hex); setPickerInput("sliders"); }} />
                )}

                {/* Eyedropper mode */}
                {pickerInput === "eyedropper" && (
                  <EyedropperPicker
                    defaultDataUrl={hairImageDataUrl}
                    onColorPick={hex => { syncFromHex(hex); }}
                  />
                )}

                {/* Current selection summary + apply */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 flex-shrink-0"
                      style={{background: previewColor}}/>
                    <div className="min-w-0">
                      <p className="text-pearl text-xs font-semibold">Lv.{pickerLevel} · {pickerTone}</p>
                      <p className="text-pearl-dim text-[10px] font-mono">{previewColor.toUpperCase()}</p>
                    </div>
                  </div>
                  {colorTarget && (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs flex-shrink-0">
                      <CheckCircle size={13}/>設定済み
                    </div>
                  )}
                </div>

                {/* Photo recolor preview */}
                {hairImageDataUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-pearl-dim text-[10px] font-semibold">ヘアカラーシミュレーション（参考）</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setShowAfter(false)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg transition-all ${!showAfter?"bg-white/10 text-pearl":"text-pearl-dim/50"}`}>
                          Before
                        </button>
                        <button onClick={() => setShowAfter(true)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg transition-all ${showAfter?"bg-gold/10 text-gold border border-gold/20":"text-pearl-dim/50"}`}>
                          After
                        </button>
                      </div>
                    </div>
                    <canvas ref={recolorCanvasRef} className="w-full rounded-xl"/>
                    <div className="flex items-center gap-3">
                      <span className="text-pearl-dim text-[10px] whitespace-nowrap">強さ</span>
                      <input type="range" min={20} max={100} value={Math.round(recolorStrength * 100)}
                        onChange={e => setRecolorStrength(Number(e.target.value) / 100)}
                        className="flex-1 h-1 rounded-full accent-gold cursor-pointer"/>
                      <span className="text-pearl-dim text-[10px] font-mono w-8">{Math.round(recolorStrength * 100)}%</span>
                    </div>
                  </div>
                )}

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
