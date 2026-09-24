import React from 'react';
import { Layers, FileText, CheckCircle2, ChevronRight, Download } from 'lucide-react';
import { FormatGroup, ScannedDocument } from '../types/scanner';

interface FormatGroupsViewProps {
  formatGroups: FormatGroup[];
  documents: ScannedDocument[];
  onSelectGroupForPreview: (groupId: string) => void;
  onExportExcel: () => void;
}

export const FormatGroupsView: React.FC<FormatGroupsViewProps> = ({
  formatGroups,
  documents,
  onSelectGroupForPreview,
  onExportExcel,
}) => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-600" />
              Tự động phân nhóm dạng biểu mẫu (Tách Tab Excel)
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Các file PDF có tập cột giống nhau hoặc gần giống nhau (độ tương đồng Jaccard ≥ 80%) được tự động gom vào cùng một Tab trong Excel. File khác dạng hoàn toàn sẽ nằm ở Tab riêng biệt để tránh tạo ra các cột trống thừa thãi.
            </p>
          </div>

          <button
            onClick={onExportExcel}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer self-start"
          >
            <Download className="w-4 h-4" />
            <span>Xuất toàn bộ Tab ra file Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {formatGroups.map((group, idx) => {
          const groupDocs = documents.filter(d => group.documentIds.includes(d.id));

          return (
            <div 
              key={group.id} 
              className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Tab: {group.name}
                    </span>
                    <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-mono font-medium">
                      {group.fileCount} file PDF
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {group.representativeColumns.length} cột
                  </span>
                </div>

                {/* File list inside this group */}
                <div className="mt-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Các file thuộc dạng này:
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {groupDocs.map(doc => (
                      <div 
                        key={doc.id}
                        className="text-xs text-slate-700 flex items-center gap-2 py-1 px-2 bg-slate-50 rounded"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium">{doc.fileName}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-auto shrink-0">
                          {doc.detectedTitleColor}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Columns in this group */}
                <div className="mt-4">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Cấu trúc các cột tiêu đề đại diện:
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {group.representativeColumns.map((col, cIdx) => (
                      <span 
                        key={cIdx}
                        className="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium"
                      >
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã ghép thành Tab riêng biệt
                </span>
                <button
                  onClick={() => onSelectGroupForPreview(group.id)}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem bảng dữ liệu dạng này</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
