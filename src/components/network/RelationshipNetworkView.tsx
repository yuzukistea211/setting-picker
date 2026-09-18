import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  RelationshipNetworkData,
  NetworkCharacter,
  CharacterRelationship,
} from '../../types';
import {
  saveNetworkToIDB,
  loadNetworkFromIDB,
  clearNetworkIDB,
  INITIAL_SAMPLE_NETWORK,
} from '../../lib/idbRelationship';
import { RelationshipCard } from './RelationshipCard';
import { RelationshipModal } from './RelationshipModal';
import { CharacterModal } from './CharacterModal';
import { ImportCharacterModal } from './ImportCharacterModal';
import { NetworkCanvas } from './NetworkCanvas';
import {
  Users,
  Plus,
  Upload,
  Download,
  Trash2,
  Search,
  Network,
  LayoutGrid,
  FileText,
  RotateCcw,
  CheckCircle2,
  ArrowRightLeft,
  X,
} from 'lucide-react';

export const RelationshipNetworkView: React.FC = () => {
  const [networkData, setNetworkData] = useState<RelationshipNetworkData>(INITIAL_SAMPLE_NETWORK);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  // View Mode: 'cards' | 'graph' | 'characters'
  const [viewMode, setViewMode] = useState<'cards' | 'graph' | 'characters'>('cards');

  // Filter state
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filterCharId, setFilterCharId] = useState<string>('ALL');

  // Modals
  const [isRelModalOpen, setIsRelModalOpen] = useState<boolean>(false);
  const [editingRelationship, setEditingRelationship] = useState<CharacterRelationship | null>(null);

  const [isCharModalOpen, setIsCharModalOpen] = useState<boolean>(false);
  const [editingCharacter, setEditingCharacter] = useState<NetworkCharacter | null>(null);

  const [isImportCharModalOpen, setIsImportCharModalOpen] = useState<boolean>(false);

  // File input for full network JSON import
  const networkFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial load from IndexedDB
  useEffect(() => {
    let isMounted = true;
    loadNetworkFromIDB().then((loaded) => {
      if (isMounted) {
        setNetworkData(loaded);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Persist to IndexedDB on changes (skip the initial loading state)
  const persistNetwork = (newData: RelationshipNetworkData) => {
    setNetworkData(newData);
    saveNetworkToIDB(newData).then(() => {
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2000);
    });
  };

  // Map for fast character lookup
  const characterMap = useMemo(() => {
    const map = new Map<string, NetworkCharacter>();
    networkData.characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [networkData.characters]);

  // Filtered relationships
  const filteredRelationships = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    return networkData.relationships.filter((rel) => {
      const charA = characterMap.get(rel.characterAId);
      const charB = characterMap.get(rel.characterBId);
      const nameA = charA?.name.toLowerCase() || '';
      const nameB = charB?.name.toLowerCase() || '';

      // Character filter
      if (filterCharId !== 'ALL') {
        if (rel.characterAId !== filterCharId && rel.characterBId !== filterCharId) {
          return false;
        }
      }

      // Keyword filter
      if (kw) {
        const matchesNames = nameA.includes(kw) || nameB.includes(kw);
        const matchesSurface = rel.surfaceRelation.toLowerCase().includes(kw);
        const matchesThoughtA = rel.aToB.trueThought.toLowerCase().includes(kw);
        const matchesThoughtB = rel.bToA.trueThought.toLowerCase().includes(kw);

        if (!matchesNames && !matchesSurface && !matchesThoughtA && !matchesThoughtB) {
          return false;
        }
      }

      return true;
    });
  }, [networkData.relationships, characterMap, filterCharId, searchKeyword]);

  // ─── Handlers: Relationships ───

  const handleOpenNewRelationship = () => {
    if (networkData.characters.length < 2) {
      alert('請先新增至少兩位角色，方可建立彼此間的關係！');
      return;
    }
    setEditingRelationship(null);
    setIsRelModalOpen(true);
  };

  const handleOpenEditRelationship = (rel: CharacterRelationship) => {
    setEditingRelationship(rel);
    setIsRelModalOpen(true);
  };

  const handleSaveRelationship = (relationship: CharacterRelationship) => {
    const exists = networkData.relationships.some((r) => r.id === relationship.id);
    let updatedRels: CharacterRelationship[];

    if (exists) {
      updatedRels = networkData.relationships.map((r) =>
        r.id === relationship.id ? relationship : r,
      );
    } else {
      updatedRels = [relationship, ...networkData.relationships];
    }

    const updatedData: RelationshipNetworkData = {
      ...networkData,
      relationships: updatedRels,
      updatedAt: Date.now(),
    };
    persistNetwork(updatedData);
  };

  const handleDeleteRelationship = (id: string) => {
    const updatedData: RelationshipNetworkData = {
      ...networkData,
      relationships: networkData.relationships.filter((r) => r.id !== id),
      updatedAt: Date.now(),
    };
    persistNetwork(updatedData);
  };

  // ─── Handlers: Characters ───

  const handleSaveCharacter = (char: NetworkCharacter) => {
    const exists = networkData.characters.some((c) => c.id === char.id);
    let updatedChars: NetworkCharacter[];

    if (exists) {
      updatedChars = networkData.characters.map((c) => (c.id === char.id ? char : c));
    } else {
      updatedChars = [...networkData.characters, char];
    }

    const updatedData: RelationshipNetworkData = {
      ...networkData,
      characters: updatedChars,
      updatedAt: Date.now(),
    };
    persistNetwork(updatedData);
  };

  const handleDeleteCharacter = (charId: string) => {
    const char = characterMap.get(charId);
    if (
      !window.confirm(
        `確定要刪除角色「${char?.name || charId}」嗎？這將會一併移除該角色所有的相關關係。`,
      )
    ) {
      return;
    }

    const updatedChars = networkData.characters.filter((c) => c.id !== charId);
    const updatedRels = networkData.relationships.filter(
      (r) => r.characterAId !== charId && r.characterBId !== charId,
    );

    const updatedData: RelationshipNetworkData = {
      ...networkData,
      characters: updatedChars,
      relationships: updatedRels,
      updatedAt: Date.now(),
    };
    persistNetwork(updatedData);
  };

  const handleImportCharacters = (incoming: NetworkCharacter[]) => {
    // Avoid duplicate IDs
    const existingIds = new Set(networkData.characters.map((c) => c.id));
    const toAdd = incoming.filter((c) => !existingIds.has(c.id));

    if (toAdd.length === 0) {
      alert('所有匯入的角色皆已存在於目前名單中！');
      return;
    }

    const updatedData: RelationshipNetworkData = {
      ...networkData,
      characters: [...networkData.characters, ...toAdd],
      updatedAt: Date.now(),
    };
    persistNetwork(updatedData);
  };

  // ─── Full Network JSON Import / Export ───

  const handleExportNetworkJSON = () => {
    const dataToExport: RelationshipNetworkData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      characters: networkData.characters,
      relationships: networkData.relationships,
      updatedAt: networkData.updatedAt,
    };

    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oc-relationship-network-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportNetworkJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.characters) && Array.isArray(parsed.relationships)) {
          const formatted: RelationshipNetworkData = {
            version: parsed.version || '1.0',
            characters: parsed.characters,
            relationships: parsed.relationships,
            updatedAt: Date.now(),
          };
          persistNetwork(formatted);
          alert(`成功匯入關係網！包含 ${formatted.characters.length} 位角色與 ${formatted.relationships.length} 條關係。`);
        } else {
          alert('匯入失敗：檔案格式不符合關係網 JSON 規範。');
        }
      } catch (err: any) {
        alert(`解析 JSON 失敗：${err.message || '檔案損毀'}`);
      }
    };
    reader.readAsText(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleResetNetwork = async () => {
    if (window.confirm('確定要將角色關係網重設為預設範例嗎？所有自訂關係與角色將被重設。')) {
      await clearNetworkIDB();
      persistNetwork(INITIAL_SAMPLE_NETWORK);
    }
  };

  return (
    <main
      id="main-relationship-network"
      className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6"
    >
      {/* Hidden File Input for Full Network Import */}
      <input
        ref={networkFileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportNetworkJSON}
      />

      {/* Header Bar */}
      <div className="border-2 border-black bg-white p-5 flex flex-col gap-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Network size={22} className="text-black" />
              <h2 className="text-xl font-black tracking-tight text-black">角色關係網</h2>
              <span className="text-[10px] font-mono border border-black bg-neutral-100 px-2 py-0.5 font-bold">
                INDEXEDDB PERSISTED
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
              記錄角色間的表層關係、各自對對方的真實想法，以及五條獨立的單向心理數值條（Valence、Attachment、Competence、Admiration、Vulnerability）。所有資料即時暫存於瀏覽器 IndexedDB，亦可隨時匯入或匯出為 JSON 檔。
            </p>
          </div>

          {/* Top Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-add-character"
              type="button"
              onClick={() => {
                setEditingCharacter(null);
                setIsCharModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Users size={14} />
              <span>新增角色</span>
            </button>

            <button
              id="btn-import-char-json"
              type="button"
              onClick={() => setIsImportCharModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
              title="匯入由抽取器匯出的角色 JSON"
            >
              <Upload size={14} />
              <span>匯入角色 JSON</span>
            </button>

            <button
              id="btn-create-relationship"
              type="button"
              onClick={handleOpenNewRelationship}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-black bg-black text-white text-xs font-black hover:bg-white hover:text-black transition-colors cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>新增角色關係</span>
            </button>
          </div>
        </div>

        {/* Status Bar & Secondary Network Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-black pt-3">
          {/* Summary counters */}
          <div className="flex items-center gap-3 text-xs font-mono font-bold">
            <span className="flex items-center gap-1">
              <span>角色數：</span>
              <span className="border border-black px-1.5 bg-neutral-100">{networkData.characters.length}</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span>關係數：</span>
              <span className="border border-black px-1.5 bg-neutral-100">{networkData.relationships.length}</span>
            </span>
            {savedNotice && (
              <span className="text-[11px] text-black font-sans font-bold flex items-center gap-1 animate-pulse">
                <CheckCircle2 size={13} />
                <span>IndexedDB 已更新</span>
              </span>
            )}
          </div>

          {/* Backup / Restore full network JSON */}
          <div className="flex items-center gap-2">
            <button
              id="btn-export-network-json"
              type="button"
              onClick={handleExportNetworkJSON}
              className="flex items-center gap-1 px-2.5 py-1 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
              title="匯出整個關係網（含所有角色與雙向數值）為 JSON 檔"
            >
              <Download size={13} />
              <span>匯出關係網 JSON</span>
            </button>

            <button
              id="btn-import-network-json"
              type="button"
              onClick={() => networkFileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
              title="匯入已備份的關係網 JSON 檔"
            >
              <Upload size={13} />
              <span>匯入關係網 JSON</span>
            </button>

            <button
              id="btn-reset-network"
              type="button"
              onClick={handleResetNetwork}
              className="p-1 border border-neutral-300 hover:border-black text-neutral-600 hover:text-black transition-colors cursor-pointer"
              title="重設為預設範例"
            >
              <RotateCcw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs & Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View Mode Buttons */}
        <div className="flex items-center border-2 border-black bg-white">
          <button
            id="tab-view-cards"
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'cards' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
            }`}
          >
            <LayoutGrid size={14} />
            <span>雙向關係卡片 ({filteredRelationships.length})</span>
          </button>
          <button
            id="tab-view-graph"
            type="button"
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border-l-2 border-black ${
              viewMode === 'graph' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
            }`}
          >
            <Network size={14} />
            <span>互動關係圖</span>
          </button>
          <button
            id="tab-view-characters"
            type="button"
            onClick={() => setViewMode('characters')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border-l-2 border-black ${
              viewMode === 'characters' ? 'bg-black text-white' : 'text-black hover:bg-neutral-100'
            }`}
          >
            <Users size={14} />
            <span>角色名冊 ({networkData.characters.length})</span>
          </button>
        </div>

        {/* Search & Character Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Character Filter Select */}
          <div className="flex items-center gap-1 text-xs">
            <label htmlFor="select-char-filter" className="font-bold text-neutral-600">
              篩選角色：
            </label>
            <select
              id="select-char-filter"
              value={filterCharId}
              onChange={(e) => setFilterCharId(e.target.value)}
              className="border border-black bg-white px-2 py-1 text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">全部角色 ({networkData.characters.length})</option>
              {networkData.characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              id="input-search-relationships"
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜尋角色、表層關係、真實想法..."
              className="pl-8 pr-7 py-1 text-xs border border-black bg-white focus:outline-none w-56"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={() => setSearchKeyword('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area based on viewMode */}
      {viewMode === 'graph' ? (
        <div className="flex flex-col gap-4">
          <NetworkCanvas
            characters={networkData.characters}
            relationships={networkData.relationships}
            selectedCharacterId={filterCharId === 'ALL' ? null : filterCharId}
            onSelectCharacter={(id) => setFilterCharId(id || 'ALL')}
            onSelectRelationship={(rel) => handleOpenEditRelationship(rel)}
          />

          {/* Relationships under graph */}
          <div className="border-t-2 border-black pt-4">
            <h3 className="text-xs font-black tracking-wider uppercase mb-3">
              {filterCharId !== 'ALL'
                ? `與「${characterMap.get(filterCharId)?.name}」相關的關係 (${filteredRelationships.length})`
                : `所有關係明細 (${filteredRelationships.length})`}
            </h3>
            <div className="flex flex-col gap-4">
              {filteredRelationships.map((rel) => (
                <RelationshipCard
                  key={rel.id}
                  relationship={rel}
                  characterA={characterMap.get(rel.characterAId)}
                  characterB={characterMap.get(rel.characterBId)}
                  onEdit={handleOpenEditRelationship}
                  onDelete={handleDeleteRelationship}
                />
              ))}
            </div>
          </div>
        </div>
      ) : viewMode === 'characters' ? (
        /* Character Profiles View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {networkData.characters.map((char) => {
            const relCount = networkData.relationships.filter(
              (r) => r.characterAId === char.id || r.characterBId === char.id,
            ).length;

            return (
              <div
                key={char.id}
                id={`card-character-${char.id}`}
                className="border-2 border-black bg-white p-4 flex flex-col justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-black pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 border border-black"
                        style={{ backgroundColor: char.color || '#000000' }}
                      />
                      <h4 className="text-base font-black text-black">{char.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCharacter(char);
                          setIsCharModalOpen(true);
                        }}
                        className="text-[11px] font-mono border border-black px-2 py-0.5 hover:bg-black hover:text-white transition-colors cursor-pointer"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCharacter(char.id)}
                        className="p-1 border border-neutral-300 hover:border-black text-neutral-500 hover:text-white hover:bg-black transition-colors cursor-pointer"
                        title="刪除角色"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {char.notes && (
                    <p className="text-xs text-neutral-700 leading-relaxed mb-3">
                      {char.notes}
                    </p>
                  )}

                  {/* OC Traits if imported */}
                  {char.traits && char.traits.length > 0 && (
                    <div className="flex flex-col gap-1 border-t border-neutral-200 pt-2 mb-2">
                      <div className="text-[10px] font-mono text-neutral-500 font-bold uppercase">
                        已綁定性格詞條 ({char.traits.length})：
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {char.traits.map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono border border-black px-1.5 py-0.2 bg-neutral-50"
                          >
                            {t.intensity ? `【${t.intensity}】` : ''}
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-black pt-2 flex items-center justify-between text-xs font-mono">
                  <span className="text-neutral-500">相關關係：{relCount} 條</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterCharId(char.id);
                      setViewMode('cards');
                    }}
                    className="font-bold underline hover:text-neutral-600 cursor-pointer"
                  >
                    查看關聯卡片 →
                  </button>
                </div>
              </div>
            );
          })}

          {/* Quick Add Character Card */}
          <button
            type="button"
            onClick={() => {
              setEditingCharacter(null);
              setIsCharModalOpen(true);
            }}
            className="border-2 border-dashed border-black/40 hover:border-black p-6 bg-neutral-50/40 hover:bg-neutral-50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all min-h-[160px] group"
          >
            <div className="p-2 border border-black rounded-full bg-white group-hover:bg-black group-hover:text-white transition-colors">
              <Plus size={18} />
            </div>
            <span className="text-xs font-black tracking-wide">+ 新增角色</span>
            <span className="text-[11px] font-mono text-neutral-500">
              手動建立新角色或從 JSON 匯入
            </span>
          </button>
        </div>
      ) : (
        /* Cards View */
        <div className="flex flex-col gap-4">
          {filteredRelationships.length === 0 ? (
            <div className="border-2 border-dashed border-black py-16 flex flex-col items-center justify-center text-center bg-white">
              <ArrowRightLeft size={32} className="text-neutral-400 mb-2" />
              <span className="text-sm font-bold tracking-wider uppercase mb-1">
                尚無符合條件的角色關係
              </span>
              <p className="text-xs font-mono text-neutral-600 max-w-sm mb-4">
                {networkData.characters.length < 2
                  ? '目前角色少於 2 位，請先點擊上方「新增角色」或「匯入角色 JSON」'
                  : '點擊下方按鈕開始建立第一條角色關係'}
              </p>
              {networkData.characters.length >= 2 && (
                <button
                  type="button"
                  onClick={handleOpenNewRelationship}
                  className="px-4 py-1.5 border border-black bg-black text-white text-xs font-black hover:bg-white hover:text-black transition-colors cursor-pointer"
                >
                  + 新增角色關係
                </button>
              )}
            </div>
          ) : (
            filteredRelationships.map((rel) => (
              <RelationshipCard
                key={rel.id}
                relationship={rel}
                characterA={characterMap.get(rel.characterAId)}
                characterB={characterMap.get(rel.characterBId)}
                onEdit={handleOpenEditRelationship}
                onDelete={handleDeleteRelationship}
              />
            ))
          )}
        </div>
      )}

      {/* Relationship Editor Modal */}
      <RelationshipModal
        isOpen={isRelModalOpen}
        onClose={() => setIsRelModalOpen(false)}
        onSave={handleSaveRelationship}
        characters={networkData.characters}
        initialRelationship={editingRelationship}
        existingRelationships={networkData.relationships}
      />

      {/* Character Editor Modal */}
      <CharacterModal
        isOpen={isCharModalOpen}
        onClose={() => setIsCharModalOpen(false)}
        onSave={handleSaveCharacter}
        initialCharacter={editingCharacter}
      />

      {/* Import Character JSON Modal */}
      <ImportCharacterModal
        isOpen={isImportCharModalOpen}
        onClose={() => setIsImportCharModalOpen(false)}
        onImport={handleImportCharacters}
      />
    </main>
  );
};
