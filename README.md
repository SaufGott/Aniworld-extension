# AniWorld Helper — Browser Extension

A Manifest V3 Chrome/Edge browser extension that enhances your anime streaming experience on [aniworld.to](https://aniworld.to) and [s.to](https://s.to).

## Features

- ⏭️ **Auto-Next Episode** — Automatically transitions to the next episode when the current one ends, with a 5-second countdown overlay you can cancel or skip.
- ⏩ **Intro Skip** — Automatically jumps past the opening credits to your configured timestamp (per anime).
- ⏮️ **Outro Skip** — Triggers the next episode early when a configurable amount of time remains, so you never have to sit through long ending sequences.
- 🎛️ **Per-Anime Settings** — Customize intro and outro skip durations individually for each show via the popup UI.

## Installation (Unpacked / Developer Mode)

1. Clone or download this repository.
2. Open Chrome/Edge and navigate to `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** and select the folder containing this extension's files.
5. Pin the extension to your toolbar for quick access.

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
| `manifest.json` | Manifest V3 config, permissions, script injection |
| `background.js` | Service worker — routes `video_ended` messages from player iframes to the main tab |
| `content-main.js` | Runs on aniworld.to — saves active anime key to storage, handles next-episode navigation |
| `content-player.js` | Runs inside player iframes — detects the `<video>` element, applies intro/outro skipping |
| `popup.html/css/js` | Settings UI — per-anime skip config, global toggles |

## Supported Platforms

- ✅ Chrome
- ✅ Microsoft Edge
- All embedded video hosters (VOE, Streamtape, Doodstream, Vidoza, etc.) are supported through universal `<all_urls>` frame injection.

## License

MIT License — feel free to fork and adapt.
