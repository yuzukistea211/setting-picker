import React, { useState } from 'react';
import { Copy, Check, History, AlertTriangle, ArrowRight, FileText, User } from 'lucide-react';
import { ExtractionResult, IntensityLevel, ALL_INTENSITIES } from '../../types';

interface ResultPanelProps {
  currentResult: ExtractionResult | null;
  history: ExtractionResult[];
  onSelectHistoryItem: (item: ExtractionResult) => void;
  onClearHistory: () => void;
  onReroll: () => void;
  onUpdateTraitIntensity: (traitIndex: number, newIntensity: IntensityLevel) => void;
  onUpdateNotes: (characterName: string, notes: string) => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  currentResult,
  history,
  onSelectHistoryItem,
  onClearHistory,
  onReroll,
  onUpdateTraitIntensity,
  onUpdateNotes,
}) => {
  const [copied, setCopied] = useState(false);

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
      text += `${index + 1}. [${item.axis}] 【${item.intensity}】${item.trait.name}\n   ${item.trait.description}\n`;
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

  return (
    <section
      id="panel-result"
      className="w-full lg:w-2/3 border-2 border-black bg-white p-4 flex flex-col gap-6"
    >
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-3 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-wider uppercase">抽取結果</span>
          {currentResult && (
            <div className="flex items-center gap-1.5">
              {currentResult.characterName && (
                <span className="text-xs font-bold bg-black text-white px-2 py-0.5">
                  {currentResult.characterName}
                </span>
              )}
              <span className="text-xs font-mono border border-black px-2 py-0.5">
                {new Date(currentResult.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {currentResult && (
          <div className="flex items-center gap-2">
            <button
              id="btn-copy-result"
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? '已複製' : '複製純文字'}</span>
            </button>
            <button
              id="btn-reroll-result"
              type="button"
              onClick={onReroll}
              className="px-3 py-1.5 border border-black bg-black text-white text-xs font-bold hover:bg-white hover:text-black transition-colors cursor-pointer"
            >
              重新抽取
            </button>
          </div>
        )}
      </div>

      {/* Main Extracted Traits Content */}
      {currentResult ? (
        <div className="flex flex-col gap-6">
          {/* Traits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {currentResult.traits.map((item, idx) => (
              <div
                key={item.trait.id + '-' + idx}
                id={`card-trait-${item.trait.id}`}
                className="border-2 border-black p-3.5 bg-white flex flex-col justify-between gap-3"
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

                    <span className="text-[11px] font-mono border border-black px-1.5 py-0.5">
                      {item.axis}
                    </span>
                  </div>

                  <h3 className="text-base font-black tracking-tight text-black mt-1">
                    {item.trait.name}
                  </h3>
                </div>

                <p className="text-xs text-neutral-800 leading-relaxed border-t border-black pt-2">
                  {item.trait.description}
                </p>
              </div>
            ))}
          </div>

          {/* Weak Compatibility (弱相容) Section */}
          {currentResult.weakCompatibilities.length > 0 && (
            <div
              id="section-weak-compatibility"
              className="border-2 border-black p-4 bg-white flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 border-b border-black pb-2">
                <AlertTriangle size={16} />
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
                  角色備註與設定筆記
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500 border border-neutral-300 px-1.5 py-0.5">
                即時儲存至紀錄
              </span>
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
                    <span>自訂備註 / 角色筆記：</span>
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
                        .map((t) => `【${t.intensity}】${t.trait.name}`)
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
    </section>
  );
};

