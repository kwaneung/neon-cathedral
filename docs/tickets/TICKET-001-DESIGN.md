# TICKET-001 — 디자인 명세: 편지 도착 대기 UX 및 알림

| 항목 | 내용 |
|---|---|
| 티켓 ID | TICKET-001 |
| 문서 유형 | UI/UX 디자인 명세 |
| 기준 기획 | `docs/tickets/TICKET-001.md` §7 |
| 작성일 | 2026-07-11 |
| 상태 | 디자인 완료, 구현 대기 |
| 비주얼 기준 | 다크 고딕 + amber/cyan (`globals.css`, `page.tsx`, CandleButton) |

---

## 0. 디자인 원칙

1. **기존 언어 유지** — `#020203` / `#07070a` 글래스 카드, `rounded-3xl`, `border-white/[0.04]`, amber·cyan·rose 톤 글로우를 재사용한다.
2. **한 섹션 한 목적** — 카운트다운은 “남은 성찰 시간”, 봉투 카드는 “개봉 가능 여부”, 토스트는 “도착 알림”만 담당한다.
3. **감성 완결** — “5분, 번뇌가 정화되는 시간” 내러티브를 인터랙티브 UI로 연결한다. 수동 새로고침 유도 카피는 제거한다.
4. **모션은 존재감** — 등장·페이드·개봉만 의도적으로 쓰고, `prefers-reduced-motion` 및 설정 토글(`reducedMotion`)과 연동한다.

---

## 1. 카운트다운 배너 (`LetterCountdownBanner`)

### 1.1 배치

| 뷰 | 위치 |
|---|---|
| `CATHEDRAL` | 피드 헤더(`본당 회랑`) 바로 아래, 리스트 위 |
| `LETTER_BOX` | 기존 “5분, 번뇌가…” 안내 상자 **위** (안내 상자는 유지, 배너가 실시간 상태) |

- 컨테이너: `max-w-xl` 본문 폭과 동일, 좌우 `px-4` 상속
- **모바일 360px 기준** 한 줄 우선. 라벨이 길면 두 줄(아이콘+라벨 / MM:SS)로 접힘

### 1.2 레이아웃 (360px)

```
┌─────────────────────────────────────────┐  h: 48~56px
│  [⏳]  답장 도착까지          04:37     │  gap-3, px-4 py-3
└─────────────────────────────────────────┘  rounded-2xl
```

| 요소 | 스펙 |
|---|---|
| 배경 | `bg-[#09090e]/70` + `backdrop-blur-xl` |
| 테두리 | `border border-amber-500/20` |
| 글로우 | `shadow-[0_0_24px_rgba(245,158,11,0.08)]` (기존 `neon-glow-amber` 계열) |
| 아이콘 | Lucide `Hourglass` 또는 `Clock`, `h-4 w-4 text-amber-500`, `animate-pulse` (reduced-motion 시 정적) |
| 라벨 | `text-[11px] font-sans font-light tracking-wide text-zinc-400` — “답장 도착까지” |
| 타이머 | `font-mono tabular-nums text-lg tracking-[0.12em] text-amber-300` — `MM:SS` (예: `04:37`, `00:09`) |
| 터치 | 배너 자체는 비인터랙티브(정보만). 최소 높이 48px로 시각적 안정성 확보 |

### 1.3 타이포 — MM:SS

- 포맷: 항상 2자리 zero-pad (`padStart(2,'0')`)
- 폰트: 시스템/`ui-monospace` 계열 (`font-mono`). 기존 세션 TOKEN 표시와 동일 계열
- 색: `amber-300` (#fcd34d) on `#09090e` — 대비율 ≥ 7:1 (AAA 근접)
- 1초 틱마다 숫자만 갱신. 레이아웃 시프트 방지를 위해 `tabular-nums` 필수

### 1.4 모션 타이밍

| 단계 | 타이밍 | 이징 | 비고 |
|---|---|---|---|
| 등장 | 280ms | `ease-out` | `opacity 0→1`, `y: -8→0` |
| 유지 | — | — | 1초 간격 숫자 갱신 (모션 없음) |
| 종료 페이드아웃 | 400ms | `ease-in` | `opacity 1→0`, `y: 0→-6` |
| 페이드 후 | 즉시 | — | 배너 unmount → 도착 토스트 표시 (토스트는 §4) |

- `remainingSeconds === 0` 도달 시: 숫자 `00:00`을 1프레임 노출 후 페이드아웃 시작
- reduced-motion: 등장/퇴장 모두 **0ms** (즉시 mount/unmount)

### 1.5 복수 pending

- 배너는 **가장 이른 `sentAt` 1건**만 표시 (기획 §4.2.2)
- 추가 pending이 있으면 라벨 옆에 `외 N건` 마이크로카피 (`text-[10px] text-zinc-600`)

---

## 2. 봉인 봉투 카드 (`SealedLetterCard`)

기존 편지 카드와 동일 스케일: `rounded-3xl border border-white/[0.04] bg-[#07070a]/40 backdrop-blur-2xl p-6`.

### 2.1 3-State 시각 명세

#### State A — 봉인 (대기 중)

| 조건 | `sent_at > now` |
|---|---|
| 실루엣 | 봉투 SVG/아이콘 중앙, `Mail` `h-10 w-10 text-zinc-700` |
| 본문 | 플레이스홀더 3줄 블러 바 (`h-3 rounded bg-zinc-800/80 blur-[2px]`) — 실제 content 미렌더 |
| 잠금 | Lucide `Lock` `h-4 w-4 text-zinc-500` + “봉인됨” |
| 카운트다운 | 카드 하단 `도착까지 MM:SS` — 배너와 동일 mono 스펙, `text-sm` |
| CTA | 없음. `pointer-events-none` 또는 `aria-disabled` |
| 톤 뱃지 | 헤더 좌측 점 + 라벨 (천사/악마) — 기존 편지 헤더와 동일 |

#### State B — 도착·미읽음

| 조건 | `sent_at <= now && !isRead` |
|---|---|
| 글로우 | 톤별 테두리·아우라 (§2.2) + 약한 `border-shimmering` |
| 카피 | “터치하여 개봉” — `text-[11px] tracking-[0.2em] uppercase text-amber-400` |
| 아이콘 | `Lock` → `MailOpen` 전환 준비 상태 |
| CTA | 카드 전체 탭 가능. 최소 터치 영역 **44×44px** (카드 자체가 충분) |
| 개봉 시 | `markReplyAsReadAction` 호출 → State C 모션 |

#### State C — 도착·읽음

| 조건 | `isRead === true` |
|---|---|
| UI | **현행 편지 카드와 동일** (헤더 + serif 본문) |
| 글로우 | 톤 점만 유지, 카드 아우라 없음 |
| 재개봉 | 본문 항상 가시. 추가 모션 없음 |

### 2.2 톤별 글로우

| 톤 | 테두리 | 아우라 클래스 | 점 색 |
|---|---|---|---|
| 천사 (`angel`) | `border-cyan-500/35` | `neon-glow-cyan` + `shadow-[0_0_28px_rgba(6,182,212,0.18)]` (미읽음만) | `bg-cyan-400` |
| 악마 (`devil`) | `border-rose-500/35` | 신규 `neon-glow-rose` (기존 magenta 대체·정렬) | `bg-rose-500` |

- 봉인(State A): 글로우 **opacity 40%** (억제)
- 미읽음(State B): 글로우 **100%** + shimmer
- 읽음(State C): 글로우 제거, 점만 유지

### 2.3 개봉 모션

| 단계 | 시간 | 내용 |
|---|---|---|
| 1. 봉인선 분리 | 0~400ms | 상단 flap `rotateX(-25deg)` + opacity |
| 2. 내용 페이드인 | 300~800ms | 블러 바 → 본문 `opacity 0→1`, `blur 6px→0` |
| 3. 글로우 수렴 | 600~1000ms | 아우라 scale/opacity 감소 → State C |

- **총 길이: 0.6~1.0초** (권장 800ms)
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- **reduced-motion** (`prefers-reduced-motion: reduce` **또는** 설정 `reducedMotion === true`): 모션 생략, **즉시 State C** 전환
- 구현 힌트: `motion/react` `AnimatePresence` + `variants` (기존 toast/카드 패턴과 동일)

### 2.4 빈 상태 카피 (디자인 확정)

기존 수동 새로고침 문구 삭제. 대체:

> 고해를 태우면 이곳에 봉인된 편지가 먼저 나타납니다. 5분 뒤 자동으로 개봉할 수 있습니다.

- 스타일: 기존 empty state (`text-sm font-serif` + `text-[11px] font-sans text-zinc-600`) 유지

---

## 3. 네비 미읽음 뱃지

대상: 하단 플로팅 네비 **서신** 탭 (`Mail` 아이콘) 우상단.

### 3.1 크기·색

| 속성 | 값 |
|---|---|
| 위치 | 아이콘 기준 `absolute -top-1 -right-1.5` |
| Dot (1건) | `h-2 w-2` (8px) 원형, `bg-amber-500`, `ring-2 ring-[#07070a]/75` (네비 배경과 분리) |
| 숫자 (2+) | `min-w-[14px] h-[14px] px-1`, `text-[9px] font-bold text-zinc-950`, `bg-amber-500`, `rounded-full` |
| 최대 표시 | `9+` (10건 이상) |
| 대비 | amber-500 (#f59e0b) on 다크 네비 — 아이콘 zinc-500과 명확히 구분 |

### 3.2 Dot vs 숫자 규칙

| 미읽음 수 | 표시 |
|---|---|
| 0 | 뱃지 없음 |
| 1 | **dot** (숫자 없음) |
| 2 ~ 9 | 숫자 `2` … `9` |
| 10+ | `9+` |

- 카운트 소스: `sent_at <= now && !is_read` (기획 §6.2)
- 개봉(읽음) 후 즉시 감소. 0이 되면 exit 모션 120ms fade

### 3.3 접근성

- 서신 버튼에 `aria-label="서신, 미읽음 N건"` (N=0이면 `"서신"`)
- 뱃지 자체는 `aria-hidden="true"` (중복 낭독 방지)

---

## 4. 도착 토스트

### 4.1 문구 (확정)

> 성찰의 시간이 끝났습니다. 편지봉투가 도착했어요.

- 기획 예문 채택. 중복 스팸 방지: **동일 replyId당 1회**만 표시

### 4.2 스타일

기존 success 토스트 재사용 (`page.tsx` 363–373):

```
fixed top-24 left-1/2 -translate-x-1/2 z-50
flex items-center gap-3
bg-zinc-900/40 border border-white/[0.06]
text-amber-300 px-5 py-3 rounded-2xl text-xs
backdrop-blur-xl shadow-2xl
```

| 요소 | 값 |
|---|---|
| 아이콘 | `Mail` 또는 `Sparkles` `h-4.5 w-4.5 text-amber-400` |
| 본문 | `font-light tracking-wide text-zinc-200` |
| 등장 | 기존과 동일: `opacity 0→1`, `y: -20→0`, `scale 0.95→1` |

### 4.3 지속·인터랙션

| 항목 | 값 |
|---|---|
| 자동 닫힘 | **4.5초** |
| 탭 동작 | **예** — 탭 시 `setView('LETTER_BOX')` 후 토스트 즉시 dismiss |
| 커서 | `cursor-pointer` (탭 가능 암시) |
| role | `role="status"` + `aria-live="polite"` |

---

## 5. Tailwind v4 토큰 / CSS 변수 추가분

`src/app/globals.css`에 아래를 **추가**한다 (구현 단계). 기존 `:root` / `@theme inline` / glow 유틸과 병행.

```css
@theme inline {
  /* Letter arrival — semantic tokens */
  --color-letter-seal: #3f3f46;           /* zinc-700 실루엣 */
  --color-letter-timer: #fcd34d;          /* amber-300 MM:SS */
  --color-letter-badge: #f59e0b;          /* amber-500 네비 뱃지 */
  --color-letter-angel-glow: #06b6d4;     /* cyan-500 */
  --color-letter-devil-glow: #f43f5e;     /* rose-500 */
  --color-letter-toast-fg: #e4e4e7;       /* zinc-200 */

  --shadow-letter-angel: 0 0 28px rgba(6, 182, 212, 0.18);
  --shadow-letter-devil: 0 0 28px rgba(244, 63, 94, 0.18);
  --shadow-letter-banner: 0 0 24px rgba(245, 158, 11, 0.08);

  --animate-letter-seal-open: letter-seal-open 800ms cubic-bezier(0.22, 1, 0.36, 1) both;
  --animate-banner-enter: banner-enter 280ms ease-out both;
  --animate-banner-exit: banner-exit 400ms ease-in both;
}

@keyframes letter-seal-open {
  0%   { opacity: 1; filter: blur(0); }
  40%  { opacity: 0.85; filter: blur(2px); }
  100% { opacity: 1; filter: blur(0); }
}

@keyframes banner-enter {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes banner-exit {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-6px); }
}

.neon-glow-rose {
  box-shadow: 0 0 30px rgba(244, 63, 94, 0.15);
}

.letter-timer {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.12em;
}

@media (prefers-reduced-motion: reduce) {
  .animate-letter-seal-open,
  .animate-banner-enter,
  .animate-banner-exit,
  .border-shimmering {
    animation: none !important;
  }
}
```

---

## 6. 컴포넌트 인벤토리

권장 경로: `src/components/`. 문서만 작성 — 구현은 후속.

### 6.1 `LetterCountdownBanner`

```ts
type LetterCountdownBannerProps = {
  /** 서버 기준 도착 예정 시각 (ISO) */
  sentAt: string;
  /** 서버가 계산한 초기 잔여 초 (클라 드리프트 보정용) */
  remainingSeconds: number;
  /** 추가 pending 건수 (배너 대상 제외) */
  extraPendingCount?: number;
  /** 설정 또는 OS reduced-motion */
  reducedMotion?: boolean;
  /** remainingSeconds가 0이 되어 페이드아웃 완료 시 */
  onComplete: () => void;
};
```

| 내부 상태 | 설명 |
|---|---|
| `displaySeconds` | 1초 틱 카운트다운 |
| `phase` | `'visible' \| 'exiting' \| 'gone'` |

### 6.2 `SealedLetterCard`

```ts
type LetterTone = 'angel' | 'devil';

type LetterCardVisualState = 'sealed' | 'arrived_unread' | 'read';

type SealedLetterCardProps = {
  id: string;
  tone: LetterTone;
  content: string;           // sealed일 때는 렌더하지 않음
  sentAt: string;
  isRead: boolean;
  /** 서버 now 대비 클라 판정; 부모가 넘겨도 됨 */
  remainingSeconds?: number;
  reducedMotion?: boolean;
  onOpen: (replyId: string) => Promise<void> | void;
};
```

| 파생 state | 규칙 |
|---|---|
| `sealed` | `Date.now() < sentAt` |
| `arrived_unread` | `Date.now() >= sentAt && !isRead` |
| `read` | `isRead` |
| `isOpening` | 개봉 모션 중 로컬 플래그 |

### 6.3 `NavUnreadBadge` (인라인 가능)

```ts
type NavUnreadBadgeProps = {
  count: number; // 0이면 null 렌더
};
```

### 6.4 `ArrivalToast` (기존 success 토스트 확장 또는 전용)

```ts
type ArrivalToastProps = {
  message?: string; // default: 확정 문구
  durationMs?: number; // default 4500
  onNavigateToLetterBox: () => void;
  onDismiss: () => void;
};
```

### 6.5 페이지 오케스트레이션 (`page.tsx` 책임)

| 상태 | 타입 | 용도 |
|---|---|---|
| `pendingReplies` | `PendingReply[]` | 배너·폴링 트리거 |
| `unreadCount` | `number` | 네비 뱃지 |
| `arrivalToastVisible` | `boolean` | 토스트 1회 |
| `notifiedReplyIds` | `Set<string>` | 중복 토스트 방지 |

---

## 7. 접근성

### 7.1 명도 대비 (WCAG AA)

| 조합 | 전경 | 배경 | 목표 |
|---|---|---|---|
| 타이머 | amber-300 `#fcd34d` | `#09090e` | ≥ 4.5:1 (본문), 실제 ~8:1 |
| 배너 라벨 | zinc-400 `#a1a1aa` | `#09090e` | ≥ 4.5:1 |
| 토스트 본문 | zinc-200 `#e4e4e7` | zinc-900/40 + blur | ≥ 4.5:1 |
| 뱃지 숫자 | zinc-950 on amber-500 | — | ≥ 4.5:1 |
| 봉인 본문 플레이스홀더 | 장식만 — 의미 텍스트 아님 | — | N/A |

### 7.2 터치 타겟

| 요소 | 최소 |
|---|---|
| 미읽음 봉투 카드 | 카드 전체 ≥ 44px 높이 (실제 ~120px+) |
| 네비 서신 버튼 | 기존 아이콘+라벨 영역 유지, 히트 영역 ≥ 44×44 (패딩으로 확보) |
| 도착 토스트 | `py-3` + 전체 탭 → 높이 ≥ 44px |

### 7.3 ARIA

| 요소 | 속성 |
|---|---|
| 카운트다운 배너 | `role="timer"`, `aria-live="polite"`, `aria-atomic="true"` — **30초 단위** 또는 분 변경 시에만 live 갱신 권장(초마다 낭독 스팸 방지). 시각적 MM:SS는 매초 갱신 |
| 봉인 카드 | `aria-label="봉인된 편지, 도착까지 MM분 SS초, {톤}"` |
| 미읽음 카드 | `role="button"`, `aria-label="도착한 편지 개봉하기, {톤}"` |
| 읽음 카드 | 일반 article/`aria-label` 불필요 |
| 네비 서신 | `aria-label`에 미읽음 수 포함 (§3.3) |
| 토스트 | `role="status"`, `aria-live="polite"` |

### 7.4 Reduced-motion 처리 지점

| 지점 | 동작 |
|---|---|
| 배너 등장/페이드 | 즉시 표시/제거 |
| 봉투 개봉 | 즉시 State C |
| 아이콘 `animate-pulse` (시계·점) | 애니메이션 off |
| `border-shimmering` | off |
| 토스트 등장 | opacity만 또는 즉시 (기존 motion duration 0) |
| 네비 뱃지 exit | 즉시 unmount |

감지: `window.matchMedia('(prefers-reduced-motion: reduce)')` **OR** 설정 `reducedMotion` 토글 (둘 중 하나라도 true면 축소).

---

## 8. 구현 체크리스트 (디자인 수용)

- [ ] 360px에서 배너·봉투 카드 가로 오버플로 없음
- [ ] MM:SS `tabular-nums`로 폭 흔들림 없음
- [ ] 천사/악마 글로우가 기존 cyan/rose 언어와 일치
- [ ] 개봉 모션 0.6~1.0s, reduced-motion 시 0s
- [ ] 뱃지 1=dot / 2–9=숫자 / 10+=`9+`
- [ ] 토스트 문구·4.5s·탭 시 LETTER_BOX
- [ ] 빈 상태 카피에서 “새로고침” 문구 제거
- [ ] `@theme` 토큰·`neon-glow-rose`·reduced-motion 미디어쿼리 반영

---

## 9. 범위 밖 (디자인 미포함)

- Web Push / PWA 알림 UI
- 도착 사운드
- 일일 답장 제한·상점 UI
- 봉투 3D 물리 시뮬레이션 (2D flap + blur로 충분)
