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
  var emptyEl = document.getElementById("hm-profile-empty");
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

  function activeStatusKeys() {
    return Object.keys(statusFilters).filter(function (k) {
      return statusFilters[k];
    });
  }

  function matchesFilters(hm) {
    var keys = activeStatusKeys();
    if (!keys.length) return true;
    return keys.some(function (k) {
      return Boolean(hm[k]);
    });
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

  function hexClass(hm) {
    var parts = ["hm-hex"];
    parts.push(hm.kapamilya ? "hm-hex--kapamilya" : "hm-hex--kapuso");
    if (hm.evicted) parts.push("hm-hex--evicted");
    else if (hm.safe) parts.push("hm-hex--safe");
    if (hm.nominated) parts.push("hm-hex--nominated");
    if (hm.immunity) parts.push("hm-hex--immunity");
    if (selectedId === hm.id) parts.push("is-active");
    return parts.join(" ");
  }

  function makeHex(hm, index, total, radiusFactor) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = hexClass(hm);
    el.style.setProperty("--i", String(index));
    el.style.setProperty("--n", String(Math.max(total, 1)));
    el.style.setProperty("--radius-factor", String(radiusFactor));
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

    var nick = document.createElement("span");
    nick.className = "hm-hex__nickname";
    nick.textContent = hm.shortname;
    photo.appendChild(nick);

    frame.appendChild(photo);

    if (hm.nominated && !hm.evicted) {
      var stamp = document.createElement("span");
      stamp.className = "hm-hex__stamp";
      stamp.textContent = "Nominated";
      frame.appendChild(stamp);
    }

    if (hm.immunity && !hm.evicted) {
      var badge = document.createElement("span");
      badge.className = "hm-hex__badge";
      badge.title = "Immunity";
      badge.innerHTML = '<i class="fas fa-shield-halved" aria-hidden="true"></i>';
      frame.appendChild(badge);
    }

    bob.appendChild(frame);
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

  function renderRing(container, list, radiusFactor) {
    if (!container) return;
    container.innerHTML = "";
    var n = list.length;
    if (!n) return;
    list.forEach(function (hm, i) {
      container.appendChild(makeHex(hm, i, n, radiusFactor));
    });
  }

  function renderRings() {
    var visible = housemates.filter(matchesFilters);
    var kapamilya = visible.filter(function (hm) {
      return hm.kapamilya;
    });
    var kapuso = visible.filter(function (hm) {
      return hm.kapuso;
    });

    var outerList = outerTeam === "kapamilya" ? kapamilya : kapuso;
    var innerList = outerTeam === "kapamilya" ? kapuso : kapamilya;

    if (emptyEl) {
      emptyEl.hidden = visible.length > 0;
    }

    renderRing(outerRing, outerList, 0.42);
    renderRing(innerRing, innerList, 0.26);

    if (selectedId != null) {
      var still = visible.some(function (hm) {
        return hm.id === selectedId;
      });
      if (!still) {
        selectedId = null;
        if (detail) detail.classList.remove("is-open");
      }
    }
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
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.textContent = "Could not load housemate profiles.";
      }
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
