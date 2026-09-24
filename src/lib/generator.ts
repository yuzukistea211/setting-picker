import {
  CooccurrenceRule,
  Dataset,
  ExtractedTraitItem,
  ExtractionResult,
  HardExclusionRule,
  IntensityLevel,
  SoftExclusionRule,
  Trait,
  WeakCompatibilityInfo,
} from '../types';

// Discrete Gaussian / Normal Distribution for 5-tier intensity
// -2 std: 隱藏 (6%)
// -1 std: 輕微 (24%)
//  0 std: 中等 (40%)
// +1 std: 強烈 (24%)
// +2 std: 極端 (6%)
export const INTENSITY_DISTRIBUTION: { level: IntensityLevel; prob: number }[] = [
  { level: '隱藏', prob: 0.06 },
  { level: '輕微', prob: 0.24 },
  { level: '中等', prob: 0.40 },
  { level: '強烈', prob: 0.24 },
  { level: '極端', prob: 0.06 },
];

export interface DatasetIndex {
  hardMap: Map<string, HardExclusionRule>;
  softMap: Map<string, SoftExclusionRule>;
  coocMap: Map<string, CooccurrenceRule>;
  traitMap: Map<string, Trait>;
  traitIndexMap: Map<string, number>;
  numTraits: number;
  hardMatrix: Uint8Array;
  softMultiplierMatrix: Float32Array;
  coocWeightMatrix: Int8Array;
  coocModifiersMatrix: (Record<string, number> | null)[];
}

interface CachedDatasetEntry {
  index: DatasetIndex;
  updatedAt?: number;
  traitsLength: number;
  coocLength: number;
  softLength: number;
  hardLength: number;
}

// Memory-safe WeakMap cache: automatically garbage collected when a dataset is discarded
const datasetIndexCache = new WeakMap<Dataset, CachedDatasetEntry>();

export function invalidateDatasetIndexCache(dataset?: Dataset) {
  if (dataset) {
    datasetIndexCache.delete(dataset);
  }
}

export function getDatasetIndex(dataset: Dataset): DatasetIndex {
  const cached = datasetIndexCache.get(dataset);
  if (
    cached &&
    cached.updatedAt === dataset.updatedAt &&
    cached.traitsLength === dataset.traits.length &&
    cached.coocLength === dataset.cooccurrenceRules.length &&
    cached.softLength === dataset.softExclusions.length &&
    cached.hardLength === dataset.hardExclusions.length
  ) {
    return cached.index;
  }

  const hardMap = new Map<string, HardExclusionRule>();
  const softMap = new Map<string, SoftExclusionRule>();
  const coocMap = new Map<string, CooccurrenceRule>();
  const traitMap = new Map<string, Trait>();
  const traitIndexMap = new Map<string, number>();

  const numTraits = dataset.traits.length;
  const matrixSize = numTraits * numTraits;
  const hardMatrix = new Uint8Array(matrixSize);
  const softMultiplierMatrix = new Float32Array(matrixSize);
  softMultiplierMatrix.fill(1.0);
  const coocWeightMatrix = new Int8Array(matrixSize);
  const coocModifiersMatrix: (Record<string, number> | null)[] = new Array(matrixSize).fill(null);

  for (let i = 0; i < numTraits; i++) {
    const t = dataset.traits[i];
    traitMap.set(t.id, t);
    traitIndexMap.set(t.id, i);
  }

  for (let i = 0; i < dataset.hardExclusions.length; i++) {
    const h = dataset.hardExclusions[i];
    hardMap.set(`${h.traitAId}:${h.traitBId}`, h);
    hardMap.set(`${h.traitBId}:${h.traitAId}`, h);

    const idxA = traitIndexMap.get(h.traitAId);
    const idxB = traitIndexMap.get(h.traitBId);
    if (idxA !== undefined && idxB !== undefined) {
      hardMatrix[idxA * numTraits + idxB] = 1;
      hardMatrix[idxB * numTraits + idxA] = 1;
    }
  }

  for (let i = 0; i < dataset.softExclusions.length; i++) {
    const s = dataset.softExclusions[i];
    softMap.set(`${s.traitAId}:${s.traitBId}`, s);
    softMap.set(`${s.traitBId}:${s.traitAId}`, s);

    const idxA = traitIndexMap.get(s.traitAId);
    const idxB = traitIndexMap.get(s.traitBId);
    if (idxA !== undefined && idxB !== undefined) {
      softMultiplierMatrix[idxA * numTraits + idxB] = s.penaltyMultiplier;
      softMultiplierMatrix[idxB * numTraits + idxA] = s.penaltyMultiplier;
    }
  }

  for (let i = 0; i < dataset.cooccurrenceRules.length; i++) {
    const c = dataset.cooccurrenceRules[i];
    coocMap.set(`${c.traitAId}:${c.traitBId}`, c);
    coocMap.set(`${c.traitBId}:${c.traitAId}`, c);

    const idxA = traitIndexMap.get(c.traitAId);
    const idxB = traitIndexMap.get(c.traitBId);
    if (idxA !== undefined && idxB !== undefined) {
      coocWeightMatrix[idxA * numTraits + idxB] = c.weight;
      coocWeightMatrix[idxB * numTraits + idxA] = c.weight;
      if (c.intensityModifiers) {
        coocModifiersMatrix[idxA * numTraits + idxB] = c.intensityModifiers;
        coocModifiersMatrix[idxB * numTraits + idxA] = c.intensityModifiers;
      }
    }
  }

  const index: DatasetIndex = {
    hardMap,
    softMap,
    coocMap,
    traitMap,
    traitIndexMap,
    numTraits,
    hardMatrix,
    softMultiplierMatrix,
    coocWeightMatrix,
    coocModifiersMatrix,
  };

  datasetIndexCache.set(dataset, {
    index,
    updatedAt: dataset.updatedAt,
    traitsLength: dataset.traits.length,
    coocLength: dataset.cooccurrenceRules.length,
    softLength: dataset.softExclusions.length,
    hardLength: dataset.hardExclusions.length,
  });

  return index;
}

export function sampleIntensity(): IntensityLevel {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < INTENSITY_DISTRIBUTION.length; i++) {
    cumulative += INTENSITY_DISTRIBUTION[i].prob;
    if (r <= cumulative) {
      return INTENSITY_DISTRIBUTION[i].level;
    }
  }
  return '中等';
}

export function isHardExcluded(
  traitAId: string,
  traitBId: string,
  dataset: Dataset,
): { excluded: boolean; reason?: string } {
  const index = getDatasetIndex(dataset);
  const rule = index.hardMap.get(`${traitAId}:${traitBId}`);
  if (rule) {
    return { excluded: true, reason: rule.reason };
  }
  return { excluded: false };
}

export function getSoftExclusion(
  traitAId: string,
  traitBId: string,
  dataset: Dataset,
) {
  const index = getDatasetIndex(dataset);
  return index.softMap.get(`${traitAId}:${traitBId}`);
}

export function getCooccurrenceWeight(
  traitAId: string,
  traitBId: string,
  intensityA: IntensityLevel | undefined,
  dataset: Dataset,
): number {
  const index = getDatasetIndex(dataset);
  const rule = index.coocMap.get(`${traitAId}:${traitBId}`);
  if (!rule) return 0;

  let finalWeight = rule.weight;
  if (intensityA && rule.intensityModifiers && rule.intensityModifiers[intensityA]) {
    finalWeight += rule.intensityModifiers[intensityA]!;
  }
  return finalWeight;
}

export interface GeneratorOptions {
  count?: number;
  specifiedAxes?: string[];
  pinnedTraitIds?: string[];
  lockedTraits?: ExtractedTraitItem[];
  customDataset?: Dataset;
}

export function evaluateWeakCompatibilities(
  selectedItems: ExtractedTraitItem[],
  dataset: Dataset,
): WeakCompatibilityInfo[] {
  const weakCompatibilities: WeakCompatibilityInfo[] = [];

  for (let i = 0; i < selectedItems.length; i++) {
    for (let j = i + 1; j < selectedItems.length; j++) {
      const itemA = selectedItems[i];
      const itemB = selectedItems[j];

      // Check soft exclusion
      const softRule = getSoftExclusion(itemA.trait.id, itemB.trait.id, dataset);
      if (softRule) {
        weakCompatibilities.push({
          traitA: itemA.trait,
          intensityA: itemA.intensity,
          traitB: itemB.trait,
          intensityB: itemB.intensity,
          reasonType: 'soft_exclusion',
          score: softRule.penaltyMultiplier,
          note: softRule.note,
        });
        continue;
      }

      // Check strong negative co-occurrence
      const coocWeight = getCooccurrenceWeight(
        itemA.trait.id,
        itemB.trait.id,
        itemA.intensity,
        dataset,
      );
      if (coocWeight <= -4) {
        weakCompatibilities.push({
          traitA: itemA.trait,
          intensityA: itemA.intensity,
          traitB: itemB.trait,
          intensityB: itemB.intensity,
          reasonType: 'strong_negative_weight',
          score: coocWeight,
          note: `此組詞條具有負相關性（權重 ${coocWeight}），在角色體現上形成「${itemA.trait.name}」與「${itemB.trait.name}」的內在張力。`,
        });
      }
    }
  }

  return weakCompatibilities;
}

export function generateOC(
  dataset: Dataset,
  options: GeneratorOptions = {},
): ExtractionResult {
  const targetCount = options.count ?? 5;
  const specifiedAxes = options.specifiedAxes || [];
  const pinnedIds = new Set(options.pinnedTraitIds || []);

  const selectedItems: ExtractedTraitItem[] = [];
  const selectedTraitIds = new Set<string>();

  // 1. First add any locked traits (retain their intensity, axis, and locked state)
  if (options.lockedTraits && options.lockedTraits.length > 0) {
    for (const lockedItem of options.lockedTraits) {
      // Ensure the trait still exists in dataset
      const traitExists = dataset.traits.find((t) => t.id === lockedItem.trait.id);
      if (traitExists && !selectedTraitIds.has(traitExists.id)) {
        selectedItems.push({
          trait: traitExists,
          intensity: lockedItem.intensity,
          axis: traitExists.axis,
          locked: true,
        });
        selectedTraitIds.add(traitExists.id);
      }
    }
  }

  // 2. Add any pinned traits if not already selected and not hard-excluded
  if (pinnedIds.size > 0) {
    for (const pinnedId of pinnedIds) {
      if (selectedTraitIds.has(pinnedId)) continue;
      const trait = dataset.traits.find((t) => t.id === pinnedId);
      if (trait) {
        let hardConflict = false;
        for (const item of selectedItems) {
          if (isHardExcluded(trait.id, item.trait.id, dataset).excluded) {
            hardConflict = true;
            break;
          }
        }
        if (!hardConflict) {
          selectedItems.push({
            trait,
            intensity: sampleIntensity(),
            axis: trait.axis,
          });
          selectedTraitIds.add(trait.id);
        }
      }
    }
  }

  // Set of fulfilled axes
  const satisfiedAxes = new Set<string>(selectedItems.map((item) => item.axis));

  // Loop until target count is reached or no candidates remain
  while (selectedItems.length < targetCount) {
    // Determine which traits are available
    const candidates = dataset.traits.filter((t) => !selectedTraitIds.has(t.id));
    if (candidates.length === 0) break;

    // Filter by HARD EXCLUSION: any candidate that has hard exclusion with ANY selected item is eliminated
    const nonHardExcludedCandidates = candidates.filter((candidate) => {
      for (const item of selectedItems) {
        if (isHardExcluded(candidate.id, item.trait.id, dataset).excluded) {
          return false;
        }
      }
      return true;
    });

    if (nonHardExcludedCandidates.length === 0) break;

    // Check if there are specified axes that are not satisfied yet
    const unfulfilledSpecifiedAxes = specifiedAxes.filter(
      (axis) => !satisfiedAxes.has(axis),
    );

    // If there are still unfulfilled specified axes, check if any non-hard-excluded candidate belongs to them
    const unfulfilledAxisCandidates = unfulfilledSpecifiedAxes.length > 0
      ? nonHardExcludedCandidates.filter((c) => unfulfilledSpecifiedAxes.includes(c.axis))
      : [];

    // Prioritize candidates from unfulfilled specified axes to guarantee their extraction
    const candidatePool = unfulfilledAxisCandidates.length > 0
      ? unfulfilledAxisCandidates
      : nonHardExcludedCandidates;

    // Calculate dynamic weights for each candidate in the pool
    const candidateWeights: { candidate: Trait; weight: number }[] = [];

    for (const candidate of candidatePool) {
      let weight = candidate.baseWeight || 10;

      // Axis specification boost for multi-axis distribution
      if (
        unfulfilledSpecifiedAxes.length > 0 &&
        unfulfilledSpecifiedAxes.includes(candidate.axis)
      ) {
        weight += 20;
      }

      // Check soft exclusions and co-occurrence with each already selected trait
      let softPenaltyMultiplier = 1;

      for (const item of selectedItems) {
        // Co-occurrence weight
        const coocWeight = getCooccurrenceWeight(
          item.trait.id,
          candidate.id,
          item.intensity,
          dataset,
        );
        weight += coocWeight * 1.5;

        // Soft exclusion penalty
        const softRule = getSoftExclusion(candidate.id, item.trait.id, dataset);
        if (softRule) {
          softPenaltyMultiplier *= softRule.penaltyMultiplier;
        }
      }

      weight *= softPenaltyMultiplier;
      weight = Math.max(0.05, weight);

      candidateWeights.push({ candidate, weight });
    }

    // Weighted random selection
    const totalWeight = candidateWeights.reduce((sum, cw) => sum + cw.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosenCandidate = candidateWeights[0].candidate;

    for (const cw of candidateWeights) {
      rand -= cw.weight;
      if (rand <= 0) {
        chosenCandidate = cw.candidate;
        break;
      }
    }

    // Sample intensity for chosen candidate
    const intensity = sampleIntensity();

    selectedItems.push({
      trait: chosenCandidate,
      intensity,
      axis: chosenCandidate.axis,
    });
    selectedTraitIds.add(chosenCandidate.id);
    satisfiedAxes.add(chosenCandidate.axis);
  }

  // Identify Weak Compatibilities among selected traits
  const weakCompatibilities = evaluateWeakCompatibilities(selectedItems, dataset);

  return {
    id: 'oc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
    traits: selectedItems,
    weakCompatibilities,
    specifiedAxes,
  };
}
