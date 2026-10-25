import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { mergeSharedValues } from "@/store/shared-data-merge";

/*
  Shared data for every browser, until the database (Supabase) is connected: the website's own server
  keeps one copy of the data the stores save (customers, orders, products, the panel's data …), so a
  customer's order in one browser shows in the Chiranvi Panel in another. Kept in a file next to the
  project (.shared-data/shared-data.json, not in Git), so it stays when the server restarts.
    GET  ?since=N   every key changed after version N (and the latest version number)
    POST {key, value, baseVersion}   saves a key; if someone else saved it after baseVersion, the two
                                     are merged by ID (see store/shared-data-merge.ts) so neither is lost
  Works while the site runs on one computer or server (npm run dev / npm start); not on serverless
  hosting, where files are not kept: that is what the database is for.
*/

type Entry = { value: string | null; version: number };
type Saved = { version: number; entries: Record<string, Entry> };

const DATA_FILE = path.join(process.cwd(), ".shared-data", "shared-data.json");

let data: Saved | null = null;

function load(): Saved {
  if (data) return data;
  try {
    data = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Saved;
  } catch {
    data = { version: 0, entries: {} };
  }
  return data;
}

function persist(saved: Saved) {
  try {
    mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(saved));
  } catch {
    // Could not write the file: the data lasts until the server restarts.
  }
}

export async function GET(request: Request) {
  const since = Number(new URL(request.url).searchParams.get("since")) || 0;
  const saved = load();
  const entries = Object.entries(saved.entries)
    .filter(([, entry]) => entry.version > since)
    .map(([key, entry]) => ({ key, value: entry.value, version: entry.version }));
  return Response.json({ version: saved.version, entries });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { key?: unknown; value?: unknown; baseVersion?: unknown };
  if (typeof body.key !== "string" || !body.key.startsWith("chiranvi-") || (body.value !== null && typeof body.value !== "string")) {
    return Response.json({ error: "A chiranvi- key and a text value are needed" }, { status: 400 });
  }
  const saved = load();
  const existing = saved.entries[body.key];
  const baseVersion = Number(body.baseVersion) || 0;
  // Someone saved this key after this browser last saw it: merge instead of overwriting their change
  const value =
    existing && existing.version > baseVersion && existing.value !== null && body.value !== null
      ? mergeSharedValues(body.value, existing.value)
      : (body.value as string | null);
  saved.version += 1;
  saved.entries[body.key] = { value, version: saved.version };
  persist(saved);
  return Response.json({ version: saved.version, value });
}
