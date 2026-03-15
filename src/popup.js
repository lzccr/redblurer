// popup.js — RedBlurer

(function () {
  const toggle = document.getElementById("blur-toggle");
  const card = document.getElementById("main-card");
  const title = document.getElementById("status-title");
  const subtitle = document.getElementById("status-sub");
  const blockAllToggle = document.getElementById("block-all-toggle");
  const persistentUnblurToggle = document.getElementById(
    "persistent-unblur-toggle",
  );
  const noHoverUnblurToggle = document.getElementById("no-hover-unblur-toggle");
  const domainListInput = document.getElementById("domain-list");
  const exportBtn = document.getElementById("export-config");
  const importInput = document.getElementById("import-config-input");

  const STATES = {
    on: {
      title: "Blur Active",
      sub: "Images & videos are hidden",
    },
    off: {
      title: "Blur Off",
      sub: "Media is fully visible",
    },
  };

  function applyUI(enabled) {
    toggle.checked = enabled;

    if (enabled) {
      card.classList.remove("off");
      document.body.classList.remove("blurred-off");
      title.textContent = STATES.on.title;
      subtitle.textContent = STATES.on.sub;
    } else {
      card.classList.add("off");
      document.body.classList.add("blurred-off");
      title.textContent = STATES.off.title;
      subtitle.textContent = STATES.off.sub;
    }
  }

  function applyBlockAllUI(blockAll) {
    if (!blockAllToggle) return;
    blockAllToggle.checked = !!blockAll;
  }

  function applyPersistentUnblurUI(persistent) {
    if (!persistentUnblurToggle) return;
    persistentUnblurToggle.checked = !!persistent;
  }

  function applyNoHoverUnblurUI(noHover) {
    if (!noHoverUnblurToggle) return;
    noHoverUnblurToggle.checked = !!noHover;
  }

  function applyDomainListUI(domains) {
    if (!domainListInput) return;
    const list = Array.isArray(domains) ? domains : [];
    domainListInput.value = list.join("\n");
  }

  function parseDomainListFromUI() {
    if (!domainListInput) return [];
    return domainListInput.value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  // ── Load current state ──────────────────────────────────────────
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    const enabled = response?.blurEnabled ?? true;
    const blockAll = response?.blockAll ?? false;
    const persistentUnblur = response?.persistentUnblur ?? false;
    const noHoverUnblur = response?.noHoverUnblur ?? false;
    const blockedFields = Array.isArray(response?.blockedDomains)
      ? response.blockedDomains
      : [];

    applyUI(enabled);
    applyBlockAllUI(blockAll);
    applyPersistentUnblurUI(persistentUnblur);
    applyNoHoverUnblurUI(noHoverUnblur);
    applyDomainListUI(blockedFields);
  });

  // ── Handle main blur toggle ─────────────────────────────────────
  toggle.addEventListener("change", () => {
    const enabled = toggle.checked;
    applyUI(enabled);
    chrome.runtime.sendMessage({ type: "SET_STATE", blurEnabled: enabled });
  });

  // ── Handle block-all toggle ─────────────────────────────────────
  if (blockAllToggle) {
    blockAllToggle.addEventListener("change", () => {
      const blockAll = blockAllToggle.checked;
      applyBlockAllUI(blockAll);
      chrome.runtime.sendMessage({ type: "SET_BLOCK_ALL", blockAll });
    });
  }

  // ── Handle persistent unblur toggle ─────────────────────────────
  if (persistentUnblurToggle) {
    persistentUnblurToggle.addEventListener("change", () => {
      const persistentUnblur = persistentUnblurToggle.checked;
      applyPersistentUnblurUI(persistentUnblur);
      chrome.runtime.sendMessage({
        type: "SET_PERSISTENT_UNBLUR",
        persistentUnblur,
      });
    });
  }

  // ── Handle no-hover-unblur toggle ───────────────────────────────
  if (noHoverUnblurToggle) {
    noHoverUnblurToggle.addEventListener("change", () => {
      const noHoverUnblur = noHoverUnblurToggle.checked;
      applyNoHoverUnblurUI(noHoverUnblur);
      chrome.runtime.sendMessage({
        type: "SET_NO_HOVER_UNBLUR",
        noHoverUnblur,
      });
    });
  }

  // ── Handle domain list changes ──────────────────────────────────
  if (domainListInput) {
    const saveDomainList = () => {
      const blockedDomains = parseDomainListFromUI();
      chrome.runtime.sendMessage({
        type: "SET_BLOCKED_DOMAINS",
        blockedDomains,
      });
    };

    domainListInput.addEventListener("blur", saveDomainList);
    domainListInput.addEventListener("change", saveDomainList);
  }

  // ── Export configuration to JSON file ───────────────────────────
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "EXPORT_CONFIG" }, (response) => {
        if (!response || !response.ok) return;
        const blob = new Blob([JSON.stringify(response.config, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "redblurer-config.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    });
  }

  // ── Import configuration from JSON file ─────────────────────────
  if (importInput) {
    importInput.addEventListener("change", () => {
      const file = importInput.files && importInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const config = JSON.parse(reader.result);
          chrome.runtime.sendMessage(
            { type: "IMPORT_CONFIG", config },
            (response) => {
              if (!response || !response.ok) return;
              const applied = response.applied || {};
              applyUI(applied.blurEnabled);
              applyBlockAllUI(applied.blockAll);
              applyPersistentUnblurUI(applied.persistentUnblur);
              applyNoHoverUnblurUI(applied.noHoverUnblur);
              applyDomainListUI(applied.blockedDomains);
            },
          );
        } catch (_) {
          // Silently ignore invalid JSON
        } finally {
          importInput.value = "";
        }
      };
      reader.readAsText(file);
    });
  }
})();
