import type { ChapterState, PuzzleDefinition, ToolDefinition } from './types';

/** Persistent physical surfaces, including before the mechanism is operational. */
export default function DeviceArt({ puzzle, state, tools }: { puzzle: PuzzleDefinition; state: ChapterState; tools: ToolDefinition[] }) {
  const used = (id: string) => state.usedTools.includes(id);
  const input = state.puzzles[puzzle.id]?.input;
  const tideCells = input?.kind === 'sudoku' ? input.cells : [];
  return <svg viewBox="0 0 800 320" role="img" aria-label={`${puzzle.title}的装置与接口`}>
    <rect x="6" y="6" width="788" height="308" rx="25" fill="#75523c" stroke="#cfad74" strokeWidth="8" />
    <rect x="23" y="23" width="754" height="274" rx="18" fill="#263f41" stroke="#9f895e" strokeWidth="3" />
    {[40,760].flatMap(x => [40,280].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="5" fill="#d7b479" />))}
    {puzzle.kind === 'sudoku' ? <g>
      {tideCells.map((n,i) => <g key={i}><rect x={90+i%4*105} y={35+Math.floor(i/4)*63} width="103" height="61" fill={n?'#8caaab':'#d7c99c'} stroke="#334a4c" strokeWidth="2" />{n>0 && <text x={141+i%4*105} y={77+Math.floor(i/4)*63} textAnchor="middle" fill="#203d42" fontSize="32">{n}</text>}</g>)}
      <path d="M300 35V286M90 161H510" stroke="#203d42" strokeWidth="6" />
    </g> : puzzle.kind === 'filter' ? <g>
      <ellipse cx="228" cy="160" rx="160" ry="120" fill={used('clean-window')?'#abc5c0':'#7b8980'} stroke="#d7b479" strokeWidth="12" />
      <path d="M120 195L290 80M145 220L310 100" stroke="#e2dac0" strokeWidth="11" opacity=".3" />
      {!used('clean-window') && <path d="M100 140q65-60 150 12t95 8M120 190q100-55 190-5" fill="none" stroke="#bdb49a" strokeWidth="26" opacity=".6" />}
    </g> : puzzle.kind === 'code' ? <g fill="#c5b580" stroke="#283b3e" strokeWidth="3">
      {[160,320,480,640].map((x,i)=><g key={x}><rect x={x-63} y="55" width="126" height="115" rx="9" /><text x={x} y="123" textAnchor="middle" stroke="none" fill="#283b3e" fontSize="28">{['鸟','蜘蛛','龟','蚂蚁'][i]}</text></g>)}
    </g> : puzzle.kind === 'drop' ? <g stroke="#bdab7d" fill="#587e76">
      {[0,1,2].map(i=><g key={i}><rect x={100+i*210} y="45" width="170" height="132" rx="8" />{[0,1,2,3].map(j=><path key={j} d={`M${110+i*210+j*40} 50v120M${105+i*210} ${60+j*30}h160`} opacity=".4" />)}</g>)}
    </g> : null}
    {tools.map(tool => {const t=tool.target, done=used(tool.id), cx=(t.x+t.width/2)*8, cy=(t.y+t.height/2)*3.2;
      return <g key={tool.id}>
        {puzzle.kind === 'filter' && tool.id === 'clean-window' ? null : tool.id === 'wind-tide' || tool.id === 'mount-frame' || tool.id === 'mount-filter' ? <g>
          <circle cx={cx} cy={cy} r={Math.min(t.width*3.2,t.height*1.35)} fill={done?'#7a9f89':'#142e34'} stroke="#d7b479" strokeWidth="8" />
          {tool.id==='wind-tide' ? done ? <path d={`M${cx} ${cy}h45v-45h20`} stroke="#d7b479" strokeWidth="12" fill="none"/> : <rect x={cx-13} y={cy-13} width="26" height="26" fill="#080f17" stroke="#829a91" strokeWidth="3"/> : <circle cx={cx} cy={cy} r="18" fill={done?'#c4d4b1':'#283f46'} />}
        </g> : <g>
          <rect x={t.x*8+8} y={t.y*3.2+5} width={t.width*8-16} height={t.height*3.2-10} rx="10" fill={done?'#b5c09a':'#182d30'} stroke="#c6a96f" strokeWidth="4" />
          <text x={cx} y={cy+8} textAnchor="middle" fill="#d7c79d" fontSize="24">{tool.id==='brush-plaque' ? done?'鸟 → 蜘蛛 → 龟 → 蚂蚁':'░ ░ ░ ░' : tool.id==='mount-prism'?'◇':tool.id==='oil-track'?'════════':tool.id==='mount-route'?'▤':tool.id==='mount-arrow'?'↑  ↑':tool.id==='mount-sail'?'◩  ◩':'⚑  ⚑'}</text>
        </g>}
        {done && <circle cx={t.x*8+14} cy={t.y*3.2+13} r="5" fill="#b1e2a6" />}
      </g>;
    })}
  </svg>;
}
