import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  audioLevel: number; // 0-1
  isActive: boolean;
}

const BAR_COUNT = 20;
const BAR_GAP = 3;
const MIN_BAR_HEIGHT = 4;
const MAX_BAR_HEIGHT = 32;

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioLevel, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const barsRef = useRef<number[]>(new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width - (BAR_COUNT - 1) * BAR_GAP) / BAR_COUNT;
      const centerY = height / 2;

      // Update bars with smoothing
      for (let i = 0; i < BAR_COUNT; i++) {
        // Create variation based on position and audio level
        const positionFactor = Math.sin((i / BAR_COUNT) * Math.PI);
        const randomFactor = 0.5 + Math.random() * 0.5;
        const targetHeight = isActive
          ? MIN_BAR_HEIGHT + audioLevel * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT) * positionFactor * randomFactor
          : MIN_BAR_HEIGHT;

        // Smooth transition
        barsRef.current[i] += (targetHeight - barsRef.current[i]) * 0.3;
      }

      // Draw bars
      for (let i = 0; i < BAR_COUNT; i++) {
        const x = i * (barWidth + BAR_GAP);
        const barHeight = barsRef.current[i];

        // Gradient color based on height
        const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
        if (isActive && audioLevel > 0.1) {
          gradient.addColorStop(0, '#38bdf8'); // sky-400
          gradient.addColorStop(0.5, '#0ea5e9'); // sky-500
          gradient.addColorStop(1, '#38bdf8'); // sky-400
        } else {
          gradient.addColorStop(0, '#475569'); // slate-600
          gradient.addColorStop(0.5, '#64748b'); // slate-500
          gradient.addColorStop(1, '#475569'); // slate-600
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive]);

  return (
    <div className="flex items-center justify-center py-2">
      <canvas
        ref={canvasRef}
        width={200}
        height={40}
        className="opacity-80"
      />
    </div>
  );
};
