export interface ExtractedField {
  key: string;
  value: string;
  hasHandwriting?: boolean;
  confidence?: number;
  isImage?: boolean;
  imageUrl?: string;
  colorNote?: string;
  pageNumber?: number;
}

export interface ScannedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detectedTitleColor: string;
  titleColorHex?: string;
  pageCount: number;
  hasHandwriting: boolean;
  handwritingCount: number;
  fields: ExtractedField[];
  previewUrl?: string;
  error?: string;
  formatGroupId?: string;
  formatGroupName?: string;
}

export interface FormatGroup {
  id: string;
  name: string;
  documentIds: string[];
  representativeColumns: string[];
  fileCount: number;
  similarityScore?: number;
}

export interface ExtractionSettings {
  aiHandwritingOcr: boolean;
  groupByFormat: boolean;
  similarityThreshold: number;
  cleanExcelChars: boolean;
  autoDetectDarkestColor: boolean;
}

export interface ScanResponse {
  documents: ScannedDocument[];
  formatGroups: FormatGroup[];
  detectedColors: { fileName: string; color: string; hex: string }[];
  summary: {
    totalFiles: number;
    totalFields: number;
    handwrittenFields: number;
    totalGroups: number;
  };
}
