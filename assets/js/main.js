import { initNav } from "./nav.js";
import { initSectionRail } from "./section-rail.js?v=20261110rail2";

document.documentElement.classList.replace("no-js", "js");

initNav();

const page = document.body.dataset.page;
if (!page) {
  initSectionRail({
    mode:"home",
    title:"Explore Wade List",
    sections:[
      {id:"wishlist-updates",label:"Wishlist activity"},
      {id:"wishlist-collections",label:"Women & men"},
      {id:"wishlist-details",label:"How it works"},
      {id:"wishlist-footer",label:"More information"}
    ]
  });
}

if (page === "women" || page === "men") {
  const [{ initModal }, { renderCategoryPage }, { initCategoryEngine }, { initCarousels }] = await Promise.all([
    import("./modal.js?v=20261110glass1"),
    import("./render-category.js"),
    import("./category-engine.js?v=20261110rail2"),
    import("./carousel.js?v=20261110glass1"),
  ]);

  const modal = initModal();
  const scrollEl = document.querySelector("[data-category-scroll]");
  const trackEl = document.querySelector("[data-category-track]");
  const stageEl = document.querySelector("[data-category-stage]");
  const dataUrl = page === "women" ? "data/women.json" : "data/men.json";
  const theme = page === "women" ? "light" : "dark";

  if (scrollEl && trackEl && stageEl) {
    const { layers,categories } = await renderCategoryPage({
      dataUrl,
      scrollEl,
      trackEl,
      stageEl,
      onCardClick: (item) => modal.open(item, theme),
    });
    // Natural document scrolling drives the crossfade on both portrait and landscape.
    trackEl.classList.add("is-ready");
    initCategoryEngine({ trackEl, stageEl, layers });
    initCarousels(stageEl);
    initSectionRail({
      mode:"collections",
      title:page==="women"?"Women's collections":"Men's collections",
      sections:categories.map(cat=>({id:cat.id,label:cat.name})),
      listenForCategoryChanges:true
    });
  }
}
