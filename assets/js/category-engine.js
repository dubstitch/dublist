/*
 Wade List collection navigation
 Native full-page CSS scroll snapping owns movement; JavaScript only tracks
 the visible section and handles direct #category links and rotation.
 No wheel interception, synthetic track height, scroll locks or fading stacks.
*/
export function initCategoryEngine({trackEl,stageEl,layers}){
  if(!layers.length)return;
  const header=document.querySelector(".site-header");
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  let active=0,scheduled=false,previousWidth=window.innerWidth;
  const headerHeight=()=>header?.getBoundingClientRect().height||72;
  const clamp=i=>Math.max(0,Math.min(layers.length-1,i));

  // All categories are real, reachable document sections, not inert overlays.
  trackEl.style.removeProperty("height");
  stageEl.style.removeProperty("background-color");
  layers.forEach((layer,i)=>{
    layer.inert=false;
    layer.removeAttribute("aria-hidden");
    layer.dataset.categoryNumber=String(i+1);
  });
  function select(i){
    const index=clamp(i);
    if(active===index&&layers[index].classList.contains("is-current"))return;
    active=index;
    layers.forEach((layer,j)=>layer.classList.toggle("is-current",j===index));
  }
  function detect(){
    scheduled=false;
    if(document.documentElement.classList.contains("modal-open"))return;
    const probe=headerHeight()+Math.max(28,(window.innerHeight-headerHeight())*.44);
    let choice=-1,best=Infinity;
    layers.forEach((layer,i)=>{
      const rect=layer.getBoundingClientRect();
      if(rect.top<=probe&&rect.bottom>probe){choice=i;best=-1;return;}
      const distance=Math.abs((rect.top+rect.bottom)/2-probe);
      if(best!==-1&&distance<best){best=distance;choice=i;}
    });
    if(choice>=0)select(choice);
  }
  function queue(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(detect);
  }
  function goto(i,behavior){
    const layer=layers[clamp(i)];
    if(!layer)return;
    select(i);
    layer.scrollIntoView({
      block:"start",
      behavior:reduced.matches?"instant":(behavior||"instant")
    });
  }
  function jumpHash(){
    const hash=window.location.hash.slice(1);
    let id=hash;
    try{id=decodeURIComponent(hash);}catch(_){}
    const index=layers.findIndex(layer=>layer.id===id);
    if(index>=0)goto(index,"smooth");
  }
  window.addEventListener("scroll",queue,{passive:true});
  window.addEventListener("resize",()=>{
    // iOS chrome can change visual height repeatedly without orientation.
    // Never bounce the reader to another collection on a toolbar resize.
    if(Math.abs(window.innerWidth-previousWidth)>4){
      previousWidth=window.innerWidth;
      requestAnimationFrame(()=>goto(active,"instant"));
    }else queue();
  },{passive:true});
  window.addEventListener("hashchange",jumpHash);
  window.addEventListener("pageshow",queue);
  window.addEventListener("orientationchange",()=>{
    previousWidth=window.innerWidth;
    requestAnimationFrame(()=>requestAnimationFrame(()=>goto(active,"instant")));
  },{passive:true});
  select(0);
  queue();
  if(window.location.hash)requestAnimationFrame(()=>requestAnimationFrame(jumpHash));
}
