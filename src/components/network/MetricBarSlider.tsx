import React from 'react';

interface MetricBarSliderProps {
  id: string;
  name: string;
  value: number;
  onChange: (newValue: number) => void;
}

export const MetricBarSlider: React.FC<MetricBarSliderProps> = ({
  id,
  name,
  value,
  onChange,
}) => {
  const clampedValue = Math.max(-120, Math.min(120, Math.round(value)));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(-120, Math.min(120, parsed)));
    } else {
      onChange(0);
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
        <span className="font-bold tracking-tight">{name}</span>
        <div className="flex items-center gap-1">
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
