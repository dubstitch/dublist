# Wade List | Personal Shopper Wishlist

**Status: Work in progress**  
**GitHub repository name:** `dublist`

This is a curated wishlist and reference tool for the family's personal shopper, not a storefront. A shopper in Thailand should be able to find an exact item requested for Des, Vada or Keith, inspect product images and specifications, and follow the original listing when a verified source is available.

**Demo:** https://dubstitch.github.io/dublist/

## Current interface

- Women and Men accessible side by side on mobile, with category-based navigation
- Natural document scrolling with a crossfade between product categories on every screen size
- Transform-based horizontal product carousels with arrows, swipe gestures and accessible controls
- Product details with recipient, added date, original notes, and item matching preference
- A read-only public shopper view with no fake edit or remove controls
- Three dashboard indicators for new, changed and removed requests, powered by the published activity log

## Adding products

The catalog lives in `data/women.json` and `data/men.json`. Each item uses:
`id`, `brand`, `name`, `cardImage`, `images`, `price`, `currency`, `description`, `details`, `dimensions`, `whoFor`, `addedDate`, `notes`, `productUrl`. An optional `matchPreference` field accepts `"exact"` or `"similar"`. If absent, the interface correctly displays **Not specified** rather than guessing the buyer's preference.

When a real item is added or its details change, update the appropriate catalog and add an entry to `data/activity.json` with `type` set to `new`, `updated` or `removed`. The dashboard counts that published log. It is not a live notification system.

Product photography should remain original, unaltered and at the source resolution where permitted and technically accessible. Never replace a real product shot with an AI reconstruction; retain filenames and image ordering. Some existing entries still use placeholder SVG illustrations and example URLs; those are not verified listings.

## Important limitations

This is currently a static GitHub Pages website. There is **no authenticated shopper account, editing backend, secure persistent shopper notes or real-time notification service**. Such features require a separately configured backend and access controls. Read-only is deliberate for the public prototype.

Do not treat product prices as live retailer quotes. The UI marks unverified or missing source links as unavailable.

## Quality checks

`qa/wishlist-qa.mjs` covers mobile and landscape layouts, overflow, scrolling, controls, and serious accessibility checks. The `wishlist-qa.yml` workflow runs it on updates.

## Technology

HTML, CSS, vanilla JavaScript modules, JSON, GitHub Pages and Playwright. No front-end build step.
