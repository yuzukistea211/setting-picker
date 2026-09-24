import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw, Check, Sliders } from 'lucide-react';
import { MetricDefinition } from '../../types';
import { DEFAULT_METRIC_DEFINITIONS } from '../../lib/storage';

interface MetricManagementModalProps {
  isOpen: boolean;
  metricDefinitions: MetricDefinition[];
  onSave: (updatedMetrics: MetricDefinition[]) => void;
  onClose: () => void;
}

export const MetricManagementModal: React.FC<MetricManagementModalProps> = ({
  isOpen,
  metricDefinitions,
  onSave,
  onClose,
}) => {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [newMetricName, setNewMetricName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMetrics([...metricDefinitions]);
      setNewMetricName('');
    }
  }, [isOpen, metricDefinitions]);

  if (!isOpen) return null;

  const handleAddMetric = () => {
    const trimmed = newMetricName.trim();
    if (!trimmed) return;
    const newMetric: MetricDefinition = {
      id: `metric-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: trimmed,
    };
    setMetrics((prev) => [...prev, newMetric]);
    setNewMetricName('');
  };

  const handleRenameMetric = (id: string, newName: string) => {
    setMetrics((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: newName } : m)),
    );
  };

  const handleDeleteMetric = (id: string) => {
    if (metrics.length <= 1) return; // Keep at least one metric
    setMetrics((prev) => prev.filter((m) => m.id !== id));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setMetrics((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= metrics.length - 1) return;
    setMetrics((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleResetDefaults = () => {
    setMetrics([...DEFAULT_METRIC_DEFINITIONS]);
  };

  const handleSave = () => {
    // Filter out empty names
    const cleaned = metrics
      .map((m) => ({ ...m, name: m.name.trim() }))
      .filter((m) => m.name.length > 0);

    if (cleaned.length === 0) return;
    onSave(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        id="modal-metric-management"
        className="w-full max-w-lg flex flex-col bg-white border-2 border-black text-black overflow-hidden shadow-none max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 border border-black bg-black text-white font-bold flex items-center gap-1">
              <Sliders size={12} />
              <span>METRICS</span>
            </span>
            <h2 className="font-bold text-base tracking-tight">自訂數值指標名稱</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border border-black hover:bg-black hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4">
          <p className="text-xs text-neutral-600">
            自訂關係網中的數值維度名稱（範圍為 -120 到 +120）。您可以自由新增、重新命名、調整排序或移除指標。
          </p>

          {/* Add New Metric */}
          <div className="flex items-center gap-2 border border-black p-2.5 bg-neutral-50">
            <input
              id="input-new-metric-name"
              type="text"
              value={newMetricName}
              onChange={(e) => setNewMetricName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMetric();
                }
              }}
              placeholder="輸入新指標名稱（例：默契度、佔有欲、敵意）"
              className="flex-1 border border-black px-2 py-1.5 text-xs bg-white font-bold"
            />
            <button
              id="btn-add-metric-submit"
              type="button"
              onClick={handleAddMetric}
              disabled={!newMetricName.trim()}
              className="flex items-center gap-1 px-3 py-1.5 border border-black bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Plus size={14} />
              <span>新增指標</span>
            </button>
          </div>

          {/* Metrics List */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono font-bold text-neutral-700">
              目前指標列表 ({metrics.length})
            </label>

            <div className="flex flex-col gap-1.5 max-h-[320px] overflow-y-auto pr-1">
              {metrics.map((metric, index) => (
                <div
                  key={metric.id}
                  className="flex items-center gap-2 border border-black p-2 bg-white"
                >
                  <span className="font-mono text-xs text-neutral-500 w-5 text-center">
                    {index + 1}
                  </span>

                  <input
                    type="text"
                    value={metric.name}
                    onChange={(e) => handleRenameMetric(metric.id, e.target.value)}
                    className="flex-1 border border-black px-2 py-1 text-xs font-bold bg-neutral-50 focus:bg-white"
                    placeholder="指標名稱"
                  />

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 border border-black text-neutral-700 hover:bg-black hover:text-white disabled:opacity-30 cursor-pointer"
                      title="上移"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === metrics.length - 1}
                      className="p-1 border border-black text-neutral-700 hover:bg-black hover:text-white disabled:opacity-30 cursor-pointer"
                      title="下移"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMetric(metric.id)}
                      disabled={metrics.length <= 1}
                      className="p-1 border border-black text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-30 cursor-pointer"
                      title="刪除"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black p-3 bg-white flex items-center justify-between">
          <button
            id="btn-reset-metric-defaults"
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1 px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>恢復預設指標</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="btn-cancel-metrics-modal"
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 cursor-pointer"
            >
              取消
            </button>
            <button
              id="btn-save-metrics-modal"
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1 px-4 py-1.5 border-2 border-black bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer"
            >
              <Check size={14} />
              <span>儲存變更</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
