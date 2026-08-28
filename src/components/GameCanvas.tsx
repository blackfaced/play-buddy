import { useEffect, useRef } from 'react';
import { GameEngine } from '@/game/engine';
import { registerEngine } from '@/game/controller';
import { useStore } from '@/store/useStore';
import CanvasHud from './CanvasHud';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const phase = useStore((s) => s.phase);
  const lock = useStore((s) => s.lock);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const e = new GameEngine(canvas, {
      onLive: (s) => useStore.getState().liveUpdate(s),
      onGameOver: (s) => useStore.getState().endRound(s),
      onReady: () => undefined,
    });
    engineRef.current = e;
    registerEngine(e);
    // test/debug handle (read-only usage in e2e checks)
    (window as unknown as { __bbEngine?: GameEngine }).__bbEngine = e;
    const ro = new ResizeObserver(() => e.resize(wrap.clientWidth, wrap.clientHeight));
    ro.observe(wrap);
    e.resize(wrap.clientWidth, wrap.clientHeight);
    return () => {
      ro.disconnect();
      e.destroy();
      registerEngine(null);
      engineRef.current = null;
    };
  }, []);

  // sync store phase / anti-addiction lock → engine
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    if (lock !== null || phase === 'paused') {
      e.freeze();
    } else if (phase === 'ready') {
      e.setStepping(true);
      e.setInput(false);
    } else if (phase === 'playing') {
      e.unfreeze();
    } else {
      e.setStepping(false);
      e.setInput(false);
    }
  }, [phase, lock]);

  // Pass raw CSS-pixel coordinates (relative to the canvas). The engine maps
  // them through camera zoom + camX/camY itself — do not rescale here.
  const toCanvas = (ev: React.PointerEvent): { x: number; y: number } => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  };

  return (
    <div
      ref={wrapRef}
      className="canvas-frame relative h-full w-full overflow-hidden rounded-rlg border border-white/70 shadow-[0_8px_30px_rgba(60,140,190,.25),inset_0_1px_0_rgba(255,255,255,.6)]"
      style={{
        // matches the canvas sky gradient (deeper blue up high → pale haze
        // near the ground) so the frame never shows a seam before first paint
        background: 'linear-gradient(to bottom, #8CD2F4 0%, #C9EBFB 55%, #EEF7EF 100%)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'manipulation' }}
        role="application"
        aria-label="平衡积木游戏画布：点击积木消除，让六边形安全下落"
        onPointerDown={(ev) => {
          const e = engineRef.current;
          if (!e) return;
          const p = toCanvas(ev);
          e.pointerDown(p.x, p.y);
        }}
        onPointerMove={(ev) => {
          const e = engineRef.current;
          if (!e) return;
          const p = toCanvas(ev);
          e.pointerMove(p.x, p.y);
          canvasRef.current!.style.cursor = e.isHovering() ? 'pointer' : 'default';
        }}
        onPointerLeave={() => {
          engineRef.current?.pointerLeave();
          if (canvasRef.current) canvasRef.current.style.cursor = 'default';
        }}
      />
      <CanvasHud />
    </div>
  );
}
