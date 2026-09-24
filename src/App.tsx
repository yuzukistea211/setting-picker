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
import { MergeDatasetModal } from './components/MergeDatasetModal';
import { StorageNoticeModal } from './components/StorageNoticeModal';
import { analyzeMerge, MergeAnalysis, MergeOptions } from './lib/datasetMerge';
import { Check, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'frontend' | 'backend' | 'network'>('frontend');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('oc_dark_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Merge modal states
  const [isMergeModalOpen, setIsMergeModalOpen] = useState<boolean>(false);
  const [mergeAnalysis, setMergeAnalysis] = useState<MergeAnalysis | null>(null);
  const [mergeRawData, setMergeRawData] = useState<any>(null);
  const [mergeFileName, setMergeFileName] = useState<string>('');

  // Top notification banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Storage notice popup state
  const [isStorageNoticeOpen, setIsStorageNoticeOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('oc_storage_notice_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const handleCloseStorageNotice = (dontShowAgain: boolean) => {
    setIsStorageNoticeOpen(false);
    if (dontShowAgain) {
      try {
        localStorage.setItem('oc_storage_notice_dismissed', 'true');
      } catch (err) {
        console.error(err);
      }
    }
  };

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

  const { dataset, isLoadingDB, saveDataset, importDataset, mergeDataset, resetDataset } = useDataset();

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
    setNotification({
      type: 'success',
      message: '詞庫已重設回預設心理學詞條資料集。',
    });
  };

  const handleOpenMergeModal = (rawJson: any, fileName: string) => {
    const analysis = analyzeMerge(dataset, rawJson);
    if (!analysis.isValid) {
      setNotification({
        type: 'error',
        message: analysis.errorMessage || '檔案格式無效，無法進行合併。',
      });
      return;
    }
    setMergeRawData(rawJson);
    setMergeFileName(fileName);
    setMergeAnalysis(analysis);
    setIsMergeModalOpen(true);
  };

  const handleConfirmMerge = async (options: MergeOptions) => {
    if (!mergeRawData) return;
    try {
      const summary = await mergeDataset(mergeRawData, options);
      setIsMergeModalOpen(false);
      setMergeRawData(null);
      setMergeAnalysis(null);

      const rulesTotal =
        summary.addedCoRulesCount +
        summary.updatedCoRulesCount +
        summary.addedSoftRulesCount +
        summary.updatedSoftRulesCount +
        summary.addedHardRulesCount +
        summary.updatedHardRulesCount;

      let msg = `詞庫合併成功！新增 ${summary.addedTraitsCount} 個詞條`;
      if (summary.updatedTraitsCount > 0) msg += `、更新 ${summary.updatedTraitsCount} 個詞條`;
      if (summary.addedAxesCount > 0) msg += `、新增 ${summary.addedAxesCount} 個軸線`;
      if (rulesTotal > 0) msg += `、同步 ${rulesTotal} 條相容與排除規則`;
      msg += `（目前總計 ${summary.totalTraitsAfter} 個詞條）。`;

      setNotification({
        type: 'success',
        message: msg,
      });
    } catch (err) {
      console.error('Merge dataset failed', err);
      setNotification({
        type: 'error',
        message: '合併詞庫時發生錯誤，請檢查檔案內容。',
      });
    }
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
        onOpenMergeModal={handleOpenMergeModal}
        onResetDataset={handleResetDataset}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {/* Global Notification Banner */}
      {notification && (
        <div
          id="global-notification"
          className={`max-w-7xl w-full mx-auto px-4 mt-3 flex items-center justify-between p-3 border-2 border-black font-mono text-xs font-bold transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
            notification.type === 'success'
              ? 'bg-emerald-100 text-emerald-950 border-emerald-900'
              : 'bg-rose-100 text-rose-950 border-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <Check size={16} className="text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-700 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black hover:text-white border border-black cursor-pointer ml-3 shrink-0"
            aria-label="關閉提示"
          >
            <X size={14} />
          </button>
        </div>
      )}

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

      {/* Merge Dataset Modal */}
      <MergeDatasetModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        analysis={mergeAnalysis}
        fileName={mergeFileName}
        currentDataset={dataset}
        onConfirmMerge={handleConfirmMerge}
      />

      {/* Storage Notice Modal */}
      <StorageNoticeModal
        isOpen={isStorageNoticeOpen}
        onClose={handleCloseStorageNotice}
      />

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
