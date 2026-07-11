'use server';

import { getOrCreateSession, getSession } from '@/lib/session';
import { 
  addConfession, 
  addReply, 
  addCandle, 
  cleanExpiredConfessions, 
  getUserReplies,
  getPendingReplies,
  markReplyAsRead,
  getUnreadReplyCount,
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

// 2. 촛불 켜기 (공감)
export async function toggleCandleAction(
  confessionId: string
): Promise<{ success: boolean; candles?: number; error?: string }> {
  try {
    const session = await getOrCreateSession();
    
    // 촛불 업데이트 (await 추가)
    const result = await addCandle(confessionId, session.id);

    if (!result.success) {
      return { success: false, error: '이미 이 고해에 촛불을 밝혔습니다.' };
    }

    // 캐시 태그 업데이트
    updateTag('confessions');

    return { success: true, candles: result.candles };
  } catch (error) {
    console.error('Failed to toggle candle:', error);
    return { success: false, error: '촛불을 밝히는 중 오류가 발생했습니다.' };
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
    // Supabase 쿼리: is_archived가 true인 박제된 글들만 최신순 조회
    const { data, error } = await supabase
      .from('confessions')
      .select('*')
      .eq('is_archived', true)
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
