/* Livestream invitation gate — unlock is in-memory only for the current live visit. */
(function () {
  // Base64 of the invitation code (do not store plaintext).
  var INVITE_B64 = "QHBpbGlfcGluYXM=";

  var modal = document.getElementById("livestream-invite-modal");
  var input = document.getElementById("livestream-invite-input");
  var submit = document.getElementById("livestream-invite-submit");
  var errorEl = document.getElementById("livestream-invite-error");
  if (!modal || !input || !submit) return;

  var unlocked = false;
  var tutorialStarted = false;
  var bootTimer = null;

  function currentTab() {
    // Prefer the URL (e.g. ?tab=ranker) so Ranker links never get the invite prompt.
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

  function expectedInviteCode() {
    try {
      return atob(INVITE_B64);
    } catch (err) {
      return "";
    }
  }

  function normalizeInvite(value) {
    return String(value || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .trim();
  }

  function setError(message) {
    if (!errorEl) return;
    if (!message) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      return;
    }
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function nominatedFloatVisible() {
    var floatEl = document.getElementById("nominated-float");
    return Boolean(floatEl && !floatEl.hidden);
  }

  function showModal() {
    if (!isLivestreamTab() || unlocked) return;
    if (nominatedFloatVisible()) return;
    modal.hidden = false;
    modal.style.display = "flex";
    document.body.classList.add("invite-open");
    setError("");
    // Only clear when first opening, so a late sync doesn't wipe typed input.
    if (document.activeElement !== input) {
      input.value = "";
    }
    setTimeout(function () {
      try {
        if (!unlocked && !modal.hidden) {
          input.focus();
        }
      } catch (e) {}
    }, 40);
  }

  function hideModal() {
    modal.hidden = true;
    modal.style.display = "none";
    document.body.classList.remove("invite-open");
    setError("");
  }

  function clearBootTimer() {
    if (bootTimer) {
      clearTimeout(bootTimer);
      bootTimer = null;
    }
  }

  function lockPlayer() {
    unlocked = false;
    document.body.classList.add("live-locked");
    document.body.dataset.liveUnlocked = "0";
    if (window.zvPlayerGate && typeof window.zvPlayerGate.stop === "function") {
      window.zvPlayerGate.stop();
    }
    if (window.zvAnalytics && typeof window.zvAnalytics.pausePresence === "function") {
      window.zvAnalytics.pausePresence();
    }
  }

  function unlockPlayer() {
    if (!isLivestreamTab()) return;
    clearBootTimer();
    unlocked = true;
    document.body.classList.remove("live-locked");
    document.body.dataset.liveUnlocked = "1";
    hideModal();
    if (window.zvPlayerGate && typeof window.zvPlayerGate.start === "function") {
      window.zvPlayerGate.start();
    }
    if (window.zvAnalytics && typeof window.zvAnalytics.resumePresence === "function") {
      window.zvAnalytics.resumePresence();
    }
    if (!tutorialStarted && window.zvPlayerGate && typeof window.zvPlayerGate.startTutorial === "function") {
      tutorialStarted = true;
      window.zvPlayerGate.startTutorial();
    }
  }

  function syncInviteUi() {
    if (!isLivestreamTab()) {
      hideModal();
      return;
    }
    if (unlocked) {
      hideModal();
      return;
    }
    lockPlayer();
    if (nominatedFloatVisible()) {
      hideModal();
      return;
    }
    showModal();
  }

  function codesMatch(typed) {
    var expected = expectedInviteCode();
    if (expected && typed === expected) return true;
    try {
      if (btoa(typed) === INVITE_B64) return true;
    } catch (err) {}
    return false;
  }

  function tryUnlock(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!isLivestreamTab()) {
      hideModal();
      return;
    }

    var typed = normalizeInvite(input.value);
    if (!codesMatch(typed)) {
      setError("Incorrect invitation code.");
      try {
        input.focus();
        input.select();
      } catch (e) {}
      return;
    }
    unlockPlayer();
  }

  submit.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") tryUnlock(e);
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      e.preventDefault();
      input.focus();
    }
  });

  window.addEventListener("pilix:tabchange", function (e) {
    var tab = e && e.detail && e.detail.tab ? e.detail.tab : currentTab();
    clearBootTimer();
    if (tab === "ranker" || !isLivestreamTab()) {
      lockPlayer();
      hideModal();
      return;
    }
    // Back on livestream: require invitation again.
    unlocked = false;
    lockPlayer();
    syncInviteUi();
  });

  window.addEventListener("pilix:nominatedfloatopen", function () {
    hideModal();
  });

  window.addEventListener("pilix:nominatedfloatclose", function () {
    clearBootTimer();
    if (!isLivestreamTab()) {
      hideModal();
      return;
    }
    syncInviteUi();
  });

  function bootGate() {
    clearBootTimer();
    if (!isLivestreamTab()) {
      lockPlayer();
      hideModal();
      return;
    }
    lockPlayer();
    hideModal();
    // Wait for nominated float (async CSV) before prompting.
    bootTimer = setTimeout(function () {
      bootTimer = null;
      if (!isLivestreamTab() || unlocked) {
        hideModal();
        return;
      }
      syncInviteUi();
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootGate);
  } else {
    bootGate();
  }
})();
