import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Sliders, 
  Sparkles, 
  CheckCircle2, 
  Palette, 
  Layers, 
  PenTool, 
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { ExtractionSettings } from '../types/scanner';

interface UploadZoneProps {
  onScanFiles: (files: File[], settings: ExtractionSettings) => void;
  onLoadSamples: () => void;
  isProcessing: boolean;
  processingStep?: string;
  fileCount: number;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onScanFiles,
  onLoadSamples,
  isProcessing,
  processingStep,
  fileCount,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ExtractionSettings>({
    aiHandwritingOcr: true,
    groupByFormat: true,
    similarityThreshold: 0.8,
    cleanExcelChars: true,
    autoDetectDarkestColor: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const addFiles = (files: File[]) => {
    const valid = files.filter(f => 
      f.type === 'application/pdf' || 
      f.type.startsWith('image/') || 
      f.name.toLowerCase().endsWith('.pdf')
    );
    setSelectedFiles(prev => [...prev, ...valid]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setSelectedFiles([]);
  };

  const handleStartScan = () => {
    if (selectedFiles.length === 0) return;
    onScanFiles(selectedFiles, settings);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Quét PDF theo màu sắc biểu mẫu & Nhận diện chữ viết tay
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Tự động nhận diện khung tiêu đề nền màu đậm (xám, xanh dương, xanh lá...), kết nối nội dung tương ứng và chuyển đổi chữ viết tay tiếng Nhật/tiếng Việt với độ chính xác cao sang file Excel nhiều tab.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Cấu hình quét ({settings.aiHandwritingOcr ? 'Viết tay Bật' : 'Cơ bản'})</span>
            </button>
            <button
              onClick={onLoadSamples}
              disabled={isProcessing}
              className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Nạp 3 file mẫu</span>
            </button>
          </div>
        </div>

        {/* Settings Drawer */}
        {showSettings && (
          <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <label className="flex items-center justify-between font-semibold text-slate-800 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-blue-600" />
                  AI Nhận diện chữ viết tay
                </span>
                <input
                  type="checkbox"
                  checked={settings.aiHandwritingOcr}
                  onChange={e => setSettings({ ...settings, aiHandwritingOcr: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>
              <p className="mt-1 text-slate-500 text-[11px]">
                Đọc chính xác chữ viết tay ghi chú, chữ ký, số điện thoại trong biểu mẫu
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <label className="flex items-center justify-between font-semibold text-slate-800 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-600" />
                  Dò màu tiêu đề tự động
                </span>
                <input
                  type="checkbox"
                  checked={settings.autoDetectDarkestColor}
                  onChange={e => setSettings({ ...settings, autoDetectDarkestColor: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
              </label>
              <p className="mt-1 text-slate-500 text-[11px]">
                Tìm màu nền đậm nhất lặp lại (xám, xanh dương, v.v.) làm khung tiêu đề
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <label className="flex items-center justify-between font-semibold text-slate-800 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  Tách tab theo dạng PDF
                </span>
                <input
                  type="checkbox"
                  checked={settings.groupByFormat}
                  onChange={e => setSettings({ ...settings, groupByFormat: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
              </label>
              <p className="mt-1 text-slate-500 text-[11px]">
                Gộp các file cùng dạng cột (Jaccard ≥ {settings.similarityThreshold}) thành các tab riêng
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
              <label className="flex items-center justify-between font-semibold text-slate-800 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                  Lọc ký tự Excel an toàn
                </span>
                <input
                  type="checkbox"
                  checked={settings.cleanExcelChars}
                  onChange={e => setSettings({ ...settings, cleanExcelChars: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
              </label>
              <p className="mt-1 text-slate-500 text-[11px]">
                Khử ký tự điều khiển rác tránh lỗi khi mở file trong Excel
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragging 
            ? 'border-emerald-500 bg-emerald-50/50' 
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 mb-3">
            <Upload className="w-6 h-6" />
          </div>

          <h3 className="text-base font-semibold text-slate-800">
            Kéo thả file PDF hoặc ảnh biểu mẫu vào đây
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Hỗ trợ 1 file, nhiều file PDF hoặc cả thư mục chứa tài liệu
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Chọn file PDF / Ảnh
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
            >
              Chọn cả thư mục PDF
            </button>
            <button
              onClick={onLoadSamples}
              className="px-3.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Dùng 3 biểu mẫu có sẵn</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected File Queue */}
      {selectedFiles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">
                Danh sách file đã chọn
              </span>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                ({selectedFiles.length} file · {formatFileSize(selectedFiles.reduce((acc, f) => acc + f.size, 0))})
              </span>
            </div>
            <button
              onClick={clearFiles}
              className="text-xs text-slate-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xoá tất cả</span>
            </button>
          </div>

          <div className="mt-3 max-h-56 overflow-y-auto divide-y divide-slate-100 text-xs">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate font-medium text-slate-800">
                    {file.name}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono tabular-nums">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  onClick={() => removeFile(idx)}
                  className="opacity-60 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                  title="Xoá file này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Start Scan Button */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Sẵn sàng quét theo màu khung tiêu đề và nhận diện chữ viết tay</span>
            </div>

            <button
              onClick={handleStartScan}
              disabled={isProcessing}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý ({processingStep || 'Đang quét...'})</span>
                </>
              ) : (
                <>
                  <span>▶ Bắt đầu quét {selectedFiles.length} file</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Processing Status Banner */}
      {isProcessing && (
        <div className="bg-slate-900 text-white rounded-lg p-5 shadow-md flex items-center gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-emerald-400">
              ĐANG QUÉT VÀ NHẬN DIỆN BIỂU MẪU
            </div>
            <div className="text-sm font-medium mt-0.5 text-slate-200 truncate">
              {processingStep || 'Đang phân tích màu sắc khung tiêu đề và đọc nội dung chữ viết tay...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
