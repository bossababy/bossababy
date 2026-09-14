/* =========================================================
   BOSSABABY — storefront behaviour
   Progressive enhancement only: every control below still
   works without JavaScript via a normal form submit.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Product media gallery ---------- */
  var mainImage = document.querySelector('[data-main-image]');
  var thumbs = document.querySelectorAll('[data-thumb]');

  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      if (!mainImage) return;
      mainImage.src = thumb.dataset.full;
      thumbs.forEach(function (other) {
        other.setAttribute('aria-current', other === thumb ? 'true' : 'false');
      });
    });
  });

  /* ---------- Variant selection ---------- */
  var root = document.querySelector('[data-product-root]');
  if (!root) return;

  var variantJsonEl = document.querySelector('[data-variant-json]');
  if (!variantJsonEl) return;

  var variants;
  try {
    variants = JSON.parse(variantJsonEl.textContent);
  } catch (e) {
    return; // leave the server-rendered default selection in place
  }

  var variantIdInput = root.querySelector('[data-variant-id]');
  var priceEl = root.querySelector('[data-price]');
  var compareEl = root.querySelector('[data-compare-price]');
  var addButton = root.querySelector('[data-add-button]');
  var optionInputs = root.querySelectorAll('[data-option-input]');

  if (!optionInputs.length) return;

  // Shopify renders money with the shop's format; mirror it from the
  // initial server-rendered value so currency display stays consistent.
  var moneyFormat = priceEl ? priceEl.textContent.trim() : '';

  function formatMoney(cents, template) {
    var amount = (cents / 100).toFixed(2);
    // Replace the first number found in the template, keeping symbols/codes.
    return template.replace(/[\d][\d.,\s]*/, amount);
  }

  /* Three colourways that differ only by colour: if the shopper picks
     After Hours and the photo stays on First Light, the page is showing
     them the wrong bag. Shopify hands us the variant's own media
     whenever one is assigned in the product's Media section — without
     that assignment there is nothing to switch to, so we leave the
     current image alone rather than guess. */
  function showVariantImage(variant) {
    if (!mainImage || !variant.featured_media) return;

    var mediaId = String(variant.featured_media.id);
    var match = null;

    thumbs.forEach(function (thumb) {
      var isCurrent = thumb.dataset.mediaId === mediaId;
      thumb.setAttribute('aria-current', isCurrent ? 'true' : 'false');
      if (isCurrent) match = thumb;
    });

    // Prefer the thumbnail's URL: it is already sized for this slot,
    // where preview_image.src is the full-resolution original.
    if (match) {
      mainImage.src = match.dataset.full;
    } else if (variant.featured_media.preview_image) {
      mainImage.src = variant.featured_media.preview_image.src;
    } else {
      return;
    }

    mainImage.alt = variant.featured_media.alt || variant.name || mainImage.alt;
  }

  function selectedOptions() {
    var chosen = [];
    root.querySelectorAll('[data-option-index]').forEach(function (field) {
      var checked = field.querySelector('[data-option-input]:checked');
      chosen.push(checked ? checked.value : null);
    });
    return chosen;
  }

  function findVariant(chosen) {
    return variants.find(function (v) {
      return chosen.every(function (value, index) {
        return v.options[index] === value;
      });
    });
  }

  function update() {
    var variant = findVariant(selectedOptions());

    if (!variant) {
      if (addButton) {
        addButton.disabled = true;
        addButton.textContent = addButton.dataset.unavailableText || addButton.textContent;
      }
      return;
    }

    if (variantIdInput) variantIdInput.value = variant.id;

    if (priceEl && moneyFormat) {
      priceEl.textContent = formatMoney(variant.price, moneyFormat);
    }

    if (compareEl) {
      if (variant.compare_at_price && variant.compare_at_price > variant.price) {
        compareEl.textContent = formatMoney(variant.compare_at_price, compareEl.textContent.trim());
        compareEl.hidden = false;
      } else {
        compareEl.hidden = true;
      }
    }

    if (addButton) {
      addButton.disabled = !variant.available;
    }

    showVariantImage(variant);

    // Keep the URL shareable without reloading the page.
    if (window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    }
  }

  optionInputs.forEach(function (input) {
    input.addEventListener('change', update);
  });
})();
