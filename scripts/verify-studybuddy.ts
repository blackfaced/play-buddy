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
 *
 * Run:  ./node_modules/.bin/tsc -p tsconfig.verify.json && node node_modules/.tmp-verify/scripts/verify-studybuddy.js
 */
import {
  probeStudyBuddy,
  fetchStudyReward,
  reportGameSession,
  isHomeMode,
  isFusionEnabled,
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

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
