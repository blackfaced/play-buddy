import { useId } from "react";
import { SearchObject } from "./SearchArt";

const ink = "#303c34";

function Prop({
  kind,
  x,
  y,
  size = 65,
  rotate = 0,
}: {
  kind: string;
  x: number;
  y: number;
  size?: number;
  rotate?: number;
}) {
  return (
    <g transform={`rotate(${rotate} ${x + size / 2} ${y + size / 2})`}>
      <svg x={x} y={y} width={size} height={size} viewBox="0 0 100 100">
        <SearchObject kind={kind} />
      </svg>
    </g>
  );
}

function SceneDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-wall`} x2="0" y2="1">
        <stop stopColor="#64897c" />
        <stop offset=".55" stopColor="#3e7168" />
        <stop offset="1" stopColor="#234f4b" />
      </linearGradient>
      <linearGradient id={`${id}-warmwall`} x2="0" y2="1">
        <stop stopColor="#b48858" />
        <stop offset=".55" stopColor="#ab754a" />
        <stop offset="1" stopColor="#765236" />
      </linearGradient>
      <linearGradient id={`${id}-wood`} x2="0" y2="1">
        <stop stopColor="#bf905a" />
        <stop offset=".45" stopColor="#98633f" />
        <stop offset="1" stopColor="#67462f" />
      </linearGradient>
      <linearGradient id={`${id}-floor`} x2="0" y2="1">
        <stop stopColor="#887248" />
        <stop offset="1" stopColor="#423e2f" />
      </linearGradient>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#efd39a" />
        <stop offset=".38" stopColor="#c8a364" />
        <stop offset="1" stopColor="#79603b" />
      </linearGradient>
      <linearGradient id={`${id}-sea`} x2="0" y2="1">
        <stop stopColor="#a9c6ba" />
        <stop offset=".5" stopColor="#d9d3aa" />
        <stop offset=".51" stopColor="#508c8d" />
        <stop offset="1" stopColor="#2b5c67" />
      </linearGradient>
      <linearGradient id={`${id}-night`} x2="0" y2="1">
        <stop stopColor="#152d46" />
        <stop offset=".6" stopColor="#315975" />
        <stop offset="1" stopColor="#88999a" />
      </linearGradient>
      <linearGradient id={`${id}-nightsea`} x2="0" y2="1">
        <stop stopColor="#4b7584" />
        <stop offset="1" stopColor="#1f4c5c" />
      </linearGradient>
      <radialGradient id={`${id}-glow`}>
        <stop stopColor="#fff1b6" stopOpacity=".6" />
        <stop offset=".25" stopColor="#ffd781" stopOpacity=".2" />
        <stop offset="1" stopColor="#ffd781" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${id}-vignette`} cx=".5" cy=".43" r=".72">
        <stop offset=".4" stopColor="#122b29" stopOpacity="0" />
        <stop offset="1" stopColor="#102829" stopOpacity=".4" />
      </radialGradient>
      <pattern
        id={`${id}-grain`}
        width="182"
        height="64"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M5 14Q33 6 60 15T116 14T174 12M29 20Q55 26 88 20M18 47Q46 38 84 47T155 46M135 26q17-8 35 0"
          fill="none"
          stroke="#583f2d"
          strokeWidth="1.4"
          opacity=".18"
        />
      </pattern>
      <pattern
        id={`${id}-dust`}
        width="31"
        height="29"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="5" cy="8" r="1.1" fill="#f0d7a2" opacity=".36" />
        <circle cx="22" cy="23" r=".8" fill="#553e2c" opacity=".27" />
      </pattern>
      <filter id={`${id}-shadow`} x="-25%" y="-25%" width="155%" height="170%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur" />
        <feOffset in="blur" dx="1" dy="7" result="offset" />
        <feFlood floodColor="#152e2a" floodOpacity=".3" result="color" />
        <feComposite in="color" in2="offset" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <clipPath id={`${id}-port`}>
        <circle r="67" />
      </clipPath>
    </defs>
  );
}

function Porthole({
  id,
  x,
  y,
  scale = 1,
}: {
  id: string;
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cy="6" r="86" fill="#1d3733" opacity=".25" />
      <circle r="83" fill="#665a3e" stroke={ink} strokeWidth="4" />
      <circle
        r="77"
        fill={`url(#${id}-gold)`}
        stroke="#e1c18a"
        strokeWidth="2"
      />
      <circle
        r="68"
        fill={`url(#${id}-sea)`}
        stroke="#475744"
        strokeWidth="4"
      />
      <g clipPath={`url(#${id}-port)`}>
        <path d="M-78 11Q-44 1-5 14T79 11V80H-78Z" fill="#477f83" />
        <path
          d="M-78 33Q-51 24-12 36T81 34M-79 52Q-37 44 2 55T85 52"
          stroke="#a1c5b2"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M-50-24q10-9 20 0M-20-32q9-7 17 0"
          fill="none"
          stroke="#647f78"
          strokeWidth="2"
        />
        <path d="M22 6L35-21V6Z" fill="#eee0b5" />
        <path d="M39 6V-11L51 6Z" fill="#d1bb83" />
        <path d="M18 10H55L48 17H27Z" fill="#375650" />
        <path
          d="M-53-24L-18-51M-53-9L1-50"
          stroke="#fff5d3"
          strokeWidth="6"
          opacity=".23"
        />
      </g>
      {Array.from({ length: 8 }, (_, i) => (
        <circle
          key={i}
          cx={76 * Math.cos((i * Math.PI) / 4)}
          cy={76 * Math.sin((i * Math.PI) / 4)}
          r="3"
          fill="#615336"
          stroke="#edcf95"
          strokeWidth="1"
        />
      ))}
      <path
        d="M-84-12h-8v24h8M84-12h8v24h-8"
        fill="#b68d52"
        stroke={ink}
        strokeWidth="3"
      />
    </g>
  );
}

function Lantern({
  id,
  x,
  y,
  size = 80,
}: {
  id: string;
  x: number;
  y: number;
  size?: number;
}) {
  return (
    <g>
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={size * 1.7}
        fill={`url(#${id}-glow)`}
      />
      <Prop kind="lantern" x={x} y={y} size={size} />
    </g>
  );
}

function RoomShell({ id, warm = false }: { id: string; warm?: boolean }) {
  return (
    <g>
      <rect
        width="1000"
        height="640"
        fill={`url(#${id}-${warm ? "warmwall" : "wall"})`}
      />
      {[65, 125, 187, 249, 311, 373, 435].map((y) => (
        <path
          key={y}
          d={`M0 ${y}Q500 ${y + 9} 1000 ${y}`}
          stroke={warm ? "#64452f" : "#214d48"}
          strokeWidth="3"
          opacity=".4"
          fill="none"
        />
      ))}
      <rect width="1000" height="485" fill={`url(#${id}-grain)`} />
      <path d="M0 420H1000V486H0Z" fill={warm ? "#6e5138" : "#294e46"} />
      {Array.from({ length: 21 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 51} 428v55`}
          stroke="#263e32"
          strokeWidth="2"
          opacity=".5"
        />
      ))}
      <path d="M0 419H1000M0 484H1000" stroke="#493e2f" strokeWidth="10" />
      <path d="M0 414H1000" stroke="#c2985d" strokeWidth="4" />
      <path d="M0 490H1000V640H0Z" fill={`url(#${id}-floor)`} />
      {[507, 539, 582, 637].map((y) => (
        <path
          key={y}
          d={`M0 ${y}H1000`}
          stroke="#363b2e"
          strokeWidth="3"
          opacity=".6"
        />
      ))}
      {Array.from({ length: 11 }, (_, i) => (
        <path
          key={i}
          d={`M${90 + i * 89} 487L${-180 + i * 151} 640`}
          stroke="#34392e"
          strokeWidth="2"
          opacity=".56"
        />
      ))}
      <path d="M0 0H1000V47Q500-8 0 47Z" fill="#344037" />
      <path
        d="M0 49Q500-7 1000 49"
        stroke="#976e46"
        strokeWidth="17"
        fill="none"
      />
      <path
        d="M0 56Q500 6 1000 56"
        stroke="#d0a871"
        strokeWidth="3"
        fill="none"
      />
      <path d="M0 0H42L75 489H29ZM958 0H1000L972 489H924Z" fill="#514633" />
      <path d="M45 33L74 484M956 32L925 484" stroke="#bd945d" strokeWidth="5" />
      {[110, 248, 381].map((y) => (
        <g key={y} fill="#233d32" stroke="#b18b53" strokeWidth="1">
          <circle cx={45 + y * 0.06} cy={y} r="4" />
          <circle cx={955 - y * 0.06} cy={y} r="4" />
        </g>
      ))}
    </g>
  );
}

function BookShelf({
  x,
  y,
  width = 260,
}: {
  x: number;
  y: number;
  width?: number;
}) {
  const colors = [
    "#984c3b",
    "#bd9b65",
    "#315e58",
    "#b4864c",
    "#51776a",
    "#823e30",
    "#c2b78a",
  ];
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M0 0H${width}V12H0ZM12 12v32l25-32M${width - 12} 12v32l-25-32`}
        fill="#6c4b32"
        stroke="#343c30"
        strokeWidth="3"
      />
      {colors.map((color, i) => (
        <g
          key={color}
          transform={`translate(${15 + i * 23} ${-59 - (i % 3) * 5}) rotate(${i === 6 ? 13 : i === 0 ? -8 : 0} 10 60)`}
        >
          <rect
            width={18 + (i % 2) * 3}
            height={59 + (i % 3) * 5}
            rx="2"
            fill={color}
            stroke="#344132"
            strokeWidth="2"
          />
          <path
            d={`M4 9h11M4 15h11M4 ${49 + (i % 3) * 5}h11`}
            stroke="#d4bc84"
            strokeWidth="2"
            opacity=".8"
          />
        </g>
      ))}
      <Prop kind="shell" x={185} y={-49} size={48} />
    </g>
  );
}

function ChartDesk({ id }: { id: string }) {
  return (
    <g filter={`url(#${id}-shadow)`}>
      <ellipse cx="259" cy="570" rx="242" ry="23" fill="#193b34" opacity=".3" />
      <path
        d="M70 443L83 576H111L126 445M421 433L435 570H463L473 433"
        fill="#674a31"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M70 431H466V525Q272 544 77 521Z"
        fill={`url(#${id}-wood)`}
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M51 385L427 372L502 429L76 454L42 429Z"
        fill="#bb8d58"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M44 422L503 416V430L77 456L44 441Z"
        fill="#735036"
        stroke={ink}
        strokeWidth="3"
      />
      <path d="M48 420L494 413" stroke="#dbb17a" strokeWidth="4" />
      <path
        d="M99 391Q160 399 217 386M288 403l134-8"
        stroke="#845b39"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M143 457L367 446V517L143 528Z"
        fill="#956340"
        stroke="#4f422f"
        strokeWidth="3"
      />
      <path
        d="M152 465L357 455V509L152 519Z"
        fill="none"
        stroke="#cc9a5c"
        strokeWidth="2"
      />
      <path
        d="M236 486L277 484"
        stroke="#4f4631"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M237 483L277 481"
        stroke="#c6a56d"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M92 468L124 466M385 454L437 450"
        stroke="#d4b174"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M128 375L332 370L396 409L168 426Z"
        fill="#d9c496"
        stroke="#7d7854"
        strokeWidth="2"
      />
      <path
        d="M157 388l39-6 29 10 29-5 51 12 48-4M177 407l42-3 20 9 43-10 40 7"
        fill="none"
        stroke="#85967a"
        strokeWidth="3"
      />
      <path
        d="M213 381L259 416M275 378L316 412"
        stroke="#b5a77f"
        strokeWidth="1"
      />
      <path
        d="M250 393q31-17 61 9"
        stroke="#9d694f"
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 5"
      />
      <Prop kind="compassCase" x={65} y={350} size={72} rotate={-7} />
      <Prop kind="manifest" x={335} y={361} size={65} rotate={13} />
      <Prop kind="book" x={78} y={407} size={70} rotate={-13} />
      <Prop kind="mug" x={407} y={356} size={63} />
      <Prop kind="feather" x={292} y={361} size={51} rotate={30} />
      <Prop kind="divider" x={195} y={377} size={42} rotate={35} />
      <path
        d="M161 374L138 369L108 376"
        fill="none"
        stroke="#d9c798"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M109 376q-8-4 0-9"
        fill="none"
        stroke="#857853"
        strokeWidth="2"
      />
    </g>
  );
}

function DustyLedger({ id }: { id: string }) {
  return (
    <g transform="translate(366 125)" filter={`url(#${id}-shadow)`}>
      <path
        d="M10 0H131L146 13V150L132 161H7L-5 146V13Z"
        fill="#68583b"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M6 8H130L137 16V144L129 152H8L3 144V18Z"
        fill={`url(#${id}-gold)`}
        stroke="#e0c387"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="21"
        width="111"
        height="120"
        rx="3"
        fill="#a8996c"
        stroke="#756344"
        strokeWidth="2"
      />
      <path
        d="M29 41H109M29 62H109M29 84H109M29 106H109M53 42V125M82 42V125"
        stroke="#686e56"
        strokeWidth="2"
        opacity=".4"
      />
      <path
        d="M22 33Q49 20 78 35T122 44L117 70Q84 58 65 75T20 73ZM17 95Q34 88 59 99T121 93L124 129H16Z"
        fill="#b6a985"
        opacity=".91"
      />
      <path
        d="M24 39Q63 47 116 34M19 112Q79 92 121 115"
        fill="none"
        stroke="#d5c29b"
        strokeWidth="9"
        opacity=".27"
      />
      <rect x="14" y="21" width="111" height="120" fill={`url(#${id}-dust)`} />
      {[
        [10, 15],
        [130, 15],
        [10, 144],
        [130, 144],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#534e34" />
      ))}
      <path
        d="M28 11Q49 6 71 11"
        stroke="#f5d9a3"
        strokeWidth="2"
        fill="none"
      />
    </g>
  );
}

function Projector({ id }: { id: string }) {
  return (
    <g transform="translate(551 185)" filter={`url(#${id}-shadow)`}>
      <path
        d="M-16 98H199V118H-16ZM3 118v45l28-45M179 118v45l-27-45"
        fill="#755336"
        stroke={ink}
        strokeWidth="4"
      />
      <path d="M-14 97H197" stroke="#d2a468" strokeWidth="4" />
      <path
        d="M18 82L31 45L49 41L153 40L168 81L151 100H33Z"
        fill="#3f6660"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M43 38V-14Q92-35 140-14V41"
        fill="#587d6e"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M50-8H132V35H50Z"
        fill="#304c47"
        stroke="#d0b078"
        strokeWidth="3"
      />
      <path
        d="M64-20V-36H121V-20"
        fill="#ddd1a3"
        stroke="#827653"
        strokeWidth="2"
      />
      <path d="M68-31H117" stroke="#a59569" strokeWidth="2" />
      <circle
        cx="91"
        cy="12"
        r="30"
        fill={`url(#${id}-gold)`}
        stroke={ink}
        strokeWidth="3"
      />
      <circle
        cx="91"
        cy="12"
        r="22"
        fill="#284e54"
        stroke="#8d794a"
        strokeWidth="3"
      />
      <circle
        cx="91"
        cy="12"
        r="15"
        fill="#599188"
        stroke="#202f2f"
        strokeWidth="2"
      />
      <path d="M80 9q2-9 12-10" stroke="#aad8bb" strokeWidth="4" fill="none" />
      <path
        d="M57 56H96V85H57Z"
        fill="#243f38"
        stroke="#ba9d65"
        strokeWidth="3"
      />
      <path d="M62 61v17M90 61v17" stroke="#bdad77" strokeWidth="3" />
      <circle
        cx="127"
        cy="69"
        r="13"
        fill={`url(#${id}-gold)`}
        stroke={ink}
        strokeWidth="3"
      />
      <path d="M119 68H135" stroke="#756241" strokeWidth="3" />
      <path d="M30 50L21 71M160 52L166 68" stroke="#93ae91" strokeWidth="3" />
      <path d="M44 90H143" stroke="#9b9b71" strokeWidth="2" />
      <path
        d="M147-13q30 5 26 38t-16 32"
        fill="none"
        stroke="#454b38"
        strokeWidth="5"
      />
    </g>
  );
}

function Safe({ id }: { id: string }) {
  return (
    <g transform="translate(557 358)" filter={`url(#${id}-shadow)`}>
      <path
        d="M4 26L32 8H180L197 24V183L177 195H14Z"
        fill="#294942"
        stroke={ink}
        strokeWidth="4"
      />
      <path d="M4 26H180V194H14Z" fill="#4d7061" stroke={ink} strokeWidth="4" />
      <path
        d="M20 38H164V178H20Z"
        fill="#38594e"
        stroke="#a4a275"
        strokeWidth="3"
      />
      <path
        d="M30 49H154V168H30Z"
        fill="none"
        stroke="#233f38"
        strokeWidth="3"
      />
      <path d="M22 33L158 31M179 30V181" stroke="#81a087" strokeWidth="3" />
      <path
        d="M18 195V209H49V196M148 195V207H179V195"
        fill="#354a3b"
        stroke={ink}
        strokeWidth="3"
      />
      <circle
        cx="89"
        cy="106"
        r="42"
        fill={`url(#${id}-gold)`}
        stroke={ink}
        strokeWidth="4"
      />
      <circle
        cx="89"
        cy="106"
        r="32"
        fill="#3c665d"
        stroke="#e0c184"
        strokeWidth="2"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d="M89 68v6"
          stroke="#6b6240"
          strokeWidth="2"
          transform={`rotate(${i * 30} 89 106)`}
        />
      ))}
      <path
        d="M89 81V131M65 106H113M72 89L106 123M72 123L106 89"
        stroke="#c2a76b"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle
        cx="89"
        cy="106"
        r="10"
        fill={`url(#${id}-gold)`}
        stroke="#4b523b"
        strokeWidth="3"
      />
      <path
        d="M145 86V123"
        stroke="#233f35"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M142 86V120"
        stroke="#d2b479"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M13 56H24V78H13ZM13 139H24V162H13Z"
        fill="#bba16b"
        stroke="#374737"
        strokeWidth="2"
      />
      <path d="M59 157H117" stroke="#a6a274" strokeWidth="2" />
    </g>
  );
}

function Door({ id }: { id: string }) {
  return (
    <g transform="translate(806 115)" filter={`url(#${id}-shadow)`}>
      <path
        d="M-8 365V27Q74-25 153 27V365Z"
        fill="#283e32"
        stroke="#bc965a"
        strokeWidth="6"
      />
      <path
        d="M6 360V36Q73-7 139 36V360Z"
        fill={`url(#${id}-wood)`}
        stroke="#3a3c2b"
        strokeWidth="4"
      />
      {[31, 58, 86, 114].map((x) => (
        <path
          key={x}
          d={`M${x} 34V355`}
          stroke="#60472e"
          strokeWidth="3"
          opacity=".8"
        />
      ))}
      <path d="M15 85H130M15 306H130" stroke="#364b3d" strokeWidth="16" />
      <path d="M17 81H128M17 302H128" stroke="#6d7c57" strokeWidth="3" />
      <circle
        cx="73"
        cy="156"
        r="36"
        fill={`url(#${id}-gold)`}
        stroke={ink}
        strokeWidth="4"
      />
      <circle
        cx="73"
        cy="156"
        r="27"
        fill="#203f3c"
        stroke="#856e43"
        strokeWidth="3"
      />
      <path d="M55 156H91M73 137V175" stroke="#435e4f" strokeWidth="3" />
      <path
        d="M118 215V250"
        stroke="#d1b47a"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle
        cx="116"
        cy="233"
        r="9"
        fill="none"
        stroke="#c5a368"
        strokeWidth="4"
      />
      <path
        d="M22 20H123V56H22Z"
        fill="#3c5b4c"
        stroke="#c4a870"
        strokeWidth="3"
      />
      <path
        d="M57 42L72 31L86 42M65 40V49H80V40"
        fill="none"
        stroke="#d7c18b"
        strokeWidth="2"
      />
      {[27, 121].map((x) => (
        <g key={x} fill="#d6b67d">
          <circle cx={x} cy="84" r="3" />
          <circle cx={x} cy="306" r="3" />
        </g>
      ))}
    </g>
  );
}

function NavigationScene({ id }: { id: string }) {
  return (
    <g>
      <RoomShell id={id} />
      <path
        d="M115 43C130 66 191 50 217 76S283 83 308 58"
        fill="none"
        stroke="#384c39"
        strokeWidth="4"
      />
      <Porthole id={id} x={193} y={181} scale={0.86} />
      <BookShelf x={73} y={322} width={251} />
      <DustyLedger id={id} />
      <Projector id={id} />
      <Door id={id} />
      <path
        d="M525 72H759V94H525Z"
        fill="#79593a"
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M542 94v29l17-29M742 94v29l-17-29"
        stroke="#4c4c33"
        strokeWidth="5"
        fill="none"
      />
      <Prop kind="box" x={537} y={28} size={59} />
      <Prop kind="book" x={606} y={24} size={61} rotate={-5} />
      <Prop kind="bottle" x={681} y={25} size={49} />
      <Lantern id={id} x={720} y={93} size={79} />
      <Safe id={id} />
      <ChartDesk id={id} />
      <Prop kind="rope" x={755} y={479} size={107} />
      <Prop kind="cloth" x={476} y={521} size={84} rotate={-15} />
      <path
        d="M329 329q16-37 32-34M334 333q19-19 30-17"
        fill="none"
        stroke="#577961"
        strokeWidth="4"
      />
      <path
        d="M323 337H357L354 375H328Z"
        fill="#ac8252"
        stroke={ink}
        strokeWidth="3"
      />
      <path d="M324 340H358" stroke="#d2a86f" strokeWidth="4" />
      <rect
        width="1000"
        height="640"
        fill={`url(#${id}-vignette)`}
        pointerEvents="none"
      />
    </g>
  );
}

function Crate({
  id,
  x,
  y,
  w = 140,
  h = 120,
}: {
  id: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`} filter={`url(#${id}-shadow)`}>
      <path
        d={`M0 15L${w - 22} 0L${w} 20V${h}L22 ${h + 12}L0 ${h - 6}Z`}
        fill={`url(#${id}-wood)`}
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d={`M0 15L22 34L${w} 20M22 34V${h + 12}`}
        fill="none"
        stroke="#4d432e"
        strokeWidth="3"
      />
      <path
        d={`M31 41L${w - 9} 30V${h - 8}L31 ${h + 1}ZM33 ${h - 3}L${w - 12} 35`}
        stroke="#c59861"
        strokeWidth="9"
        fill="none"
      />
      <path d={`M30 43L${w - 9} ${h - 9}`} stroke="#bc8a53" strokeWidth="7" />
      <path
        d={`M31 62L${w - 10} 50M31 83L${w - 10} 71M5 41L16 51M5 68L16 78`}
        stroke="#63492e"
        strokeWidth="2"
        opacity=".6"
      />
      <path
        d={`M${w / 2 - 8} 55l16-2`}
        stroke="#50482e"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={`M40 27L${w - 24} 16M24 22L${w - 38} 10`}
        stroke="#d2a36c"
        strokeWidth="2"
      />
    </g>
  );
}

function ControlCabinet({ id, cells }: { id: string; cells?: boolean[] }) {
  return (
    <g transform="translate(485 216)" filter={`url(#${id}-shadow)`}>
      <path
        d="M0 28L20 9H249L266 28V299H0Z"
        fill="#685037"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M12 38H253V285H12Z"
        fill="#93643f"
        stroke="#c29a61"
        strokeWidth="3"
      />
      <path
        d="M-8 27Q132 4 275 27V42H-8Z"
        fill="#b5844f"
        stroke={ink}
        strokeWidth="4"
      />
      <rect
        x="43"
        y="65"
        width="180"
        height="180"
        rx="9"
        fill="#293f35"
        stroke="#d1ae70"
        strokeWidth="5"
      />
      {Array.from({ length: 25 }, (_, i) => (
        <rect
          key={i}
          x={51 + (i % 5) * 33.4}
          y={73 + Math.floor(i / 5) * 33.4}
          width="29"
          height="29"
          rx="3"
          fill={cells?.[i] ? "#ecd69b" : "#3d5953"}
          stroke="#b7b18a"
          strokeWidth="1.3"
        />
      ))}
      <path
        d="M95 49H168"
        stroke="#d3b174"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M24 55V260M242 55V260" stroke="#67472e" strokeWidth="3" />
      <path
        d="M73 268H186"
        stroke="#5c4c32"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M73 264H186"
        stroke="#c4a66e"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M12 299V322H45V299M222 299V322H253V299"
        fill="#5e4c34"
        stroke={ink}
        strokeWidth="3"
      />
      <circle cx="24" cy="152" r="5" fill="#d2b577" />
      <circle cx="243" cy="152" r="5" fill="#d2b577" />
    </g>
  );
}

function Winch({ id }: { id: string }) {
  return (
    <g transform="translate(831 474)" filter={`url(#${id}-shadow)`}>
      <ellipse cx="31" cy="101" rx="104" ry="22" fill="#22382b" opacity=".3" />
      <path
        d="M-45 71L-66 92L117 103L132 81L100 62Z"
        fill="#5a4a32"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M-40 72L-27 17H-6L4 81M78 83L89 24H110L114 90"
        fill="#4b6350"
        stroke={ink}
        strokeWidth="4"
      />
      <path d="M-3 5V67H91V5Z" fill="#9e7c46" stroke={ink} strokeWidth="3" />
      <ellipse
        cx="0"
        cy="36"
        rx="19"
        ry="37"
        fill="#657756"
        stroke={ink}
        strokeWidth="4"
      />
      <ellipse
        cx="91"
        cy="36"
        rx="19"
        ry="37"
        fill="#b59a5f"
        stroke={ink}
        strokeWidth="4"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M${13 + i * 8} 6Q${4 + i * 8} 36 ${13 + i * 8} 67`}
          fill="none"
          stroke={i % 2 ? "#d7b77d" : "#c09c5f"}
          strokeWidth="7"
        />
      ))}
      <path
        d="M35 67Q24 110-24 136"
        fill="none"
        stroke="#77603a"
        strokeWidth="10"
      />
      <path
        d="M35 67Q24 110-24 136"
        fill="none"
        stroke="#d0b074"
        strokeWidth="6"
      />
      <circle
        cx="94"
        cy="36"
        r="12"
        fill="#344c3b"
        stroke="#e3c58b"
        strokeWidth="3"
      />
      <path d="M89 34h10v6H89Z" fill="#151f1d" />
      <path
        d="M-14 4H-33V-27"
        fill="none"
        stroke="#9aac81"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path
        d="M-44-26H-21"
        stroke="#785336"
        strokeWidth="13"
        strokeLinecap="round"
      />
    </g>
  );
}

function StoreroomScene({ id, cells }: { id: string; cells?: boolean[] }) {
  return (
    <g>
      <RoomShell id={id} warm />
      <path
        d="M420 31L433 464M761 33L747 459"
        stroke="#614d32"
        strokeWidth="24"
      />
      <path
        d="M422 35L436 467M759 35L745 456"
        stroke="#c1975e"
        strokeWidth="4"
      />
      <Porthole id={id} x={318} y={167} scale={0.82} />
      <path
        d="M69 100H206V267H69Z"
        fill="#674f35"
        stroke="#3b3d2c"
        strokeWidth="5"
      />
      <path
        d="M77 113L198 252M77 155L174 266M106 106L199 214M77 205L127 264M154 108L199 160M198 112L77 251M198 157L104 267M163 105L77 204M116 106L77 152M198 212L151 266"
        stroke="#c1a56e"
        strokeWidth="3"
        opacity=".8"
      />
      <Prop kind="buoy" x={83} y={123} size={74} rotate={-15} />
      <Prop kind="bottle" x={130} y={193} size={59} rotate={21} />
      <path
        d="M472 119H919V137H472Z"
        fill="#715038"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M486 136v37l28-37M901 137v37l-28-37"
        fill="none"
        stroke="#624a31"
        strokeWidth="7"
      />
      <Prop kind="canvas" x={487} y={57} size={100} />
      <Prop kind="box" x={596} y={43} size={87} />
      <Prop kind="spool" x={691} y={64} size={67} />
      <Prop kind="bottle" x={777} y={54} size={66} />
      <Prop kind="boot" x={845} y={57} size={63} />
      <path
        d="M843 156v82M890 155v70"
        stroke="#63472e"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <Prop kind="rope" x={795} y={198} size={101} />
      <Prop kind="anchor" x={870} y={188} size={81} />
      <path
        d="M251 292H394V309H251Z"
        fill="#826039"
        stroke={ink}
        strokeWidth="3"
      />
      <Prop kind="lantern" x={274} y={231} size={66} />
      <Prop kind="shell" x={338} y={265} size={47} />
      <ControlCabinet id={id} cells={cells} />
      <Crate id={id} x={70} y={386} w={173} h={148} />
      <Crate id={id} x={105} y={294} w={132} h={92} />
      <Crate id={id} x={245} y={446} w={169} h={107} />
      <Prop kind="rope" x={183} y={342} size={151} rotate={-5} />
      <Prop kind="canvas" x={249} y={380} size={117} rotate={8} />
      <Prop kind="cloth" x={58} y={525} size={81} rotate={8} />
      <Prop kind="starfish" x={291} y={540} size={51} rotate={-12} />
      <Prop kind="spool" x={362} y={447} size={63} />
      <path
        d="M384 346Q414 316 443 353L454 466Q419 485 383 465Z"
        fill="#aaa67a"
        stroke="#52573a"
        strokeWidth="3"
      />
      <path
        d="M386 355Q417 367 443 352M394 380L399 451M433 375L441 452"
        stroke="#d0c99a"
        strokeWidth="3"
        fill="none"
      />
      <path d="M386 350l56-2" stroke="#755934" strokeWidth="6" />
      <Winch id={id} />
      <Lantern id={id} x={894} y={314} size={74} />
      <rect
        width="1000"
        height="640"
        fill={`url(#${id}-vignette)`}
        pointerEvents="none"
      />
    </g>
  );
}

/** Decorative room illustration; HTML buttons own all discovery and puzzle interaction. */
export function RoomScene({ room, cells }: { room: "navigation" | "storeroom"; cells?: boolean[] }) {
  const id = `room-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 1000 640"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <SceneDefs id={id} />
      {room === "navigation" ? (
        <NavigationScene id={id} />
      ) : (
        <StoreroomScene id={id} cells={cells} />
      )}
    </svg>
  );
}

/** The reward is a quiet place to look at the stars together. */
export function DeckScene() {
  const id = `deck-${useId().replace(/:/g, "")}`;
  const stars = [
    [60, 84],
    [135, 145],
    [193, 64],
    [245, 119],
    [284, 49],
    [329, 193],
    [388, 90],
    [415, 148],
    [476, 58],
    [515, 108],
    [557, 193],
    [627, 74],
    [701, 141],
    [760, 47],
    [838, 139],
    [901, 70],
    [955, 187],
    [80, 228],
    [186, 238],
    [443, 246],
    [674, 238],
    [805, 215],
    [924, 267],
  ];
  return (
    <svg
      viewBox="0 0 1000 640"
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
    >
      <SceneDefs id={id} />
      <rect width="1000" height="640" fill={`url(#${id}-night)`} />
      <ellipse
        cx="531"
        cy="162"
        rx="434"
        ry="72"
        fill="#9ab8b5"
        opacity=".035"
        transform="rotate(-21 531 162)"
      />
      {stars.map(([x, y], i) => (
        <g key={i} fill="#e5e6be">
          <circle
            cx={x}
            cy={y}
            r={i % 3 === 0 ? 2.8 : 1.6}
            opacity={0.6 + (i % 3) * 0.14}
          />
          {i % 5 === 0 && (
            <path
              d={`M${x - 6} ${y}h12M${x} ${y - 6}v12`}
              stroke="#dce9c9"
              strokeWidth="1"
              opacity=".5"
            />
          )}
        </g>
      ))}
      <path
        d="M388 90L415 148L476 58L515 108L627 74"
        stroke="#c4ddd0"
        strokeWidth="1.3"
        strokeDasharray="3 6"
        fill="none"
        opacity=".3"
      />
      <circle cx="818" cy="87" r="65" fill={`url(#${id}-glow)`} />
      <path
        d="M835 48A38 38 0 1 0 851 109A40 40 0 0 1 835 48Z"
        fill="#eee7bf"
      />
      <path
        d="M0 312Q260 303 487 313T1000 311V517H0Z"
        fill={`url(#${id}-nightsea)`}
      />
      <path
        d="M0 327Q82 316 150 328T314 327T482 329T655 326T834 330T1009 326M42 362q122-18 238 0m82-6q95-13 194 0m121-2q151-17 323 0M-5 406q146-19 304 0m96-5q170-21 319 0m91-2q107-18 200 0"
        fill="none"
        stroke="#b6cec0"
        strokeWidth="2"
        opacity=".25"
      />
      <path
        d="M761 327H846M743 342H865M769 359H838M736 378H869M757 400H850"
        stroke="#d8d4af"
        strokeWidth="3"
        opacity=".21"
        strokeLinecap="round"
      />
      <path d="M33 313L56 257L79 313Z" fill="#243f4a" />
      <path d="M49 269H64V277H49Z" fill="#e4d69c" />
      <path d="M28 315H89" stroke="#203c44" strokeWidth="5" />
      <path d="M0 492Q500 431 1000 492V640H0Z" fill={`url(#${id}-wood)`} />
      <path
        d="M0 535Q500 471 1000 535M0 583Q500 515 1000 583M0 635Q500 561 1000 635"
        stroke="#4d4937"
        strokeWidth="3"
        fill="none"
      />
      {Array.from({ length: 10 }, (_, i) => (
        <path
          key={i}
          d={`M${170 + i * 78} 468L${-160 + i * 150} 640`}
          stroke="#544734"
          strokeWidth="2"
          opacity=".7"
        />
      ))}
      <path
        d="M0 414Q500 355 1000 414M0 459Q500 398 1000 459"
        stroke="#2c4543"
        strokeWidth="16"
        fill="none"
      />
      {[31, 168, 309, 453, 594, 736, 878, 976].map((x) => (
        <g key={x}>
          <path
            d={`M${x} ${406 - Math.sin((x / 1000) * Math.PI) * 29}v105`}
            stroke="#36483f"
            strokeWidth="19"
          />
          <path
            d={`M${x - 4} ${406 - Math.sin((x / 1000) * Math.PI) * 29}v97`}
            stroke="#ba9b69"
            strokeWidth="4"
          />
        </g>
      ))}
      <path
        d="M0 404Q500 345 1000 404"
        stroke="#c2a171"
        strokeWidth="13"
        fill="none"
      />
      <path
        d="M0 400Q500 341 1000 400"
        stroke="#e0be86"
        strokeWidth="3"
        fill="none"
      />
      <g transform="translate(647 393)" filter={`url(#${id}-shadow)`}>
        <ellipse cy="188" rx="126" ry="17" fill="#253c37" opacity=".25" />
        <path
          d="M0 10L-90 180M0 10L91 180M0 10L8 191"
          stroke="#334b42"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <path
          d="M-2 13L-87 178M5 21L88 177M3 25L9 189"
          stroke="#c5a269"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path d="M-55 106H54M-49 114L48 114" stroke="#576453" strokeWidth="4" />
        <circle r="22" fill={`url(#${id}-gold)`} stroke={ink} strokeWidth="4" />
        <g transform="rotate(-26)">
          <path
            d="M-104-42H65V3H-104Z"
            fill={`url(#${id}-gold)`}
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M-127-32H-104V-7H-127Z"
            fill="#425c54"
            stroke={ink}
            strokeWidth="4"
          />
          <path
            d="M58-49H89V10H58Z"
            fill="#bca065"
            stroke={ink}
            strokeWidth="4"
          />
          <ellipse
            cx="90"
            cy="-20"
            rx="11"
            ry="29"
            fill="#214e58"
            stroke="#e2c88f"
            strokeWidth="4"
          />
          <path
            d="M89-39Q83-25 86-13"
            stroke="#8ec4be"
            strokeWidth="4"
            fill="none"
          />
          <path d="M-94-33H48" stroke="#f0d9a2" strokeWidth="4" />
          <path d="M-34-42V3" stroke="#8b754e" strokeWidth="7" />
        </g>
      </g>
      <g transform="translate(150 427)">
        <path
          d="M0 47H200V66H0ZM13 65V140M185 66V140"
          fill="#5f5140"
          stroke="#31453a"
          strokeWidth="5"
        />
        <path
          d="M-8 10H209V57H-8Z"
          fill="#9f7d54"
          stroke="#374939"
          strokeWidth="4"
        />
        <path d="M0 21H201M0 43H201" stroke="#d0a979" strokeWidth="3" />
        <Prop kind="cloth" x={96} y={-2} size={103} />
        <Prop kind="map" x={14} y={6} size={78} />
      </g>
      <Lantern id={id} x={58} y={478} size={91} />
      <Prop kind="rope" x={822} y={511} size={129} />
      <path
        d="M18 0L46 389M21 55Q75 143 109 187Q86 94 81 0"
        fill="#d0c5a2"
        stroke="#4d625b"
        strokeWidth="4"
      />
      <path
        d="M36 60L70 218L50 183M50 11L80 128"
        fill="none"
        stroke="#9da18a"
        strokeWidth="3"
      />
      <rect width="1000" height="640" fill={`url(#${id}-vignette)`} />
    </svg>
  );
}
