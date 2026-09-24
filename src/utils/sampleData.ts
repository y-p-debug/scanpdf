import { ScannedDocument, FormatGroup } from '../types/scanner';
import { groupDocumentsClient } from './clientPdfScanner';

export const BUILTIN_SAMPLES: ScannedDocument[] = [
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

export function getSampleDataFallback(): { documents: ScannedDocument[]; formatGroups: FormatGroup[] } {
  const docs = JSON.parse(JSON.stringify(BUILTIN_SAMPLES));
  const groups = groupDocumentsClient(docs, 0.8);
  return { documents: docs, formatGroups: groups };
}
