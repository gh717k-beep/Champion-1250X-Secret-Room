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

function publicPhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 11) return digits.slice(-4);
  if (digits.length <= 4) return digits;
  return digits.slice(-4);
}

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const slot = url.searchParams.get("slot");
  const secret = url.searchParams.get("secret") || "";

  if (secret.trim().toLowerCase() !== ADMIN_PASSWORD.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!slot) {
    return NextResponse.json({ error: "slot required" }, { status: 400 });
  }

  const entries = await readEntries();
  const pool = entries.filter((entry) => entry.slot === slot);

  const winners: Entry[] = [];
  if (pool.length <= 10) {
    winners.push(...pool);
  } else {
    const shuffled = pool.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    winners.push(...shuffled.slice(0, 10));
  }

  const now = new Date().toISOString();
  for (const entry of entries) {
    if (entry.slot === slot) {
      entry.winner = false;
      entry.drawnAt = undefined;
    }
  }

  for (const winner of winners) {
    const entry = entries.find((item) => item.id === winner.id);
    if (entry) {
      entry.winner = true;
      entry.drawnAt = now;
    }
  }

  await writeEntries(entries);

  const sortedWinners = winners.slice().sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return NextResponse.json({ winners: sortedWinners.map((w) => ({ name: w.name, phoneDisplay: publicPhone(w.phone) })) });
}
