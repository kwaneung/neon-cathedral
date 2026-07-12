'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CandleButtonProps {
  confessionId: string;
  initialCandles: number;
  hasVoted: boolean;
  onVoteSuccess: (newCandles: number) => void;
  onVoteError: (errorMsg: string) => void;
  onToggleVote: (confessionId: string) => Promise<{ success: boolean; candles?: number; error?: string }>;
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
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const [justLit, setJustLit] = useState(false);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const systemMotionReduced = useMotionReduced();
  const motionReduced = reducedMotionProp ?? systemMotionReduced;

  useEffect(() => {
    setCandles(initialCandles);
    setVoted(hasVoted);
  }, [initialCandles, hasVoted]);

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (voted) return;
    e.preventDefault();
    setIsPressing(true);
    setPressProgress(0);

    const startTime = Date.now();
    const duration = 1200;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setPressProgress(progress);

      if (progress >= 100) {
        handlePressComplete();
      }
    }, 25);
  };

  const handlePressEnd = () => {
    if (!isPressing) return;
    setIsPressing(false);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    
    let currentProgress = pressProgress;
    const fadeOutInterval = setInterval(() => {
      currentProgress -= 10;
      if (currentProgress <= 0) {
        setPressProgress(0);
        clearInterval(fadeOutInterval);
      } else {
        setPressProgress(currentProgress);
      }
    }, 15);
  };

  const handlePressComplete = async () => {
    setIsPressing(false);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    setPressProgress(100);

    try {
      const res = await onToggleVote(confessionId);
      if (res.success && res.candles !== undefined) {
        setCandles(res.candles);
        setVoted(true);
        if (!motionReduced) {
          setJustLit(true);
          window.setTimeout(() => setJustLit(false), 500);
        }
        onVoteSuccess(res.candles);
      } else if (res.error) {
        onVoteError(res.error);
        setPressProgress(0);
      }
    } catch (_err) {
      onVoteError('촛불 수송 장애가 발생했습니다.');
      setPressProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isPressing && !motionReduced && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: (pressProgress / 100) * 0.5 + 0.1, 
              scale: 1 + (pressProgress / 100) * 1.6 
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pointer-events-none absolute inset-0 -m-10 rounded-full mix-blend-screen"
            style={{
              background: 'radial-gradient(circle, rgba(255,196,107,0.5) 0%, rgba(224,83,58,0.12) 40%, transparent 70%)',
              filter: 'blur(12px)',
              zIndex: 0
            }}
          />
        )}
      </AnimatePresence>

      {voted && !motionReduced && (
        <div 
          className={`pointer-events-none absolute inset-0 -m-6 rounded-full mix-blend-screen ${motionReduced ? '' : 'animate-candle-flicker'}`}
          style={{
            background: 'radial-gradient(circle, rgba(255,196,107,0.18) 0%, transparent 70%)',
            filter: 'blur(8px)',
            zIndex: 0
          }}
        />
      )}

      <motion.button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onTouchCancel={handlePressEnd}
        onContextMenu={(e) => e.preventDefault()}
        animate={
          justLit && !motionReduced
            ? { scale: [1, 1.25, 1] }
            : { scale: 1 }
        }
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-[240ms] focus:outline-none select-none touch-none ${
          voted
            ? 'border-flame/70 bg-gradient-to-br from-flame/20 to-flame-ember/10 text-flame shadow-glow-flame'
            : isPressing
            ? 'scale-[0.96] border-flame bg-flame/10 text-flame-hi'
            : 'border-line bg-surface-raised/60 text-text-mute hover:scale-[1.02] hover:border-line-strong hover:text-text-body'
        }`}
        style={{
          cursor: voted ? 'default' : 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {!voted && isPressing && (
          <svg className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none">
            <circle
              cx="28"
              cy="28"
              r="26"
              stroke="#1c1730"
              strokeWidth="1.5"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r="26"
              stroke="#ffc46b"
              strokeWidth="1.5"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - pressProgress / 100)}`}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(255,196,107,0.6))'
              }}
            />
          </svg>
        )}

        <Flame 
          className={`h-5 w-5 pointer-events-none transition-all duration-700 ${
            voted
              ? `fill-flame text-flame ${motionReduced ? '' : 'animate-candle-flicker'}`
              : isPressing
                ? 'scale-120 text-flame-hi'
                : ''
          }`} 
        />
      </motion.button>

      <span 
        className={`mt-2 text-caption font-medium tabular-nums transition-all duration-[240ms] select-none ${
          voted ? 'text-flame' : 'text-text-mute'
        }`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        촛불 {candles}
      </span>
    </div>
  );
};
export default CandleButton;
