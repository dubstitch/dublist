import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const browserEngines=[["chromium",chromium],["webkit",webkit]];
const devices=[
 {name:"small-iphone",width:320,height:568},
 {name:"iphone-regular",width:390,height:844},
 {name:"iphone-large",width:430,height:932},
 {name:"phone-landscape",width:844,height:390},
 {name:"wide-landscape",width:932,height:430},
 {name:"tablet",width:768,height:1024},
 {name:"laptop",width:1280,height:800},
 {name:"desktop",width:1440,height:900}
];
const errors=[];
const base="http://127.0.0.1:8765/";
const fail=(name,condition,details)=>{if(!condition)errors.push(name+" "+details)};
let sampleShot=false;

for(const [engineName,engine] of browserEngines){
 const browser=await engine.launch({headless:true});
 for(const size of devices){
  const ctx=await browser.newContext({
   viewport:{width:size.width,height:size.height},
   isMobile:size.width<767,
   hasTouch:size.width<767,
   reducedMotion:"reduce"
  });
  const page=await ctx.newPage();
  page.on("pageerror",error=>errors.push(engineName+" "+size.name+" page error "+error.message));
  for(const route of ["index.html","women.html","men.html"]){
   const name=engineName+" "+size.name+" "+route;
   try{
    const response=await page.goto(base+route,{waitUntil:"networkidle"});
    fail(name,response?.ok(),"unexpected HTTP response "+response?.status());
    if(route!=="index.html"){
      await page.locator(".category-layer").nth(8).waitFor({state:"attached"});
      await page.waitForFunction(()=>document.documentElement.dataset.wishlistReady==="true");
      await page.waitForTimeout(130);
    }
    const global=await page.evaluate(()=>{
      const base=document.querySelector(".site-footer__base-inner").getBoundingClientRect();
      const content=document.querySelector(".site-footer__brand").getBoundingClientRect();
      return {
       viewport:document.documentElement.clientWidth,
       document:document.documentElement.scrollWidth,
       footerLeft:content.left,
       footerRight:content.right,
       footerContainerLeft:base.left,
       footerContainerRight:base.right,
       snap:getComputedStyle(document.documentElement).scrollSnapType,
       footerText:document.querySelector(".site-footer__copyright")?.getBoundingClientRect().right
      };
    });
    fail(name,global.document<=global.viewport+3,"horizontal page overflow "+JSON.stringify(global));
    fail(name,global.footerLeft>=18 && global.footerRight<=global.viewport-14 && global.footerText<=global.viewport-12,
      "footer content touching screen edge "+JSON.stringify(global));

    if(route==="index.html"){
      const hero=await page.evaluate(()=>{
       const a=document.querySelector(".hero__panel--women").getBoundingClientRect();
       const b=document.querySelector(".hero__panel--men").getBoundingClientRect();
       return {sameRow:Math.abs(a.top-b.top)<2,aWidth:a.width,bWidth:b.width};
      });
      fail(name,hero.sameRow && hero.aWidth>110 && hero.bWidth>110,"mobile home split lost "+JSON.stringify(hero));
      if(engineName==="chromium"&&size.name==="iphone-regular"&&process.env.SHOW_SHOTS==="1"){
        const b=await page.screenshot({type:"jpeg",quality:43});
        console.log("LIQUID_SHOT:home:"+b.toString("base64"));
      }
      continue;
    }

    const metrics=await page.evaluate(()=>{
      const layers=[...document.querySelectorAll(".category-layer")];
      const first=layers[0],second=layers[1],layerBox=first.getBoundingClientRect();
      const card=first.querySelector(".carousel__card"),frame=card.querySelector(".carousel__card-frame");
      const carousel=first.querySelector(".carousel"),track=first.querySelector(".carousel__track");
      const dots=first.querySelectorAll(".carousel__dot");
      const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
      return {
       count:layers.length,visible:layers.filter(x=>getComputedStyle(x).visibility==="visible").length,
       inert:layers.filter(x=>x.inert).length,
       current:layers.filter(x=>x.classList.contains("is-current")).length,
       first:rect(first),second:rect(second),card:rect(frame),
       scrollY:window.scrollY,headerHeight:document.querySelector(".site-header").getBoundingClientRect().height,
       carouselOverflow:getComputedStyle(carousel).overflowX,
       carouselSnap:getComputedStyle(carousel).scrollSnapType,
       carouselCanScroll:carousel.scrollWidth>carousel.clientWidth+5,
       trackTransform:getComputedStyle(track).transform,
       dots:dots.length,cards:first.querySelectorAll(".carousel__card").length,
       footerTop:document.querySelector(".site-footer").getBoundingClientRect().top,
       stagePosition:getComputedStyle(document.querySelector(".category-stage")).position
      };
    });
    fail(name,global.snap.includes("y mandatory"),"page missing true native vertical section snap "+JSON.stringify(global));
    fail(name,metrics.count===9&&metrics.visible===9&&metrics.inert===0&&metrics.current===1,
      "collections still hidden behind layered stage "+JSON.stringify(metrics));
    fail(name,metrics.scrollY<3&&Math.abs(metrics.first.top-metrics.headerHeight)<6,
      "initial collection loads at the wrong scroll position "+JSON.stringify(metrics));
    fail(name,metrics.second.top>=metrics.first.bottom-2&&metrics.stagePosition!=="sticky",
      "section stacking is not natural "+JSON.stringify(metrics));
    fail(name,metrics.carouselOverflow==="auto"&&metrics.carouselSnap.includes("x mandatory")
      && metrics.carouselCanScroll && metrics.trackTransform==="none",
      "product slider is not a native horizontal snap scroller "+JSON.stringify(metrics));
    fail(name,metrics.dots===metrics.cards,"carousel pagination not one dot per product "+JSON.stringify(metrics));
    fail(name,metrics.card.left>=12&&metrics.card.right<=global.viewport-12,
      "first product frame clipped "+JSON.stringify(metrics.card));
    fail(name,metrics.card.bottom<=metrics.first.bottom+3,"product overflows its category "+JSON.stringify(metrics));

    if(engineName==="chromium"&&size.name==="iphone-regular"&&route==="women.html"&&process.env.SHOW_SHOTS==="1"){
      const b=await page.screenshot({type:"jpeg",quality:43});
      console.log("LIQUID_SHOT:collection:"+b.toString("base64"));
    }

    const first=page.locator(".category-layer").first();
    const carousel=first.locator(".carousel");
    const next=first.locator("[data-carousel-next]");
    const firstDot=first.locator(".carousel__dot").first();
    const initialLeft=await carousel.evaluate(e=>e.scrollLeft);
    await next.click();
    await page.waitForTimeout(90);
    const nextLeft=await carousel.evaluate(e=>e.scrollLeft);
    fail(name,nextLeft>initialLeft+20,"next product arrow did not scroll "+initialLeft+" -> "+nextLeft);
    const dots=first.locator(".carousel__dot");
    await dots.last().click();
    await page.waitForTimeout(110);
    const lastStatus=await first.evaluate(layer=>({
      nextDisabled:layer.querySelector("[data-carousel-next]").disabled,
      selected:[...layer.querySelectorAll(".carousel__dot")].findIndex(x=>x.getAttribute("aria-current")==="true")
    }));
    fail(name,lastStatus.nextDisabled&&lastStatus.selected===metrics.cards-1,
      "last carousel position failed "+JSON.stringify(lastStatus));
    await firstDot.click();
    await page.waitForTimeout(90);

    await first.locator(".carousel__card").first().click();
    const dialog=page.locator(".modal-overlay[data-open='true']");
    await dialog.waitFor({state:"visible"});
    const overlay=await page.evaluate(()=>{
      const modal=document.querySelector(".modal");
      const close=modal.querySelector(".modal__close");
      const share=modal.querySelector(".modal__share");
      const cr=close.getBoundingClientRect(),sr=share.getBoundingClientRect();
      const r=modal.getBoundingClientRect();
      const main=modal.querySelector(".modal__gallery-main").getBoundingClientRect();
      return {
        open:document.documentElement.classList.contains("modal-open"),
        htmlSnap:getComputedStyle(document.documentElement).scrollSnapType,
        shareVisible:getComputedStyle(share).display!=="none",
        closeRight:cr.right,closeLeft:cr.left,shareRight:sr.right,
        closeTop:cr.top,shareTop:sr.top,
        toolbarGap:cr.left-sr.right,
        modalLeft:r.left,modalRight:r.right,viewport:innerWidth,
        imageRight:main.right,mainImageVisible:main.width>150
      };
    });
    fail(name,overlay.open&&overlay.htmlSnap==="none","modal did not suspend background section snap "+JSON.stringify(overlay));
    fail(name,overlay.closeRight<=overlay.viewport+1&&overlay.modalLeft>=-2&&overlay.modalRight<=overlay.viewport+2,
      "modal close/product clipped "+JSON.stringify(overlay));
    fail(name,!overlay.shareVisible||overlay.toolbarGap>=9,
      "Share and Close still overlap "+JSON.stringify(overlay));
    fail(name,overlay.mainImageVisible&&overlay.imageRight<=overlay.modalRight+2,
      "product image outside modal "+JSON.stringify(overlay));
    if(engineName==="chromium"&&size.name==="iphone-regular"&&route==="women.html"&&process.env.SHOW_SHOTS==="1"){
      const b=await page.screenshot({type:"jpeg",quality:43});
      console.log("LIQUID_SHOT:product-modal:"+b.toString("base64"));
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(280);
    const restored=await page.evaluate(()=>({
      snap:getComputedStyle(document.documentElement).scrollSnapType,
      open:document.querySelector(".modal-overlay").dataset.open,
      scroll:document.body.style.overflow
    }));
    fail(name,restored.snap.includes("y mandatory")&&restored.open==="false"&&!restored.scroll,
      "modal did not restore native scroll "+JSON.stringify(restored));

    await page.locator(".category-layer").nth(1).evaluate(layer=>{
      layer.scrollIntoView({block:"start",behavior:"instant"});
    });
    await page.waitForTimeout(370);
    const section=await page.evaluate(()=>{
      const first=document.querySelectorAll(".category-layer")[0].getBoundingClientRect();
      const second=document.querySelectorAll(".category-layer")[1].getBoundingClientRect();
      const header=document.querySelector(".site-header").getBoundingClientRect();
      const active=[...document.querySelectorAll(".category-layer.is-current")].map(e=>e.id);
      return {firstBottom:first.bottom,secondTop:second.top,headerHeight:header.height,
        active,scrollY:window.scrollY};
    });
    fail(name,Math.abs(section.secondTop-section.headerHeight)<22
      &&section.active.length===1&&section.active[0]===await page.locator(".category-layer").nth(1).getAttribute("id"),
      "native scroll snap missed the requested category "+JSON.stringify(section));

    if(size.name==="iphone-regular"||size.name==="desktop"){
      const accessibility=await new AxeBuilder({page})
        .withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
      for(const violation of accessibility.violations.filter(v=>["serious","critical"].includes(v.impact))){
        errors.push(name+" accessibility "+violation.id+" "+violation.nodes.slice(0,2).map(x=>x.target.join(" ")).join(";"));
      }
    }
   }catch(error){errors.push(name+" test exception "+error.message);}
  }
  await ctx.close();
 }
 await browser.close();
}
console.log("WISHLIST_QA_ISSUES="+JSON.stringify(errors));
if(errors.length)process.exitCode=1;
