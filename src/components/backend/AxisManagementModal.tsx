import React, { useState } from 'react';
import { X, Plus, Edit2, Trash2, Check, Tag } from 'lucide-react';
import { AxisDefinition, Dataset } from '../../types';

interface AxisManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  onSaveDataset: (updated: Dataset) => void;
}

export const AxisManagementModal: React.FC<AxisManagementModalProps> = ({
  isOpen,
  onClose,
  dataset,
  onSaveDataset,
}) => {
  const [newAxisName, setNewAxisName] = useState('');
  const [editingAxisId, setEditingAxisId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Add Axis
  const handleAddAxis = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAxisName.trim();
    if (!trimmed) return;

    if (dataset.axes.some((a) => a.name === trimmed)) {
      setErrorMsg(`軸線「${trimmed}」已存在！`);
      return;
    }

    const newAxis: AxisDefinition = {
      id: `axis-${Date.now()}`,
      name: trimmed,
    };

    onSaveDataset({
      ...dataset,
      axes: [...dataset.axes, newAxis],
    });

    setNewAxisName('');
    setErrorMsg('');
  };

  // Start Editing Axis
  const handleStartEdit = (axis: AxisDefinition) => {
    setEditingAxisId(axis.id);
    setEditingName(axis.name);
    setErrorMsg('');
  };

  // Save Renamed Axis
  const handleSaveEdit = (axisId: string, oldName: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;

    if (trimmed !== oldName && dataset.axes.some((a) => a.name === trimmed)) {
      setErrorMsg(`軸線「${trimmed}」已存在！`);
      return;
    }

    // Update axis list
    const updatedAxes = dataset.axes.map((a) =>
      a.id === axisId ? { ...a, name: trimmed } : a,
    );

    // Also update all traits belonging to this axis
    const updatedTraits = dataset.traits.map((t) =>
      t.axis === oldName ? { ...t, axis: trimmed } : t,
    );

    onSaveDataset({
      ...dataset,
      axes: updatedAxes,
      traits: updatedTraits,
    });

    setEditingAxisId(null);
    setErrorMsg('');
  };

  // Delete Axis
  const handleDeleteAxis = (axis: AxisDefinition) => {
    const traitsInAxis = dataset.traits.filter((t) => t.axis === axis.name);
    if (traitsInAxis.length > 0) {
      if (
        !window.confirm(
          `該軸線下尚有 ${traitsInAxis.length} 個詞條（如：${traitsInAxis[0].name}）。刪除後這些詞條將被移至「未分類」。確定刪除嗎？`,
        )
      ) {
        return;
      }
    }

    // Ensure there's an "未分類" axis if traits were in the deleted axis
    let updatedAxes = dataset.axes.filter((a) => a.id !== axis.id);
    let fallbackAxisName = '未分類';
    if (traitsInAxis.length > 0 && !updatedAxes.some((a) => a.name === fallbackAxisName)) {
      updatedAxes.push({ id: `axis-${Date.now()}`, name: fallbackAxisName });
    }

    const updatedTraits = dataset.traits.map((t) =>
      t.axis === axis.name ? { ...t, axis: fallbackAxisName } : t,
    );

    onSaveDataset({
      ...dataset,
      axes: updatedAxes,
      traits: updatedTraits,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-black max-w-lg w-full p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <Tag size={18} />
            <h3 className="font-black text-sm uppercase tracking-wider">
              添加 / 修改軸線標籤
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-black p-1 hover:bg-black hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="bg-rose-100 border border-rose-800 text-rose-900 text-xs p-2 font-bold">
            {errorMsg}
          </div>
        )}

        {/* Add New Axis Form */}
        <form onSubmit={handleAddAxis} className="flex gap-2">
          <input
            type="text"
            required
            value={newAxisName}
            onChange={(e) => setNewAxisName(e.target.value)}
            placeholder="輸入新軸線標籤名稱 (例如：依附模式、道德抉擇)..."
            className="border border-black px-3 py-1.5 text-xs flex-1 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-black text-white hover:bg-white hover:text-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>添加軸線</span>
          </button>
        </form>

        {/* Current Axes List */}
        <div className="border border-black p-3 max-h-80 overflow-y-auto flex flex-col gap-2">
          <div className="text-[11px] font-mono font-bold text-neutral-500 mb-1">
            現有軸線標籤清單 ({dataset.axes.length} 個)：
          </div>

          {dataset.axes.map((axis) => {
            const traitCount = dataset.traits.filter((t) => t.axis === axis.name).length;
            const isEditing = editingAxisId === axis.id;

            return (
              <div
                key={axis.id}
                className="border border-black p-2 bg-neutral-50 flex items-center justify-between gap-2"
              >
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="border border-black px-2 py-1 text-xs flex-1 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(axis.id, axis.name)}
                      className="border border-black p-1 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                      title="確認修改"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAxisId(null)}
                      className="border border-black p-1 hover:bg-neutral-200 cursor-pointer"
                      title="取消"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{axis.name}</span>
                      <span className="text-[10px] font-mono border border-black px-1.5 py-0.2 bg-white">
                        {traitCount} 詞條
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(axis)}
                        className="border border-black p-1 hover:bg-black hover:text-white cursor-pointer"
                        title="修改名稱"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAxis(axis)}
                        className="border border-black p-1 hover:bg-black hover:text-white cursor-pointer"
                        title="刪除軸線"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-black">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-black hover:bg-neutral-100 text-xs font-bold cursor-pointer"
          >
            完成關閉
          </button>
        </div>
      </div>
    </div>
  );
};
