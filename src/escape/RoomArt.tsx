import { useId } from "react";

/** Original, self-contained vector scenery. Interaction lives in the HTML layer. */
const ink = "#302c27";
const brass = "#dcb876";

function SceneDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-wall`} x2="0" y2="1">
        <stop stopColor="#d6b889" />
        <stop offset=".55" stopColor="#af8d61" />
        <stop offset="1" stopColor="#8c6b48" />
      </linearGradient>
      <linearGradient id={`${id}-wood`} x2="0" y2="1">
        <stop stopColor="#b87c4d" />
        <stop offset=".42" stopColor="#98603b" />
        <stop offset="1" stopColor="#70462f" />
      </linearGradient>
      <linearGradient id={`${id}-teal`} x2="0" y2="1">
        <stop stopColor="#497a73" />
        <stop offset="1" stopColor="#254e4d" />
      </linearGradient>
      <linearGradient id={`${id}-sea`} x2="0" y2="1">
        <stop stopColor="#deb57c" />
        <stop offset=".44" stopColor="#ecc99b" />
        <stop offset=".45" stopColor="#80aaa7" />
        <stop offset="1" stopColor="#315f64" />
      </linearGradient>
      <linearGradient id={`${id}-floor`} x2="0" y2="1">
        <stop stopColor="#78583c" />
        <stop offset="1" stopColor="#493e32" />
      </linearGradient>
      <radialGradient id={`${id}-light`} cx=".76" cy=".22" r=".86">
        <stop stopColor="#ffe4a7" stopOpacity=".31" />
        <stop offset=".75" stopColor="#6a451e" stopOpacity="0" />
        <stop offset="1" stopColor="#111e20" stopOpacity=".22" />
      </radialGradient>
      <radialGradient id={`${id}-lamp`}>
        <stop stopColor="#fff2af" stopOpacity=".8" />
        <stop offset=".35" stopColor="#ffdc87" stopOpacity=".21" />
        <stop offset="1" stopColor="#f5b85e" stopOpacity="0" />
      </radialGradient>
      <pattern
        id={`${id}-grain`}
        width="190"
        height="61"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M8 18c37-8 60 9 98 1s54-8 77-3M26 24c28-4 47 8 83 0M118 43c24-8 48-7 61-3M3 52c28 4 48-6 77-2"
          fill="none"
          stroke="#684c31"
          strokeWidth="1"
          opacity=".23"
        />
      </pattern>
      <filter id={`${id}-shadow`} x="-25%" y="-25%" width="150%" height="165%">
        <feDropShadow
          dx="0"
          dy="9"
          stdDeviation="6"
          floodColor="#1b2829"
          floodOpacity=".26"
        />
      </filter>
      <clipPath id={`${id}-window`}>
        <circle cx="0" cy="0" r="77" />
      </clipPath>
      <clipPath id={`${id}-safe`}>
        <circle cx="280" cy="339" r="75" />
      </clipPath>
      <clipPath id={`${id}-safe-middle`}>
        <circle cx="280" cy="339" r="51" />
      </clipPath>
      <clipPath id={`${id}-safe-inner`}>
        <circle cx="280" cy="339" r="27" />
      </clipPath>
    </defs>
  );
}

function RoomShell({ id }: { id: string }) {
  return (
    <g>
      <rect width="1000" height="620" fill={`url(#${id}-wall)`} />
      {[79, 143, 206, 269, 332, 395].map((y) => (
        <path
          key={y}
          d={`M0 ${y}Q500 ${y + 4} 1000 ${y}`}
          stroke="#6c5137"
          strokeWidth="2"
          opacity=".34"
          fill="none"
        />
      ))}
      <rect width="1000" height="432" fill={`url(#${id}-grain)`} />
      <path d="M0 393H1000V479H0Z" fill={`url(#${id}-teal)`} />
      {Array.from({ length: 19 }, (_, i) => (
        <path
          key={i}
          d={`M${i * 56} 396v84`}
          stroke="#1d4241"
          strokeWidth="3"
          opacity=".62"
        />
      ))}
      <path d="M0 393H1000M0 399H1000" stroke="#715039" strokeWidth="9" />
      <path d="M0 389H1000" stroke="#c0905d" strokeWidth="4" />
      <path d="M0 470H1000V620H0Z" fill={`url(#${id}-floor)`} />
      <path
        d="M0 482H1000M0 517H1000M0 563H1000M0 613H1000"
        stroke="#352e25"
        strokeWidth="3"
        opacity=".7"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <path
          key={i}
          d={`M${170 + i * 85} 469L${-120 + i * 158} 620`}
          stroke="#382f27"
          strokeWidth="2"
          opacity=".6"
        />
      ))}
      <path d="M0 0H1000V39Q501-8 0 39Z" fill="#3c3930" />
      <path
        d="M0 44Q500-1 1000 44"
        fill="none"
        stroke="#93693f"
        strokeWidth="11"
      />
      <path
        d="M0 51Q500 8 1000 51"
        fill="none"
        stroke="#d0a168"
        strokeWidth="2"
        opacity=".7"
      />
      <path d="M0 0H48L81 472H42Z M953 0H1000L963 472H927Z" fill="#544533" />
      <path d="M49 28L80 470M953 29L927 470" stroke="#a98050" strokeWidth="5" />
      <path d="M0 473H1000" stroke="#262f2b" strokeWidth="12" />
      {[80, 205, 330].map((y) => (
        <g key={y} fill="#322f29">
          <circle cx={48 + y * 0.055} cy={y} r="3" />
          <circle cx={953 - y * 0.055} cy={y} r="3" />
        </g>
      ))}
    </g>
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
      <circle r="100" fill="#342f26" opacity=".23" transform="translate(2 8)" />
      <circle r="98" fill="#544831" stroke="#302e26" strokeWidth="4" />
      <circle r="89" fill="#bf995b" stroke="#e2bf7d" strokeWidth="3" />
      <circle
        r="79"
        fill={`url(#${id}-sea)`}
        stroke="#514937"
        strokeWidth="5"
      />
      <g clipPath={`url(#${id}-window)`}>
        <circle cx="35" cy="-30" r="20" fill="#ffdeb0" />
        <path d="M-90 10Q-35-9 8 14T98 14V78H-90Z" fill="#55888b" />
        <path
          d="M-90 38Q-61 20-24 37T53 38T108 36M-95 60Q-52 45-14 60T88 59"
          fill="none"
          stroke="#c7d4b6"
          strokeWidth="3"
          opacity=".7"
        />
        <path
          d="M-65-55L-44-69M-76-33L-39-59"
          stroke="#fff0cb"
          strokeWidth="6"
          opacity=".3"
          strokeLinecap="round"
        />
        <path d="M42 5l9-22 14 22Z" fill="#eed8a8" />
        <path d="M41 8h29l-6 6H47Z" fill="#384c48" />
      </g>
      {Array.from({ length: 8 }, (_, i) => (
        <circle
          key={i}
          cx={89 * Math.cos((i * Math.PI) / 4)}
          cy={89 * Math.sin((i * Math.PI) / 4)}
          r="3.5"
          fill="#4d4936"
          stroke="#e9c984"
          strokeWidth="1"
        />
      ))}
      <path
        d="M-98-12h-11v25h11M99-12h11v25H99"
        fill="#9d7f4c"
        stroke="#403b2e"
        strokeWidth="3"
      />
    </g>
  );
}

function Lantern({
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
      <circle cy="37" r="120" fill={`url(#${id}-lamp)`} />
      <path
        d="M0-32v-18q-20-11-23 10"
        fill="none"
        stroke="#3f4231"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <ellipse
        cy="-15"
        rx="14"
        ry="17"
        fill="none"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M-23 7L-14-5H14L23 7V74L16 84H-16L-23 74Z"
        fill="#c59b54"
        stroke={ink}
        strokeWidth="4"
      />
      <path d="M-16 15H16L13 67H-13Z" fill="#f7d389" />
      <path d="M-12 18H-5V60H-10Z" fill="#ffebbb" opacity=".8" />
      <path d="M0 62C-17 49 4 36 0 23C22 44 13 64 0 62Z" fill="#fff1b1" />
      <path
        d="M-23 11H23M-21 70H21M-19 77H19M0 13V69"
        stroke="#635238"
        strokeWidth="4"
      />
      <path
        d="M-29 7H29M-26 84H26"
        stroke={ink}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </g>
  );
}

function Pennants() {
  return (
    <g>
      <path
        d="M259 95Q495 147 738 94"
        fill="none"
        stroke="#514c34"
        strokeWidth="4"
      />
      <path
        d="M276 100L393 117L383 216L330 190L280 201Z"
        fill="#3c6564"
        stroke="#343e34"
        strokeWidth="3"
      />
      <path
        d="M437 122L553 124L549 226L494 198L440 224Z"
        fill="#a75440"
        stroke="#593c2d"
        strokeWidth="3"
      />
      <path
        d="M593 120L709 101L704 200L652 188L601 215Z"
        fill="#536151"
        stroke="#343e34"
        strokeWidth="3"
      />
      <path
        d="M280 107L389 123M442 129L549 131M598 127L705 108"
        fill="none"
        stroke="#e7c995"
        strokeWidth="2"
        opacity=".65"
      />
      {[
        { x: 335, y: 158, angle: 8 },
        { x: 495, y: 173, angle: 1 },
        { x: 652, y: 157, angle: -8 },
      ].map(({ x, y, angle }) => (
        <g
          key={x}
          transform={`translate(${x} ${y}) rotate(${angle})`}
          stroke="#f3ddab"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {[1, 2, 3, 4, 5].map((length, row) =>
            Array.from({ length }, (_, column) => (
              <rect
                key={`${row}-${column}`}
                x={-27 + column * 11}
                y={-27 + row * 11}
                width="9"
                height="9"
                rx="1"
                fill="none"
                strokeWidth="1.3"
              />
            )),
          )}
        </g>
      ))}
      {[278, 390, 440, 550, 597, 705].map((x) => (
        <path
          key={x}
          d={`M${x} ${x > 590 ? 117 - (x - 597) * 0.16 : x < 400 ? 98 + (x - 278) * 0.15 : 121}v13`}
          stroke="#cbae79"
          strokeWidth="3"
        />
      ))}
    </g>
  );
}

function DeskView({ id }: { id: string }) {
  return (
    <g>
      <Porthole id={id} x={821} y={232} scale={0.8} />
      <Pennants />
      <path
        d="M111 331H233V342H111Z"
        fill="#63462e"
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M125 341v32l19-32M218 341v32l-20-32"
        stroke="#513e2e"
        strokeWidth="5"
        fill="none"
      />
      <g transform="translate(135 270) rotate(-6)">
        <rect
          width="17"
          height="59"
          rx="2"
          fill="#445c54"
          stroke={ink}
          strokeWidth="2"
        />
        <path d="M3 8h11M3 47h11" stroke={brass} strokeWidth="2" />
      </g>
      <g transform="translate(154 265)">
        <rect
          width="22"
          height="65"
          rx="2"
          fill="#a8533c"
          stroke={ink}
          strokeWidth="2"
        />
        <path d="M4 9h14M4 15h14M4 55h14" stroke={brass} strokeWidth="2" />
      </g>
      <g transform="translate(180 275) rotate(8)">
        <rect
          width="22"
          height="58"
          rx="2"
          fill="#c8a268"
          stroke={ink}
          strokeWidth="2"
        />
        <path d="M4 10h14M4 49h14" stroke="#705338" strokeWidth="2" />
      </g>
      <ellipse cx="468" cy="551" rx="312" ry="28" fill="#242e29" opacity=".3" />
      <path
        d="M175 415L190 550H220L226 415M690 415L702 550H731L741 415"
        fill="#61452f"
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M179 408H737V490Q460 510 181 489Z"
        fill={`url(#${id}-wood)`}
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M156 367L708 352L778 410L167 433L140 407Z"
        fill="#b48554"
        stroke={ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M141 405L778 387V410L167 433L141 419Z"
        fill="#6b4a31"
        stroke={ink}
        strokeWidth="4"
      />
      <path d="M147 402L775 384" stroke="#d4a16b" strokeWidth="5" />
      <path
        d="M203 373Q348 393 431 372M323 399Q493 382 581 390M591 366l91 1"
        fill="none"
        stroke="#6e4c32"
        strokeWidth="2"
        opacity=".55"
      />
      <path
        d="M411 437L597 431V488L411 493Z"
        fill="#a86d42"
        stroke="#493c2b"
        strokeWidth="4"
      />
      <path
        d="M420 444L587 439V480L420 484Z"
        fill="none"
        stroke="#d09658"
        strokeWidth="2"
      />
      <path
        d="M207 444L382 439V491M620 432v55l97-4v-54"
        fill="none"
        stroke="#513c2a"
        strokeWidth="3"
      />
      <ellipse
        cx="505"
        cy="463"
        rx="15"
        ry="11"
        fill="#d3a35d"
        stroke="#4c4030"
        strokeWidth="3"
      />
      <circle cx="505" cy="460" r="3.5" fill="#373b2c" />
      <path d="M503 461l-2 9h8l-2-9" fill="#373b2c" />
      <path
        d="M286 458h28M659 451h27"
        stroke="#d7ab66"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M198 376Q222 368 263 373L309 402L288 433L240 422L222 407L190 408L184 389Z"
        fill="#bfc5ad"
        stroke="#48594b"
        strokeWidth="3"
      />
      <path
        d="M207 378L244 408L279 419M231 379L267 404L296 407M222 407l4-17M249 411l7-18"
        fill="none"
        stroke="#7c9887"
        strokeWidth="3"
      />
      <path
        d="M203 390l15 10M267 425l8 5M275 429l8 5M282 431l8 3"
        stroke="#e1ddbd"
        strokeWidth="2"
      />
      <g transform="translate(487 350) rotate(-9)">
        <path
          d="M-81-8H35L58 36H-60Z"
          fill="#dfc593"
          stroke="#8d764f"
          strokeWidth="2"
        />
        <path
          d="M-64 3Q-31-8-11 5T37 11M-55 12l24 12 25-15 38 18"
          fill="none"
          stroke="#8d9c7b"
          strokeWidth="2"
        />
        <path d="M-73 1h7M-63 29l13 2" stroke="#a8895b" strokeWidth="2" />
      </g>
      <g transform="translate(620 333)">
        <ellipse cy="33" rx="29" ry="8" fill="#493b2e" opacity=".3" />
        <path
          d="M-15 0H15L18 28Q0 42-18 28Z"
          fill="#d2bb87"
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M16 6c29-4 26 25 2 21"
          fill="none"
          stroke={ink}
          strokeWidth="5"
        />
        <ellipse rx="15" ry="5" fill="#5c4530" stroke={ink} strokeWidth="3" />
      </g>
      <Lantern id={id} x={96} y={133} scale={0.71} />
      <g transform="translate(812 468)">
        <path
          d="M-29-42L30-42L42 34H-39Z"
          fill="#496962"
          stroke={ink}
          strokeWidth="4"
        />
        <ellipse
          cy="-42"
          rx="30"
          ry="10"
          fill="#263f3b"
          stroke={ink}
          strokeWidth="4"
        />
        <path
          d="M-27-36q-17-54 27-54t29 54"
          fill="none"
          stroke="#9f8d63"
          strokeWidth="5"
        />
        <path d="M-27 15h58M-26-10h52" stroke="#698377" strokeWidth="3" />
      </g>
    </g>
  );
}

function CompassRose({
  x,
  y,
  scale = 1,
}: {
  x: number;
  y: number;
  scale?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke="#7d6f4c"
      strokeWidth="1.5"
    >
      <circle r="26" fill="none" />
      <circle r="20" fill="none" opacity=".5" />
      <path d="M0-36L7-7L35 0L7 7L0 36L-7 7L-35 0L-7-7Z" fill="#a47648" />
      <path d="M0-36V0H35L7-7ZM0 36V0H-35L-7 7Z" fill="#e8d19a" />
      <circle r="3" fill="#716144" />
    </g>
  );
}

function ChartView({ id }: { id: string }) {
  return (
    <g>
      <path
        d="M214 116L437 72L635 116"
        fill="none"
        stroke="#63573b"
        strokeWidth="3"
      />
      <circle cx="437" cy="74" r="4" fill="#4b4131" />
      <path
        d="M189 111L654 106L651 365L193 375Z"
        fill="#553f2b"
        opacity=".3"
        transform="translate(4 8)"
      />
      <path
        d="M190 107L651 104L649 368L193 370Z"
        fill="#e4c992"
        stroke="#674d32"
        strokeWidth="8"
      />
      <path
        d="M202 119L638 116L636 356L205 357Z"
        fill="#d9c697"
        stroke="#f3dfad"
        strokeWidth="2"
      />
      <path
        d="M218 134H621V341H218Z"
        fill="#bcc1a0"
        stroke="#947e52"
        strokeWidth="1.5"
      />
      <g stroke="#9ba17f" strokeWidth="1" opacity=".75">
        {[269, 319, 369, 419, 469, 519, 569].map((x) => (
          <path key={x} d={`M${x} 135V341`} />
        ))}
        {[175, 216, 257, 298].map((y) => (
          <path key={y} d={`M219 ${y}H621`} />
        ))}
      </g>
      <path
        d="M219 140l69-5 23 22-19 16 13 26-35 23 5 30-35 17-21-5M621 173l-38-5-20 27 18 20-12 19-43 5-18 37 21 31-8 34H621Z"
        fill="#d8c493"
        stroke="#8b8c65"
        strokeWidth="2"
      />
      <path
        d="M375 200l31-19 36 7 13 25-23 29-38-7-21-17ZM331 274l16-13 26 9-2 16-22 12-18-10Z"
        fill="#dbca9c"
        stroke="#8b8c65"
        strokeWidth="2"
      />
      <path
        d="M268 279C304 301 328 322 378 287S398 232 448 244S508 210 550 185"
        fill="none"
        stroke="#a16543"
        strokeWidth="3"
        strokeDasharray="7 8"
        strokeLinecap="round"
      />
      <circle cx="268" cy="279" r="7" fill="#a16543" />
      <circle cx="448" cy="244" r="5" fill="#a16543" />
      <path
        d="M542 177l16 16M558 177l-16 16"
        stroke="#a16543"
        strokeWidth="4"
      />
      <CompassRose x={567} y={291} scale={0.93} />
      <path
        d="M325 151h83M336 156h60M304 324h112"
        stroke="#8d7950"
        strokeWidth="2"
        opacity=".75"
      />
      <path
        d="M213 126h12M212 348h12M614 126h12M614 348h12"
        stroke="#9a7046"
        strokeWidth="2"
      />
      <g transform="translate(783 361)">
        <ellipse cy="168" rx="121" ry="16" fill="#243830" opacity=".3" />
        <path
          d="M-91 138l-5 31h24l9-31M69 138l8 31h24l-6-31"
          fill="#493e2c"
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M-93-11H99V143H-93Z"
          fill={`url(#${id}-teal)`}
          stroke={ink}
          strokeWidth="5"
        />
        <path
          d="M-105-11l14-16H89l22 16V1H-105Z"
          fill="#927c4d"
          stroke={ink}
          strokeWidth="4"
        />
        <path d="M-103-11H110" stroke="#ccb077" strokeWidth="3" />
        <path
          d="M-80 16H-5V127H-80ZM8 16H85V127H8Z"
          fill="#436e64"
          stroke="#1f403b"
          strokeWidth="3"
        />
        <path
          d="M-71 26H-14V117H-71ZM18 26H76V117H18Z"
          fill="none"
          stroke="#7e9471"
          strokeWidth="2"
          opacity=".7"
        />
        <path d="M-81 68h76M9 68h76" stroke="#214640" strokeWidth="2" />
        <circle
          cx="-16"
          cy="77"
          r="5"
          fill="#d6b573"
          stroke="#343d2c"
          strokeWidth="2"
        />
        <path
          d="M8 67h16v24H8Z"
          fill="#bea060"
          stroke="#343d2c"
          strokeWidth="2"
        />
        <circle cx="16" cy="75" r="3" fill="#34443b" />
        <path d="M15 76l-2 8h6l-2-8" fill="#34443b" />
        <path d="M-88 136H94" stroke="#718164" strokeWidth="3" />
      </g>
      <g transform="translate(759 326)">
        <path
          d="M-24-59H17L26-15L10 0H-18L-29-16Z"
          fill="#bba57c"
          stroke={ink}
          strokeWidth="3"
        />
        <ellipse cx="-3" cy="-59" rx="21" ry="6" fill="#675c44" />
        <path
          d="M19-45q30-3 23 21L25-11"
          fill="none"
          stroke="#6b6146"
          strokeWidth="7"
        />
        <path
          d="M-20-50l8 5M-22-39l7 5M-16-16H6"
          stroke="#e1c892"
          strokeWidth="3"
        />
      </g>
      <g transform="translate(839 334) rotate(8)">
        <rect
          x="-27"
          y="-16"
          width="52"
          height="12"
          rx="2"
          fill="#aa6546"
          stroke={ink}
          strokeWidth="2"
        />
        <path d="M-23-13h43" stroke="#e0bf88" strokeWidth="2" />
        <rect
          x="-24"
          y="-28"
          width="49"
          height="12"
          rx="2"
          fill="#7e805c"
          stroke={ink}
          strokeWidth="2"
        />
      </g>
      <Lantern id={id} x={815} y={148} scale={0.79} />
      <g transform="translate(118 302)">
        <path d="M0-130v120" stroke="#6e5438" strokeWidth="9" />
        <path
          d="M0-90C-56-44-37-8 0 6C39-8 57-44 0-90Z"
          fill="#9e7b48"
          stroke="#4e432d"
          strokeWidth="4"
        />
        <path
          d="M0-73v64M-12-57L-7-17M12-57L7-17"
          stroke="#c49c61"
          strokeWidth="3"
        />
      </g>
      <g transform="translate(205 485)">
        <ellipse
          rx="70"
          ry="31"
          fill="#8e794e"
          stroke="#423d2d"
          strokeWidth="4"
        />
        <ellipse rx="54" ry="22" fill="none" stroke="#c1aa71" strokeWidth="7" />
        <ellipse rx="40" ry="16" fill="none" stroke="#b49e68" strokeWidth="6" />
        <path
          d="M-31 14Q-14-4 12 14T72 35L86 60"
          fill="none"
          stroke="#bca570"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M-52-8l12 10M-22-22l5 10M21-23l-1 11M50-9l-10 6"
          stroke="#796a48"
          strokeWidth="2"
        />
      </g>
    </g>
  );
}

/** Shared image for the wooden-slat reference and concentric-ring puzzle. */
function LighthouseScene() {
  return (
    <g>
      <rect width="240" height="240" fill="#d7c697" />
      <path d="M0 0H240V143H0Z" fill="#b9c8ba" />
      <circle cx="187" cy="58" r="26" fill="#edd3a0" />
      <path d="M101 88L240 12V108Z" fill="#f5e5ac" opacity=".7" />
      <path d="M106 88L240 15" stroke="#fff0bd" strokeWidth="2" opacity=".8" />
      <path d="M0 148Q37 132 81 147T164 147T240 141V240H0Z" fill="#619190" />
      <path d="M0 176Q39 161 86 178T180 176T256 177V240H0Z" fill="#3d7178" />
      <path d="M0 207Q51 185 102 205T214 206L240 214V240H0Z" fill="#2b5865" />
      <path
        d="M32 208L71 175L100 184L142 172L176 200L194 214Z"
        fill="#4d665c"
        stroke="#36534e"
        strokeWidth="3"
      />
      <path
        d="M75 181L84 98H114L127 185Z"
        fill="#eee1b8"
        stroke="#576154"
        strokeWidth="3"
      />
      <path
        d="M82 119L117 121L119 138L80 136ZM77 156L122 158L125 174L75 174Z"
        fill="#b96548"
      />
      <path
        d="M81 98V78H117V99Z"
        fill="#ebcf83"
        stroke="#49584c"
        strokeWidth="3"
      />
      <path
        d="M77 79L99 63L122 80Z"
        fill="#ad5b44"
        stroke="#49584c"
        strokeWidth="3"
      />
      <path
        d="M75 100H122M75 104H122M90 79V96M106 79V96"
        stroke="#46584e"
        strokeWidth="3"
      />
      <path d="M96 184v-19q0-7 9-7q8 0 8 7v17" fill="#516455" />
      <path
        d="M64 191l22 4M126 191l21-4M152 201l15 3M16 179l21-3M188 185l29 2M23 223l45-2M132 226l58 1"
        fill="none"
        stroke="#b9c4a7"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M149 93q8-9 15 0q8-9 15 0M29 62q6-7 12 0q6-7 12 0"
        fill="none"
        stroke="#526c63"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  );
}

export function LighthouseArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      width="100%"
      height="100%"
      role="img"
      aria-label="海边灯塔参考图"
    >
      <g transform="scale(.83333333)">
        <LighthouseScene />
      </g>
    </svg>
  );
}

/** One of five horizontal picture fragments, ordered from top to bottom. */
export function LighthouseSlice({ index }: { index: number }) {
  return (
    <svg
      viewBox={`0 ${index * 48} 240 48`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <LighthouseScene />
    </svg>
  );
}

function ShipView({ id }: { id: string }) {
  return (
    <g>
      <Porthole id={id} x={842} y={211} scale={0.71} />
      <g transform="translate(84 154) rotate(-3 83 76)">
        <path
          d="M19 0L83-28L148 0"
          fill="none"
          stroke="#67583c"
          strokeWidth="3"
        />
        <circle cx="83" cy="-28" r="3.5" fill="#4a4130" />
        <rect
          x="4"
          y="7"
          width="168"
          height="153"
          rx="5"
          fill="#3d3929"
          opacity=".3"
        />
        <rect
          width="168"
          height="153"
          rx="5"
          fill="#785232"
          stroke="#4c3d2b"
          strokeWidth="4"
        />
        <rect x="7" y="7" width="154" height="139" rx="2" fill="#413c2b" />
        {[
          { total: 12, slice: 3 },
          { total: 8, slice: 0 },
          { total: 16, slice: 4 },
          { total: 10, slice: 1 },
          { total: 14, slice: 2 },
        ].map(({ total, slice }, row) => (
          <g key={total} transform={`translate(11 ${11 + row * 27})`}>
            <rect
              width="146"
              height="23"
              rx="2"
              fill={`url(#${id}-wood)`}
              stroke="#362f24"
              strokeWidth="1.5"
            />
            <path d="M2 3H143" stroke="#d1a067" strokeWidth="1.5" />
            <rect x="5" y="5" width="27" height="15" rx="2" fill="#d5b779" />
            <text
              x="18.5"
              y="16.5"
              textAnchor="middle"
              fontSize="12"
              fontFamily="Georgia, serif"
              fontWeight="bold"
              fill="#4c4030"
            >
              {total}
            </text>
            <svg
              x="38"
              y="4"
              width="102"
              height="16"
              viewBox={`0 ${slice * 48} 240 48`}
              preserveAspectRatio="none"
            >
              <LighthouseScene />
            </svg>
          </g>
        ))}
        <path d="M5 4V147M163 4V147" stroke="#b68c53" strokeWidth="2" />
        {[6, 162].map((x) => (
          <g key={x} fill="#d4b279">
            <circle cx={x} cy="6" r="2" />
            <circle cx={x} cy="147" r="2" />
          </g>
        ))}
      </g>
      <path
        d="M104 347h111v10H104Z"
        fill="#6d5136"
        stroke={ink}
        strokeWidth="3"
      />
      <g transform="translate(151 338)">
        <path
          d="M-24-23H26L33-8L17 5H-10L-30-6Z"
          fill="#b58c5a"
          stroke="#624e34"
          strokeWidth="2"
        />
        <path
          d="M-18-25l5-11 12 10 12-13 13 12"
          fill="#e5d1a3"
          stroke="#8f7950"
          strokeWidth="2"
        />
      </g>
      <ellipse
        cx="519"
        cy="545"
        rx="306"
        ry="26"
        fill="#233630"
        opacity=".31"
      />
      <path
        d="M251 454v89h31l13-89M765 454v89h-31l-13-89"
        fill="#624b31"
        stroke={ink}
        strokeWidth="5"
      />
      <path
        d="M235 439H788V491H235Z"
        fill={`url(#${id}-wood)`}
        stroke={ink}
        strokeWidth="4"
      />
      <path
        d="M248 406H766L806 435V458H222V436Z"
        fill="#a77b4b"
        stroke={ink}
        strokeWidth="4"
      />
      <path d="M223 436H806M253 419H770" stroke="#d6ac71" strokeWidth="3" />
      <path d="M224 441H805" stroke="#694b30" strokeWidth="4" />
      <path
        d="M345 434H684V420H345Z"
        fill="#493f2d"
        stroke={ink}
        strokeWidth="3"
      />
      <path
        d="M362 420L378 401H650L666 420Z"
        fill="#b18c58"
        stroke={ink}
        strokeWidth="3"
      />
      <path d="M403 418v-27M619 418v-26" stroke="#483e2b" strokeWidth="8" />
      <g strokeLinejoin="round">
        <path
          d="M302 357Q359 373 406 369L699 355L658 398Q542 430 370 397Z"
          fill="#704834"
          stroke="#332f27"
          strokeWidth="5"
        />
        <path
          d="M327 371Q485 401 688 368"
          fill="none"
          stroke="#ceaa67"
          strokeWidth="7"
        />
        <path
          d="M345 385Q469 412 664 384"
          fill="none"
          stroke="#9e7547"
          strokeWidth="2"
        />
        {[390, 426, 463, 502, 541, 580, 620, 654].map((x) => (
          <circle
            key={x}
            cx={x}
            cy={x < 430 ? 383 : x > 610 ? 379 : 388}
            r="4"
            fill="#2b3832"
            stroke="#cca669"
            strokeWidth="1.5"
          />
        ))}
        <path
          d="M431 360V145M554 365V107M644 360V195"
          stroke="#55442e"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M431 149L321 349M554 111L357 361M554 111L696 356M644 199L710 354M431 154L661 356"
          stroke="#635d41"
          strokeWidth="2"
          fill="none"
        />
        <path
          d="M363 187H487M370 264H489M474 155H631M467 247H636M594 240H682M603 302H682"
          stroke="#55442e"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M371 190Q418 218 479 190L474 250Q423 271 375 248Q383 220 371 190Z"
          fill="#eadbb7"
          stroke="#9d8e64"
          strokeWidth="2"
        />
        <path
          d="M376 267Q430 290 482 267L476 337Q429 354 380 331Q389 296 376 267Z"
          fill="#ded0a8"
          stroke="#9d8e64"
          strokeWidth="2"
        />
        <path
          d="M483 159Q555 187 624 159Q611 192 628 233Q554 250 480 232Q494 194 483 159Z"
          fill="#f2e4be"
          stroke="#9d8e64"
          strokeWidth="2"
        />
        <path
          d="M477 251Q557 277 627 251Q616 286 631 329Q554 352 474 329Q491 288 477 251Z"
          fill="#ead9af"
          stroke="#9d8e64"
          strokeWidth="2"
        />
        <path
          d="M600 244Q641 263 677 244L674 291Q638 305 604 287Z"
          fill="#ecdbb4"
          stroke="#9d8e64"
          strokeWidth="2"
        />
        <path
          d="M609 306Q644 319 678 306L673 348Q640 360 607 347Z"
          fill="#ddc9a1"
          stroke="#9d8e64"
          strokeWidth="2"
        />
        <path
          d="M411 205q8 24 0 46M444 205q9 22 3 46M510 174q10 25 0 61M592 174q-10 29 2 63M510 266q10 27 0 68M592 266q-9 26 3 68M406 281q8 20 2 52M451 282q7 22 4 55"
          fill="none"
          stroke="#c2b189"
          strokeWidth="2"
          opacity=".8"
        />
        <path
          d="M554 109V91L596 100L554 116Z"
          fill="#a45b43"
          stroke="#674b32"
          strokeWidth="2"
        />
        <path
          d="M431 145v-17l31 9-31 13"
          fill="#4d8073"
          stroke="#4a5538"
          strokeWidth="2"
        />
        <path
          d="M691 356l43-13M310 359l-27-24"
          stroke="#55442e"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M485 433H553V445H485Z"
        fill="#bca46f"
        stroke="#4d4733"
        strokeWidth="2"
      />
      <path
        d="M497 438H541"
        stroke="#253d35"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="489" cy="439" r="1.5" fill="#675b3d" />
      <circle cx="549" cy="439" r="1.5" fill="#675b3d" />
      <path
        d="M528 489h88M295 476l59-2"
        stroke="#573e2c"
        strokeWidth="2"
        opacity=".7"
      />
      <g transform="translate(856 442)">
        <path
          d="M-34-38H29L42 64H-41Z"
          fill="#86653e"
          stroke={ink}
          strokeWidth="4"
        />
        <ellipse
          cy="-38"
          rx="32"
          ry="10"
          fill="#a6804c"
          stroke={ink}
          strokeWidth="3"
        />
        <path d="M-30-10H33M-35 40H37" stroke="#36483e" strokeWidth="11" />
        <path
          d="M-15-28l-5 77M5-28l4 77M22-28l7 77"
          stroke="#5d4c31"
          strokeWidth="2"
        />
      </g>
    </g>
  );
}

function DoorView({ id }: { id: string }) {
  return (
    <g>
      <path
        d="M550 483V109Q659 55 778 109V483Z"
        fill="#2e3c35"
        stroke="#514431"
        strokeWidth="12"
      />
      <path
        d="M564 479V117Q661 67 765 117V479Z"
        fill="#7b583a"
        stroke="#c09b62"
        strokeWidth="5"
      />
      <path
        d="M577 476V126Q662 85 752 126V476Z"
        fill={`url(#${id}-teal)`}
        stroke="#283d33"
        strokeWidth="5"
      />
      {[609, 645, 681, 717].map((x) => (
        <path key={x} d={`M${x} 120V475`} stroke="#284b43" strokeWidth="3" />
      ))}
      <path
        d="M586 295H744V314H586ZM586 429H744V445H586Z"
        fill="#536b51"
        stroke="#263e34"
        strokeWidth="3"
      />
      <path d="M590 299H740M590 433H740" stroke="#9f9f69" strokeWidth="2" />
      <circle
        cx="665"
        cy="214"
        r="55"
        fill="#9f8650"
        stroke="#283b31"
        strokeWidth="5"
      />
      <circle
        cx="665"
        cy="214"
        r="43"
        fill="#364c45"
        stroke="#ddbc75"
        strokeWidth="3"
      />
      <path
        d="M637 190L647 179M635 205L660 180"
        stroke="#a8b8a0"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".5"
      />
      <path
        d="M641 242q25 12 45-3"
        stroke="#729889"
        strokeWidth="3"
        fill="none"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <circle
          key={i}
          cx={665 + 50 * Math.cos((i * Math.PI) / 4)}
          cy={214 + 50 * Math.sin((i * Math.PI) / 4)}
          r="2.3"
          fill="#e3c588"
        />
      ))}
      <path
        d="M722 325h17v56h-17Z"
        fill="#bda063"
        stroke="#3a4533"
        strokeWidth="3"
      />
      <circle
        cx="730"
        cy="343"
        r="11"
        fill="#dcc080"
        stroke="#665b3a"
        strokeWidth="3"
      />
      <path
        d="M730 343h-30"
        stroke="#d6b674"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx="730" cy="367" r="4" fill="#263c32" />
      <path d="M728 368l-2 7h9l-3-7" fill="#263c32" />
      <path
        d="M573 299h29M573 435h29"
        stroke="#263b31"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx="597" cy="299" r="2" fill="#bfab72" />
      <circle cx="597" cy="435" r="2" fill="#bfab72" />
      <path
        d="M547 482H784L804 501H526Z"
        fill="#c3aa73"
        stroke="#3e4231"
        strokeWidth="4"
      />
      <path
        d="M517 536H797L833 575H478Z"
        fill="#8c7953"
        stroke="#514d37"
        strokeWidth="3"
      />
      <path d="M511 549H803M501 559H815" stroke="#b6a378" strokeWidth="2" />
      <path
        d="M537 538l-14 32M571 538l-9 32M610 538l-5 32M652 538v32M692 538l4 32M733 538l8 32M770 538l12 32"
        stroke="#5a6047"
        strokeWidth="2"
      />
      <path
        d="M231 265L280 214L331 265"
        fill="none"
        stroke="#675b3c"
        strokeWidth="3"
      />
      <circle cx="280" cy="214" r="4" fill="#423e2e" />
      <circle cx="280" cy="347" r="108" fill="#283d32" opacity=".25" />
      <circle
        cx="280"
        cy="339"
        r="105"
        fill="#634e32"
        stroke="#343e2f"
        strokeWidth="4"
      />
      <circle
        cx="280"
        cy="339"
        r="97"
        fill="#c3a169"
        stroke="#e0bd7a"
        strokeWidth="3"
      />
      <circle
        cx="280"
        cy="339"
        r="82"
        fill="#4c604b"
        stroke="#514b31"
        strokeWidth="5"
      />
      {[
        { clip: "safe", rotation: 90 },
        { clip: "safe-middle", rotation: 180 },
        { clip: "safe-inner", rotation: 270 },
      ].map(({ clip, rotation }) => (
        <g key={clip} clipPath={`url(#${id}-${clip})`}>
          <g transform={`rotate(${rotation} 280 339)`}>
            <g transform="translate(194 253) scale(.7167)">
              <LighthouseScene />
            </g>
          </g>
        </g>
      ))}
      <circle
        cx="280"
        cy="339"
        r="75"
        fill="none"
        stroke="#ddc490"
        strokeWidth="3"
      />
      <circle
        cx="280"
        cy="339"
        r="51"
        fill="none"
        stroke="#5c674c"
        strokeWidth="2"
        opacity=".9"
      />
      <circle
        cx="280"
        cy="339"
        r="27"
        fill="none"
        stroke="#5c674c"
        strokeWidth="2"
        opacity=".9"
      />
      <path
        d="M277 250l3-5 4 5M277 430l3 5 4-5M190 336l-5 3 5 4M370 336l5 3-5 4"
        fill="#705a36"
      />
      <path
        d="M276 431h9"
        stroke="#e3c483"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <g transform="translate(418 196)">
        <path
          d="M-32-41l33-16 31 16v54H-32Z"
          fill="#795d3a"
          stroke={ink}
          strokeWidth="3"
        />
        <circle
          cy="-12"
          r="24"
          fill="#ddc99c"
          stroke="#b08d56"
          strokeWidth="3"
        />
        <circle cy="-12" r="18" fill="none" stroke="#958359" />
        <path
          d="M0-28V-12l12 6"
          fill="none"
          stroke="#415143"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cy="-12" r="3" fill="#415143" />
        <path d="M-14 26h28M0 20v18" stroke="#b99459" strokeWidth="4" />
      </g>
      <Lantern id={id} x={852} y={174} scale={0.86} />
      <g transform="translate(858 458)">
        <path
          d="M-29-7h54l-7 52h-39Z"
          fill="#ad714c"
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M-33-13h61v12h-61Z"
          fill="#bc8558"
          stroke={ink}
          strokeWidth="3"
        />
        <path
          d="M-1-14q-6-39-30-56q-2 38 28 50M0-17q-3-56 18-75q18 43-14 68M3-14q18-44 43-41q-2 32-40 39"
          fill="#517657"
          stroke="#314f3e"
          strokeWidth="3"
        />
        <path
          d="M0-11v-64M0-13l-22-43M4-17l27-28"
          stroke="#94a276"
          strokeWidth="2"
        />
      </g>
    </g>
  );
}

export default function RoomArt({ view }: { view: 0 | 1 | 2 | 3 }) {
  const id = `cabin-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 1000 620"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      <SceneDefs id={id} />
      <RoomShell id={id} />
      {view === 0 && <DeskView id={id} />}
      {view === 1 && <ChartView id={id} />}
      {view === 2 && <ShipView id={id} />}
      {view === 3 && <DoorView id={id} />}
      <rect
        width="1000"
        height="620"
        fill={`url(#${id}-light)`}
        pointerEvents="none"
      />
      <path d="M0 599Q500 635 1000 599V620H0Z" fill="#1f302c" opacity=".19" />
    </svg>
  );
}
