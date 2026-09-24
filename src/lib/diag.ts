// src/lib/diag.ts
// =====================================================================
// 本地诊断环形缓冲——排查孩子反馈的 bug 用。
//
// 设计原则（与防沉迷一致的隐私口径）：
//   - 只写设备 localStorage（bb.diag），不上传任何服务器
//   - 只记"发生了什么操作/状态变化"，不记任何输入内容
//   - 环形缓冲最多 200 条，超出丢弃最旧
//   - 「复制诊断信息」按钮生成文本报告，由家长手动粘贴发送
// =====================================================================

import { getItem, setItem } from './storage';

const KEY = 'bb.diag';
const MAX_EVENTS = 200;
const SAVE_THROTTLE_MS = 3000;

export interface DiagEvent {
  t: number; // epoch ms
  e: string; // 事件类型：phase / action / end / lock / engine
  d?: string; // 细节（不含用户输入内容）
}

function load(): DiagEvent[] {
  try {
    const raw = getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) {
        return arr
          .filter(
            (x): x is DiagEvent =>
              !!x && typeof (x as DiagEvent).t === 'number' && typeof (x as DiagEvent).e === 'string',
          )
          .slice(-MAX_EVENTS);
      }
    }
  } catch {
    /* 损坏即清空重来 */
  }
  return [];
}

let buf: DiagEvent[] = [];
let loaded = false;
let saveAt = 0;

/** 记录一条诊断事件（节流落盘） */
export function logDiag(e: string, d?: string): void {
  if (!loaded) {
    buf = load();
    loaded = true;
  }
  buf.push({ t: Date.now(), e, ...(d !== undefined ? { d } : {}) });
  if (buf.length > MAX_EVENTS) buf = buf.slice(-MAX_EVENTS);
  const now = Date.now();
  if (now >= saveAt) {
    saveAt = now + SAVE_THROTTLE_MS;
    try {
      setItem(KEY, JSON.stringify(buf));
    } catch {
      /* 存储满了就放弃落盘，内存里还在 */
    }
  }
}

/** 诊断报告附带的实时状态快照（由 store 注册，避免反向依赖） */
export type DiagSnapshot = Record<string, string | number | boolean | null>;
let snapshotProvider: (() => DiagSnapshot) | null = null;
export function setDiagSnapshotProvider(p: () => DiagSnapshot): void {
  snapshotProvider = p;
}

function fmtTime(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 生成纯文本诊断报告（供家长复制粘贴给开发者） */
export function collectDiagReport(): string {
  if (!loaded) {
    buf = load();
    loaded = true;
  }
  const lines: string[] = [];
  lines.push('=== play-buddy 诊断报告 ===');
  lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
  if (typeof navigator !== 'undefined') lines.push(`UA: ${navigator.userAgent}`);
  if (typeof window !== 'undefined') lines.push(`视口: ${window.innerWidth}x${window.innerHeight}`);
  if (snapshotProvider) {
    lines.push('--- 当前状态 ---');
    for (const [k, v] of Object.entries(snapshotProvider())) lines.push(`${k}: ${v ?? '—'}`);
  }
  lines.push(`--- 最近 ${buf.length} 条事件 ---`);
  for (const ev of buf) {
    lines.push(`${fmtTime(ev.t)} [${ev.e}]${ev.d ? ' ' + ev.d : ''}`);
  }
  return lines.join('\n');
}

/** 复制诊断报告到剪贴板；返回是否成功 */
export async function copyDiagReport(): Promise<boolean> {
  const text = collectDiagReport();
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 旧浏览器 fallback：临时 textarea + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}
