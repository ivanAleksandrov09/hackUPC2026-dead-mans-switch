// Transport layer — auto-selects the best available backend:
//   1. react-native-bare-kit (on-device Bare thread, truly P2P — preferred)
//   2. WebSocket bridge      (laptop bridge, fallback for development)
//
// Both expose the same call/on/isConnected interface so this file doesn't
// change regardless of which backend is active.

import { BRIDGE_URL } from "./config.js";

// -- Backend selection -------------------------------------------------

let _call, _on, _isConnected;

try {
  // Bare backend — only available after `expo run:android` with react-native-bare-kit
  const bare = require("./bare-bridge.js");
  _call = bare.call;
  _on = bare.on;
  _isConnected = bare.isConnected;
  console.log("[protocol] using bare backend");
} catch {
  // WebSocket fallback — works in Expo Go and when the laptop bridge is running
  console.log(
    "[protocol] bare not available, falling back to WebSocket bridge",
  );

  let ws = null,
    wsConnected = false,
    reconnectTimer = null,
    _idCounter = 0;
  const pendingResolvers = {},
    eventHandlers = {};
  const nextId = () => String(++_idCounter);

  const connect = () => {
    if (ws) return;
    ws = new WebSocket(BRIDGE_URL);
    ws.onopen = () => {
      wsConnected = true;
      clearTimeout(reconnectTimer);
    };
    ws.onclose = () => {
      wsConnected = false;
      ws = null;
      reconnectTimer = setTimeout(connect, 3000);
    };
    ws.onerror = () => {};
    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.id !== undefined) {
        const r = pendingResolvers[msg.id];
        if (!r) return;
        delete pendingResolvers[msg.id];
        if (msg.error) r.reject(new Error(msg.error));
        else r.resolve(msg.result);
      } else if (msg.type) {
        for (const cb of eventHandlers[msg.type] || [])
          try {
            cb(msg);
          } catch {}
      }
    };
  };
  connect();

  _call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      if (!wsConnected) return reject(new Error("bridge not connected"));
      const id = nextId();
      pendingResolvers[id] = { resolve, reject };
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pendingResolvers[id]) {
          delete pendingResolvers[id];
          reject(new Error(`timeout: ${method}`));
        }
      }, 30000);
    });

  _on = (type, cb) => {
    if (!eventHandlers[type]) eventHandlers[type] = [];
    eventHandlers[type].push(cb);
    return () => {
      eventHandlers[type] = eventHandlers[type].filter((f) => f !== cb);
    };
  };

  _isConnected = () => wsConnected;
}

const call = _call;
const on = _on;
export const isConnected = _isConnected;

// -- API (mirrors the mock surface exactly) ----------------------------

export async function generateEstateKey() {
  const { ekHex } = await call("generateEstateKey");
  return ekHex;
}

export async function splitKey(ekHex, { M, N }) {
  const { shards } = await call("splitKey", { ekHex, M, N });
  return shards; // string[]
}

export async function encryptEstate(text, ekHex) {
  const { ctHex } = await call("encryptEstate", { text, ekHex });
  return ctHex;
}

export async function decryptEstate(ctHex, ekHex) {
  const { text } = await call("decryptEstate", { ctHex, ekHex });
  return text;
}

export async function combineKey(shards) {
  const { ekHex } = await call("combineKey", { shards });
  return ekHex;
}

export function generateInviteCode() {
  // Invite codes are generated locally (pure JS, no native deps).
  const WORDS = [
    "amber",
    "orchid",
    "forest",
    "river",
    "ember",
    "glacier",
    "meadow",
    "harbor",
    "thunder",
    "pebble",
    "lantern",
    "quartz",
    "falcon",
    "maple",
    "silver",
    "tundra",
    "beacon",
    "cinder",
    "driftwood",
    "echo",
    "fjord",
    "gypsum",
    "horizon",
    "ivory",
    "jasper",
    "kelp",
    "lichen",
    "monsoon",
    "nimbus",
    "opal",
    "prairie",
    "quill",
    "raven",
    "sequoia",
    "tidal",
    "umbra",
    "vellum",
    "willow",
    "xenon",
    "yarrow",
    "zenith",
    "aurora",
    "basalt",
    "comet",
    "dahlia",
    "eddy",
    "fennel",
    "galaxy",
  ];
  return Array.from(
    { length: 6 },
    () => WORDS[Math.floor(Math.random() * WORDS.length)],
  ).join("-");
}

export function startHeartbeat({ ownerPubKey }) {
  call("startHeartbeat").catch(() => {});
  return {
    kick() {
      call("kick").catch(() => {});
    },
    async stop() {},
  };
}

export function observeHeartbeat({ ownerPubKey, onUpdate }) {
  call("observeHeartbeat", { ownerPubKey }).catch(() => {});
  const off = on("heartbeat", (msg) => onUpdate?.(msg.lastSeenAt));
  return {
    stop() {
      off();
    },
  };
}

export async function openInvite(code, shardHex) {
  await call("openInvite", { code, shardHex });
}

export function acceptInvite(code, { onShard } = {}) {
  call("acceptInvite", { code }).catch(() => {});
  const off = on("shardReceived", (msg) => {
    onShard?.(msg.shardHex);
    off();
  });
  return {
    stop() {
      off();
    },
  };
}

export function joinReconstruction({
  ownerPubKey,
  shardHex,
  guardianIndex,
  lastSeenAt,
  M,
  onPeer,
  onShard,
  onQuorum,
}) {
  call("joinReconstruction", {
    ownerPubKey,
    shardHex,
    guardianIndex,
    lastSeenAt,
    M,
  }).catch(() => {});
  const offs = [
    on("peer", (d) => onPeer?.(d)),
    on("shard", (d) => onShard?.(d)),
    on("quorum", (d) => onQuorum?.(d)),
  ];
  return {
    stop() {
      offs.forEach((f) => f());
    },
  };
}
