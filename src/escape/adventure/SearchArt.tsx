import { useId, type ReactNode } from "react";

/** Small, original painted props. Names, hit targets, and game state live outside the art. */
export function SearchObject({ kind }: { kind: string }) {
  const id = useId().replace(/:/g, "");
  const gold = `url(#${id}-gold)`;
  const wood = `url(#${id}-wood)`;
  const paper = `url(#${id}-paper)`;
  const glass = `url(#${id}-glass)`;
  let drawing: ReactNode;

  switch (kind) {
    case "card":
      drawing = (
        <g transform="rotate(-10 50 50)">
          <path d="M17 20H74L85 31V80H17Z" fill={paper} />
          <path d="M74 20V32H85" fill="#b69a67" />
          <path d="M25 29H64M25 72H77" stroke="#af9562" strokeWidth="2" />
          {[
            [30, 40],
            [43, 40],
            [68, 40],
            [30, 52],
            [55, 52],
            [68, 52],
            [43, 64],
            [55, 64],
          ].map(([x, y]) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="2.7"
              fill="#4f6b5b"
              stroke="#8b815c"
              strokeWidth="1"
            />
          ))}
          <path d="M22 24V76" stroke="#f4e5b7" strokeWidth="2" />
        </g>
      );
      break;
    case "battery":
      drawing = (
        <g transform="rotate(-13 50 50)">
          <path d="M32 19H43V28H32ZM60 19H70V28H60Z" fill={gold} />
          <rect x="24" y="28" width="53" height="54" rx="6" fill="#3b6761" />
          <path d="M26 38H75V70H26Z" fill={paper} />
          <path
            d="M53 43L41 57H50L46 66L61 52H52Z"
            fill="#b86d45"
            stroke="none"
          />
          <path d="M29 31H69M29 76H69" stroke="#86a18a" strokeWidth="2" />
        </g>
      );
      break;
    case "compassCase":
      drawing = (
        <g transform="rotate(-9 50 50)">
          <rect x="17" y="26" width="67" height="55" rx="15" fill={gold} />
          <rect x="22" y="28" width="57" height="42" rx="12" fill="#cba565" />
          <path
            d="M25 34Q49 25 73 34M22 73H78"
            fill="none"
            stroke="#f6dca0"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="49"
            r="15"
            fill="none"
            stroke="#806a46"
            strokeWidth="1.5"
          />
          <path
            d="M50 35L54 45L64 49L54 53L50 63L46 53L36 49L46 45Z"
            fill="#92794b"
            stroke="none"
          />
          <rect x="44" y="72" width="13" height="12" rx="3" fill="#d8bc7a" />
          <circle cx="50" cy="77" r="2" fill="#465448" />
        </g>
      );
      break;
    case "manifest":
      drawing = (
        <g transform="rotate(7 50 50)">
          <path d="M21 13L79 17L77 86L18 82Z" fill={paper} />
          <path d="M28 23L69 26M29 31L51 33" stroke="#6f8270" strokeWidth="3" />
          <path
            d="M27 41L68 43M26 52L68 54M26 63L67 65M25 74L66 76M39 40L37 75M58 42L56 76"
            stroke="#a38e60"
            strokeWidth="1.5"
          />
          <path
            d="M29 46L33 48M45 46L49 47M61 47H65M29 57H34M43 57L49 58M60 58L64 60M28 69H33M43 69L49 70M60 69L64 71"
            stroke="#607669"
            strokeWidth="1.8"
          />
          <path d="M73 17L73 25L79 25" fill="#ae9668" />
        </g>
      );
      break;
    case "canvas":
      drawing = (
        <g transform="rotate(-15 50 50)">
          <path d="M17 33L79 23L88 68L27 82Z" fill="#b0af89" />
          <path d="M25 41L80 32L85 59L30 73Z" fill="#d7cc9f" />
          <path d="M39 33L48 76M67 27L76 70" stroke="#866a47" strokeWidth="6" />
          <path d="M39 33L48 76M67 27L76 70" stroke="#cfad76" strokeWidth="2" />
          <ellipse
            cx="24"
            cy="57"
            rx="11"
            ry="25"
            fill="#e3d4a2"
            transform="rotate(-12 24 57)"
          />
          <path
            d="M23 73Q12 52 23 43Q31 42 29 62Q25 70 21 56"
            fill="none"
            stroke="#9e926b"
            strokeWidth="2"
          />
          <path
            d="M32 45L39 44M50 43L65 40M52 61L69 57"
            stroke="#f2e2b3"
            strokeWidth="2"
          />
        </g>
      );
      break;
    case "divider":
      drawing = (
        <g transform="rotate(-18 50 50)">
          <path d="M47 25L22 88L32 77L53 35L74 80L82 87L57 25Z" fill={gold} />
          <path d="M28 77L22 90M76 79L82 90" stroke="#c5d3c2" strokeWidth="3" />
          <path
            d="M50 12V25M41 52Q50 58 65 51"
            fill="none"
            stroke="#c7a361"
            strokeWidth="5"
          />
          <circle cx="52" cy="28" r="9" fill={gold} />
          <circle cx="52" cy="28" r="3" fill="#51564c" />
          <path d="M47 19L51 16M34 66L43 44" stroke="#f4d797" strokeWidth="2" />
        </g>
      );
      break;
    case "key":
      drawing = (
        <g transform="rotate(35 50 50)">
          <path d="M45 37H55V81H70V72H61V64H70V55H56" fill={gold} />
          <circle cx="50" cy="27" r="17" fill={gold} />
          <circle cx="50" cy="27" r="8" fill="#59685c" />
          <path
            d="M39 23Q41 13 51 15"
            fill="none"
            stroke="#f2d9a1"
            strokeWidth="2"
          />
          <path d="M48 43V75" stroke="#fae0a6" strokeWidth="2" />
        </g>
      );
      break;
    case "crank":
      drawing = (
        <g transform="rotate(-16 50 50)">
          <path
            d="M21 66H47V38H78"
            fill="none"
            stroke="#313e3b"
            strokeWidth="13"
            strokeLinejoin="round"
          />
          <path
            d="M21 65H46V37H76"
            fill="none"
            stroke={gold}
            strokeWidth="8"
            strokeLinejoin="round"
          />
          <rect x="9" y="53" width="20" height="26" rx="8" fill={wood} />
          <rect x="70" y="21" width="17" height="32" rx="7" fill={wood} />
          <path d="M15 58V72M75 27V46" stroke="#e0a76f" strokeWidth="2" />
        </g>
      );
      break;
    case "brush":
      drawing = (
        <g transform="rotate(31 50 50)">
          <path d="M45 15Q50 6 55 15L57 58H43Z" fill={wood} />
          <circle cx="50" cy="19" r="2" fill="#473c2d" />
          <path d="M38 60H62L67 84Q50 94 33 84Z" fill="#e9ce95" />
          <path
            d="M41 64L39 84M47 65L46 88M53 65L54 87M59 65L61 84"
            fill="none"
            stroke="#a98854"
            strokeWidth="2"
          />
          <path d="M38 54H62V65H38Z" fill={gold} />
          <path d="M42 58H58" stroke="#fff0be" strokeWidth="2" />
          <path d="M48 28L47 47" stroke="#daa56e" strokeWidth="2" />
        </g>
      );
      break;
    case "lens":
      drawing = (
        <g transform="rotate(-25 50 50)">
          <circle cx="50" cy="43" r="29" fill={gold} />
          <circle cx="50" cy="43" r="23" fill={glass} />
          <path
            d="M33 39Q35 26 46 25M32 48L47 32"
            fill="none"
            stroke="#e5f6de"
            strokeWidth="4"
            opacity=".75"
          />
          <path d="M47 73V86Q50 93 55 85V72" fill={gold} />
          <circle
            cx="58"
            cy="53"
            r="8"
            fill="#b4e3d3"
            opacity=".23"
            stroke="none"
          />
        </g>
      );
      break;
    case "hook":
      drawing = (
        <g transform="rotate(20 50 50)">
          <path
            d="M47 33V65Q48 83 64 80Q82 77 73 60L67 69"
            fill="none"
            stroke="#394b47"
            strokeWidth="13"
          />
          <path
            d="M47 33V65Q48 83 64 80Q82 77 73 60L68 68"
            fill="none"
            stroke="#93aaa1"
            strokeWidth="8"
          />
          <circle cx="47" cy="24" r="12" fill="#a8b5a0" />
          <circle cx="47" cy="24" r="5" fill="#3f5750" />
          <path
            d="M44 43V64Q45 73 52 76"
            fill="none"
            stroke="#e0d9b3"
            strokeWidth="2"
          />
        </g>
      );
      break;
    case "map":
      drawing = (
        <g transform="rotate(-8 50 50)">
          <path
            d="M12 23L37 16L64 24L88 17V76L65 85L37 77L12 84Z"
            fill={paper}
          />
          <path d="M37 17V77M64 25V85" stroke="#ab9567" strokeWidth="1.5" />
          <path
            d="M19 42L31 36L43 44L58 32L79 37L81 55L65 61L59 71L44 65L33 69L21 57Z"
            fill="#9aaa88"
            stroke="#768e79"
            strokeWidth="1.5"
          />
          <path
            d="M22 65Q33 45 46 55T73 46"
            fill="none"
            stroke="#9d644c"
            strokeWidth="2"
            strokeDasharray="3 4"
          />
          <path d="M69 41L76 48M76 41L69 48" stroke="#ab5740" strokeWidth="2" />
          <circle
            cx="23"
            cy="30"
            r="5"
            fill="none"
            stroke="#a68b61"
            strokeWidth="1"
          />
        </g>
      );
      break;
    case "compass":
      drawing = (
        <g>
          <path d="M44 14V8H57V14" fill={gold} />
          <circle cx="50" cy="52" r="36" fill={gold} />
          <circle cx="50" cy="52" r="29" fill={paper} />
          <circle
            cx="50"
            cy="52"
            r="23"
            fill="none"
            stroke="#a19771"
            strokeWidth="1"
          />
          <path
            d="M50 27V32M50 72V78M25 52H31M70 52H76M32 34L36 38M65 67L69 71M68 34L64 38M34 67L30 71"
            stroke="#6b715e"
            strokeWidth="2"
          />
          <path d="M59 30L55 57L41 75L45 48Z" fill="#a85242" />
          <path d="M55 57L41 75L45 48Z" fill="#477a77" />
          <circle cx="50" cy="52" r="4" fill={gold} />
        </g>
      );
      break;
    case "book":
      drawing = (
        <g transform="rotate(-12 50 50)">
          <path
            d="M22 19H78V82H22Q13 82 13 72V29Q13 19 22 19Z"
            fill="#365c59"
          />
          <path d="M23 23H74V75H23Z" fill={paper} />
          <path d="M25 19H80V73H25Z" fill="#a4503e" />
          <path
            d="M32 26H72V64H32Z"
            fill="none"
            stroke="#d7b26e"
            strokeWidth="2"
          />
          <path d="M25 19V73M22 78H73" stroke="#443e30" strokeWidth="2" />
          <path
            d="M49 35L56 44L49 54L42 44Z"
            fill="none"
            stroke="#deb978"
            strokeWidth="2"
          />
          <path d="M62 76V89L57 84L53 90V77" fill="#d7b366" />
        </g>
      );
      break;
    case "mug":
      drawing = (
        <g>
          <path
            d="M68 37Q95 31 92 52Q90 70 68 67"
            fill="none"
            stroke="#463d31"
            strokeWidth="10"
          />
          <path
            d="M68 37Q92 34 88 52Q86 63 70 63"
            fill="none"
            stroke="#d0ba89"
            strokeWidth="6"
          />
          <path d="M18 29H72L68 76Q45 91 23 76Z" fill={paper} />
          <ellipse cx="45" cy="29" rx="27" ry="9" fill="#674a35" />
          <ellipse
            cx="45"
            cy="31"
            rx="21"
            ry="5"
            fill="#8f6b45"
            stroke="none"
          />
          <path d="M30 45L33 69" stroke="#fff0c6" strokeWidth="5" />
          <path d="M40 54H58" stroke="#688b7a" strokeWidth="4" />
        </g>
      );
      break;
    case "rope":
      drawing = (
        <g fill="none" strokeLinecap="round">
          <path
            d="M73 76C19 100 2 66 16 40C32 15 78 18 87 43C99 78 34 88 23 64C13 42 44 24 65 38C84 51 67 74 45 64C25 55 43 42 55 48C72 62 37 80 15 89"
            stroke="#654b31"
            strokeWidth="12"
          />
          <path
            d="M73 76C19 100 2 66 16 40C32 15 78 18 87 43C99 78 34 88 23 64C13 42 44 24 65 38C84 51 67 74 45 64C25 55 43 42 55 48C72 62 37 80 15 89"
            stroke="#c9a66c"
            strokeWidth="8"
          />
          <path
            d="M73 76C19 100 2 66 16 40C32 15 78 18 87 43C99 78 34 88 23 64C13 42 44 24 65 38C84 51 67 74 45 64C25 55 43 42 55 48C72 62 37 80 15 89"
            stroke="#eee0ad"
            strokeWidth="3"
            strokeDasharray="2 6"
          />
        </g>
      );
      break;
    case "shell":
      drawing = (
        <g transform="rotate(14 50 50)">
          <path
            d="M47 83L11 52Q6 38 19 34Q14 20 31 21Q37 5 50 17Q64 3 71 22Q89 21 83 37Q100 45 86 57L57 83Z"
            fill="#e1b48e"
          />
          <path
            d="M50 78L22 38M52 76L35 26M54 76L51 22M56 76L67 28M58 77L79 43"
            stroke="#a87a62"
            strokeWidth="2"
          />
          <path d="M42 82Q51 72 62 82L60 88H43Z" fill={paper} />
          <path d="M18 47L40 69M73 40L62 63" stroke="#f6d4ab" strokeWidth="3" />
        </g>
      );
      break;
    case "bottle":
      drawing = (
        <g transform="rotate(12 50 50)">
          <path
            d="M40 21H60V38L73 52L75 84Q50 95 25 84L27 52L40 38Z"
            fill="#497f6d"
          />
          <path d="M40 14H60V27H40Z" fill={wood} />
          <path d="M38 29H62" stroke="#bcaa74" strokeWidth="5" />
          <path d="M32 57H68V78Q51 85 32 78Z" fill={paper} />
          <path d="M44 64L53 60L58 70L49 76Z" fill="#a78c60" stroke="none" />
          <path
            d="M37 45L33 52V77"
            fill="none"
            stroke="#94bba0"
            strokeWidth="4"
          />
        </g>
      );
      break;
    case "feather":
      drawing = (
        <g transform="rotate(27 50 50)">
          <path d="M49 80C17 68 25 22 67 9C75 41 77 60 49 80Z" fill={paper} />
          <path
            d="M41 94Q50 42 66 14M47 74L34 63M51 59L36 46M55 44L45 32M50 65L65 52M55 49L69 35"
            fill="none"
            stroke="#a99872"
            strokeWidth="2"
          />
          <path d="M34 38L46 41M66 44L72 38" stroke="#6c7964" strokeWidth="2" />
        </g>
      );
      break;
    case "box":
      drawing = (
        <g>
          <path d="M13 29L64 16L90 33L86 79L37 92L13 74Z" fill={wood} />
          <path
            d="M13 29L39 47L90 33M39 47L37 92"
            fill="none"
            stroke="#493d2e"
            strokeWidth="3"
          />
          <path
            d="M19 38L32 47V80L18 69ZM46 49L79 40V73L44 83Z"
            fill="none"
            stroke="#dcaa6a"
            strokeWidth="4"
          />
          <path
            d="M19 67L32 51M45 81L79 41M20 28L66 18M26 32L73 22M33 37L80 28"
            stroke="#d2a068"
            strokeWidth="3"
          />
          <path d="M56 61L67 58" stroke="#523f2d" strokeWidth="5" />
        </g>
      );
      break;
    case "starfish":
      drawing = (
        <g>
          <path
            d="M50 9Q59 14 60 36L87 30Q100 33 76 55L87 84Q86 98 58 75L37 91Q25 96 32 68L9 54Q2 43 31 41Z"
            fill="#c5764f"
          />
          <path
            d="M50 23L52 52L76 39M52 52L76 78M52 52L38 79M52 52L20 49"
            fill="none"
            stroke="#e3aa78"
            strokeWidth="4"
            strokeDasharray="1 7"
          />
          <circle cx="52" cy="52" r="6" fill="#e8ba85" stroke="none" />
        </g>
      );
      break;
    case "lantern":
      drawing = (
        <g>
          <path
            d="M40 22V15Q50 0 60 15V22"
            fill="none"
            stroke="#415149"
            strokeWidth="4"
          />
          <path d="M37 22H63L72 34V77L62 88H36L27 77V34Z" fill={gold} />
          <path d="M34 38H64V74H34Z" fill="#f9d185" />
          <path
            d="M50 70Q37 59 49 47Q61 61 50 70Z"
            fill="#fff0bf"
            stroke="none"
          />
          <path
            d="M23 33H76M23 85H76M50 37V77M29 78H70"
            stroke="#485345"
            strokeWidth="5"
          />
          <path d="M37 40V66" stroke="#ffebae" strokeWidth="3" />
        </g>
      );
      break;
    case "cloth":
      drawing = (
        <g>
          <path
            d="M14 31L63 19L86 66L72 82L47 77L30 89L15 72L8 60Z"
            fill="#70998a"
          />
          <path
            d="M20 34L41 70L71 78M38 29L60 64L80 68M49 26L71 61M17 65L68 48M26 79L76 61"
            fill="none"
            stroke="#b0c4a8"
            strokeWidth="3"
          />
          <path
            d="M13 35L32 69L21 73M44 75L54 68"
            fill="none"
            stroke="#486f66"
            strokeWidth="3"
          />
          <path
            d="M24 84L22 91M31 87V94M64 81L68 87M74 81L79 86"
            stroke="#b9c6a7"
            strokeWidth="2"
          />
        </g>
      );
      break;
    case "anchor":
      drawing = (
        <g transform="rotate(-9 50 50)">
          <circle
            cx="51"
            cy="18"
            r="10"
            fill="none"
            stroke="#697f75"
            strokeWidth="7"
          />
          <path
            d="M51 29V80M31 39H72M17 53Q19 82 51 86Q82 78 84 51M16 53L13 67M16 53L29 60M84 51L70 58M84 51L87 66"
            fill="none"
            stroke="#344c48"
            strokeWidth="10"
          />
          <path
            d="M51 29V80M31 39H72M17 53Q19 82 51 86Q82 78 84 51"
            fill="none"
            stroke="#82988a"
            strokeWidth="6"
          />
          <path d="M47 45V72" stroke="#cad0ae" strokeWidth="2" />
        </g>
      );
      break;
    case "spool":
      drawing = (
        <g transform="rotate(-13 50 50)">
          <ellipse cx="50" cy="79" rx="28" ry="10" fill={wood} />
          <path d="M28 26V77Q51 87 73 77V26" fill="#d1b376" />
          <path
            d="M29 34Q50 44 72 34M28 44Q50 54 73 44M28 55Q50 65 73 55M28 65Q50 75 73 65"
            fill="none"
            stroke="#9a7c49"
            strokeWidth="3"
          />
          <ellipse cx="50" cy="25" rx="29" ry="11" fill={wood} />
          <ellipse cx="50" cy="25" rx="8" ry="4" fill="#453f30" />
          <path
            d="M71 64Q91 70 79 89"
            fill="none"
            stroke="#d7b882"
            strokeWidth="4"
          />
        </g>
      );
      break;
    case "buoy":
      drawing = (
        <g transform="rotate(-13 50 50)">
          <path
            d="M43 19V11Q50 4 57 11V19"
            fill="none"
            stroke="#7f937f"
            strokeWidth="5"
          />
          <path d="M43 18H57L72 51Q76 72 51 90Q24 73 28 51Z" fill={paper} />
          <path
            d="M36 34H64L72 51H28ZM29 65H71Q64 80 51 89Q37 80 29 65Z"
            fill="#b85c42"
          />
          <path d="M39 44L35 56M42 69L48 78" stroke="#efb78c" strokeWidth="3" />
        </g>
      );
      break;
    case "boot":
      drawing = (
        <g transform="rotate(6 50 50)">
          <path
            d="M23 15H58L54 60Q67 60 83 72Q91 80 82 88H20V68Z"
            fill="#4e6a5a"
          />
          <ellipse cx="41" cy="16" rx="18" ry="6" fill="#2c4943" />
          <path d="M21 81H85V90H20Z" fill="#42463a" />
          <path
            d="M28 26L27 61Q28 73 45 74"
            fill="none"
            stroke="#7c9981"
            strokeWidth="4"
          />
          <path d="M51 62L62 67M49 69L59 73" stroke="#d1bf89" strokeWidth="2" />
        </g>
      );
      break;
    default:
      drawing = (
        <g>
          <circle cx="50" cy="50" r="27" fill={gold} />
          <path
            d="M50 28L57 43L73 47L61 59L61 75L47 67L31 71L34 55L25 41L42 40Z"
            fill="#567e70"
          />
        </g>
      );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#fae0a1" />
          <stop offset=".45" stopColor="#d1a65d" />
          <stop offset="1" stopColor="#8e6c3b" />
        </linearGradient>
        <linearGradient id={`${id}-wood`} x2="0" y2="1">
          <stop stopColor="#c08a53" />
          <stop offset="1" stopColor="#795039" />
        </linearGradient>
        <linearGradient id={`${id}-paper`} x2="0" y2="1">
          <stop stopColor="#f0dfac" />
          <stop offset="1" stopColor="#c8b07b" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#abd5c4" />
          <stop offset=".5" stopColor="#578e85" />
          <stop offset="1" stopColor="#244c59" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-25%"
          y="-20%"
          width="155%"
          height="160%"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.8" result="blur" />
          <feOffset in="blur" dx="1" dy="3" result="offset" />
          <feFlood floodColor="#182c29" floodOpacity=".3" result="color" />
          <feComposite in="color" in2="offset" operator="in" result="shadow" />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g
        stroke="#4a4938"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${id}-shadow)`}
      >
        {drawing}
      </g>
    </svg>
  );
}
