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

  // Wheel-of-fortune spin state (degrees) for each ring.
  var spin = { outer: 0, inner: 0 };
  var spinVel = { outer: 0, inner: 0 };
  var spinRaf = 0;
  var drag = null;
  var suppressClickUntil = 0;

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
    el.appendChild(bob);

    // Badge on the hex button (not bob) so bob's float filter cannot clip it.
    if (statusHighlight(hm, "immunity") && !hm.evicted) {
      var badge = document.createElement("span");
      badge.className = "hm-hex__badge";
      badge.title = "Immunity";
      badge.innerHTML = '<i class="fas fa-shield-halved" aria-hidden="true"></i>';
      el.appendChild(badge);
    }

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

  function applySpinCss() {
    if (outerRing) outerRing.style.setProperty("--spin", spin.outer + "deg");
    if (innerRing) innerRing.style.setProperty("--spin", spin.inner + "deg");
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
    // Tighter radius so inner hexes sit a little closer to each other.
    renderRing(innerRing, innerList, 0.24, "inner", nestPhase);
    applySpinCss();
  }

  function stagePoint(e) {
    var rect = stage.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var clientX = e.clientX;
    var clientY = e.clientY;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches[0]) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }
    var dx = clientX - cx;
    var dy = clientY - cy;
    return {
      dx: dx,
      dy: dy,
      dist: Math.sqrt(dx * dx + dy * dy),
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
      radius: rect.width / 2,
      t: performance.now(),
    };
  }

  function pickRing(dist, radius) {
    // Outer band vs inner band by distance from center.
    var norm = dist / Math.max(radius, 1);
    if (norm < 0.12) return null; // logo hub
    if (norm < 0.34) return "inner";
    return "outer";
  }

  function stopInertia() {
    if (spinRaf) {
      cancelAnimationFrame(spinRaf);
      spinRaf = 0;
    }
  }

  function tickInertia() {
    spinRaf = 0;
    var friction = 0.965;
    var minVel = 0.08;
    var moving = false;
    ["outer", "inner"].forEach(function (key) {
      if (Math.abs(spinVel[key]) > minVel) {
        spin[key] += spinVel[key];
        spinVel[key] *= friction;
        moving = true;
      } else {
        spinVel[key] = 0;
      }
    });
    applySpinCss();
    if (moving) spinRaf = requestAnimationFrame(tickInertia);
  }

  function startInertia() {
    stopInertia();
    spinRaf = requestAnimationFrame(tickInertia);
  }

  function onPointerDown(e) {
    if (!stage || e.button === 2) return;
    // Ignore filter chips etc.
    if (e.target.closest && e.target.closest(".hm-chip")) return;
    var pt = stagePoint(e);
    var ring = pickRing(pt.dist, pt.radius);
    if (!ring) return;

    stopInertia();
    spinVel.outer = 0;
    spinVel.inner = 0;
    drag = {
      ring: ring,
      lastAngle: pt.angle,
      lastT: pt.t,
      moved: 0,
      pointerId: e.pointerId,
    };
    stage.classList.add("is-spinning");
    try {
      stage.setPointerCapture(e.pointerId);
    } catch (err) {}
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!drag) return;
    var pt = stagePoint(e);
    var delta = pt.angle - drag.lastAngle;
    // Unwrap across ±180 so swipe stays smooth.
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    spin[drag.ring] += delta;
    var dt = Math.max(1, pt.t - drag.lastT);
    // deg per frame-ish velocity for inertia
    spinVel[drag.ring] = delta * (16 / dt) * 1.15;
    drag.moved += Math.abs(delta);
    drag.lastAngle = pt.angle;
    drag.lastT = pt.t;
    applySpinCss();
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!drag) return;
    if (drag.moved > 4) {
      suppressClickUntil = performance.now() + 350;
      startInertia();
    }
    drag = null;
    stage.classList.remove("is-spinning");
    try {
      if (e.pointerId != null) stage.releasePointerCapture(e.pointerId);
    } catch (err) {}
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
    stage.addEventListener("pointerdown", onPointerDown);
    stage.addEventListener("pointermove", onPointerMove);
    stage.addEventListener("pointerup", onPointerUp);
    stage.addEventListener("pointercancel", onPointerUp);
    stage.addEventListener("lostpointercapture", function () {
      if (drag) {
        if (drag.moved > 4) startInertia();
        drag = null;
        stage.classList.remove("is-spinning");
      }
    });

    stage.addEventListener("click", function (e) {
      if (performance.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
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
