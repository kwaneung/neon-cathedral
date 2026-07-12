'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  submitConfessionAction, 
  toggleCandleAction, 
  getFeedConfessionsAction, 
  getUserRepliesAction,
  getPendingRepliesAction,
  markReplyAsReadAction,
  getUnreadReplyCountAction,
  getStainedGlassAction, 
  getCurrentUserSession,
  getGlassThresholdAction,
  optOutStainedGlassAction,
} from './actions';
import { getLofiSynth } from '@/lib/audio';
import { Confession, Reply, PendingReply, DEFAULT_GLASS_THRESHOLD } from '@/lib/db';
import { UserSession } from '@/lib/session';
import { CandleButton } from '@/components/CandleButton';
import { BurnEffect } from '@/components/BurnEffect';
import { LetterCountdownBanner } from '@/components/LetterCountdownBanner';
import { SealedLetterCard } from '@/components/SealedLetterCard';
import { 
  Flame, 
  PenTool, 
  Compass, 
  Grid, 
  Mail, 
  Settings as SettingsIcon, 
  Volume2, 
  VolumeX, 
  Music, 
  AlertCircle, 
  Sparkles, 
  RefreshCw, 
  Clock, 
  HelpCircle,
  Lock,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';

type ViewState = 'ENTRANCE' | 'CONFESS' | 'CATHEDRAL' | 'STAINED_GLASS' | 'LETTER_BOX' | 'SETTINGS';

export default function Home() {
  const [view, setView] = useState<ViewState>('ENTRANCE');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  
  // 데이터 상태
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [stainedGlass, setStainedGlass] = useState<Confession[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [pendingReplies, setPendingReplies] = useState<PendingReply[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 입력 상태
  const [writingContent, setWritingContent] = useState('');
  const [selectedTone, setSelectedTone] = useState<'angel' | 'devil'>('angel');
  
  // 연소 애니메이션 상태
  const [isBurning, setIsBurning] = useState(false);
  const [burningText, setBurningText] = useState('');
  
  // 설정 상태
  const [audioVolume, setAudioVolume] = useState(0.3);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // UI 피드백 및 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewLoadError, setViewLoadError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [arrivalToastVisible, setArrivalToastVisible] = useState(false);
  const [selectedStainedConfession, setSelectedStainedConfession] = useState<Confession | null>(null);
  const [glassThreshold, setGlassThreshold] = useState(DEFAULT_GLASS_THRESHOLD);
  const [optOutConfirmOpen, setOptOutConfirmOpen] = useState(false);
  const [isOptingOut, setIsOptingOut] = useState(false);

  // 뷰별 세션 캐시 적중 여부 (빈 배열도 유효 캐시로 취급)
  const [hydratedViews, setHydratedViews] = useState<Partial<Record<ViewState, boolean>>>({});
  const hydratedViewsRef = useRef(hydratedViews);

  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedReplyIdsRef = useRef<Set<string>>(new Set());
  const pendingRepliesRef = useRef<PendingReply[]>([]);
  const viewRef = useRef(view);
  const closeStainedDialogButtonRef = useRef<HTMLButtonElement | null>(null);
  const audioUnlockHintShownRef = useRef(false);

  const motionReduced = reducedMotion || prefersReducedMotion;
  const earliestPending = pendingReplies[0] ?? null;
  const hasPending = pendingReplies.length > 0;
  const viewMotion = motionReduced
    ? { initial: false as const, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } };
  const toastMotion = motionReduced
    ? { initial: false as const, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: -12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const } };

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    pendingRepliesRef.current = pendingReplies;
  }, [pendingReplies]);

  useEffect(() => {
    hydratedViewsRef.current = hydratedViews;
  }, [hydratedViews]);

  // 앱 토글 + OS prefers-reduced-motion → 전역 CSS 앰비언트 글로우/애니메이션 연동
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', motionReduced);
    return () => {
      document.documentElement.classList.remove('reduce-motion');
    };
  }, [motionReduced]);

  const markViewHydrated = useCallback((target: ViewState) => {
    setHydratedViews((prev) => {
      if (prev[target]) return prev;
      const next = { ...prev, [target]: true };
      hydratedViewsRef.current = next;
      return next;
    });
  }, []);

  // 1. 유저 세션 및 설정 로드
  useEffect(() => {
    async function initSession() {
      try {
        const session = await getCurrentUserSession();
        setUserSession(session);
        const [pending, arrived, unread, threshold] = await Promise.all([
          getPendingRepliesAction(),
          getUserRepliesAction(),
          getUnreadReplyCountAction(),
          getGlassThresholdAction(),
        ]);
        for (const reply of arrived) {
          if (!reply.isRead) notifiedReplyIdsRef.current.add(reply.id);
        }
        setPendingReplies(pending);
        setReplies(arrived);
        setUnreadCount(unread);
        setGlassThreshold(threshold);
        markViewHydrated('LETTER_BOX');
      } catch (e) {
        console.error('Failed to load session:', e);
      }
    }
    initSession();

    const localMotion = localStorage.getItem('reduced_motion');
    if (localMotion === 'true') {
      setReducedMotion(true);
    }

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const onMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', onMotionChange);
    return () => mq.removeEventListener('change', onMotionChange);
  }, [markViewHydrated]);

  // 2. 오디오 인스턴스 싱크 맞추기
  useEffect(() => {
    const synth = getLofiSynth();
    if (synth && typeof synth.getVolume === 'function') {
      setAudioVolume(synth.getVolume());
      setAudioPlaying(synth.getIsPlaying());
    }
  }, [view]);

  const refreshLetterState = useCallback(async (opts?: { notifyArrival?: boolean }) => {
    const [pending, arrived, unread] = await Promise.all([
      getPendingRepliesAction(),
      getUserRepliesAction(),
      getUnreadReplyCountAction(),
    ]);

    if (opts?.notifyArrival) {
      for (const reply of arrived) {
        if (!reply.isRead && !notifiedReplyIdsRef.current.has(reply.id)) {
          notifiedReplyIdsRef.current.add(reply.id);
          setArrivalToastVisible(true);
          break;
        }
      }
    }

    setPendingReplies(pending);
    setReplies(arrived);
    setUnreadCount(unread);
    markViewHydrated('LETTER_BOX');
    return { pending, arrived, unread };
  }, [markViewHydrated]);

  const handleCountdownComplete = useCallback(async () => {
    await refreshLetterState({ notifyArrival: true });
  }, [refreshLetterState]);

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  /**
   * 뷰 데이터 로드 (stale-while-revalidate).
   * - 캐시 없음: 로딩 UI 표시 후 최초 적재
   * - 캐시 있음: 즉시 렌더 유지 + 백그라운드 재검증 후 조용히 스왑
   * - reason=manual: 새로고침 버튼 스피너만 (콘텐츠 깜빡임 없음)
   */
  const loadDataForCurrentView = useCallback(async (opts?: { reason?: 'enter' | 'manual' | 'mutation' }) => {
    const reason = opts?.reason ?? 'enter';
    const currentView = viewRef.current;
    const isDataView =
      currentView === 'CATHEDRAL' ||
      currentView === 'STAINED_GLASS' ||
      currentView === 'LETTER_BOX';
    const hasCache = !!hydratedViewsRef.current[currentView];
    const isCold = isDataView && !hasCache;

    if (isCold) {
      setIsLoading(true);
      setViewLoadError(null);
    } else if (reason === 'manual') {
      setIsRefreshing(true);
    }

    try {
      if (currentView === 'CATHEDRAL') {
        const data = await getFeedConfessionsAction();
        setConfessions(data);
        markViewHydrated('CATHEDRAL');
        await refreshLetterState();
      } else if (currentView === 'STAINED_GLASS') {
        const data = await getStainedGlassAction();
        setStainedGlass(data);
        markViewHydrated('STAINED_GLASS');
      } else if (currentView === 'LETTER_BOX') {
        await refreshLetterState();
      } else {
        // CONFESS / SETTINGS 등: 편지 상태만 조용히 동기화 (제출 버튼 isLoading과 분리)
        await refreshLetterState();
      }
      setViewLoadError(null);
    } catch (e) {
      console.error('Failed to load view data:', e);
      // 캐시가 있으면 조용히 실패, 없으면 에러 UI
      if (isCold) {
        setViewLoadError('데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (isCold) setIsLoading(false);
      if (reason === 'manual') setIsRefreshing(false);
    }
  }, [markViewHydrated, refreshLetterState]);

  const startPolling = useCallback(() => {
    stopPolling();
    const intervalMs = pendingRepliesRef.current.length > 0 ? 30000 : 60000;

    pollingTimerRef.current = setInterval(async () => {
      try {
        const currentView = viewRef.current;
        await refreshLetterState({
          notifyArrival: pendingRepliesRef.current.length > 0,
        });

        if (currentView === 'CATHEDRAL') {
          const data = await getFeedConfessionsAction();
          setConfessions(data);
          markViewHydrated('CATHEDRAL');
        } else if (currentView === 'STAINED_GLASS') {
          const data = await getStainedGlassAction();
          setStainedGlass(data);
          markViewHydrated('STAINED_GLASS');
        }
      } catch (e) {
        // 폴링 실패는 캐시 유지 (무깜빡임)
        console.error('Polling error:', e);
      }
    }, intervalMs);
  }, [refreshLetterState, markViewHydrated]);

  // 3. 뷰 변경·pending 유무에 따라 데이터 로드 및 적응형 폴링
  useEffect(() => {
    if (view === 'ENTRANCE') {
      stopPolling();
      return;
    }

    setViewLoadError(null);
    void loadDataForCurrentView({ reason: 'enter' });
    startPolling();

    return () => stopPolling();
  }, [view, hasPending, startPolling, loadDataForCurrentView]);

  useEffect(() => {
    if (!arrivalToastVisible) return;
    const t = window.setTimeout(() => setArrivalToastVisible(false), 4500);
    return () => window.clearTimeout(t);
  }, [arrivalToastVisible]);

  useEffect(() => {
    if (!selectedStainedConfession) {
      setOptOutConfirmOpen(false);
      setIsOptingOut(false);
      return;
    }
    closeStainedDialogButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (optOutConfirmOpen) {
          setOptOutConfirmOpen(false);
        } else {
          setSelectedStainedConfession(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedStainedConfession, optOutConfirmOpen]);

  const handleOptOutStainedGlass = async () => {
    if (!selectedStainedConfession || isOptingOut) return;
    const targetId = selectedStainedConfession.id;
    setIsOptingOut(true);
    try {
      const res = await optOutStainedGlassAction(targetId);
      if (!res.success) {
        showError(res.error || '박제를 해제하지 못했습니다.');
        return;
      }
      setStainedGlass((prev) => prev.filter((c) => c.id !== targetId));
      setSelectedStainedConfession(null);
      setOptOutConfirmOpen(false);
      showSuccess('박제가 해제되었습니다. 이 고해는 소멸의 길로 돌아갑니다.');
      void loadDataForCurrentView({ reason: 'mutation' });
    } catch (_e) {
      showError('박제 해제 중 오류가 발생했습니다.');
    } finally {
      setIsOptingOut(false);
    }
  };

  // 4. 성당 입장 (사운드 락 해제 및 재생 시작)
  const handleEnterCathedral = () => {
    try {
      const synth = getLofiSynth();
      synth.start();
      setAudioPlaying(true);
    } catch (e) {
      console.error('Audio start failed', e);
      if (!audioUnlockHintShownRef.current) {
        audioUnlockHintShownRef.current = true;
        setSuccessMsg('성당이 고요합니다. 우측 상단의 음향을 직접 켜 주세요.');
        window.setTimeout(() => setSuccessMsg(null), 4500);
      }
    }
    setView('CONFESS');
  };

  const toggleBGM = () => {
    const synth = getLofiSynth();
    if (audioPlaying) {
      synth.stop();
      setAudioPlaying(false);
    } else {
      synth.start();
      setAudioPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setAudioVolume(vol);
    const synth = getLofiSynth();
    synth.setVolume(vol);
  };

  const toggleReducedMotion = () => {
    const nextVal = !reducedMotion;
    setReducedMotion(nextVal);
    localStorage.setItem('reduced_motion', String(nextVal));
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const getRemainingTimeText = (expiresAtStr: string) => {
    const expiresAt = new Date(expiresAtStr);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();

    if (diffMs <= 0) return '소멸 임박';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${diffHours}시간 ${diffMins}분 후 재가 되어 소멸`;
  };

  const handleSubmitConfession = () => {
    if (!writingContent.trim()) {
      showError('참회록을 비워둘 수 없습니다.');
      return;
    }
    if (writingContent.length > 2000) {
      showError('참회록은 2,000자 이내여야 합니다.');
      return;
    }

    setBurningText(writingContent);
    setIsBurning(true);
  };

  const handleBurnComplete = async () => {
    setIsBurning(false);
    setIsLoading(true);
    
    try {
      const res = await submitConfessionAction(burningText, selectedTone);
      if (res.success) {
        setWritingContent('');
        showSuccess('고민이 불꽃 속으로 완전히 소화(消火)되었습니다.');
        const pending = await getPendingRepliesAction();
        setPendingReplies(pending);
        markViewHydrated('LETTER_BOX');
        // 본당으로 이동 — 캐시가 있으면 즉시 표시 후 진입 effect가 조용히 재검증
        setView('CATHEDRAL');
        startPolling();
      } else {
        showError(res.error || '고민을 태우는 도중 연소 장애가 발생했습니다.');
      }
    } catch (_e) {
      showError('서버 통신에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isBurning || !motionReduced) return;
    const t = window.setTimeout(() => {
      handleBurnComplete();
    }, 400);
    return () => window.clearTimeout(t);
    // The reduced-motion branch intentionally mirrors BurnEffect's completion callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBurning, motionReduced]);

  const handleOpenReply = async (replyId: string) => {
    const res = await markReplyAsReadAction(replyId);
    if (!res.success) {
      showError('편지를 개봉하지 못했습니다.');
      throw new Error('mark failed');
    }
    setReplies((prev) =>
      prev.map((r) => (r.id === replyId ? { ...r, isRead: true } : r))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleVoteSuccess = (confessionId: string, newCandles: number, voted: boolean) => {
    const uid = userSession?.id;
    setConfessions((prev) =>
      prev.map((c) => {
        if (c.id !== confessionId) return c;
        const voters = c.candleVoters.filter((id) => id !== uid);
        if (voted && uid) voters.push(uid);
        return { ...c, candles: newCandles, candleVoters: voters };
      })
    );
    showSuccess(
      voted
        ? '조용히 마음의 온기(촛불)를 지폈습니다.'
        : '촛불을 거두었습니다. 온기는 잠시 사그라듭니다.'
    );
  };

  const handleVoteError = (errorMsg: string) => {
    showError(errorMsg);
  };

  // 스테인드글라스 유리 스타일링 (lancet gem palettes)
  const getGlassLayout = (index: number, candles: number, id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'from-[#e5484d]/70 via-[#8c2f4a]/55 to-crypt/95 text-[#ffe4e6]',
      'from-[#4c6fe8]/70 via-[#33408f]/55 to-crypt/95 text-[#e0e7ff]',
      'from-[#2fb67c]/70 via-[#1d6e55]/55 to-crypt/95 text-[#d9fbe9]',
      'from-[#e8b33c]/70 via-[#8f6524]/55 to-crypt/95 text-[#fdf3d7]',
      'from-[#9a5cd0]/70 via-[#5c3684]/55 to-crypt/95 text-[#f0e5ff]',
    ];
    
    const colorStyle = colors[hash % colors.length];
    const delay = (index % 4) * 0.09;
    
    return {
      clipClass: '',
      colorStyle,
      delay,
    };
  };

  return (
    <div className="relative flex flex-col flex-1 w-full min-h-screen bg-nave text-text-body font-sans overflow-x-hidden pb-32">
      <div className="god-ray" aria-hidden />
      <div className="candle-pool" aria-hidden />
      <div className="texture-grain" aria-hidden />

      {/* 연소 Canvas 효과 */}
      {isBurning && !motionReduced && (
        <BurnEffect text={burningText} active={isBurning} onComplete={handleBurnComplete} />
      )}
      <AnimatePresence>
        {isBurning && motionReduced && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 bg-crypt/85 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* 헤더 */}
      {view !== 'ENTRANCE' && (
        <motion.header
          initial={motionReduced ? false : { y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={motionReduced ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const }}
          className="sticky top-0 z-30 h-14 px-5 flex items-center justify-between bg-nave/80 backdrop-blur-xl border-b border-line"
        >
          <div 
            onClick={() => setView('CATHEDRAL')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-7 h-9 rounded-[999px_999px_6px_6px] bg-gradient-to-b from-flame/25 to-transparent border border-flame/30 flex items-end justify-center pb-1 transition-transform group-hover:scale-105">
              <Flame className={`h-3.5 w-3.5 text-flame fill-flame/30 ${motionReduced ? '' : 'animate-candle-flicker'}`} />
            </div>
            <h1 className="font-display text-[15px] tracking-[0.28em] text-text-hi uppercase transition-colors group-hover:text-flame">
              Neon Cathedral
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {userSession && (
              <span className="hidden md:inline-flex text-caption text-text-mute bg-surface border border-line px-3 py-1.5 rounded-full">
                {userSession.name}
              </span>
            )}

            {/* BGM 퀵 컨트롤러 */}
            <div className="flex items-center gap-2 bg-surface/80 border border-line px-2.5 py-1 rounded-full shadow-float">
              <button 
                onClick={toggleBGM}
                className="w-11 h-11 -m-1 flex items-center justify-center text-text-mute hover:text-text-hi transition-colors rounded-full"
                title={audioPlaying ? 'BGM 정지' : 'BGM 재생'}
              >
                {audioPlaying ? <Volume2 className={`h-4 w-4 text-flame ${motionReduced ? '' : 'animate-candle-flicker'}`} /> : <VolumeX className="h-4 w-4" />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={audioVolume}
                onChange={handleVolumeChange}
                className="w-14 h-[3px] bg-surface-raised rounded-lg appearance-none cursor-pointer accent-[#ffc46b] outline-none select-none touch-none"
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'none',
                }}
              />
            </div>
          </div>
        </motion.header>
      )}

      {/* 토스트 피드백 */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            {...toastMotion}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] min-h-11 px-5 py-3 rounded-md backdrop-blur-xl shadow-float text-caption bg-surface/90 border border-devil/30 shadow-glow-devil text-text-hi"
          >
            <AlertCircle className="h-4.5 w-4.5 text-devil shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            {...toastMotion}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] min-h-11 px-5 py-3 rounded-md backdrop-blur-xl shadow-float text-caption bg-surface/90 border border-flame/30 shadow-glow-flame text-text-hi"
          >
            <Sparkles className="h-4.5 w-4.5 text-flame shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {arrivalToastVisible && (
          <motion.div
            role="status"
            aria-live="polite"
            {...toastMotion}
            onClick={() => {
              setArrivalToastVisible(false);
              setView('LETTER_BOX');
            }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] min-h-11 px-5 py-3 rounded-md backdrop-blur-xl shadow-float text-caption cursor-pointer bg-surface/90 border border-flame/30 shadow-glow-flame text-text-hi"
          >
            <Mail className="h-4.5 w-4.5 shrink-0 text-flame" />
            <span>
              성찰의 시간이 끝났습니다. 편지봉투가 도착했어요.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 프레임 */}
      <main className={`flex-1 w-full max-w-xl lg:max-w-2xl mx-auto px-4 py-8 flex flex-col ${view === 'ENTRANCE' ? 'justify-center' : ''}`}>
        
        {/* VIEW 1: 성당 입구 (ENTRANCE) - 극도의 비주얼 고도화 */}
        {view === 'ENTRANCE' && (
          <motion.div 
            {...viewMotion}
            className="flex flex-col items-center text-center py-8 px-2 max-w-lg mx-auto"
          >
            {/* 고딕 아치 형태로 마스크 처리된 생성 이미지 */}
            <motion.div 
              initial={motionReduced ? false : { opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }}
              className="relative w-full aspect-[4/5] sm:aspect-[4/3] max-h-[520px] rounded-[var(--radius-arch-hero)] overflow-hidden border border-line-strong shadow-card mb-10"
            >
              <Image 
                src="/images/cathedral_entrance.jpg"
                alt="Neon Cathedral Entrance"
                fill
                priority
                className="object-cover brightness-[0.8] saturate-[0.9]"
              />
              {/* 이미지 위 오버레이 그라데이션 */}
              <div className="absolute inset-0 bg-gradient-to-t from-crypt via-crypt/10 to-nave/20" />
              
              {/* 앰비언트 촛불 데코 */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 bg-surface/75 backdrop-blur-md px-4 py-2 rounded-full border border-flame/25 shadow-glow-flame">
                <Flame className={`h-4.5 w-4.5 text-flame fill-flame/30 ${motionReduced ? '' : 'animate-candle-flicker'}`} />
                <span className="text-caption tracking-(--tracking-hangul) text-flame">촛불이 켜져 있습니다</span>
              </div>
            </motion.div>

            {/* 타이틀 폰트 조합의 고도화 (Playfair & Outfit) */}
            <motion.h2
              initial={motionReduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] as const }}
              className="font-display text-display tracking-[0.2em] bg-gradient-to-b from-text-hi via-text-body to-text-faint bg-clip-text text-transparent mb-2 uppercase"
            >
              NEON CATHEDRAL
            </motion.h2>
            <p className="font-serif text-heading text-text-hi mb-2">네온 성당</p>
            <p className="text-text-mute font-sans text-label tracking-(--tracking-hangul) mb-10">
              소멸의 고해소 & 따뜻한 촛불의 회랑
            </p>

            {/* 미니멀한 약관 카드 */}
            <motion.div
              initial={motionReduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16, ease: [0.22, 1, 0.36, 1] as const }}
              className="w-full text-text-body text-label leading-relaxed text-left space-y-4 bg-surface/70 border border-line p-6 rounded-[24px] backdrop-blur-xl shadow-card mb-12"
            >
              <div className="flex gap-3">
                <span className="font-display text-heading text-flame">Ⅰ</span>
                <p>본 성당은 개인정보(IP, 이메일, 이름)를 일절 수집하지 않으며, 입장 즉시 익명 순번 식별자가 고유하게 부여됩니다.</p>
              </div>
              <div className="flex gap-3">
                <span className="font-display text-heading text-flame">Ⅱ</span>
                <p>작성된 모든 고해는 불꽃으로 소멸된 뒤 24시간 후 서버에서 영구 삭제됩니다. 단, {glassThreshold}촛불 이상의 공감을 얻은 고민은 영원불멸의 스테인드글라스 벽화로 박제됩니다.</p>
              </div>
              <div className="flex gap-3">
                <span className="font-display text-heading text-flame">Ⅲ</span>
                <p>글을 태운 지 5분이 흐르면, 당신만을 위한 다정한 위로 혹은 냉철한 이성의 답장(편지봉투)이 조용히 배달됩니다.</p>
              </div>
            </motion.div>

            <button
              onClick={handleEnterCathedral}
              className="w-full h-14 rounded-full bg-gradient-to-r from-flame via-flame-deep to-flame-ember text-on-flame font-sans font-bold text-sm tracking-(--tracking-hangul) shadow-glow-flame-strong hover:brightness-110 transition-all duration-300 active:translate-y-px"
            >
              성당 안으로 들어가기
            </button>
          </motion.div>
        )}

        {/* VIEW 2: 고해실 (CONFESS) - 제단(Altar) 테마 디자인 */}
        {view === 'CONFESS' && (
          <motion.div 
            {...viewMotion}
            className="space-y-8"
          >
            <div className="flex items-end justify-between border-b border-line pb-5">
              <div>
                <h3 className="font-serif text-title text-text-hi">참회의 제단</h3>
                <p className="text-caption text-text-mute tracking-[0.2em] uppercase mt-1">Confession Altar</p>
              </div>
            </div>

            {/* 고해 양식지 느낌의 극도 디자인 */}
            <div className="relative rounded-[24px] border border-line bg-surface/80 backdrop-blur-xl p-6 shadow-card focus-within:border-flame/40 focus-within:shadow-glow-flame transition-all duration-300">
              <div className="absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-flame/70 to-transparent" aria-hidden />

              <textarea
                value={writingContent}
                onChange={(e) => setWritingContent(e.target.value)}
                placeholder="마음 속 깊이 침묵하고 있던 고민을 이곳에 바치십시오. 연소되는 순간, 이 지상의 그 어떤 시스템도 당신의 글을 복구할 수 없습니다..."
                maxLength={2000}
                rows={9}
                disabled={isLoading}
                className="w-full bg-transparent border-0 outline-none font-serif text-body text-text-hi placeholder:text-text-mute leading-relaxed resize-none focus:ring-0"
              />
              
              {/* 게이지 바 형태의 캐릭터 카운터 */}
              <div className="mt-6 pt-4 border-t border-line space-y-3">
                <div className="relative w-full h-[3px] bg-surface-raised rounded-full">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      writingContent.length > 1800
                        ? 'bg-gradient-to-r from-devil to-flame-ember'
                        : 'bg-gradient-to-r from-flame to-flame-hi'
                    }`}
                    style={{ width: `${(writingContent.length / 2000) * 100}%` }}
                  />
                  <span
                    className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full shadow-glow-flame ${
                      writingContent.length > 1800 ? 'bg-devil shadow-glow-devil' : 'bg-flame'
                    }`}
                    style={{ left: `calc(${Math.min(100, (writingContent.length / 2000) * 100)}% - 5px)` }}
                    aria-hidden
                  />
                </div>
                <div className="flex justify-between items-center text-caption text-text-mute">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-text-faint" />
                    기밀 보장 — 흔적 없이 소멸
                  </span>
                  <span className={`font-sans tracking-wide ${writingContent.length > 1800 ? 'text-devil' : ''}`}>
                    {writingContent.length} / 2,000자
                  </span>
                </div>
              </div>
            </div>

            {/* 입체적 톤 카드 선택 영역 */}
            <div className="space-y-3.5">
              <label className="text-caption text-text-mute tracking-normal block pl-1">
                서신 톤 선택
              </label>
              <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2" role="radiogroup" aria-label="서신 톤 선택">
                {/* 천사 카드 */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedTone === 'angel'}
                  onClick={() => setSelectedTone('angel')}
                  className={`relative p-5 rounded-[24px] border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-flame/50 overflow-hidden text-left ${
                    selectedTone === 'angel'
                      ? 'border-cyan-400/45 bg-cyan-950/20 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.12)]'
                      : 'border-line bg-surface/55 text-text-mute hover:border-line-strong'
                  }`}
                >
                  {selectedTone === 'angel' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />
                  )}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <Sparkles className={`h-4.5 w-4.5 ${selectedTone === 'angel' ? 'text-cyan-300' : 'text-text-faint'}`} />
                    <span className="text-label font-bold tracking-normal">천사의 위로</span>
                  </div>
                  <p className="text-label leading-relaxed text-text-body font-serif">
                    진심이 담긴 포근한 위로와, 따뜻한 마음의 포옹을 전하는 편지.
                  </p>
                </button>

                {/* 악마 카드 */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedTone === 'devil'}
                  onClick={() => setSelectedTone('devil')}
                  className={`relative p-5 rounded-[24px] border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-devil/50 overflow-hidden text-left ${
                    selectedTone === 'devil'
                      ? 'border-devil/45 bg-devil/10 text-rose-100 shadow-glow-devil'
                      : 'border-line bg-surface/55 text-text-mute hover:border-line-strong'
                  }`}
                >
                  {selectedTone === 'devil' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
                  )}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <Flame className={`h-4.5 w-4.5 ${selectedTone === 'devil' ? 'text-devil fill-devil/25' : 'text-text-faint'}`} />
                    <span className="text-label font-bold tracking-normal">악마의 속삭임</span>
                  </div>
                  <p className="text-label leading-relaxed text-text-body font-serif">
                    팩트를 짚는 현실 자각, 감성을 배제한 칼날 같은 이성의 돌파구.
                  </p>
                </button>
              </div>
            </div>

            {/* 태우기 버튼 */}
            <button
              onClick={handleSubmitConfession}
              disabled={isLoading || !writingContent.trim()}
              className="w-full h-14 rounded-full bg-gradient-to-r from-flame via-flame-deep to-flame-ember text-on-flame font-sans font-bold text-sm tracking-(--tracking-hangul) shadow-glow-flame-strong hover:brightness-110 disabled:bg-surface-raised disabled:bg-none disabled:text-text-faint disabled:shadow-none disabled:hover:brightness-100 transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isLoading && <span className="h-4 w-4 rounded-full border-2 border-on-flame/60 border-t-transparent animate-spin" aria-hidden />}
              {isLoading ? '재로 산화시키는 중...' : '고해 제단에 바쳐 연소하기'}
            </button>
          </motion.div>
        )}

        {/* VIEW 3: 본당 피드 (CATHEDRAL) - 플로팅 3D 카드뷰 */}
        {view === 'CATHEDRAL' && (
          <motion.div 
            {...viewMotion}
            className="space-y-8"
          >
            <div className="flex items-end justify-between border-b border-line pb-5">
              <div>
                <h3 className="font-serif text-title text-text-hi">본당 회랑</h3>
                <p className="text-caption text-text-mute tracking-[0.2em] uppercase mt-1">Cathedral Feed</p>
              </div>
              <button 
                onClick={() => void loadDataForCurrentView({ reason: 'manual' })}
                disabled={isLoading || isRefreshing}
                className="h-11 w-11 rounded-full border border-line bg-surface/70 text-text-mute hover:text-text-hi hover:border-line-strong disabled:opacity-50 transition-all shadow-card flex items-center justify-center"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing || (isLoading && !hydratedViews.CATHEDRAL) ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {earliestPending && (
              <LetterCountdownBanner
                sentAt={earliestPending.sentAt}
                remainingSeconds={earliestPending.remainingSeconds}
                extraPendingCount={Math.max(0, pendingReplies.length - 1)}
                reducedMotion={motionReduced}
                onComplete={handleCountdownComplete}
              />
            )}

            {isLoading && !hydratedViews.CATHEDRAL ? (
              <div className="py-24 text-center space-y-4">
                <div className="h-6 w-6 border-2 border-flame border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-caption text-text-mute animate-pulse">피드의 불을 지피는 중...</p>
              </div>
            ) : viewLoadError && !hydratedViews.CATHEDRAL ? (
              <div className="py-24 text-center space-y-4 rounded-[24px] border border-dashed border-devil/40 bg-surface/40 px-8">
                <AlertCircle className="h-10 w-10 text-devil mx-auto" />
                <p className="text-sm font-serif text-text-body">{viewLoadError}</p>
                <button
                  type="button"
                  onClick={() => void loadDataForCurrentView({ reason: 'manual' })}
                  className="text-caption text-flame underline underline-offset-4"
                >
                  다시 시도
                </button>
              </div>
            ) : confessions.length === 0 ? (
              <div className="py-24 text-center space-y-4 rounded-[24px] border border-dashed border-line bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0_25%,transparent_25%_50%,rgba(255,255,255,0.03)_50%_75%,transparent_75%)] bg-[length:18px_18px] px-8">
                <HelpCircle className="h-10 w-10 text-text-faint mx-auto" />
                <p className="text-sm font-serif text-text-body">아직 타오르는 고민이 없습니다.</p>
                <p className="text-label text-text-mute">
                  고해실로 이동하여 마음의 응어리를 최초로 태워 보세요.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {confessions.map((c, idx) => {
                  const isAuthor = userSession && c.authorId === userSession.id;
                  const voted = userSession && c.candleVoters.includes(userSession.id);
                  
                  return (
                    <motion.div 
                      key={c.id}
                      layout
                      initial={motionReduced ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: motionReduced ? 0 : Math.min(idx, 5) * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }}
                      className="relative rounded-[24px] border border-line bg-surface/70 backdrop-blur-xl p-6 flex flex-col justify-between gap-6 hover:border-line-strong hover:shadow-card transition-all duration-300 overflow-hidden"
                    >
                      <div className={`absolute left-0 top-5 bottom-5 w-[2px] rounded-full ${c.tone === 'angel' ? 'bg-cyan-300/70' : 'bg-devil/70'}`} aria-hidden />
                      {/* 카드 헤더 */}
                      <div className="flex justify-between items-center text-caption text-text-mute border-b border-line pb-3.5 gap-4">
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${c.tone === 'angel' ? 'bg-cyan-300' : 'bg-devil'}`} />
                          <span className="font-sans font-medium tracking-wider break-keep">{c.authorName}</span>
                          {isAuthor && (
                            <span className="text-[10px] font-sans font-bold text-on-flame bg-flame px-2 py-0.5 rounded-full">나</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 text-text-mute font-sans text-right break-keep">
                          <Clock className="h-3 w-3 text-text-faint" />
                          {getRemainingTimeText(c.expiresAt)}
                        </span>
                      </div>

                      {/* 고민 본문 */}
                      <p className="text-sm font-serif leading-relaxed text-text-hi whitespace-pre-wrap break-keep pr-2">
                        {c.content}
                      </p>

                      {/* 촛불 버튼 및 상세 안내 */}
                      <div className="flex justify-between items-center border-t border-line pt-4 mt-2 gap-4">
                        <div className="flex items-center gap-1.5 text-caption text-text-mute font-sans break-keep">
                          <Info className="h-3.5 w-3.5 text-text-faint shrink-0" />
                          <span>{glassThreshold}촛불 획득 시 벽화에 영원히 박제됩니다</span>
                        </div>

                        <CandleButton 
                          confessionId={c.id}
                          initialCandles={c.candles}
                          hasVoted={!!voted}
                          onVoteSuccess={(newVal, nextVoted) => handleVoteSuccess(c.id, newVal, nextVoted)}
                          onVoteError={handleVoteError}
                          onToggleVote={toggleCandleAction}
                          reducedMotion={motionReduced}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 4: 스테인드글라스 벽 (STAINED_GLASS) - 다각형 모자이크 조각 그리드 */}
        {view === 'STAINED_GLASS' && (
          <motion.div 
            {...viewMotion}
            className="space-y-8"
          >
            <div className="flex items-end justify-between border-b border-line pb-5">
              <div>
                <h3 className="font-serif text-title text-text-hi">스테인드글라스 벽</h3>
                <p className="text-caption text-text-mute tracking-[0.2em] uppercase mt-1">Stained Glass Gallery</p>
              </div>
              <button 
                onClick={() => void loadDataForCurrentView({ reason: 'manual' })}
                disabled={isLoading || isRefreshing}
                className="h-11 w-11 rounded-full border border-line bg-surface/70 text-text-mute hover:text-text-hi hover:border-line-strong disabled:opacity-50 transition-all shadow-card flex items-center justify-center"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing || (isLoading && !hydratedViews.STAINED_GLASS) ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoading && !hydratedViews.STAINED_GLASS ? (
              <div className="py-24 text-center space-y-4">
                <div className="h-6 w-6 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-caption text-text-mute animate-pulse">유리 벽화 조각을 깎는 중...</p>
              </div>
            ) : viewLoadError && !hydratedViews.STAINED_GLASS ? (
              <div className="py-24 text-center space-y-4 rounded-[24px] border border-dashed border-devil/40 bg-surface/40 px-8">
                <AlertCircle className="h-10 w-10 text-devil mx-auto" />
                <p className="text-sm font-serif text-text-body">{viewLoadError}</p>
                <button
                  type="button"
                  onClick={() => void loadDataForCurrentView({ reason: 'manual' })}
                  className="text-caption text-flame underline underline-offset-4"
                >
                  다시 시도
                </button>
              </div>
            ) : stainedGlass.length === 0 ? (
              <div className="py-24 text-center space-y-4 rounded-[24px] border border-dashed border-line bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0_25%,transparent_25%_50%,rgba(255,255,255,0.03)_50%_75%,transparent_75%)] bg-[length:18px_18px] px-8">
                <Grid className="h-10 w-10 text-text-faint mx-auto" />
                <p className="text-sm font-serif text-text-body">박제된 사연이 아직 없습니다.</p>
                <p className="text-label text-text-mute leading-relaxed">
                  본당의 글에 {glassThreshold}개 이상의 촛불을 켜주세요.<br />
                  이 벽면에 영롱한 빛을 내는 조각으로 기록됩니다.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {stainedGlass.map((c, index) => {
                  const meta = getGlassLayout(index, c.candles, c.id);
                  
                  return (
                    <motion.div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${c.authorName}의 스테인드글라스 사연 열기`}
                      onClick={() => setSelectedStainedConfession(c)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedStainedConfession(c);
                        }
                      }}
                      initial={motionReduced ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: motionReduced ? 0 : meta.delay, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
                      className={`glass-lancet relative aspect-[3/4] odd:mt-4 sm:odd:mt-6 bg-gradient-to-b cursor-pointer transition-all duration-[400ms] hover:z-10 hover:scale-[1.02] hover:brightness-115 p-4 pt-6 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-flame/60 ${meta.colorStyle}`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(244_239_230/0.22),transparent_60%)]" />

                      <div className="relative z-10 mx-auto flex h-6 items-center gap-1 rounded-full border border-line bg-crypt/60 px-2.5 text-caption tabular-nums">
                        <Flame className="h-3 w-3 text-flame fill-flame" />
                        {c.candles}
                      </div>

                      <p className="relative z-10 line-clamp-4 overflow-hidden break-keep font-sans text-caption leading-relaxed text-text-hi/90">
                        &ldquo;{c.content}&rdquo;
                      </p>

                      <div className="relative z-10 text-center text-overline tracking-normal opacity-70">
                        {c.authorName}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 5: 편지함 (LETTER_BOX) - 3D 편지봉투 테마 */}
        {view === 'LETTER_BOX' && (
          <motion.div 
            {...viewMotion}
            className="space-y-8"
          >
            <div className="flex items-end justify-between border-b border-line pb-5">
              <div>
                <h3 className="font-serif text-title text-text-hi">나의 편지함</h3>
                <p className="text-caption text-text-mute tracking-[0.2em] uppercase mt-1">Your Letters</p>
              </div>
              <button 
                onClick={() => void loadDataForCurrentView({ reason: 'manual' })}
                disabled={isLoading || isRefreshing}
                className="h-11 w-11 rounded-full border border-line bg-surface/70 text-text-mute hover:text-text-hi hover:border-line-strong disabled:opacity-50 transition-all shadow-card flex items-center justify-center"
                title="편지함 동기화"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing || (isLoading && !hydratedViews.LETTER_BOX) ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {earliestPending && (
              <LetterCountdownBanner
                sentAt={earliestPending.sentAt}
                remainingSeconds={earliestPending.remainingSeconds}
                extraPendingCount={Math.max(0, pendingReplies.length - 1)}
                reducedMotion={motionReduced}
                onComplete={handleCountdownComplete}
              />
            )}

            {/* 5분 사유의 시간 안내 상자 */}
            <div className="bg-surface/70 border border-line rounded-[24px] p-5 flex gap-4 text-label leading-relaxed text-text-body shadow-card">
              <Clock className="h-5 w-5 text-flame shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-text-hi font-bold block text-[13px] font-serif">5분, 번뇌가 정화되는 시간</span>
                <p className="font-serif text-text-body">
                  고해를 불꽃으로 정화시킨 시점으로부터 5분의 성찰이 흐른 뒤 답장이 봉투에 배달됩니다. 성당에 침묵이 차오르는 시간을 온전히 만끽하세요.
                </p>
              </div>
            </div>

            {isLoading && !hydratedViews.LETTER_BOX ? (
              <div className="py-24 text-center space-y-4">
                <div className="h-6 w-6 border-2 border-devil border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-caption text-text-mute animate-pulse">우체통 비우는 중...</p>
              </div>
            ) : viewLoadError && !hydratedViews.LETTER_BOX ? (
              <div className="py-24 text-center space-y-4 rounded-[24px] border border-dashed border-devil/40 bg-surface/40 px-8">
                <AlertCircle className="h-10 w-10 text-devil mx-auto" />
                <p className="text-sm font-serif text-text-body">{viewLoadError}</p>
                <button
                  type="button"
                  onClick={() => void loadDataForCurrentView({ reason: 'manual' })}
                  className="text-caption text-flame underline underline-offset-4"
                >
                  다시 시도
                </button>
              </div>
            ) : replies.length === 0 && pendingReplies.length === 0 ? (
              <div className="py-24 text-center space-y-4 rounded-[24px] border border-dashed border-line bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0_25%,transparent_25%_50%,rgba(255,255,255,0.03)_50%_75%,transparent_75%)] bg-[length:18px_18px] px-8">
                <Mail className="h-10 w-10 text-text-faint mx-auto" />
                <p className="text-sm font-serif text-text-body">도착한 편지함이 고요합니다.</p>
                <p className="text-label text-text-mute leading-relaxed">
                  고해를 태우면 이곳에 봉인된 편지가 먼저 나타납니다.<br />
                  5분 뒤 자동으로 개봉할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {pendingReplies.map((p) => (
                  <SealedLetterCard
                    key={p.id}
                    id={p.id}
                    tone={p.tone}
                    content=""
                    sentAt={p.sentAt}
                    isRead={false}
                    remainingSeconds={p.remainingSeconds}
                    reducedMotion={motionReduced}
                    onOpen={handleOpenReply}
                  />
                ))}
                {replies.map((r) => (
                  <SealedLetterCard
                    key={r.id}
                    id={r.id}
                    tone={r.tone}
                    content={r.content}
                    sentAt={r.sentAt}
                    isRead={r.isRead}
                    reducedMotion={motionReduced}
                    onOpen={handleOpenReply}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 6: 설정 (SETTINGS) - 드리블 다크 미학형 설정 리스트 */}
        {view === 'SETTINGS' && (
          <motion.div 
            {...viewMotion}
            className="space-y-8"
          >
            <div className="flex items-end justify-between border-b border-line pb-5">
              <div>
                <h3 className="font-serif text-title text-text-hi">성당 비축고</h3>
                <p className="text-caption text-text-mute tracking-[0.2em] uppercase mt-1">Atmosphere Configuration</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-line bg-surface/70 backdrop-blur-xl divide-y divide-line overflow-hidden shadow-card">
              
              {/* BGM 제어 */}
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <label className="text-sm text-text-hi font-serif font-medium flex items-center gap-2.5">
                      <Music className="h-4.5 w-4.5 text-text-mute" />
                      로파이 앰비언스 루프
                    </label>
                    <p className="text-label text-text-mute font-sans">
                      성당 내부의 아늑한 음향 환경을 활성화합니다.
                    </p>
                  </div>
                  <button 
                    onClick={toggleBGM}
                    role="switch"
                    aria-checked={audioPlaying}
                    className={`relative h-8 w-14 rounded-full border transition-all shrink-0 ${
                      audioPlaying
                        ? 'bg-flame/25 border-flame/45 shadow-glow-flame'
                        : 'bg-surface-raised border-line'
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-1 h-6 w-6 rounded-full transition-transform ${
                        audioPlaying ? 'translate-x-6 bg-flame' : 'translate-x-1 bg-text-faint'
                      }`}
                    />
                    <span className="sr-only">{audioPlaying ? '재생 중' : '꺼짐'}</span>
                  </button>
                </div>
                <div className="text-caption text-text-mute text-right">{audioPlaying ? '재생 중' : '꺼짐'}</div>
                <div className="flex items-center gap-4 pt-1">
                  <span className="text-text-faint"><VolumeX className="h-4 w-4" /></span>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={audioVolume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-[4px] bg-surface-raised rounded-lg appearance-none cursor-pointer accent-[#ffc46b] outline-none select-none touch-none"
                    style={{
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      touchAction: 'none',
                    }}
                  />
                  <span className="text-text-faint"><Volume2 className="h-4 w-4" /></span>
                </div>
              </div>

              {/* 접근성 제어 */}
              <div className="p-4 sm:p-6 flex justify-between items-center gap-3">
                <div className="space-y-1 pr-2 sm:pr-6 min-w-0">
                  <label className="text-sm text-text-hi font-serif font-medium flex items-center gap-2.5">
                    <Sparkles className="h-4.5 w-4.5 text-text-mute shrink-0" />
                    애니메이션 간소화 (Reduced Motion)
                  </label>
                  <p className="text-label text-text-mute leading-relaxed">
                    불꽃 연소 및 글로우 등 물리 연산을 줄여 하드웨어의 배터리를 보존하고 시각 편의를 제공합니다.
                  </p>
                  <p className="text-caption text-text-mute">{reducedMotion ? '간소화됨' : '전체 모션'}</p>
                </div>
                <button
                  onClick={toggleReducedMotion}
                  role="switch"
                  aria-checked={reducedMotion}
                  className={`relative h-8 w-14 rounded-full border transition-all shrink-0 ${
                    reducedMotion
                      ? 'bg-text-hi/20 border-text-hi/40'
                      : 'bg-surface-raised border-line'
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1 h-6 w-6 rounded-full transition-transform ${
                      reducedMotion ? 'translate-x-6 bg-text-hi' : 'translate-x-1 bg-text-faint'
                    }`}
                  />
                  <span className="sr-only">{reducedMotion ? '간소화됨' : '전체 모션'}</span>
                </button>
              </div>

              {/* 익명 토큰 뱃지 */}
              {userSession && (
                <div className="p-4 sm:p-6 space-y-2">
                  <span className="text-caption font-sans text-text-mute block">나의 고유 세션 데이터</span>
                  <div className="bg-crypt/50 border border-line p-4 rounded-[18px] space-y-1">
                    <span className="text-sm text-text-hi font-serif font-bold block">식별자: {userSession.name}</span>
                    <span className="text-[11px] text-text-mute font-mono tracking-wider block break-all">
                      TOKEN: {userSession.id}
                    </span>
                  </div>
                </div>
              )}

              {/* 프라이버시 조항 */}
              <div className="p-4 sm:p-6 text-label text-text-mute font-serif leading-relaxed space-y-2">
                <span className="block font-bold text-text-body mb-1">개인정보 취급 & 소멸 규정</span>
                <p>• 네온 성당은 회원가입을 지원하지 않으며, 클라이언트 쿠키 토큰은 오직 익명 식별을 위한 용도로만 브라우저 내에 국한되어 보관됩니다.</p>
                <p>• 태워진 고해 글은 24시간의 노출 기한 경과 시 데이터베이스에서 하드 삭제(Hard-Delete) 처리되며 어떠한 백업본도 남겨두지 않습니다.</p>
                <p>• 단, {glassThreshold}촛불 이상의 깊은 공감을 달성하여 &apos;스테인드글라스 벽화&apos;로 보존 판정을 받은 흔적은 이 공간에 예술 조각으로 영원히 보존됩니다.</p>
              </div>

            </div>
          </motion.div>
        )}

      </main>

      {/* 하단 둥글고 세련된 플로팅 글래스 네비게이션 바 */}
      {view !== 'ENTRANCE' && (
        <motion.nav 
          initial={motionReduced ? false : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={motionReduced ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const, delay: 0.1 }}
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 h-[68px] max-w-sm w-[calc(100%-2rem)] rounded-[24px] backdrop-blur-3xl bg-surface/85 border border-line px-4 flex justify-between items-center shadow-float"
        >
          {/* 고해실 */}
          <button
            onClick={() => setView('CONFESS')}
            className={`relative flex min-w-11 min-h-12 flex-col items-center justify-center gap-1.5 transition-colors ${
              view === 'CONFESS' ? 'text-flame' : 'text-text-mute hover:text-text-hi'
            }`}
          >
            <PenTool className="h-5 w-5" />
            <span className="text-caption font-sans font-medium tracking-normal">제단</span>
            {view === 'CONFESS' && (
              <motion.div layoutId="nav-active" className="absolute -top-1.5 w-8 h-1 rounded-full bg-flame shadow-glow-flame" />
            )}
          </button>

          {/* 본당 피드 */}
          <button
            onClick={() => setView('CATHEDRAL')}
            className={`relative flex min-w-11 min-h-12 flex-col items-center justify-center gap-1.5 transition-colors ${
              view === 'CATHEDRAL' ? 'text-flame' : 'text-text-mute hover:text-text-hi'
            }`}
          >
            <Compass className="h-5 w-5" />
            <span className="text-caption font-sans font-medium tracking-normal">회랑</span>
            {view === 'CATHEDRAL' && (
              <motion.div layoutId="nav-active" className="absolute -top-1.5 w-8 h-1 rounded-full bg-flame shadow-glow-flame" />
            )}
          </button>

          {/* 스테인드글라스 */}
          <button
            onClick={() => setView('STAINED_GLASS')}
            className={`relative flex min-w-11 min-h-12 flex-col items-center justify-center gap-1.5 transition-colors ${
              view === 'STAINED_GLASS' ? 'text-flame' : 'text-text-mute hover:text-text-hi'
            }`}
          >
            <Grid className="h-5 w-5" />
            <span className="text-caption font-sans font-medium tracking-normal">벽화</span>
            {view === 'STAINED_GLASS' && (
              <motion.div layoutId="nav-active" className="absolute -top-1.5 w-8 h-1 rounded-full bg-flame shadow-glow-flame" />
            )}
          </button>

          {/* 편지함 */}
          <button
            onClick={() => setView('LETTER_BOX')}
            aria-label={unreadCount > 0 ? `서신, 미읽음 ${unreadCount}건` : '서신'}
            className={`relative flex min-w-11 min-h-12 flex-col items-center justify-center gap-1.5 transition-colors ${
              view === 'LETTER_BOX' ? 'text-flame' : 'text-text-mute hover:text-text-hi'
            }`}
          >
            <span className="relative">
              <Mail className="h-5 w-5" />
              {unreadCount === 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-flame ring-2 ring-surface"
                />
              )}
              {unreadCount >= 2 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-2.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-flame px-1 text-[9px] font-bold text-on-flame ring-2 ring-surface"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="text-caption font-sans font-medium tracking-normal">서신</span>
            {view === 'LETTER_BOX' && (
              <motion.div layoutId="nav-active" className="absolute -top-1.5 w-8 h-1 rounded-full bg-flame shadow-glow-flame" />
            )}
          </button>

          {/* 설정 */}
          <button
            onClick={() => setView('SETTINGS')}
            className={`relative flex min-w-11 min-h-12 flex-col items-center justify-center gap-1.5 transition-colors ${
              view === 'SETTINGS' ? 'text-flame' : 'text-text-mute hover:text-text-hi'
            }`}
          >
            <SettingsIcon className="h-5 w-5" />
            <span className="text-caption font-sans font-medium tracking-normal">비축</span>
            {view === 'SETTINGS' && (
              <motion.div layoutId="nav-active" className="absolute -top-1.5 w-8 h-1 rounded-full bg-flame shadow-glow-flame" />
            )}
          </button>

        </motion.nav>
      )}

      {/* 모달: 스테인드글라스 라이트박스 */}
      <AnimatePresence>
        {selectedStainedConfession && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stained-glass-dialog-title"
          >
            <motion.div 
              initial={motionReduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStainedConfession(null)}
              className="absolute inset-0 bg-crypt/90 backdrop-blur-xl"
            />
            
            <motion.div
              initial={motionReduced ? false : { opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={motionReduced ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
              className="relative w-full max-w-md rounded-[24px] border border-line bg-gradient-to-br from-surface to-crypt p-6 space-y-6 shadow-float z-10 overflow-hidden"
            >
              {/* 모달 내 앰비언트 백그라운드 오로라 */}
              <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${getGlassLayout(0, selectedStainedConfession.candles, selectedStainedConfession.id).colorStyle}`} aria-hidden />
              <div className="absolute -top-16 -left-16 w-52 h-52 bg-gradient-to-br from-flame/10 to-transparent blur-3xl rounded-full pointer-events-none" />

              <div className="flex justify-between items-center text-caption text-text-mute border-b border-line pb-3.5 gap-3">
                <span id="stained-glass-dialog-title" className="flex items-center gap-1.5 font-serif">
                  <Sparkles className="h-4 w-4 text-flame" />
                  보존된 유리의 편린
                </span>
                <span className="flex items-center gap-1 text-flame font-sans font-bold bg-flame/10 border border-flame/30 px-2.5 py-0.5 rounded-full">
                  <Flame className="h-3 w-3 fill-flame" />
                  {selectedStainedConfession.candles} 촛불 공감
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-base font-serif leading-relaxed text-text-hi whitespace-pre-wrap tracking-wide italic pr-2">
                  {selectedStainedConfession.content}
                </p>
                <div className="flex justify-end text-xs font-serif text-text-mute">
                  — {selectedStainedConfession.authorName}의 사유
                </div>
              </div>

              {/* FR-4.2: 본인 조각에만 옵트아웃 UI. 후속: 박제 시점 능동 알림(편지봉투 등)은 스코프 제외 */}
              {userSession && selectedStainedConfession.authorId === userSession.id && (
                <div className="relative z-10 space-y-3 rounded-[18px] border border-line bg-crypt/40 p-4">
                  <p className="text-label font-serif text-text-body leading-relaxed">
                    이 고해는 당신의 것입니다.
                  </p>
                  {!optOutConfirmOpen ? (
                    <button
                      type="button"
                      onClick={() => setOptOutConfirmOpen(true)}
                      className="w-full py-3 rounded-full border border-devil/35 bg-devil/10 text-caption font-sans font-semibold text-rose-100 hover:bg-devil/15 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-devil/50"
                    >
                      박제 해제
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-label text-text-mute leading-relaxed">
                        박제를 해제하면 이 조각은 벽화에서 사라지고, 다시 소멸 절차로 돌아갑니다.
                        되돌릴 수 없습니다.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          disabled={isOptingOut}
                          onClick={() => void handleOptOutStainedGlass()}
                          className="flex-1 py-3 rounded-full bg-devil/90 text-on-flame text-caption font-sans font-semibold hover:brightness-110 disabled:opacity-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-devil/50"
                        >
                          {isOptingOut ? '해제하는 중…' : '확인하고 해제'}
                        </button>
                        <button
                          type="button"
                          disabled={isOptingOut}
                          onClick={() => setOptOutConfirmOpen(false)}
                          className="flex-1 py-3 rounded-full border border-line bg-surface-raised text-text-body text-caption font-sans font-semibold hover:border-line-strong disabled:opacity-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                ref={closeStainedDialogButtonRef}
                onClick={() => setSelectedStainedConfession(null)}
                className="w-full py-3.5 rounded-full bg-surface-raised text-text-body font-sans font-semibold text-caption tracking-wider border border-line hover:border-line-strong hover:text-text-hi transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-flame/60"
              >
                갤러리로 돌아가기
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
