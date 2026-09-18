import React, { useState } from 'react';
import {
  CharacterRelationship,
  NetworkCharacter,
  METRIC_DEFINITIONS,
  DEFAULT_DIRECTIONAL_METRICS,
  DirectionalMetrics,
} from '../../types';
import { MetricSlider } from './MetricSlider';
import { X, Check, ArrowRightLeft, Sparkles } from 'lucide-react';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (relationship: CharacterRelationship) => void;
  characters: NetworkCharacter[];
  initialRelationship?: CharacterRelationship | null;
  existingRelationships: CharacterRelationship[];
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  onSave,
  characters,
  initialRelationship,
  existingRelationships,
}) => {
  const isEditing = !!initialRelationship;

  // Form State
  const [charAId, setCharAId] = useState<string>(() => {
    if (initialRelationship) return initialRelationship.characterAId;
    return characters[0]?.id || '';
  });

  const [charBId, setCharBId] = useState<string>(() => {
    if (initialRelationship) return initialRelationship.characterBId;
    return characters.length > 1 ? characters[1].id : '';
  });

  const [surfaceRelation, setSurfaceRelation] = useState<string>(
    initialRelationship?.surfaceRelation || '朋友',
  );

  // Direction A -> B
  const [aToBThought, setAToBThought] = useState<string>(
    initialRelationship?.aToB.trueThought || '',
  );
  const [aToBMetrics, setAToBMetrics] = useState<DirectionalMetrics>(() => ({
    ...(initialRelationship?.aToB.metrics || DEFAULT_DIRECTIONAL_METRICS),
  }));

  // Direction B -> A
  const [bToAThought, setBToAThought] = useState<string>(
    initialRelationship?.bToA.trueThought || '',
  );
  const [bToAMetrics, setBToAMetrics] = useState<DirectionalMetrics>(() => ({
    ...(initialRelationship?.bToA.metrics || DEFAULT_DIRECTIONAL_METRICS),
  }));

  const [activeDirectionTab, setActiveDirectionTab] = useState<'both' | 'aToB' | 'bToA'>('both');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const charA = characters.find((c) => c.id === charAId);
  const charB = characters.find((c) => c.id === charBId);
  const nameA = charA?.name || '角色 A';
  const nameB = charB?.name || '角色 B';

  const handleMetricChange = (
    direction: 'aToB' | 'bToA',
    key: keyof DirectionalMetrics,
    val: number,
  ) => {
    if (direction === 'aToB') {
      setAToBMetrics((prev) => ({ ...prev, [key]: val }));
    } else {
      setBToAMetrics((prev) => ({ ...prev, [key]: val }));
    }
  };

  const handleSave = () => {
    if (!charAId || !charBId) {
      setErrorMsg('請選擇兩位不同的角色');
      return;
    }

    if (charAId === charBId) {
      setErrorMsg('角色 A 與角色 B 不能為同一人');
      return;
    }

    if (!surfaceRelation.trim()) {
      setErrorMsg('請填寫表層關係');
      return;
    }

    // Check duplicate relationship (if creating new)
    if (!isEditing) {
      const exists = existingRelationships.some(
        (r) =>
          (r.characterAId === charAId && r.characterBId === charBId) ||
          (r.characterAId === charBId && r.characterBId === charAId),
      );
      if (exists) {
        setErrorMsg('這兩位角色之間已經存在一段關係，請直接編輯該關係');
        return;
      }
    }

    const newRel: CharacterRelationship = {
      id: initialRelationship?.id || `rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      characterAId: charAId,
      characterBId: charBId,
      surfaceRelation: surfaceRelation.trim(),
      aToB: {
        trueThought: aToBThought.trim(),
        metrics: aToBMetrics,
      },
      bToA: {
        trueThought: bToAThought.trim(),
        metrics: bToAMetrics,
      },
      updatedAt: Date.now(),
    };

    onSave(newRel);
    onClose();
  };

  // Preset helper
  const applyPreset = (presetType: 'friend' | 'rival' | 'neutral' | 'unrequited') => {
    if (presetType === 'friend') {
      setSurfaceRelation('好友');
      setAToBThought('值得信任的好友');
      setAToBMetrics({ valence: 70, attachment: 50, competence: 60, admiration: 40, vulnerability: 55 });
      setBToAThought('非常親密的重要夥伴');
      setBToAMetrics({ valence: 85, attachment: 75, competence: 65, admiration: 50, vulnerability: 70 });
    } else if (presetType === 'rival') {
      setSurfaceRelation('宿敵 / 競爭者');
      setAToBThought('絕不想輸給的對手，暗自認同其能力');
      setAToBMetrics({ valence: -30, attachment: -40, competence: 95, admiration: 60, vulnerability: -90 });
      setBToAThought('棘手且危險的礙事者');
      setBToAMetrics({ valence: -45, attachment: -60, competence: 90, admiration: 30, vulnerability: -100 });
    } else if (presetType === 'unrequited') {
      setSurfaceRelation('表面朋友');
      setAToBThought('其實暗中憧憬並渴望依賴對方');
      setAToBMetrics({ valence: 100, attachment: 80, competence: 70, admiration: 90, vulnerability: 30 });
      setBToAThought('不太熟的朋友的朋友');
      setBToAMetrics({ valence: 15, attachment: -20, competence: 20, admiration: 5, vulnerability: -50 });
    } else {
      setAToBMetrics(DEFAULT_DIRECTIONAL_METRICS);
      setBToAMetrics(DEFAULT_DIRECTIONAL_METRICS);
    }
  };

  return (
    <div
      id="modal-relationship-editor"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-4xl bg-white border-2 border-black p-5 flex flex-col gap-4 shadow-2xl my-8 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="font-black" />
            <h2 className="text-sm font-black tracking-wider uppercase">
              {isEditing ? '編輯角色關係' : '新增角色關係'}
            </h2>
          </div>
          <button
            id="btn-close-relationship-modal"
            type="button"
            onClick={onClose}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
            title="關閉"
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 border border-black bg-neutral-100 text-xs font-bold text-black">
            {errorMsg}
          </div>
        )}

        {/* Character Selection & Surface Relation */}
        <div className="border-2 border-black p-3.5 bg-neutral-50 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Character A */}
            <div className="flex flex-col gap-1">
              <label htmlFor="select-char-a" className="text-xs font-bold">
                角色 A：
              </label>
              <select
                id="select-char-a"
                value={charAId}
                disabled={isEditing}
                onChange={(e) => setCharAId(e.target.value)}
                className="border border-black bg-white px-2.5 py-1.5 text-xs font-bold focus:outline-none disabled:bg-neutral-100 cursor-pointer"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Character B */}
            <div className="flex flex-col gap-1">
              <label htmlFor="select-char-b" className="text-xs font-bold">
                角色 B：
              </label>
              <select
                id="select-char-b"
                value={charBId}
                disabled={isEditing}
                onChange={(e) => setCharBId(e.target.value)}
                className="border border-black bg-white px-2.5 py-1.5 text-xs font-bold focus:outline-none disabled:bg-neutral-100 cursor-pointer"
              >
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Surface Relation Input */}
          <div className="flex flex-col gap-1 pt-2 border-t border-neutral-300">
            <label htmlFor="input-surface-relation" className="text-xs font-bold">
              表層關係（外界所見關係）：
            </label>
            <input
              id="input-surface-relation"
              type="text"
              value={surfaceRelation}
              onChange={(e) => setSurfaceRelation(e.target.value)}
              placeholder="例如：朋友、同班同學、表面同事、宿敵、師徒、同盟"
              className="border border-black px-3 py-1.5 text-xs bg-white focus:outline-none font-bold"
            />
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1">
              <Sparkles size={12} /> 快速套用情境：
            </span>
            <button
              type="button"
              onClick={() => applyPreset('friend')}
              className="px-2 py-0.5 border border-neutral-300 hover:border-black text-[11px] font-mono bg-white cursor-pointer"
            >
              親密摯友
            </button>
            <button
              type="button"
              onClick={() => applyPreset('unrequited')}
              className="px-2 py-0.5 border border-neutral-300 hover:border-black text-[11px] font-mono bg-white cursor-pointer"
              title="A深層依戀憧憬但B只當作普通朋友"
            >
              單向失衡 (朋友 / 朋友的朋友)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('rival')}
              className="px-2 py-0.5 border border-neutral-300 hover:border-black text-[11px] font-mono bg-white cursor-pointer"
            >
              宿敵對抗
            </button>
            <button
              type="button"
              onClick={() => applyPreset('neutral')}
              className="px-2 py-0.5 border border-neutral-300 hover:border-black text-[11px] font-mono bg-white cursor-pointer"
            >
              歸零重設
            </button>
          </div>
        </div>

        {/* View Toggle on smaller viewports */}
        <div className="flex items-center justify-between border-b border-black pb-2">
          <span className="text-xs font-black tracking-wide uppercase">雙向真實想法與5條單向數值條</span>
          <div className="flex items-center border border-black text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveDirectionTab('both')}
              className={`px-2.5 py-1 cursor-pointer ${
                activeDirectionTab === 'both' ? 'bg-black text-white' : 'hover:bg-neutral-100'
              }`}
            >
              並列檢視
            </button>
            <button
              type="button"
              onClick={() => setActiveDirectionTab('aToB')}
              className={`px-2.5 py-1 border-l border-black cursor-pointer ${
                activeDirectionTab === 'aToB' ? 'bg-black text-white' : 'hover:bg-neutral-100'
              }`}
            >
              A → B
            </button>
            <button
              type="button"
              onClick={() => setActiveDirectionTab('bToA')}
              className={`px-2.5 py-1 border-l border-black cursor-pointer ${
                activeDirectionTab === 'bToA' ? 'bg-black text-white' : 'hover:bg-neutral-100'
              }`}
            >
              B → A
            </button>
          </div>
        </div>

        {/* Dual Directed Editors Grid */}
        <div
          className={`grid gap-4 ${
            activeDirectionTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {/* Section: A -> B */}
          {(activeDirectionTab === 'both' || activeDirectionTab === 'aToB') && (
            <div
              id="editor-direction-a-to-b"
              className="border-2 border-black p-4 bg-white flex flex-col gap-3"
            >
              <div className="border-b-2 border-black pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wide">
                    【{nameA}】當【{nameB}】是什麼的真實想法
                  </span>
                  <span className="text-[10px] font-mono border border-black px-1.5 py-0.2 bg-black text-white">
                    A → B
                  </span>
                </div>
              </div>

              {/* True Thought Input */}
              <div className="flex flex-col gap-1">
                <label htmlFor="input-a-thought" className="text-xs font-bold">
                  真實想法：
                </label>
                <textarea
                  id="input-a-thought"
                  rows={2}
                  value={aToBThought}
                  onChange={(e) => setAToBThought(e.target.value)}
                  placeholder="例如：不太熟的朋友的朋友、利用對象、唯一信任的避風港..."
                  className="w-full text-xs border border-black p-2 focus:bg-neutral-50 focus:outline-none resize-none"
                />
              </div>

              {/* 5 Sliders for A -> B */}
              <div className="flex flex-col gap-1 border-t border-black/20 pt-2">
                <div className="text-xs font-black mb-1">
                  【{nameA}】對【{nameB}】的 5 條單向數值條：
                </div>
                {METRIC_DEFINITIONS.map((def) => (
                  <MetricSlider
                    key={def.key}
                    definition={def}
                    value={aToBMetrics[def.key]}
                    onChange={(val) => handleMetricChange('aToB', def.key, val)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: B -> A */}
          {(activeDirectionTab === 'both' || activeDirectionTab === 'bToA') && (
            <div
              id="editor-direction-b-to-a"
              className="border-2 border-black p-4 bg-white flex flex-col gap-3"
            >
              <div className="border-b-2 border-black pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wide">
                    【{nameB}】當【{nameA}】是什麼的真實想法
                  </span>
                  <span className="text-[10px] font-mono border border-black px-1.5 py-0.2 bg-black text-white">
                    B → A
                  </span>
                </div>
              </div>

              {/* True Thought Input */}
              <div className="flex flex-col gap-1">
                <label htmlFor="input-b-thought" className="text-xs font-bold">
                  真實想法：
                </label>
                <textarea
                  id="input-b-thought"
                  rows={2}
                  value={bToAThought}
                  onChange={(e) => setBToAThought(e.target.value)}
                  placeholder="例如：好朋友、值得效仿的對象、有點煩人的跟班..."
                  className="w-full text-xs border border-black p-2 focus:bg-neutral-50 focus:outline-none resize-none"
                />
              </div>

              {/* 5 Sliders for B -> A */}
              <div className="flex flex-col gap-1 border-t border-black/20 pt-2">
                <div className="text-xs font-black mb-1">
                  【{nameB}】對【{nameA}】的 5 條單向數值條：
                </div>
                {METRIC_DEFINITIONS.map((def) => (
                  <MetricSlider
                    key={def.key}
                    definition={def}
                    value={bToAMetrics[def.key]}
                    onChange={(val) => handleMetricChange('bToA', def.key, val)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 border-t-2 border-black pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            id="btn-save-relationship"
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 border border-black bg-black text-white text-xs font-black hover:bg-white hover:text-black transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>儲存關係資料</span>
          </button>
        </div>
      </div>
    </div>
  );
};
