# Secret Room

Next.js App Router 기반 신청/추첨 관리 앱입니다.

## Local Run

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## Supabase Setup

Vercel 환경에서는 로컬 파일(`data/entries.json`) 저장 방식이 유지되지 않으므로, 이 프로젝트는 Supabase DB를 사용하도록 구성되어 있습니다.

### 1) 테이블 생성

Supabase SQL Editor에서 아래 SQL을 실행하세요.

```sql
create table if not exists public.contest_entries (
	id bigint generated always as identity primary key,
	name text not null,
	phone text not null,
	slot text not null,
	created_at timestamptz not null default now(),
	winner boolean not null default false,
	drawn_at timestamptz
);

create unique index if not exists contest_entries_slot_name_phone_idx
	on public.contest_entries (slot, name, phone);
```

### 2) 환경변수 설정

로컬 `.env.local`과 Vercel Project Settings > Environment Variables에 아래 값을 설정하세요.

```bash
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

주의: `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 키이므로 외부에 노출하면 안 됩니다.

### 3) Vercel 재배포

환경변수 저장 후 재배포하면, 신청/조회/추첨 API가 Supabase를 통해 정상 동작합니다.

## Build

```bash
npm run build
```
