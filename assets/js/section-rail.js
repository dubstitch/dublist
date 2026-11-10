/*
  Wade List | Section navigator
  A discreet liquid-glass progress spine with a full accessible index.
  The document owns scrolling. The navigator never hijacks wheel/touch.
*/
export function initSectionRail({sections, title="Wishlist sections", mode="collections", listenForCategoryChanges=false}={}) {
  const items=(sections||[]).map(entry=>({
    id:entry.id,
    label:entry.label,
    el:document.getElementById(entry.id)
  })).filter(item=>item.id&&item.el);
  if(items.length<2)return null;
  document.querySelector(".wl-section-rail")?.remove();

  const nav=document.createElement("nav");
  nav.className="wl-section-rail";
  nav.dataset.mode=mode;
  nav.setAttribute("aria-label",title);
  nav.dataset.railCount=String(items.length);
  const compact=document.createElement("div");
  compact.className="wl-section-rail__compact";

  const current=document.createElement("span");
  current.className="wl-section-rail__current";
  current.setAttribute("aria-label","Section progress");

  const spine=document.createElement("div");
  spine.className="wl-section-rail__spine";
  spine.setAttribute("role","group");
  spine.setAttribute("aria-label","Quick section jumps");

  const expand=document.createElement("button");
  expand.type="button";
  expand.className="wl-section-rail__expand";
  expand.setAttribute("aria-expanded","false");
  expand.setAttribute("aria-controls","wlSectionIndex");
  expand.setAttribute("aria-label","Open the section index");
  expand.title="See every section";
  expand.innerHTML='<span aria-hidden="true" class="wl-section-rail__expand-symbol"></span>';

  const next=document.createElement("div");
  next.className="wl-section-rail__next";
  next.setAttribute("aria-hidden","true");

  compact.append(current,spine,expand,next);
  const panel=document.createElement("div");
  panel.className="wl-section-rail__panel";
  panel.id="wlSectionIndex";
  panel.setAttribute("aria-label",title);
  panel.hidden=true;
  const panelHeading=document.createElement("div");
  panelHeading.className="wl-section-rail__panel-top";
  const panelTitle=document.createElement("div");
  panelTitle.className="wl-section-rail__panel-title";
  panelTitle.textContent=title;
  const close=document.createElement("button");
  close.type="button";
  close.className="wl-section-rail__close";
  close.setAttribute("aria-label","Close the section index");
  close.textContent="×";
  panelHeading.append(panelTitle,close);
  const list=document.createElement("ol");
  list.className="wl-section-rail__list";
  const remaining=document.createElement("p");
  remaining.className="wl-section-rail__remaining";
  panel.append(panelHeading,list,remaining);

  const shade=document.createElement("button");
  shade.className="wl-section-rail__shade";
  shade.type="button";
  shade.setAttribute("aria-label","Close section index");
  shade.hidden=true;
  document.body.append(shade);
  nav.append(compact,panel);
  document.body.append(nav);

  let active=0,expanded=false,frame=0;
  const format=i=>String(i+1).padStart(2,"0");
  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
  const points=[],rows=[];

  function closePanel(restoreFocus=false){
    if(!expanded)return;
    expanded=false;
    panel.hidden=true;
    shade.hidden=true;
    nav.classList.remove("is-expanded");
    expand.setAttribute("aria-expanded","false");
    expand.setAttribute("aria-label","Open the section index");
    if(restoreFocus)expand.focus({preventScroll:true});
  }
  function openPanel(){
    if(expanded){closePanel(true);return;}
    expanded=true;
    panel.hidden=false;
    shade.hidden=false;
    nav.classList.add("is-expanded");
    expand.setAttribute("aria-expanded","true");
    expand.setAttribute("aria-label","Close the section index");
    const focused=rows[active]?.button||close;
    focused.focus({preventScroll:true});
  }
  function jump(index){
    const item=items[index];
    if(!item)return;
    update(index);
    closePanel();
    item.el.scrollIntoView({
      block:"start",
      behavior:reduced.matches?"instant":"smooth"
    });
  }
  function makeButton(i,compactMode){
    const btn=document.createElement("button");
    btn.type="button";
    btn.className=compactMode?"wl-section-rail__point":"wl-section-rail__item";
    btn.setAttribute("aria-controls",items[i].id);
    btn.setAttribute("aria-label",format(i)+" of "+items.length+": "+items[i].label);
    btn.title=items[i].label;
    if(!compactMode){
      const number=document.createElement("span");
      number.className="wl-section-rail__number";
      number.textContent=format(i);
      const name=document.createElement("span");
      name.className="wl-section-rail__name";
      name.textContent=items[i].label;
      btn.append(number,name);
    }else{
      const dot=document.createElement("span");
      dot.className="wl-section-rail__dot";
      dot.setAttribute("aria-hidden","true");
      btn.append(dot);
    }
    btn.addEventListener("click",()=>jump(i));
    return btn;
  }
  items.forEach((item,i)=>{
    const button=makeButton(i,true);
    spine.append(button);
    points.push(button);
    const li=document.createElement("li");
    const fullButton=makeButton(i,false);
    li.append(fullButton);
    list.append(li);
    rows.push({li,button:fullButton});
  });
  function update(i){
    const nextIndex=Math.max(0,Math.min(items.length-1,i));
    if(!Number.isFinite(nextIndex))return;
    active=nextIndex;
    current.textContent=format(active)+" / "+String(items.length).padStart(2,"0");
    current.title=items[active].label;
    nav.style.setProperty("--wl-section-progress",(active/(items.length-1)*100)+"%");
    points.forEach((btn,j)=>{
      btn.dataset.state=j<active?"complete":j===active?"current":"upcoming";
      if(j===active)btn.setAttribute("aria-current","step");
      else btn.removeAttribute("aria-current");
    });
    rows.forEach((row,j)=>{
      row.li.dataset.state=j<active?"complete":j===active?"current":"upcoming";
      if(j===active)row.button.setAttribute("aria-current","step");
      else row.button.removeAttribute("aria-current");
    });
    const nextItem=items[active+1];
    next.textContent=nextItem?"Next · "+nextItem.label:"All sections explored";
    const left=items.length-active-1;
    remaining.textContent=left===0?"You have reached the final section.":left+" "+(left===1?"section":"sections")+" still to explore";
  }
  function detect(){
    frame=0;
    if(document.documentElement.classList.contains("modal-open"))return;
    const headerHeight=document.querySelector(".site-header")?.getBoundingClientRect().height||72;
    const probe=headerHeight+Math.max(30,(window.innerHeight-headerHeight)*.41);
    let closest=0,distance=Infinity;
    items.forEach((item,i)=>{
      const rect=item.el.getBoundingClientRect();
      if(rect.top<=probe&&rect.bottom>probe){
        closest=i;distance=-1;return;
      }
      if(distance===-1)return;
      const d=Math.abs((rect.top+rect.bottom)/2-probe);
      if(d<distance){distance=d;closest=i;}
    });
    if(closest!==active)update(closest);
  }
  function requestDetect(){
    if(frame)return;
    frame=requestAnimationFrame(detect);
  }
  expand.addEventListener("click",openPanel);
  close.addEventListener("click",()=>closePanel(true));
  shade.addEventListener("click",()=>closePanel(true));
  document.addEventListener("keydown",event=>{
    if(!expanded)return;
    if(event.key==="Escape"){
      event.preventDefault();
      closePanel(true);
    }
    if(event.key==="Tab"){
      const controls=[close,...rows.map(row=>row.button)];
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
  if(listenForCategoryChanges){
    document.addEventListener("wishlist:sectionchange",event=>{
      const i=items.findIndex(item=>item.id===event.detail?.id);
      if(i>=0)update(i);
    });
  }
  window.addEventListener("scroll",requestDetect,{passive:true});
  window.addEventListener("scrollend",requestDetect,{passive:true});
  window.addEventListener("resize",requestDetect,{passive:true});
  window.addEventListener("orientationchange",requestDetect,{passive:true});
  window.addEventListener("pageshow",requestDetect);
  if("IntersectionObserver" in window){
    const observer=new IntersectionObserver(requestDetect,{rootMargin:"-15% 0px -45% 0px",threshold:[0,.1,.5]});
    items.forEach(item=>observer.observe(item.el));
  }
  update(0);
  requestAnimationFrame(requestDetect);
  return {nav,jump,update,close:()=>closePanel()};
}
