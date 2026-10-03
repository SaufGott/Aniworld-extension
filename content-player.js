// Exit immediately if this is running in the top main frame (guard for <all_urls>)
if (window === window.top) {
    // Do nothing
} else {
    initializePlayerScript();
}

// Play-button selectors for the players commonly embedded on aniworld.to / s.to
const PLAY_BUTTON_SELECTORS = [
    '.jw-icon-display',        // JW Player (VOE)
    '.vjs-big-play-button',    // Video.js (Filemoon, Vidmoly, Streamtape, Megafile)
    '[aria-label="Play"]',
    '[title="Play"]',
    '#play', '#playButton', '#play-button', '#playbtn', '.play-button', '.playbtn',
    '#play_video', '.big-play-button', '.play'
];

const AUTOPLAY_RETRIES = 5;
const AUTOPLAY_RETRY_DELAY = 1200;

// Global state flags to prevent duplicate triggers across source reloads
let globalHasSkippedIntro = false;
let globalHasTriggeredOutro = false;
let globalHasAutoStarted = false;
let audioFallbackUsed = false;

let settings = {
    skipIntroEnabled: true,
    autoPlayEnabled: true,
    introSeconds: 0,
    outroSeconds: 0,
    animeKey: null
};

function initializePlayerScript() {
    console.log('%c[AniWorld Helper] content-player.js loaded in iframe: ' + window.location.href, 'color: #637cf9; font-weight: bold;');

    let parsedAnimeKey = null;

    // 1. Detect parent anime from referrer first
    const referrer = document.referrer;
    if (referrer) {
        const match = referrer.match(/(?:aniworld\.to|s\.to)\/anime\/stream\/([^/]+)/);
        if (match) {
            parsedAnimeKey = match[1];
            console.log(`[AniWorld Helper] Parent anime detected from referrer: "${parsedAnimeKey}"`);
        }
    }

    // 2. Fetch configurations and active session from storage
    chrome.storage.local.get(['skipIntro', 'autoPlay', 'skips', 'activeAnimeKey', 'activeAnimeKeyTimestamp'], (data) => {
        settings.skipIntroEnabled = data.skipIntro !== false; // default true
        settings.autoPlayEnabled = data.autoPlay !== false;  // default true
        settings.animeKey = parsedAnimeKey;

        const skips = data.skips || {};

        // Fallback: If referrer detection failed, check storage session freshness (within 45 seconds)
        if (!parsedAnimeKey && data.activeAnimeKey && data.activeAnimeKeyTimestamp) {
            const timeDiff = Date.now() - data.activeAnimeKeyTimestamp;
            if (timeDiff < 45000) {
                settings.animeKey = data.activeAnimeKey;
                console.log(`[AniWorld Helper] Parent anime detected from storage fallback ("${settings.animeKey}", session age: ${(timeDiff / 1000).toFixed(1)}s)`);
            } else {
                console.log(`[AniWorld Helper] Stored anime session too old: ${(timeDiff / 1000).toFixed(1)}s`);
            }
        }

        if (settings.animeKey && skips[settings.animeKey] !== undefined) {
            const entry = skips[settings.animeKey];
            if (typeof entry === 'object' && entry !== null) {
                // New format: { intro: N, outro: N }
                settings.introSeconds = parseInt(entry.intro, 10) || 0;
                settings.outroSeconds = parseInt(entry.outro, 10) || 0;
            } else {
                // Legacy format: plain number (intro skip only)
                settings.introSeconds = parseInt(entry, 10) || 0;
                settings.outroSeconds = 0;
            }
            console.log(`[AniWorld Helper] Config for "${settings.animeKey}": intro=${settings.introSeconds}s, outro=${settings.outroSeconds}s (skipIntro? ${settings.skipIntroEnabled}, autoPlay? ${settings.autoPlayEnabled})`);
        } else if (settings.animeKey) {
            console.log(`[AniWorld Helper] No skip settings configured yet for "${settings.animeKey}".`);
        } else {
            console.warn('[AniWorld Helper] Could not identify parent stream. Referrer was:', referrer);
        }

        // Start seeking the video element
        locateAndSetupVideo();
    });
}

// Look for <video> element on the page
function locateAndSetupVideo() {
    const video = document.querySelector('video');
    if (video) {
        setupVideoListeners(video);
        return;
    }

    console.log('[AniWorld Helper] Video element not found yet. Starting polling...');

    // Some players only create the <video> element after the first click on their play overlay,
    // so try the overlay once before polling.
    if (settings.autoPlayEnabled) {
        const button = findPlayButton();
        if (button) {
            try {
                button.click();
                console.log(`[AniWorld Helper] Pre-clicked play overlay (${button.id || button.className || 'player control'}).`);
            } catch (error) {
                console.log('[AniWorld Helper] Play overlay click failed:', error.message);
            }
        }
    }

    const pollInterval = setInterval(() => {
        const polledVideo = document.querySelector('video');
        if (polledVideo) {
            clearInterval(pollInterval);
            setupVideoListeners(polledVideo);
        }
    }, 250);

    // Stop polling after 30 seconds to prevent endless loops
    setTimeout(() => clearInterval(pollInterval), 30000);
}

// Bind event listeners to video element
function setupVideoListeners(video) {
    console.log('%c[AniWorld Helper] Video element located! Arming player listeners.', 'color: #10B981; font-weight: bold;');

    // Reset flags when a new video source starts loading
    video.addEventListener('loadstart', () => {
        globalHasSkippedIntro = false;
        globalHasTriggeredOutro = false;
        globalHasAutoStarted = false;
        console.log('[AniWorld Helper] Video source changed / reloaded. Skipper re-armed.');
    });

    video.addEventListener('timeupdate', () => {
        const duration = video.duration;
        const currentTime = video.currentTime;

        // Safeguard: only act on videos longer than 5 minutes (300s) to avoid triggering on ads
        if (!duration || duration < 300) return;

        // --- Intro Skip ---
        if (settings.skipIntroEnabled && settings.introSeconds > 0 && !globalHasSkippedIntro) {
            if (currentTime > 0.1 && currentTime < settings.introSeconds) {
                console.log(`%c[AniWorld Helper] Skipping intro for "${settings.animeKey}": ${currentTime.toFixed(2)}s → ${settings.introSeconds}s`, 'color: #637cf9; font-weight: bold;');
                video.currentTime = settings.introSeconds;
                globalHasSkippedIntro = true;
            }
        }

        // --- Outro Skip (trigger next episode early based on remaining time) ---
        if (settings.outroSeconds > 0 && !globalHasTriggeredOutro) {
            const timeRemaining = duration - currentTime;
            if (timeRemaining > 0 && timeRemaining <= settings.outroSeconds) {
                globalHasTriggeredOutro = true;
                console.log(`%c[AniWorld Helper] Outro threshold reached for "${settings.animeKey}" (${timeRemaining.toFixed(1)}s remaining). Triggering next episode!`, 'color: #637cf9; font-weight: bold;');
                chrome.runtime.sendMessage({ action: 'video_ended' });
            }
        }
    });

    // Seek past the intro as soon as the duration is known, even if playback has not started yet
    video.addEventListener('loadedmetadata', () => {
        if (settings.skipIntroEnabled && settings.introSeconds > 0 && !globalHasSkippedIntro && video.duration >= 300 && video.currentTime < settings.introSeconds) {
            try {
                video.currentTime = settings.introSeconds;
                globalHasSkippedIntro = true;
                console.log(`%c[AniWorld Helper] Intro skipped on load for "${settings.animeKey}" → ${settings.introSeconds}s`, 'color: #637cf9; font-weight: bold;');
            } catch (error) {
                console.log('[AniWorld Helper] Intro seek failed:', error.message);
            }
        }
    });

    // Natural end of video — only fire if outro-skip hasn't already triggered navigation
    video.addEventListener('ended', () => {
        if (!globalHasTriggeredOutro) {
            console.log('[AniWorld Helper] Video playback ended naturally. Relaying to background.');
            chrome.runtime.sendMessage({ action: 'video_ended' });
        }
    });

    // --- Auto-start playback (the play button the user would otherwise have to click) ---
    if (settings.autoPlayEnabled && !globalHasAutoStarted) {
        globalHasAutoStarted = true;
        tryAutoStart(video);
    }
}

async function tryAutoStart(video) {
    for (let attempt = 1; attempt <= AUTOPLAY_RETRIES; attempt++) {
        if (!video.paused) {
            console.log('%c[AniWorld Helper] Playback started automatically.', 'color: #10B981; font-weight: bold;');
            return;
        }

        const button = findPlayButton();
        if (button) {
            try {
                button.click();
                console.log(`[AniWorld Helper] Clicked play button (${button.id || button.className || 'player control'}).`);
            } catch (error) {
                console.log('[AniWorld Helper] Play button click failed:', error.message);
            }
        }

        try {
            await video.play();
            console.log('%c[AniWorld Helper] Playback started automatically.', 'color: #10B981; font-weight: bold;');
            return;
        } catch (error) {
            // Browsers block autoplay with sound until the page has a real user gesture.
            // Muted autoplay is always allowed, so use it as a last resort and hand the
            // audio back on the first click inside the player.
            if (attempt === AUTOPLAY_RETRIES - 1 && !audioFallbackUsed) {
                audioFallbackUsed = true;
                video.muted = true;
                document.addEventListener('click', () => {
                    if (video.muted) {
                        video.muted = false;
                        console.log('[AniWorld Helper] Audio restored after user interaction.');
                    }
                }, { once: true });
                console.log('[AniWorld Helper] Autoplay with sound is blocked — starting muted instead. Click anywhere in the player to get audio back.');
            }

            console.log(`[AniWorld Helper] Autoplay attempt ${attempt} failed (${error.name}). Retrying in ${AUTOPLAY_RETRY_DELAY}ms...`);
            await sleep(AUTOPLAY_RETRY_DELAY);
        }
    }

    console.log('[AniWorld Helper] Could not start playback automatically. Please press play.');
}

function findPlayButton() {
    for (const selector of PLAY_BUTTON_SELECTORS) {
        let element;
        try {
            element = document.querySelector(selector);
        } catch (error) {
            continue;
        }
        if (isClickable(element)) return element;
    }
    return null;
}

function isClickable(element) {
    if (!element || element.tagName === 'VIDEO') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
