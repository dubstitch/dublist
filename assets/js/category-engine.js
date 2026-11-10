/*
 Wade List collection navigation
 Native full-page CSS scroll snapping owns movement; JavaScript only tracks
 the visible section and handles direct #category links and rotation.
 No wheel interception, synthetic track height, scroll locks or fading stacks.
*/
export function initCategoryEngine({trackEl,stageEl,layers}){
  if(!layers.length)return;
  const html=document.documentElement;
  // The footer exists before the async product data loads. If snapping is
  // already enabled the browser can latch to the footer and start at the end.
  html.classList.remove("snap-ready");
  try{history.scrollRestoration="manual";}catch(_){}
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
    document.dispatchEvent(new CustomEvent("wishlist:sectionchange",{
      detail:{index,id:layers[index].id}
    }));
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
  // Safari occasionally updates the scroll root without delivering the
  // expected window scroll event after a programmatic snap. The observer
  // tracks category visibility independently of those events.
  if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(()=>{
      if(!html.classList.contains("modal-open"))detect();
    },{root:null,rootMargin:"-"+headerHeight()+"px 0px -35% 0px",threshold:[0,.01,.3]});
    layers.forEach(layer=>observer.observe(layer));
  }
  document.addEventListener("scrollend",()=>{scheduled=false;detect();},{capture:true,passive:true});
  window.addEventListener("scrollend",()=>{scheduled=false;detect();},{passive:true});
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
  if(!window.location.hash)window.scrollTo({top:0,behavior:"instant"});
  // Enable native snap only after all nine actual sections have been rendered
  // and the first category is at the top of the viewport.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!window.location.hash)window.scrollTo({top:0,behavior:"instant"});
    html.classList.add("snap-ready");
    html.dataset.wishlistReady="true";
    if(window.location.hash)jumpHash();
    else queue();
  }));
}
