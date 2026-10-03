// Content script running on the main page of aniworld.to or s.to

console.log('[AniWorld Helper] content-main.js loaded.');

// Palette kept in sync with popup.css so injected UI matches the extension UI.
const PALETTE = {
  cardBg: '#181922',
  cardBorder: '#282a3c',
  textMain: '#f3f4f6',
  textMuted: '#9ca3af',
  primary: '#637cf9',
  primaryHover: '#7f95fc',
  trackBg: '#2e3046'
};

// Detect active anime and store in storage for iframe player access
const currentUrl = window.location.href;
const animeUrlMatch = currentUrl.match(/(?:aniworld\.to|s\.to)\/anime\/stream\/([^/]+)/);
if (animeUrlMatch) {
  const animeKey = animeUrlMatch[1];
  chrome.storage.local.set({
    activeAnimeKey: animeKey,
    activeAnimeKeyTimestamp: Date.now()
  }, () => {
    console.log(`[AniWorld Helper] Active session stored: activeAnimeKey="${animeKey}"`);
  });
}


// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'navigate_next') {
    // Check if autoNext is enabled
    chrome.storage.local.get(['autoNext'], (data) => {
      const autoNextEnabled = data.autoNext !== false; // default true
      if (autoNextEnabled) {
        console.log('[AniWorld Helper] Video ended trigger received. Scanning for next episode...');
        triggerNextEpisodeFlow();
      } else {
        console.log('[AniWorld Helper] Auto-Next is disabled in settings.');
      }
    });
  }
});

// Main navigation flow
function triggerNextEpisodeFlow() {
  const nextEpisodeUrl = getNextEpisodeUrl();

  if (nextEpisodeUrl) {
    console.log(`[AniWorld Helper] Next episode URL localized: ${nextEpisodeUrl}`);
    showCountdownOverlay(5, nextEpisodeUrl);
  } else {
    console.log('[AniWorld Helper] No next episode link found. Playback finished or season is complete.');
  }
}

// Find the active episode link and get the next sibling episode's href
function getNextEpisodeUrl() {
  // Find current active episode in the menu. Class is typically 'active' or anchor inside active list item
  const activeLink = document.querySelector('a.active[href*="episode"]');
  if (!activeLink) {
    console.log('[AniWorld Helper] Could not find active episode anchor element.');
    return null;
  }

  // Find closest list or container containing other episodes
  const listContainer = activeLink.closest('ul') || activeLink.closest('div');
  if (!listContainer) {
    console.log('[AniWorld Helper] Could not find episodes collection container.');
    return null;
  }

  // Find all episode anchors inside this container
  const episodeLinks = Array.from(listContainer.querySelectorAll('a[href*="episode"]'));
  const activeIndex = episodeLinks.indexOf(activeLink);

  if (activeIndex !== -1 && activeIndex < episodeLinks.length - 1) {
    return episodeLinks[activeIndex + 1].href;
  }

  return null;
}

// Show premium UI countdown overlay
function showCountdownOverlay(seconds, targetUrl) {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById('aniworld-helper-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  // Overlay container
  const container = document.createElement('div');
  container.id = 'aniworld-helper-overlay';

  // Custom Styles (same design tokens as popup.css)
  const style = document.createElement('style');
  style.id = 'aniworld-helper-overlay-styles';
  style.textContent = `
    #aniworld-helper-overlay {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background-color: ${PALETTE.cardBg};
      border: 1px solid rgba(99, 124, 249, 0.45);
      border-radius: 8px;
      padding: 12px 14px;
      color: ${PALETTE.textMain};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 12px rgba(99, 124, 249, 0.12);
      z-index: 999999;
      width: 280px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: aniworld-slide-in 0.3s ease-out forwards;
    }
    .aw-title {
      font-weight: 700;
      font-size: 14px;
      color: ${PALETTE.primary};
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .aw-desc {
      font-size: 12px;
      color: ${PALETTE.textMuted};
      line-height: 1.4;
    }
    .aw-progress-bg {
      background-color: ${PALETTE.trackBg};
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
      width: 100%;
    }
    .aw-progress-bar {
      background-color: ${PALETTE.primary};
      height: 100%;
      width: 100%;
      border-radius: 2px;
      transition: width 1s linear;
    }
    .aw-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .aw-btn {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s, transform 0.1s;
    }
    .aw-btn:active {
      transform: scale(0.97);
    }
    .aw-btn-cancel {
      background-color: transparent;
      border: 1px solid ${PALETTE.cardBorder};
      color: ${PALETTE.textMuted};
    }
    .aw-btn-cancel:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: ${PALETTE.textMain};
    }
    .aw-btn-now {
      background-color: ${PALETTE.primary};
      color: #ffffff;
    }
    .aw-btn-now:hover {
      background-color: ${PALETTE.primaryHover};
    }
    @keyframes aniworld-slide-in {
      from { transform: translateY(100px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes aniworld-fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;

  document.head.appendChild(style);

  // Overlay Content
  container.innerHTML = `
    <div class="aw-title">
      <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
      </svg>
      <span>Next Episode</span>
    </div>
    <div class="aw-desc">Episode finished. Loading next episode in <span id="aw-timer">${seconds}</span> seconds...</div>
    <div class="aw-progress-bg">
      <div id="aw-bar" class="aw-progress-bar"></div>
    </div>
    <div class="aw-actions">
      <button id="aw-cancel-btn" class="aw-btn aw-btn-cancel">Cancel</button>
      <button id="aw-now-btn" class="aw-btn aw-btn-now">Play Now</button>
    </div>
  `;

  document.body.appendChild(container);

  let timeLeft = seconds;
  const timerTextEl = document.getElementById('aw-timer');
  const progressBarEl = document.getElementById('aw-bar');

  // Set initial width
  progressBarEl.style.width = '100%';

  const countdown = setInterval(() => {
    timeLeft -= 1;
    if (timerTextEl) timerTextEl.textContent = timeLeft;
    if (progressBarEl) {
      progressBarEl.style.width = `${(timeLeft / seconds) * 100}%`;
    }

    if (timeLeft <= 0) {
      clearInterval(countdown);
      navigateToNextEpisode(targetUrl);
    }
  }, 1000);

  // Immediate width update to kickstart transitions
  setTimeout(() => {
    if (progressBarEl) progressBarEl.style.width = `${((timeLeft - 1) / seconds) * 100}%`;
  }, 50);

  // Event Listeners
  document.getElementById('aw-cancel-btn').addEventListener('click', () => {
    clearInterval(countdown);
    container.style.animation = 'aniworld-fade-out 0.3s ease-out forwards';
    setTimeout(() => {
      container.remove();
      style.remove();
    }, 300);
    console.log('[AniWorld Helper] Auto-Next navigation cancelled by user.');
  });

  document.getElementById('aw-now-btn').addEventListener('click', () => {
    clearInterval(countdown);
    navigateToNextEpisode(targetUrl);
  });
}

// Navigate to the next episode. The player script on the new page handles the play button.
function navigateToNextEpisode(targetUrl) {
    window.location.href = targetUrl;
}
