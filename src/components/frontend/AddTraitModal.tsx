import React, { useState, useMemo } from 'react';
import { Plus, X, Search, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { Dataset, ExtractedTraitItem, IntensityLevel, ALL_INTENSITIES, Trait } from '../../types';
import { isHardExcluded } from '../../lib/generator';

interface AddTraitModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  presentTraits: ExtractedTraitItem[];
  onConfirmAdd: (trait: Trait, intensity: IntensityLevel, locked: boolean) => void;
}

export const AddTraitModal: React.FC<AddTraitModalProps> = ({
  isOpen,
  onClose,
  dataset,
  presentTraits,
  onConfirmAdd,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAxisFilter, setSelectedAxisFilter] = useState('ALL');
  const [candidateTrait, setCandidateTrait] = useState<Trait | null>(null);
  const [candidateIntensity, setCandidateIntensity] = useState<IntensityLevel>('中等');
  const [candidateLock, setCandidateLock] = useState(false);

  // Trait IDs currently in result
  const presentTraitIds = useMemo(() => {
    return new Set(presentTraits.map((t) => t.trait.id));
  }, [presentTraits]);

  // Filtered traits based on keyword and axis
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

  // Check hard exclusions with existing traits
  const checkCandidateConflicts = (trait: Trait) => {
    for (const item of presentTraits) {
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

  const handleConfirm = () => {
    if (!candidateTrait) return;
    onConfirmAdd(candidateTrait, candidateIntensity, candidateLock);
    onClose();
    setCandidateTrait(null);
    setCandidateIntensity('中等');
    setCandidateLock(false);
  };

  if (!isOpen) return null;

  return (
    <div
      id="modal-add-trait"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
            onClick={onClose}
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
                      <span className="text-[10px] font-mono border border-black px-1.5 py-0.5">
                        {t.axis}
                      </span>
                      {isPresent && (
                        <span className="text-[10px] font-mono bg-neutral-300 text-neutral-700 px-1 py-0.5">
                          已在角色中
                        </span>
                      )}
                      {conflict && !isPresent && (
                        <span className="text-[10px] font-mono bg-amber-100 text-amber-900 border border-amber-600 px-1.5 py-0.5 flex items-center gap-1">
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
            onClick={onClose}
            className="px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            id="btn-confirm-add-trait"
            type="button"
            disabled={!candidateTrait}
            onClick={handleConfirm}
            className="px-4 py-1.5 border border-black bg-black text-white text-xs font-black hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>確認加入抽取結果</span>
          </button>
        </div>
      </div>
    </div>
  );
};
