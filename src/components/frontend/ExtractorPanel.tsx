import React from 'react';
import { BotMessageSquare, RefreshCw, X, CheckSquare, Square, Lock } from 'lucide-react';
import { AxisDefinition, Trait } from '../../types';

interface ExtractorPanelProps {
  axes: AxisDefinition[];
  traits: Trait[];
  selectedAxes: string[];
  onToggleAxis: (axisName: string) => void;
  onClearAxes: () => void;
  onSelectAllAxes: () => void;
  traitCount: number;
  onChangeTraitCount: (count: number) => void;
  pinnedTraitId: string;
  onSelectPinnedTrait: (traitId: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  lockedCount?: number;
}

export const ExtractorPanel: React.FC<ExtractorPanelProps> = ({
  axes,
  traits,
  selectedAxes,
  onToggleAxis,
  onClearAxes,
  onSelectAllAxes,
  traitCount,
  onChangeTraitCount,
  pinnedTraitId,
  onSelectPinnedTrait,
  onGenerate,
  isGenerating,
  lockedCount = 0,
}) => {
  return (
    <aside
      id="panel-extractor"
      className="w-full lg:w-1/3 border-2 border-black bg-(--main-color) p-4 flex flex-col justify-between gap-6"
    >
      <div className="flex flex-col gap-6">
        {/* Header bar of panel */}
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <span className="text-sm font-black tracking-wider uppercase">設定</span>
        </div>

        {/* Trait Count Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold tracking-wider uppercase">詞條抽取數量</label>
          <div className="grid grid-cols-5 border border-black">
            {[3, 4, 5, 6, 7].map((num) => (
              <button
                key={num}
                id={`btn-count-${num}`}
                type="button"
                onClick={() => onChangeTraitCount(num)}
                className={`py-2 text-center text-sm font-black border-r last:border-r-0 border-black transition-colors cursor-pointer ${
                  traitCount === num ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Specified Axis Tags Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold tracking-wider uppercase">
              指定軸線標籤 ({selectedAxes.length})
            </label>
            <div className="flex items-center gap-1">
              <button
                id="btn-axes-select-all"
                type="button"
                onClick={onSelectAllAxes}
                className="text-[11px] font-mono px-1.5 py-0.5 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                全選
              </button>
              <button
                id="btn-axes-clear"
                type="button"
                onClick={onClearAxes}
                className="text-[11px] font-mono px-1.5 py-0.5 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
              >
                清空
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {axes.map((axis) => {
              const isSelected = selectedAxes.includes(axis.name);
              return (
                <button
                  key={axis.id}
                  id={`btn-axis-${axis.id}`}
                  type="button"
                  onClick={() => onToggleAxis(axis.name)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold border border-black transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  {isSelected ? <CheckSquare size={12} /> : <Square size={12} />}
                  <span>{axis.name}</span>
                </button>
              );
            })}
          </div>

          {selectedAxes.length > 0 && selectedAxes.length > traitCount && (
            <p className="text-[11px] text-neutral-600 bg-neutral-100 p-2 border border-black/30 leading-snug">
              提示：目前指定了 {selectedAxes.length} 個軸線標籤，大於抽取總數（{traitCount} 條），系統將從指定的軸線中隨機涵蓋前 {traitCount} 個軸線。
            </p>
          )}
        </div>

        {/* Pinned Trait Anchor Selector (Optional) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold tracking-wider uppercase">固定初始核心詞條</label>
            {pinnedTraitId && (
              <button
                id="btn-clear-pinned"
                type="button"
                onClick={() => onSelectPinnedTrait('')}
                className="text-[11px] font-mono flex items-center gap-0.5 border border-black px-1 hover:bg-black hover:text-white cursor-pointer"
              >
                <X size={10} />
                <span>解除固定</span>
              </button>
            )}
          </div>
          <select
            id="select-pinned-trait"
            value={pinnedTraitId}
            onChange={(e) => onSelectPinnedTrait(e.target.value)}
            className="w-full border border-black bg-white p-2 text-xs font-medium text-black focus:outline-none cursor-pointer"
          >
            <option value="">-- 不指定（隨機核心） --</option>
            {axes.map((axis) => {
              const axisTraits = traits.filter((t) => t.axis === axis.name);
              if (axisTraits.length === 0) return null;
              return (
                <optgroup key={axis.id} label={`【${axis.name}】`}>
                  {axisTraits.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-4 border-t-2 border-black">
        {lockedCount > 0 && (
          <div
            id="status-locked-traits-info"
            className="flex items-center gap-1.5 p-2 border border-black bg-neutral-100 text-xs font-mono font-bold text-black"
          >
            <Lock size={13} className="shrink-0" />
            <span>已鎖定 {lockedCount} 個詞條（抽取時將予以保留）</span>
          </div>
        )}

        <button
          id="btn-generate-oc"
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full py-4 border-2 border-black bg-black text-white hover:bg-white hover:text-black font-black text-base tracking-widest transition-colors cursor-pointer flex items-center justify-center gap-2 active:translate-y-0.5"
        >
          {isGenerating ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span>抽取中...</span>
            </>
          ) : (
            <>
              <BotMessageSquare size={18} />
              <span>抽取設定</span>
            </>
          )}
        </button>

        <button
          id="btn-reset-conditions"
          type="button"
          onClick={() => {
            onClearAxes();
            onSelectPinnedTrait('');
            onChangeTraitCount(5);
          }}
          className="w-full py-2 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
        >
          重設所有指定條件
        </button>
      </div>
    </aside>
  );
};
