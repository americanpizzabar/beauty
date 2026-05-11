import type { AnalysisResult, RecommendationResult } from "./types";

// ── Types ──────────────────────────────────────────────
export interface AnalysisEntry {
  id: string;
  timestamp: number;
  imageDataUrl?: string;
  result: AnalysisResult;
}

export interface RecommendEntry {
  id: string;
  timestamp: number;
  skinProfile: Record<string, unknown>;
  searchQuery: string;
  useDatabase: boolean;
  result: RecommendationResult;
}

export interface CustomProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price?: string;
  description?: string;
  key_ingredients: string[];
  skin_types: string[];
  concerns: string[];
  how_to_use?: string;
  url?: string;
  imageDataUrl?: string;
  addedAt: number;
  status?: "active" | "discontinued" | "updated";
  statusNote?: string;
  statusCheckedAt?: number;
}

export interface ColorInventoryItem {
  id: string;
  brand: string;
  series: string;
  name: string;
  code: string;
  type: "base" | "control" | "oxi";
  stock: number;
  expiresAt?: string;
  addedAt: number;
}

// ── Keys ───────────────────────────────────────────────
const K = {
  analysis: "beaute_analysis_history",
  recommend: "beaute_recommend_history",
  products: "beaute_custom_products",
  categories: "beaute_categories",
  colorInventory: "beaute_color_inventory",
};

export const DEFAULT_CATEGORIES = [
  "保湿美容液", "化粧水", "保湿クリーム", "洗顔料", "日焼け止め",
  "アイクリーム", "シートマスク", "美白美容液", "エイジングケア",
  "ファンデーション・BBクリーム", "オイル美容液", "ピーリング・角質ケア",
  "毛穴ケア", "アクネケア", "オールインワンゲル", "クレンジング",
  "トナーパッド", "ネッククリーム", "リップケア", "ヘアケア",
];

// ── Helpers ────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Analysis History ───────────────────────────────────
export function getAnalysisHistory(): AnalysisEntry[] {
  return load<AnalysisEntry[]>(K.analysis, []);
}

export function saveAnalysisEntry(
  result: AnalysisResult,
  imageDataUrl?: string
): AnalysisEntry {
  const entry: AnalysisEntry = { id: uid(), timestamp: Date.now(), result, imageDataUrl };
  save(K.analysis, [entry, ...getAnalysisHistory()].slice(0, 50));
  return entry;
}

export function deleteAnalysisEntry(id: string): void {
  save(K.analysis, getAnalysisHistory().filter((e) => e.id !== id));
}

// ── Recommendation History ─────────────────────────────
export function getRecommendHistory(): RecommendEntry[] {
  return load<RecommendEntry[]>(K.recommend, []);
}

export function saveRecommendEntry(
  skinProfile: Record<string, unknown>,
  searchQuery: string,
  useDatabase: boolean,
  result: RecommendationResult
): RecommendEntry {
  const entry: RecommendEntry = {
    id: uid(), timestamp: Date.now(),
    skinProfile, searchQuery, useDatabase, result,
  };
  save(K.recommend, [entry, ...getRecommendHistory()].slice(0, 30));
  return entry;
}

export function deleteRecommendEntry(id: string): void {
  save(K.recommend, getRecommendHistory().filter((e) => e.id !== id));
}

// ── Custom Products ────────────────────────────────────
export function getCustomProducts(): CustomProduct[] {
  return load<CustomProduct[]>(K.products, []);
}

export function addCustomProduct(
  product: Omit<CustomProduct, "id" | "addedAt">
): CustomProduct {
  const item: CustomProduct = { ...product, id: uid(), addedAt: Date.now() };
  save(K.products, [item, ...getCustomProducts()]);
  return item;
}

export function updateCustomProduct(id: string, updates: Partial<CustomProduct>): void {
  save(K.products, getCustomProducts().map((p) => (p.id === id ? { ...p, ...updates } : p)));
}

export function deleteCustomProduct(id: string): void {
  save(K.products, getCustomProducts().filter((p) => p.id !== id));
}

// ── Categories ─────────────────────────────────────────
export function getCategories(): string[] {
  return load<string[]>(K.categories, DEFAULT_CATEGORIES);
}

export function saveCategories(categories: string[]): void {
  save(K.categories, categories);
}

// ── Color Inventory ────────────────────────────────────
export function getColorInventory(): ColorInventoryItem[] {
  return load<ColorInventoryItem[]>(K.colorInventory, []);
}

export function addColorInventoryItem(
  item: Omit<ColorInventoryItem, "id" | "addedAt">
): ColorInventoryItem {
  const newItem: ColorInventoryItem = { ...item, id: uid(), addedAt: Date.now() };
  save(K.colorInventory, [newItem, ...getColorInventory()]);
  return newItem;
}

export function updateColorInventoryItem(id: string, updates: Partial<ColorInventoryItem>): void {
  save(K.colorInventory, getColorInventory().map((i) => (i.id === id ? { ...i, ...updates } : i)));
}

export function deleteColorInventoryItem(id: string): void {
  save(K.colorInventory, getColorInventory().filter((i) => i.id !== id));
}
