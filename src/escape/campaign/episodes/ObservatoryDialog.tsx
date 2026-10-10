import {useEffect,useRef,type ReactNode} from 'react';
import './observatoryExploration.css';

/** One focus scope and one bounded work area for the apparatus and its controls. */
export function ObservatoryDialog({kind,title,returnLabel,onClose,children}:{
 kind:'chart'|'disc'|'telescope';title:string;returnLabel:string;onClose:()=>void;children:ReactNode;
}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;
  const roots=typeof document==='undefined'?[]:[document.documentElement,document.body].filter(el=>el?.style);
  const overflow=roots.map(el=>el.style.overflow);
  roots.forEach(el=>{el.style.overflow='hidden';});
  dialog?.showModal?.();
  return ()=>{
   dialog?.close?.();
   roots.forEach((el,i)=>{el.style.overflow=overflow[i];});
   queueMicrotask(()=>{
    if(typeof document==='undefined')return;
    const trigger=document.querySelector<HTMLElement>(`[aria-label="${returnLabel}"]`);
    if(trigger&&!trigger.closest?.('[inert]'))trigger.focus({preventScroll:true});
   });
  };
 },[returnLabel]);
 return <dialog ref={ref} className={`observatory-puzzle-dialog observatory-dialog-${kind}`} aria-label={title}
  onCancel={event=>{event.preventDefault();onClose();}}>
  <header><h2>{title}</h2><button autoFocus aria-label="关闭近景" onClick={onClose}>回到观测室</button></header>
  <div className="observatory-workarea">{children}</div>
 </dialog>;
}
