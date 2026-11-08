/* Wade List category transitions.
 * One native document scroll, stable viewport sizing, no nested scroll lock.
 * Critically, mobile browser chrome collapsing must not resize the track. */
function hexToRgb(value) {
 const h=value.trim().replace("#","");
 const full=h.length===3?h.split("").map(c=>c+c).join(""):h;
 const v=parseInt(full,16);
 return [(v>>16)&255,(v>>8)&255,v&255];
}

export function initCategoryEngine({trackEl,stageEl,layers}) {
 if(!layers.length)return;
 const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)");
 const rootStyles=getComputedStyle(document.documentElement);
 const colors=layers.map(layer=>hexToRgb(rootStyles.getPropertyValue("--color-"+layer.dataset.bg).trim()||"#f4efe9"));
 const header=document.querySelector(".site-header");
 const view=()=>header?.getBoundingClientRect().height||72;
 let stageHeight=0, step=0, ticking=false, screenWidth=0;

 function paint(){
  ticking=false;
  if(!stageHeight)return;
  const y=(view()-trackEl.getBoundingClientRect().top)/step;
  const progress=Math.max(0,Math.min(layers.length-1,y));
  const first=Math.floor(progress);
  const blend=progress-first;
  const chosen=reduceMotion.matches?Math.round(progress):(blend<.5?first:Math.min(first+1,layers.length-1));
  layers.forEach((layer,i)=>{
   let opacity=0;
   if(reduceMotion.matches)opacity=i===chosen?1:0;
   else if(i===first)opacity=1-blend;
   else if(i===first+1)opacity=blend;
   layer.style.opacity=String(opacity);
   layer.style.pointerEvents=i===chosen?"auto":"none";
   if(i===chosen){
    layer.inert=false;
    layer.removeAttribute("aria-hidden");
   }else{
    layer.inert=true;
    layer.setAttribute("aria-hidden","true");
   }
  });
  const a=colors[first],b=colors[Math.min(first+1,colors.length-1)];
  const t=reduceMotion.matches?0:blend;
  stageEl.style.backgroundColor="rgb("+a.map((v,i)=>Math.round(v+(b[i]-v)*t)).join(",")+")";
 }
 function queuePaint(){if(ticking)return;ticking=true;requestAnimationFrame(paint);}
 function measure(){
  /* CSS 100svh stays stable when iOS Safari's address bar collapses.
   * Never use changing window.innerHeight as the scrolling ruler. */
  stageHeight=Math.max(220,stageEl.getBoundingClientRect().height);
  step=Math.max(160,Math.round(stageHeight*.67));
  trackEl.style.height=Math.round(stageHeight+step*(layers.length-1))+"px";
  screenWidth=window.innerWidth;
  queuePaint();
 }
 function onResize(){
  /* Browser chrome on phones changes viewport height while scrolling.
   * Only a width/orientation change requires recalculating the layout. */
  if(Math.abs(window.innerWidth-screenWidth)>3)requestAnimationFrame(measure);
  else queuePaint();
 }
 function goToHash(){
  const id=decodeURIComponent(location.hash.slice(1));
  const index=layers.findIndex(layer=>layer.id===id);
  if(index<0)return;
  const offset=trackEl.getBoundingClientRect().top+window.scrollY-view();
  window.scrollTo({top:offset+index*step,behavior:reduceMotion.matches?"instant":"smooth"});
  queuePaint();
 }
 window.addEventListener("scroll",queuePaint,{passive:true});
 window.addEventListener("resize",onResize,{passive:true});
 window.addEventListener("orientationchange",()=>requestAnimationFrame(measure));
 window.addEventListener("hashchange",goToHash);
 measure();
 if(location.hash)requestAnimationFrame(()=>requestAnimationFrame(goToHash));
}
