import React, { useEffect, useRef } from 'react';

// Rotating, heavily blurred rectangular "light blocks" in a handful of
// colors, drifting on slow independent orbits — the colorful part of the
// effect. A fine animated grain layer sits on top of this (see the
// .imagegen-grain CSS class in ImageGenBlock), like light glowing through
// frosted, slightly noisy glass.
export default function ImageGenCanvas({ className }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // A handful of distinct hues — this widget stands in for generated
    // artwork, so it's the one place in the app allowed a real palette.
    const blocks = [
      { orbitR: 0.28, speed: 0.14, phase: 0.0, spin: 0.18, w: 0.5, h: 0.34, color: '0,136,204', alpha: 0.55 },
      { orbitR: 0.24, speed: -0.1, phase: 2.4, spin: -0.12, w: 0.4, h: 0.42, color: '124,92,214', alpha: 0.4 },
      { orbitR: 0.32, speed: 0.08, phase: 4.1, spin: 0.09, w: 0.38, h: 0.3, color: '224,149,74', alpha: 0.35 },
      { orbitR: 0.2, speed: -0.16, phase: 1.3, spin: -0.2, w: 0.34, h: 0.34, color: '43,168,148', alpha: 0.4 },
      { orbitR: 0.16, speed: 0.2, phase: 3.3, spin: 0.15, w: 0.3, h: 0.26, color: '36,161,222', alpha: 0.3 },
    ];

    let frameId;
    let start = performance.now();

    const draw = (now) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.filter = 'blur(30px)';

      blocks.forEach((b) => {
        const cx = width * (0.5 + b.orbitR * Math.cos(t * b.speed + b.phase));
        const cy = height * (0.5 + b.orbitR * Math.sin(t * b.speed * 1.2 + b.phase));
        const w = b.w * width;
        const h = b.h * height;
        const angle = t * b.spin;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = `rgba(${b.color},${b.alpha})`;
        const r = Math.min(w, h) * 0.25;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(-w / 2, -h / 2, w, h, r);
        } else {
          ctx.rect(-w / 2, -h / 2, w, h);
        }
        ctx.fill();
        ctx.restore();
      });

      ctx.filter = 'none';
      frameId = requestAnimationFrame(draw);
    };
    frameId = requestAnimationFrame(draw);

    const handleResize = () => resize();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
