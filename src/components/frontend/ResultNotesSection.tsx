import React from 'react';
import { FileText, User } from 'lucide-react';

interface ResultNotesSectionProps {
  characterName: string;
  notes: string;
  onUpdateNotes: (characterName: string, notes: string) => void;
}

export const ResultNotesSection: React.FC<ResultNotesSectionProps> = ({
  characterName,
  notes,
  onUpdateNotes,
}) => {
  return (
    <div
      id="section-result-notes"
      className="border-2 border-black p-4 bg-white flex flex-col gap-3"
    >
      <div className="flex items-center justify-between border-b border-black pb-2">
        <div className="flex items-center gap-2">
          <FileText size={16} />
          <span className="text-xs font-black tracking-wider uppercase">設定筆記</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Character Name Input */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label
            htmlFor="input-character-name"
            className="text-xs font-bold shrink-0 flex items-center gap-1 sm:w-24"
          >
            <User size={13} />
            <span>角色姓名：</span>
          </label>
          <input
            id="input-character-name"
            type="text"
            value={characterName}
            onChange={(e) => onUpdateNotes(e.target.value, notes)}
            placeholder="輸入自訂角色姓名或稱呼（例如：雷恩·黑爾、莉莉絲、研究員 A）"
            className="flex-1 text-xs border border-black px-3 py-1.5 focus:bg-neutral-50 focus:outline-none placeholder:text-neutral-400 font-sans"
          />
        </div>

        {/* Custom Notes Plain Text Area */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="textarea-custom-notes"
              className="text-xs font-bold flex items-center gap-1"
            >
              <FileText size={13} />
              <span>自訂備註 ：</span>
            </label>
            <span className="text-[10px] font-mono text-neutral-400">
              {notes.length} 字
            </span>
          </div>
          <textarea
            id="textarea-custom-notes"
            rows={4}
            value={notes}
            onChange={(e) => onUpdateNotes(characterName, e.target.value)}
            placeholder="在此直接輸入自訂備註、背景故事設定、情節構思，或針對上方詞條強度的補充描寫..."
            className="w-full text-xs font-sans border border-black p-3 focus:bg-neutral-50 focus:outline-none resize-y leading-relaxed placeholder:text-neutral-400"
          />
        </div>
      </div>
    </div>
  );
};
