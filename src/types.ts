export type IntensityLevel = '隱藏' | '輕微' | '中等' | '強烈' | '極端';

export interface Trait {
  id: string;
  name: string;
  axis: string; // e.g. '社交需求', '思考方式'
  description: string;
  baseWeight: number; // default probability weight (e.g. 10)
}

export interface AxisDefinition {
  id: string;
  name: string;
}

export interface CooccurrenceRule {
  id: string;
  traitAId: string;
  traitBId: string;
  weight: number; // positive or negative (-10 to +10)
  // Intensity modifier: how specific intensities of trait A change co-occurrence with B
  intensityModifiers?: {
    [key in IntensityLevel]?: number; // delta to weight
  };
}

export interface SoftExclusionRule {
  id: string;
  traitAId: string;
  traitBId: string;
  penaltyMultiplier: number; // e.g. 0.1 (reduces probability to 10%)
  note: string; // Weak compatibility independent annotation
}

export interface HardExclusionRule {
  id: string;
  traitAId: string;
  traitBId: string;
  reason?: string;
}

export interface WeakCompatibilityInfo {
  traitA: Trait;
  intensityA: IntensityLevel;
  traitB: Trait;
  intensityB: IntensityLevel;
  reasonType: 'soft_exclusion' | 'strong_negative_weight';
  score: number;
  note: string;
}

export interface ExtractedTraitItem {
  trait: Trait;
  intensity: IntensityLevel;
  axis: string;
}

export interface ExtractionResult {
  id: string;
  timestamp: number;
  traits: ExtractedTraitItem[];
  weakCompatibilities: WeakCompatibilityInfo[];
  specifiedAxes: string[];
}

export interface Dataset {
  version: number;
  updatedAt: number;
  axes: AxisDefinition[];
  traits: Trait[];
  cooccurrenceRules: CooccurrenceRule[];
  softExclusions: SoftExclusionRule[];
  hardExclusions: HardExclusionRule[];
}

export interface SimulationResult {
  totalRuns: number;
  traitStats: {
    traitId: string;
    traitName: string;
    axis: string;
    count: number;
    rate: number; // percentage
    intensityCounts: Record<IntensityLevel, number>;
  }[];
  weakCompatibilityOccurrences: number;
  runTimeMs: number;
}
