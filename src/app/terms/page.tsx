import type { Metadata } from 'next';
import {
  LegalDocumentLayout,
  LegalList,
  LegalMeta,
  LegalSection,
} from '@/components/LegalDocumentLayout';

export const metadata: Metadata = {
  title: '이용약관 | 네온 성당',
  description: '네온 성당 이용약관 — 법무 검토 전 초안(v0.1)',
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout title="이용약관">
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
          본 약관은 네온 성당(이하 “서비스”)이 제공하는 익명 고해·촛불 공감·스테인드글라스 벽화 등 관련 기능의 이용 조건과 서비스·이용자 간 권리·의무를 정합니다. 서비스를 이용하시면 본 약관에 동의한 것으로 봅니다.
        </p>
      </LegalSection>

      <LegalSection title="제2조 (서비스의 정의)">
        <LegalList
          items={[
            <>
              <strong className="text-text-hi">고해</strong>: 이용자가 텍스트로 작성한 고민·감정 글. 작성 후 “태우기”를 완료하면 공개 피드에 익명으로 노출됩니다.
            </>,
            <>
              <strong className="text-text-hi">촛불</strong>: 타인의 고해에 댓글·텍스트 반응 없이 공감을 전하는 행위. 글당 이용자 1회를 원칙으로 합니다.
            </>,
            <>
              <strong className="text-text-hi">소멸</strong>: 피드 노출 기간이 끝난 고해가 서버에서도 영구 삭제되어, 작성자 본인을 포함해 다시 열람할 수 없게 되는 상태입니다.
            </>,
            <>
              <strong className="text-text-hi">스테인드글라스 벽화(박제)</strong>: 서비스가 정한 촛불 기준(서비스 화면에 안내되며 운영상 조정될 수 있음)을 충족한 고해가 소멸하지 않고 벽화 조각으로 영구 보존되는 예외입니다.
            </>,
            <>
              <strong className="text-text-hi">익명 세션</strong>: 회원가입 없이 기기 기반 토큰으로 유지되는 “N번째 고해자” 형태의 식별 상태입니다. 프로필·팔로우·DM 등 관계 형성 기능은 제공하지 않습니다.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="제3조 (약관의 게시와 변경)">
        <LegalList
          items={[
            '본 약관은 서비스 내(설정·성당 입구 등)에 게시합니다.',
            '약관을 변경할 경우 변경 내용과 시행일을 서비스 내에 사전 고지합니다. 시행일 이후 서비스를 계속 이용하시면 변경 약관에 동의한 것으로 봅니다.',
            '본 문서는 법무 검토 전 초안이며, 확정본과 다를 수 있습니다.',
          ]}
        />
      </LegalSection>

      <LegalSection title="제4조 (이용 자격과 익명 이용)">
        <LegalList
          items={[
            <>
              서비스는 <strong className="text-text-hi">회원가입 절차가 없습니다.</strong> 이메일·전화번호·이름 등 개인정보를 수집하지 않으며, 접속 즉시 익명으로 이용할 수 있습니다. (근거: FR-1, §7.1)
            </>,
            '최초 방문 시 순번 기반 익명 식별자(예: “42번째 고해자”)가 자동 부여됩니다.',
            '세션은 기기 기반 익명 토큰으로 유지됩니다. 기기 변경·데이터 삭제 시 동일 세션을 복구하지 못할 수 있으며, 복구 수단이 제공되더라도 익명성을 해치지 않는 범위로 한정됩니다.',
            <>
              유료 기능이 도입될 경우, 결제는 외부 결제대행(PG)을 통해 처리되며 <strong className="text-text-hi">결제 정보는 익명 세션과 분리 저장</strong>하는 것을 원칙으로 합니다. 결제 자체에 필요한 정보는 PG사가 관계 법령에 따라 처리합니다. (근거: FR-6.3, §7.1)
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="제5조 (고해의 작성·태우기·공개)">
        <LegalList
          items={[
            '이용자는 정해진 글자 수 한도 내에서 고해를 작성할 수 있습니다.',
            <>
              “태우기” 전에는 편집할 수 있으나, 태운 뒤에는 <strong className="text-text-hi">수정·삭제를 요청하는 일반적인 게시물 관리 개념이 적용되지 않습니다.</strong> (근거: FR-2.5)
            </>,
            '태워진 고해는 공개 피드에 익명으로 노출됩니다. 작성자 실명·계정명·연락처는 표시되지 않습니다.',
            '고해 내용은 서비스의 프라이버시 설계상 외부 대규모 언어모델(LLM) API로 전송하지 않는 것을 원칙으로 합니다. (§7.1)',
          ]}
        />
      </LegalSection>

      <LegalSection title="제6조 (콘텐츠 소멸 정책 — 24시간 정산)">
        <LegalList
          items={[
            <>
              태워진 고해는 원칙적으로 <strong className="text-text-hi">피드 노출 시작부터 24시간이 경과하면 소멸 정산</strong>됩니다. 소멸 대상은 데이터베이스에서 <strong className="text-text-hi">하드 삭제</strong>되며, soft delete로 남겨 두지 않습니다. (근거: FR-2.4, §7.2; 노출 기간은 서비스 정책으로 24시간 적용)
            </>,
            '소멸된 고해는 작성자 본인도 다시 볼 수 없습니다.',
            <>
              답장 발송 대기, 박제 판정 등 서비스 운영에 필요한 <strong className="text-text-hi">최소 기간</strong> 동안만 임시 보존할 수 있습니다. (§7.2)
            </>,
            '접속 로그(IP 등)는 법정 최소 기간만 보관하며, 고해 본문과 연결하지 않습니다. (§7.1)',
            '백업·로그에 일시적으로 잔존할 수 있는 데이터는 별도 주기로 정리하며, 구체적 주기는 운영 정책으로 고지합니다.',
          ]}
        />
      </LegalSection>

      <LegalSection title="제7조 (스테인드글라스 벽화 — 박제와 옵트아웃)">
        <LegalList
          items={[
            <>
              한 고해가 <strong className="text-text-hi">서비스가 정한 기준 이상의 촛불</strong>을 받으면, 24시간 소멸 대상에서 제외되고 스테인드글라스 벽화 조각으로 <strong className="text-text-hi">영구 박제</strong>될 수 있습니다. (근거: FR-4)
            </>,
            '박제 시점에는 익명성을 유지한 채 작성자에게 안내를 제공합니다.',
            <>
              <strong className="text-text-hi">옵트아웃:</strong> 작성자는 박제를 거부할 수 있습니다. 거부하면 해당 고해는 박제되지 않으며, 소멸 정책에 따라 삭제됩니다. 박제 거부 가능 시점·방법은 서비스 화면에서 안내합니다. (권장 정책 반영: FR-4.2)
            </>,
            '이미 벽화로 박제된 조각의 공개 범위·철회는 커뮤니티 안전·법령 준수를 위해 운영자가 제한적으로 조정할 수 있습니다.',
          ]}
        />
      </LegalSection>

      <LegalSection title="제8조 (금지 행위)">
        <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
        <LegalList
          items={[
            '법령에 위반되거나 불법 정보를 유포하는 행위',
            <>
              타인의 개인정보·실명·연락처·학교·직장 등 <strong className="text-text-hi">식별 가능한 정보를 고해나 기타 기능에 노출</strong>하는 행위
            </>,
            '타인을 비난·모욕·협박하거나, 판단·조롱을 목적으로 서비스를 이용하는 행위',
            '자살·자해 조장, 성적 착취, 혐오·차별, 폭력 선동 등 유해 콘텐츠를 게시하는 행위',
            '서비스의 익명 토큰·신고·필터·결제 체계를 우회·악용하는 행위',
            '자동화된 수단으로 과도한 요청을 보내 서비스 운영을 방해하는 행위',
            '타인의 권리를 침해하거나, 서비스의 감성 힐링 목적에 명백히 반하는 상업적 스팸을 게시하는 행위',
          ]}
        />
        <p>
          금지 행위가 확인되면 해당 콘텐츠 삭제·세션 제한·박제 철회 등 필요한 조치를 할 수 있습니다. 세부 규범은 <strong className="text-text-hi">커뮤니티 가이드라인</strong>을 따릅니다.
        </p>
      </LegalSection>

      <LegalSection title="제9조 (신고·모더레이션)">
        <LegalList
          items={[
            '공개 피드의 고해에 대해 신고할 수 있습니다. (근거: FR-7)',
            '서비스는 규칙·키워드 기반 유해 콘텐츠 필터를 적용·강화할 수 있습니다. (FR-7.2)',
            '운영자는 신고 처리, 박제 글 관리 등 안전 목적의 조치만 수행하며, 일상적인 “검열·검열 목적의 상시 열람”을 위해 고해를 보관하지 않습니다. 소멸 정책이 우선합니다.',
          ]}
        />
      </LegalSection>

      <LegalSection title="제10조 (유료 서비스 — 예정)">
        <LegalList
          items={[
            '향후 편지 봉투 패키지, 프리미엄 촛불 스킨 등 유료 상품이 제공될 수 있습니다. (FR-6)',
            '유료 상품의 가격·환불·청약철회는 관계 법령과 결제 시점의 고지 내용을 따릅니다.',
            '익명 세션 특성상 기기 변경 시 구매 이력 복구가 제한될 수 있으며, 복구 가능 여부는 별도 고지합니다.',
          ]}
        />
      </LegalSection>

      <LegalSection title="제11조 (서비스의 변경·중단)">
        <LegalList
          items={[
            '운영상·기술상 필요에 따라 기능을 변경·중단할 수 있습니다.',
            '정기·긴급 점검, 천재지변, 통신 장애 등으로 서비스가 일시 중단될 수 있습니다.',
            '서비스 종료 시 소멸·박제 데이터의 처리 방침을 사전 고지합니다.',
          ]}
        />
      </LegalSection>

      <LegalSection title="제12조 (면책)">
        <LegalList
          items={[
            <>
              서비스는 감정 해소를 돕는 <strong className="text-text-hi">감성 힐링 공간</strong>이며, 의료·법률·심리 상담 등 전문 서비스를 대체하지 않습니다.
            </>,
            '익명 고해의 내용에 대해 서비스가 사실 확인·조언의 정확성을 보장하지 않습니다.',
            '이용자 간 상호작용(촛불 등)으로 발생하는 감정적 영향에 대해, 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.',
            '무료로 제공되는 범위에서, 관계 법령이 허용하는 한도 내 책임을 제한할 수 있습니다.',
            <>
              위기 상황에서는 서비스 안내와 함께 <strong className="text-text-hi">전문 상담 기관(예: 자살예방상담전화 109)</strong> 이용을 권합니다. (§7.4)
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="제13조 (지식재산)">
        <LegalList
          items={[
            '서비스 UI·사운드·세계관 명칭·벽화 연출 등 서비스 고유 요소의 권리는 운영자에게 있습니다.',
            '이용자가 작성한 고해의 권리는 이용자에게 있으나, 태우기·공개·박제·소멸에 필요한 범위에서 서비스가 이를 이용·삭제할 수 있는 권한을 부여받습니다.',
            '박제된 벽화 조각의 공개 전시는 익명 상태를 유지한 채 서비스 내에서 이루어집니다.',
          ]}
        />
      </LegalSection>

      <LegalSection title="제14조 (준거법과 분쟁)">
        <p>
          본 약관은 대한민국 법령을 준거법으로 합니다. 분쟁 발생 시 성실히 협의하며, 협의가 이루어지지 않으면 관할 법원은 관계 법령에 따릅니다.
        </p>
      </LegalSection>

      <LegalSection title="제15조 (문의)">
        <p>약관·개인정보·안전 관련 문의는 아래 채널로 연락해 주세요.</p>
        <LegalList
          items={[
            '[문의 채널 placeholder — 예: support@example.com 또는 설정 내 문의]',
            <>
              서비스 내 <strong className="text-text-hi">설정 → 문의</strong> 진입점 (구현 시)
            </>,
          ]}
        />
      </LegalSection>
    </LegalDocumentLayout>
  );
}
