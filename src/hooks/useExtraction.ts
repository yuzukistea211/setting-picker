import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dataset, ExtractionResult, IntensityLevel, Trait, ExtractedTraitItem } from '../types';
import { generateOC, evaluateWeakCompatibilities } from '../lib/generator';

export function useExtraction(dataset: Dataset, isLoadingDB: boolean) {
  // Frontend extraction settings
  const [selectedAxes, setSelectedAxes] = useState<string[]>([]);
  const [traitCount, setTraitCount] = useState<number>(5);
  const [pinnedTraitId, setPinnedTraitId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Results & Session History
  const [currentResult, setCurrentResult] = useState<ExtractionResult | null>(null);
  const [history, setHistory] = useState<ExtractionResult[]>([]);

  // Perform initial extraction once dataset is loaded
  const [hasInitialized, setHasInitialized] = useState<boolean>(false);
  useEffect(() => {
    if (!isLoadingDB && !hasInitialized && dataset.traits.length > 0) {
      const initial = generateOC(dataset, { count: 5 });
      setCurrentResult(initial);
      setHistory([initial]);
      setHasInitialized(true);
    }
  }, [isLoadingDB, hasInitialized, dataset]);

  // Axis selection toggles
  const handleToggleAxis = useCallback((axisName: string) => {
    setSelectedAxes((prev) =>
      prev.includes(axisName) ? prev.filter((a) => a !== axisName) : [...prev, axisName],
    );
  }, []);

  const handleClearAxes = useCallback(() => {
    setSelectedAxes([]);
  }, []);

  const handleSelectAllAxes = useCallback(() => {
    setSelectedAxes(dataset.axes.map((a) => a.name));
  }, [dataset.axes]);

  // Run extraction with current parameters
  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const lockedTraits = currentResult?.traits.filter((t) => t.locked) || [];
        const result = generateOC(dataset, {
          count: Math.max(traitCount, lockedTraits.length),
          specifiedAxes: selectedAxes,
          pinnedTraitIds: pinnedTraitId ? [pinnedTraitId] : [],
          lockedTraits,
        });

        // Preserve characterName & notes if already typed in current session
        if (currentResult?.characterName) {
          result.characterName = currentResult.characterName;
        }
        if (currentResult?.notes) {
          result.notes = currentResult.notes;
        }

        setCurrentResult(result);
        setHistory((prev) => [result, ...prev.slice(0, 19)]);
      } finally {
        setIsGenerating(false);
      }
    }, 150);
  }, [dataset, traitCount, selectedAxes, pinnedTraitId, currentResult]);

  // Toggle lock state of a trait in current result
  const handleToggleLockTrait = useCallback((index: number) => {
    setCurrentResult((prev) => {
      if (!prev) return null;
      const updatedTraits = prev.traits.map((item, i) =>
        i === index ? { ...item, locked: !item.locked } : item,
      );
      const updatedResult: ExtractionResult = {
        ...prev,
        traits: updatedTraits,
      };
      setHistory((hist) =>
        hist.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
      );
      return updatedResult;
    });
  }, []);

  // Remove a trait from current result
  const handleRemoveTrait = useCallback((index: number) => {
    setCurrentResult((prev) => {
      if (!prev) return null;
      const updatedTraits = prev.traits.filter((_, i) => i !== index);
      const updatedWeakCompat = evaluateWeakCompatibilities(updatedTraits, dataset);
      const updatedResult: ExtractionResult = {
        ...prev,
        traits: updatedTraits,
        weakCompatibilities: updatedWeakCompat,
      };
      setHistory((hist) =>
        hist.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
      );
      return updatedResult;
    });
  }, [dataset]);

  // Add a new trait to current result
  const handleAddTrait = useCallback((trait: Trait, intensity: IntensityLevel, locked: boolean = false) => {
    setCurrentResult((prev) => {
      if (!prev) return null;
      if (prev.traits.some((t) => t.trait.id === trait.id)) {
        return prev;
      }
      const newItem: ExtractedTraitItem = {
        trait,
        intensity,
        axis: trait.axis,
        locked,
      };
      const updatedTraits = [...prev.traits, newItem];
      const updatedWeakCompat = evaluateWeakCompatibilities(updatedTraits, dataset);
      const updatedResult: ExtractionResult = {
        ...prev,
        traits: updatedTraits,
        weakCompatibilities: updatedWeakCompat,
      };
      setHistory((hist) =>
        hist.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
      );
      return updatedResult;
    });
  }, [dataset]);

  // Update intensity of a specific trait in current result
  const handleUpdateTraitIntensity = useCallback((index: number, newIntensity: IntensityLevel) => {
    setCurrentResult((prev) => {
      if (!prev) return null;
      const updatedTraits = prev.traits.map((item, i) =>
        i === index ? { ...item, intensity: newIntensity } : item,
      );
      const updatedWeakCompat = evaluateWeakCompatibilities(updatedTraits, dataset);
      const updatedResult: ExtractionResult = {
        ...prev,
        traits: updatedTraits,
        weakCompatibilities: updatedWeakCompat,
      };
      setHistory((hist) =>
        hist.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
      );
      return updatedResult;
    });
  }, [dataset]);

  // Update character name or notes in current result
  const handleUpdateNotes = useCallback((characterName: string, notes: string) => {
    setCurrentResult((prev) => {
      if (!prev) return null;
      const updatedResult: ExtractionResult = {
        ...prev,
        characterName,
        notes,
      };
      setHistory((hist) =>
        hist.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
      );
      return updatedResult;
    });
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const lockedCount = useMemo(() => {
    return currentResult?.traits.filter((t) => t.locked).length || 0;
  }, [currentResult]);

  return {
    selectedAxes,
    traitCount,
    pinnedTraitId,
    isGenerating,
    currentResult,
    history,
    lockedCount,
    setTraitCount,
    setPinnedTraitId,
    setCurrentResult,
    onToggleAxis: handleToggleAxis,
    onClearAxes: handleClearAxes,
    onSelectAllAxes: handleSelectAllAxes,
    onGenerate: handleGenerate,
    onToggleLockTrait: handleToggleLockTrait,
    onRemoveTrait: handleRemoveTrait,
    onAddTrait: handleAddTrait,
    onUpdateTraitIntensity: handleUpdateTraitIntensity,
    onUpdateNotes: handleUpdateNotes,
    onSelectHistoryItem: setCurrentResult,
    onClearHistory: handleClearHistory,
  };
}
