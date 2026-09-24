import React from 'react';
import { Palette, PenTool, Layers, FileSpreadsheet, CheckCircle2, X } from 'lucide-react';

interface AlgorithmGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlgorithmGuide: React.FC<AlgorithmGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Nguyên lý quét biểu mẫu PDF theo màu sắc & Nhận diện chữ viết tay
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 leading-relaxed">
          {/* Rule 1 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Palette className="w-4 h-4 text-emerald-600" />
              1. Nhận diện màu khung tiêu đề một cách thích ứng (Adaptive Title Color)
            </div>
            <p>
              Tự động quét toàn bộ các khung có tô màu nền trong file PDF, tính toán độ sáng trung bình (luminance) và tìm ra màu nền <strong>đậm nhất</strong> lặp lại nhiều lần.
              Không giới hạn ở màu xám truyền thống mà tự động áp dụng chính xác cho cả các file dùng 3 tông màu (như xanh navy đậm, xanh nhạt, trắng ở mẫu <em>カネヤ製綱株式会社</em>).
            </p>
          </div>

          {/* Rule 2 */}
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
              <PenTool className="w-4 h-4 text-blue-600" />
              2. Nhận diện chữ viết tay trong biểu mẫu chính xác (AI Handwriting OCR)
            </div>
            <p>
              Mô hình thị giác đa phương thức của Gemini phân tích từng nét chữ viết tay (kanji, kana, chữ số, chữ ký, ghi chú tiếng Nhật/Việt) nằm trong các ô nội dung, giữ nguyên ngắt dòng và gắn cờ <code>hasHandwriting: true</code> để người dùng dễ dàng kiểm tra đối chiếu.
            </p>
          </div>

          {/* Rule 3 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              3. Quy tắc ghép cặp Tiêu Đề & Nội Dung xuyên suốt tài liệu
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Khung tiêu đề đầu tiên đứng một mình:</strong> Tự động đặt tên cột = <code>会社名</code> (Tên công ty).</li>
              <li><strong>Nội dung không có tiêu đề đi trước:</strong> Tự động gộp thành cột <code>詳細</code> (Chi tiết).</li>
              <li><strong>Giữ nguyên tiêu đề khi ngắt dòng / ngắt trang:</strong> Tiêu đề đang hoạt động được giữ nguyên dù nội dung bị tách thành nhiều dòng hoặc chuyển sang trang sau mà không lặp lại tiêu đề.</li>
              <li><strong>Ô chỉ có ảnh (vd khung 写真):</strong> Nhận diện và trích xuất ảnh chân dung/chứng chỉ/nhà xưởng.</li>
            </ul>
          </div>

          {/* Rule 4 */}
          <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-900 text-sm">
              <Layers className="w-4 h-4 text-purple-600" />
              4. Tách Tab theo dạng PDF bằng độ tương đồng Jaccard (≥ 80%)
            </div>
            <p>
              Khi quét nhiều file khác công ty hoặc khác mẫu form, các file có cấu trúc cột gần giống nhau được gộp vào chung 1 Tab (Dạng 1, Dạng 2...). Đồng thời tự động tạo 1 Tab <strong>"Tổng hợp"</strong> hợp nhất toàn bộ các cột, cột trùng tên được dùng chung.
            </p>
          </div>

          {/* Rule 5 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              5. Xuất file Excel (.xlsx) chuẩn hóa an toàn
            </div>
            <p>
              Tự động lọc bỏ các ký tự điều khiển lạ (control characters) gây lỗi khi mở trong Excel, căn chỉnh độ rộng cột tự động và cho phép tải về dưới dạng file .xlsx hoặc .csv.
            </p>
          </div>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
