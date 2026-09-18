import React, { useRef } from 'react';
import { Download, Upload, RotateCcw, Sliders, Dices, Zap, Sparkles } from 'lucide-react';
import { Dataset } from '../types';

interface NavbarProps {
  currentTab: 'frontend' | 'backend';
  onTabChange: (tab: 'frontend' | 'backend') => void;
  dataset: Dataset;
  onImportDataset: (dataset: Dataset) => void;
  onResetDataset: () => void;
  performanceMode: boolean;
  onTogglePerformanceMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  dataset,
  onImportDataset,
  onResetDataset,
  performanceMode,
  onTogglePerformanceMode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (parsed && Array.isArray(parsed.traits) && Array.isArray(parsed.axes)) {
          onImportDataset(parsed);
        }
      } catch (err) {
        console.error('Invalid JSON file', err);
      }
    };
    reader.readAsText(file);
    if (e.target) {
      e.target.value = '';
    }
  };

  return (
    <header id="app-header" className="w-full border-b-2 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="border-2 border-black bg-black text-white px-2.5 py-1 text-sm font-black tracking-wider">
            OC
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">OC設定抽取器</h1>
            <span className="text-xs font-mono tracking-widest text-black">MODERN PSYCHOLOGY ENGINE</span>
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
        <div className="flex items-center gap-2">
          {/* Performance Mode / Starry Animation Switch Button */}
          <button
            id="btn-toggle-performance-mode"
            type="button"
            onClick={onTogglePerformanceMode}
            title={
              performanceMode
                ? '目前為效能模式（靜態星空、低 DPR、無動態循環，大幅節省顯存與電力）。點擊切換為動態星空動畫'
                : '目前為動態星空動畫。點擊開啟效能模式（關閉動畫循環、限制 DPR、極致省電與低顯存）'
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-bold transition-colors cursor-pointer ${
              performanceMode
                ? 'border-black bg-neutral-900 text-white hover:bg-black'
                : 'border-black bg-white text-black hover:bg-neutral-100'
            }`}
          >
            {performanceMode ? (
              <>
                <Zap size={14} className="text-amber-400 fill-amber-400" />
                <span>效能模式: 開</span>
                <span className="text-[10px] font-mono opacity-80">(靜態省顯存)</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>星空動畫: 開</span>
              </>
            )}
          </button>

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
          >
            <Upload size={14} />
            <span>匯入詞庫</span>
          </button>
          <button
            id="btn-export-json"
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1.5 border border-black text-xs font-bold hover:bg-black hover:text-white transition-colors cursor-pointer"
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
        </div>
      </div>
    </header>
  );
};
