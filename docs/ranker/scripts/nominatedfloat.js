/* global housemates, exportCardKey, EXPORT_CARD_DIR, ensureExportFonts */

function getNominatedByTeam() {
  var kapamilya = [];
  var kapuso = [];
  (housemates || []).forEach(function (hm) {
    if (!hm || !hm.nominated || hm.id < 0) return;
    if (hm.agencysm) kapamilya.push(hm);
    else if (hm.agencysp) kapuso.push(hm);
  });
  kapamilya.sort(function (a, b) {
    return a.id - b.id;
  });
  kapuso.sort(function (a, b) {
    return a.id - b.id;
  });
  return { kapamilya: kapamilya, kapuso: kapuso };
}

function nominatedCardSrc(housemate) {
  var key =
    typeof exportCardKey === "function" ? exportCardKey(housemate) : null;
  if (!key) return null;
  var dir = typeof EXPORT_CARD_DIR === "string" ? EXPORT_CARD_DIR : "/ranker/assets/export/cards/";
  return dir + key + ".png";
}

function renderNominatedCards(container, list) {
  if (!container) return;
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML =
      '<p class="nominated-float__empty">No nominated housemates</p>';
    return;
  }
  list.forEach(function (hm) {
    var src = nominatedCardSrc(hm);
    var figure = document.createElement("figure");
    figure.className = "nominated-float__card";
    if (src) {
      var img = document.createElement("img");
      img.src = src;
      img.alt = hm.shortname || hm.fullname || "Nominated housemate";
      img.loading = "eager";
      figure.appendChild(img);
    } else {
      figure.classList.add("nominated-float__card--fallback");
      figure.textContent = (hm.shortname || "?").toUpperCase();
    }
    container.appendChild(figure);
  });
}

function populateNominatedFloat() {
  var groups = getNominatedByTeam();
  renderNominatedCards(
    document.getElementById("nominated-float-kapamilya"),
    groups.kapamilya
  );
  renderNominatedCards(
    document.getElementById("nominated-float-kapuso"),
    groups.kapuso
  );
  return groups.kapamilya.length + groups.kapuso.length;
}

function openNominatedFloat() {
  var modal = document.getElementById("nominated-float");
  if (!modal) return;
  var count = populateNominatedFloat();
  if (count === 0) return;

  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("nominated-float-open");

  var closeBtn = document.getElementById("nominated-float-close");
  if (closeBtn) closeBtn.focus();
  try {
    window.dispatchEvent(new CustomEvent("pilix:nominatedfloatopen"));
  } catch (err) {}
}

function closeNominatedFloat() {
  var modal = document.getElementById("nominated-float");
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("nominated-float-open");
  try {
    window.dispatchEvent(new CustomEvent("pilix:nominatedfloatclose"));
  } catch (err) {}
}

async function maybeShowNominatedFloat() {
  var count = populateNominatedFloat();
  if (count === 0) return;
  if (typeof ensureExportFonts === "function") {
    try {
      await ensureExportFonts();
    } catch (err) {
      // Titles still render with fallback fonts.
    }
  }
  openNominatedFloat();
}

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  var modal = document.getElementById("nominated-float");
  if (modal && !modal.hidden) closeNominatedFloat();
});
