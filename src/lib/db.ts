import { supabase } from './supabase';

export interface Confession {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  tone: 'angel' | 'devil';
  candles: number;
  createdAt: string;
  expiresAt: string;
  isArchived: boolean;
  candleVoters: string[];
  optedOut?: boolean;
}

export interface Reply {
  id: string;
  confessionId: string;
  recipientId: string;
  tone: 'angel' | 'devil';
  content: string;
  sentAt: string;
  isRead: boolean;
}

export interface PendingReply {
  id: string;
  confessionId: string;
  tone: 'angel' | 'devil';
  sentAt: string;
  remainingSeconds: number;
}

type DbReplyRow = {
  id: string;
  confession_id: string;
  recipient_id: string;
  tone: 'angel' | 'devil';
  content: string;
  sent_at: string;
  is_read: boolean;
};

function mapDbReplyToSchema(r: DbReplyRow): Reply {
  return {
    id: r.id,
    confessionId: r.confession_id,
    recipientId: r.recipient_id,
    tone: r.tone,
    content: r.content,
    sentAt: r.sent_at,
    isRead: r.is_read,
  };
}

export const DEFAULT_GLASS_THRESHOLD = 5;

let glassThresholdCache: { value: number; fetchedAt: number } | null = null;
const GLASS_THRESHOLD_CACHE_MS = 60_000;

/** FR-4.5: app_settings.glass_threshold 조회. 실패 시 100 폴백. 요청 간 간단 캐시. */
export async function getGlassThreshold(): Promise<number> {
  const now = Date.now();
  if (
    glassThresholdCache &&
    now - glassThresholdCache.fetchedAt < GLASS_THRESHOLD_CACHE_MS
  ) {
    return glassThresholdCache.value;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'glass_threshold')
      .maybeSingle();

    if (error || data == null) {
      console.error('Failed to load glass_threshold; using fallback 100:', error);
      return DEFAULT_GLASS_THRESHOLD;
    }

    const raw = data.value;
    const parsed =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(raw)
          : Number(raw);

    const value =
      Number.isFinite(parsed) && parsed > 0
        ? Math.floor(parsed)
        : DEFAULT_GLASS_THRESHOLD;

    glassThresholdCache = { value, fetchedAt: now };
    return value;
  } catch (e) {
    console.error('getGlassThreshold error; using fallback 100:', e);
    return DEFAULT_GLASS_THRESHOLD;
  }
}

// 1. 다음 익명 식별자 번호 발급 (RPC 호출)
export async function getNextVisitorNumber(): Promise<number> {
  const { data, error } = await supabase.rpc('increment_visitor');
  if (error) {
    console.error('Failed to increment visitor counter:', error);
    // 폴백: 임의의 큰 수
    return Math.floor(Math.random() * 1000) + 1;
  }
  return data as number;
}

// 2. 고해 등록
export async function addConfession(confession: Omit<Confession, 'candles' | 'isArchived' | 'candleVoters'>): Promise<void> {
  const { error } = await supabase.from('confessions').insert({
    id: confession.id,
    author_id: confession.authorId,
    author_name: confession.authorName,
    content: confession.content,
    tone: confession.tone,
    created_at: confession.createdAt,
    expires_at: confession.expiresAt,
    candles: 0,
    is_archived: false,
    opted_out: false,
    candle_voters: []
  });

  if (error) {
    console.error('Failed to add confession to Supabase:', error);
    throw new Error('데이터베이스 저장 실패');
  }
}

// 3. 촛불 토글(켜기/끄기) — 박제 판정은 만료 정산(settle)에서 수행
export async function toggleCandle(
  confessionId: string,
  userId: string
): Promise<{ success: boolean; candles: number; isArchived: boolean; voted: boolean }> {
  const { data, error } = await supabase.rpc('toggle_candle', {
    confession_id: confessionId,
    user_id: userId,
  });

  if (error) {
    console.error('Failed to execute toggle_candle RPC:', error);
    return { success: false, candles: 0, isArchived: false, voted: false };
  }

  const result = data as {
    success: boolean;
    candles: number;
    isArchived: boolean;
    voted: boolean;
  };
  return result;
}

// 4. 만료 고해 정산 (임계값 이상 → 박제, 미만 → 하드 삭제)
export async function cleanExpiredConfessions(): Promise<void> {
  const { error } = await supabase.rpc('settle_expired_confessions');

  if (error) {
    console.error('Failed to settle expired confessions:', error);
  }
}

/**
 * FR-4.2: 작성자 박제 옵트아웃.
 * is_archived=false + opted_out=true + expires_at=now → 다음 settle_expired에서 삭제.
 * 박제 시점 능동 알림은 클라이언트 localStorage + 토스트로 처리 (스키마 무변경).
 */
export async function unarchiveConfession(
  confessionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: row, error: fetchError } = await supabase
    .from('confessions')
    .select('id, author_id, is_archived')
    .eq('id', confessionId)
    .maybeSingle();

  if (fetchError) {
    console.error('Failed to fetch confession for opt-out:', fetchError);
    return { success: false, error: '박제 해제에 실패했습니다.' };
  }

  if (!row) {
    return { success: false, error: '해당 고해를 찾을 수 없습니다.' };
  }

  if (row.author_id !== userId) {
    return { success: false, error: '본인이 작성한 고해만 박제를 해제할 수 있습니다.' };
  }

  if (!row.is_archived) {
    return { success: false, error: '박제된 고해가 아닙니다.' };
  }

  // 정산 모델에서 박제된 글은 이미 만료 이후이므로 expires_at 갱신 불필요 —
  // 박제 자격만 반납하면 다음 정산(settle_expired_confessions)에서 삭제된다.
  const { data: updated, error: updateError } = await supabase
    .from('confessions')
    .update({
      is_archived: false,
      opted_out: true,
    })
    .eq('id', confessionId)
    .eq('author_id', userId)
    .select('id');

  if (updateError) {
    console.error('Failed to unarchive confession:', updateError);
    return { success: false, error: '박제 해제에 실패했습니다.' };
  }

  if (!updated || updated.length === 0) {
    return { success: false, error: '박제 해제에 실패했습니다.' };
  }

  return { success: true };
}

// 5. 답장 추가
export async function addReply(reply: Reply): Promise<void> {
  const { error } = await supabase.from('replies').insert({
    id: reply.id,
    confession_id: reply.confessionId,
    recipient_id: reply.recipientId,
    tone: reply.tone,
    content: reply.content,
    sent_at: reply.sentAt,
    is_read: reply.isRead
  });

  if (error) {
    console.error('Failed to add reply to Supabase:', error);
  }
}

// 6. 사용자의 답장 리스트 가져오기 (5분 지연 조건 반영)
export async function getUserReplies(userId: string): Promise<Reply[]> {
  const nowStr = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('replies')
    .select('*')
    .eq('recipient_id', userId)
    .lte('sent_at', nowStr)
    .order('sent_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch replies from Supabase:', error);
    return [];
  }

  return (data || []).map((r) => mapDbReplyToSchema(r as DbReplyRow));
}

// 6b. 아직 도착하지 않은(봉인) 답장 조회
export async function getPendingReplies(userId: string): Promise<PendingReply[]> {
  const now = new Date();
  const nowStr = now.toISOString();

  const { data, error } = await supabase
    .from('replies')
    .select('id, confession_id, tone, sent_at')
    .eq('recipient_id', userId)
    .gt('sent_at', nowStr)
    .order('sent_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch pending replies from Supabase:', error);
    return [];
  }

  return (data || []).map((r: {
    id: string;
    confession_id: string;
    tone: 'angel' | 'devil';
    sent_at: string;
  }) => {
    const sentAtMs = new Date(r.sent_at).getTime();
    const remainingSeconds = Math.max(0, Math.ceil((sentAtMs - now.getTime()) / 1000));
    return {
      id: r.id,
      confessionId: r.confession_id,
      tone: r.tone,
      sentAt: r.sent_at,
      remainingSeconds,
    };
  });
}

// 6c. 답장 읽음 처리 (본인 recipient_id만)
export async function markReplyAsRead(
  replyId: string,
  userId: string
): Promise<{ success: boolean }> {
  const { data, error } = await supabase
    .from('replies')
    .update({ is_read: true })
    .eq('id', replyId)
    .eq('recipient_id', userId)
    .select('id');

  if (error) {
    console.error('Failed to mark reply as read:', error);
    return { success: false };
  }

  if (!data || data.length === 0) {
    return { success: false };
  }

  return { success: true };
}

// 6d. 도착·미읽음 답장 수
export async function getUnreadReplyCount(userId: string): Promise<number> {
  const nowStr = new Date().toISOString();

  const { count, error } = await supabase
    .from('replies')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .lte('sent_at', nowStr)
    .eq('is_read', false);

  if (error) {
    console.error('Failed to count unread replies:', error);
    return 0;
  }

  return count ?? 0;
}

// 7. 전체 DB 리스트 조회를 위한 Helper Mapper (Confession 맵핑)
export function mapDbConfessionToSchema(raw: {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  tone: string;
  candles: number;
  created_at: string;
  expires_at: string;
  is_archived: boolean;
  candle_voters?: string[];
  opted_out?: boolean;
}): Confession {
  return {
    id: raw.id,
    authorId: raw.author_id,
    authorName: raw.author_name,
    content: raw.content,
    tone: raw.tone as 'angel' | 'devil',
    candles: raw.candles,
    createdAt: raw.created_at,
    expiresAt: raw.expires_at,
    isArchived: raw.is_archived,
    candleVoters: raw.candle_voters || [],
    optedOut: raw.opted_out ?? false,
  };
}
