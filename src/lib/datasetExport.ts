import { Dataset, AxisDefinition, Trait, CooccurrenceRule, SoftExclusionRule, HardExclusionRule } from '../types';

/**
 * Creates a valid partial Dataset containing only the selected traits,
 * their corresponding axes, and internal co-occurrence/exclusion rules.
 */
export function createPartialDataset(
  fullDataset: Dataset,
  selectedTraitIds: string[] | Set<string>,
  options?: { includeRules?: boolean }
): Dataset {
  const traitIdSet = selectedTraitIds instanceof Set ? selectedTraitIds : new Set(selectedTraitIds);
  const selectedTraits = fullDataset.traits.filter((t) => traitIdSet.has(t.id));

  // Determine axes involved in the selected traits
  const involvedAxisNames = new Set(selectedTraits.map((t) => t.axis.trim()));
  const selectedAxes: AxisDefinition[] = fullDataset.axes
    .filter((a) => involvedAxisNames.has(a.name.trim()))
    .map((a) => ({ ...a }));

  // Ensure every involved axis name exists in selectedAxes
  const existingAxisNames = new Set(selectedAxes.map((a) => a.name.trim()));
  involvedAxisNames.forEach((name) => {
    if (!existingAxisNames.has(name) && name) {
      selectedAxes.push({
        id: `axis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
      });
      existingAxisNames.add(name);
    }
  });

  const includeRules = options?.includeRules ?? true;

  // Rules: only include rules where BOTH traitA and traitB are among the exported traits
  const cooccurrenceRules: CooccurrenceRule[] = includeRules
    ? fullDataset.cooccurrenceRules.filter(
        (r) => traitIdSet.has(r.traitAId) && traitIdSet.has(r.traitBId)
      )
    : [];

  const softExclusions: SoftExclusionRule[] = includeRules
    ? fullDataset.softExclusions.filter(
        (s) => traitIdSet.has(s.traitAId) && traitIdSet.has(s.traitBId)
      )
    : [];

  const hardExclusions: HardExclusionRule[] = includeRules
    ? fullDataset.hardExclusions.filter(
        (h) => traitIdSet.has(h.traitAId) && traitIdSet.has(h.traitBId)
      )
    : [];

  return {
    version: fullDataset.version || 2,
    updatedAt: Date.now(),
    axes: selectedAxes,
    traits: selectedTraits,
    cooccurrenceRules,
    softExclusions,
    hardExclusions,
  };
}

/**
 * Triggers a browser download of a dataset object as a JSON file.
 */
export function downloadDatasetAsJson(dataset: Dataset, filename?: string) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute(
    'download',
    filename || `oc_traits_partial_${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Performs atomic bulk deletion of traits and cascades deletion to all rules
 * that reference any of the deleted traits.
 */
export function bulkDeleteTraits(
  fullDataset: Dataset,
  traitIdsToDelete: string[] | Set<string>
): { updatedDataset: Dataset; deletedCount: number; deletedRulesCount: number } {
  const toDeleteSet = traitIdsToDelete instanceof Set ? traitIdsToDelete : new Set(traitIdsToDelete);
  const updatedTraits = fullDataset.traits.filter((t) => !toDeleteSet.has(t.id));

  const initialRulesCount =
    fullDataset.cooccurrenceRules.length +
    fullDataset.softExclusions.length +
    fullDataset.hardExclusions.length;

  const updatedCo = fullDataset.cooccurrenceRules.filter(
    (c) => !toDeleteSet.has(c.traitAId) && !toDeleteSet.has(c.traitBId)
  );
  const updatedSoft = fullDataset.softExclusions.filter(
    (s) => !toDeleteSet.has(s.traitAId) && !toDeleteSet.has(s.traitBId)
  );
  const updatedHard = fullDataset.hardExclusions.filter(
    (h) => !toDeleteSet.has(h.traitAId) && !toDeleteSet.has(h.traitBId)
  );

  const updatedRulesCount = updatedCo.length + updatedSoft.length + updatedHard.length;
  const deletedRulesCount = initialRulesCount - updatedRulesCount;
  const deletedCount = fullDataset.traits.length - updatedTraits.length;

  const updatedDataset: Dataset = {
    ...fullDataset,
    updatedAt: Date.now(),
    traits: updatedTraits,
    cooccurrenceRules: updatedCo,
    softExclusions: updatedSoft,
    hardExclusions: updatedHard,
  };

  return { updatedDataset, deletedCount, deletedRulesCount };
}
