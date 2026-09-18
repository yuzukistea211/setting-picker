import React, { useState } from 'react';
import { NetworkCharacter } from '../../types';
import { X, Check, User } from 'lucide-react';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: NetworkCharacter) => void;
  initialCharacter?: NetworkCharacter | null;
}

const PRESET_COLORS = [
  '#000000',
  '#334155',
  '#475569',
  '#0f766e',
  '#0369a1',
  '#4338ca',
  '#701a75',
  '#991b1b',
  '#b45309',
];

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCharacter,
}) => {
  const isEditing = !!initialCharacter;

  const [name, setName] = useState(initialCharacter?.name || '');
  const [notes, setNotes] = useState(initialCharacter?.notes || '');
  const [color, setColor] = useState(initialCharacter?.color || PRESET_COLORS[0]);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg('請輸入角色名稱');
      return;
    }

    const char: NetworkCharacter = {
      id: initialCharacter?.id || `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      notes: notes.trim(),
      color,
      traits: initialCharacter?.traits || [],
      createdAt: initialCharacter?.createdAt || Date.now(),
    };

    onSave(char);
    onClose();
  };

  return (
    <div
      id="modal-character-editor"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white border-2 border-black p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <User size={18} className="font-black" />
            <h2 className="text-sm font-black tracking-wider uppercase">
              {isEditing ? '編輯角色資料' : '新增關係網角色'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border border-black hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 border border-black bg-neutral-100 text-xs font-bold text-black">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="input-new-char-name" className="text-xs font-bold">
              角色姓名 / 代稱 *：
            </label>
            <input
              id="input-new-char-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：雷恩、艾莉絲、隊長"
              className="border border-black px-3 py-1.5 text-xs font-bold focus:outline-none focus:bg-neutral-50"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="input-new-char-notes" className="text-xs font-bold">
              角色背景 / 性格備註：
            </label>
            <textarea
              id="input-new-char-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="輸入此角色的核心設定、身分背景、對外形象..."
              className="border border-black p-2 text-xs focus:outline-none focus:bg-neutral-50 resize-none leading-relaxed"
            />
          </div>

          {/* Color tag */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold">圖表代表色：</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 border-2 transition-transform cursor-pointer ${
                    color === c ? 'border-black scale-110 shadow-sm' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t-2 border-black pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            id="btn-confirm-save-character"
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 border border-black bg-black text-white text-xs font-black hover:bg-white hover:text-black transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>儲存角色</span>
          </button>
        </div>
      </div>
    </div>
  );
};
