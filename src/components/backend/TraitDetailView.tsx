import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Edit3,
  Tag,
  Search,
  Layers,
  Trash2,
  Check,
  RotateCcw,
  AlertCircle,
  Save,
  Sliders,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ALL_INTENSITIES, CooccurrenceRule, Dataset, HardExclusionRule, IntensityLevel, SoftExclusionRule, Trait } from '../../types';
import { INTENSITY_DISTRIBUTION } from '../../lib/generator';
import { AxisManagementModal } from './AxisManagementModal';

interface TraitDetailViewProps {
  dataset: Dataset;
  onSaveDataset: (updated: Dataset) => void;
}

export const TraitDetailView: React.FC<TraitDetailViewProps> = ({ dataset, onSaveDataset }) => {
  const [selectedTraitId, setSelectedTraitId] = useState<string>(
    dataset.traits[0]?.id || '',
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Panel display mode: 'view' (original display panel), 'edit' (edit panel), 'add' (add panel)
  const [panelMode, setPanelMode] = useState<'view' | 'edit' | 'add'>('view');

  // Axis management modal state
  const [isAxisModalOpen, setIsAxisModalOpen] = useState<boolean>(false);

  // Active trait
  const selectedTrait = useMemo(() => {
    return (
      dataset.traits.find((t) => t.id === selectedTraitId) ||
      dataset.traits[0] ||
      null
    );
  }, [dataset.traits, selectedTraitId]);

  // Form states for the in-place editor
  const [formName, setFormName] = useState<string>('');
  const [formAxis, setFormAxis] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formBaseWeight, setFormBaseWeight] = useState<number>(10);

  const [coRules, setCoRules] = useState<CooccurrenceRule[]>([]);
  const [softRules, setSoftRules] = useState<SoftExclusionRule[]>([]);
  const [hardRules, setHardRules] = useState<HardExclusionRule[]>([]);

  // Sub-form states for adding new rules
  const [newCoTargetId, setNewCoTargetId] = useState<string>('');
  const [newCoWeight, setNewCoWeight] = useState<number>(5);
  const [newCoModifiers, setNewCoModifiers] = useState<Record<IntensityLevel, number>>({
    '隱藏': 0,
    '輕微': 0,
    '中等': 0,
    '強烈': 0,
    '極端': 0,
  });
  const [showNewCoModifiers, setShowNewCoModifiers] = useState<boolean>(false);
  const [expandedCoRuleIds, setExpandedCoRuleIds] = useState<Set<string>>(new Set());

  const toggleExpandCoRule = (id: string) => {
    setExpandedCoRuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const [newSoftTargetId, setNewSoftTargetId] = useState<string>('');
  const [newSoftMultiplier, setNewSoftMultiplier] = useState<number>(0.1);
  const [newSoftNote, setNewSoftNote] = useState<string>('');

  const [newHardTargetId, setNewHardTargetId] = useState<string>('');
  const [newHardReason, setNewHardReason] = useState<string>('');

  // Editor sub-tabs: 'basic' | 'cooccur' | 'soft' | 'hard' | 'intensity'
  const [editorTab, setEditorTab] = useState<'basic' | 'cooccur' | 'soft' | 'hard' | 'intensity'>('basic');

  const [saveNotification, setSaveNotification] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Trait lookup map
  const traitMap = useMemo(() => {
    return new Map<string, Trait>(dataset.traits.map((t) => [t.id, t]));
  }, [dataset.traits]);

  // Traits available to link with (excluding current)
  const availableOtherTraits = useMemo(() => {
    const currentId = panelMode === 'add' ? '' : selectedTrait?.id;
    return dataset.traits.filter((t) => t.id !== currentId);
  }, [dataset.traits, panelMode, selectedTrait]);

  // Synchronize form when selected trait or mode changes
  useEffect(() => {
    if (panelMode === 'add') {
      setFormName('');
      setFormAxis(dataset.axes[0]?.name || '其他');
      setFormDescription('');
      setFormBaseWeight(10);
      setCoRules([]);
      setSoftRules([]);
      setHardRules([]);
      setEditorTab('basic');
      setErrorMsg('');
    } else if (selectedTrait) {
      setFormName(selectedTrait.name);
      setFormAxis(selectedTrait.axis);
      setFormDescription(selectedTrait.description || '');
      setFormBaseWeight(selectedTrait.baseWeight || 10);

      // Load existing rules involving this trait
      setCoRules(
        dataset.cooccurrenceRules.filter(
          (c) => c.traitAId === selectedTrait.id || c.traitBId === selectedTrait.id,
        ),
      );
      setSoftRules(
        dataset.softExclusions.filter(
          (s) => s.traitAId === selectedTrait.id || s.traitBId === selectedTrait.id,
        ),
      );
      setHardRules(
        dataset.hardExclusions.filter(
          (h) => h.traitAId === selectedTrait.id || h.traitBId === selectedTrait.id,
        ),
      );
      setErrorMsg('');
    }
  }, [panelMode, selectedTraitId, dataset]);

  // Dismiss notification automatically
  useEffect(() => {
    if (saveNotification) {
      const timer = setTimeout(() => setSaveNotification(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [saveNotification]);

  // Filtered traits for left catalog
  const filteredTraits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return dataset.traits;
    return dataset.traits.filter(
      (t) => t.name.toLowerCase().includes(q) || t.axis.toLowerCase().includes(q),
    );
  }, [dataset.traits, searchQuery]);

  // Computed relationships for the original Trait Display View
  const relationships = useMemo(() => {
    if (!selectedTrait) return null;

    // Most likely to co-occur (positive weights)
    const positiveRules = dataset.cooccurrenceRules
      .filter(
        (c) =>
          (c.traitAId === selectedTrait.id || c.traitBId === selectedTrait.id) &&
          c.weight > 0,
      )
      .map((c) => {
        const otherId = c.traitAId === selectedTrait.id ? c.traitBId : c.traitAId;
        return {
          otherTrait: traitMap.get(otherId),
          weight: c.weight,
          rule: c,
        };
      })
      .filter((item) => !!item.otherTrait)
      .sort((a, b) => b.weight - a.weight);

    // Most repelled (negative weights)
    const negativeRules = dataset.cooccurrenceRules
      .filter(
        (c) =>
          (c.traitAId === selectedTrait.id || c.traitBId === selectedTrait.id) &&
          c.weight < 0,
      )
      .map((c) => {
        const otherId = c.traitAId === selectedTrait.id ? c.traitBId : c.traitAId;
        return {
          otherTrait: traitMap.get(otherId),
          weight: c.weight,
          rule: c,
        };
      })
      .filter((item) => !!item.otherTrait)
      .sort((a, b) => a.weight - b.weight);

    // Soft exclusions
    const softRules = dataset.softExclusions
      .filter(
        (s) => s.traitAId === selectedTrait.id || s.traitBId === selectedTrait.id,
      )
      .map((s) => {
        const otherId = s.traitAId === selectedTrait.id ? s.traitBId : s.traitAId;
        return {
          otherTrait: traitMap.get(otherId),
          penalty: s.penaltyMultiplier,
          note: s.note,
        };
      })
      .filter((item) => !!item.otherTrait);

    // Hard exclusions
    const hardRules = dataset.hardExclusions
      .filter(
        (h) => h.traitAId === selectedTrait.id || h.traitBId === selectedTrait.id,
      )
      .map((h) => {
        const otherId = h.traitAId === selectedTrait.id ? h.traitBId : h.traitAId;
        return {
          otherTrait: traitMap.get(otherId),
          reason: h.reason,
        };
      })
      .filter((item) => !!item.otherTrait);

    // Intensity rules affecting or affected by this trait
    const intensityImpacts: {
      otherTraitName: string;
      level: IntensityLevel;
      delta: number;
    }[] = [];

    dataset.cooccurrenceRules.forEach((c) => {
      const isA = c.traitAId === selectedTrait.id;
      const isB = c.traitBId === selectedTrait.id;
      if ((isA || isB) && c.intensityModifiers) {
        const otherId = isA ? c.traitBId : c.traitAId;
        const other = traitMap.get(otherId);
        if (other) {
          const mods = c.intensityModifiers;
          (Object.keys(mods) as IntensityLevel[]).forEach((lvl) => {
            const delta = mods[lvl];
            if (delta !== undefined && delta !== 0) {
              intensityImpacts.push({
                otherTraitName: other.name,
                level: lvl,
                delta,
              });
            }
          });
        }
      }
    });

    return {
      positiveRules,
      negativeRules,
      softRules,
      hardRules,
      intensityImpacts,
    };
  }, [selectedTrait, dataset, traitMap]);

  // Actions for switching panel mode
  const handleStartAddTrait = () => {
    setPanelMode('add');
    setEditorTab('basic');
  };

  const handleStartEditTrait = (tab: 'basic' | 'cooccur' | 'soft' | 'hard' = 'basic') => {
    setEditorTab(tab);
    setPanelMode('edit');
  };

  const handleCancelEditOrAdd = () => {
    setPanelMode('view');
    setErrorMsg('');
  };

  // Reset form to currently stored trait
  const handleResetForm = () => {
    if (panelMode === 'add') {
      setFormName('');
      setFormAxis(dataset.axes[0]?.name || '其他');
      setFormDescription('');
      setFormBaseWeight(10);
      setCoRules([]);
      setSoftRules([]);
      setHardRules([]);
    } else if (selectedTrait) {
      setFormName(selectedTrait.name);
      setFormAxis(selectedTrait.axis);
      setFormDescription(selectedTrait.description || '');
      setFormBaseWeight(selectedTrait.baseWeight || 10);
      setCoRules(
        dataset.cooccurrenceRules.filter(
          (c) => c.traitAId === selectedTrait.id || c.traitBId === selectedTrait.id,
        ),
      );
      setSoftRules(
        dataset.softExclusions.filter(
          (s) => s.traitAId === selectedTrait.id || s.traitBId === selectedTrait.id,
        ),
      );
      setHardRules(
        dataset.hardExclusions.filter(
          (h) => h.traitAId === selectedTrait.id || h.traitBId === selectedTrait.id,
        ),
      );
    }
    setNewCoModifiers({
      '隱藏': 0,
      '輕微': 0,
      '中等': 0,
      '強烈': 0,
      '極端': 0,
    });
    setShowNewCoModifiers(false);
    setExpandedCoRuleIds(new Set());
    setErrorMsg('');
    setSaveNotification('已重設為當前設定');
  };

  // Add a Co-occurrence rule
  const handleAddCoRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoTargetId) return;

    if (coRules.some((r) => r.traitAId === newCoTargetId || r.traitBId === newCoTargetId)) {
      setErrorMsg('已存在與該詞條的共現規則！');
      return;
    }

    const currentId = panelMode === 'add' ? 'temp-current' : selectedTrait?.id || 'temp-current';
    const hasModifiers = Object.values(newCoModifiers).some((v) => typeof v === 'number' && v !== 0);

    const newRule: CooccurrenceRule = {
      id: `co-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      traitAId: currentId,
      traitBId: newCoTargetId,
      weight: Number(newCoWeight),
      ...(hasModifiers ? { intensityModifiers: { ...newCoModifiers } } : {}),
    };

    setCoRules((prev) => [...prev, newRule]);
    setNewCoTargetId('');
    setNewCoWeight(5);
    setNewCoModifiers({
      '隱藏': 0,
      '輕微': 0,
      '中等': 0,
      '強烈': 0,
      '極端': 0,
    });
    setShowNewCoModifiers(false);
    setErrorMsg('');
  };

  // Add a Soft Exclusion rule
  const handleAddSoftRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSoftTargetId) return;

    if (softRules.some((r) => r.traitAId === newSoftTargetId || r.traitBId === newSoftTargetId)) {
      setErrorMsg('已存在與該詞條的軟排除規則！');
      return;
    }

    const currentId = panelMode === 'add' ? 'temp-current' : selectedTrait?.id || 'temp-current';
    const newRule: SoftExclusionRule = {
      id: `soft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      traitAId: currentId,
      traitBId: newSoftTargetId,
      penaltyMultiplier: Math.round(Number(newSoftMultiplier) * 100) / 100,
      note: newSoftNote.trim() || '弱相容情境說明',
    };

    setSoftRules((prev) => [...prev, newRule]);
    setNewSoftTargetId('');
    setNewSoftNote('');
    setErrorMsg('');
  };

  // Add a Hard Exclusion rule
  const handleAddHardRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHardTargetId) return;

    if (hardRules.some((r) => r.traitAId === newHardTargetId || r.traitBId === newHardTargetId)) {
      setErrorMsg('已存在與該詞條的硬排除規則！');
      return;
    }

    const currentId = panelMode === 'add' ? 'temp-current' : selectedTrait?.id || 'temp-current';
    const newRule: HardExclusionRule = {
      id: `hard-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      traitAId: currentId,
      traitBId: newHardTargetId,
      reason: newHardReason.trim() || '設定邏輯互斥',
    };

    setHardRules((prev) => [...prev, newRule]);
    setNewHardTargetId('');
    setNewHardReason('');
    setErrorMsg('');
  };

  // Save changes (both for Add Mode and Edit Mode)
  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setErrorMsg('請填寫詞條名稱！');
      setEditorTab('basic');
      return;
    }

    const chosenAxis = formAxis || dataset.axes[0]?.name || '其他';
    const chosenWeight = Math.max(1, Math.min(100, Number(formBaseWeight) || 10));

    if (panelMode === 'add') {
      // Create new trait
      const newTraitId = `trait-custom-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const newTrait: Trait = {
        id: newTraitId,
        name: trimmedName,
        axis: chosenAxis,
        description: formDescription.trim(),
        baseWeight: chosenWeight,
      };

      // Remap temporary ids in rules
      const finalCoRules = coRules.map((r) => ({
        ...r,
        traitAId: r.traitAId === 'temp-current' ? newTraitId : r.traitAId,
        traitBId: r.traitBId === 'temp-current' ? newTraitId : r.traitBId,
      }));
      const finalSoftRules = softRules.map((s) => ({
        ...s,
        traitAId: s.traitAId === 'temp-current' ? newTraitId : s.traitAId,
        traitBId: s.traitBId === 'temp-current' ? newTraitId : s.traitBId,
      }));
      const finalHardRules = hardRules.map((h) => ({
        ...h,
        traitAId: h.traitAId === 'temp-current' ? newTraitId : h.traitAId,
        traitBId: h.traitBId === 'temp-current' ? newTraitId : h.traitBId,
      }));

      const updatedDataset: Dataset = {
        ...dataset,
        updatedAt: Date.now(),
        traits: [...dataset.traits, newTrait],
        cooccurrenceRules: [...dataset.cooccurrenceRules, ...finalCoRules],
        softExclusions: [...dataset.softExclusions, ...finalSoftRules],
        hardExclusions: [...dataset.hardExclusions, ...finalHardRules],
      };

      onSaveDataset(updatedDataset);
      setSelectedTraitId(newTraitId);
      setPanelMode('view');
      setSaveNotification(`已成功添加新詞條「${trimmedName}」！`);
      setErrorMsg('');
    } else {
      // Edit existing trait
      if (!selectedTrait) return;
      const targetId = selectedTrait.id;

      const updatedTrait: Trait = {
        id: targetId,
        name: trimmedName,
        axis: chosenAxis,
        description: formDescription.trim(),
        baseWeight: chosenWeight,
      };

      const updatedTraits = dataset.traits.map((t) => (t.id === targetId ? updatedTrait : t));

      // Replace existing cooccurrence rules for this trait
      const untouchedCo = dataset.cooccurrenceRules.filter(
        (c) => c.traitAId !== targetId && c.traitBId !== targetId,
      );
      const updatedCo = [...untouchedCo, ...coRules];

      // Replace existing soft exclusion rules for this trait
      const untouchedSoft = dataset.softExclusions.filter(
        (s) => s.traitAId !== targetId && s.traitBId !== targetId,
      );
      const updatedSoft = [...untouchedSoft, ...softRules];

      // Replace existing hard exclusion rules for this trait
      const untouchedHard = dataset.hardExclusions.filter(
        (h) => h.traitAId !== targetId && h.traitBId !== targetId,
      );
      const updatedHard = [...untouchedHard, ...hardRules];

      const updatedDataset: Dataset = {
        ...dataset,
        updatedAt: Date.now(),
        traits: updatedTraits,
        cooccurrenceRules: updatedCo,
        softExclusions: updatedSoft,
        hardExclusions: updatedHard,
      };

      onSaveDataset(updatedDataset);
      setPanelMode('view');
      setSaveNotification(`詞條「${trimmedName}」修改已儲存！`);
      setErrorMsg('');
    }
  };

  // Delete Trait
  const handleDeleteTrait = (traitId: string) => {
    const target = dataset.traits.find((t) => t.id === traitId);
    if (!target) return;

    if (!window.confirm(`確定要刪除詞條「${target.name}」及其所有關聯共現與排除規則嗎？`)) {
      return;
    }

    const updatedTraits = dataset.traits.filter((t) => t.id !== traitId);
    const updatedCo = dataset.cooccurrenceRules.filter(
      (c) => c.traitAId !== traitId && c.traitBId !== traitId,
    );
    const updatedSoft = dataset.softExclusions.filter(
      (s) => s.traitAId !== traitId && s.traitBId !== traitId,
    );
    const updatedHard = dataset.hardExclusions.filter(
      (h) => h.traitAId !== traitId && h.traitBId !== traitId,
    );

    const updatedDataset: Dataset = {
      ...dataset,
      updatedAt: Date.now(),
      traits: updatedTraits,
      cooccurrenceRules: updatedCo,
      softExclusions: updatedSoft,
      hardExclusions: updatedHard,
    };

    onSaveDataset(updatedDataset);
    setPanelMode('view');
    if (selectedTraitId === traitId) {
      setSelectedTraitId(updatedTraits[0]?.id || '');
    }
    setSaveNotification(`詞條「${target.name}」已刪除`);
  };

  // Helper to get rule other trait name
  const getRuleOtherTrait = (otherId: string) => {
    return traitMap.get(otherId) || { id: otherId, name: otherId, axis: '未知', baseWeight: 0, description: '' };
  };

  return (
    <div id="trait-detail-view" className="flex flex-col md:flex-row gap-5">
      {/* Left List of Traits */}
      <div className="w-full md:w-1/3 border-2 border-black p-3 bg-(--main-color) max-h-[500px] overflow-y-auto flex flex-col gap-3">
        {/* Top Control Action Bar */}
        <div className="flex flex-col gap-2 border-b-2 border-black pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black tracking-wider uppercase">詞條目錄</span>
            <span className="text-xs font-mono border border-black px-1.5 py-0.5 bg-neutral-100">
              {dataset.traits.length} 詞條
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-add-trait"
              type="button"
              onClick={handleStartAddTrait}
              className={`flex items-center justify-center gap-1 px-2.5 py-2 border-2 border-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer ${
                panelMode === 'add'
                  ? 'bg-neutral-800 text-white shadow-inner'
                  : 'bg-black text-white hover:bg-neutral-800'
              }`}
            >
              <Plus size={14} />
              <span>添加詞條</span>
            </button>

            <button
              id="btn-manage-axes"
              type="button"
              onClick={() => setIsAxisModalOpen(true)}
              className="flex items-center justify-center gap-1 px-2.5 py-2 border-2 border-black bg-white text-black hover:bg-black hover:text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Tag size={14} />
              <span>軸線標籤</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative mt-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋詞條名稱或軸線..."
              className="w-full border border-black px-2.5 py-1.5 text-xs pl-7 focus:outline-none"
            />
            <Search size={13} className="absolute left-2 top-2.5 text-neutral-500 pointer-events-none" />
          </div>
        </div>

        {/* Grouped by Axes */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {dataset.axes.map((axis) => {
            const axisTraits = filteredTraits.filter((t) => t.axis === axis.name);
            if (axisTraits.length === 0) return null;

            return (
              <div key={axis.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold border-b border-black pb-0.5 text-neutral-800">
                  <span>{axis.name}</span>
                  <span className="text-[10px] text-neutral-500">({axisTraits.length})</span>
                </div>
                <div className="flex flex-col gap-1">
                  {axisTraits.map((t) => {
                    const isSelected = panelMode !== 'add' && t.id === selectedTrait?.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedTraitId(t.id);
                          setPanelMode('view');
                        }}
                        className={`text-left text-xs px-2.5 py-1.5 border transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'border-black bg-black text-white font-black'
                            : 'border-black hover:bg-neutral-100 bg-white'
                        }`}
                      >
                        <span className="truncate pr-1">{t.name}</span>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[10px] font-mono px-1 border ${
                              isSelected ? 'border-white text-white' : 'border-neutral-400 text-neutral-600'
                            }`}
                          >
                            W:{t.baseWeight}
                          </span>
                          {isSelected && <span className="text-[10px] font-mono">▶</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredTraits.length === 0 && (
            <div className="p-4 text-center text-xs font-mono text-neutral-500">
              找不到符合「{searchQuery}」的詞條
            </div>
          )}
        </div>
      </div>

      {/* Right Content Panel (div:nth-of-type(2)) */}
      <div id="trait-editor-panel" className="w-full overflow-auto md:w-2/3 border-2 border-black p-5 bg-(--main-color) flex flex-col gap-5 max-h-[500px]">
        {/* Global Notifications */}
        {saveNotification && (
          <div className="bg-emerald-50 border-2 border-emerald-700 text-emerald-900 text-xs px-3 py-2 font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <Check size={14} className="text-emerald-700" />
              <span>{saveNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setSaveNotification('')}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border-2 border-rose-700 text-rose-900 text-xs px-3 py-2 font-bold flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-rose-700" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="text-rose-700 hover:text-rose-900 cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* CASE 1: ORIGINAL DISPLAY/INSPECTOR PANEL */}
        {panelMode === 'view' && selectedTrait && relationships && (
          <>
            {/* Trait Header & Modification Actions */}
            <div className="border-b-2 border-black pb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="border-2 border-black px-2 py-0.5 text-xs font-mono font-bold bg-neutral-100">
                    {selectedTrait.axis}
                  </span>
                  <span className="text-xs font-mono border border-black px-2 py-0.5">
                    基準權重: {selectedTrait.baseWeight}
                  </span>
                </div>

                {/* Edit and Delete Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    id="btn-edit-current-trait"
                    type="button"
                    onClick={() => handleStartEditTrait('basic')}
                    className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>修改詞條</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTrait(selectedTrait.id)}
                    className="border border-black p-1.5 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-colors cursor-pointer"
                    title="刪除此詞條"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h2 className="text-2xl font-black tracking-tight mt-1">{selectedTrait.name}</h2>
              <p className="text-xs text-neutral-800 leading-relaxed mt-2 border-t border-black pt-2 font-medium">
                {selectedTrait.description || '(尚無詳細描述)'}
              </p>
            </div>

              {/* Intensity impacts on other traits */}
              {relationships.intensityImpacts.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1 border-t border-black pt-2">
                  <span className="text-[11px] font-bold">強度對特定詞條共現之動態影響：</span>
                  <div className="flex flex-col gap-1">
                    {relationships.intensityImpacts.map((imp, i) => (
                      <div
                        key={i}
                        className="border border-black p-1.5 text-xs flex items-center justify-between"
                      >
                        <span>
                          當強度為【<span className="font-bold">{imp.level}</span>】時，與「
                          <span className="font-bold">{imp.otherTraitName}</span>」的共現權重：
                        </span>
                        <span className="font-mono font-black border border-black px-1">
                          {imp.delta > 0 ? `+${imp.delta}` : imp.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[11px] font-mono text-neutral-500">
                  此詞條採用基準常態分佈，尚未配置獨立強度修正偏移量。
                </div>
              )}
            </div>

            {/* Most Likely to Co-occur (Positive Rules) */}
            <div className="border border-black p-3.5 flex flex-col gap-2.5">
              <div className="flex items-center justify-between border-b border-black pb-1.5">
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight size={15} className="text-emerald-700" />
                </div>
                <button
                  type="button"
                  onClick={() => handleStartEditTrait('cooccur')}
                  className="text-[11px] font-mono font-bold underline hover:text-neutral-600 cursor-pointer"
                >
                  ＋ 添加/編輯共現權重
                </button>
              </div>

              {relationships.positiveRules.length === 0 ? (
                <div className="text-xs font-mono text-neutral-500 py-1">
                  暫無正共現設定。
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {relationships.positiveRules.map((r) => (
                    <div
                      key={r.otherTrait?.id}
                      className="border border-black p-2 flex items-center justify-between text-xs bg-neutral-50"
                    >
                      <div className="flex flex-col">
                        <span className="font-bold">{r.otherTrait?.name}</span>
                        <span className="text-[10px] text-neutral-600 font-mono">
                          {r.otherTrait?.axis}
                        </span>
                      </div>
                      <span className="font-mono font-black border-2 border-black px-1.5 py-0.5 bg-white">
                        +{r.weight}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Likely to be Repelled (Negative, Soft, Hard) */}
            <div className="border border-black p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-black pb-1.5">
                <div className="flex items-center gap-1.5">
                  <ArrowDownRight size={15} className="text-rose-700" />
                </div>
                <button
                  type="button"
                  onClick={() => handleStartEditTrait('soft')}
                  className="text-[11px] font-mono font-bold underline hover:text-neutral-600 cursor-pointer"
                >
                  ＋ 添加/編輯排除規則
                </button>
              </div>

              {/* Hard Exclusions */}
              {relationships.hardRules.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold flex items-center gap-1">
                    <span className="w-2 h-2 bg-black"></span>
                    <span>硬排除 (邏輯阻斷清單: {relationships.hardRules.length})</span>
                  </span>
                  {relationships.hardRules.map((hr) => (
                    <div
                      key={hr.otherTrait?.id}
                      className="border border-black p-2 bg-neutral-100 flex flex-col gap-1 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{hr.otherTrait?.name}</span>
                        <span className="font-mono text-[10px] border border-black px-1 bg-black text-white">
                          硬排除
                        </span>
                      </div>
                      {hr.reason && (
                        <span className="text-[11px] text-neutral-700 font-mono">{hr.reason}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Soft Exclusions */}
              {relationships.softRules.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold flex items-center gap-1">
                    <span className="w-2 h-2 border border-black"></span>
                    <span>軟排除 (弱相容懲罰: {relationships.softRules.length})</span>
                  </span>
                  {relationships.softRules.map((sr) => (
                    <div
                      key={sr.otherTrait?.id}
                      className="border border-dashed border-black p-2 flex flex-col gap-1 text-xs bg-white"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span>{sr.otherTrait?.name}</span>
                        <span className="font-mono text-[10px] border border-black px-1 bg-neutral-100">
                          乘數 ×{sr.penalty}
                        </span>
                      </div>
                      <span className="text-[11px] text-black font-medium">{sr.note}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Negative Co-occurrence */}
              {relationships.negativeRules.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold">負共現權重 (降低同時出現機率)：</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {relationships.negativeRules.map((nr) => (
                      <div
                        key={nr.otherTrait?.id}
                        className="border border-black p-2 flex items-center justify-between text-xs bg-neutral-50"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold">{nr.otherTrait?.name}</span>
                          <span className="text-[10px] text-neutral-600 font-mono">
                            {nr.otherTrait?.axis}
                          </span>
                        </div>
                        <span className="font-mono font-bold border border-black px-1.5 py-0.5 bg-white">
                          {nr.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {relationships.hardRules.length === 0 &&
                relationships.softRules.length === 0 &&
                relationships.negativeRules.length === 0 && (
                  <div className="text-xs font-mono text-neutral-500 py-1">
                    暫無排斥或互斥設定。
                  </div>
                )}
            </div>
          </>
        )}

        {/* CASE 2: EDITING OR ADDING PANEL */}
        {(panelMode === 'edit' || panelMode === 'add') && (
          <div className="flex flex-col gap-4">
            {/* Header with Navigation and Mode Indicator */}
            <div className="border-b-2 border-black pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEditOrAdd}
                    className="flex items-center gap-1 border border-black px-2 py-1 text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>返回詞條檢視</span>
                  </button>

                  <span
                    className={`border-2 border-black px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider ${
                      panelMode === 'add' ? 'bg-black text-white' : 'bg-neutral-100 text-black'
                    }`}
                  >
                    {panelMode === 'add' ? '＋ 添加詞條模式' : '修改詞條面板'}
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  {panelMode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="flex items-center gap-1 px-2.5 py-1.5 border border-black hover:bg-neutral-100 text-xs font-bold transition-colors cursor-pointer"
                      title="重設回儲存前狀態"
                    >
                      <RotateCcw size={13} />
                      <span>重設</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCancelEditOrAdd}
                    className="px-3 py-1.5 border border-black hover:bg-neutral-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    取消
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveForm()}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 border-2 border-black bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Save size={13} />
                    <span>{panelMode === 'add' ? '確認添加詞條' : '儲存詞條修改'}</span>
                  </button>
                </div>
              </div>

              <h2 className="text-xl font-black tracking-tight flex items-center gap-2 mt-1">
                <span>{panelMode === 'add' ? '添加新詞條' : formName || selectedTrait?.name || '無詞條名稱'}</span>
                {formAxis && (
                  <span className="text-xs font-mono font-normal border border-black px-1.5 py-0.5 bg-neutral-100 text-neutral-800">
                    [{formAxis}]
                  </span>
                )}
              </h2>
            </div>

            {/* Tab Navigation inside Panel */}
            <div className="flex border-b-2 border-black flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setEditorTab('basic')}
                className={`px-3 py-1.5 text-xs font-black uppercase cursor-pointer border-t-2 border-x-2 border-black -mb-[2px] transition-colors ${
                  editorTab === 'basic' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                基本屬性
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('cooccur')}
                className={`px-3 py-1.5 text-xs font-black uppercase cursor-pointer border-t-2 border-x-2 border-black -mb-[2px] transition-colors ${
                  editorTab === 'cooccur' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                共現權重 ({coRules.length})
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('soft')}
                className={`px-3 py-1.5 text-xs font-black uppercase cursor-pointer border-t-2 border-x-2 border-black -mb-[2px] transition-colors ${
                  editorTab === 'soft' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                軟排除 ({softRules.length})
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('hard')}
                className={`px-3 py-1.5 text-xs font-black uppercase cursor-pointer border-t-2 border-x-2 border-black -mb-[2px] transition-colors ${
                  editorTab === 'hard' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                硬排除 ({hardRules.length})
              </button>
              <button
                type="button"
                onClick={() => setEditorTab('intensity')}
                className={`px-3 py-1.5 text-xs font-black uppercase cursor-pointer border-t-2 border-x-2 border-black -mb-[2px] transition-colors ${
                  editorTab === 'intensity' ? 'bg-white text-black' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                詞條強度基準
              </button>
            </div>

            {/* Tab 1: Basic attributes (名稱、描述、基準權重、軸線標籤) */}
            {editorTab === 'basic' && (
              <div className="flex flex-col gap-4 py-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Trait Name */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-neutral-800">
                      詞條名稱 <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="例如：假性獨立、宿命論、過度討好..."
                      className="border-2 border-black p-2 text-xs focus:outline-none focus:bg-neutral-50"
                    />
                  </div>

                  {/* Axis Tag */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-neutral-800">
                        軸線標籤 <span className="text-rose-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsAxisModalOpen(true)}
                        className="text-[10px] underline font-mono text-neutral-600 hover:text-black cursor-pointer"
                      >
                        管理軸線
                      </button>
                    </div>
                    <select
                      value={formAxis}
                      onChange={(e) => setFormAxis(e.target.value)}
                      className="border-2 border-black bg-white p-2 text-xs focus:outline-none cursor-pointer"
                    >
                      {dataset.axes.map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Base Weight */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-neutral-800">
                      基準抽取權重 (1~100)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formBaseWeight}
                      onChange={(e) => setFormBaseWeight(Number(e.target.value))}
                      className="border-2 border-black p-2 text-xs focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-neutral-800">
                    詳細描述 <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="輸入該詞條的特質..."
                    className="border-2 border-black p-2.5 text-xs focus:outline-none resize-none leading-relaxed"
                  />
                  <span className="text-[10px] text-neutral-500 font-mono">
                    此描述將於抽取結果中完整呈現。
                  </span>
                </div>

                {/* Quick Overview of Relationships */}
                <div className="border border-black p-3 bg-neutral-50 flex flex-col gap-2 mt-1">
                  <span className="text-xs font-black uppercase tracking-wider">詞條關聯統計</span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div
                      onClick={() => setEditorTab('cooccur')}
                      className="border border-black p-2 bg-white cursor-pointer hover:bg-neutral-100 transition-colors"
                    >
                      <div className="font-bold">共現權重規則</div>
                      <div className="font-mono font-black text-sm mt-1">{coRules.length} 項</div>
                    </div>
                    <div
                      onClick={() => setEditorTab('soft')}
                      className="border border-black p-2 bg-white cursor-pointer hover:bg-neutral-100 transition-colors"
                    >
                      <div className="font-bold">軟排除 (弱相容)</div>
                      <div className="font-mono font-black text-sm mt-1">{softRules.length} 項</div>
                    </div>
                    <div
                      onClick={() => setEditorTab('hard')}
                      className="border border-black p-2 bg-white cursor-pointer hover:bg-neutral-100 transition-colors"
                    >
                      <div className="font-bold">硬排除 (互斥)</div>
                      <div className="font-mono font-black text-sm mt-1">{hardRules.length} 項</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Co-occurrence Weights (共現權重) */}
            {editorTab === 'cooccur' && (
              <div className="flex flex-col gap-4 py-1">
                <div className="border border-black p-2.5 bg-neutral-50 text-xs text-neutral-700">
                  <span className="font-bold">說明：</span>共現權重決定抽取時兩詞條互相吸引或排斥的傾向。正權重 (+1~+10) 提高連帶被抽取的機率；負權重 (-1~-10) 降低同出機率。強度修正是在原有的共現權重基礎加上強度修正值。
                </div>

                {/* Add Co-occurrence Rule Sub-form */}
                <form
                  onSubmit={handleAddCoRule}
                  className="border-2 border-black p-3 bg-neutral-100 flex flex-col gap-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                      <label className="text-[10px] font-bold">關聯目標詞條</label>
                      <select
                        required
                        value={newCoTargetId}
                        onChange={(e) => setNewCoTargetId(e.target.value)}
                        className="border border-black bg-white p-1.5 text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="">選擇要關聯的詞條...</option>
                        {availableOtherTraits.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} [{t.axis}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 w-28">
                      <label className="text-[10px] font-bold">共現權重 (-10 ~ +10)</label>
                      <input
                        type="number"
                        min="-10"
                        max="10"
                        value={newCoWeight}
                        onChange={(e) => setNewCoWeight(Number(e.target.value))}
                        className="border border-black p-1.5 text-xs text-center font-mono font-bold bg-white focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowNewCoModifiers(!showNewCoModifiers)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 border border-black text-xs font-bold cursor-pointer transition-colors ${
                        showNewCoModifiers ? 'bg-black text-white' : 'bg-white hover:bg-neutral-50'
                      }`}
                      title="設定各詞條強度共現修正"
                    >
                      <Sliders size={13} />
                      <span>強度選項</span>
                      {showNewCoModifiers ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    <button
                      type="submit"
                      className="flex items-center gap-1 px-3 py-2 border-2 border-black bg-black text-white hover:bg-neutral-800 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Plus size={13} />
                      <span>加入共現</span>
                    </button>
                  </div>

                  {/* Intensity options for new rule */}
                  {showNewCoModifiers && (
                    <div className="border border-black p-2 bg-white flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold">詞條強度共現修正</span>
                        <span className="text-[10px] text-neutral-500 font-mono">（各強度加成 -10 ~ +10）</span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {ALL_INTENSITIES.map((lvl) => {
                          const modVal = newCoModifiers[lvl] || 0;
                          return (
                            <div key={lvl} className="border border-black p-1 bg-neutral-50 flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-neutral-700">{lvl}</span>
                              <input
                                type="number"
                                min="-10"
                                max="10"
                                value={modVal}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  const cleanVal = isNaN(val) ? 0 : Math.max(-10, Math.min(10, val));
                                  setNewCoModifiers((prev) => ({
                                    ...prev,
                                    [lvl]: cleanVal,
                                  }));
                                }}
                                className={`w-full text-center text-xs font-mono font-bold border border-black/30 focus:border-black p-0.5 bg-white ${
                                  modVal > 0 ? 'text-emerald-700' : modVal < 0 ? 'text-rose-700' : 'text-neutral-800'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </form>

                {/* List of Co-occurrence Rules */}
                <div className="border-2 border-black max-h-72 overflow-y-auto flex flex-col divide-y divide-black text-xs">
                  {coRules.length === 0 ? (
                    <div className="p-6 text-center text-neutral-500 font-mono">
                      暫無指定共現權重規則，可透過上方表單新增。
                    </div>
                  ) : (
                    coRules.map((rule) => {
                      const currentId = panelMode === 'add' ? 'temp-current' : selectedTrait?.id;
                      const targetId = rule.traitAId === currentId ? rule.traitBId : rule.traitAId;
                      const other = getRuleOtherTrait(targetId);
                      const isPositive = rule.weight >= 0;
                      const isExpanded = expandedCoRuleIds.has(rule.id);
                      const hasModifiers =
                        rule.intensityModifiers &&
                        Object.values(rule.intensityModifiers).some((v) => typeof v === 'number' && v !== 0);

                      return (
                        <div
                          key={rule.id}
                          className="flex flex-col bg-white hover:bg-neutral-50 transition-colors"
                        >
                          <div className="p-2.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isPositive ? (
                                <ArrowUpRight size={15} className="text-emerald-700 shrink-0" />
                              ) : (
                                <ArrowDownRight size={15} className="text-rose-700 shrink-0" />
                              )}
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold">{other.name}</span>
                                  {hasModifiers && (
                                    <span className="text-[10px] font-mono border border-black px-1 bg-amber-50 text-amber-900 font-bold">
                                      含強度修正
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-neutral-500 font-mono">軸線：{other.axis}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono">權重:</span>
                              <input
                                type="number"
                                min="-10"
                                max="10"
                                value={rule.weight}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCoRules((prev) =>
                                    prev.map((r) => (r.id === rule.id ? { ...r, weight: val } : r)),
                                  );
                                }}
                                className={`border border-black px-1.5 py-0.5 text-xs w-14 text-center font-mono font-bold ${
                                  isPositive ? 'text-emerald-800' : 'text-rose-800'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => toggleExpandCoRule(rule.id)}
                                className={`border border-black px-2 py-1 text-[11px] font-bold cursor-pointer transition-colors flex items-center gap-0.5 ${
                                  isExpanded ? 'bg-black text-white' : 'bg-white hover:bg-neutral-100'
                                }`}
                                title="設定各強度選項加成"
                              >
                                <Sliders size={11} />
                                <span>強度</span>
                                {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCoRules((prev) => prev.filter((r) => r.id !== rule.id))}
                                className="border border-black p-1 hover:bg-black hover:text-white cursor-pointer transition-colors"
                                title="刪除"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Expanded Intensity Modifiers */}
                          {isExpanded && (
                            <div className="px-3 pb-2.5 pt-1 border-t border-black/10 bg-neutral-50 flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold">各詞條強度共現修正</span>
                                <span className="text-[10px] text-neutral-500 font-mono">（權重加成 -10 ~ +10）</span>
                              </div>
                              <div className="grid grid-cols-5 gap-1.5">
                                {ALL_INTENSITIES.map((lvl) => {
                                  const modVal = rule.intensityModifiers?.[lvl] || 0;
                                  return (
                                    <div key={lvl} className="border border-black p-1 bg-white flex flex-col items-center gap-0.5">
                                      <span className="text-[10px] font-bold text-neutral-700">{lvl}</span>
                                      <input
                                        type="number"
                                        min="-10"
                                        max="10"
                                        value={modVal}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value, 10);
                                          const cleanVal = isNaN(val) ? 0 : Math.max(-10, Math.min(10, val));
                                          setCoRules((prev) =>
                                            prev.map((r) => {
                                              if (r.id !== rule.id) return r;
                                              const prevMods = r.intensityModifiers || {};
                                              return {
                                                ...r,
                                                intensityModifiers: {
                                                  ...prevMods,
                                                  [lvl]: cleanVal,
                                                },
                                              };
                                            }),
                                          );
                                        }}
                                        className={`w-full text-center text-xs font-mono font-bold border border-black/30 focus:border-black p-0.5 ${
                                          modVal > 0
                                            ? 'text-emerald-700 bg-emerald-50/50'
                                            : modVal < 0
                                            ? 'text-rose-700 bg-rose-50/50'
                                            : 'text-neutral-800'
                                        }`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Soft Exclusions (軟排除) */}
            {editorTab === 'soft' && (
              <div className="flex flex-col gap-4 py-1">
                <div className="border border-black p-2.5 bg-neutral-50 text-xs text-neutral-700">
                  <span className="font-bold">說明：</span>軟排除代表「弱相容」性格特徵，設定較低的懲罰乘數（0.01~0.9）大幅壓低同時抽取機率，並附帶特殊說明。
                </div>

                {/* Add Soft Exclusion Sub-form */}
                <form
                  onSubmit={handleAddSoftRule}
                  className="border-2 border-black p-3 bg-neutral-100 flex flex-col gap-2 text-xs"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                      <label className="text-[10px] font-bold">軟排除對象詞條</label>
                      <select
                        required
                        value={newSoftTargetId}
                        onChange={(e) => setNewSoftTargetId(e.target.value)}
                        className="border border-black bg-white p-1.5 text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="">選擇詞條...</option>
                        {availableOtherTraits.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} [{t.axis}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 w-32">
                      <label className="text-[10px] font-bold">懲罰乘數 (0.01~0.95)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.01"
                        max="0.95"
                        value={newSoftMultiplier}
                        onChange={(e) => setNewSoftMultiplier(Number(e.target.value))}
                        className="border border-black p-1.5 text-xs text-center font-mono bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newSoftNote}
                      onChange={(e) => setNewSoftNote(e.target.value)}
                      placeholder="輸入弱相容情境說明..."
                      className="border border-black p-1.5 text-xs flex-1 bg-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1 px-3 py-1.5 border-2 border-black bg-black text-white hover:bg-neutral-800 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Plus size={13} />
                      <span>加入軟排除</span>
                    </button>
                  </div>
                </form>

                {/* List of Soft Exclusion Rules */}
                <div className="border-2 border-black max-h-72 overflow-y-auto flex flex-col divide-y divide-black text-xs">
                  {softRules.length === 0 ? (
                    <div className="p-6 text-center text-neutral-500 font-mono">
                      暫無軟排除規則。
                    </div>
                  ) : (
                    softRules.map((rule) => {
                      const currentId = panelMode === 'add' ? 'temp-current' : selectedTrait?.id;
                      const targetId = rule.traitAId === currentId ? rule.traitBId : rule.traitAId;
                      const other = getRuleOtherTrait(targetId);

                      return (
                        <div
                          key={rule.id}
                          className="p-2.5 flex flex-col gap-1.5 bg-white hover:bg-neutral-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              <span className="w-2 h-2 border border-black inline-block"></span>
                              <span>{other.name}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">[{other.axis}]</span>
                            </span>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-mono">乘數:</span>
                              <input
                                type="number"
                                step="0.05"
                                min="0.01"
                                max="0.95"
                                value={rule.penaltyMultiplier}
                                onChange={(e) => {
                                  const val = Math.round(Number(e.target.value) * 100) / 100;
                                  setSoftRules((prev) =>
                                    prev.map((r) =>
                                      r.id === rule.id ? { ...r, penaltyMultiplier: val } : r,
                                    ),
                                  );
                                }}
                                className="border border-black px-1 py-0.5 text-xs w-16 text-center font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setSoftRules((prev) => prev.filter((r) => r.id !== rule.id))}
                                className="border border-black p-1 hover:bg-black hover:text-white cursor-pointer transition-colors"
                                title="刪除"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-neutral-500 shrink-0">註解:</span>
                            <input
                              type="text"
                              value={rule.note}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSoftRules((prev) =>
                                  prev.map((r) => (r.id === rule.id ? { ...r, note: val } : r)),
                                );
                              }}
                              className="border border-neutral-300 p-1 text-xs text-neutral-800 w-full focus:border-black focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 4: Hard Exclusions (硬排除) */}
            {editorTab === 'hard' && (
              <div className="flex flex-col gap-4 py-1">
                <div className="border border-black p-2.5 bg-neutral-50 text-xs text-neutral-700">
                  <span className="font-bold">說明：</span>硬排除代表絕對邏輯互斥。抽中此詞條後，被硬排除的詞條將徹底從候選池中剔除，絕不並存。
                </div>

                {/* Add Hard Exclusion Sub-form */}
                <form
                  onSubmit={handleAddHardRule}
                  className="border-2 border-black p-3 bg-neutral-100 flex flex-col gap-2 text-xs"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                      <label className="text-[10px] font-bold">硬排除對象詞條</label>
                      <select
                        required
                        value={newHardTargetId}
                        onChange={(e) => setNewHardTargetId(e.target.value)}
                        className="border border-black bg-white p-1.5 text-xs focus:outline-none cursor-pointer"
                      >
                        <option value="">選擇詞條...</option>
                        {availableOtherTraits.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} [{t.axis}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newHardReason}
                      onChange={(e) => setNewHardReason(e.target.value)}
                      placeholder="輸入互斥原因（選填）..."
                      className="border border-black p-1.5 text-xs flex-1 bg-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1 px-3 py-1.5 border-2 border-black bg-black text-white hover:bg-neutral-800 text-xs font-bold cursor-pointer transition-colors"
                    >
                      <Plus size={13} />
                      <span>加入硬排除</span>
                    </button>
                  </div>
                </form>

                {/* List of Hard Exclusion Rules */}
                <div className="border-2 border-black max-h-72 overflow-y-auto flex flex-col divide-y divide-black text-xs">
                  {hardRules.length === 0 ? (
                    <div className="p-6 text-center text-neutral-500 font-mono">
                      暫無硬排除規則。
                    </div>
                  ) : (
                    hardRules.map((rule) => {
                      const currentId = panelMode === 'add' ? 'temp-current' : selectedTrait?.id;
                      const targetId = rule.traitAId === currentId ? rule.traitBId : rule.traitAId;
                      const other = getRuleOtherTrait(targetId);

                      return (
                        <div
                          key={rule.id}
                          className="p-2.5 flex items-center justify-between bg-white hover:bg-neutral-50 gap-2"
                        >
                          <div className="flex flex-col gap-1 flex-1 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 bg-black inline-block"></span>
                              <span className="font-bold">{other.name}</span>
                              <span className="text-[10px] text-neutral-500 font-mono">[{other.axis}]</span>
                              <span className="font-mono text-[10px] border border-black px-1 bg-black text-white ml-1">
                                硬排除
                              </span>
                            </div>
                            <input
                              type="text"
                              value={rule.reason || ''}
                              placeholder="無備註原因"
                              onChange={(e) => {
                                const val = e.target.value;
                                setHardRules((prev) =>
                                  prev.map((r) => (r.id === rule.id ? { ...r, reason: val } : r)),
                                );
                              }}
                              className="border border-neutral-300 p-1 text-xs text-neutral-800 focus:border-black focus:outline-none w-full"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => setHardRules((prev) => prev.filter((r) => r.id !== rule.id))}
                            className="border border-black p-1 hover:bg-black hover:text-white cursor-pointer transition-colors self-center"
                            title="刪除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Intensity Distribution & Modifiers */}
            {editorTab === 'intensity' && (
              <div className="flex flex-col gap-3 py-1">
                <div className="flex items-center gap-1.5 border-b border-black pb-1.5">
                  <Layers size={14} />
                  <span className="text-xs font-black tracking-wider uppercase">
                    性格強度前綴分佈 (常態分佈基準)
                  </span>
                </div>

                <div className="grid grid-cols-5 border border-black text-center text-xs">
                  {INTENSITY_DISTRIBUTION.map((item) => (
                    <div
                      key={item.level}
                      className="border-r last:border-r-0 border-black p-2 flex flex-col gap-1 bg-neutral-50"
                    >
                      <span className="font-bold">{item.level}</span>
                      <span className="font-mono text-[11px]">{(item.prob * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed font-mono mt-1 border-t border-black pt-2">
                  抽中詞條時，系統將依據常態分佈自動為詞條附加前綴強度（例如：「輕微」假性獨立、「強烈」假性獨立）。
                </p>
              </div>
            )}

            {/* Bottom Sticky Action Footer */}
            <div className="mt-auto pt-4 border-t-2 border-black flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancelEditOrAdd}
                className="flex items-center gap-1 text-xs text-neutral-600 font-mono hover:text-black cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>返回展示面板</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditOrAdd}
                  className="px-4 py-2 border border-black hover:bg-neutral-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveForm()}
                  className="px-5 py-2 border-2 border-black bg-black text-white hover:bg-neutral-800 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {panelMode === 'add' ? '確認添加詞條' : '儲存詞條修改'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state fallback */}
        {!selectedTrait && panelMode === 'view' && (
          <div className="p-12 text-center font-mono text-xs text-neutral-500">
            請在左側點選詞條，或點擊「添加詞條」建立新詞條。
          </div>
        )}
      </div>

      {/* Axis Management Modal */}
      <AxisManagementModal
        isOpen={isAxisModalOpen}
        onClose={() => setIsAxisModalOpen(false)}
        dataset={dataset}
        onSaveDataset={onSaveDataset}
      />
    </div>
  );
};
