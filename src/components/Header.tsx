import React from 'react';
import { FileSpreadsheet, Sparkles, FolderUp, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onLoadSamples: () => void;
  onExportExcel: () => void;
  hasData: boolean;
  isProcessing: boolean;
  activeView: 'upload' | 'preview' | 'groups';
  setActiveView: (view: 'upload' | 'preview' | 'groups') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSamples,
  onExportExcel,
  hasData,
  isProcessing,
  activeView,
  setActiveView,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm">
      {/* Zone 1: Single text element Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
        <span className="text-base font-semibold tracking-tight text-white">
          PDF Form & Handwriting Scanner
        </span>
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
        <button
          onClick={() => setActiveView('upload')}
          className={`transition-colors hover:text-white ${activeView === 'upload' ? 'text-white border-b-2 border-emerald-500 pb-0.5' : ''}`}
        >
          Tải lên & Quét PDF
        </button>
        <button
          onClick={() => setActiveView('preview')}
          className={`transition-colors hover:text-white ${activeView === 'preview' ? 'text-white border-b-2 border-emerald-500 pb-0.5' : ''}`}
        >
          Xem trước bảng dữ liệu
        </button>
        <button
          onClick={() => setActiveView('groups')}
          className={`transition-colors hover:text-white ${activeView === 'groups' ? 'text-white border-b-2 border-emerald-500 pb-0.5' : ''}`}
        >
          Phân loại dạng form (Tabs)
        </button>
        <a
          href="#guide"
          className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Hướng dẫn thuật toán
        </a>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onLoadSamples}
          disabled={isProcessing}
          className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer"
          title="Nạp 3 biểu mẫu Nhật Bản có chữ viết tay và màu khung mẫu"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Thử 3 file mẫu</span>
        </button>

        <button
          onClick={onExportExcel}
          disabled={!hasData || isProcessing}
          className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Xuất Excel (.xlsx)</span>
        </button>
      </div>
    </header>
  );
};
