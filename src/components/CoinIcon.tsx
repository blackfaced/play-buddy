/** Golden hexagon coin (matches the reference game's coin style). */
export default function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <polygon
        points="12,1.6 21,6.8 21,17.2 12,22.4 3,17.2 3,6.8"
        fill="#F6C453"
        stroke="#D9932B"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polygon
        points="12,5.6 17.7,9.15 17.7,14.85 12,18.4 6.3,14.85 6.3,9.15"
        fill="#FDD97A"
        stroke="#E9B23E"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon points="12,8.6 15,10.5 12,12.4 9,10.5" fill="#FFF3C2" opacity="0.85" />
    </svg>
  );
}
