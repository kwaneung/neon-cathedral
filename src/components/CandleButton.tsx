'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CandleButtonProps {
  confessionId: string;
  initialCandles: number;
  hasVoted: boolean;
  onVoteSuccess: (newCandles: number, voted: boolean) => void;
  onVoteError: (errorMsg: string) => void;
  onToggleVote: (
    confessionId: string
  ) => Promise<{ success: boolean; candles?: number; voted?: boolean; error?: string }>;
  /** 부모에서 전달 시 앱 토글과 즉시 동기화 (미전달 시 OS/localStorage 폴백) */
  reducedMotion?: boolean;
}

function useMotionReduced(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fromStorage = localStorage.getItem('reduced_motion') === 'true';
    setReduced(mq.matches || fromStorage);
    const onChange = (e: MediaQueryListEvent) => {
      const storage = localStorage.getItem('reduced_motion') === 'true';
      setReduced(e.matches || storage);
    };
    mq.addEventListener('change', onChange);
    const onStorage = () => {
      const storage = localStorage.getItem('reduced_motion') === 'true';
      setReduced(mq.matches || storage);
    };
    window.addEventListener('storage', onStorage);
    return () => {
      mq.removeEventListener('change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return reduced;
}

type FlameFx = 'rise' | 'fall' | null;

export const CandleButton: React.FC<CandleButtonProps> = ({
  confessionId,
  initialCandles,
  hasVoted,
  onVoteSuccess,
  onVoteError,
  onToggleVote,
  reducedMotion: reducedMotionProp,
}) => {
  const [candles, setCandles] = useState(initialCandles);
  const [voted, setVoted] = useState(hasVoted);
  const [flameFx, setFlameFx] = useState<FlameFx>(null);
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);
  const fxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const systemMotionReduced = useMotionReduced();
  const motionReduced = reducedMotionProp ?? systemMotionReduced;

  useEffect(() => {
    setCandles(initialCandles);
    setVoted(hasVoted);
  }, [initialCandles, hasVoted]);

  useEffect(() => {
    return () => {
      if (fxTimerRef.current) clearTimeout(fxTimerRef.current);
    };
  }, []);

  const playFx = (fx: FlameFx) => {
    if (motionReduced || !fx) {
      setFlameFx(null);
      return;
    }
    setFlameFx(fx);
    if (fxTimerRef.current) clearTimeout(fxTimerRef.current);
    fxTimerRef.current = setTimeout(() => setFlameFx(null), 520);
  };

  const handleToggle = async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsPending(true);

    const prevVoted = voted;
    const prevCandles = candles;
    const nextVoted = !prevVoted;
    const nextCandles = Math.max(0, prevCandles + (nextVoted ? 1 : -1));

    // 낙관적 업데이트 + 연출
    setVoted(nextVoted);
    setCandles(nextCandles);
    playFx(nextVoted ? 'rise' : 'fall');

    try {
      const res = await onToggleVote(confessionId);
      if (res.success && res.candles !== undefined && typeof res.voted === 'boolean') {
        setCandles(res.candles);
        setVoted(res.voted);
        onVoteSuccess(res.candles, res.voted);
      } else {
        setVoted(prevVoted);
        setCandles(prevCandles);
        setFlameFx(null);
        onVoteError(res.error || '촛불을 토글하지 못했습니다.');
      }
    } catch (_err) {
      setVoted(prevVoted);
      setCandles(prevCandles);
      setFlameFx(null);
      onVoteError('촛불 수송 장애가 발생했습니다.');
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  };

  const flameAnimate =
    flameFx === 'rise' && !motionReduced
      ? { y: [10, -2, 0], scale: [0.72, 1.28, 1], opacity: [0.35, 1, 1] }
      : flameFx === 'fall' && !motionReduced
        ? { y: [0, 8, 14], scale: [1, 0.85, 0.55], opacity: [1, 0.55, 0.15] }
        : { y: 0, scale: 1, opacity: 1 };

  const buttonAnimate =
    flameFx === 'rise' && !motionReduced
      ? { scale: [1, 1.18, 1] }
      : flameFx === 'fall' && !motionReduced
        ? { scale: [1, 0.92, 1] }
        : { scale: 1 };

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {flameFx === 'rise' && !motionReduced && (
          <motion.div
            key="rise-glow"
            initial={{ opacity: 0, scale: 0.6, y: 8 }}
            animate={{ opacity: [0.15, 0.55, 0.22], scale: [0.7, 1.55, 1.15], y: [8, -4, 0] }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 -m-10 rounded-full mix-blend-screen"
            style={{
              background:
                'radial-gradient(circle, rgba(255,196,107,0.55) 0%, rgba(224,83,58,0.14) 42%, transparent 72%)',
              filter: 'blur(12px)',
              zIndex: 0,
            }}
          />
        )}
        {flameFx === 'fall' && !motionReduced && (
          <motion.div
            key="fall-ember"
            initial={{ opacity: 0.4, scale: 1, y: 0 }}
            animate={{ opacity: [0.35, 0.18, 0], scale: [1, 0.75, 0.45], y: [0, 10, 18] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.48, ease: [0.4, 0, 0.2, 1] }}
            className="pointer-events-none absolute inset-0 -m-8 rounded-full mix-blend-screen"
            style={{
              background:
                'radial-gradient(circle, rgba(224,83,58,0.35) 0%, rgba(255,196,107,0.12) 45%, transparent 70%)',
              filter: 'blur(10px)',
              zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      {voted && !motionReduced && flameFx !== 'fall' && (
        <div
          className="pointer-events-none absolute inset-0 -m-6 rounded-full mix-blend-screen animate-candle-flicker"
          style={{
            background: 'radial-gradient(circle, rgba(255,196,107,0.18) 0%, transparent 70%)',
            filter: 'blur(8px)',
            zIndex: 0,
          }}
        />
      )}

      <motion.button
        type="button"
        aria-pressed={voted}
        aria-label={voted ? '촛불 끄기' : '촛불 켜기'}
        disabled={isPending}
        onClick={() => void handleToggle()}
        onContextMenu={(e) => e.preventDefault()}
        animate={buttonAnimate}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 flex h-14 w-14 min-h-11 min-w-11 items-center justify-center rounded-full border transition-colors duration-[240ms] focus:outline-none focus-visible:ring-2 focus-visible:ring-flame/50 select-none touch-manipulation disabled:opacity-80 ${
          voted
            ? 'border-flame/70 bg-gradient-to-br from-flame/20 to-flame-ember/10 text-flame shadow-glow-flame'
            : 'border-line bg-surface-raised/60 text-text-mute hover:scale-[1.02] hover:border-line-strong hover:text-text-body'
        }`}
        style={{
          cursor: isPending ? 'wait' : 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <motion.span
          className="pointer-events-none flex items-center justify-center"
          animate={flameAnimate}
          transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        >
          <Flame
            className={`h-5 w-5 transition-colors duration-300 ${
              voted
                ? `fill-flame text-flame ${motionReduced || flameFx === 'fall' ? '' : 'animate-candle-flicker'}`
                : flameFx === 'fall'
                  ? 'text-flame-ember/70'
                  : ''
            }`}
          />
        </motion.span>
      </motion.button>

      <div
        className={`relative mt-2 h-4 overflow-hidden text-caption font-medium tabular-nums select-none ${
          voted ? 'text-flame' : 'text-text-mute'
        }`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <span className="sr-only">촛불 {candles}</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={candles}
            aria-hidden
            initial={
              motionReduced
                ? false
                : flameFx === 'rise'
                  ? { y: 10, opacity: 0 }
                  : flameFx === 'fall'
                    ? { y: -10, opacity: 0 }
                    : { y: 6, opacity: 0 }
            }
            animate={{ y: 0, opacity: 1 }}
            exit={
              motionReduced
                ? undefined
                : flameFx === 'rise'
                  ? { y: -10, opacity: 0 }
                  : flameFx === 'fall'
                    ? { y: 10, opacity: 0 }
                    : { y: -6, opacity: 0 }
            }
            transition={{ duration: motionReduced ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="block"
          >
            촛불 {candles}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CandleButton;
