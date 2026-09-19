import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  Upload,
  Download,
  RotateCcw,
  Link2,
  Edit2,
  Trash2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  NetworkData,
  NetworkCharacter,
  CharacterRelationship,
  RelationshipMetrics,
} from '../../types';
import {
  loadNetworkData,
  saveNetworkData,
  resetToDefaultNetworkData,
} from '../../lib/storage';
import { NetworkCanvas } from './NetworkCanvas';
import { RelationshipModal } from './RelationshipModal';
import { CharacterModal } from './CharacterModal';

export const RelationshipNetworkPage: React.FC = () => {
  const [networkData, setNetworkData] = useState<NetworkData>({
    version: 1,
    updatedAt: Date.now(),
    characters: [],
    relationships: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selection states
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

  // Modal states
  const [isRelModalOpen, setIsRelModalOpen] = useState<boolean>(false);
  const [editingRel, setEditingRel] = useState<CharacterRelationship | null>(null);

  const [isCharModalOpen, setIsCharModalOpen] = useState<boolean>(false);
  const [editingChar, setEditingChar] = useState<NetworkCharacter | null>(null);

  // File input refs for import
  const charFileInputRef = useRef<HTMLInputElement>(null);
  const networkFileInputRef = useRef<HTMLInputElement>(null);

  // Save timeout ref for debouncing position drag saves
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load from IndexedDB
  useEffect(() => {
    loadNetworkData().then((data) => {
      setNetworkData(data);
      setIsLoading(false);
    });
  }, []);

  // Save to state and IndexedDB
  const updateNetwork = (updater: (prev: NetworkData) => NetworkData) => {
    setNetworkData((prev) => {
      const next = updater(prev);
      saveNetworkData(next).catch(console.error);
      return next;
    });
  };

  // Debounced save for dragging positions
  const handleUpdatePosition = (charId: string, x: number, y: number) => {
    setNetworkData((prev) => {
      const updatedChars = prev.characters.map((c) =>
        c.id === charId ? { ...c, x, y } : c,
      );
      const next = { ...prev, characters: updatedChars };

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveNetworkData(next).catch(console.error);
      }, 500);

      return next;
    });
  };

  // Rearrange characters in a circle
  const handleRearrangeLayout = () => {
    updateNetwork((prev) => {
      const n = prev.characters.length;
      if (n === 0) return prev;
      const centerX = 460;
      const centerY = 340;
      const radius = Math.max(160, Math.min(260, n * 55));

      const updated = prev.characters.map((char, index) => {
        const angle = (index / n) * 2 * Math.PI - Math.PI / 2;
        return {
          ...char,
          x: Math.round(centerX + radius * Math.cos(angle)),
          y: Math.round(centerY + radius * Math.sin(angle)),
        };
      });

      return {
        ...prev,
        characters: updated,
      };
    });
  };

  // Character operations
  const handleSaveCharacter = (char: NetworkCharacter) => {
    updateNetwork((prev) => {
      const exists = prev.characters.some((c) => c.id === char.id);
      let updatedChars: NetworkCharacter[];
      if (exists) {
        updatedChars = prev.characters.map((c) => (c.id === char.id ? char : c));
      } else {
        const n = prev.characters.length;
        const defaultX = char.x ?? 300 + (n % 4) * 120;
        const defaultY = char.y ?? 240 + Math.floor(n / 4) * 120;
        updatedChars = [...prev.characters, { ...char, x: defaultX, y: defaultY }];
      }
      return { ...prev, characters: updatedChars };
    });
  };

  const handleDeleteCharacter = (charId: string) => {
    updateNetwork((prev) => ({
      ...prev,
      characters: prev.characters.filter((c) => c.id !== charId),
      relationships: prev.relationships.filter(
        (r) => r.sourceId !== charId && r.targetId !== charId,
      ),
    }));
    if (selectedCharacterId === charId) {
      setSelectedCharacterId(null);
    }
  };

  // Relationship operations
  const handleSaveRelationship = (rel: CharacterRelationship) => {
    updateNetwork((prev) => {
      const exists = prev.relationships.some((r) => r.id === rel.id);
      let updatedRels: CharacterRelationship[];
      if (exists) {
        updatedRels = prev.relationships.map((r) => (r.id === rel.id ? rel : r));
      } else {
        updatedRels = [...prev.relationships, rel];
      }
      return { ...prev, relationships: updatedRels };
    });
    setSelectedRelationshipId(rel.id);
  };

  const handleDeleteRelationship = (relId: string) => {
    updateNetwork((prev) => ({
      ...prev,
      relationships: prev.relationships.filter((r) => r.id !== relId),
    }));
    if (selectedRelationshipId === relId) {
      setSelectedRelationshipId(null);
    }
  };

  // Reset to default
  const handleReset = async () => {
    const defaultData = await resetToDefaultNetworkData();
    setNetworkData(defaultData);
    setSelectedCharacterId(null);
    setSelectedRelationshipId(null);
  };

  // Export relationship network as JSON
  const handleExportNetwork = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(networkData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `oc_relationship_network_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import relationship network from JSON
  const handleImportNetworkFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.characters) && Array.isArray(parsed.relationships)) {
          const validated: NetworkData = {
            version: parsed.version || 1,
            updatedAt: Date.now(),
            characters: parsed.characters,
            relationships: parsed.relationships,
          };
          setNetworkData(validated);
          saveNetworkData(validated).catch(console.error);
        }
      } catch (err) {
        console.error('Invalid network JSON', err);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  // Import characters from JSON (supports extraction result JSON or character lists)
  const handleImportCharacterFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const newChars: NetworkCharacter[] = [];

        // Case 1: Extraction result file with characterName / traits
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (parsed.characterName || parsed.traits) {
            const traitsSummary = Array.isArray(parsed.traits)
              ? parsed.traits.map((t: { intensity?: string; name?: string }) =>
                  t.intensity && t.name ? `【${t.intensity}】${t.name}` : t.name || '',
                ).filter(Boolean)
              : [];

            newChars.push({
              id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: parsed.characterName?.trim() || file.name.replace(/\.json$/i, '') || '角色',
              notes: parsed.notes || '',
              traitsSummary,
            });
          } else if (parsed.name) {
            newChars.push({
              id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: parsed.name,
              notes: parsed.notes || '',
            });
          }
        }

        // Case 2: Array of characters or extraction results
        if (Array.isArray(parsed)) {
          parsed.forEach((item, idx) => {
            if (typeof item === 'string') {
              newChars.push({
                id: `char-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
                name: item,
              });
            } else if (item && typeof item === 'object') {
              const name = item.characterName || item.name || `角色${idx + 1}`;
              const traitsSummary = Array.isArray(item.traits)
                ? item.traits.map((t: { intensity?: string; name?: string }) =>
                    t.intensity && t.name ? `【${t.intensity}】${t.name}` : t.name || '',
                  ).filter(Boolean)
                : [];
              newChars.push({
                id: `char-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
                name,
                notes: item.notes || '',
                traitsSummary,
              });
            }
          });
        }

        if (newChars.length > 0) {
          updateNetwork((prev) => {
            const startIdx = prev.characters.length;
            const placed = newChars.map((c, i) => ({
              ...c,
              x: 320 + ((startIdx + i) % 4) * 130,
              y: 220 + Math.floor((startIdx + i) / 4) * 130,
            }));
            return {
              ...prev,
              characters: [...prev.characters, ...placed],
            };
          });
        }
      } catch (err) {
        console.error('Invalid character JSON', err);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const selectedRel = networkData.relationships.find((r) => r.id === selectedRelationshipId);
  const selectedChar = networkData.characters.find((c) => c.id === selectedCharacterId);

  const charAOfSelectedRel = selectedRel
    ? networkData.characters.find((c) => c.id === selectedRel.sourceId)
    : null;
  const charBOfSelectedRel = selectedRel
    ? networkData.characters.find((c) => c.id === selectedRel.targetId)
    : null;

  return (
    <div id="relationship-network-page" className="flex flex-col gap-4 w-full">
      {/* Hidden file inputs for JSON import */}
      <input
        ref={charFileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportCharacterFile}
      />
      <input
        ref={networkFileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportNetworkFile}
      />

      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-black p-2.5 bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-add-character"
            type="button"
            onClick={() => {
              setEditingChar(null);
              setIsCharModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-black bg-white text-xs font-bold hover:bg-black hover:text-white cursor-pointer"
          >
            <UserPlus size={14} />
            <span>新增角色</span>
          </button>

          <button
            id="btn-import-character-json"
            type="button"
            onClick={() => charFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-black bg-white text-xs font-bold hover:bg-black hover:text-white cursor-pointer"
          >
            <Upload size={14} />
            <span>匯入角色 (JSON)</span>
          </button>

          <button
            id="btn-add-relationship"
            type="button"
            disabled={networkData.characters.length < 2}
            onClick={() => {
              setEditingRel(null);
              setIsRelModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border-2 border-black bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
          >
            <Link2 size={14} />
            <span>新增關係</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-import-network"
            type="button"
            onClick={() => networkFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-black bg-white text-xs font-bold hover:bg-black hover:text-white cursor-pointer"
          >
            <Upload size={14} />
            <span>匯入關係網</span>
          </button>

          <button
            id="btn-export-network"
            type="button"
            onClick={handleExportNetwork}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-black bg-white text-xs font-bold hover:bg-black hover:text-white cursor-pointer"
          >
            <Download size={14} />
            <span>匯出關係網</span>
          </button>

          <button
            id="btn-reset-network"
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-black bg-white text-xs font-bold hover:bg-black hover:text-white cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>重設</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* Left / Center: Interactive Canvas */}
        <div className="flex-1 w-full min-w-0">
          <NetworkCanvas
            characters={networkData.characters}
            relationships={networkData.relationships}
            selectedCharacterId={selectedCharacterId}
            selectedRelationshipId={selectedRelationshipId}
            onSelectCharacter={(id) => {
              setSelectedCharacterId(id);
              if (id) setSelectedRelationshipId(null);
            }}
            onSelectRelationship={(id) => {
              setSelectedRelationshipId(id);
              if (id) setSelectedCharacterId(null);
            }}
            onUpdateCharacterPosition={handleUpdatePosition}
            onRearrangeLayout={handleRearrangeLayout}
          />
        </div>

        {/* Right Inspector Panel */}
        <div className="w-full lg:w-96 flex flex-col gap-3">
          {/* Active Relationship Inspector Card */}
          {selectedRel && charAOfSelectedRel && charBOfSelectedRel ? (
            <div
              id="inspector-relationship-details"
              className="border-2 border-black bg-white p-3.5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-mono text-xs px-2 py-0.5 border border-black bg-black text-white font-bold">
                  關係詳情
                </span>
                <div className="flex items-center gap-1">
                  <button
                    id="btn-inspect-edit-rel"
                    type="button"
                    onClick={() => {
                      setEditingRel(selectedRel);
                      setIsRelModalOpen(true);
                    }}
                    className="p-1 border border-black hover:bg-black hover:text-white cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    id="btn-inspect-delete-rel"
                    type="button"
                    onClick={() => handleDeleteRelationship(selectedRel.id)}
                    className="p-1 border border-black text-red-600 hover:bg-red-600 hover:text-white cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Surface Relationship */}
              <div className="border border-black p-2.5 bg-neutral-50 flex items-center justify-between">
                <span className="text-xs font-mono font-bold">表層關係</span>
                <span className="text-xs font-bold border border-black px-2.5 py-0.5 bg-white">
                  {selectedRel.surfaceRelation || '無'}
                </span>
              </div>

              {/* Direction A -> B */}
              <div className="border border-black p-2.5 bg-white flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs border-b border-black pb-1">
                  <span className="bg-black text-white px-1.5 py-0.5">{charAOfSelectedRel.name}</span>
                  <ArrowRight size={12} />
                  <span>{charBOfSelectedRel.name}</span>
                </div>
                <div className="text-xs">
                  <span className="font-mono text-[11px] text-neutral-600 block">真實想法</span>
                  <span className="font-bold">
                    {selectedRel.sourceToTargetThought || '（未填寫）'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1 pt-1 font-mono text-[11px]">
                  {renderMetricSummary(selectedRel.sourceToTargetMetrics)}
                </div>
              </div>

              {/* Direction B -> A */}
              <div className="border border-black p-2.5 bg-white flex flex-col gap-2">
                <div className="flex items-center gap-1.5 font-bold text-xs border-b border-black pb-1">
                  <span className="bg-black text-white px-1.5 py-0.5">{charBOfSelectedRel.name}</span>
                  <ArrowRight size={12} />
                  <span>{charAOfSelectedRel.name}</span>
                </div>
                <div className="text-xs">
                  <span className="font-mono text-[11px] text-neutral-600 block">真實想法</span>
                  <span className="font-bold">
                    {selectedRel.targetToSourceThought || '（未填寫）'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1 pt-1 font-mono text-[11px]">
                  {renderMetricSummary(selectedRel.targetToSourceMetrics)}
                </div>
              </div>
            </div>
          ) : selectedChar ? (
            /* Selected Character Card */
            <div
              id="inspector-character-details"
              className="border-2 border-black bg-white p-3.5 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-mono text-xs px-2 py-0.5 border border-black bg-black text-white font-bold">
                  角色詳情
                </span>
                <div className="flex items-center gap-1">
                  <button
                    id="btn-inspect-edit-char"
                    type="button"
                    onClick={() => {
                      setEditingChar(selectedChar);
                      setIsCharModalOpen(true);
                    }}
                    className="p-1 border border-black hover:bg-black hover:text-white cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    id="btn-inspect-delete-char"
                    type="button"
                    onClick={() => handleDeleteCharacter(selectedChar.id)}
                    className="p-1 border border-black text-red-600 hover:bg-red-600 hover:text-white cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-black text-base">{selectedChar.name}</span>
              </div>

              {selectedChar.notes && (
                <div className="border border-black p-2 text-xs bg-neutral-50 font-mono">
                  {selectedChar.notes}
                </div>
              )}

              {selectedChar.traitsSummary && selectedChar.traitsSummary.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-mono font-bold">抽取性格詞條</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedChar.traitsSummary.map((t, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] px-1.5 py-0.5 border border-black bg-neutral-50 font-mono"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingRel(null);
                  setIsRelModalOpen(true);
                }}
                disabled={networkData.characters.length < 2}
                className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white cursor-pointer"
              >
                <Link2 size={14} />
                <span>建立此角色的新關係</span>
              </button>
            </div>
          ) : (
            /* Relationships & Characters Directory List */
            <div className="border-2 border-black bg-white p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <span className="font-mono text-xs font-bold">關係列表</span>
                <span className="font-mono text-xs border border-black px-1.5 py-0.2 bg-neutral-50">
                  {networkData.relationships.length} 條
                </span>
              </div>

              {networkData.relationships.length === 0 ? (
                <div className="border border-black p-6 text-center text-xs font-mono">
                  尚無關係資料
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto pr-1">
                  {networkData.relationships.map((r) => {
                    const cA = networkData.characters.find((c) => c.id === r.sourceId);
                    const cB = networkData.characters.find((c) => c.id === r.targetId);
                    if (!cA || !cB) return null;
                    return (
                      <div
                        key={r.id}
                        id={`rel-item-${r.id}`}
                        onClick={() => setSelectedRelationshipId(r.id)}
                        className="border border-black p-2 bg-neutral-50 hover:bg-white cursor-pointer flex flex-col gap-1 transition-colors"
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-1">
                            {cA.name} ⇄ {cB.name}
                          </span>
                          <span className="px-1.5 py-0.2 border border-black bg-white text-[11px]">
                            {r.surfaceRelation}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-600 truncate font-mono">
                          {cA.name}：{r.sourceToTargetThought || '—'}
                        </div>
                        <div className="text-[11px] text-neutral-600 truncate font-mono">
                          {cB.name}：{r.targetToSourceThought || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Relationship Modal */}
      <RelationshipModal
        isOpen={isRelModalOpen}
        relationship={editingRel}
        characters={networkData.characters}
        initialSourceId={selectedCharacterId || undefined}
        onSave={handleSaveRelationship}
        onDelete={handleDeleteRelationship}
        onClose={() => setIsRelModalOpen(false)}
      />

      {/* Character Modal */}
      <CharacterModal
        isOpen={isCharModalOpen}
        character={editingChar}
        onSave={handleSaveCharacter}
        onDelete={handleDeleteCharacter}
        onClose={() => setIsCharModalOpen(false)}
      />
    </div>
  );
};

function renderMetricSummary(m: RelationshipMetrics) {
  const metrics: { key: keyof RelationshipMetrics; label: string }[] = [
    { key: 'valence', label: 'Valence' },
    { key: 'attachment', label: 'Attachment' },
    { key: 'competence', label: 'Competence' },
    { key: 'admiration', label: 'Admiration' },
    { key: 'vulnerability', label: 'Vulnerability' },
  ];

  return metrics.map((item) => {
    const val = m[item.key];
    const width = Math.min(100, Math.max(0, (Math.abs(val) / 120) * 50));
    const left = val >= 0 ? 50 : 50 - width;

    return (
      <div key={item.key} className="flex items-center justify-between gap-2 py-0.5">
        <span className="w-24 text-[11px] font-bold">{item.label}</span>
        <div className="relative flex-1 h-2 bg-neutral-200 border border-black">
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black" />
          <div
            className="absolute top-0 bottom-0 bg-black"
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        </div>
        <span className="w-9 text-right text-[11px] font-bold">
          {val > 0 ? `+${val}` : val}
        </span>
      </div>
    );
  });
}
