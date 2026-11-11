var housemates = [];
var filteredHousemates = [];
var ranking = [];
// Parsed from the URL immediately (before CSV load) so share links never race.
var pendingRankingIds = null;

document.addEventListener("DOMContentLoaded", async function () {
  ranking = newRanking();
  pendingRankingIds = parseRankingIdsFromUrl();
  await readFromCSV("/ranker/housemate_info.csv?v=3.0.20");
  if (pendingRankingIds) {
    applyRankingIds(pendingRankingIds);
  }
  populateRanking();
  rerenderTable();
  if (typeof maybeShowNominatedFloat === "function") {
    maybeShowNominatedFloat();
  }
});

function newRanking() {
  let list = new Array(8);
  for (let i = 0; i < list.length; i++) {
    list[i] = newHousemate();
  }
  return list;
}

async function readFromCSV(path) {
  const response = await fetch(path);
  if (!response.ok) {
    console.error("Failed to fetch CSV. HTTP Status:", response.status);
    return;
  }
  const allText = await response.text();
  const csvData = CSV.parse(allText);
  convertCSVArrayToHousemateData(csvData);
  populateTable(filteredHousemates);
}

function convertCSVArrayToHousemateData(csvArrays) {
  housemates = csvArrays.map(function (housemateArray) {
    if (!housemateArray || housemateArray.length < 8) {
      return newHousemate();
    }
    const status = (housemateArray[6] || "s").toLowerCase();
    const housemate = {
      fullname: housemateArray[0],
      shortname: housemateArray[1],
      agency: housemateArray[2],
      location: housemateArray[3],
      agencycolor: housemateArray[4],
      agencysm: housemateArray[4] === "A",
      agencysp: housemateArray[4] === "B",
      age: housemateArray[5],
      status: status,
      evicted: status === "e",
      nominated: status === "n",
      immunity: status === "i",
      safe: status === "s" || status === "i",
      big4: status === "b",
      id: parseInt(housemateArray[7], 10) - 1,
      image: housemateArray[1].toLowerCase() + ".png",
      selected: false,
    };
    return housemate;
  });

  // Restore selected flags from ranking
  ranking.forEach((hm) => {
    if (hm && hm.id >= 0) {
      const found = findHousemateById(hm.id);
      if (found.id >= 0) found.selected = true;
    }
  });

  filteredHousemates = housemates.slice();
  if (!activeCompares.includes(evictedAtBottomCompare)) {
    activeCompares.push(evictedAtBottomCompare);
  }
  filteredHousemates = sortedHousemates(filteredHousemates);
  return housemates;
}

function newHousemate() {
  return {
    id: -1,
    fullname: "&#8203;",
    shortname: "&#8203;",
    location: "&#8203;",
    age: "&#8203;",
    agency: "",
    agencycolor: "no",
    image: "emptyrank.png",
    selected: false,
    evicted: false,
    nominated: false,
    immunity: false,
    safe: false,
  };
}

function findHousemateById(id) {
  for (let i = 0; i < housemates.length; i++) {
    if (id === housemates[i].id) return housemates[i];
  }
  return newHousemate();
}

function parseRankingIdsFromUrl() {
  var urlParams = new URLSearchParams(window.location.search);
  var raw = urlParams.get("r");
  if (!raw) {
    // Fallback: allow hash links like #r=2-3-5-6-0-1-4-7
    var hash = window.location.hash || "";
    var hashMatch = hash.match(/[#&?]r=([^&]+)/);
    if (hashMatch) raw = decodeURIComponent(hashMatch[1]);
  }
  if (!raw) return null;

  var ids = decodeRankingPayload(raw);
  if (!ids || ids.length === 0) return null;
  while (ids.length < 8) ids.push(-1);
  return ids.slice(0, 8);
}

function decodeRankingPayload(raw) {
  // New format: 2-3-5-6-0-1-4-7 (x or empty = blank slot). Avoids base64 mangling.
  if (/^[\dxX,\-_.]+$/.test(raw) && raw.length <= 40) {
    var parts = raw.split(/[-_,.]/);
    if (parts.length >= 1 && parts.length <= 8) {
      return parts.map(function (part) {
        if (!part || part.toLowerCase() === "x") return -1;
        var n = parseInt(part, 10);
        return Number.isNaN(n) ? -1 : n;
      });
    }
  }

  // Legacy base64 format: pairs of digits / XX, e.g. btoa("02030506...")
  var rankString = null;
  try {
    rankString = atob(raw);
  } catch (err) {
    try {
      rankString = atob(decodeURIComponent(raw));
    } catch (err2) {
      console.error("Could not decode share link ranking:", err2);
      return null;
    }
  }
  if (!rankString) return null;

  var rankingIds = [];
  for (var i = 0; i < rankString.length; i += 2) {
    var token = rankString.substr(i, 2);
    if (token === "XX" || token === "xx") rankingIds.push(-1);
    else {
      var id = parseInt(token, 10);
      rankingIds.push(Number.isNaN(id) ? -1 : id);
    }
  }
  return rankingIds;
}

function applyRankingIds(rankingIds) {
  for (var i = 0; i < rankingIds.length && i < ranking.length; i++) {
    var housemateId = rankingIds[i];
    if (housemateId < 0 || Number.isNaN(housemateId)) {
      ranking[i] = newHousemate();
      continue;
    }
    var housemate = findHousemateById(housemateId);
    if (housemate.id >= 0) {
      housemate.selected = true;
      ranking[i] = housemate;
    } else {
      ranking[i] = newHousemate();
    }
  }
}

function rerenderTable() {
  clearTable();
  populateTable(filteredHousemates);
}

function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function clearTable() {
  removeAllChildren(document.getElementById("table__entry-container"));
}

function clearRanking() {
  let ranking_chart = document.getElementById("ranking__pyramid");
  let rankRows = Array.from(ranking_chart.children).slice(1);
  rankRows.forEach((row) => removeAllChildren(row));
}

function clearRanking2() {
  let ranking_chart2 = document.getElementById("ranking__pyramid2");
  let rankRows2 = Array.from(ranking_chart2.children).slice(1);
  rankRows2.forEach((row) => removeAllChildren(row));
}

function statusLabel(housemate) {
  if (housemate.evicted) return { text: "Evicted", cls: "status-evicted" };
  if (housemate.nominated) return { text: "Nominated", cls: "status-nominated" };
  if (housemate.immunity) return { text: "Immunity", cls: "status-immunity" };
  return { text: "Safe", cls: "status-safe" };
}

function populateTable(list) {
  let table = document.getElementById("table__entry-container");
  if (!list.length) {
    table.insertAdjacentHTML(
      "beforeend",
      '<div class="table__empty">No housemates match this filter yet.</div>'
    );
    return;
  }
  for (let i = 0; i < list.length; i++) {
    table.insertAdjacentHTML("beforeend", populateTableEntry(list[i]));
    let insertedEntry = table.lastChild;
    insertedEntry.addEventListener("click", function () {
      tableClicked(list[i]);
    });
  }
}

function populateTableEntry(housemate) {
  let evictedClass = housemate.evicted ? "evicted" : "";
  let nominated = housemate.nominated;
  let immunity = housemate.immunity;
  let status = statusLabel(housemate);

  return `
    <div class="table__entry ${evictedClass}">
      <div class="table__entry-icon">
        <img class="table__entry-img" src="/ranker/assets/housemates/${housemate.image}" alt="${housemate.shortname}" />
        <div class="table__entry-icon-border ${housemate.agencycolor.toLowerCase()}-rank-border"></div>
        ${nominated ? '<div class="table__entry-nominated"></div>' : ""}
        ${immunity ? '<div class="table__entry-immunity"></div>' : ""}
        ${housemate.selected ? '<img class="table__entry-check" src="/ranker/assets/check.png" alt="selected"/>' : ""}
      </div>
      <div class="table__entry-text">
        <span class="fullname"><strong>${housemate.fullname}</strong></span>
        <span class="agency">(${housemate.agency})</span>
        <span class="ageandlocation">${housemate.age} • ${housemate.location.toUpperCase()}</span>
        <span class="status-pill ${status.cls}">${status.text}</span>
      </div>
    </div>`;
}

function populateRankingEntry(housemate, displayRank, absoluteIndex) {
  let evictedClass = housemate.evicted ? "evicted" : "";
  let badgeClass = housemate.agencycolor === "A" ? "bg-a" : housemate.agencycolor === "B" ? "bg-b" : "bg-no";
  let nominated = housemate.nominated;
  let immunity = housemate.immunity;

  return `
    <div class="ranking__entry-view ${evictedClass}">
      <div class="ranking__entry-icon">
        <img class="ranking__entry-img" src="/ranker/assets/housemates/${housemate.image}" alt="${housemate.shortname}" />
        <div class="ranking__entry-icon-border ${housemate.agencycolor.toLowerCase()}-rank-border" data-rankid="${absoluteIndex}"></div>
        ${nominated ? '<div class="ranking__entry-nominated"></div>' : ""}
        ${immunity ? '<div class="ranking__entry-immunity"></div>' : ""}
        <div class="ranking__entry-icon-badge ${badgeClass}">${displayRank}</div>
      </div>
    </div>`;
}

function addHousemateToRank(rankRow, housemate, displayRank, absoluteIndex, clickHandler) {
  rankRow.insertAdjacentHTML("beforeend", populateRankingEntry(housemate, displayRank, absoluteIndex));

  let insertedEntry = rankRow.lastChild;
  let dragIcon = insertedEntry.children[0];
  let iconBorder = dragIcon.children[1];

  if (housemate.id >= 0) {
    insertedEntry.addEventListener("click", function () {
      clickHandler(housemate);
    });
    dragIcon.setAttribute("draggable", true);
    dragIcon.classList.add("drag-cursor");
    dragIcon.addEventListener("dragstart", createDragStartListener(absoluteIndex));
  }

  iconBorder.addEventListener("dragenter", createDragEnterListener());
  iconBorder.addEventListener("dragleave", createDragLeaveListener());
  iconBorder.addEventListener("dragover", createDragOverListener());
  iconBorder.addEventListener("drop", function (event) {
    event.preventDefault();
    removeClass(event.target, draggedOverClass);
    const draggedRank = parseInt(event.dataTransfer.getData(rankIndex), 10);
    const droppedRank = parseInt(event.target.getAttribute("data-rankid"), 10);

    // Only allow swaps within the same team pyramid (0-3 Kapamilya, 4-7 Kapuso)
    const sourceTeam = draggedRank < 4 ? "A" : "B";
    const targetTeam = droppedRank < 4 ? "A" : "B";
    if (sourceTeam !== targetTeam) return;

    swapHousemates(draggedRank, droppedRank);
  });
}

function populateRanking() {
  clearRanking();
  clearRanking2();

  let rankRowsA = Array.from(document.getElementById("ranking__pyramid").children).slice(1);
  let rankRowsB = Array.from(document.getElementById("ranking__pyramid2").children).slice(1);

  for (let i = 0; i < 4; i++) {
    let hm = ranking[i] && ranking[i].id >= 0 ? ranking[i] : newHousemate();
    addHousemateToRank(rankRowsA[i], hm, i + 1, i, rankingClickedA);
  }
  for (let i = 0; i < 4; i++) {
    let hm = ranking[i + 4] && ranking[i + 4].id >= 0 ? ranking[i + 4] : newHousemate();
    addHousemateToRank(rankRowsB[i], hm, i + 1, i + 4, rankingClickedB);
  }
}

function tableClicked(housemate) {
  if (housemate.selected) {
    removeHousemateFromRanking(housemate);
    housemate.selected = false;
  } else {
    const added = addHousemateToRanking(housemate);
    if (!added) return;
    housemate.selected = true;
  }
  rerenderTable();
  populateRanking();
}

function rankingClickedA(housemate) {
  removeFromPyramid(housemate, 0, 4);
}

function rankingClickedB(housemate) {
  removeFromPyramid(housemate, 4, 8);
}

function removeFromPyramid(housemate, start, end) {
  for (let i = start; i < end; i++) {
    if (ranking[i].id === housemate.id) {
      ranking[i] = newHousemate();
      break;
    }
  }
  housemate.selected = false;
  rerenderTable();
  populateRanking();
}

function removeHousemateFromRanking(housemate) {
  for (let i = 0; i < ranking.length; i++) {
    if (ranking[i].id === housemate.id) {
      ranking[i] = newHousemate();
      return;
    }
  }
}

function addHousemateToRanking(housemate) {
  const start = housemate.agencysm ? 0 : 4;
  const end = start + 4;
  for (let i = start; i < end; i++) {
    if (ranking[i].id === -1) {
      ranking[i] = housemate;
      return true;
    }
  }
  alert(
    housemate.agencysm
      ? "Kapamilya Big 4 is already full!"
      : "Kapuso Big 4 is already full!"
  );
  return false;
}

function swapHousemates(fromIndex, toIndex) {
  if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return;
  if (fromIndex === toIndex) return;
  let temp = ranking[fromIndex];
  ranking[fromIndex] = ranking[toIndex];
  ranking[toIndex] = temp;
  populateRanking();
}

function generateShareLink() {
  var parts = [];
  for (var i = 0; i < ranking.length; i++) {
    parts.push(ranking[i].id < 0 ? "x" : String(ranking[i].id));
  }
  // Plain IDs survive copy/paste and chat apps better than base64 padding.
  var payload = parts.join("-");
  var path = window.location.pathname;
  if (!path || path === "") path = "/";
  var link = window.location.origin + path + "?tab=ranker&r=" + encodeURIComponent(payload);
  var textbox = document.getElementById("getlink-textbox");
  var copyBtn = document.getElementById("copylink-button");
  textbox.style.display = "inline-block";
  copyBtn.style.display = "inline-block";
  textbox.value = link;
}

function copyLink() {
  let textbox = document.getElementById("getlink-textbox");
  textbox.select();
  textbox.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(textbox.value).then(() => {
    let copyBtn = document.getElementById("copylink-button");
    copyBtn.value = "Copied";
    setTimeout(() => {
      copyBtn.value = "Copy";
    }, 1200);
  });
}
