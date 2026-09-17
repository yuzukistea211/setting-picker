import {
  Dataset,
  ExtractedTraitItem,
  ExtractionResult,
  IntensityLevel,
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

export function sampleIntensity(): IntensityLevel {
  const r = Math.random();
  let cumulative = 0;
  for (const item of INTENSITY_DISTRIBUTION) {
    cumulative += item.prob;
    if (r <= cumulative) {
      return item.level;
    }
  }
  return '中等';
}

export function isHardExcluded(
  traitAId: string,
  traitBId: string,
  dataset: Dataset,
): { excluded: boolean; reason?: string } {
  const rule = dataset.hardExclusions.find(
    (h) =>
      (h.traitAId === traitAId && h.traitBId === traitBId) ||
      (h.traitAId === traitBId && h.traitBId === traitAId),
  );
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
  return dataset.softExclusions.find(
    (s) =>
      (s.traitAId === traitAId && s.traitBId === traitBId) ||
      (s.traitAId === traitBId && s.traitBId === traitAId),
  );
}

export function getCooccurrenceWeight(
  traitAId: string,
  traitBId: string,
  intensityA: IntensityLevel | undefined,
  dataset: Dataset,
): number {
  const rule = dataset.cooccurrenceRules.find(
    (c) =>
      (c.traitAId === traitAId && c.traitBId === traitBId) ||
      (c.traitAId === traitBId && c.traitBId === traitAId),
  );

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
  customDataset?: Dataset;
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

  // 1. First add any pinned traits
  if (pinnedIds.size > 0) {
    for (const pinnedId of pinnedIds) {
      const trait = dataset.traits.find((t) => t.id === pinnedId);
      if (trait) {
        selectedItems.push({
          trait,
          intensity: sampleIntensity(),
          axis: trait.axis,
        });
        selectedTraitIds.add(trait.id);
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

    // Calculate dynamic weights for each candidate
    const candidateWeights: { candidate: Trait; weight: number }[] = [];

    for (const candidate of nonHardExcludedCandidates) {
      let weight = candidate.baseWeight || 10;

      // Axis specification boost
      if (
        unfulfilledSpecifiedAxes.length > 0 &&
        unfulfilledSpecifiedAxes.includes(candidate.axis)
      ) {
        weight += 40; // strongly prioritize specified axes
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

  return {
    id: 'oc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
    traits: selectedItems,
    weakCompatibilities,
    specifiedAxes,
  };
}
