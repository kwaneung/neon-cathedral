# TICKET-002 — 디자인 명세: 전면 비주얼 개편 "자정의 전례 (Midnight Liturgy)"

| 항목 | 내용 |
|---|---|
| 티켓 ID | TICKET-002 |
| 문서 유형 | 전면 비주얼/모션 리디자인 명세 |
| 기준 기획 | `docs/tickets/TICKET-002.md` |
| 작성일 | 2026-07-11 |
| 상태 | 디자인 완료, 구현 대기 |
| 절대 제약 | 기능·Server Actions·데이터 바인딩·props 시그니처 **무변경**. 순수 비주얼/모션만 교체 |

---

## 0. 디자인 원칙

1. **단일 광원 원칙** — 이 공간의 빛은 촛불(flame)뿐이다. flame 앰버가 유일한 1차 강조색이며, 네온 컬러(angel cyan / devil rose / votive violet)는 "의미가 있는 곳"(톤, 편지, 벽화)에만 허용한다. 현재 구현처럼 cyan·rose·purple 글로우를 배경에 동시 살포하지 않는다.
2. **어둠은 검정이 아니다** — 배경은 순수 블랙(#020203)이 아니라 밤공기의 보라-남색 잉크(`#0A0812`). 표면 위계는 밝기가 아니라 "보랏빛 온도"로 구분한다.
3. **아치 셰이프 랭귀지** — 성당의 랜싯 아치(lancet arch)를 반복 모티프로 쓴다. 히어로 이미지·벽화 조각·활성 인디케이터가 모두 위가 둥근 아치를 공유한다. 일반 카드는 24px 라운드로 통일한다.
4. **글은 양피지, UI는 석재** — 사용자가 쓴 글/편지 본문은 세리프(Gowun Batang) + 따뜻한 오프화이트, UI 라벨·메타는 산세리프(Noto Sans KR) + 차가운 라벤더 그레이. 이 대비가 "사람의 목소리 vs 공간"을 가른다.
5. **모션은 전례(리추얼)다** — 등장은 아래서 위로 떠오르고(연기), 소멸은 위로 흩어진다(재). 장식용 무한 애니메이션은 촛불 플리커 1종만 남기고 전부 제거한다(`border-shimmering` 폐기).
6. **최소 가독 크기 12px** — 현재 남발된 9–10px 텍스트를 전면 격상한다. 읽는 텍스트 최소 12px, 장식적 오버라인만 11px 허용.

### 아트 디렉션 서술

컨셉명 **"자정의 전례 (Midnight Liturgy)"**. 자정의 성당 안, 유일한 광원은 제단의 촛불이다. 화면 상단에서 희미한 빛기둥(god ray)이 비스듬히 내려오고, 바닥에는 촛불의 앰버 잔광이 고인다. 표면은 매끈한 유리(글래스모피즘)가 아니라 **결이 살아 있는 석재와 양피지** — 미세한 그레인 텍스처를 전 화면에 3.5% 불투명도로 깐다. 레퍼런스 방향: 다크 에클레시아스틱(교회 건축의 수직성·아치) × 네온 느와르(어둠 속 한 점의 채도 높은 빛) × 에디토리얼 세리프(일루미네이티드 매뉴스크립트의 금박 넘버링). 드리블 샷 기준 한 장면 요약: "짙은 남보라 어둠, 아치형 창으로 스미는 빛, 촛불 하나가 만든 앰버 서클 안의 세리프 타이포."

---

## 1. 디자인 토큰 — `src/app/globals.css` 전면 교체

아래 코드 블록이 새 `globals.css`의 **전체 내용**이다(그대로 교체).

```css
@import "tailwindcss";

/* ─────────────────────────────────────────────
   폰트 매핑 (layout.tsx의 next/font 변수와 연결)
   주의: 현재 @theme가 존재하지 않는 --font-sans/--font-serif를
   참조하고 있어 로드된 폰트가 전부 죽어 있다. 반드시 아래처럼
   --font-gowun/--font-cormorant/--font-noto 로 연결할 것.
   ───────────────────────────────────────────── */
@theme inline {
  --font-sans: var(--font-noto), "Noto Sans KR", sans-serif;
  --font-serif: var(--font-gowun), "Gowun Batang", serif;
  --font-display: var(--font-cormorant), "Cormorant Garamond", serif;
}

@theme {
  /* ── 컬러: 공간 (어두운 곳일수록 보라가 짙다) ── */
  --color-nave: #0a0812;          /* 페이지 배경 (본당의 어둠) */
  --color-crypt: #06050c;         /* 최심부: 모달 딤, 이미지 오버레이 */
  --color-surface: #141021;       /* 카드 기본 */
  --color-surface-raised: #1c1730;/* 카드 위 요소, 호버 표면 */
  --color-line: rgb(244 239 230 / 0.08);        /* 기본 헤어라인 */
  --color-line-strong: rgb(244 239 230 / 0.16); /* 강조 보더 */

  /* ── 컬러: 텍스트 (촛불에 비친 양피지 톤) ── */
  --color-text-hi: #f4efe6;       /* 제목, 강조 — nave 대비 17.4:1 */
  --color-text-body: #cdc6dc;     /* 본문 — nave 대비 12.0:1 */
  --color-text-mute: #948ca9;     /* 메타, 캡션 — surface 대비 5.9:1 */
  --color-text-faint: #6e6785;    /* 장식 전용(플레이스홀더·비활성). 읽는 텍스트 금지 */

  /* ── 컬러: 불꽃 (1차 강조) ── */
  --color-flame: #ffc46b;         /* 기본 앰버 — surface 대비 11.9:1 */
  --color-flame-hi: #ffdca8;      /* 하이라이트, 타이머 숫자 */
  --color-flame-deep: #ff9e45;    /* 그라디언트 중간 */
  --color-flame-ember: #e0533a;   /* 그라디언트 끝, 잉걸불 */
  --color-on-flame: #241304;      /* flame 배경 위 텍스트 — 11.4:1 */

  /* ── 컬러: 의미 액센트 ── */
  --color-angel: #86e7f8;         /* 천사 톤 — surface 대비 13.2:1 */
  --color-devil: #ff8fa3;         /* 악마 톤 — surface 대비 8.6:1 */
  --color-votive: #b9a5ff;        /* 봉헌 바이올렛(보조 네온) — 8.8:1 */
  --color-danger: #ff8fa3;        /* 에러 토스트 (devil과 공유) */

  /* ── 컬러: 스테인드글라스 보석톤 (벽화 전용) ── */
  --color-glass-ruby: #e5484d;
  --color-glass-sapphire: #4c6fe8;
  --color-glass-emerald: #2fb67c;
  --color-glass-topaz: #e8b33c;
  --color-glass-amethyst: #9a5cd0;
  --color-leadline: #050409;      /* 유리 조각 사이 납선 */

  /* ── 타이포 스케일 ── */
  --text-display: 2.5rem;         /* 40px 입구 타이틀 */
  --text-display--line-height: 1.15;
  --text-display--letter-spacing: 0.02em;
  --text-title: 1.75rem;          /* 28px 뷰 타이틀 */
  --text-title--line-height: 1.25;
  --text-heading: 1.25rem;        /* 20px 카드/모달 제목 */
  --text-heading--line-height: 1.4;
  --text-body: 0.9375rem;         /* 15px 고해·편지 본문 (serif) */
  --text-body--line-height: 1.8;
  --text-label: 0.8125rem;        /* 13px UI 라벨, 버튼 */
  --text-label--line-height: 1.5;
  --text-caption: 0.75rem;        /* 12px 메타, 캡션 — 읽는 텍스트 최소 크기 */
  --text-caption--line-height: 1.5;
  --text-overline: 0.6875rem;     /* 11px 장식 오버라인 전용 */
  --text-overline--line-height: 1.4;
  --text-overline--letter-spacing: 0.18em;

  /* ── 라운딩 ── */
  --radius-sm: 10px;              /* 칩, 인풋 내부 요소 */
  --radius-md: 16px;              /* 버튼, 배너 */
  --radius-lg: 24px;              /* 카드, 모달 */
  --radius-arch: 999px 999px 20px 20px;   /* 랜싯 아치 (벽화 조각, 인디케이터) */
  --radius-arch-hero: 160px 160px 24px 24px; /* 입구 히어로 이미지 */

  /* ── 그림자 / 글로우 ── */
  --shadow-card: 0 8px 32px rgb(4 3 9 / 0.5);
  --shadow-float: 0 24px 48px rgb(4 3 9 / 0.7), inset 0 1px 0 rgb(244 239 230 / 0.06);
  --shadow-glow-flame: 0 0 24px rgb(255 196 107 / 0.22);
  --shadow-glow-flame-strong: 0 0 40px rgb(255 158 69 / 0.35);
  --shadow-glow-angel: 0 0 28px rgb(134 231 248 / 0.20);
  --shadow-glow-devil: 0 0 28px rgb(255 143 163 / 0.20);
  --shadow-glow-votive: 0 0 28px rgb(185 165 255 / 0.18);
  --shadow-glass-inner: inset 0 0 24px rgb(244 239 230 / 0.10);

  /* ── 모션 타이밍 ── */
  --ease-out-soft: cubic-bezier(0.22, 1, 0.36, 1);   /* 등장 */
  --ease-in-soft: cubic-bezier(0.55, 0, 0.78, 0.4);  /* 퇴장 */
  --ease-liturgy: cubic-bezier(0.65, 0, 0.35, 1);    /* 상태 전환 */

  /* duration 관례: fast 150ms / base 240ms / slow 400ms / liturgy 700ms */

  /* ── 등록 애니메이션 ── */
  --animate-candle-flicker: candle-flicker 3.4s ease-in-out infinite;
  --animate-ray-drift: ray-drift 14s ease-in-out infinite alternate;
  --animate-halo-breathe: halo-breathe 4.2s ease-in-out infinite;
  --animate-view-enter: view-enter 400ms var(--ease-out-soft) both;
  --animate-letter-seal-open: letter-seal-open 800ms var(--ease-out-soft) both;
  --animate-banner-enter: banner-enter 280ms var(--ease-out-soft) both;
  --animate-banner-exit: banner-exit 400ms var(--ease-in-soft) both;

  @keyframes candle-flicker {
    0%, 100% { opacity: 1; transform: scale(1); }
    18%      { opacity: 0.86; transform: scale(0.985); }
    41%      { opacity: 0.96; transform: scale(1.01); }
    67%      { opacity: 0.9;  transform: scale(0.995); }
  }
  @keyframes ray-drift {
    from { opacity: 0.5; transform: translateX(-2%) skewX(-8deg); }
    to   { opacity: 0.85; transform: translateX(2%) skewX(-6deg); }
  }
  @keyframes halo-breathe {
    0%, 100% { opacity: 0.55; }
    50%      { opacity: 1; }
  }
  @keyframes view-enter {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
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
}

/* ───────────── 베이스 ───────────── */
body {
  background: var(--color-nave);
  color: var(--color-text-body);
  font-family: var(--font-sans);
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
}

::selection {
  background: rgb(255 196 107 / 0.25);
  color: var(--color-text-hi);
}

/* 그레인 텍스처 — 최상위 오버레이. page.tsx 루트에 <div class="texture-grain" /> 1개 */
.texture-grain {
  position: fixed;
  inset: 0;
  z-index: 60;
  pointer-events: none;
  opacity: 0.035;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}

/* 빛기둥 — 배경 레이어. 상단 중앙에서 비스듬히 */
.god-ray {
  position: fixed;
  top: -12%;
  left: 18%;
  width: 44vw;
  max-width: 560px;
  height: 76vh;
  pointer-events: none;
  transform: skewX(-8deg);
  background: linear-gradient(
    to bottom,
    rgb(185 165 255 / 0.10) 0%,
    rgb(255 196 107 / 0.05) 45%,
    transparent 100%
  );
  filter: blur(48px);
  animation: var(--animate-ray-drift);
}

/* 촛불 잔광 — 하단 앰버 풀 */
.candle-pool {
  position: fixed;
  bottom: -18%;
  left: 50%;
  transform: translateX(-50%);
  width: 90vw;
  max-width: 900px;
  height: 46vh;
  pointer-events: none;
  border-radius: 9999px;
  background: radial-gradient(
    ellipse at center,
    rgb(255 158 69 / 0.10) 0%,
    rgb(224 83 58 / 0.04) 45%,
    transparent 72%
  );
  filter: blur(56px);
  animation: var(--animate-halo-breathe);
}

/* 스크롤바 */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: rgb(148 140 169 / 0.28);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: rgb(148 140 169 / 0.45); }

/* 타이머 숫자 */
.letter-timer {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.12em;
}

/* 스테인드글라스 랜싯 조각 — 납선 이중 보더 */
.glass-lancet {
  border-radius: var(--radius-arch);
  border: 2px solid var(--color-leadline);
  box-shadow:
    inset 0 0 0 1px rgb(244 239 230 / 0.14),
    var(--shadow-glass-inner);
  overflow: hidden;
}

/* 유틸 애니메이션 클래스 */
.animate-candle-flicker { animation: var(--animate-candle-flicker); }
.animate-view-enter { animation: var(--animate-view-enter); }
.animate-letter-seal-open { animation: var(--animate-letter-seal-open); }
.animate-banner-enter { animation: var(--animate-banner-enter); }
.animate-banner-exit { animation: var(--animate-banner-exit); }

@media (prefers-reduced-motion: reduce) {
  .god-ray,
  .candle-pool,
  .animate-candle-flicker,
  .animate-view-enter,
  .animate-letter-seal-open,
  .animate-banner-enter,
  .animate-banner-exit {
    animation: none !important;
  }
}
```

### 폐기 목록 (기존 globals.css에서 제거)

| 폐기 대상 | 대체 |
|---|---|
| `--background/--foreground`, `--color-letter-*` 시맨틱 토큰 | 위 토큰 체계로 흡수 (`flame`, `angel`, `devil` 등) |
| `.border-shimmering` (보더 무한 깜빡임) | 미개봉 편지의 정적 글로우 보더 + `animate-candle-flicker`(아이콘만) |
| `.animate-float`, `.animate-glow` | `.god-ray` / `.candle-pool` / flicker |
| `.glass-clip-1~6` (랜덤 폴리곤) | `.glass-lancet` (아치 창) |
| `.neon-glow-cyan/magenta/amber/rose` | `shadow-glow-angel/devil/flame/votive` 토큰 유틸 |

---

## 2. 공통 셸

### 2.1 배경 레이어 (page.tsx 루트)

기존의 fixed 글로우 3개(`animate-glow` cyan/rose/purple)를 전부 제거하고 아래 3개로 교체:

```
<div class="god-ray" aria-hidden />          ← 좌상단 빛기둥 1개
<div class="candle-pool" aria-hidden />      ← 하단 앰버 잔광 1개
<div class="texture-grain" aria-hidden />    ← 최상위 그레인 (z-60, 토스트 아래)
```

루트 컨테이너: `bg-nave text-text-body font-sans` (기존 `bg-[#020203] text-zinc-300` 대체). `pb-32` 유지.

### 2.2 헤더 (ENTRANCE 외 전 뷰)

```
┌──────────────────────────────────────────────┐ h-14, sticky top-0 z-30
│ (🕯 아치로고) NEON CATHEDRAL    [🕯익명뱃지] [♪──] │
└──────────────────────────────────────────────┘
```

| 요소 | 스펙 |
|---|---|
| 컨테이너 | `sticky top-0 z-30 h-14 px-5 flex items-center justify-between bg-nave/80 backdrop-blur-xl border-b border-line` |
| 로고 마크 | 28×28 아치: `w-7 h-9 rounded-[999px_999px_6px_6px] bg-gradient-to-b from-flame/25 to-transparent border border-flame/30 flex items-end justify-center pb-1`, 내부 `Flame h-3.5 w-3.5 text-flame fill-flame/30 animate-candle-flicker` |
| 워드마크 | `font-display text-[15px] tracking-[0.28em] text-text-hi uppercase` — "Neon Cathedral" (Cormorant 스몰캡 느낌). 클릭 시 `setView('CATHEDRAL')` 유지 |
| 익명 뱃지 | `hidden md:inline-flex text-caption text-text-mute bg-surface border border-line px-3 py-1.5 rounded-full` |
| BGM 컨트롤 | 캡슐 `flex items-center gap-2 h-11 px-3 rounded-full bg-surface/60 border border-line`. 토글 버튼은 **44×44 히트 영역**(`w-11 h-11 -m-1 flex items-center justify-center`), 재생 중 아이콘 `text-flame animate-candle-flicker`(pulse 대체), 정지 시 `text-text-mute`. 슬라이더 `w-14 accent-[#ffc46b]` |

### 2.3 하단 네비게이션 (플로팅 독)

```
┌────────────────────────────────────────────┐  fixed bottom-6, max-w-sm
│  ✒️     🧭     ▦      ✉️(2)    ⚙️           │  각 아이템 min 44×48
│  제단    회랑    벽화    서신     비축          │
│  ▲(아치 인디케이터가 활성 탭 위에 뜸)             │
└────────────────────────────────────────────┘
```

| 요소 | 스펙 |
|---|---|
| 컨테이너 | `fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm h-[68px] px-3 rounded-[24px] bg-surface/85 backdrop-blur-2xl border border-line shadow-float flex justify-around items-center` |
| 탭 버튼 | `relative flex flex-col items-center justify-center gap-1 min-w-11 min-h-12 px-2 rounded-md` — **44×44 이상 보장** (현재 미달, 필수 수정) |
| 아이콘 | `h-5 w-5` (기존 4.5에서 격상) |
| 라벨 | `text-overline font-medium` (11px). 비활성 `text-text-mute`, 활성 `text-flame` |
| 활성 인디케이터 | 기존 점 대신 **아치 후광**: `motion.div layoutId="nav-active"` 유지하되 `absolute -top-1.5 w-8 h-1 rounded-full bg-flame shadow-glow-flame`. layoutId 트랜지션은 motion 기본 스프링 유지 |
| 미읽음 뱃지 | 1건: `absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full bg-flame ring-2 ring-surface` / 2건+: `min-w-[16px] h-4 px-1 rounded-full bg-flame text-on-flame text-[10px] font-bold` (숫자 뱃지는 장식 아님·`aria-label`에 이미 반영되어 있으므로 10px 허용). `aria-label` 로직 유지 |

### 2.4 토스트 (에러 / 성공 / 편지 도착)

공통: `fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] min-h-11 px-5 py-3 rounded-md backdrop-blur-xl shadow-float text-caption`

| 종류 | 배경/보더 | 아이콘 | 텍스트 |
|---|---|---|---|
| 에러 | `bg-surface/90 border border-devil/30` + `shadow-glow-devil` | `AlertCircle h-4 w-4 text-devil` | `text-text-hi` |
| 성공 | `bg-surface/90 border border-flame/30` + `shadow-glow-flame` | `Sparkles h-4 w-4 text-flame` | `text-text-hi` |
| 편지 도착 | 성공과 동일 + `cursor-pointer`, 아이콘 `Mail text-flame` | 클릭 시 LETTER_BOX 이동·`role="status" aria-live="polite"` 유지 |

모션: 등장 `opacity 0→1, y -12→0, 240ms ease-out-soft` / 퇴장 `opacity→0, y→-8, 150ms ease-in-soft`. reduced-motion 시 즉시 표시/제거 (기존 `motionReduced ? false : {...}` 패턴 유지, 에러 토스트에도 동일 적용).

---

## 3. 화면별 상세 명세

### 3.1 입장 — ENTRANCE

목표: "성당 문 앞에 선 순간". 세로 리듬 = 아치 창 → 타이틀 → 규율 → 촛불 점화 CTA.

```
360px 레이아웃 (위→아래, max-w-lg 중앙)
┌────────────────────────┐
│   ╭──────────────╮     │  히어로 이미지: aspect 4/5,
│   │  (아치 이미지)  │     │  radius: var(--radius-arch-hero)
│   │              │     │  = 160px 160px 24px 24px
│   ╰──────────────╯     │
│   NEON CATHEDRAL       │  display 40px, font-display
│   네온 성당              │  title 28px, font-serif
│   소멸의 고해소 · 촛불의 회랑│  overline 11px
│   ┌──────────────┐     │
│   │ Ⅰ. …          │     │  규율 카드
│   │ Ⅱ. …          │     │
│   │ Ⅲ. …          │     │
│   └──────────────┘     │
│   [ 성당 안으로 들어가기 ]  │  CTA h-14 pill
└────────────────────────┘
```

| 요소 | 스펙 |
|---|---|
| 히어로 프레임 | `relative w-full aspect-[4/5] overflow-hidden border border-line-strong shadow-card`, `style={{ borderRadius: 'var(--radius-arch-hero)' }}`. 이미지 `object-cover brightness-[0.8] saturate-[0.9]` |
| 이미지 오버레이 | `bg-gradient-to-t from-crypt via-transparent to-crypt/30` (기존 유지, 색만 crypt) |
| 이미지 하단 촛불 칩 | `absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 h-9 px-4 rounded-full bg-crypt/70 backdrop-blur-md border border-flame/25`, `Flame h-4 w-4 text-flame animate-candle-flicker` + `text-overline text-flame-hi` — 카피를 "촛불이 켜져 있습니다"로 교체(영문 "Aura Light ON" 폐기) |
| 메인 타이틀 | `font-display text-display text-transparent bg-clip-text bg-gradient-to-b from-[#fdf9f0] via-[#f4efe6] to-[#a89f8d]` — "NEON CATHEDRAL" |
| 서브 타이틀 | `font-serif text-heading text-text-body` — "네온 성당" (신규 추가: 한글 정체성 명시) |
| 오버라인 | `text-overline text-text-mute uppercase` — "소멸의 고해소 · 촛불의 회랑" (따옴표 제거) |
| 규율 카드 | `w-full text-left space-y-4 bg-surface/70 border border-line rounded-lg p-6 backdrop-blur-xl shadow-card`. 각 항목: 로마 숫자 `font-display text-heading text-flame w-7 shrink-0` + 본문 `text-caption text-text-body leading-relaxed` (기존 3개 조항 카피 유지) |
| CTA | `w-full h-14 rounded-full bg-gradient-to-r from-flame via-flame-deep to-flame-ember text-on-flame font-sans font-bold text-label tracking-[0.2em]` + `shadow-glow-flame-strong`. hover: `-translate-y-0.5` + glow 유지, active: `translate-y-0 scale-[0.99]`. 카피 유지 |

**입장 시퀀스 모션** (전체 1.2s 내 완결, reduced-motion 시 전부 즉시 표시):

| 순서 | 대상 | 모션 | 타이밍 |
|---|---|---|---|
| 1 | 히어로 | `opacity 0→1, scale 1.04→1` | 0ms 시작, 900ms, ease-out-soft |
| 2 | 타이틀+서브 | `opacity 0→1, y 16→0` | 200ms 지연, 500ms |
| 3 | 규율 카드 | `opacity 0→1, y 16→0` | 350ms 지연, 500ms |
| 4 | CTA | `opacity 0→1, y 16→0` | 500ms 지연, 500ms |

### 3.2 고해실 — CONFESS

목표: "제단 앞에 무릎 꿇고 양피지에 쓴다". 위계: 제단 헤더 → 양피지(입력) → 봉헌 초 선택 → 점화 버튼.

#### 3.2.1 제단 헤더

- 중앙 정렬. `Flame h-6 w-6 text-flame fill-flame/25 animate-candle-flicker mx-auto mb-3`
- 타이틀 `font-serif text-title text-text-hi` — "참회의 제단"
- 오버라인 `text-overline text-text-mute uppercase mt-1` — "Confession Altar"
- 기존 `animate-float`(둥둥 떠다님) 제거 — 제단은 흔들리지 않는다.

#### 3.2.2 양피지 입력 패널

| 요소 | 스펙 |
|---|---|
| 컨테이너 | `rounded-lg border border-line bg-surface/80 backdrop-blur-xl p-6 shadow-card transition-[border-color,box-shadow] duration-[400ms]`. focus-within: `border-flame/40 shadow-glow-flame` |
| 상단 장식 | 기존 4모서리 금장 데코 제거. 대신 상단 중앙에 1개: `mx-auto mb-4 h-px w-16 bg-gradient-to-r from-transparent via-flame/50 to-transparent` |
| textarea | `w-full bg-transparent text-text-hi placeholder:text-text-faint font-serif text-body leading-[1.8] resize-none border-0 outline-none focus:ring-0`, rows 9, maxLength/disabled 로직 유지. 플레이스홀더 카피 유지 |
| 심지 게이지 | 하단 구분선 `border-t border-line pt-4 mt-5`. 게이지 트랙 `h-0.5 rounded-full bg-surface-raised overflow-visible relative`. 채움 바 `h-full rounded-full bg-gradient-to-r from-flame to-flame-deep transition-[width] duration-300`; 채움 바 오른쪽 끝에 불씨 점 `absolute -top-[3px] h-2 w-2 rounded-full bg-flame-hi shadow-glow-flame` (width % 위치, 0자일 땐 숨김). **90% 초과 시** 바/불씨를 `bg-devil`/`shadow-glow-devil`로 전환 |
| 카운터 행 | `flex justify-between text-caption text-text-mute mt-3`. 좌: `Lock h-3.5 w-3.5` + "기밀 보장 — 흔적 없이 소멸" (영문 괄호 폐기). 우: `{n} / 2,000자` (`tabular-nums`) |

#### 3.2.3 톤 선택 — 봉헌 초 카드

**360px에서는 세로 스택(행 레이아웃), `sm:` 이상 2컬럼 그리드.** 현재 2컬럼 강제 + 10px 텍스트는 가독 불가로 폐기.

```
┌──────────────────────────────────┐  min-h-[72px]
│ (초)  천사의 위로                    │  좌: 44px 봉헌 초 아이콘 원
│  🕯   진심이 담긴 포근한 위로와 …      │  우: 제목 13px + 설명 12px
└──────────────────────────────────┘
```

| 상태 | 스펙 |
|---|---|
| 공통 | `relative flex items-center gap-4 w-full min-h-[72px] p-4 rounded-md border text-left transition-all duration-[240ms]`. 그룹 컨테이너에 `role="radiogroup" aria-label="서신 톤 선택"`, 각 버튼 `role="radio" aria-checked` **신규 추가** |
| 아이콘 원 | `h-11 w-11 shrink-0 rounded-full border flex items-center justify-center`. 천사: `Sparkles h-5 w-5` / 악마: `Flame h-5 w-5` |
| 비선택 | 보더 `border-line bg-surface/50`, 아이콘 원 `border-line text-text-mute`, 제목 `text-label font-bold text-text-body`, 설명 `text-caption text-text-mute` |
| 천사 선택 | `border-angel/40 bg-[#86e7f8]/[0.06] shadow-glow-angel`, 아이콘 원 `border-angel/50 text-angel bg-angel/10`, 제목 `text-angel` |
| 악마 선택 | `border-devil/40 bg-[#ff8fa3]/[0.06] shadow-glow-devil`, 아이콘 원 `border-devil/50 text-devil bg-devil/10`, 제목 `text-devil` |
| 선택 모션 | 카드 `scale 1→1.01, 240ms ease-out-soft` + 아이콘 원에 `animate-candle-flicker` (선택된 쪽만). scale-[1.02] 상시 유지 폐기 |

섹션 라벨: `text-overline text-text-mute uppercase` — "서신 톤 선택" (영문 병기 제거).

#### 3.2.4 태우기 버튼

- `w-full h-14 rounded-full font-sans font-bold text-label tracking-[0.2em] transition-all duration-[240ms]`
- 활성: ENTRANCE CTA와 동일한 flame 그라디언트 + `text-on-flame` + `shadow-glow-flame-strong` (현재 "흰 버튼→호버 시 앰버"의 어정쩡함 폐기 — 태우기는 언제나 불이다)
- disabled: `bg-surface-raised text-text-faint shadow-none` (opacity 트릭 대신 명시적 색)
- 로딩 중 카피 "재로 산화시키는 중..." 유지, 좌측에 `h-4 w-4 border-2 border-on-flame border-t-transparent rounded-full animate-spin` 스피너 추가
- press: `scale-[0.99]`

#### 3.2.5 BurnEffect 파티클 팔레트 (components/BurnEffect.tsx)

로직·수명·onComplete 계약 무변경, 색만 교체:

| 기존 | 신규 |
|---|---|
| `#ff3b30 / #ff9500 / #ffcc00 / #ff2d55 / #8e8e93` | `#ffdca8 / #ffc46b / #ff9e45 / #e0533a / #56506b`(재) |
| 잔상 `rgba(10,10,10,0.15)` | `rgba(10, 8, 18, 0.15)` (nave 톤) |
| 승화색 `#ff9500`, 재색 `#3a3a3c` | 승화색 `#ff9e45`, 재색 `#3d3852` |
| 텍스트 폰트 `20px Outfit` | `20px "Gowun Batang", serif` |

**reduced-motion 대응(신규)**: `motionReduced`가 true면 `page.tsx`에서 BurnEffect를 마운트하지 않고, 대신 `setTimeout(handleBurnComplete, 400)` + 전체 화면 `bg-crypt/80` 페이드 오버레이(400ms)로 대체한다. props 시그니처는 유지하고 호출부에서 분기한다.

### 3.3 본당 — CATHEDRAL

목표: "회랑에 늘어선 양피지 패널들". 카드 한 장 = 고해 한 건, 톤 레일이 왼쪽에서 은은히 빛난다.

#### 3.3.1 뷰 헤더 (본당·벽화·편지함 공통 패턴)

- 행: `flex items-end justify-between border-b border-line pb-5`
- 타이틀 `font-serif text-title text-text-hi` / 오버라인 `text-overline text-text-mute uppercase mt-1`
- 새로고침 버튼: **`h-11 w-11`** (44px, 현재 미달 수정) `rounded-md border border-line bg-surface/60 text-text-mute hover:text-text-hi hover:border-line-strong flex items-center justify-center`, `RefreshCw h-4 w-4`, 로딩 시 `animate-spin` 유지

#### 3.3.2 카운트다운 배너 (LetterCountdownBanner)

TICKET-001 구조·ARIA·로직 유지, 스킨만 교체:

| 요소 | 기존 → 신규 |
|---|---|
| 컨테이너 | `bg-[#09090e]/70 border-amber-500/20` → `bg-surface/80 border-flame/25 rounded-md shadow-glow-flame backdrop-blur-xl` (min-h-12, px-4 py-3 유지) |
| 아이콘 | `Hourglass text-amber-500 animate-pulse` → `Hourglass h-4 w-4 text-flame animate-candle-flicker` (reduced-motion 시 정적 유지) |
| 라벨 | `text-caption text-text-mute` — "답장 도착까지" / "외 N건" `text-caption text-text-faint` → **12px로 격상, text-text-mute** |
| 타이머 | `letter-timer font-mono text-lg text-flame-hi` |

#### 3.3.3 고해 카드

```
┌─────────────────────────────────┐ rounded-lg, p-6
│▎● 침묵의 순례자 7  [나]   ⏳ 21시간… │ ▎= 톤 레일(좌측 2px)
│                                 │
│  (본문: serif 15px/1.8,          │
│   text-text-hi, break-keep)     │
│                                 │
│ ─────────────────────────────── │
│ ⓘ 5촛불 획득 시 벽화에 …    (🕯 3)  │ 우하단 CandleButton
└─────────────────────────────────┘
```

| 요소 | 스펙 |
|---|---|
| 컨테이너 | `relative rounded-lg border border-line bg-surface/70 backdrop-blur-xl p-6 shadow-card transition-all duration-[240ms] hover:border-line-strong hover:bg-surface`. `border-shimmering` 제거 |
| 톤 레일 | `absolute left-0 top-6 bottom-6 w-0.5 rounded-full` — 천사 `bg-angel/50`, 악마 `bg-devil/50` (신규) |
| 헤더 행 | `flex justify-between items-center text-caption text-text-mute border-b border-line pb-3.5`. 톤 점: `h-2 w-2 rounded-full` + `shadow-glow-angel/devil`(blur 트릭 대신 글로우), **animate-pulse 제거** |
| "나" 뱃지 | `text-[10px] font-bold text-on-flame bg-flame px-2 py-0.5 rounded-full` (배경 있는 뱃지로 명시성↑) |
| 남은 시간 | `flex items-center gap-1.5 tabular-nums`, `Clock h-3 w-3` — 카피 로직 유지 |
| 본문 | `font-serif text-body text-text-hi whitespace-pre-wrap break-keep leading-[1.8]` — **`break-all` → `break-keep`** (한국어 어절 단위 줄바꿈, 필수) |
| 푸터 행 | `flex justify-between items-end border-t border-line pt-4`. 안내: `text-caption text-text-mute` + `Info h-3.5 w-3.5 text-text-faint` |
| 등장 모션 | `opacity 0→1, y 12→0`, delay `min(idx, 5) * 60ms` (기존 idx*100 무제한 → 6장 이후 지연 없음), spring 유지 |

#### 3.3.4 CandleButton (components/CandleButton.tsx)

롱프레스 로직·게이지 수학 무변경. 스킨:

| 상태 | 스펙 |
|---|---|
| 기본 | `h-14 w-14 rounded-full border border-line bg-surface-raised/60 text-text-mute` hover: `border-line-strong text-text-body scale-[1.02]` |
| 누르는 중 | `border-flame bg-flame/10 text-flame-hi scale-[0.96]`. 코로나: radial `rgba(255,196,107,0.5) → rgba(224,83,58,0.12) 40% → transparent 70%` (rose 성분 제거) |
| 원형 게이지 | 트랙 `stroke-[#1c1730]`, 진행 `stroke-[#ffc46b]` + `drop-shadow(0 0 4px rgba(255,196,107,0.6))` (cx/cy/r 유지) |
| 점화 완료 | `border-flame/70 bg-gradient-to-br from-flame/20 to-flame-ember/10 text-flame shadow-glow-flame`. **`animate-bounce` 제거** → 점화 순간 1회: `scale 1→1.25→1` (500ms, ease-out-soft) 후 `animate-candle-flicker` 상시. 영구 아우라 radial은 `rgba(255,196,107,0.18)`로 유지하되 `animate-pulse` → `animate-candle-flicker` |
| 카운트 라벨 | `mt-2 text-caption font-medium tabular-nums` — **"N CANDLES" → "촛불 N"** (한국어 통일). 점화 시 `text-flame`, 이전 `text-text-mute` |

reduced-motion: 코로나·플리커·점화 스케일 생략, 게이지 진행 표시는 유지(정보성).

#### 3.3.5 빈 상태 / 로딩

- 로딩: 스피너 `h-6 w-6 border-2 border-flame border-t-transparent rounded-full animate-spin` + `text-caption text-text-mute` (animate-pulse 제거). 카피 유지
- 빈 상태: `py-20 text-center rounded-lg border border-dashed border-line bg-surface/40 px-8` — 점선 보더로 "비어 있음" 표현. 아이콘 `h-10 w-10 text-text-faint mx-auto`, 본문 `font-serif text-body text-text-body`, 보조 `text-caption text-text-mute`. 카피 유지 (벽화·편지함 빈 상태 동일 패턴)

### 3.4 스테인드글라스 벽 — STAINED_GLASS

목표: 랜덤 다각형 → **랜싯 아치 창들이 정렬된 회랑 벽**. 납선(leadline)이 조각을 감싸고, 보석톤 유리가 위에서 빛을 받는다.

#### 3.4.1 그리드

- `grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4`
- 각 조각: `aspect-[3/4]`, 클래스 `.glass-lancet` (radius-arch + 납선 이중 보더)
- 홀수 인덱스 조각에 `mt-6` (지그재그 리듬, `sm:` 이상에서만 — `sm:odd:mt-6`; 360px 2컬럼에서는 `odd:mt-4`)

#### 3.4.2 조각 컬러 — 보석톤 5종 (해시 로직 유지, 팔레트만 교체)

`getGlassLayout`의 `hash % 5` 선택 로직 유지. 각 항목은 그라디언트+텍스트 조합:

| 보석 | 배경 그라디언트 (to-b) | 텍스트 |
|---|---|---|
| Ruby | `from-[#e5484d]/70 via-[#8c2f4a]/55 to-crypt/95` | `#ffe4e6` |
| Sapphire | `from-[#4c6fe8]/70 via-[#33408f]/55 to-crypt/95` | `#e0e7ff` |
| Emerald | `from-[#2fb67c]/70 via-[#1d6e55]/55 to-crypt/95` | `#d9fbe9` |
| Topaz | `from-[#e8b33c]/70 via-[#8f6524]/55 to-crypt/95` | `#fdf3d7` |
| Amethyst | `from-[#9a5cd0]/70 via-[#5c3684]/55 to-crypt/95` | `#f0e5ff` |

공통 오버레이: 상단 radial 반사광 `bg-[radial-gradient(ellipse_at_top,rgb(244_239_230/0.22),transparent_60%)]` (아치 꼭대기로 들어오는 빛).

#### 3.4.3 조각 내부 레이아웃

```
╭──────────╮
│  (🕯 12)  │ ← 상단 중앙: 촛불 칩
│          │
│ "본문 4줄  │ ← serif 12px italic, line-clamp-4
│  클램프…"  │
│ 침묵의 …   │ ← 하단: 작성자 11px
╰──────────╯
```

| 요소 | 스펙 |
|---|---|
| 패딩 | `p-4 pt-6 flex flex-col justify-between` (아치 상단 여유) |
| 촛불 칩 | 상단 중앙 `mx-auto flex items-center gap-1 h-6 px-2.5 rounded-full bg-crypt/60 border border-line text-caption tabular-nums` + `Flame h-3 w-3 text-flame fill-flame` — "STAINED" 라벨 폐기 |
| 본문 | `font-serif text-caption italic leading-relaxed line-clamp-4 break-keep` (인용부호 유지) |
| 작성자 | `text-overline opacity-70 text-center` |
| 인터랙션 | hover: `brightness-115 scale-[1.02] z-10` (400ms). tap: 라이트박스. cursor-pointer 유지 |
| 등장 | `opacity 0→1, scale 0.92→1`, delay `(index % 4) * 90ms`, 500ms ease-out-soft |

접근성(신규): 조각 div에 `role="button" tabIndex={0}` + `aria-label={'보존된 고해, 촛불 ${c.candles}개'}` + Enter/Space 키 핸들러 추가.

#### 3.4.4 라이트박스 모달

| 요소 | 스펙 |
|---|---|
| 딤 | `bg-crypt/90 backdrop-blur-xl` (클릭 닫기 유지) |
| 패널 | `w-full max-w-md rounded-lg border border-line-strong bg-gradient-to-b from-surface-raised to-surface p-6 shadow-float`, 상단에 해당 조각과 **같은 보석톤** 그라디언트 밴드 `h-1.5 -mx-6 -mt-6 mb-6 rounded-t-lg` (아치 창의 빛 띠) |
| 헤더 행 | 좌: `Sparkles h-4 w-4 text-flame` + `font-serif text-caption text-text-mute` "보존된 유리의 편린" / 우: 촛불 칩 `bg-flame/10 border border-flame/30 text-flame text-caption px-2.5 py-1 rounded-full tabular-nums` |
| 본문 | `font-serif text-[17px] leading-[1.9] text-text-hi italic break-keep` |
| 작성자 | `text-caption text-text-mute text-right` |
| 닫기 버튼 | `w-full h-12 rounded-md bg-surface-raised border border-line text-text-body text-label hover:border-line-strong hover:text-text-hi` — 카피 유지 |
| 모션 | 패널 `opacity 0→1, scale 0.96→1, y 12→0`, 240ms ease-out-soft. 퇴장 역재생 150ms |

### 3.5 편지함 — LETTER_BOX

목표: 밀랍 봉인이 찍힌 봉투 → 개봉 → 펼쳐진 양피지. 상태 구분은 "봉인 디스크"가 담당한다.

#### 3.5.1 안내 상자 ("5분, 번뇌가 정화되는 시간")

- `rounded-lg border border-line bg-surface/60 p-5 flex gap-4`
- 아이콘: `Clock h-5 w-5 text-flame shrink-0 mt-0.5` — **animate-pulse 제거**(정보 상자는 정적)
- 제목 `font-serif text-label font-bold text-text-hi`, 본문 `text-caption text-text-mute leading-relaxed`. 카피 유지

#### 3.5.2 SealedLetterCard — 3상태 (components/SealedLetterCard.tsx)

상태 판정(resolveState)·타이머·핸들러 무변경. 공통 골격: `rounded-lg border bg-surface/70 backdrop-blur-xl p-6`.

**밀랍 봉인 디스크(신규 시각 요소)** — sealed/arrived 상태 카드 중앙:

- `h-12 w-12 rounded-full flex items-center justify-center border-2`
- 천사: `bg-gradient-to-br from-angel/30 to-[#33408f]/40 border-angel/40 text-angel`
- 악마: `bg-gradient-to-br from-devil/30 to-[#8c2f4a]/40 border-devil/40 text-devil`
- 내부 아이콘: sealed `Lock h-5 w-5` / arrived `Mail h-5 w-5`

| 상태 | 스펙 |
|---|---|
| **봉인(sealed)** | 보더 톤 15%: `border-angel/15` 또는 `border-devil/15`, 전체 `opacity-90 pointer-events-none` 유지. 헤더: 톤 점+라벨(아래 표) / `Lock h-4 w-4` + "봉인됨". 중앙: 봉인 디스크 + 블러 라인 3개(`h-3 rounded bg-surface-raised blur-[2px]`, w-full/5/6·2/3) — 기존 구조 유지, 색만 교체. 하단 타이머: "도착까지" `text-caption text-text-mute` + `letter-timer font-mono text-sm text-flame-hi` |
| **도착·미개봉(arrived_unread)** | `border-angel/40 shadow-glow-angel` 또는 `border-devil/40 shadow-glow-devil`. **border-shimmering 폐기** → 봉인 디스크에만 `animate-candle-flicker`. 중앙: 디스크 + `text-caption tracking-[0.2em] text-flame` "터치하여 개봉" (11px→12px). 전체 버튼 시맨틱·aria-label 유지 |
| **읽음(read)** | `border-line bg-surface/50` (글로우 없음 — 다 탄 초). 헤더 우측 `MailOpen h-4 w-4 text-text-faint` + 전송 시각 `text-caption text-text-faint tabular-nums`. 본문 `font-serif text-body text-text-body leading-[1.8] break-keep` |

**톤 라벨 한국어화**: `"Angel's comfort"/"Devil's Whisper"` → **"천사의 위로" / "악마의 속삭임"** (`text-caption font-bold tracking-[0.08em]`, uppercase 제거). aria-label의 '천사/악마' 표기는 기존 유지.

**개봉 모션**: `animate-letter-seal-open`(800ms) 유지. 시각 연출 보강 — 개봉 시작 시 봉인 디스크가 `scale 1→0, rotate 0→-20deg` (400ms ease-in-soft)로 사라진 뒤 본문 등장. reduced-motion 시 기존처럼 즉시 read 상태 전환.

#### 3.5.3 리스트 배치

pending 먼저 → arrived 순서(기존 로직) 유지. 카드 간격 `space-y-5`.

### 3.6 설정 — SETTINGS

목표: 전례 준비실. 리스트형 설정 카드 1장 + 진짜 스위치 비주얼.

- 뷰 타이틀: "성당 비축고" 유지, 오버라인 "Atmosphere Configuration" → **"성소 설정"** (한국어 통일)
- 카드: `rounded-lg border border-line bg-surface/70 backdrop-blur-xl divide-y divide-line shadow-card overflow-hidden`

#### 3.6.1 행 공통

- 패딩 `p-6`, 제목 `text-label font-medium text-text-hi flex items-center gap-2.5` (serif → sans 전환: 설정은 UI 텍스트), 아이콘 `h-4 w-4 text-text-mute`
- 설명 `text-caption text-text-mute leading-relaxed mt-1`

#### 3.6.2 토글 — PLAYING/MUTED·REDUCED/ACTIVE 텍스트 버튼 폐기, 스위치로 교체

- 트랙: `relative w-[52px] h-8 rounded-full transition-colors duration-[240ms]` — OFF `bg-surface-raised border border-line` / ON `bg-flame/90`
- 노브: `absolute top-1 left-1 h-6 w-6 rounded-full bg-[#f4efe6] shadow-card transition-transform duration-[240ms] ease-out-soft` — ON 시 `translate-x-5`
- ON 트랙에 `shadow-glow-flame`
- 시맨틱: `<button role="switch" aria-checked={...} aria-label="로파이 앰비언스 루프">` — onClick 핸들러(toggleBGM/toggleReducedMotion) 무변경. 터치 타겟: 버튼에 `p-2 -m-2`로 44px 확보
- 상태 라벨(보조): 스위치 좌측에 `text-caption text-text-mute` — "재생 중"/"꺼짐", "간소화됨"/"전체 모션"

#### 3.6.3 볼륨 슬라이더

- 트랙 `h-1 rounded-full bg-surface-raised accent-[#ffc46b]`, 좌우 아이콘 `h-4 w-4 text-text-mute`. 로직 유지

#### 3.6.4 세션 뱃지 / 프라이버시

- 세션 카드: `bg-crypt/60 border border-line rounded-md p-4`. 식별자 `font-serif text-label text-text-hi` / TOKEN `text-[11px] font-mono text-text-mute break-all` (9px→11px 격상, mono 장식 허용)
- 프라이버시 조항: 제목 `text-caption font-bold text-text-body uppercase tracking-wide`, 본문 `text-caption text-text-mute leading-relaxed` (10px→12px 격상). 카피 유지

---

## 4. 모션 언어

### 4.1 원칙

1. **방향 문법**: 등장 = 아래→위 12px(연기가 피어오름), 퇴장 = 위로 6~8px + 페이드(재가 흩어짐). 좌우 이동 금지.
2. **한 화면 한 지휘**: 뷰 전환 시 stagger는 최대 6요소·60ms 간격까지. 그 이후 요소는 지연 0.
3. **무한 루프는 촛불뿐**: 상시 애니메이션은 `candle-flicker`(불꽃 아이콘)·`ray-drift`·`halo-breathe`(배경) 3종만. `animate-pulse`/`animate-bounce`/`border-shimmering` 전면 금지.
4. **spring은 레이아웃, tween은 오퍼시티**: 네비 인디케이터·카드 layout엔 motion spring, 페이드류엔 duration+easing.

### 4.2 Duration / Easing 표

| 용도 | duration | easing | 적용 |
|---|---|---|---|
| 마이크로 (hover, 색 변화) | 150ms | ease-out-soft | 버튼 hover, 링크 |
| 기본 전환 | 240ms | ease-out-soft | 토스트 등장, 톤 카드 선택, 스위치 |
| 뷰/카드 등장 | 400ms | ease-out-soft | view-enter, 카드 stagger, 배너 퇴장 |
| 전례급 (강조 연출) | 700~900ms | ease-liturgy | 입장 히어로, 편지 개봉(800ms) |
| 퇴장 공통 | 등장의 60% | ease-in-soft | 토스트/모달/배너 퇴장 |
| 연소 (canvas) | ~2s | 물리 시뮬 | BurnEffect (무변경) |

뷰 전환(view 스위칭): 새 뷰 컨테이너에 `initial={{opacity:0, y:12}} animate={{opacity:1, y:0}} transition={{duration:0.4, ease:[0.22,1,0.36,1]}}` 통일 (현재 뷰마다 제각각인 initial 값 정리).

### 4.3 reduced-motion 대체 표

`motionReduced`(설정 OR OS 감지) true일 때:

| 모션 | 대체 동작 |
|---|---|
| 뷰 전환·카드 stagger | 즉시 표시 (`initial=false`) |
| BurnEffect 파티클 | 미마운트 → 400ms 크립트 페이드 + `setTimeout(onComplete, 400)` |
| candle-flicker / ray-drift / halo-breathe | 정지 (CSS `prefers-reduced-motion` 블록 + 클래스 분기 병행) |
| CandleButton 코로나·점화 스케일 | 생략. 원형 게이지는 유지(진행 정보) |
| 편지 개봉 blur 시퀀스 | 즉시 read 전환 (기존 로직 유지) |
| 배너 enter/exit | 즉시 mount/unmount (기존 로직 유지) |
| 토스트 | 즉시 표시/제거 |
| hover scale류 | 색 변화만 유지 |

주의: CSS 미디어쿼리는 OS 설정만 감지한다. **앱 내 토글**(`reducedMotion` state)은 JSX 분기로 처리해야 하므로, 위 표의 클래스형 애니메이션(`animate-candle-flicker` 등)은 `motionReduced ? '' : 'animate-candle-flicker'` 패턴으로 바인딩한다.

---

## 5. 반응형 규칙 (360px 기준 → 확장)

| 브레이크포인트 | 규칙 |
|---|---|
| **기본 (360~639px)** | 단일 컬럼, `main`은 `max-w-xl mx-auto px-4`. 톤 카드 세로 스택. 벽화 2컬럼(gap-3). 네비 `w-[calc(100%-2rem)]`. display 40px→`text-[32px]`로 축소 없음(40px는 360px에서 검증된 값; NEON CATHEDRAL 2단어가 2줄로 감싸져도 허용) |
| **sm (≥640px)** | 톤 카드 `sm:grid-cols-2`. 벽화 `sm:grid-cols-3`, 지그재그 `sm:odd:mt-6`. 입구 히어로 `sm:aspect-[4/3]` |
| **md (≥768px)** | 헤더에 익명 뱃지 노출(기존). 토스트 max-w-md |
| **lg (≥1024px)** | `main` `lg:max-w-2xl`. 벽화 `lg:grid-cols-4`. 본문 서체 `lg:text-base`(16px). god-ray `width 32vw`로 자동(max-width 캡). 네비는 계속 하단 중앙 `max-w-sm` — 데스크톱에서도 모바일 독 메타포 유지 |
| **공통** | 터치 타겟은 모든 구간에서 44px 유지. 히어로 이미지 max 높이 `max-h-[520px]` 캡 |

---

## 6. 접근성

### 6.1 명도 대비 (WCAG AA, 계산 검증 완료)

| 조합 | 대비율 | 판정 |
|---|---|---|
| text-hi `#f4efe6` / nave `#0a0812` | 17.4:1 | AAA |
| text-body `#cdc6dc` / surface `#141021` | 11.3:1 | AAA |
| text-mute `#948ca9` / surface `#141021` | 5.9:1 | AA (본문), AAA (18px+) |
| text-mute `#948ca9` / raised `#1c1730` | 5.4:1 | AA |
| flame `#ffc46b` / surface `#141021` | 11.9:1 | AAA |
| flame-hi `#ffdca8` / nave `#0a0812` | 15.2:1 | AAA |
| angel `#86e7f8` / surface `#141021` | 13.2:1 | AAA |
| devil `#ff8fa3` / surface `#141021` | 8.6:1 | AAA |
| votive `#b9a5ff` / surface `#141021` | 8.8:1 | AAA |
| on-flame `#241304` / flame `#ffc46b` | 11.4:1 | AAA (CTA 텍스트) |
| on-flame `#241304` / flame-deep `#ff9e45` | 8.7:1 | AAA (그라디언트 최암부에서도 통과) |

`text-faint #6e6785`는 nave 대비 3.7:1 — **읽는 텍스트 사용 금지**, 플레이스홀더·장식·disabled 전용.

### 6.2 터치 타겟 (44×44 미달 수정 목록)

| 대상 | 현재 | 수정 |
|---|---|---|
| 하단 네비 탭 | 아이콘 18px+9px 라벨, 히트영역 미보장 | `min-w-11 min-h-12` 명시 |
| 헤더 BGM 토글 | `p-0.5` (~20px) | 44px 히트영역 (`w-11 h-11 -m-1`) |
| 새로고침 버튼 (3곳) | `p-2.5` (~36px) | `h-11 w-11` |
| 설정 토글 | 텍스트 버튼 ~30px 높이 | 스위치 + `p-2 -m-2` 패딩 |
| 톤 카드 | 충분 (min-h-72px) | 유지 |
| CandleButton | 56px | 유지 |

### 6.3 ARIA 유지·추가 사항

**유지 (회귀 금지)**: 배너 `role="timer" aria-live="polite" aria-atomic aria-label`, 도착 토스트 `role="status" aria-live="polite"`, 봉인 카드 `aria-disabled aria-label`(도착까지 M분 S초), 개봉 버튼 `aria-label`, 네비 편지함 `aria-label`(미읽음 N건), 뱃지 `aria-hidden`.

**신규 추가**: 톤 선택 `role="radiogroup"`+`role="radio" aria-checked`, 설정 스위치 `role="switch" aria-checked`, 벽화 조각 `role="button" tabIndex=0`+키보드 핸들러, 라이트박스 `role="dialog" aria-modal="true"` + 열릴 때 닫기 버튼 포커스 이동 + ESC 닫기, 모든 인터랙티브 요소 `focus-visible:outline-2 focus-visible:outline-flame/70 focus-visible:outline-offset-2` (전역 규칙).

---

## 7. 개발 구현 가이드

### 7.1 파일별 변경 지도

| 파일 | 변경 내용 | 규모 |
|---|---|---|
| `src/app/globals.css` | §1 코드 블록으로 **전체 교체** | 대 |
| `src/app/layout.tsx` | body 클래스 `bg-ink font-sans text-stone-300` → `bg-nave font-sans text-text-body` (`bg-ink`는 현재 미정의 클래스 — 사일런트 버그) | 소 |
| `src/app/page.tsx` | 배경 레이어(§2.1), 헤더(§2.2), 네비(§2.3), 토스트(§2.4), 6개 뷰 섹션(§3.1~3.6), 뷰 전환 모션 통일(§4.2), BurnEffect reduced-motion 분기(§3.2.5) | 대 |
| `src/components/CandleButton.tsx` | 스킨 교체 §3.3.4 (로직 무변경) | 중 |
| `src/components/BurnEffect.tsx` | 파티클 팔레트·폰트 §3.2.5 (로직 무변경) | 소 |
| `src/components/LetterCountdownBanner.tsx` | 스킨 교체 §3.3.2 (로직·ARIA 무변경) | 소 |
| `src/components/SealedLetterCard.tsx` | 3상태 스킨 + 밀랍 디스크 + 톤 라벨 한국어화 §3.5.2 (상태 로직 무변경) | 중 |

**금지**: `src/app/actions.ts`, `src/lib/*`, `src/app/api/*` 수정 금지. 컴포넌트 props 시그니처·콜백 계약 수정 금지.

### 7.2 구현 우선순위

| 순위 | 작업 | 이유 |
|---|---|---|
| P0 | globals.css 토큰 + layout.tsx 폰트/배경 수정 | 모든 화면의 기반. **폰트 변수 미연결 버그 수정 포함** — 이것만으로 서체가 살아난다 |
| P1 | page.tsx 공통 셸 (배경 레이어·헤더·네비·토스트) | 전 뷰 공유, 터치 타겟 수정 포함 |
| P2 | CONFESS → CATHEDRAL(+CandleButton·배너) → ENTRANCE | 핵심 플로우 순 |
| P3 | STAINED_GLASS(+라이트박스) → LETTER_BOX(SealedLetterCard) → SETTINGS | |
| P4 | BurnEffect 팔레트 + reduced-motion 분기, 포커스 링 전역 점검 | |

### 7.3 검증 체크리스트 (완료 판정 대응)

1. 360px 뷰포트에서 6개 뷰 모두 가로 스크롤 없음, 톤 카드 세로 스택 확인
2. 입장→고해→연소→피드→촛불 롱프레스→벽화→편지함 개봉→설정 전 플로우 기능 회귀 없음 (Server Actions 호출부 diff 0)
3. `next lint` / `next build` 통과 (코디네이터가 외부 실행)
4. 설정 reduced-motion ON + OS reduce 각각에서: 파티클 미실행, flicker 정지, 뷰 전환 즉시 표시
5. Gowun Batang(고해 본문)·Cormorant(워드마크)·Noto Sans KR(UI)가 실제 렌더되는지 devtools로 폰트 확인 (P0 버그 수정 검증)
6. 라이트박스 ESC 닫기·포커스 이동, 톤 카드 방향키 없이도 탭 이동 가능 확인
