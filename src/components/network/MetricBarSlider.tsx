import React, { useState } from 'react';
import { Edit2, Check, X, Trash2 } from 'lucide-react';

interface MetricBarSliderProps {
  id: string;
  name: string;
  value: number;
  onChange: (newValue: number) => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

export const MetricBarSlider: React.FC<MetricBarSliderProps> = ({
  id,
  name,
  value,
  onChange,
  onRename,
  onDelete,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);

  const clampedValue = Math.max(-120, Math.min(120, Math.round(value)));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(-120, Math.min(120, parsed)));
    } else {
      onChange(0);
    }
  };

  const handleSaveName = () => {
    if (tempName.trim() && onRename) {
      onRename(tempName.trim());
    }
    setIsEditingName(false);
  };

  const handleKeyDownName = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setTempName(name);
      setIsEditingName(false);
    }
  };

  // Percentage from 0% (-120) to 100% (+120)
  // Center is 50%
  const isPositive = clampedValue >= 0;
  const barWidth = (Math.abs(clampedValue) / 120) * 50; // 0% to 50%
  const barLeft = isPositive ? 50 : 50 - barWidth;

  return (
    <div id={`metric-control-${id}`} className="flex flex-col gap-1.5 border border-black p-2 bg-white">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={handleKeyDownName}
                autoFocus
                className="border border-black px-1 py-0.5 text-xs font-bold bg-neutral-50 w-28"
                placeholder="指標名稱"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="p-0.5 border border-black hover:bg-black hover:text-white cursor-pointer"
                title="儲存名稱"
              >
                <Check size={11} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setTempName(name);
                  setIsEditingName(false);
                }}
                className="p-0.5 border border-black hover:bg-black hover:text-white cursor-pointer"
                title="取消"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <span className="font-bold tracking-tight truncate max-w-[140px]" title={name}>
                {name}
              </span>
              {onRename && (
                <button
                  type="button"
                  onClick={() => {
                    setTempName(name);
                    setIsEditingName(true);
                  }}
                  className="opacity-40 group-hover:opacity-100 hover:text-black p-0.5 cursor-pointer text-neutral-600"
                  title="修改指標名稱"
                >
                  <Edit2 size={10} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="opacity-40 group-hover:opacity-100 hover:text-red-600 p-0.5 cursor-pointer text-neutral-600"
                  title="刪除此指標"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onChange(Math.max(-120, clampedValue - 10))}
            className="px-1.5 py-0.5 border border-black text-[10px] font-mono hover:bg-black hover:text-white cursor-pointer"
          >
            -10
          </button>
          <button
            type="button"
            onClick={() => onChange(0)}
            className="px-1.5 py-0.5 border border-black text-[10px] font-mono hover:bg-black hover:text-white cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.min(120, clampedValue + 10))}
            className="px-1.5 py-0.5 border border-black text-[10px] font-mono hover:bg-black hover:text-white cursor-pointer"
          >
            +10
          </button>
          <input
            id={`input-number-${id}`}
            type="number"
            min={-120}
            max={120}
            value={clampedValue}
            onChange={handleInputChange}
            className="w-14 border border-black px-1 py-0.5 text-right text-xs font-mono font-bold bg-neutral-50"
          />
        </div>
      </div>

      {/* Visual Bidirectional Bar (-120 to +120, 0 at center) */}
      <div className="relative w-full h-3 bg-neutral-200 border border-black overflow-hidden">
        {/* Center Zero Line Indicator */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black z-10" />

        {/* Dynamic Metric Bar */}
        <div
          className="absolute top-0 bottom-0 bg-black transition-all duration-75"
          style={{
            left: `${barLeft}%`,
            width: `${barWidth}%`,
          }}
        />
      </div>

      {/* Range Slider */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-neutral-600">-120</span>
        <input
          id={`slider-${id}`}
          type="range"
          min={-120}
          max={120}
          step={1}
          value={clampedValue}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="w-full accent-black cursor-pointer h-1.5 bg-neutral-300 appearance-none border border-black"
        />
        <span className="text-[10px] font-mono text-neutral-600">+120</span>
      </div>
    </div>
  );
};
