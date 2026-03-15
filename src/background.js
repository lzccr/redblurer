// background.js — RedBlurer service worker

// Default state: blurring enabled, no domain block list, blockAll off
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    blurEnabled: true,
    blockAll: false,
    blockedDomains: [],
    persistentUnblur: false,
    noHoverUnblur: false,
  });
});

/**
 * Helper to broadcast full config update to all tabs.
 */
function broadcastConfigUpdate(config) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.id) return;
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "CONFIG_UPDATE",
          blurEnabled: config.blurEnabled,
          blockAll: config.blockAll,
          blockedDomains: config.blockedDomains,
          persistentUnblur: config.persistentUnblur,
          noHoverUnblur: config.noHoverUnblur,
        },
        () => {
          // Intentionally ignore "no receiving end" errors on tabs
          // where the content script is not injected.
          void chrome.runtime.lastError;
        },
      );
    });
  });
}

// Relay toggle messages from popup to active tab's content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATE") {
    chrome.storage.sync.get(
      [
        "blurEnabled",
        "blockAll",
        "blockedDomains",
        "persistentUnblur",
        "noHoverUnblur",
      ],
      (data) => {
        sendResponse({
          blurEnabled: data.blurEnabled ?? true,
          blockAll: data.blockAll ?? false,
          blockedDomains: Array.isArray(data.blockedDomains)
            ? data.blockedDomains
            : [],
          persistentUnblur: data.persistentUnblur ?? false,
          noHoverUnblur: data.noHoverUnblur ?? false,
        });
      },
    );
    return true; // keep channel open for async sendResponse
  }

  if (message.type === "SET_STATE") {
    chrome.storage.sync.get(
      ["blockAll", "blockedDomains", "persistentUnblur", "noHoverUnblur"],
      (data) => {
        const config = {
          blurEnabled: message.blurEnabled,
          blockAll: data.blockAll ?? false,
          blockedDomains: Array.isArray(data.blockedDomains)
            ? data.blockedDomains
            : [],
          persistentUnblur: data.persistentUnblur ?? false,
          noHoverUnblur: data.noHoverUnblur ?? false,
        };
        chrome.storage.sync.set(config, () => {
          broadcastConfigUpdate(config);
          sendResponse({ ok: true });
        });
      },
    );
    return true;
  }

  // Update blockAll toggle
  if (message.type === "SET_BLOCK_ALL") {
    chrome.storage.sync.get(
      ["blurEnabled", "blockedDomains", "persistentUnblur", "noHoverUnblur"],
      (data) => {
        const config = {
          blurEnabled: data.blurEnabled ?? true,
          blockAll: !!message.blockAll,
          blockedDomains: Array.isArray(data.blockedDomains)
            ? data.blockedDomains
            : [],
          persistentUnblur: data.persistentUnblur ?? false,
          noHoverUnblur: data.noHoverUnblur ?? false,
        };
        chrome.storage.sync.set(config, () => {
          broadcastConfigUpdate(config);
          sendResponse({ ok: true });
        });
      },
    );
    return true;
  }

  // Replace entire blocked domain list
  if (message.type === "SET_BLOCKED_DOMAINS") {
    const list = Array.isArray(message.blockedDomains)
      ? message.blockedDomains
      : [];
    chrome.storage.sync.get(
      ["blurEnabled", "blockAll", "persistentUnblur", "noHoverUnblur"],
      (data) => {
        const config = {
          blurEnabled: data.blurEnabled ?? true,
          blockAll: data.blockAll ?? false,
          blockedDomains: list,
          persistentUnblur: data.persistentUnblur ?? false,
          noHoverUnblur: data.noHoverUnblur ?? false,
        };
        chrome.storage.sync.set(config, () => {
          broadcastConfigUpdate(config);
          sendResponse({ ok: true, blockedDomains: list });
        });
      },
    );
    return true;
  }

  // Export current configuration (blurEnabled, blockAll, blockedDomains)
  if (message.type === "EXPORT_CONFIG") {
    chrome.storage.sync.get(
      [
        "blurEnabled",
        "blockAll",
        "blockedDomains",
        "persistentUnblur",
        "noHoverUnblur",
      ],
      (data) => {
        const config = {
          blurEnabled: data.blurEnabled ?? true,
          blockAll: data.blockAll ?? false,
          blockedDomains: Array.isArray(data.blockedDomains)
            ? data.blockedDomains
            : [],
          persistentUnblur: data.persistentUnblur ?? false,
          noHoverUnblur: data.noHoverUnblur ?? false,
        };
        sendResponse({ ok: true, config });
      },
    );
    return true;
  }

  // Import configuration (expects same structure as EXPORT_CONFIG)
  if (message.type === "IMPORT_CONFIG") {
    const cfg = message.config || {};
    const next = {
      blurEnabled:
        typeof cfg.blurEnabled === "boolean" ? cfg.blurEnabled : true,
      blockAll: !!cfg.blockAll,
      blockedDomains: Array.isArray(cfg.blockedDomains)
        ? cfg.blockedDomains
        : [],
      persistentUnblur: !!cfg.persistentUnblur,
      noHoverUnblur: !!cfg.noHoverUnblur,
    };

    chrome.storage.sync.set(next, () => {
      // Broadcast full config so content scripts can react
      broadcastConfigUpdate(next);
      sendResponse({ ok: true, applied: next });
    });
    return true;
  }

  // Handle persistent unblur toggle
  if (message.type === "SET_PERSISTENT_UNBLUR") {
    chrome.storage.sync.get(
      ["blurEnabled", "blockAll", "blockedDomains", "noHoverUnblur"],
      (data) => {
        const config = {
          blurEnabled: data.blurEnabled ?? true,
          blockAll: data.blockAll ?? false,
          blockedDomains: Array.isArray(data.blockedDomains)
            ? data.blockedDomains
            : [],
          persistentUnblur: !!message.persistentUnblur,
          noHoverUnblur: data.noHoverUnblur ?? false,
        };
        chrome.storage.sync.set(config, () => {
          broadcastConfigUpdate(config);
          sendResponse({ ok: true });
        });
      },
    );
    return true;
  }

  // Handle no-hover-unblur toggle
  if (message.type === "SET_NO_HOVER_UNBLUR") {
    chrome.storage.sync.get(
      ["blurEnabled", "blockAll", "blockedDomains", "persistentUnblur"],
      (data) => {
        const config = {
          blurEnabled: data.blurEnabled ?? true,
          blockAll: data.blockAll ?? false,
          blockedDomains: Array.isArray(data.blockedDomains)
            ? data.blockedDomains
            : [],
          persistentUnblur: data.persistentUnblur ?? false,
          noHoverUnblur: !!message.noHoverUnblur,
        };
        chrome.storage.sync.set(config, () => {
          broadcastConfigUpdate(config);
          sendResponse({ ok: true });
        });
      },
    );
    return true;
  }
});
