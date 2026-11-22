/* Livestream is offline — keep player locked and show a non-dismissible notice. */
(function () {
  var notice = document.getElementById("livestream-offline-float");
  if (!notice) return;

  function currentTab() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      if (params.get("r")) return "ranker";
      var q = String(params.get("tab") || "").toLowerCase();
      if (q === "ranker" || q === "livestream") return q;
      var hash = String(window.location.hash || "")
        .replace(/^#/, "")
        .toLowerCase();
      if (hash === "ranker" || hash.indexOf("ranker") === 0) return "ranker";
      if (hash === "livestream") return "livestream";
    } catch (err) {}

    if (document.body.getAttribute("data-app-tab") === "ranker") return "ranker";

    var rankerPanel = document.getElementById("panel-ranker");
    if (rankerPanel && !rankerPanel.hidden) return "ranker";

    return "livestream";
  }

  function isLivestreamTab() {
    return currentTab() === "livestream";
  }

  function nominatedFloatVisible() {
    var floatEl = document.getElementById("nominated-float");
    return Boolean(floatEl && !floatEl.hidden);
  }

  function lockPlayer() {
    document.body.classList.add("live-locked");
    document.body.dataset.liveUnlocked = "0";
    if (window.zvPlayerGate && typeof window.zvPlayerGate.stop === "function") {
      window.zvPlayerGate.stop();
    }
    if (window.zvAnalytics && typeof window.zvAnalytics.pausePresence === "function") {
      window.zvAnalytics.pausePresence();
    }
  }

  function showNotice() {
    notice.hidden = false;
    document.body.classList.add("livestream-offline");
  }

  function hideNotice() {
    notice.hidden = true;
    document.body.classList.remove("livestream-offline");
  }

  function syncOfflineUi() {
    lockPlayer();
    if (!isLivestreamTab()) {
      hideNotice();
      return;
    }
    // Keep nominated float in front if it is open; show offline notice afterward.
    if (nominatedFloatVisible()) {
      hideNotice();
      return;
    }
    showNotice();
  }

  window.addEventListener("pilix:tabchange", function () {
    syncOfflineUi();
  });

  window.addEventListener("pilix:nominatedfloatopen", function () {
    hideNotice();
    lockPlayer();
  });

  window.addEventListener("pilix:nominatedfloatclose", function () {
    syncOfflineUi();
  });

  function boot() {
    lockPlayer();
    syncOfflineUi();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
