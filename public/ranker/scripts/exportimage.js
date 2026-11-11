/* global ranking */

var EXPORT_WIDTH = 1583;
var EXPORT_HEIGHT = 1980;
var EXPORT_FRAME_SRC = "/ranker/assets/export/export_frame.jpg";
var EXPORT_CARD_DIR = "/ranker/assets/export/cards/";
var EXPORT_LOGO_SRC = "/ranker/assets/logo_pbb.png";

// CSV shortname "Shea" maps to collage filename "shereenia".
var EXPORT_NAME_ALIASES = {
  shea: "shereenia",
};

var exportPreviewBlob = null;
var exportPreviewUrl = null;

function saveBig4Image() {
  var kapamilya = ranking.slice(0, 4);
  var kapuso = ranking.slice(4, 8);
  var selectedCount =
    kapamilya.filter(function (h) { return h && h.id >= 0; }).length +
    kapuso.filter(function (h) { return h && h.id >= 0; }).length;

  if (selectedCount === 0) {
    alert("Pick at least one Kapamilya or Kapuso housemate before saving an image.");
    return;
  }

  var btn = document.getElementById("saveimage-button");
  if (btn) {
    btn.disabled = true;
    btn.value = "Generating...";
  }

  generateBig4ExportImage(kapamilya, kapuso)
    .then(function (blob) {
      openExportPreview(blob);
    })
    .catch(function (err) {
      console.error(err);
      alert("Could not create the image. Please try again.");
    })
    .finally(function () {
      if (btn) {
        btn.disabled = false;
        btn.value = "Save Big 4 Image";
      }
    });
}

function openExportPreview(blob) {
  clearExportPreviewUrl();
  exportPreviewBlob = blob;
  exportPreviewUrl = URL.createObjectURL(blob);

  var modal = document.getElementById("export-preview-modal");
  var img = document.getElementById("export-preview-image");
  if (!modal || !img) return;

  img.src = exportPreviewUrl;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("export-modal-open");

  var downloadBtn = document.getElementById("export-preview-download");
  if (downloadBtn) downloadBtn.focus();
}

function closeExportPreview() {
  var modal = document.getElementById("export-preview-modal");
  var img = document.getElementById("export-preview-image");
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }
  if (img) img.removeAttribute("src");
  document.body.classList.remove("export-modal-open");
  clearExportPreviewUrl();
  exportPreviewBlob = null;
}

function clearExportPreviewUrl() {
  if (exportPreviewUrl) {
    URL.revokeObjectURL(exportPreviewUrl);
    exportPreviewUrl = null;
  }
}

function downloadExportPreview() {
  if (!exportPreviewBlob) {
    alert("Generate a Big 4 image first.");
    return;
  }
  var filename =
    "PBB-Collab3-Big4-" +
    new Date().toISOString().slice(0, 10) +
    ".png";
  downloadImageBlob(exportPreviewBlob, filename);
}

function downloadImageBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 2000);
}

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  var modal = document.getElementById("export-preview-modal");
  if (modal && !modal.hidden) closeExportPreview();
});

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      resolve(img);
    };
    img.onerror = function () {
      reject(new Error("Failed to load " + src));
    };
    img.src = src;
  });
}

function loadImageOptional(src) {
  return loadImage(src).catch(function () {
    return null;
  });
}

async function ensureExportFonts() {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load('800 64px "Archivo Black"'),
      document.fonts.load('700 22px "Outfit"'),
    ]);
  } catch (err) {
    // Fall back to system fonts if webfont load fails.
  }
}

function exportCardKey(housemate) {
  if (!housemate || housemate.id < 0 || !housemate.shortname) return null;
  var short = String(housemate.shortname).toLowerCase();
  var fileStem = EXPORT_NAME_ALIASES[short] || short;
  var team = housemate.agencysm ? "kapamilya" : "kapuso";
  return team + "_" + fileStem;
}

async function generateBig4ExportImage(kapamilya, kapuso) {
  await ensureExportFonts();

  var canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  var ctx = canvas.getContext("2d");

  var frame = await loadImage(EXPORT_FRAME_SRC);
  ctx.drawImage(frame, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  var cardKeys = [];
  [kapamilya, kapuso].forEach(function (group) {
    group.forEach(function (hm) {
      var key = exportCardKey(hm);
      if (key) cardKeys.push(key);
    });
  });

  var cardMap = {};
  await Promise.all(
    cardKeys.map(async function (key) {
      cardMap[key] = await loadImageOptional(EXPORT_CARD_DIR + key + ".png");
    })
  );

  var logo = await loadImage(EXPORT_LOGO_SRC);

  // Logo sits high under the top border; Big 4 stack is centered in the space below.
  var cardW = 310;
  var cardH = 386;
  var gapX = 18;
  var titleBand = 46;
  var titleToCards = 68; // little space between section headers and HM cards
  var sectionGap = 86; // a little more space between Kapamilya and Kapuso
  var logoMaxW = 520;
  var logoScale = Math.min(1, logoMaxW / logo.width);
  var logoW = Math.round(logo.width * logoScale);
  var logoH = Math.round(logo.height * logoScale);
  var logoX = Math.round((EXPORT_WIDTH - logoW) / 2);
  // A bit lower under the top border.
  var logoY = 72;
  ctx.drawImage(logo, logoX, logoY, logoW, logoH);

  var stackHeight =
    titleBand +
    titleToCards +
    cardH +
    sectionGap +
    titleBand +
    titleToCards +
    cardH;
  var footerReserve = 110;
  var availableTop = logoY + logoH + 20;
  var availableBottom = EXPORT_HEIGHT - footerReserve;
  // Center in the remaining space, then nudge a bit higher so it still reads centered.
  var stackTop = Math.round(
    availableTop + (availableBottom - availableTop - stackHeight) / 2 - 78
  );
  // Keep a little breathing room under the logo if centering would collide.
  stackTop = Math.max(stackTop, logoY + logoH + 18);

  var kapamilyaTitleY = stackTop + titleBand / 2;
  var kapamilyaCardsY = stackTop + titleBand + titleToCards;
  var kapusoTitleY = kapamilyaCardsY + cardH + sectionGap + titleBand / 2;
  var kapusoCardsY = kapamilyaCardsY + cardH + sectionGap + titleBand + titleToCards;

  drawSectionTitle(ctx, "KAPAMILYA BIG 4", EXPORT_WIDTH / 2, kapamilyaTitleY, "#c8102e");
  drawReadyCardRow(ctx, kapamilya, kapamilyaCardsY, cardW, cardH, gapX, cardMap);

  drawSectionTitle(ctx, "KAPUSO BIG 4", EXPORT_WIDTH / 2, kapusoTitleY, "#0057b8");
  drawReadyCardRow(ctx, kapuso, kapusoCardsY, cardW, cardH, gapX, cardMap);

  ctx.save();
  ctx.fillStyle = "rgba(42, 31, 22, 0.7)";
  ctx.font = '700 20px "Outfit", "Arial", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("PBB COLLAB 3.0  •  MY BIG 4", EXPORT_WIDTH / 2, EXPORT_HEIGHT - 70);
  ctx.restore();

  return new Promise(function (resolve, reject) {
    canvas.toBlob(function (blob) {
      if (blob) resolve(blob);
      else reject(new Error("Canvas export failed"));
    }, "image/png");
  });
}

function drawSectionTitle(ctx, text, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-3 * Math.PI) / 180);

  ctx.font = '800 58px "Archivo Black", "Arial Black", "Impact", sans-serif';
  var metrics = ctx.measureText(text);
  var w = metrics.width + 56;
  var h = 78;

  ctx.fillStyle = "#fffdf8";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  roundRect(ctx, -w / 2, -h / 2, w, h, 10);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 0, 2);
  ctx.restore();
}

function drawReadyCardRow(ctx, housemates, top, cardW, cardH, gapX, cardMap) {
  var count = 4;
  var totalW = count * cardW + (count - 1) * gapX;
  var startX = (EXPORT_WIDTH - totalW) / 2;

  for (var i = 0; i < count; i++) {
    var hm = housemates[i];
    var x = startX + i * (cardW + gapX);
    var key = exportCardKey(hm);
    var card = key ? cardMap[key] : null;
    drawReadyCard(ctx, x, top, cardW, cardH, card, i + 1);
  }
}

function drawReadyCard(ctx, x, y, w, h, cardImg, rank) {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  if (cardImg) {
    // Use the provided card artwork as-is (already includes border + name).
    ctx.drawImage(cardImg, x, y, w, h);
  } else {
    // Empty slot placeholder — no team-colored border.
    ctx.fillStyle = "rgba(255, 253, 248, 0.92)";
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(42, 31, 22, 0.18)";
    ctx.lineWidth = 2;
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 8);
    ctx.stroke();
    ctx.fillStyle = "rgba(42, 31, 22, 0.35)";
    ctx.font = '800 42px "Archivo Black", "Arial Black", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(rank), x + w / 2, y + h / 2);
  }

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  var radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
