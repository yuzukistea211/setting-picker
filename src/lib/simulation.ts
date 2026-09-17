import { Dataset, IntensityLevel, SimulationResult } from '../types';
import { generateOC } from './generator';

export function runBatchSimulation(
  dataset: Dataset,
  runs: number = 500,
  traitCount: number = 5,
  specifiedAxes: string[] = [],
): SimulationResult {
  const startTime = performance.now();

  const countMap: Record<string, number> = {};
  const intensityMap: Record<string, Record<IntensityLevel, number>> = {};
  let totalWeakCompatibilities = 0;

  for (const trait of dataset.traits) {
    countMap[trait.id] = 0;
    intensityMap[trait.id] = {
      隱藏: 0,
      輕微: 0,
      中等: 0,
      強烈: 0,
      極端: 0,
    };
  }

  for (let i = 0; i < runs; i++) {
    const res = generateOC(dataset, {
      count: traitCount,
      specifiedAxes,
    });

    totalWeakCompatibilities += res.weakCompatibilities.length;

    for (const item of res.traits) {
      if (countMap[item.trait.id] !== undefined) {
        countMap[item.trait.id]++;
        intensityMap[item.trait.id][item.intensity]++;
      }
    }
  }

  const traitStats = dataset.traits.map((trait) => {
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

  // Sort by rate descending
  traitStats.sort((a, b) => b.rate - a.rate);

  const endTime = performance.now();

  return {
    totalRuns: runs,
    traitStats,
    weakCompatibilityOccurrences: totalWeakCompatibilities,
    runTimeMs: Math.round(endTime - startTime),
  };
}
