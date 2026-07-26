export function initCarousels(root = document) {
  root.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector("[data-carousel-track]");
    const wrap = carousel.parentElement;
    const nextBtn = wrap?.querySelector("[data-carousel-next]");
    if (!track || !nextBtn) return;

    nextBtn.addEventListener("click", () => {
      const card = track.querySelector(".carousel__card");
      const cardWidth = card ? card.getBoundingClientRect().width + 28 : 260;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    });
  });
}
