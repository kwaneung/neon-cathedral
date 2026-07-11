'use client';

import { useEffect, useRef, useState } from 'react';
import { Hourglass } from 'lucide-react';

function formatMmSs(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

type LetterCountdownBannerProps = {
  sentAt: string;
  remainingSeconds: number;
  extraPendingCount?: number;
  reducedMotion?: boolean;
  onComplete: () => void;
};

export function LetterCountdownBanner({
  sentAt,
  remainingSeconds,
  extraPendingCount = 0,
  reducedMotion = false,
  onComplete,
}: LetterCountdownBannerProps) {
  const [displaySeconds, setDisplaySeconds] = useState(() =>
    Math.max(0, remainingSeconds)
  );
  const [phase, setPhase] = useState<'visible' | 'exiting' | 'gone'>('visible');
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    completedRef.current = false;
    setPhase('visible');

    const sentAtMs = new Date(sentAt).getTime();
    let exitTimer: number | undefined;
    let intervalId: number | undefined;

    const finish = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      setPhase('gone');
      onCompleteRef.current();
    };

    const onZero = () => {
      if (completedRef.current) return;
      if (reducedMotion) {
        finish();
        return;
      }
      setPhase('exiting');
      exitTimer = window.setTimeout(finish, 400);
    };

    const timeoutId = window.setTimeout(() => {
      const next = Math.max(0, Math.ceil((sentAtMs - Date.now()) / 1000));
      setDisplaySeconds(next);
      if (next <= 0) {
        onZero();
        return;
      }
      intervalId = window.setInterval(() => {
        const n = Math.max(0, Math.ceil((sentAtMs - Date.now()) / 1000));
        setDisplaySeconds(n);
        if (n <= 0) {
          if (intervalId) window.clearInterval(intervalId);
          onZero();
        }
      }, 1000);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
      if (exitTimer) window.clearTimeout(exitTimer);
    };
  }, [sentAt, reducedMotion]);

  if (phase === 'gone') return null;

  const ariaLabel =
    displaySeconds > 0
      ? `답장 도착까지 ${formatMmSs(displaySeconds)}`
      : '답장이 곧 도착합니다';

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={ariaLabel}
      className={`flex min-h-12 items-center gap-3 rounded-md border border-flame/25 bg-surface/80 px-4 py-3 shadow-glow-flame backdrop-blur-xl ${
        phase === 'exiting'
          ? 'animate-banner-exit'
          : reducedMotion
            ? ''
            : 'animate-banner-enter'
      }`}
    >
      <Hourglass
        className={`h-4 w-4 shrink-0 text-flame ${
          reducedMotion ? '' : 'animate-candle-flicker'
        }`}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-caption text-text-mute">
          답장 도착까지
        </span>
        {extraPendingCount > 0 && (
          <span className="text-caption text-text-mute">외 {extraPendingCount}건</span>
        )}
      </div>
      <span className="letter-timer font-mono text-lg tabular-nums text-flame-hi">
        {formatMmSs(displaySeconds)}
      </span>
    </div>
  );
}
