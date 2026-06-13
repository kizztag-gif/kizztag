/**
 * Đồng bộ KIZZTAG: Admin ↔ Trang web
 * - Google Apps Script (khuyên dùng): google-store-config.js
 * - GitHub (tùy chọn): github-sync-config.js
 */
(function initKizztagStoreSync(global) {
  const REVISION_KEY = "kizztagStoreUpdatedAt";
  const TOKEN_KEY = "kizztagGithubPat";
  const CATALOG_KEYS = {
    products: "kizztagProducts",
    categories: "kizztagCategories",
    testimonials: "kizztagTestimonials",
  };
  const ORDERS_KEY = "kizztagOrders";
  const STORE_CHANGE_EVENT = "kizztag-store-change";
  const STOREFRONT_POLL_VISIBLE_MS = 1000;
  const STOREFRONT_POLL_HIDDEN_MS = 15000;

  let pushTimer = null;
  let pushInFlight = false;
  let pushQueued = false;
  let pullInFlight = false;
  let storefrontPollTimer = null;

  function getGoogleConfig() {
    return global.KIZZTAG_STORE || { enabled: false };
  }

  function isGoogleEnabled() {
    const config = getGoogleConfig();
    return Boolean(config.enabled && config.webhookUrl && config.secret);
  }

  function getGithubConfig() {
    return global.KIZZTAG_GITHUB || { enabled: false };
  }

  function isGithubEnabled() {
    const config = getGithubConfig();
    return Boolean(config.enabled && config.owner && config.repo);
  }

  function isEnabled() {
    return isGoogleEnabled() || isGithubEnabled() || !isFileProtocol();
  }

  function getStaticStoreUrl(options = {}) {
    const cacheKey = options.fresh
      ? Date.now()
      : Math.floor(Date.now() / 60000);
    return `${joinUrl(detectSiteBase(), "data/store.json")}?v=${cacheKey}`;
  }

  function parseResponseJson(text) {
    const raw = String(text || "").trim();
    if (
      raw.includes("Bạn cần có quyền") ||
      raw.includes("need access") ||
      raw.includes("accounts.google.com")
    ) {
      throw new Error(
        "Google Script chưa mở public. Deploy → Who has access: Anyone (Bất kỳ ai)."
      );
    }
    return JSON.parse(raw);
  }

  async function fetchStaticStoreJson(options = {}) {
    const response = await fetch(getStaticStoreUrl(options), {
      cache: options.fresh ? "no-store" : "default",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Không tải được data/store.json (${response.status})`);
    }
    return parseResponseJson(await response.text());
  }

  function downloadStoreBackup(payload) {
    const data = payload || buildPayload();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const link = global.document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "store.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function broadcastCatalogChange() {
    Object.values(CATALOG_KEYS).forEach((key) => {
      const value = global.localStorage.getItem(key);
      if (value !== null) {
        global.localStorage.setItem(key, value);
      }
    });
    notifyStoreChange({ source: "broadcast" });
  }

  function detectSiteBase() {
    const config = getGithubConfig();
    if (config.siteBase !== undefined && config.siteBase !== null && config.siteBase !== "") {
      return String(config.siteBase).replace(/\/$/, "");
    }

    const path = global.location.pathname;
    const adminMatch = path.match(/^(.*)\/admin(?:\/index\.html)?$/i);
    if (adminMatch) {
      return adminMatch[1] || "";
    }

    const pageMatch = path.match(/^(.*)\/[^/]+\.html$/i);
    if (pageMatch) {
      return pageMatch[1] || "";
    }

    return "";
  }

  function joinUrl(base, segment) {
    const cleanBase = String(base || "").replace(/\/$/, "");
    const cleanSegment = String(segment || "").replace(/^\//, "");
    if (!cleanBase) {
      return `/${cleanSegment}`;
    }
    return `${cleanBase}/${cleanSegment}`;
  }

  function getPublicDataUrl() {
    const config = getGithubConfig();
    const base = detectSiteBase();
    return joinUrl(base, config.dataPath || "data/store.json");
  }

  function getToken() {
    try {
      return (
        global.localStorage.getItem(TOKEN_KEY) ||
        global.sessionStorage.getItem(TOKEN_KEY) ||
        ""
      ).trim();
    } catch {
      return "";
    }
  }

  function saveToken(value) {
    const token = String(value || "").trim();
    try {
      if (token) {
        global.localStorage.setItem(TOKEN_KEY, token);
      } else {
        global.localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore.
    }
  }

  function readLocal(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      if (raw === null) {
        return fallback;
      }
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeLocal(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
  }

  function writeLocalIfChanged(key, value) {
    const next = JSON.stringify(value);
    if (global.localStorage.getItem(key) === next) {
      return false;
    }
    global.localStorage.setItem(key, next);
    return true;
  }

  function notifyStoreChange(detail = {}) {
    try {
      global.dispatchEvent(new CustomEvent(STORE_CHANGE_EVENT, { detail }));
    } catch {
      // Ignore older browsers that do not support CustomEvent here.
    }
  }

  function getLocalRevision() {
    return global.localStorage.getItem(REVISION_KEY) || "";
  }

  function touchLocalRevision() {
    const now = new Date().toISOString();
    global.localStorage.setItem(REVISION_KEY, now);
    return now;
  }

  function isCatalogStoreKey(key) {
    return Object.values(CATALOG_KEYS).includes(key) || key === ORDERS_KEY;
  }

  function buildPayload() {
    return {
      version: 1,
      updatedAt: touchLocalRevision(),
      products: readLocal(CATALOG_KEYS.products, []),
      categories: readLocal(CATALOG_KEYS.categories, []),
      testimonials: readLocal(CATALOG_KEYS.testimonials, []),
      orders: readLocal(ORDERS_KEY, []),
    };
  }

  function applyPayload(payload, options = {}) {
    if (!payload || typeof payload !== "object") {
      return false;
    }

    const applyOrders = Boolean(options.applyOrders);
    const remoteRevision = payload.updatedAt || "";
    const localRevision = getLocalRevision();

    if (
      remoteRevision &&
      localRevision &&
      remoteRevision <= localRevision &&
      !options.force
    ) {
      return false;
    }

    let changed = false;

    if (Array.isArray(payload.products)) {
      changed = writeLocalIfChanged(CATALOG_KEYS.products, payload.products) || changed;
    }
    if (Array.isArray(payload.categories)) {
      changed = writeLocalIfChanged(CATALOG_KEYS.categories, payload.categories) || changed;
    }
    if (Array.isArray(payload.testimonials)) {
      changed =
        writeLocalIfChanged(CATALOG_KEYS.testimonials, payload.testimonials) ||
        changed;
    }
    if (applyOrders && Array.isArray(payload.orders)) {
      changed = writeLocalIfChanged(ORDERS_KEY, payload.orders) || changed;
    }

    if (remoteRevision) {
      global.localStorage.setItem(REVISION_KEY, remoteRevision);
    }

    if (changed) {
      notifyStoreChange({
        source: options.source || "remote",
        updatedAt: remoteRevision,
      });
    }

    return changed;
  }

  function isFileProtocol() {
    return global.location.protocol === "file:";
  }

  function googleStoreUrl(extraParams) {
    const config = getGoogleConfig();
    const base = config.webhookUrl.split("?")[0];
    const params = new URLSearchParams({
      action: "store",
      t: String(Date.now()),
      ...extraParams,
    });
    return `${base}?${params.toString()}`;
  }

  function fetchGoogleJsonp() {
    const config = getGoogleConfig();
    const callbackName = `kizztagStoreCb_${Date.now()}`;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        delete global[callbackName];
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };

      global[callbackName] = (data) => {
        cleanup();
        if (!data || data.ok === false) {
          reject(new Error(data?.error || "Google Script error"));
          return;
        }
        resolve(data);
      };

      const script = global.document.createElement("script");
      script.src = googleStoreUrl({ callback: callbackName });
      script.onerror = () => {
        cleanup();
        reject(new Error("Không tải được Google Script (JSONP)."));
      };

      global.document.head.appendChild(script);
      global.setTimeout(() => {
        if (global[callbackName]) {
          cleanup();
          reject(new Error("Google Script quá thời gian chờ."));
        }
      }, 20000);
    });
  }

  async function fetchGooglePayload() {
    if (isFileProtocol()) {
      throw new Error(
        "Bạn đang mở file trực tiếp (file://). Hãy dùng GitHub Pages hoặc Live Server (http://localhost)."
      );
    }

    const config = getGoogleConfig();

    try {
      const response = await fetch(googleStoreUrl(), {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
      });

      if (response.ok) {
        const data = parseResponseJson(await response.text());
        if (data.ok === false) {
          throw new Error(data.error || "Google Script error");
        }
        if (Array.isArray(data.products)) {
          return data;
        }
      }
    } catch (error) {
      console.warn("[KIZZTAG] fetch GET failed, try JSONP:", error);
    }

    return fetchGoogleJsonp();
  }

  function pushGoogleViaForm(bodyString) {
    const config = getGoogleConfig();

    return new Promise((resolve, reject) => {
      const iframeName = `kizztag_sync_${Date.now()}`;
      const iframe = global.document.createElement("iframe");
      iframe.name = iframeName;
      iframe.style.display = "none";
      iframe.setAttribute("aria-hidden", "true");

      const form = global.document.createElement("form");
      form.method = "POST";
      form.action = config.webhookUrl;
      form.target = iframeName;
      form.style.display = "none";

      const input = global.document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = bodyString;
      form.appendChild(input);

      const timeout = global.setTimeout(() => {
        cleanup();
        resolve({ ok: true, viaForm: true });
      }, 4000);

      function cleanup() {
        global.clearTimeout(timeout);
        form.remove();
        iframe.remove();
      }

      iframe.onload = () => {
        cleanup();
        resolve({ ok: true, viaForm: true });
      };

      global.document.body.appendChild(iframe);
      global.document.body.appendChild(form);
      form.submit();

      global.setTimeout(() => {
        cleanup();
        reject(new Error("Form POST quá thời gian chờ."));
      }, 12000);
    });
  }

  async function pushGooglePayload(payload) {
    if (isFileProtocol()) {
      throw new Error(
        "Không đồng bộ được từ file://. Mở admin qua https://... hoặc http://localhost."
      );
    }

    const config = getGoogleConfig();
    const bodyString = JSON.stringify({
      secret: config.secret,
      action: "saveStore",
      store: payload,
    });

    const errors = [];

    try {
      const response = await fetch(config.webhookUrl, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: bodyString,
      });

      const data = parseResponseJson(await response.text());
      if (data.ok) {
        return data;
      }
      throw new Error(data.error || "Lưu thất bại");
    } catch (error) {
      errors.push(String(error.message || error));
    }

    try {
      const response = await fetch(config.webhookUrl, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        body: bodyString,
      });
      const data = parseResponseJson(await response.text());
      if (data.ok) {
        return data;
      }
      throw new Error(data.error || "Lưu thất bại");
    } catch (error) {
      errors.push(String(error.message || error));
    }

    try {
      return await pushGoogleViaForm(bodyString);
    } catch (error) {
      errors.push(String(error.message || error));
    }

    throw new Error(
      errors.join(" | ") ||
        "Failed to fetch — deploy lại Google Script (New version) và mở admin bằng https, không dùng file://."
    );
  }

  async function fetchRemotePayload() {
    if (isGoogleEnabled()) {
      try {
        return await fetchGooglePayload();
      } catch (error) {
        console.warn("[KIZZTAG] Google store:", error);
      }
    }

    try {
      return await fetchStaticStoreJson({ fresh: !isGoogleEnabled() });
    } catch (error) {
      console.warn("[KIZZTAG] static store:", error);
    }

    if (!isGithubEnabled()) {
      return null;
    }

    const url = `${getPublicDataUrl()}?t=${Date.now()}`;
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Không tải được store.json (${response.status})`);
    }

    return parseResponseJson(await response.text());
  }

  async function pullFromRemote(options = {}) {
    if (!isEnabled()) {
      return false;
    }

    try {
      const payload = await fetchRemotePayload();
      return applyPayload(payload, options);
    } catch (error) {
      console.warn("[KIZZTAG sync] pull failed:", error);
      return false;
    }
  }

  async function pullStorefrontFromRemote() {
    if (isFileProtocol()) {
      return false;
    }
    if (pullInFlight) {
      return false;
    }

    pullInFlight = true;
    try {
      const payload = await fetchRemotePayload();
      if (!payload) {
        return false;
      }
      return applyPayload(payload, {
        applyOrders: false,
        source: "storefront-pull",
      });
    } catch (error) {
      console.warn("[KIZZTAG sync] storefront pull failed:", error);
      return false;
    } finally {
      pullInFlight = false;
    }
  }

  function stopStorefrontPolling() {
    if (storefrontPollTimer) {
      global.clearTimeout(storefrontPollTimer);
      storefrontPollTimer = null;
    }
  }

  function startStorefrontPolling() {
    if (!isEnabled() || isFileProtocol()) {
      return;
    }

    stopStorefrontPolling();

    const tick = async () => {
      await pullStorefrontFromRemote();
      const delay =
        global.document.visibilityState === "visible"
          ? STOREFRONT_POLL_VISIBLE_MS
          : STOREFRONT_POLL_HIDDEN_MS;
      storefrontPollTimer = global.setTimeout(tick, delay);
    };

    void tick();
  }

  function utf8ToBase64(text) {
    return global.btoa(unescape(encodeURIComponent(text)));
  }

  async function getGithubFileMeta() {
    const config = getGithubConfig();
    const token = getToken();
    if (!token) {
      throw new Error("Chưa có GitHub token.");
    }

    const apiUrl =
      `https://api.github.com/repos/${encodeURIComponent(config.owner)}` +
      `/${encodeURIComponent(config.repo)}/contents/${encodeURIComponent(config.dataPath || "data/store.json")}` +
      `?ref=${encodeURIComponent(config.branch || "main")}`;

    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (response.status === 404) {
      return { sha: null };
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status}: ${body}`);
    }

    return response.json();
  }

  async function pushGithubPayload(payload) {
    const config = getGithubConfig();
    const token = getToken();
    if (!token) {
      throw new Error("Thiếu GitHub token.");
    }

    const content = utf8ToBase64(JSON.stringify(payload, null, 2));
    const meta = await getGithubFileMeta();

    const apiUrl =
      `https://api.github.com/repos/${encodeURIComponent(config.owner)}` +
      `/${encodeURIComponent(config.repo)}/contents/${encodeURIComponent(config.dataPath || "data/store.json")}`;

    const body = {
      message: `KIZZTAG: cập nhật cửa hàng ${payload.updatedAt}`,
      content,
      branch: config.branch || "main",
    };

    if (meta && meta.sha) {
      body.sha = meta.sha;
    }

    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GitHub ${response.status}: ${text}`);
    }
  }

  async function pushToRemote() {
    if (!isEnabled()) {
      return {
        ok: false,
        message: "Bật google-store-config.js (enabled + webhookUrl) hoặc GitHub.",
      };
    }

    if (pushInFlight) {
      pushQueued = true;
      return { ok: true, message: "Đang đồng bộ, đã xếp hàng bản cập nhật mới…" };
    }

    pushInFlight = true;

    try {
      const payload = buildPayload();

      if (isGoogleEnabled()) {
        await pushGooglePayload(payload);
        broadcastCatalogChange();
        return {
          ok: true,
          message:
            "Đã lưu — trang web sẽ tự cập nhật trong vài giây nếu đang mở.",
        };
      }

      await pushGithubPayload(payload);
      return {
        ok: true,
        message: "Đã đồng bộ lên GitHub. Trang web sẽ cập nhật sau vài giây.",
      };
    } catch (error) {
      const payload = buildPayload();
      downloadStoreBackup(payload);
      broadcastCatalogChange();
      return {
        ok: false,
        message: `${String(error.message || error)} — Đã tải file store.json: upload lên GitHub thư mục data/ (hoặc sửa Deploy Google: Anyone).`,
      };
    } finally {
      pushInFlight = false;
      if (pushQueued) {
        pushQueued = false;
        global.setTimeout(async () => {
          const nextResult = await pushToRemote();
          refreshSyncStatus(nextResult);
        }, 0);
      }
    }
  }

  function schedulePush(delayMs = 300) {
    if (!isEnabled()) {
      refreshSyncStatus();
      return;
    }

    if (isGithubEnabled() && !isGoogleEnabled() && !getToken()) {
      refreshSyncStatus();
      return;
    }

    global.clearTimeout(pushTimer);
    pushTimer = global.setTimeout(async () => {
      const result = await pushToRemote();
      refreshSyncStatus(result);
    }, delayMs);
  }

  async function flushPushNow() {
    global.clearTimeout(pushTimer);
    pushTimer = null;
    const result = await pushToRemote();
    refreshSyncStatus(result);
    return result;
  }

  function getStoreLinks() {
    const base = detectSiteBase();
    const origin = global.location.origin;
    const google = getGoogleConfig();

    return {
      storefront: `${origin}${joinUrl(base, "index.html")}`,
      admin: `${origin}${joinUrl(base, "admin/index.html")}`,
      googleScript: google.webhookUrl || "",
    };
  }

  function refreshSyncStatus(result) {
    const statusEl = global.document.querySelector("#store-sync-status");
    const linksEl = global.document.querySelector("#store-sync-links");
    if (!statusEl) {
      return;
    }

    const links = getStoreLinks();
    const revision = getLocalRevision();
    const googleOn = isGoogleEnabled();
    const githubOn = isGithubEnabled();

    if (!googleOn && !githubOn) {
      statusEl.textContent =
        "Chưa bật đồng bộ. Sửa google-store-config.js (enabled: true + webhookUrl).";
      statusEl.dataset.state = "warn";
      return;
    }

    if (result?.message) {
      statusEl.textContent = result.message;
      statusEl.dataset.state = result.ok ? "ok" : "error";
    } else if (googleOn) {
      statusEl.textContent = revision
        ? `Google Script — sẵn sàng. Cập nhật: ${revision}`
        : "Google Script — sửa dashboard sẽ tự đồng bộ (hoặc bấm nút bên dưới).";
      statusEl.dataset.state = "ok";
    } else if (!getToken()) {
      statusEl.textContent = "GitHub: nhập token rồi bấm Đồng bộ.";
      statusEl.dataset.state = "warn";
    } else {
      statusEl.textContent = revision
        ? `GitHub — sẵn sàng. Cập nhật: ${revision}`
        : "GitHub — sẵn sàng đồng bộ.";
      statusEl.dataset.state = "ok";
    }

    if (linksEl) {
      let html = `
        <a href="${links.storefront}" target="_blank" rel="noopener">Trang chủ</a>
        <a href="${links.admin}" target="_blank" rel="noopener">Admin</a>
      `;
      if (links.googleScript) {
        html += `<a href="${links.googleScript}?action=store" target="_blank" rel="noopener">Kiểm tra JSON (Google)</a>`;
      }
      linksEl.innerHTML = html;
    }
  }

  function bindAdminSyncUi() {
    const syncBtn = global.document.querySelector("#store-sync-now");
    const pullBtn = global.document.querySelector("#store-pull-now");
    const tokenInput = global.document.querySelector("#github-token");
    const saveTokenBtn = global.document.querySelector("#github-save-token");
    const githubPanel = global.document.querySelector("#github-extra-panel");

    if (githubPanel) {
      githubPanel.hidden = !isGithubEnabled() || isGoogleEnabled();
    }

    if (tokenInput) {
      tokenInput.value = getToken();
    }

    saveTokenBtn?.addEventListener("click", () => {
      saveToken(tokenInput?.value || "");
      refreshSyncStatus({ ok: true, message: "Đã lưu GitHub token." });
    });

    syncBtn?.addEventListener("click", async () => {
      refreshSyncStatus({ ok: true, message: "Đang đồng bộ…" });
      const result = await pushToRemote();
      refreshSyncStatus(result);
      if (result.ok && typeof global.renderDashboard === "function") {
        global.renderDashboard();
      }
    });

    pullBtn?.addEventListener("click", async () => {
      refreshSyncStatus({ ok: true, message: "Đang tải dữ liệu…" });
      const changed = await pullFromRemote({ applyOrders: true, force: true });
      refreshSyncStatus({
        ok: true,
        message: changed
          ? "Đã tải dữ liệu mới."
          : "Đã tải xong (không có bản mới hơn local).",
      });
      if (typeof global.renderDashboard === "function") {
        global.renderDashboard();
      }
    });

    refreshSyncStatus();
  }

  global.KizztagStoreSync = {
    isEnabled,
    isGoogleEnabled,
    isCatalogStoreKey,
    buildPayload,
    applyPayload,
    pullFromRemote,
    pullStorefrontFromRemote,
    pushToRemote,
    flushPushNow,
    schedulePush,
    touchLocalRevision,
    broadcastCatalogChange,
    startStorefrontPolling,
    stopStorefrontPolling,
    downloadStoreBackup,
    refreshSyncStatus,
    bindAdminSyncUi,
  };
})(window);
