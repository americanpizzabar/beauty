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
  priceRanges: string[];
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
  urlVerified?: boolean;
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

export interface ComparedProduct {
  id: string;
  name: string;
  brand: string;
  scores: {
    hydration: number;
    brightening: number;
    antiAging: number;
    sensitivity: number;
    valueForMoney: number;
  };
  strengths: string[];
  weaknesses: string[];
  bestFor: string;
}

export interface ComparisonResult {
  comparison: string;
  winner?: string;
  products: ComparedProduct[];
  recommendation: string;
}

// ── COLOREXPERT AI ─────────────────────────────────────────

export interface HairZoneLevel {
  level: number;
  undertone: string;
  damage: "healthy" | "mild" | "moderate" | "severe";
  notes: string;
}

export interface HairAnalysis {
  zones: {
    roots: HairZoneLevel;
    mid: HairZoneLevel;
    tips: HairZoneLevel;
  };
  overallDamage: "healthy" | "mild" | "moderate" | "severe";
  damageDetails: string;
  undertoneAnalysis: { red: number; yellow: number; orange: number };
  undertoneDescription: string;
  cuticleCondition: string;
  recommendedOxi: "3%" | "6%" | "9%" | "12%" | "AC";
  porosity: "low" | "medium" | "high";
  elasticity: "good" | "normal" | "poor";
  notes: string;
}

export interface ColorTarget {
  targetLevel: number;
  hue: string;
  saturation: "vivid" | "natural" | "muted";
  toneFamily: string;
  colorDescription: string;
  baseColorNeeded: string;
  processDifficulty: "easy" | "moderate" | "challenging";
  notes: string;
  textDescription?: string;
}

export interface RecipeAgent {
  role: string;
  name: string;
  brand: string;
  code: string;
  amount: number;
  unit: "g" | "%";
}

export interface RecipeStep {
  stepNumber: number;
  area: string;
  agents: RecipeAgent[];
  processingTime: number;
  temperature: "room" | "warm" | "cool";
  instructions: string;
}

export interface ColorRecipe {
  steps: RecipeStep[];
  totalTime: number;
  totalAmount: number;
  warnings: string[];
  allergySafety: string;
  aftercare: string;
  notes: string;
}
