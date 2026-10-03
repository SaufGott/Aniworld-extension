document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const autoNextToggle = document.getElementById('auto-next-toggle');
  const skipIntroToggle = document.getElementById('skip-intro-toggle');
  const autoPlayToggle = document.getElementById('auto-play-toggle');

  const noActiveTabCard = document.getElementById('no-active-tab');
  const activeTabCard = document.getElementById('active-tab-card');
  const currentAnimeTitleEl = document.getElementById('current-anime-title');
  const introSkipSecondsInput = document.getElementById('intro-skip-seconds');
  const outroSkipSecondsInput = document.getElementById('outro-skip-seconds');
  const saveSkipBtn = document.getElementById('save-skip-btn');

  const savedConfigsList = document.getElementById('saved-configs-list');

  let currentAnimeKey = ''; // e.g. "dragonball"

  // 1. Load initial settings
  chrome.storage.local.get(['autoNext', 'skipIntro', 'autoPlay', 'skips'], (data) => {
    // Set default values if not defined
    const autoNext = data.autoNext !== false; // default true
    const skipIntro = data.skipIntro !== false; // default true
    const autoPlay = data.autoPlay !== false; // default true
    const skips = data.skips || {};

    autoNextToggle.checked = autoNext;
    skipIntroToggle.checked = skipIntro;
    autoPlayToggle.checked = autoPlay;

    // Load active tab to check if user is on aniworld stream page
    checkActiveTab(skips);

    // Render list of saved configs
    renderSavedConfigs(skips);
  });

  // 2. Toggle Listeners
  autoNextToggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoNext: autoNextToggle.checked });
  });

  skipIntroToggle.addEventListener('change', () => {
    chrome.storage.local.set({ skipIntro: skipIntroToggle.checked });
  });

  autoPlayToggle.addEventListener('change', () => {
    chrome.storage.local.set({ autoPlay: autoPlayToggle.checked });
  });

  // 3. Save Button Listener for Active Anime
  saveSkipBtn.addEventListener('click', () => {
    if (!currentAnimeKey) return;

    const introSecs = parseInt(introSkipSecondsInput.value, 10) || 0;
    const outroSecs = parseInt(outroSkipSecondsInput.value, 10) || 0;

    if (introSecs < 0 || outroSecs < 0) {
      alert('Please enter valid numbers (0 or greater).');
      return;
    }

    chrome.storage.local.get(['skips'], (data) => {
      const skips = data.skips || {};
      skips[currentAnimeKey] = {
        intro: introSecs,
        outro: outroSecs
      };

      chrome.storage.local.set({ skips }, () => {
        renderSavedConfigs(skips);
        // Highlight button briefly to show saved
        const originalText = saveSkipBtn.textContent;
        saveSkipBtn.textContent = 'Saved!';
        saveSkipBtn.style.backgroundColor = '#10B981'; // green
        setTimeout(() => {
          saveSkipBtn.textContent = originalText;
          saveSkipBtn.style.backgroundColor = ''; // fallback to css primary
        }, 1500);
      });
    });
  });

  // Helper: Format anime key for UI (e.g. "dragonball" -> "Dragonball", "one-piece" -> "One Piece")
  function formatAnimeTitle(slug) {
    if (!slug) return '';
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Helper: Check Active Tab
  function checkActiveTab(skips) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;

      const activeTab = tabs[0];
      const url = activeTab.url;
      if (!url) return;

      // Match: matches https://aniworld.to/anime/stream/slug/... OR s.to/serie/stream/slug/...
      const match = url.match(/(?:aniworld\.to|s\.to)\/anime\/stream\/([^/]+)/);

      if (match) {
        currentAnimeKey = match[1];
        currentAnimeTitleEl.textContent = formatAnimeTitle(currentAnimeKey);

        // Load current config if exists
        if (skips[currentAnimeKey] !== undefined) {
          const entry = skips[currentAnimeKey];
          if (typeof entry === 'object' && entry !== null) {
            introSkipSecondsInput.value = entry.intro !== undefined ? entry.intro : '';
            outroSkipSecondsInput.value = entry.outro !== undefined ? entry.outro : '';
          } else {
            // backward compatible
            introSkipSecondsInput.value = entry;
            outroSkipSecondsInput.value = '';
          }
        } else {
          introSkipSecondsInput.value = '';
          outroSkipSecondsInput.value = '';
        }

        // Show card, hide empty state
        noActiveTabCard.classList.add('hidden');
        activeTabCard.classList.remove('hidden');
      } else {
        currentAnimeKey = '';
        // Hide card, show empty state
        noActiveTabCard.classList.remove('hidden');
        activeTabCard.classList.add('hidden');
      }
    });
  }

  // Helper: Render Saved Configs List
  function renderSavedConfigs(skips) {
    savedConfigsList.innerHTML = '';

    const keys = Object.keys(skips);
    if (keys.length === 0) {
      savedConfigsList.innerHTML = '<li class="empty-list-item">No custom skips configured.</li>';
      return;
    }

    keys.forEach((key) => {
      const entry = skips[key];
      let displayDuration = '';

      if (typeof entry === 'object' && entry !== null) {
        const parts = [];
        if (entry.intro > 0) parts.push(`Intro: ${entry.intro}s`);
        if (entry.outro > 0) parts.push(`Outro: ${entry.outro}s`);
        displayDuration = parts.length > 0 ? parts.join(', ') : 'No skips';
      } else {
        displayDuration = `Intro: ${entry}s`;
      }

      const li = document.createElement('li');
      li.className = 'config-item';

      li.innerHTML = `
        <div class="config-info">
          <span class="config-title" title="${formatAnimeTitle(key)}">${formatAnimeTitle(key)}</span>
          <span class="config-duration">${displayDuration}</span>
        </div>
        <div class="config-actions">
          <button class="btn-icon delete" data-key="${key}" title="Delete Config">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;
      savedConfigsList.appendChild(li);
    });

    // Add Delete event listeners
    savedConfigsList.querySelectorAll('.delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const keyToDelete = btn.getAttribute('data-key');
        if (confirm(`Remove custom skips for ${formatAnimeTitle(keyToDelete)}?`)) {
          chrome.storage.local.get(['skips'], (data) => {
            const currentSkips = data.skips || {};
            delete currentSkips[keyToDelete];
            chrome.storage.local.set({ skips: currentSkips }, () => {
              renderSavedConfigs(currentSkips);
              // If we deleted the configuration for the active tab, clear its input fields
              if (keyToDelete === currentAnimeKey) {
                introSkipSecondsInput.value = '';
                outroSkipSecondsInput.value = '';
              }
            });
          });
        }
      });
    });
  }
});
