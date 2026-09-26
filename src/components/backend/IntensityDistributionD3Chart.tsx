import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { IntensityLevel, SimulationResult } from '../../types';
import { INTENSITY_DISTRIBUTION } from '../../lib/generator';

interface IntensityDistributionD3ChartProps {
  simResult: SimulationResult;
}

interface IntensityDataPoint {
  level: IntensityLevel;
  count: number;
  actualRate: number; // percentage, e.g. 34.8
  expectedRate: number; // percentage, e.g. 35.0
  diff: number; // actualRate - expectedRate
}

export const IntensityDistributionD3Chart: React.FC<IntensityDistributionD3ChartProps> = ({
  simResult,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [hoveredLevel, setHoveredLevel] = useState<IntensityDataPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Compute aggregated intensity counts from simulation stats
  const { dataPoints, totalSamples, maxDiff } = useMemo(() => {
    const counts: Record<IntensityLevel, number> = {
      隱藏: 0,
      輕微: 0,
      中等: 0,
      強烈: 0,
      極端: 0,
    };

    let total = 0;
    for (const stat of simResult.traitStats) {
      for (const [lvl, c] of Object.entries(stat.intensityCounts) as [IntensityLevel, number][]) {
        counts[lvl] = (counts[lvl] || 0) + Number(c);
        total += Number(c);
      }
    }

    const expectedMap: Record<IntensityLevel, number> = {
      隱藏: 6,
      輕微: 24,
      中等: 40,
      強烈: 24,
      極端: 6,
    };
    for (const item of INTENSITY_DISTRIBUTION) {
      expectedMap[item.level] = Math.round(item.prob * 100);
    }

    let largestDiff = 0;
    const points: IntensityDataPoint[] = (['隱藏', '輕微', '中等', '強烈', '極端'] as IntensityLevel[]).map(
      (lvl) => {
        const count = counts[lvl] || 0;
        const actualRate = total > 0 ? Number(((count / total) * 100).toFixed(2)) : 0;
        const expectedRate = expectedMap[lvl] || 0;
        const diff = Number((actualRate - expectedRate).toFixed(2));
        if (Math.abs(diff) > largestDiff) {
          largestDiff = Math.abs(diff);
        }
        return {
          level: lvl,
          count,
          actualRate,
          expectedRate,
          diff,
        };
      },
    );

    return {
      dataPoints: points,
      totalSamples: total,
      maxDiff: largestDiff,
    };
  }, [simResult]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || dataPoints.length === 0) return;

    const width = containerRef.current.clientWidth || 600;
    const height = 300;
    const margin = { top: 30, right: 30, bottom: 50, left: 50 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const maxRate = Math.max(
      d3.max(dataPoints, (d: IntensityDataPoint) => Math.max(d.actualRate, d.expectedRate)) || 40,
      40,
    );
    const yMax = Math.ceil(maxRate * 1.15);

    // Scales
    const x0Scale = d3
      .scaleBand()
      .domain(dataPoints.map((d) => d.level))
      .range([margin.left, width - margin.right])
      .padding(0.28);

    const x1Scale = d3
      .scaleBand()
      .domain(['actual', 'expected'])
      .range([0, x0Scale.bandwidth()])
      .padding(0.12);

    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);

    const g = svg.append('g');

    // Gridlines (Y-axis horizontal lines)
    const yTicks = yScale.ticks(5);
    g.append('g')
      .selectAll<SVGLineElement, number>('line.grid-y')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-y')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', (d: number) => yScale(d))
      .attr('y2', (d: number) => yScale(d))
      .attr('stroke', '#e5e5e5')
      .attr('stroke-dasharray', '2,2');

    // Group for each Intensity Level
    const groupG = g
      .selectAll<SVGGElement, IntensityDataPoint>('g.level-group')
      .data(dataPoints)
      .enter()
      .append('g')
      .attr('class', 'level-group')
      .attr('transform', (d: IntensityDataPoint) => `translate(${x0Scale(d.level)}, 0)`)
      .style('cursor', 'pointer');

    // Actual Frequency Bar (Solid Dark)
    groupG
      .append('rect')
      .attr('x', x1Scale('actual') || 0)
      .attr('y', (d: IntensityDataPoint) => yScale(d.actualRate))
      .attr('width', x1Scale.bandwidth())
      .attr('height', (d: IntensityDataPoint) => height - margin.bottom - yScale(d.actualRate))
      .attr('fill', '#000000')
      .attr('stroke', '#000000')
      .attr('stroke-width', 1.5)
      .attr('rx', 2);

    // Expected Theoretical Frequency Bar (Striped/Gray)
    groupG
      .append('rect')
      .attr('x', x1Scale('expected') || 0)
      .attr('y', (d: IntensityDataPoint) => yScale(d.expectedRate))
      .attr('width', x1Scale.bandwidth())
      .attr('height', (d: IntensityDataPoint) => height - margin.bottom - yScale(d.expectedRate))
      .attr('fill', '#d4d4d4')
      .attr('stroke', '#000000')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '3,2')
      .attr('rx', 2);

    // Actual Percentage Label above actual bar
    groupG
      .append('text')
      .attr('x', (x1Scale('actual') || 0) + x1Scale.bandwidth() / 2)
      .attr('y', (d: IntensityDataPoint) => yScale(d.actualRate) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'var(--main-font)')
      .attr('font-weight', '700')
      .attr('fill', '#000000')
      .text((d: IntensityDataPoint) => `${d.actualRate}%`);

    // Expected Percentage Label above expected bar
    groupG
      .append('text')
      .attr('x', (x1Scale('expected') || 0) + x1Scale.bandwidth() / 2)
      .attr('y', (d: IntensityDataPoint) => yScale(d.expectedRate) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'var(--main-font)')
      .attr('fill', '#666666')
      .text((d: IntensityDataPoint) => `${d.expectedRate}%`);

    // Bell Curve guide line (Expected normal distribution connection)
    const lineGenerator = d3
      .line<IntensityDataPoint>()
      .x((d: IntensityDataPoint) => (x0Scale(d.level) || 0) + x0Scale.bandwidth() / 2)
      .y((d: IntensityDataPoint) => yScale(d.expectedRate))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dataPoints)
      .attr('fill', 'none')
      .attr('stroke', '#737373')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3')
      .attr('d', lineGenerator);

    // Markers on expected curve
    g.selectAll<SVGCircleElement, IntensityDataPoint>('circle.marker')
      .data(dataPoints)
      .enter()
      .append('circle')
      .attr('class', 'marker')
      .attr('cx', (d: IntensityDataPoint) => (x0Scale(d.level) || 0) + x0Scale.bandwidth() / 2)
      .attr('cy', (d: IntensityDataPoint) => yScale(d.expectedRate))
      .attr('r', 3)
      .attr('fill', '#525252');

    // X-Axis
    const xAxis = d3.axisBottom(x0Scale);
    g.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', '#000000').attr('stroke-width', 1.5);
        axisG.selectAll('.tick line').attr('stroke', '#000000');
        axisG
          .selectAll('.tick text')
          .attr('font-size', '12px')
          .attr('font-weight', '700')
          .attr('fill', '#000000')
          .attr('dy', '1em');
      });

    // Y-Axis
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => `${d}%`);

    g.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', '#000000').attr('stroke-width', 1.5);
        axisG.selectAll('.tick line').attr('stroke', '#000000');
        axisG
          .selectAll('.tick text')
          .attr('font-family', 'var(--main-font)')
          .attr('font-size', '10px')
          .attr('fill', '#000000');
      });

    // Interactive hover with RAF throttling to prevent high-frequency re-renders & layout thrashing
    let rafId: number | null = null;

    groupG
      .on('mouseenter', (event: MouseEvent, d: IntensityDataPoint) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
        setHoveredLevel(d);
      })
      .on('mousemove', (event: MouseEvent) => {
        if (rafId !== null) return;
        const clientX = event.clientX;
        const clientY = event.clientY;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltipPos({
              x: clientX - rect.left,
              y: clientY - rect.top,
            });
          }
        });
      })
      .on('mouseleave', () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        setHoveredLevel(null);
        setTooltipPos(null);
      });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      groupG.on('mouseenter', null).on('mousemove', null).on('mouseleave', null);
      svg.selectAll('*').remove();
    };
  }, [dataPoints]);

  const isWellAligned = maxDiff <= 2.5;

  return (
    <div
      id="intensity-distribution-chart"
      className="border-2 border-black bg-white p-4 flex flex-col gap-3 relative"
    >
      <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <Activity size={16} />
          <span className="text-xs font-black uppercase tracking-wider">
            各強度出現頻率 vs. 常態分佈預期 (D3.js 視覺化)
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-black border border-black inline-block"></span>
              <span>實際抽樣率</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-neutral-300 border border-black inline-block border-dashed"></span>
              <span>常態預期基準</span>
            </div>
          </div>

          {/* Alignment Status */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 border text-xs font-bold font-mono ${
              isWellAligned
                ? 'border-black bg-neutral-100 text-black'
                : 'border-black bg-amber-100 text-amber-900'
            }`}
          >
            {isWellAligned ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{isWellAligned ? '常態擬合優良 (最大差距 ≤ 2.5%)' : '存在些微抽樣偏差'}</span>
          </div>
        </div>
      </div>

      <div ref={containerRef} className="w-full relative">
        <svg ref={svgRef} className="w-full h-auto" />

        {/* Hover Tooltip */}
        {hoveredLevel && tooltipPos && (
          <div
            style={{
              left: `${Math.min(tooltipPos.x + 10, (containerRef.current?.clientWidth || 500) - 200)}px`,
              top: `${Math.max(10, tooltipPos.y - 30)}px`,
            }}
            className="absolute z-20 pointer-events-none bg-black text-white p-2.5 shadow-xl border border-white text-xs flex flex-col gap-1 w-48 animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between border-b border-neutral-700 pb-1 font-bold">
              <span>【{hoveredLevel.level}】強度等級</span>
              <span className="text-[10px] font-mono text-neutral-300">
                {hoveredLevel.count} 次
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span>實際出現率：</span>
              <span className="font-bold text-yellow-300">{hoveredLevel.actualRate}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span>理論預期率：</span>
              <span className="font-bold text-neutral-300">{hoveredLevel.expectedRate}%</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono border-t border-neutral-800 pt-1">
              <span>擬合誤差 (差值)：</span>
              <span
                className={`font-bold ${
                  hoveredLevel.diff > 0
                    ? 'text-emerald-300'
                    : hoveredLevel.diff < 0
                    ? 'text-rose-300'
                    : 'text-neutral-200'
                }`}
              >
                {hoveredLevel.diff > 0 ? `+${hoveredLevel.diff}%` : `${hoveredLevel.diff}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Probability Distribution Evaluation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-t-2 border-black pt-3">
        {dataPoints.map((d) => (
          <div key={d.level} className="border border-black p-2 flex flex-col gap-1 text-xs bg-neutral-50">
            <div className="flex items-center justify-between font-bold">
              <span>{d.level}</span>
              <span className="text-[10px] font-mono text-neutral-600">{d.count} 次</span>
            </div>
            <div className="flex items-baseline justify-between font-mono">
              <span className="font-black text-sm">{d.actualRate}%</span>
              <span className="text-[10px] text-neutral-500">預期 {d.expectedRate}%</span>
            </div>
            <div className="text-[10px] font-mono font-bold flex items-center justify-between border-t border-neutral-200 pt-1">
              <span className="text-neutral-600">差值:</span>
              <span className={d.diff >= 0 ? 'text-black' : 'text-neutral-700'}>
                {d.diff > 0 ? `+${d.diff}%` : `${d.diff}%`}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-neutral-600 font-mono">
        * 總取樣詞條次數：<span className="font-bold text-black">{totalSamples.toLocaleString()} 條次</span>。常態分佈理論鐘形權重分配為：隱藏 6%、輕微 24%、中等 40%、強烈 24%、極端 6%。
      </div>
    </div>
  );
};
