import {chromium,webkit} from "playwright";

const cases=[
 {name:"small-portrait",width:320,height:568},
 {name:"mobile-portrait",width:390,height:844},
 {name:"mobile-landscape",width:844,height:390},
 {name:"large-landscape",width:932,height:430},
 {name:"tablet",width:768,height:1024},
 {name:"desktop",width:1440,height:900}
];
const routes=[
 {path:"index.html",count:4,first:"Wishlist activity",next:"Women & men",jump:2},
 {path:"women.html",count:9,first:"Handbags",next:"Jewelry",jump:2},
 {path:"men.html",count:9,first:"Bags",next:"Watches",jump:2}
];
const problems=[];
const report=(name,message)=>problems.push(name+" "+message);
for(const [engineName,engine] of [["chromium",chromium],["webkit",webkit]]){
  const browser=await engine.launch({headless:true});
  for(const viewport of cases){
    const context=await browser.newContext({
      viewport:{width:viewport.width,height:viewport.height},
      isMobile:viewport.width<767,hasTouch:viewport.width<767,
      reducedMotion:"reduce"
    });
    const page=await context.newPage();
    page.on("pageerror",e=>report(engineName+" "+viewport.name,"JS error "+e.message));
    for(const route of routes){
      const name=engineName+" "+viewport.name+" "+route.path;
      try{
        await page.goto("http://127.0.0.1:8765/"+route.path,{waitUntil:"networkidle"});
        await page.locator(".wl-section-rail").waitFor({state:"visible"});
        if(route.count===9){
          await page.waitForFunction(()=>document.documentElement.dataset.wishlistReady==="true");
        }
        const ready=await page.evaluate(()=>{
          const rail=document.querySelector(".wl-section-rail");
          const rect=rail.getBoundingClientRect();
          const spine=rail.querySelector(".wl-section-rail__spine").getBoundingClientRect();
          const btn=rail.querySelector(".wl-section-rail__expand").getBoundingClientRect();
          return {
            mode:rail.dataset.mode,
            count:Number(rail.dataset.railCount),
            labels:[...rail.querySelectorAll(".wl-section-rail__list .wl-section-rail__name")].map(n=>n.textContent),
            points:rail.querySelectorAll(".wl-section-rail__point").length,
            active:[...rail.querySelectorAll('.wl-section-rail__point[aria-current="step"]')].length,
            start:rail.querySelector(".wl-section-rail__current").textContent,
            next:rail.querySelector(".wl-section-rail__next").textContent,
            left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
            spineBottom:spine.bottom,expandBottom:btn.bottom,
            viewport:innerWidth,height:innerHeight,
            docWidth:document.documentElement.scrollWidth
          };
        });
        if(ready.count!==route.count||ready.points!==route.count||ready.active!==1 ||
            ready.labels[0]!==route.first||!ready.next.includes(route.next) ||
            !ready.start.startsWith("01 /")){
          report(name,"wrong initial rail contents "+JSON.stringify(ready));
        }
        if(ready.left<0||ready.right>ready.viewport+1||
            ready.top<65||ready.bottom>ready.height+1||
            ready.docWidth>ready.viewport+2){
          report(name,"rail clipped or causes overflow "+JSON.stringify(ready));
        }
        await page.locator(".wl-section-rail__expand").click();
        const expanded=await page.evaluate(()=>{
          const rail=document.querySelector(".wl-section-rail");
          const panel=rail.querySelector(".wl-section-rail__panel");
          const p=panel.getBoundingClientRect();
          return {open:rail.classList.contains("is-expanded"),
            backdrop:!document.querySelector(".wl-section-rail__shade").hidden,
            expanded:rail.querySelector(".wl-section-rail__expand").getAttribute("aria-expanded"),
            width:p.width,left:p.left,right:p.right,height:p.height,bottom:p.bottom,viewport:innerWidth,viewHeight:innerHeight,
            rows:panel.querySelectorAll(".wl-section-rail__item").length,
            remaining:panel.querySelector(".wl-section-rail__remaining").textContent};
        });
        if(!expanded.open||!expanded.backdrop||expanded.expanded!=="true"||
          expanded.rows!==route.count||expanded.left<0||
          expanded.right>expanded.viewport+1||expanded.bottom>expanded.viewHeight+1 ||
          !expanded.remaining.includes((route.count-1)+" sections")){
          report(name,"section index cannot fully open "+JSON.stringify(expanded));
        }
        await page.keyboard.press("Escape");
        const collapsed=await page.evaluate(()=>{
          const nav=document.querySelector(".wl-section-rail");
          return {open:nav.classList.contains("is-expanded"),
            shade:document.querySelector(".wl-section-rail__shade").hidden,
            returned:document.activeElement===nav.querySelector(".wl-section-rail__expand")};
        });
        if(collapsed.open||!collapsed.shade||!collapsed.returned)report(name,"Escape doesn't restore focus "+JSON.stringify(collapsed));
        await page.locator(".wl-section-rail__expand").click();
        const target=page.locator(".wl-section-rail__item").nth(route.jump);
        await target.click();
        await page.waitForTimeout(280);
        const selected=await page.evaluate(index=>{
          const rail=document.querySelector(".wl-section-rail");
          const btn=rail.querySelectorAll(".wl-section-rail__point")[index];
          const controlled=document.getElementById(btn?.getAttribute("aria-controls"));
          const r=controlled?.getBoundingClientRect();
          return {
            active:btn?.getAttribute("aria-current"),
            currentText:rail.querySelector(".wl-section-rail__current").textContent,
            closed:!rail.classList.contains("is-expanded"),
            targetTop:r?.top,
            targetHeight:r?.height,
            windowHeight:innerHeight,
            pageY:scrollY,
            next:rail.querySelector(".wl-section-rail__next").textContent
          };
        },route.jump);
        if(selected.active!=="step"||!selected.closed||
            !selected.currentText.startsWith("03 /") ||
            selected.targetTop>selected.windowHeight ||
            selected.targetTop+selected.targetHeight<0){
          report(name,"rail jump / active state failed "+JSON.stringify(selected));
        }
        if(route.count===9&&viewport.name==="mobile-portrait"){
          const rail=page.locator(".wl-section-rail");
          await page.locator(".category-layer.is-current .carousel__card").first().click();
          const visible=await rail.evaluate(el=>getComputedStyle(el).visibility);
          if(visible!=="hidden")report(name,"rail is not hidden behind product modal");
          await page.keyboard.press("Escape");
          await page.waitForTimeout(300);
          const restored=await rail.evaluate(el=>getComputedStyle(el).visibility);
          if(restored!=="visible")report(name,"rail not restored after modal closes");
        }
      }catch(error){report(name,"test exception: "+error.message);}
    }
    await context.close();
  }
  await browser.close();
}
console.log("WADE_SECTION_RAIL_ISSUES="+JSON.stringify(problems));
if(problems.length)process.exitCode=1;
