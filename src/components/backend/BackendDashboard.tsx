import React, { useState } from 'react';
import { Grid, FileText, BarChart3 } from 'lucide-react';
import { CooccurrenceRule, Dataset, HardExclusionRule, SoftExclusionRule } from '../../types';
import { MatrixHeatmap } from './MatrixHeatmap';
import { TraitDetailView } from './TraitDetailView';
import { SimulationAuditView } from './SimulationAuditView';

interface BackendDashboardProps {
  dataset: Dataset;
  onSaveDataset: (updated: Dataset) => void;
}

export const BackendDashboard: React.FC<BackendDashboardProps> = ({ dataset, onSaveDataset }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'details' | 'simulation'>('matrix');

  const handleUpdateCooccurrence = (rule: CooccurrenceRule) => {
    const existingIndex = dataset.cooccurrenceRules.findIndex(
      (r) =>
        (r.traitAId === rule.traitAId && r.traitBId === rule.traitBId) ||
        (r.traitAId === rule.traitBId && r.traitBId === rule.traitAId),
    );

    let updatedRules = [...dataset.cooccurrenceRules];
    if (existingIndex >= 0) {
      updatedRules[existingIndex] = rule;
    } else {
      updatedRules.push(rule);
    }
    onSaveDataset({ ...dataset, cooccurrenceRules: updatedRules });
  };

  const handleUpdateSoftExclusion = (rule: SoftExclusionRule) => {
    const existingIndex = dataset.softExclusions.findIndex(
      (r) =>
        (r.traitAId === rule.traitAId && r.traitBId === rule.traitBId) ||
        (r.traitAId === rule.traitBId && r.traitBId === rule.traitAId),
    );

    let updatedRules = [...dataset.softExclusions];
    if (existingIndex >= 0) {
      updatedRules[existingIndex] = rule;
    } else {
      updatedRules.push(rule);
    }
    onSaveDataset({ ...dataset, softExclusions: updatedRules });
  };

  const handleUpdateHardExclusion = (rule: HardExclusionRule) => {
    const existingIndex = dataset.hardExclusions.findIndex(
      (r) =>
        (r.traitAId === rule.traitAId && r.traitBId === rule.traitBId) ||
        (r.traitAId === rule.traitBId && r.traitBId === rule.traitAId),
    );

    let updatedRules = [...dataset.hardExclusions];
    if (existingIndex >= 0) {
      updatedRules[existingIndex] = rule;
    } else {
      updatedRules.push(rule);
    }
    onSaveDataset({ ...dataset, hardExclusions: updatedRules });
  };

  const handleDeleteRule = (type: 'cooccurrence' | 'soft' | 'hard', id: string) => {
    if (type === 'cooccurrence') {
      onSaveDataset({
        ...dataset,
        cooccurrenceRules: dataset.cooccurrenceRules.filter((r) => r.id !== id),
      });
    } else if (type === 'soft') {
      onSaveDataset({
        ...dataset,
        softExclusions: dataset.softExclusions.filter((r) => r.id !== id),
      });
    } else if (type === 'hard') {
      onSaveDataset({
        ...dataset,
        hardExclusions: dataset.hardExclusions.filter((r) => r.id !== id),
      });
    }
  };

  return (
    <div id="backend-dashboard" className="w-full flex flex-col gap-6">
      {/* Backend Module Tabs */}
      <div className="flex flex-wrap border-2 border-black bg-white">
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
