'use server';

import { getOrCreateSession, getSession } from '@/lib/session';
import { 
  addConfession, 
  addReply, 
  toggleCandle, 
  cleanExpiredConfessions, 
  getUserReplies,
  getPendingReplies,
  markReplyAsRead,
  getUnreadReplyCount,
  getGlassThreshold,
  unarchiveConfession,
  DEFAULT_GLASS_THRESHOLD,
  Confession, 
  Reply,
  PendingReply,
  mapDbConfessionToSchema 
} from '@/lib/db';
import { generateLetterContent } from '@/lib/letters';
import { updateTag } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';

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
    const id = randomUUID();
    const createdAt = new Date();
    
    // 24시간 뒤 만료
    const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

    // 고해 등록 (await 추가)
    await addConfession({
      id,
      authorId: session.id,
      authorName: session.name,
      content: content.trim(),
      tone,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    // 5분 후 도착하는 답장 편지 생성
    const DELAY_MS = 5 * 60 * 1000; // 5분
    const sentAt = new Date(createdAt.getTime() + DELAY_MS);
    const replyContent = generateLetterContent(content, tone);

    // 답장 등록 (await 추가)
    await addReply({
      id: randomUUID(),
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

// 2. 촛불 토글 (켜기/끄기)
export async function toggleCandleAction(
  confessionId: string
): Promise<{ success: boolean; candles?: number; voted?: boolean; error?: string }> {
  try {
    const session = await getOrCreateSession();
    if (!confessionId) {
      return { success: false, error: '고해 ID가 필요합니다.' };
    }

    const result = await toggleCandle(confessionId, session.id);

    if (!result.success) {
      return { success: false, error: '촛불을 토글하지 못했습니다.' };
    }

    updateTag('confessions');

    return {
      success: true,
      candles: result.candles,
      voted: result.voted,
    };
  } catch (error) {
    console.error('Failed to toggle candle:', error);
    return { success: false, error: '촛불을 토글하는 중 오류가 발생했습니다.' };
  }
}

// 3. 본당 피드 리스트 가져오기 (Supabase 조회 연동)
export async function getFeedConfessionsAction(): Promise<Confession[]> {
  try {
    // 만료된 글 정리 (백그라운드 실행)
    await cleanExpiredConfessions();

    const nowStr = new Date().toISOString();
    
    // Supabase 쿼리: is_archived가 false이고 expires_at이 현재보다 미래인 글 조회
    const { data, error } = await supabase
      .from('confessions')
      .select('*')
      .eq('is_archived', false)
      .gt('expires_at', nowStr)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to query active confessions from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDbConfessionToSchema);
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
    return await getUserReplies(session.id);
  } catch (error) {
    console.error('Failed to get user replies:', error);
    return [];
  }
}

// 4b. 대기 중(봉인) 답장 조회
export async function getPendingRepliesAction(): Promise<PendingReply[]> {
  try {
    const session = await getSession();
    if (!session) return [];
    return await getPendingReplies(session.id);
  } catch (error) {
    console.error('Failed to get pending replies:', error);
    return [];
  }
}

// 4c. 답장 읽음 처리 (본인 세션만)
export async function markReplyAsReadAction(
  replyId: string
): Promise<{ success: boolean }> {
  try {
    const session = await getSession();
    if (!session) return { success: false };
    if (!replyId) return { success: false };
    return await markReplyAsRead(replyId, session.id);
  } catch (error) {
    console.error('Failed to mark reply as read:', error);
    return { success: false };
  }
}

// 4d. 미읽음 답장 수
export async function getUnreadReplyCountAction(): Promise<number> {
  try {
    const session = await getSession();
    if (!session) return 0;
    return await getUnreadReplyCount(session.id);
  } catch (error) {
    console.error('Failed to get unread reply count:', error);
    return 0;
  }
}

// 5. 스테인드글라스 박제 목록 가져오기 (Supabase 조회 연동)
export async function getStainedGlassAction(): Promise<Confession[]> {
  try {
    // is_archived + opted_out=false (옵트아웃 시 is_archived=false가 되지만 방어적으로 제외)
    const { data, error } = await supabase
      .from('confessions')
      .select('*')
      .eq('is_archived', true)
      .eq('opted_out', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to query archived confessions from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDbConfessionToSchema);
  } catch (error) {
    console.error('Failed to get stained glass confessions:', error);
    return [];
  }
}

// 6. 사용자의 현재 익명 세션 정보 가져오기 (헤더/프로필용)
export async function getCurrentUserSession() {
  return await getOrCreateSession();
}

/** FR-4.5: 클라이언트 표시용 박제 임계값 */
export async function getGlassThresholdAction(): Promise<number> {
  try {
    return await getGlassThreshold();
  } catch (error) {
    console.error('Failed to get glass threshold:', error);
    return DEFAULT_GLASS_THRESHOLD;
  }
}

/**
 * FR-4.2: 작성자 박제 옵트아웃.
 * 후속 과제: 박제 시점 능동 알림(편지봉투 등)은 스코프 제외 — 본인 조각 UI로 대체.
 */
export async function optOutStainedGlassAction(
  confessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: '세션이 없습니다. 성당에 다시 입장해 주세요.' };
    }
    if (!confessionId) {
      return { success: false, error: '고해 ID가 필요합니다.' };
    }

    const result = await unarchiveConfession(confessionId, session.id);
    if (result.success) {
      updateTag('confessions');
    }
    return result;
  } catch (error) {
    console.error('Failed to opt out stained glass:', error);
    return { success: false, error: '박제 해제 중 오류가 발생했습니다.' };
  }
}
