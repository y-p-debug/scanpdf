import * as XLSX from 'xlsx';
import { ScannedDocument, FormatGroup } from '../types/scanner';

// Remove Excel control characters [\x00-\x08\x0b\x0c\x0e-\x1f\x7f]
export function cleanTextForExcel(text: string | undefined | null): string {
  if (typeof text !== 'string') return '';
  return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}

/**
 * Generate a multi-tab Excel Workbook from scanned documents and format groups
 * Matches exact Python script behavior:
 * - Tab "Tổng hợp" (Union of all columns across all documents)
 * - Tab "Dạng 1", "Dạng 2", ... (Grouped by column structure similarity)
 */
export function generateExcelWorkbook(
  documents: ScannedDocument[],
  groups: FormatGroup[]
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // Helper to build rows array for a set of documents
  const buildSheetData = (docs: ScannedDocument[], columns: string[]) => {
    const data: Record<string, string>[] = [];

    for (const doc of docs) {
      const row: Record<string, string> = {
        'ファイル名': cleanTextForExcel(doc.fileName)
      };

      // Fill in each column
      for (const col of columns) {
        if (col === 'ファイル名') continue;
        const field = doc.fields.find(f => f.key === col);
        if (field) {
          row[col] = cleanTextForExcel(field.value);
        } else {
          row[col] = '';
        }
      }
      data.push(row);
    }

    return data;
  };

  // 1. Tab "Tổng hợp" (All documents, unified columns)
  const allColumnsSet = new Set<string>();
  documents.forEach(doc => {
    doc.fields.forEach(f => {
      if (f.key && f.key !== 'ファイル名') {
        allColumnsSet.add(f.key);
      }
    });
  });

  // Logical ordering: 'ファイル名' -> '会社名' -> '詳細' -> remaining columns
  const otherCols = Array.from(allColumnsSet).filter(c => c !== '会社名' && c !== '詳細');
  const unionColumns: string[] = ['ファイル名'];
  if (allColumnsSet.has('会社名')) unionColumns.push('会社名');
  if (allColumnsSet.has('詳細')) unionColumns.push('詳細');
  unionColumns.push(...otherCols);

  const summaryData = buildSheetData(documents, unionColumns);
  const wsSummary = XLSX.utils.json_to_sheet(summaryData, { header: unionColumns });

  // Auto-fit column widths
  const colWidths = unionColumns.map(col => {
    let maxLen = col.length;
    for (const row of summaryData) {
      const val = row[col] || '';
      maxLen = Math.max(maxLen, Math.min(val.length, 50));
    }
    return { wch: Math.max(maxLen + 4, 14) };
  });
  wsSummary['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tổng hợp');

  // 2. Individual Tabs for each "Dạng" (Format Group)
  if (groups.length > 0) {
    groups.forEach(group => {
      const groupDocs = documents.filter(d => group.documentIds.includes(d.id));
      if (groupDocs.length === 0) return;

      const rawCols = group.representativeColumns.filter(c => c !== 'ファイル名');
      const otherGroupCols = rawCols.filter(c => c !== '会社名' && c !== '詳細');
      const groupColumns: string[] = ['ファイル名'];
      if (rawCols.includes('会社名')) groupColumns.push('会社名');
      if (rawCols.includes('詳細')) groupColumns.push('詳細');
      groupColumns.push(...otherGroupCols);

      const groupData = buildSheetData(groupDocs, groupColumns);
      const wsGroup = XLSX.utils.json_to_sheet(groupData, { header: groupColumns });

      const groupColWidths = groupColumns.map(col => {
        let maxLen = col.length;
        for (const row of groupData) {
          const val = row[col] || '';
          maxLen = Math.max(maxLen, Math.min(val.length, 50));
        }
        return { wch: Math.max(maxLen + 4, 14) };
      });
      wsGroup['!cols'] = groupColWidths;

      const sheetTitle = group.name.length > 31 ? group.name.substring(0, 31) : group.name;
      XLSX.utils.book_append_sheet(wb, wsGroup, sheetTitle);
    });
  }

  return wb;
}

export function downloadExcelFile(wb: XLSX.WorkBook, filename = 'ket_qua_quet_pdf.xlsx') {
  XLSX.writeFile(wb, filename);
}

export function exportToCSV(docs: ScannedDocument[], columns: string[], filename = 'ket_qua.csv') {
  const data: Record<string, string>[] = [];
  for (const doc of docs) {
    const row: Record<string, string> = { 'ファイル名': cleanTextForExcel(doc.fileName) };
    for (const col of columns) {
      if (col === 'ファイル名') continue;
      const field = doc.fields.find(f => f.key === col);
      row[col] = cleanTextForExcel(field?.value || '');
    }
    data.push(row);
  }

  const ws = XLSX.utils.json_to_sheet(data, { header: columns });
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
