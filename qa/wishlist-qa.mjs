import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
const browser=await chromium.launch({headless:true});
const base="http://127.0.0.1:8765";
const issues=[];
const devices=[
 {name:"compact-phone",width:320,height:568},
 {name:"iphone",width:390,height:844},
 {name:"wide-phone",width:430,height:932},
 {name:"phone-landscape",width:844,height:390},
 {name:"tablet",width:768,height:1024},
 {name:"desktop",width:1440,height:900}
];
for(const device of devices){
 const context=await browser.newContext({viewport:{width:device.width,height:device.height},reducedMotion:"reduce"});
 const page=await context.newPage();
 const errors=[];
 page.on("pageerror",e=>errors.push(String(e)));
 for(const path of ["index.html","women.html","men.html"]){
  const response=await page.goto(base+"/"+path,{waitUntil:"domcontentloaded"});
  if(!response?.ok())issues.push(device.name+" "+path+" HTTP "+response?.status());
  await page.waitForTimeout(250);
  if(path!=="index.html")await page.locator(".category-layer").first().waitFor({state:"attached"});
  const metrics=await page.evaluate(()=>({
   page:document.documentElement.scrollWidth,window:innerWidth,
   menu:!!document.querySelector(".mega-menu__inner"),
   cards:document.querySelectorAll(".carousel__card").length,
   innerScroll: getComputedStyle(document.querySelector("[data-category-scroll]")||document.body).overflowY
  }));
  if(metrics.page>metrics.window+3)issues.push(device.name+" "+path+" horizontal overflow "+JSON.stringify(metrics));
  if(path!=="index.html"&&(!metrics.cards||metrics.innerScroll==="scroll"))issues.push(device.name+" "+path+" broken cards or nested scroll "+JSON.stringify(metrics));
  const access=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
  const violations=access.violations.filter(x=>["serious","critical"].includes(x.impact));
  for(const v of violations)issues.push(device.name+" "+path+" AXE "+v.id+" "+v.nodes.map(n=>n.target.join(",")).slice(0,3).join(";"));
  if(path==="index.html"){
   const panels=await page.evaluate(()=>{
    const a=document.querySelector(".hero__panel--women").getBoundingClientRect();
    const b=document.querySelector(".hero__panel--men").getBoundingClientRect();
    return {womenTop:a.top,menTop:b.top,womenLeft:a.left,menLeft:b.left};
   });
   if(device.width<=767&&Math.abs(panels.womenTop-panels.menTop)>4)issues.push(device.name+" split panels unexpectedly stack");
   if(!await page.locator('[data-status-count="new"]').count())issues.push(device.name+" missing shopper statuses");
  } else {
   await page.evaluate(()=>window.scrollTo(0,0));
   const first=page.locator(".category-layer").first();
   if(!await first.isVisible())issues.push(device.name+" "+path+" first category invisible");
   const move=await page.evaluate(()=>{
    const t=document.querySelector("[data-category-track]");
    const h=document.querySelector(".site-header").getBoundingClientRect().height;
    const v=document.querySelector("[data-category-stage]").clientHeight;
    return t.getBoundingClientRect().top+scrollY-h+v*.78;
   });
   await page.evaluate(y=>window.scrollTo(0,y),move);
   await page.waitForTimeout(150);
   const fade=await page.evaluate(()=>({
    first:parseFloat(document.querySelectorAll(".category-layer")[0].style.opacity),
    second:parseFloat(document.querySelectorAll(".category-layer")[1].style.opacity),
    inner:document.querySelector("[data-category-scroll]").scrollTop
   }));
   if(fade.inner!==0||fade.second<=0||fade.first>=1)issues.push(device.name+" "+path+" crossfade failed "+JSON.stringify(fade));
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.waitForTimeout(100);
   if(path==="women.html"){
    const track=page.locator(".category-layer").first().locator(".carousel__track");
    const before=await track.evaluate(el=>el.style.transform);
    await page.locator(".category-layer").first().locator('[data-carousel-next]').click();
    const after=await track.evaluate(el=>el.style.transform);
    if(before===after)issues.push(device.name+" carousel next did not change position");
    await page.locator(".category-layer").first().locator(".carousel__card").first().click();
    await page.locator('.modal-overlay[data-open="true"]').waitFor({state:"visible"});
    if(await page.locator("[data-modal-notes-edit],[data-modal-remove]").count())issues.push(device.name+" edit/remove still visible");
    if(!await page.locator("[data-modal-match]").isVisible())issues.push(device.name+" missing match preference");
    await page.keyboard.press("Escape");
   }
  }
 }
 if(errors.length)issues.push(device.name+" JS errors "+errors.join(" | "));
 await context.close();
}
await browser.close();
console.log("WISHLIST_QA_ISSUES="+JSON.stringify(issues));
if(issues.length)process.exitCode=1;
