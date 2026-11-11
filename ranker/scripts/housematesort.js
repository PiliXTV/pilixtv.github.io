var activeCompares = [idCompare];
var activeStatusFilter = "all";
var showEvicted = true;
var showNominated = true;
var showImmunity = true;

function idCompare(housemate1, housemate2) {
  if (housemate1.id < housemate2.id) return -1;
  if (housemate1.id > housemate2.id) return 1;
  return 0;
}

function evictedAtBottomCompare(housemate1, housemate2) {
  if (housemate1.evicted && !housemate2.evicted) return 1;
  if (!housemate1.evicted && housemate2.evicted) return -1;
  return 0;
}

function combinedCompare(housemate1, housemate2) {
  let finalCompare = 0;
  for (let compareFunc of activeCompares) {
    let result = compareFunc(housemate1, housemate2);
    if (result != 0) finalCompare = result;
  }
  return finalCompare;
}

function sortedHousemates(list) {
  let sorted = list.slice();
  sorted.sort(combinedCompare);
  return sorted;
}

function matchesStatusFilter(housemate, filter) {
  switch (filter) {
    case "all":
      return true;
    case "kapamilya":
      return housemate.agencysm;
    case "kapuso":
      return housemate.agencysp;
    case "nominated":
      return housemate.nominated;
    case "evicted":
      return housemate.evicted;
    case "immunity":
      return housemate.immunity;
    case "safe":
      return housemate.safe && !housemate.evicted;
    default:
      return true;
  }
}

function setStatusFilter(filter, button) {
  activeStatusFilter = filter;
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.toggle("is-active", chip === button);
  });

  const searchValue = document.getElementById("table__filter-input").value.toLowerCase();
  filteredHousemates = housemates.filter((hm) => {
    const matchesSearch =
      !searchValue ||
      hm.fullname.toLowerCase().includes(searchValue) ||
      hm.shortname.toLowerCase().includes(searchValue) ||
      hm.agency.toLowerCase().includes(searchValue) ||
      hm.location.toLowerCase().includes(searchValue);
    return matchesSearch && matchesStatusFilter(hm, activeStatusFilter);
  });

  sortRenderTable();
}

function sortRenderTable() {
  filteredHousemates = sortedHousemates(filteredHousemates);
  if (activeStatusFilter === "evicted" || activeCompares.includes(evictedAtBottomCompare)) {
    // keep order
  }
  if (!activeCompares.includes(evictedAtBottomCompare)) {
    activeCompares.push(evictedAtBottomCompare);
  }
  filteredHousemates = sortedHousemates(filteredHousemates);
  rerenderTable();
}

function filterHousemates(event) {
  const searchValue = event.target.value.toLowerCase();
  filteredHousemates = housemates.filter((hm) => {
    const matchesSearch =
      !searchValue ||
      hm.fullname.toLowerCase().includes(searchValue) ||
      hm.shortname.toLowerCase().includes(searchValue) ||
      hm.agency.toLowerCase().includes(searchValue) ||
      hm.location.toLowerCase().includes(searchValue);
    return matchesSearch && matchesStatusFilter(hm, activeStatusFilter);
  });
  sortRenderTable();
}
