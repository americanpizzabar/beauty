export interface AnalysisResult {
  productName: string;
  brand: string;
  category: string;
  overview: string;
  effects: Effect[];
  ingredients: Ingredient[];
  skinTypes: SkinTypeCompatibility[];
  irritants: Irritant[];
  usage: string;
  rating: {
    hydration: number;
    brightening: number;
    antiAging: number;
    sensitivity: number;
  };
  expertAdvice: string;
  warnings: string[];
}

export interface Effect {
  name: string;
  description: string;
  intensity: "high" | "medium" | "low";
}

export interface Ingredient {
  name: string;
  purpose: string;
  safety: "safe" | "caution" | "avoid";
  concentration?: string;
}

export interface SkinTypeCompatibility {
  type: string;
  compatibility: "excellent" | "good" | "fair" | "poor";
  reason: string;
}

export interface Irritant {
  name: string;
  risk: "high" | "medium" | "low";
  description: string;
}

export interface SkinProfile {
  gender: string;
  skinType: string;
  concerns: string[];
  sensitivity: string;
  age: string;
  tone: string;
  texture: string;
  allergies: string;
  currentRoutine: string;
}

export interface RecommendationResult {
  products: ProductRecommendation[];
  skinAnalysis: string;
  routineAdvice: string;
  expertNote: string;
}

export interface ProductRecommendation {
  id: string;
  name: string;
  brand: string;
  category: string;
  price?: string;
  matchScore: number;
  reasons: string[];
  howToUse: string;
  keyIngredients: string[];
  source: "database" | "internet";
  purchaseUrl?: string;
}

export interface SearchResult {
  query: string;
  results: ProductRecommendation[];
  summary: string;
  expertAdvice: string;
}

export interface ProductStatusCheck {
  id: string;
  name: string;
  brand: string;
  status: "active" | "discontinued" | "updated" | "unknown";
  statusNote: string;
  newProductName?: string;
}
