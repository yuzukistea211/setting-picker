import React from 'react';
import { Lock, Unlock, Trash2 } from 'lucide-react';
import { ExtractedTraitItem, IntensityLevel, ALL_INTENSITIES } from '../../types';

export function getIntensityBadgeClass(intensity: IntensityLevel): string {
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
      return 'bg-white text-neutral-600 border border-neutral-400/50';
    default:
      return 'border border-black';
  }
}

interface TraitCardProps {
  item: ExtractedTraitItem;
  index: number;
  onUpdateIntensity: (traitIndex: number, newIntensity: IntensityLevel) => void;
  onToggleLock: (traitIndex: number) => void;
  onRemove: (traitIndex: number) => void;
}

export const TraitCard: React.FC<TraitCardProps> = ({
  item,
  index,
  onUpdateIntensity,
  onToggleLock,
  onRemove,
}) => {
  const isLocked = !!item.locked;

  return (
    <div
      id={`card-trait-${item.trait.id}`}
      className={`border-2 border-black p-3.5 bg-white flex flex-col justify-between gap-3 transition-shadow ${
        isLocked ? 'ring-2 ring-black bg-neutral-50/70 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : ''
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          {/* Interactive Intensity Select Dropdown */}
          <div className="flex items-center gap-1">
            <label htmlFor={`select-intensity-${index}`} className="sr-only">
              詞條強度
            </label>
            <select
              id={`select-intensity-${index}`}
              value={item.intensity}
              onChange={(e) => onUpdateIntensity(index, e.target.value as IntensityLevel)}
              title="點擊更改詞條強度"
              className={`text-xs px-2 py-0.5 tracking-wider cursor-pointer outline-none transition-colors ${getIntensityBadgeClass(
                item.intensity,
              )}`}
            >
              {ALL_INTENSITIES.map((lvl) => (
                <option key={lvl} value={lvl} className="bg-white text-black font-normal">
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
              id={`btn-lock-trait-${index}`}
              type="button"
              onClick={() => onToggleLock(index)}
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
              id={`btn-remove-trait-${index}`}
              type="button"
              onClick={() => onRemove(index)}
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
};
