/**
 * 字的构造台 · 三个游戏
 *
 * 顺序是有讲究的：**先看见结构 → 再认部件 → 最后并排对比**。
 * 这三步对应"看不见字的结构"这个病根的三个侧面：
 *   - 搭积木：说不出这是几 + 几拼起来的（结构意识）
 *   - 找偏旁：认了一个部件，认不出一串字（部件记忆）
 *   - 形近对比：两个字摆一起看不出差在哪（对比能力）
 *
 * 全部自包含：自带 localStorage 存档 + WebAudio 音效，不侵入 useStore。
 * 不做屏幕书写、不做自动评分 —— 写字在纸上，这里只管"看清"。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import CharCard from './CharCard';
import {
  BUILD_CHARS,
  RADICALS,
  CONFUSABLES,
  STRUCT_OPTIONS,
  STRUCT_LABEL,
  askedPart,
  buildPartChoice,
  buildConfusableChoice,
  scoreRate,
  verdictFor,
} from './structure';

/* ==================== 存档 ==================== */

interface Save {
  /** 各游戏的最好成绩 % */
  best: Record<string, number>;
  /** 玩过的轮次 */
  plays: Record<string, number>;
  /** 看过的字（字卡用） */
  seen: string[];
}

const SAVE_KEY = 'write-lab-save-v1';
const MAX_SEEN = 120;

function loadSave(): Save {
  const empty: Save = { best: {}, plays: {}, seen: [] };
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return empty;
    const s = JSON.parse(raw) as Partial<Save>;
    return {
      best: s.best ?? {},
      plays: s.plays ?? {},
      seen: Array.isArray(s.seen) ? s.seen : [],
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

/* ==================== 音效 ==================== */

function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const onRef = useRef(true);
  const play = useCallback((kind: 'click' | 'right' | 'wrong' | 'clear') => {
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

/* ==================== 通用外壳 ==================== */

const OK_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
const NO_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';

interface ShellProps {
  title: string;
  sub: string;
  index: number;
  total: number;
  right: number;
  onExit: () => void;
  children: React.ReactNode;
  hint?: string;
}

function Shell({ title, sub, index, total, right, onExit, children, hint }: ShellProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <button
          onClick={onExit}
          className="rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-ink shadow-sm transition hover:bg-white"
        >
          ← 换一个
        </button>
        <span className="text-[13px] font-bold text-ink/50">
          第 {index + 1} / {total} · 对 {right}
        </span>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-black text-ink">{title}</h2>
        <p className="m-0 text-[14px] text-ink/60">{sub}</p>
      </div>
      {children}
      {hint && (
        <p className="m-0 max-w-md text-center text-[13px] leading-relaxed text-ink/50">{hint}</p>
      )}
    </div>
  );
}

/* ==================== 主组件 ==================== */

type GameId = 'build' | 'part' | 'compare' | 'card';

const GAMES: Array<{ id: GameId; name: string; emoji: string; desc: string; accent: string; soft: string }> = [
  { id: 'build', name: '搭积木', emoji: '🧱', desc: '这是几 + 几拼起来的', accent: '#2F6F5E', soft: '#E6F0EC' },
  { id: 'part', name: '找偏旁', emoji: '🧩', desc: '认一个部件，认一串字', accent: '#B85C38', soft: '#F3E0D3' },
  { id: 'compare', name: '形近对比', emoji: '👀', desc: '两个字摆一起比', accent: '#4A6BBF', soft: '#E3E9F8' },
  { id: 'card', name: '笔顺字卡', emoji: '✍️', desc: '看笔顺 · 看结构，写在纸上', accent: '#7A9267', soft: '#E6EBDA' },
];

export default function WriteLab() {
  const [save, setSave] = useState<Save>(loadSave);
  const [game, setGame] = useState<GameId | null>(null);
  const [muted, setMuted] = useState(false);
  const { play, onRef } = useSound();
  // 一轮打完的成绩 → 结算屏。孩子必须看见"我这轮看得准不准"，
  // 静默重开等于没有反馈闭环。
  const [result, setResult] = useState<{ rate: number; name: string } | null>(null);

  useEffect(() => {
    onRef.current = !muted;
  }, [muted, onRef]);

  const record = useCallback(
    (id: GameId, rate: number) => {
      setResult({ rate, name: GAMES.find((g) => g.id === id)?.name ?? '' });
      setSave((s) => {
        const next: Save = {
          best: { ...s.best, [id]: Math.max(s.best[id] ?? 0, rate) },
          plays: { ...s.plays, [id]: (s.plays[id] ?? 0) + 1 },
          seen: s.seen,
        };
        persist(next);
        return next;
      });
    },
    [],
  );

  const v = verdictFor(result?.rate ?? 0);

  const markSeen = useCallback((chars: string[]) => {
    setSave((s) => {
      const merged = [...new Set([...s.seen, ...chars])].slice(-MAX_SEEN);
      const next = { ...s, seen: merged };
      persist(next);
      return next;
    });
  }, []);

  const meta = GAMES.find((g) => g.id === game);

  return (
    <div
      className="min-h-screen w-full text-ink"
      style={{ background: 'linear-gradient(160deg,#F3F7F1 0%,#FBF8F1 45%,#EAF3FB 100%)' }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
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

        {game === null || meta === null ? (
          <>
            <div className="text-center">
              <h1 className="text-3xl font-black tracking-tight">🖌 字的构造台</h1>
              <p className="m-0 mt-1 text-[15px] text-ink/60">先看清字长什么样，再在纸上写</p>
            </div>

            <div className="grid gap-3">
              {GAMES.map((g) => {
                const best = save.best[g.id];
                return (
                  <button
                    key={g.id}
                    onClick={() => setGame(g.id)}
                    className="flex items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-pop transition hover:-translate-y-0.5"
                    style={{ border: `2px solid ${g.soft}` }}
                  >
                    <span
                      className="grid h-14 w-14 flex-none place-items-center rounded-2xl text-3xl"
                      style={{ background: g.soft }}
                    >
                      {g.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-lg font-black" style={{ color: g.accent }}>
                        {g.name}
                      </span>
                      <span className="block text-sm text-ink/60">{g.desc}</span>
                      {best !== undefined && (
                        <span className="mt-1 block text-xs font-bold text-ink/45">
                          最好 {best}% · 玩过 {save.plays[g.id] ?? 0} 轮
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <section className="rounded-3xl bg-white/70 p-5">
              <h3 className="m-0 text-sm font-black">怎么用</h3>
              <ul className="mt-2 space-y-1 text-sm text-ink/70">
                <li>· 先玩「搭积木」，练的是"这个字是几 + 几"</li>
                <li>· 再玩「找偏旁」，认一个部件就能认一串字</li>
                <li>· 答对了去「笔顺字卡」看一遍，然后在纸上写</li>
                <li>· 屏幕上不练写字 —— 手要记住的是纸上的手感</li>
              </ul>
            </section>
          </>
        ) : result ? (
          <div className="flex flex-col items-center gap-5 py-6">
            <div className="text-6xl">{v.emoji}</div>
            <div className="text-center">
              <div className="text-3xl font-black text-ink">{v.title}</div>
              <div className="text-sm text-ink/50">「{result.name}」这一轮</div>
            </div>
            <div className="text-7xl font-black text-[#2F6F5E]" data-testid="write-rate">
              {result.rate}%
            </div>
            <div className="text-sm font-bold text-ink/50">看得准不准</div>
            <div className="flex w-full flex-col gap-2.5">
              <button
                onClick={() => setResult(null)}
                className="w-full rounded-2xl bg-[#2F6F5E] py-4 text-lg font-black text-white transition hover:bg-[#25604F]"
              >
                再来一轮
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setGame(null);
                }}
                className="w-full rounded-2xl bg-white/80 py-3.5 text-base font-black text-ink shadow-sm"
              >
                换一个玩
              </button>
            </div>
            <p className="m-0 max-w-sm text-center text-[13px] leading-relaxed text-ink/50">
              现在去「笔顺字卡」把刚才答对的字看一遍，再在纸上写。
            </p>
          </div>
        ) : (
          <>
            {game === 'build' && <BuildGame onExit={() => setGame(null)} play={play} onDone={(r) => record('build', r)} markSeen={markSeen} />}
            {game === 'part' && <PartGame onExit={() => setGame(null)} play={play} onDone={(r) => record('part', r)} markSeen={markSeen} />}
            {game === 'compare' && <CompareGame onExit={() => setGame(null)} play={play} onDone={(r) => record('compare', r)} markSeen={markSeen} />}
            {game === 'card' && <CardGame onExit={() => setGame(null)} play={play} onDone={(r) => record('card', r)} seen={save.seen} />}
          </>
        )}
      </div>
    </div>
  );
}

/* ==================== ① 搭积木 ==================== */

function BuildGame({
  onExit,
  play,
  onDone,
  markSeen,
}: {
  onExit: () => void;
  play: (k: 'click' | 'right' | 'wrong' | 'clear') => void;
  onDone: (rate: number) => void;
  markSeen: (chars: string[]) => void;
}) {
  const order = useMemo(() => shuffle(BUILD_CHARS), []);
  const [i, setI] = useState(0);
  const [step, setStep] = useState<0 | 1>(0);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const c = order[i];
  // 选项必须按"关卡"固定，不能每次渲染都重排 —— 否则孩子点一下、
  // 组件因为音效状态重渲染，选项位置就跳了。绑定在 c 上。
  const choice = useMemo(() => (c ? buildPartChoice(c, Math.random) : null), [c]);

  /**
   * 推进到下一关；跑完最后一关则结算。
   *
   * 注意不要把 onDone 写进 setI 的 updater 里 —— updater 必须是纯函数，
   * StrictMode 下会双跑，成绩和轮次都会被记两遍。这里先算 next，
   * 副作用在 updater 外面发。
   */
  const advance = () => {
    setStep(0);
    setAnswered(false);
    setMsg(null);
    const next = i + 1;
    if (next >= order.length) {
      onDone(scoreRate(right, order.length));
      setI(0);
    } else {
      setI(next);
    }
  };

  // 问结构
  const answerStruct = (v: string) => {
    if (answered) return;
    setAnswered(true);
    const ok = v === c.struct;
    if (ok) {
      play('right');
      setMsg({ ok: true, text: `对了，${STRUCT_LABEL[c.struct]}。再看看它分家以后，那一块是什么。` });
      window.setTimeout(() => setStep(1), 700);
    } else {
      play('wrong');
      setMsg({ ok: false, text: `是「${STRUCT_LABEL[c.struct]}」——${c.char} 是${c.struct === 'up' ? '上面一块、下面一块' : '左边一块、右边一块'}。${c.tip}` });
      window.setTimeout(() => setStep(1), 1700);
    }
    markSeen([c.char]);
  };

  // 问部件
  const answerPart = (v: string) => {
    if (answered) return;
    setAnswered(true);
    const want = askedPart(c);
    const ok = v === want;
    if (ok) {
      setRight((n) => n + 1);
      play('right');
      setMsg({ ok: true, text: `就是它。${c.tip}` });
    } else {
      play('wrong');
      setMsg({ ok: false, text: `不对，${c.char} 的这一块是「${want}」。${c.tip}` });
    }
  };

  if (!c) return null;

  if (step === 1 && choice) {
    return (
      <Shell
        title={`「${c.char}」的${c.struct === 'up' ? '上面' : '左边'}那一块是什么？`}
        sub={c.tip}
        index={i}
        total={order.length}
        right={right}
        onExit={onExit}
      >
        <div className="grid w-full grid-cols-2 gap-3">
          {choice.options.map((o) => (
            <button
              key={o}
              onClick={() => answerPart(o)}
              className={`rounded-2xl border-2 bg-white py-8 text-5xl font-black leading-none text-ink transition hover:-translate-y-0.5 ${
                answered
                  ? o === choice.answer
                    ? 'border-[#2F6F5E] bg-[#E6F0EC]'
                    : 'border-[#E8DFCD] opacity-40'
                  : 'border-[#E8DFCD]'
              }`}
              style={{ fontSize: o.length > 1 ? 26 : undefined }}
            >
              {o}
            </button>
          ))}
        </div>

        {msg && (
          <div
            className={`flex w-full items-start gap-2 rounded-2xl p-4 text-sm leading-relaxed ${
              msg.ok ? 'bg-[#E6F0EC] text-[#205A4B]' : 'bg-[#F5DEDA] text-[#A4403D]'
            }`}
            data-testid="build-verdict"
          >
            <span className="mt-0.5 flex-none">{msg.ok ? OK_SVG : NO_SVG}</span>
            <span>{msg.text}</span>
          </div>
        )}

        {answered && (
          <>
            <CharCard char={c.char} structure={c} size={230} />
            <button
              onClick={advance}
              className="w-full rounded-2xl bg-[#2F6F5E] py-4 text-lg font-black text-white transition hover:bg-[#25604F]"
            >
              下一个 →
            </button>
          </>
        )}
      </Shell>
    );
  }

  return (
    <Shell
      title="这个字是哪种？"
      sub="先看它是上下拼还是左右拼，别急着看是哪个字"
      index={i}
      total={order.length}
      right={right}
      onExit={onExit}
    >
      <div
        className="grid h-32 w-32 place-items-center rounded-2xl border-2 border-[#E3D9C4] bg-[#FFFDF8] text-7xl font-black leading-none text-ink"
        data-testid="build-char"
      >
        {c.char}
      </div>

      <div className="grid w-full gap-3">
        {STRUCT_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => answerStruct(o.value)}
            className="flex items-center gap-3 rounded-2xl border-2 border-[#E8DFCD] bg-white px-5 py-4 text-left transition hover:-translate-y-0.5"
          >
            <span className="text-lg font-black text-ink">{o.label}</span>
            <span className="text-[13px] text-ink/50">{o.hint}</span>
          </button>
        ))}
      </div>

      {msg && (
        <div
          className={`flex w-full items-start gap-2 rounded-2xl p-4 text-sm leading-relaxed ${
            msg.ok ? 'bg-[#E6F0EC] text-[#205A4B]' : 'bg-[#F5DEDA] text-[#A4403D]'
          }`}
          data-testid="build-verdict"
        >
          <span className="mt-0.5 flex-none">{msg.ok ? OK_SVG : NO_SVG}</span>
          <span>{msg.text}</span>
        </div>
      )}
    </Shell>
  );
}

/* ==================== ② 找偏旁 ==================== */

function PartGame({
  onExit,
  play,
  onDone,
  markSeen,
}: {
  onExit: () => void;
  play: (k: 'click' | 'right' | 'wrong' | 'clear') => void;
  onDone: (rate: number) => void;
  markSeen: (chars: string[]) => void;
}) {
  const order = useMemo(() => shuffle(RADICALS), []);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const c = order[i];
  // 同上：选项按关卡固定，不随重渲染跳动
  const options = useMemo(() => (c ? shuffle(c.options, Math.random) : []), [c]);
  if (!c) return null;

  const pick = (v: string) => {
    if (answered) return;
    setAnswered(true);
    const ok = v === c.answer;
    if (ok) {
      setRight((n) => n + 1);
      play('right');
      setMsg({ ok: true, text: c.tip });
      markSeen([c.answer]);
    } else {
      play('wrong');
      setMsg({ ok: false, text: `不对。是「${c.answer}」。${c.tip}` });
    }
  };

  return (
    <Shell
      title="哪个字里有这个偏旁？"
      sub="认一个部件，就能认一串字"
      index={i}
      total={order.length}
      right={right}
      onExit={onExit}
    >
      <div
        className="grid h-32 w-32 place-items-center rounded-2xl border-2 border-[#CFE0D9] bg-[#E6F0EC] text-6xl font-black leading-none text-[#2F6F5E]"
        data-testid="part-radical"
      >
        {c.radical}
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => pick(o)}
            className={`rounded-2xl border-2 bg-white py-8 text-5xl font-black leading-none text-ink transition hover:-translate-y-0.5 ${
              answered
                ? o === c.answer
                  ? 'border-[#B85C38] bg-[#F3E0D3]'
                  : 'border-[#E8DFCD] opacity-40'
                : 'border-[#E8DFCD]'
            }`}
          >
            {o}
          </button>
        ))}
      </div>

      {msg && (
        <div
          className={`flex w-full items-start gap-2 rounded-2xl p-4 text-sm leading-relaxed ${
            msg.ok ? 'bg-[#E6F0EC] text-[#205A4B]' : 'bg-[#F5DEDA] text-[#A4403D]'
          }`}
          data-testid="part-verdict"
        >
          <span className="mt-0.5 flex-none">{msg.ok ? OK_SVG : NO_SVG}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {answered && (
        <button
          onClick={() => {
            // 同上：副作用在 updater 外，别让 StrictMode 双跑成绩
            const next = i + 1;
            if (next >= order.length) {
              onDone(scoreRate(right, order.length));
              setI(0);
            } else {
              setI(next);
            }
            setAnswered(false);
            setMsg(null);
          }}
          className="w-full rounded-2xl bg-[#B85C38] py-4 text-lg font-black text-white transition hover:bg-[#A5522F]"
        >
          下一个 →
        </button>
      )}
    </Shell>
  );
}

/* ==================== ③ 形近对比 ==================== */

function CompareGame({
  onExit,
  play,
  onDone,
  markSeen,
}: {
  onExit: () => void;
  play: (k: 'click' | 'right' | 'wrong' | 'clear') => void;
  onDone: (rate: number) => void;
  markSeen: (chars: string[]) => void;
}) {
  const order = useMemo(() => shuffle(CONFUSABLES), []);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const c = order[i];
  // 用已测的造题函数（断言"恰好一个正确答案、无重复"），并按关卡固定，
  // 不随重渲染跳动
  const choice = useMemo(
    () => (c ? buildConfusableChoice(c, Math.random) : null),
    [c],
  );
  if (!c || !choice) return null;

  const pick = (v: string) => {
    if (answered) return;
    setAnswered(true);
    const ok = v === c.answer;
    if (ok) {
      setRight((n) => n + 1);
      play('right');
      setMsg({ ok: true, text: c.tip });
      markSeen([c.answer]);
    } else {
      play('wrong');
      setMsg({ ok: false, text: `不对，是「${c.answer}」。${c.tip}` });
    }
  };

  return (
    <Shell
      title={`「${c.word}」里的这个字是哪个？`}
      sub="把几个长得像的摆在一起比，差别就显出来了"
      index={i}
      total={order.length}
      right={right}
      onExit={onExit}
    >
      <div
        className="rounded-2xl bg-white/80 px-6 py-3 text-2xl font-black text-ink"
        data-testid="cmp-word"
      >
        {c.word}
      </div>

      <div className="grid w-full grid-cols-3 gap-3">
        {choice.options.map((o) => (
          <button
            key={o}
            onClick={() => pick(o)}
            className={`rounded-2xl border-2 bg-white py-8 text-6xl font-black leading-none text-ink transition hover:-translate-y-0.5 ${
              answered
                ? o === c.answer
                  ? 'border-[#4A6BBF] bg-[#E3E9F8]'
                  : 'border-[#E8DFCD] opacity-40'
                : 'border-[#E8DFCD]'
            }`}
          >
            {o}
          </button>
        ))}
      </div>

      {msg && (
        <div
          className={`flex w-full items-start gap-2 rounded-2xl p-4 text-sm leading-relaxed ${
            msg.ok ? 'bg-[#E6F0EC] text-[#205A4B]' : 'bg-[#F5DEDA] text-[#A4403D]'
          }`}
          data-testid="cmp-verdict"
        >
          <span className="mt-0.5 flex-none">{msg.ok ? OK_SVG : NO_SVG}</span>
          <span>{msg.text}</span>
        </div>
      )}

      {answered && (
        <div className="flex w-full flex-col gap-3">
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm font-bold text-ink/50">对比看看：</span>
            {c.options.map((o) => (
              <span
                key={o}
                className={`grid h-12 w-12 place-items-center rounded-xl text-3xl leading-none ${
                  o === c.answer ? 'bg-[#E3E9F8] text-ink' : 'bg-white/60 text-ink/35'
                }`}
              >
                {o}
              </span>
            ))}
          </div>
          <button
            onClick={() => {
              // 副作用在 updater 外：updater 必须纯，StrictMode 下会双跑
              const next = i + 1;
              if (next >= order.length) {
                onDone(scoreRate(right, order.length));
                setI(0);
              } else {
                setI(next);
              }
              setAnswered(false);
              setMsg(null);
            }}
            className="w-full rounded-2xl bg-[#4A6BBF] py-4 text-lg font-black text-white transition hover:bg-[#3A56A0]"
          >
            下一个 →
          </button>
        </div>
      )}
    </Shell>
  );
}

/* ==================== ④ 笔顺字卡 ==================== */

function CardGame({
  onExit,
  play,
  onDone,
  seen,
}: {
  onExit: () => void;
  play: (k: 'click' | 'right' | 'wrong' | 'clear') => void;
  onDone: (rate: number) => void;
  seen: string[];
}) {
  const [char, setChar] = useState<string | null>(null);
  const [picked, setPicked] = useState(0);
  const [input, setInput] = useState('');
  const [miss, setMiss] = useState(false);

  const quick = useMemo(() => {
    const set = new Set<string>(seen.slice(-8));
    BUILD_CHARS.forEach((c) => set.add(c.char));
    return [...set].slice(0, 16);
  }, [seen]);

  if (!char) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full text-center">
          <h2 className="text-2xl font-black text-ink">看笔顺 · 看结构</h2>
          <p className="m-0 text-[14px] text-ink/60">看清了在纸上写 —— 屏幕上不练手</p>
        </div>

        <div className="grid w-full grid-cols-4 gap-2.5">
          {quick.map((c) => (
            <button
              key={c}
              onClick={() => {
                setChar(c);
                play('click');
              }}
              className="rounded-2xl border-2 border-[#E8DFCD] bg-white py-4 text-3xl font-black leading-none text-ink transition hover:-translate-y-0.5"
            >
              {c}
            </button>
          ))}
        </div>

        <form
          className="flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = input.trim();
            if (v) {
              setChar(v);
              setInput('');
              setMiss(false);
              play('click');
            }
          }}
        >
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setMiss(false);
            }}
            placeholder="也可以直接输入一个字"
            maxLength={4}
            className="min-w-0 flex-1 rounded-2xl border-2 border-[#E8DFCD] bg-white px-4 py-3 text-base text-ink outline-none focus:border-[#7A9267]"
          />
          <button
            type="submit"
            className="flex-none rounded-2xl bg-[#7A9267] px-5 py-3 text-base font-black text-white transition hover:bg-[#6A8058]"
          >
            看
          </button>
        </form>

        {miss && (
          <p className="m-0 text-[13px] font-bold text-[#BE5A47]">内嵌字库里还没有这个字</p>
        )}

        <button
          onClick={onExit}
          className="rounded-full bg-white/80 px-5 py-2.5 text-sm font-bold text-ink shadow-sm"
        >
          ← 换一个
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <button
          onClick={() => setChar(null)}
          className="rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-ink shadow-sm"
        >
          ← 字表
        </button>
        <button
          onClick={() => {
            setPicked((n) => n + 1);
            onDone(100);
            play('clear');
          }}
          className="rounded-full bg-[#7A9267] px-4 py-2 text-sm font-black text-white"
        >
          写完了
        </button>
      </div>

      <CharCard char={char} size={280} key={`${char}-${picked}`} />

      <p className="m-0 max-w-sm text-center text-[13.5px] leading-relaxed text-ink/60">
        看完在纸上写一遍。写之前先问自己一句：<b className="text-ink">这个字是几 + 几拼起来的？</b>
      </p>

      <div className="flex w-full flex-wrap justify-center gap-2">
        {['朵', '春', '香', '身', '他', '好', '猫', '林'].map((c) => (
          <button
            key={c}
            onClick={() => {
              setChar(c);
              play('click');
            }}
            className={`grid h-11 w-11 place-items-center rounded-xl text-2xl leading-none transition ${
              c === char ? 'bg-[#E6EBDA] text-ink' : 'bg-white/70 text-ink/60 hover:bg-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==================== 工具 ==================== */

function shuffle<T>(arr: readonly T[], rng?: () => number): T[] {
  const r = rng ?? Math.random;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
