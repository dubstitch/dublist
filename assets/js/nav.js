/* The shopper starts with Women or Men, then browses the real categories.
 * Nothing here pretends to be a retail storefront. */
const PAGES=[{name:"Women",file:"women.html",data:"women.json"},{name:"Men",file:"men.html",data:"men.json"}];
export function initNav(){
 const bar=document.querySelector("[data-announce-bar]");
 document.querySelector("[data-announce-close]")?.addEventListener("click",()=>{bar.hidden=true;});
 const menu=document.querySelector("[data-mega-menu]");
 const backdrop=document.querySelector("[data-mega-menu-backdrop]");
 const trigger=document.querySelector("[data-mobile-menu-trigger]");
 if(!menu||!backdrop||!trigger)return;
 let open=false,lastFocused=null;
 function setOpen(next){
  open=next;
  menu.dataset.open=String(open);
  backdrop.dataset.open=String(open);
  menu.inert=!open;
  trigger.setAttribute("aria-expanded",String(open));
  trigger.setAttribute("aria-label",open?"Close category menu":"Browse categories");
  if(open){lastFocused=document.activeElement;menu.querySelector("a")?.focus();}
  else if(lastFocused)lastFocused.focus();
 }
 menu.dataset.open="false";backdrop.dataset.open="false";menu.inert=true;
 trigger.setAttribute("aria-expanded","false");
 trigger.addEventListener("click",()=>setOpen(!open));
 backdrop.addEventListener("click",()=>setOpen(false));
 menu.addEventListener("click",e=>{if(e.target.closest("a"))setOpen(false);});
 document.addEventListener("keydown",e=>{
  if(!open)return;
  if(e.key==="Escape"){e.preventDefault();setOpen(false);}
  if(e.key==="Tab"){
   const links=[...menu.querySelectorAll('a[href]')];
   const first=links[0],last=links.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
 async function build(){
  const inner=menu.querySelector(".mega-menu__inner");
  if(!inner)return;
  const blocks=await Promise.all(PAGES.map(async page=>{
   const res=await fetch("data/"+page.data);
   if(!res.ok)throw Error("Could not load menu categories");
   const data=await res.json();
   const section=document.createElement("section");
   section.className="mega-menu__group";
   const h=document.createElement("h2"),head=document.createElement("a");
   head.href=page.file;head.textContent=page.name+" wishlist";
   h.append(head);section.append(h);
   const list=document.createElement("ul");
   data.categories.forEach(cat=>{
    const li=document.createElement("li"),a=document.createElement("a");
    a.href=page.file+"#"+encodeURIComponent(cat.id);
    a.textContent=cat.name;
    li.append(a);list.append(li);
   });
   section.append(list);return section;
  }));
  inner.replaceChildren(...blocks);
 }
 build().catch(()=>{
  const inner=menu.querySelector(".mega-menu__inner");
  if(inner)inner.innerHTML='<a href="women.html">Women wishlist</a><a href="men.html">Men wishlist</a>';
 });
}
