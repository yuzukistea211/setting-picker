import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      if (window.indexedDB) {
        window.indexedDB.deleteDatabase('oc_trait_generator_db');
      }
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-black p-6 flex flex-col items-center justify-center font-mono">
          <div className="max-w-md w-full border-2 border-black p-6 shadow-[4px_4px_0px_0px_#000]">
            <h1 className="text-base font-bold mb-2">應用程式執行中斷</h1>
            <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
              系統在載入或渲染時發生未預期的例外狀況，這通常與快取資料結構不相容有關。
            </p>
            {this.state.error && (
              <div className="bg-neutral-100 p-3 text-xs border border-neutral-300 mb-4 overflow-auto max-h-32 text-red-600">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-2 px-3 border border-black bg-black text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                重新載入頁面
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2 px-3 border border-black bg-white text-black hover:bg-neutral-100 transition cursor-pointer"
              >
                重置本機快取
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
