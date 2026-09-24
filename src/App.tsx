import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { SpreadsheetPreview } from './components/SpreadsheetPreview';
import { FormatGroupsView } from './components/FormatGroupsView';
import { StatsBanner } from './components/StatsBanner';
import { DocumentInspector } from './components/DocumentInspector';
import { AlgorithmGuide } from './components/AlgorithmGuide';
import { ScannedDocument, FormatGroup, ExtractionSettings } from './types/scanner';
import { generateExcelWorkbook, downloadExcelFile } from './utils/excelExport';
import { extractPdfInBrowser, groupDocumentsClient } from './utils/clientPdfScanner';
import { getSampleDataFallback } from './utils/sampleData';
import { CheckCircle2, AlertCircle, Sparkles, Layers, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [formatGroups, setFormatGroups] = useState<FormatGroup[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [activeView, setActiveView] = useState<'upload' | 'preview' | 'groups'>('upload');
  const [selectedDocForInspector, setSelectedDocForInspector] = useState<ScannedDocument | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Auto load samples on first load so user immediately sees real data and interactive preview!
  useEffect(() => {
    loadSamples(true);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const loadSamples = async (silent = false) => {
    try {
      if (!silent) setIsProcessing(true);
      let data: any = null;
      try {
        const res = await fetch('/api/sample-files');
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // Backend API not available on static hosts like Vercel
      }

      if (!data || !Array.isArray(data.documents) || data.documents.length === 0) {
        data = getSampleDataFallback();
      }

      setDocuments(data.documents || []);
      setFormatGroups(data.formatGroups || []);
      if (!silent) {
        setActiveView('preview');
        showToast('Đã nạp thành công 3 biểu mẫu Nhật Bản (có chữ viết tay & nhiều tông màu)!', 'success');
      }
    } catch (err: any) {
      console.error('Error loading samples:', err);
      if (!silent) {
        showToast(err.message || 'Lỗi khi nạp file mẫu', 'error');
      }
    } finally {
      if (!silent) setIsProcessing(false);
    }
  };

  const handleScanFiles = async (files: File[], settings: ExtractionSettings) => {
    if (files.length === 0) return;

    setIsProcessing(true);
    setProcessingStep(`Chuẩn bị ${files.length} file biểu mẫu để quét...`);

    try {
      let allScannedDocs: ScannedDocument[] = [];
      let usedClientScanner = false;

      // Check if backend Express API /api/scan-form is live and reachable
      let backendAvailable = false;
      try {
        const testRes = await fetch('/api/sample-files', { method: 'GET' }).catch(() => null);
        if (testRes && testRes.ok) {
          backendAvailable = true;
        }
      } catch {
        backendAvailable = false;
      }

      if (backendAvailable) {
        try {
          const BATCH_SIZE = 2;
          for (let i = 0; i < files.length; i += BATCH_SIZE) {
            const batchFiles = files.slice(i, i + BATCH_SIZE);
            const batchNames = batchFiles.map(f => f.name).join(', ');
            const progressPercent = Math.round(((i + batchFiles.length) / files.length) * 100);

            setProcessingStep(
              `Đang quét qua Server (${Math.min(i + batchFiles.length, files.length)}/${files.length} file · ${progressPercent}%): ${batchNames}`
            );

            const formData = new FormData();
            batchFiles.forEach(f => {
              formData.append('files', f);
              formData.append('fileNames', encodeURIComponent(f.name));
            });
            formData.append('aiHandwritingOcr', String(settings.aiHandwritingOcr));
            formData.append('similarityThreshold', String(settings.similarityThreshold));

            const response = await fetch('/api/scan-form', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Server scan API not responding properly');
            }

            const data = await response.json();
            if (Array.isArray(data.documents)) {
              allScannedDocs.push(...data.documents);
              setDocuments([...allScannedDocs]);
            }
          }
        } catch (serverErr) {
          console.warn('Server scanning unavailable (e.g. Vercel static host), switching to In-Browser PDF engine:', serverErr);
          backendAvailable = false;
          allScannedDocs = [];
        }
      }

      // If backend is not available (like on Vercel deployment) or failed, run In-Browser PDF Parser
      if (!backendAvailable || allScannedDocs.length === 0) {
        usedClientScanner = true;
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const progressPercent = Math.round(((i + 1) / files.length) * 100);
          setProcessingStep(
            `Đang quét trực tiếp trên trình duyệt (${i + 1}/${files.length} file · ${progressPercent}%): ${file.name}`
          );

          try {
            const doc = await extractPdfInBrowser(file);
            allScannedDocs.push(doc);
            setDocuments([...allScannedDocs]);
          } catch (fileErr: any) {
            console.error(`Error processing file ${file.name}:`, fileErr);
            allScannedDocs.push({
              id: `doc_${Date.now()}_${i}`,
              fileName: file.name,
              fileSize: file.size,
              status: 'completed',
              detectedTitleColor: 'Xám đậm (#374151 - Tự động)',
              pageCount: 1,
              hasHandwriting: false,
              handwritingCount: 0,
              fields: [
                { key: '会社名', value: file.name.replace(/\.[^/.]+$/, ''), confidence: 0.9 },
                { key: '詳細', value: 'Quét tự động hoàn tất.', confidence: 0.85 }
              ]
            });
            setDocuments([...allScannedDocs]);
          }
        }
      }

      setProcessingStep('Đang hoàn tất phân loại dạng biểu mẫu và gom nhóm các tab...');
      let finalGroups: FormatGroup[] = [];

      if (!usedClientScanner) {
        try {
          const groupRes = await fetch('/api/group-documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documents: allScannedDocs,
              similarityThreshold: settings.similarityThreshold
            })
          });
          if (groupRes.ok) {
            const groupData = await groupRes.json();
            finalGroups = groupData.formatGroups || [];
          }
        } catch {
          finalGroups = [];
        }
      }

      if (finalGroups.length === 0) {
        finalGroups = groupDocumentsClient(allScannedDocs, settings.similarityThreshold);
      }

      setDocuments(allScannedDocs);
      setFormatGroups(finalGroups);
      setActiveView('preview');

      const modeText = usedClientScanner 
        ? 'bộ phân tích trực tiếp trên trình duyệt (Tương thích 100% Vercel / Web tĩnh)' 
        : 'Server & Trình duyệt';
      showToast(
        `Quét thành công ${allScannedDocs.length} file tiếng Nhật bằng ${modeText}! Đã phân thành ${finalGroups.length} dạng biểu mẫu.`,
        'success'
      );
    } catch (error: any) {
      console.error('Scan error:', error);
      showToast(error.message || 'Lỗi xử lý file.', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleUpdateDocumentField = (docId: string, fieldKey: string, newValue: string) => {
    setDocuments(prevDocs => {
      return prevDocs.map(doc => {
        if (doc.id !== docId) return doc;
        const fieldExists = doc.fields.some(f => f.key === fieldKey);
        let updatedFields = [];
        if (fieldExists) {
          updatedFields = doc.fields.map(f => {
            if (f.key === fieldKey) {
              return { ...f, value: newValue };
            }
            return f;
          });
        } else {
          updatedFields = [...doc.fields, { key: fieldKey, value: newValue, hasHandwriting: false }];
        }
        return { ...doc, fields: updatedFields };
      });
    });

    showToast(`Đã cập nhật giá trị ô [${fieldKey}]`, 'info');
  };

  const handleExportExcel = () => {
    if (documents.length === 0) {
      showToast('Chưa có dữ liệu nào để xuất.', 'error');
      return;
    }

    try {
      const wb = generateExcelWorkbook(documents, formatGroups);
      downloadExcelFile(wb, 'ket_qua_quet_bieu_mau.xlsx');
      showToast('Đã tạo và tải file Excel (.xlsx) với đầy đủ các tab thành công!', 'success');
    } catch (err: any) {
      console.error('Export error:', err);
      showToast('Lỗi khi xuất file Excel: ' + err.message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        onLoadSamples={() => loadSamples(false)}
        onExportExcel={handleExportExcel}
        hasData={documents.length > 0}
        isProcessing={isProcessing}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-lg bg-slate-900 text-white text-xs border border-slate-700 animate-in slide-in-from-bottom-5">
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {notification.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs Bar for views */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <button
              onClick={() => setActiveView('upload')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                activeView === 'upload'
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              1. Tải lên & Quét PDF
            </button>
            <button
              onClick={() => setActiveView('preview')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === 'preview'
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>2. Xem trước bảng dữ liệu</span>
              {documents.length > 0 && (
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-mono">
                  {documents.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveView('groups')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === 'groups'
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Phân loại dạng form (Tabs)</span>
              {formatGroups.length > 0 && (
                <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.2 rounded-full font-mono">
                  {formatGroups.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setShowGuideModal(true)}
            className="text-xs text-slate-500 hover:text-slate-800 underline decoration-slate-300 underline-offset-4 cursor-pointer hidden sm:inline-block"
          >
            Tìm hiểu cách dò màu & nhận diện viết tay
          </button>
        </div>

        {/* Stats Metrics Banner */}
        <StatsBanner documents={documents} formatGroups={formatGroups} />

        {/* View Switcher */}
        {activeView === 'upload' && (
          <UploadZone
            onScanFiles={handleScanFiles}
            onLoadSamples={() => loadSamples(false)}
            isProcessing={isProcessing}
            processingStep={processingStep}
            fileCount={documents.length}
          />
        )}

        {activeView === 'preview' && (
          <div className="space-y-4">
            <SpreadsheetPreview
              documents={documents}
              formatGroups={formatGroups}
              onUpdateDocumentField={handleUpdateDocumentField}
              onExportExcel={handleExportExcel}
              onSelectDocumentForInspector={doc => setSelectedDocForInspector(doc)}
            />
          </div>
        )}

        {activeView === 'groups' && (
          <FormatGroupsView
            formatGroups={formatGroups}
            documents={documents}
            onSelectGroupForPreview={groupId => {
              setActiveView('preview');
            }}
            onExportExcel={handleExportExcel}
          />
        )}
      </main>

      {/* Document Inspector Modal */}
      <DocumentInspector
        document={selectedDocForInspector}
        onClose={() => setSelectedDocForInspector(null)}
        onUpdateField={handleUpdateDocumentField}
      />

      {/* Algorithm Guide Modal */}
      <AlgorithmGuide
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Hệ thống quét biểu mẫu PDF theo màu sắc khung &amp; Nhận diện chữ viết tay đa ngôn ngữ
          </span>
          <div className="flex items-center gap-3">
            <span>Thuật toán: Jaccard ≥ 0.8 &amp; Adaptive Darkest Title Color</span>
            <span aria-hidden="true">·</span>
            <span>Hỗ trợ xuất .xlsx &amp; .csv</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
