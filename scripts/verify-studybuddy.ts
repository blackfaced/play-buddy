/**
 * study-buddy 融合层单元验证（mock fetch，不依赖真实服务器）：
 *
 *  1. 探测：/api/apps 可达 → 在家模式；抛错/非 ok → 纯玩模式
 *  2. 奖励计算：
 *     - 学习每局 +5min，每日封顶 +10min（3 局及以上也只给 10）
 *     - 聚合正确率 <60% → 0
 *     - 只统计"今天"的条目（昨天的不计）
 *     - 排除 balance-blocks 自身（防自反馈刷时长）
 *     - draft 状态的应用不计
 *     - 任一接口异常 → null（按纯玩处理，不猜数据）
 *  3. 上报：纯玩模式下 reportGameSession 不发出任何请求
 *  3b. 学习类上报：迁入 play-buddy 的学习游戏（乘法大冒险）必须回传
 *      session + mistake，否则该 appId 在奖励池里贡献恒为 0
 *
 * Run:  ./node_modules/.bin/tsc -p tsconfig.verify.json && node node_modules/.tmp-verify/scripts/verify-studybuddy.js
 */
import {
  probeStudyBuddy,
  fetchStudyReward,
  reportGameSession,
  reportStudySession,
  reportStudyMistake,
  isHomeMode,
  isFusionEnabled,
  resolveRewardCapMs,
  SB_REWARD_CAP_MS,
  SB_REWARD_PER_SESSION_MS,
  type SBFetch,
} from '../src/game/studyBuddy';

const MIN = 60_000;
const TODAY = '2026-08-27';

function mockFetch(routes: Record<string, unknown | 'ERR'>, log?: string[]): SBFetch {
  return async (url: string, init?: { method?: string }) => {
    if (log) log.push(`${init?.method ?? 'GET'} ${url}`);
    const hit = routes[url];
    if (hit === undefined || hit === 'ERR') throw new Error(`no route: ${url}`);
    return { ok: true, json: async () => hit };
  };
}

const APPS = {
  apps: [
    { id: 'candy-math-island', status: 'ready' },
    { id: 'multiplication-drill', status: 'ready' },
    { id: 'write', status: 'ready' },
    { id: 'balance-blocks', status: 'ready' }, // 自身——必须被排除
    { id: 'some-draft', status: 'draft' }, // 草稿——不计
  ],
};

function daily(date: string, sessions: number, questions: number, correct: number) {
  return {
    days: 1,
    appId: 'x',
    daily: [
      { date, sessionCount: sessions, totalQuestions: questions, correctCount: correct, correctRate: 0 },
    ],
  };
}

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    console.log(`  ❌ ${name}`);
    failures++;
  }
}

async function main() {
  console.log('study-buddy 融合层验证');

  // ---- 1. 探测 ----
  console.log('\n[1] 模式探测');
  const home = await probeStudyBuddy(mockFetch({ '/api/apps': APPS }));
  check('API 可达 → 在家模式', home === true && isHomeMode() === true);
  const away = await probeStudyBuddy(mockFetch({}));
  check('API 不可达 → 纯玩模式', away === false && isHomeMode() === false);

  // ---- 2. 奖励计算 ----
  console.log('\n[2] 学习奖励计算');
  const base = {
    '/api/apps': APPS,
    '/api/game/daily?days=1&appId=candy-math-island': daily(TODAY, 1, 20, 18),
    '/api/game/daily?days=1&appId=multiplication-drill': daily(TODAY, 1, 10, 9),
    '/api/game/daily?days=1&appId=write': daily(TODAY, 0, 0, 0),
  };

  const r1 = await fetchStudyReward(TODAY, mockFetch(base));
  check('两局学习 → +10min（达到日封顶）', r1 !== null && r1.rewardMs === 2 * SB_REWARD_PER_SESSION_MS);
  check('聚合正确率 27/30 = 0.9', r1 !== null && r1.accuracy !== null && Math.abs(r1.accuracy - 0.9) < 1e-9);

  const r2 = await fetchStudyReward(
    TODAY,
    mockFetch({
      ...base,
      '/api/game/daily?days=1&appId=candy-math-island': daily(TODAY, 1, 20, 10), // 50%
      '/api/game/daily?days=1&appId=multiplication-drill': daily(TODAY, 0, 0, 0),
    }),
  );
  check('聚合正确率 50% < 60% → 无奖励', r2 !== null && r2.rewardMs === 0);

  const r3 = await fetchStudyReward(
    TODAY,
    mockFetch({
      ...base,
      '/api/game/daily?days=1&appId=candy-math-island': daily('2026-08-26', 5, 50, 50), // 昨天
      '/api/game/daily?days=1&appId=multiplication-drill': daily('2026-08-26', 5, 50, 50),
    }),
  );
  check('只有昨天的记录 → 今天 0 奖励', r3 !== null && r3.rewardMs === 0 && r3.sessions === 0);

  const r4 = await fetchStudyReward(
    TODAY,
    mockFetch({
      ...base,
      '/api/game/daily?days=1&appId=candy-math-island': daily(TODAY, 10, 100, 100),
    }),
  );
  check('10 局也只给日封顶 +10min', r4 !== null && r4.rewardMs === SB_REWARD_CAP_MS && SB_REWARD_CAP_MS === 10 * MIN);

  const r5 = await fetchStudyReward(TODAY, mockFetch({}));
  check('接口全挂 → null（不猜数据）', r5 === null);

  const r6 = await fetchStudyReward(
    TODAY,
    mockFetch({
      ...base,
      '/api/game/daily?days=1&appId=write': 'ERR',
    }),
  );
  check('任一学习应用查询失败 → null', r6 === null);

  // ---- 3. 上报 ----
  console.log('\n[3] 会话上报');
  const log: string[] = [];
  // 当前处于纯玩模式（上面最后一次 probe 是 away）
  reportGameSession({ durationMs: 65_000 }, mockFetch({ '/api/game/session': { sessionId: 1 } }, log));
  check('纯玩模式下不发任何请求', log.length === 0);

  await probeStudyBuddy(mockFetch({ '/api/apps': APPS })); // 切回在家模式
  reportGameSession({ durationMs: 65_000 }, mockFetch({ '/api/game/session': { sessionId: 1 } }, log));
  check('在家模式发出 1 条 POST /api/game/session', log.length === 1 && log[0] === 'POST /api/game/session');

  // ---- 4. 环境变量开关 ----
  console.log('\n[4] 融合层环境变量开关');
  const t0 = (v: Record<string, unknown>, expect: boolean, label: string) =>
    check(label, isFusionEnabled(v) === expect);

  t0({}, true, '未设置 → 开启（维持既有行为）');
  t0({ VITE_STUDY_BUDDY_ENABLED: '' }, true, '空字符串 → 开启');
  t0({ VITE_STUDY_BUDDY_ENABLED: 'true' }, true, '"true" → 开启');
  t0({ VITE_STUDY_BUDDY_ENABLED: 'false' }, false, '"false" → 关闭');
  t0({ VITE_STUDY_BUDDY_ENABLED: 'FALSE' }, false, '"FALSE"（大写）→ 关闭');
  t0({ VITE_STUDY_BUDDY_ENABLED: ' false ' }, false, '带空格的 "false" → 关闭');
  t0({ VITE_STUDY_BUDDY_ENABLED: '0' }, false, '"0" → 关闭');
  t0({ VITE_STUDY_BUDDY_ENABLED: 'off' }, false, '"off" → 关闭');
  t0({ VITE_STUDY_BUDDY_ENABLED: 'no' }, false, '"no" → 关闭');
  t0({ VITE_STUDY_BUDDY_ENABLED: true }, true, '布尔 true → 开启');
  t0({ VITE_STUDY_BUDDY_ENABLED: false }, false, '布尔 false → 关闭');

  // 开关开启时 fetchStudyReward 照常走网络并算出奖励
  const probeLog: string[] = [];
  const r7 = await fetchStudyReward(
    TODAY,
    mockFetch(
      {
        '/api/apps': APPS,
        '/api/game/daily?days=1&appId=candy-math-island': daily(TODAY, 2, 10, 9),
        '/api/game/daily?days=1&appId=multiplication-drill': daily(TODAY, 1, 10, 9),
        '/api/game/daily?days=1&appId=write': daily(TODAY, 1, 10, 9),
      },
      probeLog,
    ),
  );
  check('开关开启时 fetchStudyReward 正常返回', r7 !== null);
  check('开关开启时会打 /api/apps', probeLog.length > 0);
  check('开关开启时算出 3 局 × 5min = 15min（受日封顶 10min 约束）', r7?.rewardMs === SB_REWARD_CAP_MS);
  check('开关开启时聚合正确率正常计算（3 应用共 30 题对 27 题）', r7?.accuracy === 27 / 30);

  // ---- 5. 日封顶环境变量 ----
  console.log('\n[5] 奖励日封顶环境变量');
  const cap = (v: unknown, expectMin: number, label: string) =>
    check(label, resolveRewardCapMs(v === undefined ? {} : { VITE_SB_REWARD_CAP_MIN: v }) === expectMin * MIN);
  cap(undefined, 10, '未设置 → 默认 10 分钟');
  cap('', 10, '空字符串 → 默认 10 分钟');
  cap('10', 10, '"10" → 10 分钟');
  cap('15', 15, '"15" → 15 分钟（家长要的）');
  cap(' 15 ', 15, '带空格的 "15" → 15 分钟');
  cap('30', 30, '"30" → 30 分钟');
  cap(15, 15, '数字 15 → 15 分钟');
  cap('0', 10, '"0" → 回落默认（不能把奖励全掐死）');
  cap('-5', 10, '负数 → 回落默认');
  cap('abc', 10, '非数字 → 回落默认');
  cap('NaN', 10, '"NaN" → 回落默认');
  cap('Infinity', 10, '"Infinity" → 回落默认');
  cap('1.5', 1.5, '"1.5" → 保留 1.5 分钟（90 秒）');
  check('默认 10 分钟 = 2 局 × 5 分钟', SB_REWARD_CAP_MS === 10 * MIN);

  // ---- 6. 学习类上报（乘法大冒险） ----
  // 迁入 play-buddy 的学习游戏必须回传，否则该 appId 在 /api/game/daily
  // 恒为 0，fetchStudyReward 的奖励池里这个源就消失了。
  console.log('\n[6] 学习类会话/错题上报');
  {
    const log2: string[] = [];
    const f2 = mockFetch({ '/api/game/session': { sessionId: 1 }, '/api/game/mistake': { id: 1 } }, log2);

    // 先切到纯玩模式，验证静默
    await probeStudyBuddy(mockFetch({ '/api/apps': 'ERR' }));
    reportStudySession({ appId: 'multiplication-drill', durationMs: 60_000, totalQuestions: 12, correctCount: 10 }, f2);
    reportStudyMistake({ appId: 'multiplication-drill', problem: '7 × 8 = ?', userAnswer: '54', correctAnswer: '56', errorType: 'multiply' }, f2);
    check('纯玩模式下学习类上报也不发请求', log2.length === 0);

    // 在家模式：两条都发
    await probeStudyBuddy(mockFetch({ '/api/apps': APPS }));
    reportStudySession({ appId: 'multiplication-drill', durationMs: 60_000, totalQuestions: 12, correctCount: 10 }, f2);
    check('在家模式发 POST /api/game/session', log2.length === 1 && log2[0] === 'POST /api/game/session');
    reportStudyMistake({ appId: 'multiplication-drill', problem: '7 × 8 = ?', userAnswer: '54', correctAnswer: '56', errorType: 'multiply' }, f2);
    check('在家模式发 POST /api/game/mistake', log2.length === 2 && log2[1] === 'POST /api/game/mistake');

    // 载荷校验：题数原样上报（正确率参与 <60% 不发奖判定）
    const bodies: string[] = [];
    const f3: SBFetch = async (_u, init) => { bodies.push(String(init?.body)); return { ok: true, json: async () => ({}) }; };
    await probeStudyBuddy(mockFetch({ '/api/apps': APPS }));
    reportStudySession({ appId: 'multiplication-drill', durationMs: 60_000, totalQuestions: 12, correctCount: 10 }, f3);
    const s = JSON.parse(bodies[0]);
    check('session 载荷 appId 正确', s.appId === 'multiplication-drill');
    check('session 载荷 childId=default', s.childId === 'default');
    check('session 载荷 totalQuestions=12', s.totalQuestions === 12);
    check('session 载荷 correctCount=10', s.correctCount === 10);
    check('session 载荷 durationSec=60', s.durationSec === 60);

    // 边界：题数不能是 0（服务端要求 >0），correct 不能超过 total
    bodies.length = 0;
    reportStudySession({ appId: 'multiplication-drill', durationMs: 1_000, totalQuestions: 0, correctCount: 5 }, f3);
    const b = JSON.parse(bodies[0]);
    check('totalQuestions 下限夹到 1', b.totalQuestions === 1);
    check('correctCount 不超过 totalQuestions', b.correctCount <= b.totalQuestions);
    reportStudySession({ appId: 'multiplication-drill', durationMs: 500, totalQuestions: 3, correctCount: 9 }, f3);
    check('correctCount 超界被夹住', JSON.parse(bodies[1]).correctCount === 3);
    check('durationSec 下限夹到 1', JSON.parse(bodies[1]).durationSec === 1);

    // 防自反馈：不能用 balance-blocks 自己的 id 上报学习局
    const before = bodies.length;
    reportStudySession({ appId: 'balance-blocks', durationMs: 60_000, totalQuestions: 5, correctCount: 5 }, f3);
    reportStudySession({ appId: '', durationMs: 60_000, totalQuestions: 5, correctCount: 5 }, f3);
    check('拒绝用 balance-blocks / 空 appId 上报（防自反馈）', bodies.length === before);

    // 错题载荷
    bodies.length = 0;
    reportStudyMistake({ appId: 'multiplication-drill', problem: '7 × 8 = ?', userAnswer: '54', correctAnswer: '56', errorType: 'multiply' }, f3);
    const m = JSON.parse(bodies[0]);
    check('mistake 载荷 problem 原样', m.problem === '7 × 8 = ?');
    check('mistake 载荷 errorType=multiply', m.errorType === 'multiply');
    check('mistake 载荷 source=appId', m.source === 'multiplication-drill');
    check('mistake 载荷 childId=default', m.childId === 'default');
  }

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
void main();
