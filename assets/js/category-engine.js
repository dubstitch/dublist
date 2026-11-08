/* A single document scroll cross-fades the wishlist categories on every screen. */
function hexToRgb(value) {
 const h=value.trim().replace("#","");
 const full=h.length===3?h.split("").map(c=>c+c).join(""):h;
 const v=parseInt(full,16);
 return [(v>>16)&255,(v>>8)&255,v&255];
}
export function initCategoryEngine({trackEl,stageEl,layers}) {
 if(!layers.length)return;
 const reduced=matchMedia("(prefers-reduced-motion: reduce)");
 const styles=getComputedStyle(document.documentElement);
 const colors=layers.map(layer=>hexToRgb(styles.getPropertyValue("--color-"+layer.dataset.bg).trim()||"#f4efe9"));
 const header=document.querySelector(".site-header");
 let panelHeight=1,ticking=false,active=-1;
 function paint() {
  ticking=false;
  const hh=header?.getBoundingClientRect().height||72;
  const progress=Math.max(0,Math.min(layers.length-1,(hh-trackEl.getBoundingClientRect().top)/panelHeight));
  const first=Math.floor(progress),t=progress-first;
  const chosen=reduced.matches?Math.round(progress):(t<.5?first:Math.min(first+1,layers.length-1));
  layers.forEach((layer,i)=>{
   let opacity=0;
   if(reduced.matches)opacity=i===chosen?1:0;
   else if(i===first)opacity=1-t;
   else if(i===first+1)opacity=t;
   layer.style.opacity=String(opacity);
   layer.style.pointerEvents=i===chosen?"auto":"none";
   if(i===chosen){layer.removeAttribute("aria-hidden");layer.inert=false;}
   else{layer.setAttribute("aria-hidden","true");layer.inert=true;}
  });
  active=chosen;
  const a=colors[first],b=colors[Math.min(first+1,colors.length-1)];
  const f=reduced.matches?0:t;
  stageEl.style.backgroundColor="rgb("+a.map((v,i)=>Math.round(v+(b[i]-v)*f)).join(",")+")";
 }
 function queue(){if(ticking)return;ticking=true;requestAnimationFrame(paint);}
 function size(){
  panelHeight=Math.max(200,window.innerHeight-(header?.getBoundingClientRect().height||72));
  stageEl.style.setProperty("--category-view-height",panelHeight+"px");
  trackEl.style.height=(panelHeight*layers.length)+"px";
  queue();
 }
 function hash(){
  const id=decodeURIComponent(location.hash.slice(1));
  const i=layers.findIndex(layer=>layer.id===id);
  if(i<0)return;
  const top=trackEl.getBoundingClientRect().top+window.scrollY-(header?.getBoundingClientRect().height||72);
  window.scrollTo({top:top+i*panelHeight,behavior:reduced.matches?"instant":"smooth"});
  queue();
 }
 window.addEventListener("scroll",queue,{passive:true});
 window.addEventListener("resize",size,{passive:true});
 window.addEventListener("hashchange",hash);
 size();
 if(location.hash)requestAnimationFrame(()=>requestAnimationFrame(hash));
}
