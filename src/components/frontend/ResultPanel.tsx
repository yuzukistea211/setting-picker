import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, Plus, Lock } from 'lucide-react';
import { ExtractionResult, IntensityLevel, Trait, Dataset } from '../../types';
import { TraitCard } from './TraitCard';
import { WeakCompatibilitySection } from './WeakCompatibilitySection';
import { ResultNotesSection } from './ResultNotesSection';
import { ResultHistorySection } from './ResultHistorySection';
import { AddTraitModal } from './AddTraitModal';

interface ResultPanelProps {
  currentResult: ExtractionResult | null;
  history: ExtractionResult[];
  dataset: Dataset;
  onSelectHistoryItem: (item: ExtractionResult) => void;
  onClearHistory: () => void;
  onUpdateTraitIntensity: (traitIndex: number, newIntensity: IntensityLevel) => void;
  onUpdateNotes: (characterName: string, notes: string) => void;
  onToggleLockTrait: (traitIndex: number) => void;
  onRemoveTrait: (traitIndex: number) => void;
  onAddTrait: (trait: Trait, intensity: IntensityLevel, locked?: boolean) => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  currentResult,
  history,
  dataset,
  onSelectHistoryItem,
  onClearHistory,
  onUpdateTraitIntensity,
  onUpdateNotes,
  onToggleLockTrait,
  onRemoveTrait,
  onAddTrait,
}) => {
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Locked traits count
  const lockedCount = useMemo(() => {
    if (!currentResult) return 0;
    return currentResult.traits.filter((t) => t.locked).length;
  }, [currentResult]);

  const handleCopyText = () => {
    if (!currentResult) return;

    let text = `【OC 設定檔案】\n`;
    if (currentResult.characterName && currentResult.characterName.trim()) {
      text += `角色姓名：${currentResult.characterName.trim()}\n`;
    }
    text += `抽取時間：${new Date(currentResult.timestamp).toLocaleString()}\n\n`;

    if (currentResult.notes && currentResult.notes.trim()) {
      text += `─── 角色自訂備註 ───\n${currentResult.notes.trim()}\n\n`;
    }

    text += `─── 詞條 ───\n`;
    currentResult.traits.forEach((item, index) => {
      const lockMark = item.locked ? ' [🔒已鎖定]' : '';
      text += `${index + 1}. [${item.axis}] 【${item.intensity}】${item.trait.name}${lockMark}\n   ${item.trait.description}\n`;
    });

    if (currentResult.weakCompatibilities.length > 0) {
      text += `\n─── 弱相容註解 ───\n`;
      currentResult.weakCompatibilities.forEach((wc, idx) => {
        text += `${idx + 1}. [弱相容] 【${wc.intensityA}】${wc.traitA.name} × 【${wc.intensityB}】${wc.traitB.name}\n   註解：${wc.note}\n`;
      });
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportJSON = () => {
    if (!currentResult) return;

    const dataToExport = {
      version: '1.0',
      id: currentResult.id,
      characterName: currentResult.characterName || '',
      timestamp: currentResult.timestamp,
      exportedAt: new Date().toISOString(),
      notes: currentResult.notes || '',
      specifiedAxes: currentResult.specifiedAxes || [],
      traits: currentResult.traits.map((t) => ({
        id: t.trait.id,
        name: t.trait.name,
        axis: t.axis,
        intensity: t.intensity,
        description: t.trait.description,
      })),
      weakCompatibilities: currentResult.weakCompatibilities.map((wc) => ({
        traitA: { id: wc.traitA.id, name: wc.traitA.name, axis: wc.traitA.axis },
        intensityA: wc.intensityA,
        traitB: { id: wc.traitB.id, name: wc.traitB.name, axis: wc.traitB.axis },
        intensityB: wc.intensityB,
        reasonType: wc.reasonType,
        score: wc.score,
        note: wc.note,
      })),
    };

    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = (currentResult.characterName || 'character')
      .trim()
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
    link.href = url;
    link.download = `oc-${safeName}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <section
      id="panel-result"
      className="w-full lg:w-2/3 border-2 border-black bg-(--main-color) p-4 flex flex-col gap-6"
    >
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black tracking-wider uppercase">抽取結果</span>
          {currentResult && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {currentResult.characterName && (
                <span className="text-xs font-bold bg-black text-white px-2 py-0.5">
                  {currentResult.characterName}
                </span>
              )}
              {lockedCount > 0 && (
                <span
                  id="badge-locked-summary"
                  className="text-xs font-mono font-bold border border-black bg-neutral-100 px-2 py-0.5 flex items-center gap-1"
                >
                  <Lock size={11} />
                  <span>{lockedCount} 個詞條已鎖定</span>
                </span>
              )}
            </div>
          )}
        </div>

        {currentResult && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export JSON Button */}
            <button
              id="btn-export-json"
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
              title="匯出目前抽取結果為格式化 JSON 檔案"
            >
              {exported ? <Check size={14} /> : <Download size={14} />}
              <span>{exported ? '已匯出 JSON' : '匯出 JSON'}</span>
            </button>

            {/* Copy Plaintext Button */}
            <button
              id="btn-copy-result"
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? '已複製' : '複製純文字'}</span>
            </button>

            {/* Add Trait Button */}
            <button
              id="btn-add-trait"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-black bg-black text-white text-xs font-bold hover:bg-white hover:text-black transition-colors cursor-pointer"
              title="自由從詞庫中加入新詞條至目前角色"
            >
              <Plus size={14} />
              <span>加入詞條</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Extracted Traits Content */}
      {currentResult ? (
        <div className="flex flex-col gap-6">
          {/* Specified Axes fulfillment status banner */}
          {currentResult.specifiedAxes && currentResult.specifiedAxes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border border-black/30 p-2.5 bg-neutral-50 text-xs">
              <span className="font-bold">指定軸線狀態：</span>
              {currentResult.specifiedAxes.map((axisName) => {
                const isFulfilled = currentResult.traits.some((t) => t.axis === axisName);
                return (
                  <span
                    key={axisName}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[11px] font-mono font-bold ${
                      isFulfilled
                        ? 'border-black bg-black text-white'
                        : 'border-neutral-400 bg-white text-neutral-500 line-through'
                    }`}
                  >
                    <span>{axisName}</span>
                    <span>{isFulfilled ? '✓' : '未抽取'}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Traits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentResult.traits.map((item, idx) => (
              <TraitCard
                key={`${item.trait.id}-${idx}`}
                item={item}
                index={idx}
                onUpdateIntensity={onUpdateTraitIntensity}
                onToggleLock={onToggleLockTrait}
                onRemove={onRemoveTrait}
              />
            ))}

            {/* Quick Add Card at the end of the traits grid */}
            <button
              id="btn-add-trait-card"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="border-2 border-dashed border-black/40 hover:border-black p-4 bg-neutral-50/40 hover:bg-neutral-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-[120px] group"
              title="挑選詞條加入角色"
            >
              <div className="p-2 border border-black rounded-full bg-white group-hover:bg-black group-hover:text-white transition-colors">
                <Plus size={16} />
              </div>
              <span className="text-xs font-black tracking-wide">+ 加入詞條</span>
              <span className="text-[11px] font-mono text-neutral-500">
                點擊瀏覽詞庫
              </span>
            </button>
          </div>

          {/* Weak Compatibility Section */}
          <WeakCompatibilitySection
            weakCompatibilities={currentResult.weakCompatibilities}
          />

          {/* Character Name & Custom Notes Editing Area */}
          <ResultNotesSection
            characterName={currentResult.characterName || ''}
            notes={currentResult.notes || ''}
            onUpdateNotes={onUpdateNotes}
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-black py-16 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold tracking-wider uppercase mb-1">
            尚未抽取設定
          </span>
          <span className="text-xs font-mono text-neutral-600">
            請在左側指定條件後點擊「抽取設定」
          </span>
        </div>
      )}

      {/* Session History */}
      <ResultHistorySection
        history={history}
        currentResultId={currentResult?.id}
        onSelectHistoryItem={onSelectHistoryItem}
        onClearHistory={onClearHistory}
      />

      {/* Add Trait Modal Dialog */}
      <AddTraitModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        dataset={dataset}
        presentTraits={currentResult?.traits || []}
        onConfirmAdd={onAddTrait}
      />
    </section>
  );
};
