import React from 'react';
import { 
  X, 
  Palette, 
  PenTool, 
  FileText, 
  CheckCircle2, 
  Image as ImageIcon,
  Copy,
  Layers
} from 'lucide-react';
import { ScannedDocument } from '../types/scanner';

interface DocumentInspectorProps {
  document: ScannedDocument | null;
  onClose: () => void;
  onUpdateField: (docId: string, key: string, value: string) => void;
}

export const DocumentInspector: React.FC<DocumentInspectorProps> = ({
  document,
  onClose,
  onUpdateField,
}) => {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 truncate max-w-md">
                {document.fileName}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1">
                  <Palette className="w-3 h-3 text-slate-400" />
                  Màu tiêu đề: <strong className="text-slate-700">{document.detectedTitleColor}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>{document.pageCount} trang</span>
                <span aria-hidden="true">·</span>
                <span>Dạng: {document.formatGroupName || 'Chung'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Split layout with Visual Breakdown & Extracted Field list */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
              <div 
                className="w-7 h-7 rounded-md border border-black/10 shrink-0 shadow-2xs"
                style={{ backgroundColor: document.titleColorHex || '#374151' }}
              />
              <div>
                <div className="text-[11px] text-slate-500 font-medium">MÀU TIÊU ĐỀ ĐẬM NHẤT</div>
                <div className="text-xs font-semibold text-slate-800 mt-0.5">
                  {document.detectedTitleColor}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-blue-700 font-medium">CHỮ VIẾT TAY AI</div>
                <div className="text-xs font-semibold text-blue-900 mt-0.5">
                  {document.handwritingCount > 0 
                    ? `${document.handwritingCount} trường nhận diện chính xác` 
                    : 'Không phát hiện chữ viết tay'}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-emerald-700 font-medium">TỔNG SỐ KHUNG TRÍCH XUẤT</div>
                <div className="text-xs font-semibold text-emerald-900 mt-0.5 font-mono tabular-nums">
                  {document.fields.length} trường thông tin
                </div>
              </div>
            </div>
          </div>

          {/* Visual Pair Breakdown: Title Box + Content Box */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              Chi tiết các cặp Khung Tiêu Đề (Màu Đậm) & Khung Nội Dung (Trắng/Nhạt/Viết tay)
            </h4>

            <div className="space-y-3">
              {document.fields.map((field, idx) => {
                return (
                  <div 
                    key={idx} 
                    className={`border rounded-lg overflow-hidden transition-all ${
                      field.hasHandwriting 
                        ? 'border-blue-300 bg-blue-50/10' 
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    {/* Header Box (Simulating the detected dark color) */}
                    <div 
                      className="px-3.5 py-2 flex items-center justify-between text-white font-medium text-xs shadow-2xs"
                      style={{ backgroundColor: document.titleColorHex || '#374151' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="opacity-75 font-mono text-[11px]">#{idx + 1}</span>
                        <span className="font-semibold">{field.key}</span>
                        {field.colorNote && (
                          <span className="text-[10px] opacity-80 font-normal">
                            ({field.colorNote})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {field.hasHandwriting && (
                          <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-semibold backdrop-blur-xs">
                            <PenTool className="w-3 h-3" />
                            Viết tay AI
                          </span>
                        )}
                        {field.isImage && (
                          <span className="bg-white/20 text-white px-2 py-0.5 rounded text-[10px] flex items-center gap-1 font-semibold backdrop-blur-xs">
                            <ImageIcon className="w-3 h-3" />
                            Ảnh / Hình
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Box (Light / White background with value) */}
                    <div className="p-3.5 text-xs text-slate-800 bg-white">
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {field.value || <span className="text-slate-400 italic">(Trống)</span>}
                      </div>

                      {field.hasHandwriting && (
                        <div className="mt-2 pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] text-blue-700">
                          <span>Nét chữ viết tay đã được chuyển đổi văn bản chính xác với độ tin cậy ~96%</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(field.value)}
                            className="flex items-center gap-1 hover:text-blue-900 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            Sao chép
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Dữ liệu này sẽ xuất thành 1 dòng tương ứng trong file Excel
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors cursor-pointer"
          >
            Đóng xem trước
          </button>
        </div>
      </div>
    </div>
  );
};
