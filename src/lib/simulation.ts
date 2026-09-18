import { Dataset, IntensityLevel, SimulationResult } from '../types';

const INTENSITY_NAMES: IntensityLevel[] = ['隱藏', '輕微', '中等', '強烈', '極端'];

export function runBatchSimulation(
  dataset: Dataset,
  runs: number = 500,
  traitCount: number = 5,
  specifiedAxes: string[] = [],
): SimulationResult {
  const startTime = performance.now();
  const traits = dataset.traits;
  const N = traits.length;

  if (N === 0) {
    return {
      totalRuns: runs,
      traitStats: [],
      weakCompatibilityOccurrences: 0,
      runTimeMs: 0,
    };
  }

  // 1. Fast Indexing: trait ID to integer index
  const idToIndex = new Map<string, number>();
  const baseWeights = new Float64Array(N);
  const traitAxes: string[] = new Array(N);

  for (let i = 0; i < N; i++) {
    const t = traits[i];
    idToIndex.set(t.id, i);
    baseWeights[i] = t.baseWeight || 10;
    traitAxes[i] = t.axis;
  }

  // 2. Pre-build lookup matrices (Flat typed arrays for zero GC and instant O(1) lookup)
  const NN = N * N;
  const hardExclusionMatrix = new Uint8Array(NN);
  for (const h of dataset.hardExclusions) {
    const idxA = idToIndex.get(h.traitAId);
    const idxB = idToIndex.get(h.traitBId);
    if (idxA !== undefined && idxB !== undefined) {
      hardExclusionMatrix[idxA * N + idxB] = 1;
      hardExclusionMatrix[idxB * N + idxA] = 1;
    }
  }

  const softPenaltyMatrix = new Float64Array(NN);
  softPenaltyMatrix.fill(1.0);
  const softRuleExistsMatrix = new Uint8Array(NN);
  for (const s of dataset.softExclusions) {
    const idxA = idToIndex.get(s.traitAId);
    const idxB = idToIndex.get(s.traitBId);
    if (idxA !== undefined && idxB !== undefined) {
      softPenaltyMatrix[idxA * N + idxB] = s.penaltyMultiplier;
      softPenaltyMatrix[idxB * N + idxA] = s.penaltyMultiplier;
      softRuleExistsMatrix[idxA * N + idxB] = 1;
      softRuleExistsMatrix[idxB * N + idxA] = 1;
    }
  }

  const coocBaseMatrix = new Float64Array(NN);
  // Modifiers: 5 entries per pair (for intensities 0..4: 隱藏, 輕微, 中等, 強烈, 極端)
  const coocModifiers = new Float64Array(NN * 5);
  for (const c of dataset.cooccurrenceRules) {
    const idxA = idToIndex.get(c.traitAId);
    const idxB = idToIndex.get(c.traitBId);
    if (idxA !== undefined && idxB !== undefined) {
      coocBaseMatrix[idxA * N + idxB] = c.weight;
      coocBaseMatrix[idxB * N + idxA] = c.weight;

      if (c.intensityModifiers) {
        for (let lvlIdx = 0; lvlIdx < 5; lvlIdx++) {
          const lvlName = INTENSITY_NAMES[lvlIdx];
          const mod = c.intensityModifiers[lvlName];
          if (mod !== undefined) {
            coocModifiers[(idxA * N + idxB) * 5 + lvlIdx] = mod;
            coocModifiers[(idxB * N + idxA) * 5 + lvlIdx] = mod;
          }
        }
      }
    }
  }

  // 3. In-place accumulators (Direct counting, zero temporary objects)
  const traitCounts = new Int32Array(N);
  const intensityCounts = new Int32Array(N * 5);
  let totalWeakCompatibilities = 0;

  // Reusable working buffers per run
  const targetK = Math.min(traitCount, N);
  const selectedIndices = new Int32Array(targetK);
  const selectedIntensities = new Uint8Array(targetK);
  const selectedMask = new Uint8Array(N);
  const candidateWeights = new Float64Array(N);
  const candidateIndices = new Int32Array(N);

  const hasSpecifiedAxes = specifiedAxes.length > 0;

  // 4. Batch Simulation loop: Zero object allocation per iteration
  for (let r = 0; r < runs; r++) {
    let selectedCount = 0;
    const satisfiedAxesMask: Set<string> | null = hasSpecifiedAxes ? new Set<string>() : null;

    while (selectedCount < targetK) {
      let candidatePoolCount = 0;

      // Filter non-hard-excluded candidates
      for (let c = 0; c < N; c++) {
        if (selectedMask[c] === 1) continue;

        let hardBlocked = false;
        for (let s = 0; s < selectedCount; s++) {
          if (hardExclusionMatrix[c * N + selectedIndices[s]] === 1) {
            hardBlocked = true;
            break;
          }
        }
        if (!hardBlocked) {
          candidateIndices[candidatePoolCount++] = c;
        }
      }

      if (candidatePoolCount === 0) break;

      // Check unfulfilled specified axes if requested
      const poolStart = 0;
      let poolEnd = candidatePoolCount;

      if (hasSpecifiedAxes && satisfiedAxesMask) {
        let unfulfilledCount = 0;
        for (let sa = 0; sa < specifiedAxes.length; sa++) {
          if (!satisfiedAxesMask.has(specifiedAxes[sa])) {
            unfulfilledCount++;
          }
        }

        if (unfulfilledCount > 0) {
          let unfulfilledCandidateCount = 0;
          for (let i = 0; i < candidatePoolCount; i++) {
            const candIdx = candidateIndices[i];
            const axis = traitAxes[candIdx];
            if (specifiedAxes.includes(axis) && !satisfiedAxesMask.has(axis)) {
              candidateIndices[unfulfilledCandidateCount++] = candIdx;
            }
          }
          if (unfulfilledCandidateCount > 0) {
            poolEnd = unfulfilledCandidateCount;
          }
        }
      }

      // Compute dynamic weights for candidates in the pool
      let totalWeight = 0;
      for (let i = poolStart; i < poolEnd; i++) {
        const c = candidateIndices[i];
        let weight = baseWeights[c];

        if (hasSpecifiedAxes && satisfiedAxesMask) {
          const axis = traitAxes[c];
          if (specifiedAxes.includes(axis) && !satisfiedAxesMask.has(axis)) {
            weight += 20;
          }
        }

        let softMultiplier = 1.0;
        for (let s = 0; s < selectedCount; s++) {
          const selIdx = selectedIndices[s];
          const selInt = selectedIntensities[s];
          const pair = c * N + selIdx;

          const cooc = coocBaseMatrix[pair] + coocModifiers[pair * 5 + selInt];
          weight += cooc * 1.5;
          softMultiplier *= softPenaltyMatrix[pair];
        }

        weight *= softMultiplier;
        if (weight < 0.05) weight = 0.05;

        candidateWeights[i] = weight;
        totalWeight += weight;
      }

      // Weighted random selection
      let rand = Math.random() * totalWeight;
      let chosenIdx = candidateIndices[poolStart];

      for (let i = poolStart; i < poolEnd; i++) {
        rand -= candidateWeights[i];
        if (rand <= 0) {
          chosenIdx = candidateIndices[i];
          break;
        }
      }

      // Discrete Gaussian intensity sampling:
      // 隱藏 6%, 輕微 24%, 中等 40%, 強烈 24%, 極端 6%
      const rInt = Math.random();
      let sampledIntensityIdx = 2; // 中等
      if (rInt <= 0.06) sampledIntensityIdx = 0; // 隱藏
      else if (rInt <= 0.30) sampledIntensityIdx = 1; // 輕微
      else if (rInt <= 0.70) sampledIntensityIdx = 2; // 中等
      else if (rInt <= 0.94) sampledIntensityIdx = 3; // 強烈
      else sampledIntensityIdx = 4; // 極端

      selectedIndices[selectedCount] = chosenIdx;
      selectedIntensities[selectedCount] = sampledIntensityIdx;
      selectedMask[chosenIdx] = 1;
      if (satisfiedAxesMask) {
        satisfiedAxesMask.add(traitAxes[chosenIdx]);
      }
      selectedCount++;
    }

    // Evaluate weak compatibilities in-place
    for (let a = 0; a < selectedCount; a++) {
      const idxA = selectedIndices[a];
      const intA = selectedIntensities[a];
      for (let b = a + 1; b < selectedCount; b++) {
        const idxB = selectedIndices[b];
        const pair = idxA * N + idxB;

        if (softRuleExistsMatrix[pair] === 1) {
          totalWeakCompatibilities++;
        } else {
          const cooc = coocBaseMatrix[pair] + coocModifiers[pair * 5 + intA];
          if (cooc <= -4) {
            totalWeakCompatibilities++;
          }
        }
      }
    }

    // Direct in-place accumulation & mask cleanup
    for (let s = 0; s < selectedCount; s++) {
      const idx = selectedIndices[s];
      const intIdx = selectedIntensities[s];
      traitCounts[idx]++;
      intensityCounts[idx * 5 + intIdx]++;
      selectedMask[idx] = 0;
    }
  }

  // 5. Build final result once at the end
  const traitStats = traits.map((trait, idx) => {
    const count = traitCounts[idx];
    const rate = Number(((count / runs) * 100).toFixed(1));
    return {
      traitId: trait.id,
      traitName: trait.name,
      axis: trait.axis,
      count,
      rate,
      intensityCounts: {
        隱藏: intensityCounts[idx * 5 + 0],
        輕微: intensityCounts[idx * 5 + 1],
        中等: intensityCounts[idx * 5 + 2],
        強烈: intensityCounts[idx * 5 + 3],
        極端: intensityCounts[idx * 5 + 4],
      },
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

