// Web Audio API를 활용한 로파이 앰비언트 신디사이저
export class LofiSynth {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private noiseSource: AudioBufferSourceNode | null = null;
  private oscs: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private masterGain: GainNode | null = null;
  private volumeValue = 0.3; // 기본 볼륨 30%

  constructor() {
    // SSR 대응: client side에서만 실행되도록 생성자에서 AudioContext를 만들지 않음
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch (e) {
      console.error('Web Audio API is not supported in this browser', e);
    }
  }

  // 브라운 노이즈 (빗소리/모닥불 타는 소리 효과) 생성
  private createBrownianNoise(ctx: AudioContext): AudioBufferSourceNode {
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // 브라운 노이즈 필터링 공식
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // 증폭
    }

    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    return source;
  }

  // 아날로그 패드 화음 생성 (테이프 워블 효과 포함)
  private playPadChord(ctx: AudioContext, freqs: number[]) {
    // 기존 오실레이터 정지 및 비우기
    this.stopPad();

    freqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'triangle'; // 부드러운 아날로그 톤
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      // 테이프 워블 느낌을 주기 위한 미세한 피치 모듈레이션 (Vibrato)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 2 + Math.random() * 2; // 2Hz ~ 4Hz 진동
      lfoGain.gain.value = 1.5; // 미세한 주파수 변화량
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
      
      // LFO 참조 저장하여 정지 가능하게 처리하기 위해 oscs에 담음
      this.oscs.push(lfo);

      // Lowpass 필터로 아날로그 따스함 주기
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500 + Math.random() * 100; // 먹먹하게 필터링
      filter.Q.value = 1.0;

      // 마스터 게인과 연결
      oscGain.gain.setValueAtTime(0, ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 3); // 서서히 페이드인 (Attack)

      osc.connect(filter);
      filter.connect(oscGain);
      if (this.masterGain) {
        oscGain.connect(this.masterGain);
      }

      osc.start();
      this.oscs.push(osc);
      this.gains.push(oscGain);
    });
  }

  private stopPad() {
    this.gains.forEach((g) => {
      try {
        g.gain.setValueAtTime(g.gain.value, this.ctx!.currentTime);
        g.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + 1.5); // 페이드 아웃
      } catch (e) {}
    });
    
    // 약간의 딜레이 뒤 완전히 정지
    const currentOscs = [...this.oscs];
    setTimeout(() => {
      currentOscs.forEach((o) => {
        try {
          o.stop();
        } catch (e) {}
      });
    }, 1500);

    this.oscs = [];
    this.gains = [];
  }

  // 코드 진행 순환 루프 실행
  private chordIndex = 0;
  private chordIntervalId: any = null;
  // 감성적인 성당 마이너/메이저 7-9 패드 코드 진행
  // 1: Cmin9 (C3, G3, A#3, D4, D#4)
  // 2: Fm9 (F3, C4, D#4, G4, G#4)
  // 3: A#13 (A#2, F3, G#3, D4, G4)
  // 4: D#maj9 (D#3, A#3, D4, F4, G4)
  private chords = [
    [130.81, 196.00, 233.08, 293.66, 311.13], // Cmin9
    [174.61, 261.63, 311.13, 392.00, 415.30], // Fm9
    [116.54, 174.61, 207.65, 293.66, 392.00], // A#13
    [155.56, 233.08, 293.66, 349.23, 392.00], // D#maj9
  ];

  private startChordProgression(ctx: AudioContext) {
    const playNext = () => {
      const freqs = this.chords[this.chordIndex];
      this.playPadChord(ctx, freqs);
      this.chordIndex = (this.chordIndex + 1) % this.chords.length;
    };

    playNext();
    // 8초마다 코드 변경
    this.chordIntervalId = setInterval(playNext, 9000);
  }

  public start() {
    this.init();
    if (!this.ctx || this.isPlaying) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;

    // 마스터 볼륨 설정
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volumeValue, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // 1. 빗소리/노이즈 재생
    this.noiseSource = this.createBrownianNoise(this.ctx);
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 350; // 차분한 빗소리

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.07; // 작게

    this.noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    this.noiseSource.start();

    // 2. 패드 코드 진행 시작
    this.startChordProgression(this.ctx);
  }

  public stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    if (this.chordIntervalId) {
      clearInterval(this.chordIntervalId);
      this.chordIntervalId = null;
    }

    // 빗소리 정지
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch (e) {}
      this.noiseSource = null;
    }

    // 패드 정지
    this.stopPad();

    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.suspend();
    }
  }

  public setVolume(volume: number) {
    this.volumeValue = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volumeValue, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volumeValue;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// 싱글톤 인스턴스 생성 (SSR 대응)
let synthInstance: LofiSynth | null = null;
export function getLofiSynth(): LofiSynth {
  if (typeof window === 'undefined') {
    return {} as any; // SSR 모크
  }
  if (!synthInstance) {
    synthInstance = new LofiSynth();
  }
  return synthInstance;
}
