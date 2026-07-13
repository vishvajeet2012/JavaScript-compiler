/**
 * Activation Key Server
 * Run: npm run server  (or node activation-server/server.js)
 * Port: 5050
 */

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5050;
const SECRET = process.env.ACTIVATION_SECRET || "js-compiler-secret-change-in-production";

// Valid activation keys — add your sold keys here
const VALID_KEYS = new Set([
  "PRO1-2026-VISH-JSCP",
  "DEMO-FREE-TEST-KEY1",
  "TEST-1234-ABCD-5678",
]);

// Track activated machines: key -> Set of machineIds
const activations = new Map();
const ACTIVATIONS_FILE = path.join(__dirname, "activations.json");

function loadActivations() {
  if (!fs.existsSync(ACTIVATIONS_FILE)) return;
  try {
    const data = JSON.parse(fs.readFileSync(ACTIVATIONS_FILE, "utf8"));
    Object.entries(data).forEach(([key, machines]) => {
      activations.set(key, new Set(machines));
    });
    console.log(`Loaded ${activations.size} activation records from disk`);
  } catch (err) {
    console.error("Failed to load activations:", err.message);
  }
}

function persistActivations() {
  const data = {};
  activations.forEach((machines, key) => {
    data[key] = [...machines];
  });
  fs.writeFileSync(ACTIVATIONS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function loadKeysFromFile() {
  const keysFile = path.join(__dirname, "keys.json");
  if (fs.existsSync(keysFile)) {
    const keys = JSON.parse(fs.readFileSync(keysFile, "utf8"));
    keys.forEach((k) => VALID_KEYS.add(k.toUpperCase()));
    console.log(`Loaded ${keys.length} keys from keys.json`);
  }
}

function generateToken(key, machineId) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${key}:${machineId}`)
    .digest("hex");
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

loadKeysFromFile();
loadActivations();

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  if (req.method === "POST" && req.url === "/api/activate") {
    try {
      const { key, machineId } = await parseBody(req);
      const normalizedKey = (key || "").trim().toUpperCase();

      if (!VALID_KEYS.has(normalizedKey)) {
        return send(res, 403, { message: "Invalid activation key" });
      }

      if (!machineId) {
        return send(res, 400, { message: "Machine ID required" });
      }

      // One key = one machine (optional: allow re-activate same machine)
      const machines = activations.get(normalizedKey) || new Set();
      if (machines.size > 0 && !machines.has(machineId)) {
        return send(res, 403, {
          message: "This key is already activated on another device",
        });
      }

      machines.add(machineId);
      activations.set(normalizedKey, machines);
      persistActivations();

      const token = generateToken(normalizedKey, machineId);
      console.log(`✓ Activated: ${normalizedKey} → ${machineId.slice(0, 8)}...`);

      return send(res, 200, {
        valid: true,
        token,
        message: "Pro mode activated successfully!",
      });
    } catch (err) {
      return send(res, 400, { message: err.message });
    }
  }

  if (req.method === "POST" && req.url === "/api/verify") {
    try {
      const { key, machineId, token } = await parseBody(req);
      const normalizedKey = (key || "").trim().toUpperCase();

      if (!VALID_KEYS.has(normalizedKey)) {
        return send(res, 403, { valid: false, message: "Invalid key" });
      }

      const expectedToken = generateToken(normalizedKey, machineId);
      if (token !== expectedToken) {
        return send(res, 403, { valid: false, message: "Invalid token" });
      }

      const machines = activations.get(normalizedKey);
      if (!machines || !machines.has(machineId)) {
        return send(res, 403, { valid: false, message: "Not activated" });
      }

      return send(res, 200, { valid: true, token: expectedToken });
    } catch (err) {
      return send(res, 400, { message: err.message });
    }
  }

  if (req.method === "GET" && req.url === "/api/health") {
    return send(res, 200, { status: "ok", keys: VALID_KEYS.size });
  }

  send(res, 404, { message: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Activation server running on http://localhost:${PORT}`);
  console.log(`Valid keys: ${VALID_KEYS.size}`);
  console.log(`Test key: DEMO-FREE-TEST-KEY1`);
});