import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_PASSWORD = "X0521";
const TABLE = "contest_entries";
const LOCK_NAME = "__SLOT_LOCK__";
const LOCK_PHONE = "0000";

type ContestRow = {
  id: number;
  name: string;
  phone: string;
  slot: string;
  created_at: string;
  winner: boolean | null;
  drawn_at: string | null;
};

function publicPhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length === 11) return digits.slice(-4);
  if (digits.length <= 4) return digits;
  return digits.slice(-4);
}

function getAdminClientOrResponse() {
  try {
    return getSupabaseAdmin();
  } catch {
    return NextResponse.json(
      { error: "서버 설정이 완료되지 않았습니다. Supabase 환경변수를 확인해 주세요." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slot = url.searchParams.get("slot");
  const list = url.searchParams.get("list");
  const winners = url.searchParams.get("winners");
  const secret = url.searchParams.get("secret") || "";

  const supabase = getAdminClientOrResponse();
  if (supabase instanceof NextResponse) return supabase;

  if (slot && list === "true") {
    if (secret.trim().toLowerCase() !== ADMIN_PASSWORD.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select("id, name, phone, created_at")
      .eq("slot", slot)
      .neq("name", LOCK_NAME)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: "Failed to load entries" }, { status: 500 });

    const entries = (data ?? []).map((entry) => ({
      id: entry.id,
      name: entry.name,
      phone: entry.phone,
      createdAt: entry.created_at,
    }));

    return NextResponse.json({ entries });
  }

  if (slot && winners === "true") {
    const { data, error } = await supabase
      .from(TABLE)
      .select("name, phone")
      .eq("slot", slot)
      .eq("winner", true)
      .neq("name", LOCK_NAME);

    if (error) return NextResponse.json({ error: "Failed to load winners" }, { status: 500 });

    const publicWinners = (data ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      .map((entry) => ({ name: entry.name, phoneDisplay: publicPhone(entry.phone) }));

    return NextResponse.json({ winners: publicWinners });
  }

  if (slot) {
    const { count, error } = await supabase
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("slot", slot)
      .neq("name", LOCK_NAME);

    if (error) return NextResponse.json({ error: "Failed to load count" }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });
  }

  const { count, error } = await supabase.from(TABLE).select("id", { count: "exact", head: true }).neq("name", LOCK_NAME);
  if (error) return NextResponse.json({ error: "Failed to load count" }, { status: 500 });

  return NextResponse.json({ count: count ?? 0 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, phone, slot } = body;
  if (!name || !phone || !slot) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const cleaned = String(phone).replace(/[^0-9]/g, "");
  if (cleaned.length !== 11 && cleaned.length !== 4) {
    return NextResponse.json({ error: "전화번호는 숫자 11자리 또는 뒤 4자리만 입력해 주세요." }, { status: 400 });
  }

  const supabase = getAdminClientOrResponse();
  if (supabase instanceof NextResponse) return supabase;

  const normalizedName = String(name).trim();
  const normalizedSlot = String(slot);

  const { data: lockRow, error: lockError } = await supabase
    .from(TABLE)
    .select("id")
    .eq("slot", normalizedSlot)
    .eq("name", LOCK_NAME)
    .eq("phone", LOCK_PHONE)
    .maybeSingle();

  if (lockError) {
    return NextResponse.json({ error: "신청 가능 시간 확인 중 오류가 발생했습니다." }, { status: 500 });
  }

  if (lockRow) {
    return NextResponse.json({ error: "해당 시간대 신청이 잠겨있습니다." }, { status: 423 });
  }

  const { data: existing, error: existsError } = await supabase
    .from(TABLE)
    .select("id")
    .eq("slot", normalizedSlot)
    .eq("phone", cleaned)
    .eq("name", normalizedName)
    .limit(1);

  if (existsError) return NextResponse.json({ error: "신청 확인 중 오류가 발생했습니다." }, { status: 500 });
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "이미 동일한 이름과 전화번호로 신청하셨습니다." }, { status: 409 });
  }

  const { error } = await supabase.from(TABLE).insert({
    name: normalizedName,
    phone: cleaned,
    slot: normalizedSlot,
    winner: false,
  });

  if (error) return NextResponse.json({ error: "신청 저장 중 오류가 발생했습니다." }, { status: 500 });
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
  if (cleaned.length !== 11 && cleaned.length !== 4) {
    return NextResponse.json({ error: "전화번호는 숫자 11자리 또는 뒤 4자리만 입력해 주세요." }, { status: 400 });
  }

  const supabase = getAdminClientOrResponse();
  if (supabase instanceof NextResponse) return supabase;

  const { data, error } = await supabase
    .from(TABLE)
    .update({ name: String(name).trim(), phone: cleaned })
    .eq("id", id)
    .select("id, name, phone, created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "수정 중 오류가 발생했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    entry: {
      id: data.id,
      name: data.name,
      phone: data.phone,
      createdAt: data.created_at,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || "";
  const slot = url.searchParams.get("slot");
  const id = Number(url.searchParams.get("id"));

  if (secret.trim().toLowerCase() !== ADMIN_PASSWORD.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClientOrResponse();
  if (supabase instanceof NextResponse) return supabase;

  if (slot) {
    const { data, error } = await supabase.from(TABLE).delete().eq("slot", slot).neq("name", LOCK_NAME).select("id");
    if (error) return NextResponse.json({ error: "전체 삭제 중 오류가 발생했습니다." }, { status: 500 });

    return NextResponse.json({ ok: true, deleted: (data ?? []).length });
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabase.from(TABLE).delete().eq("id", id).select("id");
  if (error) return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
