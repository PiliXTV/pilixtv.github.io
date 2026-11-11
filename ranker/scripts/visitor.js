/* Floating visitor counter for pbbcollab3.github.io */
(function () {
  var COUNTER_URL = "https://abacus.jasoncameron.dev/hit/pilixtv/sitevisits";
  var SESSION_KEY = "pilixtv_visitor_number";

  function formatCount(n) {
    return Number(n).toLocaleString("en-US");
  }

  function renderCount(n) {
    var el = document.getElementById("visitor-count");
    var badge = document.getElementById("visitor-badge");
    if (!el || !badge) return;
    el.textContent = formatCount(n);
    badge.hidden = false;
    badge.setAttribute("aria-hidden", "false");
  }

  async function loadVisitorCount() {
    var cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      renderCount(cached);
      return;
    }

    try {
      var res = await fetch(COUNTER_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("Counter HTTP " + res.status);
      var data = await res.json();
      var value = data && data.value != null ? data.value : null;
      if (value == null) throw new Error("Missing counter value");
      sessionStorage.setItem(SESSION_KEY, String(value));
      renderCount(value);
    } catch (err) {
      console.error("Visitor counter failed:", err);
      var badge = document.getElementById("visitor-badge");
      if (badge) badge.hidden = true;
    }
  }

  document.addEventListener("DOMContentLoaded", loadVisitorCount);
})();
