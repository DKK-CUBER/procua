'use client';
import {ReactNode,useLayoutEffect,useMemo,useRef} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
type Props={children:ReactNode;className?:string};
export default function ScrollFloat({children,className=''}:Props){const ref=useRef<HTMLHeadingElement>(null);const chars=useMemo(()=>String(children).split('').map((char,i)=><span className="np-char" key={i}>{char===' '?'\u00a0':char}</span>),[children]);useLayoutEffect(()=>{const el=ref.current;if(!el)return;const ctx=gsap.context(()=>{gsap.fromTo(el.querySelectorAll('.np-char'),{opacity:0,yPercent:100,scaleY:1.8,scaleX:.8,transformOrigin:'50% 0%'},{opacity:1,yPercent:0,scaleY:1,scaleX:1,duration:.8,ease:'back.out(1.7)',stagger:.015,scrollTrigger:{trigger:el,start:'top bottom-=10%',end:'bottom bottom-=20%',scrub:true}})},el);return()=>ctx.revert()},[]);return <h2 ref={ref} className={className}>{chars}</h2>}
