import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_PASSWORD = "X0521";
const TABLE = "contest_slot_settings";
const SLOT_VALUES = ["12:00", "14:00", "16:00", "18:00"] as const;

type Slot = (typeof SLOT_VALUES)[number];

type SlotRow = {
  slot: Slot;
  is_open: boolean;
};

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

function withDefaults(rows: SlotRow[] | null) {
  const map = new Map((rows ?? []).map((row) => [row.slot, row.is_open]));
  return SLOT_VALUES.map((slot) => ({ slot, isOpen: map.get(slot) ?? true }));
}

export async function GET() {
  const supabase = getAdminClientOrResponse();
  if (supabase instanceof NextResponse) return supabase;

  const { data, error } = await supabase.from(TABLE).select("slot, is_open").in("slot", SLOT_VALUES);
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      return NextResponse.json({ slots: withDefaults(null) });
    }
    return NextResponse.json({ error: "시간대 설정을 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json({ slots: withDefaults((data ?? []) as SlotRow[]) });
}

export async function PATCH(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") || "";
  if (secret.trim().toLowerCase() !== ADMIN_PASSWORD.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const slot = String(body.slot ?? "") as Slot;
  const isOpen = body.isOpen;

  if (!SLOT_VALUES.includes(slot)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }
  if (typeof isOpen !== "boolean") {
    return NextResponse.json({ error: "Invalid isOpen" }, { status: 400 });
  }

  const supabase = getAdminClientOrResponse();
  if (supabase instanceof NextResponse) return supabase;

  const { error } = await supabase.from(TABLE).upsert({ slot, is_open: isOpen }, { onConflict: "slot" });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01") {
      return NextResponse.json(
        { error: "contest_slot_settings 테이블이 없습니다. README의 SQL을 먼저 실행해 주세요." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "시간대 설정 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}