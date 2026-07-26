const WHO_ORDER = ["keith", "vada", "des"];
const WHO_LABELS = { keith: "Keith", vada: "Vada", des: "Des" };

function formatPrice(item) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency || "USD", maximumFractionDigits: 0 }).format(item.price);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function buildModalMarkup() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.hidden = true;
  overlay.dataset.modalOverlay = "";
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalProductName" data-modal tabindex="-1">
      <button type="button" class="modal__close icon-btn" data-modal-close aria-label="Close">
        <img src="assets/images/icons/close.svg" alt="" />
      </button>
      <div class="modal__body">
        <div class="modal__gallery">
          <div class="modal__gallery-main">
            <button type="button" class="modal__share icon-btn" data-modal-share aria-label="Share this item">
              <img src="assets/images/icons/share.svg" alt="" />
            </button>
            <img data-modal-main-image src="" alt="" />
          </div>
          <div class="modal__thumbs" data-modal-thumbs></div>
        </div>
        <div class="modal__details">
          <p class="modal__brand eyebrow" data-modal-brand></p>
          <h2 class="modal__name serif-display" id="modalProductName" data-modal-name></h2>
          <div class="modal__price-row">
            <span class="modal__price" data-modal-price></span>
            <span class="modal__pill">In Wishlist</span>
          </div>

          <div class="modal__section">
            <h3 class="modal__section-title">Description</h3>
            <p data-modal-description></p>
          </div>
          <div class="modal__section">
            <h3 class="modal__section-title">Details</h3>
            <ul data-modal-details></ul>
          </div>
          <div class="modal__section">
            <h3 class="modal__section-title">Dimensions</h3>
            <p data-modal-dimensions></p>
          </div>

          <div class="modal__who">
            <p class="modal__who-label">
              <img src="assets/images/icons/people.svg" alt="" />
              <span>Who This Is For</span>
            </p>
            <div class="modal__who-pills" data-modal-who></div>
          </div>

          <div class="modal__meta">
            <div class="modal__meta-item">
              <img src="assets/images/icons/calendar.svg" alt="" />
              <div>
                <p class="modal__meta-label">Added to Wishlist</p>
                <p class="modal__meta-value" data-modal-added></p>
              </div>
            </div>
            <div class="modal__meta-item">
              <div style="width:100%">
                <div class="modal__notes-header">
                  <span class="modal__meta-label">Notes</span>
                  <button type="button" class="modal__notes-edit" data-modal-notes-edit aria-label="Edit notes">
                    <img src="assets/images/icons/pencil.svg" alt="" />
                  </button>
                </div>
                <p class="modal__meta-value" data-modal-notes></p>
              </div>
            </div>
          </div>

          <div class="modal__actions">
            <a href="#" target="_blank" rel="noopener" class="btn btn--outline" data-modal-view>View Product Page</a>
            <button type="button" class="btn btn--solid" data-modal-remove>Remove from Wishlist</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

export function initModal() {
  const overlay = buildModalMarkup();
  const modal = overlay.querySelector("[data-modal]");
  const mainImage = overlay.querySelector("[data-modal-main-image]");
  const thumbs = overlay.querySelector("[data-modal-thumbs]");
  const brand = overlay.querySelector("[data-modal-brand]");
  const name = overlay.querySelector("[data-modal-name]");
  const price = overlay.querySelector("[data-modal-price]");
  const description = overlay.querySelector("[data-modal-description]");
  const details = overlay.querySelector("[data-modal-details]");
  const dimensions = overlay.querySelector("[data-modal-dimensions]");
  const who = overlay.querySelector("[data-modal-who]");
  const added = overlay.querySelector("[data-modal-added]");
  const notes = overlay.querySelector("[data-modal-notes]");
  const notesEdit = overlay.querySelector("[data-modal-notes-edit]");
  const viewLink = overlay.querySelector("[data-modal-view]");
  const removeBtn = overlay.querySelector("[data-modal-remove]");
  const closeBtn = overlay.querySelector("[data-modal-close]");
  const shareBtn = overlay.querySelector("[data-modal-share]");

  let lastFocused = null;

  function setMainImage(src, alt) {
    mainImage.src = src;
    mainImage.alt = alt;
    thumbs.querySelectorAll("[data-thumb-src]").forEach((t) => {
      t.setAttribute("aria-current", String(t.dataset.thumbSrc === src));
    });
  }

  function open(item, theme) {
    lastFocused = document.activeElement;
    modal.dataset.theme = theme;

    brand.textContent = item.brand;
    name.textContent = item.name;
    price.textContent = formatPrice(item);
    description.textContent = item.description;

    details.innerHTML = "";
    (item.details || []).forEach((d) => {
      const li = document.createElement("li");
      li.textContent = d;
      details.appendChild(li);
    });

    dimensions.textContent = item.dimensions || "—";

    who.innerHTML = "";
    WHO_ORDER.forEach((id) => {
      const pill = document.createElement("span");
      pill.className = "who-pill";
      pill.dataset.active = String((item.whoFor || []).includes(id));
      pill.textContent = WHO_LABELS[id];
      who.appendChild(pill);
    });

    added.textContent = formatDate(item.addedDate);
    notes.textContent = item.notes || "No notes yet.";
    notes.contentEditable = "false";

    const images = item.images && item.images.length ? item.images : [item.cardImage];
    thumbs.innerHTML = "";
    images.forEach((src, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "modal__thumb";
      btn.dataset.thumbSrc = src;
      btn.setAttribute("aria-current", String(i === 0));
      btn.innerHTML = `<img src="${src}" alt="" />`;
      btn.addEventListener("click", () => setMainImage(src, `${item.brand} ${item.name}`));
      thumbs.appendChild(btn);
    });
    setMainImage(images[0], `${item.brand} ${item.name}`);

    viewLink.href = item.productUrl || "#";

    overlay.hidden = false;
    requestAnimationFrame(() => {
      overlay.dataset.open = "true";
    });
    document.body.style.overflow = "hidden";
    modal.focus();

    shareBtn.onclick = async () => {
      const shareData = { title: `${item.brand} ${item.name}`, url: item.productUrl };
      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else if (navigator.clipboard) {
          await navigator.clipboard.writeText(item.productUrl || "");
          shareBtn.setAttribute("aria-label", "Link copied");
          setTimeout(() => shareBtn.setAttribute("aria-label", "Share this item"), 1500);
        }
      } catch {
        /* user cancelled share sheet — no-op */
      }
    };

    notesEdit.onclick = () => {
      const editing = notes.contentEditable === "true";
      notes.contentEditable = String(!editing);
      if (!editing) notes.focus();
    };

    removeBtn.onclick = () => close();
  }

  function close() {
    overlay.dataset.open = "false";
    document.body.style.overflow = "";
    setTimeout(() => {
      overlay.hidden = true;
    }, 250);
    lastFocused?.focus();
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.dataset.open === "true") close();
  });

  return { open, close };
}
