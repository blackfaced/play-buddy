import { MarbleGame } from '@/marble';

export default function Marble() {
  // 返回入口已收进 MarbleGame 的头部行内（绝对定位的悬浮按钮在手机上会盖住标题）
  return <MarbleGame />;
}
