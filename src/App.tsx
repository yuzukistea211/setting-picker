import React, { useState } from 'react';
import { useDataset } from './hooks/useDataset';
import { useExtraction } from './hooks/useExtraction';
import { generateOC } from './lib/generator';
import { Navbar } from './components/Navbar';
import { ExtractorPanel } from './components/frontend/ExtractorPanel';
import { ResultPanel } from './components/frontend/ResultPanel';
import { BackendDashboard } from './components/backend/BackendDashboard';
import { RelationshipNetworkPage } from './components/network/RelationshipNetworkPage';
import { StarrySpaceBackground } from './components/StarrySpaceBackground';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'frontend' | 'backend' | 'network'>('frontend');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('oc_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('oc_dark_mode', String(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  const { dataset, isLoadingDB, saveDataset, importDataset, resetDataset } = useDataset();

  const {
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
    onToggleAxis,
    onClearAxes,
    onSelectAllAxes,
    onGenerate,
    onToggleLockTrait,
    onRemoveTrait,
    onAddTrait,
    onUpdateTraitIntensity,
    onUpdateNotes,
    onSelectHistoryItem,
    onClearHistory,
  } = useExtraction(dataset, isLoadingDB);

  const handleResetDataset = async () => {
    const defaultData = await resetDataset();
    const refreshed = generateOC(defaultData, {
      count: traitCount,
      specifiedAxes: selectedAxes,
    });
    setCurrentResult(refreshed);
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
        onImportDataset={importDataset}
        onResetDataset={handleResetDataset}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col gap-6">
        {isLoadingDB ? (
          <div className="border-2 border-black p-12 text-center text-xs font-mono">
            載入詞庫資料中...
          </div>
        ) : currentTab === 'frontend' ? (
          /* Frontend: 33% Left Panel + 66% Right Panel */
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <ExtractorPanel
              axes={dataset.axes}
              traits={dataset.traits}
              selectedAxes={selectedAxes}
              onToggleAxis={onToggleAxis}
              onClearAxes={onClearAxes}
              onSelectAllAxes={onSelectAllAxes}
              traitCount={traitCount}
              onChangeTraitCount={setTraitCount}
              pinnedTraitId={pinnedTraitId}
              onSelectPinnedTrait={setPinnedTraitId}
              onGenerate={onGenerate}
              isGenerating={isGenerating}
              lockedCount={lockedCount}
            />

            <ResultPanel
              currentResult={currentResult}
              history={history}
              dataset={dataset}
              onSelectHistoryItem={onSelectHistoryItem}
              onClearHistory={onClearHistory}
              onUpdateTraitIntensity={onUpdateTraitIntensity}
              onUpdateNotes={onUpdateNotes}
              onToggleLockTrait={onToggleLockTrait}
              onRemoveTrait={onRemoveTrait}
              onAddTrait={onAddTrait}
            />
          </div>
        ) : currentTab === 'network' ? (
          /* Network: Character Relationship Network */
          <RelationshipNetworkPage />
        ) : (
          /* Backend: Comprehensive Dashboard */
          <BackendDashboard dataset={dataset} onSaveDataset={saveDataset} />
        )}
      </main>

      {/* Full-page invert backdrop filter for night mode */}
      {isDarkMode && (
        <div
          id="dark-mode-invert-overlay"
          className="fixed inset-0 pointer-events-none z-[99999]"
          style={{
            backdropFilter: 'invert(0.98)',
            WebkitBackdropFilter: 'invert(0.98)',
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
