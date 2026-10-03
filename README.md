# AniWorld Helper — Browser Extension

A Manifest V3 Chrome/Edge browser extension that enhances your anime streaming experience on [aniworld.to](https://aniworld.to) and [s.to](https://s.to).
! This Extension is vibe-coded and i have no clue how this has been coded or if there are any safety-risks. Please use on your own risk, it works tho :D

## Features

- ⏭️ **Auto-Next Episode** — Automatically transitions to the next episode when the current one ends, with a 5-second countdown overlay you can cancel or skip.
- ▶️ **Auto-Start Playback** — After the next episode loads, the extension presses the player's play button for you, so you do not have to click it on every episode.
- ⏩ **Intro Skip** — Automatically jumps past the opening credits to your configured timestamp (per anime).
- ⏮️ **Outro Skip** — Triggers the next episode early when a configurable amount of time remains, so you never have to sit through long ending sequences.
- 🎛️ **Per-Anime Settings** — Customize intro and outro skip durations individually for each show via the popup UI.

## Installation (Unpacked / Developer Mode)

1. Clone or download this repository.
2. Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing this extension's files.
5. Pin the extension to your toolbar for quick access.

> Installing from a zip: extract it first and load the **extracted folder**, not the zip. Edge cannot load an unpacked extension from an archive.

## Usage

1. Navigate to an episode page on `aniworld.to`.
2. Click the **AniWorld Helper** icon in the toolbar.
3. Configure desired skip durations for the currently playing anime:
   - **Intro Skip (sec):** How many seconds from the beginning to skip.
   - **Outro Skip (sec):** How many seconds before the end to start the next episode.
4. Click **Save Config**.

Settings are saved per anime and persist across browser sessions.

## How It Works

| Component | Role |
|-----------|------|
| `manifest.json` | Manifest V3 config, permissions, script injection, icons |
| `background.js` | Service worker — routes `video_ended` messages from player iframes to the main tab |
| `content-main.js` | Runs on aniworld.to — saves active anime key to storage, handles next-episode navigation and the countdown overlay |
| `content-player.js` | Runs inside player iframes — detects the `<video>` element, presses the play button, applies intro/outro skipping |
| `popup.html/css/js` | Settings UI — per-anime skip config, global toggles |
| `icons/` | 16/48/128 px toolbar and store icons |
| `build.ps1` | Builds the store-ready zip (`dist/`) |

### Auto-start and the browser autoplay policy

The extension clicks the play button of the embedded player (JW Player / Video.js / hoster overlays) and then calls `video.play()`. Browsers only allow autoplay **with sound** if the page already has a real user gesture or the domain has a high media-engagement score, so on some hosters playback can still be refused. In that case the extension falls back to muted autoplay and restores the audio on your first click inside the player. This is a browser restriction, not an extension bug — it is why the play button appears in the first place.

## Why Edge keeps removing the extension

An unpacked extension has **no signature**. Edge treats anything loaded via "Load unpacked" as a developer extension and disables it again on every start, which is exactly the behaviour you are seeing. There is no way to sign an unpacked extension yourself — signing happens when the package is distributed through a store.

The clean fix is to publish it and install it from the store:

- **Edge Add-ons** (`https://partners.microsoft.com`) — this is the one that stops Edge from complaining, because Edge signs and installs the package itself. Upload the zip produced by `build.ps1`, add the store listing text and the 128 px icon, submit for review.
- **Chrome Web Store** (`https://chromewebstore.dev` / Chrome Developer Dashboard) — required for Chrome. Edge can run Chrome Web Store extensions, but they are still treated as "other store" extensions, so Edge will keep showing a warning unless you enable *Allow extensions from other stores* in `edge://extensions`.

Group-policy workarounds (`ExtensionInstallBlocklist`, `ExtensionInstallAllowlist`) only apply to store-installed extensions, not to unpacked ones — so publishing is the only durable solution.

Store submission checklist:
1. Run `pwsh build.ps1` to produce `dist/aniworld-helper_v<version>.zip` (all files at the archive root, which is what both stores require).
2. Keep `icons/icon128.png` for the store tile.
3. Use the same name/description as in `manifest.json` and paste the feature list from this README as the store description.
4. After approval, install from the store once — the startup prompt is gone.

## Supported Platforms

- ✅ Chrome
- ✅ Microsoft Edge
- All embedded video hosters (VOE, Streamtape, Doodstream, Vidoza, etc.) are supported through universal `<all_urls>` frame injection.

## Changelog

### 1.1.0
- Countdown overlay now uses the extension's own design tokens (`#637cf9` / `#181922`) instead of the orange accent.
- Added Auto-Start Playback: the extension presses the player's play button on the next episode, with retries and a muted-autoplay fallback.
- New toggle in the popup for Auto-Start Playback.
- Added 16/48/128 px icons (the extension had none) and a `build.ps1` packaging script for store submission.

### 1.0.0
- Initial release: auto-next, intro skip, outro skip, per-anime settings.

## License

MIT License — feel free to fork and adapt.
