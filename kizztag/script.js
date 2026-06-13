const PAGE_LEAVE_KEY = "kizztagPageLeave";
const PAGE_TRANSITION_MS = 180;
const SHIPPING_FEE_OUTSIDE_HCM = 25000;

function isInternalPageLink(link) {
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) {
    return false;
  }

  if (link.target === "_blank" || link.hasAttribute("download")) {
    return false;
  }

  try {
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) {
      return false;
    }
    return url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  } catch {
    return false;
  }
}

function initPageTransition() {
  if (sessionStorage.getItem(PAGE_LEAVE_KEY)) {
    sessionStorage.removeItem(PAGE_LEAVE_KEY);
    document.body.classList.add("page-enter");
    window.requestAnimationFrame(() => {
      document.body.classList.add("page-enter-active");
    });
  } else {
    document.body.classList.add("page-ready");
  }

  document.querySelectorAll("a[href]").forEach((link) => {
    if (!isInternalPageLink(link)) return;

    link.addEventListener("click", (event) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.defaultPrevented
      ) {
        return;
      }

      const targetUrl = new URL(link.href, window.location.href);
      if (
        targetUrl.pathname === window.location.pathname &&
        targetUrl.search === window.location.search
      ) {
        return;
      }

      event.preventDefault();
      document.body.classList.add("page-leave");
      sessionStorage.setItem(PAGE_LEAVE_KEY, "1");

      window.setTimeout(() => {
        window.location.href = link.href;
      }, PAGE_TRANSITION_MS);
    });
  });
}

initPageTransition();

function getHeaderOffset() {
  return (
    Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--header-offset"
      ),
      10
    ) || 92
  );
}

function initFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");
  if (!faqItems.length) return;

  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (!item.open) return;

      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          const top =
            item.getBoundingClientRect().top +
            window.scrollY -
            getHeaderOffset() -
            16;

          window.scrollTo({
            top: Math.max(0, top),
            behavior: "smooth",
          });
        }, 120);
      });
    });
  });
}

initFaqAccordion();

function initHeroLogoSpin() {
  const spin = document.querySelector("#hero-logo-spin");
  if (!spin) return;

  const visual = spin.querySelector(".hero-logo-rotate") || spin;
  let rotation = 0;
  let dragging = false;
  let startAngle = 0;
  let startRotation = 0;

  const getAngle = (clientX, clientY) => {
    const rect = spin.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
  };

  const applyRotation = () => {
    visual.style.transform = `rotate(${rotation}deg)`;
  };

  spin.addEventListener("pointerdown", (event) => {
    dragging = true;
    spin.setPointerCapture(event.pointerId);
    startAngle = getAngle(event.clientX, event.clientY);
    startRotation = rotation;
  });

  spin.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const angle = getAngle(event.clientX, event.clientY);
    rotation = startRotation - (angle - startAngle);
    applyRotation();
  });

  const endDrag = (event) => {
    if (!dragging) return;
    dragging = false;
    try {
      spin.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore if capture was already released.
    }
  };

  spin.addEventListener("pointerup", endDrag);
  spin.addEventListener("pointercancel", endDrag);
}

initHeroLogoSpin();

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

const defaultCategories = ["Series 1", "Series 2", "Combo"];

const DEFAULT_PRODUCT_IMAGE = "assets/keychain-mockup.svg";
const DEFAULT_FEEDBACK_IMAGE = "assets/keychain-mockup.svg";

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
}

function normalizeAssetUrl(url) {
  if (url === "assets/keychain-mockup.png") {
    return DEFAULT_PRODUCT_IMAGE;
  }
  return url;
}

let products = readStore("kizztagProducts", defaultProducts);
let testimonials = readStore("kizztagTestimonials", defaultTestimonials);

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getCategories() {
  syncProductsFromStore();

  const stored = readStore("kizztagCategories", null);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  const fromProducts = [
    ...new Set(products.map((product) => product.category).filter(Boolean)),
  ];
  const categories =
    fromProducts.length > 0 ? fromProducts : defaultCategories;
  writeStore("kizztagCategories", categories);
  return categories;
}

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

function getProductStock(product) {
  return Math.max(0, Number(product?.stock) || 0);
}

function isProductSoldOut(product) {
  if (!product) return true;
  return Boolean(product.locked) || getProductStock(product) <= 0;
}

function saveProducts(nextProducts) {
  products = nextProducts.map(normalizeProduct);
  writeStore("kizztagProducts", products);
}

function syncProductsFromStore() {
  const stored = readStore("kizztagProducts", defaultProducts);
  products = stored.map(normalizeProduct);
}

function syncTestimonialsFromStore() {
  testimonials = readStore("kizztagTestimonials", defaultTestimonials);
}

function getFeedbackImage(item) {
  return normalizeAssetUrl(item?.imageUrl) || DEFAULT_FEEDBACK_IMAGE;
}

function applyProductMedia(element, product) {
  if (!element || !product) return;

  if (product.imageUrl) {
    element.style.backgroundImage = `url(${JSON.stringify(normalizeAssetUrl(product.imageUrl))})`;
    element.style.backgroundPosition = "center";
    element.style.backgroundSize = "cover";
    element.classList.add("has-custom-image");
    return;
  }

  element.style.backgroundImage = `url(${JSON.stringify(DEFAULT_PRODUCT_IMAGE)})`;
  element.style.backgroundPosition = product.imagePosition || "50% 50%";
  element.style.backgroundSize = "";
  element.classList.remove("has-custom-image");
}

const formatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

let activeFilter = "all";
let cart = JSON.parse(localStorage.getItem("kizztagCart") || "{}");
let testimonialIndex = 0;
let testimonialTimer;
const outOfStockMessage = "Sản phẩm này đã hết hàng.";
const maxStockMessage = "Số lượng trong giỏ đã đạt tối đa còn lại.";

const productGrid = document.querySelector("#product-grid");
const filterTabsContainer = document.querySelector("#filter-tabs");
let filterTabs = [];
const cartItems = document.querySelector("#cart-items");
const cartCount = document.querySelector("#cart-count");
const cartTotal = document.querySelector("#cart-total");
const checkoutBtn = document.querySelector("#checkout-btn");
const checkoutModal = document.querySelector("#checkout-modal");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutFormView = document.querySelector("#checkout-form-view");
const checkoutSuccessView = document.querySelector("#checkout-success-view");
const checkoutSuccessClose = document.querySelector("#checkout-success-close");
const checkoutSuccessMessage = document.querySelector("#checkout-success-message");
const checkoutSubtotalEl = document.querySelector("#checkout-subtotal");
const checkoutShippingEl = document.querySelector("#checkout-shipping");
const checkoutGrandTotalEl = document.querySelector("#checkout-grand-total");
const checkoutCityInput = document.querySelector('[name="addressCity"]');
const checkoutQrImg = document.querySelector("#checkout-qr-img");
const checkoutOrderIdEl = document.querySelector("#checkout-order-id");
const checkoutQrAmountEl = document.querySelector("#checkout-qr-amount");
let currentOrderId = null;
let checkoutQrLastSrc = "";

const testimonialText = document.querySelector("#testimonial-text");
const testimonialName = document.querySelector("#testimonial-name");
const testimonialRole = document.querySelector("#testimonial-role");
const testimonialAvatar = document.querySelector("#testimonial-avatar");
const testimonialDots = document.querySelector("#testimonial-dots");
const testimonialSlide = document.querySelector("#testimonial-slide");
const testimonialImageA = document.querySelector("#testimonial-image-a");
const testimonialImageB = document.querySelector("#testimonial-image-b");
const TESTIMONIAL_TRANSITION_MS = 480;
let testimonialAnimating = false;
let activeTestimonialPhoto = "a";
const prevButton = document.querySelector(".arrow-prev");
const nextButton = document.querySelector(".arrow-next");
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

function money(value) {
  return formatter.format(value).replace(/\s₫/, "đ");
}

function normalizeLocationText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isHoChiMinhCity(city) {
  const normalized = normalizeLocationText(city);
  if (!normalized) return false;

  if (/[-–,/|;]/.test(normalized)) return false;

  const otherCityMarkers = [
    "ha noi",
    "hanoi",
    "hai phong",
    "da nang",
    "danang",
    "can tho",
    "hue",
    "nha trang",
    "binh duong",
    "dong nai",
    "bac ninh",
    "vung tau",
    "quang ninh",
  ];
  if (otherCityMarkers.some((marker) => normalized.includes(marker))) {
    return false;
  }

  const freeShippingPatterns = [
    /^sai gon$/,
    /^ho chi minh$/,
    /^tp sai gon$/,
    /^tp ho chi minh$/,
    /^thanh pho sai gon$/,
    /^thanh pho ho chi minh$/,
  ];

  return freeShippingPatterns.some((pattern) => pattern.test(normalized));
}

function getCartSubtotal() {
  return getCartEntries().reduce((sum, [id, qty]) => {
    const product = products.find((item) => item.id === id);
    return product ? sum + product.price * qty : sum;
  }, 0);
}

function getShippingFee(city) {
  if (!normalizeLocationText(city)) return null;
  return isHoChiMinhCity(city) ? 0 : SHIPPING_FEE_OUTSIDE_HCM;
}

function formatShippingFee(fee) {
  if (fee === null) return "Nhập thành phố";
  return fee === 0 ? "Miễn phí" : money(fee);
}

function updateCheckoutTotals() {
  if (!checkoutSubtotalEl || !checkoutShippingEl || !checkoutGrandTotalEl) {
    return;
  }

  const subtotal = getCartSubtotal();
  const shippingFee = getShippingFee(checkoutCityInput?.value || "");
  const grandTotal = subtotal + (shippingFee ?? 0);

  checkoutSubtotalEl.textContent = money(subtotal);
  checkoutShippingEl.textContent = formatShippingFee(shippingFee);
  checkoutGrandTotalEl.textContent = money(grandTotal);

  updateCheckoutQr(grandTotal);
}

function ensureCurrentOrderId() {
  if (currentOrderId) return currentOrderId;
  currentOrderId = `KZT-${Date.now()}`;
  return currentOrderId;
}

function updateCheckoutQr(grandTotal) {
  const orderId = ensureCurrentOrderId();

  if (checkoutOrderIdEl) {
    checkoutOrderIdEl.textContent = orderId;
  }

  if (checkoutQrAmountEl) {
    checkoutQrAmountEl.textContent = money(Math.max(0, grandTotal || 0));
  }

  if (!checkoutQrImg) return;

  const amount = Math.max(0, Math.floor(grandTotal || 0));
  const bankCode = "TCB";
  const accountNumber = "12324888888";
  const baseUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png`;

  const params = new URLSearchParams();
  if (amount > 0) {
    params.set("amount", String(amount));
  }
  params.set("addInfo", orderId);
  params.set("accountName", "PHAM THAI THIEN THANH");

  const nextQrSrc = `${baseUrl}?${params.toString()}`;
  if (checkoutQrLastSrc === nextQrSrc) {
    return;
  }

  checkoutQrLastSrc = nextQrSrc;
  checkoutQrImg.src = nextQrSrc;
}

function setCheckoutModalOpen(isOpen) {
  if (!checkoutModal) return;

  checkoutModal.hidden = !isOpen;
  checkoutModal.setAttribute("aria-hidden", String(!isOpen));
  document.body.classList.toggle("checkout-modal-open", isOpen);

  if (!isOpen) {
    currentOrderId = null;
    checkoutForm?.reset();
    checkoutFormView?.removeAttribute("hidden");
    checkoutSuccessView?.setAttribute("hidden", "");
    if (checkoutSuccessMessage) {
      checkoutSuccessMessage.textContent = "Chúc bạn ngày mới vui vẻ";
    }
    updateCheckoutTotals();
  }
}

function openCheckoutModal() {
  if (getCartEntries().length === 0) return;

  updateCheckoutTotals();
  setCheckoutModalOpen(true);
  checkoutForm?.querySelector("input")?.focus();
}

function showCheckoutSuccess() {
  checkoutFormView?.setAttribute("hidden", "");
  checkoutSuccessView?.removeAttribute("hidden");

  if (checkoutSuccessMessage) {
    checkoutSuccessMessage.textContent = "Chúc bạn ngày mới vui vẻ";
  }
}

function getEmailConfig() {
  const config = window.KIZZTAG_EMAIL || {};
  const webhookUrl = String(config.webhookUrl || "").trim();
  const secret = String(config.secret || "").trim();

  return {
    enabled: Boolean(config.enabled),
    webhookUrl,
    secret,
    isConfigured:
      Boolean(webhookUrl && secret) &&
      webhookUrl.includes("script.google.com") &&
      webhookUrl.endsWith("/exec"),
  };
}

function sendEmailViaForm(webhookUrl, bodyString) {
  return new Promise((resolve) => {
    const iframeName = `kizztag_email_${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.style.display = "none";
    iframe.setAttribute("aria-hidden", "true");

    const form = document.createElement("form");
    form.method = "POST";
    form.action = webhookUrl;
    form.target = iframeName;
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "payload";
    input.value = bodyString;
    form.appendChild(input);

    const cleanup = () => {
      form.remove();
      iframe.remove();
    };

    iframe.onload = () => {
      cleanup();
      resolve({ ok: true, viaForm: true });
    };

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();

    // Fallback timeout nếu iframe không fire onload
    window.setTimeout(() => {
      cleanup();
      resolve({ ok: true, viaForm: true });
    }, 5000);
  });
}

async function sendOrderConfirmationEmail(order) {
  const config = getEmailConfig();

  if (!config.enabled || !config.isConfigured) {
    return { sent: false, skipped: true };
  }

  const bodyString = JSON.stringify({
    secret: config.secret,
    order,
  });

  // Thử fetch trước
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      mode: "cors",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: bodyString,
    });

    let result = { ok: false };
    try {
      result = await response.json();
    } catch {
      result = { ok: response.ok };
    }

    if (result.ok) {
      return { sent: true, email: order.customerEmail };
    }
  } catch {
    // fetch thất bại → thử form fallback bên dưới
  }

  // Fallback: gửi qua hidden form (tránh CORS)
  await sendEmailViaForm(config.webhookUrl, bodyString);
  return { sent: true, email: order.customerEmail };
}

function readCheckoutForm(form) {
  const data = new FormData(form);
  const street = String(data.get("addressStreet") || "").trim();
  const ward = String(data.get("addressWard") || "").trim();
  const district = String(data.get("addressDistrict") || "").trim();
  const city = String(data.get("addressCity") || "").trim();
  const shippingFee = getShippingFee(city);
  if (shippingFee === null) {
    return null;
  }

  return {
    customerName: String(data.get("customerName") || "").trim(),
    customerPhone: String(data.get("customerPhone") || "").trim(),
    customerEmail: String(data.get("customerEmail") || "").trim(),
    address: {
      street,
      ward,
      district,
      city,
      full: [street, ward, district, city].filter(Boolean).join(", "),
    },
    shippingFee,
  };
}

function getCartEntries() {
  return Object.entries(cart).filter(([id]) =>
    products.some((product) => product.id === id)
  );
}

function saveCart() {
  localStorage.setItem("kizztagCart", JSON.stringify(cart));
}

function updateCartBadge() {
  if (!cartCount) return;

  const itemCount = getCartEntries().reduce((sum, [, qty]) => sum + qty, 0);
  cartCount.textContent = itemCount;
}

function renderProducts() {
  if (!productGrid) return;

  syncProductsFromStore();

  const visibleProducts =
    activeFilter === "all"
      ? products
      : products.filter((product) => product.category === activeFilter);

  productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
        <article class="product-card${isProductSoldOut(product) ? " is-locked" : ""}">
          <div
            class="product-media"
            data-product-id="${product.id}"
            style="--pos: ${product.imagePosition || "50% 50%"}"
            role="img"
            aria-label="${product.name}"
          >
            <span class="product-tag">${product.category}</span>
          </div>
          <div class="product-info">
            <h3>${product.name}</h3>
            <div class="product-meta">
              <strong class="product-price">${money(product.price)}</strong>
            </div>
            <div class="product-actions">
              <button class="add-cart-btn" type="button" data-id="${product.id}" ${isProductSoldOut(product) ? "disabled" : ""}>
                ${isProductSoldOut(product) ? "Hết hàng" : "Thêm vào giỏ"}
              </button>
              <div class="stock-field" aria-label="Số lượng còn ${product.name}">
                <span>SL:</span>
                <strong>${getProductStock(product)}</strong>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  visibleProducts.forEach((product) => {
    const media = productGrid.querySelector(
      `[data-product-id="${product.id}"]`
    );
    applyProductMedia(media, product);
  });

  productGrid.querySelectorAll(".add-cart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      addToCart(button.dataset.id, button);
    });
  });
}

function addToCart(id, button) {
  syncProductsFromStore();
  const product = products.find((item) => item.id === id);
  if (!product || isProductSoldOut(product)) {
    alert(outOfStockMessage);
    return;
  }

  const inCart = cart[id] || 0;
  const availableStock = getProductStock(product);

  if (inCart >= availableStock) {
    alert(maxStockMessage);
    return;
  }

  cart[id] = inCart + 1;
  saveCart();
  updateCartBadge();
  renderCart();
  renderProducts();

  if (!button) return;

  const currentText = button.textContent;
  button.textContent = "Đã thêm";
  window.setTimeout(() => {
    button.textContent = currentText;
  }, 900);
}

function removeFromCart(id) {
  delete cart[id];
  saveCart();
  updateCartBadge();
  renderCart();
}

function applyStockAfterOrder(items) {
  const stockById = new Map(items.map((item) => [item.id, item.quantity]));

  saveProducts(
    products.map((product) => {
      const orderedQty = stockById.get(product.id) || 0;
      if (!orderedQty) return product;

      const nextStock = Math.max(0, getProductStock(product) - orderedQty);
      return {
        ...product,
        stock: nextStock,
        locked: nextStock <= 0 ? true : product.locked,
      };
    })
  );
}

function createOrder(customer) {
  syncProductsFromStore();
  const cartEntries = getCartEntries();
  if (cartEntries.length === 0 || !customer) return false;

  for (const [id, qty] of cartEntries) {
    const product = products.find((item) => item.id === id);
    if (!product || isProductSoldOut(product) || qty > getProductStock(product)) {
      alert("Một số sản phẩm trong giỏ đã hết hàng. Vui lòng kiểm tra lại.");
      renderProducts();
      renderCart();
      return false;
    }
  }

  const items = cartEntries.map(([id, qty]) => {
    const product = products.find((item) => item.id === id);
    return {
      id,
      name: product.name,
      category: product.category,
      price: product.price,
      quantity: qty,
      subtotal: product.price * qty,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const shippingFee = Number(customer.shippingFee) || 0;
  const total = subtotal + shippingFee;
  const orders = readStore("kizztagOrders", []);

  orders.unshift({
    id: ensureCurrentOrderId(),
    customerName: customer.customerName,
    customerPhone: customer.customerPhone,
    customerEmail: customer.customerEmail,
    address: customer.address,
    items,
    subtotal,
    shippingFee,
    total,
    status: "Mới",
    createdAt: new Date().toISOString(),
  });

  writeStore("kizztagOrders", orders);
  applyStockAfterOrder(items);
  cart = {};
  saveCart();
  renderCart();
  renderProducts();
  return orders[0];
}

function initCheckoutModal() {
  if (!checkoutModal || !checkoutForm) return;

  checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!checkoutForm.reportValidity()) return;

    const customer = readCheckoutForm(checkoutForm);
    if (!customer) {
      checkoutCityInput?.focus();
      return;
    }

    const submitBtn = checkoutForm.querySelector(".checkout-complete-btn");
    const defaultBtnText = submitBtn?.textContent || "HOÀN THÀNH";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang xử lý...";
    }

    const order = createOrder(customer);
    if (!order) {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = defaultBtnText;
      }
      return;
    }

    try {
      await sendOrderConfirmationEmail(order);
    } catch (error) {
      console.warn("Gửi email xác nhận thất bại:", error);
    }

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = defaultBtnText;
    }

    showCheckoutSuccess();
  });

  checkoutCityInput?.addEventListener("input", updateCheckoutTotals);

  checkoutModal.querySelectorAll("[data-close-checkout]").forEach((element) => {
    element.addEventListener("click", () => setCheckoutModalOpen(false));
  });

  checkoutSuccessClose?.addEventListener("click", () => {
    setCheckoutModalOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !checkoutModal.hidden) {
      setCheckoutModalOpen(false);
    }
  });
}

function renderCart() {
  syncProductsFromStore();
  updateCartBadge();

  if (!cartItems || !cartTotal || !checkoutBtn) return;

  const cartEntries = getCartEntries();
  const itemCount = cartEntries.reduce((sum, [, qty]) => sum + qty, 0);
  const total = cartEntries.reduce((sum, [id, qty]) => {
    const product = products.find((item) => item.id === id);
    return product ? sum + product.price * qty : sum;
  }, 0);

  cartTotal.textContent = money(total);
  checkoutBtn.disabled = itemCount === 0;

  if (itemCount === 0) {
    cartItems.innerHTML =
      '<div class="empty-cart">Giỏ hàng đang trống</div>';
    return;
  }

  cartItems.innerHTML = cartEntries
    .map(([id, qty]) => {
      const product = products.find((item) => item.id === id);
      if (!product) return "";

      return `
        <article class="cart-item">
          <div class="cart-thumb" data-cart-product-id="${product.id}" style="--pos: ${product.imagePosition || "50% 50%"}" role="img" aria-label="${product.name}"></div>
          <div>
            <h3>${product.name}</h3>
            <p>${product.category} · ${money(product.price)}</p>
          </div>
          <div class="cart-controls" aria-label="Số lượng ${product.name}">
            <span class="cart-qty-label">SL: ${qty}</span>
            <button class="remove-cart-btn" type="button" data-id="${product.id}">Xóa</button>
          </div>
        </article>
      `;
    })
    .join("");

  cartEntries.forEach(([id]) => {
    const product = products.find((item) => item.id === id);
    const thumb = cartItems.querySelector(`[data-cart-product-id="${id}"]`);
    applyProductMedia(thumb, product);
  });

  cartItems.querySelectorAll(".remove-cart-btn").forEach((button) => {
    button.addEventListener("click", () => removeFromCart(button.dataset.id));
  });
}

function bindTestimonialDots() {
  if (!testimonialDots) return;

  testimonialDots.querySelectorAll(".dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      renderTestimonial(Number(dot.dataset.index));
      restartTestimonialTimer();
    });
  });
}

function renderTestimonialDots() {
  if (!testimonialDots) return;

  testimonialDots.innerHTML = testimonials
    .map(
      (_, index) =>
        `<button class="dot${index === testimonialIndex ? " active" : ""}" type="button" aria-label="Feedback ${
          index + 1
        }"${index === testimonialIndex ? ' aria-current="true"' : ""} data-index="${index}"></button>`
    )
    .join("");

  bindTestimonialDots();
}

function getActiveTestimonialPhoto() {
  return activeTestimonialPhoto === "a" ? testimonialImageA : testimonialImageB;
}

function getInactiveTestimonialPhoto() {
  return activeTestimonialPhoto === "a" ? testimonialImageB : testimonialImageA;
}

function setTestimonialPhoto(url, animate = true) {
  const activePhoto = getActiveTestimonialPhoto();
  const inactivePhoto = getInactiveTestimonialPhoto();

  if (!activePhoto || !inactivePhoto) {
    return Promise.resolve();
  }

  if (!animate) {
    activePhoto.src = url;
    activePhoto.alt = "KIZZTAG handmade keychains";
    activePhoto.classList.add("is-visible");
    inactivePhoto.classList.remove("is-visible");
    return Promise.resolve();
  }

  if (activePhoto.src === url || activePhoto.getAttribute("src") === url) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const preload = new Image();
    preload.onload = () => {
      inactivePhoto.src = url;
      inactivePhoto.alt = "KIZZTAG handmade keychains";
      inactivePhoto.classList.add("is-visible");
      activePhoto.classList.remove("is-visible");
      activeTestimonialPhoto = activeTestimonialPhoto === "a" ? "b" : "a";
      resolve();
    };
    preload.onerror = () => resolve();
    preload.src = url;
  });
}

function finishTestimonialTransition(onDone) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      testimonialSlide?.classList.remove("is-fading");
      testimonialAnimating = false;
      onDone?.();
    });
  });
}

function renderTestimonial(nextIndex = testimonialIndex, options = {}) {
  const { animate = true } = options;

  if (
    !testimonialText ||
    !testimonialName ||
    !testimonialRole ||
    !testimonialAvatar ||
    !testimonialDots
  ) {
    return;
  }

  syncTestimonialsFromStore();
  const next = (nextIndex + testimonials.length) % testimonials.length;

  if (next === testimonialIndex && animate && testimonialText.textContent) {
    return;
  }

  testimonialIndex = next;
  const item = testimonials[testimonialIndex];

  const applyContent = () => {
    testimonialText.textContent = item.text;
    testimonialName.textContent = item.name;
    testimonialRole.textContent = item.role;
    testimonialAvatar.textContent = item.initials;
    renderTestimonialDots();
  };

  const shouldAnimate =
    animate && Boolean(testimonialText.textContent) && !testimonialAnimating;

  if (!shouldAnimate) {
    applyContent();
    setTestimonialPhoto(getFeedbackImage(item), false);
    return;
  }

  testimonialAnimating = true;
  testimonialSlide?.classList.add("is-fading");

  window.setTimeout(async () => {
    applyContent();
    await setTestimonialPhoto(getFeedbackImage(item));
    finishTestimonialTransition();
  }, TESTIMONIAL_TRANSITION_MS);
}

function restartTestimonialTimer() {
  if (!testimonialText) return;

  window.clearInterval(testimonialTimer);
  testimonialTimer = window.setInterval(() => {
    renderTestimonial(testimonialIndex + 1);
  }, 4000);
}

function renderFilterTabs() {
  if (!filterTabsContainer) return;

  syncProductsFromStore();
  const categoryList = getCategories();
  const tabs = ["all", ...categoryList];

  if (activeFilter !== "all" && !categoryList.includes(activeFilter)) {
    activeFilter = "all";
  }

  filterTabsContainer.innerHTML = tabs
    .map(
      (cat) =>
        `<button class="filter-tab${activeFilter === cat ? " active" : ""}" type="button" data-filter="${escapeHtml(cat)}">
          ${cat === "all" ? "Tất cả" : escapeHtml(cat)}
        </button>`
    )
    .join("");

  filterTabs = Array.from(filterTabsContainer.querySelectorAll(".filter-tab"));
  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeFilter = tab.dataset.filter;
      renderFilterTabs();
      renderProducts();
    });
  });
}

if (prevButton) {
  prevButton.addEventListener("click", () => {
    renderTestimonial(testimonialIndex - 1);
    restartTestimonialTimer();
  });
}

if (nextButton) {
  nextButton.addEventListener("click", () => {
    renderTestimonial(testimonialIndex + 1);
    restartTestimonialTimer();
  });
}

if (checkoutBtn) {
  checkoutBtn.addEventListener("click", () => {
    if (getCartEntries().length > 0) {
      openCheckoutModal();
    }
  });
}

initCheckoutModal();

function initSiteHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const updateHeader = () => {
    const atTop = window.scrollY <= 16;
    header.classList.toggle("is-top", atTop);
    header.classList.toggle("is-scrolled", !atTop);
    document.documentElement.style.setProperty(
      "--header-offset",
      `${header.offsetHeight}px`
    );
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
  window.addEventListener("resize", updateHeader);
}

initSiteHeader();

if (menuToggle && mainNav) {
  const closeMenu = () => {
    menuToggle.classList.remove("is-open");
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Mở menu");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    menuToggle.classList.toggle("is-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Đóng menu" : "Mở menu");
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".header-shell")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

function refreshStorefrontFromStorage() {
  if (
    activeFilter !== "all" &&
    !getCategories().includes(activeFilter)
  ) {
    activeFilter = "all";
  }

  renderFilterTabs();
  renderProducts();
  renderCart();
  renderTestimonial(testimonialIndex, { animate: false });
}

window.addEventListener("storage", (event) => {
  if (
    event.key !== "kizztagProducts" &&
    event.key !== "kizztagCategories" &&
    event.key !== "kizztagTestimonials"
  ) {
    return;
  }

  refreshStorefrontFromStorage();
});

window.addEventListener("kizztag-store-change", () => {
  refreshStorefrontFromStorage();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") {
    return;
  }

  void (async () => {
    if (window.KizztagStoreSync) {
      await window.KizztagStoreSync.pullStorefrontFromRemote();
    }
    if (filterTabsContainer) {
      refreshStorefrontFromStorage();
    }
  })();
});

async function initStorefront() {
  syncProductsFromStore();
  syncTestimonialsFromStore();
  getCategories();
  renderFilterTabs();
  renderProducts();
  renderCart();
  renderTestimonial(0, { animate: false });
  restartTestimonialTimer();

  if (!window.KizztagStoreSync) {
    return;
  }

  window.KizztagStoreSync.startStorefrontPolling?.();
  const changed = await window.KizztagStoreSync.pullStorefrontFromRemote();
  if (changed) {
    refreshStorefrontFromStorage();
  }
}

initStorefront();
