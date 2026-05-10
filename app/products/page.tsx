"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, Link, Plus, Trash2, RefreshCw, CheckCircle, AlertTriangle, Clock, Package, X, ChevronDown, ExternalLink } from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import type { CustomProduct } from "@/lib/storage";
import {
  getCustomProducts, addCustomProduct, deleteCustomProduct, updateCustomProduct,
} from "@/lib/storage";
import { getAllProducts } from "@/lib/db";

type AddMode = "camera" | "url" | "manual" | null;

const STATUS_CONFIG = {
  active: { label: "販売中", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle },
  discontinued: { label: "廃盤", color: "text-red-400", bg: "bg-red-500/10", icon: X },
  updated: { label: "リニューアル", color: "text-blue-400", bg: "bg-blue-500/10", icon: RefreshCw },
  unknown: { label: "未確認", color: "text-pearl-dim", bg: "bg-white/5", icon: Clock },
};

const BLANK: Omit<CustomProduct, "id" | "addedAt"> = {
  name: "", brand: "", category: "", price: "", description: "",
  key_ingredients: [], skin_types: [], concerns: [], how_to_use: "", url: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<CustomProduct[]>([]);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [urlInput, setUrlInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const builtinProducts = getAllProducts();

  useEffect(() => {
    setProducts(getCustomProducts());
  }, []);

  const refresh = () => setProducts(getCustomProducts());

  // Camera / file capture
  const handleImageFile = useCallback(async (file: File) => {
    setExtracting(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/extract-product", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({
        name: data.name || "", brand: data.brand || "", category: data.category || "",
        price: data.price || "", description: data.description || "",
        key_ingredients: data.key_ingredients || [],
        skin_types: data.skin_types || [], concerns: data.concerns || [],
        how_to_use: data.how_to_use || "", url: "",
      });
      setAddMode("manual");
    } catch (e) {
      setError(e instanceof Error ? e.message : "抽出に失敗しました");
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleUrlExtract = async () => {
    if (!urlInput.trim()) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ ...BLANK, ...data, url: urlInput });
      setAddMode("manual");
    } catch (e) {
      setError(e instanceof Error ? e.message : "URLからの抽出に失敗しました");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = () => {
    if (!form.name || !form.brand) {
      setError("商品名とブランド名は必須です");
      return;
    }
    addCustomProduct(form);
    setForm({ ...BLANK });
    setAddMode(null);
    setUrlInput("");
    setError(null);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteCustomProduct(id);
    refresh();
  };

  const handleCheckAll = async () => {
    const allProducts = [
      ...builtinProducts.map(p => ({ id: p.id, name: p.name, brand: p.brand, category: p.category })),
      ...products.map(p => ({ id: p.id, name: p.name, brand: p.brand, category: p.category })),
    ];
    if (!allProducts.length) return;
    setChecking(true);
    setCheckResult(null);
    setError(null);
    try {
      const res = await fetch("/api/check-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: allProducts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Update custom products with status
      if (data.results) {
        for (const r of data.results) {
          const custom = products.find(p => p.id === r.id);
          if (custom) {
            updateCustomProduct(r.id, {
              status: r.status,
              statusNote: r.statusNote,
              statusCheckedAt: Date.now(),
            });
          }
        }
        refresh();
      }
      setCheckResult(data.note || `${data.results?.length || 0}件の商品ステータスを確認しました`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "確認に失敗しました");
    } finally {
      setChecking(false);
    }
  };

  const setArrayField = (field: keyof typeof form, val: string) => {
    const arr = val.split(/[,、\n]/).map(s => s.trim()).filter(Boolean);
    setForm(f => ({ ...f, [field]: arr }));
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gold/60 text-xs tracking-[0.3em] font-medium uppercase mb-2">Product Database</p>
        <h1 className="text-3xl font-semibold text-pearl" style={{ fontFamily: "var(--font-playfair,'Playfair Display',serif)" }}>
          商品データベース
        </h1>
        <p className="text-pearl-muted text-sm mt-2">
          推薦に使う商品を管理・登録できます
        </p>
      </div>

      {/* Status check button */}
      <div className="glass rounded-2xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-pearl text-sm font-semibold">商品ステータス確認</p>
          <span className="text-pearl-dim text-xs">{builtinProducts.length + products.length}件登録</span>
        </div>
        <p className="text-pearl-muted text-xs mb-3">全商品の廃盤・リニューアル状況をAIで確認します</p>
        {checkResult && (
          <div className="glass border border-emerald-500/20 rounded-xl px-3 py-2 mb-3">
            <p className="text-emerald-400 text-xs">{checkResult}</p>
          </div>
        )}
        <button
          onClick={handleCheckAll}
          disabled={checking}
          className="w-full flex items-center justify-center gap-2 bg-gold/10 border border-gold/20 hover:bg-gold/20 text-gold py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
        >
          {checking ? (
            <div className="w-4 h-4 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
          ) : (
            <RefreshCw size={15} />
          )}
          {checking ? "確認中..." : "全商品ステータスを確認する"}
        </button>
      </div>

      {/* Add product buttons */}
      {!addMode && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { mode: "camera" as AddMode, icon: Camera, label: "カメラで撮影" },
            { mode: "url" as AddMode, icon: Link, label: "URLから追加" },
            { mode: "manual" as AddMode, icon: Plus, label: "手動で入力" },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => { setAddMode(mode); setForm({ ...BLANK }); setError(null); }}
              className="flex flex-col items-center gap-2 glass border border-white/8 hover:border-gold/20 rounded-xl py-4 text-xs text-pearl-muted hover:text-gold transition-all"
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />
      <input ref={fileRef} type="file" accept="image/*"
        onChange={e => e.target.files?.[0] && handleImageFile(e.target.files[0])} />

      {/* Camera mode */}
      {addMode === "camera" && !extracting && (
        <div className="glass rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-pearl text-sm font-semibold">写真から追加</h3>
            <button onClick={() => setAddMode(null)} className="text-pearl-dim hover:text-gold">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 glass-gold border border-gold/20 rounded-xl py-3 text-sm text-gold">
              <Camera size={15} /> カメラで撮影
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 glass border border-white/10 rounded-xl py-3 text-sm text-pearl">
              <Plus size={15} /> ファイルを選択
            </button>
          </div>
        </div>
      )}

      {/* URL mode */}
      {addMode === "url" && (
        <div className="glass rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-pearl text-sm font-semibold">URLから追加</h3>
            <button onClick={() => setAddMode(null)} className="text-pearl-dim hover:text-gold"><X size={16} /></button>
          </div>
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="w-full px-4 py-3 rounded-xl text-sm mb-3"
          />
          <button
            onClick={handleUrlExtract}
            disabled={extracting || !urlInput.trim()}
            className="w-full flex items-center justify-center gap-2 bg-gold text-obsidian font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
          >
            {extracting ? <div className="w-4 h-4 border-2 border-obsidian/40 border-t-obsidian rounded-full animate-spin" /> : <Link size={14} />}
            {extracting ? "取得中..." : "商品情報を取得する"}
          </button>
        </div>
      )}

      {/* Extracting loader */}
      {extracting && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="w-5 h-5 border-2 border-gold/40 border-t-gold rounded-full animate-spin" />
          <p className="text-gold text-sm">商品情報を取得中...</p>
        </div>
      )}

      {/* Manual / Edit form */}
      {addMode === "manual" && !extracting && (
        <div className="glass rounded-2xl p-5 mb-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-pearl text-sm font-semibold">商品情報を入力</h3>
            <button onClick={() => setAddMode(null)} className="text-pearl-dim hover:text-gold"><X size={16} /></button>
          </div>
          {[
            { key: "name", label: "商品名 *", ph: "例：モイスチャライジング セラム" },
            { key: "brand", label: "ブランド名 *", ph: "例：LA MER" },
            { key: "category", label: "カテゴリー", ph: "例：美容液" },
            { key: "price", label: "価格", ph: "例：¥5,000" },
            { key: "url", label: "商品URL", ph: "https://..." },
          ].map(({ key, label, ph }) => (
            <div key={key}>
              <label className="text-pearl-dim text-xs mb-1 block">{label}</label>
              <input type="text" value={(form as unknown as Record<string, string>)[key] || ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph} className="w-full px-3 py-2.5 rounded-xl text-sm" />
            </div>
          ))}
          <div>
            <label className="text-pearl-dim text-xs mb-1 block">主要成分（カンマ区切り）</label>
            <input type="text" value={form.key_ingredients.join(", ")}
              onChange={e => setArrayField("key_ingredients", e.target.value)}
              placeholder="ヒアルロン酸, セラミド, ナイアシンアミド"
              className="w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-pearl-dim text-xs mb-1 block">適した肌タイプ（カンマ区切り）</label>
            <input type="text" value={form.skin_types.join(", ")}
              onChange={e => setArrayField("skin_types", e.target.value)}
              placeholder="乾燥肌, 敏感肌" className="w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-pearl-dim text-xs mb-1 block">対応する肌悩み（カンマ区切り）</label>
            <input type="text" value={form.concerns.join(", ")}
              onChange={e => setArrayField("concerns", e.target.value)}
              placeholder="乾燥, ハリ不足" className="w-full px-3 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label className="text-pearl-dim text-xs mb-1 block">製品説明</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="製品の特徴・説明" rows={2}
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none" />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button onClick={handleSave}
            className="w-full bg-gold text-obsidian font-semibold py-3 rounded-xl text-sm">
            ✦ データベースに追加する
          </button>
        </div>
      )}

      {error && !addMode && (
        <div className="glass border border-red-500/20 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Custom products list */}
      {products.length > 0 && (
        <div className="mb-6">
          <p className="text-pearl-dim text-xs font-semibold tracking-wider mb-3">
            登録済み商品（カスタム） {products.length}件
          </p>
          <div className="space-y-3">
            {products.map(p => {
              const st = STATUS_CONFIG[p.status || "unknown"];
              const StIcon = st.icon;
              return (
                <div key={p.id} className="glass rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`tag-chip ${st.bg} ${st.color} flex items-center gap-1`}>
                          <StIcon size={9} /> {st.label}
                        </span>
                        <span className="text-gold/70 text-xs">{p.brand}</span>
                      </div>
                      <p className="text-pearl text-sm font-medium mt-1">{p.name}</p>
                      <p className="text-pearl-dim text-xs">{p.category}{p.price ? ` · ${p.price}` : ""}</p>
                      {p.statusNote && (
                        <p className="text-pearl-muted text-xs mt-1 leading-relaxed">{p.statusNote}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noopener noreferrer"
                          className="text-pearl-dim hover:text-gold transition-colors">
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                        className="text-pearl-dim hover:text-gold transition-colors">
                        <ChevronDown size={14} className={expandedId === p.id ? "rotate-180" : ""} />
                      </button>
                      <button onClick={() => handleDelete(p.id)}
                        className="text-pearl-dim hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {expandedId === p.id && (
                    <div className="px-4 pb-4 border-t border-white/5 space-y-2 pt-3">
                      {p.key_ingredients.length > 0 && (
                        <div>
                          <p className="text-pearl-dim text-xs mb-1">主要成分</p>
                          <div className="flex flex-wrap gap-1">
                            {p.key_ingredients.map((i, idx) => (
                              <span key={idx} className="tag-chip bg-white/5 text-pearl-dim">{i}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {p.skin_types.length > 0 && (
                        <p className="text-pearl-muted text-xs">対象肌: {p.skin_types.join("・")}</p>
                      )}
                      {p.description && (
                        <p className="text-pearl-muted text-xs leading-relaxed">{p.description}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Builtin products list (collapsed) */}
      <div>
        <p className="text-pearl-dim text-xs font-semibold tracking-wider mb-3">
          デフォルト商品 {builtinProducts.length}件
        </p>
        <div className="space-y-2">
          {builtinProducts.map(p => (
            <div key={p.id} className="glass rounded-xl px-4 py-3 flex items-center gap-3">
              <Package size={14} className="text-pearl-dim/50 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-pearl text-xs font-medium">{p.name}</p>
                <p className="text-pearl-dim text-[10px]">{p.brand} · {p.category}</p>
              </div>
              <span className="tag-chip bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                <CheckCircle size={9} className="inline mr-1" />既定
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
