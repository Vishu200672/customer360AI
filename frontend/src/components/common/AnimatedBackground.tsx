import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
}

export const AnimatedBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // 50 High-visibility vibrant constellation nodes
    const particleCount = 50;
    const particles: Particle[] = [];
    const colorPairs = [
      { fill: 'rgba(16, 185, 129, 0.9)', glow: 'rgba(16, 185, 129, 0.6)' }, // Emerald
      { fill: 'rgba(99, 102, 241, 0.9)', glow: 'rgba(99, 102, 241, 0.6)' }, // Indigo
      { fill: 'rgba(14, 165, 233, 0.9)', glow: 'rgba(14, 165, 233, 0.6)' }, // Sky Blue
      { fill: 'rgba(236, 72, 153, 0.85)', glow: 'rgba(236, 72, 153, 0.5)' }, // Pink
    ];

    for (let i = 0; i < particleCount; i++) {
      const color = colorPairs[Math.floor(Math.random() * colorPairs.length)];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2.5 + 2,
        color: color.fill,
        glowColor: color.glow,
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw active constellation lines & glowing particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Particle Glow Halo
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.glowColor;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();

        // Connect nearby nodes
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 160) {
            const alpha = 0.35 * (1 - dist / 160);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Interactive Mouse Laser Connection
        const mdx = p.x - mouseX;
        const mdy = p.y - mouseY;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < 180) {
          const malpha = 0.5 * (1 - mdist / 180);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.strokeStyle = `rgba(16, 185, 129, ${malpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* Movable Panning Background Image Layer */}
      <div
        className="absolute -inset-10 bg-cover bg-center opacity-60 dark:opacity-40 transition-all duration-700 animate-bg-drift mix-blend-multiply dark:mix-blend-soft-light"
        style={{
          backgroundImage: `url('/dashboard-bg.png')`,
        }}
      />

      {/* Pulsing Gradient Ambient Light Sources */}
      <div className="absolute top-10 left-1/4 w-[500px] h-[500px] rounded-full bg-emerald-500/15 dark:bg-emerald-500/10 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-indigo-500/15 dark:bg-indigo-500/10 blur-3xl animate-pulse" style={{ animationDuration: '9s' }} />

      {/* Interactive Particle Constellation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

export default AnimatedBackground;
