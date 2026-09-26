import React, { useState, useMemo } from 'react';
import { X, Download, Trash2, Check, Search, CheckSquare, Square, Layers, AlertCircle } from 'lucide-react';
import { Dataset } from '../types';
import { createPartialDataset, downloadDatasetAsJson, bulkDeleteTraits } from '../lib/datasetExport';

interface ExportPartialModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onSaveDataset: (updated: Dataset) => void;
  onNotify?: (message: string, type: 'success' | 'error') => void;
}

export const ExportPartialModal: React.FC<ExportPartialModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onSaveDataset,
  onNotify,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeRules, setIncludeRules] = useState<boolean>(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Group traits by axis
  const traitsByAxis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<string, typeof dataset.traits>();

    dataset.axes.forEach((axis) => {
      const traits = dataset.traits.filter((t) => {
        if (t.axis !== axis.name) return false;
        if (!q) return true;
        return t.name.toLowerCase().includes(q) || t.axis.toLowerCase().includes(q);
      });
      if (traits.length > 0) {
        map.set(axis.name, traits);
      }
    });

    return map;
  }, [dataset, searchQuery]);

  // All filtered trait ids
  const allFilteredTraitIds = useMemo(() => {
    const ids: string[] = [];
    traitsByAxis.forEach((traits) => {
      traits.forEach((t) => ids.push(t.id));
    });
    return ids;
  }, [traitsByAxis]);

  if (!isOpen) return null;

  // Toggle single trait
  const handleToggleTrait = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all traits in an axis
  const handleToggleAxis = (axisName: string) => {
    const axisTraits = traitsByAxis.get(axisName) || [];
    const allSelected = axisTraits.every((t) => selectedIds.has(t.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      axisTraits.forEach((t) => {
        if (allSelected) {
          next.delete(t.id);
        } else {
          next.add(t.id);
        }
      });
      return next;
    });
  };

  // Select all filtered traits
  const handleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allFilteredTraitIds.forEach((id) => next.add(id));
      return next;
    });
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Computed count of rules between selected traits
  const matchedRulesCount = useMemo(() => {
    if (selectedIds.size < 2) return 0;
    const co = dataset.cooccurrenceRules.filter(
      (r) => selectedIds.has(r.traitAId) && selectedIds.has(r.traitBId)
    ).length;
    const soft = dataset.softExclusions.filter(
      (s) => selectedIds.has(s.traitAId) && selectedIds.has(s.traitBId)
    ).length;
    const hard = dataset.hardExclusions.filter(
      (h) => selectedIds.has(h.traitAId) && selectedIds.has(h.traitBId)
    ).length;
    return co + soft + hard;
  }, [dataset, selectedIds]);

  // Handle Export
  const handleExport = () => {
    if (selectedIds.size === 0) return;
    const partialDataset = createPartialDataset(dataset, selectedIds, { includeRules });
    downloadDatasetAsJson(
      partialDataset,
      `oc_traits_partial_${new Date().toISOString().slice(0, 10)}.json`
    );
    onNotify?.(`已成功匯出包含 ${selectedIds.size} 個詞條的部分詞庫檔案。`, 'success');
    onClose();
  };

  // Handle Bulk Delete
  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const { updatedDataset, deletedCount, deletedRulesCount } = bulkDeleteTraits(dataset, selectedIds);
    onSaveDataset(updatedDataset);
    setShowDeleteConfirm(false);
    setSelectedIds(new Set());
    onNotify?.(
      `已批量刪除 ${deletedCount} 個詞條及其關聯的 ${deletedRulesCount} 條規則。`,
      'success'
    );
    onClose();
  };

  return (
    <div
      id="export-partial-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="export-partial-modal"
        className="w-full max-w-2xl bg-white border-2 border-black flex flex-col max-h-[90vh] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-partial-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3 bg-(--main-color)">
          <div className="flex items-center gap-2">
            <span className="p-1 border border-black bg-black text-white">
              <Download size={16} />
            </span>
            <h2 id="export-partial-title" className="font-black text-sm tracking-wide">
              匯出部分詞庫 / 批量管理
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

        {/* Search & Selection Controls */}
        <div className="p-3 border-b border-black flex flex-col gap-2.5 bg-neutral-50 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋欲選取之詞條或軸線..."
                className="w-full border border-black px-2.5 py-1.5 pl-7 text-xs bg-white focus:outline-none"
              />
              <Search size={13} className="absolute left-2 top-2.5 text-neutral-500 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer transition-colors"
              >
                <CheckSquare size={13} />
                <span>全選目前</span>
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="flex items-center gap-1 px-2.5 py-1.5 border border-black bg-white hover:bg-black hover:text-white font-bold cursor-pointer transition-colors"
              >
                <Square size={13} />
                <span>清空選擇</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-black/10">
            <div className="flex items-center gap-2">
              <span className="font-bold">
                已選取 <span className="underline font-black text-black">{selectedIds.size}</span> / {dataset.traits.length} 個詞條
              </span>
              {selectedIds.size > 1 && (
                <span className="text-[11px] text-neutral-600">
                  （含 {matchedRulesCount} 條關聯規則）
                </span>
              )}
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none text-[11px]">
              <input
                type="checkbox"
                checked={includeRules}
                onChange={(e) => setIncludeRules(e.target.checked)}
                className="accent-black cursor-pointer"
              />
              <span>包含選取詞條間之共生與排除規則</span>
            </label>
          </div>
        </div>

        {/* Trait Selection List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs font-mono">
          {traitsByAxis.size === 0 ? (
            <div className="p-8 text-center text-neutral-500">查無符合搜尋條件之詞條。</div>
          ) : (
            Array.from(traitsByAxis.entries()).map(([axisName, traits]) => {
              const allAxisSelected = traits.every((t) => selectedIds.has(t.id));
              const someAxisSelected = traits.some((t) => selectedIds.has(t.id));

              return (
                <div key={axisName} className="border border-black flex flex-col bg-white">
                  {/* Axis Header */}
                  <div
                    onClick={() => handleToggleAxis(axisName)}
                    className="p-2 border-b border-black bg-neutral-100 flex items-center justify-between cursor-pointer hover:bg-neutral-200 select-none font-bold"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allAxisSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someAxisSelected && !allAxisSelected;
                        }}
                        onChange={() => {}} // handled by parent onClick
                        className="accent-black cursor-pointer pointer-events-none"
                      />
                      <span>{axisName}</span>
                    </div>
                    <span className="text-[11px] text-neutral-600">
                      {traits.filter((t) => selectedIds.has(t.id)).length} / {traits.length} 詞條
                    </span>
                  </div>

                  {/* Traits Grid */}
                  <div className="p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {traits.map((t) => {
                      const isChecked = selectedIds.has(t.id);
                      return (
                        <label
                          key={t.id}
                          className={`flex items-center gap-2 p-1.5 border transition-colors cursor-pointer select-none ${
                            isChecked
                              ? 'border-black bg-black text-white font-bold'
                              : 'border-neutral-300 hover:border-black bg-white text-black'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleTrait(t.id)}
                            className="accent-black cursor-pointer"
                          />
                          <span className="truncate text-xs">{t.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Delete Confirmation Box */}
        {showDeleteConfirm && (
          <div className="border-t-2 border-rose-800 bg-rose-50 p-3 flex flex-col gap-2 text-xs font-mono text-rose-950 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertCircle size={16} />
              <span>確認批量刪除？</span>
            </div>
            <p>
              即將永久刪除所選取的 <span className="font-bold underline">{selectedIds.size}</span> 個詞條，以及所有包含這些詞條的共生權重與排除規則。此操作無法復原。
            </p>
            <div className="flex items-center justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1 border border-black bg-white hover:bg-neutral-100 font-bold cursor-pointer"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-4 py-1 border border-rose-900 bg-rose-700 text-white font-bold hover:bg-rose-800 cursor-pointer"
              >
                確認刪除 {selectedIds.size} 個詞條
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t-2 border-black p-3 bg-neutral-100">
          <div>
            {selectedIds.size > 0 && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-800 text-rose-800 hover:bg-rose-800 hover:text-white font-bold text-xs transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>批量刪除 ({selectedIds.size})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-black bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              關閉
            </button>
            <button
              id="btn-confirm-export-partial"
              type="button"
              disabled={selectedIds.size === 0}
              onClick={handleExport}
              className={`flex items-center gap-1.5 px-5 py-1.5 border-2 border-black text-xs font-black transition-colors ${
                selectedIds.size > 0
                  ? 'bg-black text-white hover:bg-neutral-800 cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 border-neutral-400 cursor-not-allowed'
              }`}
            >
              <Download size={14} />
              <span>匯出部分詞庫 ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
