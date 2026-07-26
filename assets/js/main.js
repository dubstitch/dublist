import { initNav } from "./nav.js";

document.documentElement.classList.replace("no-js", "js");

initNav();

const page = document.body.dataset.page;

if (page === "women" || page === "men") {
  const [{ initModal }, { renderCategoryPage }, { initCategoryEngine }, { initCarousels }] = await Promise.all([
    import("./modal.js"),
    import("./render-category.js"),
    import("./category-engine.js"),
    import("./carousel.js"),
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
    // The track (~9 viewports tall, or ~9 page-heights on mobile) stays
    // `display: none` while empty so nothing grows out from under itself
    // while populating. On mobile that's still enough content appearing at
    // once that the browser's scroll anchoring jumps window scroll to the
    // bottom to keep the (previously short) page's trailing content pinned —
    // force it back to the top explicitly.
    trackEl.classList.add("is-ready");
    initCategoryEngine({ scrollEl, stageEl, layers });
    initCarousels(stageEl);

    // A single scrollTo(0, 0) here loses a race with a later reflow (image/
    // font load, layout settling) that re-triggers the anchor jump. Re-assert
    // every frame until it actually holds still, not just for a fixed count.
    let stableFrames = 0;
    let totalFrames = 0;
    const holdAtTop = () => {
      totalFrames += 1;
      if (window.scrollY === 0) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        window.scrollTo(0, 0);
      }
      if (stableFrames < 8 && totalFrames < 120) requestAnimationFrame(holdAtTop);
    };
    holdAtTop();
  }
}
