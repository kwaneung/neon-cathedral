import fs from 'fs';
import path from 'path';

// DB 파일 경로 지정
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

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

interface DatabaseSchema {
  visitorCounter: number;
  confessions: Confession[];
  replies: Reply[];
}

const DEFAULT_DB: DatabaseSchema = {
  visitorCounter: 0,
  confessions: [],
  replies: [],
};

// DB 초기화 함수
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
}

// DB 읽기
export function readDb(): DatabaseSchema {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error('Error reading database file, returning default:', error);
    return DEFAULT_DB;
  }
}

// DB 쓰기
export function writeDb(data: DatabaseSchema): void {
  initDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing to database file:', error);
  }
}

// 다음 익명 식별자 번호 발급
export function getNextVisitorNumber(): number {
  const db = readDb();
  db.visitorCounter += 1;
  writeDb(db);
  return db.visitorCounter;
}

// 고해 등록
export function addConfession(confession: Omit<Confession, 'candles' | 'isArchived' | 'candleVoters'>): void {
  const db = readDb();
  db.confessions.push({
    ...confession,
    candles: 0,
    isArchived: false,
    candleVoters: [],
  });
  writeDb(db);
}

// 촛불 업데이트 및 박제 로직
// 임계값 (기본 100개, 테스트를 위해 낮출 수도 있으나 요구사항 명세 v0.1 기준 100개. 
// 개발 및 시연 편의를 위해 임계값을 상수로 분리)
export const GLASS_THRESHOLD = 5; // 개발 중 테스트 편의를 위해 일단 5개로 지정 (요구사항은 100개이나 서버 설정으로 조정 가능해야 하므로)

export function addCandle(confessionId: string, userId: string): { success: boolean; candles: number; isArchived: boolean } {
  const db = readDb();
  const confession = db.confessions.find((c) => c.id === confessionId);
  if (!confession) return { success: false, candles: 0, isArchived: false };

  // 1인 1회 투표 제어
  if (confession.candleVoters.includes(userId)) {
    return { success: false, candles: confession.candles, isArchived: confession.isArchived };
  }

  confession.candleVoters.push(userId);
  confession.candles += 1;

  if (confession.candles >= GLASS_THRESHOLD && !confession.isArchived) {
    confession.isArchived = true;
  }

  writeDb(db);
  return { success: true, candles: confession.candles, isArchived: confession.isArchived };
}

// 만료된 고민 글 삭제 (정리 스케줄러 대체용 함수)
// 촛불이 GLASS_THRESHOLD 미만이고 만료 시간이 지난 글은 하드 삭제한다.
// 5분 내에 답장 편지가 도착해야 하므로, 생성 후 최소 5분간은 데이터가 보존되어야 한다.
export function cleanExpiredConfessions(): void {
  const db = readDb();
  const now = new Date();
  
  db.confessions = db.confessions.filter((c) => {
    // 박제된 글(isArchived === true)은 영구 보존
    if (c.isArchived) return true;
    
    const expiresAt = new Date(c.expiresAt);
    return expiresAt > now; // 만료되지 않은 글만 남김
  });
  
  writeDb(db);
}

// 답장 추가
export function addReply(reply: Reply): void {
  const db = readDb();
  db.replies.push(reply);
  writeDb(db);
}

// 사용자의 답장 리스트 가져오기
export function getUserReplies(userId: string): Reply[] {
  const db = readDb();
  const now = new Date();
  
  // 보낸 시간(sentAt)이 현재 시간보다 이전(5분 지연 조건)인 편지만 노출
  return db.replies.filter((r) => r.recipientId === userId && new Date(r.sentAt) <= now);
}
