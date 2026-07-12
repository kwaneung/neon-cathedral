# TICKET-007 — QA 리포트: 박제 임계값 정합화 + 옵트아웃

| 항목 | 내용 |
|---|---|
| 티켓 ID | TICKET-007 |
| 검증 브랜치 | `kwaneung/dev` |
| 검증 커밋 | `9b2786d`, `4b40dda` (`a704251..HEAD`) |
| 검증일 | 2026-07-12 |
| 검증 방식 | 정적 코드 리뷰 (파일:라인 근거) + 코디네이터 외부 lint/build |
| 런타임 E2E / DB 마이그레이션 적용 | 미실행 (세션 제약: 장시간 명령 금지, 리뷰 전용) |
| 종합 판정 | **PASS with minors** |

---

## 1. 정적 검증

| 검사 | 결과 | 비고 |
|---|---|---|
| `npm run lint` | PASS | 코디네이터 외부 검증: lint/build PASS |
| `npm run build` | PASS | 코디네이터 외부 검증: lint/build PASS |

---

## 2. 검증 항목 판정표

### 2.1 [마이그레이션] `docs/migrations/TICKET-007-glass-threshold-optout.sql`

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| M1 | 문법·구조 완전성 | **PASS** | `app_settings` 생성 → 시드 → `opted_out` 컬럼 → `increment_candle` `CREATE OR REPLACE` 순서 (`:9-112`). plpgsql 블록·`FOR UPDATE`·반환 JSON 일관. |
| M2 | `app_settings` 생성 + 시드 100 | **PASS** | `CREATE TABLE IF NOT EXISTS` (`:9-13`). `INSERT … VALUES ('glass_threshold', '100'::jsonb) ON CONFLICT DO NOTHING` (`:16-18`). |
| M3 | `opted_out` 컬럼 | **PASS** | `ADD COLUMN IF NOT EXISTS opted_out boolean NOT NULL DEFAULT false` (`:21-22`) + COMMENT (`:24-25`). |
| M4 | RPC가 설정 조회·opted_out 제외를 원자적으로 수행 | **PASS** | 행 `FOR UPDATE` (`:44-56`) → 임계값 조회·폴백 100 (`:75-89`) → `IF NOT v_opted_out AND v_candles >= v_threshold` (`:94-97`) → 단일 `UPDATE` (`:99-104`). |
| M5 | 기존 데이터 안전(멱등/IF NOT EXISTS) | **PASS** | 테이블/컬럼 `IF NOT EXISTS`, 시드 `ON CONFLICT DO NOTHING`. 기존 행은 `DEFAULT false`로 백필. 함수는 `REPLACE`만 수행해 데이터 삭제 없음. |

### 2.2 [보안] `optOutStainedGlassAction`

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| S1 | 세션 `user_id` ↔ `confession.author_id` 서버 강제 | **PASS** | Action이 `getSession()`으로 서버 쿠키 세션만 사용 (`actions.ts:232-240`). 클라이언트에서 userId를 받지 않음. `unarchiveConfession`에서 `row.author_id !== userId` 거부 (`db.ts:199-201`). |
| S2 | 타인 글 해제 시도 차단 | **PASS** | 위 대조 실패 시 에러 반환. UPDATE도 `.eq('id', …).eq('author_id', userId)` 이중 조건 (`db.ts:208-217`). 0행이면 실패 (`:224-226`). |
| S3 | UI만 믿지 않음 | **PASS** | 버튼은 `authorId === userSession.id`로 노출만 제한 (`page.tsx:1412`). 실제 변경은 Server Action 경로만. |

### 2.3 [로직] 임계값·옵트아웃·재박제 방지

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| L1 | `getGlassThreshold` 폴백 100 | **PASS** | `DEFAULT_GLASS_THRESHOLD = 100` (`db.ts:57`). 조회 실패/비정상 값/`catch` 모두 100 (`:79-81`, `:92-95`, `:99-101`). Action 폴백 동일 (`actions.ts:215-221`). |
| L2 | 캐시 60초 | **PASS** | `GLASS_THRESHOLD_CACHE_MS = 60_000` (`db.ts:59-60`). 히트 시 재조회 생략 (`:65-69`). 성공 시에만 캐시 기록 (`:97-98`). |
| L3 | 해제 시 `is_archived=false` + `opted_out=true` + `expires_at=now` | **PASS** | `unarchiveConfession` UPDATE (`db.ts:207-214`). 주석·`cleanExpiredConfessions` 연동 (`:175-177`, `:160-168`). |
| L4 | 해제 글 재박제 안 됨 (RPC) | **PASS** | `increment_candle`이 `opted_out`이면 임계값 도달해도 `is_archived` 미설정 (`migration:94-97`). 갤러리 조회도 `.eq('opted_out', false)` 방어 (`actions.ts:189-194`). |

### 2.4 [UI] 동적 임계값·옵트아웃 UX

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| U1 | "5촛불" 등 하드코딩 제거(4곳 동적화) | **PASS** | 사전 커밋 4곳(`ENTRANCE`/`CATHEDRAL`/`STAINED_GLASS` 빈 상태/`SETTINGS`) → 모두 `{glassThreshold}` (`page.tsx:691`, `:929`, `:992`, `:1256`). `src`에 `5촛불` 잔존 없음. |
| U2 | 본인 조각에만 해제 버튼 | **PASS** | `userSession && selectedStainedConfession.authorId === userSession.id` (`page.tsx:1412-1451`). |
| U3 | 확인 다이얼로그·비가역성 안내 | **PASS** | 1차 "박제 해제" → 확인 문구 "되돌릴 수 없습니다." + "확인하고 해제"/취소 (`page.tsx:1417-1448`). |
| U4 | 한국어·기존 디자인 톤 | **PASS** | 한국어 카피, `rounded-full`/`border-devil`/`font-serif` 등 기존 라이트박스·서피스 패턴 유지. |

### 2.5 [제약]

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| C1 | 새 API Route 없음 | **PASS** | 변경 파일: migration / `actions.ts` / `db.ts` / `page.tsx`만. `src/app/api/`는 기존 `cron/keep-alive`만. |
| C2 | LLM 미사용 | **PASS** | 본 티켓 경로에 LLM 호출 없음. 기존 `generateLetterContent`는 템플릿 (`letters.ts`). |
| C3 | 개인정보 미수집 | **PASS** | 익명 세션 쿠키 패턴만 재사용. email/IP/실명 수집 추가 없음. |
| C4 | 피드/촛불/편지/캐싱 회귀 없음 | **PASS** | `getFeedConfessionsAction`·`toggleCandleAction`·편지 Actions·`updateTag('confessions')` 유지. 옵트아웃 성공 시에도 동일 태그 무효화 (`actions.ts:241-242`). |

### 2.6 [요구사항 대조]

| # | 요구사항 | 판정 | 근거 |
|---|---|---|---|
| R1 | FR-4.1 (100) | **PASS** | 시드·폴백·상수 모두 100. UI 기본값 `DEFAULT_GLASS_THRESHOLD`. |
| R2 | FR-4.2 옵트아웃 / 능동 알림 스코프 | **PASS** | 옵트아웃 구현됨. 박제 시점 능동 알림(편지봉투 등)은 코드 주석으로 명시적 스코프 제외 (`db.ts:178`, `actions.ts:225-226`, `page.tsx:1411`). |
| R3 | FR-4.5 서버 설정 조정 가능 | **PASS** | `app_settings.glass_threshold` + RPC/앱 조회. DB 값 변경으로 임계값 조정 가능(앱 캐시 최대 60초 지연). |

---

## 3. 이슈 목록

| ID | 심각도 | 설명 | 위치 |
|---|---|---|---|
| QA-007-1 | **minor** | 마이그레이션이 `docs/migrations/`에만 있고 런타임 자동 적용이 아님. DB 미적용 시 `opted_out` 컬럼/`app_settings` 부재로 `getStainedGlassAction` 필터·`addConfession(opted_out)`·임계값 조회가 실패하거나 폴백에만 의존. 배포 전 SQL 적용이 필수 게이트. | `docs/migrations/TICKET-007-glass-threshold-optout.sql`; 커밋 `9b2786d` 메시지 |
| QA-007-2 | **minor** | 기존 전제(RLS OFF + `NEXT_PUBLIC` anon 키)에서는 Server Action을 우회한 직접 `confessions` UPDATE가 이론상 가능. 본 티켓의 Action 경로 소유권 검사는 충족하나, DB 레벨 작성자 제약은 없음(사전 존재 아키텍처). | `db.ts:207-217`; `supabase.ts:11-12`; `db.ts:163` 주석 |

critical: **0** / major: **0** / minor: **2**

---

## 4. 보안·제약 요약

| 항목 | 결과 |
|---|---|
| `optOutStainedGlassAction` 세션↔author 대조 | PASS — `actions.ts:232-240`, `db.ts:199-217` |
| 신규 API Route | PASS — 미추가 |
| LLM 호출 | PASS — 미사용 |
| 개인정보 수집 | PASS — 추가 수집 없음 |
| 능동 박제 알림 | N/A (명시적 스코프 제외, 본인 조각 UI로 대체) |

---

## 5. 종합 판정

**PASS with minors**

마이그레이션·서버 소유권 검사·임계값 폴백/캐시·재박제 방지 RPC·UI 4곳 동적화·옵트아웃 확인 UX·FR-4.1/4.2(옵트아웃)/4.5가 코드 근거상 충족한다. critical·major 없음. minor 2건(수동 마이그레이션 게이트, 기존 RLS OFF 심층방어 부재)은 수용 차단 사유가 아니다.

### 잔여 / 권장 후속

1. 배포 체크리스트에 `TICKET-007-glass-threshold-optout.sql` 적용 확인 포함.
2. (선택) confessions UPDATE에 대한 RLS 또는 RPC화로 옵트아웃 심층 방어.
3. (후속 티켓) FR-4.2 박제 시점 능동 알림(편지봉투 등).
4. (선택) 마이그레이션 적용 후 임계값 변경·옵트아웃·재투표 비박제 E2E 스모크.
