import React, { useState, useEffect } from 'react';
import { X, Trash2, Check, ArrowRight, Plus, Sliders } from 'lucide-react';
import {
  CharacterRelationship,
  NetworkCharacter,
  RelationshipMetrics,
  MetricDefinition,
} from '../../types';
import { MetricBarSlider } from './MetricBarSlider';

interface RelationshipModalProps {
  isOpen: boolean;
  relationship: CharacterRelationship | null;
  characters: NetworkCharacter[];
  metricDefinitions: MetricDefinition[];
  initialSourceId?: string;
  initialTargetId?: string;
  onSave: (rel: CharacterRelationship) => void;
  onDelete?: (relId: string) => void;
  onClose: () => void;
  onUpdateMetricDefinitions?: (newDefs: MetricDefinition[]) => void;
  onOpenMetricSettings?: () => void;
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  relationship,
  characters,
  metricDefinitions,
  initialSourceId,
  initialTargetId,
  onSave,
  onDelete,
  onClose,
  onUpdateMetricDefinitions,
  onOpenMetricSettings,
}) => {
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');
  const [surfaceRelation, setSurfaceRelation] = useState<string>('');
  const [sourceToTargetThought, setSourceToTargetThought] = useState<string>('');
  const [targetToSourceThought, setTargetToSourceThought] = useState<string>('');
  const [sourceToTargetMetrics, setSourceToTargetMetrics] = useState<RelationshipMetrics>({});
  const [targetToSourceMetrics, setTargetToSourceMetrics] = useState<RelationshipMetrics>({});
  const [isAddingMetricInline, setIsAddingMetricInline] = useState<boolean>(false);
  const [inlineMetricName, setInlineMetricName] = useState<string>('');

  useEffect(() => {
    if (relationship) {
      setSourceId(relationship.sourceId);
      setTargetId(relationship.targetId);
      setSurfaceRelation(relationship.surfaceRelation || '');
      setSourceToTargetThought(relationship.sourceToTargetThought || '');
      setTargetToSourceThought(relationship.targetToSourceThought || '');
      setSourceToTargetMetrics({ ...(relationship.sourceToTargetMetrics || {}) });
      setTargetToSourceMetrics({ ...(relationship.targetToSourceMetrics || {}) });
    } else {
      const firstChar = characters[0]?.id || '';
      const secondChar = characters[1]?.id || characters[0]?.id || '';
      setSourceId(initialSourceId || firstChar);
      setTargetId(initialTargetId || (initialSourceId === secondChar ? firstChar : secondChar));
      setSurfaceRelation('');
      setSourceToTargetThought('');
      setTargetToSourceThought('');
      
      const initialMetrics: RelationshipMetrics = {};
      metricDefinitions.forEach((m) => {
        initialMetrics[m.id] = 0;
      });
      setSourceToTargetMetrics({ ...initialMetrics });
      setTargetToSourceMetrics({ ...initialMetrics });
    }
  }, [relationship, isOpen, initialSourceId, initialTargetId, characters, metricDefinitions]);

  if (!isOpen) return null;

  const charA = characters.find((c) => c.id === sourceId);
  const charB = characters.find((c) => c.id === targetId);

  const charAName = charA?.name || '角色A';
  const charBName = charB?.name || '角色B';

  const handleMetricChange = (
    direction: 'sourceToTarget' | 'targetToSource',
    metricId: string,
    val: number,
  ) => {
    if (direction === 'sourceToTarget') {
      setSourceToTargetMetrics((prev) => ({
        ...prev,
        [metricId]: val,
      }));
    } else {
      setTargetToSourceMetrics((prev) => ({
        ...prev,
        [metricId]: val,
      }));
    }
  };

  const handleRenameMetric = (metricId: string, newName: string) => {
    if (!onUpdateMetricDefinitions) return;
    const updated = metricDefinitions.map((m) =>
      m.id === metricId ? { ...m, name: newName } : m,
    );
    onUpdateMetricDefinitions(updated);
  };

  const handleDeleteMetric = (metricId: string) => {
    if (!onUpdateMetricDefinitions || metricDefinitions.length <= 1) return;
    const updated = metricDefinitions.filter((m) => m.id !== metricId);
    onUpdateMetricDefinitions(updated);
  };

  const handleCreateNewMetric = () => {
    const trimmed = inlineMetricName.trim();
    if (!trimmed || !onUpdateMetricDefinitions) return;
    const newId = `metric-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newMetric: MetricDefinition = {
      id: newId,
      name: trimmed,
    };
    onUpdateMetricDefinitions([...metricDefinitions, newMetric]);
    setSourceToTargetMetrics((prev) => ({ ...prev, [newId]: 0 }));
    setTargetToSourceMetrics((prev) => ({ ...prev, [newId]: 0 }));
    setInlineMetricName('');
    setIsAddingMetricInline(false);
  };

  const handleSave = () => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    const updated: CharacterRelationship = {
      id: relationship?.id || `rel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceId,
      targetId,
      surfaceRelation: surfaceRelation.trim() || '關係',
      sourceToTargetThought: sourceToTargetThought.trim(),
      targetToSourceThought: targetToSourceThought.trim(),
      sourceToTargetMetrics,
      targetToSourceMetrics,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        id="modal-relationship-editor"
        className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white border-2 border-black text-black overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 border border-black bg-black text-white font-bold">
              RELATION
            </span>
            <h2 className="font-bold text-base tracking-tight">
              {relationship ? '編輯關係資料' : '新增關係資料'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border border-black hover:bg-black hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Character Selection (if creating new) */}
          {!relationship ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-black p-3 bg-neutral-50">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold font-mono">角色 A</label>
                <select
                  id="select-rel-source"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="border border-black bg-white px-2 py-1 text-sm font-bold"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.id === targetId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold font-mono">角色 B</label>
                <select
                  id="select-rel-target"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="border border-black bg-white px-2 py-1 text-sm font-bold"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id} disabled={c.id === sourceId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 border border-black py-2 bg-neutral-50 font-bold text-sm">
              <span className="px-3 py-0.5 border border-black bg-white">{charAName}</span>
              <span className="font-mono text-neutral-500">⇄</span>
              <span className="px-3 py-0.5 border border-black bg-white">{charBName}</span>
            </div>
          )}

          {/* Surface Relationship Input */}
          <div className="border border-black p-3 bg-white flex flex-col gap-1.5">
            <label className="text-xs font-bold font-mono">表層關係</label>
            <input
              id="input-surface-relation"
              type="text"
              value={surfaceRelation}
              onChange={(e) => setSurfaceRelation(e.target.value)}
              placeholder="例如：朋友、宿敵、同僚、搭檔"
              className="border border-black px-3 py-1.5 text-sm bg-neutral-50 font-medium"
            />
          </div>

          {/* Metric Management Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border border-black p-2 bg-neutral-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold">自訂數值指標 (-120 ~ +120)</span>
              <span className="text-[11px] font-mono border border-black px-1.5 bg-white">
                {metricDefinitions.length} 個維度
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isAddingMetricInline ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={inlineMetricName}
                    onChange={(e) => setInlineMetricName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewMetric();
                      } else if (e.key === 'Escape') {
                        setIsAddingMetricInline(false);
                      }
                    }}
                    placeholder="輸入新指標名稱"
                    autoFocus
                    className="border border-black px-2 py-0.5 text-xs bg-white font-bold w-36"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewMetric}
                    disabled={!inlineMetricName.trim()}
                    className="px-2 py-0.5 border border-black bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                  >
                    確定
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingMetricInline(false)}
                    className="px-1.5 py-0.5 border border-black bg-white text-xs hover:bg-neutral-100 cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingMetricInline(true)}
                  className="flex items-center gap-1 px-2.5 py-1 border border-black bg-white text-xs font-bold hover:bg-black hover:text-white cursor-pointer"
                >
                  <Plus size={12} />
                  <span>新增指標</span>
                </button>
              )}

              {onOpenMetricSettings && (
                <button
                  type="button"
                  onClick={onOpenMetricSettings}
                  className="flex items-center gap-1 px-2.5 py-1 border border-black bg-white text-xs font-bold hover:bg-black hover:text-white cursor-pointer"
                >
                  <Sliders size={12} />
                  <span>管理指標名稱</span>
                </button>
              )}
            </div>
          </div>

          {/* Directional Real Thoughts & Customizable Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: A -> B */}
            <div
              id="section-source-to-target"
              className="border-2 border-black p-3.5 bg-white flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 border-b border-black pb-2 font-bold text-sm">
                <span className="px-2 py-0.5 bg-black text-white text-xs">{charAName}</span>
                <ArrowRight size={14} />
                <span className="px-2 py-0.5 border border-black text-xs">{charBName}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold font-mono">
                  {charAName} 對 {charBName} 的真實想法
                </label>
                <input
                  id="input-source-to-target-thought"
                  type="text"
                  value={sourceToTargetThought}
                  onChange={(e) => setSourceToTargetThought(e.target.value)}
                  placeholder="例如：不太熟的朋友的朋友"
                  className="border border-black px-2.5 py-1 text-xs bg-neutral-50"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {metricDefinitions.map((metric) => (
                  <MetricBarSlider
                    key={`s-${metric.id}`}
                    id={`s-${metric.id}`}
                    name={metric.name}
                    value={sourceToTargetMetrics[metric.id] ?? 0}
                    onChange={(v) => handleMetricChange('sourceToTarget', metric.id, v)}
                    onRename={(newName) => handleRenameMetric(metric.id, newName)}
                    onDelete={
                      metricDefinitions.length > 1
                        ? () => handleDeleteMetric(metric.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>

            {/* Column 2: B -> A */}
            <div
              id="section-target-to-source"
              className="border-2 border-black p-3.5 bg-white flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 border-b border-black pb-2 font-bold text-sm">
                <span className="px-2 py-0.5 bg-black text-white text-xs">{charBName}</span>
                <ArrowRight size={14} />
                <span className="px-2 py-0.5 border border-black text-xs">{charAName}</span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold font-mono">
                  {charBName} 對 {charAName} 的真實想法
                </label>
                <input
                  id="input-target-to-source-thought"
                  type="text"
                  value={targetToSourceThought}
                  onChange={(e) => setTargetToSourceThought(e.target.value)}
                  placeholder="例如：好朋友"
                  className="border border-black px-2.5 py-1 text-xs bg-neutral-50"
                />
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {metricDefinitions.map((metric) => (
                  <MetricBarSlider
                    key={`t-${metric.id}`}
                    id={`t-${metric.id}`}
                    name={metric.name}
                    value={targetToSourceMetrics[metric.id] ?? 0}
                    onChange={(v) => handleMetricChange('targetToSource', metric.id, v)}
                    onRename={(newName) => handleRenameMetric(metric.id, newName)}
                    onDelete={
                      metricDefinitions.length > 1
                        ? () => handleDeleteMetric(metric.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t-2 border-black p-3 bg-white flex items-center justify-between">
          <div>
            {relationship && onDelete && (
              <button
                id="btn-delete-relationship"
                type="button"
                onClick={() => {
                  onDelete(relationship.id);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 border border-black text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white cursor-pointer"
              >
                <Trash2 size={14} />
                <span>刪除關係</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-cancel-rel-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 cursor-pointer"
            >
              取消
            </button>
            <button
              id="btn-save-relationship"
              type="button"
              onClick={handleSave}
              disabled={!sourceId || !targetId || sourceId === targetId}
              className="flex items-center gap-1 px-5 py-1.5 border-2 border-black bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
            >
              <Check size={14} />
              <span>儲存關係</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

