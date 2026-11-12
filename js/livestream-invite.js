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

  function currentTab() {
    return document.body.getAttribute("data-app-tab") === "ranker" ? "ranker" : "livestream";
  }

  function encodeInvite(value) {
    try {
      return btoa(unescape(encodeURIComponent(String(value || "").trim())));
    } catch (err) {
      return "";
    }
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

  function showModal() {
    modal.hidden = false;
    document.body.classList.add("invite-open");
    setError("");
    input.value = "";
    setTimeout(function () {
      try {
        input.focus();
      } catch (e) {}
    }, 30);
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

  function applyTab(tab) {
    if (tab === "ranker") {
      lockPlayer();
      hideModal();
      return;
    }
    // Livestream tab: always require a fresh code after leaving Ranker / on entry.
    if (!unlocked) {
      lockPlayer();
      showModal();
    }
  }

  function tryUnlock() {
    var encoded = encodeInvite(input.value);
    if (!encoded || encoded !== INVITE_B64) {
      setError("Incorrect invitation code.");
      input.select();
      return;
    }
    unlockPlayer();
  }

  submit.addEventListener("click", tryUnlock);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      tryUnlock();
    }
  });

  // Block backdrop dismiss — invitation is required.
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      e.preventDefault();
      input.focus();
    }
  });

  window.addEventListener("pilix:tabchange", function (e) {
    var tab = e && e.detail && e.detail.tab ? e.detail.tab : currentTab();
    // Switching to livestream always re-locks (even if previously unlocked this page load).
    if (tab === "livestream") {
      unlocked = false;
    }
    applyTab(tab);
  });

  // Initial state after tabs script sets data-app-tab.
  function bootGate() {
    lockPlayer();
    applyTab(currentTab());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootGate);
  } else {
    bootGate();
  }
})();
