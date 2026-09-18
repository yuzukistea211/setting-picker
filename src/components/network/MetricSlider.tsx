import React from 'react';
import { MetricDefinition } from '../../types';

interface MetricSliderProps {
  definition: MetricDefinition;
  value: number; // -120 to 120
  onChange?: (val: number) => void;
  readonly?: boolean;
}

export const MetricSlider: React.FC<MetricSliderProps> = ({
  definition,
  value,
  onChange,
  readonly = false,
}) => {
  // Ensure value is within bounds
  const clampedVal = Math.max(-120, Math.min(120, value ?? 0));

  // Percentage from 0% to 100% across the -120 to +120 span
  const overallPercent = ((clampedVal + 120) / 240) * 100;

  // Bipolar bar calculation from center (0 = 50%)
  const isPositive = clampedVal >= 0;
  const barLeft = isPositive ? 50 : overallPercent;
  const barWidth = Math.abs(clampedVal) / 120 * 50;

  // Color theme based on value
  const getValueColor = () => {
    if (clampedVal > 30) return 'text-black font-black';
    if (clampedVal < -30) return 'text-neutral-900 font-black';
    return 'text-neutral-600 font-bold';
  };

  const getBarFillColor = () => {
    if (clampedVal > 0) return 'bg-black';
    if (clampedVal < 0) return 'bg-neutral-600';
    return 'bg-transparent';
  };

  return (
    <div className="flex flex-col gap-1 py-1.5 border-b border-neutral-200 last:border-b-0">
      {/* Label and Value Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-black text-black tracking-tight">{definition.name}</span>
          <span className="text-[11px] text-neutral-500 hidden sm:inline">({definition.description})</span>
        </div>

        <div className="flex items-center gap-2">
          {!readonly && onChange && (
            <input
              type="number"
              min={-120}
              max={120}
              value={clampedVal}
              onChange={(e) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num)) {
                  onChange(Math.max(-120, Math.min(120, num)));
                }
              }}
              className="w-14 text-right font-mono text-xs border border-black px-1 py-0.5 bg-white font-bold"
            />
          )}
          <span className={`font-mono text-xs min-w-[3rem] text-right ${getValueColor()}`}>
            {clampedVal > 0 ? `+${clampedVal}` : clampedVal}
          </span>
        </div>
      </div>

      {/* Visual Bipolar Bar representation */}
      <div className="relative w-full h-3 bg-neutral-100 border border-black overflow-hidden my-0.5">
        {/* Center line (0 point) */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-black/40 z-10 -translate-x-1/2" />

        {/* Dynamic bar fill from center */}
        <div
          className={`absolute top-0 bottom-0 ${getBarFillColor()} transition-all duration-75`}
          style={{
            left: `${barLeft}%`,
            width: `${barWidth}%`,
          }}
        />
      </div>

      {/* Slider range input (only if not readonly) */}
      {!readonly && onChange && (
        <div className="flex items-center gap-2 pt-0.5">
          <input
            type="range"
            min={-120}
            max={120}
            step={1}
            value={clampedVal}
            onChange={(e) => onChange(parseInt(e.target.value, 10))}
            className="w-full accent-black cursor-pointer h-1.5 bg-neutral-200"
          />

          {/* Quick zero reset button */}
          {clampedVal !== 0 && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="text-[10px] font-mono border border-neutral-300 hover:border-black px-1 text-neutral-500 hover:text-black shrink-0 transition-colors"
              title="歸零中立 (0)"
            >
              0
            </button>
          )}
        </div>
      )}

      {/* Legend / Range labels */}
      <div className="flex justify-between text-[10px] font-mono text-neutral-400 select-none">
        <span>-120</span>
        <span>0</span>
        <span>+120</span>
      </div>
    </div>
  );
};
