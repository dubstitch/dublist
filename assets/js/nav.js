const WOMEN_CATEGORY_IDS = ["handbags", "jewelry", "sunglasses", "shoes", "watches", "fragrance", "accessories", "travel", "beauty"];
const MEN_CATEGORY_IDS = ["bags", "watches", "sunglasses", "shoes", "belts", "wallets", "fragrance", "accessories", "travel"];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function linkHref(side, text) {
  const page = side === "women" ? "women.html" : "men.html";
  const slug = slugify(text);
  const ids = side === "women" ? WOMEN_CATEGORY_IDS : MEN_CATEGORY_IDS;
  return ids.includes(slug) ? `${page}#${slug}` : page;
}

function buildList(container, side, links) {
  container.innerHTML = "";
  links.forEach((text) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = linkHref(side, text);
    a.textContent = text;
    li.appendChild(a);
    container.appendChild(li);
  });
}

async function renderMegaMenu() {
  const root = document.querySelector("[data-mega-menu]");
  if (!root) return;

  let nav;
  try {
    const res = await fetch("data/nav.json");
    nav = await res.json();
  } catch (err) {
    console.error("Could not load nav data", err);
    return;
  }

  ["women", "men"].forEach((side) => {
    const data = nav[side];
    if (!data) return;

    const shopTitle = root.querySelector(`[data-nav-title="${side}-shop"]`);
    const shopList = root.querySelector(`[data-nav-list="${side}-shop"]`);
    if (shopTitle) shopTitle.textContent = data.shop.title;
    if (shopList) buildList(shopList, side, data.shop.links);

    const designersTitle = root.querySelector(`[data-nav-title="${side}-designers"]`);
    const designersList = root.querySelector(`[data-nav-list="${side}-designers"]`);
    if (designersTitle) designersTitle.textContent = data.designers.title;
    if (designersList) buildList(designersList, side, data.designers.links);

    if (data.collections) {
      const collTitle = root.querySelector(`[data-nav-title="${side}-collections"]`);
      const collList = root.querySelector(`[data-nav-list="${side}-collections"]`);
      if (collTitle) collTitle.textContent = data.collections.title;
      if (collList) buildList(collList, side, data.collections.links);
    }

    const feature = root.querySelector(`[data-nav-feature="${side}"]`);
    if (feature && data.feature) {
      const page = side === "women" ? "women.html" : "men.html";
      feature.innerHTML = `
        <div class="mega-menu__feature-image"><img src="${data.feature.image}" alt="" /></div>
        <p class="mega-menu__feature-label">${data.feature.label}</p>
        <p class="mega-menu__feature-subtext">${data.feature.subtext}</p>
        <a href="${page}" class="link-arrow mega-menu__feature-cta">${data.feature.cta}
          <img src="assets/images/icons/arrow-right.svg" alt="" width="20" height="10" />
        </a>`;
    }
  });
}

export function initNav() {
  const announceBar = document.querySelector("[data-announce-bar]");
  const announceClose = document.querySelector("[data-announce-close]");
  announceClose?.addEventListener("click", () => {
    announceBar?.setAttribute("hidden", "");
    document.documentElement.style.setProperty("--sticky-offset", "var(--nav-height)");
  });

  renderMegaMenu();

  const megaMenu = document.querySelector("[data-mega-menu]");
  const backdrop = document.querySelector("[data-mega-menu-backdrop]");
  const triggers = document.querySelectorAll("[data-menu-trigger]");
  const mobileTrigger = document.querySelector("[data-mobile-menu-trigger]");

  if (!megaMenu || !backdrop) return;

  const isOpen = () => megaMenu.dataset.open === "true";

  const setOpen = (open) => {
    megaMenu.dataset.open = String(open);
    backdrop.dataset.open = String(open);
    triggers.forEach((t) => t.setAttribute("aria-expanded", String(open)));
    document.body.style.overflow = open ? "hidden" : "";
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => setOpen(!isOpen()));
  });

  mobileTrigger?.addEventListener("click", () => setOpen(!isOpen()));

  backdrop.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) setOpen(false);
  });

  megaMenu.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });
}
