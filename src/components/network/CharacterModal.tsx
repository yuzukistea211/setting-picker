import React, { useState, useEffect } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import { NetworkCharacter } from '../../types';

interface CharacterModalProps {
  isOpen: boolean;
  character: NetworkCharacter | null;
  onSave: (char: NetworkCharacter) => void;
  onDelete?: (charId: string) => void;
  onClose: () => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  character,
  onSave,
  onDelete,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (character) {
      setName(character.name || '');
      setNotes(character.notes || '');
    } else {
      setName('');
      setNotes('');
    }
  }, [character, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;

    const updated: NetworkCharacter = {
      id: character?.id || `char-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      notes: notes.trim(),
      avatarColor: character?.avatarColor || '#111111',
      traitsSummary: character?.traitsSummary || [],
      x: character?.x,
      y: character?.y,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        id="modal-character-editor"
        className="w-full max-w-md bg-white border-2 border-black text-black flex flex-col"
      >
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-3 bg-white">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 border border-black bg-black text-white font-bold">
              CHAR
            </span>
            <h2 className="font-bold text-sm tracking-tight">
              {character ? '編輯角色' : '新增角色'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border border-black hover:bg-black hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold font-mono">角色姓名</label>
            <input
              id="input-character-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入角色姓名"
              autoFocus
              className="border border-black px-3 py-1.5 text-sm bg-neutral-50 font-bold"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold font-mono">角色簡述 / 備註</label>
            <textarea
              id="input-character-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="自訂角色備註或設定"
              className="border border-black p-2 text-xs bg-neutral-50 resize-none font-normal"
            />
          </div>

          {character?.traitsSummary && character.traitsSummary.length > 0 && (
            <div className="border border-black p-2.5 bg-neutral-50 flex flex-col gap-1.5">
              <span className="text-xs font-bold font-mono">抽取性格詞條</span>
              <div className="flex flex-wrap gap-1">
                {character.traitsSummary.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 border border-black bg-white font-mono"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t-2 border-black p-3 bg-white flex items-center justify-between">
          <div>
            {character && onDelete && (
              <button
                id="btn-delete-character"
                type="button"
                onClick={() => {
                  onDelete(character.id);
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 border border-black text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white cursor-pointer"
              >
                <Trash2 size={14} />
                <span>刪除角色</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-cancel-char-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 cursor-pointer"
            >
              取消
            </button>
            <button
              id="btn-save-character"
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex items-center gap-1 px-5 py-1.5 border-2 border-black bg-black text-white text-xs font-bold hover:bg-neutral-800 disabled:opacity-40 cursor-pointer"
            >
              <Check size={14} />
              <span>儲存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
