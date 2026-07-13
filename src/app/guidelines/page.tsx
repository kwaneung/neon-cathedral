import type { Metadata } from 'next';
import {
  LegalBulletList,
  LegalDocumentLayout,
  LegalMeta,
  LegalSection,
  LegalTable,
} from '@/components/LegalDocumentLayout';

export const metadata: Metadata = {
  title: '커뮤니티 가이드라인 | 네온 성당',
  description: '네온 성당 커뮤니티 가이드라인 — 법무 검토 전 초안(v0.1)',
};

export default function GuidelinesPage() {
  return (
    <LegalDocumentLayout title="커뮤니티 가이드라인">
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

      <LegalSection title="이 공간이 지키는 약속">
        <p>
          네온 성당은 판단과 비난이 없는 <strong className="text-text-hi">감성 힐링 공간</strong>입니다.
        </p>
        <p>
          여기는 설득·논쟁·평가의 장이 아니라, 고해를 태우고 촛불로만 온기를 나누는 자리입니다. 댓글로 서로를 규정하지 않습니다. 오직 불빛으로만 함께합니다.
        </p>
        <p>
          본 가이드라인은 이용약관과 함께 적용되며, §7.4 안전 요구사항·FR-7 신고·모더레이션을 반영합니다.
        </p>
      </LegalSection>

      <LegalSection title="1. 판단·비난 없는 고해">
        <LegalBulletList
          items={[
            <>
              타인의 고해를 <strong className="text-text-hi">평가·진단·훈계</strong>하지 마세요. 텍스트 반응 기능이 없는 이유입니다.
            </>,
            <>
              촛불은 “동의”가 아니라 <strong className="text-text-hi">“당신 곁에 빛이 있다”</strong>는 온기입니다. 조롱·비꼼 목적의 이용을 금지합니다.
            </>,
            '자신의 고해에도, 남을 지목해 깎아내리는 방식으로 쓰지 마세요.',
          ]}
        />
      </LegalSection>

      <LegalSection title="2. 익명을 지키는 일 — 타인 정보 노출 금지">
        <LegalBulletList
          items={[
            <>
              실명, 닉네임 외 식별자, 전화번호, 주소, SNS 계정, 학교·직장명, 사진으로 특정 가능한 묘사 등 <strong className="text-text-hi">본인·타인을 알아볼 수 있는 정보</strong>를 적지 마세요.
            </>,
            '“우리 반 ○○”, “우리 팀장”, 구체적 사건 일시·장소 조합으로 특정인을 가리키는 서술도 삼가 주세요.',
            '서비스는 개인정보를 수집하지 않습니다. 이용자가 고해 안에 개인정보를 넣는 순간, 그 안전이 깨집니다. (FR-1, §7.1)',
          ]}
        />
      </LegalSection>

      <LegalSection title="3. 유해 콘텐츠 금지">
        <p>다음에 해당하는 고해·행위는 삭제·세션 제한·박제 제외 대상이 될 수 있습니다.</p>
        <LegalBulletList
          items={[
            '불법 행위의 실행·모의·조장',
            '성적 착취, 아동·청소년 대상 유해 표현',
            '혐오·차별(출신, 성별, 장애, 성적 지향 등)',
            <>
              폭력·자해·자살의 <strong className="text-text-hi">선동·미화·구체적 방법 제시</strong>
            </>,
            '스팸, 광고, 외부 유도 목적의 반복 게시',
            '신고·필터·익명 체계를 우회하려는 시도',
          ]}
        />
        <p>
          규칙·키워드 기반 사전 필터가 적용·예정되어 있으며, 완전 차단을 보장하지는 않습니다. 발견 시 신고해 주세요. (FR-7.2)
        </p>
      </LegalSection>

      <LegalSection title="4. 촛불과 소멸, 벽화를 존중하기">
        <LegalBulletList
          items={[
            <>
              고해는 원칙적으로 <strong className="text-text-hi">24시간 후 소멸</strong>합니다. 스크린샷·외부 유포로 “소멸의 약속”을 깨지 마세요. 특히 타인의 고해를 퍼뜨리는 행위는 금지합니다.
            </>,
            '충분한 촛불로 벽화에 남는 글은 공동의 온기가 만든 조각입니다. 박제된 글을 특정·조롱하거나, 작성자를 찾으려 하지 마세요.',
            <>
              작성자가 <strong className="text-text-hi">박제 옵트아웃</strong>을 선택한 경우, 그 선택을 존중합니다.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="5. 위기 앞에서 — 상담 안내 (109)">
        <p>네온 성당의 편지·안내는 전문 상담이 아닙니다.</p>
        <p>
          스스로 또는 주변이 <strong className="text-text-hi">자살·자해 등 위기</strong>에 있다고 느껴지면, 즉시 아래 기관에 연락해 주세요.
        </p>
        <LegalTable
          headers={['기관', '연락처']}
          rows={[
            ['자살예방상담전화', <strong key="109" className="text-text-hi">109</strong>],
            ['정신건강위기상담전화', '1577-0199'],
            ['긴급 구조', '112 / 119'],
          ]}
        />
        <p>
          서비스는 위기 키워드 감지 시 상담 기관 안내를 포함할 수 있습니다. (§7.4, FR-5.5)
          <br />
          위급하면 서비스보다 <strong className="text-text-hi">전화·현장 구조</strong>를 먼저 이용해 주세요.
        </p>
      </LegalSection>

      <LegalSection title="6. 신고가 빛나는 방식">
        <LegalBulletList
          items={[
            '피드에서 가이드라인 위반이 보이면 신고해 주세요.',
            '신고는 처벌이 아니라, 이 성당의 불을 지키는 일입니다.',
            '허위·보복 신고는 제한될 수 있습니다.',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. 우리가 함께 지키는 톤">
        <LegalBulletList
          items={[
            '존중하는 말. 강요하지 않는 침묵. 촛불 하나의 온기.',
            <>
              종교·세계관 연출(고해, 성당, 참회)은 <strong className="text-text-hi">메타포</strong>입니다. 특정 종교 강요나 비하를 위한 공간이 아닙니다.
            </>,
          ]}
        />
        <p>문의: [문의 채널 placeholder]</p>
      </LegalSection>
    </LegalDocumentLayout>
  );
}
