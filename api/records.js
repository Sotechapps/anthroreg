/**
 * AnthroReg - shared records API (Vercel serverless function)
 *
 * Stores every saved regression equation in a Redis store so that all
 * visitors, on any device, see the same records.
 *
 * Connect a Redis / KV store to this Vercel project and the required
 * environment variables are injected automatically. Supported names:
 *   KV_REST_API_URL          + KV_REST_API_TOKEN
 *   UPSTASH_REDIS_REST_URL   + UPSTASH_REDIS_REST_TOKEN
 *   REDIS_URL                + REDIS_TOKEN
 *
 * If no store is connected the function reports that it is unavailable and
 * the website quietly falls back to saving in the visitor's own browser.
 */

const KEY = "anthroreg:records";
const MAX_RECORDS = 500;

function creds() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_TOKEN ||
    "";
  return { url: url.replace(/\/+$/, ""), token };
}

async function readAll() {
  const { url, token } = creds();
  const res = await fetch(`${url}/get/${encodeURIComponent(KEY)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("store read failed");
  const data = await res.json();
  if (!data || data.result == null) return [];
  try {
    const parsed = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(records) {
  const { url, token } = creds();
  const res = await fetch(`${url}/set/${encodeURIComponent(KEY)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
    body: JSON.stringify(records),
  });
  if (!res.ok) throw new Error("store write failed");
}

const text = (v, max = 160) =>
  typeof v === "string" || typeof v === "number"
    ? String(v).replace(/[<>]/g, "").replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max)
    : "";

const num = (v) => (v === null || v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const { url, token } = creds();
  if (!url || !token) {
    return res.status(503).json({
      ok: false,
      error: "No database connected to this project yet.",
    });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const action = (req.query && req.query.action) || body.action || "list";

  try {
    let records = await readAll();

    if (action === "list") {
      return res.status(200).json({ ok: true, records });
    }

    if (action === "add") {
      const r = body.record || {};
      const record = {
        id: String(Date.now()) + Math.random().toString(36).slice(2, 6),
        location: text(r.location),
        age: text(r.age, 8),
        gender: r.gender === "Female" ? "Female" : "Male",
        equation: text(r.equation, 120),
        a: num(r.a),
        b: num(r.b),
        r: num(r.r),
        r2: num(r.r2),
        see: num(r.see),
        meanHL: num(r.meanHL),
        meanST: num(r.meanST),
        count: Number(r.count) || 0,
        date: new Date().toLocaleDateString("en-GB", {
          day: "numeric", month: "short", year: "numeric",
        }),
      };

      if (!record.location || !record.age || record.a === null || record.b === null) {
        return res.status(400).json({
          ok: false,
          error: "Location, age and a valid equation are required.",
        });
      }

      records.unshift(record);
      if (records.length > MAX_RECORDS) records = records.slice(0, MAX_RECORDS);
      await writeAll(records);
      return res.status(200).json({ ok: true, records });
    }

    if (action === "delete") {
      const id = text(body.id, 40);
      records = records.filter((x) => String(x.id) !== id);
      await writeAll(records);
      return res.status(200).json({ ok: true, records });
    }

    if (action === "clear") {
      await writeAll([]);
      return res.status(200).json({ ok: true, records: [] });
    }

    return res.status(400).json({ ok: false, error: "Unknown action." });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Database request failed." });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

