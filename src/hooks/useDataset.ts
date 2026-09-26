import { useState, useEffect, useCallback } from 'react';
import { Dataset } from '../types';
import { DEFAULT_DATASET } from '../data/defaultTraits';
import { loadDataset, resetToDefaultDataset, saveDataset as persistDataset } from '../lib/storage';
import { executeMerge, MergeOptions, MergeSummary } from '../lib/datasetMerge';

export function useDataset() {
  const [dataset, setDataset] = useState<Dataset>(DEFAULT_DATASET);
  const [isLoadingDB, setIsLoadingDB] = useState<boolean>(true);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    loadDataset().then((data) => {
      if (isMounted) {
        setDataset(data);
        setIsLoadingDB(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveDataset = useCallback(async (updated: Dataset) => {
    setDataset(updated);
    await persistDataset(updated);
  }, []);

  const handleImportDataset = useCallback(async (imported: Dataset) => {
    await handleSaveDataset(imported);
  }, [handleSaveDataset]);

  const handleMergeDataset = useCallback(
    async (
      incomingRaw: unknown,
      options: MergeOptions = { duplicateStrategy: 'update', mergeRules: true }
    ): Promise<MergeSummary> => {
      const { mergedDataset, summary } = executeMerge(dataset, incomingRaw, options);
      await handleSaveDataset(mergedDataset);
      return summary;
    },
    [dataset, handleSaveDataset]
  );

  const handleResetDataset = useCallback(async () => {
    const defaultData = await resetToDefaultDataset();
    setDataset(defaultData);
    return defaultData;
  }, []);

  return {
    dataset,
    setDataset,
    isLoadingDB,
    saveDataset: handleSaveDataset,
    importDataset: handleImportDataset,
    mergeDataset: handleMergeDataset,
    resetDataset: handleResetDataset,
  };
}
