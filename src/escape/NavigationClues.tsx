import { LANDMARKS, VOYAGE_LOG, type Landmark } from "./voyageData";

export function LandmarkSketch({ landmark }: { landmark: Landmark }) {
  return <g data-landmark={landmark} stroke="#284c50" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {landmark === "port" && <><path d="M-18 10H18M-13 10V-3H1V10M-16-3L-6-13L5-3M8-7V15M16-7V15" fill="#dbb36c" /><path d="M-20 17q10-5 20 0t20 0" fill="none" /></>}
    {landmark === "arch" && <path d="M-20 13L-15-8Q0-25 15-8L20 13H9V-2Q0-13-9-2V13Z" fill="#b1b7a5" />}
    {landmark === "buoy" && <><path d="M-12 10L-5-8H5L12 10Z" fill="#c25037" /><path d="M0-8V-18M-17 14q9-5 17 0t17 0" fill="none" /><circle cy="-18" r="3" fill="#c25037" /></>}
    {landmark === "wreck" && <><path d="M-19 5L-11 15H12L20 5ZM-2 5V-18L10-9L-2-7" fill="#b78854" /><path d="M-19 20q9-5 19 0t19 0M5 5L12-3" fill="none" /></>}
    {landmark === "island" && <><path d="M-22 14L-10-15L0 3L10-20L23 14Z" fill="#77957b" /><path d="M-24 19q12-5 24 0t24 0" fill="none" /></>}
    {landmark === "lighthouse" && <><path d="M-9 16L-6-12H6L9 16Z" fill="#f5edd0" /><path d="M-7-12L0-21L7-12ZM-7-1H7V5H-7" fill="#c25037" /><path d="M-16 19H17M-14-10L-23-14M14-10L23-14" fill="none" /></>}
  </g>;
}
export function RouteChart() {
  return <svg className="escape-chart" viewBox="0 0 380 280" role="img" aria-label="海图，北朝上。港口在西南，石拱在西北，红浮标在北面中央，沉船在南面中央，双峰岛在东南，灯塔在东北。">
    <rect width="380" height="280" rx="12" fill="#e6d8ad" />
    <path d="M55 65H325M55 195H325M65 45V230M185 45V230M305 45V230" stroke="#afac85" strokeWidth="1" fill="none" />
    <path d="M25 42V14L20 23M25 14L30 23" stroke="#284c50" strokeWidth="2" fill="none" /><text x="25" y="57" textAnchor="middle" fill="#284c50" fontSize="14">北</text>
    {LANDMARKS.map(point => <g key={point.id} transform={`translate(${65 + point.x * 120} ${195 - point.y * 130})`}><LandmarkSketch landmark={point.id} /><text y="43" textAnchor="middle" fontSize="16" fill="#284c50">{point.name}</text></g>)}
    <text x="190" y="270" textAnchor="middle" fontSize="12" fill="#76684f">星光号 · 近海水域</text>
  </svg>;
}
export function VoyageLog() {
  return <div className="escape-voyage-log" aria-label="航海日志，晨航记录">
    <p className="escape-log-heading">晨航 · 天气晴</p>
    {VOYAGE_LOG.map(entry => <div className="escape-log-entry" key={entry.time}><time>{entry.time}</time><svg viewBox="-28 -28 56 56" role="img" aria-label={LANDMARKS.find(point => point.id === entry.landmark)!.name}><LandmarkSketch landmark={entry.landmark} /></svg><span>{entry.note}</span></div>)}
    <p className="escape-log-signature">林 · 星光号</p>
  </div>;
}
