import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ENTRIES_FILE = path.join(DATA_DIR, "entries.json");

type Entry = {
  id: number;
  name: string;
  phone: string;
  slot: string;
  createdAt: string;
};

async function ensureData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(ENTRIES_FILE);
  } catch (e) {
    await fs.writeFile(ENTRIES_FILE, JSON.stringify([]));
  }
}

async function readEntries(): Promise<Entry[]> {
  await ensureData();
  const raw = await fs.readFile(ENTRIES_FILE, "utf8");
  try {
    return JSON.parse(raw) as Entry[];
  } catch (e) {
    return [];
  }
}

async function writeEntries(items: Entry[]) {
  await ensureData();
  await fs.writeFile(ENTRIES_FILE, JSON.stringify(items, null, 2));
}

function maskName(name: string) {
  // simple masking: keep first and last char, mask middle
  if (!name) return "";
  const chars = Array.from(name);
  if (chars.length <= 2) return chars[0] + "*";
  return chars[0] + "*".repeat(Math.max(1, chars.length - 2)) + chars[chars.length - 1];
}

function tailPhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length <= 4) return digits;
  return digits.slice(-4);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slot = url.searchParams.get("slot");
  const entries = await readEntries();
  if (slot) {
    const filtered = entries.filter((e) => e.slot === slot);
    return NextResponse.json({ count: filtered.length });
  }
  return NextResponse.json({ count: entries.length });
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.endsWith("/draw")) {
    // draw should be done via POST to /api/contest/draw (handled separately)
    return NextResponse.json({ error: "Not implemented" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { name, phone, slot } = body;
  if (!name || !phone || !slot) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.length < 8) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

  const entries = await readEntries();
  const exists = entries.find((e) => e.phone === cleaned && e.slot === slot);
  if (exists) return NextResponse.json({ error: "이미 동일한 전화번호로 응모하셨습니다." }, { status: 409 });

  const entry: Entry = { id: Date.now(), name: String(name), phone: cleaned, slot: String(slot), createdAt: new Date().toISOString() };
  entries.push(entry);
  await writeEntries(entries);
  return NextResponse.json({ ok: true }, { status: 201 });
}

// Draw handler at /api/contest/draw
export async function POST_DRAW(req: NextRequest) {
  const url = new URL(req.url);
  const slot = url.searchParams.get("slot");
  const secret = url.searchParams.get("secret") || "";

  const ADMIN_PASSWORD = "X0521";
  if (secret.trim().toLowerCase() !== ADMIN_PASSWORD.toLowerCase()) {
    return NextResponse.json({ error: "비밀번호를 확인해 주세요." }, { status: 401 });
  }

  if (!slot) return NextResponse.json({ error: "slot required" }, { status: 400 });

  const entries = await readEntries();
  const pool = entries.filter((e) => e.slot === slot);

  const winners = [] as Entry[];
  if (pool.length <= 10) {
    winners.push(...pool);
  } else {
    // random select 10
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    winners.push(...shuffled.slice(0, 10));
  }

  // prepare public winners
  const publicWinners = winners.map((w) => ({ maskedName: maskName(w.name), phoneTail: tailPhone(w.phone) }));

  // save winners file
  try {
    const outFile = path.join(DATA_DIR, `winners-${slot}-${Date.now()}.json`);
    await fs.writeFile(outFile, JSON.stringify({ slot, winners, publicWinners, drawnAt: new Date().toISOString() }, null, 2));
  } catch (e) {
    // ignore write errors
  }

  return NextResponse.json({ winners: publicWinners });
}

// Next.js app router can't export two POST handlers from same file by name,
// so handle /draw specially by checking the pathname in middleware below.
export async function PUT(req: NextRequest) {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

// Custom handler router
export default async function handler(req: NextRequest) {
  const url = new URL(req.url);
  if (req.method === "POST" && url.pathname.endsWith("/draw")) {
    return POST_DRAW(req);
  }
  if (req.method === "POST") return POST(req);
  if (req.method === "GET") return GET(req);
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
