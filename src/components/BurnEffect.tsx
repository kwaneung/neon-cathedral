'use client';

import React, { useEffect, useRef } from 'react';

interface BurnEffectProps {
  text: string;
  onComplete: () => void;
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const BurnEffect: React.FC<BurnEffectProps> = ({ text, onComplete, active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 뷰포트 크기로 조정
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = [];
    
    // 화면 중심에서 불꽃 시작
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // 텍스트를 먼저 그리기 (화면 중앙에 흩어질 텍스트)
    ctx.font = '20px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 줄바꿈 처리하여 그리기
    const lines = [];
    const maxLineLength = 20;
    for (let i = 0; i < text.length; i += maxLineLength) {
      lines.push(text.substring(i, i + maxLineLength));
    }

    // 텍스트 영역을 픽셀화하여 파티클 생성하기
    const textHeight = lines.length * 28;
    const startY = centerY - textHeight / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    lines.forEach((line, index) => {
      ctx.fillText(line, centerX, startY + index * 28);
    });

    // 텍스트가 그려진 영역의 픽셀 추출
    const textWidth = Math.min(canvas.width - 40, 450);
    const imgData = ctx.getImageData(
      centerX - textWidth / 2, 
      startY - 20, 
      textWidth, 
      textHeight + 40
    );
    const pixels = imgData.data;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 픽셀 중 흰색 계열(글자)을 파티클로 전환
    const step = 4; // 성능 최적화를 위한 픽셀 간격
    const colors = [
      '#ff3b30', // Red
      '#ff9500', // Orange
      '#ffcc00', // Yellow
      '#ff2d55', // Pinkish Red
      '#8e8e93', // Ash Gray (재)
    ];

    for (let y = 0; y < imgData.height; y += step) {
      for (let x = 0; x < imgData.width; x += step) {
        const index = (y * imgData.width + x) * 4;
        const alpha = pixels[index + 3];
        
        if (alpha > 50) {
          const px = centerX - textWidth / 2 + x;
          const py = startY - 20 + y;

          // 텍스트 픽셀 기반 파티클
          particles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 2 - 0.5,
            life: 0,
            maxLife: 60 + Math.random() * 40,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 2.5 + 1
          });
        }
      }
    }

    // 배경 연소 상승 기류용 추가 불꽃 파티클 생성
    const fireInterval = setInterval(() => {
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + 50 + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 4 - 2,
          life: 0,
          maxLife: 40 + Math.random() * 30,
          color: colors[Math.floor(Math.random() * (colors.length - 1))], // 재 색깔 제외
          size: Math.random() * 4 + 2
        });
      }
    }, 30);

    let animationFrameId: number;
    let frameCount = 0;

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.15)'; // 잔상 효과
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // 위치 업데이트
        p.x += p.vx;
        p.y += p.vy;
        
        // 상승 기류 효과 (중력 반대 방향 및 바람)
        p.vy -= 0.03;
        p.vx += Math.sin(frameCount * 0.05 + p.y * 0.01) * 0.05; // 부드러운 흔들림
        
        p.life++;

        // 서서히 작아지며 색 변화
        const lifeRatio = p.life / p.maxLife;
        let size = p.size * (1 - lifeRatio);
        if (size < 0) size = 0;

        // 불 타들어 가다 재가 되는 색 조합
        let color = p.color;
        if (lifeRatio > 0.6) {
          color = '#3a3a3c'; // 완전히 타서 재가 됨 (Dark Gray)
        } else if (lifeRatio > 0.3 && p.color !== '#8e8e93') {
          color = '#ff9500'; // 주황/노랑으로 승화
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        
        // 글로우 효과 (주황/노랑 파티클에 적용)
        if (lifeRatio < 0.6 && color !== '#3a3a3c') {
          ctx.shadowBlur = 10;
          ctx.shadowColor = color;
        } else {
          ctx.shadowBlur = 0;
        }
        
        ctx.fill();

        // 수명 만료 시 제거
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
        }
      }

      ctx.shadowBlur = 0; // 그림자 초기화

      if (frameCount > 80) {
        clearInterval(fireInterval);
      }

      // 파티클이 모두 사라지거나 일정 시간 경과 시 완료 콜백 실행
      if (particles.length === 0 && frameCount > 80) {
        onComplete();
      } else {
        frameCount++;
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(fireInterval);
    };
  }, [active, text, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none w-full h-full"
    />
  );
};
export default BurnEffect;
