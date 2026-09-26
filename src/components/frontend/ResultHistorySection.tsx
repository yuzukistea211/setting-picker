import React from 'react';
import { History, ArrowRight } from 'lucide-react';
import { ExtractionResult } from '../../types';

interface ResultHistorySectionProps {
  history: ExtractionResult[];
  currentResultId?: string;
  onSelectHistoryItem: (item: ExtractionResult) => void;
  onClearHistory: () => void;
}

export const ResultHistorySection: React.FC<ResultHistorySectionProps> = ({
  history,
  currentResultId,
  onSelectHistoryItem,
  onClearHistory,
}) => {
  return (
    <div className="border-t-2 border-black pt-4 flex flex-col gap-3 mt-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History size={15} />
          <span className="text-xs font-black tracking-wider uppercase">
            抽取歷史 ({history.length})
          </span>
        </div>

        {history.length > 0 && (
          <button
            id="btn-clear-history"
            type="button"
            onClick={onClearHistory}
            className="text-[11px] font-mono border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            清空歷史
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-xs font-mono text-neutral-400 py-2">無歷史記錄</div>
      ) : (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {history.map((hist) => {
            const isSelected = currentResultId === hist.id;
            return (
              <button
                key={hist.id}
                type="button"
                id={`history-item-${hist.id}`}
                onClick={() => onSelectHistoryItem(hist)}
                className={`w-full text-left border p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-2 border-black bg-neutral-100 font-bold'
                    : 'border-black hover:bg-neutral-50'
                }`}
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] border border-black px-1">
                      {new Date(hist.timestamp).toLocaleTimeString()}
                    </span>
                    {hist.characterName && (
                      <span className="border border-black bg-black text-white text-[10px] px-1 font-bold">
                        {hist.characterName}
                      </span>
                    )}
                    {hist.weakCompatibilities.length > 0 && (
                      <span className="border border-black text-[10px] px-1">
                        {hist.weakCompatibilities.length} 處弱相容
                      </span>
                    )}
                    {hist.notes && hist.notes.trim() && (
                      <span className="text-[10px] text-neutral-600 font-mono">[有備註]</span>
                    )}
                  </div>
                  <div className="truncate text-xs">
                    {hist.traits
                      .map((t) => `【${t.intensity}】${t.trait.name}${t.locked ? '🔒' : ''}`)
                      .join(' · ')}
                  </div>
                </div>

                <ArrowRight size={14} className="shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
