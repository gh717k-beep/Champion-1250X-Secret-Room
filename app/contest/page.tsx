"use client";

import { useEffect, useState, type FormEvent } from "react";

type Slot = "12:00" | "14:00" | "16:00" | "18:00";

type Entry = {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
};

const SLOT_LABELS: Record<Slot, string> = {
  "12:00": "12:00",
  "14:00": "14:00",
  "16:00": "16:00",
  "18:00": "18:00",
};

const ADMIN_PASSWORD = "X0521";

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

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
                <button type="submit" className="button-secondary">
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
  const [slot, setSlot] = useState<Slot>("12:00");
  const [count, setCount] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState("");
  const [drawMessage, setDrawMessage] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCount = async (currentSlot: Slot) => {
    try {
      const res = await fetch(`/api/contest?slot=${encodeURIComponent(currentSlot)}`);
      if (!res.ok) {
        setCount(null);
        return;
      }

      const data = await res.json();
      setCount(data.count ?? null);
    } catch {
      setCount(null);
    }
  };

  const fetchEntries = async (currentSlot: Slot) => {
    try {
      const res = await fetch(
        `/api/contest?slot=${encodeURIComponent(currentSlot)}&list=true&secret=${encodeURIComponent(secret)}`
      );
      if (!res.ok) {
        setEntries([]);
        return;
      }

      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    fetchCount(slot);
    fetchEntries(slot);
  }, [slot, secret]);

  function startEditing(entry: Entry) {
    setEditingId(entry.id);
    setEditName(entry.name);
    setEditPhone(entry.phone);
    setEditError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setEditPhone("");
    setEditError("");
  }

  async function saveEdit(entryId: number) {
    if (!editName.trim() || !editPhone.trim()) {
      setEditError("이름과 전화번호를 모두 입력해주세요.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const res = await fetch(`/api/contest?secret=${encodeURIComponent(secret)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryId, name: editName.trim(), phone: editPhone.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEditError(data?.error || "저장 중 오류가 발생했습니다.");
        return;
      }

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, name: editName.trim(), phone: editPhone.trim() } : entry
        )
      );
      cancelEditing();
    } catch {
      setEditError("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteEntry(entryId: number) {
    setEditError("");

    try {
      const res = await fetch(`/api/contest?secret=${encodeURIComponent(secret)}&id=${entryId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEditError(data?.error || "삭제 중 오류가 발생했습니다.");
        return;
      }

      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      setCount((prev) => (prev === null ? prev : Math.max(0, prev - 1)));
      cancelEditing();
    } catch {
      setEditError("삭제 중 오류가 발생했습니다.");
    }
  }

  async function deleteAllEntries() {
    if (entries.length === 0) return;
    const ok = confirm("현재 시간대 신청자를 전체 삭제할까요?");
    if (!ok) return;

    setEditError("");
    setDrawMessage("");
    setDeletingAll(true);

    try {
      const res = await fetch(
        `/api/contest?secret=${encodeURIComponent(secret)}&slot=${encodeURIComponent(slot)}`,
        { method: "DELETE" }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEditError(data?.error || "전체 삭제 중 오류가 발생했습니다.");
        return;
      }

      setEntries([]);
      setCount(0);
      cancelEditing();
    } catch {
      setEditError("전체 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingAll(false);
    }
  }

  async function runDraw(e?: FormEvent) {
    e?.preventDefault();
    setEditError("");
    setDrawMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/contest/draw?slot=${encodeURIComponent(slot)}&secret=${encodeURIComponent(secret)}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setEditError(data?.error || "추첨 실행 중 오류가 발생했습니다.");
        return;
      }

      fetchEntries(slot);
      setDrawMessage("추첨 완료! 메인페이지에서 확인해주세요.");
    } catch {
      setEditError("서버와 통신할 수 없습니다.");
    } finally {
      setLoading(false);
    }
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
        현재 신청 수: {count === null ? "불러오는 중..." : count}
      </div>

      <div className="result-box">
        <div className="list-header">
          <div className="result-title">신청자 목록</div>
          <button
            type="button"
            className="button-secondary list-header-button"
            onClick={deleteAllEntries}
            disabled={deletingAll || loading || entries.length === 0}
          >
            {deletingAll ? "삭제 중..." : "신청자 전체 삭제"}
          </button>
        </div>
        {entries.length === 0 ? (
          <div className="result-item">현재 해당 시간대 신청자가 없습니다.</div>
        ) : (
          <ul>
            {entries.map((entry) => (
              <li key={entry.id} className="result-item">
                {editingId === entry.id ? (
                  <div className="entry-edit-row">
                    <input
                      className="entry-inline-input"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="이름"
                    />
                    <input
                      className="entry-inline-input"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="전화번호"
                    />
                    <span className="entry-time">{formatCreatedAt(entry.createdAt)}</span>
                    <button type="button" className="button-secondary" onClick={() => saveEdit(entry.id)} disabled={savingEdit}>
                      저장
                    </button>
                    <button type="button" className="button-secondary" onClick={cancelEditing} disabled={savingEdit}>
                      취소
                    </button>
                    <button type="button" className="button-secondary" onClick={() => deleteEntry(entry.id)} disabled={savingEdit}>
                      삭제
                    </button>
                  </div>
                ) : (
                  <div className="entry-display-row">
                    <div className="entry-info-group">
                      <span className="entry-text entry-name">이름 : {entry.name}</span>
                      <span className="entry-text entry-phone">전화번호 : {entry.phone}</span>
                    </div>
                    <div className="entry-side-group">
                      <span className="entry-time">{formatCreatedAt(entry.createdAt)}</span>
                      <button type="button" className="button-secondary" onClick={() => startEditing(entry)}>
                        수정
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {editError ? <div className="error-text">{editError}</div> : null}
      </div>

      <button type="submit" className="button-secondary" disabled={loading}>
        {loading ? "추첨 중..." : "추첨 실행"}
      </button>

      {drawMessage ? <div className="message-box">{drawMessage}</div> : null}
    </form>
  );
}
