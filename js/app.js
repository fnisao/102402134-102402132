(function () {
  "use strict";
  const L = window.LostFound;
  const app = document.querySelector("#app");
  const toastBox = document.querySelector("#toast");
  const STORAGE_KEY = "shiguang-posts-v1";
  const OWNER_KEY = "shiguang-owner-v1";
  const e = L.escapeHTML;
  let toastTimer;
  let storageEnabled = true;
  let storageRecovered = false;
  let ownerId = readOwner();
  let posts = readPosts();
  let state = { page: "home", detailId: null, returnPage: "home", kind: "all", category: "all", searchStatus: "all", keyword: "", mineStatus: "all", formKind: "lost" };

  function readOwner() {
    try {
      let value = localStorage.getItem(OWNER_KEY);
      if (!value) {
        value = `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        localStorage.setItem(OWNER_KEY, value);
      }
      return value;
    } catch {
      storageEnabled = false;
      return "temporary-session";
    }
  }

  function readPosts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return window.DEMO_POSTS.map((post) => ({ ...post }));
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) throw new Error("Invalid data format");
        return parsed.filter(L.isValidStoredPost);
      } catch {
        storageRecovered = true;
        return window.DEMO_POSTS.map((post) => ({ ...post }));
      }
    } catch {
      storageEnabled = false;
      return window.DEMO_POSTS.map((post) => ({ ...post }));
    }
  }

  function savePosts() {
    if (!storageEnabled) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
      return true;
    } catch {
      storageEnabled = false;
      return false;
    }
  }

  function showToast(message) {
    toastBox.textContent = message;
    toastBox.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastBox.classList.remove("show"), 3100);
  }

  async function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(value); return true; } catch { /* Try the local-file fallback. */ }
    }
    const helper = document.createElement("textarea");
    helper.value = value;
    helper.setAttribute("readonly", "");
    helper.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(helper);
    helper.select();
    try { return document.execCommand("copy"); }
    catch { return false; }
    finally { helper.remove(); }
  }

  function goto(page, extra = {}) {
    state = { ...state, ...extra, page };
    render();
    window.scrollTo(0, 0);
  }

  function postById(id) { return posts.find((post) => post.id === id); }
  function kindLabel(kind) { return kind === "lost" ? "寻物" : "招领"; }
  function statusLabel(post) { return post.status === "done" ? (post.kind === "lost" ? "已找到" : "已归还") : (post.kind === "lost" ? "寻找中" : "待认领"); }
  function iconFor(category) { return ({ "校园卡": "▣", "钥匙": "⚿", "雨伞": "☂", "电子产品": "◈", "水杯": "◌", "书籍": "▤" })[category] || "✦"; }
  function shortDate(value) { return value ? value.slice(5).replace("-", ".") : ""; }

  function header(kicker, title, description = "") {
    return `<div class="page-heading"><p class="eyebrow">${kicker}</p><h2>${title}</h2>${description ? `<p class="page-description">${description}</p>` : ""}</div>`;
  }

  function card(post) {
    const done = post.status === "done";
    return `<button class="item-card ${post.kind} ${done ? "done" : ""}" type="button" data-detail="${e(post.id)}">
      <span class="item-symbol ${post.kind}">${iconFor(post.category)}</span>
      <span class="item-copy"><span class="item-topline"><span class="kind-pill ${post.kind}">${kindLabel(post.kind)}</span><span class="item-age">${shortDate(post.occurredAt)}</span></span>
      <strong>${e(post.title)}</strong><span class="item-meta">⌖ ${e(post.location)}</span><span class="item-desc">${e(post.description)}</span></span>
      <span class="item-bottom"><span class="status ${done ? "closed" : ""}"><i></i>${statusLabel(post)}</span><span>查看详情 ↗</span></span>
    </button>`;
  }

  function empty(title, copy, action, label) {
    return `<div class="empty-state"><div class="empty-icon">⌕</div><h3>${title}</h3><p>${copy}</p><button class="outline-button" type="button" data-nav="${action}">${label} →</button></div>`;
  }

  function kindTabs(active) {
    return `<div class="segmented" role="group" aria-label="信息类型">${[["all", "全部"], ["lost", "寻物"], ["found", "招领"]].map(([key, label]) => `<button type="button" class="${active === key ? "active" : ""}" data-kind="${key}" aria-pressed="${active === key}">${label}</button>`).join("")}</div>`;
  }

  function renderHome() {
    const visible = L.filterPosts(posts, { kind: state.kind });
    const activeCount = posts.filter((post) => post.status === "active").length;
    return `<section class="hero"><div><p class="eyebrow">CAMPUS LOST & FOUND</p><h2>让每一件重要的东西<br><em>都能回到身边。</em></h2><p>发布线索、寻找物品、联系同学。简单几步，互相帮忙。</p><button class="hero-search" type="button" data-nav="search"><span>⌕</span> 搜物品名称、地点或特征 <b>搜索 ↗</b></button></div><div class="hero-badge"><strong>${activeCount.toString().padStart(2, "0")}</strong><span>条线索<br>正在校园里等待相遇</span></div></section>
      <section class="quick-actions"><button type="button" data-publish="lost"><span class="quick-icon">↗</span><strong>我丢了东西</strong><small>发布寻物，寻找线索</small><span class="quick-arrow">→</span></button><button type="button" data-publish="found"><span class="quick-icon">✦</span><strong>我捡到东西</strong><small>发布招领，帮助归还</small><span class="quick-arrow">→</span></button></section>
      <section class="feed-section"><div class="section-heading"><div><p class="eyebrow">DISCOVER</p><h3>校园里的新线索</h3></div><span>${visible.length} 条信息</span></div>${kindTabs(state.kind)}<div class="card-grid">${visible.length ? visible.map(card).join("") : empty("暂时没有相关信息", "试试另一种类型，或发布一条新信息。", "publish", "发布信息")}</div></section>`;
  }

  function renderSearch() {
    const results = L.filterPosts(posts, { keyword: state.keyword, kind: state.kind, category: state.category, status: state.searchStatus });
    return `<section class="content-page">${header("FIND A CLUE", "找一找，或许就在这里。", "输入物品名称、地点或外观特征，快速缩小范围。")}
      <form id="search-form" class="search-form"><label class="sr-only" for="keyword">搜索关键词</label><span>⌕</span><input id="keyword" name="keyword" type="search" maxlength="60" placeholder="例如：校园卡、雨伞、图书馆" value="${e(state.keyword)}"><button class="primary-button" type="submit">搜索</button></form>
      <div class="filter-row"><div>${kindTabs(state.kind)}</div><label class="category-label">类别 <select id="category-filter" aria-label="按类别筛选"><option value="all">全部类别</option>${L.CATEGORIES.map((category) => `<option value="${e(category)}" ${state.category === category ? "selected" : ""}>${e(category)}</option>`).join("")}</select></label><label class="category-label">状态 <select id="status-filter" aria-label="按状态筛选"><option value="all" ${state.searchStatus === "all" ? "selected" : ""}>全部状态</option><option value="active" ${state.searchStatus === "active" ? "selected" : ""}>进行中</option><option value="done" ${state.searchStatus === "done" ? "selected" : ""}>已完成</option></select></label></div>
      <div class="section-heading result-heading"><div><p class="eyebrow">RESULTS</p><h3>${state.keyword ? `“${e(state.keyword)}”的搜索结果` : "全部物品"}</h3></div><span>找到 ${results.length} 条</span></div>
      <div class="card-grid">${results.length ? results.map(card).join("") : empty("暂时没有匹配的线索", "试试更短的关键词，或清除类别筛选。", "search-reset", "清除筛选")}</div></section>`;
  }

  function field(name, label, control, hint = "") {
    return `<div class="field"><label for="${name}">${label} <span>*</span></label>${control}<small class="field-hint">${hint}</small><small class="field-error" data-error="${name}"></small></div>`;
  }

  function renderPublish() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return `<section class="content-page narrow">${header("SHARE A CLUE", "发布一条新线索。", "把你知道的信息写清楚，让需要的人更快找到它。")}
      <form id="publish-form" novalidate><fieldset class="kind-choice"><legend>信息类型 <span>*</span></legend><label><input type="radio" name="kind" value="lost" ${state.formKind === "lost" ? "checked" : ""}><span><b>我丢了 · 寻物</b><small>希望同学帮忙寻找</small></span></label><label><input type="radio" name="kind" value="found" ${state.formKind === "found" ? "checked" : ""}><span><b>我捡到 · 招领</b><small>帮物品找到主人</small></span></label><small class="field-error" data-error="kind"></small></fieldset>
      <div class="form-grid">${field("title", "物品名称", '<input id="title" name="title" maxlength="40" placeholder="例如：深蓝色折叠伞" required>')}
      ${field("category", "物品类别", `<select id="category" name="category" required><option value="">请选择类别</option>${L.CATEGORIES.map((category) => `<option value="${e(category)}">${e(category)}</option>`).join("")}</select>`)}
      ${field("occurredAt", "遗失／拾到日期", `<input id="occurredAt" name="occurredAt" type="date" max="${today}" required>`)}
      ${field("location", "遗失／拾到地点", '<input id="location" name="location" maxlength="60" placeholder="例如：图书馆一楼附近" required>')}</div>
      ${field("description", "特征描述", '<textarea id="description" name="description" rows="4" maxlength="300" placeholder="写下颜色、外观等可用于核对的特征，至少 8 字" required></textarea>', "请勿公开完整校园卡号、证件号码等敏感信息。")}
      ${field("contact", "联系方式", '<input id="contact" name="contact" maxlength="80" placeholder="例如：微信号或手机号" required>', "仅在未完成的信息详情中展示；完成后自动隐藏。")}
      <div class="form-actions"><button class="primary-button large" type="submit">发布信息 <span>↗</span></button><p>发布后可在“我的发布”中更新状态。</p></div></form></section>`;
  }

  function renderDetail() {
    const post = postById(state.detailId);
    if (!post) return `<section class="content-page">${empty("这条信息不存在", "它可能已被清理，请返回列表查看其他线索。", "home", "返回首页")}</section>`;
    const own = post.ownerId === ownerId;
    const contact = L.visibleContact(post);
    return `<section class="content-page detail-page"><button class="back-link" type="button" data-nav="${state.returnPage}">← 返回${state.returnPage === "mine" ? "我的发布" : state.returnPage === "search" ? "搜索结果" : "首页"}</button>
      <div class="detail-hero ${post.kind}"><div class="detail-symbol">${iconFor(post.category)}</div><div><span class="kind-pill ${post.kind}">${kindLabel(post.kind)}</span><h2>${e(post.title)}</h2><span class="status ${post.status === "done" ? "closed" : ""}"><i></i>${statusLabel(post)}</span></div></div>
      <div class="detail-grid"><article class="detail-main"><p class="eyebrow">ITEM DETAILS</p><h3>关于这件物品</h3><p class="detail-description">${e(post.description)}</p><dl><div><dt>物品类别</dt><dd>${e(post.category)}</dd></div><div><dt>${post.kind === "lost" ? "遗失" : "拾到"}时间</dt><dd>${e(post.occurredAt)}</dd></div><div><dt>${post.kind === "lost" ? "遗失" : "拾到"}地点</dt><dd>${e(post.location)}</dd></div><div><dt>发布状态</dt><dd>${statusLabel(post)}</dd></div></dl></article>
      <aside class="contact-panel"><p class="eyebrow">MAKE CONTACT</p><h3>${post.status === "done" ? "这条线索已完成" : "联系发布者"}</h3>${contact ? `<p>联系前请先核对物品特征，避免误领。</p><div class="contact-value">${e(contact)}</div><button class="primary-button" type="button" data-copy="${e(post.id)}">复制联系方式</button>` : `<p>发布者已将信息标记为“${statusLabel(post)}”，联系方式现已隐藏。</p>`}${own && post.status === "active" ? `<div class="owner-actions"><p>这是你发布的信息。物品找回或归还后，请及时结束线索。</p><button class="outline-button" type="button" data-complete="${e(post.id)}">标记为${post.kind === "lost" ? "已找到" : "已归还"}</button></div>` : ""}</aside></div></section>`;
  }

  function renderMine() {
    const own = L.filterPosts(posts, { ownerId, status: state.mineStatus });
    const allOwn = posts.filter((post) => post.ownerId === ownerId);
    return `<section class="content-page">${header("YOUR STORIES", "我的发布。", "更新物品状态，让已经完成的线索安静归档。")}
      <div class="mine-summary"><div><strong>${allOwn.length}</strong><span>全部发布</span></div><div><strong>${allOwn.filter((post) => post.status === "active").length}</strong><span>进行中</span></div><div><strong>${allOwn.filter((post) => post.status === "done").length}</strong><span>已完成</span></div></div>
      <div class="segmented mine-filter" role="group" aria-label="发布状态">${[["all", "全部"], ["active", "进行中"], ["done", "已完成"]].map(([key, label]) => `<button type="button" data-mine-status="${key}" class="${state.mineStatus === key ? "active" : ""}" aria-pressed="${state.mineStatus === key}">${label}</button>`).join("")}</div>
      <div class="card-grid">${own.length ? own.map(card).join("") : empty(allOwn.length ? "这一栏还没有信息" : "还没有发布过信息", allOwn.length ? "切换状态看看其他记录。" : "发布你的第一条线索，帮助物品找到归途。", allOwn.length ? "mine-reset" : "publish", allOwn.length ? "查看全部" : "去发布")}</div></section>`;
  }

  function renderSuccess() {
    const post = postById(state.detailId);
    return `<section class="content-page success-page"><div class="success-ring">✓</div><p class="eyebrow">CLUE PUBLISHED</p><h2>发布成功，<br>线索已经出发。</h2><p>${post ? `“${e(post.title)}”` : "你的信息"}已出现在校园信息列表中。你可以随时在“我的发布”里更新状态。</p><div><button class="primary-button large" type="button" data-nav="mine">查看我的发布 →</button><button class="outline-button large" type="button" data-nav="home">返回首页</button></div></section>`;
  }

  function render() {
    const views = { home: renderHome, search: renderSearch, publish: renderPublish, detail: renderDetail, mine: renderMine, success: renderSuccess };
    app.innerHTML = (views[state.page] || renderHome)();
    document.querySelectorAll(".bottom-nav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.nav === state.page || (state.page === "detail" && button.dataset.nav === state.returnPage));
    });
  }

  document.addEventListener("click", async (event) => {
    const detail = event.target.closest("[data-detail]");
    if (detail) return goto("detail", { detailId: detail.dataset.detail, returnPage: state.page });
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      const destination = nav.dataset.nav;
      if (destination === "search-reset") return goto("search", { keyword: "", category: "all", kind: "all", searchStatus: "all" });
      if (destination === "mine-reset") return goto("mine", { mineStatus: "all" });
      return goto(destination);
    }
    const publish = event.target.closest("[data-publish]");
    if (publish) return goto("publish", { formKind: publish.dataset.publish });
    const tab = event.target.closest("[data-kind]");
    if (tab) return goto(state.page, { kind: tab.dataset.kind });
    const mineTab = event.target.closest("[data-mine-status]");
    if (mineTab) return goto("mine", { mineStatus: mineTab.dataset.mineStatus });
    const complete = event.target.closest("[data-complete]");
    if (complete) {
      const result = L.updateStatus(posts, complete.dataset.complete, ownerId);
      if (!result.ok) return showToast("无法修改此条信息，请刷新后重试。");
      posts = result.posts;
      savePosts();
      render();
      return showToast("状态已更新，联系方式已隐藏。");
    }
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      const post = postById(copy.dataset.copy);
      const contact = post && L.visibleContact(post);
      if (!contact) return showToast("这条信息的联系方式已隐藏。");
      showToast(await copyText(contact) ? "联系方式已复制。" : "复制失败，请手动选择上方联系方式。");
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.id === "category-filter") goto("search", { category: event.target.value });
    if (event.target.id === "status-filter") goto("search", { searchStatus: event.target.value });
    if (event.target.name === "kind" && event.target.closest("#publish-form")) state.formKind = event.target.value;
  });

  document.addEventListener("submit", (event) => {
    if (event.target.id === "search-form") {
      event.preventDefault();
      return goto("search", { keyword: event.target.elements.keyword.value.trim() });
    }
    if (event.target.id !== "publish-form") return;
    event.preventDefault();
    const form = event.target;
    const input = Object.fromEntries(new FormData(form).entries());
    const result = L.createPost(input, ownerId, new Date(), `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    form.querySelectorAll("[data-error]").forEach((node) => { node.textContent = result.errors?.[node.dataset.error] || ""; });
    if (!result.ok) { form.querySelector(".field-error:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" }); return showToast("请检查标红的必填项。"); }
    posts = [result.post, ...posts];
    const saved = savePosts();
    goto("success", { detailId: result.post.id });
    showToast(saved ? "发布成功。" : "发布成功，但浏览器未允许持久保存；关闭页面后记录可能丢失。");
  });

  document.querySelector("#today").textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
  render();
  if (!storageEnabled) showToast("本地保存不可用，本次访问中的新信息可能不会保留。");
  else if (storageRecovered) showToast("原有本地数据格式异常，已显示演示信息；下次发布将覆盖异常数据。");
})();
