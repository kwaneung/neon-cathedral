# TICKET-001 — QA 리포트: 편지 도착 대기 UX 및 알림

| 항목 | 내용 |
|---|---|
| 티켓 ID | TICKET-001 |
| 검증 브랜치 | `kwaneung/dev` |
| 검증일 | 2026-07-11 |
| 검증 방식 | 정적 코드 리뷰 (파일:라인 근거) + 코디네이터 외부 lint/build |
| 런타임 E2E | 미실행 (세션 제약) |
| 종합 판정 | **PASS with minors** |

---

## 1. 정적 검증

| 검사 | 결과 | 비고 |
|---|---|---|
| `npm run lint` | PASS | 코디네이터 외부 검증: lint PASS, build PASS (exit 0) |
| `npm run build` | PASS | 코디네이터 외부 검증: lint PASS, build PASS (exit 0) |

---

## 2. 수용 기준 판정표

### 2.1 기능 (10)

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| F1 | 고해 제출 성공 후 본당에서 도착 예정 시각 기준 카운트다운 표시 | **PASS** | 제출 성공 후 `getPendingRepliesAction` → `setPendingReplies` (`page.tsx:298-300`). CATHEDRAL에 `LetterCountdownBanner` (`page.tsx:692-699`). 타이머는 `sentAt` 기준 1초 틱 (`LetterCountdownBanner.tsx:64-78`). |
| F2 | 카운트다운 0 → 30초 이내 편지함 반영 | **PASS** | `onComplete` → `handleCountdownComplete` → `refreshLetterState({ notifyArrival: true })` (`page.tsx:161-163`, `138-158`). pending 존재 시 폴링 30초 (`page.tsx:197`). *런타임 타이밍은 미실측, 코드 경로상 즉시 fetch.* |
| F3 | 도착 토스트 1회 (중복 스팸 없음) | **PASS** | `notifiedReplyIdsRef`로 replyId당 1회 (`page.tsx:78`, `145-151`). 초기 로드 시 기존 미읽음도 시드해 재토스트 방지 (`page.tsx:105-107`). 문구·4.5s·탭→LETTER_BOX (`page.tsx:233-237`, `469-486`). |
| F4 | 서신 미읽음 뱃지, 개봉 후 감소/소멸 | **PASS** | `unreadCount` + 1=dot / 2–9=숫자 / 10+=`9+` (`page.tsx:1101-1114`). `aria-label`에 미읽음 수 (`page.tsx:1094`). 개봉 시 `setUnreadCount(prev => max(0, prev-1))` (`page.tsx:321`). |
| F5 | `sent_at > now` 봉인 UI, 본문 미노출 | **PASS** | `resolveState` sealed (`SealedLetterCard.tsx:28-36`, `131-171`). 본문 대신 blur 바 3줄 (`155-158`). pending 카드에 `content=""` (`page.tsx:914`). |
| F6 | 봉인 편지 MM:SS 표시 | **PASS** | `formatMmSs(computedRemaining)` (`SealedLetterCard.tsx:162-168`). |
| F7 | 도착·미읽음 개봉 CTA | **PASS** | `arrived_unread` → button + “터치하여 개봉” (`SealedLetterCard.tsx:174-206`). `onOpen` → `markReplyAsReadAction` (`page.tsx:312-321`). |
| F8 | 열람 시 `is_read=true`, 재진입 유지 | **PASS** | DB `update({ is_read: true })` (`db.ts:203-208`). 클라이언트 `isRead: true` 반영 (`page.tsx:318-320`). 재조회는 `getUserReplies` → `mapDbReplyToSchema`의 `isRead` (`db.ts:41`, `52`). |
| F9 | 타인 세션 `markReplyAsReadAction` 실패 | **PASS** | 세션 `getSession()` 후 `markReplyAsRead(replyId, session.id)` (`actions.ts:157-164`). `.eq('recipient_id', userId)` + 0행이면 `{ success: false }` (`db.ts:206-217`). |
| F10 | 빈 편지함 “수동 새로고침” 문구 제거 | **PASS** | 대체 카피 적용 (`page.tsx:902-905`). “새로고침 버튼을 터치” 문자열 없음. |

### 2.2 비기능 (7)

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| N1 | pending 없을 때 폴링 15–60초 | **PASS** | pending 있음 30s / 없음 60s (`page.tsx:197`). |
| N2 | 신규 UI 텍스트 한국어 | **PASS** | 배너·토스트·봉인·개봉 CTA·빈 상태 모두 한국어. (기존 톤 영문 라벨 `Angel's comfort` 등은 현행 편지 카드 패턴 유지.) |
| N3 | 신규 API Route 미추가 | **PASS** | 편지 UX는 Server Actions만 (`actions.ts:145-176`). `src/app/api/`는 기존 `cron/keep-alive`만 존재. |
| N4 | LLM API 미사용 | **PASS** | `generateLetterContent`는 템플릿 랜덤 (`letters.ts:90-101`). openai/anthropic 등 호출 없음. |
| N5 | 개인정보 추가 수집 없음 | **PASS** | 기존 익명 세션 쿠키 패턴만 사용. email/IP/이름 수집 코드 추가 없음. |
| N6 | 360px 레이아웃 깨짐 없음 | **PASS*** | `max-w-xl` + `px-4`, 배너 `flex-wrap`/`min-w-0` (`LetterCountdownBanner.tsx:115`). *뷰포트 실측 미실시, 정적 구조상 통과.* |
| N7 | reduced-motion(미디어쿼리+설정) 시 개봉 모션 생략 | **PASS** | `prefers-reduced-motion` 리스너 + 설정 토글 → `motionReduced` (`page.tsx:82`, `117-126`, `269-273`). 개봉 즉시 State C (`SealedLetterCard.tsx:89-92`). CSS `@media (prefers-reduced-motion: reduce)` (`globals.css:151-159`). |

### 2.3 회귀 (2)

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| R1 | 고해·연소·피드·촛불·스테인드글라스·설정 유지 | **PASS** | CONFESS/`BurnEffect`, CATHEDRAL/`CandleButton`, STAINED_GLASS, SETTINGS 뷰·핸들러 유지 (`page.tsx` 해당 섹션). 기존 Server Actions import 유지. |
| R2 | 위기 키워드 답장 상담 안내 유지 | **PASS** | `CRISIS_KEYWORDS` / `CRISIS_MESSAGE` / `generateLetterContent` 분기 그대로 (`letters.ts:79-101`). |

---

## 3. 이슈 목록

| ID | 심각도 | 설명 | 위치 |
|---|---|---|---|
| QA-001 | **minor** | 카운트다운 배너가 `aria-live="polite"` + `aria-label`을 초 단위로 갱신해 스크린리더 낭독 스팸 가능. 디자인 §7.3은 30초/분 변경 시에만 live 갱신 권장. | `LetterCountdownBanner.tsx:90-100` |
| QA-002 | **minor** | `SealedLetterCard`의 `remainingSeconds` prop이 선언만 되고 미사용(내부 `sentAt` 재계산). 동작에는 영향 없음. | `SealedLetterCard.tsx:16`, `38-46` |

critical: **0** / major: **0** / minor: **2**

---

## 4. 보안·제약 요약

| 항목 | 결과 |
|---|---|
| `markReplyAsRead` recipient_id 세션 대조 | PASS — `db.ts:206-217`, `actions.ts:161-164` |
| 신규 API Route | PASS — 미추가 |
| LLM 호출 | PASS — 미사용 |
| 개인정보 수집 | PASS — 추가 수집 없음 |

---

## 5. 접근성 요약

| 항목 | 결과 |
|---|---|
| reduced-motion (OS + 설정) | PASS |
| 터치 타겟 (미읽음 카드·토스트 `min-h-11`) | PASS (카드/토스트). 네비는 기존 패턴 유지. |
| aria-live (토스트 `role="status"`) | PASS |
| 배너 aria-live 갱신 주기 | minor (QA-001) |

---

## 6. 종합 판정

**PASS with minors**

기능 10 / 비기능 7 / 회귀 2 모두 코드 근거상 통과. critical·major 이슈 없음. minor 2건(스크린리더 live 주기, 미사용 prop)은 후속 정리 권장이며 수용 차단 사유가 아니다.

### 잔여 / 권장 후속

1. QA-001: 배너 `aria-live` 갱신을 분 변경 또는 30초 단위로 제한.
2. QA-002: 미사용 `remainingSeconds` prop 제거 또는 실제 사용.
3. (선택) 실기기/브라우저에서 5분 대기·도착·뱃지·개봉 E2E 스모크.
