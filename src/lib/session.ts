import { cookies } from 'next/headers';
import { getNextVisitorNumber } from './db';

export interface UserSession {
  id: string;
  name: string;
  joinedAt: string;
}

const SESSION_COOKIE_NAME = 'neon_cath_session';

// UUID 생성 도우미 (crypto.randomUUID 사용 가능)
function generateUUID(): string {
  return typeof globalThis.crypto?.randomUUID === 'function' 
    ? globalThis.crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// 익명 세션 가져오기 또는 새로 발급하기
export async function getOrCreateSession(): Promise<UserSession> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(sessionCookie.value) as UserSession;
      // [object Promise] 자가 치료(Self-healing) 로직
      if (session.name && session.name.includes('[object Promise]')) {
        console.warn('Detected malformed session name, regenerating...');
      } else {
        return session;
      }
    } catch (e) {
      console.error('Failed to parse session cookie, generating new one:', e);
    }
  }

  // 세션이 없거나 파싱 오류 시 새 세션 생성
  const nextNum = await getNextVisitorNumber();
  const newSession: UserSession = {
    id: generateUUID(),
    name: `${nextNum}번째 고해자`,
    joinedAt: new Date().toISOString(),
  };

  // 쿠키에 30일 동안 저장
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(newSession), {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return newSession;
}

// 현재 세션 조회 (새로 만들지 않고 체크만)
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (sessionCookie?.value) {
    try {
      return JSON.parse(sessionCookie.value) as UserSession;
    } catch (_e) {
      return null;
    }
  }
  return null;
}
