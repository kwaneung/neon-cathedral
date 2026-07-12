# [DESIGN-REVIEW-001] 현행 디자인 검토 리포트: Midnight Liturgy

본 리포트는 "네온 성당(Neon Cathedral)" 프로젝트의 현행 디자인 테마인 **"자정의 전례 (Midnight Liturgy)"**에 대한 종합적인 비주얼, 타이포그래피, 모바일 인터랙션 및 접근성 검토 분석 결과를 담고 있습니다. 신규 합류한 디자인 리뷰어의 관점에서 객관적이고 세밀한 진단을 수행했습니다.

---

## 1. 종합 평가: 9.2 / 10

현행 "Midnight Liturgy" 디자인은 침묵, 소멸, 그리고 따뜻한 온기라는 독창적인 서비스 컨셉을 시각적 언어로 매우 훌륭하게 승화시켰습니다.

*   **컨셉 일관성 (10/10):** 밤공기의 보라-남색 잉크 빛 배경(`#0A0812`) 위에 오직 촛불의 앰버 빛(`--color-flame`)만을 유일한 주 광원으로 삼는 '단일 광원 원칙'을 엄격하게 지켰습니다. 이를 통해 고독하고 아늑한 성당 안의 예배 분위기를 성공적으로 재현하고 있습니다.
*   **시각적 위계 (9/10):** 세리프 서체([Gowun Batang](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/globals.css#L8))와 따뜻한 오프화이트 컬러를 오직 '고해 본문 및 편지'에만 부여하고, 기타 UI 메타 정보에는 차가운 라벤더 그레이와 산세리프([Noto Sans KR](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/globals.css#L7))를 매핑하여 "인간의 목소리 vs 물리 공간"의 대비를 시각적으로 명확하게 분리했습니다.
*   **완성도 (8.5/10):** 전면 비주얼 개편 명세와 한글 타이포 가독성 개선안(TICKET-002-FIX3)이 코드 전반에 수준 높게 반영되었습니다. 모바일 360px 대응이 훌륭하며, 특히 한글 문장의 넓은 자간을 걷어내고 12px 세리프 가독성 뭉개짐을 피하도록 크기를 격상한 흔적이 돋보입니다. 다만, 모바일 환경에서의 일부 텍스트 가독성 마진 및 극히 일부 메타 정보의 시각 인지성 부분에서 보완할 여지가 남아있어 0.8점을 차감했습니다.

---

## 2. 강점 Top 3

### ① 철저한 한글 타이포그래피 가독성 최적화
*   **근거 코드:** [globals.css:L58-L65](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/globals.css#L58-L65), [page.tsx:L566](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L566)
*   **설명:** 기존 명세에서 라틴 알파벳 스몰캡용으로 남발되었던 넓은 자간(`tracking-[0.1em]`~`0.35em`)이 한글 문장에 적용되어 가독성을 깨뜨리던 현상을 완벽히 진단하고 제거했습니다. 한글 강조 라벨에는 오직 `--tracking-hangul: 0.03em`만을 제한적으로 적용하고, 여러 줄짜리 한글 설명 문단(입구 규율 카드, 설정 설명문 등)의 서체 크기를 12px(`caption`)에서 13px(`label`)로 승격하여 획이 뭉개지는 현상을 방지했습니다.

### ② 완벽한 'Reduced Motion' 및 시각 접근성 지원
*   **근거 코드:** [globals.css:L245-L255](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/globals.css#L245-L255), [CandleButton.tsx:L16-L38](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/components/CandleButton.tsx#L16-L38), [page.tsx:L83-L91](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L83-L91)
*   **설명:** 시스템 수준의 `prefers-reduced-motion` 미디어 쿼리뿐 아니라, 앱 내 설정 페이지에서 사용자가 직접 애니메이션을 간소화할 수 있는 토글 장치를 마련했습니다. 이를 통해 Canvas 파티클의 미마운트 분기 처리, 촛불 롱프레스의 코로나 스케일 효과 생략, 뷰 전환 애니메이션의 즉시 렌더링 등이 철저하게 분기 기획되었습니다.

### ③ 터치 우선 모바일 인터랙션 영역 보장 (Thumb Zone)
*   **근거 코드:** [page.tsx:L1126-L1133](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L1126-L1133), [page.tsx:L458-L464](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L458-L464)
*   **설명:** 모바일 사용성을 고려해 하단 탭 버튼 영역의 터치 타겟을 `min-w-11 min-h-12`(최소 44x48px)로 명시하여 보장했습니다. 또한 BGM 제어 토글, 새로고침 등 핵심 액션 버튼들에 마이너스 마진 기법 등을 동반하여 손가락 터치 시 오작동하지 않도록 44px 이상의 물리적인 유효 클릭 면적을 확보했습니다.

---

## 3. 약점 Top 3

### ① 스테인드글라스 조각 내 이탤릭 세리프 본문의 시각 인지성 한계
*   **근거 코드:** [page.tsx:L893-L895](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L893-L895)
*   **설명:** 스테인드글라스 벽면의 개별 조각 내에서 본문 프리뷰 텍스트가 `font-serif text-caption italic leading-relaxed`로 표현되어 있습니다. 12px(`caption`) 크기의 Gowun Batang(세리프) 이탤릭체는 모바일의 360px 2컬럼 레이아웃 하에서 획이 지나치게 가늘게 표현되며, 특히 보석톤 배경 그라디언트와 결합할 시 일부 어두운 조각 영역에서 텍스트가 뭉개지고 배경에 묻혀 가독성이 심각하게 저하됩니다.

### ② 모바일 360px 뷰포트 하에서의 설정 뷰 가로 공간 효율 저하
*   **근거 코드:** [page.tsx:L1009-L1012](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L1009-L1012), [page.tsx:L1063-L1073](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L1063-L1073)
*   **설명:** 설정 항목의 전체를 감싸는 카드에 전역 `p-6` 패딩이 부여되어 있습니다. 데스크톱에서는 넉넉한 여백이지만, 360px 수준의 초소형 모바일 기기에서는 `p-6` 패딩으로 인해 실제 콘텐츠 영역이 좌우로 좁아지며, "애니메이션 간소화"처럼 긴 설명 문단이 들어가는 설정 행에서는 스위치 버튼 옆의 텍스트가 심하게 구겨지거나 스위치의 시각적 안정감을 해치는 레이아웃 불균형이 초래될 우려가 있습니다.

### ③ SealedLetterCard 내의 '봉인됨' 상태 플레이스홀더 대비도 부족
*   **근거 코드:** [SealedLetterCard.tsx:L170-L172](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/components/SealedLetterCard.tsx#L170-L172)
*   **설명:** 아직 사유의 시간(5분)이 경과하지 않아 개봉할 수 없는 'sealed' 상태의 카드 중앙에는 3개의 플레이스홀더 블러 라인이 그려집니다. 그러나 이 라인들의 색상인 `bg-surface-raised`는 어두운 딤 배경인 `bg-surface/70` 위에서 색상 차이가 극히 미미하여, 사용자가 시각적으로 편지지의 형태나 텍스트 행이 숨겨져 있다는 디자인 메타포를 직관적으로 인지하기 매우 어렵습니다.

---

## 4. 화면별 개선 기회 (가장 효과가 큰 개선 1가지씩)

### ① 성당 입구 (ENTRANCE)
*   **개선안:** 히어로 아치 프레임 하단의 촛불 칩(`"촛불이 켜져 있습니다"`)에 미세한 글로우 또는 플리커 효과 추가.
*   **효과:** 입장 전 첫 화면의 정적이고 무거운 이미지 분위기 속에 하나의 촛불이 살아 숨 쉬고 있다는 인상을 강하게 제공하여, 첫 로딩 시점부터 유저의 감성적인 몰입을 이끌어 낼 수 있습니다.

### ② 고해실 (CONFESS)
*   **개선안:** 톤 카드 선택 영역(`천사의 위로` / `악마의 속삭임`)의 선택 시 아웃라인 및 테두리 글로우 효과 강화.
*   **효과:** 모바일 환경에서 탭을 변경할 때 단순히 색상과 얇은 글로우 변화에 그치지 않고, 선택한 카드의 테두리를 조금 더 강조함으로써 라디오 선택자로서의 명확한 상태 피드백을 전달할 수 있습니다.

### ③ 본당 피드 (CATHEDRAL)
*   **개선안:** 카드 푸터 영역의 `5촛불 획득 시...` 텍스트 좌측에 미니 촛불 아이콘 등을 배치하여 시각적 포인트 부여.
*   **효과:** 이 텍스트는 유저에게 다음 단계(스테인드글라스 박제)로 가기 위한 핵심 미션 정보를 주므로, 단순한 라벨보다 조금 더 가시성을 제공하여 유저의 참여(촛불 켜기)를 적극적으로 유도할 수 있습니다.

### ④ 스테인드글라스 벽 (STAINED_GLASS)
*   **개선안:** 홀수 인덱스 조각의 상단 마진(`sm:odd:mt-6`, `odd:mt-4`) 지그재그 리듬을 데스크톱 다컬럼 그리드 확장 시(`lg:grid-cols-4` 이상) 짝수/홀수 패턴 대신 핀터레스트형 Masonry 레이아웃으로 변경.
*   **효과:** 모자이크 벽화라는 아트 디렉션 컨셉에 맞추어 데스크톱 대화면에서도 수직 지그재그 높낮이가 리드미컬하고 세련되게 스케일업되도록 연출할 수 있습니다.

### ⑤ 편지함 (LETTER_BOX)
*   **개선안:** 편지 개봉 모션(`Mail` 아이콘이 회전하며 사라지고 본문이 등장) 시, 편지 본문의 페이드인 등장 타이밍을 150ms 정도 딜레이 오프셋 적용.
*   **효과:** 밀랍 봉인이 열린 뒤 편지지가 서서히 펼쳐지며 텍스트가 떠오르는 전례적(리추얼) 감성을 한층 더 부드럽고 고급스럽게 가다듬을 수 있습니다.

### ⑥ 설정 (SETTINGS)
*   **개선안:** 볼륨 조절 슬라이더 슬라이드 영역 터치 타겟 세로 높이 보정 및 좌우 틴트 아이콘 대비 보강.
*   **효과:** 모바일 기기에서 얇은 슬라이더 선을 손가락 끝으로 터치하여 드래그하는 조작 피로도를 줄여줄 수 있습니다.

---

## 5. 접근성 및 모바일 관점 잔여 리스크

1.  **초저대비 색상 토큰의 불필요한 노출 위험:**
    `globals.css`의 `--color-text-faint`(#6e6785)는 nave 배경 대비 약 3.7:1의 대비를 가집니다. 이는 WCAG AA 기준(4.5:1)에 미달하므로 절대 "읽기용 텍스트"로 사용되어서는 안 됩니다. 다행히 한글 가독성 개편안을 통해 로딩 및 빈 상태 텍스트에서 이를 걷어냈지만, 향후 신규 기능을 개발하는 작업자가 이 토큰을 일반 UI 텍스트 클래스로 오용할 시 접근성 규격이 즉시 깨질 수 있습니다.
2.  **모바일 사파리 dvh 주소창 변동 및 홈 인디케이터 간섭:**
    하단 플로팅 네비게이션이 `fixed bottom-6`로 단순 마진 처리되어 있습니다. iOS 사파리 브라우저에서 스크롤을 내릴 때 주소창이 축소되거나 나타나는 과정에서 레이아웃 높이가 순간적으로 튈 수 있으며, 최신 아이폰의 하단 홈 스와이프 인디케이터 바(`home indicator`)와 터치 히트 영역이 겹쳐 탭 이동 시 시스템 제스처가 간섭받을 위험이 미비하게 존재합니다.

---

## 6. 개선 제안 목록 (우선순위별 분류)

### [P0] 필수 보완 사항 (가독성 및 기본 레이아웃 사용성 직결)

#### 1. 스테인드글라스 조각 본문 폰트 스타일 변경 및 가독성 개선 (규모: 소)
*   **해당 파일:** [page.tsx:L893-L895](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L893-L895)
*   **개선안:** 12px 이탤릭체 세리프(`font-serif italic`)를 일반 산세리프 서체(`font-sans`) 및 노멀 스타일로 변경하여, 360px 모바일 화면의 어두운 보석톤 그라디언트 배경 위에서 획이 부서지거나 뭉개지지 않고 온전한 대비를 확보하도록 조치합니다.
*   **예상 코드 예시:**
    ```diff
    - <p className="relative z-10 line-clamp-4 overflow-hidden break-keep font-serif text-caption italic leading-relaxed">
    + <p className="relative z-10 line-clamp-4 overflow-hidden break-keep font-sans text-caption leading-relaxed text-text-hi/90">
    ```

#### 2. 설정 뷰 카드 패딩의 모바일 반응형 대응 (규모: 소)
*   **해당 파일:** [page.tsx:L1009](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L1009)
*   **개선안:** 설정 박스 카드의 패딩을 모바일 360px 하에서는 `p-4`로 축소하고, `sm:` 이상 뷰포트에서 `sm:p-6`으로 확장하여 초소형 모바일 기기에서의 유효 가로 가독 범위를 극대화합니다.
*   **예상 코드 예시:**
    ```diff
    - <div className="rounded-[24px] border border-line bg-surface/70 backdrop-blur-xl divide-y divide-line overflow-hidden shadow-card">
    + <div className="rounded-[24px] border border-line bg-surface/70 backdrop-blur-xl divide-y divide-line overflow-hidden shadow-card p-4 sm:p-6">
    ```

---

### [P1] 권장 개선 사항 (감성 완성도 및 시각 인지성 강화)

#### 1. SealedLetterCard 봉인 상태 플레이스홀더 블러 라인 색상 보강 (규모: 소)
*   **해당 파일:** [SealedLetterCard.tsx:L170-L172](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/components/SealedLetterCard.tsx#L170-L172)
*   **개선안:** 기존의 `bg-surface-raised` 블러 라인의 색상을 한 단계 더 대비가 강한 `bg-line-strong/40` 또는 `bg-text-faint/20`으로 변경하여, 어두운 카드 배경 위에서 텍스트가 봉인되어 흐려져 있다는 시각적 인지를 또렷하게 지원합니다.
*   **예상 코드 예시:**
    ```diff
    - <div className="h-3 rounded bg-surface-raised blur-[2px]" />
    - <div className="h-3 w-5/6 rounded bg-surface-raised blur-[2px]" />
    - <div className="h-3 w-2/3 rounded bg-surface-raised blur-[2px]" />
    + <div className="h-3 rounded bg-line-strong/40 blur-[2px]" />
    + <div className="h-3 w-5/6 rounded bg-line-strong/40 blur-[2px]" />
    + <div className="h-3 w-2/3 rounded bg-line-strong/40 blur-[2px]" />
    ```

#### 2. 모바일 사파리 주소창/홈바 간섭 방지 안전 마진 적용 (규모: 소)
*   **해당 파일:** [page.tsx:L1126](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L1126)
*   **개선안:** 하단 플로팅 네비게이션의 bottom 위치를 CSS 환경 변수를 결합하여 모바일 OS 홈 인디케이터 영역으로부터 완전히 이격시킵니다.
*   **예상 코드 예시:**
    ```diff
    - className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 h-[68px] max-w-sm w-[calc(100%-2rem)] rounded-[24px] backdrop-blur-3xl bg-surface/85 border border-line px-4 flex justify-between items-center shadow-float"
    + className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 h-[68px] max-w-sm w-[calc(100%-2rem)] rounded-[24px] backdrop-blur-3xl bg-surface/85 border border-line px-4 flex justify-between items-center shadow-float"
    ```

---

### [P2] 감성 디테일 고도화 사항 (UX 부드러움 극대화)

#### 1. 오디오 컨텍스트 락 획득 실패 시 복구 지원 안내 토스트 연계 (규모: 소)
*   **해당 파일:** [page.tsx:L257-L266](file:///Users/kwaneung/orca/workspaces/neon-cathedral/design/src/app/page.tsx#L257-L266)
*   **개선안:** 최초 입장 시 브라우저 오디오 보안 정책으로 인해 BGM 자동 재생이 차단되었을 때, `catch` 블록에서 에러 메시지를 삼키지 않고 우측 상단 BGM 컨트롤러를 터치하면 사운드를 들을 수 있다는 감성적인 안내(예: *"성당의 은은한 종소리가 들리지 않는다면 우상단의 촛불 음향을 직접 켜주세요."*)를 토스트로 띄워 유도를 돕습니다.
