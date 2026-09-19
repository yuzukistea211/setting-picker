import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import {
  CharacterRelationship,
  NetworkCharacter,
} from '../../types';

interface NetworkCanvasProps {
  characters: NetworkCharacter[];
  relationships: CharacterRelationship[];
  selectedCharacterId: string | null;
  selectedRelationshipId: string | null;
  onSelectCharacter: (charId: string | null) => void;
  onSelectRelationship: (relId: string | null) => void;
  onUpdateCharacterPosition: (charId: string, x: number, y: number) => void;
  onRearrangeLayout: () => void;
}

export const NetworkCanvas: React.FC<NetworkCanvasProps> = ({
  characters,
  relationships,
  selectedCharacterId,
  selectedRelationshipId,
  onSelectCharacter,
  onSelectRelationship,
  onUpdateCharacterPosition,
  onRearrangeLayout,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Zoom & Pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Node Dragging state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartRef = useRef({ startX: 0, startY: 0, nodeStartX: 0, nodeStartY: 0 });

  // Hover state
  const [hoveredRelId, setHoveredRelId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Center initial view if nodes exist
  useEffect(() => {
    if (containerRef.current && characters.length > 0) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        // compute bounding box of characters
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        characters.forEach((c) => {
          const cx = c.x ?? 300;
          const cy = c.y ?? 300;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;
        });

        if (minX !== Infinity) {
          const centerX = (minX + maxX) / 2;
          const centerY = (minY + maxY) / 2;
          setTransform({
            x: rect.width / 2 - centerX,
            y: rect.height / 2 - centerY,
            scale: 1,
          });
        }
      }
    }
  }, []);

  // Pan handlers on SVG background
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Only pan if clicked directly on svg background
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'canvas-bg') {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transform.x,
        ty: transform.y,
      };
      onSelectCharacter(null);
      onSelectRelationship(null);
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setTransform((prev) => ({
          ...prev,
          x: panStartRef.current.tx + dx,
          y: panStartRef.current.ty + dy,
        }));
      } else if (draggingNodeId) {
        const dx = (e.clientX - dragStartRef.current.startX) / transform.scale;
        const dy = (e.clientY - dragStartRef.current.startY) / transform.scale;
        const newX = Math.round(dragStartRef.current.nodeStartX + dx);
        const newY = Math.round(dragStartRef.current.nodeStartY + dy);
        onUpdateCharacterPosition(draggingNodeId, newX, newY);
      }
    },
    [isPanning, draggingNodeId, transform.scale, onUpdateCharacterPosition],
  );

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextScale = Math.max(0.3, Math.min(2.5, transform.scale * zoomFactor));

    // Zoom centered around mouse pointer
    const newX = mouseX - (mouseX - transform.x) * (nextScale / transform.scale);
    const newY = mouseY - (mouseY - transform.y) * (nextScale / transform.scale);

    setTransform({
      x: newX,
      y: newY,
      scale: nextScale,
    });
  };

  // Node Drag start
  const handleNodeMouseDown = (e: React.MouseEvent, char: NetworkCharacter) => {
    e.stopPropagation();
    setDraggingNodeId(char.id);
    onSelectCharacter(char.id);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      nodeStartX: char.x ?? 300,
      nodeStartY: char.y ?? 300,
    };
  };

  // Node Map for fast coordinate lookup
  const charMap = useMemo(() => {
    const map = new Map<string, NetworkCharacter>();
    characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [characters]);

  // Node radius
  const NODE_RADIUS = 32;

  return (
    <div
      ref={containerRef}
      id="relationship-network-canvas-container"
      className="relative w-full h-[360px] lg:h-[460px] border-2 border-black bg-(--main-color) overflow-hidden select-none"
    >
      {/* Canvas Controls Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-white border border-black p-1 shadow-none">
        <button
          id="btn-zoom-in"
          type="button"
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              scale: Math.min(2.5, prev.scale * 1.2),
            }))
          }
          className="p-1.5 border border-black hover:bg-black hover:text-white cursor-pointer"
        >
          <ZoomIn size={14} />
        </button>
        <button
          id="btn-zoom-out"
          type="button"
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              scale: Math.max(0.3, prev.scale * 0.8),
            }))
          }
          className="p-1.5 border border-black hover:bg-black hover:text-white cursor-pointer"
        >
          <ZoomOut size={14} />
        </button>
        <button
          id="btn-reset-view"
          type="button"
          onClick={() => {
            if (containerRef.current && characters.length > 0) {
              const rect = containerRef.current.getBoundingClientRect();
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              characters.forEach((c) => {
                const cx = c.x ?? 300;
                const cy = c.y ?? 300;
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;
              });
              const cx = (minX + maxX) / 2;
              const cy = (minY + maxY) / 2;
              setTransform({
                x: rect.width / 2 - cx,
                y: rect.height / 2 - cy,
                scale: 1,
              });
            } else {
              setTransform({ x: 0, y: 0, scale: 1 });
            }
          }}
          className="p-1.5 border border-black hover:bg-black hover:text-white cursor-pointer"
        >
          <Maximize2 size={14} />
        </button>
        <button
          id="btn-rearrange"
          type="button"
          onClick={onRearrangeLayout}
          className="p-1.5 border border-black hover:bg-black hover:text-white cursor-pointer"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* SVG Stage */}
      <svg
        ref={svgRef}
        id="network-svg"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
          {/* Arrowhead marker for directed lines */}
          <marker
            id="network-arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#000000" />
          </marker>

          {/* Highlighted Arrowhead marker */}
          <marker
            id="network-arrowhead-active"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#000000" />
          </marker>
        </defs>

        {/* Background Clickable Area */}
        <rect id="canvas-bg" width="100%" height="100%" fill="transparent" />

        {/* Zoom & Pan Group */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Relationships (Edges with 3 lines each) */}
          <g id="network-relationships-layer">
            {relationships.map((rel) => {
              const charA = charMap.get(rel.sourceId);
              const charB = charMap.get(rel.targetId);
              if (!charA || !charB) return null;

              const ax = charA.x ?? 300;
              const ay = charA.y ?? 300;
              const bx = charB.x ?? 600;
              const by = charB.y ?? 300;

              const dx = bx - ax;
              const dy = by - ay;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;

              // Unit tangent
              const ux = dx / dist;
              const uy = dy / dist;

              // Unit normal
              const nx = -uy;
              const ny = ux;

              // Surface boundary points
              const pA0 = { x: ax + ux * NODE_RADIUS, y: ay + uy * NODE_RADIUS };
              const pB0 = { x: bx - ux * NODE_RADIUS, y: by - uy * NODE_RADIUS };

              // Midpoint
              const mx = (ax + bx) / 2;
              const my = (ay + by) / 2;

              // Curve bow offset (perpendicular distance)
              const bow = Math.max(34, Math.min(64, dist * 0.18));

              // 1. Surface line (center straight line)
              const surfPathD = `M ${pA0.x} ${pA0.y} L ${pB0.x} ${pB0.y}`;
              const surfDx = pB0.x - pA0.x;
              const surfDy = pB0.y - pA0.y;
              const surfAngle = (Math.atan2(surfDy, surfDx) * 180) / Math.PI;
              const surfFlipped = surfAngle > 90 || surfAngle < -90;
              const surfTextPathD = surfFlipped
                ? `M ${pB0.x} ${pB0.y} L ${pA0.x} ${pA0.y}`
                : `M ${pA0.x} ${pA0.y} L ${pB0.x} ${pB0.y}`;

              // 2. A -> B line (curves along +normal side, starts at A, ends at B with arrow)
              const sAB = { x: pA0.x + nx * 8, y: pA0.y + ny * 8 };
              const eAB = { x: pB0.x + nx * 8, y: pB0.y + ny * 8 };
              const cAB = { x: mx + nx * bow, y: my + ny * bow };
              const abPathD = `M ${sAB.x} ${sAB.y} Q ${cAB.x} ${cAB.y} ${eAB.x} ${eAB.y}`;

              const abDx = eAB.x - sAB.x;
              const abDy = eAB.y - sAB.y;
              const abAngle = (Math.atan2(abDy, abDx) * 180) / Math.PI;
              const abFlipped = abAngle > 90 || abAngle < -90;
              const abTextPathD = abFlipped
                ? `M ${eAB.x} ${eAB.y} Q ${cAB.x} ${cAB.y} ${sAB.x} ${sAB.y}`
                : `M ${sAB.x} ${sAB.y} Q ${cAB.x} ${cAB.y} ${eAB.x} ${eAB.y}`;
              const abDisplayText = rel.sourceToTargetThought
                ? abFlipped
                  ? `${rel.sourceToTargetThought}`
                  : `${rel.sourceToTargetThought}`
                : '';

              // 3. B -> A line (curves along -normal side, starts at B, ends at A with arrow)
              const sBA = { x: pB0.x - nx * 8, y: pB0.y - ny * 8 };
              const eBA = { x: pA0.x - nx * 8, y: pA0.y - ny * 8 };
              const cBA = { x: mx - nx * bow, y: my - ny * bow };
              const baPathD = `M ${sBA.x} ${sBA.y} Q ${cBA.x} ${cBA.y} ${eBA.x} ${eBA.y}`;

              const baDx = eBA.x - sBA.x;
              const baDy = eBA.y - sBA.y;
              const baAngle = (Math.atan2(baDy, baDx) * 180) / Math.PI;
              const baFlipped = baAngle > 90 || baAngle < -90;
              const baTextPathD = baFlipped
                ? `M ${eBA.x} ${eBA.y} Q ${cBA.x} ${cBA.y} ${sBA.x} ${sBA.y}`
                : `M ${sBA.x} ${sBA.y} Q ${cBA.x} ${cBA.y} ${eBA.x} ${eBA.y}`;
              const baDisplayText = rel.targetToSourceThought
                ? baFlipped
                  ? `${rel.targetToSourceThought}`
                  : `${rel.targetToSourceThought}`
                : '';

              const isSelected = selectedRelationshipId === rel.id;
              const isHovered = hoveredRelId === rel.id;
              const active = isSelected || isHovered;

              const surfTextPathId = `surf-text-path-${rel.id}`;
              const abTextPathId = `ab-text-path-${rel.id}`;
              const baTextPathId = `ba-text-path-${rel.id}`;

              return (
                <g
                  key={rel.id}
                  id={`relationship-group-${rel.id}`}
                  className="cursor-pointer transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRelationship(rel.id);
                  }}
                  onMouseEnter={() => setHoveredRelId(rel.id)}
                  onMouseLeave={() => setHoveredRelId(null)}
                >
                  {/* Path Definitions for TextPath */}
                  <defs>
                    <path id={surfTextPathId} d={surfTextPathD} />
                    <path id={abTextPathId} d={abTextPathD} />
                    <path id={baTextPathId} d={baTextPathD} />
                  </defs>

                  {/* Invisible broad click/hover trigger paths */}
                  <path d={surfPathD} stroke="transparent" strokeWidth="16" fill="none" />
                  <path d={abPathD} stroke="transparent" strokeWidth="18" fill="none" />
                  <path d={baPathD} stroke="transparent" strokeWidth="18" fill="none" />

                  {/* --- 1. Line 1: 表層關係 (Surface Line) --- */}
                  <path
                    d={surfPathD}
                    stroke="#000000"
                    strokeWidth={active ? '2.5' : '1.5'}
                    strokeDasharray={active ? 'none' : '4 2'}
                    fill="none"
                  />
                  {rel.surfaceRelation && (
                    <text
                      fill="#000000"
                      fontSize="10"
                      fontWeight="bold"
                      stroke="#ffffff"
                      strokeWidth="3.5"
                      paintOrder="stroke fill"
                      dominantBaseline="central"
                    >
                      <textPath
                        href={`#${surfTextPathId}`}
                        xlinkHref={`#${surfTextPathId}`}
                        startOffset="50%"
                        textAnchor="middle"
                      >
                        {rel.surfaceRelation}
                      </textPath>
                    </text>
                  )}

                  {/* --- 2. Line 2: A -> B 單箭頭 (A對B真實想法) --- */}
                  <path
                    d={abPathD}
                    stroke="#000000"
                    strokeWidth={active ? '2.5' : '1.75'}
                    fill="none"
                    markerEnd={active ? 'url(#network-arrowhead-active)' : 'url(#network-arrowhead)'}
                  />
                  {abDisplayText && (
                    <text
                      fill="#000000"
                      fontSize="10"
                      fontWeight="bold"
                      stroke="#ffffff"
                      strokeWidth="3.5"
                      paintOrder="stroke fill"
                      dominantBaseline="central"
                    >
                      <textPath
                        href={`#${abTextPathId}`}
                        xlinkHref={`#${abTextPathId}`}
                        startOffset="50%"
                        textAnchor="middle"
                      >
                        {abDisplayText}
                      </textPath>
                    </text>
                  )}

                  {/* --- 3. Line 3: B -> A 單箭頭 (B對A真實想法) --- */}
                  <path
                    d={baPathD}
                    stroke="#000000"
                    strokeWidth={active ? '2.5' : '1.75'}
                    fill="none"
                    markerEnd={active ? 'url(#network-arrowhead-active)' : 'url(#network-arrowhead)'}
                  />
                  {baDisplayText && (
                    <text
                      fill="#000000"
                      fontSize="10"
                      fontWeight="bold"
                      stroke="#ffffff"
                      strokeWidth="3.5"
                      paintOrder="stroke fill"
                      dominantBaseline="central"
                    >
                      <textPath
                        href={`#${baTextPathId}`}
                        xlinkHref={`#${baTextPathId}`}
                        startOffset="50%"
                        textAnchor="middle"
                      >
                        {baDisplayText}
                      </textPath>
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* Characters (Nodes) Layer */}
          <g id="network-characters-layer">
            {characters.map((char) => {
              const cx = char.x ?? 300;
              const cy = char.y ?? 300;
              const isSelected = selectedCharacterId === char.id;
              const isHovered = hoveredNodeId === char.id;
              const isDragging = draggingNodeId === char.id;

              return (
                <g
                  key={char.id}
                  id={`character-node-${char.id}`}
                  transform={`translate(${cx}, ${cy})`}
                  className="cursor-move"
                  onMouseDown={(e) => handleNodeMouseDown(e, char)}
                  onMouseEnter={() => setHoveredNodeId(char.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* Outer ring on selection or drag */}
                  {(isSelected || isDragging || isHovered) && (
                    <circle
                      r={NODE_RADIUS + 5}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    r={NODE_RADIUS}
                    fill="#ffffff"
                    stroke="#000000"
                    strokeWidth={isSelected ? '3' : '2'}
                  />

                  {/* Character Name */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#000000"
                    fontSize="11"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {char.name}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
};
