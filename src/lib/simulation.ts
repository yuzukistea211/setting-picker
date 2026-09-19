import { Dataset, IntensityLevel, SimulationResult, Trait } from '../types';
import { getDatasetIndex, sampleIntensity } from './generator';

export function runBatchSimulation(
  dataset: Dataset,
  runs: number = 500,
  traitCount: number = 5,
  specifiedAxes: string[] = [],
): SimulationResult {
  const startTime = performance.now();
  const index = getDatasetIndex(dataset);
  const traits = dataset.traits;
  const numTraits = traits.length;

  const countMap: Record<string, number> = {};
  const intensityMap: Record<string, Record<IntensityLevel, number>> = {};
  let totalWeakCompatibilities = 0;

  for (let i = 0; i < numTraits; i++) {
    const tid = traits[i].id;
    countMap[tid] = 0;
    intensityMap[tid] = {
      隱藏: 0,
      輕微: 0,
      中等: 0,
      強烈: 0,
      極端: 0,
    };
  }

  // Pre-allocated reusable arrays & set to eliminate object allocation & GC churn across thousands of simulation runs
  const selectedTraits: Trait[] = [];
  const selectedTraitIndices: number[] = [];
  const selectedIntensities: IntensityLevel[] = [];
  const candidatePool: Trait[] = [];
  const candidateIndices: number[] = [];
  const candidateWeights: number[] = [];
  const satisfiedAxesSet = new Set<string>();

  const hardMatrix = index.hardMatrix;
  const softMultiplierMatrix = index.softMultiplierMatrix;
  const coocWeightMatrix = index.coocWeightMatrix;
  const coocModifiersMatrix = index.coocModifiersMatrix;

  for (let r = 0; r < runs; r++) {
    selectedTraits.length = 0;
    selectedTraitIndices.length = 0;
    selectedIntensities.length = 0;
    satisfiedAxesSet.clear();

    while (selectedTraits.length < traitCount) {
      candidatePool.length = 0;
      candidateIndices.length = 0;
      candidateWeights.length = 0;

      // Check if there are specified axes not yet satisfied
      let hasUnfulfilledAxis = false;
      if (specifiedAxes.length > 0) {
        for (let a = 0; a < specifiedAxes.length; a++) {
          if (!satisfiedAxesSet.has(specifiedAxes[a])) {
            hasUnfulfilledAxis = true;
            break;
          }
        }
      }

      // Step 1: Collect non-hard-excluded, unselected candidates
      for (let t = 0; t < numTraits; t++) {
        const candidate = traits[t];

        // Check if already selected (linear scan on max 7 items is faster than Set hashing)
        let alreadySelected = false;
        for (let s = 0; s < selectedTraitIndices.length; s++) {
          if (selectedTraitIndices[s] === t) {
            alreadySelected = true;
            break;
          }
        }
        if (alreadySelected) continue;

        // Check hard exclusions via flat typed array (zero string allocation, O(1) direct memory offset)
        let hardExcluded = false;
        const rowOffset = t * numTraits;
        for (let s = 0; s < selectedTraitIndices.length; s++) {
          if (hardMatrix[rowOffset + selectedTraitIndices[s]] === 1) {
            hardExcluded = true;
            break;
          }
        }
        if (hardExcluded) continue;

        // Candidate is valid
        let weight = candidate.baseWeight || 10;

        // Axis specification boost
        if (hasUnfulfilledAxis && specifiedAxes.includes(candidate.axis) && !satisfiedAxesSet.has(candidate.axis)) {
          weight += 20;
        }

        // Apply co-occurrence weights & soft exclusion penalties
        let softPenaltyMultiplier = 1;
        for (let s = 0; s < selectedTraitIndices.length; s++) {
          const selIdx = selectedTraitIndices[s];
          const selIntensity = selectedIntensities[s];
          const matrixOffset = selIdx * numTraits + t;

          // Co-occurrence from Int8Array
          let coocWeight = coocWeightMatrix[matrixOffset];
          const mods = coocModifiersMatrix[matrixOffset];
          if (mods && selIntensity && mods[selIntensity]) {
            coocWeight += mods[selIntensity]!;
          }
          if (coocWeight !== 0) {
            weight += coocWeight * 1.5;
          }

          // Soft exclusion from Float32Array
          const softMult = softMultiplierMatrix[matrixOffset];
          if (softMult !== 1.0) {
            softPenaltyMultiplier *= softMult;
          }
        }

        weight *= softPenaltyMultiplier;
        weight = Math.max(0.05, weight);

        candidatePool.push(candidate);
        candidateIndices.push(t);
        candidateWeights.push(weight);
      }

      if (candidatePool.length === 0) break;

      // Step 2: Weighted random pick
      let totalWeight = 0;
      for (let w = 0; w < candidateWeights.length; w++) {
        totalWeight += candidateWeights[w];
      }

      let rand = Math.random() * totalWeight;
      let chosenCandidate = candidatePool[0];
      let chosenIndex = candidateIndices[0];

      for (let w = 0; w < candidateWeights.length; w++) {
        rand -= candidateWeights[w];
        if (rand <= 0) {
          chosenCandidate = candidatePool[w];
          chosenIndex = candidateIndices[w];
          break;
        }
      }

      const intensity = sampleIntensity();
      selectedTraits.push(chosenCandidate);
      selectedTraitIndices.push(chosenIndex);
      selectedIntensities.push(intensity);
      satisfiedAxesSet.add(chosenCandidate.axis);
    }

    // Step 3: Count weak compatibilities pairwise without any string or object allocations
    const numSelected = selectedTraits.length;
    for (let i = 0; i < numSelected; i++) {
      const idxA = selectedTraitIndices[i];
      const traitA = selectedTraits[i];
      const intensityA = selectedIntensities[i];
      const rowOffset = idxA * numTraits;

      countMap[traitA.id]++;
      intensityMap[traitA.id][intensityA]++;

      for (let j = i + 1; j < numSelected; j++) {
        const idxB = selectedTraitIndices[j];
        const matrixOffset = rowOffset + idxB;

        // Soft exclusion (< 1.0 penalty multiplier means soft exclusion exists)
        if (softMultiplierMatrix[matrixOffset] < 1.0) {
          totalWeakCompatibilities++;
          continue;
        }

        // Negative co-occurrence <= -4
        let coocWeight = coocWeightMatrix[matrixOffset];
        const mods = coocModifiersMatrix[matrixOffset];
        if (mods && intensityA && mods[intensityA]) {
          coocWeight += mods[intensityA]!;
        }
        if (coocWeight <= -4) {
          totalWeakCompatibilities++;
        }
      }
    }
  }

  const traitStats = traits.map((trait) => {
    const count = countMap[trait.id] || 0;
    const rate = Number(((count / runs) * 100).toFixed(1));
    return {
      traitId: trait.id,
      traitName: trait.name,
      axis: trait.axis,
      count,
      rate,
      intensityCounts: intensityMap[trait.id],
    };
  });

  traitStats.sort((a, b) => b.rate - a.rate);

  const endTime = performance.now();

  return {
    totalRuns: runs,
    traitStats,
    weakCompatibilityOccurrences: totalWeakCompatibilities,
    runTimeMs: Math.round(endTime - startTime),
  };
}

