const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../js/logic.js");

const draft = {
  kind: "lost", title: "蓝色折叠伞", category: "雨伞", location: "图书馆一楼",
  occurredAt: "2026-10-08", description: "深蓝色伞面，黑色伞柄，白色短绳。", contact: "wx_example_123",
};
const make = (change = {}, id = "one", ownerId = "alice", date = "2026-10-08T08:00:00.000Z") =>
  L.createPost({ ...draft, ...change }, ownerId, new Date(date), id).post;

test("T01: valid lost post contains normalized fields and active state", () => {
  const result = L.createPost({ ...draft, title: "  蓝色折叠伞  " }, "alice", new Date("2026-10-08T08:00:00.000Z"), "p1");
  assert.equal(result.ok, true);
  assert.equal(result.post.title, "蓝色折叠伞");
  assert.equal(result.post.status, "active");
});

test("T02: valid found post is accepted", () => {
  const result = L.createPost({ ...draft, kind: "found" }, "alice");
  assert.equal(result.ok, true);
  assert.equal(result.post.kind, "found");
});

test("T03: missing title is rejected", () => {
  assert.ok(L.validatePost({ ...draft, title: " " }).title);
});

test("T04: short description is rejected", () => {
  assert.ok(L.validatePost({ ...draft, description: "蓝色" }).description);
});

test("T05: missing contact is rejected", () => {
  assert.ok(L.validatePost({ ...draft, contact: "" }).contact);
});

test("T06: invalid category is rejected", () => {
  assert.ok(L.validatePost({ ...draft, category: "未定义" }).category);
});

test("T07: no keyword returns newest posts first", () => {
  const posts = [make({}, "old", "alice", "2026-10-07T08:00:00.000Z"), make({}, "new", "alice", "2026-10-08T08:00:00.000Z")];
  assert.deepEqual(L.filterPosts(posts).map((post) => post.id), ["new", "old"]);
});

test("T08: keyword matches title, location, and description case-insensitively", () => {
  const posts = [make({}, "umbrella"), make({ title: "校园卡", category: "校园卡", location: "食堂门口", description: "透明卡套，边缘有蓝色贴纸。" }, "card")];
  assert.deepEqual(L.filterPosts(posts, { keyword: "图书馆" }).map((post) => post.id), ["umbrella"]);
  assert.deepEqual(L.filterPosts(posts, { keyword: "校园卡" }).map((post) => post.id), ["card"]);
  assert.deepEqual(L.filterPosts(posts, { keyword: "蓝色贴纸" }).map((post) => post.id), ["card"]);
});

test("T09: combined kind and category filters narrow results", () => {
  const posts = [make({}, "lost"), make({ kind: "found" }, "found"), make({ category: "钥匙", title: "黑色钥匙串" }, "keys")];
  assert.deepEqual(L.filterPosts(posts, { kind: "found", category: "雨伞" }).map((post) => post.id), ["found"]);
});

test("T10: unmatched search returns an empty list", () => {
  assert.deepEqual(L.filterPosts([make()], { keyword: "耳机" }), []);
});

test("T11: owner can mark their active post complete", () => {
  const result = L.updateStatus([make()], "one", "alice");
  assert.equal(result.ok, true);
  assert.equal(result.posts[0].status, "done");
});

test("T12: another visitor cannot change a post's status", () => {
  const result = L.updateStatus([make()], "one", "bob");
  assert.deepEqual(result, { ok: false, reason: "forbidden" });
});

test("T13: completing an already completed post is rejected", () => {
  const completed = { ...make(), status: "done" };
  assert.equal(L.updateStatus([completed], "one", "alice").reason, "already-done");
});

test("T14: completed post hides its contact", () => {
  assert.equal(L.visibleContact(make()), "wx_example_123");
  assert.equal(L.visibleContact({ ...make(), status: "done" }), null);
});

test("T15: HTML entered by a visitor is escaped", () => {
  assert.equal(L.escapeHTML('<img src="x" onerror=\'bad\'>&'), "&lt;img src=&quot;x&quot; onerror=&#39;bad&#39;&gt;&amp;");
});

test("T16: malformed saved records are ignored", () => {
  assert.equal(Boolean(L.isValidStoredPost({ id: "bad", kind: "lost" })), false);
  assert.equal(Boolean(L.isValidStoredPost(make())), true);
});

test("T17: owner and status filters work together", () => {
  const posts = [make({}, "a", "alice"), make({}, "b", "bob"), { ...make({}, "c", "alice"), status: "done" }];
  assert.deepEqual(L.filterPosts(posts, { ownerId: "alice", status: "active" }).map((post) => post.id), ["a"]);
});

test("T18: impossible and future dates are rejected", () => {
  assert.equal(L.validatePost({ ...draft, occurredAt: "2026-02-30" }).occurredAt, "日期无效");
  assert.equal(L.validatePost({ ...draft, occurredAt: "2099-01-01" }).occurredAt, "日期不能晚于今天");
});
