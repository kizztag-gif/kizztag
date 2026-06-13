const ADMIN_USER = "benpham121233";
const ADMIN_PASS_HASH =
  "41ab37f79df1bc96b7160c207ed09aee66f33791417219685c766120b136b404";
const SESSION_KEY = "kizztagAdminSession";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
let loginFailAttempts = 0;
let loginLockoutUntil = 0;

const defaultCategories = ["Series 1", "Series 2", "Combo"];

const defaultProducts = [
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
];

function normalizeProduct(product) {
  const stock =
    product?.stock === undefined || product?.stock === null
      ? product?.locked
        ? 0
        : 1
      : Math.max(0, Number(product.stock) || 0);
  const locked = Boolean(product?.locked) || stock <= 0;

  return {
    ...product,
    stock,
    locked,
  };
}

const DEFAULT_PRODUCT_IMAGE = "assets/keychain-mockup.svg";
const DEFAULT_FEEDBACK_IMAGE = "assets/keychain-mockup.svg";
const ADMIN_ASSET_PREFIX = "../";

function normalizeAssetUrl(url) {
  if (url === "assets/keychain-mockup.png") {
    return DEFAULT_PRODUCT_IMAGE;
  }
  return url;
}

function toAdminAssetPath(url) {
  url = normalizeAssetUrl(url);
  if (!url) {
    return `${ADMIN_ASSET_PREFIX}${DEFAULT_PRODUCT_IMAGE}`;
  }
  if (
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/") ||
    url.startsWith("../")
  ) {
    return url;
  }
  if (url.startsWith("assets/")) {
    return `${ADMIN_ASSET_PREFIX}${url}`;
  }
  return url;
}

const defaultTestimonials = [
  {
    text: "Keychain cầm rất chắc tay, màu đen trắng đúng style tối giản mình thích. Shop gói hàng kỹ, giao trong Hồ Chí Minh nhanh.",
    name: "Minh Anh",
    role: "Khách hàng Series 1",
    initials: "MA",
    imageUrl: DEFAULT_FEEDBACK_IMAGE,
  },
  {
    text: "Mình đặt combo làm quà sinh nhật, từng chiếc đều có vân riêng nên nhìn handmade thật chứ không bị đại trà.",
    name: "Gia Hân",
    role: "Khách hàng Combo",
    initials: "GH",
    imageUrl: DEFAULT_FEEDBACK_IMAGE,
  },
  {
    text: "Logo và packaging đẹp, keychain lên balo rất nổi. Mình thích nhất phần khoen đen nhìn đồng bộ với concept.",
    name: "Tuấn Kiệt",
    role: "Khách hàng Series 2",
    initials: "TK",
    imageUrl: DEFAULT_FEEDBACK_IMAGE,
  },
];

const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const loginScreen = document.querySelector("#login-screen");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const saveChangesBtn = document.querySelector("#save-changes-btn");
const saveChangesStatus = document.querySelector("#save-changes-status");
const logoutBtn = document.querySelector("#logout-btn");
const adminTitle = document.querySelector(".admin-topbar h1");
const adminViews = document.querySelectorAll(".admin-view");
const adminNavLinks = document.querySelectorAll(".sidebar nav a");

const categoryForm = document.querySelector("#category-form");
const productForm = document.querySelector("#product-form");
const feedbackForm = document.querySelector("#feedback-form");
const categoryList = document.querySelector("#category-admin-list");
const productList = document.querySelector("#product-admin-list");
const feedbackList = document.querySelector("#feedback-admin-list");
const productCategorySelect = document.querySelector("#product-category");
const ordersList = document.querySelector("#orders-admin-list");
const clearOrdersBtn = document.querySelector("#clear-orders-btn");
const revenueChartEl = document.querySelector("#revenue-chart");
const revenueChartSummary = document.querySelector("#revenue-chart-summary");
const revenueChartRange = document.querySelector("#revenue-chart-range");
const REVENUE_CHART_RANGE_KEY = "kizztagRevenueChartRange";
const ORDER_TIMEZONE = "Asia/Ho_Chi_Minh";
const productImageFile = document.querySelector("#product-image-file");
const productImagePreview = document.querySelector("#product-image-preview");
const feedbackImageFile = document.querySelector("#feedback-image-file");
const feedbackImagePreview = document.querySelector("#feedback-image-preview");
let adminAuthenticated = false;
let pendingProductImageUrl = "";
let pendingFeedbackImageUrl = "";

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  if (window.KizztagStoreSync?.isCatalogStoreKey(key)) {
    window.KizztagStoreSync.touchLocalRevision();
    window.KizztagStoreSync.broadcastCatalogChange?.();
    if (adminAuthenticated) {
      window.KizztagStoreSync.schedulePush?.(250);
    }
  }
}

function setSaveChangesStatus(message, state) {
  if (!saveChangesStatus) return;
  if (!message) {
    saveChangesStatus.hidden = true;
    saveChangesStatus.textContent = "";
    saveChangesStatus.dataset.state = "";
    return;
  }
  saveChangesStatus.hidden = false;
  saveChangesStatus.textContent = message;
  saveChangesStatus.dataset.state = state || "";
}

function money(value) {
  return moneyFormatter.format(value).replace(/\s₫/, "đ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value) {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "product"}-${Date.now()}`;
}

function getFeedbackImage(item) {
  return normalizeAssetUrl(item?.imageUrl) || DEFAULT_FEEDBACK_IMAGE;
}

function applyAdminProductThumb(element, product) {
  if (!element || !product) return;

  const imageUrl = toAdminAssetPath(product.imageUrl || DEFAULT_PRODUCT_IMAGE);
  element.style.backgroundImage = `url(${JSON.stringify(imageUrl)})`;
  element.style.backgroundRepeat = "no-repeat";

  if (product.imageUrl) {
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
    return;
  }

  element.style.backgroundSize = "190%";
  element.style.backgroundPosition = product.imagePosition || "50% 50%";
}

function showImagePreview(container, url) {
  if (!container) return;
  if (!url) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  container.hidden = false;
  container.innerHTML = `<img src="${url}" alt="Xem trước ảnh" />`;
}

function compressImageFile(file, maxSize = 900) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("File không phải ảnh hợp lệ."));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function pickImageFromInput(fileInput) {
  const file = fileInput?.files?.[0];
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    alert("Vui lòng chọn file ảnh (JPG, PNG, GIF, WebP).");
    fileInput.value = "";
    return "";
  }
  try {
    return await compressImageFile(file);
  } catch (error) {
    alert(error.message || "Không xử lý được ảnh.");
    fileInput.value = "";
    return "";
  }
}

function moveCategory(categories, index, direction) {
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= categories.length) {
    return categories;
  }
  const next = [...categories];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function secureCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    if (raw === "1") {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isLoggedIn() {
  const session = readSession();
  if (!session?.token || !session?.expiresAt) {
    adminAuthenticated = false;
    return false;
  }
  if (Date.now() > session.expiresAt) {
    setLoggedIn(false);
    return false;
  }
  adminAuthenticated = true;
  return true;
}

function setLoggedIn(value) {
  adminAuthenticated = value;
  if (!value) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: crypto.randomUUID(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    })
  );
}

function isLockedOut() {
  if (!loginLockoutUntil) return false;
  if (Date.now() < loginLockoutUntil) return true;
  loginLockoutUntil = 0;
  loginFailAttempts = 0;
  return false;
}

function getLockoutRemainingMs() {
  if (!loginLockoutUntil) return 0;
  return Math.max(0, loginLockoutUntil - Date.now());
}

function recordFailedLogin() {
  loginFailAttempts += 1;
  if (loginFailAttempts >= MAX_LOGIN_ATTEMPTS) {
    loginLockoutUntil = Date.now() + LOCKOUT_MS;
  }
}

function clearFailedLogin() {
  loginFailAttempts = 0;
  loginLockoutUntil = 0;
}

function formatLockoutMessage(ms) {
  const minutes = Math.ceil(ms / 60000);
  return `Đã nhập sai quá nhiều lần. Thử lại sau ${minutes} phút.`;
}

function setDashboardVisible(visible) {
  const showDashboard = Boolean(visible);
  loginScreen.hidden = showDashboard;
  dashboard.hidden = !showDashboard;

  if (showDashboard) {
    if (!isLoggedIn()) {
      setDashboardVisible(false);
      return;
    }

    renderDashboard();
    renderAdminRoute();
    window.KizztagStoreSync?.refreshSyncStatus();

    void (async () => {
      const changed = await window.KizztagStoreSync?.pullFromRemote({
        applyOrders: true,
      });
      if (changed) {
        renderDashboard();
        renderAdminRoute();
      }
      window.KizztagStoreSync?.refreshSyncStatus();
    })();
  }
}

function requireAdminAccess() {
  if (isLoggedIn()) return true;
  setLoggedIn(false);
  setDashboardVisible(false);
  return false;
}

function getCurrentViewId() {
  const viewId = window.location.hash.replace("#", "") || "overview";
  return ["overview", "categories", "products", "feedback"].includes(viewId)
    ? viewId
    : "overview";
}

function renderAdminRoute() {
  if (!isLoggedIn()) {
    adminViews.forEach((view) => {
      view.hidden = true;
    });
    return;
  }

  const viewId = getCurrentViewId();
  adminViews.forEach((view) => {
    view.hidden = view.id !== viewId;
  });
  adminNavLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${viewId}`);
  });

  const activeView = document.querySelector(`#${viewId}`);
  if (activeView && adminTitle) {
    adminTitle.textContent = activeView.dataset.title || "Quản lý KIZZTAG";
  }
}

function getProducts() {
  return readStore("kizztagProducts", defaultProducts).map(normalizeProduct);
}

function saveProducts(products) {
  writeStore("kizztagProducts", products.map(normalizeProduct));
}

function getCategories() {
  const stored = readStore("kizztagCategories", null);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  const products = getProducts();
  const fromProducts = [
    ...new Set(products.map((product) => product.category).filter(Boolean)),
  ];
  const categories =
    fromProducts.length > 0 ? fromProducts : defaultCategories;
  writeStore("kizztagCategories", categories);
  return categories;
}

function getTestimonials() {
  return readStore("kizztagTestimonials", defaultTestimonials);
}

function getOrders() {
  return readStore("kizztagOrders", []);
}

function renderStats(products, orders) {
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  document.querySelector("#revenue-stat").textContent = money(revenue);
  document.querySelector("#orders-stat").textContent = orders.length;
  document.querySelector("#products-stat").textContent = products.length;
  document.querySelector("#locked-stat").textContent = products.filter(
    (product) => product.locked
  ).length;
}

function getOrderDateKey(isoString) {
  if (!isoString) return null;

  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: ORDER_TIMEZONE }).format(
      new Date(isoString)
    );
  } catch {
    return null;
  }
}

function formatChartDayLabel(dateKey) {
  const parts = String(dateKey).split("-");
  if (parts.length !== 3) return dateKey;
  return `${parts[2]}/${parts[1]}`;
}

function getChartDayCount() {
  const stored = Number.parseInt(
    localStorage.getItem(REVENUE_CHART_RANGE_KEY) || "14",
    10
  );
  return [7, 14, 30].includes(stored) ? stored : 14;
}

function buildDailyRevenueSeries(orders, dayCount) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ORDER_TIMEZONE,
  });
  const now = new Date();
  const series = [];

  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * 86400000);
    const dateKey = formatter.format(date);
    series.push({
      dateKey,
      label: formatChartDayLabel(dateKey),
      revenue: 0,
      orderCount: 0,
    });
  }

  const dayMap = new Map(series.map((day) => [day.dateKey, day]));

  orders.forEach((order) => {
    const dateKey = getOrderDateKey(order.createdAt);
    if (!dateKey || !dayMap.has(dateKey)) return;

    const day = dayMap.get(dateKey);
    day.revenue += Number(order.total || 0);
    day.orderCount += 1;
  });

  return series;
}

function renderRevenueChart(orders) {
  if (!revenueChartEl) return;

  const dayCount = getChartDayCount();
  if (revenueChartRange) {
    revenueChartRange.value = String(dayCount);
  }

  const series = buildDailyRevenueSeries(orders, dayCount);
  const maxRevenue = Math.max(...series.map((day) => day.revenue), 1);
  const totalPeriod = series.reduce((sum, day) => sum + day.revenue, 0);
  const totalOrders = series.reduce((sum, day) => sum + day.orderCount, 0);
  const activeDays = series.filter((day) => day.revenue > 0).length;
  const avgDaily = activeDays ? totalPeriod / activeDays : 0;

  if (revenueChartSummary) {
    revenueChartSummary.textContent = `${dayCount} ngày: ${money(totalPeriod)} · ${totalOrders} đơn · TB ${activeDays ? money(avgDaily) : "0đ"}/ngày có doanh thu`;
  }

  if (series.every((day) => day.revenue === 0)) {
    revenueChartEl.innerHTML =
      '<p class="chart-empty">Chưa có doanh thu trong khoảng thời gian này.</p>';
    return;
  }

  revenueChartEl.innerHTML = `
    <div class="revenue-chart-bars">
      ${series
        .map((day) => {
          const height =
            day.revenue > 0 ? Math.max(10, (day.revenue / maxRevenue) * 100) : 0;
          const tooltip = `${day.label}: ${money(day.revenue)} · ${day.orderCount} đơn`;

          return `
            <div class="revenue-bar${day.revenue === 0 ? " is-empty" : ""}" title="${escapeHtml(tooltip)}">
              <span class="revenue-bar-value">${day.revenue > 0 ? money(day.revenue) : ""}</span>
              <span class="revenue-bar-track">
                <span class="revenue-bar-fill" style="height:${height}%"></span>
              </span>
              <span class="revenue-bar-label">${day.label}</span>
              ${
                day.orderCount > 0
                  ? `<span class="revenue-bar-orders">${day.orderCount} đơn</span>`
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderProductCategorySelect(categories) {
  if (!productCategorySelect) return;

  const currentValue = productCategorySelect.value;
  productCategorySelect.replaceChildren();

  if (categories.length === 0) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "Chưa có danh mục";
    emptyOption.disabled = true;
    emptyOption.selected = true;
    productCategorySelect.append(emptyOption);
    productCategorySelect.disabled = true;
    return;
  }

  productCategorySelect.disabled = false;
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    productCategorySelect.append(option);
  });

  if (categories.includes(currentValue)) {
    productCategorySelect.value = currentValue;
  } else {
    productCategorySelect.value = categories[0];
  }
}

function renderCategories(categories, products) {
  if (!categoryList) return;

  if (categories.length === 0) {
    categoryList.innerHTML =
      '<div class="admin-row"><p>Chưa có danh mục. Thêm danh mục để hiển thị tab lọc trên web.</p></div>';
    return;
  }

  categoryList.innerHTML = categories
    .map((category, index) => {
      const productCount = products.filter(
        (product) => product.category === category
      ).length;

      return `
        <article class="admin-row">
          <div>
            <h3>${escapeHtml(category)}</h3>
            <p>${productCount} sản phẩm · Thứ tự ${index + 1}</p>
          </div>
          <div class="row-actions category-actions">
            <div class="order-buttons">
              <button type="button" data-category-move="up" data-category-index="${index}" ${
                index === 0 ? "disabled" : ""
              } aria-label="Lên">↑</button>
              <button type="button" data-category-move="down" data-category-index="${index}" ${
                index === categories.length - 1 ? "disabled" : ""
              } aria-label="Xuống">↓</button>
            </div>
            <button class="danger" type="button" data-category-delete="${index}">
              Xóa
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderProducts(products) {
  if (!productList) return;

  productList.innerHTML = products
    .map(
      (product) => `
        <article class="admin-row has-thumb">
          <div class="admin-thumb" data-admin-product-id="${product.id}" role="img" aria-label="${escapeHtml(product.name)}"></div>
          <div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.category)} · ${money(product.price)}</p>
            <label class="admin-stock-field">
              SL còn
              <input
                type="number"
                min="0"
                value="${product.stock}"
                data-product-stock="${product.id}"
              />
            </label>
            <span class="status-pill${product.locked ? " locked" : ""}">
              ${product.locked ? "Hết hàng" : "Đang bán"}
            </span>
          </div>
          <div class="row-actions">
            <button type="button" data-product-action="image" data-id="${product.id}">
              Đổi ảnh
            </button>
            <input type="file" accept="image/*" hidden data-product-image-input="${product.id}" />
            <button type="button" data-product-action="toggle" data-id="${product.id}">
              ${product.locked ? "Mở bán" : "Khóa"}
            </button>
            <button class="danger" type="button" data-product-action="delete" data-id="${product.id}">
              Xóa
            </button>
          </div>
        </article>
      `
    )
    .join("");

  products.forEach((product) => {
    const thumb = productList.querySelector(
      `[data-admin-product-id="${product.id}"]`
    );
    applyAdminProductThumb(thumb, product);
  });
}

function renderFeedback(testimonials) {
  if (!feedbackList) return;

  feedbackList.innerHTML = testimonials
    .map(
      (item, index) => `
        <article class="admin-row has-thumb">
          <div class="admin-thumb">
            <img src="${toAdminAssetPath(getFeedbackImage(item))}" alt="${escapeHtml(item.name)}" />
          </div>
          <div>
            <h3>${escapeHtml(item.name)} (${escapeHtml(item.initials)})</h3>
            <p>${escapeHtml(item.role)}</p>
            <p>${escapeHtml(item.text)}</p>
          </div>
          <div class="row-actions">
            <button type="button" data-feedback-action="image" data-feedback-index="${index}">
              Đổi ảnh
            </button>
            <input type="file" accept="image/*" hidden data-feedback-image-input="${index}" />
            <button class="danger" type="button" data-feedback-delete="${index}">
              Xóa
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderOrders(orders) {
  if (orders.length === 0) {
    ordersList.innerHTML = '<div class="admin-row"><p>Chưa có đơn hàng.</p></div>';
    return;
  }

  ordersList.innerHTML = orders
    .map((order) => {
      const itemText = order.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join(", ");
      const addressText =
        order.address?.full ||
        [order.address?.street, order.address?.ward, order.address?.district, order.address?.city]
          .filter(Boolean)
          .join(", ");
      const shippingText =
        Number(order.shippingFee) > 0
          ? money(order.shippingFee)
          : "Miễn phí (HCM)";
      return `
        <article class="admin-row">
          <div>
            <h3>${escapeHtml(order.id)} · ${money(order.total)}</h3>
            <p>${escapeHtml(order.customerName)} · ${escapeHtml(order.customerPhone)}</p>
            <p>${escapeHtml(order.customerEmail || "—")}</p>
            <p>${escapeHtml(addressText || "—")}</p>
            <p>Ship: ${escapeHtml(shippingText)} · ${escapeHtml(itemText)}</p>
            <p>${new Date(order.createdAt).toLocaleString("vi-VN")}</p>
          </div>
          <div class="row-actions">
            <select data-order-status="${order.id}">
              ${["Mới", "Đang xử lý", "Đã giao", "Đã hủy"]
                .map(
                  (status) =>
                    `<option value="${status}" ${
                      order.status === status ? "selected" : ""
                    }>${status}</option>`
                )
                .join("")}
            </select>
            <button class="danger" type="button" data-order-delete="${order.id}">
              Xóa
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDashboard() {
  if (!requireAdminAccess()) return;

  const products = getProducts();
  const categories = getCategories();
  const testimonials = getTestimonials();
  const orders = getOrders();

  renderStats(products, orders);
  renderRevenueChart(orders);
  renderCategories(categories, products);
  renderProductCategorySelect(categories);
  renderProducts(products);
  renderFeedback(testimonials);
  renderOrders(orders);
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isLockedOut()) {
    loginError.textContent = formatLockoutMessage(getLockoutRemainingMs());
    loginError.hidden = false;
    return;
  }

  const username = document.querySelector("#username").value.trim();
  const password = document.querySelector("#password").value;

  if (username !== ADMIN_USER) {
    recordFailedLogin();
    loginError.textContent = "Sai tài khoản hoặc mật khẩu.";
    loginError.hidden = false;
    return;
  }

  const passwordHash = await sha256Hex(password);
  if (!secureCompare(passwordHash, ADMIN_PASS_HASH)) {
    recordFailedLogin();
    loginError.textContent = "Sai tài khoản hoặc mật khẩu.";
    loginError.hidden = false;
    return;
  }

  clearFailedLogin();
  setLoggedIn(true);
  loginError.hidden = true;
  loginForm.reset();
  setDashboardVisible(true);
});

if (saveChangesBtn) {
  saveChangesBtn.addEventListener("click", async () => {
    if (!requireAdminAccess()) return;

    saveChangesBtn.disabled = true;
    setSaveChangesStatus("Đang lưu…", "pending");

    window.KizztagStoreSync?.broadcastCatalogChange?.();

    const result = (await window.KizztagStoreSync?.flushPushNow?.()) || {
      ok: true,
      message: "Đã lưu trên trình duyệt. Mở index.html (cùng trang GitHub) và F5.",
    };

    setSaveChangesStatus(result.message, result.ok ? "ok" : "error");
    saveChangesBtn.disabled = false;

    if (result.ok) {
      window.setTimeout(() => setSaveChangesStatus("", ""), 6000);
    }
  });
}

logoutBtn.addEventListener("click", () => {
  setLoggedIn(false);
  setDashboardVisible(false);
});

if (categoryForm) {
categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#category-name").value.trim();
  if (!name) return;

  const categories = getCategories();
  if (categories.some((category) => category.toLowerCase() === name.toLowerCase())) {
    alert("Danh mục này đã tồn tại.");
    return;
  }

  writeStore("kizztagCategories", [...categories, name]);
  categoryForm.reset();
  renderDashboard();
});
}

if (categoryList) {
categoryList.addEventListener("click", (event) => {
  const moveButton = event.target.closest("[data-category-move]");
  if (moveButton) {
    const categories = getCategories();
    const index = Number(moveButton.dataset.categoryIndex);
    const nextCategories = moveCategory(
      categories,
      index,
      moveButton.dataset.categoryMove
    );
    writeStore("kizztagCategories", nextCategories);
    renderDashboard();
    return;
  }

  const deleteButton = event.target.closest("[data-category-delete]");
  if (!deleteButton) return;

  const categories = getCategories();
  const categoryName = categories[Number(deleteButton.dataset.categoryDelete)];
  if (!categoryName) return;
  const products = getProducts();
  const inUse = products.some((product) => product.category === categoryName);

  if (inUse) {
    alert("Không thể xóa danh mục đang có sản phẩm. Hãy đổi danh mục sản phẩm trước.");
    return;
  }

  if (!confirm(`Xóa danh mục "${categoryName}"?`)) return;

  writeStore(
    "kizztagCategories",
    categories.filter((category) => category !== categoryName)
  );
  renderDashboard();
});
}

if (productImageFile) {
  productImageFile.addEventListener("change", async () => {
    pendingProductImageUrl = await pickImageFromInput(productImageFile);
    showImagePreview(productImagePreview, pendingProductImageUrl);
  });
}

if (feedbackImageFile) {
  feedbackImageFile.addEventListener("change", async () => {
    pendingFeedbackImageUrl = await pickImageFromInput(feedbackImageFile);
    showImagePreview(feedbackImagePreview, pendingFeedbackImageUrl);
  });
}

if (productForm) {
productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const categories = getCategories();
  if (categories.length === 0) {
    alert("Hãy thêm ít nhất một danh mục trước khi thêm sản phẩm.");
    return;
  }

  const products = getProducts();
  const name = document.querySelector("#product-name").value.trim();
  const stock = Math.max(
    0,
    Number(document.querySelector("#product-stock").value) || 0
  );
  const manualLocked = document.querySelector("#product-locked").checked;
  const newProduct = normalizeProduct({
    id: slugify(name),
    name,
    category: document.querySelector("#product-category").value.trim(),
    price: Number(document.querySelector("#product-price").value),
    imagePosition: document.querySelector("#product-position").value.trim(),
    stock,
    locked: manualLocked,
  });

  if (pendingProductImageUrl) {
    newProduct.imageUrl = pendingProductImageUrl;
  }

  products.unshift(newProduct);

  saveProducts(products);
  productForm.reset();
  document.querySelector("#product-position").value = "50% 50%";
  document.querySelector("#product-stock").value = "1";
  pendingProductImageUrl = "";
  showImagePreview(productImagePreview, "");
  if (productImageFile) productImageFile.value = "";
  renderDashboard();
});
}

if (productList) {
productList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product-action]");
  if (!button) return;

  const products = getProducts();
  const id = button.dataset.id;

  if (button.dataset.productAction === "image") {
    const fileInput = productList.querySelector(
      `[data-product-image-input="${id}"]`
    );
    fileInput?.click();
    return;
  }

  const nextProducts =
    button.dataset.productAction === "delete"
      ? products.filter((product) => product.id !== id)
      : products.map((product) =>
          product.id === id ? { ...product, locked: !product.locked } : product
        );

  saveProducts(nextProducts);
  renderDashboard();
});

productList.addEventListener("change", async (event) => {
  const stockInput = event.target.closest("[data-product-stock]");
  if (stockInput) {
    const id = stockInput.dataset.productStock;
    const stock = Math.max(0, Number(stockInput.value) || 0);
    const products = getProducts().map((product) =>
      product.id === id
        ? normalizeProduct({
            ...product,
            stock,
            locked: stock <= 0,
          })
        : product
    );
    saveProducts(products);
    renderDashboard();
    return;
  }

  const fileInput = event.target.closest("[data-product-image-input]");
  if (!fileInput) return;

  const imageUrl = await pickImageFromInput(fileInput);
  if (!imageUrl) return;

  const products = getProducts().map((product) =>
    product.id === fileInput.dataset.productImageInput
      ? { ...product, imageUrl }
      : product
  );
  saveProducts(products);
  renderDashboard();
});
}

if (feedbackForm) {
feedbackForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const testimonials = getTestimonials();

  testimonials.unshift({
    name: document.querySelector("#feedback-name").value.trim(),
    role: document.querySelector("#feedback-role").value.trim(),
    initials: document.querySelector("#feedback-initials").value.trim(),
    text: document.querySelector("#feedback-text").value.trim(),
    imageUrl: pendingFeedbackImageUrl || DEFAULT_FEEDBACK_IMAGE,
  });

  writeStore("kizztagTestimonials", testimonials);
  feedbackForm.reset();
  pendingFeedbackImageUrl = "";
  showImagePreview(feedbackImagePreview, "");
  if (feedbackImageFile) feedbackImageFile.value = "";
  renderDashboard();
});
}

if (feedbackList) {
feedbackList.addEventListener("click", (event) => {
  const imageButton = event.target.closest("[data-feedback-action='image']");
  if (imageButton) {
    const fileInput = feedbackList.querySelector(
      `[data-feedback-image-input="${imageButton.dataset.feedbackIndex}"]`
    );
    fileInput?.click();
    return;
  }

  const button = event.target.closest("[data-feedback-delete]");
  if (!button) return;

  const testimonials = getTestimonials();
  testimonials.splice(Number(button.dataset.feedbackDelete), 1);
  writeStore("kizztagTestimonials", testimonials);
  renderDashboard();
});

feedbackList.addEventListener("change", async (event) => {
  const fileInput = event.target.closest("[data-feedback-image-input]");
  if (!fileInput) return;

  const imageUrl = await pickImageFromInput(fileInput);
  if (!imageUrl) return;

  const index = Number(fileInput.dataset.feedbackImageInput);
  const testimonials = getTestimonials().map((item, itemIndex) =>
    itemIndex === index ? { ...item, imageUrl } : item
  );
  writeStore("kizztagTestimonials", testimonials);
  renderDashboard();
});
}

if (ordersList) {
ordersList.addEventListener("change", (event) => {
  const select = event.target.closest("[data-order-status]");
  if (!select) return;

  const orders = getOrders().map((order) =>
    order.id === select.dataset.orderStatus
      ? { ...order, status: select.value }
      : order
  );
  writeStore("kizztagOrders", orders);
  renderDashboard();
});

ordersList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-order-delete]");
  if (!button) return;

  writeStore(
    "kizztagOrders",
    getOrders().filter((order) => order.id !== button.dataset.orderDelete)
  );
  renderDashboard();
});
}

if (clearOrdersBtn) {
clearOrdersBtn.addEventListener("click", () => {
  if (!confirm("Xóa toàn bộ đơn hàng hiện có?")) return;
  writeStore("kizztagOrders", []);
  renderDashboard();
});
}

if (revenueChartRange) {
  revenueChartRange.addEventListener("change", () => {
    const dayCount = Number.parseInt(revenueChartRange.value, 10);
    if (![7, 14, 30].includes(dayCount)) return;
    localStorage.setItem(REVENUE_CHART_RANGE_KEY, String(dayCount));
    renderRevenueChart(getOrders());
  });
}

try {
  localStorage.removeItem("kizztagAdminLoginRequired");
  localStorage.removeItem("kizztagAdminLockout");
} catch {
  // Ignore storage errors.
}

window.addEventListener("hashchange", () => {
  if (!isLoggedIn()) {
    setDashboardVisible(false);
    return;
  }
  renderAdminRoute();
});

window.renderDashboard = renderDashboard;

if (isLoggedIn()) {
  setDashboardVisible(true);
}
