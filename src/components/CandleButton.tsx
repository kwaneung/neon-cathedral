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
}

export const CandleButton: React.FC<CandleButtonProps> = ({
  confessionId,
  initialCandles,
  hasVoted,
  onVoteSuccess,
  onVoteError,
  onToggleVote
}) => {
  const [candles, setCandles] = useState(initialCandles);
  const [voted, setVoted] = useState(hasVoted);
  const [pressProgress, setPressProgress] = useState(0);
  const [isPressing, setIsPressing] = useState(false);
  const progressIntervalRef = useRef<any>(null);

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
    const duration = 1200; // 1.2초 동안 홀드 (기다림 시간 최적화)

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
    clearInterval(progressIntervalRef.current);
    
    // 서서히 페이드 아웃되는 역방향 게이지 효과
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
    clearInterval(progressIntervalRef.current);
    setPressProgress(100);

    try {
      const res = await onToggleVote(confessionId);
      if (res.success && res.candles !== undefined) {
        setCandles(res.candles);
        setVoted(true);
        onVoteSuccess(res.candles);
      } else if (res.error) {
        onVoteError(res.error);
        setPressProgress(0);
      }
    } catch (err) {
      onVoteError('촛불 수송 장애가 발생했습니다.');
      setPressProgress(0);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(progressIntervalRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center">
      {/* 롱프레스 시 타오르는 앰버 빛 코로나 번짐 (드리블 테마) */}
      <AnimatePresence>
        {isPressing && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ 
              opacity: (pressProgress / 100) * 0.5 + 0.1, 
              scale: 1 + (pressProgress / 100) * 1.6 
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 -m-10 rounded-full pointer-events-none mix-blend-screen"
            style={{
              background: 'radial-gradient(circle, rgba(245,158,11,0.5) 0%, rgba(244,63,94,0.1) 40%, rgba(0,0,0,0) 70%)',
              filter: 'blur(12px)',
              zIndex: 0
            }}
          />
        )}
      </AnimatePresence>

      {/* 이미 촛불을 밝혔을 때의 영구 네온 아우라 */}
      {voted && (
        <div 
          className="absolute inset-0 -m-6 rounded-full pointer-events-none mix-blend-screen animate-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(245,158,11,0.2) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(8px)',
            zIndex: 0
          }}
        />
      )}

      <button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-500 focus:outline-none ${
          voted
            ? 'border-amber-400/80 bg-gradient-to-br from-amber-500/20 to-orange-600/10 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
            : isPressing
            ? 'border-amber-400 bg-amber-950/20 text-amber-300 scale-[0.96]'
            : 'border-white/[0.04] bg-white/[0.02] text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 hover:scale-[1.02]'
        }`}
        style={{
          cursor: voted ? 'default' : 'pointer'
        }}
      >
        {/* 네온 원형 충전 게이지 */}
        {!voted && isPressing && (
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="28"
              cy="28"
              r="26"
              className="stroke-zinc-900"
              strokeWidth="1.5"
              fill="transparent"
            />
            <circle
              cx="28"
              cy="28"
              r="26"
              className="stroke-amber-500"
              strokeWidth="1.5"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - pressProgress / 100)}`}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.6))'
              }}
            />
          </svg>
        )}

        <Flame 
          className={`h-5 w-5 transition-all duration-700 ${
            voted ? 'fill-amber-500 text-amber-400 animate-bounce' : isPressing ? 'scale-120 text-amber-300' : 'group-hover:text-zinc-300'
          }`} 
        />
      </button>

      {/* 촛불 갯수 텍스트 */}
      <span className={`mt-2.5 text-[10px] font-sans tracking-[0.15em] uppercase font-bold transition-all duration-500 ${
        voted ? 'text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' : 'text-zinc-600'
      }`}>
        {candles} CANDLES
      </span>
    </div>
  );
};
export default CandleButton;
