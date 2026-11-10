import { initNav } from "./nav.js";

document.documentElement.classList.replace("no-js", "js");

initNav();

const page = document.body.dataset.page;

if (page === "women" || page === "men") {
  const [{ initModal }, { renderCategoryPage }, { initCategoryEngine }, { initCarousels }] = await Promise.all([
    import("./modal.js?v=20261110glass1"),
    import("./render-category.js"),
    import("./category-engine.js?v=20261110glass1"),
    import("./carousel.js?v=20261110glass1"),
  ]);

  const modal = initModal();
  const scrollEl = document.querySelector("[data-category-scroll]");
  const trackEl = document.querySelector("[data-category-track]");
  const stageEl = document.querySelector("[data-category-stage]");
  const dataUrl = page === "women" ? "data/women.json" : "data/men.json";
  const theme = page === "women" ? "light" : "dark";

  if (scrollEl && trackEl && stageEl) {
    const { layers } = await renderCategoryPage({
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
  }
}
