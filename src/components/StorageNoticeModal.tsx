import React, { useState } from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';

interface StorageNoticeModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

export const StorageNoticeModal: React.FC<StorageNoticeModalProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  if (!isOpen) return null;

  return (
    <div
      id="storage-notice-backdrop"
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(dontShowAgain);
      }}
    >
      <div
        id="storage-notice-modal"
        className="w-full max-w-md bg-white border-2 border-black flex flex-col shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-black"
        role="dialog"
        aria-modal="true"
        aria-labelledby="storage-notice-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black px-4 py-2.5 bg-(--main-color)">
          <div className="flex items-center gap-2">
            <span className="p-1 border border-black bg-black text-white">
              <AlertTriangle size={15} />
            </span>
            <h2 id="storage-notice-title" className="font-black text-xs tracking-wider uppercase">
              資料儲存提醒
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onClose(dontShowAgain)}
            className="p-1 border border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-3 text-xs leading-relaxed font-mono">
          <p className="text-neutral-900 font-bold">
            本工具所有設定與詞庫資料皆存放於瀏覽器的 <span className="underline decoration-2">IndexedDB</span>。
          </p>
          <p className="text-neutral-700">
            清理瀏覽器資料、使用無痕模式或更換裝置時，資料可能會被清除。建議定期匯出資料另存為本機檔案備份喔。
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t-2 border-black px-4 py-2.5 bg-neutral-50 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-neutral-600 hover:text-black font-mono select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="accent-black cursor-pointer"
            />
            <span>不再提示</span>
          </label>

          <button
            type="button"
            onClick={() => onClose(dontShowAgain)}
            className="flex items-center gap-1 px-4 py-1.5 border border-black bg-black text-white font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <Check size={14} />
            <span>我知道了</span>
          </button>
        </div>
      </div>
    </div>
  );
};
