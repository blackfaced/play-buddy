/**
 * 糖果口算岛 · 游戏 UI 组件
 *
 * 自包含：自带 localStorage 进度存档 + WebAudio 提示音，不依赖主游戏 store。
 * 主应用只需 <Route path="/math" element={<MathIsland />} /> 即可接线。
 *
 * 玩法：100 以内加减法，每关 18 题分 3 组 × 6 题，每组结束生命回满。
 * 一半题目四选一，一半题目用屏幕数字键盘输入（贴近纸笔考试）。
 * **整关一个总倒计时** —— 驱动速度感；答得快拿更多速度星，速度星换游戏时长。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '@/store/useStore';
import {
  generateLevel,
  generateOptions,
  answerOf,
  detectErrorType,
  speedStars,
  starsToBonusMs,
  Q_PER_LEVEL,
  SEGMENT_SIZE,
  type ErrorType,
  type Level,
  type Question,
} from './generate';

/* ---------------- 常量 ---------------- */

/** 每关总倒计时（秒）—— 18 题约 4–5 分钟，够用且有压迫感 */
const ROUND_SECONDS = 5 * 60;
const LEVELS: Level[] = [1, 2, 3];
const LEVEL_META: Record<Level, { name: string; desc: string; emoji: string }> = {
  1: { name: '基础', desc: '100 以内 · 不进位不退位', emoji: '🌱' },
  2: { name: '进阶', desc: '100 以内 · 进位退位', emoji: '🌿' },
  3: { name: '挑战', desc: '混合运算 + 应用题', emoji: '🌳' },
};

/* ---------------- 存档 ---------------- */

interface Mistake {
  a: number;
  b: number;
  op: '+' | '-';
  scenario: string | null;
  userAnswer: number;
  correctAnswer: number;
  errorType: ErrorType;
  at: number;
}

interface Save {
  unlocked: Level[];
  bestStars: Record<string, number>;
  bestSec: Record<string, number>;
  mistakes: Mistake[];
}

const SAVE_KEY = 'math-island-save-v1';

function loadSave(): Save {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Save;
      if (Array.isArray(s.unlocked) && Array.isArray(s.mistakes)) return s;
    }
  } catch {
    /* ignore */
  }
  return { unlocked: [1], bestStars: {}, bestSec: {}, mistakes: [] };
}

/* ---------------- 音效 ---------------- */

function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(true);
  const play = useCallback((kind: 'click' | 'right' | 'wrong' | 'clear' | 'tick') => {
    if (!enabledRef.current) return;
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      const conf: Record<string, { f: number; f2?: number; t: number; v: number; type: OscillatorType }> = {
        click: { f: 520, t: 0.06, v: 0.05, type: 'triangle' },
        right: { f: 660, f2: 990, t: 0.16, v: 0.08, type: 'sine' },
        wrong: { f: 300, f2: 200, t: 0.22, v: 0.07, type: 'sine' },
        clear: { f: 523, f2: 1046, t: 0.4, v: 0.1, type: 'sine' },
        tick: { f: 880, t: 0.04, v: 0.03, type: 'square' },
      };
      const c = conf[kind] ?? conf.click;
      osc.type = c.type;
      osc.frequency.setValueAtTime(c.f, t);
      if (c.f2) osc.frequency.exponentialRampToValueAtTime(c.f2, t + c.t);
      gain.gain.setValueAtTime(c.v, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + c.t);
      osc.start(t);
      osc.stop(t + c.t + 0.02);
    } catch {
      /* ignore */
    }
  }, []);
  return { play, enabledRef };
}

/* ---------------- 组件 ---------------- */

function fmt(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MathIsland() {
  const [save, setSave] = useState<Save>(loadSave);
  const [level, setLevel] = useState<Level | null>(null);
  const [phase, setPhase] = useState<'home' | 'play' | 'result'>('home');
  const [qs, setQs] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [stars, setStars] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [opts, setOpts] = useState<number[]>([]);
  const [buffer, setBuffer] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [wrongList, setWrongList] = useState<Mistake[]>([]);
  const [creditedMs, setCreditedMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const { play, enabledRef } = useSound();

  const q = qs[idx] ?? null;
  const totalStars = stars.reduce((a, b) => a + b, 0);
  const maxStars = qs.length * 3;
  const bonusMs = starsToBonusMs(totalStars);

  useEffect(() => {
    enabledRef.current = !muted;
  }, [muted, enabledRef]);

  // 答题模式：一半选择一半输入
  const isChoice = useMemo(
    () => (q ? (qs.length ? (idx % 2 === 0) : true) : true),
    [q, qs.length, idx],
  );

  /* ---- 倒计时（整关一个） ---- */
  useEffect(() => {
    if (phase !== 'play' || !q) return;
    if (timeLeft <= 0) {
      if (!answered) submit(-1);
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft, q, answered]);

  /* ---- 音效：最后 10 秒滴答 ---- */
  useEffect(() => {
    if (phase === 'play' && timeLeft > 0 && timeLeft <= 10) play('tick');
  }, [timeLeft, phase, play]);

  /* ---- 键盘：数字键 / Backspace / Enter ---- */
  useEffect(() => {
    if (phase !== 'play' || !q || answered || isChoice) return;
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        pushDigit(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setBuffer((b) => b.slice(0, -1));
      } else if (e.key === 'Enter' && buffer !== '') {
        e.preventDefault();
        submit(parseInt(buffer, 10));
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q, answered, isChoice, buffer]);

  function startLevel(lv: Level) {
    const list = generateLevel(lv);
    setLevel(lv);
    setQs(list);
    setIdx(0);
    setLives(3);
    setStars([]);
    setWrongList([]);
    setTimeLeft(ROUND_SECONDS);
    setAnswered(false);
    setBuffer('');
    setOpts(generateOptions(list[0]));
    setPhase('play');
    play('click');
  }

  function pushDigit(d: string) {
    if (answered) return;
    setBuffer((b) => (b.length >= 3 ? b : b + d));
    play('click');
  }

  function recordMistake(qq: Question, userAnswer: number) {
    const entry: Mistake = {
      a: qq.a,
      b: qq.b,
      op: qq.op,
      scenario: qq.scenario,
      userAnswer,
      correctAnswer: answerOf(qq),
      errorType: detectErrorType(qq, userAnswer),
      at: Date.now(),
    };
    setWrongList((w) => [...w, entry]);
    setSave((s) => {
      const next = { ...s, mistakes: [...s.mistakes, entry].slice(-200) };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function submit(userAnswer: number) {
    if (answered || !q) return;
    setAnswered(true);
    const correct = answerOf(q);
    const ok = userAnswer === correct;
    if (ok) {
      play('right');
      const ratio = timeLeft / ROUND_SECONDS;
      setStars((s) => [...s, speedStars(ratio)]);
    } else {
      play('wrong');
      setLives((l) => l - 1);
      recordMistake(q, userAnswer);
    }
    window.setTimeout(() => {
      const nextIdx = idx + 1;
      if (lives <= 1) {
        // 命用光：回到本组开头，满血重来
        const segStart = Math.floor(idx / SEGMENT_SIZE) * SEGMENT_SIZE;
        setIdx(segStart);
        setLives(3);
        setStars((s) => s.slice(0, segStart));
        setWrongList((w) => w.slice(0, 0));
        setAnswered(false);
        setBuffer('');
        setOpts(generateOptions(qs[segStart]));
        setTimeLeft(ROUND_SECONDS);
        play('click');
        return;
      }
      if (nextIdx >= qs.length) {
        finish();
        return;
      }
      // 跨组回满
      if (nextIdx % SEGMENT_SIZE === 0) setLives(3);
      setIdx(nextIdx);
      setAnswered(false);
      setBuffer('');
      setOpts(generateOptions(qs[nextIdx]));
    }, 700);
  }

  function finish() {
    play('clear');
    const used = ROUND_SECONDS - timeLeft;
    const st = totalStars;
    // 通关奖励真正入账到防沉迷时长（本机入账，受每日上限约束）
    setCreditedMs(useStore.getState().addStudyBonus(starsToBonusMs(st)));
    setPhase('result');
    setSave((s) => {
      const key = String(level);
      const next: Save = {
        ...s,
        bestStars: { ...s.bestStars, [key]: Math.max(s.bestStars[key] ?? 0, st) },
        bestSec: { ...s.bestSec, [key]: Math.min(s.bestSec[key] ?? Infinity, used) },
        unlocked: Array.from(new Set([...s.unlocked, Math.min(3, (level ?? 1) + 1) as Level])),
      };
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function backHome() {
    setPhase('home');
    setLevel(null);
  }

  /* ================= 主页 ================= */
  if (phase === 'home') {
    return (
      <div
        className="min-h-screen w-full text-ink"
        style={{ background: 'linear-gradient(160deg,#FFF3E6 0%,#FFF9F0 45%,#EAF7FF 100%)' }}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
          <header className="flex items-center justify-between">
            <Link
              to="/"
              className="rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-white"
            >
              ← 游戏乐园
            </Link>
            <button
              onClick={() => setMuted((m) => !m)}
              className="rounded-full bg-white/80 px-3 py-2 text-sm shadow-sm"
              aria-label={muted ? '打开声音' : '静音'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
          </header>

          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tight">🍭 糖果口算岛</h1>
            <p className="mt-1 text-base text-ink/60">100 以内加减法 · 每关 18 题约 5 分钟</p>
          </div>

          <div className="grid gap-3">
            {LEVELS.map((lv) => {
              const unlocked = save.unlocked.includes(lv);
              const meta = LEVEL_META[lv];
              const st = save.bestStars[String(lv)] ?? 0;
              const sec = save.bestSec[String(lv)];
              return (
                <button
                  key={lv}
                  disabled={!unlocked}
                  onClick={() => startLevel(lv)}
                  className={`flex items-center gap-4 rounded-3xl p-5 text-left shadow-pop transition ${
                    unlocked ? 'bg-white hover:-translate-y-0.5' : 'bg-white/50 opacity-60'
                  }`}
                >
                  <span className="text-4xl">{unlocked ? meta.emoji : '🔒'}</span>
                  <span className="flex-1">
                    <span className="block text-lg font-black">
                      L{lv} {meta.name}
                    </span>
                    <span className="block text-sm text-ink/60">{meta.desc}</span>
                    {st > 0 && (
                      <span className="mt-1 block text-xs text-ink/50">
                        ⭐ 最好 {st}/{Q_PER_LEVEL * 3} 星 · 用时 {fmt(sec ?? 0)}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="rounded-3xl bg-white/70 p-5">
            <h2 className="text-sm font-black">规则</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink/70">
              <li>· 每关 18 题，分 3 组，每组 6 题；每组结束生命回满</li>
              <li>· 生命归零只重打本组，之前组的星星保留</li>
              <li>· 一半题目四选一，一半题目用数字键盘输入</li>
              <li>· 整关 5 分钟倒计时，答得越快星越多</li>
              <li>· 速度星可换游戏时长（每星 10 秒，一关最多 5 分钟）</li>
            </ul>
          </section>

          {save.mistakes.length > 0 && (
            <section className="rounded-3xl bg-white/70 p-5">
              <h2 className="text-sm font-black">最近错题（{save.mistakes.length}）</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {save.mistakes
                  .slice(-5)
                  .reverse()
                  .map((m, i) => (
                    <li key={i} className="text-ink/70">
                      {m.scenario ?? `${m.a} ${m.op} ${m.b} = ?`}
                      <span className="ml-2 text-xs text-ink/40">
                        你的答案 {m.userAnswer === -1 ? '（超时）' : m.userAnswer} · 正确 {m.correctAnswer}
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    );
  }

  /* ================= 结算 ================= */
  if (phase === 'result') {
    const used = ROUND_SECONDS - timeLeft;
    const right = qs.length - wrongList.length;
    return (
      <div
        className="min-h-screen w-full text-ink"
        style={{ background: 'linear-gradient(160deg,#FFF3E6 0%,#FFF9F0 45%,#EAF7FF 100%)' }}
      >
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-12 text-center">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-black">L{level} 完成！</h1>
          <div className="text-5xl font-black text-[#B85C38]">
            ⭐ {totalStars} / {maxStars}
          </div>
          <div className="w-full space-y-2 rounded-3xl bg-white/80 p-5 text-left text-sm shadow-pop">
            <Row label="答对" value={`${right} / ${qs.length}`} />
            <Row label="用时" value={fmt(used)} />
            <Row label="换到游戏时长" value={`+${Math.floor(bonusMs / 60000)} 分 ${Math.floor((bonusMs % 60000) / 1000)} 秒`} />
            <Row
              label="实际入账"
              value={
                creditedMs >= bonusMs
                  ? `+${Math.floor(creditedMs / 60000)} 分 ${Math.floor((creditedMs % 60000) / 1000)} 秒`
                  : creditedMs > 0
                    ? `+${Math.floor(creditedMs / 60000)} 分 ${Math.floor((creditedMs % 60000) / 1000)} 秒（今日奖励快满了）`
                    : '今日奖励已达上限'
              }
            />
            <Row label="本关最好" value={`${save.bestStars[String(level)] ?? 0} 星`} />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => startLevel(level ?? 1)}
              className="rounded-full bg-[#B85C38] px-6 py-3 font-bold text-white shadow-pop transition hover:opacity-90"
            >
              再来一次
            </button>
            <button
              onClick={backHome}
              className="rounded-full bg-white px-6 py-3 font-bold shadow-sm transition hover:bg-white/80"
            >
              回主页
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= 答题 ================= */
  const segIdx = Math.floor(idx / SEGMENT_SIZE);
  const inSeg = (idx % SEGMENT_SIZE) + 1;
  const segTotal = Math.ceil(qs.length / SEGMENT_SIZE);
  const low = timeLeft <= 30;

  return (
    <div
      className="min-h-screen w-full text-ink"
      style={{ background: 'linear-gradient(160deg,#FFF3E6 0%,#FFF9F0 45%,#EAF7FF 100%)' }}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-5">
        {/* 顶栏 */}
        <div className="flex items-center justify-between rounded-2xl bg-white/80 px-4 py-3 shadow-sm">
          <button onClick={backHome} className="text-lg font-bold" aria-label="返回">
            ←
          </button>
          <span className="text-sm font-bold">
            第 {segIdx + 1}/{segTotal} 组 · {inSeg}/{Math.min(SEGMENT_SIZE, qs.length - segIdx * SEGMENT_SIZE)} 题
          </span>
          <span className={`font-mono text-xl font-black ${low ? 'text-red-600' : ''}`}>{fmt(timeLeft)}</span>
        </div>

        {/* 生命 + 星星 */}
        <div className="flex items-center justify-between px-1 text-sm">
          <span className="text-lg tracking-wider">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i < lives ? '' : 'opacity-25 grayscale'}>
                ❤️
              </span>
            ))}
          </span>
          <span className="font-bold text-ink/60">
            ⭐ {totalStars} / {maxStars}
          </span>
        </div>

        {/* 题目卡 */}
        <div className="rounded-3xl bg-white p-6 text-center shadow-pop">
          {q?.scenario && <p className="mb-3 text-left text-base leading-relaxed text-ink/80">{q.scenario}</p>}
          <p className="text-5xl font-black tracking-wider">
            {q?.a} <span className="text-[#B85C38]">{q?.op}</span> {q?.b} ={' '}
            {isChoice ? (
              <span className="text-[#B85C38]">?</span>
            ) : (
              <span className="text-[#B85C38]">{buffer || '?'}</span>
            )}
          </p>
        </div>

        {/* 作答区 */}
        {isChoice ? (
          <div className="grid grid-cols-2 gap-3">
            {opts.map((o) => (
              <button
                key={o}
                disabled={answered}
                onClick={() => submit(o)}
                className="rounded-2xl bg-white py-6 text-3xl font-black shadow-pop transition active:scale-95 disabled:opacity-60"
              >
                {o}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
                <button
                  key={k}
                  disabled={answered}
                  onClick={() => pushDigit(k)}
                  className="rounded-2xl bg-white py-4 text-2xl font-black shadow-sm transition active:scale-95 disabled:opacity-60"
                >
                  {k}
                </button>
              ))}
              <button
                disabled={answered}
                onClick={() => setBuffer((b) => b.slice(0, -1))}
                className="rounded-2xl bg-[#FFE9D6] py-4 text-xl font-black shadow-sm transition active:scale-95 disabled:opacity-60"
              >
                ⌫
              </button>
              <button
                disabled={answered}
                onClick={() => pushDigit('0')}
                className="rounded-2xl bg-white py-4 text-2xl font-black shadow-sm transition active:scale-95 disabled:opacity-60"
              >
                0
              </button>
              <button
                disabled={answered || buffer === ''}
                onClick={() => submit(parseInt(buffer, 10))}
                className="rounded-2xl bg-[#B85C38] py-4 text-2xl font-black text-white shadow-pop transition active:scale-95 disabled:opacity-40"
              >
                ✓
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-ink/40">
          {isChoice ? '点一个答案' : '输入数字后按 ✓（或回车）'}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-black/10 pb-1 last:border-0">
      <span className="text-ink/60">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
