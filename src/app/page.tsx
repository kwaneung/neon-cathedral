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
  getCurrentUserSession 
} from './actions';
import { getLofiSynth } from '@/lib/audio';
import { Confession, Reply, PendingReply } from '@/lib/db';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [arrivalToastVisible, setArrivalToastVisible] = useState(false);
  const [selectedStainedConfession, setSelectedStainedConfession] = useState<Confession | null>(null);

  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedReplyIdsRef = useRef<Set<string>>(new Set());
  const pendingRepliesRef = useRef<PendingReply[]>([]);
  const viewRef = useRef(view);

  const motionReduced = reducedMotion || prefersReducedMotion;
  const earliestPending = pendingReplies[0] ?? null;
  const hasPending = pendingReplies.length > 0;

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    pendingRepliesRef.current = pendingReplies;
  }, [pendingReplies]);

  // 1. 유저 세션 및 설정 로드
  useEffect(() => {
    async function initSession() {
      try {
        const session = await getCurrentUserSession();
        setUserSession(session);
        const [pending, arrived, unread] = await Promise.all([
          getPendingRepliesAction(),
          getUserRepliesAction(),
          getUnreadReplyCountAction(),
        ]);
        for (const reply of arrived) {
          if (!reply.isRead) notifiedReplyIdsRef.current.add(reply.id);
        }
        setPendingReplies(pending);
        setReplies(arrived);
        setUnreadCount(unread);
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
  }, []);

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
    return { pending, arrived, unread };
  }, []);

  const handleCountdownComplete = useCallback(async () => {
    await refreshLetterState({ notifyArrival: true });
  }, [refreshLetterState]);

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const loadDataForCurrentView = async () => {
    setIsLoading(true);
    try {
      const currentView = viewRef.current;
      if (currentView === 'CATHEDRAL') {
        const data = await getFeedConfessionsAction();
        setConfessions(data);
        await refreshLetterState();
      } else if (currentView === 'STAINED_GLASS') {
        const data = await getStainedGlassAction();
        setStainedGlass(data);
      } else if (currentView === 'LETTER_BOX') {
        await refreshLetterState();
      } else {
        await refreshLetterState();
      }
    } catch (e) {
      console.error('Failed to load view data:', e);
    } finally {
      setIsLoading(false);
    }
  };

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
        } else if (currentView === 'STAINED_GLASS') {
          const data = await getStainedGlassAction();
          setStainedGlass(data);
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, intervalMs);
  }, [refreshLetterState]);

  // 3. 뷰 변경·pending 유무에 따라 데이터 로드 및 적응형 폴링
  useEffect(() => {
    if (view === 'ENTRANCE') {
      stopPolling();
      return;
    }

    loadDataForCurrentView();
    startPolling();

    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, hasPending, startPolling]);

  useEffect(() => {
    if (!arrivalToastVisible) return;
    const t = window.setTimeout(() => setArrivalToastVisible(false), 4500);
    return () => window.clearTimeout(t);
  }, [arrivalToastVisible]);

  // 4. 성당 입장 (사운드 락 해제 및 재생 시작)
  const handleEnterCathedral = () => {
    try {
      const synth = getLofiSynth();
      synth.start();
      setAudioPlaying(true);
    } catch (e) {
      console.error('Audio start failed', e);
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

  const handleVoteSuccess = (confessionId: string, newCandles: number) => {
    setConfessions(prev => 
      prev.map(c => c.id === confessionId ? { ...c, candles: newCandles, candleVoters: [...c.candleVoters, userSession?.id || ''] } : c)
    );
    showSuccess('조용히 마음의 온기(촛불)를 지폈습니다.');
  };

  const handleVoteError = (errorMsg: string) => {
    showError(errorMsg);
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

  // 스테인드글라스 유리 스타일링 (Voronoi 모자이크)
  const getGlassLayout = (index: number, candles: number, id: string) => {
    const clips = ['glass-clip-1', 'glass-clip-2', 'glass-clip-3', 'glass-clip-4', 'glass-clip-5', 'glass-clip-6'];
    const clipClass = clips[index % clips.length];
    
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'from-rose-500/80 via-purple-600/60 to-zinc-950/90 hover:from-rose-400 hover:via-purple-500 border-rose-500/30 text-rose-100 shadow-[inset_0_0_20px_rgba(244,63,94,0.3)]', // Ruby
      'from-cyan-500/80 via-blue-600/60 to-zinc-950/90 hover:from-cyan-400 hover:via-blue-500 border-cyan-500/30 text-cyan-100 shadow-[inset_0_0_20px_rgba(6,182,212,0.3)]', // Sapphire
      'from-emerald-500/80 via-teal-600/60 to-zinc-950/90 hover:from-emerald-400 hover:via-teal-500 border-emerald-500/30 text-emerald-100 shadow-[inset_0_0_20px_rgba(16,185,129,0.3)]', // Emerald
      'from-amber-500/80 via-orange-600/60 to-zinc-950/90 hover:from-amber-400 hover:via-orange-500 border-amber-500/30 text-amber-100 shadow-[inset_0_0_20px_rgba(245,158,11,0.3)]', // Topaz
      'from-violet-500/80 via-fuchsia-600/60 to-zinc-950/90 hover:from-violet-400 hover:via-fuchsia-500 border-violet-500/30 text-violet-100 shadow-[inset_0_0_20px_rgba(139,92,246,0.3)]' // Amethyst
    ];
    
    const colorStyle = colors[hash % colors.length];
    const delay = (index % 4) * 0.15;
    
    return {
      clipClass,
      colorStyle,
      delay
    };
  };

  return (
    <div className="relative flex flex-col flex-1 w-full min-h-screen bg-[#020203] text-zinc-300 font-sans overflow-x-hidden pb-32">
      
      {/* 1. 극초미학적 앰비언트 글로우 스팟들 (Dribbble Cyber Gothic) */}
      <div className="fixed top-[-10%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-cyan-950/15 blur-[140px] pointer-events-none animate-glow" />
      <div className="fixed bottom-[10%] right-[-20%] w-[70vw] h-[70vw] rounded-full bg-rose-950/10 blur-[160px] pointer-events-none animate-glow" style={{ animationDelay: '-3s' }} />
      <div className="fixed top-[40%] left-[50%] -translate-x-1/2 w-[50vw] h-[50vw] rounded-full bg-purple-950/5 blur-[180px] pointer-events-none animate-glow" style={{ animationDelay: '-6s' }} />

      {/* 연소 Canvas 효과 */}
      <BurnEffect text={burningText} active={isBurning} onComplete={handleBurnComplete} />

      {/* 헤더 */}
      {view !== 'ENTRANCE' && (
        <motion.header 
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 80, damping: 15 }}
          className="sticky top-0 z-30 w-full backdrop-blur-2xl bg-[#020203]/70 border-b border-white/[0.03] px-6 py-4 flex items-center justify-between"
        >
          <div 
            onClick={() => setView('CATHEDRAL')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 p-[1px] shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-transform group-hover:scale-105">
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#030305]">
                <Flame className="h-4.5 w-4.5 text-amber-500 fill-amber-500/20" />
              </div>
            </div>
            <h1 className="font-serif text-sm tracking-[0.25em] text-[#fafafa] font-bold uppercase transition-colors group-hover:text-amber-400">
              NEON CATHEDRAL
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {userSession && (
              <span className="hidden md:inline-block text-[11px] font-medium text-zinc-400 bg-white/[0.02] border border-white/[0.04] px-3.5 py-1.5 rounded-full tracking-wider shadow-inner">
                🕯️ {userSession.name}
              </span>
            )}

            {/* BGM 퀵 컨트롤러 */}
            <div className="flex items-center gap-3 bg-white/[0.01] border border-white/[0.05] hover:border-white/[0.1] px-3 py-1.5 rounded-full transition-all shadow-lg">
              <button 
                onClick={toggleBGM}
                className="text-zinc-400 hover:text-[#fff] transition-colors p-0.5"
                title={audioPlaying ? 'BGM 정지' : 'BGM 재생'}
              >
                {audioPlaying ? <Volume2 className="h-3.5 w-3.5 text-amber-500 animate-pulse" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05"
                value={audioVolume}
                onChange={handleVolumeChange}
                className="w-14 h-[3px] bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 outline-none"
              />
            </div>
          </div>
        </motion.header>
      )}

      {/* 토스트 피드백 */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-950/40 border border-red-900/30 text-red-200 px-5 py-3 rounded-2xl text-xs backdrop-blur-xl shadow-2xl"
          >
            <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
            <span className="font-light tracking-wide">{errorMsg}</span>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={motionReduced ? false : { opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={motionReduced ? undefined : { opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900/40 border border-white/[0.06] text-amber-300 px-5 py-3 rounded-2xl text-xs backdrop-blur-xl shadow-2xl"
          >
            <Sparkles className="h-4.5 w-4.5 text-amber-400 shrink-0" />
            <span className="font-light tracking-wide text-zinc-200">{successMsg}</span>
          </motion.div>
        )}
        {arrivalToastVisible && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={motionReduced ? false : { opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={motionReduced ? undefined : { opacity: 0, y: -20, scale: 0.95 }}
            onClick={() => {
              setArrivalToastVisible(false);
              setView('LETTER_BOX');
            }}
            className="fixed top-24 left-1/2 z-50 flex min-h-11 -translate-x-1/2 cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.06] bg-zinc-900/40 px-5 py-3 text-xs text-amber-300 shadow-2xl backdrop-blur-xl"
          >
            <Mail className="h-4.5 w-4.5 shrink-0 text-amber-400" />
            <span className="font-light tracking-wide text-zinc-200">
              성찰의 시간이 끝났습니다. 편지봉투가 도착했어요.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 메인 프레임 */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-8 flex flex-col justify-center">
        
        {/* VIEW 1: 성당 입구 (ENTRANCE) - 극도의 비주얼 고도화 */}
        {view === 'ENTRANCE' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center text-center py-12 px-6 max-w-lg mx-auto"
          >
            {/* 고딕 아치 형태로 마스크 처리된 생성 이미지 */}
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="relative w-full aspect-[4/3] rounded-[100px_100px_24px_24px] overflow-hidden border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.8),_0_0_30px_rgba(245,158,11,0.05)] mb-10"
            >
              <Image 
                src="/images/cathedral_entrance.jpg"
                alt="Neon Cathedral Entrance"
                fill
                priority
                className="object-cover opacity-90 brightness-[0.75] contrast-[1.05]"
              />
              {/* 이미지 위 오버레이 그라데이션 */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020203] via-transparent to-[#020203]/20" />
              
              {/* 앰비언트 촛불 데코 */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1.5 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/[0.05]">
                <Flame className="h-4.5 w-4.5 text-amber-500 fill-amber-500/20 animate-pulse" />
                <span className="text-[10px] font-sans font-light tracking-[0.2em] text-amber-400 uppercase">Aura Light ON</span>
              </div>
            </motion.div>

            {/* 타이틀 폰트 조합의 고도화 (Playfair & Outfit) */}
            <h2 className="font-serif text-4xl sm:text-5xl tracking-[0.25em] bg-gradient-to-b from-[#ffffff] via-[#f1f1f3] to-[#8d8d96] bg-clip-text text-transparent font-bold mb-3">
              NEON CATHEDRAL
            </h2>
            <p className="text-zinc-500 font-sans text-[10px] sm:text-xs tracking-[0.4em] uppercase mb-10 font-medium">
              "소멸의 고해소 & 따뜻한 촛불의 회랑"
            </p>

            {/* 미니멀한 약관 카드 */}
            <div className="w-full text-zinc-400 text-xs font-light leading-relaxed text-left space-y-3.5 bg-[#07070a]/50 border border-white/[0.03] p-6 rounded-2xl backdrop-blur-xl shadow-xl mb-12 border-shimmering">
              <div className="flex gap-2">
                <span className="text-amber-500 text-sm font-semibold">Ⅰ.</span>
                <p>본 성당은 개인정보(IP, 이메일, 이름)를 일절 수집하지 않으며, 입장 즉시 익명 순번 식별자가 고유하게 부여됩니다.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-500 text-sm font-semibold">Ⅱ.</span>
                <p>작성된 모든 고해는 불꽃으로 소멸된 뒤 24시간 후 서버에서 영구 삭제됩니다. 단, 5촛불 이상의 공감을 얻은 고민은 영원불멸의 스테인드글라스 벽화로 박제됩니다.</p>
              </div>
              <div className="flex gap-2">
                <span className="text-amber-500 text-sm font-semibold">Ⅲ.</span>
                <p>글을 태운 지 5분이 흐르면, 당신만을 위한 다정한 위로 혹은 냉철한 이성의 답장(편지봉투)이 조용히 배달됩니다.</p>
              </div>
            </div>

            <button
              onClick={handleEnterCathedral}
              className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white font-sans font-bold text-xs sm:text-sm tracking-[0.3em] uppercase hover:shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all duration-500 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              성당 안으로 들어가기
            </button>
          </motion.div>
        )}

        {/* VIEW 2: 고해실 (CONFESS) - 제단(Altar) 테마 디자인 */}
        {view === 'CONFESS' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', damping: 20 }}
            className="space-y-8"
          >
            <div className="text-center space-y-1 mb-2 animate-float">
              <h3 className="font-serif text-3xl text-[#fafafa] font-bold tracking-widest">참회의 제단</h3>
              <p className="text-[11px] font-sans font-light text-zinc-500 tracking-[0.2em] uppercase">Confession Altar</p>
            </div>

            {/* 고해 양식지 느낌의 극도 디자인 */}
            <div className="relative rounded-3xl border border-white/[0.04] bg-[#07070a]/60 backdrop-blur-2xl p-6 shadow-2xl focus-within:border-amber-500/40 focus-within:shadow-[0_0_40px_rgba(245,158,11,0.06)] transition-all duration-500">
              {/* 성당 장식용 금장 모서리 선 데코 */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-white/10 rounded-tl" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-white/10 rounded-tr" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-white/10 rounded-bl" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-white/10 rounded-br" />

              <textarea
                value={writingContent}
                onChange={(e) => setWritingContent(e.target.value)}
                placeholder="마음 속 깊이 침묵하고 있던 고민을 이곳에 바치십시오. 연소되는 순간, 이 지상의 그 어떤 시스템도 당신의 글을 복구할 수 없습니다..."
                maxLength={2000}
                rows={9}
                disabled={isLoading}
                className="w-full bg-transparent border-0 outline-none text-zinc-200 placeholder-zinc-700 text-sm font-serif font-light leading-relaxed resize-none focus:ring-0"
              />
              
              {/* 게이지 바 형태의 캐릭터 카운터 */}
              <div className="mt-6 pt-4 border-t border-white/[0.03] space-y-3">
                <div className="w-full h-[1px] bg-zinc-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                    style={{ width: `${(writingContent.length / 2000) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-light">
                  <span className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-zinc-700" />
                    기밀 보장 (End-to-End Ephemeral)
                  </span>
                  <span className="font-sans font-light tracking-wide">{writingContent.length} / 2,000자</span>
                </div>
              </div>
            </div>

            {/* 입체적 톤 카드 선택 영역 */}
            <div className="space-y-3.5">
              <label className="text-[10px] font-sans font-light text-zinc-500 tracking-[0.2em] uppercase block pl-1">
                서신 톤 선택 (Letter Tone)
              </label>
              <div className="grid grid-cols-2 gap-4">
                {/* 천사 카드 */}
                <button
                  type="button"
                  onClick={() => setSelectedTone('angel')}
                  className={`relative p-5 rounded-2xl border transition-all duration-500 focus:outline-none overflow-hidden ${
                    selectedTone === 'angel'
                      ? 'border-cyan-500/40 bg-cyan-950/10 text-cyan-200 neon-glow-cyan scale-[1.02]'
                      : 'border-white/[0.03] bg-[#07070a]/30 text-zinc-500 hover:border-white/[0.08]'
                  }`}
                >
                  {selectedTone === 'angel' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent pointer-events-none" />
                  )}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <Sparkles className={`h-4.5 w-4.5 ${selectedTone === 'angel' ? 'text-cyan-400' : 'text-zinc-700'}`} />
                    <span className="text-[11px] font-sans font-bold tracking-[0.15em] uppercase">천사의 위로</span>
                  </div>
                  <p className="text-[10px] font-light leading-relaxed text-zinc-400/80 text-left font-serif">
                    진심이 담긴 포근한 위로와, 따뜻한 마음의 포옹을 전하는 편지.
                  </p>
                </button>

                {/* 악마 카드 */}
                <button
                  type="button"
                  onClick={() => setSelectedTone('devil')}
                  className={`relative p-5 rounded-2xl border transition-all duration-500 focus:outline-none overflow-hidden ${
                    selectedTone === 'devil'
                      ? 'border-rose-500/40 bg-rose-950/10 text-rose-200 neon-glow-magenta scale-[1.02]'
                      : 'border-white/[0.03] bg-[#07070a]/30 text-zinc-500 hover:border-white/[0.08]'
                  }`}
                >
                  {selectedTone === 'devil' && (
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
                  )}
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <Flame className={`h-4.5 w-4.5 ${selectedTone === 'devil' ? 'text-rose-400' : 'text-zinc-700'}`} />
                    <span className="text-[11px] font-sans font-bold tracking-[0.15em] uppercase">악마의 속삭임</span>
                  </div>
                  <p className="text-[10px] font-light leading-relaxed text-zinc-400/80 text-left font-serif">
                    팩트를 짚는 현실 자각, 감성을 배제한 칼날 같은 이성의 돌파구.
                  </p>
                </button>
              </div>
            </div>

            {/* 태우기 버튼 */}
            <button
              onClick={handleSubmitConfession}
              disabled={isLoading || !writingContent.trim()}
              className="w-full py-4.5 rounded-2xl bg-zinc-100 text-zinc-950 font-sans font-bold text-xs tracking-[0.3em] uppercase hover:bg-amber-500 hover:text-zinc-950 hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] disabled:opacity-30 disabled:hover:bg-zinc-100 disabled:hover:text-zinc-950 disabled:hover:shadow-none transition-all duration-500"
            >
              {isLoading ? '재로 산화시키는 중...' : '고해 제단에 바쳐 연소하기'}
            </button>
          </motion.div>
        )}

        {/* VIEW 3: 본당 피드 (CATHEDRAL) - 플로팅 3D 카드뷰 */}
        {view === 'CATHEDRAL' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex items-end justify-between border-b border-white/[0.03] pb-5">
              <div>
                <h3 className="font-serif text-3xl text-[#fafafa] font-bold tracking-widest">본당 회랑</h3>
                <p className="text-[11px] font-sans font-light text-zinc-500 tracking-[0.2em] uppercase mt-0.5">Cathedral Feed</p>
              </div>
              <button 
                onClick={loadDataForCurrentView}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-white/[0.04] bg-[#07070a]/40 text-zinc-400 hover:text-zinc-100 hover:border-white/[0.1] disabled:opacity-50 transition-all shadow-inner"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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

            {isLoading && confessions.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-light text-zinc-600 tracking-widest animate-pulse">피드의 불을 지피는 중...</p>
              </div>
            ) : confessions.length === 0 ? (
              <div className="py-24 text-center space-y-4 rounded-3xl border border-white/[0.03] bg-[#07070a]/20 backdrop-blur-xl px-8 shadow-inner">
                <HelpCircle className="h-10 w-10 text-zinc-800 mx-auto" />
                <p className="text-sm font-serif font-light text-zinc-400">아직 타오르는 고민이 없습니다.</p>
                <p className="text-[11px] font-sans font-light text-zinc-600 tracking-wider">
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
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                      className="relative rounded-3xl border border-white/[0.04] bg-[#07070a]/40 backdrop-blur-2xl p-6 flex flex-col justify-between gap-6 hover:border-white/[0.08] hover:shadow-[0_15px_30px_rgba(0,0,0,0.6)] border-shimmering transition-all duration-500"
                    >
                      {/* 카드 헤더 */}
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-light border-b border-white/[0.03] pb-3.5">
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full blur-[1px] ${c.tone === 'angel' ? 'bg-cyan-400 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                          <span className="font-sans font-medium tracking-wider">{c.authorName}</span>
                          {isAuthor && (
                            <span className="text-[9px] font-sans font-bold text-amber-500 tracking-wider bg-amber-950/40 border border-amber-900/50 px-2 py-0.5 rounded-full uppercase">나</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 text-zinc-500 font-sans">
                          <Clock className="h-3 w-3 text-zinc-600" />
                          {getRemainingTimeText(c.expiresAt)}
                        </span>
                      </div>

                      {/* 고민 본문 */}
                      <p className="text-sm font-serif font-light leading-relaxed text-zinc-200 whitespace-pre-wrap break-all pr-2">
                        {c.content}
                      </p>

                      {/* 촛불 버튼 및 상세 안내 */}
                      <div className="flex justify-between items-center border-t border-white/[0.03] pt-4 mt-2">
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-light font-serif">
                          <Info className="h-3.5 w-3.5 text-zinc-700" />
                          <span>5촛불 획득 시 벽화에 영원히 박제됩니다</span>
                        </div>

                        <CandleButton 
                          confessionId={c.id}
                          initialCandles={c.candles}
                          hasVoted={!!voted}
                          onVoteSuccess={(newVal) => handleVoteSuccess(c.id, newVal)}
                          onVoteError={handleVoteError}
                          onToggleVote={toggleCandleAction}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex items-end justify-between border-b border-white/[0.03] pb-5">
              <div>
                <h3 className="font-serif text-3xl text-[#fafafa] font-bold tracking-widest">스테인드글라스 벽</h3>
                <p className="text-[11px] font-sans font-light text-zinc-500 tracking-[0.2em] uppercase mt-0.5">Stained Glass Gallery</p>
              </div>
              <button 
                onClick={loadDataForCurrentView}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-white/[0.04] bg-[#07070a]/40 text-zinc-400 hover:text-zinc-100 hover:border-white/[0.1] disabled:opacity-50 transition-all shadow-inner"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoading && stainedGlass.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-light text-zinc-600 tracking-widest animate-pulse">유리 벽화 조각을 깎는 중...</p>
              </div>
            ) : stainedGlass.length === 0 ? (
              <div className="py-24 text-center space-y-4 rounded-3xl border border-white/[0.03] bg-[#07070a]/20 backdrop-blur-xl px-8 shadow-inner">
                <Grid className="h-10 w-10 text-zinc-800 mx-auto animate-pulse" />
                <p className="text-sm font-serif font-light text-zinc-400">박제된 사연이 아직 없습니다.</p>
                <p className="text-[11px] font-sans font-light text-zinc-600 tracking-wide leading-relaxed">
                  본당의 글에 5개 이상의 촛불을 켜주세요.<br />
                  이 벽면에 영롱한 빛을 내는 조각으로 기록됩니다.
                </p>
              </div>
            ) : (
              // Dribbble Voronoi Grid
              <div className="grid grid-cols-2 gap-x-2 gap-y-4 sm:grid-cols-3 sm:gap-x-3 sm:gap-y-6">
                {stainedGlass.map((c, index) => {
                  const meta = getGlassLayout(index, c.candles, c.id);
                  
                  return (
                    <motion.div
                      key={c.id}
                      onClick={() => setSelectedStainedConfession(c)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: meta.delay, duration: 0.5 }}
                      className={`relative aspect-[5/6] bg-gradient-to-br border cursor-pointer hover:scale-[1.05] hover:z-10 hover:shadow-2xl transition-all duration-500 p-5 flex flex-col justify-between ${meta.clipClass} ${meta.colorStyle}`}
                    >
                      {/* 다각형 내 오로라 반사광 */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/15 to-transparent pointer-events-none" />

                      <div className="flex justify-between items-center text-[9px] font-sans font-bold tracking-widest opacity-80">
                        <span>STAINED</span>
                        <span className="flex items-center gap-0.5 bg-black/40 px-1.5 py-0.5 rounded-full border border-white/5">
                          <Flame className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                          {c.candles}
                        </span>
                      </div>

                      <p className="text-xs font-serif font-light leading-relaxed line-clamp-4 overflow-hidden mb-3 pr-1 tracking-wide italic select-none">
                        "{c.content}"
                      </p>

                      <div className="text-[9px] font-sans font-light opacity-50 text-right tracking-wide">
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex items-end justify-between border-b border-white/[0.03] pb-5">
              <div>
                <h3 className="font-serif text-3xl text-[#fafafa] font-bold tracking-widest">나의 편지함</h3>
                <p className="text-[11px] font-sans font-light text-zinc-500 tracking-[0.2em] uppercase mt-0.5">Your Letters</p>
              </div>
              <button 
                onClick={loadDataForCurrentView}
                disabled={isLoading}
                className="p-2.5 rounded-xl border border-white/[0.04] bg-[#07070a]/40 text-zinc-400 hover:text-zinc-100 hover:border-white/[0.1] disabled:opacity-50 transition-all shadow-inner"
                title="편지함 동기화"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
            <div className="bg-[#09090e]/40 border border-white/[0.03] rounded-3xl p-5 flex gap-4 text-xs leading-relaxed text-zinc-400 shadow-xl">
              <Clock className={`h-5 w-5 text-amber-500 shrink-0 mt-0.5 ${motionReduced ? '' : 'animate-pulse'}`} />
              <div className="space-y-1">
                <span className="text-zinc-200 font-bold block text-[13px] tracking-wide font-serif">5분, 번뇌가 정화되는 시간</span>
                <p className="font-serif font-light text-zinc-400">
                  고해를 불꽃으로 정화시킨 시점으로부터 5분의 성찰이 흐른 뒤 답장이 봉투에 배달됩니다. 성당에 침묵이 차오르는 시간을 온전히 만끽하세요.
                </p>
              </div>
            </div>

            {isLoading && replies.length === 0 && pendingReplies.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="h-6 w-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-light text-zinc-600 tracking-widest animate-pulse">우체통 비우는 중...</p>
              </div>
            ) : replies.length === 0 && pendingReplies.length === 0 ? (
              <div className="py-24 text-center space-y-4 rounded-3xl border border-white/[0.03] bg-[#07070a]/20 backdrop-blur-xl px-8 shadow-inner">
                <Mail className="h-10 w-10 text-zinc-800 mx-auto" />
                <p className="text-sm font-serif font-light text-zinc-400">도착한 편지함이 고요합니다.</p>
                <p className="text-[11px] font-sans font-light text-zinc-600 tracking-wide leading-relaxed">
                  고해를 태우면 이곳에 봉인된 편지가 먼저 나타납니다.<br />
                  5분 뒤 자동으로 개봉할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
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
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="border-b border-white/[0.03] pb-5">
              <h3 className="font-serif text-3xl text-[#fafafa] font-bold tracking-widest">성당 비축고</h3>
              <p className="text-[11px] font-sans font-light text-zinc-500 tracking-[0.2em] uppercase mt-0.5">Atmosphere Configuration</p>
            </div>

            <div className="rounded-3xl border border-white/[0.04] bg-[#07070a]/40 backdrop-blur-2xl divide-y divide-white/[0.03] overflow-hidden shadow-2xl">
              
              {/* BGM 제어 */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <label className="text-sm text-zinc-200 font-serif font-medium flex items-center gap-2.5">
                      <Music className="h-4.5 w-4.5 text-zinc-500" />
                      로파이 앰비언스 루프
                    </label>
                    <p className="text-[10px] text-zinc-500 font-light font-sans">
                      성당 내부의 아늑한 음향 환경을 활성화합니다.
                    </p>
                  </div>
                  <button 
                    onClick={toggleBGM}
                    className={`text-[10px] font-sans font-bold tracking-widest px-4 py-2 rounded-full transition-all uppercase ${
                      audioPlaying 
                        ? 'bg-amber-950/30 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-zinc-900/60 text-zinc-600 border border-zinc-800'
                    }`}
                  >
                    {audioPlaying ? 'PLAYING' : 'MUTED'}
                  </button>
                </div>
                <div className="flex items-center gap-4 pt-1">
                  <span className="text-zinc-600"><VolumeX className="h-4 w-4" /></span>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={audioVolume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-[4px] bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500 outline-none"
                  />
                  <span className="text-zinc-600"><Volume2 className="h-4 w-4" /></span>
                </div>
              </div>

              {/* 접근성 제어 */}
              <div className="p-6 flex justify-between items-center">
                <div className="space-y-1 pr-6">
                  <label className="text-sm text-zinc-200 font-serif font-medium flex items-center gap-2.5">
                    <Sparkles className="h-4.5 w-4.5 text-zinc-500" />
                    애니메이션 간소화 (Reduced Motion)
                  </label>
                  <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
                    불꽃 연소 및 글로우 등 물리 연산을 줄여 하드웨어의 배터리를 보존하고 시각 편의를 제공합니다.
                  </p>
                </div>
                <button
                  onClick={toggleReducedMotion}
                  className={`text-[10px] font-sans font-bold tracking-widest px-4 py-2 rounded-full transition-all shrink-0 ${
                    reducedMotion 
                      ? 'bg-white text-zinc-950 font-bold'
                      : 'bg-zinc-900/60 text-zinc-600 border border-zinc-800'
                  }`}
                >
                  {reducedMotion ? 'REDUCED' : 'ACTIVE'}
                </button>
              </div>

              {/* 익명 토큰 뱃지 */}
              {userSession && (
                <div className="p-6 space-y-2">
                  <span className="text-[10px] font-sans font-light text-zinc-500 tracking-wider uppercase block">나의 고유 세션 데이터</span>
                  <div className="bg-black/40 border border-white/[0.03] p-4 rounded-2xl space-y-1">
                    <span className="text-xs text-zinc-300 font-serif font-bold block">식별자: {userSession.name}</span>
                    <span className="text-[9px] text-zinc-600 font-mono tracking-wider block break-all">
                      TOKEN: {userSession.id}
                    </span>
                  </div>
                </div>
              )}

              {/* 프라이버시 조항 */}
              <div className="p-6 text-[10px] text-zinc-500 font-serif font-light leading-relaxed space-y-2">
                <span className="block font-bold text-zinc-400 mb-1 tracking-wider uppercase">개인정보 취급 & 소멸 규정</span>
                <p>• 네온 성당은 회원가입을 지원하지 않으며, 클라이언트 쿠키 토큰은 오직 익명 식별을 위한 용도로만 브라우저 내에 국한되어 보관됩니다.</p>
                <p>• 태워진 고해 글은 24시간의 노출 기한 경과 시 데이터베이스에서 하드 삭제(Hard-Delete) 처리되며 어떠한 백업본도 남겨두지 않습니다.</p>
                <p>• 단, 5촛불 이상의 깊은 공감을 달성하여 '스테인드글라스 벽화'로 보존 판정을 받은 흔적은 이 공간에 예술 조각으로 영원히 보존됩니다.</p>
              </div>

            </div>
          </motion.div>
        )}

      </main>

      {/* 하단 둥글고 세련된 플로팅 글래스 네비게이션 바 */}
      {view !== 'ENTRANCE' && (
        <motion.nav 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 90, damping: 14, delay: 0.1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[calc(100%-2rem)] rounded-3xl backdrop-blur-3xl bg-[#07070a]/75 border border-white/[0.04] py-3.5 px-6 flex justify-between items-center shadow-[0_30px_60px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.05)]"
        >
          {/* 고해실 */}
          <button
            onClick={() => setView('CONFESS')}
            className={`relative flex flex-col items-center gap-1.5 transition-colors ${
              view === 'CONFESS' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <PenTool className="h-4.5 w-4.5" />
            <span className="text-[9px] font-sans font-medium tracking-wide">제단</span>
            {view === 'CONFESS' && (
              <motion.div layoutId="nav-active" className="absolute -bottom-2.5 w-1 h-1 rounded-full bg-amber-400" />
            )}
          </button>

          {/* 본당 피드 */}
          <button
            onClick={() => setView('CATHEDRAL')}
            className={`relative flex flex-col items-center gap-1.5 transition-colors ${
              view === 'CATHEDRAL' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Compass className="h-4.5 w-4.5" />
            <span className="text-[9px] font-sans font-medium tracking-wide">회랑</span>
            {view === 'CATHEDRAL' && (
              <motion.div layoutId="nav-active" className="absolute -bottom-2.5 w-1 h-1 rounded-full bg-amber-400" />
            )}
          </button>

          {/* 스테인드글라스 */}
          <button
            onClick={() => setView('STAINED_GLASS')}
            className={`relative flex flex-col items-center gap-1.5 transition-colors ${
              view === 'STAINED_GLASS' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Grid className="h-4.5 w-4.5" />
            <span className="text-[9px] font-sans font-medium tracking-wide">벽화</span>
            {view === 'STAINED_GLASS' && (
              <motion.div layoutId="nav-active" className="absolute -bottom-2.5 w-1 h-1 rounded-full bg-amber-400" />
            )}
          </button>

          {/* 편지함 */}
          <button
            onClick={() => setView('LETTER_BOX')}
            aria-label={unreadCount > 0 ? `서신, 미읽음 ${unreadCount}건` : '서신'}
            className={`relative flex flex-col items-center gap-1.5 transition-colors ${
              view === 'LETTER_BOX' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="relative">
              <Mail className="h-4.5 w-4.5" />
              {unreadCount === 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1 -right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-[#07070a]/75"
                />
              )}
              {unreadCount >= 2 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-2.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-zinc-950"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="text-[9px] font-sans font-medium tracking-wide">서신</span>
            {view === 'LETTER_BOX' && (
              <motion.div layoutId="nav-active" className="absolute -bottom-2.5 w-1 h-1 rounded-full bg-amber-400" />
            )}
          </button>

          {/* 설정 */}
          <button
            onClick={() => setView('SETTINGS')}
            className={`relative flex flex-col items-center gap-1.5 transition-colors ${
              view === 'SETTINGS' ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <SettingsIcon className="h-4.5 w-4.5" />
            <span className="text-[9px] font-sans font-medium tracking-wide">비축</span>
            {view === 'SETTINGS' && (
              <motion.div layoutId="nav-active" className="absolute -bottom-2.5 w-1 h-1 rounded-full bg-amber-400" />
            )}
          </button>

        </motion.nav>
      )}

      {/* 모달: 스테인드글라스 라이트박스 */}
      <AnimatePresence>
        {selectedStainedConfession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStainedConfession(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="relative w-full max-w-md rounded-3xl border border-white/[0.05] bg-gradient-to-br from-[#0c0c10] to-[#040406] p-6 space-y-6 shadow-2xl z-10 overflow-hidden"
            >
              {/* 모달 내 앰비언트 백그라운드 오로라 */}
              <div className="absolute -top-16 -left-16 w-52 h-52 bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />

              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-light border-b border-white/[0.03] pb-3.5">
                <span className="flex items-center gap-1.5 font-serif">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  보존된 유리의 편린
                </span>
                <span className="flex items-center gap-1 text-amber-400 font-sans font-bold bg-amber-950/30 border border-amber-900/50 px-2.5 py-0.5 rounded-full">
                  <Flame className="h-3 w-3 fill-amber-400" />
                  {selectedStainedConfession.candles} 촛불 공감
                </span>
              </div>

              <div className="space-y-4">
                <p className="text-base font-serif font-light leading-relaxed text-zinc-200 whitespace-pre-wrap tracking-wide italic pr-2">
                  "{selectedStainedConfession.content}"
                </p>
                <div className="flex justify-end text-xs font-serif font-light text-zinc-500">
                  — {selectedStainedConfession.authorName}의 사유
                </div>
              </div>

              <button
                onClick={() => setSelectedStainedConfession(null)}
                className="w-full py-3.5 rounded-2xl bg-zinc-900/50 text-zinc-300 font-sans font-semibold text-xs tracking-wider border border-white/[0.04] hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
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
