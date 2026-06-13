/**
 * Cấu hình đồng bộ GitHub Pages — KIZZTAG
 *
 * Sau khi tạo repo trên GitHub, sửa owner + repo bên dưới.
 * siteBase: để trống = tự nhận từ URL (khuyên dùng).
 *   - Trang user.github.io/ten-repo/ → thường là "/ten-repo"
 *   - Trang user.github.io (repo tên user.github.io) → ""
 *
 * Token GitHub (ghp_...) nhập trong Admin → mục "Đồng bộ GitHub".
 * Không dán token vào file này rồi commit.
 */
window.KIZZTAG_GITHUB = {
  enabled: false,
  owner: "kizztag-gif",
  repo: "kizztag",
  branch: "main",
  dataPath: "data/store.json",
  siteBase: "/kizztag",
};
