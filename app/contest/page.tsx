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

const ADMIN_PASSWORD = "X0521";

export default function ContestPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");

  function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = password.trim().toLowerCase();
    if (normalized === ADMIN_PASSWORD.toLowerCase()) {
      setAuthenticated(true);
      setAuthError("");
      setPassword("");
      return;
    }

    setAuthError("비밀번호가 올바르지 않습니다. 다시 시도해 주세요.");
  }

  return (
    <main className="app-shell">
      <div className="hero-decor" />
      <div className="page-content">
        <section className="contest-card">
          <div className="contest-header">
            <p className="tagline">Champion 1250X</p>
            <h1>관리자용 페이지</h1>
          </div>

          {!authenticated ? (
            <div className="admin-login-card">
              <p className="login-note">관리자 비밀번호를 입력해야 관리자 UI가 표시됩니다.</p>
              <form className="login-form" onSubmit={handleLogin}>
                <label className="form-label">
                  <span>관리자 비밀번호</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                  />
                </label>
                <button type="submit" className="button-primary">
                  확인
                </button>
                {authError ? <div className="error-text">{authError}</div> : null}
              </form>
            </div>
          ) : (
            <div className="admin-panel">
              <h2>추첨 실행</h2>
              <AdminDraw secret={ADMIN_PASSWORD} />
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <a href="/" className="button-secondary">
              메인 페이지
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

function AdminDraw({ secret }: { secret: string }) {
  const [slot, setSlot] = useState<Slot>("weekday-16");
  const [count, setCount] = useState<number | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCount = async (currentSlot: Slot) => {
    try {
      const res = await fetch(`/api/contest?slot=${encodeURIComponent(currentSlot)}`);
      if (!res.ok) return setCount(null);
      const data = await res.json();
      setCount(data.count ?? null);
    } catch {
      setCount(null);
    }
  };

  useEffect(() => {
    fetchCount(slot);
  }, [slot]);

  async function runDraw(e?: FormEvent) {
    e?.preventDefault();
    setResult(null);

    if (!secret.trim()) {
      setResult({ ok: false, body: { error: "비밀번호를 확인해 주세요." } });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/contest/draw?slot=${encodeURIComponent(slot)}&secret=${encodeURIComponent(secret)}`, {
        method: "POST",
      });
      const data = await res.json();
      setResult({ ok: res.ok, body: data });
    } catch (err) {
      setResult({ ok: false, body: { error: "비밀번호를 확인해 주세요." } });
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

      <div className="message-box" style={{ marginBottom: 18 }}>
        현재 응모 수: {count === null ? "불러오는 중..." : count}
      </div>

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
