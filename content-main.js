// Content script running on the main page of aniworld.to or s.to

console.log('[AniWorld Helper] content-main.js loaded.');

// Design tokens, shared with popup.css and matching the site's own accent (#637cf9)
const PALETTE = {
  bg: '#0d0e12',
  cardBg: '#181922',
  cardBorder: '#282a3c',
  textMain: '#f3f4f6',
  textMuted: '#9ca3af',
  primary: '#637cf9',
  primaryHover: '#7f95fc',
  trackBg: '#2e3046'
};

const SETTINGS_KEYS = ['autoNext', 'skipIntro', 'autoPlay', 'skips'];

// Detect active anime and store in storage for iframe player access
const currentUrl = window.location.href;
const animeUrlMatch = currentUrl.match(/(?:aniworld\.to|s\.to)\/(?:anime|serie)\/stream\/([^/]+)/);
const animeKey = animeUrlMatch ? animeUrlMatch[1] : null;

if (animeKey) {
  chrome.storage.local.set({
    activeAnimeKey: animeKey,
    activeAnimeKeyTimestamp: Date.now()
  }, () => {
    console.log(`[AniWorld Helper] Active session stored: activeAnimeKey="${animeKey}"`);
  });
  injectSettingsUi();
}

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'resolve_click_coords') {
    // The player iframe is the only full-size frame on the page; the share buttons are small.
    const frame = document.querySelector('.hosterSiteVideo iframe') || document.querySelector('iframe');
    if (!frame) {
      sendResponse(null);
      return;
    }
    const rect = frame.getBoundingClientRect();
    sendResponse({
      x: Math.round(rect.left + message.localX),
      y: Math.round(rect.top + message.localY)
    });
    return;
  }

  if (message.action === 'navigate_next') {
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
    console.log('[AniWorld Helper] No next episode link found. Playback finished or the series is complete.');
  }
}

// Find the active episode link and get the next sibling episode's href
function getNextEpisodeUrl() {
  const activeLink = document.querySelector('a.active[href*="episode"]');
  if (!activeLink) {
    console.log('[AniWorld Helper] Could not find active episode anchor element.');
    return null;
  }

  const listContainer = activeLink.closest('ul') || activeLink.closest('div');
  if (!listContainer) {
    console.log('[AniWorld Helper] Could not find episodes collection container.');
    return null;
  }

  const episodeLinks = Array.from(listContainer.querySelectorAll('a[href*="episode"]'));
  const activeIndex = episodeLinks.indexOf(activeLink);

  if (activeIndex !== -1 && activeIndex < episodeLinks.length - 1) {
    return episodeLinks[activeIndex + 1].href;
  }

  // Last episode of this season: continue with the first episode of the next season
  const nextSeasonUrl = getNextSeasonUrl();
  if (nextSeasonUrl) {
    const firstEpisode = new URL(nextSeasonUrl + '/episode-1', window.location.origin).href;
    console.log(`[AniWorld Helper] Season finished, continuing with next season: ${firstEpisode}`);
    return firstEpisode;
  }

  return null;
}

// Find the next season link in the season navigation
function getNextSeasonUrl() {
  const activeSeason = document.querySelector('a.active[href*="staffel"]');
  if (!activeSeason) return null;

  const container = activeSeason.closest('ul');
  if (!container) return null;

  const seasonLinks = Array.from(container.querySelectorAll('a[href*="staffel"]'));
  const activeIndex = seasonLinks.indexOf(activeSeason);

  if (activeIndex !== -1 && activeIndex < seasonLinks.length - 1) {
    return new URL(seasonLinks[activeIndex + 1].href, window.location.origin).href;
  }

  return null;
}

// Show the countdown overlay
function showCountdownOverlay(seconds, targetUrl) {
  const existingOverlay = document.getElementById('aniworld-helper-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const container = document.createElement('div');
  container.id = 'aniworld-helper-overlay';

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

  progressBarEl.style.width = '100%';

  const countdown = setInterval(() => {
    timeLeft -= 1;
    if (timerTextEl) timerTextEl.textContent = timeLeft;
    if (progressBarEl) {
      progressBarEl.style.width = `${(timeLeft / seconds) * 100}%`;
    }

    if (timeLeft <= 0) {
      clearInterval(countdown);
      window.location.href = targetUrl;
    }
  }, 1000);

  setTimeout(() => {
    if (progressBarEl) progressBarEl.style.width = `${((timeLeft - 1) / seconds) * 100}%`;
  }, 50);

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
    window.location.href = targetUrl;
  });
}

// ---------------------------------------------------------------------------
// Embedded settings UI
// The button is appended to the site's own "Wähle einen AniWorld Stream / Hoster"
// header bar, which is already painted in the extension's accent colour.
// ---------------------------------------------------------------------------
function injectSettingsUi() {
  const host = document.querySelector('.hosterSectionTitle');
  if (!host) return;

  injectSettingsStyles();

  // The header bar is already full width on the page, so the button sits at its right edge.
  host.style.display = 'flex';
  host.style.alignItems = 'center';
  host.style.justifyContent = 'space-between';
  host.style.boxSizing = 'border-box';
  host.style.minWidth = '100%';

  const button = document.createElement('button');
  button.id = 'awh-open';
  button.type = 'button';
  button.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 9 4.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
    <span>AniWorld Helper</span>
  `;

  const panel = document.createElement('div');
  panel.id = 'awh-panel';

  button.addEventListener('click', () => {
    if (panel.classList.contains('awh-open')) {
      panel.classList.remove('awh-open');
      return;
    }
    renderPanel(panel);
    panel.classList.add('awh-open');
  });

  host.appendChild(button);
  host.insertAdjacentElement('afterend', panel);
}

function renderPanel(panel) {
  chrome.storage.local.get(SETTINGS_KEYS, (data) => {
    const autoNext = data.autoNext !== false;
    const skipIntro = data.skipIntro !== false;
    const autoPlay = data.autoPlay !== false;
    const skips = data.skips || {};
    const entry = skips[animeKey] || {};

    panel.innerHTML = `
      <div class="awh-card">
        <div class="awh-card-head">
          <span class="awh-card-title">AniWorld Helper</span>
          <span class="awh-badge">ACTIVE SESSION</span>
        </div>
        <div class="awh-anime">${formatAnimeTitle(animeKey)}</div>

        <label class="awh-row">
          <span class="awh-row-label">Auto-Next Episode</span>
          <input type="checkbox" id="awh-auto-next" ${autoNext ? 'checked' : ''}>
        </label>
        <label class="awh-row">
          <span class="awh-row-label">Skip Anime Intros</span>
          <input type="checkbox" id="awh-skip-intro" ${skipIntro ? 'checked' : ''}>
        </label>
        <label class="awh-row">
          <span class="awh-row-label">Auto-Start Playback</span>
          <input type="checkbox" id="awh-auto-play" ${autoPlay ? 'checked' : ''}>
        </label>

        <div class="awh-inputs">
          <label class="awh-field">
            <span>Intro Skip (sec)</span>
            <input type="number" id="awh-intro" min="0" max="600" value="${entry.intro ?? ''}">
          </label>
          <label class="awh-field">
            <span>Outro Skip (sec)</span>
            <input type="number" id="awh-outro" min="0" max="600" value="${entry.outro ?? ''}">
          </label>
        </div>

        <button id="awh-save" class="awh-save" type="button">Save Config</button>
      </div>
    `;

    const toggle = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => chrome.storage.local.set({ [key]: el.checked }));
    };

    toggle('awh-auto-next', 'autoNext');
    toggle('awh-skip-intro', 'skipIntro');
    toggle('awh-auto-play', 'autoPlay');

    const saveBtn = document.getElementById('awh-save');
    saveBtn.addEventListener('click', () => {
      const intro = parseInt(document.getElementById('awh-intro').value, 10) || 0;
      const outro = parseInt(document.getElementById('awh-outro').value, 10) || 0;

      chrome.storage.local.get(['skips'], (stored) => {
        const current = stored.skips || {};
        current[animeKey] = { intro, outro };
        chrome.storage.local.set({ skips: current }, () => {
          saveBtn.textContent = 'Saved!';
          saveBtn.classList.add('awh-saved');
          setTimeout(() => {
            saveBtn.textContent = 'Save Config';
            saveBtn.classList.remove('awh-saved');
          }, 1500);
        });
      });
    });
  });
}

function formatAnimeTitle(slug) {
  if (!slug) return '';
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function injectSettingsStyles() {
  if (document.getElementById('awh-panel-styles')) return;

  const style = document.createElement('style');
  style.id = 'awh-panel-styles';
  style.textContent = `
    #awh-open {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    #awh-open:hover {
      background: rgba(255, 255, 255, 0.26);
    }
    #awh-panel {
      display: none;
      margin-top: 12px;
    }
    .hosterSectionTitle h3 {
      margin: 0;
    }
    #awh-panel.awh-open {
      display: block;
    }
    .awh-card {
      background-color: ${PALETTE.cardBg};
      border: 1px solid ${PALETTE.cardBorder};
      border-radius: 8px;
      padding: 14px;
      color: ${PALETTE.textMain};
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .awh-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid ${PALETTE.cardBorder};
      padding-bottom: 8px;
    }
    .awh-card-title {
      font-size: 15px;
      font-weight: 700;
      color: ${PALETTE.primary};
    }
    .awh-badge {
      background-color: rgba(99, 124, 249, 0.2);
      color: ${PALETTE.primary};
      font-size: 8px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }
    .awh-anime {
      font-size: 13px;
      font-weight: 600;
      color: ${PALETTE.textMain};
    }
    .awh-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .awh-row-label {
      color: ${PALETTE.textMuted};
      font-size: 12px;
    }
    .awh-row input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: ${PALETTE.primary};
      cursor: pointer;
    }
    .awh-inputs {
      display: flex;
      gap: 10px;
      border-top: 1px solid ${PALETTE.cardBorder};
      padding-top: 10px;
    }
    .awh-field {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 11px;
      color: ${PALETTE.textMuted};
    }
    .awh-field input[type="number"] {
      background-color: ${PALETTE.bg};
      border: 1px solid ${PALETTE.cardBorder};
      border-radius: 6px;
      color: #fff;
      padding: 8px 10px;
      font-family: inherit;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .awh-field input[type="number"]:focus {
      border-color: ${PALETTE.primary};
    }
    .awh-save {
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      cursor: pointer;
      background-color: ${PALETTE.primary};
      color: #fff;
      transition: background-color 0.2s;
    }
    .awh-save:hover {
      background-color: ${PALETTE.primaryHover};
    }
    .awh-saved {
      background-color: #10B981 !important;
    }
  `;

  document.head.appendChild(style);
}
