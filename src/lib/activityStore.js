import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_DAYS = 120;

function storePath() {
  const root = process.env.DATA_DIR || path.resolve(process.cwd(), "data");
  return path.join(root, "activity.json");
}

function utcDay(ms = Date.now()) {
  return new Date(ms).toISOString().slice(0, 10);
}

async function readStore() {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeStore(store) {
  const file = storePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(store), "utf8");
}

export async function recordVisit(userId) {
  const id = String(userId || "").trim();
  if (!id) {
    return { firstSeen: Date.now(), lastSeen: Date.now(), days: [utcDay()], visits: 1 };
  }

  const store = await readStore();
  const now = Date.now();
  const today = utcDay(now);
  const current = store[id] || {};
  const days = Array.isArray(current.days) ? [...current.days] : [];

  if (!days.includes(today)) days.push(today);
  days.sort();
  const trimmed = days.slice(-MAX_DAYS);

  const next = {
    firstSeen: current.firstSeen || now,
    lastSeen: now,
    days: trimmed,
    visits: Number(current.visits || 0) + 1
  };

  store[id] = next;
  await writeStore(store);
  return next;
}
