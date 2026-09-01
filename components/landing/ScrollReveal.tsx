'use client';
import {ReactNode,useLayoutEffect,useMemo,useRef} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
type Props={children:ReactNode;baseOpacity?:number;baseRotation?:number;blurStrength?:number;className?:string};
export default function ScrollReveal({children,baseOpacity=.15,baseRotation=2,blurStrength=4,className=''}:Props){const ref=useRef<HTMLHeadingElement>(null);const words=useMemo(()=>String(children).split(/(\s+)/).map((word,i)=>/^\s+$/.test(word)?word:<span className="np-word" key={i}>{word}</span>),[children]);useLayoutEffect(()=>{const el=ref.current;if(!el)return;const ctx=gsap.context(()=>{gsap.fromTo(el,{rotate:baseRotation},{rotate:0,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom bottom',scrub:true}});gsap.fromTo(el.querySelectorAll('.np-word'),{opacity:baseOpacity,filter:`blur(${blurStrength}px)`},{opacity:1,filter:'blur(0px)',stagger:.04,ease:'none',scrollTrigger:{trigger:el,start:'top bottom-=15%',end:'bottom bottom',scrub:true}})},el);return()=>ctx.revert()},[baseOpacity,baseRotation,blurStrength]);return <h2 ref={ref} className={className}>{words}</h2>}
