import type { Metadata } from 'next';
import {
  LegalDocumentLayout,
  LegalList,
  LegalMeta,
  LegalSection,
  LegalTable,
} from '@/components/LegalDocumentLayout';

export const metadata: Metadata = {
  title: '청소년 보호정책 | 네온 성당',
  description: '네온 성당 청소년 보호정책 — 법무 검토 전 초안(v0.1)',
};

export default function YouthPolicyPage() {
  return (
    <LegalDocumentLayout title="청소년 보호정책">
      <LegalMeta>
        <p>
          <strong className="text-text-body">법무 검토 전 초안(v0.1)</strong>
        </p>
        <p>
          <strong className="text-text-body">시행일자:</strong>{' '}
          [시행일자: YYYY-MM-DD — placeholder]
        </p>
        <p>
          <strong className="text-text-body">최종 수정:</strong> 2026-07-13
        </p>
      </LegalMeta>

      <LegalSection title="제1조 (목적)">
        <p>
          본 정책은 「청소년 보호법」 등 관계 법령과 REQUIREMENTS.md <strong className="text-text-hi">§7.4 안전(Trust &amp; Safety)</strong> 요구에 따라, 네온 성당을 이용하는 청소년을 유해 환경으로부터 보호하기 위한 기준과 조치를 정합니다.
        </p>
      </LegalSection>

      <LegalSection title="제2조 (적용 범위)">
        <LegalList
          items={[
            '본 정책은 서비스 내 고해·피드·촛불·스테인드글라스 벽화·답장 안내·예정된 유료 기능 등 청소년이 접할 수 있는 모든 영역에 적용됩니다.',
            <>
              서비스는 회원가입·연령 확인 절차가 없는 <strong className="text-text-hi">익명 서비스</strong>이므로, 연령을 사전에 차단하는 방식보다 <strong className="text-text-hi">유해 콘텐츠 자체의 유입·확산을 막는 조치</strong>에 중점을 둡니다. (FR-1, §7.4)
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="제3조 (보호 원칙)">
        <LegalList
          items={[
            <>
              <strong className="text-text-hi">미성년자 보호를 위한 유해 콘텐츠 필터링 기준을 강화</strong>합니다. (§7.4)
            </>,
            '청소년에게 유해한 매체물·정보에 해당하는 표현(음란, 폭력, 학대, 자살·자해 조장, 약물 오남용 조장 등)의 게시를 금지합니다.',
            <>
              위기 신호 감지 시 전문 상담 기관 안내를 제공합니다. (예: <strong className="text-text-hi">자살예방상담전화 109</strong>)
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="제4조 (유해 콘텐츠 필터 — 예정·적용)">
        <LegalList
          items={[
            <>
              서비스는 <strong className="text-text-hi">규칙·키워드 기반 유해 콘텐츠 사전 필터링</strong>을 적용하거나 적용할 예정입니다. (근거: FR-7.2, §7.4)
            </>,
            <>
              필터 대상 예시(확장 가능):
              <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-flame">
                <li>개인정보·실명 등 식별 정보 노출</li>
                <li>음란·성 착취적 표현</li>
                <li>청소년 대상 유해 표현</li>
                <li>자살·자해의 구체적 방법·선동</li>
                <li>불법 행위 조장</li>
              </ul>
            </>,
            <>
              필터는 LLM에 고해 본문을 보내지 않는 원칙(§6.1, §7.1) 아래에서, <strong className="text-text-hi">규칙 기반</strong>으로 구현합니다.
            </>,
            '필터는 완벽한 차단을 보장하지 않습니다. 우회·신규 표현이 발견되면 기준을 갱신합니다.',
            <>
              <strong className="text-text-hi">예정 사실 고지:</strong> 현재 초안 시점 기준으로 유해 콘텐츠 필터의 고도화·상시 운영은 <strong className="text-text-hi">구현·강화 예정</strong>이며, 배포 범위는 제품 로드맵(B-05 연계 신고·모더레이션 등)에 따라 단계적으로 확대됩니다. 시행 세부는 서비스 내 공지로 업데이트합니다.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="제5조 (신고·조치)">
        <LegalList
          items={[
            '누구든지 청소년에게 유해하다고 판단되는 콘텐츠를 신고할 수 있습니다. (FR-7.1)',
            '운영자는 신고·필터·모니터링 결과에 따라 삭제, 피드 제외, 박제 철회, 세션 제한 등 필요한 조치를 합니다.',
            <>
              소멸 정책(24시간 하드 삭제)과 충돌하지 않는 범위에서, <strong className="text-text-hi">법령상 보관·수사 협조가 필요한 경우</strong>에는 관계 법령이 우선합니다.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="제6조 (유료·광고와 청소년)">
        <LegalList
          items={[
            '유료 상품(편지 봉투, 프리미엄 촛불 등)이 도입될 경우, 결제 수단·고지·환불은 관계 법령과 PG사 정책을 따릅니다.',
            '청소년의 결제 능력·법정대리인 동의 등 이슈가 발생할 수 있음을 인지하며, 익명 서비스 특성상 연령 확인의 한계가 있으면 대체 보호 조치(상품 설명 고지, 과도한 결제 유도 금지 등)를 검토합니다.',
            '서비스는 고해 피드에 공격적 타깃 광고를 두지 않는 방향을 원칙으로 합니다. (정책 확정 시 본 조 수정)',
          ]}
        />
      </LegalSection>

      <LegalSection title="제7조 (상담·도움 안내)">
        <p>
          청소년이 심리적 위기·학대·폭력 피해를 호소하는 경우, 서비스는 가능한 범위에서 아래 연락처 안내를 제공합니다.
        </p>
        <LegalTable
          headers={['구분', '연락처']}
          rows={[
            ['자살예방상담전화', <strong key="109" className="text-text-hi">109</strong>],
            ['청소년상담 1388', '1388'],
            ['아동학대 신고', '112 / 아동보호전문기관'],
            ['긴급 구조', '112 / 119'],
          ]}
        />
      </LegalSection>

      <LegalSection title="제8조 (책임자·문의)">
        <LegalTable
          headers={['항목', '내용']}
          rows={[
            ['청소년보호 책임자', '[성명/닉네임 placeholder]'],
            ['연락처', '[문의 채널 placeholder]'],
            ['게시 위치', '설정 · 성당 입구 법적 링크'],
          ]}
        />
      </LegalSection>

      <LegalSection title="제9조 (정책의 변경)">
        <p>
          본 정책을 변경할 경우 서비스 내에 공지하며, 법무 검토 후 확정본으로 교체합니다. 본 문서는 <strong className="text-text-hi">법무 검토 전 초안(v0.1)</strong> 입니다.
        </p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
