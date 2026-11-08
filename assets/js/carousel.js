/* Horizontal transform carousel derived from the WCFCC track pattern.
 * No inner vertical scrollbar and no competing nested page scrolling. */
export function initCarousels(root=document) {
 root.querySelectorAll("[data-carousel]").forEach(carousel=>{
  const wrap=carousel.closest(".category-layer__carousel-wrap");
  const track=carousel.querySelector("[data-carousel-track]");
  const cards=[...(track?.querySelectorAll(".carousel__card")||[])];
  const prev=wrap?.querySelector("[data-carousel-prev]");
  const next=wrap?.querySelector("[data-carousel-next]");
  const dots=wrap?.querySelector("[data-carousel-dots]");
  if(!track||!cards.length||!prev||!next||!dots)return;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  let current=0,positions=1;
  function dimensions(){
   const gap=parseFloat(getComputedStyle(track).gap)||0;
   const width=cards[0].offsetWidth||200;
   const visible=Math.max(1,Math.floor((carousel.clientWidth+gap)/(width+gap)));
   positions=Math.max(1,cards.length-visible+1);
   current=Math.min(current,positions-1);
   dots.replaceChildren();
   for(let i=0;i<positions;i++){
    const dot=document.createElement("button");
    dot.type="button";dot.className="carousel__dot";
    dot.setAttribute("aria-label","Show carousel item "+(i+1)+" of "+positions);
    dot.addEventListener("click",()=>go(i));
    dots.append(dot);
   }
   paint();
  }
  function paint(){
   current=Math.max(0,Math.min(positions-1,current));
   const offset=cards[current].offsetLeft-cards[0].offsetLeft;
   track.style.transitionDuration=reduced.matches?"0ms":".48s";
   track.style.transform="translate3d(-"+offset+"px,0,0)";
   prev.disabled=current===0;
   next.disabled=current===positions-1;
   dots.querySelectorAll(".carousel__dot").forEach((dot,i)=>{
    if(i===current)dot.setAttribute("aria-current","true");else dot.removeAttribute("aria-current");
   });
  }
  function go(i){current=i;paint();}
  prev.addEventListener("click",()=>go(current-1));
  next.addEventListener("click",()=>go(current+1));
  let startX=null,startY=null;
  carousel.addEventListener("touchstart",e=>{
   startX=e.changedTouches[0].clientX;
   startY=e.changedTouches[0].clientY;
  },{passive:true});
  carousel.addEventListener("touchend",e=>{
   if(startX===null)return;
   const dx=e.changedTouches[0].clientX-startX;
   const dy=e.changedTouches[0].clientY-startY;
   if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.35)go(current+(dx<0?1:-1));
   startX=null;startY=null;
  },{passive:true});
  carousel.addEventListener("keydown",e=>{
   if(e.target.closest(".carousel__card")&&e.key==="ArrowRight"){e.preventDefault();go(current+1);}
   if(e.target.closest(".carousel__card")&&e.key==="ArrowLeft"){e.preventDefault();go(current-1);}
  });
  if("ResizeObserver" in window)new ResizeObserver(dimensions).observe(carousel);
  else window.addEventListener("resize",dimensions,{passive:true});
  dimensions();
 });
}
