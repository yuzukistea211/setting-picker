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

  // Pre-allocated reusable arrays to eliminate object allocation & GC churn across thousands of simulation runs
  const selectedTraits: Trait[] = [];
  const selectedIntensities: IntensityLevel[] = [];
  const candidatePool: Trait[] = [];
  const candidateWeights: number[] = [];

  for (let r = 0; r < runs; r++) {
    selectedTraits.length = 0;
    selectedIntensities.length = 0;

    const satisfiedAxesSet = new Set<string>();

    while (selectedTraits.length < traitCount) {
      candidatePool.length = 0;
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
        // Check if already selected
        let alreadySelected = false;
        for (let s = 0; s < selectedTraits.length; s++) {
          if (selectedTraits[s].id === candidate.id) {
            alreadySelected = true;
            break;
          }
        }
        if (alreadySelected) continue;

        // Check hard exclusions with all currently selected traits in O(1) time
        let hardExcluded = false;
        for (let s = 0; s < selectedTraits.length; s++) {
          if (index.hardMap.has(`${candidate.id}:${selectedTraits[s].id}`)) {
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
        for (let s = 0; s < selectedTraits.length; s++) {
          const selTrait = selectedTraits[s];
          const selIntensity = selectedIntensities[s];

          // Co-occurrence
          const coocRule = index.coocMap.get(`${selTrait.id}:${candidate.id}`);
          if (coocRule) {
            let coocWeight = coocRule.weight;
            if (selIntensity && coocRule.intensityModifiers && coocRule.intensityModifiers[selIntensity]) {
              coocWeight += coocRule.intensityModifiers[selIntensity]!;
            }
            weight += coocWeight * 1.5;
          }

          // Soft exclusion
          const softRule = index.softMap.get(`${selTrait.id}:${candidate.id}`);
          if (softRule) {
            softPenaltyMultiplier *= softRule.penaltyMultiplier;
          }
        }

        weight *= softPenaltyMultiplier;
        weight = Math.max(0.05, weight);

        candidatePool.push(candidate);
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

      for (let w = 0; w < candidateWeights.length; w++) {
        rand -= candidateWeights[w];
        if (rand <= 0) {
          chosenCandidate = candidatePool[w];
          break;
        }
      }

      const intensity = sampleIntensity();
      selectedTraits.push(chosenCandidate);
      selectedIntensities.push(intensity);
      satisfiedAxesSet.add(chosenCandidate.axis);
    }

    // Step 3: Count weak compatibilities pairwise without creating description objects
    const numSelected = selectedTraits.length;
    for (let i = 0; i < numSelected; i++) {
      const traitA = selectedTraits[i];
      const intensityA = selectedIntensities[i];

      countMap[traitA.id]++;
      intensityMap[traitA.id][intensityA]++;

      for (let j = i + 1; j < numSelected; j++) {
        const traitB = selectedTraits[j];

        // Soft exclusion
        if (index.softMap.has(`${traitA.id}:${traitB.id}`)) {
          totalWeakCompatibilities++;
          continue;
        }

        // Negative co-occurrence <= -4
        const coocRule = index.coocMap.get(`${traitA.id}:${traitB.id}`);
        if (coocRule) {
          let coocWeight = coocRule.weight;
          if (intensityA && coocRule.intensityModifiers && coocRule.intensityModifiers[intensityA]) {
            coocWeight += coocRule.intensityModifiers[intensityA]!;
          }
          if (coocWeight <= -4) {
            totalWeakCompatibilities++;
          }
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

