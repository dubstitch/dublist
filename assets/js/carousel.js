/*
  Wade List fluid product carousels.
  Native horizontal scroll + centered CSS snap eliminates transform drift on
  iPhone Safari, orientation changes and track resizing. Buttons, keyboard,
  touch swipes, mouse drag and explicit pagination all share one index.
*/
export function initCarousels(root=document){
  root.querySelectorAll("[data-carousel]").forEach(carousel=>{
    const wrap=carousel.closest(".category-layer__carousel-wrap");
    const track=carousel.querySelector("[data-carousel-track]");
    const cards=[...(track?.querySelectorAll(".carousel__card")||[])];
    const prev=wrap?.querySelector("[data-carousel-prev]");
    const next=wrap?.querySelector("[data-carousel-next]");
    const dots=wrap?.querySelector("[data-carousel-dots]");
    if(!track||!cards.length||!prev||!next||!dots)return;

    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
    let current=0,scheduled=false,dragging=false,pointer=null,suppressClick=false;
    const clamp=i=>Math.max(0,Math.min(cards.length-1,i));
    const center=i=>cards[i].offsetLeft+cards[i].offsetWidth/2-carousel.clientWidth/2;
    function closest(){
      const midpoint=carousel.scrollLeft+carousel.clientWidth/2;
      let best=Infinity,index=0;
      cards.forEach((card,i)=>{
        const distance=Math.abs((card.offsetLeft+card.offsetWidth/2)-midpoint);
        if(distance<best){best=distance;index=i;}
      });
      return index;
    }
    function paint(){
      prev.disabled=current===0;
      next.disabled=current===cards.length-1;
      dots.querySelectorAll(".carousel__dot").forEach((dot,i)=>{
        if(i===current)dot.setAttribute("aria-current","true");
        else dot.removeAttribute("aria-current");
      });
    }
    function go(i,behavior="smooth"){
      current=clamp(i);
      paint();
      carousel.scrollTo({left:Math.max(0,center(current)),behavior:reduced.matches?"instant":behavior});
    }
    function sync(){
      scheduled=false;
      if(dragging)return;
      const index=closest();
      if(index!==current){current=index;paint();}
    }
    function schedule(){
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(sync);
    }

    dots.replaceChildren();
    cards.forEach((card,i)=>{
      card.style.removeProperty("scroll-snap-align");
      const dot=document.createElement("button");
      dot.type="button";
      dot.className="carousel__dot";
      dot.setAttribute("aria-label","Show product "+(i+1)+" of "+cards.length);
      dot.addEventListener("click",()=>go(i));
      dots.append(dot);
    });
    function measure(){
      if(!carousel.isConnected)return;
      carousel.style.setProperty("--viewport-width",carousel.clientWidth+"px");
      carousel.style.setProperty("--card-width",cards[0].offsetWidth+"px");
      requestAnimationFrame(()=>go(current,"instant"));
    }
    prev.addEventListener("click",()=>go(current-1));
    next.addEventListener("click",()=>go(current+1));
    carousel.addEventListener("scroll",schedule,{passive:true});
    carousel.addEventListener("scrollend",sync,{passive:true});
    carousel.addEventListener("keydown",event=>{
      if(!event.target.closest(".carousel__card")&&!event.target.closest(".carousel"))return;
      if(event.key==="ArrowRight"){event.preventDefault();go(current+1);}
      else if(event.key==="ArrowLeft"){event.preventDefault();go(current-1);}
      else if(event.key==="Home"){event.preventDefault();go(0);}
      else if(event.key==="End"){event.preventDefault();go(cards.length-1);}
    });

    // Touch is handled natively by the browser. Mouse/pen can drag in the
    // same direction without accidentally opening a product card.
    carousel.addEventListener("pointerdown",event=>{
      if(event.pointerType==="touch"||event.button!==0)return;
      pointer={id:event.pointerId,x:event.clientX,y:event.clientY,left:carousel.scrollLeft};
      dragging=false;
    });
    carousel.addEventListener("pointermove",event=>{
      if(!pointer||event.pointerId!==pointer.id)return;
      const dx=event.clientX-pointer.x;
      const dy=event.clientY-pointer.y;
      if(!dragging&&Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)){
        dragging=true;
        carousel.classList.add("is-dragging");
        try{carousel.setPointerCapture(event.pointerId);}catch(_){}
      }
      if(!dragging)return;
      event.preventDefault();
      carousel.scrollLeft=pointer.left-dx;
    });
    function finish(event){
      if(!pointer||event.pointerId!==pointer.id)return;
      const wasDragging=dragging;
      pointer=null;
      dragging=false;
      carousel.classList.remove("is-dragging");
      try{if(carousel.hasPointerCapture(event.pointerId))carousel.releasePointerCapture(event.pointerId);}catch(_){}
      if(wasDragging){
        suppressClick=true;
        go(closest());
        setTimeout(()=>{suppressClick=false;},0);
      }
    }
    carousel.addEventListener("pointerup",finish);
    carousel.addEventListener("pointercancel",finish);
    carousel.addEventListener("click",event=>{
      if(!suppressClick)return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },true);
    if("ResizeObserver" in window)new ResizeObserver(measure).observe(carousel);
    else window.addEventListener("resize",measure,{passive:true});
    reduced.addEventListener?.("change",()=>go(current,"instant"));
    paint();
    measure();
  });
}
