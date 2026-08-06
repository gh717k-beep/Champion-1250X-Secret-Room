"use client";

import { useEffect, useState } from "react";

type Slot = "weekday-16" | "weekday-18" | "weekend-12" | "weekend-14" | "weekend-16";

const SLOT_LABELS: Record<Slot, string> = {
  "weekday-16": "평일 16:00",
  "weekday-18": "평일 18:00",
  "weekend-12": "주말 12:00",
  "weekend-14": "주말 14:00",
  "weekend-16": "주말 16:00",
};

export default function ContestPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState<Slot>("weekday-16");
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  async function fetchCount() {
    try {
      const res = await fetch(`/api/contest?slot=${encodeURIComponent(slot)}`);
      if (!res.ok) return setCount(null);
      const data = await res.json();
      setCount(data.count ?? null);
    } catch (e) {
      setCount(null);
    }
  }

  function cleanPhone(input: string) {
    return input.replace(/[^0-9]/g, "");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const cleaned = cleanPhone(phone);
    if (!name.trim()) return setMessage("아이 이름을 입력하세요.");
    if (cleaned.length < 8) return setMessage("유효한 전화번호를 입력하세요.");

    setLoading(true);
    try {
      const res = await fetch("/api/contest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: cleaned, slot }),
      });
      const data = await res.json();
      if (res.status === 201) {
        setMessage("응모가 완료되었습니다. 결과는 추첨 후 공개됩니다.");
        setName("");
        setPhone("");
        fetchCount();
      } else {
        setMessage(data.error || "응모 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setMessage("서버와 통신할 수 없습니다.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-xl border bg-white p-6 shadow">
        <h1 className="text-2xl font-semibold">비밀의 방 — 응모 페이지</h1>
        <p className="mt-2 text-sm text-slate-600">전화번호당 1회 응모 가능. 당첨자 공개 시 아이 이름 가운데는 모자이크, 보호자 전화번호 뒷자리만 공개됩니다.</p>

        <form className="mt-4 flex flex-col gap-3" onSubmit={submit}>
          <label className="flex flex-col">
            <span className="text-sm">아이 이름</span>
            <input className="mt-1 rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="flex flex-col">
            <span className="text-sm">보호자 전화번호</span>
            <input className="mt-1 rounded border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="숫자만 입력" />
          </label>

          <label className="flex flex-col">
            <span className="text-sm">응모 시간대 선택</span>
            <select className="mt-1 rounded border px-3 py-2" value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
              {Object.entries(SLOT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">현재 응모 수: {count === null ? "불러오는 중..." : count}</div>
            <button disabled={loading} className="ml-4 rounded bg-cyan-600 px-4 py-2 text-white">
              {loading ? "응모중..." : "응모하기"}
            </button>
          </div>
        </form>

        {message && <div className="mt-4 rounded border px-4 py-3 text-sm">{message}</div>}

        <div className="mt-6 border-t pt-4 text-sm text-slate-700">
          <h2 className="font-medium">관리자용(간단)</h2>
          <p className="mt-2">관리자는 아래에서 비밀키로 추첨을 실행할 수 있습니다. 배포시 `VERCEL_CONTEST_SECRET` 환경변수를 설정하세요.</p>
          <AdminDraw />
        </div>
      </div>
    </main>
  );
}

function AdminDraw() {
  const [slot, setSlot] = useState<Slot>("weekday-16");
  const [secret, setSecret] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runDraw(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/contest/draw?slot=${encodeURIComponent(slot)}&secret=${encodeURIComponent(secret)}`, { method: "POST" });
      const data = await res.json();
      setResult({ ok: res.ok, body: data });
    } catch (err) {
      setResult({ ok: false, body: { error: "서버 오류" } });
    }
    setLoading(false);
  }

  return (
    <form className="mt-3 flex flex-col gap-2" onSubmit={runDraw}>
      <select className="rounded border px-3 py-2" value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
        {Object.entries(SLOT_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <input className="rounded border px-3 py-2" placeholder="관리자 비밀키(환경변수 없으면 빈칸 허용)" value={secret} onChange={(e) => setSecret(e.target.value)} />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={loading} className="rounded bg-amber-600 px-3 py-2 text-white">
          {loading ? "추첨중..." : "추첨 실행"}
        </button>
      </div>

      {result && (
        <div className="mt-3">
          {result.ok ? (
            <div>
              <div className="text-sm">당첨자 목록:</div>
              <ul className="mt-2 list-disc pl-5">
                {result.body.winners.map((w: any, i: number) => (
                  <li key={i} className="text-sm">
                    {w.maskedName} — {w.phoneTail}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-sm text-red-600">{result.body?.error || "오류"}</div>
          )}
        </div>
      )}
    </form>
  );
}
