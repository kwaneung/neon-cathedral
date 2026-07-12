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
  const [sealGone, setSealGone] = useState(false);

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

  const toneLabel = tone === 'angel' ? '천사의 위로' : '악마의 속삭임';
  const toneDot = tone === 'angel' ? 'bg-angel shadow-glow-angel' : 'bg-devil shadow-glow-devil';
  const sealedBorder =
    tone === 'angel' ? 'border-angel/15' : 'border-devil/15';
  const unreadBorder =
    tone === 'angel'
      ? 'border-angel/40 shadow-glow-angel'
      : 'border-devil/40 shadow-glow-devil';
  const sealDisk =
    tone === 'angel'
      ? 'border-angel/40 bg-gradient-to-br from-angel/30 to-[#33408f]/40 text-angel'
      : 'border-devil/40 bg-gradient-to-br from-devil/30 to-[#8c2f4a]/40 text-devil';

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
      setSealGone(true);
      window.setTimeout(() => {
        setOptimisticRead(true);
        setIsOpening(false);
        setSealGone(false);
      }, 800);
    } catch {
      setIsOpening(false);
      setSealGone(false);
    }
  };

  if (visualState === 'read' && !isOpening) {
    return (
      <motion.div
        layout
        className="relative rounded-lg border border-line bg-surface/50 p-6 backdrop-blur-xl"
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3.5 text-caption text-text-mute">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${toneDot}`} />
            <span className="font-sans font-bold tracking-normal">
              {toneLabel}
            </span>
          </span>
          <span className="flex items-center gap-1.5 font-sans text-caption text-text-mute tabular-nums">
            <MailOpen className="h-4 w-4" aria-hidden="true" />
            {new Date(sentAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            전송됨
          </span>
        </div>
        <p className="whitespace-pre-wrap break-keep font-serif text-body leading-[1.8] text-text-body">
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
        className={`pointer-events-none relative rounded-lg border bg-surface/70 p-6 opacity-90 backdrop-blur-xl ${sealedBorder}`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-line pb-3.5 text-caption text-text-mute">
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full opacity-40 ${toneDot}`} />
            <span className="font-sans font-bold tracking-normal opacity-70">
              {toneLabel}
            </span>
          </span>
          <span className="flex items-center gap-1.5 font-sans text-text-mute">
            <Lock className="h-4 w-4" aria-hidden="true" />
            봉인됨
          </span>
        </div>

        <div className="flex flex-col items-center gap-4 py-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${sealDisk}`}
            aria-hidden="true"
          >
            <Lock className="h-5 w-5" />
          </div>
          <div className="flex w-full flex-col gap-2 px-2">
            <div className="h-3 rounded bg-line-strong/40 blur-[2px]" />
            <div className="h-3 w-5/6 rounded bg-line-strong/40 blur-[2px]" />
            <div className="h-3 w-2/3 rounded bg-line-strong/40 blur-[2px]" />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 border-t border-line pt-4">
          <span className="text-caption text-text-mute">
            도착까지
          </span>
          <span className="letter-timer font-mono text-sm tabular-nums text-flame-hi">
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
      className={`relative w-full cursor-pointer rounded-lg border bg-surface/70 p-6 text-left backdrop-blur-xl transition-all duration-[240ms] ${unreadBorder} ${
        isOpening && !reducedMotion ? 'animate-letter-seal-open' : ''
      }`}
    >
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3.5 text-caption text-text-mute">
        <span className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${toneDot}`} />
          <span className="font-sans font-bold tracking-normal">
            {toneLabel}
          </span>
        </span>
        <MailOpen className="h-4 w-4 text-flame" aria-hidden="true" />
      </div>

      {isOpening && !reducedMotion ? (
        <p className="whitespace-pre-wrap break-keep font-serif text-body leading-[1.8] text-text-body opacity-90">
          {content}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-3 py-6">
          <motion.div
            aria-hidden="true"
            animate={
              sealGone
                ? { scale: 0, rotate: -20 }
                : { scale: 1, rotate: 0 }
            }
            transition={{ duration: 0.4, ease: [0.55, 0, 0.78, 0.4] }}
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${sealDisk} ${
              reducedMotion ? '' : 'animate-candle-flicker'
            }`}
          >
            <Mail className="h-5 w-5" />
          </motion.div>
          <span className="text-label tracking-(--tracking-hangul) text-flame">
            터치하여 개봉
          </span>
        </div>
      )}
    </button>
  );
}
