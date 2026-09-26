import React, { useState } from 'react';
import { Grid, FileText, BarChart3 } from 'lucide-react';
import { CooccurrenceRule, Dataset, HardExclusionRule, IntensityLevel, SoftExclusionRule } from '../../types';
import { MatrixHeatmap } from './MatrixHeatmap';
import { TraitDetailView } from './TraitDetailView';
import { SimulationAuditView } from './SimulationAuditView';

interface BackendDashboardProps {
  dataset: Dataset;
  onSaveDataset: (updated: Dataset) => void;
}

export const BackendDashboard: React.FC<BackendDashboardProps> = ({ dataset, onSaveDataset }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'details' | 'simulation'>('matrix');

  // Atomic update for matrix cell rules (eliminates race conditions and stale closure overwrites)
  const handleSaveCellRules = (params: {
    traitAId: string;
    traitBId: string;
    isHard: boolean;
    hardReason: string;
    isSoft: boolean;
    softPenalty: number;
    softNote: string;
    coocWeight: number;
    coocModifiers?: { [key in IntensityLevel]?: number };
  }) => {
    const {
      traitAId,
      traitBId,
      isHard,
      hardReason,
      isSoft,
      softPenalty,
      softNote,
      coocWeight,
      coocModifiers,
    } = params;

    const isPair = (a: string, b: string) =>
      (a === traitAId && b === traitBId) || (a === traitBId && b === traitAId);

    // Filter out all existing rules between trait A and trait B
    const updatedHard = dataset.hardExclusions.filter((r) => !isPair(r.traitAId, r.traitBId));
    if (isHard) {
      updatedHard.push({
        id: `hard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        traitAId,
        traitBId,
        reason: hardReason.trim() || '設定邏輯互斥',
      });
    }

    const updatedSoft = dataset.softExclusions.filter((r) => !isPair(r.traitAId, r.traitBId));
    if (isSoft) {
      updatedSoft.push({
        id: `soft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        traitAId,
        traitBId,
        penaltyMultiplier: Math.round(Number(softPenalty) * 100) / 100,
        note: softNote.trim() || '弱相容情境說明',
      });
    }

    const updatedCooc = dataset.cooccurrenceRules.filter((r) => !isPair(r.traitAId, r.traitBId));
    const hasModifiers =
      coocModifiers && Object.values(coocModifiers).some((v) => typeof v === 'number' && v !== 0);

    if (coocWeight !== 0 || hasModifiers) {
      updatedCooc.push({
        id: `co-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        traitAId,
        traitBId,
        weight: Number(coocWeight),
        ...(hasModifiers ? { intensityModifiers: coocModifiers } : {}),
      });
    }

    const updatedDataset: Dataset = {
      ...dataset,
      updatedAt: Date.now(),
      hardExclusions: updatedHard,
      softExclusions: updatedSoft,
      cooccurrenceRules: updatedCooc,
    };

    onSaveDataset(updatedDataset);
  };

  const handleUpdateCooccurrence = (rule: CooccurrenceRule) => {
    const isPair = (a: string, b: string) =>
      (a === rule.traitAId && b === rule.traitBId) || (a === rule.traitBId && b === rule.traitAId);

    const updatedRules = dataset.cooccurrenceRules.filter((r) => !isPair(r.traitAId, r.traitBId));
    updatedRules.push(rule);

    onSaveDataset({
      ...dataset,
      updatedAt: Date.now(),
      cooccurrenceRules: updatedRules,
    });
  };

  const handleUpdateSoftExclusion = (rule: SoftExclusionRule) => {
    const isPair = (a: string, b: string) =>
      (a === rule.traitAId && b === rule.traitBId) || (a === rule.traitBId && b === rule.traitAId);

    const updatedRules = dataset.softExclusions.filter((r) => !isPair(r.traitAId, r.traitBId));
    updatedRules.push(rule);

    onSaveDataset({
      ...dataset,
      updatedAt: Date.now(),
      softExclusions: updatedRules,
    });
  };

  const handleUpdateHardExclusion = (rule: HardExclusionRule) => {
    const isPair = (a: string, b: string) =>
      (a === rule.traitAId && b === rule.traitBId) || (a === rule.traitBId && b === rule.traitAId);

    const updatedRules = dataset.hardExclusions.filter((r) => !isPair(r.traitAId, r.traitBId));
    updatedRules.push(rule);

    onSaveDataset({
      ...dataset,
      updatedAt: Date.now(),
      hardExclusions: updatedRules,
    });
  };

  const handleDeleteRule = (type: 'cooccurrence' | 'soft' | 'hard', id: string) => {
    if (type === 'cooccurrence') {
      onSaveDataset({
        ...dataset,
        updatedAt: Date.now(),
        cooccurrenceRules: dataset.cooccurrenceRules.filter((r) => r.id !== id),
      });
    } else if (type === 'soft') {
      onSaveDataset({
        ...dataset,
        updatedAt: Date.now(),
        softExclusions: dataset.softExclusions.filter((r) => r.id !== id),
      });
    } else if (type === 'hard') {
      onSaveDataset({
        ...dataset,
        updatedAt: Date.now(),
        hardExclusions: dataset.hardExclusions.filter((r) => r.id !== id),
      });
    }
  };

  return (
    <div id="backend-dashboard" className="w-full flex flex-col gap-6">
      {/* Backend Module Tabs */}
      <div className="flex flex-wrap border-2 border-black bg-(--main-color)">
        <button
          id="tab-backend-matrix"
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-1.5 px-5 py-3 text-xs font-black uppercase tracking-wider border-r border-black transition-colors cursor-pointer ${
            activeTab === 'matrix' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
          }`}
        >
          <Grid size={15} />
          <span>矩陣熱力圖</span>
        </button>

        <button
          id="tab-backend-details"
          type="button"
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-1.5 px-5 py-3 text-xs font-black uppercase tracking-wider border-r border-black transition-colors cursor-pointer ${
            activeTab === 'details' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
          }`}
        >
          <FileText size={15} />
          <span>詞條詳情</span>
        </button>

        <button
          id="tab-backend-simulation"
          type="button"
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-1.5 px-5 py-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'simulation' ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
          }`}
        >
          <BarChart3 size={15} />
          <span>批次模擬審核</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'matrix' && (
        <MatrixHeatmap
          dataset={dataset}
          onSaveCellRules={handleSaveCellRules}
          onUpdateCooccurrence={handleUpdateCooccurrence}
          onUpdateSoftExclusion={handleUpdateSoftExclusion}
          onUpdateHardExclusion={handleUpdateHardExclusion}
          onDeleteRule={handleDeleteRule}
        />
      )}

      {activeTab === 'details' && (
        <TraitDetailView dataset={dataset} onSaveDataset={onSaveDataset} />
      )}

      {activeTab === 'simulation' && <SimulationAuditView dataset={dataset} />}
    </div>
  );
};
