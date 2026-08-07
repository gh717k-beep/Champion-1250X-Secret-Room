"use client";

import { useEffect, useState, type FormEvent } from "react";

type Slot = "weekday-16" | "weekday-18" | "weekend-12" | "weekend-14" | "weekend-16";

const SLOT_LABELS: Record<Slot, string> = {
  "weekday-16": "평일 16:00",
  "weekday-18": "평일 18:00",
  "weekend-12": "주말 12:00",
  "weekend-14": "주말 14:00",
  "weekend-16": "주말 16:00",
};

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [slot, setSlot] = useState<Slot>("weekday-16");
  const [winnerSlot, setWinnerSlot] = useState<Slot>("weekday-16");
  const [message, setMessage] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [winners, setWinners] = useState<Array<{ maskedName: string; phoneTail: string }>>([]);
  const [winnerLoading, setWinnerLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  useEffect(() => {
    fetchWinners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerSlot]);

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

  async function submit(e: FormEvent) {
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
        setMessage("신청이 완료되었습니다. 결과는 추첨 후 공개됩니다.");
        setName("");
        setPhone("");
        fetchCount();
      } else {
        setMessage(data.error || "신청 중 오류가 발생했습니다.");
      }
    } catch (err) {
      setMessage("서버와 통신할 수 없습니다.");
    }
    setLoading(false);
  }

  async function fetchWinners() {
    setWinnerLoading(true);
    try {
      const res = await fetch(`/api/contest?slot=${encodeURIComponent(winnerSlot)}&winners=true`);
      if (!res.ok) return setWinners([]);
      const data = await res.json();
      setWinners(data.winners ?? []);
    } catch {
      setWinners([]);
    } finally {
      setWinnerLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="hero-decor" />
      <div className="page-content">
        <section className="hero-card">
          <div className="hero-title">
            <p className="tagline">Champion 1250X</p>
            <h1>비밀의 방</h1>
          </div>

          <div className="info-grid">
            <div className="info-box">
              <strong>안내</strong>
              <p>신청은 보호자 전화번호 당 1회만 가능합니다.</p>
            </div>
            <div className="info-box">
              <strong>추첨</strong>
              <p>신청 수가 10명을 넘으면 무작위로 10명을 선정합니다.</p>
            </div>
            <div className="info-box">
              <strong>공개</strong>
              <p>이름 가운데는 모자이크, 전화번호 뒷자리만 공개됩니다.</p>
            </div>
          </div>
        </section>

        <section className="contest-card">
          <div className="contest-header">
            <h1>신청하기</h1>
            <p>아이 이름과 보호자 전화번호를 입력하고 원하는 시간대를 선택하세요.</p>
          </div>

          <form className="contest-form" onSubmit={submit}>
            <label className="form-label">
              <span>아이 이름</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김철수" />
            </label>

            <label className="form-label">
              <span>보호자 전화번호</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="숫자만 입력" />
            </label>

            <label className="form-label">
              <span>신청 시간대 선택</span>
              <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
                {Object.entries(SLOT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className="message-box" style={{ marginBottom: 18 }}>
              현재 신청자 수: {count === null ? "불러오는 중..." : count}
            </div>

            <div className="submit-row">
              <button type="submit" className="button-primary button-large" disabled={loading}>
                {loading ? "신청 중..." : "신청하기"}
              </button>
            </div>
          </form>

          {message && <div className="message-box">{message}</div>}
        </section>
        <section className="contest-card">
          <div className="contest-header">
            <h1>당첨자 확인</h1>
            <p>시간대를 선택하면 해당 시간대의 당첨자 목록을 확인할 수 있습니다.</p>
          </div>

          <label className="form-label">
            <span>당첨자 시간대 선택</span>
            <select value={winnerSlot} onChange={(e) => setWinnerSlot(e.target.value as Slot)}>
              {Object.entries(SLOT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="message-box" style={{ marginBottom: 18 }}>
            현재 선택된 시간대 당첨자 수: {winners.length}
          </div>

          {winnerLoading ? (
            <div className="message-box">당첨자 목록을 불러오는 중입니다...</div>
          ) : winners.length === 0 ? (
            <div className="message-box">해당 시간대에 당첨자가 없습니다.</div>
          ) : (
            <ul>
              {winners.map((winner, index) => (
                <li key={index} className="result-item">
                  {winner.maskedName} — {winner.phoneTail}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="page-footer-link">
          <a href="/contest" className="button-secondary button-compact">
            관리자용 페이지
          </a>
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

  async function runDraw(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/contest/draw?slot=${encodeURIComponent(slot)}&secret=${encodeURIComponent(secret)}`, {
        method: "POST",
      });
      const data = await res.json();
      setResult({ ok: res.ok, body: data });
    } catch (err) {
      setResult({ ok: false, body: { error: "서버 오류" } });
    }

    setLoading(false);
  }

  return (
    <form className="admin-form" onSubmit={runDraw}>
      <label className="form-label">
        <span>시간대 선택</span>
        <select value={slot} onChange={(e) => setSlot(e.target.value as Slot)}>
          {Object.entries(SLOT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-label">
        <span>관리자 비밀키</span>
        <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="관리자 비밀키" />
      </label>

      <button type="submit" className="button-secondary" disabled={loading}>
        {loading ? "추첨 중..." : "추첨 실행"}
      </button>

      {result && (
        <div className="result-box">
          {result.ok ? (
            <>
              <div className="result-title">당첨자 목록</div>
              <ul>
                {result.body.winners.map((winner: any, index: number) => (
                  <li key={index} className="result-item">
                    {winner.maskedName} — {winner.phoneTail}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="error-text">{result.body?.error || "오류가 발생했습니다."}</div>
          )}
        </div>
      )}
    </form>
  );
}
