/**
 * LIÊN KẾT ADMIN ↔ INDEX (cùng dữ liệu sản phẩm)
 *
 * Admin bấm "Lưu thay đổi" → lưu lên Google → index tự tải khi khách mở web.
 *
 * Nếu mở link Script báo "Bạn cần có quyền truy cập":
 * 1. script.google.com → project KIZZTAG Order Email
 * 2. Chỉ 1 file: dán automation/kizztag.gs (xóa file thừa trên Apps Script)
 * 3. Deploy → Manage deployments → Edit (biểu tượng bút) → New version → Deploy
 * 4. Execute as: Me | Who has access: Anyone (Bất kỳ ai)  ← BẮT BUỘC
 * 5. Dán URL /exec vào webhookUrl bên dưới
 */
window.KIZZTAG_STORE = {
  enabled: true,
  webhookUrl:
    "https://script.google.com/macros/s/AKfycbydhE1aRP1ndN0ifJbErmaA3A9CMB3B8JyDSber_OtOiQDcLbC0crSP5xeMp741vUrR/exec",
  secret: "kizztag-2026-Pm7xR3nQ",
};
