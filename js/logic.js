/* Core rules shared by the browser UI and Node's built-in test runner. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LostFound = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CATEGORIES = ["校园卡", "钥匙", "雨伞", "电子产品", "水杯", "书籍", "其他"];
  const KINDS = ["lost", "found"];
  const STATUSES = ["active", "done"];

  function clean(value) {
    return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
  }

  function validatePost(input) {
    const errors = {};
    if (!KINDS.includes(input.kind)) errors.kind = "请选择寻物或招领";
    if (clean(input.title).length < 2 || clean(input.title).length > 40) errors.title = "物品名称需为 2—40 字";
    if (!CATEGORIES.includes(input.category)) errors.category = "请选择物品类别";
    if (!clean(input.location) || clean(input.location).length > 60) errors.location = "地点不能为空且不能超过 60 字";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(input.occurredAt))) errors.occurredAt = "请选择日期";
    else {
      const [year, month, day] = input.occurredAt.split("-").map(Number);
      const parsed = new Date(year, month - 1, day);
      if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) errors.occurredAt = "日期无效";
      else if (parsed > new Date(new Date().toDateString())) errors.occurredAt = "日期不能晚于今天";
    }
    if (clean(input.description).length < 8 || clean(input.description).length > 300) errors.description = "特征描述需为 8—300 字";
    if (clean(input.contact).length < 3 || clean(input.contact).length > 80) errors.contact = "联系方式需为 3—80 字";
    return errors;
  }

  function createPost(input, ownerId, now = new Date(), id = `p-${Date.now()}`) {
    const errors = validatePost(input);
    if (Object.keys(errors).length) return { ok: false, errors };
    return {
      ok: true,
      post: {
        id: clean(id), ownerId: clean(ownerId), kind: input.kind,
        title: clean(input.title), category: input.category,
        location: clean(input.location), occurredAt: clean(input.occurredAt),
        description: clean(input.description), contact: clean(input.contact),
        status: "active", createdAt: now.toISOString(),
      },
    };
  }

  function isValidStoredPost(post) {
    return post && typeof post === "object" && clean(post.id) && clean(post.ownerId) &&
      KINDS.includes(post.kind) && STATUSES.includes(post.status) &&
      !Object.keys(validatePost(post)).length && !Number.isNaN(Date.parse(post.createdAt));
  }

  function filterPosts(posts, options = {}) {
    const keyword = clean(options.keyword).toLocaleLowerCase("zh-CN");
    return posts.filter((post) => {
      if (options.kind && options.kind !== "all" && post.kind !== options.kind) return false;
      if (options.category && options.category !== "all" && post.category !== options.category) return false;
      if (options.status && options.status !== "all" && post.status !== options.status) return false;
      if (options.ownerId && post.ownerId !== options.ownerId) return false;
      const text = [post.title, post.category, post.location, post.description].join(" ").toLocaleLowerCase("zh-CN");
      return !keyword || text.includes(keyword);
    }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  function updateStatus(posts, id, ownerId) {
    const index = posts.findIndex((post) => post.id === id);
    if (index < 0) return { ok: false, reason: "not-found" };
    if (posts[index].ownerId !== ownerId) return { ok: false, reason: "forbidden" };
    if (posts[index].status === "done") return { ok: false, reason: "already-done" };
    const next = posts.map((post, i) => i === index ? { ...post, status: "done" } : post);
    return { ok: true, posts: next };
  }

  function visibleContact(post) {
    return post.status === "active" ? post.contact : null;
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  return { CATEGORIES, KINDS, STATUSES, clean, validatePost, createPost,
    isValidStoredPost, filterPosts, updateStatus, visibleContact, escapeHTML };
});
