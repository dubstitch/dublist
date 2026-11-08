/* Wade List crossfade navigation
 * Scrolling is native. A sticky stage swaps fully composed categories in place.
 * Transitions happen on category changes, never at an arbitrary 50% opacity
 * where two sets of titles and products could remain piled on top of each other.
 */
function colorToken(layer) {
 const token="--color-"+layer.dataset.bg;
 return getComputedStyle(document.documentElement).getPropertyValue(token).trim()||"#f4efe9";
}
export function initCategoryEngine({trackEl,stageEl,layers}) {
 if(!layers.length)return;
 const header=document.querySelector(".site-header");
 const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
 let stageHeight=0,step=0,screenWidth=0,active=-1,queued=false;
 const headerHeight=()=>header?.getBoundingClientRect().height||72;

 function select(index) {
  const next=Math.max(0,Math.min(layers.length-1,index));
  if(next===active)return;
  layers.forEach((layer,i)=>{
   const isActive=i===next;
   layer.classList.toggle("is-current",isActive);
   layer.inert=!isActive;
   if(isActive)layer.removeAttribute("aria-hidden");
   else layer.setAttribute("aria-hidden","true");
  });
  active=next;
  stageEl.style.backgroundColor=colorToken(layers[active]);
 }
 function update(){
  queued=false;
  if(!step)return;
  const scrollIntoTrack=headerHeight()-trackEl.getBoundingClientRect().top;
  // Switch after crossing two-thirds of the distance to the next collection.
  // CSS performs one complete crossfade rather than leaving sections overlaid.
  const index=Math.floor((scrollIntoTrack/step)+.36);
  select(index);
 }
 function queue(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(update);
 }
 function measure(){
  // Stable CSS 100svh avoids toolbar-induced jumps on mobile Safari.
  stageHeight=stageEl.getBoundingClientRect().height;
  step=Math.max(140,Math.round(stageHeight*.78));
  trackEl.style.height=Math.ceil(stageHeight+(layers.length-1)*step)+"px";
  screenWidth=window.innerWidth;
  queue();
 }
 function onResize(){
  // Collapsing/expanding iOS browser controls can change innerHeight while
  // scrolling. Do not rewrite the track on those visual viewport changes.
  if(Math.abs(window.innerWidth-screenWidth)>3)requestAnimationFrame(measure);
  else queue();
 }
 function jumpToHash(){
  let id="";
  try{id=decodeURIComponent(window.location.hash.slice(1));}
  catch{id=window.location.hash.slice(1);}
  const index=layers.findIndex(layer=>layer.id===id);
  if(index<0)return;
  const documentTop=trackEl.getBoundingClientRect().top+window.scrollY;
  const destination=documentTop-headerHeight()+index*step;
  window.scrollTo({top:Math.max(0,destination),behavior:reduced.matches?"instant":"smooth"});
  select(index);
 }
 layers[0].classList.add("is-current");
 layers[0].inert=false;
 layers[0].removeAttribute("aria-hidden");
 active=0;
 stageEl.style.backgroundColor=colorToken(layers[0]);
 window.addEventListener("scroll",queue,{passive:true});
 window.addEventListener("resize",onResize,{passive:true});
 window.addEventListener("orientationchange",()=>requestAnimationFrame(measure),{passive:true});
 window.addEventListener("hashchange",jumpToHash);
 reduced.addEventListener?.("change",queue);
 measure();
 if(window.location.hash)requestAnimationFrame(()=>requestAnimationFrame(jumpToHash));
}
