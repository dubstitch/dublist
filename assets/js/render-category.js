function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function buildLayer(cat, index) {
  const section = document.createElement("section");
  section.className = "category-layer";
  section.id = cat.id;
  section.setAttribute("aria-label", cat.name + " wishlist");
  section.setAttribute("aria-hidden", "true");
  section.inert = true;
  section.dataset.layer = "";
  section.dataset.index = String(index);
  section.dataset.bg = cat.background;

  const cardsHtml = cat.items
    .map(
      (item) => `
        <button type="button" class="carousel__card" data-item-id="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.brand)} ${escapeHtml(item.name)} details">
          <span class="carousel__card-frame">
            <img src="${escapeHtml(item.cardImage)}" alt="" loading="${index===0 ? "eager":"lazy"}" />
          </span>
          <span class="carousel__caption"><span class="carousel__caption-brand">${escapeHtml(item.brand)}</span><span class="carousel__caption-name">${escapeHtml(item.name)}</span></span>
        </button>`
    )
    .join("");

  const cueHtml =
    index === 0
      ? `<span class="category-layer__scroll-cue">
           <span>Scroll to browse categories</span>
           <img src="assets/images/icons/arrow-right.svg" alt="" class="category-layer__scroll-arrow" />
         </span>`
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
        <button type="button" class="carousel__arrow carousel__arrow--prev" data-carousel-prev aria-label="Previous items in ${escapeHtml(cat.name)}"><img src="assets/images/icons/arrow-right.svg" alt="" /></button>
        <div class="carousel" data-carousel role="region" aria-roledescription="carousel" aria-label="${escapeHtml(cat.name)} products">
          <div class="carousel__track" data-carousel-track>${cardsHtml}</div>
        </div>
        <button type="button" class="carousel__arrow carousel__arrow--next" data-carousel-next aria-label="Next items in ${escapeHtml(cat.name)}">
          <img src="assets/images/icons/arrow-right.svg" alt="" />
        </button>
        <div class="carousel__dots" data-carousel-dots role="group" aria-label="Carousel positions"></div>
      </div>
    </div>`;

  return section;
}

export async function renderCategoryPage({ dataUrl, scrollEl, trackEl, stageEl, onCardClick }) {
  const res = await fetch(dataUrl);
  const data = await res.json();
  const categories = data.categories;

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

  });

  trackEl.style.setProperty("--category-count", String(layers.length));
  return { categories, layers };
}
