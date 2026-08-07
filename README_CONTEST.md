간단한 사용법 - '비밀의 방' 신청 기능

구성
- `app/contest/page.tsx`: 사용자(신청) 및 관리자(추첨) UI
- `app/api/contest/route.ts`: 제출 저장과 추첨을 처리하는 API 라우트

주의(중요)
- 현재 예제는 로컬과 테스트용으로 `data/entries.json` 파일에 신청 데이터를 저장합니다. Vercel 같은 서버리스 환경에서는 파일 시스템이 영구 저장소가 아니므로 실제 서비스에서는 아래와 같은 영구 저장소를 사용하세요:
  - Vercel KV
  - Upstash Redis
  - Supabase / PostgreSQL
  - Google Sheets API

- 프로덕션에서 추첨 엔드포인트는 `VERCEL_CONTEST_SECRET` 같은 환경변수로 보호하세요. 예제는 `process.env.VERCEL_CONTEST_SECRET`와 비교합니다.

엔드포인트
- POST `/api/contest`  { name, phone, slot } -> 신청 (전화번호당 동일한 slot에 대해 1회)
- GET `/api/contest?slot=weekday-16` -> 해당 slot 신청 수 반환
- POST `/api/contest/draw?slot=weekday-16&secret=...` -> 해당 slot에 대해 추첨 실행, 공개 가능한 정보(마스킹된 이름, 전화번호 뒷자리) 반환

마스킹 규칙
- 이름: 가운데 문자들을 `*`로 대체(예: 김철수 -> 김**수)
- 전화번호: 마지막 4자리만 공개

배포/환경변수
- Vercel에 배포 시 프로젝트 Settings > Environment Variables에 `VERCEL_CONTEST_SECRET`을 추가하세요.

로컬 테스트
1. `npm run dev`로 로컬 서버 실행
2. 브라우저에서 `/contest`로 접속

더 개선할 점(권장)
- 영구 저장소로 교체 (위 옵션 중 선택)
- 관리 페이지에 인증 또는 관리자 계정 추가
- 중복 신청 정책(전화번호 전역 중복 vs slot별 중복) 명확화
- 제출 데이터 검증 강화(전화번호 포맷, 개인정보 취급방침 동의 등)
