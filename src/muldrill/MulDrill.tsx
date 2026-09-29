/**
 * ✖️ 乘法大冒险 · 游戏 UI 组件
 *
 * 迁移自 study-buddy web/games/multiplication-drill/index.html，
 * 玩法逐条保持一致（60 秒 / 1-9 乘法表 / 位数齐自动提交 / 答错看全表
 * 2.2 秒 / 四档评语），只做两处必要的适配：
 *
 *   1. 拆出纯逻辑层到 pick-gen.ts（原先内联在 DOM 脚本里，无头测不了）
 *   2. 补上 play-buddy 的自包含约定：localStorage 存档 + WebAudio 音效
 *
 * 学习类游戏的会话与错题会回传 study-buddy（"在家"模式），因为
 * study-buddy 的 apps registry 仍登记着 multiplication-drill，
 * 而 play-buddy 的 fetchStudyReward 会去查它的日统计——不回传就断链。
 *
 * 主应用只需 <Route path="/mul" element={<MulDrill />} /> 即可接线。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import {
  pickMultiplicationQuestion,
  makeMultiplicationTable,
  expectedAnswerLength,
  shouldAutoSubmit,
  appendDigit,
  backspace,
  rateOf,
  verdictFor,
  avgSecondsPerQuestion,
  ROUND_SECONDS,
  TABLE_HINT_MS,
  MAX_INPUT_DIGITS,
  SB_APP_ID,
  SB_ERROR_TYPE,
  type MulQuestion,
} from './pick-gen';
import { reportStudySession, reportStudyMistake } from '@/game/studyBuddy';

type Phase = 'home' | 'play' | 'result';

/* ---------------- 音效（自包含，不复用 game/sound） ---------------- */

function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const onRef = useRef(true);
  const play = useCallback((kind: 'click' | 'right' | 'wrong' | 'tick' | 'clear') => {
    if (!onRef.current) return;
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
      /* 音频不可用时静默降级 */
    }
  }, []);
  return { play, onRef };
}

/* ---------------- 存档 ---------------- */

interface MistakeRec {
  problem: string;
  userAnswer: string;
  correctAnswer: string;
  at: number;
}

interface Save {
  /** 历史最高正确率 % */
  bestRate: number;
  /** 历史单局最多答题数 */
  bestTotal: number;
  rounds: number;
  mistakes: MistakeRec[];
}

const SAVE_KEY = 'mul-drill-save-v1';
const MAX_SAVED_MISTAKES = 200;

function loadSave(): Save {
  const empty: Save = { bestRate: 0, bestTotal: 0, rounds: 0, mistakes: [] };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return empty;
    const s = JSON.parse(raw) as Partial<Save>;
    return {
      bestRate: Number(s.bestRate) || 0,
      bestTotal: Number(s.bestTotal) || 0,
      rounds: Number(s.rounds) || 0,
      mistakes: Array.isArray(s.mistakes) ? s.mistakes : [],
    };
  } catch {
    return empty;
  }
}

function persist(s: Save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch {
    /* 隐私模式存不下也不该崩 */
  }
}

/* ---------------- 组件 ---------------- */

export default function MulDrill() {
  const [save, setSave] = useState<Save>(loadSave);
  const [muted, setMuted] = useState(false);
  const { play, onRef } = useSound();

  const [phase, setPhase] = useState<Phase>('home');
  const [q, setQ] = useState<MulQuestion | null>(null);
  const [buf, setBuf] = useState('');
  const [left, setLeft] = useState(ROUND_SECONDS);
  const [asked, setAsked] = useState(0);
  const [hits, setHits] = useState(0);
  /** 非 null = 刚答错，正在展示完整乘法表；此时忽略输入。 */
  const [wrong, setWrong] = useState<{ answer: number } | null>(null);
  const [result, setResult] = useState<{ rate: number; total: number; correct: number; avg: number } | null>(null);

  // 计数器用 ref 做单一事实源：结算与上报要读"这一局的最终值"，
  // 用 state 会在同一个 tick 里读到旧值。
  const startedAtRef = useRef(0);
  const askedRef = useRef(0);
  const hitsRef = useRef(0);
  const mistakesRef = useRef<MistakeRec[]>([]);
  const hintTimer = useRef<number | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    onRef.current = !muted;
  }, [muted, onRef]);

  const clearHint = useCallback(() => {
    if (hintTimer.current !== null) {
      window.clearTimeout(hintTimer.current);
      hintTimer.current = null;
    }
  }, []);

  // 卸载时清掉待触发的"答错后自动下一题"，避免对已卸载组件 setState
  useEffect(() => clearHint, [clearHint]);

  const nextQuestion = useCallback(() => {
    setQ(pickMultiplicationQuestion(Math.random));
    setBuf('');
    setWrong(null);
  }, []);

  const endRound = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    clearHint();
    const total = askedRef.current;
    const correct = hitsRef.current;
    const endedAt = Date.now();
    const rate = rateOf(correct, total);
    const avg = avgSecondsPerQuestion((endedAt - startedAtRef.current) / 1000, total);

    setResult({ rate, total, correct, avg });
    setPhase('result');
    play(verdictFor(rate).emoji === '🏆' ? 'clear' : 'click');

    // 回传 study-buddy（纯玩模式下这两个调用是 no-op，不发任何请求）
    const durationMs = Math.max(0, endedAt - startedAtRef.current);
    if (total > 0) {
      reportStudySession({ appId: SB_APP_ID, durationMs, totalQuestions: total, correctCount: correct });
    }
    for (const m of mistakesRef.current) {
      reportStudyMistake({
        appId: SB_APP_ID,
        problem: m.problem,
        userAnswer: m.userAnswer,
        correctAnswer: m.correctAnswer,
        errorType: SB_ERROR_TYPE,
      });
    }

    const next: Save = {
      bestRate: Math.max(save.bestRate, rate),
      bestTotal: Math.max(save.bestTotal, total),
      rounds: save.rounds + 1,
      mistakes: [...save.mistakes, ...mistakesRef.current].slice(-MAX_SAVED_MISTAKES),
    };
    setSave(next);
    persist(next);
  }, [clearHint, play, save]);

  const startRound = useCallback(() => {
    clearHint();
    endedRef.current = false;
    startedAtRef.current = Date.now();
    askedRef.current = 0;
    hitsRef.current = 0;
    mistakesRef.current = [];
    setAsked(0);
    setHits(0);
    setResult(null);
    setWrong(null);
    setLeft(ROUND_SECONDS);
    setPhase('play');
    nextQuestion();
    play('click');
  }, [clearHint, nextQuestion, play]);

  /**
   * 判一道题。
   *
   * `raw` 显式传入当前缓冲区内容，**不能只读 buf state**：数字键盘的
   * "位数齐自动提交"在同一个事件里先 setBuf(next) 再 submit()，而
   * setState 是异步批处理的，闭包里的 buf 仍是上一次渲染的值 —— 那样
   * 每次自动提交都会少提交一位（答 56 判成 5）。✓ 按钮和回车不传参，
   * 此时 buf state 已是最新值，走 state 分支正确。
   */
  const submit = useCallback(
    (raw?: string) => {
      if (phase !== 'play' || !q || wrong !== null) return;
      const text = (raw ?? buf).trim();
      if (text === '') return;
      const userAnswer = Number.parseInt(text, 10);
      if (!Number.isFinite(userAnswer)) return;

      askedRef.current += 1;
      setAsked(askedRef.current);

      if (userAnswer === q.answer) {
        hitsRef.current += 1;
        setHits(hitsRef.current);
        play('right');
        nextQuestion();
      } else {
        mistakesRef.current.push({
          problem: q.problem,
          userAnswer: String(userAnswer),
          correctAnswer: String(q.answer),
          at: Date.now(),
        });
        setWrong({ answer: q.answer });
        play('wrong');
        // 展示完整乘法表 2.2 秒后自动继续，不打断节奏
        hintTimer.current = window.setTimeout(() => {
          hintTimer.current = null;
          nextQuestion();
        }, TABLE_HINT_MS);
      }
    },
    [buf, nextQuestion, phase, play, q, wrong],
  );

  /* ---- 倒计时（游戏内计时，与全局防沉迷时钟是两回事） ---- */
  useEffect(() => {
    if (phase !== 'play') return;
    if (left <= 0) {
      endRound();
      return;
    }
    const id = window.setTimeout(() => setLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [endRound, left, phase]);

  /* ---- 最后 10 秒滴答 ---- */
  useEffect(() => {
    if (phase === 'play' && left > 0 && left <= 10) play('tick');
  }, [left, phase, play]);

  /* ---- 硬件键盘 ---- */
  useEffect(() => {
    if (phase !== 'play' || !q) return;
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        onDigit(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setBuf((b) => backspace(b));
        play('click');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, q, submit]);

  function onDigit(d: string) {
    if (phase !== 'play' || !q || wrong !== null) return;
    const maxLen = expectedAnswerLength(q.answer) ?? MAX_INPUT_DIGITS;
    const next = appendDigit(buf, d, maxLen);
    setBuf(next);
    play('click');
    // 位数够了自动提交：把 next 显式传进去，不能让 submit 去读还没刷新的 buf
    if (shouldAutoSubmit(next, q.answer)) submit(next);
  }

  /* ================= 主页 ================= */
  if (phase === 'home') {
    return (
      <div
        className="min-h-screen w-full text-ink"
        style={{ background: 'linear-gradient(160deg,#EDE5FA 0%,#F8F4FF 45%,#EAF7FF 100%)' }}
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
            <h1 className="text-4xl font-black tracking-tight">✖️ 乘法大冒险</h1>
            <p className="mt-1 text-base text-ink/60">1-9 乘法表 · 60 秒挑战</p>
          </div>

          <button
            onClick={startRound}
            className="rounded-3xl bg-gradient-to-br from-[#9F7DFF] to-[#7C5CD3] py-7 text-2xl font-black text-white shadow-pop transition hover:-translate-y-0.5"
          >
            开始挑战
          </button>

          {save.rounds > 0 && (
            <section className="rounded-3xl bg-white/70 p-5">
              <h2 className="text-sm font-black">我的记录</h2>
              <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-black text-[#7C5CD3]">{save.bestRate}%</div>
                  <div className="text-xs text-ink/50">最高正确率</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#7C5CD3]">{save.bestTotal}</div>
                  <div className="text-xs text-ink/50">单局最多题</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-[#7C5CD3]">{save.rounds}</div>
                  <div className="text-xs text-ink/50">玩过几局</div>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-3xl bg-white/70 p-5">
            <h2 className="text-sm font-black">规则</h2>
            <ul className="mt-2 space-y-1 text-sm text-ink/70">
              <li>· 60 秒内答尽可能多题</li>
              <li>· 用屏幕数字键盘输入，位数够了自动提交</li>
              <li>· 答对立刻下一题，答错展示完整 9×9 表给你查</li>
              <li>· 90% 以上 🏆，70% 🎉，50% 💪，再低 🌱 慢慢来</li>
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
                      {m.problem}
                      <span className="ml-2 text-xs text-ink/40">
                        你的答案 {m.userAnswer} · 正确 {m.correctAnswer}
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

  /* ================= 答题中 ================= */
  if (phase === 'play' && q) {
    return (
      <div
        className="flex min-h-screen w-full flex-col text-ink"
        style={{ background: 'linear-gradient(160deg,#EDE5FA 0%,#F8F4FF 50%,#EAF7FF 100%)' }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
          <div className="flex items-center justify-between rounded-3xl bg-white/85 px-5 py-3 font-bold shadow-sm backdrop-blur">
            <span className="text-sm">
              第 <b className="text-lg">{asked + 1}</b> 题
            </span>
            <span
              className={`text-3xl tabular-nums ${left <= 10 ? 'animate-pulse text-[#FF4757]' : 'text-[#7C5CD3]'}`}
            >
              {left}
            </span>
            <span className="text-sm">
              对 <b className="text-lg">{hits}</b>
            </span>
          </div>

          <div className="rounded-3xl bg-white/85 p-6 text-center shadow-sm backdrop-blur">
            <div className="text-5xl font-black tracking-wide tabular-nums">{q.problem}</div>

            {wrong === null ? (
              <div className="mt-5 h-16 text-5xl font-black tabular-nums text-[#7C5CD3]">{buf || '?'}</div>
            ) : (
              <div className="mt-4">
                <p className="text-lg font-bold text-[#BE5A47]">
                  正确答案是 {wrong.answer}，没关系，看清楚表再继续 👇
                </p>
                <pre
                  className="mx-auto mt-3 w-fit whitespace-pre text-left font-mono text-[11px] leading-relaxed text-ink/70"
                  aria-label="1-9 乘法表"
                >
                  {makeMultiplicationTable()}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2.5 pb-[max(12px,env(safe-area-inset-bottom))]">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((k) => (
              <button
                key={k}
                onPointerDown={(e) => {
                  e.preventDefault();
                  onDigit(k);
                }}
                className="h-16 rounded-2xl bg-white/90 text-2xl font-black shadow-sm transition active:scale-95"
              >
                {k}
              </button>
            ))}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setBuf((b) => backspace(b));
                play('click');
              }}
              className="h-16 rounded-2xl bg-[#EFE7FB] text-2xl font-black shadow-sm transition active:scale-95"
              aria-label="退格"
            >
              ⌫
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onDigit('0');
              }}
              className="h-16 rounded-2xl bg-white/90 text-2xl font-black shadow-sm transition active:scale-95"
            >
              0
            </button>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                submit();
              }}
              disabled={wrong !== null}
              className="h-16 rounded-2xl bg-[#7C5CD3] text-2xl font-black text-white shadow-sm transition active:scale-95 disabled:opacity-40"
              aria-label="提交答案"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= 结算 ================= */
  const v = verdictFor(result?.rate ?? 0);
  return (
    <div
      className="min-h-screen w-full text-ink"
      style={{ background: 'linear-gradient(160deg,#EDE5FA 0%,#F8F4FF 45%,#EAF7FF 100%)' }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-10">
        <div className="text-center">
          <div className="text-6xl">{v.emoji}</div>
          <div className="mt-2 text-3xl font-black">{v.title}</div>
          <div className="mt-3 text-6xl font-black tabular-nums text-[#7C5CD3]">{result?.rate ?? 0}%</div>
          <div className="text-sm text-ink/50">正确率</div>
        </div>

        <div className="rounded-3xl bg-white/70 p-5">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-ink/60">答题数</span>
            <b className="tabular-nums">{result?.total ?? 0}</b>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-ink/60">答对数</span>
            <b className="tabular-nums">{result?.correct ?? 0}</b>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-ink/60">平均速度</span>
            <b className="tabular-nums">{(result?.avg ?? 0).toFixed(1)} 秒/题</b>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={startRound}
            className="rounded-3xl bg-gradient-to-br from-[#9F7DFF] to-[#7C5CD3] py-5 text-xl font-black text-white shadow-pop transition hover:-translate-y-0.5"
          >
            再来一局
          </button>
          <Link
            to="/"
            className="rounded-3xl bg-white/80 py-4 text-center text-base font-black text-ink shadow-sm transition hover:bg-white"
          >
            回游戏乐园
          </Link>
        </div>
      </div>
    </div>
  );
}
