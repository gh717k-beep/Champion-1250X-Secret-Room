import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ENTRIES_FILE = path.join(DATA_DIR, "entries.json");
const ADMIN_PASSWORD = "X0521";

type Entry = {
  id: number;
  name: string;
  phone: string;
  slot: string;
  createdAt: string;
  winner?: boolean;
  drawnAt?: string;
};

async function ensureData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(ENTRIES_FILE);
  } catch {
    await fs.writeFile(ENTRIES_FILE, JSON.stringify([]));
  }
}

async function readEntries(): Promise<Entry[]> {
  await ensureData();
  const raw = await fs.readFile(ENTRIES_FILE, "utf8");
  try {
    return JSON.parse(raw) as Entry[];
  } catch {
    return [];
  }
}

async function writeEntries(items: Entry[]) {
  await ensureData();
  await fs.writeFile(ENTRIES_FILE, JSON.stringify(items, null, 2));
}

function maskName(name: string) {
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
  const list = url.searchParams.get("list");
  const winners = url.searchParams.get("winners");
  const secret = url.searchParams.get("secret") || "";

  const entries = await readEntries();
  if (slot && list === "true") {
    if (secret.trim().toLowerCase() !== ADMIN_PASSWORD.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const filtered = entries.filter((entry) => entry.slot === slot);
    return NextResponse.json({ entries: filtered.map(({ id, name, phone, createdAt }) => ({ id, name, phone, createdAt })) });
  }

  if (slot && winners === "true") {
    const filtered = entries.filter((entry) => entry.slot === slot && entry.winner);
    const publicWinners = filtered.map((entry) => ({ maskedName: maskName(entry.name), phoneTail: tailPhone(entry.phone) }));
    return NextResponse.json({ winners: publicWinners });
  }

  if (slot) {
    const filtered = entries.filter((entry) => entry.slot === slot);
    return NextResponse.json({ count: filtered.length });
  }

  return NextResponse.json({ count: entries.length });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, phone, slot } = body;
  if (!name || !phone || !slot) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.length < 8) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

  const entries = await readEntries();
    const normalizedName = String(name).trim();
    const exists = entries.find(
      (entry) => entry.slot === slot && entry.phone === cleaned && entry.name === normalizedName
    );
    if (exists) return NextResponse.json({ error: "이미 동일한 이름과 전화번호로 신청하셨습니다." }, { status: 409 });

  const entry: Entry = {
    id: Date.now(),
      name: normalizedName,
    phone: cleaned,
    slot: String(slot),
    createdAt: new Date().toISOString(),
  };

  entries.push(entry);
  await writeEntries(entries);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || "";
  if (secret.trim().toLowerCase() !== ADMIN_PASSWORD.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { id, name, phone } = body;
  if (typeof id !== "number" || !name || !phone) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.length < 8) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

  const entries = await readEntries();
  const entry = entries.find((item) => item.id === id);
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  entry.name = String(name).trim();
  entry.phone = cleaned;
  await writeEntries(entries);

  return NextResponse.json({ ok: true, entry: { id: entry.id, name: entry.name, phone: entry.phone, createdAt: entry.createdAt } });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || "";
  const id = Number(url.searchParams.get("id"));

  if (secret.trim().toLowerCase() !== ADMIN_PASSWORD.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const entries = await readEntries();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  entries.splice(index, 1);
  await writeEntries(entries);

  return NextResponse.json({ ok: true });
}
