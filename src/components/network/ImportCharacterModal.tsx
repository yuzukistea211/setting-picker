import React, { useState, useRef } from 'react';
import { NetworkCharacter } from '../../types';
import { Upload, X, Check, FileJson, AlertCircle } from 'lucide-react';

interface ImportCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (characters: NetworkCharacter[]) => void;
}

export const ImportCharacterModal: React.FC<ImportCharacterModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedCharacters, setParsedCharacters] = useState<NetworkCharacter[]>([]);
  const [sourceFileName, setSourceFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setSourceFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        const extractedChars: NetworkCharacter[] = [];

        // Helper to extract a single character from either OC export format or generic character
        const processSingleObj = (obj: any): NetworkCharacter | null => {
          if (!obj || typeof obj !== 'object') return null;

          const name = obj.characterName || obj.name;
          if (!name || typeof name !== 'string') return null;

          const traitsList: any[] = [];
          if (Array.isArray(obj.traits)) {
            obj.traits.forEach((t: any) => {
              if (t && typeof t === 'object') {
                traitsList.push({
                  id: t.id,
                  name: t.name || t.trait?.name || '未知詞條',
                  axis: t.axis || t.trait?.axis,
                  intensity: t.intensity,
                  description: t.description || t.trait?.description,
                });
              }
            });
          }

          return {
            id: obj.id || `char-imp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: name.trim(),
            notes: obj.notes || obj.description || '',
            traits: traitsList,
            createdAt: Date.now(),
          };
        };

        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            const char = processSingleObj(item);
            if (char) extractedChars.push(char);
          });
        } else if (parsed && typeof parsed === 'object') {
          // Check if it's a full network export with characters array
          if (Array.isArray(parsed.characters)) {
            parsed.characters.forEach((item: any) => {
              const char = processSingleObj(item);
              if (char) extractedChars.push(char);
            });
          } else {
            const single = processSingleObj(parsed);
            if (single) extractedChars.push(single);
          }
        }

        if (extractedChars.length === 0) {
          setErrorMsg('無法從此 JSON 檔案中解析出角色資訊（需要包含 characterName 或 name 欄位）');
          setParsedCharacters([]);
        } else {
          setParsedCharacters(extractedChars);
        }
      } catch (err: any) {
        setErrorMsg(`解析 JSON 失敗：${err.message || '格式無效'}`);
        setParsedCharacters([]);
      }
    };

    reader.readAsText(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleConfirm = () => {
    if (parsedCharacters.length > 0) {
      onImport(parsedCharacters);
      onClose();
    }
  };

  return (
    <div
      id="modal-import-character"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white border-2 border-black p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-100 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <div className="flex items-center gap-2">
            <Upload size={18} className="font-black" />
            <h2 className="text-sm font-black tracking-wider uppercase">
              從 JSON 檔匯入角色
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

        <p className="text-xs text-neutral-600 leading-relaxed">
          支援匯入由本系統「OC設定抽取器」匯出的抽取結果 JSON 檔（包括角色姓名、性格詞條、自訂備註等），亦支援通用的角色 JSON 檔。
        </p>

        {/* Upload Trigger Area */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-black hover:bg-neutral-50 p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors"
        >
          <FileJson size={32} className="text-black" />
          <span className="text-xs font-black tracking-wide">點擊選擇 JSON 檔案</span>
          <span className="text-[11px] font-mono text-neutral-500">
            {sourceFileName ? `已選擇：${sourceFileName}` : '支援單一角色或角色陣列 JSON'}
          </span>
        </div>

        {errorMsg && (
          <div className="p-2.5 border border-black bg-neutral-100 flex items-center gap-2 text-xs font-bold text-black">
            <AlertCircle size={15} className="shrink-0 text-black" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Parsed Characters Preview */}
        {parsedCharacters.length > 0 && (
          <div className="border border-black p-3 bg-neutral-50 flex flex-col gap-2">
            <div className="text-xs font-black">
              解析成功！偵測到 {parsedCharacters.length} 位角色：
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 divide-y divide-neutral-200">
              {parsedCharacters.map((c, i) => (
                <div key={i} className="pt-2 first:pt-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{c.name}</span>
                    <span className="text-[10px] font-mono border border-black px-1">
                      {c.traits?.length || 0} 個詞條
                    </span>
                  </div>
                  {c.notes && (
                    <p className="text-[11px] text-neutral-600 line-clamp-2">
                      {c.notes}
                    </p>
                  )}
                  {c.traits && c.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {c.traits.slice(0, 5).map((t, ti) => (
                        <span key={ti} className="text-[10px] font-mono bg-white border border-neutral-300 px-1 py-0.2">
                          {t.name}
                        </span>
                      ))}
                      {c.traits.length > 5 && (
                        <span className="text-[10px] font-mono text-neutral-500">
                          +{c.traits.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t-2 border-black pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border border-black text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            id="btn-confirm-import-chars"
            type="button"
            disabled={parsedCharacters.length === 0}
            onClick={handleConfirm}
            className="px-4 py-1.5 border border-black bg-black text-white text-xs font-black hover:bg-white hover:text-black transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>匯入至關係網 ({parsedCharacters.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
