'use client';

import { useEffect, useState } from 'react';
import { Lock, Mail, MailOpen } from 'lucide-react';
import { motion } from 'motion/react';

type LetterTone = 'angel' | 'devil';
type LetterCardVisualState = 'sealed' | 'arrived_unread' | 'read';

type SealedLetterCardProps = {
  id: string;
  tone: LetterTone;
  content: string;
  sentAt: string;
  isRead: boolean;
  remainingSeconds?: number;
  reducedMotion?: boolean;
  onOpen: (replyId: string) => Promise<void> | void;
};

function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function resolveState(
  sentAt: string,
  isRead: boolean,
  nowMs: number
): LetterCardVisualState {
  if (nowMs < new Date(sentAt).getTime()) return 'sealed';
  if (!isRead) return 'arrived_unread';
  return 'read';
}

export function SealedLetterCard({
  id,
  tone,
  content,
  sentAt,
  isRead,
  reducedMotion = false,
  onOpen,
}: SealedLetterCardProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isOpening, setIsOpening] = useState(false);
  const [optimisticRead, setOptimisticRead] = useState(false);

  const effectiveRead = isRead || optimisticRead;

  useEffect(() => {
    const sentAtMs = new Date(sentAt).getTime();
    if (Date.now() >= sentAtMs) return;

    const idTimer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (current >= sentAtMs) {
        window.clearInterval(idTimer);
      }
    }, 1000);

    return () => window.clearInterval(idTimer);
  }, [sentAt]);

  const visualState = resolveState(sentAt, effectiveRead, nowMs);
  const computedRemaining = Math.max(
    0,
    Math.ceil((new Date(sentAt).getTime() - nowMs) / 1000)
  );

  const toneLabel = tone === 'angel' ? "Angel's comfort" : "Devil's Whisper";
  const toneDot = tone === 'angel' ? 'bg-cyan-400' : 'bg-rose-500';
  const sealedBorder =
    tone === 'angel' ? 'border-cyan-500/15' : 'border-rose-500/15';
  const unreadBorder =
    tone === 'angel'
      ? 'border-cyan-500/35 neon-glow-cyan shadow-[0_0_28px_rgba(6,182,212,0.18)]'
      : 'border-rose-500/35 neon-glow-rose shadow-[0_0_28px_rgba(244,63,94,0.18)]';

  const handleOpen = async () => {
    if (visualState !== 'arrived_unread' || isOpening) return;
    setIsOpening(true);

    try {
      await onOpen(id);
      if (reducedMotion) {
        setOptimisticRead(true);
        setIsOpening(false);
        return;
      }
      window.setTimeout(() => {
        setOptimisticRead(true);
        setIsOpening(false);
      }, 800);
    } catch {
      setIsOpening(false);
    }
  };

  if (visualState === 'read' && !isOpening) {
    return (
      <motion.div
        layout
        className="relative rounded-3xl border border-white/[0.04] bg-[#07070a]/40 p-6 shadow-2xl backdrop-blur-2xl transition-all duration-300 hover:border-white/[0.08]"
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.03] pb-3.5 text-[10px] font-light text-zinc-500">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full blur-[1px] ${toneDot}`} />
            <span className="font-sans font-bold tracking-widest uppercase">
              {toneLabel}
            </span>
          </span>
          <span className="font-sans text-zinc-600">
            {new Date(sentAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            전송됨
          </span>
        </div>
        <p className="whitespace-pre-wrap font-serif text-sm font-light leading-relaxed tracking-wide text-zinc-300">
          {content}
        </p>
      </motion.div>
    );
  }

  if (visualState === 'sealed') {
    const mm = Math.floor(computedRemaining / 60);
    const ss = computedRemaining % 60;
    return (
      <div
        aria-disabled="true"
        aria-label={`봉인된 편지, 도착까지 ${mm}분 ${ss}초, ${tone === 'angel' ? '천사' : '악마'}`}
        className={`pointer-events-none relative rounded-3xl border bg-[#07070a]/40 p-6 backdrop-blur-2xl ${sealedBorder} opacity-90`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/[0.03] pb-3.5 text-[10px] font-light text-zinc-500">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full blur-[1px] ${toneDot} opacity-40`} />
            <span className="font-sans font-bold tracking-widest uppercase opacity-70">
              {toneLabel}
            </span>
          </span>
          <span className="flex items-center gap-1.5 font-sans text-zinc-500">
            <Lock className="h-4 w-4" aria-hidden="true" />
            봉인됨
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <Mail className="h-10 w-10 text-zinc-700" aria-hidden="true" />
          <div className="flex w-full flex-col gap-2 px-2">
            <div className="h-3 rounded bg-zinc-800/80 blur-[2px]" />
            <div className="h-3 w-5/6 rounded bg-zinc-800/80 blur-[2px]" />
            <div className="h-3 w-2/3 rounded bg-zinc-800/80 blur-[2px]" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 border-t border-white/[0.03] pt-4">
          <span className="text-[11px] font-sans font-light tracking-wide text-zinc-500">
            도착까지
          </span>
          <span className="letter-timer font-mono text-sm tabular-nums tracking-[0.12em] text-amber-300">
            {formatMmSs(computedRemaining)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`도착한 편지 개봉하기, ${tone === 'angel' ? '천사' : '악마'}`}
      onClick={handleOpen}
      disabled={isOpening}
      className={`relative w-full cursor-pointer rounded-3xl border bg-[#07070a]/40 p-6 text-left backdrop-blur-2xl transition-all duration-300 ${unreadBorder} ${
        reducedMotion || isOpening ? '' : 'border-shimmering'
      } ${isOpening && !reducedMotion ? 'animate-letter-seal-open' : ''}`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-white/[0.03] pb-3.5 text-[10px] font-light text-zinc-500">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full blur-[1px] ${toneDot}`} />
          <span className="font-sans font-bold tracking-widest uppercase">
            {toneLabel}
          </span>
        </span>
        <MailOpen className="h-4 w-4 text-amber-400" aria-hidden="true" />
      </div>

      {isOpening && !reducedMotion ? (
        <p className="whitespace-pre-wrap font-serif text-sm font-light leading-relaxed tracking-wide text-zinc-300 opacity-90">
          {content}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          <Mail className="h-10 w-10 text-amber-500/80" aria-hidden="true" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-amber-400">
            터치하여 개봉
          </span>
        </div>
      )}
    </button>
  );
}
