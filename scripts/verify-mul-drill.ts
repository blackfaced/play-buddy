/**
 * Headless verification for 乘法大冒险 (migrated from study-buddy
 * web/games/multiplication-drill/).
 *
 * Runs N rounds and asserts every hard constraint the game relies on:
 *   - 乘数恒在 1–9（乘法表全覆盖，无 0/负数/越界）
 *   - answer === a * b，problem 串格式稳定
 *   - rng 边界：rng→0 得 1×1，rng→接近 1 得 9×9（无 off-by-one）
 *   - 注入 rng 时完全可复现（无隐藏 Math.random）
 *   - 9×9 表：9 行 9 列，每格 "a×b=ab"
 *   - 数字键盘：位数推导 / 到达位数自动提交 / 上限截断 / 退格
 *   - 正确率：0 题不产生 NaN
 *   - 结算评级四档边界（90 / 70 / 50）
 *   - 平均速度：0 题不产生 NaN/Infinity
 *
 * Run: npm run verify:mul-drill
 */
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
  MUL_MIN,
  MUL_MAX,
  TABLE_SIZE,
} from '../src/muldrill/pick-gen';

const ROUNDS = 5000;

let failures = 0;
let checks = 0;

function check(cond: boolean, msg: string, ctx?: unknown): void {
  checks++;
  if (!cond) {
    failures++;
    if (failures <= 25) console.error(`  ✗ ${msg}`, ctx === undefined ? '' : JSON.stringify(ctx));
  }
}

/** Deterministic LCG so a failure is reproducible from the round index. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------- constants ---------- */
check(MUL_MIN === 1, 'MUL_MIN 应为 1', MUL_MIN);
check(MUL_MAX === 9, 'MUL_MAX 应为 9', MUL_MAX);
check(TABLE_SIZE === 9, 'TABLE_SIZE 应为 9', TABLE_SIZE);

/* ---------- rng boundaries (off-by-one hunt) ---------- */
{
  const lo = pickMultiplicationQuestion(() => 0);
  check(lo.a === 1 && lo.b === 1, 'rng=0 → 1×1', lo);

  const hi = pickMultiplicationQuestion(() => 0.9999999);
  check(hi.a === 9 && hi.b === 9, 'rng≈1 → 9×9', hi);

  // rng 恰为 1 是契约外的输入（约定 [0,1)），但不应产出 10
  const edge = pickMultiplicationQuestion(() => 1);
  check(edge.a >= 1 && edge.a <= 9, 'rng=1（越界输入）不应产出 10', edge);
}

/* ---------- determinism ---------- */
{
  const a = pickMultiplicationQuestion(lcg(42));
  const b = pickMultiplicationQuestion(lcg(42));
  check(
    a.a === b.a && a.b === b.b && a.answer === b.answer,
    '同一 rng 种子应产出同一题（无隐藏 Math.random）',
    { a, b },
  );
}

/* ---------- mass round: domain + arithmetic ---------- */
{
  const seen = new Set<string>();
  for (let i = 0; i < ROUNDS; i++) {
    const q = pickMultiplicationQuestion(lcg(i + 1));
    const where = { i, q };
    check(q.a >= MUL_MIN && q.a <= MUL_MAX, `a 越界 (${q.a})`, where);
    check(q.b >= MUL_MIN && q.b <= MUL_MAX, `b 越界 (${q.b})`, where);
    check(q.answer === q.a * q.b, `answer 错 (${q.a}×${q.b}=${q.answer})`, where);
    check(
      q.problem === `${q.a} × ${q.b} = ?`,
      `problem 格式漂移 ("${q.problem}")`,
      where,
    );
    seen.add(`${q.a}x${q.b}`);
  }
  check(seen.size === MUL_MAX * MUL_MAX, `应覆盖全部 ${MUL_MAX * MUL_MAX} 个格子，实际 ${seen.size}`);
  console.log(`  · ${ROUNDS} 轮覆盖 ${seen.size}/${MUL_MAX * MUL_MAX} 个乘法格`);
}

/* ---------- multiplication table ---------- */
{
  const t = makeMultiplicationTable();
  const lines = t.split('\n');
  // 10 行 = 1 行表头 + 9 行数据（1-9）
  check(lines.length === TABLE_SIZE + 1, `表应为 ${TABLE_SIZE + 1} 行（表头 + 数据），实际 ${lines.length}`);

  // 表头：行号位 + 1..9
  const head = lines[0];
  for (let b = 1; b <= TABLE_SIZE; b++) {
    check(head.includes(String(b)), `表头缺列号 ${b}`, { head });
  }

  // 每个数据行的每一列都等于 a×b
  for (let a = 1; a <= TABLE_SIZE; a++) {
    const row = lines[a];
    // 行首是行号 a
    check(row.trimStart().startsWith(String(a)), `第 ${a} 行行号错 ("${row}")`);
    // 逐列解析：定宽右对齐，直接按位置切片核对
    for (let b = 1; b <= TABLE_SIZE; b++) {
      const cell = row.slice(4 + (b - 1) * 4, 4 + b * 4).trim();
      check(cell === String(a * b), `第 ${a} 行第 ${b} 列错 ("${cell}")，应为 ${a * b}`);
    }
  }

  // 对齐是这个函数存在的理由：所有行必须严格等长
  const widths = new Set(lines.map((l) => l.length));
  check(widths.size === 1, `所有行必须等长（列才对得齐），实际出现 ${widths.size} 种宽度：${[...widths].join(',')}`);

  // 宽度上限：不能宽到手机上要横向滚动（口诀表版式 40 字符）
  const w = lines[0].length;
  check(w <= 42, `表宽 ${w} 字符，超出 42 会在窄屏横滚`);
}

/* ---------- numpad: expectedAnswerLength ---------- */
{
  check(expectedAnswerLength(0) === 1, '0 → 1 位');
  check(expectedAnswerLength(9) === 1, '9 → 1 位');
  check(expectedAnswerLength(10) === 2, '10 → 2 位');
  check(expectedAnswerLength(81) === 2, '81 → 2 位');
  check(expectedAnswerLength('7') === 1, '"7" → 1 位');
  check(expectedAnswerLength('') === null, '空串 → null');
  check(expectedAnswerLength('   ') === null, '空白串 → null');
  check(expectedAnswerLength(-3) === null, '负数 → null');
  check(expectedAnswerLength(2.5) === null, '非整数 → null');
  check(expectedAnswerLength('abc') === null, '非数字串 → null');
  check(expectedAnswerLength(null as unknown as number) === null, 'null → null');
}

/* ---------- numpad: shouldAutoSubmit ---------- */
{
  check(shouldAutoSubmit('7', 9) === true, '1 位对 1 位 → 自动提交');
  check(shouldAutoSubmit('72', 81) === true, '2 位对 2 位 → 自动提交');
  check(shouldAutoSubmit('7', 81) === false, '1 位对 2 位 → 不提交');
  check(shouldAutoSubmit('72', 9) === false, '2 位对 1 位 → 不提交');
  check(shouldAutoSubmit('', 9) === false, '空串 → 不提交');
  check(shouldAutoSubmit('7x', 9) === false, '含非数字 → 不提交');
  check(shouldAutoSubmit('7', null as unknown as number) === false, '答案非整数 → 不提交（落回手动 ✓）');
}

/* ---------- numpad: appendDigit / backspace ---------- */
{
  check(appendDigit('', '7', 2) === '7', '空串追加');
  check(appendDigit('7', '2', 2) === '72', '追加到上限');
  check(appendDigit('72', '3', 2) === '72', '超过上限被截断');
  check(appendDigit('7', '2', 1) === '7', '上限 1 时截断');
  check(backspace('72') === '7', '退格');
  check(backspace('') === '', '空串退格不炸');
  check(backspace('7') === '', '退到空串');

  // 模拟一整轮键盘输入，确认不会出现非法字符或超长
  let buf = '';
  for (const k of ['7', '2', '9', '1']) {
    buf = appendDigit(buf, k, 2);
  }
  check(buf === '72', '连续输入后应停在 2 位', buf);
}

/* ---------- rateOf ---------- */
{
  check(rateOf(0, 0) === 0, '0 题 → 0%（不得 NaN）');
  check(rateOf(1, 2) === 50, '1/2 → 50%');
  check(rateOf(3, 3) === 100, '3/3 → 100%');
  check(rateOf(0, 4) === 0, '0/4 → 0%');
  check(rateOf(1, 3) === 33, '1/3 → 33%（四舍五入）');
  check(rateOf(7, 8) === 88, '7/8 → 88%');
  check(rateOf(5, 0) === 0, '5/0 → 0%（不得 Infinity/NaN）');
}

/* ---------- verdictFor 边界 ---------- */
{
  const cases: Array<[number, string]> = [
    [100, '🏆'],
    [90, '🏆'],
    [89, '🎉'],
    [70, '🎉'],
    [69, '💪'],
    [50, '💪'],
    [49, '🌱'],
    [0, '🌱'],
  ];
  for (const [rate, want] of cases) {
    check(verdictFor(rate).emoji === want, `正确率 ${rate}% 应得 ${want}`, verdictFor(rate));
  }
  // 文案不能为空
  for (const r of [100, 80, 60, 20]) {
    check(verdictFor(r).title.length > 0, `正确率 ${r}% 缺文案`);
  }
  // 越界输入要夹住，不能返回 undefined
  check(verdictFor(150).emoji === '🏆', '150% 夹到最高档');
  check(verdictFor(-5).emoji === '🌱', '-5% 夹到最低档');
}

/* ---------- avgSecondsPerQuestion ---------- */
{
  check(avgSecondsPerQuestion(60, 0) === 0, '0 题 → 0（不得 NaN/Infinity）');
  check(avgSecondsPerQuestion(60, 12) === 5, '60s/12 → 5');
  check(avgSecondsPerQuestion(45, 10) === 4.5, '45s/10 → 4.5');
  check(avgSecondsPerQuestion(0, 5) === 0, '0 秒 → 0（不得 NaN）');
}

/* ---------- report ---------- */
console.log(
  failures === 0
    ? `✓ verify:mul-drill — ${checks} 项断言全过（${ROUNDS} 轮随机）`
    : `✗ verify:mul-drill — ${failures}/${checks} 项失败`,
);
if (failures > 0) process.exit(1);
