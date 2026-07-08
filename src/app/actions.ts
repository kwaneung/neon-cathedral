'use server';

import { getOrCreateSession, getSession } from '@/lib/session';
import { 
  addConfession, 
  addReply, 
  readDb, 
  addCandle, 
  cleanExpiredConfessions, 
  getUserReplies, 
  Confession, 
  Reply 
} from '@/lib/db';
import { generateLetterContent } from '@/lib/letters';
import { revalidateTag, updateTag } from 'next/cache';

// 1. 고해 작성 및 등록 (답장 생성 포함)
export async function submitConfessionAction(
  content: string, 
  tone: 'angel' | 'devil'
): Promise<{ success: boolean; error?: string }> {
  if (!content || content.trim().length === 0) {
    return { success: false, error: '고민 내용을 입력해 주세요.' };
  }
  if (content.length > 2000) {
    return { success: false, error: '고민 내용은 최대 2,000자까지 작성할 수 있습니다.' };
  }

  try {
    const session = await getOrCreateSession();
    const id = Math.random().toString(36).substring(2, 15);
    const createdAt = new Date();
    
    // 24시간 뒤 만료
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    // 고해 등록
    addConfession({
      id,
      authorId: session.id,
      authorName: session.name,
      content: content.trim(),
      tone,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // 5분 후 도착하는 답장 편지 생성
    // (실제 시연/테스트 편의를 위해 5분을 10초로 단축하여 테스트해볼 수 있도록 딜레이 값을 10초로 설정)
    // 요구사항 명세 v0.1은 5분이나, 실제로 5분을 기다려 테스트하기는 어려우므로
    // 기본적으로 10초 딜레이를 주는 환경변수나 조건 처리가 있으면 유용함.
    // 여기서는 개발 편의를 위해 10초(10,000ms) 딜레이를 부여하자! (5분은 300,000ms)
    // 다만 명세에는 '5분 후'라고 명시되어 있으므로 300,000ms를 적용하고, 
    // 본 코드에서는 300,000ms (5분)로 맞추어 설정하되 주석으로 명시한다.
    const DELAY_MS = 5 * 60 * 1000; // 5분
    const sentAt = new Date(createdAt.getTime() + DELAY_MS);
    const replyContent = generateLetterContent(content, tone);

    addReply({
      id: Math.random().toString(36).substring(2, 15),
      confessionId: id,
      recipientId: session.id,
      tone,
      content: replyContent,
      sentAt: sentAt.toISOString(),
      isRead: false,
    });

    // Next.js 16 캐시 갱신
    updateTag('confessions');

    return { success: true };
  } catch (error) {
    console.error('Failed to submit confession:', error);
    return { success: false, error: '서버 오류로 인해 고해를 보내지 못했습니다.' };
  }
}

// 2. 촛불 켜기 (공감)
export async function toggleCandleAction(
  confessionId: string
): Promise<{ success: boolean; candles?: number; error?: string }> {
  try {
    const session = await getOrCreateSession();
    const result = addCandle(confessionId, session.id);

    if (!result.success) {
      return { success: false, error: '이미 이 고해에 촛불을 켰습니다.' };
    }

    // 캐시 태그 업데이트
    updateTag('confessions');

    return { success: true, candles: result.candles };
  } catch (error) {
    console.error('Failed to toggle candle:', error);
    return { success: false, error: '촛불을 켜는 중 오류가 발생했습니다.' };
  }
}

// 3. 본당 피드 리스트 가져오기
export async function getFeedConfessionsAction(): Promise<Confession[]> {
  try {
    // 만료된 글 하드 삭제
    cleanExpiredConfessions();

    const db = readDb();
    
    // 공개 피드에는 아직 박제되지 않은 (또는 100개 미만인 상태의) 활성화된 글을 보여준다.
    // 만료되지 않은 글 중에서 최근 순으로 정렬
    const now = new Date();
    const active = db.confessions.filter(
      (c) => !c.isArchived && new Date(c.expiresAt) > now
    );

    // 최신 등록 순으로 정렬
    return active.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error('Failed to get feed confessions:', error);
    return [];
  }
}

// 4. 편지함 목록 가져오기
export async function getUserRepliesAction(): Promise<Reply[]> {
  try {
    const session = await getSession();
    if (!session) return [];
    return getUserReplies(session.id);
  } catch (error) {
    console.error('Failed to get user replies:', error);
    return [];
  }
}

// 5. 스테인드글라스 박제 목록 가져오기
export async function getStainedGlassAction(): Promise<Confession[]> {
  try {
    const db = readDb();
    // isArchived가 true인 글들만 필터링
    return db.confessions.filter((c) => c.isArchived);
  } catch (error) {
    console.error('Failed to get stained glass confessions:', error);
    return [];
  }
}

// 6. 사용자의 현재 익명 세션 정보 가져오기 (헤더/프로필용)
export async function getCurrentUserSession() {
  return await getOrCreateSession();
}
