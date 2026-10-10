import { CompletionMotion } from './CompletionMotion';
/** A close-up's persistent acceptance latch; it reads only committed whole-puzzle state. */
export function CompletionMechanism({ milestone, done, label, light = false }: { milestone: string; done: boolean; label: string; light?: boolean }) {
  return <div className="completion-local" data-local-completion={milestone} data-complete={done}>
    <svg viewBox="0 0 240 76" role="img" aria-label={done ? label : light ? '装置的灯尚未点亮' : '机关锁栓尚未退开'}>
      <rect x="8" y="8" width="224" height="60" rx="9" fill="#405550" stroke="#b49e6a" strokeWidth="3"/>
      {[20,220].flatMap(x => [20,56].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#d5c18c"/>))}
      {light ? <CompletionMotion milestone={milestone} motion="light"><circle cx="120" cy="38" r="22" fill={done ? '#fbe39a' : '#576961'} stroke="#c8ae70" strokeWidth="4"/>{done && <path d="M110 38h20M120 28v20" stroke="#fff6c7" strokeWidth="4"/>}</CompletionMotion> : <>
        <path d="M66 24v29h21V24ZM152 24v29h21V24Z" fill="#776b50" stroke="#d6bf83" strokeWidth="3"/>
        <CompletionMotion milestone={milestone} motion="unlock"><g transform={done ? 'translate(-48 0)' : undefined}><rect x="72" y="32" width="105" height="14" rx="4" fill="#dfc285" stroke="#8b734d" strokeWidth="2"/><circle cx="111" cy="39" r="11" fill="#b59b66" stroke="#efdaa1" strokeWidth="3"/></g></CompletionMotion>
      </>}
    </svg>
    {done && <span>{label}</span>}
  </div>;
}
