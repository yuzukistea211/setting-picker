import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Filter, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { CooccurrenceRule, Dataset, HardExclusionRule, SoftExclusionRule, Trait } from '../../types';
import { getDatasetIndex } from '../../lib/generator';

interface MatrixHeatmapProps {
  dataset: Dataset;
  onSaveCellRules?: (params: {
    traitAId: string;
    traitBId: string;
    isHard: boolean;
    hardReason: string;
    isSoft: boolean;
    softPenalty: number;
    softNote: string;
    coocWeight: number;
  }) => void;
  onUpdateCooccurrence: (rule: CooccurrenceRule) => void;
  onUpdateSoftExclusion: (rule: SoftExclusionRule) => void;
  onUpdateHardExclusion: (rule: HardExclusionRule) => void;
  onDeleteRule: (type: 'cooccurrence' | 'soft' | 'hard', id: string) => void;
}

// Isolated Cell Editor Drawer: Prevents typing and slider changes from re-rendering the 1,200+ table cells
interface CellEditorDrawerProps {
  traitA: Trait;
  traitB: Trait;
  initialHard: HardExclusionRule | undefined;
  initialSoft: SoftExclusionRule | undefined;
  initialCooc: CooccurrenceRule | undefined;
  onClose: () => void;
  onSave: (params: {
    isHard: boolean;
    hardReason: string;
    isSoft: boolean;
    softPenalty: number;
    softNote: string;
    coocWeight: number;
  }) => void;
}

const CellEditorDrawer: React.FC<CellEditorDrawerProps> = React.memo(({
  traitA,
  traitB,
  initialHard,
  initialSoft,
  initialCooc,
  onClose,
  onSave,
}) => {
  const [isHard, setIsHard] = useState<boolean>(!!initialHard);
  const [hardReason, setHardReason] = useState<string>(initialHard?.reason || '');
  const [isSoft, setIsSoft] = useState<boolean>(!!initialSoft);
  const [softPenalty, setSoftPenalty] = useState<number>(initialSoft?.penaltyMultiplier ?? 0.2);
  const [softNote, setSoftNote] = useState<string>(initialSoft?.note || '');
  const [editCoocWeight, setEditCoocWeight] = useState<number>(initialCooc?.weight ?? 0);

  // Synchronize internal state whenever selected cell or props change
  useEffect(() => {
    setIsHard(!!initialHard);
    setHardReason(initialHard?.reason || '');
    setIsSoft(!!initialSoft);
    setSoftPenalty(initialSoft?.penaltyMultiplier ?? 0.2);
    setSoftNote(initialSoft?.note || '');
    setEditCoocWeight(initialCooc?.weight ?? 0);
  }, [traitA.id, traitB.id, initialHard, initialSoft, initialCooc]);

  const handleSave = () => {
    onSave({
      isHard,
      hardReason,
      isSoft,
      softPenalty,
      softNote,
      coocWeight: editCoocWeight,
    });
  };

  const handleResetAll = () => {
    setIsHard(false);
    setHardReason('');
    setIsSoft(false);
    setSoftPenalty(0.2);
    setSoftNote('');
    setEditCoocWeight(0);
  };

  return (
    <div
      id="dialog-matrix-editor"
      className="border-2 border-black p-4 bg-white flex flex-col gap-4 shadow-lg"
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          <span className="text-sm font-black tracking-wider uppercase">
            詞條關係編輯：【{traitA.name}】 × 【{traitB.name}】
          </span>
          <span className="text-[11px] font-mono text-neutral-500">
            ({traitA.axis} / {traitB.axis})
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="border border-black p-1 hover:bg-black hover:text-white cursor-pointer transition-colors"
          title="關閉"
        >
          <X size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hard Exclusion Configuration */}
        <div className="border border-black p-3 flex flex-col gap-2.5 bg-neutral-50/50">
          <label className="flex items-center gap-2 font-black text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isHard}
              onChange={(e) => setIsHard(e.target.checked)}
              className="accent-black w-4 h-4 cursor-pointer"
            />
            <span>硬排除 (布林強制阻斷 ✕)</span>
          </label>
          <span className="text-[10px] text-neutral-500">
            兩詞條將絕對不會在同一次抽取中同時出現。
          </span>
          {isHard && (
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[11px] font-bold">排除原因</span>
              <input
                type="text"
                value={hardReason}
                onChange={(e) => setHardReason(e.target.value)}
                placeholder="輸入邏輯矛盾理由（如：性格完全互斥）"
                className="border border-black p-1.5 text-xs bg-white focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Soft Exclusion Configuration */}
        <div className="border border-black p-3 flex flex-col gap-2.5 bg-neutral-50/50">
          <label className="flex items-center gap-2 font-black text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={isSoft}
              onChange={(e) => setIsSoft(e.target.checked)}
              className="accent-black w-4 h-4 cursor-pointer"
            />
            <span>軟排除 (弱相容懲罰係數)</span>
          </label>
          {isSoft && (
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">懲罰乘數 (0.01 ~ 0.5)</span>
                <span className="font-mono font-bold text-xs border border-black px-1.5 bg-white">
                  {softPenalty.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={softPenalty}
                onChange={(e) => setSoftPenalty(Math.round(parseFloat(e.target.value) * 100) / 100)}
                className="accent-black w-full cursor-pointer"
              />
              <span className="text-[10px] text-neutral-500">
                數值越小懲罰越重（0.1 代表同時抽中機率降至 10%）
              </span>
              <input
                type="text"
                value={softNote}
                onChange={(e) => setSoftNote(e.target.value)}
                placeholder="弱相容備註"
                className="border border-black p-1.5 text-xs bg-white focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Co-occurrence Weight Configuration */}
        <div className="border border-black p-3 flex flex-col gap-2.5 bg-neutral-50/50">
          <div className="flex items-center justify-between">
            <span className="font-black text-xs">共生權重 (-10 ~ +10)</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="-10"
                max="10"
                value={editCoocWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    setEditCoocWeight(Math.max(-10, Math.min(10, val)));
                  }
                }}
                className={`font-mono font-bold text-xs border border-black px-1.5 py-0.5 w-14 text-center bg-white ${
                  editCoocWeight > 0 ? 'text-emerald-800' : editCoocWeight < 0 ? 'text-rose-800' : ''
                }`}
              />
            </div>
          </div>
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={editCoocWeight}
            onChange={(e) => setEditCoocWeight(parseInt(e.target.value, 10))}
            className="accent-black w-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-neutral-500">
            <span>強負共生 (-10)</span>
            <span>中立 (0)</span>
            <span>強正共生 (+10)</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-black pt-3">
        <button
          type="button"
          onClick={handleResetAll}
          className="flex items-center gap-1 px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 cursor-pointer transition-colors"
          title="清除此兩詞條間的所有自訂規則與權重"
        >
          <RotateCcw size={12} />
          <span>清除全部規則 (恢復預設)</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 cursor-pointer transition-colors"
          >
            取消
          </button>
          <button
            id="btn-save-matrix-cell"
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 border-2 border-black bg-black text-white text-xs font-bold hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            儲存規則設定
          </button>
        </div>
      </div>
    </div>
  );
});

export const MatrixHeatmap: React.FC<MatrixHeatmapProps> = ({
  dataset,
  onSaveCellRules,
  onUpdateCooccurrence,
  onUpdateSoftExclusion,
  onUpdateHardExclusion,
  onDeleteRule,
}) => {
  const [selectedAxis, setSelectedAxis] = useState<string>('ALL');
  const [activeCell, setActiveCell] = useState<{ traitA: Trait; traitB: Trait } | null>(null);

  // Fast WeakMap index lookup
  const matrixData = useMemo(() => {
    return getDatasetIndex(dataset);
  }, [dataset]);

  // Filtered traits for the matrix
  const filteredTraits = useMemo(() => {
    if (selectedAxis === 'ALL') {
      return dataset.traits;
    }
    return dataset.traits.filter((t) => t.axis === selectedAxis);
  }, [dataset.traits, selectedAxis]);

  const handleOpenCell = useCallback((traitA: Trait, traitB: Trait) => {
    setActiveCell({ traitA, traitB });
  }, []);

  // Event delegation handler: removes thousands of closure allocations per render
  const handleTbodyClick = useCallback((e: React.MouseEvent<HTMLTableSectionElement>) => {
    const target = (e.target as HTMLElement).closest('td[data-row-id]');
    if (!target) return;
    const rowId = target.getAttribute('data-row-id');
    const colId = target.getAttribute('data-col-id');
    if (!rowId || !colId || rowId === colId) return;

    const traitA = matrixData.traitMap.get(rowId);
    const traitB = matrixData.traitMap.get(colId);
    if (traitA && traitB) {
      handleOpenCell(traitA, traitB);
    }
  }, [matrixData, handleOpenCell]);

  const handleSaveCell = useCallback(
    (params: {
      isHard: boolean;
      hardReason: string;
      isSoft: boolean;
      softPenalty: number;
      softNote: string;
      coocWeight: number;
    }) => {
      if (!activeCell) return;
      const { traitA, traitB } = activeCell;

      // Prefer atomic update if provided
      if (onSaveCellRules) {
        onSaveCellRules({
          traitAId: traitA.id,
          traitBId: traitB.id,
          ...params,
        });
      } else {
        const { isHard, hardReason, isSoft, softPenalty, softNote, coocWeight } = params;
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
            penaltyMultiplier: Math.round(Number(softPenalty) * 100) / 100,
            note: softNote,
          });
        } else if (existingSoft) {
          onDeleteRule('soft', existingSoft.id);
        }

        // Co-occurrence
        const existingCooc = matrixData.coocMap.get(key);
        if (coocWeight !== 0) {
          onUpdateCooccurrence({
            id: existingCooc?.id || `co-${Date.now()}`,
            traitAId: traitA.id,
            traitBId: traitB.id,
            weight: Number(coocWeight),
            intensityModifiers: existingCooc?.intensityModifiers || {},
          });
        } else if (existingCooc) {
          onDeleteRule('cooccurrence', existingCooc.id);
        }
      }

      setActiveCell(null);
    },
    [
      activeCell,
      matrixData,
      onSaveCellRules,
      onUpdateHardExclusion,
      onDeleteRule,
      onUpdateSoftExclusion,
      onUpdateCooccurrence,
    ],
  );

  const activeKey = activeCell ? `${activeCell.traitA.id}:${activeCell.traitB.id}` : null;
  const initialHard = activeKey ? matrixData.hardMap.get(activeKey) : undefined;
  const initialSoft = activeKey ? matrixData.softMap.get(activeKey) : undefined;
  const initialCooc = activeKey ? matrixData.coocMap.get(activeKey) : undefined;

  const numTraits = matrixData.numTraits;
  const hardMatrix = matrixData.hardMatrix;
  const softMultiplierMatrix = matrixData.softMultiplierMatrix;
  const coocWeightMatrix = matrixData.coocWeightMatrix;
  const traitIndexMap = matrixData.traitIndexMap;

  return (
    <div className="flex flex-col gap-5">
      {/* Top Filter & Legend */}
      <div className="flex flex-wrap items-center justify-between border-2 border-black p-3 gap-3 bg-(--main-color)">
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
          <div className="flex items-center gap-1.5" title="強制互斥，兩者絕不共同出現">
            <span className="w-5 h-5 border border-black bg-black text-white flex items-center justify-center font-bold text-[10px]">
              ✕
            </span>
            <span>硬排除</span>
          </div>
          <div className="flex items-center gap-1.5" title="軟排除，同出機率被乘以係數（如 0.2）">
            <span className="w-5 h-5 border border-dashed border-black bg-white flex items-center justify-center font-bold text-[10px]">
              0.2
            </span>
            <span>軟排除 (懲罰係數)</span>
          </div>
          <div className="flex items-center gap-1.5" title="正共生權重，提高同時被抽出的機率">
            <span className="w-5 h-5 border-2 border-black bg-white flex items-center justify-center font-bold text-[10px]">
              +6
            </span>
            <span>正共現權重</span>
          </div>
          <div className="flex items-center gap-1.5" title="負共生權重，降低同時被抽出的機率">
            <span className="w-5 h-5 border border-black bg-white flex items-center justify-center text-[10px]">
              -6
            </span>
            <span>負共現權重</span>
          </div>
          <div className="flex items-center gap-1.5" title="同時設定了共現權重與軟排除係數">
            <span className="border border-dashed border-black bg-neutral-100 px-1 py-0.5 text-[9px] font-bold">
              +6 [0.2]
            </span>
            <span>共現 + 軟排除</span>
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
                  className="border-b-2 border-r border-black p-2 min-w-[46px] max-w-[46px] text-center font-bold whitespace-nowrap overflow-hidden text-ellipsis bg-white"
                  title={`${t.name} (${t.axis}) 基準權重: ${t.baseWeight || 10}`}
                >
                  <span className="inline-block transform -rotate-45 text-[10px]">
                    {t.name.slice(0, 4)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody onClick={handleTbodyClick}>
            {filteredTraits.map((rowTrait) => (
              <tr key={rowTrait.id} className="hover:bg-neutral-50">
                {/* Row Header */}
                <th
                  className="border-b border-r-2 border-black p-2 font-bold text-left bg-white sticky left-0 z-10 whitespace-nowrap"
                  title={`${rowTrait.description || rowTrait.name} (基準權重: ${rowTrait.baseWeight || 10})`}
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
                  if (rowTrait.id === colTrait.id) {
                    return (
                      <td
                        key={colTrait.id}
                        className="border-b border-r border-black p-1 text-center bg-neutral-200 select-none"
                      >
                        -
                      </td>
                    );
                  }

                  const rowIdx = traitIndexMap.get(rowTrait.id);
                  const colIdx = traitIndexMap.get(colTrait.id);
                  let isHardCell = false;
                  let softMultiplier = 1.0;
                  let coocWeight = 0;

                  if (rowIdx !== undefined && colIdx !== undefined) {
                    const offset = rowIdx * numTraits + colIdx;
                    isHardCell = hardMatrix[offset] === 1;
                    softMultiplier = Math.round(softMultiplierMatrix[offset] * 100) / 100;
                    coocWeight = coocWeightMatrix[offset];
                  }

                  let cellElement: React.ReactNode = null;
                  let cellClass = 'border-b border-r border-black p-1 text-center cursor-pointer select-none ';

                  if (isHardCell) {
                    cellElement = '✕';
                    cellClass += 'bg-black text-white font-bold';
                  } else if (softMultiplier < 1.0 && coocWeight !== 0) {
                    // Both soft exclusion AND co-occurrence weight are configured!
                    const weightStr = coocWeight > 0 ? `+${coocWeight}` : `${coocWeight}`;
                    cellElement = (
                      <div className="flex flex-col items-center justify-center leading-none py-0.5">
                        <span className={coocWeight > 0 ? 'font-black text-emerald-950' : 'font-bold text-rose-950'}>
                          {weightStr}
                        </span>
                        <span className="text-[9px] font-mono text-neutral-600">[{softMultiplier.toFixed(2)}]</span>
                      </div>
                    );
                    cellClass += 'border-dashed bg-neutral-100 hover:bg-neutral-200 font-bold';
                  } else if (softMultiplier < 1.0) {
                    cellElement = softMultiplier.toFixed(2);
                    cellClass += 'border-dashed font-bold hover:bg-neutral-100 text-neutral-800';
                  } else if (coocWeight !== 0) {
                    const weightStr = coocWeight > 0 ? `+${coocWeight}` : `${coocWeight}`;
                    cellElement = weightStr;
                    cellClass += coocWeight > 0
                      ? 'font-black text-black hover:bg-neutral-100'
                      : 'font-bold text-neutral-800 hover:bg-neutral-100';
                  } else {
                    cellElement = '·';
                    cellClass += 'hover:bg-neutral-100 text-neutral-300';
                  }

                  const tooltipTitle = [
                    `【${rowTrait.name}】×【${colTrait.name}】`,
                    isHardCell ? '硬排除：互斥' : null,
                    coocWeight !== 0 ? `共現權重：${coocWeight > 0 ? `+${coocWeight}` : coocWeight}` : null,
                    softMultiplier < 1.0 ? `軟排除懲罰：${softMultiplier.toFixed(2)}` : null,
                    '點擊以修改規則'
                  ].filter(Boolean).join(' | ');

                  return (
                    <td
                      key={colTrait.id}
                      data-row-id={rowTrait.id}
                      data-col-id={colTrait.id}
                      className={cellClass}
                      title={tooltipTitle}
                    >
                      {cellElement}
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
        <CellEditorDrawer
          key={`${activeCell.traitA.id}:${activeCell.traitB.id}`}
          traitA={activeCell.traitA}
          traitB={activeCell.traitB}
          initialHard={initialHard}
          initialSoft={initialSoft}
          initialCooc={initialCooc}
          onClose={() => setActiveCell(null)}
          onSave={handleSaveCell}
        />
      )}
    </div>
  );
};

