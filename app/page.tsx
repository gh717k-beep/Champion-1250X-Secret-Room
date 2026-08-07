"use client";

import { useEffect, useState, type FormEvent } from "react";

type Slot = "weekday-16" | "weekday-18" | "weekend-12" | "weekend-14" | "weekend-16";

type Winner = {
  name: string;
  phoneDisplay: string;
};

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
  const [winners, setWinners] = useState<Winner[]>([]);
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
      if (!res.ok) {
        setCount(null);
        return;
      }

      const data = await res.json();
      setCount(data.count ?? null);
    } catch {
      setCount(null);
    }
  }

  async function fetchWinners() {
    setWinnerLoading(true);
    try {
      const res = await fetch(`/api/contest?slot=${encodeURIComponent(winnerSlot)}&winners=true`);
      if (!res.ok) {
        setWinners([]);
        return;
      }

      const data = await res.json();
      setWinners(data.winners ?? []);
    } catch {
      setWinners([]);
    } finally {
      setWinnerLoading(false);
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
    if (cleaned.length !== 11 && cleaned.length !== 4) {
      return setMessage("보호자 전화번호는 숫자 11자리 또는 뒤 4자리만 입력하세요.");
    }

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
    } catch {
      setMessage("서버와 통신할 수 없습니다.");
    }
    setLoading(false);
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

          <div className="info-grid single-card">
            <div className="info-box">
              <strong>안내</strong>
              <div className="guide-content">
                <p className="guide-line">
                  <span className="guide-dot" aria-hidden="true" />
                  <span>최대 10명까지 즐길 수 있는 방탈출 컨텐츠 입니다.</span>
                </p>
                <p className="guide-line">
                  <span className="guide-dot" aria-hidden="true" />
                  <span>신청 인원이 10명을 초과할 시 무작위로 10명을 선정합니다.</span>
                </p>
                <p className="guide-line">
                  <span className="guide-dot" aria-hidden="true" />
                  <span>6세 이하 어린이는 보호자와 동반 입장 가능합니다.</span>
                </p>
                <p className="guide-line">
                  <span className="guide-dot" aria-hidden="true" />
                  <span>비밀의 방 이용시 이용시간이 30분 추가됩니다.</span>
                </p>
              </div>
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
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예 : 김놀이" />
            </label>

            <label className="form-label">
              <span>보호자 전화번호</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="전화번호 뒤 4자리 입력  예: 1234" />
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
              현재 신청 수: {count === null ? "불러오는 중..." : count}
            </div>

            <div className="submit-row">
              <button type="submit" className="button-secondary" disabled={loading}>
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

          {winnerLoading ? (
            <div className="message-box">당첨자 목록을 불러오는 중입니다...</div>
          ) : winners.length === 0 ? (
            <div className="message-box">해당 시간대에 당첨자가 없습니다.</div>
          ) : (
            <ul>
              {winners.map((winner, index) => (
                <li key={index} className="result-item">
                  <div className="winner-display-row">
                    <span className="entry-text">이름 : {winner.name}</span>
                    <span className="entry-text">전화번호 : {winner.phoneDisplay}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div style={{ width: "100%", display: "flex", justifyContent: "flex-start" }}>
          <a href="/contest" className="button-secondary">
            관리자용 페이지
          </a>
        </div>
      </div>
    </main>
  );
}
