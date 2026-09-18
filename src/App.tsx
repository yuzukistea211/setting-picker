import React, { useState, useEffect } from 'react';
import { Dataset, ExtractionResult, IntensityLevel, Trait, ExtractedTraitItem } from './types';
import { DEFAULT_DATASET } from './data/defaultTraits';
import { loadDataset, resetToDefaultDataset, saveDataset } from './lib/storage';
import { generateOC, evaluateWeakCompatibilities } from './lib/generator';
import { Navbar } from './components/Navbar';
import { ExtractorPanel } from './components/frontend/ExtractorPanel';
import { ResultPanel } from './components/frontend/ResultPanel';
import { BackendDashboard } from './components/backend/BackendDashboard';
import { RelationshipNetworkView } from './components/network/RelationshipNetworkView';
import { StarrySpaceBackground } from './components/StarrySpaceBackground';

export default function App() {
  const [dataset, setDataset] = useState<Dataset>(DEFAULT_DATASET);
  const [currentTab, setCurrentTab] = useState<'frontend' | 'backend' | 'network'>('frontend');
  const [isLoadingDB, setIsLoadingDB] = useState<boolean>(true);

  // Frontend extraction settings
  const [selectedAxes, setSelectedAxes] = useState<string[]>([]);
  const [traitCount, setTraitCount] = useState<number>(5);
  const [pinnedTraitId, setPinnedTraitId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Results & In-page History
  const [currentResult, setCurrentResult] = useState<ExtractionResult | null>(null);
  const [history, setHistory] = useState<ExtractionResult[]>([]);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    loadDataset().then((data) => {
      setDataset(data);
      setIsLoadingDB(false);

      // Perform initial extraction so screen isn't empty
      const initial = generateOC(data, { count: 5 });
      setCurrentResult(initial);
      setHistory([initial]);
    });
  }, []);

  // Handlers for dataset operations
  const handleSaveDataset = async (updated: Dataset) => {
    setDataset(updated);
    await saveDataset(updated);
  };

  const handleImportDataset = async (imported: Dataset) => {
    await handleSaveDataset(imported);
  };

  const handleResetDataset = async () => {
    const defaultData = await resetToDefaultDataset();
    setDataset(defaultData);
    const refreshed = generateOC(defaultData, { count: traitCount, specifiedAxes: selectedAxes });
    setCurrentResult(refreshed);
  };

  // Axis selection toggles
  const handleToggleAxis = (axisName: string) => {
    setSelectedAxes((prev) =>
      prev.includes(axisName) ? prev.filter((a) => a !== axisName) : [...prev, axisName],
    );
  };

  const handleClearAxes = () => {
    setSelectedAxes([]);
  };

  const handleSelectAllAxes = () => {
    setSelectedAxes(dataset.axes.map((a) => a.name));
  };

  // Run extraction
  const handleGenerate = () => {
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
  };

  // Toggle lock state of a trait in current result
  const handleToggleLockTrait = (index: number) => {
    if (!currentResult) return;
    const updatedTraits = currentResult.traits.map((item, i) =>
      i === index ? { ...item, locked: !item.locked } : item,
    );
    const updatedResult: ExtractionResult = {
      ...currentResult,
      traits: updatedTraits,
    };
    setCurrentResult(updatedResult);
    setHistory((prev) =>
      prev.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
    );
  };

  // Remove a trait from current result
  const handleRemoveTrait = (index: number) => {
    if (!currentResult) return;
    const updatedTraits = currentResult.traits.filter((_, i) => i !== index);
    const updatedWeakCompat = evaluateWeakCompatibilities(updatedTraits, dataset);
    const updatedResult: ExtractionResult = {
      ...currentResult,
      traits: updatedTraits,
      weakCompatibilities: updatedWeakCompat,
    };
    setCurrentResult(updatedResult);
    setHistory((prev) =>
      prev.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
    );
  };

  // Add a new trait to current result
  const handleAddTrait = (trait: Trait, intensity: IntensityLevel, locked: boolean = false) => {
    if (!currentResult) return;
    if (currentResult.traits.some((t) => t.trait.id === trait.id)) {
      return;
    }
    const newItem: ExtractedTraitItem = {
      trait,
      intensity,
      axis: trait.axis,
      locked,
    };
    const updatedTraits = [...currentResult.traits, newItem];
    const updatedWeakCompat = evaluateWeakCompatibilities(updatedTraits, dataset);
    const updatedResult: ExtractionResult = {
      ...currentResult,
      traits: updatedTraits,
      weakCompatibilities: updatedWeakCompat,
    };
    setCurrentResult(updatedResult);
    setHistory((prev) =>
      prev.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
    );
  };

  // Update intensity of a specific trait in current result
  const handleUpdateTraitIntensity = (index: number, newIntensity: IntensityLevel) => {
    if (!currentResult) return;
    const updatedTraits = currentResult.traits.map((item, i) =>
      i === index ? { ...item, intensity: newIntensity } : item,
    );
    const updatedWeakCompat = evaluateWeakCompatibilities(updatedTraits, dataset);
    const updatedResult: ExtractionResult = {
      ...currentResult,
      traits: updatedTraits,
      weakCompatibilities: updatedWeakCompat,
    };
    setCurrentResult(updatedResult);
    setHistory((prev) =>
      prev.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
    );
  };

  // Update character name or notes in current result
  const handleUpdateNotes = (characterName: string, notes: string) => {
    if (!currentResult) return;
    const updatedResult: ExtractionResult = {
      ...currentResult,
      characterName,
      notes,
    };
    setCurrentResult(updatedResult);
    setHistory((prev) =>
      prev.map((h) => (h.id === updatedResult.id ? updatedResult : h)),
    );
  };

  return (
    <div className="min-h-screen bg-transparent text-black flex flex-col selection:bg-black selection:text-white relative">
      {/* White Space Starry Background */}
      <StarrySpaceBackground />

      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        dataset={dataset}
        onImportDataset={handleImportDataset}
        onResetDataset={handleResetDataset}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-6">
        {isLoadingDB ? (
          <div className="border-2 border-black p-12 text-center text-xs">
            載入心理學詞庫資料中...
          </div>
        ) : currentTab === 'frontend' ? (
          /* Frontend: 33% Left Panel + 66% Right Panel */
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <ExtractorPanel
              axes={dataset.axes}
              traits={dataset.traits}
              selectedAxes={selectedAxes}
              onToggleAxis={handleToggleAxis}
              onClearAxes={handleClearAxes}
              onSelectAllAxes={handleSelectAllAxes}
              traitCount={traitCount}
              onChangeTraitCount={setTraitCount}
              pinnedTraitId={pinnedTraitId}
              onSelectPinnedTrait={setPinnedTraitId}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              lockedCount={currentResult?.traits.filter((t) => t.locked).length || 0}
            />

            <ResultPanel
              currentResult={currentResult}
              history={history}
              dataset={dataset}
              onSelectHistoryItem={setCurrentResult}
              onClearHistory={() => setHistory([])}
              onUpdateTraitIntensity={handleUpdateTraitIntensity}
              onUpdateNotes={handleUpdateNotes}
              onToggleLockTrait={handleToggleLockTrait}
              onRemoveTrait={handleRemoveTrait}
              onAddTrait={handleAddTrait}
            />
          </div>
        ) : currentTab === 'backend' ? (
          /* Backend: Comprehensive Dashboard */
          <BackendDashboard dataset={dataset} onSaveDataset={handleSaveDataset} />
        ) : (
          /* Network: Character Relationship Network */
          <RelationshipNetworkView />
        )}
      </main>
    </div>
  );
}
