"use client";
import { useEffect, useState } from "react";

export function TutorialSpotlight({selector, text}: {selector: string; text: string}) {
  const [rect, setRect] = useState<{top: number; left: number; width: number; height: number} | null>(null);
  useEffect(() => {
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) {setRect(null); return;}
    target.scrollIntoView({block: "center"});
    target.focus({preventScroll: true});
    const update = () => {const r = target.getBoundingClientRect(); setRect(previous => previous && previous.top === r.top && previous.left === r.left && previous.width === r.width && previous.height === r.height ? previous : {top: r.top, left: r.left, width: r.width, height: r.height});};
    update();
    // Images and fonts can move the target without resizing the document.
    let frame = 0;
    const follow = () => {update(); frame = requestAnimationFrame(follow);};
    frame = requestAnimationFrame(follow);
    const observer = new ResizeObserver(update); observer.observe(document.body);
    window.addEventListener("scroll", update, true); window.addEventListener("resize", update);
    const trap = (event: KeyboardEvent) => {if (event.key === "Tab") {event.preventDefault(); target.focus();}};
    window.addEventListener("keydown", trap);
    return () => {cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("scroll", update, true); window.removeEventListener("resize", update); window.removeEventListener("keydown", trap);};
  }, [selector, text]);
  if (!rect) return null;
  return <div className="tutorial-spotlight">
    <div className="tutorial-shade" style={{inset: `0 0 auto 0`, height: Math.max(0,rect.top-5)}} />
    <div className="tutorial-shade" style={{top: rect.top+rect.height+5, bottom: 0, left: 0, right: 0}} />
    <div className="tutorial-shade" style={{top: rect.top-5, height: rect.height+10, left: 0, width: Math.max(0,rect.left-5)}} />
    <div className="tutorial-shade" style={{top: rect.top-5, height: rect.height+10, left: rect.left+rect.width+5, right: 0}} />
    <div className="tutorial-highlight" style={{top: rect.top-5,left: rect.left-5,width:rect.width+10,height:rect.height+10}} />
    <p className="tutorial-spotlight-copy" role="status" style={{top: Math.max(12, rect.top-92)}}>{text}</p>
  </div>;
}
