import React from 'react';
import {
  CharacterRelationship,
  NetworkCharacter,
  METRIC_DEFINITIONS,
} from '../../types';
import { MetricSlider } from './MetricSlider';
import { Edit3, Trash2, ArrowRightLeft, User } from 'lucide-react';

interface RelationshipCardProps {
  relationship: CharacterRelationship;
  characterA?: NetworkCharacter;
  characterB?: NetworkCharacter;
  onEdit: (rel: CharacterRelationship) => void;
  onDelete: (id: string) => void;
}

export const RelationshipCard: React.FC<RelationshipCardProps> = ({
  relationship,
  characterA,
  characterB,
  onEdit,
  onDelete,
}) => {
  const nameA = characterA?.name || '未知角色 A';
  const nameB = characterB?.name || '未知角色 B';

  return (
    <div
      id={`relationship-card-${relationship.id}`}
      className="border-2 border-black bg-white p-4 flex flex-col gap-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-shadow"
    >
      {/* Top Header: Characters & Surface Relation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 font-black text-sm text-black">
            <span className="border border-black bg-neutral-100 px-2 py-0.5">{nameA}</span>
            <ArrowRightLeft size={14} className="text-neutral-500" />
            <span className="border border-black bg-neutral-100 px-2 py-0.5">{nameB}</span>
          </div>

          {/* Surface Relation Pill */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono font-bold text-neutral-500">表層關係：</span>
            <span
              id={`badge-surface-${relationship.id}`}
              className="text-xs font-black bg-black text-white px-2.5 py-0.5 tracking-wider"
            >
              {relationship.surfaceRelation || '未設定'}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id={`btn-edit-rel-${relationship.id}`}
            type="button"
            onClick={() => onEdit(relationship)}
            className="flex items-center gap-1 px-2.5 py-1 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
            title="編輯雙向真實想法與5條數值條"
          >
            <Edit3 size={13} />
            <span>編輯關係</span>
          </button>
          <button
            id={`btn-delete-rel-${relationship.id}`}
            type="button"
            onClick={() => {
              if (window.confirm(`確定要刪除「${nameA}」與「${nameB}」之間的關係嗎？`)) {
                onDelete(relationship.id);
              }
            }}
            className="p-1 border border-neutral-300 hover:border-black text-neutral-500 hover:text-white hover:bg-black transition-colors cursor-pointer"
            title="刪除此關係"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Dual Directed Perspectives Grid (A -> B and B -> A) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Direction A -> B */}
        <div
          id={`perspective-a-to-b-${relationship.id}`}
          className="border border-black p-3 bg-neutral-50/50 flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-black/20 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-black" />
                <span className="text-xs font-black tracking-wide">
                  【{nameA}】看待【{nameB}】
                </span>
              </div>
              <span className="text-[10px] font-mono border border-black/40 px-1">A → B</span>
            </div>

            {/* True Thought */}
            <div className="mb-3">
              <div className="text-[11px] font-mono text-neutral-500 mb-0.5">當對方的真實想法：</div>
              <div className="text-xs font-bold text-black border-l-2 border-black pl-2 py-0.5 bg-white border border-neutral-200">
                {relationship.aToB.trueThought ? (
                  relationship.aToB.trueThought
                ) : (
                  <span className="text-neutral-400 italic">尚未填寫真實想法</span>
                )}
              </div>
            </div>

            {/* 5 Directed Metric Sliders (Read-only on card) */}
            <div className="flex flex-col gap-0.5">
              <div className="text-[11px] font-mono font-bold text-neutral-600 mb-1">
                單向心理數值 (-120 ~ +120)：
              </div>
              {METRIC_DEFINITIONS.map((def) => (
                <MetricSlider
                  key={def.key}
                  definition={def}
                  value={relationship.aToB.metrics[def.key]}
                  readonly={true}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Direction B -> A */}
        <div
          id={`perspective-b-to-a-${relationship.id}`}
          className="border border-black p-3 bg-neutral-50/50 flex flex-col justify-between gap-3"
        >
          <div>
            <div className="flex items-center justify-between gap-2 border-b border-black/20 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-black" />
                <span className="text-xs font-black tracking-wide">
                  【{nameB}】看待【{nameA}】
                </span>
              </div>
              <span className="text-[10px] font-mono border border-black/40 px-1">B → A</span>
            </div>

            {/* True Thought */}
            <div className="mb-3">
              <div className="text-[11px] font-mono text-neutral-500 mb-0.5">當對方的真實想法：</div>
              <div className="text-xs font-bold text-black border-l-2 border-black pl-2 py-0.5 bg-white border border-neutral-200">
                {relationship.bToA.trueThought ? (
                  relationship.bToA.trueThought
                ) : (
                  <span className="text-neutral-400 italic">尚未填寫真實想法</span>
                )}
              </div>
            </div>

            {/* 5 Directed Metric Sliders (Read-only on card) */}
            <div className="flex flex-col gap-0.5">
              <div className="text-[11px] font-mono font-bold text-neutral-600 mb-1">
                單向心理數值 (-120 ~ +120)：
              </div>
              {METRIC_DEFINITIONS.map((def) => (
                <MetricSlider
                  key={def.key}
                  definition={def}
                  value={relationship.bToA.metrics[def.key]}
                  readonly={true}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
