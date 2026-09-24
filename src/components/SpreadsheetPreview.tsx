import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  PenTool, 
  Download, 
  Copy, 
  Check, 
  Image as ImageIcon, 
  Eye, 
  Edit3, 
  Save, 
  X,
  Palette,
  Layers,
  ChevronRight
} from 'lucide-react';
import { ScannedDocument, FormatGroup } from '../types/scanner';
import { cleanTextForExcel, exportToCSV } from '../utils/excelExport';

interface SpreadsheetPreviewProps {
  documents: ScannedDocument[];
  formatGroups: FormatGroup[];
  onUpdateDocumentField: (docId: string, fieldKey: string, newValue: string) => void;
  onExportExcel: () => void;
  onSelectDocumentForInspector: (doc: ScannedDocument) => void;
}

export const SpreadsheetPreview: React.FC<SpreadsheetPreviewProps> = ({
  documents,
  formatGroups,
  onUpdateDocumentField,
  onExportExcel,
  onSelectDocumentForInspector,
}) => {
  const [activeTabId, setActiveTabId] = useState<string>('all'); // 'all' or group.id
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHandwrittenOnly, setFilterHandwrittenOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cell editing state
  const [editingCell, setEditingCell] = useState<{ docId: string; fieldKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Determine current active group
  const activeGroup = useMemo(() => {
    if (activeTabId === 'all') return null;
    return formatGroups.find(g => g.id === activeTabId) || null;
  }, [activeTabId, formatGroups]);

  // Documents belonging to the current active tab
  const tabDocuments = useMemo(() => {
    let docs = activeGroup 
      ? documents.filter(d => activeGroup.documentIds.includes(d.id))
      : documents;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      docs = docs.filter(d => 
        d.fileName.toLowerCase().includes(term) ||
        d.fields.some(f => f.value.toLowerCase().includes(term) || f.key.toLowerCase().includes(term))
      );
    }

    return docs;
  }, [activeGroup, documents, searchTerm]);

  // Determine columns for this tab
  const columns = useMemo(() => {
    const colSet = new Set<string>();

    if (activeGroup) {
      activeGroup.representativeColumns.forEach(c => {
        if (c !== 'ファイル名') colSet.add(c);
      });
    } else {
      // All documents union
      documents.forEach(d => {
        d.fields.forEach(f => {
          if (f.key && f.key !== 'ファイル名') {
            colSet.add(f.key);
          }
        });
      });
    }

    let cols = Array.from(colSet);

    if (filterHandwrittenOnly) {
      // Keep only columns where at least one document has handwritten content
      cols = cols.filter(col => 
        tabDocuments.some(d => {
          const f = d.fields.find(field => field.key === col);
          return f?.hasHandwriting;
        })
      );
    }

    return ['ファイル名', ...cols];
  }, [activeGroup, documents, tabDocuments, filterHandwrittenOnly]);

  const handleStartEdit = (docId: string, fieldKey: string, currentValue: string) => {
    setEditingCell({ docId, fieldKey });
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      onUpdateDocumentField(editingCell.docId, editingCell.fieldKey, editValue);
      setEditingCell(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  const handleCopyTSV = () => {
    const headerRow = columns.join('\t');
    const dataRows = tabDocuments.map(doc => {
      return columns.map(col => {
        if (col === 'ファイル名') return doc.fileName;
        const field = doc.fields.find(f => f.key === col);
        return (field?.value || '').replace(/\n/g, ' ');
      }).join('\t');
    });

    const tsv = [headerRow, ...dataRows].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCurrentCSV = () => {
    const sheetName = activeGroup ? activeGroup.name : 'Tong_hop';
    exportToCSV(tabDocuments, columns, `ket_qua_${sheetName}.csv`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
      {/* Sheet Tabs Bar (like Excel tabs at top) */}
      <div className="flex items-center justify-between px-4 pt-3 pb-0 bg-slate-100 border-b border-slate-200 overflow-x-auto">
        <div className="flex items-center gap-1">
          {/* Tab: Tổng hợp */}
          <button
            onClick={() => setActiveTabId('all')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-t border-x ${
              activeTabId === 'all'
                ? 'bg-white text-emerald-800 border-slate-300 -mb-px pb-2.5 z-10 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tổng hợp</span>
            <span className="text-[10px] text-slate-400 font-mono">({documents.length})</span>
          </button>

          {/* Tabs for each detected format group */}
          {formatGroups.map((group, idx) => {
            const isActive = activeTabId === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setActiveTabId(group.id)}
                className={`px-3 py-2 text-xs font-medium rounded-t-md transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer border-t border-x ${
                  isActive
                    ? 'bg-white text-emerald-800 border-slate-300 -mb-px pb-2.5 z-10 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
                }`}
              >
                <span>{group.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({group.fileCount} file)</span>
              </button>
            );
          })}
        </div>

        {/* Tab Meta Info */}
        <div className="text-[11px] text-slate-500 pb-2 hidden lg:flex items-center gap-2">
          <span>{columns.length} cột</span>
          <span aria-hidden="true">·</span>
          <span>{tabDocuments.length} dòng</span>
        </div>
      </div>

      {/* Spreadsheet Action Toolbar */}
      <div className="p-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung hoặc tên cột..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Handwritten */}
          <label className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={filterHandwrittenOnly}
              onChange={e => setFilterHandwrittenOnly(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <PenTool className="w-3 h-3 text-blue-600" />
            <span>Chỉ hiện cột có chữ viết tay</span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyTSV}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="Sao chép toàn bộ bảng dưới dạng TSV để dán trực tiếp vào Google Sheets / Excel"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Đã chép' : 'Sao chép bảng'}</span>
          </button>

          <button
            onClick={handleExportCurrentCSV}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
            title="Tải bảng hiện tại dưới dạng file .csv"
          >
            <Download className="w-3 h-3" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-md transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
            title="Tải toàn bộ Workbook đầy đủ các tab .xlsx"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel đầy đủ (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="overflow-x-auto max-h-[600px] divide-y divide-slate-200">
        <table className="w-full text-left border-collapse text-xs">
          {/* Table Header */}
          <thead className="bg-slate-100/80 sticky top-0 z-10 text-slate-700 border-b border-slate-200 shadow-2xs">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center font-mono text-[11px] text-slate-400 bg-slate-100">
                #
              </th>
              {columns.map((col, cIdx) => (
                <th
                  key={cIdx}
                  className={`px-3 py-2.5 font-semibold text-slate-800 whitespace-nowrap border-r border-slate-200/80 ${
                    col === 'ファイル名' ? 'sticky left-0 bg-slate-100 z-20 min-w-[200px]' : 'min-w-[180px]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate">{col}</span>
                    {col !== 'ファイル名' && (
                      <span className="text-[10px] font-normal text-slate-400 font-mono">
                        Cột {cIdx}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-20 px-3 py-2.5 text-center text-slate-500 font-medium bg-slate-100">
                Thao tác
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 bg-white">
            {tabDocuments.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2} className="px-6 py-12 text-center text-slate-400">
                  Không tìm thấy dòng nào phù hợp với bộ lọc tìm kiếm.
                </td>
              </tr>
            ) : (
              tabDocuments.map((doc, rIdx) => {
                return (
                  <tr 
                    key={doc.id} 
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Row Index */}
                    <td className="px-3 py-2 text-center font-mono text-slate-400 tabular-nums">
                      {rIdx + 1}
                    </td>

                    {/* Columns */}
                    {columns.map((col, cIdx) => {
                      if (col === 'ファイル名') {
                        return (
                          <td 
                            key={cIdx} 
                            className="px-3 py-2 font-medium text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50/80 border-r border-slate-200/60 z-10"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="truncate font-semibold text-slate-800">
                                {doc.fileName}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1 font-mono">
                                  <Palette className="w-2.5 h-2.5 text-slate-400" />
                                  {doc.detectedTitleColor}
                                </span>
                                {doc.hasHandwriting && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-blue-600 font-medium flex items-center gap-0.5">
                                      <PenTool className="w-2.5 h-2.5" />
                                      {doc.handwritingCount} ô viết tay
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      const field = doc.fields.find(f => f.key === col);
                      const isEditingThis = editingCell?.docId === doc.id && editingCell?.fieldKey === col;
                      const hasHandwriting = field?.hasHandwriting;
                      const isImage = field?.isImage;
                      const cellValue = field?.value || '';

                      return (
                        <td 
                          key={cIdx} 
                          className="px-3 py-2 text-slate-700 border-r border-slate-200/60 align-top relative group/cell"
                        >
                          {isEditingThis ? (
                            <div className="flex flex-col gap-1.5 p-1 bg-blue-50/60 border border-blue-300 rounded shadow-xs">
                              <textarea
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                rows={3}
                                className="w-full text-xs p-1.5 bg-white border border-blue-200 rounded focus:outline-none"
                                autoFocus
                              />
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-2 py-0.5 text-[11px] text-slate-600 hover:text-slate-800"
                                >
                                  Huỷ
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-2 py-0.5 text-[11px] text-white bg-blue-600 hover:bg-blue-500 rounded font-medium flex items-center gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  Lưu
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <div className="whitespace-pre-wrap line-clamp-3 hover:line-clamp-none font-normal leading-relaxed text-slate-800">
                                {isImage ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px] font-medium">
                                    <ImageIcon className="w-3 h-3" />
                                    {cellValue || '[Ảnh]'}
                                  </span>
                                ) : cellValue ? (
                                  cellValue
                                ) : (
                                  <span className="text-slate-300 italic text-[11px]">(trống)</span>
                                )}
                              </div>

                              {/* Tags: Handwriting & Confidence */}
                              {hasHandwriting && (
                                <div className="flex items-center gap-1 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded self-start font-medium">
                                  <PenTool className="w-2.5 h-2.5" />
                                  <span>Chữ viết tay AI</span>
                                </div>
                              )}

                              {/* Edit trigger on hover */}
                              <button
                                onClick={() => handleStartEdit(doc.id, col, cellValue)}
                                className="absolute right-1 top-1 opacity-0 group-hover/cell:opacity-100 p-1 text-slate-400 hover:text-blue-600 bg-white/90 rounded transition-opacity cursor-pointer shadow-2xs"
                                title="Chỉnh sửa ô này"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="px-3 py-2 text-center align-top">
                      <button
                        onClick={() => onSelectDocumentForInspector(doc)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                        title="Xem chi tiết phân tích biểu mẫu này"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Spreadsheet Bottom Status Bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Trạng thái:</span>
          <span>Đã hoàn tất quét {documents.length} file</span>
          <span aria-hidden="true">·</span>
          <span>Phát hiện {formatGroups.length} dạng biểu mẫu</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-blue-600">
            <PenTool className="w-3 h-3" />
            Có thể nhấp đúp/sửa trực tiếp giá trị bất kỳ ô nào trước khi xuất Excel
          </span>
        </div>
      </div>
    </div>
  );
};
