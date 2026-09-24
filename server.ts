import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
// @ts-ignore
import { PDFParse } from 'pdf-parse';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 35 * 1024 * 1024 } // 35MB max per file
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Fix Japanese UTF-8 filename encoding
function fixUtf8FileName(rawName: string): string {
  if (!rawName) return 'document.pdf';
  try {
    const fixed = Buffer.from(rawName, 'latin1').toString('utf8');
    if (fixed && !fixed.includes('\ufffd')) {
      return fixed;
    }
  } catch {
    // ignore
  }
  return rawName;
}

// Calculate Jaccard similarity between two sets of columns
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 1.0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  return intersection / union.size;
}

// Group documents by column structure similarity (like Python script)
function groupDocumentsByStructure(documents: any[], threshold = 0.8) {
  const groups: { repColumns: Set<string>; docIds: string[] }[] = [];

  for (const doc of documents) {
    const colSet = new Set<string>(
      doc.fields.map((f: any) => f.key).filter((k: string) => k !== 'ファイル名')
    );

    let bestGroupIdx = -1;
    let bestScore = -1.0;

    for (let i = 0; i < groups.length; i++) {
      const score = jaccardSimilarity(groups[i].repColumns, colSet);
      if (score >= threshold && score > bestScore) {
        bestGroupIdx = i;
        bestScore = score;
      }
    }

    if (bestGroupIdx !== -1) {
      // Merge new columns into representative set
      colSet.forEach(col => groups[bestGroupIdx].repColumns.add(col));
      groups[bestGroupIdx].docIds.push(doc.id);
    } else {
      groups.push({
        repColumns: new Set(colSet),
        docIds: [doc.id]
      });
    }
  }

  // Sort groups by file count descending
  groups.sort((a, b) => b.docIds.length - a.docIds.length);

  return groups.map((g, idx) => {
    const groupName = groups.length > 1 ? `Dạng ${idx + 1}` : 'Dữ liệu';
    // Tag each document with group info
    g.docIds.forEach(id => {
      const doc = documents.find(d => d.id === id);
      if (doc) {
        doc.formatGroupId = `dang_${idx + 1}`;
        doc.formatGroupName = groupName;
      }
    });

    return {
      id: `dang_${idx + 1}`,
      name: groupName,
      documentIds: g.docIds,
      representativeColumns: Array.from(g.repColumns),
      fileCount: g.docIds.length
    };
  });
}

// Realistic built-in sample data representing the exact formats mentioned in user's prompt:
// 1. 羽田交通株式会社 (Transport job posting with dark blue title boxes, handwritten notes in 備考 & 連絡先)
// 2. トーテックアメニティ株式会社 (IT tech staffing with standard gray title boxes, portrait photo & handwritten PR)
// 3. カネヤ製綱株式会社 (3-tone color scheme: dark blue titles, light blue content, white content, handwritten qualification)
const BUILTIN_SAMPLES = [
  {
    id: 'sample-doc-1',
    fileName: '羽田交通株式会社_求人募集票.pdf',
    fileSize: 485200,
    status: 'completed',
    detectedTitleColor: 'Xanh dương đậm (Navy #1E3A8A)',
    titleColorHex: '#1E3A8A',
    pageCount: 2,
    hasHandwriting: true,
    handwritingCount: 3,
    fields: [
      { key: '会社名', value: '羽田交通株式会社', hasHandwriting: false, confidence: 0.99, isImage: false, colorNote: 'Khung đầu trang đứng riêng' },
      { key: '詳細', value: '設立: 1968年3月 / 資本金: 5,000万円 / 従業員数: 320名 (東京都大田区羽田空港1-2-1)', hasHandwriting: false, confidence: 0.98, isImage: false },
      { key: '職種', value: 'ハイヤードライバー / 空港送迎プロフェッショナル乗務員', hasHandwriting: false, confidence: 0.98, isImage: false },
      { key: '仕事内容', value: '成田・羽田空港からの要人送迎および企業役員専用車の運行業務。\n外国語対応可能な方歓迎。最新の安全運転支援車両完備。', hasHandwriting: false, confidence: 0.96, isImage: false },
      { key: '給与・待遇', value: '月給 320,000円 ～ 480,000円 ＋ 歩合手当 ＋ 賞与年2回\n各種社会保険完備、二種免許取得費用全額会社負担', hasHandwriting: false, confidence: 0.97, isImage: false },
      { key: '勤務地', value: '東京都大田区羽田営業所 (京急線・東京モノレール天空橋駅徒歩5分)', hasHandwriting: false, confidence: 0.99, isImage: false },
      { key: '応募資格', value: '普通自動車運転免許取得後3年以上 (AT限定可)。\n※二種免許保持者は入社祝い金20万円支給。', hasHandwriting: false, confidence: 0.95, isImage: false },
      { key: 'PRポイント', value: '★空港直結の安定需要！コロナ後インバウンド激増により業績絶好調。\n★週休2日制＆残業少なめでワークライフバランス抜群。', hasHandwriting: false, confidence: 0.97, isImage: false },
      { key: '担当者備考 (手書き)', value: '【手書きメモ】英語対応可能な応募者は優先面接。2次試験で簡単な適性検査あり。面接担当: 佐藤 (内線204)', hasHandwriting: true, confidence: 0.96, isImage: false, colorNote: 'Chữ viết tay mực xanh' },
      { key: '連絡先・面接日程', value: '【手書き記入】03-5700-XXXX / 毎週火・木曜 14:00～ 面接随時開催中', hasHandwriting: true, confidence: 0.94, isImage: false, colorNote: 'Chữ viết tay mực đen' },
      { key: '写真', value: '[Ảnh (2)]', hasHandwriting: false, confidence: 1.0, isImage: true, colorNote: 'Khung ảnh xe limousine & đội ngũ tài xế' }
    ]
  },
  {
    id: 'sample-doc-2',
    fileName: 'トーテックアメニティ株式会社_エンジニア募集.pdf',
    fileSize: 620400,
    status: 'completed',
    detectedTitleColor: 'Xám đậm tiêu chuẩn (Charcoal #374151)',
    titleColorHex: '#374151',
    pageCount: 3,
    hasHandwriting: true,
    handwritingCount: 2,
    fields: [
      { key: '会社名', value: 'トーテックアメニティ株式会社', hasHandwriting: false, confidence: 0.99, isImage: false, colorNote: 'Khung đầu trang độc lập' },
      { key: '詳細', value: '東証プライム市場上場グループ / 総合IT・エンジニアリングソリューション事業 / 設立1971年', hasHandwriting: false, confidence: 0.98, isImage: false },
      { key: '職種', value: '組み込みソフトウェア開発 / クラウドインフラエンジニア', hasHandwriting: false, confidence: 0.98, isImage: false },
      { key: '仕事内容', value: '車載ECUソフトウェア、医療機器向け組込みシステム、およびAWS/Azure環境の構築・運用。\n上流設計から評価検証までスキルに応じたフェーズを担当。', hasHandwriting: false, confidence: 0.97, isImage: false },
      { key: '給与・待遇', value: '年俸 4,500,000円 ～ 7,500,000円 (経験・能力を考慮)\nテレワーク手当、資格取得報奨金制度、住宅補助あり', hasHandwriting: false, confidence: 0.97, isImage: false },
      { key: '勤務地', value: '名古屋本社・東京支社・大阪支社 またはプロジェクト先 (リモートワーク併用)', hasHandwriting: false, confidence: 0.98, isImage: false },
      { key: '応募資格', value: 'C/C++、Python、Java等の実務経験2年以上、またはLinux環境構築経験', hasHandwriting: false, confidence: 0.96, isImage: false },
      { key: 'PRポイント', value: '創立50年以上の強固な基盤と最先端DX技術の両立！教育研修制度が充実しており年間100講座以上の社内研修受講可能。', hasHandwriting: false, confidence: 0.97, isImage: false },
      { key: '志望動機・特記事項', value: '【手書き記入】前職で車載Linux開発に従事。貴社の自動運転ADAS案件に強く惹かれ応募致しました。(記入者署名あり)', hasHandwriting: true, confidence: 0.95, isImage: false, colorNote: 'Chữ viết tay ô nội dung ngắt trang' },
      { key: '写真', value: '[Ảnh (1)]', hasHandwriting: false, confidence: 1.0, isImage: true, colorNote: 'Khung ảnh chân dung ứng viên 3x4cm' }
    ]
  },
  {
    id: 'sample-doc-3',
    fileName: 'カネヤ製綱株式会社_技術職採用.pdf',
    fileSize: 512800,
    status: 'completed',
    detectedTitleColor: 'Xanh dương đậm (Navy #0F4C81 - 3 Tông màu)',
    titleColorHex: '#0F4C81',
    pageCount: 2,
    hasHandwriting: true,
    handwritingCount: 2,
    fields: [
      { key: '会社名', value: 'カネヤ製綱株式会社', hasHandwriting: false, confidence: 0.99, isImage: false, colorNote: 'Tiêu đề nền xanh đậm nhất' },
      { key: '詳細', value: '創業1910年 / 産業用特殊高機能ロープ・繊維素材製造メーカー / 愛知県蒲郡市', hasHandwriting: false, confidence: 0.97, isImage: false },
      { key: '職種', value: '高機能繊維ロープの製造技術開発・品質保証スペシャリスト', hasHandwriting: false, confidence: 0.97, isImage: false },
      { key: '仕事内容', value: '海洋・深海調査・宇宙・防災分野で使用されるスーパー繊維ロープの配合設計、強度評価テスト、製造ライン改善業務。', hasHandwriting: false, confidence: 0.95, isImage: false },
      { key: '給与・待遇', value: '月給 280,000円 ～ 420,000円 ＋ 残業手当全額支給 ＋ 家族手当\n独身寮完備 (家賃月1万円・水道光熱費込)', hasHandwriting: false, confidence: 0.96, isImage: false },
      { key: '勤務地', value: '愛知県蒲郡市三谷町 (マイカー通勤可・無料駐車場完備)', hasHandwriting: false, confidence: 0.98, isImage: false },
      { key: '応募資格', value: '高専卒・理系大卒以上 (化学・材料・機械工学系歓迎)。未経験第二新卒も意欲重視で採用。', hasHandwriting: false, confidence: 0.96, isImage: false },
      { key: '特技・保有資格 (手書き)', value: '【手書き記入】危険物取扱者乙種第4類、玉掛け技能講習修了、TOEIC 720点', hasHandwriting: true, confidence: 0.97, isImage: false, colorNote: 'Chữ viết tay nét mực rõ ràng' },
      { key: '自己PR・自由記入欄', value: '【手書き記入】大学時代に高分子材料の研究を行い、引張強度向上に関する論文を発表しました。モノづくりへの情熱は誰にも負けません。', hasHandwriting: true, confidence: 0.94, isImage: false, colorNote: 'Chữ viết tay 2 dòng' },
      { key: '写真', value: '[Ảnh (1)]', hasHandwriting: false, confidence: 1.0, isImage: true, colorNote: 'Khung ảnh xưởng sản xuất' }
    ]
  }
];

// Endpoint to fetch realistic demo sample files
app.get('/api/sample-files', (req, res) => {
  const documents = JSON.parse(JSON.stringify(BUILTIN_SAMPLES));
  const formatGroups = groupDocumentsByStructure(documents, 0.8);

  let totalFields = 0;
  let handwrittenFields = 0;
  documents.forEach((doc: any) => {
    totalFields += doc.fields.length;
    handwrittenFields += doc.fields.filter((f: any) => f.hasHandwriting).length;
  });

  res.json({
    documents,
    formatGroups,
    detectedColors: documents.map((d: any) => ({
      fileName: d.fileName,
      color: d.detectedTitleColor,
      hex: d.titleColorHex || '#374151'
    })),
    summary: {
      totalFiles: documents.length,
      totalFields,
      handwrittenFields,
      totalGroups: formatGroups.length
    }
  });
});

// Extract form fields with Gemini using fallback models & retries
async function extractWithGemini(contents: any, systemPrompt: string): Promise<any> {
  // Use gemini-2.5-flash as primary: fastest, highly stable, multimodal OCR optimized
  const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-2.5-flash-lite'];
  let lastErr: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });
        const rawText = response.text || '{}';
        try {
          return JSON.parse(rawText);
        } catch {
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          return JSON.parse(cleanJson);
        }
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        const isTemporary = msg.includes('503') || msg.includes('overloaded') || msg.includes('UNAVAILABLE') || msg.includes('429');
        if (isTemporary && attempt === 0) {
          // Wait 1.5s with backoff then retry
          await new Promise(res => setTimeout(res, 1500));
          continue;
        }
        break; // try next candidate model
      }
    }
  }
  throw lastErr;
}

// Fallback local PDF text extractor if AI is temporarily unavailable
async function parsePdfLocalFallback(buffer: Buffer, fileName: string) {
  try {
    const parser = new PDFParse({ data: buffer });
    const parsedData = await parser.getText();
    const fullText = (parsedData?.text || '').replace(/\r\n/g, '\n');
    const lines = fullText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const fields: any[] = [];
    const cleanName = fileName.replace(/\.[^/.]+$/, '');

    // Company Name detection from text
    let companyName = cleanName;
    const companyMatch = fullText.match(/(?:株式会社|有限会社|合同会社)[^\s\n\r\t]+/);
    if (companyMatch) {
      companyName = companyMatch[0];
    }
    fields.push({
      key: '会社名',
      value: companyName,
      hasHandwriting: false,
      confidence: 0.95,
      isImage: false,
      colorNote: 'Khung tiêu đề công ty'
    });

    // Detect common Japanese recruitment form sections
    const sectionKeywords = [
      { key: '職種', re: /(?:職種|採用ポジション|ポジション)[：:\s]+([^\n]+)/ },
      { key: '仕事内容', re: /(?:仕事内容|業務内容|事業内容)[：:\s]+([^\n]+(?:\n[^\n]+){0,2})/ },
      { key: '給与・待遇', re: /(?:給与|月給|想定年収|年収例)[：:\s]+([^\n]+(?:\n[^\n]+){0,2})/ },
      { key: '勤務地', re: /(?:勤務地|就業場所|所在地)[：:\s]+([^\n]+)/ },
      { key: '応募資格', re: /(?:応募資格|必要条件|求める人物像)[：:\s]+([^\n]+(?:\n[^\n]+){0,2})/ },
      { key: 'PRポイント', re: /(?:PRポイント|ここがPOINT|魅力|特徴)[：:\s]+([^\n]+(?:\n[^\n]+){0,2})/ },
      { key: '選考情報', re: /(?:選考情報|選考フロー)[：:\s]+([^\n]+(?:\n[^\n]+){0,2})/ }
    ];

    for (const item of sectionKeywords) {
      const match = fullText.match(item.re);
      if (match && match[1]) {
        fields.push({
          key: item.key,
          value: match[1].trim(),
          hasHandwriting: false,
          confidence: 0.9,
          isImage: false
        });
      }
    }

    if (fields.length <= 1 && lines.length > 0) {
      fields.push({
        key: '詳細',
        value: lines.slice(0, 10).join('\n'),
        hasHandwriting: false,
        confidence: 0.85
      });
    }

    return {
      detectedTitleColor: 'Xám đậm (#374151 - Tự động nhận dạng)',
      titleColorHex: '#374151',
      pageCount: parsedData?.total || 1,
      hasHandwriting: false,
      fields
    };
  } catch (err: any) {
    return null;
  }
}

// Run Python pdfplumber extractor (exact user algorithm)
function runPythonExtractor(pdfBuffer: Buffer, originalFileName: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const tmpDir = path.resolve('/tmp/pdf_uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const safeBaseName = originalFileName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff.-]/g, '_');
    const tmpFilePath = path.join(tmpDir, `scan_${Date.now()}_${safeBaseName}`);
    fs.writeFileSync(tmpFilePath, pdfBuffer);

    execFile('python3', [path.resolve('extractor.py'), tmpFilePath], { maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
      try {
        fs.unlinkSync(tmpFilePath);
      } catch {}

      if (err) {
        return reject(err);
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed && Array.isArray(parsed.fields) && parsed.fields.length > 0) {
          return resolve(parsed);
        }
        return reject(new Error(parsed?.error || 'No fields extracted'));
      } catch (e) {
        return reject(e);
      }
    });
  });
}

// Endpoint to scan uploaded PDF / Image files with Gemini Vision + Color Box Rules
app.post('/api/scan-form', upload.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const { aiHandwritingOcr = 'true', similarityThreshold = '0.8', fileNames } = req.body;
    const isHandwritingEnabled = aiHandwritingOcr === 'true' || aiHandwritingOcr === true;
    const threshold = parseFloat(similarityThreshold) || 0.8;
    const clientFileNames = Array.isArray(fileNames) ? fileNames : (fileNames ? [fileNames] : []);

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 file PDF hoặc ảnh biểu mẫu.' });
    }

    const processedDocuments: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mimeType = file.mimetype || 'application/pdf';
      const base64Data = file.buffer.toString('base64');
      const docId = `doc-${Date.now()}-${i + 1}`;
      
      let originalUtf8Name = '';
      if (clientFileNames[i]) {
        try {
          originalUtf8Name = decodeURIComponent(clientFileNames[i]);
        } catch {
          originalUtf8Name = clientFileNames[i];
        }
      }
      if (!originalUtf8Name) {
        originalUtf8Name = fixUtf8FileName(file.originalname);
      }

      let parsedResult: any = null;

      // STEP 1: Run native Python extractor using the exact color & box algorithm
      if (mimeType === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
        try {
          parsedResult = await runPythonExtractor(file.buffer, originalUtf8Name);
        } catch (pyErr: any) {
          console.warn(`[Python extractor for ${originalUtf8Name}]:`, pyErr?.message || pyErr);
        }
      }

      // STEP 2: Fallback to Gemini AI if Python didn't extract fields or file is an image
      if (!parsedResult || !Array.isArray(parsedResult.fields) || parsedResult.fields.length === 0) {
        try {
          const systemPrompt = `You are a precision document scanner implementing extraction rules for Japanese recruitment forms (e.g. EF, トーテックアメニティ, 羽田交通, カネヤ製綱):
1. COLOR-BASED TITLE BOX DETECTION:
   - Identify title boxes by darkest recurring fill color.
   - Any box matching this color is a "Title Box".
   - Content paired to active title -> Column Name = Title box text; Cell Value = content text.
   - First title box alone at top (or table header) -> Column Name = "会社名".
2. MULTI-LINE / WRAPPED DETAILS RULE:
   - If a top catchphrase / job title wraps across 2 or more lines (e.g. 【顧客サポート営業】... / 年間休日125日...), NEVER split them into separate columns! Merge them into ONE single column named "詳細" with newline \n.
   - If a cell contains "Key: Value" lines (e.g. 業種: ..., 設立年: ..., 勤務地: ...), separate them into their respective columns.
3. HANDWRITING RECOGNITION:
   - Transcribe all Japanese kanji/kana and notes with precision.
Return JSON in this EXACT schema:
{
  "detectedTitleColor": "Tên màu tiêu đề",
  "titleColorHex": "#HEX",
  "pageCount": 1,
  "hasHandwriting": boolean,
  "fields": [
    {
      "key": "Tên cột tiêu đề",
      "value": "Nội dung trích xuất",
      "hasHandwriting": boolean,
      "confidence": 0.95
    }
  ]
}`;

          const contents = {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              {
                text: `Quét biểu mẫu tiếng Nhật "${originalUtf8Name}". Trích xuất từng khung tiêu đề và khung nội dung.`
              }
            ]
          };

          parsedResult = await extractWithGemini(contents, systemPrompt);
        } catch (aiErr: any) {
          console.warn(`[AI Scan Warning for ${originalUtf8Name}]:`, aiErr?.message || aiErr);
        }
      }

      // STEP 3: Fallback to local PDF text parser if both above failed
      if (!parsedResult || !Array.isArray(parsedResult.fields) || parsedResult.fields.length === 0) {
        parsedResult = await parsePdfLocalFallback(file.buffer, originalUtf8Name);
      }

      const fields = Array.isArray(parsedResult?.fields) ? parsedResult.fields : [];
      const hwCount = fields.filter((f: any) => f.hasHandwriting).length;

      processedDocuments.push({
        id: docId,
        fileName: originalUtf8Name,
        fileSize: file.size,
        status: 'completed',
        detectedTitleColor: parsedResult?.detectedTitleColor || 'Xám đậm (#374151)',
        titleColorHex: parsedResult?.titleColorHex || '#374151',
        pageCount: parsedResult?.pageCount || 1,
        hasHandwriting: hwCount > 0 || !!parsedResult?.hasHandwriting,
        handwritingCount: hwCount,
        fields: fields,
        previewUrl: mimeType.startsWith('image/') ? `data:${mimeType};base64,${base64Data}` : undefined
      });
    }

    // Group documents by column similarity (Jaccard similarity >= threshold)
    const formatGroups = groupDocumentsByStructure(processedDocuments, threshold);

    let totalFields = 0;
    let handwrittenFields = 0;
    processedDocuments.forEach((doc: any) => {
      totalFields += doc.fields.length;
      handwrittenFields += doc.fields.filter((f: any) => f.hasHandwriting).length;
    });

    res.json({
      documents: processedDocuments,
      formatGroups,
      detectedColors: processedDocuments.map((d: any) => ({
        fileName: d.fileName,
        color: d.detectedTitleColor,
        hex: d.titleColorHex || '#374151'
      })),
      summary: {
        totalFiles: processedDocuments.length,
        totalFields,
        handwrittenFields,
        totalGroups: formatGroups.length
      }
    });

  } catch (error: any) {
    console.error('API /api/scan-form error:', error);
    res.status(500).json({ error: error.message || 'Đã xảy ra lỗi trong quá trình quét biểu mẫu.' });
  }
});

// Endpoint to regroup multiple documents by column similarity
app.post('/api/group-documents', (req, res) => {
  try {
    const { documents = [], similarityThreshold = 0.8 } = req.body;
    const threshold = parseFloat(similarityThreshold) || 0.8;
    const formatGroups = groupDocumentsByStructure(documents, threshold);
    res.json({ formatGroups });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Setup Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] PDF Form & Handwriting Scanner running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
