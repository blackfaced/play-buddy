type Props = { x: number; y: number; size: number; stroke: string; strokeWidth: number; dashed?: boolean };
/** A size registration, including empty cells, never the answer's silhouette. */
export function ShadowScaleFrame({ x, y, size, stroke, strokeWidth, dashed = false }: Props) {
  return <g data-shadow-scale-frame={true} transform={`translate(${x} ${y})`} fill="none" stroke={stroke}>
    <rect width={size} height={size} strokeWidth={strokeWidth} strokeDasharray={dashed ? '5 5' : undefined} />
    <g strokeWidth={strokeWidth * .55} strokeOpacity=".4">
      {[1, 2].map(n => <g key={n}>
        <line x1="0" y1={size * n / 3} x2={size} y2={size * n / 3} />
        <line x1={size * n / 3} y1="0" x2={size * n / 3} y2={size} />
      </g>)}
    </g>
  </g>;
}
