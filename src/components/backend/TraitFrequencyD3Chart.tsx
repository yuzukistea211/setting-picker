import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ArrowUpDown, HelpCircle } from 'lucide-react';
import { IntensityLevel } from '../../types';

interface TraitStatItem {
  traitId: string;
  traitName: string;
  axis: string;
  count: number;
  rate: number;
  intensityCounts: Record<IntensityLevel, number>;
}

interface TraitFrequencyD3ChartProps {
  stats: TraitStatItem[];
  totalRuns: number;
}

export const TraitFrequencyD3Chart: React.FC<TraitFrequencyD3ChartProps> = ({ stats, totalRuns }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | 'alpha'>('desc');
  const [hoveredTrait, setHoveredTrait] = useState<TraitStatItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const sortedStats = useMemo(() => {
    const copy = [...stats];
    if (sortOrder === 'desc') {
      return copy.sort((a, b) => b.rate - a.rate);
    } else if (sortOrder === 'asc') {
      return copy.sort((a, b) => a.rate - b.rate);
    } else {
      return copy.sort((a, b) => a.traitName.localeCompare(b.traitName, 'zh-Hant'));
    }
  }, [stats, sortOrder]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || sortedStats.length === 0) return;

    const containerWidth = containerRef.current.clientWidth || 700;
    const barHeight = 24;
    const gap = 6;
    const margin = { top: 30, right: 80, bottom: 40, left: 130 };
    const height = sortedStats.length * (barHeight + gap) + margin.top + margin.bottom;
    const width = Math.max(500, containerWidth);

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const maxRateNum = Number(d3.max(sortedStats, (d: TraitStatItem) => d.rate) ?? 10);
    const maxRate = Math.max(maxRateNum, 10);
    // Add headroom for labels
    const xMax = Math.ceil(maxRate * 1.15);

    const xScale = d3
      .scaleLinear()
      .domain([0, xMax])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleBand()
      .domain(sortedStats.map((d) => d.traitId))
      .range([margin.top, height - margin.bottom])
      .padding(0.2);

    const g = svg.append('g');

    // Gridlines (X-axis ticks across chart)
    const xTicks = xScale.ticks(6);
    g.append('g')
      .selectAll<SVGLineElement, number>('line.grid')
      .data(xTicks)
      .enter()
      .append('line')
      .attr('class', 'grid')
      .attr('x1', (d: number) => xScale(d))
      .attr('x2', (d: number) => xScale(d))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#e5e5e5')
      .attr('stroke-dasharray', '2,2');

    // Bars
    const barGroups = g
      .selectAll<SVGGElement, TraitStatItem>('g.bar-group')
      .data(sortedStats)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('transform', (d: TraitStatItem) => `translate(0, ${yScale(d.traitId)})`)
      .style('cursor', 'pointer');

    // Background bar track
    barGroups
      .append('rect')
      .attr('x', margin.left)
      .attr('y', 0)
      .attr('width', width - margin.left - margin.right)
      .attr('height', yScale.bandwidth())
      .attr('fill', '#f5f5f5')
      .attr('rx', 2);

    // Active value bar
    barGroups
      .append('rect')
      .attr('x', margin.left)
      .attr('y', 0)
      .attr('width', (d: TraitStatItem) => Math.max(0, xScale(d.rate) - margin.left))
      .attr('height', yScale.bandwidth())
      .attr('fill', (d: TraitStatItem) => (d.count === 0 ? '#d4d4d4' : '#171717'))
      .attr('rx', 2)
      .attr('stroke', '#000000')
      .attr('stroke-width', 1);

    // Trait Name on Y Axis (Left)
    barGroups
      .append('text')
      .attr('x', margin.left - 10)
      .attr('y', yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('fill', '#000000')
      .text((d: TraitStatItem) => d.traitName);

    // Value label on the right
    barGroups
      .append('text')
      .attr('x', (d: TraitStatItem) => xScale(d.rate) + 6)
      .attr('y', yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('font-size', '11px')
      .attr('font-family', 'var(--main-font)')
      .attr('font-weight', '700')
      .attr('fill', '#171717')
      .text((d: TraitStatItem) => `${d.rate}% (${d.count})`);

    // Top X-Axis
    const xAxis = d3
      .axisTop(xScale)
      .ticks(6)
      .tickFormat((d) => `${d}%`);

    g.append('g')
      .attr('transform', `translate(0, ${margin.top})`)
      .call(xAxis)
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', '#000000').attr('stroke-width', 1.5);
        axisG.selectAll('.tick line').attr('stroke', '#000000');
        axisG.selectAll('.tick text').attr('font-family', 'var(--main-font)').attr('font-size', '10px');
      });

    // Bottom X-Axis
    const xBottomAxis = d3
      .axisBottom(xScale)
      .ticks(6)
      .tickFormat((d) => `${d}%`);

    g.append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xBottomAxis)
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', '#000000').attr('stroke-width', 1.5);
        axisG.selectAll('.tick line').attr('stroke', '#000000');
        axisG.selectAll('.tick text').attr('font-family', 'var(--main-font)').attr('font-size', '10px');
      });

    // Hover interactions
    barGroups
      .on('mouseenter', (event: MouseEvent, d: TraitStatItem) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
        setHoveredTrait(d);
        const target = event.currentTarget as SVGGElement | null;
        if (target) {
          d3.select(target).select('rect:nth-child(2)').attr('fill', '#000000');
        }
      })
      .on('mousemove', (event: MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', (event: MouseEvent, d: TraitStatItem) => {
        setHoveredTrait(null);
        setTooltipPos(null);
        const target = event.currentTarget as SVGGElement | null;
        if (target) {
          d3.select(target)
            .select('rect:nth-child(2)')
            .attr('fill', d.count === 0 ? '#d4d4d4' : '#171717');
        }
      });
  }, [sortedStats]);

  return (
    <div id="trait-frequency-chart" className="border-2 border-black bg-white p-4 flex flex-col gap-3 relative">
      <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-2 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider">
            詞條出現頻率長條圖 (D3.js 視覺化)
          </span>
          <span className="text-[10px] font-mono border border-black px-1.5 py-0.5 bg-neutral-100">
            共 {stats.length} 詞條
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold flex items-center gap-1">
            <ArrowUpDown size={13} />
            <span>排序方式：</span>
          </span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc' | 'alpha')}
            className="border border-black bg-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="desc">出現頻率（高至低）</option>
            <option value="asc">出現頻率（低至高）</option>
            <option value="alpha">名稱排序</option>
          </select>
        </div>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-x-auto max-h-[520px] overflow-y-auto border border-neutral-200 relative"
      >
        <svg ref={svgRef} className="block min-w-[500px]" />

        {/* Hover Tooltip */}
        {hoveredTrait && tooltipPos && (
          <div
            style={{
              left: `${Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 600) - 240)}px`,
              top: `${Math.max(10, tooltipPos.y - 40)}px`,
            }}
            className="absolute z-20 pointer-events-none bg-black text-white p-2.5 shadow-xl border border-white text-xs flex flex-col gap-1 w-56 animate-in fade-in duration-100"
          >
            <div className="flex items-center justify-between border-b border-neutral-700 pb-1 font-bold">
              <span>{hoveredTrait.traitName}</span>
              <span className="text-[10px] font-mono text-neutral-300">
                [{hoveredTrait.axis}]
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span>出現次數：</span>
              <span className="font-bold">
                {hoveredTrait.count} / {totalRuns} 次
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span>實際頻率：</span>
              <span className="font-bold text-yellow-300">{hoveredTrait.rate}%</span>
            </div>
            <div className="border-t border-neutral-800 pt-1 mt-1">
              <span className="text-[10px] text-neutral-400 block mb-0.5 font-bold">
                各強度次數 (隱/輕/中/強/極)：
              </span>
              <div className="text-[10px] font-mono flex justify-between text-neutral-200">
                <span>{hoveredTrait.intensityCounts['隱藏']}</span>
                <span>{hoveredTrait.intensityCounts['輕微']}</span>
                <span>{hoveredTrait.intensityCounts['中等']}</span>
                <span>{hoveredTrait.intensityCounts['強烈']}</span>
                <span>{hoveredTrait.intensityCounts['極端']}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-600 font-mono pt-1">
        <span>* 長條長度代表該詞條在模擬抽取中的出現百分比 (出現次數 / 總模擬回數)。</span>
        <span className="flex items-center gap-1">
          <HelpCircle size={12} />
          <span>將滑鼠懸停於長條上可檢視各強度抽取明細</span>
        </span>
      </div>
    </div>
  );
};
