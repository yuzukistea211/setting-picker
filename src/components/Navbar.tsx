import React, { useRef } from 'react';
import { Download, Upload, RotateCcw, Sliders, Dices, Network, Rat, Moon, Sun, GitMerge } from 'lucide-react';
import { Dataset } from '../types';

interface NavbarProps {
  currentTab: 'frontend' | 'backend' | 'network';
  onTabChange: (tab: 'frontend' | 'backend' | 'network') => void;
  dataset: Dataset;
  onImportDataset: (dataset: Dataset) => void;
  onOpenMergeModal: (rawJson: unknown, fileName: string) => void;
  onResetDataset: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onError?: (message: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  dataset,
  onImportDataset,
  onOpenMergeModal,
  onResetDataset,
  isDarkMode,
  onToggleDarkMode,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mergeInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `oc_traits_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (Array.isArray(parsed.traits) || Array.isArray(parsed))) {
          onImportDataset(parsed);
        } else {
          onError?.('匯入失敗：檔案缺少詞條資料。');
        }
      } catch (err) {
        console.error('Invalid JSON file', err);
        onError?.('匯入失敗：非有效 JSON 格式。');
      }
    };
    reader.readAsText(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleMergeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        onOpenMergeModal(parsed, file.name);
      } catch (err) {
        console.error('Invalid JSON file for merge', err);
        onError?.('檔案讀取失敗：非有效 JSON 格式檔案。');
      }
    };
    reader.readAsText(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <header id="app-header" className="w-full border-b-2 border-black bg-(--main-color) sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="border-2 border-black bg-black text-white px-2.5 py-1 text-sm font-black tracking-wider">
            <Rat size={16} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">OC設定抽取器</h1>
            <span className="text-xs font-mono tracking-widest text-black">Made by yuzukistea211</span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center border border-black">
          <button
            id="nav-tab-frontend"
            type="button"
            onClick={() => onTabChange('frontend')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold transition-colors cursor-pointer ${
              currentTab === 'frontend'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Dices size={16} />
            <span>前台抽取</span>
          </button>
          <button
            id="nav-tab-network"
            type="button"
            onClick={() => onTabChange('network')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold transition-colors cursor-pointer border-l border-black ${
              currentTab === 'network'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Network size={16} />
            <span>角色關係網</span>
          </button>
          <button
            id="nav-tab-backend"
            type="button"
            onClick={() => onTabChange('backend')}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-bold transition-colors cursor-pointer border-l border-black ${
              currentTab === 'backend'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            <Sliders size={16} />
            <span>後台控制台</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            id="btn-import-json"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
            title="完全覆蓋並取代現有詞庫"
          >
            <Upload size={14} />
            <span>匯入詞庫</span>
          </button>

          <input
            ref={mergeInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleMergeFileChange}
          />
          <button
            id="btn-merge-json"
            type="button"
            onClick={() => mergeInputRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
            title="將新詞庫檔案合併到目前的詞庫中"
          >
            <GitMerge size={14} />
            <span>合併詞庫</span>
          </button>

          <button
            id="btn-export-json"
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
            title="匯出詞庫 JSON（資料儲存於瀏覽器 IndexedDB，清理快取時可能遺失，請定期匯出儲存為本地檔案）"
          >
            <Download size={14} />
            <span>匯出詞庫</span>
          </button>
          <button
            id="btn-reset-data"
            type="button"
            onClick={onResetDataset}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>重設詞庫</span>
          </button>
          <button
            id="btn-toggle-dark-mode"
            type="button"
            onClick={onToggleDarkMode}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
            title={isDarkMode ? '切換為日間模式' : '切換為夜間模式'}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
            <span>{isDarkMode ? '日間模式' : '夜間模式'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
