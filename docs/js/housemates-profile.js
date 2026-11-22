/* PBB Collab 3.0 Housemates Profile — dual hexagon rings */
(function () {
  var CSV_URL = "/ranker/housemate_info.csv?v=3.0.26";
  var IMG_DIR = "/ranker/assets/housemates/";
  var panel = document.getElementById("panel-profiles");
  if (!panel) return;

  var stage = document.getElementById("hm-orbit-stage");
  var outerRing = document.getElementById("hm-orbit-outer");
  var innerRing = document.getElementById("hm-orbit-inner");
  var detail = document.getElementById("hm-profile-detail");
  var filterRoot = document.getElementById("hm-profile-filters");

  var housemates = [];
  var outerTeam = "kapamilya";
  var statusFilters = {};
  var selectedId = null;
  var loaded = false;
  var byId = {};

  function parseCsvLine(line) {
    var out = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function statusFlags(status) {
    var s = String(status || "s").toLowerCase();
    return {
      status: s,
      safe: s === "s",
      nominated: s === "n",
      immunity: s === "i",
      evicted: s === "e",
    };
  }

  function parseHousemates(text) {
    return text
      .split(/\r?\n/)
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean)
      .map(function (line) {
        var cols = parseCsvLine(line);
        if (!cols || cols.length < 8) return null;
        var flags = statusFlags(cols[6]);
        var agency = String(cols[2] || "").toLowerCase();
        var color = String(cols[4] || "").toUpperCase();
        var shortname = cols[1] || "";
        return {
          fullname: cols[0] || "",
          shortname: shortname,
          agency: cols[2] || "",
          location: cols[3] || "",
          age: cols[5] || "",
          id: parseInt(cols[7], 10),
          moniker: cols[8] || "",
          birthday: cols[9] || "",
          image: IMG_DIR + shortname.toLowerCase() + ".png",
          kapamilya: color === "A" || agency.indexOf("kapamilya") !== -1,
          kapuso: color === "B" || agency.indexOf("kapuso") !== -1,
          status: flags.status,
          safe: flags.safe,
          nominated: flags.nominated,
          immunity: flags.immunity,
          evicted: flags.evicted,
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return a.id - b.id;
      });
  }

  function statusHighlight(hm, key) {
    if (key === "safe") {
      // Immunity counts as safe for green borders.
      return Boolean(statusFilters.safe && (hm.safe || hm.immunity));
    }
    return Boolean(statusFilters[key] && hm[key]);
  }

  function wantsSafeBorder(hm) {
    if (hm.evicted) return false;
    if (statusHighlight(hm, "safe")) return true;
    // Immunity filter alone also greens the border (immunity = safe).
    if (statusHighlight(hm, "immunity")) return true;
    return false;
  }

  function statusLabel(hm) {
    if (hm.evicted) return "Evicted";
    if (hm.nominated) return "Nominated";
    if (hm.immunity) return "With Immunity";
    return "Safe";
  }

  function statusKey(hm) {
    if (hm.evicted) return "evicted";
    if (hm.nominated) return "nominated";
    if (hm.immunity) return "immunity";
    return "safe";
  }

  function hexClass(hm, ring) {
    var parts = ["hm-hex", ring === "outer" ? "hm-hex--outer" : "hm-hex--inner"];
    parts.push(hm.kapamilya ? "hm-hex--kapamilya" : "hm-hex--kapuso");
    // Status chrome only when that status filter is active — never hide housemates.
    if (statusHighlight(hm, "evicted")) parts.push("hm-hex--evicted");
    else if (wantsSafeBorder(hm)) parts.push("hm-hex--safe");
    if (statusHighlight(hm, "nominated")) parts.push("hm-hex--nominated");
    if (statusHighlight(hm, "immunity")) parts.push("hm-hex--immunity");
    if (selectedId === hm.id) parts.push("is-active");
    return parts.join(" ");
  }

  function makeHex(hm, index, total, radiusFactor, ring, phaseDeg) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = hexClass(hm, ring);
    el.style.setProperty("--i", String(index));
    el.style.setProperty("--n", String(Math.max(total, 1)));
    el.style.setProperty("--radius-factor", String(radiusFactor));
    el.style.setProperty("--phase", String(phaseDeg || 0) + "deg");
    el.setAttribute("aria-label", hm.fullname + " profile");
    el.dataset.id = String(hm.id);

    var bob = document.createElement("div");
    bob.className = "hm-hex__bob";

    var frame = document.createElement("div");
    frame.className = "hm-hex__frame";

    var photo = document.createElement("div");
    photo.className = "hm-hex__photo";

    var img = document.createElement("img");
    img.src = hm.image;
    img.alt = hm.shortname;
    img.loading = "lazy";
    img.draggable = false;
    photo.appendChild(img);
    frame.appendChild(photo);

    var nick = document.createElement("span");
    nick.className = "hm-hex__nickname";
    nick.textContent = hm.shortname;
    frame.appendChild(nick);

    if (statusHighlight(hm, "nominated") && !hm.evicted) {
      var stamp = document.createElement("span");
      stamp.className = "hm-hex__stamp";
      stamp.textContent = "Nominated";
      frame.appendChild(stamp);
    }

    bob.appendChild(frame);

    // Badge sits outside the clipped frame so it stays in front on the flat top.
    if (statusHighlight(hm, "immunity") && !hm.evicted) {
      var badge = document.createElement("span");
      badge.className = "hm-hex__badge";
      badge.title = "Immunity";
      badge.innerHTML = '<i class="fas fa-shield-halved" aria-hidden="true"></i>';
      bob.appendChild(badge);
    }

    el.appendChild(bob);
    return el;
  }

  function selectHousemate(id) {
    var hm = byId[id];
    if (!hm) return;
    selectedId = hm.id;
    renderDetail(hm);
    renderRings();
    if (detail) {
      try {
        detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } catch (err) {}
    }
  }

  function renderRing(container, list, radiusFactor, ring, phaseDeg) {
    if (!container) return;
    container.innerHTML = "";
    var n = list.length;
    if (!n) return;
    list.forEach(function (hm, i) {
      container.appendChild(makeHex(hm, i, n, radiusFactor, ring, phaseDeg));
    });
  }

  function renderRings() {
    // Always show every housemate; status chips only restyle borders/badges.
    var kapamilya = housemates.filter(function (hm) {
      return hm.kapamilya;
    });
    var kapuso = housemates.filter(function (hm) {
      return hm.kapuso;
    });

    var outerList = outerTeam === "kapamilya" ? kapamilya : kapuso;
    var innerList = outerTeam === "kapamilya" ? kapuso : kapamilya;
    // Half-step of the outer ring so inner hexes sit between outer ones.
    var nestPhase = outerList.length ? 180 / outerList.length : 0;

    renderRing(outerRing, outerList, 0.43, "outer", 0);
    renderRing(innerRing, innerList, 0.29, "inner", nestPhase);
  }

  function renderDetail(hm) {
    if (!detail || !hm) return;
    detail.classList.add("is-open");
    detail.style.setProperty("--detail-border", hm.kapamilya ? "#dc2626" : "#2563eb");
    detail.innerHTML =
      '<div class="hm-profile-detail__head">' +
      '<div class="hm-profile-detail__photo"><img src="' +
      hm.image +
      '" alt="' +
      escapeHtml(hm.shortname) +
      '" /></div>' +
      '<div class="hm-profile-detail__meta">' +
      "<h2>" +
      escapeHtml(hm.fullname) +
      "</h2>" +
      '<p class="hm-profile-detail__moniker">' +
      escapeHtml(hm.moniker || "—") +
      "</p>" +
      "</div></div>" +
      '<div class="hm-profile-detail__grid">' +
      '<div class="hm-profile-detail__item"><span>Full Name</span><strong>' +
      escapeHtml(hm.fullname || "—") +
      "</strong></div>" +
      '<div class="hm-profile-detail__item"><span>Nickname</span><strong>' +
      escapeHtml(hm.shortname || "—") +
      "</strong></div>" +
      '<div class="hm-profile-detail__item hm-profile-detail__item--wide"><span>Monicker</span><strong>' +
      escapeHtml(hm.moniker || "—") +
      "</strong></div>" +
      '<div class="hm-profile-detail__item"><span>Age</span><strong>' +
      escapeHtml(hm.age || "—") +
      "</strong></div>" +
      '<div class="hm-profile-detail__item"><span>Birthday</span><strong>' +
      escapeHtml(hm.birthday || "—") +
      "</strong></div>" +
      '<div class="hm-profile-detail__item hm-profile-detail__item--wide"><span>Location / Address</span><strong>' +
      escapeHtml(hm.location || "—") +
      "</strong></div>" +
      '<div class="hm-profile-detail__item"><span>Team</span><strong>' +
      escapeHtml(hm.agency || "—") +
      "</strong></div>" +
      "</div>" +
      '<div class="hm-profile-detail__status" data-status="' +
      statusKey(hm) +
      '">' +
      escapeHtml(statusLabel(hm)) +
      "</div>";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function syncFilterUi() {
    if (!filterRoot) return;
    filterRoot.querySelectorAll(".hm-chip[data-team]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-team") === outerTeam);
    });
    filterRoot.querySelectorAll(".hm-chip[data-status]").forEach(function (btn) {
      var key = btn.getAttribute("data-status");
      btn.classList.toggle("is-active", Boolean(statusFilters[key]));
    });
  }

  function onFilterClick(e) {
    var btn = e.target.closest(".hm-chip");
    if (!btn || !filterRoot.contains(btn)) return;
    var team = btn.getAttribute("data-team");
    var status = btn.getAttribute("data-status");
    if (team) {
      outerTeam = team;
    } else if (status) {
      statusFilters[status] = !statusFilters[status];
    }
    syncFilterUi();
    renderRings();
  }

  async function load() {
    if (loaded) return;
    try {
      var res = await fetch(CSV_URL);
      if (!res.ok) throw new Error("CSV " + res.status);
      var text = await res.text();
      housemates = parseHousemates(text);
      byId = {};
      housemates.forEach(function (hm) {
        byId[hm.id] = hm;
      });
      loaded = true;
      syncFilterUi();
      renderRings();
    } catch (err) {
      console.error("Housemates profile failed to load:", err);
    }
  }

  if (filterRoot) {
    filterRoot.addEventListener("click", onFilterClick);
  }

  if (stage) {
    stage.addEventListener("click", function (e) {
      var hex = e.target.closest(".hm-hex");
      if (!hex || !stage.contains(hex)) return;
      var id = parseInt(hex.dataset.id, 10);
      if (!isNaN(id)) selectHousemate(id);
    });
  }

  window.addEventListener("pilix:tabchange", function (ev) {
    if (ev && ev.detail && ev.detail.tab === "profiles") {
      load();
    }
  });

  if (document.body.getAttribute("data-app-tab") === "profiles" || (panel && !panel.hidden)) {
    load();
  } else {
    // Prefetch so the first visit is instant.
    load();
  }
})();
