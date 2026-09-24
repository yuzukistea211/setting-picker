export type IntensityLevel = '隱藏' | '輕微' | '中等' | '強烈' | '極端';

export const ALL_INTENSITIES: IntensityLevel[] = ['隱藏', '輕微', '中等', '強烈', '極端'];

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
  locked?: boolean;
}

export interface ExtractionResult {
  id: string;
  timestamp: number;
  traits: ExtractedTraitItem[];
  weakCompatibilities: WeakCompatibilityInfo[];
  specifiedAxes: string[];
  characterName?: string;
  notes?: string;
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

export interface MetricDefinition {
  id: string;
  name: string; // Customizable metric name (e.g. 好感度, 信任度, 親密度)
  min?: number; // default -120
  max?: number; // default 120
}

export type RelationshipMetrics = Record<string, number>; // key is metric id, value is -120 to 120

export interface CharacterRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  surfaceRelation: string;          // 表層關係 (e.g. "朋友")
  sourceToTargetThought: string;    // A對B的真實想法 (e.g. "不太熟的朋友的朋友")
  targetToSourceThought: string;    // B對A的真實想法 (e.g. "好朋友")
  sourceToTargetMetrics: RelationshipMetrics; // A對B的自訂數值指標
  targetToSourceMetrics: RelationshipMetrics; // B對A的自訂數值指標
}

export interface NetworkCharacter {
  id: string;
  name: string;
  avatarColor?: string;
  notes?: string;
  traitsSummary?: string[];
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkData {
  version: number;
  updatedAt: number;
  metricDefinitions?: MetricDefinition[]; // Customizable metrics
  characters: NetworkCharacter[];
  relationships: CharacterRelationship[];
}
