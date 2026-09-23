import http from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import seed from "./data.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const databasePath = process.env.VERCEL
  ? join(tmpdir(), "kabadiwala.db")
  : join(__dirname, "kabadiwala.db");
const port = Number(process.env.PORT || 8787);
const allowedStatuses = new Set(["Created", "Accepted", "Completed"]);

const database = new DatabaseSync(databasePath);
database.exec("PRAGMA journal_mode = WAL;");
database.exec(`
  CREATE TABLE IF NOT EXISTS prices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hiName TEXT NOT NULL,
    price REAL NOT NULL,
    unit TEXT NOT NULL,
    trend TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recyclers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dist TEXT NOT NULL,
    priceMul REAL NOT NULL,
    verified INTEGER NOT NULL,
    pickup INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS lots (
    lotId TEXT PRIMARY KEY,
    materialId TEXT NOT NULL,
    material TEXT NOT NULL,
    weight REAL NOT NULL,
    estimatedVal REAL NOT NULL,
    collectorName TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Created', 'Accepted', 'Completed')),
    createdAt TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 1,
    updatedAt TEXT,
    paidAt TEXT
  );
`);

if (database.prepare("SELECT COUNT(*) AS count FROM prices").get().count === 0) {
  const insertPrice = database.prepare(
    "INSERT INTO prices (id, name, hiName, price, unit, trend) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertRecycler = database.prepare(
    "INSERT INTO recyclers (id, name, dist, priceMul, verified, pickup) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertLot = database.prepare(
    "INSERT INTO lots (lotId, materialId, material, weight, estimatedVal, collectorName, status, createdAt, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  database.exec("BEGIN IMMEDIATE;");
  try {
    seed.prices.forEach((item) =>
      insertPrice.run(item.id, item.name, item.hiName, item.price, item.unit, item.trend)
    );
    seed.recyclers.forEach((item) =>
      insertRecycler.run(
        item.id,
        item.name,
        item.dist,
        item.priceMul,
        item.verified ? 1 : 0,
        item.pickup ? 1 : 0
      )
    );
    seed.lots.forEach((item) =>
      insertLot.run(
        item.lotId,
        item.materialId,
        item.material,
        item.weight,
        item.estimatedVal,
        item.collectorName,
        item.status,
        item.createdAt,
        item.synced ? 1 : 0
      )
    );
    database.exec("COMMIT;");
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body is too large");
  }
  if (!body) return {};
  return JSON.parse(body);
}

function makeLotId() {
  return `EW-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
}

function getLotById(lotId) {
  return database.prepare("SELECT * FROM lots WHERE lotId = ?").get(lotId) || null;
}

function getAnalytics() {
  const lots = database.prepare("SELECT * FROM lots").all();
  const completedLots = lots.filter((lot) => lot.status === "Completed");
  const processedWeight = lots.reduce((total, lot) => total + (Number(lot.weight) || 0), 0);
  const recoveredValue = lots.reduce((total, lot) => total + (Number(lot.estimatedVal) || 0), 0);
  const completedWeight = completedLots.reduce((total, lot) => total + (Number(lot.weight) || 0), 0);
  const completedValue = completedLots.reduce((total, lot) => total + (Number(lot.estimatedVal) || 0), 0);
  const formalizedLots = lots.filter((lot) => lot.status !== "Created").length;
  return {
    activeCollectors: new Set(lots.map((lot) => lot.collectorName).filter(Boolean)).size,
    formalizationRate: lots.length ? Math.round((formalizedLots / lots.length) * 1000) / 10 : 0,
    processedWeight,
    recoveredValue,
    completedWeight,
    completedValue,
    totalLots: lots.length,
    statusCounts: lots.reduce((counts, lot) => {
      counts[lot.status] = (counts[lot.status] || 0) + 1;
      return counts;
    }, {})
  };
}

export async function handleRequest(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
    });
    response.end();
    return;
  }

  const rawPath =
    request.headers["x-matched-path"] || request.headers["x-forwarded-uri"] || request.url;
  const url = new URL(rawPath, `http://${request.headers.host || "localhost"}`);
  let pathname = url.pathname.replace(/^\/api(?=\/|$)/, "") || "/";

  if (pathname.startsWith("/index") || pathname.startsWith("/[...path]")) {
    const origUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const queryPath =
      origUrl.searchParams.get("path") ||
      origUrl.searchParams.get("slug") ||
      origUrl.searchParams.get("__path");
    if (queryPath) {
      pathname = "/" + queryPath.replace(/^\//, "");
    } else if (
      request.headers["x-matched-path"] &&
      !request.headers["x-matched-path"].includes("index.js")
    ) {
      pathname = request.headers["x-matched-path"].replace(/^\/api(?=\/|$)/, "") || "/";
    } else {
      pathname = "/";
    }
  }

  if ((pathname === "/health" || pathname === "/") && request.method === "GET") {
    return sendJson(response, 200, { ok: true, name: "Kabadi Saathi API", version: "1.0.0" });
  }

  if (pathname === "/prices" && request.method === "GET") {
    return sendJson(response, 200, database.prepare("SELECT * FROM prices ORDER BY id").all());
  }

  const materialIdMatch = pathname.match(/^\/prices\/([^/]+)$/);
  if (materialIdMatch && request.method === "GET") {
    const material = database
      .prepare("SELECT * FROM prices WHERE id = ?")
      .get(decodeURIComponent(materialIdMatch[1]));
    if (!material) return sendJson(response, 404, { error: "Material not found" });
    return sendJson(response, 200, material);
  }

  if (pathname === "/recyclers" && request.method === "GET") {
    return sendJson(
      response,
      200,
      database
        .prepare("SELECT id, name, dist, priceMul, verified, pickup FROM recyclers ORDER BY id")
        .all()
        .map((item) => ({
          ...item,
          verified: Boolean(item.verified),
          pickup: Boolean(item.pickup)
        }))
    );
  }

  const recyclerIdMatch = pathname.match(/^\/recyclers\/([^/]+)$/);
  if (recyclerIdMatch && request.method === "GET") {
    const recycler = database
      .prepare("SELECT id, name, dist, priceMul, verified, pickup FROM recyclers WHERE id = ?")
      .get(decodeURIComponent(recyclerIdMatch[1]));
    if (!recycler) return sendJson(response, 404, { error: "Recycler not found" });
    return sendJson(response, 200, {
      ...recycler,
      verified: Boolean(recycler.verified),
      pickup: Boolean(recycler.pickup)
    });
  }

  if (pathname === "/analytics" && request.method === "GET") {
    return sendJson(response, 200, getAnalytics());
  }

  if (pathname === "/lots" && request.method === "GET") {
    const status = url.searchParams.get("status");
    const lots = status
      ? database.prepare("SELECT * FROM lots WHERE status = ? ORDER BY createdAt DESC").all(status)
      : database.prepare("SELECT * FROM lots ORDER BY createdAt DESC").all();
    return sendJson(
      response,
      200,
      lots.map((lot) => ({ ...lot, synced: Boolean(lot.synced) }))
    );
  }

  const lotIdMatch = pathname.match(/^\/lots\/([^/]+)$/);
  if (lotIdMatch && request.method === "GET") {
    const lot = getLotById(decodeURIComponent(lotIdMatch[1]));
    if (!lot) return sendJson(response, 404, { error: "Lot not found" });
    return sendJson(response, 200, { ...lot, synced: Boolean(lot.synced) });
  }

  if (pathname === "/lots" && request.method === "POST") {
    let body;
    try {
      body = await readBody(request);
    } catch {
      return sendJson(response, 400, { error: "Request body must be valid JSON" });
    }

    const material = database.prepare("SELECT * FROM prices WHERE id = ?").get(body.materialId);
    const weight = Number(body.weight);
    if (!material || !Number.isFinite(weight) || weight <= 0) {
      return sendJson(response, 400, {
        error: "A valid material and positive weight are required"
      });
    }

    const lot = {
      lotId: makeLotId(),
      materialId: material.id,
      material: material.name,
      weight,
      estimatedVal: Math.round(weight * material.price * 100) / 100,
      collectorName: String(body.collectorName || "Local Collector").trim(),
      status: "Created",
      createdAt: new Date().toISOString(),
      synced: true
    };

    database
      .prepare(
        "INSERT INTO lots (lotId, materialId, material, weight, estimatedVal, collectorName, status, createdAt, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        lot.lotId,
        lot.materialId,
        lot.material,
        lot.weight,
        lot.estimatedVal,
        lot.collectorName,
        lot.status,
        lot.createdAt,
        1
      );

    return sendJson(response, 201, lot);
  }

  if (lotIdMatch && request.method === "DELETE") {
    const lotId = decodeURIComponent(lotIdMatch[1]);
    const existingLot = getLotById(lotId);
    if (!existingLot) return sendJson(response, 404, { error: "Lot not found" });
    database.prepare("DELETE FROM lots WHERE lotId = ?").run(lotId);
    return sendJson(response, 200, { message: "Lot deleted successfully", lotId });
  }

  const lotStatusMatch = pathname.match(/^\/lots\/([^/]+)\/status$/);
  if (lotStatusMatch && request.method === "PATCH") {
    let body;
    try {
      body = await readBody(request);
    } catch {
      return sendJson(response, 400, { error: "Request body must be valid JSON" });
    }

    const lot = getLotById(decodeURIComponent(lotStatusMatch[1]));
    if (!lot) return sendJson(response, 404, { error: "Lot not found" });
    if (!allowedStatuses.has(body.status)) {
      return sendJson(response, 400, { error: "Unsupported lot status" });
    }
    if (lot.status === "Completed" || (lot.status === "Accepted" && body.status === "Created")) {
      return sendJson(response, 409, { error: "Invalid status transition" });
    }

    const updatedAt = new Date().toISOString();
    const paidAt = body.status === "Completed" ? updatedAt : lot.paidAt;
    database
      .prepare("UPDATE lots SET status = ?, updatedAt = ?, paidAt = ? WHERE lotId = ?")
      .run(body.status, updatedAt, paidAt, lot.lotId);

    return sendJson(response, 200, { ...lot, status: body.status, updatedAt, paidAt });
  }

  return sendJson(response, 404, { error: "Route not found" });
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    sendJson(response, 500, { error: "Internal server error" });
  });
});

if (!process.env.VERCEL && !process.env.VERCEL_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  if (isDirectExecution || process.env.START_SERVER === "1") {
    server.listen(port, () =>
      console.log(`Kabadi Saathi API listening on http://localhost:${port}`)
    );
  }
}
