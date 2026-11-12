// =========================================================================
// PILIX TV LIVE STREAM — DIRECT MULTI-CAMERA SHAKA DASH + CLEARKEY PLAYER
// - Direct MPD URLs and ClearKey decryption keys injected in code
// - Zero Firebase connections, zero notification overlays, zero kill switch
// - Supports Main Stream, Dining Area, External Den, and 2x2 All Cameras Grid
// - Includes 1.0x–4.0x interactive zoom & pan, single-cam unmuted audio,
//   quality selector, fullscreen, and light/dark theme toggle.
// =========================================================================
(function () {
    "use strict";

    /* ============================================================
       1. SEALED CAMERA VAULT & ANTI-INSPECT PROTECTION
          (Plaintext MPD URLs & ClearKeys are stored only in private
           secrets.json and compiled into SEALED_VAULT_PAYLOAD)
       ============================================================ */
    const CUSTOM_SERVERS_STORAGE_KEY = "zv_custom_servers_v1";

    // Inspect shortcuts left enabled on PiliX.

    const VAULT_MASK_KEY = [
        0x7a, 0x56, 0x33, 0x30, 0x9e, 0x37, 0x79, 0xb9,
        0x7f, 0x4a, 0x7c, 0x15, 0xf3, 0x9c, 0xc0, 0x60,
        0x51, 0xd7, 0x28, 0xae, 0x52, 0x99, 0x16, 0x34,
        0xc6, 0x71, 0x48, 0x92, 0xa5, 0x5d, 0xe8, 0x1f,
    ];

    /*SEALED_VAULT_START*/
    const SEALED_VAULT_PAYLOAD = {"s":"","d":""};
    /*SEALED_VAULT_END*/

    function b64ToBytes(b64) {
        try {
            const bin = atob(String(b64 || ""));
            const out = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
            return out;
        } catch (e) {
            return new Uint8Array(0);
        }
    }

    function unsealCameraVault(payload) {
        try {
            if (!payload || !payload.s || !payload.d) return {};
            const salt = b64ToBytes(payload.s);
            const data = b64ToBytes(payload.d);
            if (salt.length < 8 || !data.length) return {};
            const plain = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) {
                const b = data[i];
                const unrot = ((b >> 3) | (b << 5)) & 0xff;
                const k = VAULT_MASK_KEY[(i * 7 + 3) & 31];
                const s = salt[i & 7];
                const m = (k ^ s ^ ((i * 131 + 17) & 0xff)) & 0xff;
                plain[i] = (unrot ^ m) & 0xff;
            }
            const jsonText = new TextDecoder().decode(plain);
            plain.fill(0);
            const parsed = JSON.parse(jsonText);
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (e) {
            return {};
        }
    }

    const PRIVATE_CAMERA_VAULT = unsealCameraVault(SEALED_VAULT_PAYLOAD);

    // Edit secrets.json (recommended) or paste mpdUrl/keyId/key here and run `npm run build`
    // to automatically seal and strip plaintext values from live-stream4.js.
    const STREAM_SERVERS = {
        1: {
            id: 1,
            name: "Main Stream",
            short: "Main",
            icon: "fa-tv",
            mpdUrl: "https://absp-live.akamaized.net/dash/live/2099522/pbbcollab30allaccesslivestream/manifest.mpd",
            keyId: "8150b74d16324bb4b2ff62e3e202fc7a",
            key: "0c5ed4f9db9d4ee61bbc91b3a51ef8b5",
        },
        2: {
            id: 2,
            name: "Dining Area",
            short: "Dining Area",
            icon: "fa-utensils",
            mpdUrl: "https://absp-live.akamaized.net/dash/live/2099522/pbbcollab30allaccesslivestream-diningarea/manifest.mpd",
            keyId: "ea6588d030c94ca89925ac0c49974430",
            key: "3e6de4afee1eff8e14f9506b76ac9ee6",
        },
        3: {
            id: 3,
            name: "External Den",
            short: "External Den",
            icon: "fa-door-open",
            mpdUrl: "https://absp-live.akamaized.net/dash/live/2099522/pbbcollab30allaccesslivestream-externalden/manifest.mpd",
            keyId: "b750a40736a24e60b5a4f256208b92c5",
            key: "af07292597f692726dcac2bd297ddf8e",
        },
    };

    const SUBTITLE_FILES = { en: "", fil: "" };
    const DEFAULT_SUBTITLE_LANG = "fil";

    const IS_VERCEL_HOST = /\.vercel\.app$/i.test((window.location && window.location.hostname) || "");
    const GATEWAY_ORIGIN = window.location.origin;

    function cleanHexString(str) {
        return String(str || "").replace(/[^0-9a-fA-F]/g, "").toLowerCase();
    }

    function formatHexAsUuid(hex32) {
        const c = cleanHexString(hex32);
        if (c.length !== 32) return "";
        return `${c.slice(0, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}-${c.slice(16, 20)}-${c.slice(20, 32)}`;
    }

    function buildCommonPsshBase64Client(keyIdHex) {
        const clean = cleanHexString(keyIdHex);
        if (clean.length !== 32) return "";
        const out = new Uint8Array(52);
        const view = new DataView(out.buffer);
        view.setUint32(0, 52, false);
        out.set([0x70, 0x73, 0x73, 0x68], 4);
        view.setUint32(8, 0x01000000, false);
        out.set([0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2, 0xfb, 0x4b], 12);
        view.setUint32(28, 1, false);
        for (let i = 0; i < 16; i++) {
            out[32 + i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
        }
        view.setUint32(48, 0, false);
        let bin = "";
        for (let i = 0; i < out.length; i++) bin += String.fromCharCode(out[i]);
        return btoa(bin);
    }

    function getLocalCustomServerOverride(camId) {
        try {
            const raw = localStorage.getItem(CUSTOM_SERVERS_STORAGE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return null;
            const idStr = String(camId);
            return parsed[idStr] || parsed[`cam${idStr}`] || null;
        } catch (e) {
            return null;
        }
    }

    function getCameraConfig(camId) {
        const idNum = Number(camId);
        const base = STREAM_SERVERS[idNum];
        if (!base) return null;
        const sealedEntry = PRIVATE_CAMERA_VAULT[String(idNum)] || {};
        const localOv = getLocalCustomServerOverride(idNum) || {};

        const realMpdUrl = String(localOv.mpdUrl || base.mpdUrl || sealedEntry.mpdUrl || "").trim();
        const keyId = cleanHexString(localOv.keyId || base.keyId || sealedEntry.keyId);
        const key = cleanHexString(localOv.key || base.key || sealedEntry.key);
        const realBaseUrl = realMpdUrl ? realMpdUrl.slice(0, realMpdUrl.lastIndexOf("/") + 1) : "";

        // Virtual internal URI so Shaka Player & DOM never expose the real MPD URL
        const virtualBaseUrl = realMpdUrl ? `https://edge.local.pilix/cam/${base.id}/` : "";
        const virtualMpdUrl = realMpdUrl ? `${virtualBaseUrl}manifest.mpd` : "";

        const clearKeys = {};
        if (keyId && key) clearKeys[keyId] = key;

        return {
            id: base.id,
            name: base.name,
            short: base.short,
            icon: base.icon,
            mpdUrl: virtualMpdUrl,
            baseUrl: virtualBaseUrl,
            realMpdUrl,
            realBaseUrl,
            keyId,
            key,
            clearKeys,
        };
    }

    /* ============================================================
       2. DIRECT NO-REFERRER & SANDBOX BRIDGE NETWORKING PLUGIN
          Ensures Akamai MPD & MP4 segments load with 200 OK on all
          origins (localhost, Cloud Run, and *.vercel.app).
       ============================================================ */
    let sandboxBridgeIframe = null;
    let sandboxBridgeReady = false;
    let sandboxBridgeInitPromise = null;
    let sandboxBridgeReqSeq = 0;
    const pendingSandboxRequests = new Map();
    let directSchemeRegistered = false;

    function handleSandboxBridgeMessage(e) {
        const msg = e && e.data;
        if (!msg || typeof msg !== "object") return;
        if (msg.type === "ZV_BRIDGE_READY") {
            sandboxBridgeReady = true;
            return;
        }
        if (msg.type === "ZV_FETCH_RES" && msg.id) {
            const pending = pendingSandboxRequests.get(msg.id);
            if (!pending) return;
            pendingSandboxRequests.delete(msg.id);
            if (pending.timer) clearTimeout(pending.timer);
            pending.resolve(msg);
        }
    }

    window.addEventListener("message", handleSandboxBridgeMessage);

    function ensureSandboxBridge() {
        if (sandboxBridgeReady && sandboxBridgeIframe && sandboxBridgeIframe.contentWindow) {
            return Promise.resolve(sandboxBridgeIframe.contentWindow);
        }
        if (sandboxBridgeInitPromise) return sandboxBridgeInitPromise;

        sandboxBridgeInitPromise = new Promise((resolve) => {
            const iframe = document.createElement("iframe");
            iframe.setAttribute("sandbox", "allow-scripts");
            iframe.setAttribute("referrerpolicy", "no-referrer");
            iframe.setAttribute("aria-hidden", "true");
            iframe.tabIndex = -1;
            iframe.style.cssText =
                "display:none !important;width:0 !important;height:0 !important;border:0 !important;position:absolute !important;pointer-events:none !important;";
            iframe.srcdoc = [
                "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='referrer' content='no-referrer'></head><body><script>",
                "const ctrls = new Map();",
                "window.addEventListener('message', async (ev) => {",
                "  const m = ev.data;",
                "  if (!m || typeof m !== 'object') return;",
                "  if (m.type === 'ZV_PING') { parent.postMessage({ type: 'ZV_BRIDGE_READY' }, '*'); return; }",
                "  if (m.type === 'ZV_ABORT' && m.id) { const c = ctrls.get(m.id); if (c) { c.abort(); ctrls.delete(m.id); } return; }",
                "  if (m.type !== 'ZV_FETCH' || !m.id || !m.url) return;",
                "  const ctrl = new AbortController();",
                "  ctrls.set(m.id, ctrl);",
                "  const t = m.timeoutMs > 0 ? setTimeout(() => ctrl.abort(), m.timeoutMs) : null;",
                "  try {",
                "    const res = await fetch(m.url, { method: m.method || 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: ctrl.signal });",
                "    if (t) clearTimeout(t);",
                "    ctrls.delete(m.id);",
                "    const buf = await res.arrayBuffer();",
                "    const hdrs = {};",
                "    res.headers.forEach((v, k) => { hdrs[String(k).toLowerCase()] = v; });",
                "    parent.postMessage({ type: 'ZV_FETCH_RES', id: m.id, ok: res.ok, status: res.status, url: res.url || m.url, headers: hdrs, data: buf }, '*', [buf]);",
                "  } catch (err) {",
                "    if (t) clearTimeout(t);",
                "    ctrls.delete(m.id);",
                "    parent.postMessage({ type: 'ZV_FETCH_RES', id: m.id, ok: false, status: 0, error: String((err && err.message) || err || 'Network error') }, '*');",
                "  }",
                "});",
                "parent.postMessage({ type: 'ZV_BRIDGE_READY' }, '*');",
                "</" + "script></body></html>",
            ].join("\n");

            const finish = () => {
                sandboxBridgeReady = true;
                resolve(iframe.contentWindow);
            };

            const checkInterval = setInterval(() => {
                if (sandboxBridgeReady && iframe.contentWindow) {
                    clearInterval(checkInterval);
                    finish();
                } else if (iframe.contentWindow) {
                    try {
                        iframe.contentWindow.postMessage({ type: "ZV_PING" }, "*");
                    } catch (e) {}
                }
            }, 25);

            setTimeout(() => {
                clearInterval(checkInterval);
                finish();
            }, 600);

            iframe.addEventListener("load", () => {
                try {
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ type: "ZV_PING" }, "*");
                    }
                } catch (e) {}
            });

            sandboxBridgeIframe = iframe;
            (document.body || document.documentElement).appendChild(iframe);
        });

        return sandboxBridgeInitPromise;
    }

    function fetchViaSandboxBridge(url, timeoutMs = 12000) {
        const reqId = ++sandboxBridgeReqSeq;
        let isAborted = false;

        const promise = ensureSandboxBridge().then((win) => {
            if (isAborted) {
                const abortErr = new Error("Aborted");
                abortErr.isAborted = true;
                throw abortErr;
            }
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pendingSandboxRequests.delete(reqId);
                    const err = new Error("Timeout");
                    err.isTimeout = true;
                    reject(err);
                }, timeoutMs + 500);

                pendingSandboxRequests.set(reqId, { resolve, reject, timer });
                try {
                    win.postMessage(
                        {
                            type: "ZV_FETCH",
                            id: reqId,
                            url,
                            method: "GET",
                            timeoutMs,
                        },
                        "*"
                    );
                } catch (err) {
                    clearTimeout(timer);
                    pendingSandboxRequests.delete(reqId);
                    reject(err);
                }
            });
        });

        const abort = () => {
            isAborted = true;
            const pending = pendingSandboxRequests.get(reqId);
            if (pending) {
                if (pending.timer) clearTimeout(pending.timer);
                pendingSandboxRequests.delete(reqId);
                const abortErr = new Error("Aborted");
                abortErr.isAborted = true;
                pending.reject(abortErr);
            }
            if (sandboxBridgeIframe && sandboxBridgeIframe.contentWindow) {
                try {
                    sandboxBridgeIframe.contentWindow.postMessage({ type: "ZV_ABORT", id: reqId }, "*");
                } catch (e) {}
            }
        };

        return { promise, abort };
    }

    function fetchDirectNoReferrer(url, timeoutMs = 12000) {
        const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer =
            ctrl && timeoutMs > 0
                ? setTimeout(() => {
                      try {
                          ctrl.abort();
                      } catch (e) {}
                  }, timeoutMs)
                : null;

        const promise = fetch(url, {
            method: "GET",
            mode: "cors",
            credentials: "omit",
            referrerPolicy: "no-referrer",
            cache: "no-store",
            signal: ctrl ? ctrl.signal : undefined,
        })
            .then(async (r) => {
                if (timer) clearTimeout(timer);
                const buf = await r.arrayBuffer();
                const hdrs = {};
                r.headers.forEach((v, k) => {
                    hdrs[String(k).toLowerCase()] = v;
                });
                return {
                    ok: r.ok,
                    status: r.status,
                    url: r.url || url,
                    headers: hdrs,
                    data: buf,
                };
            })
            .catch((err) => {
                if (timer) clearTimeout(timer);
                if (err && (err.name === "AbortError" || err.isAborted)) {
                    const abortErr = new Error("Aborted");
                    abortErr.isAborted = true;
                    throw abortErr;
                }
                throw err;
            });

        const abort = () => {
            if (timer) clearTimeout(timer);
            if (ctrl) {
                try {
                    ctrl.abort();
                } catch (e) {}
            }
        };

        return { promise, abort };
    }

    function registerDirectEdgeSchemePlugin() {
        if (directSchemeRegistered || !window.shaka || !shaka.net || !shaka.net.NetworkingEngine) return;
        directSchemeRegistered = true;

        const fallbackPlugin =
            (shaka.net.HttpFetchPlugin && shaka.net.HttpFetchPlugin.parse) ||
            (shaka.net.HttpXHRPlugin && shaka.net.HttpXHRPlugin.parse);

        const edgeSchemePlugin = (uri, request, requestType, progressUpdated, headersReceived, config) => {
            const uriStr = String(uri || "");
            let fetchUrl = uriStr;
            const virtualMatch = uriStr.match(/^https:\/\/edge\.local\.pilix\/cam\/(\d+)\/(.+)$/i);
            if (virtualMatch) {
                const camId = Number(virtualMatch[1]);
                const subPath = virtualMatch[2];
                const cfg = getCameraConfig(camId);
                if (cfg && cfg.realMpdUrl) {
                    fetchUrl = subPath.endsWith(".mpd")
                        ? cfg.realMpdUrl
                        : `${cfg.realBaseUrl}${subPath}`;
                }
            } else if (!uriStr.includes("akamaized.net")) {
                if (fallbackPlugin) {
                    return fallbackPlugin(uri, request, requestType, progressUpdated, headersReceived, config || {});
                }
            }

            const startTime = Date.now();
            const timeoutMs =
                (request && request.retryParameters && request.retryParameters.timeout) || 12000;

            let activeAbort = null;
            let aborted = false;

            const tryPrimaryAndFallbacks = async () => {
                let res = null;
                let lastErr = null;

                const directOp = fetchDirectNoReferrer(fetchUrl, timeoutMs);
                activeAbort = directOp.abort;
                try {
                    res = await directOp.promise;
                } catch (err) {
                    if (aborted || (err && err.isAborted)) throw err;
                    lastErr = err;
                }
                if (!res || !res.ok || res.status === 403 || res.status === 0) {
                    const bridgeOp = fetchViaSandboxBridge(fetchUrl, timeoutMs);
                    activeAbort = bridgeOp.abort;
                    try {
                        const bridgeRes = await bridgeOp.promise;
                        if (bridgeRes && (bridgeRes.ok || !res || !res.status)) {
                            res = bridgeRes;
                        }
                    } catch (err) {
                        if (aborted || (err && err.isAborted)) throw err;
                        if (!lastErr) lastErr = err;
                    }
                }

                if (!res || !res.status) {
                    throw new shaka.util.Error(
                        shaka.util.Error.Severity.RECOVERABLE,
                        shaka.util.Error.Category.NETWORK,
                        shaka.util.Error.Code.HTTP_ERROR,
                        uriStr,
                        res && res.error ? res.error : lastErr || "Network error",
                        requestType
                    );
                }

                const status = Number(res.status);
                const headers = res.headers || {};
                if (typeof headersReceived === "function") {
                    try {
                        headersReceived(headers);
                    } catch (e) {}
                }

                if (status >= 200 && status <= 299 && status !== 202 && res.data) {
                    const elapsedMs = Math.max(1, Date.now() - startTime);
                    if (typeof progressUpdated === "function") {
                        try {
                            progressUpdated(elapsedMs, res.data.byteLength, 0);
                        } catch (e) {}
                    }
                    return {
                        uri: uriStr,
                        originalUri: uriStr,
                        data: res.data,
                        status,
                        headers,
                        fromCache: false,
                    };
                }

                throw new shaka.util.Error(
                    status === 401 || status === 403
                        ? shaka.util.Error.Severity.CRITICAL
                        : shaka.util.Error.Severity.RECOVERABLE,
                    shaka.util.Error.Category.NETWORK,
                    shaka.util.Error.Code.BAD_HTTP_STATUS,
                    uriStr,
                    status,
                    null,
                    headers,
                    requestType,
                    uriStr
                );
            };

            const opPromise = tryPrimaryAndFallbacks().catch((err) => {
                if (err instanceof shaka.util.Error) throw err;
                if (aborted || (err && err.isAborted)) {
                    throw new shaka.util.Error(
                        shaka.util.Error.Severity.RECOVERABLE,
                        shaka.util.Error.Category.NETWORK,
                        shaka.util.Error.Code.OPERATION_ABORTED,
                        uriStr,
                        requestType
                    );
                }
                if (err && err.isTimeout) {
                    throw new shaka.util.Error(
                        shaka.util.Error.Severity.RECOVERABLE,
                        shaka.util.Error.Category.NETWORK,
                        shaka.util.Error.Code.TIMEOUT,
                        uriStr,
                        requestType
                    );
                }
                throw new shaka.util.Error(
                    shaka.util.Error.Severity.RECOVERABLE,
                    shaka.util.Error.Category.NETWORK,
                    shaka.util.Error.Code.HTTP_ERROR,
                    uriStr,
                    err,
                    requestType
                );
            });

            const abortOp = () => {
                aborted = true;
                if (typeof activeAbort === "function") {
                    try {
                        activeAbort();
                    } catch (e) {}
                }
                return Promise.resolve();
            };

            if (shaka.util && typeof shaka.util.AbortableOperation === "function") {
                return new shaka.util.AbortableOperation(opPromise, abortOp);
            }
            return {
                promise: opPromise,
                abort: abortOp,
            };
        };

        const priority =
            (shaka.net.NetworkingEngine.PluginPriority && shaka.net.NetworkingEngine.PluginPriority.APPLICATION) || 4;
        shaka.net.NetworkingEngine.registerScheme("https", edgeSchemePlugin, priority, true);
        shaka.net.NetworkingEngine.registerScheme("http", edgeSchemePlugin, priority, true);
    }

    /* ============================================================
       3. CLEARKEY PSSH & WEBCRYPTO CENC HELPERS (FOR iOS SAFARI)
       ============================================================ */
    const cameraCryptoKeyCache = new Map();

    function isIosOrWebKitDevice() {
        const ua = navigator.userAgent || "";
        const isIOS =
            /iPhone|iPad|iPod/i.test(ua) ||
            (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const isSafariWebKit =
            /AppleWebKit/i.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/i.test(ua);
        return isIOS || isSafariWebKit;
    }

    function hasMseSupport() {
        if (typeof window.MediaSource !== "undefined" && typeof window.MediaSource.isTypeSupported === "function") {
            return true;
        }
        if (typeof window.ManagedMediaSource !== "undefined" && typeof window.ManagedMediaSource.isTypeSupported === "function") {
            return true;
        }
        return false;
    }

    function hexToUint8Array(hexStr) {
        const clean = cleanHexString(hexStr);
        const out = new Uint8Array(clean.length / 2);
        for (let i = 0; i < out.length; i++) {
            out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
        }
        return out;
    }

    async function getCameraCryptoKey(camId) {
        const cfg = getCameraConfig(camId);
        if (!cfg || !cfg.key) throw new Error("Missing camera decryption key");
        const cacheKey = `${camId}:${cfg.key}`;
        if (cameraCryptoKeyCache.has(cacheKey)) {
            return cameraCryptoKeyCache.get(cacheKey);
        }
        const rawKeyBytes = hexToUint8Array(cfg.key);
        const cryptoKey = await crypto.subtle.importKey(
            "raw",
            rawKeyBytes,
            { name: "AES-CTR" },
            false,
            ["decrypt"]
        );
        cameraCryptoKeyCache.set(cacheKey, cryptoKey);
        return cryptoKey;
    }

    function transformWidevineToCommonPssh(initData, initDataType, drmInfo) {
        void drmInfo;
        if (initDataType !== "cenc" || !initData || initData.byteLength < 32) {
            return initData;
        }
        const bytes = new Uint8Array(initData.buffer || initData, initData.byteOffset || 0, initData.byteLength);
        const commonSysId = [0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02, 0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2, 0xfb, 0x4b];
        let hasCommon = true;
        for (let i = 0; i < 16; i++) {
            if (bytes[12 + i] !== commonSysId[i]) {
                hasCommon = false;
                break;
            }
        }
        if (hasCommon) return initData;

        for (let i = 32; i + 18 <= bytes.length; i++) {
            if (bytes[i] === 0x12 && bytes[i + 1] === 0x10) {
                const kid = bytes.subarray(i + 2, i + 18);
                const out = new Uint8Array(52);
                const view = new DataView(out.buffer);
                view.setUint32(0, 52, false);
                out.set([0x70, 0x73, 0x73, 0x68], 4);
                view.setUint32(8, 0x01000000, false);
                out.set(commonSysId, 12);
                view.setUint32(28, 1, false);
                out.set(kid, 32);
                view.setUint32(48, 0, false);
                return out;
            }
        }
        return initData;
    }

    function toUint8Array(data) {
        if (!data) return new Uint8Array(0);
        if (data instanceof Uint8Array) return data;
        if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        if (data instanceof ArrayBuffer) return new Uint8Array(data);
        return new Uint8Array(0);
    }

    function writeAscii4(u8, offset, str) {
        u8[offset] = str.charCodeAt(0);
        u8[offset + 1] = str.charCodeAt(1);
        u8[offset + 2] = str.charCodeAt(2);
        u8[offset + 3] = str.charCodeAt(3);
    }

    function readAscii4(u8, offset) {
        return String.fromCharCode(u8[offset], u8[offset + 1], u8[offset + 2], u8[offset + 3]);
    }

    function stripMpdContentProtection(xmlText) {
        return String(xmlText || "")
            .replace(/<ContentProtection\b[^>]*\/>/gi, "")
            .replace(/<ContentProtection\b[^>]*>[\s\S]*?<\/ContentProtection>/gi, "");
    }

    function normalizeMpdXml(xmlText, camConfig, stripDrmForWebCrypto) {
        let out = String(xmlText || "");

        // Detect live default_KID in the MPD so we can register it alongside the configured keyId
        let liveKidHex = "";
        const kidMatch = out.match(/default_KID="([^"]+)"/i);
        if (kidMatch && kidMatch[1]) {
            const parsedKid = cleanHexString(kidMatch[1]);
            if (parsedKid.length === 32) {
                liveKidHex = parsedKid;
            }
        }

        // Ensure relative segment URLs resolve directly against the camera's Akamai base directory
        if (camConfig && camConfig.baseUrl) {
            if (/<BaseURL>[\s\S]*?<\/BaseURL>/i.test(out)) {
                out = out.replace(/<BaseURL>[\s\S]*?<\/BaseURL>/gi, `<BaseURL>${camConfig.baseUrl}</BaseURL>`);
            } else {
                out = out.replace(/(<MPD\b[^>]*>)/i, `$1\n  <BaseURL>${camConfig.baseUrl}</BaseURL>`);
            }
        }

        if (stripDrmForWebCrypto) {
            return { xml: stripMpdContentProtection(out), liveKidHex };
        }

        const effectiveKidHex = liveKidHex || (camConfig && camConfig.keyId) || "";
        if (effectiveKidHex.length === 32) {
            const psshB64 = buildCommonPsshBase64Client(effectiveKidHex);
            // Remove Widevine ContentProtection block so Shaka/Firefox EME uses W3C Common PSSH cleanly
            out = out.replace(
                /<ContentProtection\b[^>]*edef8ba9-79d6-4ace-a3c8-27dcd51d21ed[^>]*>[\s\S]*?<\/ContentProtection>/gi,
                ""
            );
            out = out.replace(
                /<ContentProtection\b[^>]*edef8ba9-79d6-4ace-a3c8-27dcd51d21ed[^>]*\/>/gi,
                ""
            );
            if (psshB64 && !/1077efec-c0b2-4d02-ace3-3c1e52e2fb4b/i.test(out)) {
                out = out.replace(
                    /(<ContentProtection\b[^>]*mp4protection:2011[^>]*\/>)/gi,
                    `$1\n      <ContentProtection schemeIdUri="urn:uuid:1077efec-c0b2-4d02-ace3-3c1e52e2fb4b">\n        <cenc:pssh xmlns:cenc="urn:mpeg:cenc:2013">${psshB64}</cenc:pssh>\n      </ContentProtection>\n      <ContentProtection schemeIdUri="urn:uuid:e2719d58-a985-b3c9-781a-b030af78d30e" value="ClearKey1.0"/>`
                );
            }
        }

        return { xml: out, liveKidHex };
    }

    function stripMoofPsshInPlace(u8) {
        if (!u8 || u8.byteLength < 32) return u8;
        const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
        let off = 0;
        while (off + 8 <= u8.byteLength) {
            let sz = view.getUint32(off, false);
            const tp = readAscii4(u8, off + 4);
            if (sz === 0) sz = u8.byteLength - off;
            if (sz < 8 || off + sz > u8.byteLength) break;
            if (tp === "moof") {
                let p = off + 8;
                const moofEnd = off + sz;
                while (p + 8 <= moofEnd) {
                    let bsz = view.getUint32(p, false);
                    const btp = readAscii4(u8, p + 4);
                    if (bsz === 0) bsz = moofEnd - p;
                    if (bsz < 8 || p + bsz > moofEnd) break;
                    if (btp === "pssh") {
                        writeAscii4(u8, p + 4, "free");
                        u8.fill(0, p + 8, p + bsz);
                    }
                    p += bsz;
                }
            }
            off += sz;
        }
        return u8;
    }

    function rewriteMp4InitKidInPlace(u8, targetKidHex) {
        const clean = cleanHexString(targetKidHex);
        if (!u8 || u8.byteLength < 64 || clean.length !== 32) return u8;
        const targetBytes = new Uint8Array(16);
        for (let i = 0; i < 16; i++) {
            targetBytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
        }

        let origBytes = null;
        for (let i = 0; i + 28 <= u8.byteLength; i++) {
            if (
                u8[i] === 0x74 && // 't'
                u8[i + 1] === 0x65 && // 'e'
                u8[i + 2] === 0x6e && // 'n'
                u8[i + 3] === 0x63 // 'c'
            ) {
                origBytes = u8.slice(i + 12, i + 28);
                u8.set(targetBytes, i + 12);
            }
        }

        const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
        const commonSysId = [
            0x10, 0x77, 0xef, 0xec, 0xc0, 0xb2, 0x4d, 0x02,
            0xac, 0xe3, 0x3c, 0x1e, 0x52, 0xe2, 0xfb, 0x4b,
        ];
        function rewritePsshBoxes(start, end) {
            let off = start;
            while (off + 8 <= end) {
                let sz = view.getUint32(off, false);
                const tp = readAscii4(u8, off + 4);
                if (sz === 0) sz = end - off;
                if (sz < 8 || off + sz > end) break;
                if (tp === "pssh") {
                    const rem = sz - 52;
                    if (sz === 52 || rem >= 8) {
                        view.setUint32(off, 52, false);
                        writeAscii4(u8, off + 4, "pssh");
                        view.setUint32(off + 8, 0x01000000, false);
                        u8.set(commonSysId, off + 12);
                        view.setUint32(off + 28, 1, false);
                        u8.set(targetBytes, off + 32);
                        view.setUint32(off + 48, 0, false);
                        if (rem >= 8) {
                            view.setUint32(off + 52, rem, false);
                            writeAscii4(u8, off + 56, "free");
                            u8.fill(0, off + 60, off + sz);
                        }
                    }
                } else if (tp === "moov") {
                    rewritePsshBoxes(off + 8, off + sz);
                }
                off += sz;
            }
        }
        rewritePsshBoxes(0, u8.byteLength);

        if (origBytes) {
            for (let i = 0; i + 16 <= u8.byteLength; i++) {
                let match = true;
                for (let j = 0; j < 16; j++) {
                    if (u8[i + j] !== origBytes[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    u8.set(targetBytes, i);
                    i += 15;
                }
            }
        }
        return u8;
    }

    function cleanMp4InitInPlace(u8) {
        const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
        function walk(start, end) {
            let off = start;
            while (off + 8 <= end) {
                let sz = view.getUint32(off, false);
                const tp = readAscii4(u8, off + 4);
                if (sz === 0) sz = end - off;
                if (sz < 8 || off + sz > end) break;
                if (tp === "pssh" || tp === "sinf") {
                    writeAscii4(u8, off + 4, "free");
                    u8.fill(0, off + 8, off + sz);
                } else if (tp === "encv") {
                    writeAscii4(u8, off + 4, "avc1");
                    walk(off + 86, off + sz);
                } else if (tp === "enca") {
                    writeAscii4(u8, off + 4, "mp4a");
                    walk(off + 36, off + sz);
                } else if (tp === "stsd") {
                    walk(off + 16, off + sz);
                } else if (tp === "moov" || tp === "trak" || tp === "mdia" || tp === "minf" || tp === "stbl") {
                    walk(off + 8, off + sz);
                }
                off += sz;
            }
        }
        walk(0, u8.byteLength);
        return u8;
    }

    async function decryptMp4SegmentInPlace(u8, cryptoKey) {
        const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
        let off = 0;
        while (off + 8 <= u8.byteLength) {
            let sz = view.getUint32(off, false);
            const tp = readAscii4(u8, off + 4);
            if (sz === 0) sz = u8.byteLength - off;
            if (sz < 8 || off + sz > u8.byteLength) break;

            if (tp === "moov") {
                cleanMp4InitInPlace(u8.subarray(off, off + sz));
            } else if (tp === "moof") {
                const moofOffset = off;
                const moofEnd = off + sz;
                const trafList = [];

                let p = moofOffset + 8;
                while (p + 8 <= moofEnd) {
                    let bsz = view.getUint32(p, false);
                    const btp = readAscii4(u8, p + 4);
                    if (bsz === 0) bsz = moofEnd - p;
                    if (bsz < 8 || p + bsz > moofEnd) break;
                    if (btp === "pssh") {
                        writeAscii4(u8, p + 4, "free");
                        u8.fill(0, p + 8, p + bsz);
                    } else if (btp === "traf") {
                        let tfhdDefaultSampleSize = 0;
                        let trunBox = null;
                        let sencBox = null;
                        let q = p + 8;
                        const trafEnd = p + bsz;
                        while (q + 8 <= trafEnd) {
                            let csz = view.getUint32(q, false);
                            const ctp = readAscii4(u8, q + 4);
                            if (csz === 0) csz = trafEnd - q;
                            if (csz < 8 || q + csz > trafEnd) break;
                            if (ctp === "tfhd") {
                                const flags = view.getUint32(q + 8, false) & 0xffffff;
                                let r = q + 16;
                                if (flags & 0x01) r += 8;
                                if (flags & 0x02) r += 4;
                                if (flags & 0x08) r += 4;
                                if (flags & 0x10 && r + 4 <= q + csz) {
                                    tfhdDefaultSampleSize = view.getUint32(r, false);
                                }
                            } else if (ctp === "trun") {
                                trunBox = { offset: q, size: csz };
                            } else if (ctp === "senc") {
                                sencBox = { offset: q, size: csz };
                                writeAscii4(u8, q + 4, "free");
                            } else if (ctp === "pssh" || ctp === "saio" || ctp === "saiz" || ctp === "sbgp" || ctp === "sgpd") {
                                writeAscii4(u8, q + 4, "free");
                                u8.fill(0, q + 8, q + csz);
                            }
                            q += csz;
                        }
                        if (trunBox && sencBox) {
                            trafList.push({ tfhdDefaultSampleSize, trunBox, sencBox });
                        }
                    }
                    p += bsz;
                }

                for (const traf of trafList) {
                    const { tfhdDefaultSampleSize, trunBox, sencBox } = traf;
                    const trunFlags = view.getUint32(trunBox.offset + 8, false) & 0xffffff;
                    const sampleCount = view.getUint32(trunBox.offset + 12, false);
                    let tPos = trunBox.offset + 16;
                    let dataOffset = 0;
                    if (trunFlags & 0x01) {
                        dataOffset = view.getInt32(tPos, false);
                        tPos += 4;
                    }
                    if (trunFlags & 0x04) tPos += 4;
                    const sampleSizes = new Uint32Array(sampleCount);
                    for (let i = 0; i < sampleCount; i++) {
                        if (trunFlags & 0x100) tPos += 4;
                        if (trunFlags & 0x200) {
                            sampleSizes[i] = view.getUint32(tPos, false);
                            tPos += 4;
                        } else {
                            sampleSizes[i] = tfhdDefaultSampleSize;
                        }
                        if (trunFlags & 0x400) tPos += 4;
                        if (trunFlags & 0x800) tPos += 4;
                    }

                    const sencFlags = view.getUint32(sencBox.offset + 8, false) & 0xffffff;
                    const sencSampleCount = view.getUint32(sencBox.offset + 12, false);
                    let sPos = sencBox.offset + 16;
                    let mediaCursor = moofOffset + dataOffset;
                    const count = Math.min(sampleCount, sencSampleCount);

                    for (let i = 0; i < count; i++) {
                        const iv = new Uint8Array(16);
                        iv.set(u8.subarray(sPos, sPos + 8), 0);
                        sPos += 8;
                        const sampleSize = sampleSizes[i];

                        if (sencFlags & 0x02) {
                            const subCount = view.getUint16(sPos, false);
                            sPos += 2;
                            let totalEnc = 0;
                            const ranges = [];
                            let subCursor = mediaCursor;
                            for (let j = 0; j < subCount; j++) {
                                const clearBytes = view.getUint16(sPos, false);
                                const encBytes = view.getUint32(sPos + 2, false);
                                sPos += 6;
                                subCursor += clearBytes;
                                if (encBytes > 0 && subCursor + encBytes <= u8.byteLength) {
                                    ranges.push({ start: subCursor, len: encBytes });
                                    totalEnc += encBytes;
                                }
                                subCursor += encBytes;
                            }
                            if (totalEnc > 0) {
                                let cipherBuf;
                                if (ranges.length === 1) {
                                    cipherBuf = u8.subarray(ranges[0].start, ranges[0].start + ranges[0].len);
                                } else {
                                    cipherBuf = new Uint8Array(totalEnc);
                                    let cOff = 0;
                                    for (let rIdx = 0; rIdx < ranges.length; rIdx++) {
                                        const r = ranges[rIdx];
                                        cipherBuf.set(u8.subarray(r.start, r.start + r.len), cOff);
                                        cOff += r.len;
                                    }
                                }
                                const plainAb = await crypto.subtle.decrypt(
                                    { name: "AES-CTR", counter: iv, length: 64 },
                                    cryptoKey,
                                    cipherBuf
                                );
                                const plainU8 = new Uint8Array(plainAb);
                                let pOff = 0;
                                for (let rIdx = 0; rIdx < ranges.length; rIdx++) {
                                    const r = ranges[rIdx];
                                    u8.set(plainU8.subarray(pOff, pOff + r.len), r.start);
                                    pOff += r.len;
                                }
                            }
                        } else if (sampleSize > 0 && mediaCursor + sampleSize <= u8.byteLength) {
                            const cipherSlice = u8.subarray(mediaCursor, mediaCursor + sampleSize);
                            const plainAb = await crypto.subtle.decrypt(
                                { name: "AES-CTR", counter: iv, length: 64 },
                                cryptoKey,
                                cipherSlice
                            );
                            u8.set(new Uint8Array(plainAb), mediaCursor);
                        }
                        mediaCursor += sampleSize;
                    }
                }
            }
            off += sz;
        }
        return u8;
    }

    function escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    /* ============================================================
       4. LIGHT / DARK THEME TOGGLE
       ============================================================ */
    const THEME_STORAGE_KEY = "zone_vault_live_theme";

    function getCurrentTheme() {
        const attr =
            document.documentElement.getAttribute("data-theme") ||
            (document.body && document.body.getAttribute("data-theme"));
        return attr === "light" ? "light" : "dark";
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        if (document.body) document.body.setAttribute("data-theme", theme);
        const icon = document.querySelector("#theme-toggle i");
        if (icon) icon.className = theme === "light" ? "fas fa-moon" : "fas fa-sun";
        const btn = document.getElementById("theme-toggle");
        if (btn) {
            btn.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
            btn.setAttribute("title", theme === "light" ? "Dark mode" : "Light mode");
        }
    }

    function initThemeToggle() {
        let saved = null;
        try {
            saved = localStorage.getItem(THEME_STORAGE_KEY);
        } catch (e) {}
        applyTheme(saved === "light" || saved === "dark" ? saved : getCurrentTheme());

        const btn = document.getElementById("theme-toggle");
        if (!btn) return;
        btn.addEventListener("click", () => {
            const next = getCurrentTheme() === "light" ? "dark" : "light";
            applyTheme(next);
            try {
                localStorage.setItem(THEME_STORAGE_KEY, next);
            } catch (e) {}
        });
    }

    /* ============================================================
       5. CAMERA SELECTOR & INITIALIZATION
       ============================================================ */
    let currentServer = null;
    let lastServerButtonsSig = "";

    function getServerIds() {
        return Object.keys(STREAM_SERVERS)
            .map(Number)
            .sort((a, b) => a - b);
    }

    function getServerConfig(serverNum) {
        return getCameraConfig(serverNum);
    }

    function getServerUrl(serverNum) {
        const cfg = getCameraConfig(serverNum);
        return (cfg && cfg.mpdUrl) || "";
    }

    function renderServerButtons() {
        const wrap = document.getElementById("server-selector");
        if (!wrap) return;

        const ids = getServerIds();
        const sig = `${currentServer}:${ids.join(",")}`;
        if (sig === lastServerButtonsSig && wrap.dataset.bound === "1" && wrap.children.length > 0) {
            return;
        }
        lastServerButtonsSig = sig;
        wrap.dataset.bound = "1";

        wrap.style.display = "flex";
        wrap.innerHTML = "";

        ids.forEach((id) => {
            const cfg = getServerConfig(id);
            const hasSource = !!getServerUrl(id);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `nav-btn ${currentServer === id ? "active" : ""} ${!hasSource ? "disabled" : ""}`;
            btn.disabled = !hasSource;
            btn.setAttribute("aria-label", cfg.name);
            btn.innerHTML = `<i class="fas ${cfg.icon || "fa-video"}"></i><span>${cfg.short || cfg.name}</span>`;
            if (hasSource) {
                btn.addEventListener("click", () => selectServer(id, true));
            }
            wrap.appendChild(btn);
        });

        const allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.className = `nav-btn ${currentServer === "all" ? "active" : ""}`;
        allBtn.setAttribute("aria-label", "All Cameras");
        allBtn.innerHTML = `<i class="fas fa-table-cells-large"></i><span>All</span>`;
        allBtn.addEventListener("click", () => selectAllCameras(true));
        wrap.appendChild(allBtn);
    }

    function selectServer(serverNum, fromUserGesture = false) {
        if (!getServerUrl(serverNum)) return;
        if (fromUserGesture) {
            userHasInteracted = true;
            playerMuted = false;
            if (playerVolume <= 0) playerVolume = 0.8;
        }
        if (
            fromUserGesture &&
            currentServer === serverNum &&
            wall &&
            wall.mode === "single" &&
            wall.tiles[0] &&
            wall.tiles[0].id === serverNum &&
            wall.tiles[0].running
        ) {
            applyAudioFocus(wall);
            return;
        }
        currentServer = serverNum;
        renderServerButtons();
        startWall("single", serverNum);
        if (window.zvAnalytics && typeof window.zvAnalytics.trackCamera === "function") {
            window.zvAnalytics.trackCamera(serverNum);
        }
    }

    function selectAllCameras(fromUserGesture = false) {
        if (fromUserGesture) {
            userHasInteracted = true;
        }
        currentServer = "all";
        renderServerButtons();
        startWall("grid");
        if (window.zvAnalytics && typeof window.zvAnalytics.trackCamera === "function") {
            window.zvAnalytics.trackCamera("all");
        }
    }

    function initPlayerStreams() {
        document.body.classList.remove("locked");
        const lock = document.getElementById("lock-screen");
        if (lock) lock.remove();

        renderServerButtons();
        selectServer(1, false);

        window.addEventListener("storage", (e) => {
            if (e && e.key === CUSTOM_SERVERS_STORAGE_KEY) {
                cameraCryptoKeyCache.clear();
                if (currentServer === "all") {
                    startWall("grid");
                } else {
                    startWall("single", currentServer || 1);
                }
            }
        });
    }

    /* ============================================================
       6. THE PLAYER ("wall") — SINGLE CAMERA & 2x2 GRID
       ============================================================ */
    let wall = null;
    let playerVolume = 0.8;
    let playerMuted = false;
    let userHasInteracted = false;

    ["click", "touchend", "mouseup", "keydown"].forEach((ev) => {
        document.addEventListener(
            ev,
            () => {
                userHasInteracted = true;
            },
            { passive: true, capture: true }
        );
    });

    const HIDE_DELAY = 3000;
    const MIN_EXPANDED_ZOOM = 1;
    const MAX_EXPANDED_ZOOM = 4;
    const ZOOM_STEP = 0.5;
    let unmuteCleanup = null;

    function disarmUnmuteOnInteraction() {
        if (unmuteCleanup) unmuteCleanup();
    }

    function armUnmuteOnInteraction(w, video, isStale) {
        disarmUnmuteOnInteraction();
        const events = ["click", "touchend", "mouseup", "keydown"];
        const handler = () => {
            userHasInteracted = true;
            if (isStale()) {
                disarmUnmuteOnInteraction();
                return;
            }
            try {
                video.volume = w && w.mode === "single" ? (playerVolume > 0 ? playerVolume : 0.8) : 1;
                video.muted = false;
                const p = video.play();
                if (p && typeof p.then === "function") {
                    p.then(() => {
                        if (!video.muted) {
                            disarmUnmuteOnInteraction();
                        }
                        if (w && wall === w) updateMuteUi(w);
                    }).catch(() => {
                        video.muted = true;
                        video.play().catch(() => {});
                        if (w && wall === w) updateMuteUi(w);
                    });
                } else {
                    if (!video.muted) disarmUnmuteOnInteraction();
                    if (w && wall === w) updateMuteUi(w);
                }
            } catch (e) {}
        };
        events.forEach((e) => document.addEventListener(e, handler, { passive: true, capture: true }));
        unmuteCleanup = () => {
            events.forEach((e) => document.removeEventListener(e, handler, { capture: true }));
            unmuteCleanup = null;
        };
    }

    function releaseTile(tile) {
        tile.token++;
        tile.running = false;
        tile.ready = false;
        const video = tile.video;
        const player = tile.player;
        tile.player = null;
        if (!video) return;
        try {
            video.muted = true;
            video.pause();
        } catch (e) {}
        const release = () => {
            try {
                video.removeAttribute("src");
                video.load();
            } catch (e) {}
        };
        if (player) player.destroy().catch(() => {}).finally(release);
        else release();
    }

    function destroyWall() {
        disarmUnmuteOnInteraction();
        const w = wall;
        wall = null;
        if (!w) return;
        w.cleanups.forEach((fn) => fn());
        w.tiles.forEach(releaseTile);
    }

    function getZoomableTile(w) {
        if (!w) return null;
        if (w.mode === "single") {
            return w.tiles[0] || null;
        }
        if (w.mode === "grid" && w.expandedId !== null) {
            return w.tiles.find((t) => t.id === w.expandedId) || null;
        }
        return null;
    }

    function ensureZoomableTile(w, targetNode) {
        if (!w) return null;
        const existing = getZoomableTile(w);
        if (existing) return existing;
        if (w.mode === "grid" && w.expandedId === null && w.tiles.length > 0) {
            let pickId = null;
            if (targetNode && typeof targetNode.closest === "function") {
                const tileEl = targetNode.closest(".wall-tile:not(.offline):not(.mv-filler)");
                if (tileEl && tileEl.dataset && tileEl.dataset.id) {
                    pickId = Number(tileEl.dataset.id);
                }
            }
            if (!pickId || !w.tiles.some((t) => t.id === pickId)) {
                pickId = w.audioId || w.tiles[0].id;
            }
            expandCamera(w, pickId);
            return getZoomableTile(w);
        }
        return null;
    }

    function clampExpandedPan(w, scale, x, y) {
        if (scale <= MIN_EXPANDED_ZOOM + 0.001) {
            return { x: 0, y: 0 };
        }
        const tile = getZoomableTile(w);
        const el = (tile && tile.el) || (w && w.grid) || (w && w.container);
        const rect = el && typeof el.getBoundingClientRect === "function" ? el.getBoundingClientRect() : null;
        const width = (rect && rect.width) || (el && el.clientWidth) || 640;
        const height = (rect && rect.height) || (el && el.clientHeight) || 360;
        const maxPanX = Math.max(0, ((scale - 1) * width) / 2);
        const maxPanY = Math.max(0, ((scale - 1) * height) / 2);
        return {
            x: Math.max(-maxPanX, Math.min(maxPanX, x)),
            y: Math.max(-maxPanY, Math.min(maxPanY, y)),
        };
    }

    function updateZoomControlsUi(w) {
        if (!w) return;
        const scale = (w.zoom && w.zoom.scale) || 1;
        const isZoomed = scale > MIN_EXPANDED_ZOOM + 0.01;
        if (w.zoomResetBtn) {
            w.zoomResetBtn.textContent = `${scale.toFixed(1)}x`;
            w.zoomResetBtn.classList.toggle("is-active", isZoomed);
        }
        if (w.zoomOutBtn) {
            w.zoomOutBtn.disabled = scale <= MIN_EXPANDED_ZOOM + 0.01;
        }
        if (w.zoomInBtn) {
            w.zoomInBtn.disabled = scale >= MAX_EXPANDED_ZOOM - 0.01;
        }
        if (w.zoomHud) {
            w.zoomHud.hidden = !isZoomed;
            const scaleEl = w.zoomHud.querySelector(".zv-zoom-hud-scale");
            if (scaleEl) scaleEl.textContent = `${scale.toFixed(1)}x`;
        }
    }

    function applyExpandedZoomTransform(w) {
        if (!w || !w.zoom) return;
        const scale = w.zoom.scale;
        const isZoomed = scale > MIN_EXPANDED_ZOOM + 0.01;
        const clamped = clampExpandedPan(w, scale, w.zoom.x, w.zoom.y);
        w.zoom.x = clamped.x;
        w.zoom.y = clamped.y;

        const activeTile = getZoomableTile(w);
        w.tiles.forEach((t) => {
            const isTarget = Boolean(activeTile && activeTile.id === t.id);
            t.el.classList.toggle("is-zoomed", isTarget && isZoomed);
            t.el.classList.toggle("is-panning", Boolean(isTarget && isZoomed && w.zoom.isDragging));
            if (t.video) {
                if (isTarget && isZoomed) {
                    t.video.style.transform = `translate3d(${w.zoom.x.toFixed(2)}px, ${w.zoom.y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
                } else {
                    t.video.style.transform = "";
                }
            }
        });

        updateZoomControlsUi(w);
    }

    function resetExpandedZoom(w) {
        if (!w || !w.zoom) return;
        w.zoom.scale = 1;
        w.zoom.x = 0;
        w.zoom.y = 0;
        w.zoom.isDragging = false;
        applyExpandedZoomTransform(w);
    }

    function zoomExpandedAtPoint(w, targetScale, focalClientX, focalClientY, targetNode) {
        if (!w || !w.zoom) return;
        const tile = ensureZoomableTile(w, targetNode);
        if (!tile) return;

        const prevScale = w.zoom.scale || 1;
        const nextScale = Math.max(MIN_EXPANDED_ZOOM, Math.min(MAX_EXPANDED_ZOOM, Number(targetScale) || 1));
        if (nextScale <= MIN_EXPANDED_ZOOM + 0.005) {
            resetExpandedZoom(w);
            return;
        }

        const el = tile.el || w.grid || w.container;
        if (el && typeof focalClientX === "number" && typeof focalClientY === "number") {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = focalClientX - centerX;
            const dy = focalClientY - centerY;
            const ratio = nextScale / prevScale;
            w.zoom.x = dx - (dx - w.zoom.x) * ratio;
            w.zoom.y = dy - (dy - w.zoom.y) * ratio;
        } else {
            const ratio = nextScale / prevScale;
            w.zoom.x = w.zoom.x * ratio;
            w.zoom.y = w.zoom.y * ratio;
        }

        w.zoom.scale = nextScale;
        applyExpandedZoomTransform(w);
    }

    function setupExpandedZoomAndPan(w) {
        if (!w || !w.grid) return;
        const grid = w.grid;
        let mouseDown = false;
        let dragMoved = false;
        let startMouseX = 0;
        let startMouseY = 0;
        let startPanX = 0;
        let startPanY = 0;

        let pinchStartDist = 0;
        let pinchStartScale = 1;
        let lastPinchMidX = 0;
        let lastPinchMidY = 0;
        let touchPanActive = false;
        let startTouchX = 0;
        let startTouchY = 0;
        let lastTapTime = 0;
        let lastTapX = 0;
        let lastTapY = 0;
        let safariGestureStartScale = 1;

        const isInteractiveTarget = (target) => {
            if (!target || !target.closest) return false;
            return Boolean(
                target.closest(".wall-controls, .mv-audio, .zv-zoom-hud")
            );
        };

        const onWheel = (e) => {
            if (wall !== w) return;
            if (isInteractiveTarget(e.target)) return;
            e.preventDefault();
            ensureZoomableTile(w, e.target);
            const deltaFactor = e.deltaMode === 1 ? 0.06 : e.ctrlKey ? 0.01 : 0.0028;
            const step = Math.max(-0.4, Math.min(0.4, -e.deltaY * deltaFactor));
            const nextScale = w.zoom.scale * Math.exp(step);
            zoomExpandedAtPoint(w, nextScale, e.clientX, e.clientY, e.target);
        };

        const onMouseDown = (e) => {
            if (wall !== w || e.button !== 0) return;
            if (isInteractiveTarget(e.target)) return;
            if (!getZoomableTile(w)) return;
            if (w.zoom.scale <= MIN_EXPANDED_ZOOM + 0.01) return;
            mouseDown = true;
            dragMoved = false;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            startPanX = w.zoom.x;
            startPanY = w.zoom.y;
            w.zoom.isDragging = true;
            applyExpandedZoomTransform(w);
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!mouseDown || wall !== w) return;
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                dragMoved = true;
                w.didPanDrag = true;
            }
            w.zoom.x = startPanX + dx;
            w.zoom.y = startPanY + dy;
            applyExpandedZoomTransform(w);
        };

        const onMouseUp = () => {
            if (!mouseDown) return;
            mouseDown = false;
            if (w && w.zoom) {
                w.zoom.isDragging = false;
                applyExpandedZoomTransform(w);
            }
            if (dragMoved) {
                setTimeout(() => {
                    if (w) w.didPanDrag = false;
                }, 80);
            }
        };

        const onDblClick = (e) => {
            if (wall !== w) return;
            if (isInteractiveTarget(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            ensureZoomableTile(w, e.target);
            if (w.zoom.scale > MIN_EXPANDED_ZOOM + 0.05) {
                resetExpandedZoom(w);
            } else {
                zoomExpandedAtPoint(w, 2.5, e.clientX, e.clientY, e.target);
            }
        };

        const getTouchDist = (t0, t1) => Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        const getTouchMid = (t0, t1) => ({
            x: (t0.clientX + t1.clientX) / 2,
            y: (t0.clientY + t1.clientY) / 2,
        });

        const onTouchStart = (e) => {
            if (wall !== w) return;
            if (isInteractiveTarget(e.target)) return;

            if (e.touches.length === 2) {
                e.preventDefault();
                ensureZoomableTile(w, e.target);
                touchPanActive = false;
                const t0 = e.touches[0];
                const t1 = e.touches[1];
                pinchStartDist = Math.max(10, getTouchDist(t0, t1));
                pinchStartScale = w.zoom.scale || 1;
                const mid = getTouchMid(t0, t1);
                lastPinchMidX = mid.x;
                lastPinchMidY = mid.y;
                w.zoom.isDragging = true;
                applyExpandedZoomTransform(w);
                return;
            }

            if (e.touches.length === 1) {
                if (!getZoomableTile(w)) return;
                const t0 = e.touches[0];
                const now = Date.now();
                const dt = now - lastTapTime;
                const tapDist = Math.hypot(t0.clientX - lastTapX, t0.clientY - lastTapY);
                if (dt > 0 && dt < 280 && tapDist < 32) {
                    e.preventDefault();
                    lastTapTime = 0;
                    if (w.zoom.scale > MIN_EXPANDED_ZOOM + 0.05) {
                        resetExpandedZoom(w);
                    } else {
                        zoomExpandedAtPoint(w, 2.5, t0.clientX, t0.clientY, e.target);
                    }
                    return;
                }
                lastTapTime = now;
                lastTapX = t0.clientX;
                lastTapY = t0.clientY;

                if (w.zoom.scale > MIN_EXPANDED_ZOOM + 0.01) {
                    touchPanActive = true;
                    dragMoved = false;
                    startTouchX = t0.clientX;
                    startTouchY = t0.clientY;
                    startPanX = w.zoom.x;
                    startPanY = w.zoom.y;
                    w.zoom.isDragging = true;
                    applyExpandedZoomTransform(w);
                }
            }
        };

        const onTouchMove = (e) => {
            if (wall !== w) return;
            if (e.touches.length === 2 && pinchStartDist > 0) {
                e.preventDefault();
                const t0 = e.touches[0];
                const t1 = e.touches[1];
                const dist = Math.max(10, getTouchDist(t0, t1));
                const mid = getTouchMid(t0, t1);
                const nextScale = Math.max(
                    MIN_EXPANDED_ZOOM,
                    Math.min(MAX_EXPANDED_ZOOM, pinchStartScale * (dist / pinchStartDist))
                );

                w.zoom.x += mid.x - lastPinchMidX;
                w.zoom.y += mid.y - lastPinchMidY;
                lastPinchMidX = mid.x;
                lastPinchMidY = mid.y;
                lastTapTime = 0;

                zoomExpandedAtPoint(w, nextScale, mid.x, mid.y, e.target);
                return;
            }

            if (e.touches.length === 1 && touchPanActive && w.zoom.scale > MIN_EXPANDED_ZOOM + 0.01) {
                e.preventDefault();
                const t0 = e.touches[0];
                const dx = t0.clientX - startTouchX;
                const dy = t0.clientY - startTouchY;
                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                    dragMoved = true;
                    w.didPanDrag = true;
                    lastTapTime = 0;
                }
                w.zoom.x = startPanX + dx;
                w.zoom.y = startPanY + dy;
                applyExpandedZoomTransform(w);
            }
        };

        const onTouchEnd = (e) => {
            if (wall !== w) return;
            if (e.touches.length === 1 && w.zoom.scale > MIN_EXPANDED_ZOOM + 0.01) {
                pinchStartDist = 0;
                touchPanActive = true;
                startTouchX = e.touches[0].clientX;
                startTouchY = e.touches[0].clientY;
                startPanX = w.zoom.x;
                startPanY = w.zoom.y;
                return;
            }
            if (e.touches.length === 0) {
                pinchStartDist = 0;
                touchPanActive = false;
                if (w.zoom) {
                    w.zoom.isDragging = false;
                    if (w.zoom.scale <= MIN_EXPANDED_ZOOM + 0.01) {
                        resetExpandedZoom(w);
                    } else {
                        applyExpandedZoomTransform(w);
                    }
                }
                if (dragMoved) {
                    setTimeout(() => {
                        if (w) w.didPanDrag = false;
                    }, 80);
                }
            }
        };

        const onGestureStart = (e) => {
            if (wall !== w || isInteractiveTarget(e.target)) return;
            e.preventDefault();
            ensureZoomableTile(w, e.target);
            safariGestureStartScale = w.zoom.scale || 1;
        };
        const onGestureChange = (e) => {
            if (wall !== w || pinchStartDist > 0) return;
            e.preventDefault();
            if (typeof e.scale === "number" && e.scale > 0) {
                const nextScale = Math.max(
                    MIN_EXPANDED_ZOOM,
                    Math.min(MAX_EXPANDED_ZOOM, safariGestureStartScale * e.scale)
                );
                zoomExpandedAtPoint(w, nextScale, e.clientX, e.clientY, e.target);
            }
        };

        const onWindowResize = () => {
            if (wall === w && w.zoom && w.zoom.scale > 1) {
                applyExpandedZoomTransform(w);
            }
        };

        grid.addEventListener("wheel", onWheel, { passive: false });
        grid.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        grid.addEventListener("dblclick", onDblClick);
        grid.addEventListener("touchstart", onTouchStart, { passive: false });
        grid.addEventListener("touchmove", onTouchMove, { passive: false });
        grid.addEventListener("touchend", onTouchEnd);
        grid.addEventListener("touchcancel", onTouchEnd);
        grid.addEventListener("gesturestart", onGestureStart, { passive: false });
        grid.addEventListener("gesturechange", onGestureChange, { passive: false });
        window.addEventListener("resize", onWindowResize);

        w.cleanups.push(() => {
            grid.removeEventListener("wheel", onWheel);
            grid.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            grid.removeEventListener("dblclick", onDblClick);
            grid.removeEventListener("touchstart", onTouchStart);
            grid.removeEventListener("touchmove", onTouchMove);
            grid.removeEventListener("touchend", onTouchEnd);
            grid.removeEventListener("touchcancel", onTouchEnd);
            grid.removeEventListener("gesturestart", onGestureStart);
            grid.removeEventListener("gesturechange", onGestureChange);
            window.removeEventListener("resize", onWindowResize);
        });
    }

    function startWall(mode, focusId) {
        const container = document.getElementById("player-container");
        if (!container) return;

        destroyWall();
        container.classList.toggle("is-grid", mode === "grid");
        container.classList.remove("mv-idle");

        const ids = mode === "grid" ? getServerIds() : [focusId];
        container.innerHTML = `<div class="wall ${mode}" id="wall"></div>`;
        const grid = document.getElementById("wall");

        const w = {
            mode,
            container,
            grid,
            tiles: [],
            audioId: null,
            quality: "1080",
            expandedId: null,
            zoom: {
                scale: 1,
                x: 0,
                y: 0,
                isDragging: false,
            },
            cleanups: [],
            hideTimer: null,
            swallowClick: false,
        };
        wall = w;

        ids.forEach((id) => {
            const cfg = getServerConfig(id);
            const url = getServerUrl(id);
            const el = document.createElement("div");
            el.className = "wall-tile";
            el.dataset.id = id;

            if (!url) {
                el.classList.add("offline");
                el.innerHTML = `<div class="mv-label"><span class="dot"></span>${cfg ? cfg.name : "Camera"}</div><div class="mv-msg">Not available</div>`;
                grid.appendChild(el);
                return;
            }

            const startUnmuted = Boolean(
                !playerMuted &&
                    (mode === "single" || (userHasInteracted && id === ids[0]))
            );

            el.innerHTML = `
                <video playsinline webkit-playsinline ${startUnmuted ? "" : "muted"} autoplay disableremoteplayback x-webkit-airplay="deny"></video>
                ${
                    mode === "grid"
                        ? `<div class="mv-label"><span class="dot live"></span>${cfg.name}</div>
                <button type="button" class="mv-audio" title="Listen to this camera" aria-label="Listen to ${cfg.name}"><i class="fas fa-volume-xmark"></i></button>`
                        : ""
                }
                <div class="mv-msg" hidden></div>`;
            grid.appendChild(el);

            const videoEl = el.querySelector("video");
            if (videoEl) {
                videoEl.playsInline = true;
                videoEl.volume = mode === "single" ? (playerVolume > 0 ? playerVolume : 0.8) : 1;
                videoEl.muted = !startUnmuted;
                if ("disableRemotePlayback" in videoEl) {
                    try {
                        videoEl.disableRemotePlayback = true;
                    } catch (e) {}
                }
                if (startUnmuted && userHasInteracted) {
                    try {
                        const primePlay = videoEl.play();
                        if (primePlay && typeof primePlay.catch === "function") {
                            primePlay.catch(() => {});
                        }
                    } catch (e) {}
                }
                if (mode === "single") {
                    videoEl.addEventListener("volumechange", () => {
                        if (wall === w) updateMuteUi(w);
                    });
                }
            }

            const tile = {
                id,
                el,
                video: videoEl,
                player: null,
                url,
                running: false,
                ready: false,
                token: 0,
            };
            w.tiles.push(tile);

            if (mode === "grid") {
                el.addEventListener("click", () => {
                    if (w.didPanDrag) return;
                    if (w.expandedId === null) expandCamera(w, id);
                });
                el.querySelector(".mv-audio").addEventListener("click", (e) => {
                    e.stopPropagation();
                    userHasInteracted = true;
                    w.audioId = id;
                    applyAudioFocus(w);
                });
            } else {
                el.addEventListener("click", () => {
                    if (w.didPanDrag) return;
                    userHasInteracted = true;
                    if (!playerMuted && videoEl && videoEl.muted) {
                        videoEl.volume = playerVolume > 0 ? playerVolume : 0.8;
                        videoEl.muted = false;
                        videoEl.play().catch(() => {});
                        updateMuteUi(w);
                    }
                });
            }
        });

        if (mode === "grid" && ids.length % 2 === 1) {
            const filler = document.createElement("div");
            filler.className = "wall-tile mv-filler";
            filler.innerHTML = `<div class="mv-filler-logo" aria-hidden="true">
                <img src="/ranker/assets/logo_pbb_collab.png" alt="" />
            </div>`;
            grid.appendChild(filler);
        }

        w.audioId = w.tiles.length ? w.tiles[0].id : null;
        buildControls(w);
        setupExpandedZoomAndPan(w);
        setupAutoHide(w);
        updateFullscreenUi();
        w.tiles.forEach((t) => void startTile(w, t));
    }

    function attachZoomControlButtons(w, bar) {
        w.zoomOutBtn = bar.querySelector(".wc-zoom-out");
        w.zoomResetBtn = bar.querySelector(".wc-zoom-reset");
        w.zoomInBtn = bar.querySelector(".wc-zoom-in");

        const hud = document.createElement("button");
        hud.type = "button";
        hud.className = "zv-zoom-hud";
        hud.hidden = true;
        hud.title = "Tap to reset zoom to 1.0x";
        hud.innerHTML = `<i class="fas fa-magnifying-glass-plus"></i><span class="zv-zoom-hud-scale">1.0x</span><span>Drag to move · Reset</span>`;
        hud.addEventListener("click", (e) => {
            e.stopPropagation();
            resetExpandedZoom(w);
        });
        w.container.appendChild(hud);
        w.zoomHud = hud;

        if (w.zoomOutBtn) {
            w.zoomOutBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const next = Math.max(MIN_EXPANDED_ZOOM, Math.round((w.zoom.scale - ZOOM_STEP) * 2) / 2);
                zoomExpandedAtPoint(w, next);
            });
        }
        if (w.zoomResetBtn) {
            w.zoomResetBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (w.zoom.scale > MIN_EXPANDED_ZOOM + 0.01) {
                    resetExpandedZoom(w);
                } else {
                    zoomExpandedAtPoint(w, 2.0);
                }
            });
        }
        if (w.zoomInBtn) {
            w.zoomInBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const next = Math.min(MAX_EXPANDED_ZOOM, Math.round((w.zoom.scale + ZOOM_STEP) * 2) / 2);
                zoomExpandedAtPoint(w, next);
            });
        }
        updateZoomControlsUi(w);
    }

    function buildGridControls(w) {
        const bar = document.createElement("div");
        bar.className = "wall-controls";
        bar.innerHTML = `
            <div class="wc-group gx-nav">
                <button type="button" class="wc-pill mv-back" title="Back to all cameras"><i class="fas fa-arrow-left"></i><span class="mv-label-text">All Cameras</span></button>
                <span class="mv-cams"></span>
            </div>
            <div class="wc-group gx-right">
                <div class="wc-group gx-zoom" role="group" aria-label="Camera zoom controls">
                    <button type="button" class="wc-zoom-btn wc-zoom-out" title="Zoom out" aria-label="Zoom out" disabled><i class="fas fa-minus"></i></button>
                    <button type="button" class="wc-zoom-reset" title="Zoom level / Reset to 1.0x" aria-label="Reset zoom">1.0x</button>
                    <button type="button" class="wc-zoom-btn wc-zoom-in" title="Zoom in" aria-label="Zoom in"><i class="fas fa-plus"></i></button>
                </div>
                <select class="wc-quality" title="Quality" aria-label="Quality"><option value="1080" selected>1080p</option><option value="auto">Auto</option></select>
                <button type="button" class="wc-btn wc-fs" title="Fullscreen" aria-label="Fullscreen"><i class="fas fa-expand"></i></button>
            </div>`;
        w.container.appendChild(bar);
        w.bar = bar;
        w.qualitySelect = bar.querySelector(".wc-quality");

        bar.querySelector(".mv-back").addEventListener("click", () => collapseCameras(w));
        attachZoomControlButtons(w, bar);
        w.qualitySelect.addEventListener("change", () => {
            w.quality = w.qualitySelect.value;
            w.tiles.forEach((t) => applyTileQuality(w, t, false));
        });
        bar.querySelector(".wc-fs").addEventListener("click", toggleContainerFullscreen);

        const wrap = bar.querySelector(".mv-cams");
        w.tiles.forEach((t) => {
            const cfg = getServerConfig(t.id) || {};
            const b = document.createElement("button");
            b.type = "button";
            b.className = "wc-pill mv-cam";
            b.dataset.id = t.id;
            b.title = cfg.name || "Camera";
            b.innerHTML = `<i class="fas ${cfg.icon || "fa-video"}"></i><span class="mv-label-text">${cfg.short || cfg.name || ""}</span>`;
            b.addEventListener("click", () => switchCamera(w, t.id));
            wrap.appendChild(b);
        });
    }

    function buildControls(w) {
        if (w.mode === "grid") {
            buildGridControls(w);
            return;
        }
        const bar = document.createElement("div");
        bar.className = "wall-controls";
        bar.innerHTML = `
            <div class="wc-group">
                <button type="button" class="wc-btn wc-mute" title="Mute / unmute" aria-label="Mute or unmute"><i class="fas fa-volume-high"></i></button>
                <input type="range" class="wc-volume" min="0" max="100" step="1" value="80" aria-label="Volume">
            </div>
            <div class="wc-group">
                <div class="wc-group gx-zoom" role="group" aria-label="Camera zoom controls">
                    <button type="button" class="wc-zoom-btn wc-zoom-out" title="Zoom out" aria-label="Zoom out" disabled><i class="fas fa-minus"></i></button>
                    <button type="button" class="wc-zoom-reset" title="Zoom level / Reset to 1.0x" aria-label="Reset zoom">1.0x</button>
                    <button type="button" class="wc-zoom-btn wc-zoom-in" title="Zoom in" aria-label="Zoom in"><i class="fas fa-plus"></i></button>
                </div>
                <select class="wc-quality" title="Quality" aria-label="Quality"><option value="1080" selected>1080p</option><option value="auto">Auto</option></select>
                <button type="button" class="wc-btn wc-fs" title="Fullscreen" aria-label="Fullscreen"><i class="fas fa-expand"></i></button>
            </div>`;
        w.container.appendChild(bar);
        w.bar = bar;
        w.muteBtn = bar.querySelector(".wc-mute");
        w.volumeInput = bar.querySelector(".wc-volume");
        w.qualitySelect = bar.querySelector(".wc-quality");
        attachZoomControlButtons(w, bar);

        w.muteBtn.addEventListener("click", () => {
            userHasInteracted = true;
            const focused = w.tiles.find((t) => t.id === focusedId(w));
            const videoActuallyMuted = Boolean(focused && focused.video && focused.video.muted);
            const currentlySilent = playerMuted || playerVolume === 0 || videoActuallyMuted;
            playerMuted = !currentlySilent;
            if (!playerMuted && playerVolume === 0) playerVolume = 0.8;
            applyAudioFocus(w);
        });

        w.volumeInput.addEventListener("input", () => {
            userHasInteracted = true;
            const focused = w.tiles.find((t) => t.id === focusedId(w));
            const wasSilent = playerMuted || Boolean(focused && focused.video && focused.video.muted);
            playerVolume = Number(w.volumeInput.value) / 100;
            playerMuted = playerVolume === 0;
            if (wasSilent && !playerMuted) {
                applyAudioFocus(w);
                return;
            }
            if (focused && focused.video) {
                try {
                    focused.video.volume = playerVolume;
                    focused.video.muted = playerMuted;
                } catch (e) {}
            }
            updateMuteUi(w);
        });

        w.qualitySelect.addEventListener("change", () => {
            w.quality = w.qualitySelect.value;
            w.tiles.forEach((t) => applyTileQuality(w, t, false));
        });

        bar.querySelector(".wc-fs").addEventListener("click", toggleContainerFullscreen);
        updateMuteUi(w);
    }

    function focusedId(w) {
        if (w.mode === "single") return w.tiles[0] && w.tiles[0].id;
        return w.expandedId !== null ? w.expandedId : w.audioId;
    }

    function updateMuteUi(w) {
        if (!w || !w.muteBtn) return;
        const focused = w.tiles.find((t) => t.id === focusedId(w));
        const videoMuted = Boolean(focused && focused.video && focused.ready && focused.video.muted);
        const silent = playerMuted || playerVolume === 0 || videoMuted;
        const icon = w.muteBtn.querySelector("i");
        if (icon) {
            icon.className = "fas " + (silent ? "fa-volume-xmark" : playerVolume < 0.5 ? "fa-volume-low" : "fa-volume-high");
        }
        if (w.volumeInput) {
            w.volumeInput.value = silent ? 0 : Math.round(playerVolume * 100);
        }
    }

    function applyAudioFocus(w) {
        if (wall !== w) return;
        const focus = focusedId(w);
        const muted = w.mode === "single" && playerMuted;
        const volume = w.mode === "single" ? (playerVolume > 0 ? playerVolume : 0.8) : 1;
        w.tiles.forEach((t) => {
            const on = t.id === focus;
            t.el.classList.toggle("listening", on);
            const icon = t.el.querySelector(".mv-audio i");
            if (icon) icon.className = on ? "fas fa-volume-high" : "fas fa-volume-xmark";

            try {
                t.video.volume = volume;
            } catch (e) {}

            if (!on || muted) {
                t.video.muted = true;
                return;
            }

            if (!t.ready) {
                t.video.muted = w.mode === "single" ? false : !userHasInteracted;
                return;
            }

            t.video.muted = false;
            const stale = () => wall !== w || (w.mode === "single" && playerMuted) || focusedId(w) !== t.id;
            const attempt = t.video.play();
            if (attempt && typeof attempt.then === "function") {
                attempt
                    .then(() => {
                        if (t.video.muted && !muted) {
                            armUnmuteOnInteraction(w, t.video, stale);
                        } else {
                            disarmUnmuteOnInteraction();
                        }
                        updateMuteUi(w);
                    })
                    .catch(() => {
                        t.video.muted = true;
                        t.video.play().catch(() => {});
                        updateMuteUi(w);
                        armUnmuteOnInteraction(w, t.video, stale);
                    });
            } else {
                updateMuteUi(w);
            }
        });
        updateMuteUi(w);
    }

    function stopTile(tile) {
        const oldVideo = tile.video;
        releaseTile(tile);
        const fresh = document.createElement("video");
        fresh.setAttribute("playsinline", "");
        fresh.setAttribute("webkit-playsinline", "");
        fresh.setAttribute("disableremoteplayback", "");
        fresh.setAttribute("x-webkit-airplay", "deny");
        fresh.playsInline = true;
        fresh.muted = true;
        if ("disableRemotePlayback" in fresh) {
            try {
                fresh.disableRemotePlayback = true;
            } catch (e) {}
        }
        oldVideo.replaceWith(fresh);
        tile.video = fresh;
    }

    function updateCamButtons(w) {
        if (!w.bar) return;
        w.bar.querySelectorAll(".mv-cam").forEach((b) => {
            b.classList.toggle("active", String(b.dataset.id) === String(w.expandedId));
        });
    }

    function expandCamera(w, id) {
        if (wall !== w) return;
        userHasInteracted = true;
        w.expandedId = id;
        if (!w.quality) w.quality = "1080";
        w.grid.classList.add("expanded");
        w.tiles.forEach((t) => {
            const isTarget = t.id === id;
            t.el.classList.toggle("expanded", isTarget);
            if (!isTarget) stopTile(t);
        });
        resetExpandedZoom(w);
        const target = w.tiles.find((t) => t.id === id);
        if (target && target.ready) {
            applyTileQuality(w, target, false);
            refreshQualityOptions(w);
        }
        updateCamButtons(w);
        applyAudioFocus(w);
        if (window.zvAnalytics && typeof window.zvAnalytics.trackCamera === "function") {
            window.zvAnalytics.trackCamera(id);
        }
    }

    function collapseCameras(w) {
        if (wall !== w) return;
        resetExpandedZoom(w);
        w.expandedId = null;
        if (!w.quality) w.quality = "1080";
        w.grid.classList.remove("expanded");
        w.tiles.forEach((t) => {
            t.el.classList.remove("expanded", "is-zoomed", "is-panning");
            if (t.video) t.video.style.transform = "";
            if (!t.running) void startTile(w, t);
        });
        updateCamButtons(w);
        updateZoomControlsUi(w);
        applyAudioFocus(w);
        if (window.zvAnalytics && typeof window.zvAnalytics.trackCamera === "function") {
            window.zvAnalytics.trackCamera("all");
        }
    }

    function switchCamera(w, id) {
        if (wall !== w || w.expandedId === id) return;
        userHasInteracted = true;
        const next = w.tiles.find((t) => t.id === id);
        if (!next) return;
        const prev = w.tiles.find((t) => t.id === w.expandedId);
        if (prev) stopTile(prev);

        w.expandedId = id;
        if (!w.quality) w.quality = "1080";
        w.tiles.forEach((t) => t.el.classList.toggle("expanded", t.id === id));
        resetExpandedZoom(w);
        updateCamButtons(w);
        if (!next.running) void startTile(w, next);
        else if (next.ready) {
            applyTileQuality(w, next, false);
            refreshQualityOptions(w);
        }
        applyAudioFocus(w);
        if (window.zvAnalytics && typeof window.zvAnalytics.trackCamera === "function") {
            window.zvAnalytics.trackCamera(id);
        }
    }

    function getHeightOptions(player) {
        const byHeight = new Map();
        player.getVariantTracks().forEach((t) => {
            if (!t.height) return;
            const cur = byHeight.get(t.height);
            if (!cur || t.bandwidth > cur.bandwidth) byHeight.set(t.height, t);
        });
        return Array.from(byHeight.values()).sort((a, b) => b.height - a.height);
    }

    function applyTileQuality(w, tile, isInitialLoad = false) {
        const p = tile.player;
        if (!p) return;
        if (w.quality === "auto") {
            p.configure({ abr: { enabled: true } });
            return;
        }

        const target = w.quality === "best" ? Infinity : Number(w.quality) || 1080;
        const options = getHeightOptions(p);
        const pick = options.find((t) => t.height <= target) || options[0];
        if (!pick) {
            p.configure({ abr: { enabled: true } });
            return;
        }
        p.configure({ abr: { enabled: false } });
        p.selectVariantTrack(pick, Boolean(isInitialLoad));
    }

    function refreshQualityOptions(w) {
        if (!w.qualitySelect) return;
        const heights = new Set([1080]);
        w.tiles.forEach((t) => {
            if (t.player && t.ready) getHeightOptions(t.player).forEach((o) => heights.add(o.height));
        });
        const sorted = Array.from(heights).sort((a, b) => b - a);

        w.qualitySelect.innerHTML = sorted
            .map((h) => `<option value="${h}">${h}p</option>`)
            .concat([`<option value="auto">Auto</option>`])
            .join("");

        let value = "1080";
        if (w.quality === "best") value = sorted.length ? String(sorted[0]) : "1080";
        else if (w.quality === "auto") value = "auto";
        else
            value = sorted.includes(Number(w.quality))
                ? String(w.quality)
                : sorted.length
                ? String(sorted.find((h) => h <= Number(w.quality)) || sorted[0])
                : "1080";
        w.qualitySelect.value = value;
    }

    function normalizeSubtitleLanguage(language) {
        const value = (language || "").toLowerCase();
        if (["fil", "tl", "tgl", "filipino", "tagalog"].includes(value)) return "fil";
        if (["en", "eng", "english"].includes(value)) return "en";
        return value;
    }

    function inferSidecarSubtitleMime(url) {
        const path = (url || "").split(/[?#]/)[0].toLowerCase();
        if (path.endsWith(".srt")) return "application/x-subrip";
        if (path.endsWith(".ttml") || path.endsWith(".xml")) return "application/ttml+xml";
        return "text/vtt";
    }

    async function setupSubtitles(player) {
        try {
            const files = SUBTITLE_FILES || {};
            await Promise.all(
                Object.entries(files)
                    .filter(([, url]) => (url || "").trim())
                    .map(([language, url]) => {
                        const u = url.trim();
                        return player.addTextTrackAsync(
                            u,
                            normalizeSubtitleLanguage(language),
                            "subtitle",
                            inferSidecarSubtitleMime(u),
                            null,
                            language === "fil" ? "Filipino" : "English"
                        );
                    })
            );

            const tracks = player.getTextTracks();
            if (!tracks.length) return;
            const preferred = normalizeSubtitleLanguage(DEFAULT_SUBTITLE_LANG) || "fil";
            const track =
                tracks.find((t) => normalizeSubtitleLanguage(t.language) === preferred) ||
                tracks.find((t) => normalizeSubtitleLanguage(t.language) === "en") ||
                tracks[0];
            await player.selectTextTrack(track);
            player.setTextTrackVisibility(true);
        } catch (e) {}
    }

    /* ============================================================
       7. START ONE CAMERA TILE WITH SHAKA PLAYER & CLEARKEY DRM
       ============================================================ */
    async function startNativeHlsFallback(w, tile, isStale, msg, showTileError) {
        if (isStale()) return;
        const video = tile.video;
        if (!video) return;
        try {
            if (tile.player) {
                await tile.player.destroy().catch(() => {});
                tile.player = null;
            }
            const hlsUrl = `${GATEWAY_ORIGIN}/livestream101/${tile.id}/master.m3u8`;
            const wantUnmuted = Boolean(!playerMuted && (w.mode === "single" || (userHasInteracted && focusedId(w) === tile.id)));
            video.playsInline = true;
            video.volume = w.mode === "single" ? (playerVolume > 0 ? playerVolume : 0.8) : 1;
            video.muted = !wantUnmuted;
            video.src = hlsUrl;

            const markReady = () => {
                if (isStale() || tile.ready) return;
                tile.ready = true;
                if (msg) msg.hidden = true;
                applyAudioFocus(w);
            };

            video.addEventListener("loadeddata", markReady, { once: true });
            video.addEventListener("canplay", markReady, { once: true });
            video.addEventListener("playing", markReady, { once: true });
            video.addEventListener(
                "error",
                () => {
                    if (!tile.ready) showTileError();
                },
                { once: true }
            );

            video.load();
            const playPromise = video.play();
            if (playPromise && playPromise.then) {
                playPromise.then(markReady).catch(() => {
                    video.muted = true;
                    video.play().catch(() => {});
                    markReady();
                });
            }
        } catch (e) {
            showTileError();
        }
    }

    async function startTile(w, tile) {
        const token = ++tile.token;
        const video = tile.video;
        const isStale = () => wall !== w || tile.token !== token;
        const msg = tile.el.querySelector(".mv-msg");
        const showTileError = () => {
            if (isStale()) return;
            if (msg) {
                msg.textContent = "Stream unavailable";
                msg.hidden = false;
            }
        };

        tile.running = true;
        tile.ready = false;
        if (msg) {
            msg.textContent = "Loading…";
            msg.hidden = false;
        }

        const camConfig = getCameraConfig(tile.id);
        if (!camConfig || !camConfig.mpdUrl) {
            showTileError();
            return;
        }

        if (video) {
            const shouldKeepUnmuted = Boolean(
                !playerMuted &&
                    (w.mode === "single" || (userHasInteracted && focusedId(w) === tile.id))
            );
            video.playsInline = true;
            video.volume = w.mode === "single" ? (playerVolume > 0 ? playerVolume : 0.8) : 1;
            video.muted = !shouldKeepUnmuted;
            video.setAttribute("playsinline", "");
            video.setAttribute("webkit-playsinline", "");
            video.setAttribute("disableremoteplayback", "");
            video.setAttribute("x-webkit-airplay", "deny");
            if ("disableRemotePlayback" in video) {
                try {
                    video.disableRemotePlayback = true;
                } catch (e) {}
            }
        }

        if (!window.shaka) {
            if (isIosOrWebKitDevice()) {
                await startNativeHlsFallback(w, tile, isStale, msg, showTileError);
                return;
            }
            showTileError();
            return;
        }

        if (typeof window.MediaSource === "undefined" && typeof window.ManagedMediaSource !== "undefined") {
            try {
                window.MediaSource = window.ManagedMediaSource;
            } catch (e) {}
        }

        shaka.polyfill.installAll();
        registerDirectEdgeSchemePlugin();
        void ensureSandboxBridge();

        if (!hasMseSupport() || !shaka.Player.isBrowserSupported()) {
            if (isIosOrWebKitDevice()) {
                await startNativeHlsFallback(w, tile, isStale, msg, showTileError);
                return;
            }
            showTileError();
            return;
        }

        const isAppleWebKit = isIosOrWebKitDevice();
        const hasClearKey = Boolean(camConfig.key && camConfig.keyId);
        const useWebCryptoCenc = Boolean(
            hasClearKey &&
                (isAppleWebKit || tile.forceWebCrypto) &&
                typeof crypto !== "undefined" &&
                crypto.subtle
        );

        let cameraCryptoKey = null;
        if (useWebCryptoCenc) {
            try {
                cameraCryptoKey = await getCameraCryptoKey(tile.id);
                if (isStale()) return;
            } catch (err) {
                if (isAppleWebKit) {
                    await startNativeHlsFallback(w, tile, isStale, msg, showTileError);
                    return;
                }
                showTileError();
                return;
            }
        }

        const player = new shaka.Player();
        await player.attach(video);
        tile.player = player;

        const clearKeysMap = { ...camConfig.clearKeys };
        let detectedLiveKidHex = camConfig.keyId || "";

        const netEngine = player.getNetworkingEngine();
        if (netEngine) {
            netEngine.registerResponseFilter(async (type, response) => {
                if (type === shaka.net.NetworkingEngine.RequestType.MANIFEST && response.data) {
                    try {
                        const xmlText = new TextDecoder().decode(response.data);
                        const { xml, liveKidHex } = normalizeMpdXml(
                            xmlText,
                            camConfig,
                            Boolean(useWebCryptoCenc && cameraCryptoKey)
                        );
                        if (liveKidHex) {
                            detectedLiveKidHex = liveKidHex;
                            tile.detectedLiveKidHex = liveKidHex;
                        }
                        if (liveKidHex && camConfig.key && !clearKeysMap[liveKidHex]) {
                            clearKeysMap[liveKidHex] = camConfig.key;
                            if (!useWebCryptoCenc) {
                                player.configure({
                                    drm: {
                                        clearKeys: { ...clearKeysMap },
                                    },
                                });
                            }
                        }
                        response.data = new TextEncoder().encode(xml).buffer;
                    } catch (e) {}
                    return;
                }

                if (response.data && type === shaka.net.NetworkingEngine.RequestType.SEGMENT) {
                    try {
                        const u8 = toUint8Array(response.data);
                        const uriStr = String((response && response.uri) || (response && response.originalUri) || "");
                        if (useWebCryptoCenc && cameraCryptoKey) {
                            if (uriStr.includes("_init.mp4")) {
                                cleanMp4InitInPlace(u8);
                            } else {
                                await decryptMp4SegmentInPlace(u8, cameraCryptoKey);
                            }
                        } else {
                            // Standard EME ClearKey: rewrite Widevine PSSH in _init.mp4 to W3C Common PSSH
                            // and strip duplicate Widevine PSSH in media segment moof boxes
                            if (uriStr.includes("_init.mp4")) {
                                rewriteMp4InitKidInPlace(u8, detectedLiveKidHex || camConfig.keyId);
                            } else {
                                stripMoofPsshInPlace(u8);
                            }
                        }
                        response.data =
                            u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength
                                ? u8.buffer
                                : u8.slice().buffer;
                    } catch (e) {}
                }
            });
        }

        const shakaConfig = {
            streaming: {
                bufferingGoal: isAppleWebKit ? 8 : w.mode === "single" ? 10 : 6,
                rebufferingGoal: 2,
                stallEnabled: !isAppleWebKit,
            },
            abr: {
                enabled: w.quality === "auto",
                defaultBandwidthEstimate: 10000000,
            },
        };

        if (!useWebCryptoCenc && Object.keys(clearKeysMap).length > 0) {
            shakaConfig.drm = {
                clearKeys: { ...clearKeysMap },
            };
        }

        player.configure(shakaConfig);

        const markTileReady = () => {
            if (isStale() || tile.ready) return;
            tile.ready = true;
            if (msg) msg.hidden = true;
            refreshQualityOptions(w);
            applyAudioFocus(w);
        };

        if (video) {
            video.addEventListener("loadeddata", markTileReady, { once: true });
            video.addEventListener("canplay", markTileReady, { once: true });
            video.addEventListener("playing", markTileReady, { once: true });
            video.addEventListener("pause", () => {
                setTimeout(() => {
                    if (isStale() || !tile.running || !video || document.hidden) return;
                    const shouldKeepPlaying =
                        w.mode === "single" || w.expandedId === null || w.expandedId === tile.id;
                    if (shouldKeepPlaying && video.paused) {
                        video.play().catch(() => {
                            video.muted = true;
                            video.play().catch(() => {});
                        });
                    }
                }, 40);
            });
        }

        player.addEventListener("error", async (event) => {
            if (event && typeof event.preventDefault === "function") {
                event.preventDefault();
            }
            if (event && event.detail) {
                event.detail.handled = true;
            }
            if (isStale()) return;

            if (!useWebCryptoCenc && !tile.forceWebCrypto && typeof crypto !== "undefined" && crypto.subtle) {
                tile.forceWebCrypto = true;
                try {
                    await player.destroy();
                } catch (e) {}
                tile.player = null;
                await startTile(w, tile);
                return;
            }
            if (isAppleWebKit && !tile.ready) {
                await startNativeHlsFallback(w, tile, isStale, msg, showTileError);
                return;
            }
            showTileError();
        });

        try {
            await player.load(camConfig.mpdUrl);
            if (isStale()) {
                player.destroy().catch(() => {});
                return;
            }

            applyTileQuality(w, tile, true);
            if (w.mode === "single") await setupSubtitles(player);
            if (isStale()) {
                player.destroy().catch(() => {});
                return;
            }

            markTileReady();

            // Verify that decoded video frames actually appear; if EME produced 0 frames, fall back to WebCrypto,
            // and if the upstream broadcaster rotated the default_KID, surface a clear diagnostic message.
            setTimeout(async () => {
                if (isStale() || !video) return;
                if (video.videoWidth > 0 && video.videoHeight > 0) return;

                if (!useWebCryptoCenc && !tile.forceWebCrypto && typeof crypto !== "undefined" && crypto.subtle) {
                    tile.forceWebCrypto = true;
                    try {
                        await player.destroy();
                    } catch (e) {}
                    tile.player = null;
                    await startTile(w, tile);
                    return;
                }

                setTimeout(() => {
                    if (isStale() || !video) return;
                    if (video.videoWidth > 0 && video.videoHeight > 0) return;
                    if (msg) {
                        msg.textContent = "Stream unavailable";
                        msg.hidden = false;
                    }
                }, 2500);
            }, 3000);
        } catch (error) {
            if (isStale()) return;
            if (!useWebCryptoCenc && !tile.forceWebCrypto && typeof crypto !== "undefined" && crypto.subtle) {
                tile.forceWebCrypto = true;
                try {
                    await player.destroy();
                } catch (e) {}
                tile.player = null;
                await startTile(w, tile);
                return;
            }
            if (isAppleWebKit) {
                await startNativeHlsFallback(w, tile, isStale, msg, showTileError);
                return;
            }
            showTileError();
        }
    }

    /* ============================================================
       8. AUTO-HIDE CONTROLS & FULLSCREEN HANDLERS
       ============================================================ */
    function setupAutoHide(w) {
        const container = w.container;

        const hide = () => {
            if (wall !== w) return;
            const active = document.activeElement;
            if (
                (active && active.classList && active.classList.contains("wc-quality")) ||
                (w.zoom && w.zoom.isDragging)
            ) {
                w.hideTimer = setTimeout(hide, HIDE_DELAY);
                return;
            }
            container.classList.add("mv-idle");
        };
        const show = () => {
            container.classList.remove("mv-idle");
            clearTimeout(w.hideTimer);
            w.hideTimer = setTimeout(hide, HIDE_DELAY);
        };
        const onDown = () => {
            show();
        };
        const bind = (target, type, fn, opts) => {
            target.addEventListener(type, fn, opts);
            w.cleanups.push(() => target.removeEventListener(type, fn, opts));
        };

        bind(container, "pointerdown", onDown, true);
        ["mousemove", "pointermove", "touchstart", "touchmove", "wheel"].forEach((type) =>
            bind(container, type, show, { passive: true })
        );
        bind(document, "keydown", show);
        w.cleanups.push(() => {
            clearTimeout(w.hideTimer);
            container.classList.remove("mv-idle");
        });

        show();
    }

    function isContainerFullscreen() {
        const c = document.getElementById("player-container");
        if (!c) return false;
        return document.fullscreenElement === c || document.webkitFullscreenElement === c || c.classList.contains("pseudo-fs");
    }

    function updateFullscreenUi() {
        const fs = isContainerFullscreen();
        const pc = document.getElementById("player-container");
        if (pc) pc.classList.toggle("fs-on", fs);
        const icon = document.querySelector(".wc-fs i");
        if (icon) icon.className = "fas " + (fs ? "fa-compress" : "fa-expand");
    }

    function setPseudoFullscreen(on) {
        const c = document.getElementById("player-container");
        if (!c) return;
        c.classList.toggle("pseudo-fs", on);
        document.body.classList.toggle("pseudo-fs-active", on);
        if (screen.orientation) {
            if (on && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
            if (!on && screen.orientation.unlock) {
                try {
                    screen.orientation.unlock();
                } catch (e) {}
            }
        }
        updateFullscreenUi();
        if (wall && wall.zoom && wall.zoom.scale > 1) applyExpandedZoomTransform(wall);
    }

    function toggleContainerFullscreen() {
        const c = document.getElementById("player-container");
        if (!c) return;

        if (c.classList.contains("pseudo-fs")) {
            setPseudoFullscreen(false);
            return;
        }

        if (document.fullscreenElement || document.webkitFullscreenElement) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (exit) exit.call(document);
            return;
        }

        const request = c.requestFullscreen || c.webkitRequestFullscreen;
        if (!request) {
            setPseudoFullscreen(true);
            return;
        }
        try {
            const result = request.call(c);
            const afterEnter = () => {
                if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
            };
            if (result && result.then) result.then(afterEnter).catch(() => setPseudoFullscreen(true));
            else afterEnter();
        } catch (e) {
            setPseudoFullscreen(true);
        }
    }

    function onFullscreenChange() {
        updateFullscreenUi();
        if (wall) {
            applyAudioFocus(wall);
            if (wall.zoom && wall.zoom.scale > 1) applyExpandedZoomTransform(wall);
        }
        if (!document.fullscreenElement && !document.webkitFullscreenElement && screen.orientation && screen.orientation.unlock) {
            try {
                screen.orientation.unlock();
            } catch (e) {}
        }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && document.body.classList.contains("pseudo-fs-active")) setPseudoFullscreen(false);
    });

    /* ============================================================
       9. ON-SCREEN COACH-MARK TUTORIAL (WITH ? BUTTON TRIGGER)
       ============================================================ */
    const TUTORIAL_STORAGE_KEY = "pilix_live_tutorial_seen_v1";
    let activeTutorialOverlay = null;
    let currentTutorialStep = 0;

    const TUTORIAL_STEPS = [
        {
            kicker: "STEP 1 OF 4 · CAMERA SWITCHER",
            title: "Switch Live Cameras Anytime",
            desc: "Use the bottom navigation bar to watch Main, Dining, or External in single-camera view with live audio, or tap All for the 2x2 grid.",
            getTarget: () => document.getElementById("server-selector"),
            radius: 999,
            padding: 6,
            gestures: [
                { icon: "fa-tv", label: "Single Cam", sub: "Unmuted live audio" },
                { icon: "fa-utensils", label: "3 Angles", sub: "Main · Dining · Ext" },
                { icon: "fa-table-cells-large", label: "All (2x2)", sub: "Watch all at once" },
            ],
        },
        {
            kicker: "STEP 2 OF 4 · 2X2 MULTI-VIEW",
            title: "2x2 Grid & Room Audio Selector",
            desc: "Inside All (2x2 Grid), tap the Speaker icon on any camera tile to listen to that room, or tap any camera tile to expand it full-screen.",
            getTarget: () =>
                document.querySelector("#server-selector .nav-btn:last-child") ||
                document.getElementById("server-selector"),
            radius: 999,
            padding: 6,
            gestures: [
                { icon: "fa-volume-high", label: "Tap Speaker", sub: "Choose room audio" },
                { icon: "fa-up-right-and-down-left-from-center", label: "Tap Camera", sub: "Expand full-view" },
                { icon: "fa-arrow-left", label: "All Cameras", sub: "Back to 2x2 grid" },
            ],
        },
        {
            kicker: "STEP 3 OF 4 · LIVE ZOOM & PAN",
            title: "Zoom Up to 4x & Move Freely",
            desc: "On any camera (Single Cam or 2x2 Grid), pinch, scroll, double-tap, or use the - / 1.0x / + buttons to zoom up to 4.0x, then drag to move anywhere in the frame.",
            getTarget: () => document.getElementById("player-container"),
            radius: 16,
            padding: 4,
            gestures: [
                { icon: "fa-magnifying-glass-plus", label: "Pinch / + Btn", sub: "Zoom 1.0x to 4.0x" },
                { icon: "fa-arrows-up-down-left-right", label: "Drag to Move", sub: "Pan anywhere" },
                { icon: "fa-rotate-left", label: "Double-Tap", sub: "Quick zoom / 1.0x" },
            ],
        },
        {
            kicker: "STEP 4 OF 4 · PLAYER CONTROLS",
            title: "Volume, HD Quality & Fullscreen",
            desc: "Use the player control bar to adjust volume or mute, select video resolution (Auto / 1080p / 720p), or enter Fullscreen mode.",
            getTarget: () =>
                document.querySelector("#player-container .wall-controls") ||
                document.getElementById("player-container"),
            radius: 14,
            padding: 4,
            revealControls: true,
            gestures: [
                { icon: "fa-volume-high", label: "Volume / Mute", sub: "Bottom-left bar" },
                { icon: "fa-sliders", label: "Video Quality", sub: "Auto or manual HD" },
                { icon: "fa-expand", label: "Fullscreen", sub: "Landscape mode" },
            ],
        },
    ];

    function unlockAudioFromTutorial() {
        userHasInteracted = true;
        if (wall && !playerMuted) {
            applyAudioFocus(wall);
        }
    }

    function positionTutorialStep() {
        if (!activeTutorialOverlay) return;
        const step = TUTORIAL_STEPS[currentTutorialStep];
        if (!step) return;

        const container = document.getElementById("player-container");
        if (container && step.revealControls) {
            container.classList.remove("mv-idle");
        }

        const spotlight = activeTutorialOverlay.querySelector(".zv-tut-spotlight");
        const pointer = activeTutorialOverlay.querySelector(".zv-tut-pointer");
        const card = activeTutorialOverlay.querySelector(".zv-tut-card");
        if (!spotlight || !pointer || !card) return;

        const targetEl = typeof step.getTarget === "function" ? step.getTarget() : null;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let tRect = targetEl ? targetEl.getBoundingClientRect() : null;
        if (!tRect || (tRect.width === 0 && tRect.height === 0)) {
            tRect = {
                left: vw * 0.1,
                top: vh * 0.2,
                width: vw * 0.8,
                height: vh * 0.4,
                right: vw * 0.9,
                bottom: vh * 0.6,
            };
        }

        const pad = typeof step.padding === "number" ? step.padding : 6;
        const sTop = Math.max(4, tRect.top - pad);
        const sLeft = Math.max(4, tRect.left - pad);
        const sWidth = Math.min(vw - sLeft - 4, tRect.width + pad * 2);
        const sHeight = Math.min(vh - sTop - 4, tRect.height + pad * 2);

        spotlight.style.top = `${Math.round(sTop)}px`;
        spotlight.style.left = `${Math.round(sLeft)}px`;
        spotlight.style.width = `${Math.round(sWidth)}px`;
        spotlight.style.height = `${Math.round(sHeight)}px`;
        spotlight.style.borderRadius = `${step.radius || 16}px`;

        const centerX = Math.max(36, Math.min(vw - 36, sLeft + sWidth / 2));
        const cardRect = card.getBoundingClientRect();
        const cardW = cardRect.width || Math.min(430, vw - 28);
        const cardH = cardRect.height || 260;

        const spaceAbove = sTop;
        const spaceBelow = vh - (sTop + sHeight);

        let cardTop;
        let pointerTop;
        let pointUp = false;

        if (spaceAbove >= cardH + 62 || spaceAbove >= spaceBelow) {
            pointerTop = Math.max(12, sTop - 46);
            cardTop = Math.max(12, pointerTop - cardH - 12);
            pointUp = false;
        } else {
            pointerTop = Math.min(vh - 50, sTop + sHeight + 8);
            cardTop = Math.min(vh - cardH - 12, pointerTop + 48);
            pointUp = true;
        }

        if (sHeight > vh * 0.48 && cardTop < 12) {
            cardTop = Math.max(14, Math.min(vh - cardH - 14, sTop + sHeight / 2 - cardH / 2));
            pointerTop = Math.max(12, cardTop - 44);
            pointUp = false;
        }

        const cardLeft = Math.max(14, Math.min(vw - cardW - 14, centerX - cardW / 2));

        pointer.style.left = `${Math.round(centerX)}px`;
        pointer.style.top = `${Math.round(pointerTop)}px`;
        pointer.classList.toggle("is-up", pointUp);
        pointer.innerHTML = `<i class="fas ${pointUp ? "fa-hand-point-up" : "fa-hand-point-down"}"></i>`;

        card.style.left = `${Math.round(cardLeft)}px`;
        card.style.top = `${Math.round(cardTop)}px`;
    }

    function renderTutorialStepContent() {
        if (!activeTutorialOverlay) return;
        const step = TUTORIAL_STEPS[currentTutorialStep];
        if (!step) return;

        const card = activeTutorialOverlay.querySelector(".zv-tut-card");
        if (!card) return;

        const isFirst = currentTutorialStep === 0;
        const isLast = currentTutorialStep === TUTORIAL_STEPS.length - 1;

        const gesturesHtml = (step.gestures || [])
            .map(
                (g) => `
                <div class="zv-tut-gesture-item">
                    <i class="fas ${escapeHtml(g.icon)}"></i>
                    <div class="zv-tut-gesture-label">${escapeHtml(g.label)}</div>
                    <div class="zv-tut-gesture-sub">${escapeHtml(g.sub)}</div>
                </div>`
            )
            .join("");

        const dotsHtml = TUTORIAL_STEPS.map(
            (_, idx) => `<span class="zv-tut-dot ${idx === currentTutorialStep ? "is-active" : ""}"></span>`
        ).join("");

        card.innerHTML = `
            <div class="zv-tut-top">
                <span class="zv-tut-step-kicker">
                    <i class="fas fa-wand-magic-sparkles"></i>
                    <span>${escapeHtml(step.kicker)}</span>
                </span>
                <button type="button" class="zv-tut-skip" id="zv-tut-skip-btn">Skip</button>
            </div>
            <h3 class="zv-tut-title" id="zv-tut-heading">${escapeHtml(step.title)}</h3>
            <p class="zv-tut-desc">${escapeHtml(step.desc)}</p>
            <div class="zv-tut-gestures">${gesturesHtml}</div>
            <div class="zv-tut-footer">
                <div class="zv-tut-dots" aria-hidden="true">${dotsHtml}</div>
                <div class="zv-tut-actions">
                    ${
                        !isFirst
                            ? `<button type="button" class="zv-tut-btn" id="zv-tut-prev-btn"><i class="fas fa-chevron-left"></i><span>Back</span></button>`
                            : ""
                    }
                    <button type="button" class="zv-tut-btn is-primary" id="zv-tut-next-btn">
                        <span>${isLast ? "Start Watching" : "Next"}</span>
                        <i class="fas ${isLast ? "fa-play" : "fa-chevron-right"}"></i>
                    </button>
                </div>
            </div>
        `;

        const skipBtn = card.querySelector("#zv-tut-skip-btn");
        const prevBtn = card.querySelector("#zv-tut-prev-btn");
        const nextBtn = card.querySelector("#zv-tut-next-btn");

        if (skipBtn) {
            skipBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                unlockAudioFromTutorial();
                closeTutorialGuide(true);
            });
        }
        if (prevBtn) {
            prevBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                unlockAudioFromTutorial();
                if (currentTutorialStep > 0) {
                    currentTutorialStep--;
                    renderTutorialStepContent();
                    positionTutorialStep();
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                unlockAudioFromTutorial();
                if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
                    currentTutorialStep++;
                    renderTutorialStepContent();
                    positionTutorialStep();
                } else {
                    closeTutorialGuide(true);
                }
            });
        }

        requestAnimationFrame(positionTutorialStep);
    }

    function closeTutorialGuide(markSeen = true) {
        if (markSeen) {
            try {
                localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
            } catch (e) {}
        }
        if (activeTutorialOverlay) {
            activeTutorialOverlay.remove();
            activeTutorialOverlay = null;
        }
        window.removeEventListener("resize", positionTutorialStep);
        window.removeEventListener("scroll", positionTutorialStep, true);
        document.removeEventListener("keydown", onTutorialKeyDown);
    }

    function onTutorialKeyDown(e) {
        if (!activeTutorialOverlay) return;
        if (e.key === "Escape") {
            e.preventDefault();
            closeTutorialGuide(true);
        } else if (e.key === "ArrowRight" || e.key === "Enter") {
            e.preventDefault();
            unlockAudioFromTutorial();
            if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
                currentTutorialStep++;
                renderTutorialStepContent();
                positionTutorialStep();
            } else {
                closeTutorialGuide(true);
            }
        } else if (e.key === "ArrowLeft" && currentTutorialStep > 0) {
            e.preventDefault();
            unlockAudioFromTutorial();
            currentTutorialStep--;
            renderTutorialStepContent();
            positionTutorialStep();
        }
    }

    function openTutorialGuide(startIndex = 0) {
        closeTutorialGuide(false);
        currentTutorialStep = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, startIndex));

        const overlay = document.createElement("div");
        overlay.className = "zv-tut-overlay";
        overlay.id = "zv-tutorial-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-labelledby", "zv-tut-heading");

        overlay.innerHTML = `
            <div class="zv-tut-spotlight"></div>
            <div class="zv-tut-pointer"><i class="fas fa-hand-point-down"></i></div>
            <div class="zv-tut-card"></div>
        `;

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                unlockAudioFromTutorial();
                if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
                    currentTutorialStep++;
                    renderTutorialStepContent();
                    positionTutorialStep();
                } else {
                    closeTutorialGuide(true);
                }
            }
        });

        document.body.appendChild(overlay);
        activeTutorialOverlay = overlay;

        window.addEventListener("resize", positionTutorialStep);
        window.addEventListener("scroll", positionTutorialStep, true);
        document.addEventListener("keydown", onTutorialKeyDown);

        renderTutorialStepContent();
        positionTutorialStep();
    }

    function initTutorialGuide() {
        const btn = document.getElementById("tutorial-toggle");
        if (btn) {
            btn.addEventListener("click", () => {
                userHasInteracted = true;
                openTutorialGuide(0);
            });
        }

        let seen = false;
        try {
            seen = localStorage.getItem(TUTORIAL_STORAGE_KEY) === "1";
        } catch (e) {}

        if (!seen) {
            setTimeout(() => {
                openTutorialGuide(0);
            }, 700);
        }
    }

    function bootViewerApp() {
        if (bootViewerApp._ran) return;
        bootViewerApp._ran = true;
        initThemeToggle();
        initPlayerStreams();
        initTutorialGuide();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootViewerApp);
    } else {
        bootViewerApp();
    }
})();
