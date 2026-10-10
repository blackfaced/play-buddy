import type { DropPuzzle, PuzzleInput } from "./types";
import { rotateCells, simulateDrops } from "./validators";

type DropInput = Extract<PuzzleInput, {kind: "drop"}>;
const palette = ["#dbb972", "#91bcb4", "#cfa48b"];
/** One coordinate system for hanging pieces, guide rails, and receiving cells. */
export function DropChute({board, solved}: {board: DropPuzzle["boards"][number]; solved: boolean}) {
  const cell = 22, left = 40, floorTop = 260;
  let bottom = 228;
  const hanging = board.model.pieces.map((piece, index) => {
    const placement = board.placements[index];
    const shape = rotateCells(piece.cells, placement.rotation);
    const top = bottom - (Math.max(...shape.map(([,y]) => y)) + 1) * cell;
    bottom = top - 10;
    return {piece, index, top, shape, column: placement.column};
  });
  const settled = solved ? simulateDrops(board.model, board.placements).cells : [];
  return <svg className="chapter-drop-chute" viewBox="0 0 146 394" role="img" aria-label={`${board.label}槽：三块依次落下${solved ? "，已落定" : "，下方接收框为空"}`}>
    <path d={`M ${left-5} 8 V 373 H ${left+71} V 8`} fill="none" stroke="#a38b5b" strokeWidth="2" />
    {[0,1,2,3].map(x => <line key={x} x1={left+x*cell} x2={left+x*cell} y1="8" y2={floorTop} stroke="#7f9c94" strokeOpacity=".25" strokeDasharray="3 5"/>)}
    {!solved && hanging.map(({piece,index,top,shape,column}) => <g key={piece.id} data-hanging-piece={piece.id}>
      <text x="22" y={top+15} textAnchor="middle" fill="#c9b682" fontSize="16">{["①","②","③"][index]}</text>
      {shape.map(([x,y]) => <rect key={`${x},${y}`} x={left+(column+x)*cell+1} y={top+y*cell+1} width={cell-2} height={cell-2} rx="2" fill={palette[index]} stroke="#e9dcba" strokeWidth=".8"/>)}
    </g>)}
    <text x="73" y="249" textAnchor="middle" fill="#c9b682" fontSize="17">↓</text>
    {Array.from({length:15},(_,i) => {const x=i%3,y=Math.floor(i/3);const filled=settled.some(c=>c[0]===x&&c[1]===y);return <rect key={i} data-settled-cell={filled ? `${x},${y}` : undefined} x={left+x*cell} y={floorTop+y*cell} width={cell} height={cell} fill={filled ? "#dbb972" : "#102d30"} stroke={filled ? "#f3d99c" : "#385558"} strokeWidth="1"/>;})}
    <rect x={left-1} y={floorTop-1} width={3*cell+2} height={5*cell+2} fill="none" stroke="#c9ad73" strokeWidth="2"/>
    <text x="73" y="389" textAnchor="middle" fill="#b9b59b" fontSize="11">{solved ? "落定轮廓" : "接收框"}</text>
  </svg>;
}
export default function DropPuzzleView({puzzle,input,solved,change}: {puzzle:DropPuzzle; input:DropInput;solved:boolean;change:(input:DropInput)=>void}) {
  const setDigit=(index:number,digit:number)=>change({kind:"drop",predictions:input.predictions.map((v,i)=>i===index?digit:v)});
  return <div className="chapter-shape-chutes">
    {puzzle.boards.map((board,i)=><section className="chapter-shape-chute" key={board.id}>
      <h3>{board.label} 槽</h3>
      <DropChute board={board} solved={solved}/>
      <label htmlFor={`digit-${board.id}`}>落定后的数字</label>
      <div className="chapter-digit-dial">
        <button type="button" aria-label={`${board.label}数字减一`} disabled={solved} onClick={()=>setDigit(i,input.predictions[i]<0?9:(input.predictions[i]+9)%10)}>−</button>
        <input id={`digit-${board.id}`} aria-label={`${board.label}最终数字`} inputMode="numeric" pattern="[0-9]" maxLength={1} placeholder="?" value={input.predictions[i]<0?"":String(input.predictions[i])} disabled={solved} onChange={e=>{if(/^\d?$/.test(e.target.value))setDigit(i,e.target.value===""?-1:Number(e.target.value));}}/>
        <button type="button" aria-label={`${board.label}数字加一`} disabled={solved} onClick={()=>setDigit(i,(input.predictions[i]+1)%10)}>＋</button>
      </div>
    </section>)}
  </div>;
}
