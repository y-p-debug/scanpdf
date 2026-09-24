import React from 'react';
import { FileText, Layers, PenTool, CheckCircle2, Sparkles } from 'lucide-react';
import { ScannedDocument, FormatGroup } from '../types/scanner';

interface StatsBannerProps {
  documents: ScannedDocument[];
  formatGroups: FormatGroup[];
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  documents,
  formatGroups,
}) => {
  const totalFiles = documents.length;
  const totalFields = documents.reduce((acc, doc) => acc + doc.fields.length, 0);
  const handwrittenFields = documents.reduce(
    (acc, doc) => acc + doc.fields.filter(f => f.hasHandwriting).length,
    0
  );
  const totalTabs = formatGroups.length + (formatGroups.length > 1 ? 1 : 0); // +1 for "Tổng hợp"

  if (totalFiles === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">TỔNG FILE PDF</span>
          <FileText className="w-4 h-4 text-slate-400" />
        </div>
        <div className="mt-1 text-2xl font-bold text-slate-900 font-mono tabular-nums">
          {totalFiles}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          Mỗi file tạo thành 1 dòng trong bảng
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-blue-700 font-medium">CHỮ VIẾT TAY NHẬN DIỆN</span>
          <PenTool className="w-4 h-4 text-blue-600" />
        </div>
        <div className="mt-1 text-2xl font-bold text-blue-900 font-mono tabular-nums">
          {handwrittenFields}
        </div>
        <div className="mt-1 text-[11px] text-blue-700">
          Chuyển đổi chính xác sang văn bản
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-purple-700 font-medium">SỐ DẠNG BẢNG (TABS)</span>
          <Layers className="w-4 h-4 text-purple-600" />
        </div>
        <div className="mt-1 text-2xl font-bold text-purple-900 font-mono tabular-nums">
          {totalTabs} <span className="text-sm font-normal text-slate-500">tab</span>
        </div>
        <div className="mt-1 text-[11px] text-purple-700">
          Gộp tương đồng Jaccard ≥ 80%
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs text-emerald-700 font-medium">TỔNG TRƯỜNG DỮ LIỆU</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="mt-1 text-2xl font-bold text-emerald-900 font-mono tabular-nums">
          {totalFields}
        </div>
        <div className="mt-1 text-[11px] text-emerald-700">
          Khung tiêu đề kết nối nội dung
        </div>
      </div>
    </div>
  );
};
