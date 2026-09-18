import React, { useRef } from 'react';
import { Download, Upload, RotateCcw, Sliders, Dices, Network } from 'lucide-react';
import { Dataset } from '../types';

interface NavbarProps {
  currentTab: 'frontend' | 'backend' | 'network';
  onTabChange: (tab: 'frontend' | 'backend' | 'network') => void;
  dataset: Dataset;
  onImportDataset: (dataset: Dataset) => void;
  onResetDataset: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  dataset,
  onImportDataset,
  onResetDataset,
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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
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
