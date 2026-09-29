/**
 * 字的构造台 · 笔顺字卡
 *
 * 从 study-buddy 迁来的能力：HanziWriter 的逐笔/重播演示 + 字形居中缩放
 * （那边叫 char-center.js，处理"一"这种扁字在窄屏被切掉的问题）。
 *
 * 这里只做**示范**，不做屏幕书写和自动评分 —— study-buddy 的
 * docs/product-direction.md 已明确「网页默写、必须在屏幕上书写、自动字迹
 * 评分退出首版主流程」，其 handwriting-coach.js（28KB）也因
 * VALIDATED_STROKE_ORDERS 为空表（未人工校验）而不可用，不迁移。
 * 孩子在纸上写，这里负责让他在写之前把字"看清"。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { HanziData } from './strokes';
import {
  STRUCT_LABEL,
  topLabel,
  bottomLabel,
  type CharStructure,
} from './structure';

type HanziWriterInstance = {
  animateCharacter(): void;
  loopCharacterAnimation(): void;
  pauseAnimation(): void;
  resumeAnimation(): void;
  setCharacter(char: string): void;
  quiz?(options: unknown): void;
  cancelQuiz?(): void;
};

declare global {
  interface Window {
    HanziWriter?: {
      create(
        el: HTMLElement,
        char: string,
        options: Record<string, unknown>,
      ): HanziWriterInstance;
    };
  }
}

/** 笔顺库 ~142KB，动态加载：别让它进首屏包 */
let libPromise: Promise<void> | null = null;
let strokesPromise: Promise<typeof import('./strokes')> | null = null;

function loadLib(): Promise<void> {
  if (window.HanziWriter) return Promise.resolve();
  if (!libPromise) {
    libPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/vendor/hanzi-writer-3.5.0.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('hanzi-writer 加载失败'));
      document.head.appendChild(s);
    }).catch((e) => {
      libPromise = null;
      throw e;
    });
  }
  return libPromise;
}

function loadStrokes() {
  if (!strokesPromise) strokesPromise = import('./strokes');
  return strokesPromise;
}

interface Props {
  char: string;
  /** 同时展示结构拆解（搭积木答对后用） */
  structure?: CharStructure | null;
  size?: number;
}

export default function CharCard({ char, structure = null, size = 260 }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<HanziWriterInstance | null>(null);
  const [data, setData] = useState<HanziData | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);

  // 换字时重置状态用 React 官方的"渲染期调整 state"写法，而不是在
  // effect 开头同步 setState —— 后者会触发级联渲染（react-hooks
  // 规则会报，且确实多渲染一轮）。
  const [prevChar, setPrevChar] = useState(char);
  if (prevChar !== char) {
    setPrevChar(char);
    setPlaying(false);
    setReady(false);
    setFailed(false);
  }

  // 挂 HanziWriter：取内嵌字形 → 动态加载库 → 建实例 → 量包围盒校正
  useEffect(() => {
    let alive = true;
    writerRef.current = null;
    if (boxRef.current) boxRef.current.innerHTML = '';

    void (async () => {
      let mod: typeof import('./strokes');
      try {
        mod = await loadStrokes();
      } catch {
        if (alive) setFailed(true);
        return;
      }
      const d = mod.getHanziData(char);
      if (!alive) return;
      if (!d) {
        setData(null);
        setFailed(true);
        return;
      }
      setData(d);
      try {
        await loadLib();
      } catch {
        if (alive) setFailed(true);
        return;
      }
      if (!alive || !window.HanziWriter || !boxRef.current || !wrapRef.current) return;

      // ---- 字形居中：迁自 char-center.js 的思路 ----
      // HanziWriter 用自己的元数据把字放在 1024 坐标系里，"一"这种扁字
      // 在窄屏会被切掉。固定 padding 也不可能对每个视口都对，所以这里
      // 量渲染后的包围盒再算缩放，让字落进梯形格/方格中央。
      const box = boxRef.current;
      const inner = Math.max(120, size - 8);
      const w = window.HanziWriter.create(box, char, {
        width: inner,
        height: inner,
        padding: 4,
        showCharacter: true,
        showOutline: true,
        strokeColor: '#3B332A',
        outlineColor: '#DCD3BF',
        drawingColor: '#3B332A',
        strokeAnimationSpeed: 0.85,
        delayBetweenStrokes: 300,
        charDataLoader: (_c: string, onComplete: (d: unknown) => void) => onComplete(d),
      });
      writerRef.current = w;
      setReady(true);

      // 二次校正：等 SVG 渲染完再量一次包围盒
      requestAnimationFrame(() => {
        const g = box.querySelector('g');
        if (!g) return;
        try {
          const bb = g.getBBox();
          const stage = box.getBoundingClientRect();
          if (bb.width <= 0 || stage.width <= 0) return;
          const scale = Math.min(1, stage.width / (bb.width * 1.06), stage.height / (bb.height * 1.06));
          g.setAttribute(
            'transform',
            `translate(${stage.width / 2 - (bb.x + bb.width / 2) * scale} ${stage.height / 2 - (bb.y + bb.height / 2) * scale}) scale(${scale})`,
          );
        } catch {
          /* 量不到就保持默认，不要因此白屏 */
        }
      });
    })();

    return () => {
      alive = false;
    };
  }, [char, size]);

  const replay = useCallback(() => {
    const w = writerRef.current;
    if (!w) return;
    try {
      if (playing) {
        w.pauseAnimation();
        setPlaying(false);
      } else {
        w.resumeAnimation();
        w.animateCharacter();
        setPlaying(true);
        window.setTimeout(() => setPlaying(false), 2600);
      }
    } catch {
      setPlaying(false);
    }
  }, [playing]);

  const n = data ? data.strokes.length : 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={wrapRef}
        className="relative rounded-2xl border-2 border-[#E3D9C4] bg-[#FFFDF8]"
        style={{ width: size, height: size }}
      >
        {/* 田字格参考线 */}
        <div className="pointer-events-none absolute inset-0 z-[1]">
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-[#E6B9B4]" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#E6B9B4]" />
        </div>
        <div ref={boxRef} className="absolute inset-0 z-[2]" />
        {failed && (
          <div className="absolute inset-0 z-[3] grid place-items-center px-6 text-center text-[13px] leading-relaxed text-[#9C8E7B]">
            这个字不在内嵌字库里
            <br />
            暂时看不了笔顺
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-white/80 px-3 py-1 text-[13px] font-bold text-[#6D6051]">
          {char} · {n ? `${n} 画` : '暂无笔顺'}
        </span>
        <button
          onClick={replay}
          disabled={!ready}
          className="rounded-full bg-[#2F6F5E] px-4 py-1 text-[13px] font-bold text-white transition hover:bg-[#25604F] disabled:opacity-40"
        >
          {playing ? '停一下' : '看笔顺'}
        </button>
      </div>

      {structure && (
        <div className="flex w-full flex-col items-center gap-2 rounded-2xl bg-white/70 p-4">
          <div className="flex items-center justify-center gap-3">
            <PartBox text={structure.top} label={topLabel(structure.struct)} />
            <span className="text-lg font-black text-[#9C8E7B]">+</span>
            <PartBox text={structure.bottom} label={bottomLabel(structure.struct)} />
            <span className="text-lg font-black text-[#9C8E7B]">=</span>
            <div className="grid h-[76px] w-[76px] place-items-center rounded-xl border-2 border-[#2F6F5E] bg-white text-[46px] leading-none">
              {structure.char}
            </div>
          </div>
          <div className="text-[13px] font-bold text-[#2F6F5E]">{STRUCT_LABEL[structure.struct]}</div>
          <p className="m-0 text-center text-[13px] leading-relaxed text-[#6D6051]">{structure.tip}</p>
        </div>
      )}
    </div>
  );
}

function PartBox({ text, label }: { text: string; label: string }) {
  const long = text.length > 1;
  return (
    <div className="flex flex-col items-center">
      <div
        className="grid h-[68px] w-[68px] place-items-center rounded-xl border-2 border-[#CFE0D9] bg-[#E6F0EC] leading-none"
        style={{ fontSize: long ? 22 : 40 }}
      >
        {text}
      </div>
      <div className="mt-1 text-[12px] font-bold text-[#9C8E7B]">{label}</div>
    </div>
  );
}
