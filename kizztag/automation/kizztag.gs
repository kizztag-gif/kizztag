/**
 * KIZZTAG — 1 FILE DUY NHẤT (email đơn hàng + đồng bộ admin ↔ web)
 *
 * TRÊN script.google.com:
 * 1. Mở project "KIZZTAG Order Email" (hoặc tạo mới)
 * 2. Xóa hết file cũ → chỉ giữ 1 file Code.gs (hoặc đổi tên thành kizztag.gs)
 * 3. Dán TOÀN BỘ nội dung file này
 * 4. Deploy → Manage deployments → Edit → New version → Deploy
 *    - Execute as: Me
 *    - Who has access: Anyone (Bất kỳ ai)
 * 5. Copy URL /exec → dán vào email-config.js + google-store-config.js
 */

const SECRET = "kizztag-2026-Pm7xR3nQ";
const SHOP_NAME = "KIZZTAG";
const SHOP_EMAIL = "kizz.tag@gmail.com";
const SHOP_INSTAGRAM = "https://www.instagram.com/kizz.tag/";
const SHOP_INSTAGRAM_HANDLE = "@kizz.tag";
const STORE_FILE_NAME = "kizztag-store.json";

// ——— Web App (admin + trang web + giỏ hàng gọi vào đây) ———

function doGet(e) {
  e = e || {};
  if (e.parameter && e.parameter.action === "store") {
    return handleStoreGet_(e);
  }
  return json_({ ok: true, service: "KIZZTAG email + store sync" });
}

function parsePostBody_(e) {
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(String(e.parameter.payload));
  }

  if (e.postData && e.postData.contents) {
    var contents = e.postData.contents;
    var type = String(e.postData.type || "");

    if (type.indexOf("application/x-www-form-urlencoded") !== -1) {
      var pairs = contents.split("&");
      for (var i = 0; i < pairs.length; i++) {
        var part = pairs[i].split("=");
        var key = decodeURIComponent(part[0] || "");
        if (key === "payload") {
          return JSON.parse(decodeURIComponent(part[1] || "{}"));
        }
      }
    }

    return JSON.parse(contents || "{}");
  }

  return {};
}

function doPost(e) {
  try {
    const body = parsePostBody_(e);

    if (body.secret !== SECRET) {
      return json_({ ok: false, error: "Unauthorized" });
    }

    if (body.action === "saveStore") {
      return handleStoreSave_(body);
    }

    const order = body.order;
    if (!order || !order.customerEmail) {
      return json_({ ok: false, error: "Missing order data" });
    }

    sendCustomerConfirmation_(order);
    sendShopNotification_(order);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ——— Cửa hàng (sản phẩm, danh mục, feedback) ———

function getDefaultStore_() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    products: [
      {
        id: "s1-cloud",
        name: "Cloud Mono Keychain",
        category: "Series 1",
        price: 89000,
        imagePosition: "32% 80%",
        stock: 5,
        locked: false,
      },
      {
        id: "s1-heart",
        name: "Speckle Heart Keychain",
        category: "Series 1",
        price: 79000,
        imagePosition: "14% 46%",
        stock: 5,
        locked: false,
      },
      {
        id: "s2-bar",
        name: "Black Marble Tag",
        category: "Series 2",
        price: 99000,
        imagePosition: "48% 48%",
        stock: 5,
        locked: false,
      },
      {
        id: "s2-ring",
        name: "Clear Orbit Keychain",
        category: "Series 2",
        price: 109000,
        imagePosition: "84% 43%",
        stock: 5,
        locked: false,
      },
      {
        id: "combo-duo",
        name: "Bestie Duo Combo",
        category: "Combo",
        price: 169000,
        imagePosition: "56% 72%",
        stock: 5,
        locked: false,
      },
      {
        id: "combo-box",
        name: "Gift Box Combo",
        category: "Combo",
        price: 219000,
        imagePosition: "78% 16%",
        stock: 5,
        locked: false,
      },
    ],
    categories: ["Series 1", "Series 2", "Combo"],
    testimonials: [
      {
        text:
          "Keychain cầm rất chắc tay, màu đen trắng đúng style tối giản mình thích.",
        name: "Minh Anh",
        role: "Khách hàng Series 1",
        initials: "MA",
        imageUrl: "assets/keychain-mockup.png",
      },
      {
        text: "Mình đặt combo làm quà sinh nhật, từng chiếc đều có vân riêng.",
        name: "Gia Hân",
        role: "Khách hàng Combo",
        initials: "GH",
        imageUrl: "assets/keychain-mockup.png",
      },
      {
        text: "Logo và packaging đẹp, keychain lên balo rất nổi.",
        name: "Tuấn Kiệt",
        role: "Khách hàng Series 2",
        initials: "TK",
        imageUrl: "assets/keychain-mockup.png",
      },
    ],
    orders: [],
  };
}

function readStore_() {
  var files = DriveApp.getFilesByName(STORE_FILE_NAME);
  if (files.hasNext()) {
    var file = files.next();
    try {
      return JSON.parse(file.getBlob().getDataAsString() || "{}");
    } catch (err) {
      Logger.log("readStore: " + err);
    }
  }

  var defaults = getDefaultStore_();
  writeStore_(defaults);
  return defaults;
}

function writeStore_(data) {
  var content = JSON.stringify(data);
  var files = DriveApp.getFilesByName(STORE_FILE_NAME);
  if (files.hasNext()) {
    files.next().setContent(content);
    return;
  }
  DriveApp.createFile(STORE_FILE_NAME, content, MimeType.PLAIN_TEXT);
}

function handleStoreGet_(e) {
  e = e || {};
  var data = readStore_();

  if (e.parameter && e.parameter.callback) {
    var cb = String(e.parameter.callback).replace(/[^\w$]/g, "");
    if (!cb) {
      return json_({ ok: false, error: "Invalid callback" });
    }
    return ContentService.createTextOutput(
      cb + "(" + JSON.stringify(data) + ")"
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(data);
}

function handleStoreSave_(body) {
  if (!body.store || typeof body.store !== "object") {
    return json_({ ok: false, error: "Missing store" });
  }
  writeStore_(body.store);
  return json_({ ok: true, updatedAt: body.store.updatedAt || "" });
}

// ——— Email đơn hàng ———

function getSenderEmail_() {
  if (SHOP_EMAIL) return SHOP_EMAIL;
  return Session.getActiveUser().getEmail();
}

function formatMoney_(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace(/\s₫/, "đ");
}

function formatShipping_(fee) {
  const n = Number(fee);
  if (n === 0) return "0 đ";
  return formatMoney_(n);
}

function buildItemsTableRows_(items) {
  if (!items || !items.length) {
    return (
      '<tr><td colspan="4" style="padding:12px;border:1px solid #ddd;">Không có sản phẩm</td></tr>'
    );
  }

  return items
    .map(function (item) {
      const name = escapeHtml_(item.name || "");
      const qty = Number(item.quantity) || 0;
      const unitPrice = formatMoney_(item.price || 0);
      const lineTotal = formatMoney_(item.subtotal || item.price * qty);

      return (
        "<tr>" +
        '<td style="padding:10px 12px;border:1px solid #ddd;vertical-align:top;">' +
        name +
        "</td>" +
        '<td style="padding:10px 12px;border:1px solid #ddd;text-align:right;white-space:nowrap;">' +
        unitPrice +
        "</td>" +
        '<td style="padding:10px 12px;border:1px solid #ddd;text-align:center;">' +
        qty +
        "</td>" +
        '<td style="padding:10px 12px;border:1px solid #ddd;text-align:right;white-space:nowrap;">' +
        lineTotal +
        "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml_(order) {
  const orderId = escapeHtml_(order.id || "");
  const name = escapeHtml_(order.customerName || "");
  const phone = escapeHtml_(order.customerPhone || "");
  const address = escapeHtml_((order.address && order.address.full) || "");
  const itemsRows = buildItemsTableRows_(order.items || []);
  const subtotal = formatMoney_(order.subtotal);
  const shipping = formatShipping_(order.shippingFee);
  const shippingLabel =
    Number(order.shippingFee) === 0
      ? "0 đ (Freeship nội thành TP.HCM)"
      : shipping;
  const total = formatMoney_(order.total);

  return (
    '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:24px 16px;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.6;">' +
    '<div style="max-width:640px;margin:0 auto;">' +
    '<p style="margin:0 0 20px;font-size:22px;font-weight:700;letter-spacing:0.04em;">' +
    SHOP_NAME +
    "</p>" +
    '<p style="margin:0 0 8px;">Cảm ơn bạn đã đặt hàng tại ' +
    SHOP_NAME +
    "</p>" +
    "<p style=\"margin:0 0 20px;\">" +
    SHOP_NAME +
    " xin xác nhận thông tin đơn hàng của bạn:</p>" +
    "<ul style=\"margin:0 0 24px;padding-left:20px;\">" +
    "<li><strong>ID ĐƠN HÀNG:</strong> " +
    orderId +
    "</li>" +
    "<li><strong>TÊN NGƯỜI NHẬN:</strong> " +
    name +
    "</li>" +
    "<li><strong>SĐT:</strong> " +
    phone +
    "</li>" +
    "<li><strong>ĐỊA CHỈ:</strong> " +
    address +
    "</li>" +
    "<li><strong>PHƯƠNG THỨC THANH TOÁN:</strong> Chuyển khoản ngân hàng</li>" +
    "</ul>" +
    '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;font-size:13px;">' +
    "<thead>" +
    "<tr>" +
    '<th style="padding:10px 12px;border:1px solid #ddd;background:#4472C4;color:#fff;text-align:left;font-weight:700;">Sản phẩm</th>' +
    '<th style="padding:10px 12px;border:1px solid #ddd;background:#4472C4;color:#fff;text-align:right;font-weight:700;white-space:nowrap;">Đơn giá</th>' +
    '<th style="padding:10px 12px;border:1px solid #ddd;background:#4472C4;color:#fff;text-align:center;font-weight:700;">SL</th>' +
    '<th style="padding:10px 12px;border:1px solid #ddd;background:#4472C4;color:#fff;text-align:right;font-weight:700;white-space:nowrap;">Thành tiền</th>' +
    "</tr></thead><tbody>" +
    itemsRows +
    "</tbody></table>" +
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;font-size:13px;">' +
    '<tr><td style="padding:4px 0;text-align:right;">Tổng tạm tính:</td>' +
    '<td style="padding:4px 0;text-align:right;width:140px;white-space:nowrap;">' +
    subtotal +
    "</td></tr>" +
    '<tr><td style="padding:4px 0;text-align:right;">Khuyến mãi:</td>' +
    '<td style="padding:4px 0;text-align:right;white-space:nowrap;">0 đ</td></tr>' +
    '<tr><td style="padding:4px 0;text-align:right;">Phí vận chuyển:</td>' +
    '<td style="padding:4px 0;text-align:right;white-space:nowrap;">' +
    shippingLabel +
    "</td></tr>" +
    '<tr><td style="padding:8px 0 4px;text-align:right;font-weight:700;">Tổng giá trị đơn hàng:</td>' +
    '<td style="padding:8px 0 4px;text-align:right;font-weight:700;white-space:nowrap;">' +
    total +
    "</td></tr></table>" +
    "<p style=\"margin:0 0 16px;\">" +
    "Trong trường hợp thanh toán chưa thành công, " +
    SHOP_NAME +
    " sẽ chủ động liên hệ cho bạn qua SĐT đặt hàng để xác nhận &amp; hỗ trợ hoàn tất thanh toán. " +
    "Vui lòng chuyển khoản đúng số tiền <strong>" +
    total +
    "</strong> với nội dung chuyển khoản: <strong>" +
    orderId +
    "</strong>.</p>" +
    "<p style=\"margin:0 0 16px;\"><strong>EMAIL:</strong> " +
    SHOP_EMAIL +
    "<br><strong>INSTAGRAM:</strong> " +
    '<a href="' +
    SHOP_INSTAGRAM +
    '" style="color:#111;">' +
    SHOP_INSTAGRAM_HANDLE +
    "</a></p>" +
    "<p style=\"margin:0 0 16px;\">" +
    "Đơn hàng sẽ được xử lí &amp; chuẩn bị nhanh nhất sau khi " +
    SHOP_NAME +
    " xác nhận đặt hàng - thanh toán thành công.</p>" +
    "<p style=\"margin:0 0 24px;\">" +
    "Nếu cần hỗ trợ bất cứ vấn đề nào liên quan đến đơn hàng, vui lòng phản hồi email này hoặc nhắn tin qua Instagram để team " +
    SHOP_NAME +
    " hỗ trợ bạn nhanh nhất.</p>" +
    "<p style=\"margin:0 0 24px;\">Cảm ơn bạn đã tin tưởng đồng hành cùng " +
    SHOP_NAME +
    ".</p>" +
    "<p style=\"margin:0 0 4px;\">LOVE,</p>" +
    "<p style=\"margin:0 0 16px;font-weight:700;\">" +
    SHOP_NAME +
    "</p>" +
    '<p style="margin:0;"><a href="' +
    SHOP_INSTAGRAM +
    '" style="color:#111;">' +
    SHOP_INSTAGRAM +
    "</a></p>" +
    "</div></body></html>"
  );
}

function sendCustomerConfirmation_(order) {
  const html = buildEmailHtml_(order);
  const orderId = order.id || "KIZZTAG";

  GmailApp.sendEmail(order.customerEmail, SHOP_NAME + " | Xác nhận đơn " + orderId, "", {
    htmlBody: html,
    name: SHOP_NAME,
    replyTo: SHOP_EMAIL,
  });
}

function sendShopNotification_(order) {
  const shopEmail = getSenderEmail_();
  const orderId = order.id || "";
  const items = (order.items || [])
    .map(function (item) {
      return "- " + item.name + " x" + item.quantity;
    })
    .join("\n");

  const text =
    "Đơn hàng mới: " +
    orderId +
    "\n\n" +
    "Khách: " +
    order.customerName +
    "\n" +
    "Email: " +
    order.customerEmail +
    "\n" +
    "SĐT: " +
    order.customerPhone +
    "\n" +
    "Địa chỉ: " +
    ((order.address && order.address.full) || "") +
    "\n\n" +
    "Sản phẩm:\n" +
    items +
    "\n\n" +
    "Tổng: " +
    formatMoney_(order.total);

  GmailApp.sendEmail(shopEmail, "[KIZZTAG] Đơn mới " + orderId, text, {
    name: SHOP_NAME,
    replyTo: order.customerEmail || SHOP_EMAIL,
  });
}
