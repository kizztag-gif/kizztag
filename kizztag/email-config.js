/**
 * Cấu hình gửi email xác nhận đơn hàng — KIZZTAG
 *
 * Code backend: automation/kizztag.gs (1 file duy nhất trên Apps Script)
 *
 * Bạn chỉ cần:
 * 1. Mở https://script.google.com → KIZZTAG Order Email
 * 2. Dán toàn bộ kizztag.gs
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy URL deploy, dán vào webhookUrl bên dưới
 * 5. Đặt enabled: true
 *
 * Lần chạy đầu Gmail sẽ hỏi quyền gửi email — bấm Cho phép.
 * Đăng nhập Script bằng tài khoản: kizz.tag@gmail.com
 */
window.KIZZTAG_EMAIL = {
  enabled: true,
  webhookUrl:
    "https://script.google.com/macros/s/AKfycbydhE1aRP1ndN0ifJbErmaA3A9CMB3B8JyDSber_OtOiQDcLbC0crSP5xeMp741vUrR/exec",
  secret: "kizztag-2026-Pm7xR3nQ",
  shopEmail: "kizz.tag@gmail.com",
};
