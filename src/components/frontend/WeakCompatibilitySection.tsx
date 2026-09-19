import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { WeakCompatibilityInfo } from '../../types';

interface WeakCompatibilitySectionProps {
  weakCompatibilities: WeakCompatibilityInfo[];
}

export const WeakCompatibilitySection: React.FC<WeakCompatibilitySectionProps> = ({
  weakCompatibilities,
}) => {
  if (weakCompatibilities.length === 0) return null;

  return (
    <div
      id="section-weak-compatibility"
      className="border-2 border-black p-4 bg-white flex flex-col gap-3"
    >
      <div className="flex items-center gap-2 border-b border-black pb-2">
        <AlertTriangle size={16} />
        <span className="text-xs font-black tracking-wider uppercase">
          弱相容心理動態解析 ({weakCompatibilities.length})
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {weakCompatibilities.map((wc, index) => (
          <div
            key={index}
            id={`card-weak-compat-${index}`}
            className="border border-black p-3 bg-white flex flex-col gap-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <span className="border border-black bg-black text-white px-1.5 py-0.5 text-[10px]">
                  弱相容
                </span>
                <span>【{wc.intensityA}】{wc.traitA.name}</span>
                <span className="font-mono text-neutral-500">×</span>
                <span>【{wc.intensityB}】{wc.traitB.name}</span>
              </div>
              <span className="text-[10px] font-mono border border-black px-1 py-0.5">
                {wc.reasonType === 'soft_exclusion' ? '軟排除' : '強負相關'}
              </span>
            </div>

            <div className="border-t border-black pt-1.5 text-xs text-black font-medium leading-relaxed">
              {wc.note}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
