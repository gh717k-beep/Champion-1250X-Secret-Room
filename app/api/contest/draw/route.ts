import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_PASSWORD = "X0521";
const TABLE = "contest_entries";
const LOCK_NAME = "__SLOT_LOCK__";

type ContestRow = {
  id: number;
  name: string;
  phone: string;
  slot: string;
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

  const supabase = getAdminClientOrResponse();
  if (supabase instanceof NextResponse) return supabase;

  const { data: pool, error: poolError } = await supabase
    .from(TABLE)
    .select("id, name, phone, slot")
    .eq("slot", slot)
    .neq("name", LOCK_NAME)
    .order("created_at", { ascending: true });

  if (poolError) return NextResponse.json({ error: "신청자 조회 중 오류가 발생했습니다." }, { status: 500 });

  const entries = (pool ?? []) as ContestRow[];
  const winners: ContestRow[] = [];

  if (entries.length <= 10) {
    winners.push(...entries);
  } else {
    const shuffled = entries.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    winners.push(...shuffled.slice(0, 10));
  }

  const { error: resetError } = await supabase
    .from(TABLE)
    .update({ winner: false, drawn_at: null })
    .eq("slot", slot)
    .neq("name", LOCK_NAME);
  if (resetError) return NextResponse.json({ error: "추첨 초기화 중 오류가 발생했습니다." }, { status: 500 });

  if (winners.length > 0) {
    const winnerIds = winners.map((winner) => winner.id);
    const { error: winnerError } = await supabase
      .from(TABLE)
      .update({ winner: true, drawn_at: new Date().toISOString() })
      .in("id", winnerIds);

    if (winnerError) return NextResponse.json({ error: "당첨 저장 중 오류가 발생했습니다." }, { status: 500 });
  }

  const sortedWinners = winners.slice().sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return NextResponse.json({
    winners: sortedWinners.map((winner) => ({
      name: winner.name,
      phoneDisplay: publicPhone(winner.phone),
    })),
  });
}
