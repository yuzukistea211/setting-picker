import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  History,
  AlertTriangle,
  ArrowRight,
  FileText,
  User,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Download,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import {
  ExtractionResult,
  IntensityLevel,
  ALL_INTENSITIES,
  Trait,
  Dataset,
} from '../../types';
import { isHardExcluded } from '../../lib/generator';

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

  // Add Trait Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAxisFilter, setSelectedAxisFilter] = useState('ALL');
  const [candidateTrait, setCandidateTrait] = useState<Trait | null>(null);
  const [candidateIntensity, setCandidateIntensity] = useState<IntensityLevel>('中等');
  const [candidateLock, setCandidateLock] = useState(false);

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

    text += `─── 性格與心理詞條 ───\n`;
    currentResult.traits.forEach((item, index) => {
      const lockMark = item.locked ? ' [🔒已鎖定]' : '';
      text += `${index + 1}. [${item.axis}] 【${item.intensity}】${item.trait.name}${lockMark}\n   ${item.trait.description}\n`;
    });

    if (currentResult.weakCompatibilities.length > 0) {
      text += `\n─── 弱相容心理動態註解 ───\n`;
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

  const getIntensityBadgeClass = (intensity: IntensityLevel) => {
    switch (intensity) {
      case '極端':
        return 'bg-black text-white font-black border border-black';
      case '強烈':
        return 'bg-white text-black font-black border-2 border-black';
      case '中等':
        return 'bg-white text-black font-bold border border-black';
      case '輕微':
        return 'bg-white text-black border border-neutral-400';
      case '隱藏':
        return 'bg-white text-neutral-600 border border-dashed border-black';
      default:
        return 'border border-black';
    }
  };

  // Trait sets currently in result for fast check
  const presentTraitIds = useMemo(() => {
    if (!currentResult) return new Set<string>();
    return new Set(currentResult.traits.map((t) => t.trait.id));
  }, [currentResult]);

  // Locked traits count
  const lockedCount = useMemo(() => {
    if (!currentResult) return 0;
    return currentResult.traits.filter((t) => t.locked).length;
  }, [currentResult]);

  // Filtered traits for Add Modal
  const availableCandidateTraits = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return dataset.traits.filter((t) => {
      if (selectedAxisFilter !== 'ALL' && t.axis !== selectedAxisFilter) {
        return false;
      }
      if (kw) {
        const matchesName = t.name.toLowerCase().includes(kw);
        const matchesDesc = t.description.toLowerCase().includes(kw);
        const matchesAxis = t.axis.toLowerCase().includes(kw);
        if (!matchesName && !matchesDesc && !matchesAxis) return false;
      }
      return true;
    });
  }, [dataset.traits, selectedAxisFilter, searchKeyword]);

  // Check hard exclusions for a candidate with current traits
  const checkCandidateConflicts = (trait: Trait) => {
    if (!currentResult) return null;
    for (const item of currentResult.traits) {
      const exclusion = isHardExcluded(trait.id, item.trait.id, dataset);
      if (exclusion.excluded) {
        return {
          conflictingTrait: item.trait,
          reason: exclusion.reason || '邏輯不共存',
        };
      }
    }
    return null;
  };

  const handleConfirmAddTrait = () => {
    if (!candidateTrait) return;
    onAddTrait(candidateTrait, candidateIntensity, candidateLock);
    setIsAddModalOpen(false);
    setCandidateTrait(null);
    setCandidateIntensity('中等');
    setCandidateLock(false);
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

            {/* Add Trait Button replacing the reroll button */}
            <button
              id="btn-add-trait"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 border border-black bg-black text-white text-xs font-bold hover:bg-white hover:text-black transition-colors cursor-pointer"
              title="自由從心理學詞庫中加入新詞條至目前角色"
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
          {/* Specified Axes fulfillment status banner (if user specified any axes) */}
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
            {currentResult.traits.map((item, idx) => {
              const isLocked = !!item.locked;
              return (
                <div
                  key={item.trait.id + '-' + idx}
                  id={`card-trait-${item.trait.id}`}
                  className={`border-2 border-black p-3.5 bg-white flex flex-col justify-between gap-3 transition-shadow ${
                    isLocked ? 'ring-2 ring-black bg-neutral-50/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : ''
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      {/* Interactive Intensity Select Dropdown */}
                      <div className="flex items-center gap-1">
                        <label htmlFor={`select-intensity-${idx}`} className="sr-only">
                          詞條強度
                        </label>
                        <select
                          id={`select-intensity-${idx}`}
                          value={item.intensity}
                          onChange={(e) =>
                            onUpdateTraitIntensity(idx, e.target.value as IntensityLevel)
                          }
                          title="點擊更改詞條強度"
                          className={`text-xs px-2 py-0.5 tracking-wider cursor-pointer outline-none transition-colors ${getIntensityBadgeClass(
                            item.intensity,
                          )}`}
                        >
                          {ALL_INTENSITIES.map((lvl) => (
                            <option
                              key={lvl}
                              value={lvl}
                              className="bg-white text-black font-normal"
                            >
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Right controls: Axis tag, Lock toggle, Remove button */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono border border-black px-1.5 py-0.5">
                          {item.axis}
                        </span>

                        {/* Lock / Unlock Toggle Button */}
                        <button
                          id={`btn-lock-trait-${idx}`}
                          type="button"
                          onClick={() => onToggleLockTrait(idx)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                            isLocked
                              ? 'border-black bg-black text-white hover:bg-neutral-800'
                              : 'border-neutral-300 bg-white text-neutral-600 hover:border-black hover:text-black'
                          }`}
                          title={isLocked ? '點擊解除鎖定' : '點擊鎖定詞條（重新抽取時將保留此詞條與強度）'}
                        >
                          {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                          <span>{isLocked ? '已鎖定' : '鎖定'}</span>
                        </button>

                        {/* Remove Trait Button */}
                        <button
                          id={`btn-remove-trait-${idx}`}
                          type="button"
                          onClick={() => onRemoveTrait(idx)}
                          className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-mono border border-neutral-300 hover:border-black text-neutral-500 hover:text-white hover:bg-black transition-colors cursor-pointer"
                          title="自目前角色中移除此詞條"
                        >
                          <Trash2 size={12} />
                          <span className="sr-only sm:not-sr-only">移除</span>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-black tracking-tight text-black mt-1 flex items-center gap-1.5">
                      {isLocked && <Lock size={14} className="shrink-0 text-black" />}
                      <span>{item.trait.name}</span>
                    </h3>
                  </div>

                  <p className="text-xs text-neutral-800 leading-relaxed border-t border-black pt-2">
                    {item.trait.description}
                  </p>
                </div>
              );
            })}

            {/* Quick Add Card at the end of the traits grid */}
            <button
              id="btn-add-trait-card"
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="border-2 border-dashed border-black/40 hover:border-black p-4 bg-neutral-50/40 hover:bg-neutral-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-[120px] group"
              title="自由挑選心理學詞庫中的詞條加入角色"
            >
              <div className="p-2 border border-black rounded-full bg-white group-hover:bg-black group-hover:text-white transition-colors">
                <Plus size={16} />
              </div>
              <span className="text-xs font-black tracking-wide">+ 加入詞條</span>
              <span className="text-[11px] font-mono text-neutral-500">
                點擊瀏覽詞庫自由擴充角色詞條
              </span>
            </button>
          </div>

          {/* Weak Compatibility (弱相容) Section */}
          {currentResult.weakCompatibilities.length > 0 && (
            <div
              id="section-weak-compatibility"
              className="border-2 border-black p-4 bg-white flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 border-b border-black pb-2">
                <AlertTriangle size={16} />
                <span className="text-xs font-black tracking-wider uppercase">
                  弱相容心理動態解析 ({currentResult.weakCompatibilities.length})
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {currentResult.weakCompatibilities.map((wc, index) => (
                  <div
                    key={index}
                    id={`card-weak-compat-${index}`}
                    className="border border-black p-3 bg-white flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="border border-black bg-black text-white px-1.5 py-0.2 text-[10px]">
                          弱相容
                        </span>
                        <span>【{wc.intensityA}】{wc.traitA.name}</span>
                        <span className="font-mono text-neutral-500">×</span>
                        <span>【{wc.intensityB}】{wc.traitB.name}</span>
                      </div>
                      <span className="text-[10px] font-mono border border-black px-1 py-0.5">
                        {wc.reasonType === 'soft_exclusion' ? '軟排除' : '強負相關'}
                      </span>
                    </div>

                    <div className="border-t border-black pt-1.5 text-xs text-black font-medium leading-relaxed">
                      {wc.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Character Name & Custom Notes Plain Text Editing Area */}
          <div
            id="section-result-notes"
            className="border-2 border-black p-4 bg-white flex flex-col gap-3"
          >
            <div className="flex items-center justify-between border-b border-black pb-2">
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span className="text-xs font-black tracking-wider uppercase">
                  設定筆記
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Character Name Input */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label
                  htmlFor="input-character-name"
                  className="text-xs font-bold shrink-0 flex items-center gap-1 sm:w-24"
                >
                  <User size={13} />
                  <span>角色姓名：</span>
                </label>
                <input
                  id="input-character-name"
                  type="text"
                  value={currentResult.characterName || ''}
                  onChange={(e) =>
                    onUpdateNotes(e.target.value, currentResult.notes || '')
                  }
                  placeholder="輸入自訂角色姓名或稱呼（例如：雷恩·黑爾、莉莉絲、研究員 A）"
                  className="flex-1 text-xs border border-black px-3 py-1.5 focus:bg-neutral-50 focus:outline-none placeholder:text-neutral-400 font-sans"
                />
              </div>

              {/* Custom Notes Plain Text Area */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="textarea-custom-notes"
                    className="text-xs font-bold flex items-center gap-1"
                  >
                    <FileText size={13} />
                    <span>自訂備註 ：</span>
                  </label>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {(currentResult.notes || '').length} 字
                  </span>
                </div>
                <textarea
                  id="textarea-custom-notes"
                  rows={4}
                  value={currentResult.notes || ''}
                  onChange={(e) =>
                    onUpdateNotes(currentResult.characterName || '', e.target.value)
                  }
                  placeholder="在此直接輸入自訂備註、背景故事設定、情節構思，或針對上方詞條強度的補充描寫..."
                  className="w-full text-xs font-sans border border-black p-3 focus:bg-neutral-50 focus:outline-none resize-y leading-relaxed placeholder:text-neutral-400"
                />
              </div>
            </div>
          </div>
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

      {/* Single Page Session History */}
      <div className="border-t-2 border-black pt-4 flex flex-col gap-3 mt-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <History size={15} />
            <span className="text-xs font-black tracking-wider uppercase">
              抽取歷史 ({history.length})
            </span>
          </div>

          {history.length > 0 && (
            <button
              id="btn-clear-history"
              type="button"
              onClick={onClearHistory}
              className="text-[11px] font-mono border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              清空歷史
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-xs font-mono text-neutral-400 py-2">無歷史記錄</div>
        ) : (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {history.map((hist) => {
              const isSelected = currentResult?.id === hist.id;
              return (
                <div
                  key={hist.id}
                  id={`history-item-${hist.id}`}
                  onClick={() => onSelectHistoryItem(hist)}
                  className={`border p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-2 border-black bg-neutral-100 font-bold'
                      : 'border-black hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] border border-black px-1">
                        {new Date(hist.timestamp).toLocaleTimeString()}
                      </span>
                      {hist.characterName && (
                        <span className="border border-black bg-black text-white text-[10px] px-1 font-bold">
                          {hist.characterName}
                        </span>
                      )}
                      {hist.weakCompatibilities.length > 0 && (
                        <span className="border border-black text-[10px] px-1">
                          {hist.weakCompatibilities.length} 處弱相容
                        </span>
                      )}
                      {hist.notes && hist.notes.trim() && (
                        <span className="text-[10px] text-neutral-600 font-mono">
                          [有備註]
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs">
                      {hist.traits
                        .map((t) => `【${t.intensity}】${t.trait.name}${t.locked ? '🔒' : ''}`)
                        .join(' · ')}
                    </div>
                  </div>

                  <ArrowRight size={14} className="shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Trait Modal Dialog */}
      {isAddModalOpen && (
        <div
          id="modal-add-trait"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-2xl bg-white border-2 border-black p-5 flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Plus size={18} className="font-black" />
                <h2 className="text-sm font-black tracking-wider uppercase">
                  自由加入詞條至目前角色
                </h2>
              </div>
              <button
                id="btn-close-add-modal"
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
                title="關閉"
              >
                <X size={16} />
              </button>
            </div>

            {/* Filter Controls: Search & Axis Chips */}
            <div className="flex flex-col gap-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  id="input-search-candidate-traits"
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜尋詞條名稱、軸線或心理學描述..."
                  className="w-full pl-9 pr-8 py-2 text-xs border border-black focus:outline-none focus:bg-neutral-50"
                  autoFocus
                />
                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Axis Filter Pills */}
              <div className="flex flex-wrap gap-1 items-center max-h-20 overflow-y-auto py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedAxisFilter('ALL')}
                  className={`px-2 py-0.5 text-[11px] font-mono border transition-colors cursor-pointer ${
                    selectedAxisFilter === 'ALL'
                      ? 'border-black bg-black text-white font-bold'
                      : 'border-neutral-300 bg-white text-neutral-600 hover:border-black'
                  }`}
                >
                  全部軸線
                </button>
                {dataset.axes.map((axis) => (
                  <button
                    key={axis.id}
                    type="button"
                    onClick={() => setSelectedAxisFilter(axis.name)}
                    className={`px-2 py-0.5 text-[11px] font-mono border transition-colors cursor-pointer ${
                      selectedAxisFilter === axis.name
                        ? 'border-black bg-black text-white font-bold'
                        : 'border-neutral-300 bg-white text-neutral-600 hover:border-black'
                    }`}
                  >
                    {axis.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Traits Selection List */}
            <div className="flex-1 overflow-y-auto border border-black max-h-64 p-2 flex flex-col gap-1.5 divide-y divide-neutral-200">
              {availableCandidateTraits.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-neutral-500">
                  沒有找到符合條件的詞條
                </div>
              ) : (
                availableCandidateTraits.map((t) => {
                  const isPresent = presentTraitIds.has(t.id);
                  const isSelected = candidateTrait?.id === t.id;
                  const conflict = checkCandidateConflicts(t);

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (!isPresent) {
                          setCandidateTrait(t);
                        }
                      }}
                      className={`p-2.5 flex flex-col gap-1.5 text-xs transition-colors cursor-pointer ${
                        isPresent
                          ? 'opacity-40 bg-neutral-100 cursor-not-allowed'
                          : isSelected
                          ? 'bg-neutral-100 border-2 border-black font-medium'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{t.name}</span>
                          <span className="text-[10px] font-mono border border-black px-1.5 py-0.2">
                            {t.axis}
                          </span>
                          {isPresent && (
                            <span className="text-[10px] font-mono bg-neutral-300 text-neutral-700 px-1 py-0.2">
                              已在角色中
                            </span>
                          )}
                          {conflict && !isPresent && (
                            <span className="text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-600 px-1.5 py-0.2 flex items-center gap-1">
                              <AlertTriangle size={10} />
                              <span>與「{conflict.conflictingTrait.name}」互斥</span>
                            </span>
                          )}
                        </div>

                        {isSelected && !isPresent && (
                          <span className="text-[11px] font-bold text-black flex items-center gap-1">
                            <CheckCircle2 size={14} /> 已選取
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-600 leading-snug line-clamp-2">
                        {t.description}
                      </p>

                      {conflict && !isPresent && (
                        <p className="text-[10px] font-mono text-amber-900 bg-amber-50 p-1 border-l-2 border-amber-500">
                          互斥原因：{conflict.reason}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Trait Settings (Intensity & Lock) */}
            {candidateTrait && (
              <div className="border-2 border-black p-3 bg-neutral-50 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black">
                    即將加入：【{candidateTrait.name}】
                  </span>
                  <span className="text-[10px] font-mono border border-black px-1">
                    {candidateTrait.axis}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-black/20">
                  {/* Intensity Choice */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="select-candidate-intensity" className="text-xs font-bold">
                      詞條強度：
                    </label>
                    <select
                      id="select-candidate-intensity"
                      value={candidateIntensity}
                      onChange={(e) => setCandidateIntensity(e.target.value as IntensityLevel)}
                      className="border border-black bg-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      {ALL_INTENSITIES.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Lock Checkbox */}
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={candidateLock}
                      onChange={(e) => setCandidateLock(e.target.checked)}
                      className="cursor-pointer"
                    />
                    <Lock size={12} />
                    <span>加入時自動鎖定</span>
                  </label>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-black pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                id="btn-confirm-add-trait"
                type="button"
                disabled={!candidateTrait}
                onClick={handleConfirmAddTrait}
                className="px-4 py-1.5 border border-black bg-black text-white text-xs font-black hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>確認加入抽取結果</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

