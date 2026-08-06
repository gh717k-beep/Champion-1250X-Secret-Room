'use client';

import { useMemo, useState } from "react";

const tips = [
  "입력한 이름으로 환영 메시지를 바꿔보세요.",
  "버튼을 누르면 클릭 수가 증가합니다.",
  "이 페이지는 브라우저에서 바로 실행됩니다.",
];

export default function Home() {
  const [name, setName] = useState("코드");
  const [count, setCount] = useState(0);

  const greeting = useMemo(() => {
    return `${name}님, 브라우저에서 바로 실행되는 웹 페이지예요!`;
  }, [name]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_40%),linear-gradient(135deg,_#0f172a,_#111827)] px-4 py-16 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-3xl flex-col gap-8 rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            웹에서 구동하는 예제
          </p>
          <h1 className="text-4xl font-semibold sm:text-5xl">Secret Room</h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            이 페이지는 React와 Next.js로 만든 간단한 웹 앱입니다.
            입력창과 버튼을 조작해보면서 브라우저에서 바로 동작하는 코드를 확인해보세요.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-800/70 p-5 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="flex-1 rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-white outline-none ring-0 focus:border-cyan-400"
            placeholder="이름을 입력하세요"
          />
          <button
            onClick={() => setCount((current) => current + 1)}
            className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            클릭 수: {count}
          </button>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
          <p className="text-sm text-cyan-200">환영 메시지</p>
          <p className="mt-2 text-xl font-medium">{greeting}</p>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3">
          {tips.map((tip) => (
            <li
              key={tip}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300"
            >
              {tip}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
