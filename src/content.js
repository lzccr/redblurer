// content.js — RedBlurer

(function () {
  "use strict";

  let blurEnabled = true; // Will be updated from storage immediately
  let blockAll = false;
  let blockedDomains = [];
  let persistentUnblur = false;
  let noHoverUnblur = false;

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Mark a container element so hover over it can unblur children.
   */
  function markBlurContainer(el) {
    const parent = el.parentElement;
    if (!parent) return;
    if (!parent.classList.contains("redblurer-wrap")) {
      parent.classList.add("redblurer-wrap");
    }
  }

  /**
   * Apply blur class + prevent autoplay to a single element.
   */
  function applyBlur(el) {
    if (el.dataset.redblurerDone === "1") return;
    el.dataset.redblurerDone = "1";

    el.classList.add("redblurer-blurred");
    el.classList.remove("redblurer-unblurred");
    markBlurContainer(el);

    if (el.tagName === "VIDEO") {
      el.autoplay = false;
      el.pause();
      // Also stomp the autoplay attribute for frameworks that set it later
      el.setAttribute("preload", "none");
    }
  }

  /**
   * Remove blur from a single element.
   */
  function removeBlur(el) {
    el.classList.remove("redblurer-blurred");
    el.classList.remove("redblurer-unblurred");
    el.classList.add("redblurer-disabled");
  }

  /**
   * Re-enable blur on a single element.
   */
  function restoreBlur(el) {
    el.classList.remove("redblurer-disabled");
    el.classList.remove("redblurer-unblurred");
    el.classList.add("redblurer-blurred");
  }

  /**
   * Query all images and videos in the document.
   */
  function getAllMedia() {
    return document.querySelectorAll('img, video, [style*="background-image"]');
  }

  // ─── Bulk operations ────────────────────────────────────────────────────────

  function blurAll() {
    getAllMedia().forEach((el) => {
      applyBlur(el);
      el.classList.remove("redblurer-disabled");
    });
  }

  /**
   * Determine whether blur should be active on this page, based on
   * global blurEnabled, blockAll, and blockedDomains.
   */
  function shouldBlurForLocation(url) {
    if (!blurEnabled) return false;

    try {
      const loc = new URL(url || window.location.href);
      const host = loc.hostname.toLowerCase();

      if (blockAll) {
        return true;
      }

      if (!Array.isArray(blockedDomains) || blockedDomains.length === 0) {
        return true;
      }

      // Match exact host or any subdomain of the blocked domain
      return blockedDomains.some((domain) => {
        const d = String(domain || "")
          .toLowerCase()
          .trim();
        if (!d) return false;
        return host === d || host.endsWith("." + d);
      });
    } catch {
      return blurEnabled;
    }
  }

  function unblurAll() {
    document
      .querySelectorAll(
        ".redblurer-blurred, .redblurer-disabled, [data-redblurer-done]",
      )
      .forEach((el) => {
        el.classList.remove("redblurer-blurred");
        el.classList.remove("redblurer-unblurred");
        el.classList.add("redblurer-disabled");
      });
  }

  /**
   * Update a root-level CSS class so styles can enforce "never unblur on hover".
   */
  function updateHoverModeClass() {
    const root = document.documentElement;
    if (!root) return;

    if (noHoverUnblur) {
      root.classList.add("redblurer-no-hover-unblur");
    } else {
      root.classList.remove("redblurer-no-hover-unblur");
    }
  }

  // ─── MutationObserver — catch dynamically loaded media ─────────────────────

  const observer = new MutationObserver((mutations) => {
    if (!shouldBlurForLocation()) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        // Check the node itself, including elements that use background-image
        if (node.matches('img, video, [style*="background-image"]')) {
          applyBlur(node);
        }

        // Check descendants
        node
          .querySelectorAll('img, video, [style*="background-image"]')
          .forEach(applyBlur);
      }

      // Handle attribute changes (e.g. lazy-load src swap or background-image changes)
      if (mutation.type === "attributes") {
        const target = mutation.target;

        // src changes on images/videos
        if (mutation.attributeName === "src" && target.matches("img, video")) {
          applyBlur(target);
        }

        // style changes that might introduce or change background-image
        if (mutation.attributeName === "style") {
          if (
            target.matches('img, video, [style*="background-image"]') ||
            (target.style &&
              typeof target.style.backgroundImage === "string" &&
              target.style.backgroundImage !== "" &&
              target.style.backgroundImage !== "none")
          ) {
            applyBlur(target);
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "style", "autoplay"],
  });

  // Intercept videos that try to call .play() themselves
  const originalPlay = HTMLVideoElement.prototype.play;
  HTMLVideoElement.prototype.play = function (...args) {
    if (
      shouldBlurForLocation() &&
      this.classList.contains("redblurer-blurred")
    ) {
      // Only allow play while the user is hovering
      if (this.matches(":hover")) {
        return originalPlay.apply(this, args);
      }
      return Promise.resolve(); // silently swallow autoplay attempts
    }
    return originalPlay.apply(this, args);
  };

  // ─── Listen for toggle messages from background ──────────────────────────────

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "BLUR_TOGGLE") {
      blurEnabled = message.blurEnabled;
      if (shouldBlurForLocation()) {
        blurAll();
      } else {
        unblurAll();
      }
    }

    if (message.type === "CONFIG_UPDATE") {
      if (Object.prototype.hasOwnProperty.call(message, "blurEnabled")) {
        blurEnabled = !!message.blurEnabled;
      }
      if (Object.prototype.hasOwnProperty.call(message, "blockAll")) {
        blockAll = !!message.blockAll;
      }
      if (Object.prototype.hasOwnProperty.call(message, "blockedDomains")) {
        blockedDomains = Array.isArray(message.blockedDomains)
          ? message.blockedDomains
          : [];
      }
      if (Object.prototype.hasOwnProperty.call(message, "persistentUnblur")) {
        persistentUnblur = !!message.persistentUnblur;
      }
      if (Object.prototype.hasOwnProperty.call(message, "noHoverUnblur")) {
        noHoverUnblur = !!message.noHoverUnblur;
      }

      updateHoverModeClass();

      if (shouldBlurForLocation()) {
        blurAll();
      } else {
        unblurAll();
      }
    }
  });

  // ─── Initialise from stored state ───────────────────────────────────────────

  chrome.storage.sync.get(
    [
      "blurEnabled",
      "blockAll",
      "blockedDomains",
      "persistentUnblur",
      "noHoverUnblur",
    ],
    (data) => {
      blurEnabled = data.blurEnabled ?? true;
      blockAll = data.blockAll ?? false;
      blockedDomains = Array.isArray(data.blockedDomains)
        ? data.blockedDomains
        : [];
      persistentUnblur = data.persistentUnblur ?? false;
      noHoverUnblur = data.noHoverUnblur ?? false;

      updateHoverModeClass();

      if (shouldBlurForLocation()) {
        // Run on existing media right now, then again once DOM is ready
        blurAll();
        if (document.readyState !== "complete") {
          window.addEventListener("DOMContentLoaded", blurAll);
          window.addEventListener("load", blurAll);
        }
      }
    },
  );
  // ─── Hover handling ─────────────────────────────────────────────────────────
  //
  // 1. When persistentUnblur is enabled (KMR), the first hover permanently
  //    unblurs the element (redblurer-unblurred).
  // 2. As a fallback for sites like X/Twitter where :hover on the blurred
  //    node can be unreliable, we also add/remove a temporary
  //    "redblurer-hovering" class while the pointer is over the element so
  //    CSS can reveal it.

  if (typeof document !== "undefined") {
    // Persistent unblur promotion + temporary hover-unblur
    document.addEventListener(
      "mouseover",
      (evt) => {
        if (!shouldBlurForLocation()) return;

        const target = evt.target;
        if (!(target instanceof Element)) return;

        // Respect "never unblur on hover"
        if (noHoverUnblur) {
          return;
        }

        // If KMR is enabled, permanently unblur on first hover
        if (
          persistentUnblur &&
          target.classList.contains("redblurer-blurred")
        ) {
          target.classList.remove("redblurer-blurred");
          target.classList.add("redblurer-unblurred");
        }

        // Always mark blurred elements as hovering for temporary unblur
        if (target.classList.contains("redblurer-blurred")) {
          target.classList.add("redblurer-hovering");
        }
      },
      true,
    );

    // Remove temporary hover state on mouseout
    document.addEventListener(
      "mouseout",
      (evt) => {
        if (!shouldBlurForLocation()) return;
        if (noHoverUnblur) return;

        const target = evt.target;
        if (!(target instanceof Element)) return;

        if (target.classList.contains("redblurer-hovering")) {
          target.classList.remove("redblurer-hovering");
        }
      },
      true,
    );
  }
})();
