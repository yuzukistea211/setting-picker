import React, { useState } from 'react';
import { X, GitMerge, Check, AlertCircle, Layers, Sliders, ChevronDown, ChevronUp } from 'lucide-react';
import { MergeAnalysis, MergeOptions } from '../lib/datasetMerge';
import { Dataset } from '../types';

interface MergeDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: MergeAnalysis | null;
  fileName?: string;
  currentDataset: Dataset;
  onConfirmMerge: (options: MergeOptions) => void;
}

export const MergeDatasetModal: React.FC<MergeDatasetModalProps> = ({
  isOpen,
  onClose,
  analysis,
  fileName,
  currentDataset,
  onConfirmMerge,
}) => {
  const [duplicateStrategy, setDuplicateStrategy] = useState<'update' | 'skip'>('update');
  const [mergeRules, setMergeRules] = useState<boolean>(true);
  const [showDuplicateList, setShowDuplicateList] = useState<boolean>(false);
  const [showNewAxesList, setShowNewAxesList] = useState<boolean>(false);

  if (!isOpen || !analysis) return null;

  const totalIncomingRules =
    analysis.incomingCoRulesCount + analysis.incomingSoftRulesCount + analysis.incomingHardRulesCount;

  return (
    <div
      id="merge-dataset-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="merge-dataset-modal"
        className="w-full max-w-xl bg-white border-2 border-black flex flex-col max-h-[90vh] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black"
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3 bg-(--main-color)">
          <div className="flex items-center gap-2">
            <span className="p-1 border border-black bg-black text-white">
              <GitMerge size={16} />
            </span>
            <h2 id="merge-modal-title" className="font-black text-sm tracking-wide">
              合併新詞庫至現有詞庫
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto flex flex-col gap-4 text-xs font-mono">
          {/* File info */}
          {fileName && (
            <div className="border border-black p-2.5 bg-neutral-50 flex items-center justify-between">
              <span className="text-neutral-600 font-bold">來源檔案：</span>
              <span className="font-bold text-black truncate max-w-[320px]">{fileName}</span>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="border border-black p-2 bg-white flex flex-col">
              <span className="text-[10px] text-neutral-500 font-bold">現有詞條</span>
              <span className="text-lg font-black">{currentDataset.traits.length}</span>
            </div>
            <div className="border border-black p-2 bg-emerald-50 text-emerald-950 flex flex-col">
              <span className="text-[10px] text-emerald-700 font-bold">新增詞條</span>
              <span className="text-lg font-black">+{analysis.newTraitsCount}</span>
            </div>
            <div className="border border-black p-2 bg-amber-50 text-amber-950 flex flex-col">
              <span className="text-[10px] text-amber-700 font-bold">重名詞條</span>
              <span className="text-lg font-black">{analysis.duplicateTraitNames.length}</span>
            </div>
            <div className="border border-black p-2 bg-sky-50 text-sky-950 flex flex-col">
              <span className="text-[10px] text-sky-700 font-bold">新增軸線</span>
              <span className="text-lg font-black">+{analysis.newAxesNames.length}</span>
            </div>
          </div>

          {/* Options: Duplicate Strategy */}
          <div className="border border-black p-3 bg-white flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 font-bold text-neutral-900 border-b border-black/20 pb-1.5">
              <Sliders size={13} />
              <span>同名詞條處理方式</span>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer p-1.5 hover:bg-neutral-50 border border-transparent hover:border-black/30">
              <input
                type="radio"
                name="duplicateStrategy"
                value="update"
                checked={duplicateStrategy === 'update'}
                onChange={() => setDuplicateStrategy('update')}
                className="mt-0.5 accent-black cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-bold text-black">以新詞庫內容覆蓋更新（推薦）</span>
                <span className="text-[11px] text-neutral-500">
                  若名稱重複，將使用新檔案中的軸線、描述與基礎權重更新現有詞條。
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer p-1.5 hover:bg-neutral-50 border border-transparent hover:border-black/30">
              <input
                type="radio"
                name="duplicateStrategy"
                value="skip"
                checked={duplicateStrategy === 'skip'}
                onChange={() => setDuplicateStrategy('skip')}
                className="mt-0.5 accent-black cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="font-bold text-black">保留現有詞條（略過同名項目）</span>
                <span className="text-[11px] text-neutral-500">
                  若名稱重複，保持目前詞庫的原有內容不變，僅匯入全新詞條。
                </span>
              </div>
            </label>
          </div>

          {/* Options: Rules Merging */}
          <div className="border border-black p-3 bg-white flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={mergeRules}
                  onChange={(e) => setMergeRules(e.target.checked)}
                  className="accent-black cursor-pointer"
                />
                <span>合併相容與互斥規則（共生、弱相容、硬性排除）</span>
              </label>
              <span className="text-[11px] font-bold text-neutral-500">
                新檔含 {totalIncomingRules} 條規則
              </span>
            </div>
            <span className="text-[11px] text-neutral-500 pl-5">
              自動比對新舊詞條關聯，自動略過無效之孤立規則；同對詞條的現有規則將同步更新。
            </span>
          </div>

          {/* Details Collapsible: Duplicate Trait List */}
          {analysis.duplicateTraitNames.length > 0 && (
            <div className="border border-black bg-neutral-50">
              <button
                type="button"
                onClick={() => setShowDuplicateList(!showDuplicateList)}
                className="w-full flex items-center justify-between p-2 font-bold text-left hover:bg-neutral-100 cursor-pointer"
              >
                <span>重名詞條清單 ({analysis.duplicateTraitNames.length})</span>
                {showDuplicateList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showDuplicateList && (
                <div className="p-2 border-t border-black bg-white max-h-32 overflow-y-auto flex flex-wrap gap-1 text-[11px]">
                  {analysis.duplicateTraitNames.map((name) => (
                    <span
                      key={name}
                      className="px-2 py-0.5 border border-black bg-amber-100 text-amber-900"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Details Collapsible: New Axes List */}
          {analysis.newAxesNames.length > 0 && (
            <div className="border border-black bg-neutral-50">
              <button
                type="button"
                onClick={() => setShowNewAxesList(!showNewAxesList)}
                className="w-full flex items-center justify-between p-2 font-bold text-left hover:bg-neutral-100 cursor-pointer"
              >
                <span>將新增之維度軸線 ({analysis.newAxesNames.length})</span>
                {showNewAxesList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showNewAxesList && (
                <div className="p-2 border-t border-black bg-white max-h-24 overflow-y-auto flex flex-wrap gap-1 text-[11px]">
                  {analysis.newAxesNames.map((axis) => (
                    <span
                      key={axis}
                      className="px-2 py-0.5 border border-black bg-sky-100 text-sky-900"
                    >
                      {axis}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 border-t-2 border-black p-3 bg-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-black bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            id="btn-confirm-merge-dataset"
            type="button"
            onClick={() => onConfirmMerge({ duplicateStrategy, mergeRules })}
            className="px-5 py-1.5 border border-black bg-black text-white font-black text-xs hover:bg-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>確認合併詞庫</span>
          </button>
        </div>
      </div>
    </div>
  );
};
