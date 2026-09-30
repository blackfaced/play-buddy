/**
 * Headless verification for 字的构造台 (src/write/structure.ts)。
 *
 * 这个模块的全部价值在"出题对不对"，而��错题比写错题更伤 —— 孩子
 * 会开始不信题。所以这里重点断言**题库自身的一致性**：
 *   - 搭积木：每个字的答案部件在干扰项里、干扰项不重、不等于答案
 *   - 结构题：干扰项"独体字"必须存在（合成字不能选它）
 *   - 找偏旁：答案必须在选项里，且与所有干扰项不同
 *   - 形近题：答案必须在选项里，且与所有干扰项不同
 *   - 造题：随机打乱 2000 轮，选项恒含且仅含一个正确答案、无重复
 *   - 查表：charsUsing 查得到、查不到返回空、偏旁不出现在别的字那半
 *   - 内嵌字形库：覆盖清单完整、数据可解析、笔画数与 medians 对齐
 *   - 评分：0 题不产生 NaN
 *
 * Run: npm run verify:write
 */
import {
  BUILD_CHARS,
  RADICALS,
  CONFUSABLES,
  STRUCT_OPTIONS,
  askedPart,
  topLabel,
  bottomLabel,
  charsUsing,
  buildPartChoice,
  buildConfusableChoice,
  scoreRate,
  verdictFor,
} from '../src/write/structure';
import { STROKE_CHARS, getHanziData, strokeCount } from '../src/write/strokes';

const ROUNDS = 2000;

let failures = 0;
let checks = 0;

function check(cond: boolean, msg: string, ctx?: unknown): void {
  checks++;
  if (!cond) {
    failures++;
    if (failures <= 25) console.error(`  ✗ ${msg}`, ctx === undefined ? '' : JSON.stringify(ctx));
  }
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ---------- 搭积木题库一致性 ---------- */
check(BUILD_CHARS.length === 25, `搭积木应有 25 个字，实际 ${BUILD_CHARS.length}`);

const seenChars = new Set<string>();
for (const c of BUILD_CHARS) {
  const where = { char: c.char };
  check(!seenChars.has(c.char), `搭积木题库有重复字：${c.char}`, where);
  seenChars.add(c.char);

  check(c.wrong.length === 3, `${c.char} 应有 3 个干扰项，实际 ${c.wrong.length}`, where);

  const answer = askedPart(c);
  check(
    (c.ask === 'p1' ? c.top : c.bottom) === answer,
    `${c.char} 的 ask 与 top/bottom 不一致`,
    where,
  );
  check(answer.length > 0, `${c.char} 缺答案部件`, where);
  check(c.top.length > 0 && c.bottom.length > 0, `${c.char} 缺另一半`, where);
  check(c.tip.length > 0, `${c.char} 缺提示`, where);

  // 关键：干扰项不能和答案重名 —— 出现"两个一样的选项"是设计事故
  const wrongSet = new Set(c.wrong);
  check(wrongSet.size === c.wrong.length, `${c.char} 干扰项内部有重复：${c.wrong.join('')}`, where);
  check(!wrongSet.has(answer), `${c.char} 的干扰项里混进了正确答案「${answer}」`, where);
  // 两半相同是合法且重要的教学点（朋=月+月、林=木+木）：
  // 这类字必须问"第二半"、且提示要讲清左右两半的差别在哪。
  if (c.top === c.bottom) {
    check(c.ask === 'p2', `${c.char} 两半相同却问的是 p1，等于送分`, where);
    check(/左|右|一样|不同/.test(c.tip), `${c.char} 两半相同，提示要说清左右差别`, where);
  }
}

/* ---------- 结构题的干扰项 ---------- */
{
  const values = STRUCT_OPTIONS.map((o) => o.value);
  check(values.length === 3, `结构题应 3 个选项，实际 ${values.length}`);
  check(values.includes('up') && values.includes('lr'), '结构题缺上下/左右');
  check(values.includes('sg'), '结构题必须留"独体字"当干扰项（合成字不能选它）');
  for (const o of STRUCT_OPTIONS) check(o.hint.length > 0, `结构选项 ${o.value} 缺提示`);
}

/* ---------- 标签函数 ---------- */
{
  check(topLabel('up') === '上面' && bottomLabel('up') === '下面', '上下结构标签错');
  check(topLabel('lr') === '左边' && bottomLabel('lr') === '右边', '左右结构标签错');
}

/* ---------- 找偏旁题库 ---------- */
for (const r of RADICALS) {
  const where = { radical: r.radical };
  check(r.options.length === 3, `${r.radical} 应 3 个选项，实际 ${r.options.length}`, where);
  check(r.options.includes(r.answer), `${r.radical} 的选项里没有正确答案「${r.answer}」`, where);
  check(new Set(r.options).size === r.options.length, `${r.radical} 选项有重复：${r.options.join('')}`, where);
  check(r.tip.length > 0, `${r.radical} 缺提示`, where);
}

/* ---------- 形近题库 ---------- */
for (const c of CONFUSABLES) {
  const where = { word: c.word };
  check(c.options.length === 3, `${c.word} 应 3 个选项，实际 ${c.options.length}`, where);
  check(c.options.includes(c.answer), `${c.word} 的选项里没有正确答案「${c.answer}」`, where);
  check(new Set(c.options).size === c.options.length, `${c.word} 选项有重复`, where);
  check(c.word.includes(c.answer), `${c.word} 里应该含有正确答案「${c.answer}」`, where);
  check(c.tip.length > 0, `${c.word} 缺提示`, where);
}

/* ---------- 造题：随机打乱后仍恰好一个正确答案 ---------- */
for (let i = 0; i < ROUNDS; i++) {
  const rng = lcg(i + 1);

  const q = buildPartChoice(BUILD_CHARS[i % BUILD_CHARS.length], rng);
  const hit = q.options.filter((o) => o === q.answer).length;
  check(hit === 1, `搭积木造题出现 ${hit} 个正确答案`, { q });
  check(new Set(q.options).size === q.options.length, '搭积木造题有重复选项', { q });
  check(q.options.length === 4, `搭积木造题应有 4 个选项，实际 ${q.options.length}`, { q });

  const q2 = buildConfusableChoice(CONFUSABLES[i % CONFUSABLES.length], rng);
  const hit2 = q2.options.filter((o) => o === q2.answer).length;
  check(hit2 === 1, `形近造题出现 ${hit2} 个正确答案`, { q2 });
  check(new Set(q2.options).size === q2.options.length, '形近造题有重复选项', { q2 });
}

/* ---------- 查表 charsUsing ---------- */
{
  const fromWood = charsUsing('木');
  check(fromWood.length > 0, '查「木」应查到字');
  for (const ch of fromWood) {
    const c = BUILD_CHARS.find((x) => x.char === ch)!;
    check(c.top === '木' || c.bottom === '木', `charsUsing('木') 返回了不含木的字：${ch}`);
  }
  // ���表里的偏旁一定能查到至少一个字（RADICALS 是照着 BUILD_CHARS 挑的）
  for (const r of RADICALS) {
    check(charsUsing(r.radical).length > 0, `偏旁「${r.radical}」在搭积木题库里查不到任何字`, r);
  }
  check(charsUsing('龘').length === 0, '不存在的偏旁应返回空数组');
}

/* ---------- 评分 ---------- */
{
  check(scoreRate(0, 0) === 0, '0 题 → 0%（不得 NaN）');
  check(scoreRate(5, 0) === 0, '5/0 → 0%（不得 Infinity）');
  check(scoreRate(1, 2) === 50, '1/2 → 50%');
  check(scoreRate(3, 3) === 100, '3/3 → 100%');
  check(scoreRate(1, 3) === 33, '1/3 → 33%');
  const cases: Array<[number, string]> = [[100, '🏆'], [90, '🏆'], [89, '🎉'], [70, '🎉'], [69, '💪'], [50, '💪'], [49, '🌱'], [0, '🌱']];
  for (const [rate, want] of cases) check(verdictFor(rate).emoji === want, `正确率 ${rate}% 应得 ${want}`, verdictFor(rate));
  check(verdictFor(150).emoji === '🏆', '150% 夹到最高档');
  check(verdictFor(-1).emoji === '🌱', '-1% 夹到最低档');
}

/* ---------- 内嵌字形库 ---------- */
{
  check(STROKE_CHARS.length >= 60, `内嵌字库太少：${STROKE_CHARS.length}`);
  check(new Set(STROKE_CHARS).size === STROKE_CHARS.length, '内嵌字库有重复字');

  // 三个游戏的字都必须能查到笔顺（否则字卡开天窗）
  for (const c of BUILD_CHARS) {
    check(getHanziData(c.char) !== null, `搭积木的字「${c.char}」缺笔顺数据`);
  }
  for (const c of CONFUSABLES) {
    // 形近题里当干扰项的字也要能查（孩子会点它们看笔顺）
    check(getHanziData(c.answer) !== null, `形近题答案「${c.answer}」缺笔顺数据`);
  }

  check(getHanziData('龘') === null, '不存在的字应返回 null（不是抛异常）');
  check(strokeCount('龘') === 0, '不存在的字笔画数应为 0');

  // 数据完整性：strokes 与 medians 必须等长，否则 HanziWriter 会画错
  for (const c of STROKE_CHARS) {
    const d = getHanziData(c);
    if (!d) {
      check(false, `内嵌字库里有字取不到数据：${c}`);
      continue;
    }
    check(Array.isArray(d.strokes) && d.strokes.length > 0, `${c} 没有笔画路径`, c);
    check(
      d.strokes.length === d.medians.length,
      `${c} 的 strokes(${d.strokes.length}) 与 medians(${d.medians.length}) 不等长`,
      c,
    );
  }

  // 几个基准字的笔画数，防止数据被误改（HanziWriter 数据是稳定的）
  const expect: Array<[string, number]> = [
    ['一', 1], ['二', 2], ['三', 3], ['十', 2], ['人', 2], ['口', 3],
    ['大', 3], ['小', 3], ['天', 4], ['中', 4], ['上', 3], ['下', 3],
    ['日', 4], ['手', 4], ['朵', 6], ['春', 9], ['香', 9], ['身', 7], ['他', 5], ['林', 8], ['朋', 8],
  ];
  for (const [c, n] of expect) {
    check(strokeCount(c) === n, `${c} 应 ${n} 画，实际 ${strokeCount(c)}`, c);
  }
}

/* ---------- report ---------- */
console.log(
  failures === 0
    ? `✓ verify:write — ${checks} 项断言全过（${ROUNDS} 轮造题 · 字库 ${STROKE_CHARS.length} 字）`
    : `✗ verify:write — ${failures}/${checks} 项失败`,
);
if (failures > 0) process.exit(1);
