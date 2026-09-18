import React, { useState, useMemo } from 'react';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { CooccurrenceRule, Dataset, HardExclusionRule, SoftExclusionRule, Trait } from '../../types';

interface MatrixHeatmapProps {
  dataset: Dataset;
  onUpdateCooccurrence: (rule: CooccurrenceRule) => void;
  onUpdateSoftExclusion: (rule: SoftExclusionRule) => void;
  onUpdateHardExclusion: (rule: HardExclusionRule) => void;
  onDeleteRule: (type: 'cooccurrence' | 'soft' | 'hard', id: string) => void;
}

export const MatrixHeatmap: React.FC<MatrixHeatmapProps> = ({
  dataset,
  onUpdateCooccurrence,
  onUpdateSoftExclusion,
  onUpdateHardExclusion,
  onDeleteRule,
}) => {
  const [selectedAxis, setSelectedAxis] = useState<string>('ALL');
  const [activeCell, setActiveCell] = useState<{ traitA: Trait; traitB: Trait } | null>(null);

  // Filtered traits for the matrix
  const filteredTraits = useMemo(() => {
    if (selectedAxis === 'ALL') {
      return dataset.traits;
    }
    return dataset.traits.filter((t) => t.axis === selectedAxis);
  }, [dataset.traits, selectedAxis]);

  // Quick lookup maps
  const matrixData = useMemo(() => {
    const hardMap = new Map<string, HardExclusionRule>();
    const softMap = new Map<string, SoftExclusionRule>();
    const coocMap = new Map<string, CooccurrenceRule>();

    for (const h of dataset.hardExclusions) {
      hardMap.set(`${h.traitAId}:${h.traitBId}`, h);
      hardMap.set(`${h.traitBId}:${h.traitAId}`, h);
    }
    for (const s of dataset.softExclusions) {
      softMap.set(`${s.traitAId}:${s.traitBId}`, s);
      softMap.set(`${s.traitBId}:${s.traitAId}`, s);
    }
    for (const c of dataset.cooccurrenceRules) {
      coocMap.set(`${c.traitAId}:${c.traitBId}`, c);
      coocMap.set(`${c.traitBId}:${c.traitAId}`, c);
    }

    return { hardMap, softMap, coocMap };
  }, [dataset.hardExclusions, dataset.softExclusions, dataset.cooccurrenceRules]);

  // Currently selected cell details
  const currentCellInfo = useMemo(() => {
    if (!activeCell) return null;
    const key = `${activeCell.traitA.id}:${activeCell.traitB.id}`;
    const hard = matrixData.hardMap.get(key);
    const soft = matrixData.softMap.get(key);
    const cooc = matrixData.coocMap.get(key);
    return { hard, soft, cooc };
  }, [activeCell, matrixData]);

  // Edit state for active cell
  const [editCoocWeight, setEditCoocWeight] = useState<number>(0);
  const [isHard, setIsHard] = useState<boolean>(false);
  const [hardReason, setHardReason] = useState<string>('');
  const [isSoft, setIsSoft] = useState<boolean>(false);
  const [softPenalty, setSoftPenalty] = useState<number>(0.2);
  const [softNote, setSoftNote] = useState<string>('');

  const handleOpenCell = (traitA: Trait, traitB: Trait) => {
    setActiveCell({ traitA, traitB });
    const key = `${traitA.id}:${traitB.id}`;
    const hard = matrixData.hardMap.get(key);
    const soft = matrixData.softMap.get(key);
    const cooc = matrixData.coocMap.get(key);

    setIsHard(!!hard);
    setHardReason(hard?.reason || '');

    setIsSoft(!!soft);
    setSoftPenalty(soft?.penaltyMultiplier ?? 0.2);
    setSoftNote(soft?.note || '');

    setEditCoocWeight(cooc?.weight ?? 0);
  };

  const handleSaveCell = () => {
    if (!activeCell) return;
    const { traitA, traitB } = activeCell;
    const key = `${traitA.id}:${traitB.id}`;

    // Hard Exclusion
    const existingHard = matrixData.hardMap.get(key);
    if (isHard) {
      onUpdateHardExclusion({
        id: existingHard?.id || `hard-${Date.now()}`,
        traitAId: traitA.id,
        traitBId: traitB.id,
        reason: hardReason,
      });
    } else if (existingHard) {
      onDeleteRule('hard', existingHard.id);
    }

    // Soft Exclusion
    const existingSoft = matrixData.softMap.get(key);
    if (isSoft) {
      onUpdateSoftExclusion({
        id: existingSoft?.id || `soft-${Date.now()}`,
        traitAId: traitA.id,
        traitBId: traitB.id,
        penaltyMultiplier: Number(softPenalty),
        note: softNote,
      });
    } else if (existingSoft) {
      onDeleteRule('soft', existingSoft.id);
    }

    // Co-occurrence
    const existingCooc = matrixData.coocMap.get(key);
    if (editCoocWeight !== 0) {
      onUpdateCooccurrence({
        id: existingCooc?.id || `co-${Date.now()}`,
        traitAId: traitA.id,
        traitBId: traitB.id,
        weight: Number(editCoocWeight),
        intensityModifiers: existingCooc?.intensityModifiers || {},
      });
    } else if (existingCooc) {
      onDeleteRule('cooccurrence', existingCooc.id);
    }

    setActiveCell(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Top Filter & Legend */}
      <div className="flex flex-wrap items-center justify-between border-2 border-black p-3 gap-3 bg-white">
        <div className="flex items-center gap-2">
          <Filter size={16} />
          <span className="text-xs font-bold uppercase tracking-wider">軸線過濾</span>
          <select
            id="select-matrix-axis"
            value={selectedAxis}
            onChange={(e) => setSelectedAxis(e.target.value)}
            className="border border-black bg-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="ALL">全部軸線 ({dataset.traits.length} 詞條)</option>
            {dataset.axes.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Crisp black-and-white legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 border border-black bg-black text-white flex items-center justify-center font-bold text-[10px]">
              ✕
            </span>
            <span>硬排除</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 border border-dashed border-black bg-white flex items-center justify-center font-bold text-[10px]">
              0.2
            </span>
            <span>軟排除 (懲罰係數)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 border-2 border-black bg-white flex items-center justify-center font-bold text-[10px]">
              +6
            </span>
            <span>正共現</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 border border-black bg-white flex items-center justify-center text-[10px]">
              -6
            </span>
            <span>負共現</span>
          </div>
        </div>
      </div>

      {/* Heatmap Matrix Table */}
      <div className="border-2 border-black overflow-x-auto bg-white max-h-[600px] overflow-y-auto">
        <table className="w-full border-collapse text-xs font-mono">
          <thead>
            <tr className="sticky top-0 bg-white z-20">
              <th className="border-b-2 border-r-2 border-black p-2 min-w-[130px] bg-white sticky left-0 z-30 text-left font-black">
                詞條名稱
              </th>
              {filteredTraits.map((t) => (
                <th
                  key={t.id}
                  className="border-b-2 border-r border-black p-2 min-w-[42px] max-w-[42px] text-center font-bold whitespace-nowrap overflow-hidden text-ellipsis bg-white"
                  title={`${t.name} (${t.axis})`}
                >
                  <span className="inline-block transform -rotate-45 text-[10px]">
                    {t.name.slice(0, 4)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredTraits.map((rowTrait) => (
              <tr key={rowTrait.id} className="hover:bg-neutral-50">
                {/* Row Header */}
                <th
                  className="border-b border-r-2 border-black p-2 font-bold text-left bg-white sticky left-0 z-10 whitespace-nowrap"
                  title={rowTrait.description}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate max-w-[100px]">{rowTrait.name}</span>
                    <span className="text-[9px] border border-black px-1">
                      {rowTrait.axis.slice(0, 2)}
                    </span>
                  </div>
                </th>

                {/* Cells */}
                {filteredTraits.map((colTrait) => {
                  const isSelf = rowTrait.id === colTrait.id;
                  const key = `${rowTrait.id}:${colTrait.id}`;
                  const hard = matrixData.hardMap.get(key);
                  const soft = matrixData.softMap.get(key);
                  const cooc = matrixData.coocMap.get(key);

                  if (isSelf) {
                    return (
                      <td
                        key={colTrait.id}
                        className="border-b border-r border-black p-1 text-center bg-neutral-200"
                      >
                        -
                      </td>
                    );
                  }

                  let cellContent = '';
                  let cellClass = 'border-b border-r border-black p-1 text-center cursor-pointer ';

                  if (hard) {
                    cellContent = '✕';
                    cellClass += 'bg-black text-white font-bold';
                  } else if (soft) {
                    cellContent = `${soft.penaltyMultiplier}`;
                    cellClass += 'border-dashed font-bold hover:bg-neutral-100';
                  } else if (cooc) {
                    cellContent = (cooc.weight > 0 ? `+${cooc.weight}` : `${cooc.weight}`);
                    if (cooc.weight > 0) {
                      cellClass += 'font-black hover:bg-neutral-100';
                    } else {
                      cellClass += 'font-bold hover:bg-neutral-100';
                    }
                  } else {
                    cellClass += 'hover:bg-neutral-100 text-neutral-300';
                  }

                  return (
                    <td
                      key={colTrait.id}
                      onClick={() => handleOpenCell(rowTrait, colTrait)}
                      className={cellClass}
                      title={`${rowTrait.name} × ${colTrait.name}`}
                    >
                      {cellContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Cell Inspector / Editor Drawer */}
      {activeCell && (
        <div
          id="dialog-matrix-editor"
          className="border-2 border-black p-4 bg-white flex flex-col gap-4"
        >
          <div className="flex items-center justify-between border-b-2 border-black pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={16} />
              <span className="text-sm font-black tracking-wider uppercase">
                詞條關係編輯：【{activeCell.traitA.name}】 × 【{activeCell.traitB.name}】
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveCell(null)}
              className="border border-black p-1 hover:bg-black hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hard Exclusion Configuration */}
            <div className="border border-black p-3 flex flex-col gap-2.5">
              <label className="flex items-center gap-2 font-black text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHard}
                  onChange={(e) => setIsHard(e.target.checked)}
                  className="accent-black w-4 h-4"
                />
                <span>硬排除 (布林強制阻斷)</span>
              </label>
              {isHard && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold">排除原因</span>
                  <input
                    type="text"
                    value={hardReason}
                    onChange={(e) => setHardReason(e.target.value)}
                    placeholder="輸入邏輯矛盾理由"
                    className="border border-black p-1.5 text-xs focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Soft Exclusion Configuration */}
            <div className="border border-black p-3 flex flex-col gap-2.5">
              <label className="flex items-center gap-2 font-black text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSoft}
                  onChange={(e) => setIsSoft(e.target.checked)}
                  className="accent-black w-4 h-4"
                />
                <span>軟排除 (懲罰係數與弱相容)</span>
              </label>
              {isSoft && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold">懲罰乘數 (0.01 ~ 0.5)</span>
                    <span className="font-mono text-xs">{softPenalty}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.05"
                    value={softPenalty}
                    onChange={(e) => setSoftPenalty(parseFloat(e.target.value))}
                    className="accent-black cursor-pointer"
                  />
                  <span className="text-[11px] font-bold">弱相容獨立註解</span>
                  <textarea
                    rows={2}
                    value={softNote}
                    onChange={(e) => setSoftNote(e.target.value)}
                    placeholder="輸入該矛盾組合的合理化動態描述"
                    className="border border-black p-1.5 text-xs focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>

            {/* Co-occurrence Weight Configuration */}
            <div className="border border-black p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between font-black text-xs">
                <span>共現權重 (-10 ~ +10)</span>
                <span className="font-mono">{editCoocWeight > 0 ? `+${editCoocWeight}` : editCoocWeight}</span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="1"
                value={editCoocWeight}
                onChange={(e) => setEditCoocWeight(parseInt(e.target.value, 10))}
                className="accent-black cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span>-10 (極度排斥)</span>
                <span>0 (無關)</span>
                <span>+10 (強烈綁定)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-black pt-2">
            <button
              type="button"
              onClick={() => setActiveCell(null)}
              className="px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveCell}
              className="px-4 py-1.5 border-2 border-black bg-black text-white text-xs font-black hover:bg-white hover:text-black cursor-pointer transition-colors"
            >
              儲存變更
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
