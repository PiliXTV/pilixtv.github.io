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
    return document.body.getAttribute("data-app-tab") === "ranker" ? "ranker" : "livestream";
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
    if (currentTab() !== "livestream" || unlocked) return;
    if (nominatedFloatVisible()) return;
    modal.hidden = false;
    document.body.classList.add("invite-open");
    setError("");
    input.value = "";
    setTimeout(function () {
      try {
        input.focus();
        input.select();
      } catch (e) {}
    }, 40);
  }

  function hideModal() {
    modal.hidden = true;
    document.body.classList.remove("invite-open");
    setError("");
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
    if (currentTab() === "ranker") {
      hideModal();
      return;
    }
    // Livestream tab
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

  function tryUnlock(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (currentTab() !== "livestream") return;

    var typed = normalizeInvite(input.value);
    var expected = expectedInviteCode();
    if (!expected || typed !== expected) {
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
    if (tab === "ranker") {
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
    if (!unlocked) hideModal();
  });

  window.addEventListener("pilix:nominatedfloatclose", function () {
    syncInviteUi();
  });

  function bootGate() {
    if (currentTab() === "ranker") {
      lockPlayer();
      hideModal();
      return;
    }
    lockPlayer();
    hideModal();
    // Wait for nominated float (async CSV) before prompting.
    if (bootTimer) clearTimeout(bootTimer);
    bootTimer = setTimeout(function () {
      syncInviteUi();
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootGate);
  } else {
    bootGate();
  }
})();
