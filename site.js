// Логика страницы скачивания. Без inline-скриптов (так работает строгая CSP).
// Значения из latest.json вставляются только через textContent: даже подменённый файл не выполнит код.
(function (root) {
  "use strict";

  function isPlaceholder(value) {
    return !value || /GITHUB_USER/.test(value);
  }

  // Ссылка "всегда последний релиз". Возвращает null, пока конфиг не заполнен или значение странное.
  function buildDownloadUrl(cfg) {
    if (!cfg || isPlaceholder(cfg.repo)) return null;
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(cfg.repo)) return null;
    var apk = cfg.apkName || "WatchYourGrade.apk";
    if (!/^[A-Za-z0-9_.-]+\.apk$/.test(apk)) return null;
    return "https://github.com/" + cfg.repo + "/releases/latest/download/" + apk;
  }

  function formatSize(bytes) {
    if (typeof bytes !== "number" || !isFinite(bytes) || bytes <= 0) return "";
    var mb = bytes / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(1).replace(".", ",") + " МБ";
    return Math.max(1, Math.round(bytes / 1024)) + " КБ";
  }

  // Проверяет latest.json и оставляет только нужные поля нужного типа.
  function readLatest(info) {
    if (!info || typeof info !== "object") return null;
    if (typeof info.versionName !== "string" || !info.versionName) return null;
    return {
      versionName: info.versionName.slice(0, 32),
      sizeText: formatSize(info.sizeBytes),
      notes: typeof info.notes === "string" ? info.notes.slice(0, 300) : "",
      sha256: typeof info.sha256 === "string" && /^[0-9a-fA-F]{64}$/.test(info.sha256) ? info.sha256.toLowerCase() : ""
    };
  }

  function init(doc, cfg, fetchFn) {
    var btn = doc.getElementById("download-btn");
    var url = buildDownloadUrl(cfg);
    if (btn) {
      if (url) {
        btn.setAttribute("href", url);
        btn.setAttribute("aria-disabled", "false");
      } else {
        btn.setAttribute("aria-disabled", "true");
        btn.textContent = "Ссылка появится после первого релиза";
      }
    }

    var cert = doc.getElementById("cert-sha");
    var certBox = doc.getElementById("cert-box");
    if (cert && certBox && cfg && /^[0-9A-Fa-f:]{64,95}$/.test(cfg.signingCertSha256 || "")) {
      cert.textContent = cfg.signingCertSha256.toUpperCase();
      certBox.hidden = false;
    }

    if (!fetchFn) return Promise.resolve();
    return fetchFn("latest.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (raw) {
        var latest = readLatest(raw);
        var box = doc.getElementById("latest-box");
        if (!latest || !box) return;
        doc.getElementById("latest-version").textContent = latest.versionName;
        doc.getElementById("latest-size").textContent = latest.sizeText ? " · " + latest.sizeText : "";
        doc.getElementById("latest-notes").textContent = latest.notes;
        var shaRow = doc.getElementById("latest-sha-row");
        if (latest.sha256 && shaRow) {
          doc.getElementById("latest-sha").textContent = latest.sha256;
          shaRow.hidden = false;
        }
        box.hidden = false;
      })
      .catch(function () { /* нет latest.json: блок версии просто остаётся скрытым */ });
  }

  var api = { buildDownloadUrl: buildDownloadUrl, formatSize: formatSize, readLatest: readLatest, init: init };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.SiteLogic = api;
    if (root.document) {
      root.document.addEventListener("DOMContentLoaded", function () {
        init(root.document, root.SITE_CONFIG, root.fetch ? root.fetch.bind(root) : null);
      });
    }
  }
})(typeof window !== "undefined" ? window : this);
