import { Dataset, AxisDefinition, Trait, CooccurrenceRule, SoftExclusionRule, HardExclusionRule } from '../types';

export interface MergeOptions {
  duplicateStrategy: 'update' | 'skip'; // 'update': overwrite duplicate trait content, 'skip': keep current
  mergeRules: boolean; // whether to merge cooccurrence, soft, and hard exclusion rules
}

export interface MergeAnalysis {
  isValid: boolean;
  errorMessage?: string;
  incomingRaw: unknown;
  incomingAxesCount: number;
  newAxesNames: string[];
  incomingTraitsCount: number;
  newTraitsCount: number;
  duplicateTraitNames: string[];
  incomingCoRulesCount: number;
  incomingSoftRulesCount: number;
  incomingHardRulesCount: number;
}

export interface MergeSummary {
  addedAxesCount: number;
  addedTraitsCount: number;
  updatedTraitsCount: number;
  skippedTraitsCount: number;
  addedCoRulesCount: number;
  updatedCoRulesCount: number;
  addedSoftRulesCount: number;
  updatedSoftRulesCount: number;
  addedHardRulesCount: number;
  updatedHardRulesCount: number;
  totalTraitsAfter: number;
  totalAxesAfter: number;
}

interface RawTraitObject {
  id?: string;
  name?: string;
  axis?: string;
  description?: string;
  baseWeight?: number;
}

interface RawAxisObject {
  id?: string;
  name?: string;
}

interface RawCooccurrenceObject {
  id?: string;
  traitAId?: string;
  traitBId?: string;
  weight?: number;
  intensityModifiers?: Record<string, number>;
}

interface RawSoftObject {
  id?: string;
  traitAId?: string;
  traitBId?: string;
  penaltyMultiplier?: number;
  note?: string;
}

interface RawHardObject {
  id?: string;
  traitAId?: string;
  traitBId?: string;
  reason?: string;
}

function extractRawCollections(incomingRaw: unknown): {
  rawTraits: RawTraitObject[];
  rawAxes: RawAxisObject[];
  rawCo: RawCooccurrenceObject[];
  rawSoft: RawSoftObject[];
  rawHard: RawHardObject[];
} | null {
  if (!incomingRaw || typeof incomingRaw !== 'object') {
    return null;
  }

  if (Array.isArray(incomingRaw)) {
    return {
      rawTraits: incomingRaw as RawTraitObject[],
      rawAxes: [],
      rawCo: [],
      rawSoft: [],
      rawHard: [],
    };
  }

  const rawObj = incomingRaw as Record<string, unknown>;
  if (Array.isArray(rawObj.traits)) {
    return {
      rawTraits: rawObj.traits as RawTraitObject[],
      rawAxes: Array.isArray(rawObj.axes) ? (rawObj.axes as RawAxisObject[]) : [],
      rawCo: Array.isArray(rawObj.cooccurrenceRules) ? (rawObj.cooccurrenceRules as RawCooccurrenceObject[]) : [],
      rawSoft: Array.isArray(rawObj.softExclusions) ? (rawObj.softExclusions as RawSoftObject[]) : [],
      rawHard: Array.isArray(rawObj.hardExclusions) ? (rawObj.hardExclusions as RawHardObject[]) : [],
    };
  }

  return null;
}

/**
 * Validates and analyzes an incoming dataset before merging.
 */
export function analyzeMerge(current: Dataset, incomingRaw: unknown): MergeAnalysis {
  const collections = extractRawCollections(incomingRaw);
  if (!collections) {
    return {
      isValid: false,
      errorMessage: '未在檔案中找到有效的詞條清單 (traits)，無法合併。',
      incomingRaw: null,
      incomingAxesCount: 0,
      newAxesNames: [],
      incomingTraitsCount: 0,
      newTraitsCount: 0,
      duplicateTraitNames: [],
      incomingCoRulesCount: 0,
      incomingSoftRulesCount: 0,
      incomingHardRulesCount: 0,
    };
  }

  const { rawTraits, rawAxes, rawCo, rawSoft, rawHard } = collections;
  const validTraits = rawTraits.filter(
    (t): t is RawTraitObject & { name: string } =>
      Boolean(t && typeof t.name === 'string' && t.name.trim().length > 0),
  );

  if (validTraits.length === 0) {
    return {
      isValid: false,
      errorMessage: '檔案中沒有任何有效的詞條資料。',
      incomingRaw: null,
      incomingAxesCount: 0,
      newAxesNames: [],
      incomingTraitsCount: 0,
      newTraitsCount: 0,
      duplicateTraitNames: [],
      incomingCoRulesCount: 0,
      incomingSoftRulesCount: 0,
      incomingHardRulesCount: 0,
    };
  }

  // Determine axes
  const currentAxisNames = new Set(current.axes.map((a) => a.name.trim()));
  const incomingAxisNames = new Set<string>();

  rawAxes.forEach((a) => {
    if (a && typeof a.name === 'string' && a.name.trim()) {
      incomingAxisNames.add(a.name.trim());
    }
  });

  // Also collect axes mentioned in traits
  validTraits.forEach((t) => {
    if (t.axis && typeof t.axis === 'string' && t.axis.trim()) {
      incomingAxisNames.add(t.axis.trim());
    }
  });

  const newAxesNames: string[] = [];
  incomingAxisNames.forEach((name) => {
    if (!currentAxisNames.has(name)) {
      newAxesNames.push(name);
    }
  });

  // Check trait duplicates
  const currentTraitNames = new Set(current.traits.map((t) => t.name.trim()));
  const duplicateTraitNames: string[] = [];
  let newTraitsCount = 0;

  validTraits.forEach((t) => {
    const name = t.name.trim();
    if (currentTraitNames.has(name)) {
      if (!duplicateTraitNames.includes(name)) {
        duplicateTraitNames.push(name);
      }
    } else {
      newTraitsCount++;
    }
  });

  return {
    isValid: true,
    incomingRaw,
    incomingAxesCount: incomingAxisNames.size,
    newAxesNames,
    incomingTraitsCount: validTraits.length,
    newTraitsCount,
    duplicateTraitNames,
    incomingCoRulesCount: rawCo.length,
    incomingSoftRulesCount: rawSoft.length,
    incomingHardRulesCount: rawHard.length,
  };
}

/**
 * Merges an incoming dataset into the current dataset with specified strategies.
 */
export function executeMerge(
  current: Dataset,
  incomingRaw: unknown,
  options: MergeOptions = { duplicateStrategy: 'update', mergeRules: true }
): { mergedDataset: Dataset; summary: MergeSummary } {
  const collections = extractRawCollections(incomingRaw);
  const rawTraits = collections?.rawTraits || [];
  const rawAxes = collections?.rawAxes || [];
  const rawCo = collections?.rawCo || [];
  const rawSoft = collections?.rawSoft || [];
  const rawHard = collections?.rawHard || [];

  // 1. Merge Axes
  const mergedAxes: AxisDefinition[] = [...current.axes];
  const axisNameMap = new Map<string, AxisDefinition>();
  current.axes.forEach((a) => axisNameMap.set(a.name.trim(), a));

  let addedAxesCount = 0;

  // From explicit axes list
  rawAxes.forEach((a) => {
    if (a && typeof a.name === 'string' && a.name.trim()) {
      const name = a.name.trim();
      if (!axisNameMap.has(name)) {
        const newAxis: AxisDefinition = {
          id: a.id || `axis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
        };
        mergedAxes.push(newAxis);
        axisNameMap.set(name, newAxis);
        addedAxesCount++;
      }
    }
  });

  // From traits' axis field
  rawTraits.forEach((t) => {
    if (t && typeof t.axis === 'string' && t.axis.trim()) {
      const name = t.axis.trim();
      if (!axisNameMap.has(name)) {
        const newAxis: AxisDefinition = {
          id: `axis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
        };
        mergedAxes.push(newAxis);
        axisNameMap.set(name, newAxis);
        addedAxesCount++;
      }
    }
  });

  // 2. Merge Traits & Map IDs
  // ID map: incomingTraitId -> mappedTraitId
  const traitIdMap = new Map<string, string>();
  const currentTraitById = new Map<string, Trait>();
  const currentTraitByName = new Map<string, Trait>();

  current.traits.forEach((t) => {
    currentTraitById.set(t.id, t);
    currentTraitByName.set(t.name.trim(), t);
  });

  const mergedTraits: Trait[] = current.traits.map((t) => ({ ...t }));
  let addedTraitsCount = 0;
  let updatedTraitsCount = 0;
  let skippedTraitsCount = 0;

  rawTraits.forEach((rawT) => {
    if (!rawT || typeof rawT.name !== 'string' || !rawT.name.trim()) return;

    const trimmedName = rawT.name.trim();
    const existingTraitByName = currentTraitByName.get(trimmedName);
    const existingTraitById = rawT.id ? currentTraitById.get(rawT.id) : undefined;
    const existingTrait = existingTraitByName || existingTraitById;

    if (existingTrait) {
      // Map incoming trait ID to the existing trait ID
      if (rawT.id) {
        traitIdMap.set(rawT.id, existingTrait.id);
      }

      if (options.duplicateStrategy === 'update') {
        const targetIndex = mergedTraits.findIndex((t) => t.id === existingTrait.id);
        if (targetIndex !== -1) {
          mergedTraits[targetIndex] = {
            ...mergedTraits[targetIndex],
            axis: rawT.axis ? rawT.axis.trim() : mergedTraits[targetIndex].axis,
            description: typeof rawT.description === 'string' ? rawT.description : mergedTraits[targetIndex].description,
            baseWeight: typeof rawT.baseWeight === 'number' && !isNaN(rawT.baseWeight) ? rawT.baseWeight : mergedTraits[targetIndex].baseWeight,
          };
          updatedTraitsCount++;
        }
      } else {
        skippedTraitsCount++;
      }
    } else {
      // New trait
      // Ensure unique ID
      let newId = rawT.id && typeof rawT.id === 'string' && rawT.id.trim() ? rawT.id.trim() : '';
      if (!newId || currentTraitById.has(newId)) {
        newId = `trait-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      }

      if (rawT.id) {
        traitIdMap.set(rawT.id, newId);
      }

      const defaultAxisName = mergedAxes[0]?.name || '其他';
      const traitAxis = rawT.axis && typeof rawT.axis === 'string' && rawT.axis.trim() ? rawT.axis.trim() : defaultAxisName;

      const newTrait: Trait = {
        id: newId,
        name: trimmedName,
        axis: traitAxis,
        description: typeof rawT.description === 'string' ? rawT.description : '',
        baseWeight: typeof rawT.baseWeight === 'number' && !isNaN(rawT.baseWeight) ? rawT.baseWeight : 10,
      };

      mergedTraits.push(newTrait);
      currentTraitById.set(newId, newTrait);
      currentTraitByName.set(trimmedName, newTrait);
      addedTraitsCount++;
    }
  });

  // 3. Merge Rules if requested
  const validTraitIds = new Set(mergedTraits.map((t) => t.id));
  const getPairKey = (a: string, b: string) => (a < b ? `${a}___${b}` : `${b}___${a}`);

  let addedCoRulesCount = 0;
  let updatedCoRulesCount = 0;
  let addedSoftRulesCount = 0;
  let updatedSoftRulesCount = 0;
  let addedHardRulesCount = 0;
  let updatedHardRulesCount = 0;

  let mergedCoRules: CooccurrenceRule[] = [...current.cooccurrenceRules];
  let mergedSoftRules: SoftExclusionRule[] = [...current.softExclusions];
  let mergedHardRules: HardExclusionRule[] = [...current.hardExclusions];

  if (options.mergeRules) {
    // Cooccurrence
    const coMap = new Map<string, CooccurrenceRule>();
    current.cooccurrenceRules.forEach((r) => coMap.set(getPairKey(r.traitAId, r.traitBId), { ...r }));

    rawCo.forEach((rule) => {
      if (!rule || !rule.traitAId || !rule.traitBId) return;
      const mappedA = traitIdMap.get(rule.traitAId) || rule.traitAId;
      const mappedB = traitIdMap.get(rule.traitBId) || rule.traitBId;

      if (mappedA === mappedB || !validTraitIds.has(mappedA) || !validTraitIds.has(mappedB)) return;

      const key = getPairKey(mappedA, mappedB);
      if (coMap.has(key)) {
        if (options.duplicateStrategy === 'update') {
          const existing = coMap.get(key)!;
          existing.weight = typeof rule.weight === 'number' ? rule.weight : existing.weight;
          if (rule.intensityModifiers) {
            existing.intensityModifiers = {
              ...existing.intensityModifiers,
              ...rule.intensityModifiers,
            };
          }
          updatedCoRulesCount++;
        }
      } else {
        const newRule: CooccurrenceRule = {
          id: `co-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          traitAId: mappedA,
          traitBId: mappedB,
          weight: typeof rule.weight === 'number' ? rule.weight : 5,
          intensityModifiers: rule.intensityModifiers,
        };
        coMap.set(key, newRule);
        addedCoRulesCount++;
      }
    });
    mergedCoRules = Array.from(coMap.values());

    // Soft Exclusions
    const softMap = new Map<string, SoftExclusionRule>();
    current.softExclusions.forEach((r) => softMap.set(getPairKey(r.traitAId, r.traitBId), { ...r }));

    rawSoft.forEach((rule) => {
      if (!rule || !rule.traitAId || !rule.traitBId) return;
      const mappedA = traitIdMap.get(rule.traitAId) || rule.traitAId;
      const mappedB = traitIdMap.get(rule.traitBId) || rule.traitBId;

      if (mappedA === mappedB || !validTraitIds.has(mappedA) || !validTraitIds.has(mappedB)) return;

      const key = getPairKey(mappedA, mappedB);
      const penalty = Math.round(Number(rule.penaltyMultiplier !== undefined ? rule.penaltyMultiplier : 0.1) * 100) / 100;
      const note = typeof rule.note === 'string' ? rule.note.trim() : '';

      if (softMap.has(key)) {
        if (options.duplicateStrategy === 'update') {
          const existing = softMap.get(key)!;
          existing.penaltyMultiplier = penalty;
          if (note) existing.note = note;
          updatedSoftRulesCount++;
        }
      } else {
        const newRule: SoftExclusionRule = {
          id: `soft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          traitAId: mappedA,
          traitBId: mappedB,
          penaltyMultiplier: penalty,
          note: note || '弱相容情境說明',
        };
        softMap.set(key, newRule);
        addedSoftRulesCount++;
      }
    });
    mergedSoftRules = Array.from(softMap.values());

    // Hard Exclusions
    const hardMap = new Map<string, HardExclusionRule>();
    current.hardExclusions.forEach((r) => hardMap.set(getPairKey(r.traitAId, r.traitBId), { ...r }));

    rawHard.forEach((rule) => {
      if (!rule || !rule.traitAId || !rule.traitBId) return;
      const mappedA = traitIdMap.get(rule.traitAId) || rule.traitAId;
      const mappedB = traitIdMap.get(rule.traitBId) || rule.traitBId;

      if (mappedA === mappedB || !validTraitIds.has(mappedA) || !validTraitIds.has(mappedB)) return;

      const key = getPairKey(mappedA, mappedB);
      const reason = typeof rule.reason === 'string' ? rule.reason.trim() : '';

      if (hardMap.has(key)) {
        if (options.duplicateStrategy === 'update') {
          const existing = hardMap.get(key)!;
          if (reason) existing.reason = reason;
          updatedHardRulesCount++;
        }
      } else {
        const newRule: HardExclusionRule = {
          id: `hard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          traitAId: mappedA,
          traitBId: mappedB,
          reason: reason || '設定邏輯互斥',
        };
        hardMap.set(key, newRule);
        addedHardRulesCount++;
      }
    });
    mergedHardRules = Array.from(hardMap.values());
  }

  const mergedDataset: Dataset = {
    version: current.version || 2,
    updatedAt: Date.now(),
    axes: mergedAxes,
    traits: mergedTraits,
    cooccurrenceRules: mergedCoRules,
    softExclusions: mergedSoftRules,
    hardExclusions: mergedHardRules,
  };

  const summary: MergeSummary = {
    addedAxesCount,
    addedTraitsCount,
    updatedTraitsCount,
    skippedTraitsCount,
    addedCoRulesCount,
    updatedCoRulesCount,
    addedSoftRulesCount,
    updatedSoftRulesCount,
    addedHardRulesCount,
    updatedHardRulesCount,
    totalTraitsAfter: mergedTraits.length,
    totalAxesAfter: mergedAxes.length,
  };

  return { mergedDataset, summary };
}
