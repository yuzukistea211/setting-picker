import React, { useState } from 'react';
import { Play, RotateCcw, AlertOctagon, BarChart2 } from 'lucide-react';
import { Dataset, SimulationResult } from '../../types';
import { runBatchSimulation } from '../../lib/simulation';
import { TraitFrequencyD3Chart } from './TraitFrequencyD3Chart';
import { IntensityDistributionD3Chart } from './IntensityDistributionD3Chart';

interface SimulationAuditViewProps {
  dataset: Dataset;
}

export const SimulationAuditView: React.FC<SimulationAuditViewProps> = ({ dataset }) => {
  const [runs, setRuns] = useState<number>(500);
  const [traitCount, setTraitCount] = useState<number>(5);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [filterAxis, setFilterAxis] = useState<string>('ALL');

  const handleRunSimulation = () => {
    setIsRunning(true);
    // Use setTimeout so the UI can render loading state
    setTimeout(() => {
      try {
        const result = runBatchSimulation(dataset, runs, traitCount);
        setSimResult(result);
      } finally {
        setIsRunning(false);
      }
    }, 50);
  };

  const filteredStats = simResult?.traitStats.filter((stat) => {
    if (filterAxis === 'ALL') return true;
    return stat.axis === filterAxis;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Simulation Controls */}
      <div className="border-2 border-black p-4 bg-white flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider">模擬次數</label>
            <select
              id="select-sim-runs"
              value={runs}
              onChange={(e) => setRuns(Number(e.target.value))}
              className="border border-black bg-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value={100}>100 次</option>
              <option value={500}>500 次</option>
              <option value={1000}>1,000 次</option>
              <option value={2000}>2,000 次</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-wider">單次詞條數</label>
            <select
              id="select-sim-count"
              value={traitCount}
              onChange={(e) => setTraitCount(Number(e.target.value))}
              className="border border-black bg-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value={3}>3 條</option>
              <option value={4}>4 條</option>
              <option value={5}>5 條</option>
              <option value={6}>6 條</option>
              <option value={7}>7 條</option>
            </select>
          </div>
        </div>

        <button
          id="btn-run-simulation"
          type="button"
          onClick={handleRunSimulation}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 border-2 border-black bg-black text-white hover:bg-white hover:text-black font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          {isRunning ? (
            <>
              <RotateCcw size={14} className="animate-spin" />
              <span>運算中...</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>執行批次模擬審核</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Summary */}
      {simResult && (
        <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-black bg-white">
          <div className="border-r border-b md:border-b-0 border-black p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider">總模擬次數</span>
            <div className="text-xl font-black">{simResult.totalRuns.toLocaleString()}</div>
          </div>
          <div className="border-r border-b md:border-b-0 border-black p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider">弱相容觸發總數</span>
            <div className="text-xl font-black">{simResult.weakCompatibilityOccurrences}</div>
          </div>
          <div className="border-r border-black p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider">平均單次弱相容率</span>
            <div className="text-xl font-black">
              {((simResult.weakCompatibilityOccurrences / simResult.totalRuns) * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-3">
            <span className="text-[10px] font-mono uppercase tracking-wider">運算耗時</span>
            <div className="text-xl font-black font-mono">{simResult.runTimeMs} ms</div>
          </div>
        </div>
      )}

      {/* D3 Visualizations */}
      {simResult && (
        <div className="flex flex-col gap-5">
          {/* D3 Chart 1: Trait Frequency Bar Chart */}
          <TraitFrequencyD3Chart
            stats={filteredStats || simResult.traitStats}
            totalRuns={simResult.totalRuns}
          />

          {/* D3 Chart 2: Intensity Distribution vs. Expected Normal Curve */}
          <IntensityDistributionD3Chart simResult={simResult} />
        </div>
      )}

      {/* Frequency Table */}
      {simResult ? (
        <div className="border-2 border-black bg-white flex flex-col">
          <div className="flex items-center justify-between border-b-2 border-black p-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={16} />
              <span className="text-xs font-black tracking-wider uppercase">
                詞條實際出現率與強度審核表
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">過濾軸線：</span>
              <select
                id="select-sim-axis-filter"
                value={filterAxis}
                onChange={(e) => setFilterAxis(e.target.value)}
                className="border border-black bg-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="ALL">全部軸線</option>
                {dataset.axes.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-black bg-neutral-100 font-black">
                  <th className="p-2.5 text-left border-r border-black">詞條名稱</th>
                  <th className="p-2.5 text-left border-r border-black">軸線</th>
                  <th className="p-2.5 text-right border-r border-black">出現次數</th>
                  <th className="p-2.5 text-right border-r border-black">實際出現率</th>
                  <th className="p-2.5 text-left min-w-[200px]">強度分佈 (隱/輕/中/強/極)</th>
                </tr>
              </thead>
              <tbody>
                {filteredStats?.map((stat) => {
                  const isZero = stat.count === 0;
                  return (
                    <tr
                      key={stat.traitId}
                      className={`border-b border-black hover:bg-neutral-50 ${
                        isZero ? 'bg-neutral-200' : ''
                      }`}
                    >
                      <td className="p-2.5 border-r border-black font-bold">
                        <div className="flex items-center gap-1.5">
                          {isZero && <AlertOctagon size={14} className="shrink-0" />}
                          <span>{stat.traitName}</span>
                        </div>
                      </td>
                      <td className="p-2.5 border-r border-black font-mono">{stat.axis}</td>
                      <td className="p-2.5 border-r border-black text-right font-mono">
                        {stat.count}
                      </td>
                      <td className="p-2.5 border-r border-black text-right font-mono font-black">
                        {stat.rate}%
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <div className="flex border border-black h-4 w-32 overflow-hidden">
                            {(['隱藏', '輕微', '中等', '強烈', '極端'] as const).map((lvl) => {
                              const total = stat.count || 1;
                              const pct = ((stat.intensityCounts[lvl] || 0) / total) * 100;
                              return (
                                <div
                                  key={lvl}
                                  style={{ width: `${pct}%` }}
                                  className={`h-full border-r last:border-r-0 border-black ${
                                    lvl === '極端'
                                      ? 'bg-black'
                                      : lvl === '強烈'
                                      ? 'bg-neutral-700'
                                      : lvl === '中等'
                                      ? 'bg-neutral-400'
                                      : lvl === '輕微'
                                      ? 'bg-neutral-200'
                                      : 'bg-white'
                                  }`}
                                  title={`${lvl}: ${stat.intensityCounts[lvl]} (${pct.toFixed(0)}%)`}
                                />
                              );
                            })}
                          </div>
                          <span>
                            {stat.intensityCounts['隱藏']}/{stat.intensityCounts['輕微']}/
                            {stat.intensityCounts['中等']}/{stat.intensityCounts['強烈']}/
                            {stat.intensityCounts['極端']}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-black py-16 text-center">
          <span className="text-xs font-mono">請點擊上方「執行批次模擬審核」開始運算</span>
        </div>
      )}
    </div>
  );
};
