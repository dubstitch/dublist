import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const engine=process.env.BROWSER_NAME==="webkit"?webkit:chromium;
const browser=await engine.launch({headless:true});
const base="http://127.0.0.1:8765";
const problems=[];
const viewports=[
 {name:"small-iphone",width:320,height:568},
 {name:"iphone-se",width:375,height:667},
 {name:"iphone-regular",width:390,height:844},
 {name:"iphone-large",width:430,height:932},
 {name:"phone-landscape",width:844,height:390},
 {name:"tablet",width:768,height:1024},
 {name:"desktop",width:1440,height:900}
];
const report=(name,page,why)=>problems.push(name+" "+page+" "+why);
let shots=0;
for(const device of viewports){
 const context=await browser.newContext({
  viewport:{width:device.width,height:device.height},
  deviceScaleFactor:1,
  isMobile:device.width<767,
  hasTouch:device.width<767,
  reducedMotion:"no-preference"
 });
 const page=await context.newPage();
 page.on("pageerror",e=>report(device.name,page.url(),"JS "+String(e)));
 for(const route of ["index.html","women.html","men.html"]){
  const response=await page.goto(base+"/"+route,{waitUntil:"networkidle"});
  if(!response?.ok()){report(device.name,route,"HTTP "+response?.status());continue;}
  if(route!=="index.html")await page.locator(".category-layer").first().waitFor({state:"attached"});
  await page.waitForTimeout(180);
  const global=await page.evaluate(()=>({
   pageWidth:document.documentElement.scrollWidth,
   viewport:document.documentElement.clientWidth,
   headerWidth:document.querySelector(".site-header").getBoundingClientRect().width
  }));
  if(global.pageWidth>global.viewport+2)report(device.name,route,"horizontal overflow "+JSON.stringify(global));
  const accessibility=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  for(const v of accessibility.violations.filter(v=>["serious","critical"].includes(v.impact)))
   report(device.name,route,"accessibility "+v.id+" "+v.nodes.slice(0,2).map(n=>n.target.join(",")).join(";"));
  if(route==="index.html"){
   const panels=await page.evaluate(()=>{
    const a=document.querySelector(".hero__panel--women").getBoundingClientRect();
    const b=document.querySelector(".hero__panel--men").getBoundingClientRect();
    return {womenY:a.top,menY:b.top};
   });
   if(device.width<768&&Math.abs(panels.womenY-panels.menY)>2)report(device.name,route,"women/men cards are stacked on mobile");
   if(device.name==="iphone-regular"&&process.env.SHOW_SHOTS==="1"){
     const jpeg=await page.screenshot({type:"jpeg",quality:43});
     console.log("SHOT_BASE64:"+(process.env.BROWSER_NAME||"chromium")+"-home:"+jpeg.toString("base64"));
   }
   continue;
  }
  const metrics=await page.evaluate(()=>{
   const stage=document.querySelector("[data-category-stage]");
   const title=document.querySelector(".category-layer.is-current .category-layer__heading").getBoundingClientRect();
   const card=document.querySelector(".category-layer.is-current .carousel__card-frame").getBoundingClientRect();
   const label=document.querySelector(".category-layer.is-current .carousel__caption").getBoundingClientRect();
   const st=stage.getBoundingClientRect();
   const all=[...document.querySelectorAll(".category-layer")];
   return {
    titleLeft:title.left,titleRight:title.right,
    cardHeight:card.height,cardWidth:card.width,cardLeft:card.left,
    captionBottom:label.bottom,stageBottom:st.bottom,
    current:all.filter(x=>x.classList.contains("is-current")).length,
    nestedScroll:getComputedStyle(document.querySelector("[data-category-scroll]")).overflowY,
    carouselScroll:getComputedStyle(document.querySelector(".carousel__track")).overflowY
   };
  });
  if(metrics.current!==1)report(device.name,route,"not exactly one selected section "+JSON.stringify(metrics));
  if(metrics.titleLeft<17 || metrics.titleRight>device.width-12)report(device.name,route,"heading clipped or too near edge "+JSON.stringify(metrics));
  if(metrics.cardHeight>500 || metrics.cardHeight>device.height*.68)report(device.name,route,"oversized product card "+JSON.stringify(metrics));
  if(metrics.cardLeft<15)report(device.name,route,"first product card too close to edge "+JSON.stringify(metrics));
  if(metrics.captionBottom>metrics.stageBottom+2)report(device.name,route,"product caption outside visible stage "+JSON.stringify(metrics));
  if(metrics.nestedScroll==="scroll"||metrics.nestedScroll==="auto")report(device.name,route,"nested vertical scrollbar "+JSON.stringify(metrics));
  const first=page.locator(".category-layer").first();
  if(route==="women.html"){
   const before=await first.locator(".carousel__track").evaluate(el=>el.style.transform);
   await first.locator("[data-carousel-next]").click();
   const after=await first.locator(".carousel__track").evaluate(el=>el.style.transform);
   if(before===after)report(device.name,route,"carousel arrow did not move");
   await first.locator(".carousel__card").nth(1).click();
   await page.locator('.modal-overlay[data-open="true"]').waitFor({state:"visible"});
   if(await page.locator("[data-modal-notes-edit],[data-modal-remove]").count())report(device.name,route,"fake editor/remove still visible");
   await page.keyboard.press("Escape");
  }
  if(device.name==="iphone-regular"&&process.env.SHOW_SHOTS==="1"&&shots<3){
   const jpeg=await page.screenshot({type:"jpeg",quality:40});
   console.log("SHOT_BASE64:"+(process.env.BROWSER_NAME||"chromium")+"-"+device.name+"-"+route+":"+jpeg.toString("base64"));
   shots++;
  }
  const scrollTarget=await page.evaluate(()=>{
   const el=document.querySelector("[data-category-track]");
   const hh=document.querySelector(".site-header").getBoundingClientRect().height;
   const h=document.querySelector("[data-category-stage]").getBoundingClientRect().height;
   return window.scrollY+el.getBoundingClientRect().top-hh+h*.8;
  });
  await page.evaluate(y=>window.scrollTo(0,y),scrollTarget);
  await page.waitForTimeout(600);
  const transition=await page.evaluate(()=>{
   const els=[...document.querySelectorAll(".category-layer")];
   const current=els.filter(el=>el.classList.contains("is-current"));
   return {active:current.map(x=>x.dataset.index),visible:els.filter(el=>parseFloat(getComputedStyle(el).opacity)>.08).map(x=>x.dataset.index)};
  });
  if(transition.active.length!==1 || transition.active[0]!=="1"||transition.visible.length!==1)
   report(device.name,route,"crossfade leaves sections overlapping "+JSON.stringify(transition));
  if(device.name==="iphone-regular"&&process.env.SHOW_SHOTS==="1"&&shots<3){
   const jpeg=await page.screenshot({type:"jpeg",quality:40});
   console.log("SHOT_BASE64:"+(process.env.BROWSER_NAME||"chromium")+"-"+device.name+"-after-scroll-"+route+":"+jpeg.toString("base64"));
   shots++;
  }
 }
 await context.close();
}
await browser.close();
console.log("WISHLIST_QA_ISSUES="+JSON.stringify(problems));
if(problems.length)process.exitCode=1;
