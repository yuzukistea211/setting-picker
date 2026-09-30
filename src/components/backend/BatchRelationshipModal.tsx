import React, { useState, useMemo } from 'react';
import {
  X,
  Link2,
  Check,
  Trash2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  ShieldAlert,
  HelpCircle,
  Search,
  Filter,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  ALL_INTENSITIES,
  AxisDefinition,
  CooccurrenceRule,
  Dataset,
  HardExclusionRule,
  IntensityLevel,
  SoftExclusionRule,
  Trait,
} from '../../types';

interface BatchRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataset: Dataset;
  initialSelectedTraitIds: string[];
  onSaveDataset: (updated: Dataset) => void;
  onNotification?: (msg: string) => void;
}

type ModalTab = 'internal' | 'target' | 'manage';
type RuleType = 'hard' | 'soft' | 'cooc';

export const BatchRelationshipModal: React.FC<BatchRelationshipModalProps> = ({
  isOpen,
  onClose,
  dataset,
  initialSelectedTraitIds,
  onSaveDataset,
  onNotification,
}) => {
  // Active modal tab
  const [activeTab, setActiveTab] = useState<ModalTab>('internal');

  // Selected trait IDs for batch operations (can be adjusted inside modal)
  const [selectedTraitIds, setSelectedTraitIds] = useState<Set<string>>(() => new Set(initialSelectedTraitIds));
  const [showTraitPicker, setShowTraitPicker] = useState<boolean>(false);
  const [traitSearchQuery, setTraitSearchQuery] = useState<string>('');
  const [traitAxisFilter, setTraitAxisFilter] = useState<string>('all');

  // Tab 1: Internal Pairwise Options
  const [internalRuleType, setInternalRuleType] = useState<RuleType>('hard');
  const [internalHardReason, setInternalHardReason] = useState<string>('同類別互斥設定');
  const [internalSoftPenalty, setInternalSoftPenalty] = useState<number>(0.2);
  const [internalSoftNote, setInternalSoftNote] = useState<string>('同類衝突弱相容');
  const [internalCoocWeight, setInternalCoocWeight] = useState<number>(3);
  const [internalOverwrite, setInternalOverwrite] = useState<boolean>(true);

  // Tab 2: Link to Target Options
  const [targetScope, setTargetScope] = useState<'trait' | 'axis'>('trait');
  const [singleTargetTraitId, setSingleTargetTraitId] = useState<string>('');
  const [targetAxisName, setTargetAxisName] = useState<string>('');
  const [targetRuleType, setTargetRuleType] = useState<RuleType>('hard');
  const [targetHardReason, setTargetHardReason] = useState<string>('關聯邏輯互斥');
  const [targetSoftPenalty, setTargetSoftPenalty] = useState<number>(0.2);
  const [targetSoftNote, setTargetSoftNote] = useState<string>('弱相容關聯');
  const [targetCoocWeight, setTargetCoocWeight] = useState<number>(3);
  const [targetOverwrite, setTargetOverwrite] = useState<boolean>(true);
  const [targetSearchQuery, setTargetSearchQuery] = useState<string>('');

  // Tab 3: Manage / Inspect Existing Rules
  const [manageFilterType, setManageFilterType] = useState<'all' | 'internal' | 'hard' | 'soft' | 'cooc'>('all');
  const [selectedRuleKeys, setSelectedRuleKeys] = useState<Set<string>>(new Set());

  // Trait Lookup Map
  const traitMap = useMemo(() => {
    const map = new Map<string, Trait>();
    dataset.traits.forEach((t) => map.set(t.id, t));
    return map;
  }, [dataset.traits]);

  // Sync initialSelectedTraitIds when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTraitIds(new Set(initialSelectedTraitIds));
      if (dataset.axes.length > 0 && !targetAxisName) {
        setTargetAxisName(dataset.axes[0].name);
      }
      const otherTraits = dataset.traits.filter((t) => !initialSelectedTraitIds.includes(t.id));
      if (otherTraits.length > 0 && !singleTargetTraitId) {
        setSingleTargetTraitId(otherTraits[0].id);
      }
    }
  }, [isOpen, initialSelectedTraitIds, dataset.axes, dataset.traits]);

  if (!isOpen) return null;

  // Selected Trait Objects
  const selectedTraits = Array.from(selectedTraitIds)
    .map((id) => traitMap.get(id))
    .filter((t): t is Trait => !!t);

  // Pair calculation for internal tab
  const n = selectedTraits.length;
  const internalPairCount = (n * (n - 1)) / 2;

  // Target traits for tab 2
  const effectiveTargetTraits = (() => {
    if (targetScope === 'trait') {
      const t = traitMap.get(singleTargetTraitId);
      return t ? [t] : [];
    } else {
      return dataset.traits.filter((t) => t.axis === targetAxisName && !selectedTraitIds.has(t.id));
    }
  })();

  // Calculate pairs between selected traits and target traits
  const targetPairCount = selectedTraits.reduce((acc, tA) => {
    const validTargets = effectiveTargetTraits.filter((tB) => tB.id !== tA.id);
    return acc + validTargets.length;
  }, 0);

  // Existing Rules involving any selected traits
  interface EnrichedRule {
    key: string;
    type: 'hard' | 'soft' | 'cooc';
    id: string;
    traitAId: string;
    traitBId: string;
    traitA: Trait;
    traitB: Trait;
    isInternal: boolean;
    detail: string;
  }

  const existingRules = useMemo<EnrichedRule[]>(() => {
    const list: EnrichedRule[] = [];
    const isSel = (id: string) => selectedTraitIds.has(id);

    // Hard
    dataset.hardExclusions.forEach((h) => {
      if (isSel(h.traitAId) || isSel(h.traitBId)) {
        const tA = traitMap.get(h.traitAId) || { id: h.traitAId, name: h.traitAId, axis: '未知', baseWeight: 0, description: '' };
        const tB = traitMap.get(h.traitBId) || { id: h.traitBId, name: h.traitBId, axis: '未知', baseWeight: 0, description: '' };
        list.push({
          key: `hard-${h.id}`,
          type: 'hard',
          id: h.id,
          traitAId: h.traitAId,
          traitBId: h.traitBId,
          traitA: tA,
          traitB: tB,
          isInternal: isSel(h.traitAId) && isSel(h.traitBId),
          detail: h.reason || '邏輯互斥',
        });
      }
    });

    // Soft
    dataset.softExclusions.forEach((s) => {
      if (isSel(s.traitAId) || isSel(s.traitBId)) {
        const tA = traitMap.get(s.traitAId) || { id: s.traitAId, name: s.traitAId, axis: '未知', baseWeight: 0, description: '' };
        const tB = traitMap.get(s.traitBId) || { id: s.traitBId, name: s.traitBId, axis: '未知', baseWeight: 0, description: '' };
        list.push({
          key: `soft-${s.id}`,
          type: 'soft',
          id: s.id,
          traitAId: s.traitAId,
          traitBId: s.traitBId,
          traitA: tA,
          traitB: tB,
          isInternal: isSel(s.traitAId) && isSel(s.traitBId),
          detail: `懲罰乘數: ${s.penaltyMultiplier}${s.note ? ` (${s.note})` : ''}`,
        });
      }
    });

    // Cooccurrence
    dataset.cooccurrenceRules.forEach((c) => {
      if (isSel(c.traitAId) || isSel(c.traitBId)) {
        const tA = traitMap.get(c.traitAId) || { id: c.traitAId, name: c.traitAId, axis: '未知', baseWeight: 0, description: '' };
        const tB = traitMap.get(c.traitBId) || { id: c.traitBId, name: c.traitBId, axis: '未知', baseWeight: 0, description: '' };
        list.push({
          key: `cooc-${c.id}`,
          type: 'cooc',
          id: c.id,
          traitAId: c.traitAId,
          traitBId: c.traitBId,
          traitA: tA,
          traitB: tB,
          isInternal: isSel(c.traitAId) && isSel(c.traitBId),
          detail: `權重: ${c.weight > 0 ? `+${c.weight}` : c.weight}`,
        });
      }
    });

    return list;
  }, [dataset, selectedTraitIds, traitMap]);

  // Filtered existing rules in Manage tab
  const filteredExistingRules = useMemo(() => {
    return existingRules.filter((r) => {
      if (manageFilterType === 'internal') return r.isInternal;
      if (manageFilterType === 'hard') return r.type === 'hard';
      if (manageFilterType === 'soft') return r.type === 'soft';
      if (manageFilterType === 'cooc') return r.type === 'cooc';
      return true;
    });
  }, [existingRules, manageFilterType]);

  // Helper to remove any rules between a pair
  const isSamePair = (id1: string, id2: string, a: string, b: string) => {
    return (id1 === a && id2 === b) || (id1 === b && id2 === a);
  };

  // EXECUTE TAB 1: Internal Pairwise Apply
  const handleApplyInternalRules = () => {
    if (selectedTraits.length < 2) return;

    let updatedHard = [...dataset.hardExclusions];
    let updatedSoft = [...dataset.softExclusions];
    let updatedCooc = [...dataset.cooccurrenceRules];

    let createdCount = 0;

    for (let i = 0; i < selectedTraits.length; i++) {
      for (let j = i + 1; j < selectedTraits.length; j++) {
        const idA = selectedTraits[i].id;
        const idB = selectedTraits[j].id;

        if (internalOverwrite) {
          updatedHard = updatedHard.filter((r) => !isSamePair(r.traitAId, r.traitBId, idA, idB));
          updatedSoft = updatedSoft.filter((r) => !isSamePair(r.traitAId, r.traitBId, idA, idB));
          updatedCooc = updatedCooc.filter((r) => !isSamePair(r.traitAId, r.traitBId, idA, idB));
        }

        if (internalRuleType === 'hard') {
          updatedHard.push({
            id: `hard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            traitAId: idA,
            traitBId: idB,
            reason: internalHardReason.trim() || '批量互斥設定',
          });
        } else if (internalRuleType === 'soft') {
          updatedSoft.push({
            id: `soft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            traitAId: idA,
            traitBId: idB,
            penaltyMultiplier: internalSoftPenalty,
            note: internalSoftNote.trim() || '批量弱相容設定',
          });
        } else if (internalRuleType === 'cooc') {
          updatedCooc.push({
            id: `cooc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            traitAId: idA,
            traitBId: idB,
            weight: internalCoocWeight,
          });
        }
        createdCount++;
      }
    }

    const updatedDataset: Dataset = {
      ...dataset,
      updatedAt: Date.now(),
      hardExclusions: updatedHard,
      softExclusions: updatedSoft,
      cooccurrenceRules: updatedCooc,
    };

    onSaveDataset(updatedDataset);
    const typeLabel =
      internalRuleType === 'hard' ? '硬排除 (互斥)' : internalRuleType === 'soft' ? '軟排除 (弱相容)' : '共現加權';
    onNotification?.(`已成功為 ${selectedTraits.length} 個詞條彼此建立 ${createdCount} 組「${typeLabel}」關係！`);
    onClose();
  };

  // EXECUTE TAB 2: Link to Target Apply
  const handleApplyTargetRules = () => {
    if (selectedTraits.length === 0 || effectiveTargetTraits.length === 0) return;

    let updatedHard = [...dataset.hardExclusions];
    let updatedSoft = [...dataset.softExclusions];
    let updatedCooc = [...dataset.cooccurrenceRules];

    let createdCount = 0;

    selectedTraits.forEach((tA) => {
      effectiveTargetTraits.forEach((tB) => {
        if (tA.id === tB.id) return;
        const idA = tA.id;
        const idB = tB.id;

        if (targetOverwrite) {
          updatedHard = updatedHard.filter((r) => !isSamePair(r.traitAId, r.traitBId, idA, idB));
          updatedSoft = updatedSoft.filter((r) => !isSamePair(r.traitAId, r.traitBId, idA, idB));
          updatedCooc = updatedCooc.filter((r) => !isSamePair(r.traitAId, r.traitBId, idA, idB));
        }

        if (targetRuleType === 'hard') {
          updatedHard.push({
            id: `hard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            traitAId: idA,
            traitBId: idB,
            reason: targetHardReason.trim() || '批量互斥設定',
          });
        } else if (targetRuleType === 'soft') {
          updatedSoft.push({
            id: `soft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            traitAId: idA,
            traitBId: idB,
            penaltyMultiplier: targetSoftPenalty,
            note: targetSoftNote.trim() || '批量弱相容設定',
          });
        } else if (targetRuleType === 'cooc') {
          updatedCooc.push({
            id: `cooc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            traitAId: idA,
            traitBId: idB,
            weight: targetCoocWeight,
          });
        }
        createdCount++;
      });
    });

    const updatedDataset: Dataset = {
      ...dataset,
      updatedAt: Date.now(),
      hardExclusions: updatedHard,
      softExclusions: updatedSoft,
      cooccurrenceRules: updatedCooc,
    };

    onSaveDataset(updatedDataset);
    const targetLabel =
      targetScope === 'trait'
        ? `詞條「${effectiveTargetTraits[0]?.name || ''}」`
        : `軸線「${targetAxisName}」(${effectiveTargetTraits.length} 個詞條)`;
    const typeLabel =
      targetRuleType === 'hard' ? '硬排除' : targetRuleType === 'soft' ? '軟排除' : '共現加權';
    onNotification?.(`已成功將 ${selectedTraits.length} 個詞條與 ${targetLabel} 建立 ${createdCount} 組「${typeLabel}」關係！`);
    onClose();
  };

  // EXECUTE TAB 3: Delete Selected Rules
  const handleDeleteSelectedRules = () => {
    if (selectedRuleKeys.size === 0) return;

    const hardIdsToDelete = new Set<string>();
    const softIdsToDelete = new Set<string>();
    const coocIdsToDelete = new Set<string>();

    existingRules.forEach((r) => {
      if (selectedRuleKeys.has(r.key)) {
        if (r.type === 'hard') hardIdsToDelete.add(r.id);
        if (r.type === 'soft') softIdsToDelete.add(r.id);
        if (r.type === 'cooc') coocIdsToDelete.add(r.id);
      }
    });

    const updatedDataset: Dataset = {
      ...dataset,
      updatedAt: Date.now(),
      hardExclusions: dataset.hardExclusions.filter((h) => !hardIdsToDelete.has(h.id)),
      softExclusions: dataset.softExclusions.filter((s) => !softIdsToDelete.has(s.id)),
      cooccurrenceRules: dataset.cooccurrenceRules.filter((c) => !coocIdsToDelete.has(c.id)),
    };

    const count = selectedRuleKeys.size;
    onSaveDataset(updatedDataset);
    setSelectedRuleKeys(new Set());
    onNotification?.(`已成功批量刪除 ${count} 條詞條關係規則！`);
  };

  // Quick Clear Actions
  const handleQuickClear = (scope: 'internal_all' | 'all_hard' | 'all_soft' | 'all_cooc' | 'all_any') => {
    const isSel = (id: string) => selectedTraitIds.has(id);
    let updatedHard = dataset.hardExclusions;
    let updatedSoft = dataset.softExclusions;
    let updatedCooc = dataset.cooccurrenceRules;
    let desc = '';

    if (scope === 'internal_all') {
      updatedHard = updatedHard.filter((r) => !(isSel(r.traitAId) && isSel(r.traitBId)));
      updatedSoft = updatedSoft.filter((r) => !(isSel(r.traitAId) && isSel(r.traitBId)));
      updatedCooc = updatedCooc.filter((r) => !(isSel(r.traitAId) && isSel(r.traitBId)));
      desc = '已清除所選詞條之間的全部內部關係！';
    } else if (scope === 'all_hard') {
      updatedHard = updatedHard.filter((r) => !isSel(r.traitAId) && !isSel(r.traitBId));
      desc = '已清除所選詞條的所有硬排除規則！';
    } else if (scope === 'all_soft') {
      updatedSoft = updatedSoft.filter((r) => !isSel(r.traitAId) && !isSel(r.traitBId));
      desc = '已清除所選詞條的所有軟排除規則！';
    } else if (scope === 'all_cooc') {
      updatedCooc = updatedCooc.filter((r) => !isSel(r.traitAId) && !isSel(r.traitBId));
      desc = '已清除所選詞條的所有共現加權規則！';
    } else if (scope === 'all_any') {
      updatedHard = updatedHard.filter((r) => !isSel(r.traitAId) && !isSel(r.traitBId));
      updatedSoft = updatedSoft.filter((r) => !isSel(r.traitAId) && !isSel(r.traitBId));
      updatedCooc = updatedCooc.filter((r) => !isSel(r.traitAId) && !isSel(r.traitBId));
      desc = '已一鍵清空所選詞條的所有關係規則！';
    }

    const updatedDataset: Dataset = {
      ...dataset,
      updatedAt: Date.now(),
      hardExclusions: updatedHard,
      softExclusions: updatedSoft,
      cooccurrenceRules: updatedCooc,
    };

    onSaveDataset(updatedDataset);
    setSelectedRuleKeys(new Set());
    onNotification?.(desc);
  };

  // Toggle trait selection in picker
  const toggleTraitSelect = (id: string) => {
    setSelectedTraitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div
      id="modal-batch-relationship-backdrop"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-batch-relationship"
        className="w-full max-w-4xl max-h-[92vh] bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-rel-modal-title"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3 bg-(--main-color) shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1 border-2 border-black bg-black text-white">
              <Link2 size={16} />
            </span>
            <div>
              <h2 id="batch-rel-modal-title" className="font-black text-sm tracking-wider uppercase">
                批量管理詞條關係 (Batch Relationship Management)
              </h2>
              <div className="text-[11px] text-neutral-700 flex items-center gap-2 font-mono">
                <span>
                  當前操作受眾：<strong className="text-black font-black">{selectedTraitIds.size}</strong> 個詞條
                </span>
                <button
                  type="button"
                  onClick={() => setShowTraitPicker((v) => !v)}
                  className="underline hover:text-black cursor-pointer font-bold"
                >
                  {showTraitPicker ? '收起詞條名單 ▲' : '查看/增減詞條 ▼'}
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X size={16} />
          </button>
        </div>

        {/* Expandable Trait Selector/Editor */}
        {showTraitPicker && (
          <div className="border-b-2 border-black bg-neutral-100 p-3 max-h-56 overflow-y-auto shrink-0 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Sliders size={13} />
                <span>勾選參與批量關係設定的詞條 ({selectedTraitIds.size} / {dataset.traits.length})：</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2 top-2 text-neutral-400" />
                  <input
                    type="text"
                    value={traitSearchQuery}
                    onChange={(e) => setTraitSearchQuery(e.target.value)}
                    placeholder="搜尋詞條..."
                    className="border border-black pl-6 pr-2 py-0.5 text-[11px] bg-white w-28 focus:w-40 transition-all focus:outline-none"
                  />
                </div>
                <select
                  value={traitAxisFilter}
                  onChange={(e) => setTraitAxisFilter(e.target.value)}
                  className="border border-black py-0.5 px-1.5 text-[11px] bg-white font-mono"
                >
                  <option value="all">所有軸線</option>
                  {dataset.axes.map((ax) => (
                    <option key={ax.id} value={ax.name}>
                      {ax.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const filtered = dataset.traits.filter(
                      (t) =>
                        (traitAxisFilter === 'all' || t.axis === traitAxisFilter) &&
                        (t.name.toLowerCase().includes(traitSearchQuery.toLowerCase()) ||
                          t.axis.toLowerCase().includes(traitSearchQuery.toLowerCase()))
                    );
                    setSelectedTraitIds(new Set(filtered.map((t) => t.id)));
                  }}
                  className="border border-black px-1.5 py-0.5 text-[10px] font-bold bg-white hover:bg-neutral-200 cursor-pointer"
                >
                  全選篩選
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTraitIds(new Set())}
                  className="border border-black px-1.5 py-0.5 text-[10px] font-bold bg-white hover:bg-neutral-200 cursor-pointer text-neutral-700"
                >
                  清空
                </button>
              </div>
            </div>

            {/* Chips grid */}
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white border border-neutral-300">
              {dataset.traits
                .filter(
                  (t) =>
                    (traitAxisFilter === 'all' || t.axis === traitAxisFilter) &&
                    (t.name.toLowerCase().includes(traitSearchQuery.toLowerCase()) ||
                      t.axis.toLowerCase().includes(traitSearchQuery.toLowerCase()))
                )
                .map((t) => {
                  const isChecked = selectedTraitIds.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTraitSelect(t.id)}
                      className={`px-2 py-0.5 text-[11px] border font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                        isChecked
                          ? 'border-black bg-black text-white font-bold'
                          : 'border-neutral-300 bg-neutral-50 text-neutral-800 hover:border-black'
                      }`}
                    >
                      <span>{t.name}</span>
                      <span className="text-[9px] opacity-70">({t.axis})</span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Selected Trait Chips Bar (when collapsed) */}
        {!showTraitPicker && selectedTraits.length > 0 && (
          <div className="bg-neutral-50 border-b border-black px-4 py-2 flex items-center gap-1.5 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-neutral-600 shrink-0 font-mono">已選:</span>
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {selectedTraits.slice(0, 12).map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-black bg-white text-[10px] font-bold shrink-0"
                >
                  <span>{t.name}</span>
                  <span className="text-[9px] text-neutral-500 font-mono">[{t.axis}]</span>
                </span>
              ))}
              {selectedTraits.length > 12 && (
                <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                  ...+{selectedTraits.length - 12} 個
                </span>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-black bg-neutral-100 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('internal')}
            className={`flex-1 py-2.5 px-3 text-xs font-black tracking-wider uppercase border-r-2 border-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'internal' ? 'bg-white text-black shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <Sparkles size={13} />
            <span>1. 彼此建立關係 (所選詞條互相)</span>
            <span className="border border-black px-1.5 text-[10px] font-mono bg-neutral-100">
              {internalPairCount} 組
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('target')}
            className={`flex-1 py-2.5 px-3 text-xs font-black tracking-wider uppercase border-r-2 border-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'target' ? 'bg-white text-black shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <ArrowRight size={13} />
            <span>2. 批量關聯至目標 (目標詞條/軸線)</span>
            <span className="border border-black px-1.5 text-[10px] font-mono bg-neutral-100">
              {targetPairCount} 組
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2.5 px-3 text-xs font-black tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'manage' ? 'bg-white text-black shadow-xs' : 'text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            <Trash2 size={13} />
            <span>3. 關係總覽與清理</span>
            <span className="border border-black px-1.5 text-[10px] font-mono bg-neutral-100">
              {existingRules.length} 條
            </span>
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* TAB 1: Internal Pairwise Rules */}
          {activeTab === 'internal' && (
            <div className="flex flex-col gap-4">
              <div className="border border-black p-3 bg-neutral-50 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-black">
                    在所選的 {selectedTraits.length} 個詞條兩兩之間批量套用關係
                  </h3>
                  <p className="text-[11px] text-neutral-600 mt-0.5">
                    這會將所選詞條進行全組合排列配對（共 {internalPairCount} 組配對），非常適用於將同軸線選項設為全互斥，或將同系列特質設為彼此相乘共現。
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black font-mono">{internalPairCount}</span>
                  <span className="text-[10px] block text-neutral-500 font-mono">組配對關係</span>
                </div>
              </div>

              {selectedTraits.length < 2 ? (
                <div className="border-2 border-dashed border-rose-400 p-6 text-center text-xs text-rose-800 bg-rose-50 flex flex-col items-center gap-2">
                  <AlertTriangle size={24} className="text-rose-600" />
                  <span className="font-bold">請至少選取 2 個詞條以建立彼此間的互相關係！</span>
                  <button
                    type="button"
                    onClick={() => setShowTraitPicker(true)}
                    className="border border-black px-3 py-1 bg-white font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
                  >
                    點此開啟詞條選取器
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Rule Type Selector */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase tracking-wider text-neutral-800">
                      選擇要建立的關係類型：
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setInternalRuleType('hard')}
                        className={`p-3 border-2 border-black text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          internalRuleType === 'hard'
                            ? 'bg-rose-50 border-rose-800 shadow-[3px_3px_0px_0px_rgba(159,18,57,1)]'
                            : 'bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-rose-900 flex items-center gap-1.5">
                            <ShieldAlert size={14} className="text-rose-700" />
                            <span>硬排除 (互斥)</span>
                          </span>
                          {internalRuleType === 'hard' && <Check size={14} className="text-rose-800" />}
                        </div>
                        <span className="text-[10px] text-neutral-600 leading-tight">
                          所選詞條絕不可同時出現在同一角色中（邏輯阻斷）。
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInternalRuleType('soft')}
                        className={`p-3 border-2 border-black text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          internalRuleType === 'soft'
                            ? 'bg-amber-50 border-amber-800 shadow-[3px_3px_0px_0px_rgba(146,64,14,1)]'
                            : 'bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-amber-900 flex items-center gap-1.5">
                            <Sliders size={14} className="text-amber-700" />
                            <span>軟排除 (弱相容)</span>
                          </span>
                          {internalRuleType === 'soft' && <Check size={14} className="text-amber-800" />}
                        </div>
                        <span className="text-[10px] text-neutral-600 leading-tight">
                          允許同時出現，但大幅降低機率並標註弱相容理由。
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInternalRuleType('cooc')}
                        className={`p-3 border-2 border-black text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          internalRuleType === 'cooc'
                            ? 'bg-emerald-50 border-emerald-800 shadow-[3px_3px_0px_0px_rgba(6,78,59,1)]'
                            : 'bg-white hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-emerald-900 flex items-center gap-1.5">
                            <Link2 size={14} className="text-emerald-700" />
                            <span>共現加權 (協同/相斥)</span>
                          </span>
                          {internalRuleType === 'cooc' && <Check size={14} className="text-emerald-800" />}
                        </div>
                        <span className="text-[10px] text-neutral-600 leading-tight">
                          設定彼此共同被抽中的機率權重增減 (-10 ~ +10)。
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Config based on chosen type */}
                  <div className="border-2 border-black p-4 bg-white flex flex-col gap-3">
                    {internalRuleType === 'hard' && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-neutral-800">互斥原因說明：</label>
                        <input
                          type="text"
                          value={internalHardReason}
                          onChange={(e) => setInternalHardReason(e.target.value)}
                          placeholder="例如: 同維度相斥、不可兼具之性格..."
                          className="border-2 border-black px-2.5 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                    )}

                    {internalRuleType === 'soft' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-neutral-800">機率懲罰乘數：</label>
                            <span className="font-mono font-black text-xs border border-black px-1.5 bg-neutral-100">
                              {internalSoftPenalty}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.05"
                            max="0.9"
                            step="0.05"
                            value={internalSoftPenalty}
                            onChange={(e) => setInternalSoftPenalty(parseFloat(e.target.value))}
                            className="accent-black cursor-pointer"
                          />
                          <span className="text-[10px] text-neutral-500 font-mono">
                            * 0.1 代表當其中一個詞條抽中時，另一詞條機率降為 10%
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-neutral-800">弱相容註記說明：</label>
                          <input
                            type="text"
                            value={internalSoftNote}
                            onChange={(e) => setInternalSoftNote(e.target.value)}
                            placeholder="例如: 表面矛盾但內心共存之情境..."
                            className="border-2 border-black px-2.5 py-1.5 text-xs focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {internalRuleType === 'cooc' && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-neutral-800">共現權重調整：</label>
                          <span
                            className={`font-mono font-black text-xs border-2 border-black px-2 py-0.5 ${
                              internalCoocWeight > 0
                                ? 'bg-emerald-100 text-emerald-900'
                                : internalCoocWeight < 0
                                ? 'bg-rose-100 text-rose-900'
                                : 'bg-neutral-100'
                            }`}
                          >
                            {internalCoocWeight > 0 ? `+${internalCoocWeight}` : internalCoocWeight}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-10"
                          max="10"
                          step="1"
                          value={internalCoocWeight}
                          onChange={(e) => setInternalCoocWeight(parseInt(e.target.value, 10))}
                          className="accent-black cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                          <span>-10 (極度相斥)</span>
                          <span>0 (中立無影響)</span>
                          <span>+10 (強烈協同綁定)</span>
                        </div>
                      </div>
                    )}

                    {/* Overwrite Option */}
                    <div className="border-t border-neutral-300 pt-2 flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
                        <input
                          type="checkbox"
                          checked={internalOverwrite}
                          onChange={(e) => setInternalOverwrite(e.target.checked)}
                          className="accent-black cursor-pointer"
                        />
                        <span>自動覆蓋清除各對詞條間既有的衝突規則（推薦）</span>
                      </label>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        避免同組詞條重複存在硬排除與共現權重衝突
                      </span>
                    </div>
                  </div>

                  {/* Confirmation Button */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="border border-black px-4 py-2 text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyInternalRules}
                      className="border-2 border-black px-5 py-2 text-xs font-black uppercase tracking-wider bg-black text-white hover:bg-neutral-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      <span>確認批量套用 ({internalPairCount} 組關係)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Link Selected Traits to Target */}
          {activeTab === 'target' && (
            <div className="flex flex-col gap-4">
              <div className="border border-black p-3 bg-neutral-50 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-black">
                    將所選的 {selectedTraits.length} 個詞條，批量關聯至指定的外部目標
                  </h3>
                  <p className="text-[11px] text-neutral-600 mt-0.5">
                    支援關聯至「單一目標詞條」，或是將所選詞條與「目標軸線內的所有詞條」建立全面關聯。
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-black font-mono">{targetPairCount}</span>
                  <span className="text-[10px] block text-neutral-500 font-mono">組配對關係</span>
                </div>
              </div>

              {/* Target Scope Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  onClick={() => setTargetScope('trait')}
                  className={`border-2 border-black p-3 cursor-pointer flex flex-col gap-2 transition-all ${
                    targetScope === 'trait' ? 'bg-amber-50 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-neutral-900 flex items-center gap-1.5">
                      <Link2 size={14} />
                      <span>關聯至「單一目標詞條」</span>
                    </span>
                    {targetScope === 'trait' && <Check size={14} />}
                  </div>
                  <span className="text-[10px] text-neutral-600">
                    所選的 {selectedTraits.length} 個詞條將各自與此目標詞條建立關係。
                  </span>

                  {targetScope === 'trait' && (
                    <div className="mt-1 flex flex-col gap-1.5">
                      <div className="relative">
                        <Search size={11} className="absolute left-2 top-2 text-neutral-400" />
                        <input
                          type="text"
                          value={targetSearchQuery}
                          onChange={(e) => setTargetSearchQuery(e.target.value)}
                          placeholder="快速篩選目標詞條..."
                          className="border border-black pl-6 pr-2 py-1 text-[11px] w-full bg-white focus:outline-none"
                        />
                      </div>
                      <select
                        value={singleTargetTraitId}
                        onChange={(e) => setSingleTargetTraitId(e.target.value)}
                        className="border-2 border-black p-1.5 text-xs bg-white font-bold cursor-pointer"
                      >
                        {dataset.traits
                          .filter(
                            (t) =>
                              !selectedTraitIds.has(t.id) &&
                              (t.name.toLowerCase().includes(targetSearchQuery.toLowerCase()) ||
                                t.axis.toLowerCase().includes(targetSearchQuery.toLowerCase()))
                          )
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} [{t.axis}]
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setTargetScope('axis')}
                  className={`border-2 border-black p-3 cursor-pointer flex flex-col gap-2 transition-all ${
                    targetScope === 'axis' ? 'bg-amber-50 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-neutral-900 flex items-center gap-1.5">
                      <Layers size={14} />
                      <span>關聯至「目標軸線全體詞條」</span>
                    </span>
                    {targetScope === 'axis' && <Check size={14} />}
                  </div>
                  <span className="text-[10px] text-neutral-600">
                    所選詞條將與指定軸線下的所有詞條交叉建立規則（共 {targetPairCount} 組）。
                  </span>

                  {targetScope === 'axis' && (
                    <div className="mt-1 flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-600 font-mono">選擇目標軸線：</label>
                      <select
                        value={targetAxisName}
                        onChange={(e) => setTargetAxisName(e.target.value)}
                        className="border-2 border-black p-1.5 text-xs bg-white font-bold cursor-pointer"
                      >
                        {dataset.axes.map((ax) => (
                          <option key={ax.id} value={ax.name}>
                            {ax.name} (含 {dataset.traits.filter((t) => t.axis === ax.name).length} 詞條)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Rule Type Choice */}
              <div className="border-2 border-black p-4 bg-white flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-800">
                    設定關聯關係：
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="targetRuleType"
                        checked={targetRuleType === 'hard'}
                        onChange={() => setTargetRuleType('hard')}
                        className="accent-black"
                      />
                      <span>硬排除 (互斥)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="targetRuleType"
                        checked={targetRuleType === 'soft'}
                        onChange={() => setTargetRuleType('soft')}
                        className="accent-black"
                      />
                      <span>軟排除 (弱相容)</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                      <input
                        type="radio"
                        name="targetRuleType"
                        checked={targetRuleType === 'cooc'}
                        onChange={() => setTargetRuleType('cooc')}
                        className="accent-black"
                      />
                      <span>共現加權</span>
                    </label>
                  </div>
                </div>

                {/* Sub Inputs */}
                {targetRuleType === 'hard' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-neutral-800">互斥原因：</label>
                    <input
                      type="text"
                      value={targetHardReason}
                      onChange={(e) => setTargetHardReason(e.target.value)}
                      placeholder="設定邏輯互斥原因..."
                      className="border-2 border-black px-2.5 py-1 text-xs focus:outline-none"
                    />
                  </div>
                )}

                {targetRuleType === 'soft' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>懲罰乘數:</span>
                        <span className="font-mono">{targetSoftPenalty}</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.9"
                        step="0.05"
                        value={targetSoftPenalty}
                        onChange={(e) => setTargetSoftPenalty(parseFloat(e.target.value))}
                        className="accent-black cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold">弱相容註記:</label>
                      <input
                        type="text"
                        value={targetSoftNote}
                        onChange={(e) => setTargetSoftNote(e.target.value)}
                        placeholder="說明情境..."
                        className="border-2 border-black px-2 py-1 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {targetRuleType === 'cooc' && (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>共現加權調整:</span>
                      <span className="font-mono font-black">{targetCoocWeight > 0 ? `+${targetCoocWeight}` : targetCoocWeight}</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="1"
                      value={targetCoocWeight}
                      onChange={(e) => setTargetCoocWeight(parseInt(e.target.value, 10))}
                      className="accent-black cursor-pointer"
                    />
                  </div>
                )}

                <div className="border-t border-neutral-200 pt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={targetOverwrite}
                      onChange={(e) => setTargetOverwrite(e.target.checked)}
                      className="accent-black cursor-pointer"
                    />
                    <span>覆蓋清除各對象間既有的衝突規則</span>
                  </label>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    配對總數: {targetPairCount} 組
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="border border-black px-4 py-2 text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={targetPairCount === 0}
                  onClick={handleApplyTargetRules}
                  className={`border-2 border-black px-5 py-2 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 cursor-pointer flex items-center gap-1.5 ${
                    targetPairCount > 0 ? 'bg-black text-white hover:bg-neutral-800' : 'bg-neutral-200 text-neutral-400 border-neutral-300 cursor-not-allowed'
                  }`}
                >
                  <ArrowRight size={14} />
                  <span>確認建立批量關聯 ({targetPairCount} 組)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Inspect & Manage Existing Rules */}
          {activeTab === 'manage' && (
            <div className="flex flex-col gap-4">
              {/* Quick Batch Clear Actions Panel */}
              <div className="border-2 border-black p-3 bg-neutral-100 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-wider text-neutral-800 flex items-center gap-1">
                    <Trash2 size={13} className="text-rose-700" />
                    <span>快捷批量清除工具 (針對當前所選 {selectedTraits.length} 個詞條)：</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickClear('internal_all')}
                    className="border border-black bg-white hover:bg-rose-50 hover:text-rose-800 p-2 text-left flex flex-col gap-0.5 transition-colors cursor-pointer text-xs"
                    title="只刪除所選詞條之間的互相規則，保留對外的其他規則"
                  >
                    <span className="font-black text-[11px]">清除「內部互相」關係</span>
                    <span className="text-[10px] text-neutral-500 font-mono">僅兩端皆在所選清單者</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickClear('all_hard')}
                    className="border border-black bg-white hover:bg-rose-50 hover:text-rose-800 p-2 text-left flex flex-col gap-0.5 transition-colors cursor-pointer text-xs"
                  >
                    <span className="font-black text-[11px]">清除全部「硬排除」</span>
                    <span className="text-[10px] text-neutral-500 font-mono">所選詞條的所有互斥</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickClear('all_soft')}
                    className="border border-black bg-white hover:bg-rose-50 hover:text-rose-800 p-2 text-left flex flex-col gap-0.5 transition-colors cursor-pointer text-xs"
                  >
                    <span className="font-black text-[11px]">清除全部「軟排除」</span>
                    <span className="text-[10px] text-neutral-500 font-mono">所選詞條的所有弱相容</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickClear('all_cooc')}
                    className="border border-black bg-white hover:bg-rose-50 hover:text-rose-800 p-2 text-left flex flex-col gap-0.5 transition-colors cursor-pointer text-xs"
                  >
                    <span className="font-black text-[11px]">清除全部「共現加權」</span>
                    <span className="text-[10px] text-neutral-500 font-mono">所選詞條的所有共現</span>
                  </button>
                </div>
              </div>

              {/* Filter and Selection bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black pb-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-mono font-bold text-neutral-600">過濾:</span>
                  {(
                    [
                      { key: 'all', label: `全部 (${existingRules.length})` },
                      { key: 'internal', label: `內部 (${existingRules.filter((r) => r.isInternal).length})` },
                      { key: 'hard', label: `硬排除 (${existingRules.filter((r) => r.type === 'hard').length})` },
                      { key: 'soft', label: `軟排除 (${existingRules.filter((r) => r.type === 'soft').length})` },
                      { key: 'cooc', label: `共現 (${existingRules.filter((r) => r.type === 'cooc').length})` },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setManageFilterType(f.key)}
                      className={`px-2 py-0.5 border text-[11px] font-mono transition-colors cursor-pointer ${
                        manageFilterType === f.key
                          ? 'border-black bg-black text-white font-bold'
                          : 'border-neutral-300 bg-white hover:border-black'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRuleKeys(new Set(filteredExistingRules.map((r) => r.key)))}
                    className="border border-black px-1.5 py-0.5 text-[10px] font-bold bg-white hover:bg-neutral-200 cursor-pointer"
                  >
                    全選當前
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRuleKeys(new Set())}
                    className="border border-black px-1.5 py-0.5 text-[10px] font-bold bg-white hover:bg-neutral-200 cursor-pointer text-neutral-700"
                  >
                    取消選取
                  </button>
                  <button
                    type="button"
                    disabled={selectedRuleKeys.size === 0}
                    onClick={handleDeleteSelectedRules}
                    className={`border border-black px-2.5 py-0.5 text-[11px] font-black uppercase transition-colors cursor-pointer flex items-center gap-1 ${
                      selectedRuleKeys.size > 0
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-neutral-200 text-neutral-400 border-neutral-300 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 size={12} />
                    <span>刪除已選 ({selectedRuleKeys.size})</span>
                  </button>
                </div>
              </div>

              {/* Rules List */}
              <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto border border-neutral-300 p-2 bg-neutral-50">
                {filteredExistingRules.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-neutral-500">
                    在所選的詞條範圍內沒有找到相符的關係規則。
                  </div>
                ) : (
                  filteredExistingRules.map((r) => {
                    const isChecked = selectedRuleKeys.has(r.key);
                    return (
                      <div
                        key={r.key}
                        onClick={() => {
                          setSelectedRuleKeys((prev) => {
                            const next = new Set(prev);
                            if (next.has(r.key)) next.delete(r.key);
                            else next.add(r.key);
                            return next;
                          });
                        }}
                        className={`flex items-center justify-between p-2 border transition-colors cursor-pointer text-xs ${
                          isChecked
                            ? 'border-black bg-rose-50 shadow-2xs font-bold'
                            : 'border-neutral-300 bg-white hover:border-black'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="accent-black pointer-events-none"
                          />

                          {/* Rule Type Badge */}
                          <span
                            className={`px-1.5 py-0.5 text-[10px] font-mono border font-black uppercase shrink-0 ${
                              r.type === 'hard'
                                ? 'bg-rose-100 text-rose-950 border-rose-600'
                                : r.type === 'soft'
                                ? 'bg-amber-100 text-amber-950 border-amber-600'
                                : 'bg-emerald-100 text-emerald-950 border-emerald-600'
                            }`}
                          >
                            {r.type === 'hard' ? '硬排除' : r.type === 'soft' ? '軟排除' : '共現'}
                          </span>

                          {/* Trait A & B */}
                          <div className="flex items-center gap-1.5 font-bold">
                            <span>{r.traitA.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">[{r.traitA.axis}]</span>
                            <span className="text-neutral-400 font-mono">↔</span>
                            <span>{r.traitB.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">[{r.traitB.axis}]</span>
                          </div>

                          {r.isInternal && (
                            <span className="border border-neutral-400 px-1 text-[9px] text-neutral-600 font-mono bg-neutral-100">
                              內部配對
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-neutral-600 truncate max-w-xs">
                            {r.detail}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRuleKeys(new Set([r.key]));
                              handleDeleteSelectedRules();
                            }}
                            className="p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-400 transition-colors cursor-pointer"
                            title="刪除此規則"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="border-t-2 border-black px-4 py-2.5 bg-neutral-50 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-neutral-600 flex items-center gap-2">
            <span>
              總詞條數: <strong>{dataset.traits.length}</strong>
            </span>
            <span>•</span>
            <span>
              規則統計: <strong>{dataset.hardExclusions.length}</strong> 硬排除 /{' '}
              <strong>{dataset.softExclusions.length}</strong> 軟排除 /{' '}
              <strong>{dataset.cooccurrenceRules.length}</strong> 共現
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-black px-4 py-1 text-xs font-black uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
