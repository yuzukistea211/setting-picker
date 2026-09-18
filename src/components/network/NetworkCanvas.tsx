import React, { useRef, useState, useEffect, useMemo } from 'react';
import { NetworkCharacter, CharacterRelationship } from '../../types';
import { ZoomIn, ZoomOut, RotateCcw, User, ArrowRightLeft } from 'lucide-react';

interface NetworkCanvasProps {
  characters: NetworkCharacter[];
  relationships: CharacterRelationship[];
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string | null) => void;
  onSelectRelationship: (rel: CharacterRelationship) => void;
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  characters,
  relationships,
  selectedCharacterId,
  onSelectCharacter,
  onSelectRelationship,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [zoom, setZoom] = useState(1);
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);

  // ResizeObserver for responsive width & height
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.max(300, entry.contentRect.width),
          height: Math.max(350, entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute node positions in circular layout around center
  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const count = characters.length;
    if (count === 0) return map;

    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(centerX, centerY) * 0.72;

    characters.forEach((char, index) => {
      if (count === 1) {
        map.set(char.id, { x: centerX, y: centerY });
      } else {
        const angle = (2 * Math.PI * index) / count - Math.PI / 2;
        map.set(char.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      }
    });

    return map;
  }, [characters, dimensions]);

  return (
    <div
      ref={containerRef}
      id="container-network-canvas"
      className="relative w-full h-[420px] border-2 border-black bg-neutral-50 overflow-hidden select-none"
    >
      {/* Zoom / Reset Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white border border-black p-1 shadow-xs">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          className="p-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
          title="放大"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          className="p-1 hover:bg-black hover:text-white transition-colors cursor-pointer"
          title="縮小"
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            onSelectCharacter(null);
          }}
          className="p-1 hover:bg-black hover:text-white transition-colors cursor-pointer border-l border-neutral-300"
          title="重置視圖"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Legend / Status overlay */}
      <div className="absolute bottom-3 left-3 z-20 text-[10px] font-mono bg-white/90 border border-black px-2 py-1 flex items-center gap-2">
        <span>點擊角色以篩選關聯</span>
        <span>·</span>
        <span>點擊連線以編輯關係</span>
      </div>

      {/* SVG Canvas */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="w-full h-full"
      >
        <g
          transform={`scale(${zoom})`}
          style={{ transformOrigin: `${dimensions.width / 2}px ${dimensions.height / 2}px` }}
        >
          {/* Relationship Lines */}
          {relationships.map((rel) => {
            const posA = nodePositions.get(rel.characterAId);
            const posB = nodePositions.get(rel.characterBId);
            if (!posA || !posB) return null;

            const isHighlighted =
              !selectedCharacterId ||
              selectedCharacterId === rel.characterAId ||
              selectedCharacterId === rel.characterBId;

            const isHovered = hoveredRelId === rel.id;
            const midX = (posA.x + posB.x) / 2;
            const midY = (posA.y + posB.y) / 2;

            return (
              <g
                key={rel.id}
                className="cursor-pointer transition-opacity"
                opacity={isHighlighted ? 1 : 0.2}
                onMouseEnter={() => setHoveredRelId(rel.id)}
                onMouseLeave={() => setHoveredRelId(null)}
                onClick={() => onSelectRelationship(rel)}
              >
                {/* Thick invisible hit target for easy clicking */}
                <line
                  x1={posA.x}
                  y1={posA.y}
                  x2={posB.x}
                  y2={posB.y}
                  stroke="transparent"
                  strokeWidth={16}
                />

                {/* Visible relationship line */}
                <line
                  x1={posA.x}
                  y1={posA.y}
                  x2={posB.x}
                  y2={posB.y}
                  stroke={isHovered ? '#000000' : '#404040'}
                  strokeWidth={isHovered ? 3 : 2}
                  strokeDasharray={rel.surfaceRelation.includes('宿敵') ? '4 3' : undefined}
                />

                {/* Surface Relation Pill at midpoint */}
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x={-((rel.surfaceRelation.length * 12 + 16) / 2)}
                    y={-10}
                    width={rel.surfaceRelation.length * 12 + 16}
                    height={20}
                    fill={isHovered ? '#000000' : '#ffffff'}
                    stroke="#000000"
                    strokeWidth={1.5}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isHovered ? '#ffffff' : '#000000'}
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {rel.surfaceRelation}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Character Nodes */}
          {characters.map((char) => {
            const pos = nodePositions.get(char.id);
            if (!pos) return null;

            const isSelected = selectedCharacterId === char.id;
            const isRelated =
              !selectedCharacterId ||
              selectedCharacterId === char.id ||
              relationships.some(
                (r) =>
                  (r.characterAId === selectedCharacterId && r.characterBId === char.id) ||
                  (r.characterBId === selectedCharacterId && r.characterAId === char.id),
              );

            return (
              <g
                key={char.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                className="cursor-pointer select-none"
                opacity={isRelated ? 1 : 0.3}
                onClick={() =>
                  onSelectCharacter(selectedCharacterId === char.id ? null : char.id)
                }
              >
                {/* Node Outer Circle */}
                <circle
                  r={22}
                  fill={isSelected ? '#000000' : '#ffffff'}
                  stroke="#000000"
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all"
                />

                {/* Initial Letter or Character Name snippet */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={isSelected ? '#ffffff' : '#000000'}
                  fontSize={12}
                  fontWeight="900"
                >
                  {char.name.slice(0, 1)}
                </text>

                {/* Character Name Label below */}
                <g transform="translate(0, 32)">
                  <rect
                    x={-((char.name.length * 12 + 12) / 2)}
                    y={-8}
                    width={char.name.length * 12 + 12}
                    height={16}
                    fill="#ffffff"
                    stroke="#000000"
                    strokeWidth={1}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#000000"
                    fontSize={10}
                    fontWeight="bold"
                  >
                    {char.name}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
