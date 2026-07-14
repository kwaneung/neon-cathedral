/** 작성자 박제 능동 알림 — 확인한 벽화 조각 id (클라이언트 전용, 스키마 무변경) */

const STORAGE_KEY = 'neon_cathedral_seen_archive_ids';

export function getSeenArchiveIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

export function markArchiveIdsSeen(ids: Iterable<string>): void {
  const next = getSeenArchiveIds();
  let changed = false;
  for (const id of ids) {
    if (!next.has(id)) {
      next.add(id);
      changed = true;
    }
  }
  if (!changed) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
}

export function findUnseenAuthorArchiveIds(
  pieces: { id: string; authorId: string }[],
  authorId: string,
): string[] {
  const seen = getSeenArchiveIds();
  return pieces
    .filter((piece) => piece.authorId === authorId && !seen.has(piece.id))
    .map((piece) => piece.id);
}
