/* global ranking */

var EXPORT_WIDTH = 1583;
var EXPORT_HEIGHT = 1980;
var EXPORT_FRAME_SRC = "/ranker/assets/export/export_frame.jpg";
var EXPORT_CARD_DIR = "/ranker/assets/export/cards/";
var EXPORT_LOGO_SRC = "/ranker/assets/logo_pbb.png";
var EXPORT_SUN_SRC = "/ranker/assets/export/sun_empty.png";
var EXPORT_STAR_SRC = "/ranker/assets/export/star_empty.png";
var EXPORT_EYE_SRC = "/ranker/assets/export/pbb_eye.png";
var HOUSEMATE_PHOTO_DIR = "/ranker/assets/housemates/";

// CSV shortname "Shea" maps to collage filename "shereenia" (legacy cards).
var EXPORT_NAME_ALIASES = {
  shea: "shereenia",
};

var exportPreviewBlob = null;
var exportPreviewUrl = null;

function saveBig4Image() {
  var kapamilya = ranking.slice(0, 4);
  var kapuso = ranking.slice(4, 8);

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
      document.fonts.load('800 28px "Outfit"'),
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

function housematePhotoSrc(housemate) {
  if (!housemate || housemate.id < 0 || !housemate.shortname) return null;
  return HOUSEMATE_PHOTO_DIR + String(housemate.shortname).toLowerCase() + ".png";
}

function housemateNickname(housemate) {
  if (!housemate || housemate.id < 0) return null;
  return String(housemate.shortname || "").trim() || null;
}

async function generateBig4ExportImage(kapamilya, kapuso) {
  await ensureExportFonts();

  var canvas = document.createElement("canvas");
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  var ctx = canvas.getContext("2d");

  var frame = await loadImage(EXPORT_FRAME_SRC);
  ctx.drawImage(frame, 0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

  var assets = {
    sun: await loadImage(EXPORT_SUN_SRC),
    star: await loadImage(EXPORT_STAR_SRC),
    eye: await loadImage(EXPORT_EYE_SRC),
    photos: {},
  };

  var photoSrcs = [];
  [kapamilya, kapuso].forEach(function (group) {
    group.forEach(function (hm) {
      var src = housematePhotoSrc(hm);
      if (src) photoSrcs.push(src);
    });
  });
  await Promise.all(
    photoSrcs.map(async function (src) {
      assets.photos[src] = await loadImageOptional(src);
    })
  );

  var logo = await loadImage(EXPORT_LOGO_SRC);
  var logoMaxW = 520;
  var logoScale = Math.min(1, logoMaxW / logo.width);
  var logoW = Math.round(logo.width * logoScale);
  var logoH = Math.round(logo.height * logoScale);
  var logoX = Math.round((EXPORT_WIDTH - logoW) / 2);
  var logoY = 72;
  ctx.drawImage(logo, logoX, logoY, logoW, logoH);

  var winnerSize = 300;
  var minorSize = 190;
  var pyramidGapY = 36;
  var titleBand = 52;
  var sectionGap = 54;
  var pyramidH = winnerSize + pyramidGapY + minorSize + 28;
  var stackHeight = titleBand + 18 + pyramidH + sectionGap + titleBand + 18 + pyramidH;
  var footerReserve = 100;
  var availableTop = logoY + logoH + 16;
  var availableBottom = EXPORT_HEIGHT - footerReserve;
  var stackTop = Math.round(
    availableTop + (availableBottom - availableTop - stackHeight) / 2 - 40
  );
  stackTop = Math.max(stackTop, logoY + logoH + 14);

  var kapamilyaTitleY = stackTop + titleBand / 2;
  var kapamilyaPyramidY = stackTop + titleBand + 18;
  var kapusoTitleY = kapamilyaPyramidY + pyramidH + sectionGap + titleBand / 2;
  var kapusoPyramidY = kapamilyaPyramidY + pyramidH + sectionGap + titleBand + 18;

  drawSectionTitle(ctx, "KAPAMILYA BIG 4", EXPORT_WIDTH / 2, kapamilyaTitleY, "#c8102e");
  drawCirclePyramid(ctx, kapamilya, kapamilyaPyramidY, winnerSize, minorSize, pyramidGapY, assets);

  drawSectionTitle(ctx, "KAPUSO BIG 4", EXPORT_WIDTH / 2, kapusoTitleY, "#0057b8");
  drawCirclePyramid(ctx, kapuso, kapusoPyramidY, winnerSize, minorSize, pyramidGapY, assets);

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

function drawCirclePyramid(ctx, housemates, top, winnerSize, minorSize, gapY, assets) {
  var list = housemates || [];
  var cx = EXPORT_WIDTH / 2;

  // Rank 1 — large circle on top
  drawRankCircle(ctx, {
    hm: list[0],
    rank: 1,
    cx: cx,
    cy: top + winnerSize / 2,
    size: winnerSize,
    assets: assets,
  });

  // Ranks 2–4 — row under winner
  var gapX = 28;
  var rowW = 3 * minorSize + 2 * gapX;
  var startX = cx - rowW / 2 + minorSize / 2;
  var rowY = top + winnerSize + gapY + minorSize / 2;
  for (var i = 0; i < 3; i++) {
    drawRankCircle(ctx, {
      hm: list[i + 1],
      rank: i + 2,
      cx: startX + i * (minorSize + gapX),
      cy: rowY,
      size: minorSize,
      assets: assets,
    });
  }
}

function drawRankCircle(ctx, opts) {
  var hm = opts.hm;
  var rank = opts.rank;
  var cx = opts.cx;
  var cy = opts.cy;
  var size = opts.size;
  var assets = opts.assets;
  var r = size / 2;
  var border = Math.max(10, Math.round(size * 0.055));
  var nick = housemateNickname(hm);
  var photoSrc = housematePhotoSrc(hm);
  var photo = photoSrc ? assets.photos[photoSrc] : null;
  var isWinner = rank === 1;
  var emptyArt = isWinner ? assets.sun : assets.star;
  var label = nick ? nick.toUpperCase() : isWinner ? "BIG WINNER" : String(rank);
  var badgeColor = "#b0b0b0";

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;

  // Outer gray ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#cfcfcf";
  ctx.fill();
  ctx.shadowColor = "transparent";

  // Inner yellow / photo disc
  var innerR = r - border;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = "#ffc133";
  ctx.fill();

  if (photo) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.clip();
    drawCoverImage(ctx, photo, cx - innerR, cy - innerR, innerR * 2, innerR * 2);
    ctx.restore();
  } else if (emptyArt) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.clip();
    drawCoverImage(ctx, emptyArt, cx - innerR, cy - innerR, innerR * 2, innerR * 2);
    ctx.restore();
  }

  // Soft rim highlight
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 0.5, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bottom nickname / rank badge
  var badgeW = isWinner ? size * 0.72 : size * 0.42;
  var badgeH = Math.max(22, size * 0.13);
  var badgeX = cx - badgeW / 2;
  var badgeY = cy + r - badgeH * 0.55;
  ctx.fillStyle = badgeColor;
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 4);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  var fontSize = isWinner
    ? Math.max(14, Math.round(size * 0.075))
    : Math.max(16, Math.round(size * 0.11));
  if (nick && nick.length > 10) fontSize = Math.max(12, fontSize - 2);
  ctx.font = '800 ' + fontSize + 'px "Outfit", "Arial Black", sans-serif';
  ctx.fillText(label, cx, badgeY + badgeH / 2 + 1, badgeW - 10);

  // Top eye logo badge
  var eyeSize = isWinner ? size * 0.22 : size * 0.26;
  var eyeCy = cy - r + eyeSize * 0.15;
  ctx.beginPath();
  ctx.arc(cx, eyeCy, eyeSize / 2 + 3, 0, Math.PI * 2);
  ctx.fillStyle = "#e3e3e3";
  ctx.fill();
  if (assets.eye) {
    drawContainImage(
      ctx,
      assets.eye,
      cx - eyeSize / 2,
      eyeCy - eyeSize / 2,
      eyeSize,
      eyeSize
    );
  }

  ctx.restore();
}

function drawCoverImage(ctx, img, x, y, w, h) {
  var scale = Math.max(w / img.width, h / img.height);
  var dw = img.width * scale;
  var dh = img.height * scale;
  var dx = x + (w - dw) / 2;
  var dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawContainImage(ctx, img, x, y, w, h) {
  var scale = Math.min(w / img.width, h / img.height);
  var dw = img.width * scale;
  var dh = img.height * scale;
  var dx = x + (w - dw) / 2;
  var dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
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
