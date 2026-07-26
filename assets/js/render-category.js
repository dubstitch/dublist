function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function buildLayer(cat, index) {
  const section = document.createElement("section");
  section.className = "category-layer";
  section.dataset.layer = "";
  section.dataset.index = String(index);
  section.dataset.bg = cat.background;

  const cardsHtml = cat.items
    .map(
      (item) => `
        <button type="button" class="carousel__card" data-item-id="${escapeHtml(item.id)}">
          <span class="carousel__card-frame">
            <img src="${escapeHtml(item.cardImage)}" alt="${escapeHtml(item.brand)} ${escapeHtml(item.name)}" />
          </span>
        </button>`
    )
    .join("");

  const cueHtml =
    index === 0
      ? `<a href="#" class="category-layer__scroll-cue" data-scroll-cue>
           <span>Scroll to Explore</span>
           <img src="assets/images/icons/arrow-right.svg" alt="" class="category-layer__scroll-arrow" />
         </a>`
      : "";

  section.innerHTML = `
    <div class="category-layer__grid container">
      <div class="category-layer__info">
        <span class="category-layer__index">${escapeHtml(cat.index)}</span>
        <h2 class="category-layer__name serif-display">${escapeHtml(cat.name)}</h2>
        <p class="category-layer__eyebrow eyebrow">Curated Wishlist</p>
        <p class="category-layer__desc">${escapeHtml(cat.description)}</p>
        ${cueHtml}
      </div>
      <div class="category-layer__carousel-wrap">
        <div class="carousel" data-carousel>
          <div class="carousel__track" data-carousel-track>${cardsHtml}</div>
        </div>
        <button type="button" class="carousel__arrow" data-carousel-next aria-label="Next items in ${escapeHtml(cat.name)}">
          <img src="assets/images/icons/arrow-right.svg" alt="" />
        </button>
      </div>
    </div>`;

  return section;
}

export async function renderCategoryPage({ dataUrl, scrollEl, trackEl, stageEl, onCardClick }) {
  const res = await fetch(dataUrl);
  const data = await res.json();
  const categories = data.categories;

  categories.forEach((cat, i) => {
    const spacer = document.createElement("div");
    spacer.className = "category-scroll__marker";
    spacer.dataset.index = cat.index;
    // Explicit row placement: the stage element spans grid-row 1/-1 and sits
    // first in the static markup, so sparse auto-placement treats row 1 as
    // already occupied and bumps every auto-placed marker down by one row —
    // shifting all snap points (and the "current section" the page loads on)
    // off by exactly one category. Placing each marker explicitly sidesteps
    // that collision entirely.
    spacer.style.gridRow = String(i + 1);
    trackEl.appendChild(spacer);
  });

  const layers = categories.map((cat, i) => {
    const layer = buildLayer(cat, i);
    stageEl.appendChild(layer);
    return layer;
  });

  layers.forEach((layer, i) => {
    const cat = categories[i];
    layer.querySelectorAll("[data-item-id]").forEach((btn) => {
      const item = cat.items.find((it) => it.id === btn.dataset.itemId);
      if (item) btn.addEventListener("click", () => onCardClick(item, cat));
    });

    const cue = layer.querySelector("[data-scroll-cue]");
    cue?.addEventListener("click", (e) => {
      e.preventDefault();
      const isDesktop = window.matchMedia("(min-width: 768px)").matches;
      if (isDesktop) {
        scrollEl.scrollBy({ top: scrollEl.clientHeight, behavior: "smooth" });
      } else {
        layers[i + 1]?.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  return { categories, layers };
}
