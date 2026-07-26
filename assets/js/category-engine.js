const BREAKPOINT = 768;

function hexToRgb(hex) {
  const clean = hex.trim().replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function resolveColorTokens(tokenNames) {
  const styles = getComputedStyle(document.documentElement);
  const tokens = {};
  tokenNames.forEach((name) => {
    const value = styles.getPropertyValue(`--color-${name}`).trim();
    if (value) tokens[name] = hexToRgb(value);
  });
  return tokens;
}

/**
 * scrollEl: the self-contained overflow-y:scroll box (its own scrollTop drives progress —
 *   nothing here touches window/document scroll).
 * stageEl: the position:sticky viewport-sized panel stacked over the (N * 100dvh) track.
 * layers: one full-bleed section per category, absolutely positioned inside stageEl.
 */
export function initCategoryEngine({ scrollEl, stageEl, layers }) {
  const tokenNames = [...new Set(layers.map((l) => l.dataset.bg))];
  const colorTokens = resolveColorTokens(tokenNames);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let mode = null;
  let ticking = false;
  let io = null;
  let isSnapping = false;
  let snapTimer = null;
  let snapEndTimer = null;

  function colorFor(layer) {
    return colorTokens[layer?.dataset.bg] || colorTokens[layers[0].dataset.bg];
  }

  function computeDesktop() {
    const vh = scrollEl.clientHeight || 1;
    const progress = scrollEl.scrollTop / vh;
    const current = Math.max(0, Math.min(layers.length - 1, Math.floor(progress)));
    const t = Math.max(0, Math.min(1, progress - current));

    layers.forEach((layer, i) => {
      if (i === current) {
        const outT = current === layers.length - 1 ? 0 : t;
        layer.style.opacity = String(1 - outT);
        layer.style.transform = reduceMotion ? "" : `scale(${1 - 0.04 * outT})`;
        layer.style.pointerEvents = outT > 0.5 ? "none" : "auto";
      } else if (i === current + 1) {
        layer.style.opacity = String(t);
        layer.style.transform = reduceMotion ? "" : `scale(${0.98 + 0.02 * t})`;
        layer.style.pointerEvents = t > 0.5 ? "auto" : "none";
      } else {
        layer.style.opacity = "0";
        layer.style.transform = "";
        layer.style.pointerEvents = "none";
      }
    });

    const c1 = colorFor(layers[current]);
    const c2 = colorFor(layers[Math.min(current + 1, layers.length - 1)]);
    if (reduceMotion) {
      stageEl.style.backgroundColor = `rgb(${c1.r}, ${c1.g}, ${c1.b})`;
    } else {
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      stageEl.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }
  }

  // Native `scroll-snap-type` fights the sticky-spanning-grid stage above in
  // this browser (see category.css), so "settle onto the new section" is
  // driven from here instead: once scrolling goes quiet for a moment, ease
  // to the nearest section boundary.
  function scheduleSnap() {
    if (isSnapping) return;
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      const vh = scrollEl.clientHeight || 1;
      const nearest = Math.max(0, Math.min(layers.length - 1, Math.round(scrollEl.scrollTop / vh)));
      const target = nearest * vh;
      if (Math.abs(scrollEl.scrollTop - target) > 1) {
        isSnapping = true;
        scrollEl.scrollTo({ top: target, behavior: reduceMotion ? "auto" : "smooth" });
        clearTimeout(snapEndTimer);
        snapEndTimer = setTimeout(() => {
          isSnapping = false;
        }, 500);
      }
    }, 120);
  }

  function onScrollEnd() {
    isSnapping = false;
  }

  function onScroll() {
    scheduleSnap();
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      computeDesktop();
      ticking = false;
    });
  }

  function enableDesktop() {
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    scrollEl.addEventListener("scrollend", onScrollEnd);
    computeDesktop();
  }

  function disableDesktop() {
    scrollEl.removeEventListener("scroll", onScroll);
    scrollEl.removeEventListener("scrollend", onScrollEnd);
    clearTimeout(snapTimer);
    clearTimeout(snapEndTimer);
    isSnapping = false;
    layers.forEach((l) => {
      l.style.opacity = "";
      l.style.transform = "";
      l.style.pointerEvents = "";
    });
    stageEl.style.backgroundColor = "";
  }

  function enableMobile() {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("in-view", entry.isIntersecting);
        });
      },
      { threshold: 0.3 }
    );
    layers.forEach((l) => io.observe(l));
  }

  function disableMobile() {
    io?.disconnect();
    io = null;
    layers.forEach((l) => l.classList.remove("in-view"));
  }

  function applyMode() {
    const isDesktop = window.matchMedia(`(min-width: ${BREAKPOINT}px)`).matches;
    const nextMode = isDesktop ? "desktop" : "mobile";
    if (nextMode === mode) return;
    if (mode === "desktop") disableDesktop();
    if (mode === "mobile") disableMobile();
    mode = nextMode;
    if (mode === "desktop") enableDesktop();
    else enableMobile();
  }

  window.addEventListener("resize", applyMode);
  applyMode();
}
