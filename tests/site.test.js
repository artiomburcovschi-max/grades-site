// Запуск: node --test tests/site.test.js
const test = require("node:test");
const assert = require("node:assert");
const { buildDownloadUrl, formatSize, readLatest, init } = require("../assets/site.js");

test("ссылка скачивания: пока заглушка, ссылки нет", () => {
  assert.strictEqual(buildDownloadUrl({ repo: "GITHUB_USER/grades-site" }), null);
  assert.strictEqual(buildDownloadUrl(null), null);
});

test("ссылка скачивания: нормальный репозиторий", () => {
  assert.strictEqual(
    buildDownloadUrl({ repo: "me/grades-site", apkName: "WatchYourGrade.apk" }),
    "https://github.com/me/grades-site/releases/latest/download/WatchYourGrade.apk"
  );
});

test("ссылка скачивания: подозрительные значения отвергаются", () => {
  assert.strictEqual(buildDownloadUrl({ repo: "me/site/../../evil" }), null);
  assert.strictEqual(buildDownloadUrl({ repo: "me/site", apkName: "../x.apk" }), null);
  assert.strictEqual(buildDownloadUrl({ repo: "me/site", apkName: "run.sh" }), null);
  assert.strictEqual(buildDownloadUrl({ repo: "javascript:alert(1)" }), null);
});

test("размер файла", () => {
  assert.strictEqual(formatSize(3 * 1024 * 1024), "3,0 МБ");
  assert.strictEqual(formatSize(2048), "2 КБ");
  assert.strictEqual(formatSize(0), "");
  assert.strictEqual(formatSize("много"), "");
});

test("latest.json: берём только нужное и нужного типа", () => {
  const ok = readLatest({ versionName: "0.2.0", sizeBytes: 3145728, notes: "ok", sha256: "A".repeat(64) });
  assert.strictEqual(ok.versionName, "0.2.0");
  assert.strictEqual(ok.sha256, "a".repeat(64));
  assert.strictEqual(readLatest({ versionName: "1", sha256: "zz" }).sha256, "");
  assert.strictEqual(readLatest(null), null);
  assert.strictEqual(readLatest({ versionName: 5 }), null);
  assert.strictEqual(readLatest({ versionName: "x".repeat(100) }).versionName.length, 32);
});

function fakeDoc() {
  const els = {};
  for (const id of ["download-btn", "cert-sha", "cert-box", "latest-box", "latest-version", "latest-size", "latest-notes", "latest-sha-row", "latest-sha"]) {
    els[id] = { textContent: "", hidden: true, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  }
  return { els, getElementById: (id) => els[id] || null };
}

test("init: заглушка отключает кнопку, версия не показывается без latest.json", async () => {
  const d = fakeDoc();
  await init(d, { repo: "GITHUB_USER/x" }, () => Promise.resolve({ ok: false }));
  assert.strictEqual(d.els["download-btn"].attrs["aria-disabled"], "true");
  assert.strictEqual(d.els["latest-box"].hidden, true);
});

test("init: настоящий конфиг и latest.json заполняют страницу через textContent", async () => {
  const d = fakeDoc();
  const latest = { versionName: "0.2.0", sizeBytes: 3145728, notes: "<img src=x onerror=alert(1)>", sha256: "b".repeat(64) };
  await init(d, { repo: "me/grades-site", signingCertSha256: "aa:bb:" + "cc:".repeat(29) + "dd" }, () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(latest) })
  );
  assert.ok(d.els["download-btn"].attrs.href.startsWith("https://github.com/me/grades-site/"));
  assert.strictEqual(d.els["latest-version"].textContent, "0.2.0");
  assert.strictEqual(d.els["latest-notes"].textContent, "<img src=x onerror=alert(1)>"); // как текст, не как разметка
  assert.strictEqual(d.els["latest-box"].hidden, false);
  assert.strictEqual(d.els["cert-box"].hidden, false);
});

test("init: ошибка сети не ломает страницу", async () => {
  const d = fakeDoc();
  await init(d, { repo: "me/x" }, () => Promise.reject(new Error("offline")));
  assert.strictEqual(d.els["latest-box"].hidden, true);
});
