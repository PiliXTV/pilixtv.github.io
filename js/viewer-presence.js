/* Live per-camera viewer presence for PiliX TV.
 * Uses a public MQTT broker so GitHub Pages / Vercel static hosts can share counts
 * without a custom backend. Counts expire if heartbeats stop. */
(function () {
  var BROKER_URL = "wss://broker.hivemq.com:8884/mqtt";
  var TOPIC_PREFIX = "pilixtv/collab30/presence/v1";
  var SESSION_KEY = "pilixtv_viewer_id";
  var HEARTBEAT_MS = 20000;
  var STALE_MS = 55000;
  var RECOUNT_MS = 5000;

  var CAM_IDS = ["1", "2", "3", "all"];
  var peers = Object.create(null);
  var currentCam = "1";
  var client = null;
  var heartbeatTimer = null;
  var recountTimer = null;
  var myTopic = null;

  function normalizeCam(cam) {
    if (cam === "all" || cam === "All") return "all";
    var n = Number(cam);
    if (n === 1 || n === 2 || n === 3) return String(n);
    return "1";
  }

  function viewerId() {
    try {
      var existing = sessionStorage.getItem(SESSION_KEY);
      if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
      var id =
        "v" +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    } catch (err) {
      return "v" + Math.random().toString(36).slice(2, 12);
    }
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function renderCounts(counts) {
    var total = 0;
    for (var i = 0; i < CAM_IDS.length; i++) {
      total += counts[CAM_IDS[i]] || 0;
    }
    if (total < 1) total = 1;
    setText("live-viewer-count", total);
    setText("meta-viewer-count", total);
    setText("meta-cam-1-count", counts["1"] || 0);
    setText("meta-cam-2-count", counts["2"] || 0);
    setText("meta-cam-3-count", counts["3"] || 0);
    setText("meta-cam-all-count", counts.all || 0);

    var badge = document.getElementById("header-viewer-badge");
    if (badge) {
      badge.title = total + " watching now · Main " + (counts["1"] || 0) +
        " · Dining " + (counts["2"] || 0) +
        " · External " + (counts["3"] || 0) +
        " · All " + (counts.all || 0);
    }
  }

  function recount() {
    var now = Date.now();
    var counts = { "1": 0, "2": 0, "3": 0, all: 0 };
    Object.keys(peers).forEach(function (id) {
      var row = peers[id];
      if (!row || !row.cam) return;
      if (now - row.ts > STALE_MS) {
        delete peers[id];
        return;
      }
      if (counts[row.cam] != null) counts[row.cam] += 1;
    });
    // Always include self so the UI never drops the local viewer mid-reconnect.
    if (!peers[myId] || Date.now() - peers[myId].ts > STALE_MS) {
      counts[currentCam] = (counts[currentCam] || 0) + 1;
    }
    renderCounts(counts);
  }

  var myId = viewerId();
  myTopic = TOPIC_PREFIX + "/" + myId;

  function publishPresence(forceLeave) {
    if (!client || !client.connected) return;
    if (forceLeave) {
      client.publish(myTopic, "", { qos: 0, retain: true });
      delete peers[myId];
      recount();
      return;
    }
    var payload = JSON.stringify({
      cam: currentCam,
      t: Date.now(),
    });
    peers[myId] = { cam: currentCam, ts: Date.now() };
    client.publish(myTopic, payload, { qos: 0, retain: true });
    recount();
  }

  function ingest(topic, raw) {
    var parts = String(topic || "").split("/");
    var id = parts[parts.length - 1];
    if (!id || id === "+") return;
    if (!raw) {
      delete peers[id];
      recount();
      return;
    }
    try {
      var data = JSON.parse(String(raw));
      var cam = normalizeCam(data && data.cam);
      var ts = Number(data && data.t) || Date.now();
      if (Date.now() - ts > STALE_MS) {
        delete peers[id];
      } else {
        peers[id] = { cam: cam, ts: ts };
      }
    } catch (err) {
      delete peers[id];
    }
    recount();
  }

  function setCamera(cam) {
    currentCam = normalizeCam(cam);
    publishPresence(false);
  }

  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(function () {
      publishPresence(false);
    }, HEARTBEAT_MS);
    if (recountTimer) clearInterval(recountTimer);
    recountTimer = setInterval(recount, RECOUNT_MS);
  }

  function connect() {
    if (typeof window.mqtt === "undefined" || !window.mqtt.connect) {
      console.warn("Viewer presence: mqtt bundle missing");
      renderCounts({ "1": 1, "2": 0, "3": 0, all: 0 });
      return;
    }

    client = window.mqtt.connect(BROKER_URL, {
      clientId: "pilixtv_" + myId,
      clean: true,
      reconnectPeriod: 4000,
      connectTimeout: 12000,
      keepalive: 30,
      will: {
        topic: myTopic,
        payload: "",
        qos: 0,
        retain: true,
      },
    });

    client.on("connect", function () {
      client.subscribe(TOPIC_PREFIX + "/+", { qos: 0 }, function () {
        publishPresence(false);
      });
      startHeartbeat();
    });

    client.on("message", function (topic, payload) {
      ingest(topic, payload && payload.toString ? payload.toString() : "");
    });

    client.on("reconnect", function () {
      /* republish after reconnect via connect handler */
    });

    client.on("error", function () {
      /* keep local optimistic count */
      recount();
    });
  }

  window.zvAnalytics = {
    trackCamera: setCamera,
  };

  window.addEventListener("pagehide", function () {
    publishPresence(true);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") publishPresence(false);
  });

  // Optimistic local count before the broker connects.
  peers[myId] = { cam: currentCam, ts: Date.now() };
  recount();
  connect();
})();
