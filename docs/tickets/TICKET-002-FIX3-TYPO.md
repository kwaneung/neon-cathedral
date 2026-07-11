# TICKET-002-FIX3 — 한글 타이포 가독성 수정안

| 항목 | 내용 |
|---|---|
| 티켓 ID | TICKET-002-FIX3 |
| 문서 유형 | 타이포그래피 수정 명세 (자기 검증) |
| 대상 커밋 | `cd488d9` (Midnight Liturgy 반영분) |
| 작성일 | 2026-07-11 |
| 원칙 | **한글 읽기 텍스트 우선 최적화. 영문 장식 텍스트(uppercase 부제, 워드마크)는 유지.** 변경은 가독성에 유의미한 것만 |

---

## 0. 진단 요약 (설계자 자기 검증)

원 명세의 세 가지 규칙이 구현 과정에서 한글 텍스트에 잘못 흘러들었거나, 명세 자체가 한글 특성을 과소평가했다:

1. **넓은 자간이 한글에 적용됨 (최대 문제)** — `tracking-[0.15em]~[0.35em]`은 라틴 스몰캡용 장식인데, CTA 버튼·입구 부제·톤 카드 제목 등 **한글 문장에 그대로 적용**되어 있다. 한글은 자모가 모여 음절 블록을 이루는 문자라 넓은 자간이 단어 덩어리를 해체한다 — 라틴과 달리 가독성이 즉시 무너진다. 한글 자간 허용치: 본문 0, 강조 라벨 최대 0.05em.
2. **12px(caption)이 한글 다행 읽기 텍스트의 주력 크기가 됨** — page.tsx에만 39곳. 메타(시각·숫자·칩)는 12px로 충분하지만, 입구 규율 3개 문단·톤 카드 설명·설정 설명문·프라이버시 조항 등 **여러 줄짜리 한글 문단**이 12px이다. 한글은 같은 px에서 라틴보다 획 밀도가 높아 체감이 1px 이상 작다. 특히 **Gowun Batang(세리프) 12px**은 가는 획이 어두운 배경에서 뭉개진다.
3. **AA 위반: `text-faint`가 읽기 텍스트에 사용됨** — 로딩/빈 상태 안내문 6곳 + placeholder + TOKEN이 `#6e6785`(nave 대비 **3.73:1**, surface 대비 **3.50:1**)로 AA(4.5:1) 미달. 원 명세에서 "읽는 텍스트 금지, 장식 전용"으로 못 박은 토큰이 안내 문장에 쓰였다.
4. 부수: 하단 네비 한글 라벨 9px(+0.18em), "나" 뱃지 9px.

적정 판정(변경 불필요): 본문 15px/1.8 Gowun Batang ✓ (한글 세리프 본문으로 적절), 뷰 타이틀 28px ✓, 영문 오버라인("Confession Altar" 등)의 `tracking-[0.2em] uppercase` ✓ (라틴 전용이므로 유지), `text-mute #948ca9` 색상 ✓ (surface 대비 5.85:1, raised 대비 5.42:1 — 12px에서도 AA 통과, 색 토큰 변경 불필요).

---

## 1. 토큰 변경 — `src/app/globals.css`

| 토큰 | before | after | 이유 |
|---|---|---|---|
| `--text-label--line-height` | `1.5` | `1.65` | caption에서 label(13px)로 승격되는 한글 다행 문단의 행간 확보. 버튼 라벨은 flex 중앙정렬이라 영향 없음 |
| (신규) `--tracking-hangul: 0.03em;` | — | 추가 | 한글 강조 라벨에 허용하는 유일한 자간. CTA·"터치하여 개봉" 등에서 `tracking-(--tracking-hangul)`로 사용 |

`--text-overline` 토큰 주석에 다음 문구 추가: `/* 라틴 전용. 한글에 letter-spacing 0.18em 적용 금지 */`

**전역 베이스 추가** (body 블록에 2줄):

```css
body {
  /* ...기존 유지... */
  word-break: keep-all;      /* 한글 어절 단위 줄바꿈 기본화 */
  overflow-wrap: break-word; /* 긴 토큰(URL 등) 오버플로 방지 */
}
```

→ 개별 `break-keep` 클래스는 그대로 둬도 무해. TOKEN 표시부의 `break-all`은 클래스가 우선하므로 영향 없음.

---

## 2. 한글 자간 제거 (필수 — 가독성 체감 최대)

원칙: **한글 문장/라벨에서 `tracking-[0.1em]` 이상은 전부 제거**. 아래는 전수 목록 (파일:라인은 `cd488d9` 기준, 클래스 패턴으로 검색 가능).

| 위치 | 텍스트 | before | after |
|---|---|---|---|
| `page.tsx:561` | "소멸의 고해소 & 따뜻한 촛불의 회랑" | `text-caption tracking-[0.35em] uppercase` | `text-label tracking-(--tracking-hangul)` (uppercase 삭제 — 한글 no-op 노이즈) |
| `page.tsx:588` | CTA "성당 안으로 들어가기" | `text-caption sm:text-sm tracking-[0.28em] uppercase` | `text-sm tracking-(--tracking-hangul)` (uppercase 삭제. 주 CTA가 12px였음 — 14px 고정) |
| `page.tsx:713` | CTA "고해 제단에 바쳐 연소하기" | `text-caption tracking-[0.28em] uppercase` | `text-sm tracking-(--tracking-hangul)` (uppercase 삭제) |
| `page.tsx:547` | "촛불이 켜져 있습니다" | `text-caption tracking-[0.18em] uppercase` | `text-caption tracking-(--tracking-hangul)` (uppercase 삭제) |
| `page.tsx:655` | 폼 라벨 "서신 톤 선택" | `text-caption tracking-[0.2em] uppercase` | `text-caption tracking-normal` (uppercase 삭제) |
| `page.tsx:676, 700` | 톤 카드 제목 "천사의 위로"/"악마의 속삭임" | `text-caption font-bold tracking-[0.15em] uppercase` | `text-label font-bold tracking-normal` (크기도 13px로 승격) |
| `page.tsx:754, 847, 948` | 로딩 문구 3곳 ("피드의 불을 지피는 중..." 등) | `tracking-widest` | 삭제 (색상은 §4에서 함께 수정) |
| `page.tsx:760, 853, 954` | 빈 상태 안내 3곳 | `tracking-wider` / `tracking-wide` | 삭제 (〃) |
| `page.tsx:1086` | "나의 고유 세션 데이터" | `tracking-wider uppercase` | 삭제 |
| `page.tsx:1098` | "개인정보 취급 & 소멸 규정" | `tracking-wider uppercase` | 삭제 |
| `page.tsx:938` | "5분, 번뇌가 정화되는 시간" | `tracking-wide` | 삭제 |
| `page.tsx:892` | 벽화 조각 작성자명 (한글 익명 이름) | `text-overline` (11px + 토큰 자간 0.18em) | `text-overline tracking-normal` (11px 유지 — 조각 내 공간 제약, 자간만 제거) |
| `SealedLetterCard.tsx:120, 152, 201` | 톤 라벨 "천사의 위로"/"악마의 속삭임" | `font-sans font-bold tracking-[0.08em]` | `tracking-normal` |
| `SealedLetterCard.tsx:228` | "터치하여 개봉" | `text-caption tracking-[0.2em]` | `text-label tracking-(--tracking-hangul)` |

**유지(변경 금지)**: `page.tsx:444` 워드마크 "NEON CATHEDRAL" `tracking-[0.28em]`, `:556` 디스플레이 타이틀 `tracking-[0.2em]`, `:604/730/833/912/1000` 영문 오버라인 `tracking-[0.2em] uppercase`, `.letter-timer`의 `0.12em`(숫자 전용), `:646` 글자수 카운터 `tracking-wide`(숫자).

---

## 3. 한글 다행 읽기 텍스트 크기 승격 (caption 12px → label 13px)

규칙: **두 줄 이상 이어 읽는 한글 문단은 최소 13px.** 단행 메타(시각/숫자/칩/작성자)는 12px 유지.

| 위치 | 내용 | before | after |
|---|---|---|---|
| `page.tsx:570` | 입구 규율 카드 3개 문단 | `text-caption leading-relaxed` | `text-label leading-relaxed` |
| `page.tsx:678, 702` | 톤 카드 설명 (Gowun Batang) | `text-caption leading-relaxed font-serif` | `text-label leading-relaxed font-serif` (**세리프 12px 금지** — 가는 획 뭉개짐) |
| `page.tsx:935` | 편지함 "5분…" 안내 상자 본문 | `text-caption leading-relaxed` (컨테이너) | `text-label leading-relaxed` |
| `page.tsx:1014, 1059` | 설정 항목 설명문 2곳 | `text-caption text-text-mute` | `text-label text-text-mute` |
| `page.tsx:1097` | 프라이버시 조항 (font-serif 다행) | `text-caption font-serif` | `text-label font-serif` |
| `page.tsx:760, 853, 954` | 빈 상태 안내 3곳 (2줄) | `text-caption` | `text-label` |
| `page.tsx:802` | 카드 푸터 "5촛불 획득 시…" (font-serif 단행) | `text-caption font-serif` | `text-caption font-sans` (크기 유지, 12px 세리프만 회피) |
| `page.tsx:888` | 벽화 조각 본문 인용 (세리프 12px) | `font-serif text-caption italic` | 유지 — 프리뷰 발췌(line-clamp-4)라 읽기 완결 텍스트가 아니고, 조각 크기 제약. 단 라이트박스 본문(17px)이 완독 경로임을 전제 |

**유지(12px 적정)**: 토스트 메시지(단행), 카드 헤더 메타(작성자/남은시간), 카운트다운 배너 라벨, CandleButton "촛불 N", 글자수 카운터, 세션 뱃지 라벨, 설정 상태 라벨("재생 중" 등).

---

## 4. 색 대비 수정 — `text-faint` 읽기 텍스트 제거 (AA 위반)

`--color-text-faint #6e6785` = nave 대비 **3.73:1**, surface 대비 **3.50:1** → 12~13px 일반 텍스트 AA(4.5:1) 미달. 색 토큰 값은 바꾸지 않고(placeholder·비활성·장식용으로 존치) **사용처를 `text-text-mute`(#948ca9, surface 대비 5.85:1 AA 통과)로 교체**한다:

| 위치 | 내용 | before | after |
|---|---|---|---|
| `page.tsx:754, 847, 948` | 로딩 문구 3곳 | `text-text-faint` | `text-text-mute` |
| `page.tsx:760, 853, 954` | 빈 상태 안내 3곳 | `text-text-faint` | `text-text-mute` |
| `page.tsx:1089` | 세션 TOKEN (UUID, 복사 대상 콘텐츠) | `text-[10px] text-text-faint font-mono` | `text-[11px] text-text-mute font-mono` |
| `SealedLetterCard.tsx:124` | 봉인 카드 "봉인됨" 라벨 | `text-text-faint` | `text-text-mute` |
| `page.tsx` textarea placeholder | 고해 안내 문장 (지시문) | `placeholder:text-text-faint` | `placeholder:text-text-mute` (placeholder는 AA 예외 관례가 있으나 이 문장은 핵심 지시문 — 3.5:1은 과함) |

`text-text-faint` 잔존 허용처: 빈 상태 아이콘, disabled 버튼 텍스트, 장식 아이콘 틴트.

---

## 5. 하단 네비 라벨 (9px → 12px)

`page.tsx:1126, 1140, 1154, 1185, 1199` — "제단/회랑/벽화/서신/비축":

- before: `text-[9px] font-sans font-medium tracking-[0.18em] uppercase`
- after: `text-caption font-sans font-medium tracking-normal` (12px. uppercase 삭제)
- 검증: 아이콘 20px + gap 4px + 라벨 18px ≈ 42px — 기존 `min-h-12`(48px) 독 안에 수용, 레이아웃 변경 불필요. 2글자 라벨 × 12px ≈ 24px 폭 — 5탭 균등 배치 유지.
- `page.tsx:786` "나" 뱃지: `text-[9px]` → `text-[10px]`, `tracking-wider uppercase` 삭제 (단글자 칩이라 10px 허용).

---

## 6. 구현 순서 및 검증

1. **P0** — §2 자간 제거 + §4 faint 교체: 두 가지 모두 기계적 치환이며 체감 효과가 가장 큼.
2. **P1** — §3 크기 승격, §5 네비 라벨, §1 토큰(라벨 행간·`--tracking-hangul`·body `word-break`).
3. 검증:
   - `grep -n 'tracking-\[0\.[1-9]' src/` 결과에 한글 텍스트를 감싼 요소가 없어야 함 (영문 오버라인·워드마크·letter-timer만 잔존)
   - `grep -n 'text-text-faint' src/` 결과가 placeholder·disabled·아이콘 틴트 외 없음 → 이후 placeholder도 mute로 교체됐는지 확인
   - `grep -n 'font-serif' src/`에서 `text-caption`과 동시 사용이 `page.tsx:888`(벽화 프리뷰) 1곳만 남아야 함
   - 360px에서 입구 CTA·하단 네비 줄바꿈 없음 확인, `lint`/`build` 통과 (코디네이터 외부 실행)

기능·마크업 구조·ARIA·모션 변경 없음 — 전부 className 수준 치환과 globals.css 토큰 2건 + body 2줄이다.
