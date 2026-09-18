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
    // Each vertical bar needs sufficient width for name and values
    const minBarWidth = 46;
    const margin = { top: 40, right: 30, bottom: 95, left: 60 };
    const chartHeight = 380;

    // Determine width based on count of items vs container
    //const calculatedWidth = Math.max(
    //  containerWidth,
    //  margin.left + margin.right + sortedStats.length * minBarWidth,
    //);
    const width = 928;
    const height = chartHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`);

    const maxRateNum = Number(d3.max(sortedStats, (d: TraitStatItem) => d.rate) ?? 10);
    const maxRate = Math.max(maxRateNum, 10);
    // Headroom for top percentage labels
    const yMax = Math.ceil(maxRate * 1.18);

    // X Scale: Trait IDs across horizontal axis
    const xScale = d3
      .scaleBand()
      .domain(sortedStats.map((d) => d.traitId))
      .range([margin.left, width - margin.right])
      .padding(0.28);

    // Y Scale: Frequency percentage vertically
    const yScale = d3
      .scaleLinear()
      .domain([0, yMax])
      .range([height - margin.bottom, margin.top]);

    const g = svg.append('g');

    // Horizontal Gridlines (Y-axis ticks across chart)
    const yTicks = yScale.ticks(6);
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

    // Vertical Bar Groups
    const barGroups = g
      .selectAll<SVGGElement, TraitStatItem>('g.bar-group')
      .data(sortedStats)
      .enter()
      .append('g')
      .attr('class', 'bar-group')
      .attr('transform', (d: TraitStatItem) => `translate(${xScale(d.traitId)}, 0)`)
      .style('cursor', 'pointer');

    // Background track column
    barGroups
      .append('rect')
      .attr('x', 0)
      .attr('y', margin.top)
      .attr('width', xScale.bandwidth())
      .attr('height', height - margin.bottom - margin.top)
      .attr('fill', '#f5f5f5')
      .attr('rx', 2);

    // Active vertical value bar
    barGroups
      .append('rect')
      .attr('x', 0)
      .attr('y', (d: TraitStatItem) => yScale(d.rate))
      .attr('width', xScale.bandwidth())
      .attr('height', (d: TraitStatItem) => Math.max(0, height - margin.bottom - yScale(d.rate)))
      .attr('fill', (d: TraitStatItem) => (d.count === 0 ? '#d4d4d4' : '#171717'))
      .attr('stroke', '#000000')
      .attr('stroke-width', 1)
      .attr('rx', 2);

    // Rate percentage label above the bar
    barGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', (d: TraitStatItem) => yScale(d.rate) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-family', 'var(--main-font)')
      .attr('font-weight', '700')
      .attr('fill', '#171717')
      .text((d: TraitStatItem) => `${d.rate}%`);

    // Trait Count small label just above base of bar (or below top label)
    barGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', (d: TraitStatItem) => {
        const barH = height - margin.bottom - yScale(d.rate);
        return barH > 28 ? yScale(d.rate) + 14 : height - margin.bottom - 4;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '9px')
      .attr('font-family', 'var(--main-font)')
      .attr('font-weight', '600')
      .attr('fill', (d: TraitStatItem) => {
        const barH = height - margin.bottom - yScale(d.rate);
        return barH > 28 ? '#ffffff' : '#666666';
      })
      .text((d: TraitStatItem) => `${d.count}次`);

    // Left Y-Axis (Percentage)
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(6)
      .tickFormat((d) => `${d}%`);

    g.append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis)
      .call((axisG) => {
        axisG.select('.domain').attr('stroke', '#000000').attr('stroke-width', 1.5);
        axisG.selectAll('.tick line').attr('stroke', '#000000');
        axisG.selectAll('.tick text').attr('font-family', 'var(--main-font)').attr('font-size', '11px');
      });

    // Bottom X-Axis baseline
    g.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', height - margin.bottom)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#000000')
      .attr('stroke-width', 1.5);

    // Bottom X-Axis Labels (Angled trait names and axis tags)
    barGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', height - margin.bottom + 14)
      .attr('transform', (d: TraitStatItem) => {
        const x = xScale.bandwidth() / 2;
        const y = height - margin.bottom + 14;
        return `rotate(-45, ${x}, ${y})`;
      })
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'var(--main-font)')
      .attr('fill', '#000000')
      .text((d: TraitStatItem) => d.traitName);

    // Axis badge label under trait name
    barGroups
      .append('text')
      .attr('x', xScale.bandwidth() / 2)
      .attr('y', height - margin.bottom + 26)
      .attr('transform', (d: TraitStatItem) => {
        const x = xScale.bandwidth() / 2;
        const y = height - margin.bottom + 26;
        return `rotate(-45, ${x}, ${y})`;
      })
      .attr('text-anchor', 'end')
      .attr('font-size', '9px')
      .attr('font-mono', 'true')
      .attr('fill', '#737373')
      .text((d: TraitStatItem) => `[${d.axis}]`);

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
        className="w-full overflow-x-auto overflow-y-hidden border border-neutral-200 relative pb-1"
      >
        <svg ref={svgRef} className="block min-w-full" />

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
        <span>* 長條高度代表該詞條在模擬抽取中的出現百分比 (出現次數 / 總模擬回數)；可水平滾動檢視所有詞條。</span>
        <span className="flex items-center gap-1">
          <HelpCircle size={12} />
          <span>將滑鼠懸停於長條上可檢視各強度抽取明細</span>
        </span>
      </div>
    </div>
  );
};
