/* =========================================================
   BOSSABABY — storefront behaviour
   Progressive enhancement only: every control below still
   works without JavaScript via a normal form submit.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Brand video: sound toggle ---------- */
  // Videos start muted because browsers only autoplay silent video.
  // Visitors who want the sound can tap the speaker.
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-brand-video]').forEach(function (wrap) {
    var video = wrap.querySelector('video');
    var toggle = wrap.querySelector('[data-sound-toggle]');
    if (!video) return;

    if (reduceMotion) {
      video.removeAttribute('autoplay');
      video.pause();
      video.controls = true;
    }

    if (!toggle) return;
    toggle.addEventListener('click', function () {
      video.muted = !video.muted;
      if (!video.muted && video.paused) video.play();
      var on = !video.muted;
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      toggle.setAttribute('aria-label', on ? toggle.dataset.labelOn : toggle.dataset.labelOff);
    });
  });

  /* ---------- Sticky buy bar ---------- */
  // Shown on phones once the page's own buy button has scrolled away.
  var stickyBar = document.querySelector('[data-sticky-buy]');
  var stickyTrigger = document.querySelector('[data-sticky-trigger]');
  if (stickyBar && stickyTrigger && 'IntersectionObserver' in window) {
    stickyBar.hidden = false;
    document.body.classList.add('has-sticky-buy');
    new IntersectionObserver(function (entries) {
      var entry = entries[0];
      // Only once the button is above the viewport, not before reaching it.
      var scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      stickyBar.classList.toggle('is-visible', scrolledPast);
    }).observe(stickyTrigger);
  }

  /* ---------- Product media gallery ---------- */
  var mainImage = document.querySelector('[data-main-image]');
  var stageVideo = document.querySelector('.product-stage [data-brand-video]');
  var thumbs = document.querySelectorAll('[data-thumb]');

  function showStageVideo(show) {
    if (!stageVideo) return;
    var video = stageVideo.querySelector('video');
    stageVideo.hidden = !show;
    if (mainImage) mainImage.hidden = show;
    if (!video) return;
    if (show) {
      if (!reduceMotion) video.play();
    } else {
      video.pause();
    }
  }

  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      if (thumb.hasAttribute('data-thumb-video')) {
        showStageVideo(true);
      } else {
        if (!mainImage) return;
        mainImage.src = thumb.dataset.full;
        if (thumb.dataset.alt) mainImage.alt = thumb.dataset.alt;
        showStageVideo(false);
      }
      thumbs.forEach(function (other) {
        other.setAttribute('aria-current', other === thumb ? 'true' : 'false');
      });
    });
  });

  // Swipe the main photo on phones to step through the gallery.
  var stage = document.querySelector('[data-stage]');
  if (stage && thumbs.length > 1) {
    var startX = null;
    var startY = null;
    stage.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
      var list = Array.prototype.slice.call(thumbs);
      var current = list.findIndex(function (t) {
        return t.getAttribute('aria-current') === 'true';
      });
      var next = current + (dx < 0 ? 1 : -1);
      if (next >= 0 && next < list.length) list[next].click();
    }, { passive: true });
  }

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
  var preorderPrice = root.querySelector('[data-preorder-price]');
  var preorderNow = preorderPrice && preorderPrice.querySelector('[data-preorder-now]');
  var preorderWas = preorderPrice && preorderPrice.querySelector('[data-preorder-was]');
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
    showStageVideo(false);
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

    if (preorderNow) {
      var percent = parseInt(preorderPrice.dataset.percent, 10) || 0;
      var sale = Math.round(variant.price * (100 - percent) / 100);
      preorderNow.textContent = formatMoney(sale, preorderNow.textContent.trim());
      if (preorderWas) {
        preorderWas.textContent = formatMoney(variant.price, preorderWas.textContent.trim());
      }
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
