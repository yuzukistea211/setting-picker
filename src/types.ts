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

// ─── 角色關係網 (Character Relationship Network) ───

export interface DirectionalMetrics {
  valence: number; // -120 to 120 (Valence)
  attachment: number; // -120 to 120 (Attachment)
  competence: number; // -120 to 120 (Competence)
  admiration: number; // -120 to 120 (Admiration)
  vulnerability: number; // -120 to 120 (Vulnerability)
}

export type MetricKey = keyof DirectionalMetrics;

export interface MetricDefinition {
  key: MetricKey;
  name: string;
  min: number;
  max: number;
  description: string;
  negativeLabel: string;
  positiveLabel: string;
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: 'valence',
    name: 'Valence',
    min: -120,
    max: 120,
    description: '好惡與正負情感傾向',
    negativeLabel: '厭惡 / 排斥 (-120)',
    positiveLabel: '喜愛 / 眷戀 (+120)',
  },
  {
    key: 'attachment',
    name: 'Attachment',
    min: -120,
    max: 120,
    description: '依戀與親密依賴度',
    negativeLabel: '疏離 / 防備 (-120)',
    positiveLabel: '深層依附 / 依賴 (+120)',
  },
  {
    key: 'competence',
    name: 'Competence',
    min: -120,
    max: 120,
    description: '對對方能力與實力的評價',
    negativeLabel: '質疑 / 不可靠 (-120)',
    positiveLabel: '認可 / 敬畏信任 (+120)',
  },
  {
    key: 'admiration',
    name: 'Admiration',
    min: -120,
    max: 120,
    description: '崇拜與價值認同度',
    negativeLabel: '鄙夷 / 否定理念 (-120)',
    positiveLabel: '崇拜 / 視為榜樣 (+120)',
  },
  {
    key: 'vulnerability',
    name: 'Vulnerability',
    min: -120,
    max: 120,
    description: '願意在對方面前展現脆弱與防備卸下程度',
    negativeLabel: '完全武裝 / 封閉 (-120)',
    positiveLabel: '完全坦誠 / 卸下心防 (+120)',
  },
];

export const DEFAULT_DIRECTIONAL_METRICS: DirectionalMetrics = {
  valence: 0,
  attachment: 0,
  competence: 0,
  admiration: 0,
  vulnerability: 0,
};

export interface NetworkCharacterTrait {
  id?: string;
  name: string;
  intensity?: string;
  axis?: string;
  description?: string;
}

export interface NetworkCharacter {
  id: string;
  name: string;
  notes?: string;
  traits?: NetworkCharacterTrait[];
  color?: string; // Hex or identifier for visual graph
  createdAt: number;
}

export interface RelationshipDirection {
  trueThought: string; // 角色當對方是什麼的真實想法
  metrics: DirectionalMetrics; // 5條單向數值條 (-120 ~ 120)
}

export interface CharacterRelationship {
  id: string;
  characterAId: string;
  characterBId: string;
  surfaceRelation: string; // 表層關係，例如「朋友」、「同事」
  aToB: RelationshipDirection; // A 對 B 的真實想法與 5 條單向數值條
  bToA: RelationshipDirection; // B 對 A 的真實想法與 5 條單向數值條
  updatedAt: number;
}

export interface RelationshipNetworkData {
  version: string;
  exportedAt?: string;
  characters: NetworkCharacter[];
  relationships: CharacterRelationship[];
  updatedAt: number;
}

